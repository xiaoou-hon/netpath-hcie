import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const vite = await createServer({
  root: fileURLToPath(new URL('../../..', import.meta.url)),
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});
const { EnspTerminalSocket } = await vite.ssrLoadModule('/src/lib/bridge/client.ts');
after(() => vite.close());

class FakeWebSocket {
  static OPEN = 1;
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    this.closeCalls = 0;
    this.sent = [];
    FakeWebSocket.instances.push(this);
  }

  send(data) {
    this.sent.push(data);
  }

  close() {
    this.closeCalls += 1;
    this.readyState = 3;
  }
}

function installFakes(t) {
  const originalWindow = globalThis.window;
  const originalWebSocket = globalThis.WebSocket;
  const timers = new Map();
  let nextTimer = 1;
  const fakeWindow = {
    setTimeout(callback) {
      const id = nextTimer++;
      timers.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
  globalThis.window = fakeWindow;
  globalThis.WebSocket = FakeWebSocket;
  FakeWebSocket.instances = [];
  t.after(() => {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalWebSocket === undefined) delete globalThis.WebSocket;
    else globalThis.WebSocket = originalWebSocket;
  });
  return timers;
}

function handlers() {
  return {
    onReady() {},
    onOutput() {},
    onState() {},
    onTransport() {},
    onError() {},
  };
}

test('terminal socket: dispose closes an active socket and prevents later writes or reconnects', (t) => {
  const timers = installFakes(t);
  const terminal = new EnspTerminalSocket('session-active', handlers());
  const socket = FakeWebSocket.instances[0];

  terminal.dispose();
  terminal.dispose();
  terminal.reconnect();

  assert.equal(socket.closeCalls, 1);
  assert.equal(socket.onmessage, null);
  assert.equal(socket.onclose, null);
  assert.equal(socket.onerror, null);
  assert.equal(terminal.write('display clock\r'), false);
  assert.equal(terminal.resize(80, 24), false);
  assert.equal(timers.size, 0);
  assert.equal(FakeWebSocket.instances.length, 1);
});

test('terminal socket: dispose during reconnect clears the timer and stale socket listeners', (t) => {
  const timers = installFakes(t);
  const terminal = new EnspTerminalSocket('session-reconnect', handlers());
  const socket = FakeWebSocket.instances[0];

  socket.onclose();
  assert.equal(timers.size, 1);
  const pendingReconnect = [...timers.values()][0];
  terminal.dispose();
  pendingReconnect();

  assert.equal(timers.size, 0);
  assert.equal(socket.onmessage, null);
  assert.equal(socket.onclose, null);
  assert.equal(socket.onerror, null);
  assert.equal(FakeWebSocket.instances.length, 1);
});
