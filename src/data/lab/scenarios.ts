/**
 * eNSP 实验场景
 * ------------------------------------------------------------------
 * 每个场景给出设备角色、操作步骤、验收标准与真机开局规格。
 * ensp 规格随场景内联，保证 steps.commands / acceptance / ensp.checks 三者自洽。
 */
import type { LabScenario, VrpDevice } from '@/types';

const GI_000 = 'GigabitEthernet0/0/0';

/* ------------------------------ lab-1 ------------------------------ */

const lab1Devices: VrpDevice[] = [
  {
    id: 'r1',
    name: 'R1',
    interfaces: [{ name: GI_000, shutdown: true }],
    links: [{ to: 'r2', localIf: GI_000, remoteIf: GI_000 }],
  },
  {
    id: 'r2',
    name: 'R2',
    interfaces: [{ name: GI_000, shutdown: true }],
    links: [{ to: 'r1', localIf: GI_000, remoteIf: GI_000 }],
  },
];

const lab1: LabScenario = {
  id: 'lab-1',
  title: '基础配置与接口连通',
  level: '了解',
  summary: '给直连的两台路由器配置接口 IP，开启接口并用 ping 验证三层连通性。',
  devices: lab1Devices,
  steps: [
    {
      title: 'R1 进入系统视图',
      text: '登录后处于用户视图 <R1>，执行 system-view 进入 [R1] 系统视图。',
      commands: ['system-view'],
      deviceId: 'r1',
    },
    {
      title: 'R1 配置接口地址并开启',
      text: '进入 GigabitEthernet0/0/0，配置 192.168.12.1/24，并 undo shutdown 开启接口。',
      commands: ['interface GigabitEthernet0/0/0', 'ip address 192.168.12.1 24', 'undo shutdown'],
      deviceId: 'r1',
    },
    {
      title: 'R2 配置接口地址并开启',
      text: '切换到 R2，进入系统视图后配置 GigabitEthernet0/0/0 为 192.168.12.2/24 并开启接口。',
      commands: [
        'system-view',
        'interface GigabitEthernet0/0/0',
        'ip address 192.168.12.2 24',
        'undo shutdown',
      ],
      deviceId: 'r2',
    },
    {
      title: '检查接口状态',
      text: '在 R1 执行 display ip interface brief，确认 PHY 与 Protocol 都是 up。',
      commands: ['display ip interface brief'],
      deviceId: 'r1',
    },
    {
      title: 'ping 验证三层连通',
      text: '在 R1 上 ping 192.168.12.2，收到 Reply 说明直连网段三层已通。',
      commands: ['ping 192.168.12.2'],
      deviceId: 'r1',
    },
  ],
  acceptance: [
    'R1 执行 display ip interface brief，Gi0/0/0 地址为 192.168.12.1 且 PHY、Protocol 均为 up',
    'R2 执行 display ip interface brief，Gi0/0/0 地址为 192.168.12.2 且 PHY、Protocol 均为 up',
    'R1 执行 ping 192.168.12.2，收到 5 个 Reply，丢包率 0%',
  ],
  hints: [
    '接口默认处于 shutdown 状态，配置完 IP 后记得 undo shutdown。',
    '掩码既可以用 255.255.255.0，也可以直接写前缀长度 24。',
    'display ip interface brief 中 PHY down 通常是接口未开启，Protocol down 通常是 IP 未配置。',
  ],
  ensp: {
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
        text: 'R1 能 ping 通 R2 的接口地址 192.168.12.2，丢包率 0%',
        deviceId: 'r1',
        command: 'ping 192.168.12.2',
        expect: 'Reply from 192\\.168\\.12\\.2',
        maxLoss: 0,
      },
    ],
  },
};

/* ------------------------------ lab-2 ------------------------------ */

const lab2Devices: VrpDevice[] = [
  {
    id: 'r1',
    name: 'R1',
    interfaces: [{ name: GI_000, shutdown: true }],
    links: [{ to: 'r2', localIf: GI_000, remoteIf: GI_000 }],
  },
  {
    id: 'r2',
    name: 'R2',
    interfaces: [
      { name: GI_000, shutdown: true },
      { name: 'GigabitEthernet0/0/1', shutdown: true },
    ],
    links: [
      { to: 'r1', localIf: GI_000, remoteIf: GI_000 },
      { to: 'r3', localIf: 'GigabitEthernet0/0/1', remoteIf: GI_000 },
    ],
  },
  {
    id: 'r3',
    name: 'R3',
    interfaces: [
      { name: GI_000, shutdown: true },
      { name: 'LoopBack0', ip: '3.3.3.3', mask: '255.255.255.0', shutdown: false },
    ],
    links: [{ to: 'r2', localIf: GI_000, remoteIf: 'GigabitEthernet0/0/1' }],
  },
];

const lab2: LabScenario = {
  id: 'lab-2',
  title: 'OSPF 单区域邻居',
  level: '熟悉',
  summary: '在 R1-R2-R3 链式拓扑上配置 OSPF 1 区域 0，让邻居全部进入 Full，R1 学习到 R3 的环回网段。',
  devices: lab2Devices,
  steps: [
    {
      title: '配置 R1 接口',
      text: 'R1 Gi0/0/0 配置 10.0.12.1/24 并开启接口。',
      commands: [
        'system-view',
        'interface GigabitEthernet0/0/0',
        'ip address 10.0.12.1 24',
        'undo shutdown',
      ],
      deviceId: 'r1',
    },
    {
      title: '配置 R2 两侧接口',
      text: 'R2 的 Gi0/0/0 为 10.0.12.2/24，Gi0/0/1 为 10.0.23.2/24，两个接口都要 undo shutdown 开启。',
      commands: [
        'system-view',
        'interface GigabitEthernet0/0/0',
        'ip address 10.0.12.2 24',
        'undo shutdown',
        'quit',
        'interface GigabitEthernet0/0/1',
        'ip address 10.0.23.2 24',
        'undo shutdown',
      ],
      deviceId: 'r2',
    },
    {
      title: '配置 R3 接口',
      text: 'R3 Gi0/0/0 配置 10.0.23.3/24 并开启；LoopBack0（3.3.3.3/24）已预置。',
      commands: [
        'system-view',
        'interface GigabitEthernet0/0/0',
        'ip address 10.0.23.3 24',
        'undo shutdown',
      ],
      deviceId: 'r3',
    },
    {
      title: 'R1 启动 OSPF 并宣告网段',
      text: '在系统视图执行 ospf 1 router-id 1.1.1.1，进入区域 0 并宣告 10.0.12.0/24（反掩码 0.0.0.255）。',
      commands: [
        'system-view',
        'ospf 1 router-id 1.1.1.1',
        'area 0',
        'network 10.0.12.0 0.0.0.255',
      ],
      deviceId: 'r1',
    },
    {
      title: 'R2 启动 OSPF 并宣告两侧网段',
      text: 'R2 在区域 0 同时宣告 10.0.12.0/24 与 10.0.23.0/24，作为中间节点让链路生效。',
      commands: [
        'system-view',
        'ospf 1 router-id 2.2.2.2',
        'area 0',
        'network 10.0.12.0 0.0.0.255',
        'network 10.0.23.0 0.0.0.255',
      ],
      deviceId: 'r2',
    },
    {
      title: 'R3 启动 OSPF 并宣告直连与环回',
      text: 'R3 宣告直连网段 10.0.23.0/24 与环回口所在网段 3.3.3.0/24，使环回路由进入 OSPF。',
      commands: [
        'system-view',
        'ospf 1 router-id 3.3.3.3',
        'area 0',
        'network 10.0.23.0 0.0.0.255',
        'network 3.3.3.0 0.0.0.255',
      ],
      deviceId: 'r3',
    },
    {
      title: '验证 OSPF 邻居与路由',
      text: '回到 R1：display ospf peer brief 邻居应为 Full；display ip routing-table 应出现 3.3.3.0/24；最后 ping 3.3.3.3 验证端到端连通。',
      commands: ['display ospf peer brief', 'display ip routing-table', 'ping 3.3.3.3'],
      deviceId: 'r1',
    },
  ],
  acceptance: [
    'R1 执行 display ospf peer brief，与 R2 的邻居状态为 Full',
    'R2 执行 display ospf peer brief，与 R1、R3 的邻居状态均为 Full',
    'R3 执行 display ospf peer brief，与 R2 的邻居状态为 Full',
    'R1 执行 display ip routing-table，路由表中存在经 OSPF 学习到的 3.3.3.0/24 路由',
    'R1 执行 ping 3.3.3.3，收到 Reply，丢包率 0%',
  ],
  hints: [
    'network 命令的第二个参数是反掩码（wildcard），24 位掩码对应 0.0.0.255。',
    '两台设备必须在同一区域，且都宣告了相连接口所在网段，邻居才会 Full。',
    'LoopBack0 也要在 OSPF 中宣告，否则 R1 的路由表里不会出现 3.3.3.0/24。',
    '邻居卡在 2-Way/ExStart 时，先检查两端 router-id 是否冲突、IP/掩码是否一致。',
  ],
  ensp: {
    models: { r1: 'AR2220', r2: 'AR2220', r3: 'AR2220' },
    links: [
      { a: 'r1', b: 'r2' },
      { a: 'r2', b: 'r3' },
    ],
    startHint: '三台 AR2220 串联（R1-R2-R3），先为各物理接口配置 IP 并 undo shutdown，再在区域 0 内统一启动 OSPF 进程 1。',
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
        id: 'lab-2-r3-peer',
        text: 'R3 的 OSPF 邻居状态为 Full',
        deviceId: 'r3',
        command: 'display ospf peer brief',
        expect: '(?i)full',
      },
      {
        id: 'lab-2-r1-route',
        text: 'R1 的路由表中已出现经 OSPF 学习到的 3.3.3.0/24 路由',
        deviceId: 'r1',
        command: 'display ip routing-table',
        expect: '3\\.3\\.3',
      },
      {
        id: 'lab-2-r1-ping',
        text: 'R1 能 ping 通 R3 的环回口 3.3.3.3，丢包率 0%',
        deviceId: 'r1',
        command: 'ping 3.3.3.3',
        expect: 'Reply from 3\\.3\\.3\\.3',
        maxLoss: 0,
      },
    ],
  },
};

/* ------------------------------ lab-3 ------------------------------ */

const lab3Devices: VrpDevice[] = [
  {
    id: 'r1',
    name: 'R1',
    interfaces: [
      { name: GI_000, shutdown: true },
      { name: 'LoopBack0', ip: '1.1.1.1', mask: '255.255.255.0', shutdown: false },
    ],
    links: [{ to: 'r2', localIf: GI_000, remoteIf: GI_000 }],
  },
  {
    id: 'r2',
    name: 'R2',
    interfaces: [
      { name: GI_000, shutdown: true },
      { name: 'LoopBack0', ip: '2.2.2.2', mask: '255.255.255.0', shutdown: false },
    ],
    links: [{ to: 'r1', localIf: GI_000, remoteIf: GI_000 }],
  },
];

const lab3: LabScenario = {
  id: 'lab-3',
  title: 'BGP 邻居与路由',
  level: '精通',
  summary: 'AS 65001 的 R1 与 AS 65002 的 R2 直连，建立 EBGP 邻居并互相通告环回网段，验证邻居 Established 与路由学习。',
  devices: lab3Devices,
  steps: [
    {
      title: '配置 R1 接口',
      text: 'R1 Gi0/0/0 配置 10.0.12.1/24 并开启；LoopBack0（1.1.1.1/24）已预置。',
      commands: [
        'system-view',
        'interface GigabitEthernet0/0/0',
        'ip address 10.0.12.1 24',
        'undo shutdown',
      ],
      deviceId: 'r1',
    },
    {
      title: '配置 R2 接口',
      text: 'R2 Gi0/0/0 配置 10.0.12.2/24 并开启；LoopBack0（2.2.2.2/24）已预置。',
      commands: [
        'system-view',
        'interface GigabitEthernet0/0/0',
        'ip address 10.0.12.2 24',
        'undo shutdown',
      ],
      deviceId: 'r2',
    },
    {
      title: 'R1 建立 EBGP 邻居并通告网段',
      text: 'bgp 65001 下配置 router-id 1.1.1.1、peer 10.0.12.2 as-number 65002；进入 ipv4-family unicast，network 1.1.1.0/24 并 peer 10.0.12.2 enable。',
      commands: [
        'system-view',
        'bgp 65001',
        'router-id 1.1.1.1',
        'peer 10.0.12.2 as-number 65002',
        'ipv4-family unicast',
        'network 1.1.1.0 255.255.255.0',
        'peer 10.0.12.2 enable',
      ],
      deviceId: 'r1',
    },
    {
      title: 'R2 建立 EBGP 邻居并通告网段',
      text: 'R2 侧对称配置：bgp 65002、router-id 2.2.2.2、peer 10.0.12.1 as-number 65001，并在 ipv4-family unicast 中通告 2.2.2.0/24。',
      commands: [
        'system-view',
        'bgp 65002',
        'router-id 2.2.2.2',
        'peer 10.0.12.1 as-number 65001',
        'ipv4-family unicast',
        'network 2.2.2.0 255.255.255.0',
        'peer 10.0.12.1 enable',
      ],
      deviceId: 'r2',
    },
    {
      title: '验证邻居、路由与端到端连通',
      text: '在 R1 执行 display bgp peer 应为 Established；display ip routing-table 确认学到 2.2.2.0/24；最后 ping 2.2.2.2 验证连通。',
      commands: ['display bgp peer', 'display ip routing-table', 'ping 2.2.2.2'],
      deviceId: 'r1',
    },
  ],
  acceptance: [
    'R1 执行 display bgp peer，邻居 10.0.12.2 状态为 Established',
    'R2 执行 display bgp peer，邻居 10.0.12.1 状态为 Established',
    'R1 执行 display ip routing-table，存在 BGP 学习到的 2.2.2.0/24 路由（协议列为 BGP）',
    'R1 执行 ping 2.2.2.2，收到 Reply，丢包率 0%',
  ],
  hints: [
    'peer 命令里的 AS 号必须是对方的 AS，双方都要指向对端接口地址。',
    'network 宣告的网段必须与掩码完全匹配，且必须是本地路由表中已存在的精确路由。',
    'BGP 邻居建立前先确认底层直连可以 ping 通，否则会停在 Active。',
    'EBGP 邻居使用直连接口建邻时，多跳（ebgp-max-hop）无需配置。',
  ],
  ensp: {
    models: { r1: 'AR2220', r2: 'AR2220' },
    links: [{ a: 'r1', b: 'r2' }],
    startHint: 'R1 属于 AS 65001，R2 属于 AS 65002，先配通直连再建立 EBGP 邻居并各自 network 环回网段。',
    checks: [
      {
        id: 'lab-3-r1-peer',
        text: 'R1 的 BGP 邻居 10.0.12.2 状态为 Established',
        deviceId: 'r1',
        command: 'display bgp peer',
        expect: 'Established',
      },
      {
        id: 'lab-3-r2-peer',
        text: 'R2 的 BGP 邻居 10.0.12.1 状态为 Established',
        deviceId: 'r2',
        command: 'display bgp peer',
        expect: 'Established',
      },
      {
        id: 'lab-3-r1-route',
        text: 'R1 的路由表中已出现 BGP 学习到的 2.2.2.0/24 路由',
        deviceId: 'r1',
        command: 'display ip routing-table',
        expect: '2\\.2\\.2',
      },
      {
        id: 'lab-3-r1-ping',
        text: 'R1 能 ping 通 R2 的环回口 2.2.2.2，丢包率 0%',
        deviceId: 'r1',
        command: 'ping 2.2.2.2',
        expect: 'Reply from 2\\.2\\.2\\.2',
        maxLoss: 0,
      },
    ],
  },
};

/* ------------------------------ lab-4 ------------------------------ */

const SW_GE_001 = 'GigabitEthernet0/0/1';

const lab4Devices: VrpDevice[] = [
  {
    id: 'sw1',
    name: 'SW1',
    interfaces: [
      { name: SW_GE_001, shutdown: true },
      { name: 'Ethernet0/0/1', shutdown: true },
    ],
    links: [{ to: 'sw2', localIf: SW_GE_001, remoteIf: SW_GE_001 }],
  },
  {
    id: 'sw2',
    name: 'SW2',
    interfaces: [
      { name: SW_GE_001, shutdown: true },
      { name: 'Ethernet0/0/1', shutdown: true },
    ],
    links: [{ to: 'sw1', localIf: SW_GE_001, remoteIf: SW_GE_001 }],
  },
];

const lab4: LabScenario = {
  id: 'lab-4',
  title: 'VLAN 与 Trunk',
  level: '熟悉',
  summary: '在两台 S5700 上创建 VLAN 10/20，SW1 与 SW2 的接入口分别划入 VLAN 10、VLAN 20，互联口配置为 Trunk 并放通 VLAN 10/20。',
  devices: lab4Devices,
  steps: [
    {
      title: 'SW1 创建 VLAN 10、20',
      text: '进入系统视图，用 vlan batch 批量创建 VLAN 10 与 VLAN 20。',
      commands: ['system-view', 'vlan batch 10 20'],
      deviceId: 'sw1',
    },
    {
      title: 'SW1 配置 Access 口',
      text: '把 Ethernet0/0/1 划为 Access 口并加入 VLAN 10，模拟终端接入 VLAN 10。',
      commands: [
        'interface Ethernet0/0/1',
        'port link-type access',
        'port default vlan 10',
      ],
      deviceId: 'sw1',
    },
    {
      title: 'SW1 配置互联 Trunk 口',
      text: '把互联口 GigabitEthernet0/0/1 配置为 Trunk，并放通 VLAN 10、20。',
      commands: [
        'interface GigabitEthernet0/0/1',
        'port link-type trunk',
        'port trunk allow-pass vlan 10 20',
      ],
      deviceId: 'sw1',
    },
    {
      title: 'SW2 创建 VLAN 10、20',
      text: 'SW2 进入系统视图，同样批量创建 VLAN 10 与 VLAN 20。',
      commands: ['system-view', 'vlan batch 10 20'],
      deviceId: 'sw2',
    },
    {
      title: 'SW2 配置 Access 口',
      text: '把 SW2 的 Ethernet0/0/1 划为 Access 口并加入 VLAN 20，模拟终端接入 VLAN 20。',
      commands: [
        'interface Ethernet0/0/1',
        'port link-type access',
        'port default vlan 20',
      ],
      deviceId: 'sw2',
    },
    {
      title: 'SW2 配置互联 Trunk 口',
      text: '把 SW2 的 GigabitEthernet0/0/1 配置为 Trunk，并放通 VLAN 10、20，与 SW1 保持一致。',
      commands: [
        'interface GigabitEthernet0/0/1',
        'port link-type trunk',
        'port trunk allow-pass vlan 10 20',
      ],
      deviceId: 'sw2',
    },
    {
      title: '验证 VLAN 与端口配置',
      text: '执行 display vlan 确认 VLAN 10、20 已创建；display port vlan 确认互联口为 trunk 且放通 VLAN 10、20。',
      commands: ['display vlan', 'display port vlan'],
      deviceId: 'sw1',
    },
  ],
  acceptance: [
    'SW1 执行 display vlan，已创建 VLAN 10 与 VLAN 20',
    'SW2 执行 display vlan，已创建 VLAN 10 与 VLAN 20',
    'SW1 执行 display port vlan，GE0/0/1 为 trunk 且放通 VLAN 10、20，Eth0/0/1 为 access 且属于 VLAN 10',
    'SW2 执行 display port vlan，GE0/0/1 为 trunk 且放通 VLAN 10、20，Eth0/0/1 为 access 且属于 VLAN 20',
    '两台交换机互联 Trunk 口放通的 VLAN 列表一致（均为 10、20）',
  ],
  hints: [
    'Access 口用于连接终端，只能属于一个 VLAN；Trunk 口用于交换机互联，可承载多个 VLAN。',
    '两端 Trunk 口放通的 VLAN 列表必须一致，否则对应 VLAN 的流量会被丢弃。',
    'display port vlan 中 PVID 表示缺省 VLAN，Trunk 口的 PVID 默认是 1。',
    'vlan batch 10 20 可一次创建多个不连续 VLAN，省去逐台 vlan 10 / vlan 20 的重复操作。',
  ],
  ensp: {
    models: { sw1: 'S5700', sw2: 'S5700' },
    links: [{ a: 'sw1', b: 'sw2' }],
    startHint: '两台 S5700 通过 GE0/0/1 互联，分别创建 VLAN 10、20，把 Eth0/0/1 划为 Access、GE0/0/1 划为 Trunk 并放通 VLAN 10、20。',
    checks: [
      {
        id: 'lab-4-sw1-vlan10',
        text: 'SW1 上已创建 VLAN 10',
        deviceId: 'sw1',
        command: 'display vlan',
        expect: '\\b10\\b',
      },
      {
        id: 'lab-4-sw1-vlan20',
        text: 'SW1 上已创建 VLAN 20',
        deviceId: 'sw1',
        command: 'display vlan',
        expect: '\\b20\\b',
      },
      {
        id: 'lab-4-sw1-trunk',
        text: 'SW1 的 GE0/0/1 已配置为 Trunk 口',
        deviceId: 'sw1',
        command: 'display port vlan',
        expect: '(?i)trunk',
      },
      {
        id: 'lab-4-sw2-vlan10',
        text: 'SW2 上已创建 VLAN 10',
        deviceId: 'sw2',
        command: 'display vlan',
        expect: '\\b10\\b',
      },
      {
        id: 'lab-4-sw2-vlan20',
        text: 'SW2 上已创建 VLAN 20',
        deviceId: 'sw2',
        command: 'display vlan',
        expect: '\\b20\\b',
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
};

/* ------------------------------ lab-5 ------------------------------ */

const lab5Devices: VrpDevice[] = [
  {
    id: 'fw1',
    name: 'FW1',
    interfaces: [
      { name: 'GigabitEthernet1/0/0', shutdown: true },
      { name: 'GigabitEthernet1/0/1', shutdown: true },
    ],
    links: [{ to: 'r1', localIf: 'GigabitEthernet1/0/1', remoteIf: GI_000 }],
  },
  {
    id: 'r1',
    name: 'R1',
    interfaces: [{ name: GI_000, shutdown: true }],
    links: [{ to: 'fw1', localIf: GI_000, remoteIf: 'GigabitEthernet1/0/1' }],
  },
];

const lab5: LabScenario = {
  id: 'lab-5',
  title: '防火墙安全策略',
  level: '精通',
  summary: 'USG5500 划分 Trust/Untrust 区域，配置安全策略放通 Untrust→Trust 与 Untrust→local，让 Untrust 侧的 R1 能 ping 通防火墙内网地址 192.168.10.1。',
  devices: lab5Devices,
  steps: [
    {
      title: 'FW1 配置接口地址',
      text: 'GE1/0/0 作为内网（Trust）网关配置 192.168.10.1/24，GE1/0/1 作为外网（Untrust）接口配置 202.100.1.1/24；在 GE1/0/1 上 service-manage ping permit 放通到防火墙自身的 ping 管理报文。',
      commands: [
        'system-view',
        'interface GigabitEthernet1/0/0',
        'ip address 192.168.10.1 24',
        'undo shutdown',
        'quit',
        'interface GigabitEthernet1/0/1',
        'ip address 202.100.1.1 24',
        'service-manage ping permit',
        'undo shutdown',
      ],
      deviceId: 'fw1',
    },
    {
      title: 'FW1 接口加入安全区域',
      text: '把 GE1/0/0 加入 trust 区域，GE1/0/1 加入 untrust 区域。',
      commands: [
        'firewall zone trust',
        'add interface GigabitEthernet1/0/0',
        'quit',
        'firewall zone untrust',
        'add interface GigabitEthernet1/0/1',
      ],
      deviceId: 'fw1',
    },
    {
      title: 'FW1 配置安全策略',
      text: '进入 security-policy，新建规则放通 Untrust→Trust 的流量；由于 R1 ping 的 192.168.10.1 是防火墙自身接口（属于 local 区域），再新建一条 Untrust→local 的 permit 规则，保证 ping 不被默认策略丢弃。',
      commands: [
        'security-policy',
        'rule name permit-untrust-to-trust',
        'source-zone untrust',
        'destination-zone trust',
        'source-address 202.100.1.0 24',
        'action permit',
        'rule name permit-untrust-to-local',
        'source-zone untrust',
        'destination-zone local',
        'source-address 202.100.1.0 24',
        'action permit',
      ],
      deviceId: 'fw1',
    },
    {
      title: 'R1 配置接口地址',
      text: 'R1 的 GigabitEthernet0/0/0 配置 202.100.1.2/24 并 undo shutdown 开启接口，与 FW1 的 GE1/0/1 同网段。',
      commands: [
        'system-view',
        'interface GigabitEthernet0/0/0',
        'ip address 202.100.1.2 24',
        'undo shutdown',
      ],
      deviceId: 'r1',
    },
    {
      title: 'FW1 查看安全策略',
      text: '在 FW1 执行 display security-policy rule all，确认两条 permit 规则已生成且源/目的区域正确。',
      commands: ['display security-policy rule all'],
      deviceId: 'fw1',
    },
    {
      title: 'R1 ping 验证连通性',
      text: '在 R1 上 ping 192.168.10.1，收到 Reply 说明 Untrust→local 的流量已被放通。',
      commands: ['ping 192.168.10.1'],
      deviceId: 'r1',
    },
  ],
  acceptance: [
    'FW1 执行 display ip interface brief，GE1/0/0 地址为 192.168.10.1/24，GE1/0/1 地址为 202.100.1.1/24，接口均 up',
    'R1 执行 display ip interface brief，Gi0/0/0 地址为 202.100.1.2/24 且接口 up',
    'FW1 执行 display security-policy rule all，存在 source-zone untrust、destination-zone trust 与 local、action permit 的规则',
    'R1 执行 ping 192.168.10.1，收到 Reply，丢包率 0%',
  ],
  hints: [
    '接口不加入安全区域时，防火墙默认不放通任何流量。',
    '目的地址是防火墙自身接口时，流量的目的区域是 local，需配置 untrust→local 策略或接口 service-manage 放通。',
    '安全策略按「源区域 → 目的区域」匹配，规则顺序会影响最终动作，越靠前越优先。',
    'ping 不通时先看 display security-policy rule all 的命中计数，再确认接口地址与区域是否配置正确。',
  ],
  ensp: {
    models: { fw1: 'USG5500', r1: 'AR2220' },
    links: [{ a: 'fw1', b: 'r1' }],
    startHint: 'FW1 的 GE1/0/0 接 Trust 区域（192.168.10.1/24），GE1/0/1 接 Untrust 区域（202.100.1.1/24），放通 R1 所在网段访问内网与防火墙自身。',
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
        text: 'FW1 未配置将 Untrust 流量整体 deny 的规则',
        deviceId: 'fw1',
        command: 'display security-policy rule all',
        reject: '(?im)^\\s*deny\\s*$',
      },
      {
        id: 'lab-5-r1-ping',
        text: 'R1 能 ping 通防火墙内网地址 192.168.10.1，丢包率 0%',
        deviceId: 'r1',
        command: 'ping 192.168.10.1',
        expect: 'Reply from 192\\.168\\.10\\.1',
        maxLoss: 0,
      },
    ],
  },
};

export const scenarios: LabScenario[] = [lab1, lab2, lab3, lab4, lab5];

export function getScenario(id: string): LabScenario | undefined {
  return scenarios.find((s) => s.id === id);
}
