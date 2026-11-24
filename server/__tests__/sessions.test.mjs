import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import http from 'node:http';

import { createMockDevice } from '../__fixtures__/mock-device.mjs';
import { createSessionManager } from '../sessions.mjs';
import { handleRequest } from '../index.mjs';

const CREDENTIALS = { username: 'admin', password: 'admin' };

async function waitFor(check, timeoutMs = 2500) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  assert.fail('Timed out waiting for interactive session output');
}

test('sessions: interactive input streams raw output and replays it on reattach', async () => {
  const device = await createMockDevice({ port: 0 });
  const manager = createSessionManager({ credentials: CREDENTIALS });
  try {
    const info = await manager.create({ port: device.port });
    const events = [];
    const first = manager.attach(info.sessionId, (event) => events.push(event));

    manager.write(info.sessionId, 'display version\r');
    await waitFor(() =>
      events.some((event) => event.type === 'output' && event.data.includes('VRP (R) software')),
    );

    const output = events
      .filter((event) => event.type === 'output')
      .map((event) => event.data)
      .join('');
    assert.match(output, /\r\n/);

    const second = manager.attach(info.sessionId, () => undefined);
    assert.match(second.replay, /VRP \(R\) software, Version 8\.180/);
    first.detach();
    second.detach();
  } finally {
    manager.shutdown();
    await device.close();
  }
});

test('sessions: browser DEL input is delivered to VRP as backspace', async () => {
  const device = await createMockDevice({ port: 0 });
  const manager = createSessionManager({ credentials: CREDENTIALS });
  try {
    const info = await manager.create({ port: device.port });
    const events = [];
    const subscription = manager.attach(info.sessionId, (event) => events.push(event));
    manager.write(info.sessionId, 'ab\x7fc');
    await waitFor(() =>
      events.some((event) => event.type === 'output' && event.data.includes('KEY:BS')),
    );
    const output = events
      .filter((event) => event.type === 'output')
      .map((event) => event.data)
      .join('');
    assert.doesNotMatch(output, /KEY:DEL/);
    subscription.detach();
  } finally {
    manager.shutdown();
    await device.close();
  }
});

test('sessions: rejects interactive input while an exec command owns the console', async () => {
  const device = await createMockDevice({ port: 0 });
  const manager = createSessionManager({ credentials: CREDENTIALS });
  try {
    const info = await manager.create({ port: device.port });
    const running = manager.exec(info.sessionId, 'hang', 100);
    assert.throws(
      () => manager.write(info.sessionId, 'display version\r'),
      (error) => error.code === 'session_busy',
    );
    await assert.rejects(running, (error) => error.code === 'timeout');
    assert.doesNotThrow(() => manager.write(info.sessionId, 'display version\r'));
  } finally {
    manager.shutdown();
    await device.close();
  }
});

test('sessions: complete uses the same console lock as exec and interactive input', async () => {
  const device = await createMockDevice({ port: 0 });
  const manager = createSessionManager({ credentials: CREDENTIALS });
  try {
    const info = await manager.create({ port: device.port });
    const running = manager.complete(info.sessionId, 'dis', { idleMs: 40, timeoutMs: 1000 });
    assert.throws(() => manager.write(info.sessionId, '\x03'), (error) => error.code === 'session_busy');
    await running;
    assert.doesNotThrow(() => manager.write(info.sessionId, '\x03'));
  } finally {
    manager.shutdown();
    await device.close();
  }
});

test('sessions: resize validates dimensions and forwards them to Telnet', async () => {
  const device = await createMockDevice({ port: 0 });
  const manager = createSessionManager({ credentials: CREDENTIALS });
  try {
    const info = await manager.create({ port: device.port });
    const session = manager.get(info.sessionId);
    let resized = null;
    session.client.resize = (cols, rows) => {
      resized = { cols, rows };
    };

    manager.resize(info.sessionId, 120, 36);
    assert.deepEqual(resized, { cols: 120, rows: 36 });
    assert.throws(() => manager.resize(info.sessionId, 0, 36), (error) => error.code === 'invalid_resize');
  } finally {
    manager.shutdown();
    await device.close();
  }
});

test('sessions: duplicate subscriptions are replayed once and detached by reference count', async () => {
  const device = await createMockDevice({ port: 0 });
  const manager = createSessionManager({ credentials: CREDENTIALS });
  try {
    const info = await manager.create({ port: device.port });
    const events = [];
    const subscriber = (event) => events.push(event);
    const first = manager.attach(info.sessionId, subscriber);
    const second = manager.attach(info.sessionId, subscriber);

    manager.write(info.sessionId, '\x03');
    await waitFor(() => events.some((event) => event.type === 'output'));
    const outputEvents = events.filter((event) => event.type === 'output');
    assert.equal(new Set(outputEvents).size, outputEvents.length);

    first.detach();
    const count = events.length;
    manager.write(info.sessionId, '\x03');
    await waitFor(() => events.length > count);

    second.detach();
    second.detach();
    const detachedCount = events.length;
    manager.write(info.sessionId, '\x03');
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(events.length, detachedCount);
  } finally {
    manager.shutdown();
    await device.close();
  }
});

test('sessions: terminal replay stays within the configured scrollback bound', async () => {
  const device = await createMockDevice({ port: 0 });
  const manager = createSessionManager({
    credentials: CREDENTIALS,
    limits: { maxOutputChars: 160 },
  });
  try {
    const info = await manager.create({ port: device.port });
    const events = [];
    manager.attach(info.sessionId, (event) => events.push(event));
    manager.write(info.sessionId, 'display version\r');
    await waitFor(() => events.some((event) => event.data?.includes('VRP (R) software')));
    await waitFor(() => manager.get(info.sessionId).terminalBuffer.length === 160);
    const attachment = manager.attach(info.sessionId, () => undefined);
    assert.equal(attachment.replay.length, 160);
    attachment.detach();
  } finally {
    manager.shutdown();
    await device.close();
  }
});

test('sessions: high-frequency output stays bounded and duplicate subscriptions clean up by reference', async () => {
  const device = await createMockDevice({ port: 0 });
  const manager = createSessionManager({
    credentials: CREDENTIALS,
    limits: { maxOutputChars: 128 },
  });
  try {
    const info = await manager.create({ port: device.port });
    const session = manager.get(info.sessionId);
    const received = [];
    const subscriber = (event) => received.push(event);
    const first = manager.attach(info.sessionId, subscriber);
    const second = manager.attach(info.sessionId, subscriber);

    for (let index = 0; index < 400; index += 1) {
      session.client.emit('terminalData', `output-${String(index).padStart(4, '0')}-abcdefghijklmnopqrstuvwxyz\r\n`);
    }

    assert.equal(received.length, 400);
    assert.equal(session.subscribers.size, 1);
    assert.equal(session.terminalBuffer.length, 128);
    assert.ok(session.terminalBuffer.includes('output-0399'));
    assert.equal(session.client.listenerCount('terminalData'), 1);
    assert.equal(session.client.listenerCount('close'), 1);

    first.detach();
    assert.equal(session.subscribers.size, 1);
    second.detach();
    second.detach();
    assert.equal(session.subscribers.size, 0);
    session.client.emit('terminalData', 'after-detach');
    assert.equal(received.length, 400);

    assert.equal(manager.remove(info.sessionId), true);
    assert.equal(session.client.listenerCount('terminalData'), 0);
    assert.equal(session.client.listenerCount('close'), 0);
    assert.equal(manager.size(), 0);
  } finally {
    manager.shutdown();
    await device.close();
  }
});

test('sessions: raw Tab and Ctrl+C reach the device without breaking later input', async () => {
  const device = await createMockDevice({ port: 0 });
  const manager = createSessionManager({ credentials: CREDENTIALS });
  try {
    const info = await manager.create({ port: device.port });
    const events = [];
    manager.attach(info.sessionId, (event) => events.push(event));

    manager.write(info.sessionId, 'disp\t');
    await waitFor(() => events.some((event) => event.data === 'lay'));
    manager.write(info.sessionId, '\x03');
    await waitFor(() => events.some((event) => event.data?.includes('<R1>')));
    manager.write(info.sessionId, 'display version\r');
    await waitFor(() => events.some((event) => event.data?.includes('VRP (R) software')));
  } finally {
    manager.shutdown();
    await device.close();
  }
});

test('sessions: unexpected disconnect preserves output, rejects exec and reconnects without replay', async () => {
  let device = await createMockDevice({ port: 0 });
  const manager = createSessionManager({
    credentials: CREDENTIALS,
    limits: { reconnectAttempts: 2, reconnectBaseDelayMs: 100 },
  });
  try {
    const info = await manager.create({ port: device.port });
    const events = [];
    manager.attach(info.sessionId, (event) => events.push(event));
    const originalClient = manager.get(info.sessionId).client;
    const running = manager.exec(info.sessionId, 'hang', 5000);
    await new Promise((resolve) => setTimeout(resolve, 20));

    const port = device.port;
    await device.close();
    await assert.rejects(running, (error) => error.code === 'socket_error');
    const reconnectInput = [];
    device = await createMockDevice({ port });
    device.server.on('connection', (socket) => {
      socket.on('data', (chunk) => reconnectInput.push(chunk.toString('utf8')));
    });

    await waitFor(() => {
      const session = manager.get(info.sessionId);
      return session.status === 'ready' && session.client !== originalClient;
    }, 4000);
    await new Promise((resolve) => setTimeout(resolve, 120));

    assert.ok(events.some((event) => event.type === 'status' && event.status === 'reconnecting'));
    assert.ok(events.some((event) => event.type === 'status' && event.status === 'ready'));
    assert.ok(!reconnectInput.join('').includes('hang'));
    const replay = manager.attach(info.sessionId, () => undefined).replay;
    assert.match(replay, /连接已断开/);
    assert.match(replay, /连接已恢复/);
  } finally {
    manager.shutdown();
    await device.close();
  }
});

test('sessions: reconnect stops after the configured number of backoff attempts', async () => {
  const device = await createMockDevice({ port: 0 });
  const manager = createSessionManager({
    credentials: CREDENTIALS,
    limits: { reconnectAttempts: 2, reconnectBaseDelayMs: 30 },
  });
  try {
    const info = await manager.create({ port: device.port });
    const events = [];
    manager.attach(info.sessionId, (event) => events.push(event));
    await device.close();

    await waitFor(() => manager.get(info.sessionId).status === 'error', 4000);
    const reconnecting = events.filter((event) => event.status === 'reconnecting');
    assert.equal(reconnecting.length, 2);
    assert.equal(manager.get(info.sessionId).reconnectTimer, null);
    const count = events.length;
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(events.length, count);
    assert.doesNotThrow(() => manager.attach(info.sessionId, () => undefined));
  } finally {
    manager.shutdown();
  }
});

test('sessions: disconnect during authentication waits for manual action instead of retrying', async () => {
  let device = await createMockDevice({ port: 0 });
  const manager = createSessionManager({
    credentials: CREDENTIALS,
    limits: { reconnectAttempts: 3, reconnectBaseDelayMs: 30 },
  });
  let authServer;
  try {
    const info = await manager.create({ port: device.port });
    const port = device.port;
    await device.close();

    let connections = 0;
    authServer = net.createServer((socket) => {
      connections += 1;
      socket.write('Username:');
      socket.once('data', () => socket.destroy());
    });
    await new Promise((resolve) => authServer.listen(port, '127.0.0.1', resolve));

    await waitFor(() => manager.get(info.sessionId).status === 'error', 4000);
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.equal(connections, 1);
    assert.match(manager.get(info.sessionId).lastError, /认证/);
  } finally {
    manager.shutdown();
    if (authServer) await new Promise((resolve) => authServer.close(resolve));
  }
});

test('sessions: explicit close cancels reconnect and removes listeners and subscriptions', async () => {
  const device = await createMockDevice({ port: 0 });
  const manager = createSessionManager({
    credentials: CREDENTIALS,
    limits: { reconnectAttempts: 3, reconnectBaseDelayMs: 100 },
  });
  try {
    const info = await manager.create({ port: device.port });
    const events = [];
    manager.attach(info.sessionId, (event) => events.push(event));
    const session = manager.get(info.sessionId);
    session.client.nawsEnabled = true;
    await device.close();
    await waitFor(() => session.status === 'reconnecting');
    assert.doesNotThrow(() => manager.resize(info.sessionId, 100, 40));
    assert.equal(session.cols, 100);
    assert.equal(session.rows, 40);

    assert.equal(manager.remove(info.sessionId, '测试关闭'), true);
    assert.equal(session.reconnectTimer, null);
    assert.equal(session.subscribers.size, 0);
    assert.equal(session.client.listenerCount('terminalData'), 0);
    assert.equal(session.client.listenerCount('close'), 0);
    const count = events.length;
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(events.length, count);
  } finally {
    manager.shutdown();
  }
});

test('sessions: HTTP rejects an opaque Origin instead of trusting local requests', async () => {
  const server = http.createServer((req, res) => void handleRequest(req, res));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const rejected = await fetch(`${baseUrl}/api/ensp/sessions`, {
      headers: { origin: 'null' },
    });
    assert.equal(rejected.status, 403);
    assert.equal((await rejected.json()).error.code, 'origin_forbidden');

    const allowed = await fetch(`${baseUrl}/api/ensp/sessions`, {
      headers: { origin: 'http://localhost:5173' },
    });
    assert.equal(allowed.status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('sessions: REST connect, exec, complete, disconnect and sessions stay compatible', async () => {
  const device = await createMockDevice({ port: 0 });
  const server = http.createServer((req, res) => void handleRequest(req, res));
  let sessionId = null;
  let baseUrl = '';
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    const call = async (path, method = 'GET', body) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: response.status, payload: await response.json() };
    };

    const connected = await call('/api/ensp/connect', 'POST', {
      port: device.port,
      ...CREDENTIALS,
    });
    assert.equal(connected.status, 200);
    assert.equal(connected.payload.ok, true);
    sessionId = connected.payload.data.sessionId;
    assert.equal(connected.payload.data.prompt, '<R1>');

    const listed = await call('/api/ensp/sessions');
    assert.equal(listed.status, 200);
    assert.ok(listed.payload.data.some((item) => item.sessionId === sessionId));

    const executed = await call('/api/ensp/exec', 'POST', {
      sessionId,
      command: 'display version',
    });
    assert.equal(executed.status, 200);
    assert.match(executed.payload.data.output, /VRP \(R\) software/);
    assert.ok(!executed.payload.data.output.includes('\r'));

    const completed = await call('/api/ensp/complete', 'POST', {
      sessionId,
      line: 'disp',
    });
    assert.equal(completed.status, 200);
    assert.ok(completed.payload.data.candidates.includes('display'));

    const disconnected = await call('/api/ensp/disconnect', 'POST', { sessionId });
    assert.equal(disconnected.status, 200);
    assert.equal(disconnected.payload.data.disconnected, true);
    sessionId = null;
    const empty = await call('/api/ensp/sessions');
    assert.deepEqual(empty.payload.data, []);
  } finally {
    if (sessionId && baseUrl) {
      await fetch(`${baseUrl}/api/ensp/disconnect`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => undefined);
    }
    if (server.listening) await new Promise((resolve) => server.close(resolve));
    await device.close();
  }
});
