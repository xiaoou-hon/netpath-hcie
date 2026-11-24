import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  importTopology,
  parseTopologyBuffer,
} from '../topo-import.mjs';

const UTF8_FIXTURE = new URL('../__fixtures__/topo/encodings/dual-ar-utf8.topo', import.meta.url);
const PER_INTERFACE_FIXTURE = new URL('../__fixtures__/topo/valid/ne-ce-per-interface.topo', import.meta.url);
const NON_VRP_FIXTURE = new URL('../__fixtures__/topo/valid/non-vrp-nodes.topo', import.meta.url);
const RAW_ENSP_FIXTURE = new URL('../__fixtures__/topo/valid/ensp-raw-dual-ar.topo', import.meta.url);
const UTF16_FIXTURE = new URL('../__fixtures__/topo/encodings/dual-ar-utf16le.topo', import.meta.url);
const GB18030_FIXTURE = new URL('../__fixtures__/topo/encodings/dual-ar-gb18030.topo', import.meta.url);
const INVALID_FIXTURES = new URL('../__fixtures__/topo/invalid/', import.meta.url);

function fixtureBytes(url) {
  return fs.readFileSync(url);
}

test('topo fallback: expands grouped interfaces, extension boards and link endpoints', () => {
  const document = parseTopologyBuffer(fixtureBytes(UTF8_FIXTURE));

  assert.equal(document.name, '双 AR 编码样例');
  assert.equal(document.source.type, 'fallback-xml');
  assert.deepEqual(document.devices.map((device) => device.name), ['AR1', 'AR2']);
  assert.deepEqual(document.devices[0].boards, [
    { slot: 0, model: 'AR2220-MAIN' },
    { slot: 4, model: '2GE' },
  ]);
  assert.deepEqual(
    document.devices[0].interfaces.map((item) => item.name),
    [
      'GigabitEthernet0/0/0',
      'GigabitEthernet0/0/1',
      'GigabitEthernet0/0/2',
      'GigabitEthernet4/0/0',
      'GigabitEthernet4/0/1',
    ],
  );
  assert.deepEqual(document.devices[0].position, { x: 120, y: 160 });
  assert.equal(document.devices[0].comPort, 2001);
  assert.equal(document.devices[0].vrpCapable, true);
  assert.deepEqual(document.links, [
    {
      id: 'link1',
      name: 'AR1-AR2',
      source: {
        deviceId: 'ar1',
        interfaceName: 'GigabitEthernet4/0/1',
        interfaceId: 'ar1::GigabitEthernet4/0/1',
      },
      target: {
        deviceId: 'ar2',
        interfaceName: 'GigabitEthernet0/0/2',
        interfaceId: 'ar2::GigabitEthernet0/0/2',
      },
    },
  ]);
});

test('topo fallback: preserves per-interface boards and marks non-VRP nodes unconnectable', () => {
  const perInterface = parseTopologyBuffer(fixtureBytes(PER_INTERFACE_FIXTURE));
  assert.deepEqual(
    perInterface.devices[0].interfaces.map((item) => item.name),
    ['GigabitEthernet1/0/0', 'GigabitEthernet1/0/7'],
  );
  assert.deepEqual(
    perInterface.devices[1].interfaces.map((item) => item.name),
    ['10GE2/0/3', '10GE2/0/4'],
  );
  assert.equal(perInterface.links[0].source.interfaceName, 'GigabitEthernet1/0/7');
  assert.equal(perInterface.links[0].target.interfaceName, '10GE2/0/3');

  const nonVrp = parseTopologyBuffer(fixtureBytes(NON_VRP_FIXTURE));
  assert.equal(nonVrp.devices.length, 4);
  assert.equal(nonVrp.devices.find((device) => device.model === 'PC').vrpCapable, false);
  assert.equal(nonVrp.devices.find((device) => device.model === 'Server').vrpCapable, false);
  assert.equal(nonVrp.devices.find((device) => device.model === 'Cloud').vrpCapable, false);
  assert.equal(nonVrp.devices.find((device) => device.name === 'AR0').vrpCapable, false);
});

test('topo fallback: UTF-8, UTF-16LE and GB18030 fixtures normalize identically', () => {
  const utf8 = parseTopologyBuffer(fixtureBytes(UTF8_FIXTURE));
  const utf16 = parseTopologyBuffer(fixtureBytes(UTF16_FIXTURE));
  const gb18030 = parseTopologyBuffer(fixtureBytes(GB18030_FIXTURE));

  assert.deepEqual(utf16, utf8);
  assert.deepEqual(gb18030, utf8);
});

test('topo fallback: parses native eNSP dev/slot/line format', () => {
  const doc = parseTopologyBuffer(fixtureBytes(RAW_ENSP_FIXTURE));
  assert.equal(doc.devices.length, 2);
  const [ar1, ar2] = doc.devices;
  assert.equal(ar1.name, 'AR1');
  assert.equal(ar1.model, 'AR2220');
  assert.equal(ar1.comPort, 2000);
  assert.deepEqual(ar1.position, { x: 224, y: 156 });
  assert.deepEqual(ar1.interfaces.map((item) => item.name), [
    'GigabitEthernet0/0/0',
    'GigabitEthernet0/0/1',
    'GigabitEthernet0/0/2',
  ]);
  assert.equal(ar2.comPort, 2003);
  assert.equal(ar1.vrpCapable, true);
  assert.equal(doc.links.length, 1);
  assert.deepEqual(doc.links[0].source, {
    deviceId: ar1.id,
    interfaceName: 'GigabitEthernet0/0/0',
    interfaceId: `${ar1.id}::GigabitEthernet0/0/0`,
  });
  assert.deepEqual(doc.links[0].target, {
    deviceId: ar2.id,
    interfaceName: 'GigabitEthernet0/0/0',
    interfaceId: `${ar2.id}::GigabitEthernet0/0/0`,
  });
});

test('topo fallback: expansion-board indexes beyond expanded slots stay importable', () => {
  const xml = `<?xml version="1.0" encoding="UNICODE" ?>
<topo version="1.3.00.100">
  <devices>
    <dev id="dev-a" name="PE1" model="AR2220" com_port="2000" cx="10" cy="20">
      <slot number="slot17" isMainBoard="1">
        <interface sztype="Ethernet" interfacename="GE" count="1" />
        <interface sztype="Ethernet" interfacename="GE" count="2" />
        <interface sztype="Ethernet" interfacename="GE" count="4" />
        <interface sztype="Ethernet" interfacename="GE" count="24" />
      </slot>
      <slot isMainBoard="0" id="1" type="9" />
    </dev>
    <dev id="dev-b" name="PE2" model="S5700" com_port="2001" cx="30" cy="40">
      <slot number="slot17" isMainBoard="1">
        <interface sztype="Ethernet" interfacename="GE" count="24" />
      </slot>
    </dev>
  </devices>
  <lines>
    <line srcDeviceID="dev-a" destDeviceID="dev-b">
      <interfacePair lineName="Copper" srcIndex="8" tarIndex="23" />
      <interfacePair lineName="Copper" srcIndex="40" tarIndex="2" />
    </line>
  </lines>
</topo>`;
  const doc = parseTopologyBuffer(Buffer.from(xml, 'utf8'));
  assert.equal(doc.links.length, 2);
  assert.equal(doc.links[0].source.interfaceName, 'GigabitEthernet0/1/1');
  assert.equal(doc.links[0].target.interfaceName, 'GigabitEthernet0/0/23');
  // 索引超出所有已知端口时用占位名，避免整份拓扑导入失败。
  assert.equal(doc.links[1].source.interfaceName, 'port41');
  assert.equal(doc.links[1].target.interfaceName, 'GigabitEthernet0/0/2');
});

test('topo fallback: declared encoding="UNICODE" with single-byte content decodes as UTF-8', () => {
  const source = fs.readFileSync(UTF8_FIXTURE, 'utf8');
  const bytes = Buffer.from(source.replace(/encoding="[^"]*"/, 'encoding="UNICODE"'), 'utf8');
  assert.equal(bytes.includes(0), false);
  assert.deepEqual(parseTopologyBuffer(bytes), parseTopologyBuffer(fixtureBytes(UTF8_FIXTURE)));
});

test('topo fallback: rejects entity declarations, malformed XML and missing device fields', () => {
  for (const name of ['doctype-internal-entity.topo', 'external-entity.topo']) {
    assert.throws(
      () => parseTopologyBuffer(fixtureBytes(new URL(name, INVALID_FIXTURES))),
      (error) => error.code === 'unsafe_xml' && error.status === 400,
      name,
    );
  }
  assert.throws(
    () => parseTopologyBuffer(fixtureBytes(new URL('malformed-xml.topo', INVALID_FIXTURES))),
    (error) => error.code === 'invalid_xml' && error.status === 400,
  );
  assert.throws(
    () => parseTopologyBuffer(fixtureBytes(new URL('missing-device-name.topo', INVALID_FIXTURES))),
    (error) => error.code === 'invalid_topology' && /name/.test(error.message),
  );
  assert.throws(
    () => parseTopologyBuffer(Buffer.from('<?xml version="1.0"?><topo name="A&B"><devices /><links /></topo>')),
    (error) => error.code === 'invalid_xml',
  );
});

test('topo fallback: rejects files over 5 MiB before parsing', () => {
  const bytes = Buffer.alloc(5 * 1024 * 1024 + 1, 0x20);
  assert.throws(
    () => parseTopologyBuffer(bytes),
    (error) => error.code === 'payload_too_large' && error.status === 413,
  );
});

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'netpath-topo-test-'));
}

function assertTempRootEmpty(root) {
  assert.deepEqual(fs.readdirSync(root), []);
}

test('topo import: discovers no import tool and returns a diagnosable fallback', async () => {
  const tempRoot = makeTempRoot();
  let calls = 0;
  const mcp = {
    async getTools() {
      return [{ name: 'generate_topology', inputSchema: { properties: {} } }];
    },
    async callTool() {
      calls += 1;
    },
  };
  try {
    const document = await importTopology(fixtureBytes(UTF8_FIXTURE), { mcp, tempRoot });
    assert.equal(document.source.type, 'fallback-xml');
    assert.match(document.source.fallbackReason, /no supported import tool/i);
    assert.equal(calls, 0);
    assertTempRootEmpty(tempRoot);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('topo import: adapts MCP schema and applies the same normalization as XML fallback', async () => {
  const tempRoot = makeTempRoot();
  const bytes = fixtureBytes(UTF8_FIXTURE);
  const fallback = parseTopologyBuffer(bytes);
  let receivedArguments;
  const mcp = {
    async getTools() {
      return [{
        name: 'parse_topology',
        inputSchema: {
          type: 'object',
          properties: { topo_file: { type: 'string' } },
          required: ['topo_file'],
        },
      }];
    },
    async callTool(name, args) {
      assert.equal(name, 'parse_topology');
      receivedArguments = args;
      assert.ok(path.resolve(args.topo_file).startsWith(path.resolve(tempRoot) + path.sep));
      assert.equal(fs.existsSync(args.topo_file), true);
      return {
        text: JSON.stringify({ topology: { name: fallback.name, devices: fallback.devices, links: fallback.links } }),
        raw: {},
      };
    },
  };
  try {
    const document = await importTopology(bytes, { mcp, tempRoot });
    assert.deepEqual(document.source, { type: 'ensp-mcp', tool: 'parse_topology' });
    assert.deepEqual(document.devices, fallback.devices);
    assert.deepEqual(document.links, fallback.links);
    assert.equal(Object.keys(receivedArguments).length, 1);
    assertTempRootEmpty(tempRoot);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('topo import: adapts structured MCP content containing serialized JSON', async () => {
  const tempRoot = makeTempRoot();
  const bytes = fixtureBytes(UTF8_FIXTURE);
  const fallback = parseTopologyBuffer(bytes);
  const mcp = {
    async getTools() {
      return [{
        name: 'import_topology',
        inputSchema: { properties: { filePath: { type: 'string' } } },
      }];
    },
    async callTool() {
      return {
        text: '',
        raw: {
          structuredContent: {
            result: JSON.stringify({ name: fallback.name, devices: fallback.devices, links: fallback.links }),
          },
        },
      };
    },
  };
  try {
    const document = await importTopology(bytes, { mcp, tempRoot });
    assert.equal(document.source.type, 'ensp-mcp');
    assert.deepEqual(document.devices, fallback.devices);
    assertTempRootEmpty(tempRoot);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('topo import: an already-aborted signal creates no temporary files and never calls MCP', async () => {
  const tempRoot = makeTempRoot();
  const controller = new AbortController();
  controller.abort();
  let mcpCalls = 0;
  const mcp = {
    async getTools() {
      mcpCalls += 1;
      return [];
    },
    async callTool() {},
  };
  try {
    await assert.rejects(
      importTopology(fixtureBytes(UTF8_FIXTURE), { mcp, tempRoot, signal: controller.signal }),
      (error) => error.name === 'AbortError',
    );
    assert.equal(mcpCalls, 0);
    assertTempRootEmpty(tempRoot);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('topo import: aborting a pending MCP call rejects promptly and cleans temporary files', async () => {
  const tempRoot = makeTempRoot();
  const controller = new AbortController();
  let markCallStarted;
  const callStarted = new Promise((resolve) => { markCallStarted = resolve; });
  const mcp = {
    async getTools() {
      return [{ name: 'import_topology', inputSchema: { properties: { file_path: { type: 'string' } } } }];
    },
    callTool() {
      markCallStarted();
      return new Promise(() => {});
    },
  };
  let timeout;
  try {
    const importing = importTopology(fixtureBytes(UTF8_FIXTURE), {
      mcp,
      tempRoot,
      signal: controller.signal,
    });
    await callStarted;
    controller.abort();
    await assert.rejects(
      Promise.race([
        importing,
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error('abort did not cancel the pending import')), 200);
        }),
      ]),
      (error) => error.name === 'AbortError',
    );
    assertTempRootEmpty(tempRoot);
  } finally {
    clearTimeout(timeout);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('topo import: MCP call failure falls back and failure paths still clean temporary files', async () => {
  const tempRoot = makeTempRoot();
  const mcp = {
    async getTools() {
      return [{
        name: 'import_topology',
        inputSchema: { properties: { file_path: { type: 'string' } } },
      }];
    },
    async callTool() {
      throw new Error('simulated MCP import failure');
    },
  };
  try {
    const document = await importTopology(fixtureBytes(UTF8_FIXTURE), { mcp, tempRoot });
    assert.equal(document.source.type, 'fallback-xml');
    assert.match(document.source.fallbackReason, /simulated MCP import failure/);
    assertTempRootEmpty(tempRoot);

    await assert.rejects(
      importTopology(fixtureBytes(new URL('doctype-internal-entity.topo', INVALID_FIXTURES)), { mcp, tempRoot }),
      (error) => error.code === 'unsafe_xml',
    );
    assertTempRootEmpty(tempRoot);

    await assert.rejects(
      importTopology(Buffer.alloc(5 * 1024 * 1024 + 1), { mcp, tempRoot }),
      (error) => error.code === 'payload_too_large' && error.status === 413,
    );
    assertTempRootEmpty(tempRoot);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
