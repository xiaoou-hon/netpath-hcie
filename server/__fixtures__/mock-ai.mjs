import http from 'node:http';
import { pathToFileURL } from 'node:url';

const HOST = '127.0.0.1';
const ANSWER = JSON.stringify({
  answer: [
    '命令用途：display ip interface brief 用于查看接口物理状态、协议状态和 IP 地址摘要。',
    '关键参数：display 表示只读查询；ip interface 指定接口 IP 信息；brief 要求摘要输出。',
    '输出要点：核对 Interface、PHY、Protocol 与 IP Address；up/up 且地址符合规划才表示接口基本正常。',
  ].join('\n'),
  commands: [],
});
const CONTENT_CHUNKS = ANSWER.match(/[\s\S]{1,48}/g) || [];

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendChunk(res, model, content, finishReason = null) {
  const payload = {
    id: 'chatcmpl-deterministic-mock',
    object: 'chat.completion.chunk',
    created: 0,
    model,
    choices: [{
      index: 0,
      delta: content === null ? {} : { content },
      finish_reason: finishReason,
    }],
  };
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function handleRequest(req, res) {
  const url = new URL(req.url || '/', `http://${HOST}`);
  if (req.method !== 'POST' || url.pathname !== '/v1/chat/completions') {
    sendJson(res, 404, { error: { message: 'Mock OpenAI endpoint not found' } });
    return false;
  }

  let raw = '';
  req.setEncoding('utf8');
  for await (const chunk of req) raw += chunk;

  let body;
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    sendJson(res, 400, { error: { message: 'Invalid JSON request' } });
    return true;
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    sendJson(res, 400, { error: { message: 'messages must be a non-empty array' } });
    return true;
  }

  const model = typeof body.model === 'string' && body.model ? body.model : 'deterministic-mock';
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  res.flushHeaders();

  for (const content of CONTENT_CHUNKS) {
    if (res.destroyed || res.writableEnded) return true;
    sendChunk(res, model, content);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  if (!res.destroyed && !res.writableEnded) {
    sendChunk(res, model, null, 'stop');
    res.write('data: [DONE]\n\n');
    res.end();
  }
  return true;
}

/** Deterministic local OpenAI-compatible SSE fixture; never calls an external service. */
export async function createMockAi(options = {}) {
  const port = options.port ?? 0;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new TypeError('port must be an integer between 0 and 65535');
  }

  let requestCount = 0;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${HOST}`);
    if (req.method === 'POST' && url.pathname === '/v1/chat/completions') requestCount += 1;
    void handleRequest(req, res).catch(() => {
      if (!res.headersSent) sendJson(res, 500, { error: { message: 'Mock AI request failed' } });
      else if (!res.writableEnded) res.end();
    });
  });

  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.removeListener('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.removeListener('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, HOST);
  });

  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  return {
    port: actualPort,
    baseUrl: `http://${HOST}:${actualPort}/v1`,
    server,
    get requestCount() {
      return requestCount;
    },
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
        server.closeAllConnections();
      });
    },
  };
}

const isMain = (() => {
  try {
    return process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
  } catch {
    return false;
  }
})();

if (isMain) {
  const port = Number(process.env.MOCK_AI_PORT || 0);
  createMockAi({ port })
    .then((handle) => {
      console.log(`[mock-ai] OpenAI SSE fixture listening at ${handle.baseUrl}`);
      const stop = () => {
        handle.close().then(() => process.exit(0));
      };
      process.on('SIGINT', stop);
      process.on('SIGTERM', stop);
    })
    .catch((error) => {
      console.error(`[mock-ai] failed to start: ${error.message}`);
      process.exit(1);
    });
}

export default createMockAi;
