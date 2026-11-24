import test from 'node:test';
import assert from 'node:assert/strict';

import { createMockDevice } from '../__fixtures__/mock-device.mjs';
import { TelnetClient } from '../telnet.mjs';

const CREDENTIALS = { username: 'admin', password: 'admin' };

async function withClient(fn, credentials = CREDENTIALS) {
  const device = await createMockDevice({ port: 0 });
  const client = new TelnetClient({ execTimeoutMs: 5000 });
  try {
    await client.connect(device.port, credentials, 5000);
    await fn(client, device);
  } finally {
    client.close();
    await device.close();
  }
}

test('telnet: logs in and reports prompt, view and device name', async () => {
  await withClient(async (client) => {
    assert.equal(client.prompt, '<R1>');
    assert.equal(client.view, 'user');
    assert.equal(client.deviceName, 'R1');
  });
});

test('mock device: options.hostname controls prompts and display version output', async () => {
  const device = await createMockDevice({ port: 0, hostname: 'R2-CORE' });
  const client = new TelnetClient({ execTimeoutMs: 5000 });
  try {
    await client.connect(device.port, CREDENTIALS, 5000);
    assert.equal(client.prompt, '<R2-CORE>');
    const result = await client.exec('display version');
    assert.match(result.output, /HUAWEI R2-CORE uptime/);
  } finally {
    client.close();
    await device.close();
  }
});

test('mock device: MOCK_HOSTNAME supplies the hostname when options omit it', async () => {
  const previous = process.env.MOCK_HOSTNAME;
  process.env.MOCK_HOSTNAME = 'R3-ENV';
  let device;
  const client = new TelnetClient({ execTimeoutMs: 5000 });
  try {
    device = await createMockDevice({ port: 0, autoLogin: true });
    await client.connect(device.port, CREDENTIALS, 5000);
    assert.equal(client.prompt, '<R3-ENV>');
  } finally {
    if (previous === undefined) delete process.env.MOCK_HOSTNAME;
    else process.env.MOCK_HOSTNAME = previous;
    client.close();
    await device?.close();
  }
});

test('telnet: unsupported pagination init stays out of terminal output', async () => {
  const device = await createMockDevice({ port: 0, screenLengthError: true });
  const client = new TelnetClient({ execTimeoutMs: 5000 });
  const streamed = [];
  client.on('terminalData', (data) => streamed.push(data));
  try {
    await client.connect(device.port, CREDENTIALS, 5000);
    assert.equal(client.paginationDisabled, false);
    assert.equal(client.prompt, '<R1>');
    const text = streamed.join('');
    assert.doesNotMatch(text, /screen-length/);
    assert.doesNotMatch(text, /Error:/);
  } finally {
    client.close();
    await device.close();
  }
});

test('telnet: system-view switches view and prompt', async () => {
  await withClient(async (client) => {
    const result = await client.exec('system-view');
    assert.equal(result.prompt, '[R1]');
    assert.equal(result.view, 'system');
    assert.equal(client.view, 'system');
  });
});

test('telnet: configures an interface and displays ip interface brief', async () => {
  await withClient(async (client) => {
    await client.exec('system-view');
    const interfaceResult = await client.exec('interface GigabitEthernet0/0/0');
    assert.equal(interfaceResult.view, 'sub');
    assert.equal(interfaceResult.prompt, '[R1-GigabitEthernet0/0/0]');

    await client.exec('ip address 192.168.12.1 24');
    await client.exec('undo shutdown');
    await client.exec('quit');
    await client.exec('quit');

    const result = await client.exec('display ip interface brief');
    assert.match(result.output, /GigabitEthernet0\/0\/0/);
    assert.match(result.output, /up\s+up/);
    assert.match(result.output, /192\.168\.12\.1\/24/);
    assert.equal(result.view, 'user');
  });
});

test('telnet: unknown command surfaces device error', async () => {
  await withClient(async (client) => {
    const result = await client.exec('totally-unknown-command');
    assert.match(result.output, /Error: Unrecognized command found at '\^' position\./);
  });
});

test('telnet: display version contains VRP version', async () => {
  await withClient(async (client) => {
    const result = await client.exec('display version');
    assert.match(result.output, /VRP \(R\) software, Version 8\.180/);
  });
});

test('telnet: wrong password fails with auth_failed', async () => {
  const device = await createMockDevice({ port: 0 });
  const client = new TelnetClient();
  try {
    await assert.rejects(
      client.connect(device.port, { username: 'admin', password: 'wrong' }, 3000),
      (error) => error.code === 'auth_failed',
    );
  } finally {
    client.close();
    await device.close();
  }
});

test('telnet: unresponsive command times out', async () => {
  await withClient(async (client) => {
    await assert.rejects(
      client.exec('hang', { waitMs: 150 }),
      (error) => error.code === 'timeout',
    );
  });
});

test('telnet: terminal stream preserves ANSI and CR while exec data is normalized', () => {
  const client = new TelnetClient();
  const stream = [];
  const normalized = [];
  client.on('terminalData', (data) => stream.push(data));
  client.on('data', (data) => normalized.push(data));

  client._onData(Buffer.from('A\r\n\x1b[31mB\x1b[0m\rC'));

  assert.equal(stream.join(''), 'A\r\n\x1b[31mB\x1b[0m\rC');
  assert.equal(normalized.join(''), 'A\nB\nC');
});

test('telnet: IAC negotiation is removed without damaging either text stream', () => {
  const client = new TelnetClient();
  const stream = [];
  const normalized = [];
  client.on('terminalData', (data) => stream.push(data));
  client.on('data', (data) => normalized.push(data));

  client._onData(Buffer.from([0x41, 0xff, 0xfd]));
  client._onData(Buffer.from([0x1f, 0x0d, 0x0a, 0x42]));

  assert.equal(stream.join(''), 'A\r\nB');
  assert.equal(normalized.join(''), 'A\nB');
});

test('telnet: resize sends NAWS only after the server enables it', () => {
  const client = new TelnetClient();
  const writes = [];
  client.socket = {
    destroyed: false,
    write(data) {
      writes.push(Buffer.from(data));
    },
  };

  client.resize(120, 36);
  assert.equal(writes.length, 0);

  client._onData(Buffer.from([0xff, 0xfd, 0x1f]));
  assert.deepEqual([...writes[0]], [0xff, 0xfb, 0x1f]);
  assert.deepEqual(
    [...writes[1]],
    [0xff, 0xfa, 0x1f, 0x00, 0x78, 0x00, 0x24, 0xff, 0xf0],
  );

  client._onData(Buffer.from([0xff, 0xfe, 0x1f]));
  client.resize(80, 24);
  assert.equal(writes.length, 2);
});

test('telnet: pagination advances without removing the marker from the terminal stream', () => {
  const client = new TelnetClient();
  const writes = [];
  const stream = [];
  client.socket = {
    destroyed: false,
    write(data) {
      writes.push(Buffer.from(data));
    },
  };
  client.on('terminalData', (data) => stream.push(data));

  client._onData(Buffer.from('first page\r\n---- More ----'));

  assert.equal(stream.join(''), 'first page\r\n---- More ----');
  assert.ok(writes.some((data) => data.toString('utf8') === ' '));
});
