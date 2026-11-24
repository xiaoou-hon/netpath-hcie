import { randomUUID } from 'node:crypto';
import { TelnetClient, TelnetError, detectView, deviceNameFromPrompt, findLastPrompt } from './telnet.mjs';
import config from './config.mjs';

export class SessionError extends Error {
  constructor(code, message, status = 400) {
    super(message || code);
    this.name = 'SessionError';
    this.code = code;
    this.status = status;
  }
}

function publicInfo(session) {
  return {
    sessionId: session.id,
    port: session.port,
    deviceName: session.deviceName,
    prompt: session.prompt,
    view: session.view,
    paginationDisabled: session.client.paginationDisabled,
    createdAt: session.createdAt,
    lastActiveAt: session.lastActiveAt,
    locked: session.locked,
    status: session.status,
    error: session.lastError,
    cols: session.cols,
    rows: session.rows,
  };
}

/**
 * In-memory session registry. One Telnet client per session; commands on the same
 * session are serialised through a promise queue.
 */
export function createSessionManager(options = {}) {
  const limits = { ...config.limits, ...(options.limits || {}) };
  const defaultCredentials = options.credentials || config.credentials;
  const reconnectAttempts = Math.max(0, Number(limits.reconnectAttempts ?? 3));
  const reconnectBaseDelayMs = Math.max(1, Number(limits.reconnectBaseDelayMs ?? 500));

  const sessions = new Map();
  let closed = false;

  const timers = [];
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const session of [...sessions.values()]) {
      if (session.subscribers.size === 0 && now - session.lastActiveAt > limits.idleTimeoutMs) {
        remove(session.id);
      }
    }
  }, Math.min(30000, Math.max(1000, Math.floor(limits.idleTimeoutMs / 2))));
  if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();
  timers.push(cleanupTimer);

  function list() {
    return [...sessions.values()].map(publicInfo);
  }

  function get(id) {
    const session = sessions.get(id);
    if (!session) throw new SessionError('session_not_found', `Unknown session: ${id}`, 404);
    return session;
  }

  function disposeClient(session) {
    if (session.clientCleanup) {
      session.clientCleanup();
      session.clientCleanup = null;
    }
    try {
      session.client.close();
    } catch {
      // ignore close failures
    }
  }

  function applyInfo(session, info) {
    session.deviceName = info.deviceName;
    session.prompt = info.prompt;
    session.view = info.view;
    session.lastActiveAt = Date.now();
  }

  function appendOutput(session, data) {
    session.terminalBuffer = (session.terminalBuffer + data).slice(-limits.maxOutputChars);
    session.lastActiveAt = Date.now();
    const match = findLastPrompt(session.terminalBuffer.slice(-4000));
    if (match) {
      session.prompt = match.prompt;
      session.view = detectView(match.prompt);
      session.deviceName = deviceNameFromPrompt(match.prompt);
    }
    emit(session, { type: 'output', data });
  }

  function updateFlow(session) {
    if (session.closed) return;
    const blocked = [...session.subscribers.values()].some((entry) => entry.blocked);
    if (blocked === session.paused) return;
    session.paused = blocked;
    if (blocked) session.client.pause();
    else session.client.resume();
  }

  function bindClient(session, client) {
    const onData = (data) => appendOutput(session, data);
    const onClose = () => handleFailure(session, client);
    client.on('terminalData', onData);
    client.on('close', onClose);
    session.clientCleanup = () => {
      client.off('terminalData', onData);
      client.off('close', onClose);
    };
    if (session.paused) client.pause();
  }

  function scheduleReconnect(session, reason) {
    if (session.closed || closed) return;
    if (session.reconnectAttempt >= reconnectAttempts) {
      const message = `设备连接已断开，重连次数已用尽：${reason}`;
      session.lastError = message;
      setStatus(session, 'error', { reason: message });
      appendOutput(session, `\r\n[${message}]\r\n`);
      return;
    }

    session.reconnectAttempt += 1;
    const attempt = session.reconnectAttempt;
    const delay = reconnectBaseDelayMs * 2 ** (attempt - 1);
    setStatus(session, 'reconnecting', { attempt, maxAttempts: reconnectAttempts, reason });
    appendOutput(session, `\r\n[连接已断开，准备重连 ${attempt}/${reconnectAttempts}]\r\n`);
    session.reconnectTimer = setTimeout(() => {
      session.reconnectTimer = null;
      void reconnect(session);
    }, delay);
    if (typeof session.reconnectTimer.unref === 'function') session.reconnectTimer.unref();
  }

  function handleFailure(session, client, error) {
    if (session.closed || closed || !session.allowReconnect || session.client !== client) return;
    if (session.failedClient === client) return;
    session.failedClient = client;

    const authWaiting =
      error?.authWaiting || error?.code === 'auth_failed' || (client.transportConnected && !client.authenticated);
    const reason = authWaiting
      ? '认证等待期间连接中断，未自动重试'
      : error?.message || '设备连接已断开';
    disposeClient(session);
    if (authWaiting) {
      session.lastError = reason;
      setStatus(session, 'error', { reason });
      appendOutput(session, `\r\n[${reason}]\r\n`);
      return;
    }
    scheduleReconnect(session, reason);
  }

  async function reconnect(session) {
    if (session.closed || closed || !sessions.has(session.id)) return;
    const client = new TelnetClient({ maxOutputChars: limits.maxOutputChars });
    session.client = client;
    session.failedClient = null;
    bindClient(session, client);
    try {
      const info = await client.connect(session.port, session.credentials, limits.connectTimeoutMs);
      if (session.closed || session.client !== client) {
        client.close();
        return;
      }
      applyInfo(session, info);
      if (session.cols && session.rows) client.resize(session.cols, session.rows);
      session.reconnectAttempt = 0;
      session.lastError = null;
      appendOutput(session, '\r\n[连接已恢复]\r\n');
      setStatus(session, session.pendingExec > 0 ? 'locked' : 'ready');
      updateFlow(session);
    } catch (error) {
      handleFailure(session, client, error);
    }
  }

  async function create({ port, username, password } = {}) {
    if (closed) throw new SessionError('bridge_closed', 'Bridge is shutting down', 503);
    const portNumber = Number(port);
    if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
      throw new SessionError('invalid_port', 'port must be an integer between 1 and 65535', 400);
    }
    if (sessions.size >= limits.maxSessions) {
      throw new SessionError(
        'session_limit',
        `Maximum of ${limits.maxSessions} concurrent sessions reached`,
        409,
      );
    }

    const client = new TelnetClient({ maxOutputChars: limits.maxOutputChars });
    const now = Date.now();
    const session = {
      id: randomUUID(),
      client,
      port: portNumber,
      credentials: {
        username: username ?? defaultCredentials.username,
        password: password ?? defaultCredentials.password,
      },
      deviceName: null,
      prompt: '',
      view: 'unknown',
      createdAt: now,
      lastActiveAt: now,
      queue: Promise.resolve(),
      subscribers: new Map(),
      terminalBuffer: '',
      locked: false,
      status: 'connecting',
      lastError: null,
      pendingExec: 0,
      cols: null,
      rows: null,
      paused: false,
      closed: false,
      allowReconnect: false,
      reconnectAttempt: 0,
      reconnectTimer: null,
      failedClient: null,
      clientCleanup: null,
    };
    bindClient(session, client);

    try {
      const info = await client.connect(portNumber, session.credentials, limits.connectTimeoutMs);
      applyInfo(session, info);
      session.status = 'ready';
      session.allowReconnect = true;
    } catch (error) {
      session.closed = true;
      disposeClient(session);
      throw error;
    }

    sessions.set(session.id, session);
    return publicInfo(session);
  }

  function setStatus(session, status, detail = {}) {
    session.status = status;
    if (status === 'ready') session.lastError = null;
    emit(session, { type: 'status', status, ...detail });
  }

  function emit(session, event) {
    for (const [subscriber, entry] of [...session.subscribers]) {
      try {
        if (subscriber(event) === false) entry.blocked = true;
      } catch {
        // A detached or failed consumer must not interrupt the device or other consumers.
      }
    }
    updateFlow(session);
  }

  function attach(id, subscriber) {
    const session = get(id);
    let entry = session.subscribers.get(subscriber);
    if (entry) entry.count += 1;
    else {
      entry = { count: 1, blocked: false };
      session.subscribers.set(subscriber, entry);
    }
    let detached = false;
    return {
      info: publicInfo(session),
      replay: session.terminalBuffer,
      detach: () => {
        if (detached) return;
        detached = true;
        entry.count -= 1;
        if (entry.count === 0) session.subscribers.delete(subscriber);
        updateFlow(session);
      },
      resume: () => {
        if (entry.count > 0) {
          entry.blocked = false;
          updateFlow(session);
        }
      },
    };
  }

  function write(id, data) {
    const session = get(id);
    if (session.locked) {
      throw new SessionError('session_busy', 'Session is running an acceptance command', 409);
    }
    if (typeof data !== 'string' || data.length === 0) {
      throw new SessionError('invalid_input', 'Terminal input must be a non-empty string', 400);
    }
    if (session.status !== 'ready') {
      throw new SessionError('session_not_ready', 'Session is not connected', 409);
    }
    // VRP console 用 BS(0x08) 删除字符；浏览器与 xterm 默认发送 DEL(0x7F)，直接下发会被忽略。
    session.client.write(data.replace(/\x7f/g, '\x08'));
    session.lastActiveAt = Date.now();
  }

  function resize(id, cols, rows) {
    const session = get(id);
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1 || cols > 65535 || rows > 65535) {
      throw new SessionError('invalid_resize', 'Terminal dimensions must be integers between 1 and 65535', 400);
    }
    session.cols = cols;
    session.rows = rows;
    if (session.status === 'ready' || session.status === 'locked') {
      session.client.resize(cols, rows);
    }
    session.lastActiveAt = Date.now();
  }

  function enqueue(session, fn) {
    const run = session.queue.then(fn);
    session.queue = run.catch(() => {});
    return run;
  }

  function acquire(session) {
    if (session.status !== 'ready' && session.status !== 'locked') {
      throw new SessionError('session_not_ready', 'Session is not connected', 409);
    }
    session.pendingExec += 1;
    session.locked = true;
    if (session.pendingExec === 1) setStatus(session, 'locked');
  }

  function release(session) {
    session.pendingExec -= 1;
    if (session.pendingExec === 0) {
      session.locked = false;
      if (!session.closed && session.status === 'locked') setStatus(session, 'ready');
    }
  }

  function exec(id, command, waitMs) {
    const session = get(id);
    if (typeof command !== 'string' || command.trim() === '') {
      throw new SessionError('invalid_command', 'command must be a non-empty string', 400);
    }
    acquire(session);
    const client = session.client;
    return enqueue(session, async () => {
      session.lastActiveAt = Date.now();
      const result = await client.exec(command, {
        waitMs: waitMs != null ? Number(waitMs) : limits.execTimeoutMs,
      });
      session.prompt = result.prompt;
      session.view = result.view;
      session.lastActiveAt = Date.now();
      return {
        ...result,
        sessionId: session.id,
        deviceName: session.deviceName,
      };
    }).finally(() => release(session));
  }

  function complete(id, partial, opts = {}) {
    const session = get(id);
    acquire(session);
    const client = session.client;
    return enqueue(session, async () => {
      session.lastActiveAt = Date.now();
      const result = await client.complete(partial ?? '', {
        timeoutMs: opts.timeoutMs != null ? Number(opts.timeoutMs) : limits.completeTimeoutMs,
        idleMs: opts.idleMs != null ? Number(opts.idleMs) : undefined,
      });
      session.prompt = result.prompt;
      session.view = result.view;
      session.lastActiveAt = Date.now();
      return { ...result, sessionId: session.id, deviceName: session.deviceName };
    }).finally(() => release(session));
  }

  function remove(id, reason = '会话已断开') {
    const session = sessions.get(id);
    if (!session) return false;
    sessions.delete(id);
    session.closed = true;
    session.allowReconnect = false;
    if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
    session.reconnectTimer = null;
    disposeClient(session);
    setStatus(session, 'closed', { reason });
    session.subscribers.clear();
    return true;
  }

  function shutdown() {
    closed = true;
    for (const timer of timers) clearInterval(timer);
    for (const session of [...sessions.values()]) remove(session.id, 'Bridge is shutting down');
  }

  return { create, list, get, attach, write, resize, exec, complete, remove, shutdown, size: () => sessions.size, limits };
}

export { TelnetError };
export default createSessionManager;
