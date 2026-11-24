import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { handleRequest } from '../index.mjs';

const UTF8_FIXTURE = new URL('../__fixtures__/topo/encodings/dual-ar-utf8.topo', import.meta.url);
const DOCTYPE_FIXTURE = new URL('../__fixtures__/topo/invalid/doctype-internal-entity.topo', import.meta.url);

function postBytes(url, body) {
  return new Promise((resolve, reject) => {
    const request = http.request(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/octet-stream',
        'content-length': body.length,
      },
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve({ status: response.statusCode, payload: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
      });
    });
    request.on('error', reject);
    request.end(body);
  });
}

async function createFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'netpath-topo-http-test-'));
  let toolLists = 0;
  const mcp = {
    async getTools() {
      toolLists += 1;
      return [{ name: 'generate_topology', inputSchema: { properties: {} } }];
    },
    async callTool() {
      throw new Error('The generation tool must not be called for imports');
    },
  };
  const server = http.createServer((req, res) => {
    void handleRequest(req, res, { mcp, topoTempRoot: tempRoot });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    tempRoot,
    url: `http://127.0.0.1:${port}/api/topo/import`,
    get toolLists() {
      return toolLists;
    },
    async close() {
      await new Promise((resolve) => server.close(resolve));
      fs.rmSync(tempRoot, { recursive: true, force: true });
    },
  };
}

test('topo http: accepts raw uploaded bytes and returns the unified document', async () => {
  const fixture = await createFixture();
  try {
    const { status, payload } = await postBytes(
      `${fixture.url}?filename=browser-choice.topo`,
      fs.readFileSync(UTF8_FIXTURE),
    );

    assert.equal(status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.data.name, '双 AR 编码样例');
    assert.equal(payload.data.devices.length, 2);
    assert.equal(payload.data.links[0].source.interfaceName, 'GigabitEthernet4/0/1');
    assert.equal(payload.data.source.type, 'fallback-xml');
    assert.match(payload.data.source.fallbackReason, /no supported import tool/i);
    assert.equal(fixture.toolLists, 1);
    assert.deepEqual(fs.readdirSync(fixture.tempRoot), []);
  } finally {
    await fixture.close();
  }
});

test('topo http: captured access logs redact query credentials', async () => {
  const fixture = await createFixture();
  const secret = 'sk-live-DO-NOT-LOG-12345';
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    const { status } = await postBytes(
      `${fixture.url}?filename=${encodeURIComponent(secret)}.topo&apiKey=${secret}&password=${secret}`,
      fs.readFileSync(UTF8_FIXTURE),
    );
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(status, 200);
    assert.ok(logs.some((line) => line.includes('POST /api/topo/import 200')));
    assert.equal(logs.join('\n').includes(secret), false);
  } finally {
    console.log = originalLog;
    await fixture.close();
  }
});

test('topo http: rejects unsafe XML and cleans temporary files', async () => {
  const fixture = await createFixture();
  try {
    const { status, payload } = await postBytes(fixture.url, fs.readFileSync(DOCTYPE_FIXTURE));

    assert.equal(status, 400);
    assert.equal(payload.ok, false);
    assert.equal(payload.error.code, 'unsafe_xml');
    assert.deepEqual(fs.readdirSync(fixture.tempRoot), []);
  } finally {
    await fixture.close();
  }
});

test('topo http: enforces the 5 MiB upload limit', async () => {
  const fixture = await createFixture();
  try {
    const { status, payload } = await postBytes(fixture.url, Buffer.alloc(5 * 1024 * 1024 + 1));

    assert.equal(status, 413);
    assert.equal(payload.ok, false);
    assert.equal(payload.error.code, 'payload_too_large');
    assert.deepEqual(fs.readdirSync(fixture.tempRoot), []);
  } finally {
    await fixture.close();
  }
});
