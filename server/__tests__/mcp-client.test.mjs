import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import { McpClient } from '../mcp-client.mjs';

const FAKE_MCP = fileURLToPath(new URL('../__fixtures__/fake-mcp.mjs', import.meta.url));
const COMMAND = `"${process.execPath}" "${FAKE_MCP}"`;
const CRASH_COMMAND = `${COMMAND} --crash`;

test('mcp: handshake, tools/list and tools/call', async () => {
  const client = new McpClient({ commands: [COMMAND], initTimeoutMs: 8000 });
  try {
    const tools = await client.getTools();
    assert.equal(tools.length, 3);
    assert.deepEqual(
      new Set(tools.map((tool) => tool.name)),
      new Set(['echo', 'generate_topology', 'fail_tool']),
    );

    const echo = await client.callTool('echo', { hello: 'world' }, 5000);
    assert.deepEqual(JSON.parse(echo.text), { hello: 'world' });

    const status = await client.status();
    assert.equal(status.available, true);
    assert.equal(status.version, '9.9.9');
    assert.equal(status.toolsCount, 3);
    assert.equal(status.error, undefined);
  } finally {
    client.close();
  }
});

test('mcp: tool errors are surfaced as mcp_error', async () => {
  const client = new McpClient({ commands: [COMMAND], initTimeoutMs: 8000 });
  try {
    await assert.rejects(
      client.callTool('fail_tool', {}, 5000),
      (error) => error.code === 'mcp_error' && /tool exploded/.test(error.message),
    );
  } finally {
    client.close();
  }
});

test('mcp: crashed subprocess is reported unavailable', async () => {
  const client = new McpClient({ commands: [CRASH_COMMAND], initTimeoutMs: 3000 });
  try {
    await assert.rejects(client.callTool('echo', {}, 3000));
    const status = await client.status();
    assert.equal(status.available, false);
    assert.ok(status.error);
  } finally {
    client.close();
  }
});
