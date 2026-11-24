/**
 * NetPath Python sidecar 生命周期管理与请求转发。
 *
 * sidecar（python/worker.py）提供 netmiko 设备执行 + ntc-templates 结构化解析，
 * 是 AI 操作设备的增强通道，与现有手写 telnet 通道并存。
 *
 * 设计原则：
 *  - sidecar 不可用（未装 venv / 启动失败 / 崩溃）时优雅降级，不影响 bridge 主服务
 *    与现有 telnet 通道；前端据此隐藏相关入口或给出提示。
 *  - 仅转发到 127.0.0.1，不对外暴露。
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WORKER_PY = path.join(ROOT, 'python', 'worker.py');
const VENV_PYTHON = path.join(ROOT, 'python', '.venv', 'Scripts', 'python.exe');
const DEFAULT_PORT = Number(process.env.WORKER_PORT || 7710);
const HEALTH_WAIT_MS = 10000;

const state = {
  proc: null,
  port: DEFAULT_PORT,
  available: false,
  error: null,
  pythonPath: null,
};

function resolvePython() {
  if (fs.existsSync(VENV_PYTHON)) return VENV_PYTHON;
  // 回退到系统解释器（venv 不存在时）。Windows 用 py launcher，其他用 python3。
  return process.platform === 'win32' ? 'py' : 'python3';
}

async function probeHealth(port, timeoutMs = 1500) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function waitForHealth(port, totalMs) {
  const start = Date.now();
  while (Date.now() - start < totalMs) {
    const data = await probeHealth(port);
    if (data && data.ok) return data;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return null;
}

/** 启动 sidecar 并等待健康检查；失败时标记不可用，不抛错。 */
export async function startWorker(options = {}) {
  const port = Number(options.port || process.env.WORKER_PORT || DEFAULT_PORT);
  state.port = port;

  // 若端口上已有健康 sidecar（bridge 重启但进程残留），直接复用。
  const existing = await probeHealth(port);
  if (existing && existing.ok) {
    state.available = true;
    state.error = null;
    console.log(`[worker] reuse existing sidecar on 127.0.0.1:${port} (netmiko ${existing.netmiko})`);
    return snapshot();
  }

  const python = resolvePython();
  state.pythonPath = python;

  if (!fs.existsSync(WORKER_PY)) {
    state.available = false;
    state.error = `worker script not found: ${WORKER_PY}`;
    console.warn(`[worker] ${state.error}`);
    return snapshot();
  }

  let proc;
  try {
    proc = spawn(python, [WORKER_PY, '--port', String(port)], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
  } catch (err) {
    state.available = false;
    state.error = `spawn failed: ${err.message}`;
    console.warn(`[worker] ${state.error}`);
    return snapshot();
  }
  state.proc = proc;

  proc.stdout.on('data', (chunk) => process.stdout.write(`[worker] ${chunk}`));
  proc.stderr.on('data', (chunk) => process.stderr.write(`[worker] ${chunk}`));
  proc.on('error', (err) => {
    state.available = false;
    state.error = `spawn error: ${err.message}`;
    console.warn(`[worker] ${state.error}`);
  });
  proc.on('exit', (code, signal) => {
    state.available = false;
    if (code !== 0 && code !== null) {
      state.error = `exited with code ${code}`;
      console.warn(`[worker] sidecar exited (code=${code}, signal=${signal})`);
    }
  });

  const healthy = await waitForHealth(port, HEALTH_WAIT_MS);
  if (healthy) {
    state.available = true;
    state.error = null;
    console.log(
      `[worker] sidecar ready on 127.0.0.1:${port} ` +
        `(netmiko ${healthy.netmiko}, templatesReady=${healthy.templatesReady})`,
    );
  } else {
    state.available = false;
    state.error = state.error || 'health check timed out';
    console.warn(`[worker] sidecar not ready: ${state.error}`);
  }
  return snapshot();
}

/** 优雅停止 sidecar（bridge 关闭时调用）。 */
export function stopWorker() {
  if (state.proc) {
    try {
      state.proc.kill();
    } catch {
      /* ignore */
    }
    state.proc = null;
  }
  state.available = false;
}

/** 缓存中的状态快照（不触发网络探测）。 */
export function snapshot() {
  return {
    available: state.available,
    port: state.port,
    error: state.error,
    pythonPath: state.pythonPath,
  };
}

/** 实时探测 sidecar 健康状态，供 /api/health 聚合。失败不抛错。 */
export async function liveHealth() {
  if (!state.available) return snapshot();
  const data = await probeHealth(state.port, 2000);
  if (data && data.ok) {
    state.available = true;
    state.error = null;
    return {
      ...snapshot(),
      netmiko: data.netmiko,
      templatesReady: data.templatesReady,
      sessions: data.sessions,
    };
  }
  state.available = false;
  state.error = state.error || 'health probe failed';
  return snapshot();
}

export class WorkerError extends Error {
  constructor(status, code, message, detail) {
    super(message || code);
    this.name = 'WorkerError';
    this.status = status;
    this.code = code;
    if (detail !== undefined) this.detail = detail;
  }
}

/**
 * 转发请求到 sidecar，返回其业务字段（已剥掉 {ok} 壳，交由 bridge 统一包裹）。
 * sidecar 不可用或返回错误时抛 WorkerError，由 bridge 错误处理统一转 sendError。
 */
export async function callWorker(pathname, body, options = {}) {
  const method = options.method || (body == null ? 'GET' : 'POST');
  const timeoutMs = options.timeoutMs || 30000;

  if (!state.available) {
    throw new WorkerError(
      503,
      'worker_unavailable',
      state.error || 'Python sidecar (netmiko) is not available',
    );
  }

  const url = `http://127.0.0.1:${state.port}${pathname}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body != null ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch (err) {
    state.available = false;
    state.error = `request failed: ${err.message}`;
    throw new WorkerError(502, 'worker_request_failed', state.error);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    /* keep null */
  }

  if (!res.ok) {
    throw new WorkerError(
      res.status,
      (payload && payload.code) || 'worker_error',
      (payload && payload.error) || `worker returned ${res.status}`,
      payload,
    );
  }
  if (payload && typeof payload === 'object' && payload.ok === false) {
    throw new WorkerError(
      res.status || 500,
      payload.code || 'worker_error',
      payload.error || 'worker error',
      payload,
    );
  }

  if (payload && typeof payload === 'object') {
    const { ok, ...rest } = payload;
    return rest;
  }
  return payload;
}
