import test from 'node:test';
import assert from 'node:assert/strict';

import { createMockDevice } from '../__fixtures__/mock-device.mjs';
import { TelnetClient } from '../telnet.mjs';

const CREDENTIALS = { username: 'admin', password: 'admin' };

async function withClient(fn) {
  const device = await createMockDevice({ port: 0 });
  const client = new TelnetClient({ execTimeoutMs: 5000 });
  try {
    await client.connect(device.port, CREDENTIALS, 5000);
    await fn(client);
  } finally {
    client.close();
    await device.close();
  }
}

test('complete: 多匹配前缀返回候选并保持干净提示符', async () => {
  await withClient(async (client) => {
    const result = await client.complete('s', { timeoutMs: 3000 });
    assert.ok(Array.isArray(result.candidates));
    assert.ok(result.candidates.includes('system-view'), `应包含 system-view，实际：${result.candidates.join(',')}`);
    assert.equal(result.prompt, '<R1>');
    assert.equal(result.view, 'user');
  });
});

test('complete: 唯一匹配返回完整命令字（而非剩余字符）且会话未被破坏', async () => {
  await withClient(async (client) => {
    const result = await client.complete('disp', { timeoutMs: 3000 });
    assert.deepEqual(result.candidates, ['display']);
    assert.equal(client.prompt, '<R1>');

    const execResult = await client.exec('display version');
    assert.match(execResult.output, /Huawei Versatile Routing Platform/);
    assert.equal(execResult.prompt, '<R1>');
  });
});

test('complete: 补全后切到系统视图再补全仍能正确识别视图', async () => {
  await withClient(async (client) => {
    await client.exec('system-view');
    assert.equal(client.view, 'system');

    const result = await client.complete('sys', { timeoutMs: 3000 });
    // sys 命中 sysname / system-view，候选非空且提示符回到 [R1]
    assert.ok(Array.isArray(result.candidates));
    assert.ok(result.candidates.length > 0, `候选应非空，实际：${result.candidates.join(',')}`);
    assert.equal(result.prompt, '[R1]');
    assert.equal(result.view, 'system');
  });
});
