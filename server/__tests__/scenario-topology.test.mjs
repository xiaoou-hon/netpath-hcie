import test from 'node:test';
import assert from 'node:assert/strict';

import { scenarioToTopology } from '../../src/data/lab/scenario-topology.ts';

const scenario = {
  id: 'lab-test',
  title: '预置场景转换',
  level: '了解',
  summary: '测试统一拓扑模型',
  devices: [
    {
      id: 'r1',
      name: 'R1',
      interfaces: [
        { name: 'GigabitEthernet0/0/0', shutdown: true },
        { name: 'LoopBack0', ip: '1.1.1.1', mask: '255.255.255.0', shutdown: false },
      ],
      links: [{ to: 'r2', localIf: 'GigabitEthernet0/0/0', remoteIf: 'GigabitEthernet0/0/1' }],
    },
    {
      id: 'r2',
      name: 'R2',
      interfaces: [{ name: 'GigabitEthernet0/0/1', shutdown: true }],
      links: [{ to: 'r1', localIf: 'GigabitEthernet0/0/1', remoteIf: 'GigabitEthernet0/0/0' }],
    },
  ],
  steps: [],
  acceptance: [],
  hints: [],
  ensp: {
    models: { r1: 'AR2220', r2: 'AR2220' },
    links: [{ a: 'r1', b: 'r2' }],
    checks: [
      {
        id: 'lab-test-r1-ip',
        text: 'R1 接口地址已配置',
        deviceId: 'r1',
        command: 'display ip interface brief',
        expect: '192\\.168\\.12\\.1',
      },
    ],
  },
};

test('scenario topology: deterministically preserves role ids, manual mappings, links and acceptance checks', () => {
  const original = structuredClone(scenario);
  const first = scenarioToTopology(scenario, { r1: 2001, r2: 2002 });
  const second = scenarioToTopology(scenario, { r1: 2001, r2: 2002 });

  assert.deepEqual(first, second);
  assert.equal(first.name, scenario.title);
  assert.equal(first.scenarioId, scenario.id);
  assert.deepEqual(first.source, { type: 'preset', scenarioId: scenario.id });
  assert.deepEqual(first.devices.map((device) => [device.id, device.name, device.model, device.comPort]), [
    ['r1', 'R1', 'AR2220', 2001],
    ['r2', 'R2', 'AR2220', 2002],
  ]);
  assert.ok(first.devices.every((device) => device.vrpCapable));
  assert.deepEqual(first.devices[0].interfaces, [
    {
      id: 'r1::GigabitEthernet0/0/0',
      name: 'GigabitEthernet0/0/0',
      slot: 0,
      subslot: 0,
      port: 0,
    },
    { id: 'r1::LoopBack0', name: 'LoopBack0' },
  ]);
  assert.deepEqual(first.links, [
    {
      id: 'link-1',
      name: 'R1-R2',
      source: {
        deviceId: 'r1',
        interfaceName: 'GigabitEthernet0/0/0',
        interfaceId: 'r1::GigabitEthernet0/0/0',
      },
      target: {
        deviceId: 'r2',
        interfaceName: 'GigabitEthernet0/0/1',
        interfaceId: 'r2::GigabitEthernet0/0/1',
      },
    },
  ]);
  assert.deepEqual(first.checks, scenario.ensp.checks);
  assert.notEqual(first.checks, scenario.ensp.checks);
  assert.notEqual(first.checks[0], scenario.ensp.checks[0]);
  assert.deepEqual(scenario, original, 'conversion must not mutate scenario or acceptance data');
});

test('scenario topology: unmapped roles remain without a console until a mapping is supplied', () => {
  const document = scenarioToTopology(scenario);
  assert.deepEqual(document.devices.map((device) => [device.comPort, device.vrpCapable]), [
    [0, false],
    [0, false],
  ]);
  assert.equal(document.checks.length, 1);
});
