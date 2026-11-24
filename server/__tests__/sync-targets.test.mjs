import test from 'node:test';
import assert from 'node:assert/strict';

import * as sync from '../../src/lib/bridge/sync-targets.ts';
import { createMockDevice } from '../__fixtures__/mock-device.mjs';
import { createSessionManager } from '../sessions.mjs';

function mockTarget(initialStatus = 'ready', writeImpl) {
  let status = initialStatus;
  const writes = [];
  return {
    writes,
    setStatus: (next) => { status = next; },
    target: {
      status: () => status,
      write: (data) => {
        writes.push(data);
        return writeImpl ? writeImpl(data) : true;
      },
    },
  };
}

async function waitFor(check, timeoutMs = 2500) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  assert.fail('Timed out waiting for mock device output');
}

test('sync targets: disabled mode only writes to the active connected device', () => {
  assert.deepEqual(
    sync.resolveSyncTargets('r1', false, ['r2', 'r3'], ['r1', 'r2', 'r3']),
    ['r1'],
  );
  assert.deepEqual(sync.resolveSyncTargets('r1', false, [], []), []);
});

test('sync targets: enabled mode never adds an unselected active device', () => {
  assert.deepEqual(
    sync.resolveSyncTargets('r1', true, ['r2', 'offline', 'r3', 'r2'], ['r1', 'r2', 'r3']),
    ['r2', 'r3'],
  );
  assert.deepEqual(sync.resolveSyncTargets('r1', true, ['r2'], ['r2']), ['r2']);
});

test('sync targets: enabling requires two distinct explicitly selected ready writable targets', () => {
  const r1 = mockTarget();
  const r2 = mockTarget();
  const r3 = mockTarget();
  const targets = { r1: r1.target, r2: r2.target, r3: r3.target };
  assert.equal(sync.canEnableSync(['r1'], targets), false);
  assert.equal(sync.canEnableSync(['r1', 'r1'], targets), false);
  assert.equal(sync.canEnableSync(['r1', 'r2'], targets), true);

  r2.setStatus('locked');
  assert.equal(sync.canEnableSync(['r1', 'r2'], targets), false);
  r2.setStatus('offline');
  assert.equal(sync.canEnableSync(['r1', 'r2'], targets), false);
  assert.equal(sync.canEnableSync(['r1', 'missing'], targets), false);
  assert.equal(sync.canEnableSync(['r1', 'r2', 'r3'], targets), false);
});

test('sync input: normal keys and Ctrl+C fan out exactly once to selected targets only', () => {
  const active = mockTarget();
  const r2 = mockTarget();
  const r3 = mockTarget();
  const targets = { r1: active.target, r2: r2.target, r3: r3.target };
  const selected = sync.resolveSyncTargets('r1', true, ['r2', 'r3'], ['r1', 'r2', 'r3']);

  assert.deepEqual(sync.sendSyncInput('d', selected, targets), [
    { deviceId: 'r2', status: 'sent' },
    { deviceId: 'r3', status: 'sent' },
  ]);
  assert.deepEqual(sync.sendSyncInput('\x03', selected, targets), [
    { deviceId: 'r2', status: 'sent' },
    { deviceId: 'r3', status: 'sent' },
  ]);
  assert.deepEqual(active.writes, []);
  assert.deepEqual(r2.writes, ['d', '\x03']);
  assert.deepEqual(r3.writes, ['d', '\x03']);
});

test('sync input: offline, locked and failed writes are reported per device without blocking others', () => {
  const r1 = mockTarget();
  const r2 = mockTarget('offline');
  const r3 = mockTarget('locked');
  const r4 = mockTarget('ready', () => false);
  const targets = { r1: r1.target, r2: r2.target, r3: r3.target, r4: r4.target };

  assert.deepEqual(sync.sendSyncInput('x', ['r1', 'r2', 'r3', 'r4', 'missing'], targets), [
    { deviceId: 'r1', status: 'sent' },
    { deviceId: 'r2', status: 'offline' },
    { deviceId: 'r3', status: 'locked' },
    { deviceId: 'r4', status: 'write-failed' },
    { deviceId: 'missing', status: 'unavailable' },
  ]);
  assert.deepEqual(r1.writes, ['x']);
  assert.deepEqual(r2.writes, []);
  assert.deepEqual(r3.writes, []);
  assert.deepEqual(r4.writes, ['x']);
});

test('sync input: target state changes stop subsequent writes and disabling leaves zero broadcasts', () => {
  const r1 = mockTarget();
  const r2 = mockTarget();
  const targets = { r1: r1.target, r2: r2.target };
  const selected = ['r1', 'r2'];

  r2.setStatus('locked');
  assert.deepEqual(sync.sendSyncInput('a', selected, targets), [
    { deviceId: 'r1', status: 'sent' },
    { deviceId: 'r2', status: 'locked' },
  ]);
  r2.setStatus('offline');
  assert.equal(sync.sendSyncInput('b', selected, targets)[1].status, 'offline');
  assert.deepEqual(r2.writes, []);

  const single = sync.resolveSyncTargets('r1', false, selected, ['r1', 'r2']);
  assert.deepEqual(sync.sendSyncInput('c', single, targets), [{ deviceId: 'r1', status: 'sent' }]);
  assert.deepEqual(r1.writes, ['a', 'b', 'c']);
  assert.deepEqual(r2.writes, []);

  const remaining = sync.resolveSyncTargets('r1', true, selected, ['r1']);
  assert.deepEqual(remaining, ['r1']);
});

test('sync input: multiline and dangerous input cannot write before explicit confirmation', () => {
  const r1 = mockTarget();
  const r2 = mockTarget();
  const targets = { r1: r1.target, r2: r2.target };
  const multiline = '\x1b[200~system-view\rreboot\r\x1b[201~';

  assert.equal(sync.needsSyncConfirmation(multiline), true);
  assert.equal(sync.needsSyncConfirmation('\r', 'reboot'), true);
  assert.equal(sync.needsSyncConfirmation('\r', 'display clock'), false);
  assert.equal(sync.needsSyncConfirmation('\x03'), false);

  assert.deepEqual(sync.sendSyncInput(multiline, ['r1', 'r2'], targets), [
    { deviceId: 'r1', status: 'confirmation-required' },
    { deviceId: 'r2', status: 'confirmation-required' },
  ]);
  assert.deepEqual(r1.writes, []);
  assert.deepEqual(r2.writes, []);

  assert.deepEqual(sync.sendSyncInput(multiline, ['r1', 'r2'], targets, { confirmed: true }), [
    { deviceId: 'r1', status: 'sent' },
    { deviceId: 'r2', status: 'sent' },
  ]);
  assert.deepEqual(r1.writes, [multiline]);
  assert.deepEqual(r2.writes, [multiline]);

  assert.equal(
    sync.sendSyncInput('\r', ['r1', 'r2'], targets, { currentCommand: 'reboot' })[0].status,
    'confirmation-required',
  );
  assert.equal(
    sync.sendSyncInput('\r', ['r1', 'r2'], targets, { currentCommand: 'reboot', confirmed: true })[0].status,
    'sent',
  );
});

test('sync input: Enter requires confirmation when any selected target buffers a dangerous command', () => {
  const r1 = mockTarget();
  const r2 = mockTarget();
  const targets = {
    r1: { ...r1.target, currentCommand: () => 'display clock' },
    r2: { ...r2.target, currentCommand: () => 'reboot' },
  };

  assert.deepEqual(sync.sendSyncInput('\r', ['r1', 'r2'], targets, {
    currentCommand: 'display clock',
  }), [
    { deviceId: 'r1', status: 'confirmation-required' },
    { deviceId: 'r2', status: 'confirmation-required' },
  ]);
  assert.deepEqual(r1.writes, []);
  assert.deepEqual(r2.writes, []);

  assert.deepEqual(sync.sendSyncInput('\r', ['r1', 'r2'], targets, {
    currentCommand: 'display clock',
    confirmed: true,
  }), [
    { deviceId: 'r1', status: 'sent' },
    { deviceId: 'r2', status: 'sent' },
  ]);
  assert.deepEqual(r1.writes, ['\r']);
  assert.deepEqual(r2.writes, ['\r']);
});

test('sync input: two real VRP mocks keep command output isolated and share Ctrl+C without extra commands', async () => {
  const first = await createMockDevice({ port: 0 });
  const second = await createMockDevice({ port: 0 });
  const manager = createSessionManager({ credentials: { username: 'admin', password: 'admin' } });
  const attachments = [];
  try {
    const one = await manager.create({ port: first.port });
    const two = await manager.create({ port: second.port });
    const output = { r1: '', r2: '' };
    attachments.push(manager.attach(one.sessionId, (event) => {
      if (event.type === 'output') output.r1 += event.data;
    }));
    attachments.push(manager.attach(two.sessionId, (event) => {
      if (event.type === 'output') output.r2 += event.data;
    }));
    const targets = {
      r1: {
        status: () => manager.get(one.sessionId).locked ? 'locked' : manager.get(one.sessionId).status === 'ready' ? 'ready' : 'offline',
        write: (data) => { manager.write(one.sessionId, data); return true; },
      },
      r2: {
        status: () => manager.get(two.sessionId).locked ? 'locked' : manager.get(two.sessionId).status === 'ready' ? 'ready' : 'offline',
        write: (data) => { manager.write(two.sessionId, data); return true; },
      },
    };

    targets.r1.write('sysname R1\r');
    targets.r2.write('sysname R2\r');
    await waitFor(() => output.r1.includes('<R1>') && output.r2.includes('<R2>'));
    output.r1 = '';
    output.r2 = '';

    const clockOutput = (hostname) => [
      '2026-01-01 00:00:00',
      'Thursday',
      `Time Zone(${hostname}) : UTC+08:00`,
    ].join('\r\n');
    assert.ok(sync.sendSyncInput('display clock\r', ['r1', 'r2'], targets, {
      currentCommand: 'display clock',
      confirmed: true,
    }).every((result) => result.status === 'sent'));
    await waitFor(() =>
      output.r1.includes(`${clockOutput('R1')}\r\n<R1>`) &&
      output.r2.includes(`${clockOutput('R2')}\r\n<R2>`));
    assert.equal(output.r1.includes('R2'), false);
    assert.equal(output.r2.includes('R1'), false);

    output.r1 = '';
    output.r2 = '';
    assert.ok(sync.sendSyncInput('\x03', ['r1', 'r2'], targets).every((result) => result.status === 'sent'));
    await waitFor(() => output.r1.includes('<R1>') && output.r2.includes('<R2>'));
    assert.equal(output.r1.includes('Unrecognized command'), false);
    assert.equal(output.r2.includes('Unrecognized command'), false);
  } finally {
    attachments.forEach((attachment) => attachment.detach());
    manager.shutdown();
    await Promise.all([first.close(), second.close()]);
  }
});
