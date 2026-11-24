import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { WebSocket } from 'ws';
import { createMockDevice } from '../__fixtures__/mock-device.mjs';
import { createSessionManager } from '../sessions.mjs';
import { attachTerminalWebSocket } from '../terminal-ws.mjs';

const CREDENTIALS = { username: 'admin', password: 'admin' };
const ALLOWED_ORIGIN_RE = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;

async function waitFor(check, timeoutMs = 2500) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  assert.fail('Timed out waiting for WebSocket message');
}

async function createFixture() {
  const device = await createMockDevice({ port: 0 });
  const sessions = createSessionManager({ credentials: CREDENTIALS });
  const server = http.createServer();
  const terminal = attachTerminalWebSocket({
    server,
    sessions,
    isAllowedOrigin: (origin) => !origin || ALLOWED_ORIGIN_RE.test(origin),
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    device,
    sessions,
    server,
    terminal,
    url: `ws://127.0.0.1:${address.port}/api/ensp/terminal`,
    async close() {
      await terminal.close();
      sessions.shutdown();
      await new Promise((resolve) => server.close(resolve));
      await device.close();
    },
  };
}

test('terminal ws: sends ready state and streams interactive input and output', async () => {
  const fixture = await createFixture();
  let socket;
  try {
    const info = await fixture.sessions.create({ port: fixture.device.port });
    const messages = [];
    socket = new WebSocket(`${fixture.url}?sessionId=${info.sessionId}`, {
      origin: 'http://localhost:5173',
    });
    socket.on('message', (data) => messages.push(JSON.parse(data.toString('utf8'))));
    await waitFor(() => messages.some((message) => message.type === 'ready'));
    assert.equal(messages.find((message) => message.type === 'ready').session.sessionId, info.sessionId);

    socket.send(JSON.stringify({ type: 'input', data: 'display version\r' }));
    await waitFor(() =>
      messages.some((message) => message.type === 'output' && message.data.includes('VRP (R) software')),
    );
  } finally {
    socket?.close();
    await fixture.close();
  }
});

test('terminal ws: rejects a non-local web origin before touching a session', async () => {
  const fixture = await createFixture();
  try {
    const error = await new Promise((resolve) => {
      const socket = new WebSocket(`${fixture.url}?sessionId=not-created`, {
        origin: 'https://untrusted.example',
      });
      socket.on('open', () => {
        socket.close();
        resolve(new Error('Forbidden origin unexpectedly connected'));
      });
      socket.on('error', resolve);
    });
    assert.match(error.message, /403/);
    assert.equal(fixture.sessions.size(), 0);
  } finally {
    await fixture.close();
  }
});

test('terminal ws: rejects a non-loopback peer before touching a session', async () => {
  const fixture = await createFixture();
  try {
    let response = '';
    let destroyed = false;
    const socket = {
      write(data) {
        response += data;
      },
      destroy() {
        destroyed = true;
      },
    };
    fixture.server.emit(
      'upgrade',
      {
        url: '/api/ensp/terminal?sessionId=not-created',
        headers: { origin: 'http://localhost:5173' },
        socket: { remoteAddress: '203.0.113.10' },
      },
      socket,
      Buffer.alloc(0),
    );
    assert.match(response, /403 Forbidden/);
    assert.equal(destroyed, true);
    assert.equal(fixture.sessions.size(), 0);
  } finally {
    await fixture.close();
  }
});

test('terminal ws: rejects missing and unknown session IDs', async () => {
  const fixture = await createFixture();
  try {
    for (const suffix of ['', '?sessionId=not-created']) {
      const error = await new Promise((resolve) => {
        const socket = new WebSocket(`${fixture.url}${suffix}`, { origin: 'http://localhost:5173' });
        socket.on('open', () => {
          socket.close();
          resolve(new Error('Invalid session unexpectedly connected'));
        });
        socket.on('error', resolve);
      });
      assert.match(error.message, /404/);
    }
    assert.equal(fixture.sessions.size(), 0);
  } finally {
    await fixture.close();
  }
});

test('terminal ws: supports state, resize, locked input errors and explicit close', async () => {
  const fixture = await createFixture();
  let socket;
  try {
    const info = await fixture.sessions.create({ port: fixture.device.port });
    const session = fixture.sessions.get(info.sessionId);
    let dimensions = null;
    session.client.resize = (cols, rows) => {
      dimensions = { cols, rows };
    };
    const messages = [];
    let closed = false;
    socket = new WebSocket(`${fixture.url}?sessionId=${info.sessionId}`, {
      origin: 'http://localhost:5173',
    });
    socket.on('message', (data) => messages.push(JSON.parse(data.toString('utf8'))));
    socket.on('close', () => {
      closed = true;
    });
    await waitFor(() => messages.some((message) => message.type === 'ready'));

    socket.send(JSON.stringify({ type: 'resize', cols: 120, rows: 36 }));
    await waitFor(() => dimensions !== null);
    assert.deepEqual(dimensions, { cols: 120, rows: 36 });

    const running = fixture.sessions.exec(info.sessionId, 'hang', 60);
    await waitFor(() => messages.some((message) => message.type === 'state' && message.status === 'locked'));
    assert.ok(messages.some((message) => message.type === 'status' && message.status === 'locked'));
    socket.send(JSON.stringify({ type: 'input', data: 'display version\r' }));
    await waitFor(() => messages.some((message) => message.type === 'error' && message.code === 'session_busy'));
    await assert.rejects(running, (error) => error.code === 'timeout');
    await waitFor(() => messages.some((message) => message.type === 'state' && message.status === 'ready'));

    socket.send(JSON.stringify({ type: 'resize', cols: 0, rows: 36 }));
    await waitFor(() => messages.some((message) => message.type === 'error' && message.code === 'invalid_resize'));
    socket.send(JSON.stringify({ type: 'close' }));
    await waitFor(() => closed);
    assert.equal(fixture.sessions.size(), 0);
    assert.ok(messages.some((message) => message.type === 'state' && message.status === 'closed'));
  } finally {
    socket?.close();
    await fixture.close();
  }
});

test('terminal ws: repeated socket subscriptions stay independent', async () => {
  const fixture = await createFixture();
  let first;
  let second;
  try {
    const info = await fixture.sessions.create({ port: fixture.device.port });
    const firstMessages = [];
    const secondMessages = [];
    first = new WebSocket(`${fixture.url}?sessionId=${info.sessionId}`);
    second = new WebSocket(`${fixture.url}?sessionId=${info.sessionId}`);
    first.on('message', (data) => firstMessages.push(JSON.parse(data.toString('utf8'))));
    second.on('message', (data) => secondMessages.push(JSON.parse(data.toString('utf8'))));
    await waitFor(() =>
      [firstMessages, secondMessages].every((messages) => messages.some((message) => message.type === 'ready')),
    );

    first.send(JSON.stringify({ type: 'input', data: '\x03' }));
    await waitFor(() =>
      [firstMessages, secondMessages].every((messages) => messages.some((message) => message.type === 'output')),
    );
    first.close();
    await waitFor(() => first.readyState === WebSocket.CLOSED);
    const count = secondMessages.length;
    second.send(JSON.stringify({ type: 'input', data: '\x03' }));
    await waitFor(() => secondMessages.length > count);
  } finally {
    first?.close();
    second?.close();
    await fixture.close();
  }
});

test('terminal ws: output backpressure pauses and resumes the device without dropping data', async () => {
  const fixture = await createFixture();
  let socket;
  try {
    const info = await fixture.sessions.create({ port: fixture.device.port });
    const session = fixture.sessions.get(info.sessionId);
    const messages = [];
    socket = new WebSocket(`${fixture.url}?sessionId=${info.sessionId}`);
    socket.on('message', (data) => messages.push(JSON.parse(data.toString('utf8'))));
    await waitFor(() => messages.some((message) => message.type === 'ready'));
    await waitFor(() => fixture.terminal.clients.size === 1);

    const serverSocket = [...fixture.terminal.clients][0];
    const originalSend = serverSocket.send;
    let blocked = true;
    let flushed;
    const sent = [];
    Object.defineProperty(serverSocket, 'bufferedAmount', {
      configurable: true,
      get: () => (blocked ? 16 * 1024 * 1024 : 0),
    });
    serverSocket.send = (data, callback) => {
      sent.push(JSON.parse(data.toString('utf8')));
      if (callback) flushed = callback;
    };

    socket.send(JSON.stringify({ type: 'input', data: '\x03' }));
    await waitFor(() => sent.some((message) => message.type === 'output'));
    assert.equal(session.paused, true);
    assert.equal(typeof flushed, 'function');

    blocked = false;
    flushed();
    assert.equal(session.paused, false);
    serverSocket.send = originalSend;
    delete serverSocket.bufferedAmount;
  } finally {
    socket?.close();
    await fixture.close();
  }
});
