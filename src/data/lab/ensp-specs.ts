/**
 * eNSP 场景开局规格
 * ------------------------------------------------------------------
 * key 与 src/data/lab/scenarios.ts 中的场景 id 一一对应。
 * 所有 deviceId 均使用场景里的设备角色 id。
 */
import type { EnspLabSpec } from '@/types/ensp';

export const enspSpecs: Record<string, EnspLabSpec> = {
  'lab-1': {
    models: { r1: 'AR2220', r2: 'AR2220' },
    links: [{ a: 'r1', b: 'r2' }],
    startHint: '两台 AR2220 已用 GE0/0/0 直连，登录后进入系统视图为接口配置地址。',
    checks: [
      {
        id: 'lab-1-r1-ip',
        text: 'R1 的 GigabitEthernet0/0/0 已配置 192.168.12.1',
        deviceId: 'r1',
        command: 'display ip interface brief',
        expect: '192\\.168\\.12\\.1',
      },
      {
        id: 'lab-1-r2-ip',
        text: 'R2 的 GigabitEthernet0/0/0 已配置 192.168.12.2',
        deviceId: 'r2',
        command: 'display ip interface brief',
        expect: '192\\.168\\.12\\.2',
      },
      {
        id: 'lab-1-ping',
        text: 'R1 能 ping 通 R2 的接口地址 192.168.12.2，且不丢包',
        deviceId: 'r1',
        command: 'ping 192.168.12.2',
        expect: 'Reply from 192\\.168\\.12\\.2',
        maxLoss: 0,
      },
    ],
  },

  'lab-2': {
    models: { r1: 'AR2220', r2: 'AR2220' },
    links: [{ a: 'r1', b: 'r2' }],
    startHint: '两台 AR2220 直连，先配通 10.0.12.0/24，再在区域 0 内启动 OSPF。',
    checks: [
      {
        id: 'lab-2-r1-peer',
        text: 'R1 的 OSPF 邻居状态为 Full',
        deviceId: 'r1',
        command: 'display ospf peer brief',
        expect: '(?i)full',
      },
      {
        id: 'lab-2-r2-peer',
        text: 'R2 的 OSPF 邻居状态为 Full',
        deviceId: 'r2',
        command: 'display ospf peer brief',
        expect: '(?i)full',
      },
      {
        id: 'lab-2-r1-route',
        text: 'R1 的路由表中已出现 192.168.0.0/16 网段的路由',
        deviceId: 'r1',
        command: 'display ip routing-table',
        expect: '192\\.168\\.',
      },
    ],
  },

  'lab-3': {
    models: { r1: 'AR2220', r2: 'AR2220' },
    links: [{ a: 'r1', b: 'r2' }],
    startHint: 'R1 属于 AS 65001，R2 属于 AS 65002，先配通直连再建立 EBGP 邻居。',
    checks: [
      {
        id: 'lab-3-r1-peer',
        text: 'R1 的 BGP 邻居状态为 Established',
        deviceId: 'r1',
        command: 'display bgp peer',
        expect: 'Established',
      },
      {
        id: 'lab-3-r2-peer',
        text: 'R2 的 BGP 邻居状态为 Established',
        deviceId: 'r2',
        command: 'display bgp peer',
        expect: 'Established',
      },
    ],
  },

  'lab-4': {
    models: { sw1: 'S5700', sw2: 'S5700' },
    links: [{ a: 'sw1', b: 'sw2' }],
    startHint: '两台 S5700 通过 GE0/0/1 互联，分别在 SW1/SW2 上创建 VLAN 10、20 并放通 Trunk。',
    checks: [
      {
        id: 'lab-4-sw1-vlan',
        text: 'SW1 上已创建 VLAN 10',
        deviceId: 'sw1',
        command: 'display vlan',
        expect: '\\b10\\b',
      },
      {
        id: 'lab-4-sw1-trunk',
        text: 'SW1 的 GE0/0/1 已配置为 Trunk 口',
        deviceId: 'sw1',
        command: 'display port vlan',
        expect: '(?i)trunk',
      },
      {
        id: 'lab-4-sw2-vlan',
        text: 'SW2 上已创建 VLAN 10',
        deviceId: 'sw2',
        command: 'display vlan',
        expect: '\\b10\\b',
      },
      {
        id: 'lab-4-sw2-trunk',
        text: 'SW2 的 GE0/0/1 已配置为 Trunk 口',
        deviceId: 'sw2',
        command: 'display port vlan',
        expect: '(?i)trunk',
      },
    ],
  },

  'lab-5': {
    models: { fw1: 'USG5500', r1: 'AR2220' },
    links: [{ a: 'fw1', b: 'r1' }],
    startHint: 'FW1 的 GE1/0/0 接 Trust 区域，GE1/0/1 接 Untrust 区域，放通 R1 所在网段。',
    checks: [
      {
        id: 'lab-5-fw-permit',
        text: 'FW1 的安全策略中存在 permit 放通规则',
        deviceId: 'fw1',
        command: 'display security-policy rule all',
        expect: '(?i)permit',
      },
      {
        id: 'lab-5-fw-no-deny',
        text: 'FW1 的默认安全策略没有把流量整条 deny 掉',
        deviceId: 'fw1',
        command: 'display security-policy rule all',
        reject: '(?im)^\\s*deny\\s*$',
      },
      {
        id: 'lab-5-r1-ping',
        text: 'R1 能 ping 通防火墙内网地址 192.168.10.1',
        deviceId: 'r1',
        command: 'ping 192.168.10.1',
        expect: 'Reply from 192\\.168\\.10\\.1',
        maxLoss: 40,
      },
    ],
  },
};

export function getEnspSpec(scenarioId: string): EnspLabSpec | undefined {
  return enspSpecs[scenarioId];
}
