import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { URL, pathToFileURL } from 'node:url';

import config from './config.mjs';
import { detectEnsp } from './ensp-detect.mjs';
import { detectMobaxterm, openMobaxterm } from './mobaxterm.mjs';
import { createSessionManager, SessionError } from './sessions.mjs';
import { attachTerminalWebSocket } from './terminal-ws.mjs';
import { probeTopology, scanPorts } from './scan.mjs';
import { McpClient, McpError } from './mcp-client.mjs';
import { proxyChat } from './ai-proxy.mjs';
import { startWorker, stopWorker, liveHealth, callWorker, WorkerError } from './worker.mjs';
import { importTopology, MAX_TOPO_BYTES, TopologyImportError } from './topo-import.mjs';
import { parseDocument, MAX_DOC_BYTES, DocumentImportError } from './doc-import.mjs';
import { createMockDevice } from './__fixtures__/mock-device.mjs';

const MAX_BODY_BYTES = 1024 * 1024;
const HEALTH_CACHE_MS = 5000;
const ALLOWED_ORIGIN_RE = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;

class BridgeError extends Error {
  constructor(status, code, message, detail) {
    super(message || code);
    this.name = 'BridgeError';
    this.status = status;
    this.code = code;
    if (detail !== undefined) this.detail = detail;
  }
}

const sessions = createSessionManager({
  credentials: config.credentials,
  limits: config.limits,
});

let mockHandle = null;
let mcpClient = null;
let healthCache = { at: 0, data: null };

function getMcp() {
  if (!mcpClient) {
    mcpClient = new McpClient({ commands: config.mcpCommands });
  }
  return mcpClient;
}

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGIN_RE.test(origin);
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return;
  if (!isAllowedOrigin(origin)) {
    throw new BridgeError(403, 'origin_forbidden', 'Origin is not allowed');
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendOk(res, data, status = 200) {
  sendJson(res, status, { ok: true, data });
}

function sendError(res, status, code, message, detail) {
  const error = { code, message };
  if (detail !== undefined) error.detail = detail;
  sendJson(res, status, { ok: false, error });
}

function readRawBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let rejected = false;

    req.on('data', (chunk) => {
      if (rejected) return;
      size += chunk.length;
      if (size > maxBytes) {
        rejected = true;
        chunks.length = 0;
        reject(new BridgeError(413, 'payload_too_large', `Request body exceeds ${Math.floor(maxBytes / 1024 / 1024)} MiB limit`));
        req.resume();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (rejected) return;
      resolve(Buffer.concat(chunks));
    });

    req.on('aborted', () => {
      if (rejected) return;
      rejected = true;
      chunks.length = 0;
      reject(new BridgeError(400, 'request_aborted', 'Request was aborted'));
    });

    req.on('error', (error) => {
      if (rejected) return;
      rejected = true;
      reject(new BridgeError(400, 'request_error', error.message));
    });
  });
}

async function readJsonBody(req) {
  const raw = await readRawBody(req);
  if (!raw || raw.length === 0) {
    throw new BridgeError(400, 'empty_body', 'Request body is required');
  }
  let parsed;
  try {
    parsed = JSON.parse(raw.toString('utf8'));
  } catch {
    throw new BridgeError(400, 'invalid_json', 'Request body is not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BridgeError(400, 'invalid_body', 'Request body must be a JSON object');
  }
  return parsed;
}

function requireString(body, field) {
  const value = body[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BridgeError(400, 'invalid_body', `Field "${field}" must be a non-empty string`);
  }
  return value;
}

async function handleHealth() {
  const now = Date.now();
  // worker 状态实时探测（本地回环，开销可忽略），不随 detectEnsp 缓存，
  // 以便 sidecar 启动后能尽快在前端反映为可用。
  const worker = await liveHealth();
  if (healthCache.data && now - healthCache.at < HEALTH_CACHE_MS) {
    return { ...healthCache.data, mock: mockHandle !== null, worker };
  }
  const detected = await detectEnsp({ mock: mockHandle !== null, enspPaths: config.enspPaths });
  const mobaxterm = detectMobaxterm({ candidates: config.mobaxtermPaths });
  healthCache = { at: now, data: { ...detected, mobaxterm } };
  return { ...detected, mobaxterm, mock: mockHandle !== null, worker };
}

function handleMobaxtermOpen(body) {
  const port = Number(body.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new BridgeError(400, 'invalid_port', 'Field "port" must be an integer between 1 and 65535');
  }
  const requested = typeof body.exe === 'string' && body.exe.trim() ? body.exe.trim() : '';
  const detected = requested ? { found: true, path: requested } : detectMobaxterm({ candidates: config.mobaxtermPaths });
  if (!detected.found || !detected.path) {
    throw new BridgeError(
      404,
      'mobaxterm_not_found',
      '未找到本机 MobaXterm，请在 ensp-bridge.config.json 的 mobaxtermPaths 中填写安装路径',
    );
  }
  try {
    return openMobaxterm({ exe: detected.path, port });
  } catch (error) {
    throw new BridgeError(400, error.code || 'mobaxterm_error', error.message);
  }
}

async function handleConnect(body) {
  const port = Number(body.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new BridgeError(400, 'invalid_port', 'Field "port" must be an integer between 1 and 65535');
  }
  const info = await sessions.create({
    port,
    username: body.username,
    password: body.password,
  });
  return info;
}

function handleExec(body) {
  const sessionId = requireString(body, 'sessionId');
  const command = requireString(body, 'command');
  const waitMs = body.waitMs != null ? Number(body.waitMs) : undefined;
  if (waitMs != null && (!Number.isFinite(waitMs) || waitMs <= 0)) {
    throw new BridgeError(400, 'invalid_body', 'Field "waitMs" must be a positive number');
  }
  return sessions.exec(sessionId, command, waitMs);
}

function handleComplete(body) {
  const sessionId = requireString(body, 'sessionId');
  const fullLine = typeof body.line === 'string' ? body.line : '';
  const cursor = body.cursor != null ? Number(body.cursor) : undefined;
  // 仅以光标前的内容作为补全前缀，避免光标后的内容干扰设备。
  const line =
    cursor != null && Number.isFinite(cursor)
      ? fullLine.slice(0, Math.max(0, Math.min(cursor, fullLine.length)))
      : fullLine;
  const timeoutMs =
    body.timeoutMs != null && Number.isFinite(Number(body.timeoutMs)) ? Number(body.timeoutMs) : undefined;
  return sessions.complete(sessionId, line, { timeoutMs });
}

function handleDisconnect(body) {
  const sessionId = requireString(body, 'sessionId');
  const removed = sessions.remove(sessionId);
  if (!removed) {
    throw new BridgeError(404, 'session_not_found', `Unknown session: ${sessionId}`);
  }
  return { sessionId, disconnected: true };
}

async function handleTopoGenerate(body) {
  const scenarioId = requireString(body, 'scenarioId');
  const spec = body.spec;
  if (spec === undefined) {
    throw new BridgeError(400, 'invalid_body', 'Field "spec" is required');
  }
  const outPath = body.outPath
    ? path.resolve(String(body.outPath))
    : path.join(os.tmpdir(), 'netpath-topo', `${scenarioId}.topo`);

  const toolName = process.env.TOPO_TOOL || 'generate_topology';
  const result = await getMcp().callTool(toolName, {
    scenarioId,
    spec,
    outPath,
  });

  let written = null;
  if (result.text) {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, result.text, 'utf8');
    written = outPath;
  }

  return {
    scenarioId,
    tool: toolName,
    outPath: written,
    text: result.text,
  };
}

function handleMcpCall(body) {
  const name = requireString(body, 'name');
  const args = body.arguments && typeof body.arguments === 'object' ? body.arguments : {};
  const timeoutMs = body.timeoutMs != null ? Number(body.timeoutMs) : undefined;
  return getMcp().callTool(name, args, timeoutMs);
}

async function handleAiChat(body, req, res) {
  const baseUrl = requireString(body, 'baseUrl');
  const apiKey = requireString(body, 'apiKey');
  const model = requireString(body, 'model');
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw new BridgeError(400, 'invalid_body', 'Field "messages" must be a non-empty array');
  }
  const temperature = body.temperature != null ? Number(body.temperature) : undefined;

  await proxyChat({
    baseUrl,
    apiKey,
    model,
    messages: body.messages,
    temperature,
    req,
    res,
  });
}

function handleTopoImport(body, req, query, dependencies) {
  const headerName = req.headers['x-file-name'];
  const fileName = query.get('filename') || (Array.isArray(headerName) ? headerName[0] : headerName) || '';
  return importTopology(body, {
    fileName,
    mcp: dependencies.mcp || getMcp(),
    tempRoot: dependencies.topoTempRoot,
  });
}

const DOC_KINDS = new Set(['troubleshoot', 'manual']);

function handleDocImport(body, req, query) {
  const headerName = req.headers['x-file-name'];
  const filename = query.get('filename') || (Array.isArray(headerName) ? headerName[0] : headerName) || '';
  if (!filename || !filename.trim()) {
    throw new BridgeError(400, 'invalid_body', 'Query 参数 "filename" 不能为空');
  }
  const kind = query.get('kind');
  if (!DOC_KINDS.has(kind)) {
    throw new BridgeError(400, 'invalid_body', 'Query 参数 "kind" 必须为 troubleshoot 或 manual');
  }
  return parseDocument({ filename: filename.trim(), buffer: body, kind });
}

const ROUTES = {
  'GET /api/health': (_body, _req, _res, query) =>
    query.get('probe') === '1' ? { service: 'netpath-hcie-bridge' } : handleHealth(),
  'GET /api/ensp/scan': (_body, _req, _res, query) =>
    scanPorts({
      from: query.get('from') ?? config.scanRange[0],
      to: query.get('to') ?? config.scanRange[1],
      ports: query.get('ports') || '',
    }),
  'POST /api/ensp/scan': (body) => {
    if (!body.topology || !Array.isArray(body.topology.devices)) {
      throw new BridgeError(400, 'invalid_body', 'Field "topology.devices" must be an array');
    }
    return probeTopology(body.topology, { mappings: body.mappings });
  },
  'POST /api/ensp/connect': (body) => handleConnect(body),
  'POST /api/ensp/exec': (body) => handleExec(body),
  'POST /api/ensp/complete': (body) => handleComplete(body),
  'POST /api/ensp/disconnect': (body) => handleDisconnect(body),
  'GET /api/ensp/sessions': () => sessions.list(),
  'GET /api/mobaxterm/detect': () => detectMobaxterm({ candidates: config.mobaxtermPaths }),
  'POST /api/mobaxterm/open': (body) => handleMobaxtermOpen(body),
  'GET /api/mcp/status': () => getMcp().status(),
  'GET /api/mcp/tools': () => getMcp().getTools(),
  'POST /api/mcp/call': (body) => handleMcpCall(body),
  'POST /api/topo/generate': (body) => handleTopoGenerate(body),
  'POST /api/topo/import': (body, req, _res, query, dependencies) =>
    handleTopoImport(body, req, query, dependencies),
  'POST /api/import/document': (body, req, _res, query) => handleDocImport(body, req, query),
  'POST /api/ai/chat': (body, req, res) => handleAiChat(body, req, res),
  'GET /api/worker/health': () => liveHealth(),
  'POST /api/worker/connect': (body) => callWorker('/connect', body),
  'POST /api/worker/exec': (body) => callWorker('/exec', body),
  'POST /api/worker/disconnect': (body) => callWorker('/disconnect', body),
  'POST /api/worker/parse': (body) => callWorker('/parse', body),
};

async function handleRequest(req, res, dependencies = {}) {
  const started = Date.now();
  const method = req.method || 'GET';
  const url = new URL(req.url || '/', `http://${config.host}`);
  const pathname = url.pathname;

  res.on('finish', () => {
    const elapsed = Date.now() - started;
    console.log(`[bridge] ${method} ${pathname} ${res.statusCode} ${elapsed}ms`);
  });

  try {
    applyCors(req, res);

    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'content-type,authorization',
        'access-control-max-age': '600',
        'content-length': '0',
      });
      res.end();
      return;
    }

    if (method === 'GET' || method === 'HEAD') {
      const route = ROUTES[`GET ${pathname}`];
      if (!route) throw new BridgeError(404, 'not_found', `No route for ${pathname}`);
      const data = await route(undefined, req, res, url.searchParams);
      if (method === 'HEAD') {
        res.writeHead(200);
        res.end();
        return;
      }
      sendOk(res, data);
      return;
    }

    if (method === 'POST') {
      const route = ROUTES[`POST ${pathname}`];
      if (!route) throw new BridgeError(404, 'not_found', `No route for ${pathname}`);
      const body = pathname === '/api/topo/import'
        ? await readRawBody(req, MAX_TOPO_BYTES)
        : pathname === '/api/import/document'
          ? await readRawBody(req, MAX_DOC_BYTES)
          : await readJsonBody(req);
      const data = await route(body, req, res, url.searchParams, dependencies);
      // SSE handlers own the response lifecycle.
      if (pathname === '/api/ai/chat') return;
      sendOk(res, data);
      return;
    }

    throw new BridgeError(405, 'method_not_allowed', `Method ${method} is not supported`);
  } catch (error) {
    if (res.writableEnded) return;
    if (res.headersSent) {
      res.end();
      return;
    }
    if (error instanceof BridgeError || error instanceof SessionError || error instanceof TopologyImportError || error instanceof DocumentImportError) {
      sendError(res, error.status || 400, error.code, error.message, error.detail);
      return;
    }
    if (error instanceof McpError) {
      sendError(res, 502, error.code || 'mcp_error', error.message, error.detail);
      return;
    }
    if (error instanceof WorkerError) {
      sendError(res, error.status || 500, error.code || 'worker_error', error.message, error.detail);
      return;
    }
    const code = error && error.code ? error.code : 'internal_error';
    const status =
      code === 'session_limit'
        ? 409
        : code === 'session_not_found'
          ? 404
          : code === 'auth_failed'
            ? 502
            : code === 'timeout'
              ? 504
              : code === 'connection_refused'
                ? 502
                : 500;
    sendError(res, status, code, error.message || 'Internal error');
  }
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    if (!res.writableEnded) {
      sendError(res, 500, 'internal_error', error.message || 'Internal error');
    }
  });
});

const terminal = attachTerminalWebSocket({ server, sessions, isAllowedOrigin });

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `[bridge] Cannot start: ${config.host}:${config.port} is already in use. ` +
        'Stop the other process or set BRIDGE_PORT to a free port.',
    );
  } else {
    console.error(`[bridge] Server error: ${error.message}`);
  }
  process.exit(1);
});

async function start() {
  if (process.argv.includes('--mock')) {
    const mockPort = Number(process.env.MOCK_PORT || 2001);
    mockHandle = await createMockDevice({ port: mockPort });
    console.log(`[bridge] Mock VRP device on 127.0.0.1:${mockHandle.port}`);
  }

  await new Promise((resolve) => {
    server.listen(config.port, config.host, resolve);
  });
  console.log(`[bridge] Listening on http://${config.host}:${config.port}`);
  // 异步拉起 netmiko sidecar；失败不影响 bridge 主服务与现有 telnet 通道。
  void startWorker().catch((err) => console.warn(`[worker] start failed: ${err.message}`));
  // 预热环境探测缓存，避免首屏 health 请求等待子进程探测。
  void handleHealth().catch(() => undefined);
}

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[bridge] Shutting down (${signal})`);
  void terminal.close();
  stopWorker();
  sessions.shutdown();
  if (mcpClient) mcpClient.close();
  if (mockHandle) {
    mockHandle.close().catch(() => {});
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

const isMain = (() => {
  try {
    return process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
  } catch {
    return false;
  }
})();

if (isMain) {
  start().catch((error) => {
    console.error(`[bridge] Failed to start: ${error.message}`);
    process.exit(1);
  });
}

export { server, start, handleRequest };
