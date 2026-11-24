import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';

import { createMockDevice } from '../__fixtures__/mock-device.mjs';
import { handleRequest } from '../index.mjs';
import { probeTopology, scanPorts } from '../scan.mjs';

async function startDeviceInRange(options = {}) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const port = 2000 + Math.floor(Math.random() * 51);
    try {
      return await createMockDevice({ port, ...options });
    } catch {
      // Port busy; try another one in the range.
    }
  }
  throw new Error('Could not find a free port in 2000-2050');
}

async function findClosedPort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function startTcpServer(onSocket) {
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('error', () => {});
    socket.on('close', () => sockets.delete(socket));
    onSocket(socket);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    port: server.address().port,
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

test('scan: detects login and shell fixtures and reports closed ports', async () => {
  const loginDevice = await startDeviceInRange();
  const shellDevice = await startDeviceInRange({ autoLogin: true });
  const closedPort = await findClosedPort();

  try {
    const result = await scanPorts({
      from: 0,
      to: 0,
      ports: [loginDevice.port, shellDevice.port, closedPort],
      noCache: true,
    });

    assert.equal(result.scanned, 3);
    assert.equal(result.cached, false);

    const loginEntry = result.devices.find((device) => device.port === loginDevice.port);
    assert.ok(loginEntry, 'login device should be discovered');
    assert.equal(loginEntry.state, 'login');

    const shellEntry = result.devices.find((device) => device.port === shellDevice.port);
    assert.ok(shellEntry, 'shell device should be discovered');
    assert.equal(shellEntry.state, 'shell');
    assert.equal(shellEntry.name, 'R1');
    assert.equal(shellEntry.view, 'user');
    assert.equal(shellEntry.prompt, '<R1>');

    assert.ok(
      result.failures.some((failure) => failure.port === closedPort),
      'closed port should be reported as a failure',
    );
  } finally {
    await loginDevice.close();
    await shellDevice.close();
  }
});

test('scan: second identical request is served from cache', async () => {
  const device = await startDeviceInRange({ autoLogin: true });
  try {
    const options = {
      from: 0,
      to: 0,
      ports: [device.port],
      cacheTtlMs: 5000,
    };
    const first = await scanPorts(options);
    assert.equal(first.cached, false);
    const second = await scanPorts(options);
    assert.equal(second.cached, true);
    assert.ok(second.devices.some((entry) => entry.port === device.port));
  } finally {
    await device.close();
  }
});

test('topology scan: probes imported comPort values with manual overrides and never probes non-VRP nodes', async () => {
  const topology = {
    name: 'Imported',
    source: { type: 'fallback-xml' },
    warnings: [],
    devices: [
      { id: 'r1', name: 'R1', model: 'AR2220', comPort: 21001, vrpCapable: true },
      { id: 'r2', name: 'R2', model: 'AR2220', comPort: 21002, vrpCapable: true },
      { id: 'pc1', name: 'PC1', model: 'PC', comPort: 21003, vrpCapable: false },
      { id: 'cloud1', name: 'Cloud1', model: 'Cloud', comPort: 21004, vrpCapable: true },
      { id: 'server1', name: 'Server1', model: 'Server', comPort: 0, vrpCapable: true },
      { id: 'ar0', name: 'AR0', model: 'AR2220', comPort: 0, vrpCapable: true },
    ],
    links: [],
  };
  const original = structuredClone(topology);
  const probed = [];
  const result = await probeTopology(topology, {
    mappings: { r2: 22002, pc1: 22003, cloud1: 22004, server1: 22005, ar0: 22006 },
    probe: async (port) => {
      probed.push(port);
      const name = port === 22002 ? 'R2' : 'R1';
      return { port, state: 'shell', name, prompt: `<${name}>`, view: 'user' };
    },
  });

  assert.deepEqual(probed.sort((a, b) => a - b), [21001, 22002]);
  assert.equal(result.scanned, 2);
  assert.equal(result.devices.length, topology.devices.length);
  assert.deepEqual(
    result.devices.map((device) => [device.deviceId, device.port, device.state, device.connectable]),
    [
      ['r1', 21001, 'ready', true],
      ['r2', 22002, 'ready', true],
      ['pc1', 21003, 'unavailable', false],
      ['cloud1', 21004, 'unavailable', false],
      ['server1', 0, 'unavailable', false],
      ['ar0', 0, 'unavailable', false],
    ],
  );
  assert.equal(result.devices[0].mappingSource, 'topology');
  assert.equal(result.devices[1].mappingSource, 'manual');
  assert.deepEqual(topology, original, 'refresh must not mutate the imported static topology');
});

test('topology scan: uses Enter and VRP prompts to distinguish runtime states and mismatches', async () => {
  let readyInput = '';
  let silentInput = '';
  const ready = await startTcpServer((socket) => {
    let answered = false;
    socket.on('data', (chunk) => {
      readyInput += chunk.toString('utf8');
      if (!answered) {
        answered = true;
        socket.write('\r\n<R1>');
      }
    });
  });
  const auth = await startTcpServer((socket) => socket.write('Username:'));
  const silent = await startTcpServer((socket) => {
    socket.on('data', (chunk) => {
      silentInput += chunk.toString('utf8');
    });
  });
  const mismatch = await startTcpServer((socket) => {
    socket.once('data', () => socket.write('\r\n<Other>'));
  });
  const nonVrp = await startTcpServer((socket) => {
    socket.once('data', () => socket.write('SSH-2.0-not-a-vrp-console\r\n'));
  });
  const offlinePort = await findClosedPort();
  const servers = [ready, auth, silent, mismatch, nonVrp];

  try {
    const entries = [
      ['ready', 'R1', ready.port],
      ['auth', 'R2', auth.port],
      ['starting', 'R3', silent.port],
      ['mismatch', 'R4', mismatch.port],
      ['non-vrp', 'R5', nonVrp.port],
      ['offline', 'R6', offlinePort],
    ];
    const result = await probeTopology(
      {
        devices: entries.map(([id, name, comPort]) => ({
          id,
          name,
          model: 'AR2220',
          comPort,
          vrpCapable: true,
        })),
      },
      { connectTimeoutMs: 100, readMs: 80 },
    );

    assert.deepEqual(
      Object.fromEntries(result.devices.map((device) => [device.deviceId, device.state])),
      {
        ready: 'ready',
        auth: 'auth-pending',
        starting: 'starting',
        mismatch: 'name-mismatch',
        'non-vrp': 'error',
        offline: 'offline',
      },
    );
    assert.match(readyInput, /\r\n/, 'ready detection must wake the console with Enter');
    assert.match(silentInput, /\r\n/, 'a silent listener must also be probed with Enter');
    assert.equal(result.devices.find((device) => device.deviceId === 'starting').connectable, false);
    assert.equal(result.devices.find((device) => device.deviceId === 'mismatch').name, 'Other');
    assert.equal(result.devices.find((device) => device.deviceId === 'mismatch').connectable, false);
    assert.equal(result.devices.find((device) => device.deviceId === 'non-vrp').reason, 'non_vrp');
  } finally {
    await Promise.all(servers.map((server) => server.close()));
  }
});

test('topology scan http: POST accepts topology mappings while legacy GET stays compatible', async () => {
  const device = await startTcpServer((socket) => {
    socket.once('data', () => socket.write('\r\n<R1>'));
  });
  const closedPort = await findClosedPort();
  const bridge = http.createServer((req, res) => {
    void handleRequest(req, res);
  });
  await new Promise((resolve) => bridge.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${bridge.address().port}`;

  try {
    const response = await fetch(`${baseUrl}/api/ensp/scan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        topology: {
          name: 'Imported',
          devices: [{ id: 'r1', name: 'R1', model: 'AR2220', comPort: closedPort, vrpCapable: true }],
          links: [],
        },
        mappings: { r1: device.port },
      }),
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.data.scanned, 1);
    assert.equal(payload.data.devices[0].deviceId, 'r1');
    assert.equal(payload.data.devices[0].port, device.port);
    assert.equal(payload.data.devices[0].mappingSource, 'manual');
    assert.equal(payload.data.devices[0].state, 'ready');

    const legacyResponse = await fetch(`${baseUrl}/api/ensp/scan?from=0&to=0&ports=${device.port}`);
    const legacyPayload = await legacyResponse.json();
    assert.equal(legacyResponse.status, 200);
    assert.equal(legacyPayload.data.devices[0].state, 'shell');
    assert.equal(legacyPayload.data.devices[0].name, 'R1');
  } finally {
    await new Promise((resolve) => bridge.close(resolve));
    await device.close();
  }
});
