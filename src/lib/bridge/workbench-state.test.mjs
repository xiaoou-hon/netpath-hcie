import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createWorkbenchState,
  layoutTopology,
  visibleTerminalIds,
  workbenchReducer,
} from './workbench-state.ts';

const topology = {
  name: '双设备',
  source: { type: 'fallback-xml', fallbackReason: 'MCP unavailable' },
  warnings: [],
  devices: [
    { id: 'r1', name: 'R1', model: 'AR2220', comPort: 2001, vrpCapable: true, boards: [], interfaces: [], position: { x: -40, y: 90 } },
    { id: 'r2', name: 'R2', model: 'AR2220', comPort: 2002, vrpCapable: true, boards: [], interfaces: [] },
  ],
  links: [{
    id: 'l1',
    name: 'GE link',
    source: { deviceId: 'r1', interfaceName: 'GE0/0/0', interfaceId: 'r1::GE0/0/0' },
    target: { deviceId: 'r2', interfaceName: 'GE0/0/1', interfaceId: 'r2::GE0/0/1' },
  }],
};

const session = {
  sessionId: 'session-r1',
  port: 2001,
  deviceName: 'R1',
  prompt: '<R1>',
  view: 'user',
  createdAt: '2026-11-19T00:00:00.000Z',
  lastActiveAt: '2026-11-19T00:00:00.000Z',
};

test('拓扑布局保留原始坐标，缺失坐标使用确定性布局', () => {
  const first = layoutTopology(topology);
  const second = layoutTopology(topology);
  assert.deepEqual(first.positions.r1, { x: -40, y: 90 });
  assert.deepEqual(first.positions.r2, second.positions.r2);
  assert.equal(Number.isFinite(first.positions.r2.x), true);
  assert.equal(Number.isFinite(first.positions.r2.y), true);
  assert.match(first.viewBox, /^-?\d/);
});

test('实时刷新和手动映射不覆盖静态拓扑', () => {
  const initial = createWorkbenchState(topology, true);
  const runtime = {
    deviceId: 'r1', expectedName: 'R1', port: 2001, mappingSource: 'topology', state: 'ready', connectable: true,
  };
  const scanned = workbenchReducer(initial, { type: 'runtime/replace', devices: [runtime] });
  assert.equal(scanned.topology, topology);
  assert.deepEqual(scanned.topology.devices[0].position, { x: -40, y: 90 });
  assert.equal(scanned.runtime.r1.state, 'ready');

  const mapped = workbenchReducer(scanned, { type: 'mapping/set', deviceId: 'r1', port: 3001 });
  assert.equal(mapped.manualMappings.r1, 3001);
  assert.equal(mapped.topology.devices[0].comPort, 2001);
  assert.equal(mapped.runtime.r1, undefined);
});

test('导入失败保留旧拓扑、映射和已打开会话', () => {
  const initial = createWorkbenchState(topology, true);
  const opened = workbenchReducer(initial, { type: 'session/open', deviceId: 'r1', session });
  const mapped = workbenchReducer(opened, { type: 'mapping/set', deviceId: 'r2', port: 3002 });
  const failed = workbenchReducer(mapped, { type: 'topology/import-failed' });

  assert.equal(failed, mapped);
  assert.equal(failed.topology, topology);
  assert.deepEqual(failed.openTabs, ['r1']);
  assert.equal(failed.manualMappings.r2, 3002);
});

test('重复打开会话只聚焦，分屏可见集合遵循活动标签和窄屏单窗格', () => {
  const initial = createWorkbenchState(topology, true);
  const opened = workbenchReducer(initial, { type: 'session/open', deviceId: 'r1', session });
  const focused = workbenchReducer(opened, { type: 'session/open', deviceId: 'r1', session });
  assert.deepEqual(focused.openTabs, ['r1']);
  assert.equal(focused.activeId, 'r1');

  const other = { ...session, sessionId: 'session-r2', deviceName: 'R2', port: 2002 };
  const two = workbenchReducer(focused, { type: 'session/open', deviceId: 'r2', session: other });
  assert.deepEqual(visibleTerminalIds(two, false), ['r2']);
  assert.deepEqual(visibleTerminalIds({ ...two, layout: 2 }, false), ['r2', 'r1']);
  assert.deepEqual(visibleTerminalIds({ ...two, layout: 4 }, true), ['r2']);
});
