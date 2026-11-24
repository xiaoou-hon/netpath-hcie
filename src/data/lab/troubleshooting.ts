/**
 * 故障排查实训案例
 * ------------------------------------------------------------------
 * 每个案例给出故障现象与现场证据，学习者先定位根因，再选择修复动作，
 * 提交后自动判分并展示解析。全部数据为静态内容，不依赖任何运行时设备。
 */
import type { Depth } from '@/types';

export interface TroubleshootOption {
  id: string;
  text: string;
}

export interface TroubleshootRepair {
  id: string;
  text: string;
  /** 参考命令，用于解析区展示 */
  command?: string;
}

export interface TroubleshootEvidence {
  title: string;
  text: string;
}

export interface TroubleshootCase {
  id: string;
  title: string;
  level: Depth;
  summary: string;
  /** 故障现象 */
  symptom: string;
  /** 现场证据：配置片段或 display 输出 */
  evidence: TroubleshootEvidence[];
  /** 候选根因 */
  rootCauses: TroubleshootOption[];
  /** 正确根因 id */
  answer: string;
  /** 候选修复动作（含干扰项） */
  repairs: TroubleshootRepair[];
  /** 正确修复动作 id */
  correctRepairs: string[];
  /** 解题思路复盘 */
  explanation: string;
  /** 定位方向提示 */
  hint: string;
  /** 排查步骤：有序的现场排查动作与预期观察（五段式之三） */
  triageSteps: string[];
  /** 根因分析：该故障为什么会发生（五段式之四） */
  rootCauseAnalysis: string;
  /** 解决方案：最终修复动作与关键配置（五段式之五） */
  solution: string;
  /** 规避措施：上线 / 变更 / 巡检检查项（五段式收尾） */
  prevention: string[];
  /** 是否为文档导入生成 */
  imported?: boolean;
  /** 导入来源文件名 */
  source?: string;
  /** 关联课时 */
  lessonId?: string;
}

export const troubleshootCases: TroubleshootCase[] = [
  {
    id: 'tshoot-1',
    title: '直连链路 ping 不通',
    level: '了解',
    summary: '新上架的两台路由器地址已配好，互 ping 却全部超时。',
    symptom:
      'R1 与 R2 通过 GigabitEthernet0/0/0 直连，接口已分别配置 192.168.12.1/24 与 192.168.12.2/24，但 R1 上 ping 192.168.12.2 一直超时。',
    evidence: [
      {
        title: 'R1 display ip interface brief',
        text: [
          'Interface              IP Address/Mask     Physical   Protocol',
          'GigabitEthernet0/0/0   192.168.12.1/24     down       down',
        ].join('\n'),
      },
      {
        title: 'R1 接口配置片段',
        text: [
          'interface GigabitEthernet0/0/0',
          ' ip address 192.168.12.1 255.255.255.0',
          ' shutdown',
        ].join('\n'),
      },
    ],
    rootCauses: [
      { id: 'if-shutdown', text: '接口仍处于 shutdown 状态，物理层没有开启' },
      { id: 'wrong-subnet', text: '两台设备的接口地址不在同一网段' },
      { id: 'no-route', text: '缺少到达 192.168.12.0/24 的静态路由' },
      { id: 'no-sysname', text: '对端设备没有配置 sysname' },
    ],
    answer: 'if-shutdown',
    repairs: [
      { id: 'undo-shutdown', text: '进入接口视图执行 undo shutdown 开启接口', command: 'undo shutdown' },
      { id: 'check-brief', text: '重新查看接口状态，确认 Physical 与 Protocol 均为 up', command: 'display ip interface brief' },
      { id: 'ping-again', text: '在 R1 上 ping 192.168.12.2 复测连通性', command: 'ping 192.168.12.2' },
      { id: 'change-mask', text: '把 R2 的接口掩码改为 255.255.0.0' },
      { id: 'static-route', text: '在 R1 上配置指向 192.168.12.2 的静态路由' },
      { id: 'reboot', text: '重启两台路由器让配置生效' },
    ],
    correctRepairs: ['undo-shutdown', 'check-brief', 'ping-again'],
    explanation:
      'display ip interface brief 里 Physical 为 down，说明问题卡在物理层：接口被 shutdown 后既不收发包，也不会参与协议协商。开启接口后 Physical/Protocol 会变为 up，直连网段无需路由即可互 ping。掩码改动与静态路由都属于三层问题，与本例现象不符。',
    hint: '先看 Physical 列：down 优先怀疑接口开关、线缆与光模块。',
    triageSteps: [
      '在 R1 上执行 display ip interface brief，观察 GigabitEthernet0/0/0 的 Physical 与 Protocol 列均为 down。',
      '执行 display current-configuration interface GigabitEthernet0/0/0，确认接口下存在 shutdown 命令。',
      '在 R2 上同样查看接口状态与配置，排除对端问题。',
      '进入 R1 接口视图执行 undo shutdown 开启接口，再用 display ip interface brief 确认 Physical/Protocol 变为 up。',
      '在 R1 上 ping 192.168.12.2 复测，确认连通性恢复。',
    ],
    rootCauseAnalysis:
      'display ip interface brief 中 Physical 为 down，说明故障发生在物理层而非三层。接口被 shutdown 后不发送也不接收任何帧，链路无法协商，Protocol 随之 down。由于接口没有 up，直连网段路由不会进入路由表，因此互 ping 超时。掩码与路由问题属于三层，本例证据已排除。',
    solution:
      '进入接口视图关闭 shutdown：interface GigabitEthernet0/0/0 → undo shutdown。开启后 Physical/Protocol 均 up，直连网段 192.168.12.0/24 自动出现在路由表中，R1 与 R2 即可互 ping。',
    prevention: [
      '设备上架、配置下发后，必须用 display ip interface brief 全量巡检所有在用接口的 Physical/Protocol 状态。',
      '建立配置基线核查机制，禁止接口视图残留 shutdown（维护窗口除外）。',
      '变更后执行连通性复测（ping 对端直连地址），并将结果纳入变更验收清单。',
    ],
    lessonId: 'm11-l01',
  },
  {
    id: 'tshoot-2',
    title: 'OSPF 邻居卡在 ExStart',
    level: '熟悉',
    summary: '底层互 ping 正常，OSPF 邻居却始终到不了 Full。',
    symptom:
      'R1 与 R2 的 GigabitEthernet0/0/0 同网段且互 ping 正常，OSPF 邻居一直停在 ExStart，路由表中没有对方的环回网段。',
    evidence: [
      {
        title: 'R1 display ospf peer',
        text: [
          'Area 0.0.0.0 interface GigabitEthernet0/0/0\'s neighbors',
          'Router ID: 2.2.2.2       Address: 10.0.12.2',
          'State: ExStart   Mode: Nbr is Master   Priority: 1',
          'Dead timer due in 00:00:34',
        ].join('\n'),
      },
      {
        title: 'R1 接口 MTU',
        text: 'GigabitEthernet0/0/0  MTU 1400',
      },
      {
        title: 'R2 接口 MTU',
        text: 'GigabitEthernet0/0/0  MTU 1500',
      },
    ],
    rootCauses: [
      { id: 'area-mismatch', text: '两端 OSPF 区域号不一致' },
      { id: 'mtu-mismatch', text: '两端接口 MTU 不一致，DD 报文协商失败' },
      { id: 'same-router-id', text: '两端 router-id 配置相同' },
      { id: 'not-advertised', text: '接口网段没有宣告进 OSPF' },
    ],
    answer: 'mtu-mismatch',
    repairs: [
      { id: 'fix-mtu', text: '把两端接口 MTU 统一（如 R2 调整为 1400）', command: 'interface GigabitEthernet0/0/0\n mtu 1400' },
      { id: 'reset-ospf', text: '重置 OSPF 邻居，让 DD 协商重新开始', command: 'reset ospf process' },
      { id: 'check-full', text: '再次查看邻居状态，确认进入 Full', command: 'display ospf peer' },
      { id: 'change-area', text: '把 R2 的区域改为 area 1' },
      { id: 'static-route', text: '在 R1 上配置到 2.2.2.2 的静态路由' },
      { id: 'stop-ospf', text: '关闭 R2 的 OSPF 进程重新启动' },
    ],
    correctRepairs: ['fix-mtu', 'reset-ospf', 'check-full'],
    explanation:
      'ExStart 是主从选举并开始交换 DD 报文的阶段。两端 MTU 不一致时，较大的 DD 报文会被对端丢弃，邻居长期停在 ExStart/Exchange。统一 MTU 后重置邻居即可恢复。区域号不一致通常表现为邻居停在 Init/2-Way，router-id 冲突与网段未宣告也不会呈现 ExStart。',
    hint: 'ExStart/Exchange 卡住时，优先核对两端接口 MTU 与 DD 报文。',
    triageSteps: [
      '在 R1 上执行 display ospf peer，确认邻居停在 ExStart，且底层 10.0.12.0/24 网段互 ping 正常。',
      '在 R1、R2 上分别执行 display interface GigabitEthernet0/0/0，对比输出中的 MTU 字段。',
      '发现 R1 MTU 1400、R2 MTU 1500 不一致，定位为 DD 报文协商失败。',
      '在 R2 接口视图执行 mtu 1400，将两端 MTU 统一。',
      '执行 reset ospf process 重启邻居，再 display ospf peer 确认状态进入 Full，display ip routing-table 确认学到对端环回路由。',
    ],
    rootCauseAnalysis:
      'OSPF 在 ExStart/Exchange 阶段通过 DD 报文通告 LSA 摘要。VRP 默认会在 DD 报文中携带接口 MTU，当两端 MTU 不一致时，较大一端发出的 DD 报文会被对端以 MTU 不匹配丢弃，导致邻居无法完成数据库同步，长期停在 ExStart/Exchange。底层 IP 可达（互 ping 正常）证明物理与三层无问题，问题出在 OSPF 报文交互。',
    solution:
      '统一互联接口 MTU：在 R2 上 interface GigabitEthernet0/0/0 → mtu 1400。随后 reset ospf process 让邻居重新协商，邻居状态进入 Full，LSA 正常泛洪，路由表出现对端环回网段。',
    prevention: [
      'OSPF 互联链路的接口 MTU 必须纳入配置基线，两端保持一致（默认 1500，特殊场景如 MPLS/IPSec 需统一调低）。',
      '变更后用 display ospf peer 巡检所有邻居状态必须为 Full，并记录拓扑基线。',
      '若确需忽略 MTU 检查，可在接口下 ospf mtu-enable 关闭 MTU 校验，但应谨慎评估分片风险。',
    ],
    lessonId: 'm11-l02',
  },
  {
    id: 'tshoot-3',
    title: '跨交换机 VLAN 20 不通',
    level: '熟悉',
    summary: '同一个 Trunk 上 VLAN 10 正常，VLAN 20 却完全不通。',
    symptom:
      'SW1 与 SW2 通过 GigabitEthernet0/0/1 互联并配置为 Trunk。VLAN 10 的终端可以互通，VLAN 20 的终端互 ping 全部失败。',
    evidence: [
      {
        title: 'SW1 display port vlan',
        text: [
          'Port                    Link Type    PVID   Trunk VLAN List',
          'GigabitEthernet0/0/1    trunk        1      10',
          'Ethernet0/0/1           access       20     -',
        ].join('\n'),
      },
      {
        title: 'SW2 display port vlan',
        text: [
          'Port                    Link Type    PVID   Trunk VLAN List',
          'GigabitEthernet0/0/1    trunk        1      10 20',
        ].join('\n'),
      },
      {
        title: 'SW1 VLAN 配置',
        text: 'vlan batch 10 20',
      },
    ],
    rootCauses: [
      { id: 'trunk-vlan', text: 'SW1 的 Trunk 口没有放通 VLAN 20' },
      { id: 'pvid-mismatch', text: '两端 Trunk 口的 PVID 不一致' },
      { id: 'vlan-missing', text: 'VLAN 20 没有在 SW2 上创建' },
      { id: 'port-security', text: '接入端口没有配置 port-security' },
    ],
    answer: 'trunk-vlan',
    repairs: [
      { id: 'allow-vlan', text: '在 SW1 的 Trunk 口放通 VLAN 20', command: 'interface GigabitEthernet0/0/1\n port trunk allow-pass vlan 20' },
      { id: 'check-trunk', text: '再次查看两端 Trunk 放通列表是否一致', command: 'display port vlan' },
      { id: 'test-ping', text: '让 VLAN 20 终端互 ping 复测' },
      { id: 'delete-vlan10', text: '在 SW1 上删除 VLAN 10 腾出资源' },
      { id: 'to-access', text: '把互联口 GigabitEthernet0/0/1 改成 Access 口' },
      { id: 'change-pvid', text: '把 SW1 的 Trunk PVID 改成 20' },
    ],
    correctRepairs: ['allow-vlan', 'check-trunk', 'test-ping'],
    explanation:
      'Trunk 口只转发 allow-pass 列表内的 VLAN。SW1 的 Trunk 列表只有 10，VLAN 20 的帧在出接口被丢弃，因此 VLAN 10 正常、VLAN 20 不通。PVID 只影响未打标签的帧，与 VLAN 20 是否放通无关；VLAN 20 在 SW1 上已创建且接入口已划入，说明问题不在创建环节。',
    hint: 'VLAN 不通先看两端 Trunk 的 allow-pass 列表是否对称。',
    triageSteps: [
      '在 SW1、SW2 上分别执行 display port vlan，对比互联口 GigabitEthernet0/0/1 的 Trunk VLAN List。',
      '发现 SW1 的 Trunk 列表只有 VLAN 10，缺少 VLAN 20；SW2 列表包含 10 与 20。',
      '执行 display vlan 20 确认 VLAN 20 已在两端创建，排除 VLAN 未创建问题。',
      '在 SW1 的 Trunk 口执行 port trunk allow-pass vlan 20 放通 VLAN 20。',
      '再次 display port vlan 确认两端列表对称，让 VLAN 20 终端互 ping 复测。',
    ],
    rootCauseAnalysis:
      'Trunk 端口只转发 allow-pass vlan 列表内的带标签帧。SW1 互联口的放通列表只有 VLAN 10，VLAN 20 的帧在出 SW1 的 Trunk 口时被丢弃，因此 VLAN 10 正常而 VLAN 20 完全不通。PVID 仅影响未打标签的帧，与 VLAN 20 的放通无关；display vlan 证明 VLAN 20 已创建，问题不在 VLAN 创建环节。',
    solution:
      '在 SW1 上将互联口放通 VLAN 20：interface GigabitEthernet0/0/1 → port trunk allow-pass vlan 20。放通后两端 Trunk 列表一致，VLAN 20 帧可正常穿越互联链路。',
    prevention: [
      'Trunk 互联链路两端的 allow-pass vlan 列表必须对称，变更后用 display port vlan 对比核查。',
      '新增业务 VLAN 时，同步更新所有相关 Trunk 口的放通列表，避免遗漏。',
      '对生产 Trunk 口执行放通操作后，立即用终端互 ping 验证业务 VLAN 连通性。',
    ],
    lessonId: 'm13-l06',
  },
  {
    id: 'tshoot-4',
    title: 'BGP 邻居一直 Active',
    level: '精通',
    summary: '底层可达、配置看似完整，BGP 邻居却建立不起来。',
    symptom:
      'R1（AS 65001）与 R2（AS 65002）直连。R1 上 BGP 邻居 10.0.12.2 长期处于 Active，学不到对端路由。',
    evidence: [
      {
        title: 'R1 display bgp peer',
        text: [
          'BGP local router ID : 1.1.1.1',
          'Local AS number : 65001',
          'Peer            AS      State         Up/Down',
          '10.0.12.2       65003   Active        Never',
        ].join('\n'),
      },
      {
        title: 'R1 BGP 配置片段',
        text: [
          'bgp 65001',
          ' router-id 1.1.1.1',
          ' peer 10.0.12.2 as-number 65003',
          ' ipv4-family unicast',
          '  peer 10.0.12.2 enable',
        ].join('\n'),
      },
      {
        title: 'R1 ping 10.0.12.2',
        text: 'Reply from 10.0.12.2: bytes=56 Sequence=1 ttl=255 time=2 ms\n--- 10.0.12.2 ping statistics ---\n 5 packet(s) transmitted, 5 packet(s) received, 0.00% packet loss',
      },
    ],
    rootCauses: [
      { id: 'as-mismatch', text: 'peer 命令中的对端 AS 号写错（R2 实际是 AS 65002）' },
      { id: 'unreachable', text: 'R1 与 R2 之间三层不可达' },
      { id: 'no-ipv4-family', text: '没有进入 ipv4-family unicast 视图' },
      { id: 'router-id-conflict', text: '两端 router-id 冲突' },
    ],
    answer: 'as-mismatch',
    repairs: [
      { id: 'fix-as', text: '删除错误 peer 后按正确 AS 65002 重新配置', command: 'bgp 65001\n undo peer 10.0.12.2\n peer 10.0.12.2 as-number 65002\n ipv4-family unicast\n  peer 10.0.12.2 enable' },
      { id: 'check-state', text: '再次查看邻居状态，确认进入 Established', command: 'display bgp peer' },
      { id: 'check-routes', text: '查看路由表确认已学到对端网段', command: 'display ip routing-table' },
      { id: 'max-hop', text: '给邻居配置 ebgp-max-hop 2' },
      { id: 'stop-bgp', text: '关闭 R2 的 BGP 进程' },
      { id: 'change-local-as', text: '把 R1 的本地 AS 也改成 65003' },
    ],
    correctRepairs: ['fix-as', 'check-state', 'check-routes'],
    explanation:
      '邻居停在 Active 说明 TCP 179 连接始终没有建立。ping 已证明三层可达，R1 却把对端声明为 AS 65003，R2 收到 OPEN 后发现 AS 号不符会拒绝，连接反复重试后回到 Active。修正对端 AS 后邻居可进入 Established。由于是直连 eBGP，无需 ebgp-max-hop。',
    hint: 'Active 表示 TCP 连接未建立：先验可达性，再核对 AS 号等 OPEN 参数。',
    triageSteps: [
      '在 R1 上执行 display bgp peer，确认邻居 10.0.12.2 长期处于 Active。',
      '在 R1 上 ping 10.0.12.2，确认底层三层可达（0% 丢包），排除连通性问题。',
      '对比 display bgp peer 输出中的 AS 列与 R2 实际 AS 号：R1 声明为 65003，R2 实际为 65002，发现不匹配。',
      '在 R1 上 undo peer 10.0.12.2 后重新 peer 10.0.12.2 as-number 65002，并在 ipv4-family unicast 下使能。',
      'display bgp peer 确认邻居进入 Established，display ip routing-table 确认已学到对端路由。',
    ],
    rootCauseAnalysis:
      'BGP 邻居停在 Active 表示 TCP 179 连接建立后，OPEN 报文协商失败被对端拒绝，连接不断重试。ping 已证明三层可达，而 R1 将对端 AS 声明为 65003，R2 真实 AS 为 65002，R2 收到 OPEN 后校验对端 AS 不匹配，发送 NOTIFICATION 并断开，邻居反复回到 Active。直连 eBGP 无需 ebgp-max-hop，版本号、hold-time 等本例证据未显示异常。',
    solution:
      '在 R1 上按正确 AS 号重建邻居：bgp 65001 → undo peer 10.0.12.2 → peer 10.0.12.2 as-number 65002 → ipv4-family unicast → peer 10.0.12.2 enable。重建后 OPEN 协商通过，邻居进入 Established，路由正常交互。',
    prevention: [
      '建立 BGP 邻居前必须核对两端 AS 号、邻居 IP、直连/非直连（ebgp-max-hop）等关键参数，建立邻居参数表。',
      '变更后用 display bgp peer 巡检所有邻居状态必须为 Established。',
      '对邻居建立失败场景，优先查看 display bgp peer 与 debugging bgp event，定位是 TCP 层还是 OPEN 协商层。',
    ],
    lessonId: 'm13-l05',
  },
  {
    id: 'tshoot-5',
    title: '防火墙安全策略不生效',
    level: '精通',
    summary: '策略显示 permit，流量却被静默丢弃。',
    symptom:
      'FW1 上已配置 Untrust 到 Trust 的 permit 策略，但外网侧的 R1 ping 内网地址 192.168.10.1 仍然超时。',
    evidence: [
      {
        title: 'FW1 display security-policy rule all',
        text: [
          'rule name permit-r1',
          '  source-zone untrust',
          '  destination-zone trust',
          '  source-address 202.100.1.0 24',
          '  action permit',
        ].join('\n'),
      },
      {
        title: 'FW1 display zone',
        text: [
          'zone name trust',
          '  interface GigabitEthernet1/0/0',
          'zone name untrust',
          '  (no interface)',
        ].join('\n'),
      },
    ],
    rootCauses: [
      { id: 'no-zone', text: '外网接口 GigabitEthernet1/0/1 未加入 Untrust 安全区域' },
      { id: 'no-default-route', text: 'R1 缺少默认路由' },
      { id: 'deny-action', text: '策略动作实际被设置成了 deny' },
      { id: 'no-nat', text: '防火墙没有配置 NAT' },
    ],
    answer: 'no-zone',
    repairs: [
      { id: 'add-zone', text: '把 GigabitEthernet1/0/1 加入 Untrust 区域', command: 'firewall zone untrust\n add interface GigabitEthernet1/0/1' },
      { id: 'check-zone', text: '查看区域成员，确认接口已加入', command: 'display zone' },
      { id: 'retest', text: '在 R1 上重新 ping 192.168.10.1 复测', command: 'ping 192.168.10.1' },
      { id: 'deny-rule', text: '把 permit-r1 的策略动作改为 deny' },
      { id: 'delete-trust', text: '删除 Trust 区域' },
      { id: 'static-nat', text: '给 R1 配置静态 NAT' },
    ],
    correctRepairs: ['add-zone', 'check-zone', 'retest'],
    explanation:
      '安全策略按「源区域 → 目的区域」匹配，接口未加入任何区域时流量没有区域属性，策略根本不会被命中，默认被丢弃。display zone 显示 Untrust 下没有接口，说明入方向接口没有归属。补加区域成员后策略即可生效，本例是纯放通场景，不需要 NAT。',
    hint: '策略不生效先确认流量是否真的带有区域属性：接口有没有加入区域。',
    triageSteps: [
      '在 FW1 上执行 display security-policy rule all，确认 Untrust 到 Trust 的 permit 策略已配置。',
      '执行 display zone，发现 Untrust 区域下没有任何接口成员，外网入接口 GigabitEthernet1/0/1 未加入区域。',
      '确认 Trust 区域已加入内网接口，排除目的区域问题。',
      '将外网接口加入 Untrust 区域：firewall zone untrust → add interface GigabitEthernet1/0/1。',
      'display zone 确认接口已归属，在 R1 上 ping 192.168.10.1 复测连通性。',
    ],
    rootCauseAnalysis:
      '华为防火墙安全策略按源安全区域到目的安全区域匹配流量。接口必须加入安全区域后，进出该接口的流量才会被赋予区域属性。本例中外网接口未加入 Untrust，入方向流量没有源区域，策略根本不会被命中，设备按默认行为丢弃。display zone 显示 Untrust 无成员接口是直接证据，策略本身的 permit 动作无问题。',
    solution:
      '将外网接口加入 Untrust 安全区域：firewall zone untrust → add interface GigabitEthernet1/0/1。接口加入区域后流量获得区域属性，permit 策略被命中，外网到内网的流量被放行。',
    prevention: [
      '防火墙接口配置完成后，必须 display zone 确认每个接口都已加入正确的安全区域。',
      '建立接口、区域、策略三方对照清单，新增接口时同步更新区域归属与策略。',
      '策略不生效时，先用 display firewall session table 与 policy hit-count 确认策略是否命中，再回溯区域归属。',
    ],
    lessonId: 'm13-l08',
  },
  {
    id: 'tshoot-6',
    title: '光口互联物理 down 光模块不发光',
    level: '了解',
    summary: '两台交换机光口对连，接口始终物理 down，光模块收无光。',
    symptom:
      'SW1 与 SW2 通过 GigabitEthernet0/0/1 光口互联，两端已配置正确 IP，但接口物理层始终 down，display interface 显示链路未连接，光模块无收光功率。',
    evidence: [
      {
        title: 'SW1 display interface GigabitEthernet0/0/1',
        text: [
          'GigabitEthernet0/0/1 current state : DOWN',
          'Line protocol current state : DOWN',
          'Description: link-to-SW2',
          'Switch Port, PVID : 1, TPID : 8100(Hex), The Maximum Frame Length is 9216',
          'IP Sending Frames Format is PKTFMT_ETHNT_2, Hardware address is 00e0-fc12-3456',
          'Speed : 1000M, Loopback: NONE, Duplex: FULL',
          'Mdi : NORMAL, Clock : SLAVE, Negotiation : ENABLE',
          'Last physical up time : Never',
          'Last physical down time : 2026-11-18 10:22:01',
        ].join('\n'),
      },
      {
        title: 'SW1 display transceiver verbose GigabitEthernet0/0/1',
        text: [
          'GigabitEthernet0/0/1 transceiver information:',
          '  Common information:',
          '    Transceiver Type               :1000_BASE_SX_SFP',
          '    Connector Type                 :LC',
          '    Wavelength (nm)                :850',
          '  Alarm information:',
          '    TX power high        : NO    TX power low         : YES',
          '    RX power high        : NO    RX power low         : YES',
          '    TX bias high         : NO    TX bias low          : YES',
          '  Diagnostic information:',
          '    Temperature (C)              :25.00',
          '    Bias Current (mA)             :0.00',
          '    RX Power (dBm)                :-40.00',
        ].join('\n'),
      },
    ],
    rootCauses: [
      { id: 'sfp-fault', text: '光模块未插紧或已损坏，不发光也不收光（TX bias 与 RX power 均为 0）' },
      { id: 'if-shutdown', text: '接口被手工 shutdown 关闭' },
      { id: 'speed-mismatch', text: '两端接口速率与双工模式协商不匹配' },
      { id: 'vlan-missing', text: '端口所属 VLAN 未创建' },
    ],
    answer: 'sfp-fault',
    repairs: [
      { id: 'reseat-sfp', text: '重新拔插并更换光模块，确保插紧到位', command: '更换光模块后 display transceiver verbose GigabitEthernet0/0/1' },
      { id: 'check-optical', text: '查看光模块诊断信息，确认 RX 与 TX 功率恢复正常', command: 'display transceiver verbose GigabitEthernet0/0/1' },
      { id: 'verify-up', text: '查看接口状态确认 Physical 与 Protocol 变为 up', command: 'display interface GigabitEthernet0/0/1' },
      { id: 'undo-shutdown', text: '在接口下执行 undo shutdown' },
      { id: 'force-speed', text: '强制两端接口速率为 100M 并强制全双工' },
      { id: 'create-vlan', text: '在交换机上创建 VLAN 1' },
    ],
    correctRepairs: ['reseat-sfp', 'check-optical', 'verify-up'],
    explanation:
      'display interface 显示 Physical down 且 Last physical up time 为 Never，display transceiver verbose 显示 TX bias current 为 0、RX power 为 -40dBm（无光），说明光模块没有发光也收不到光。接口本身未 shutdown（若 shutdown 会显示 Administratively down），速率双工为自协商默认值，问题定位在光模块本身或光纤。重新拔插或更换光模块后光功率恢复，接口即可 up。',
    hint: '物理 down 先看光模块诊断：TX bias 为 0 通常是不发光，RX power 为 -40 是收无光。',
    triageSteps: [
      '执行 display interface GigabitEthernet0/0/1，确认 Physical 为 down，且状态为 DOWN 而非 Administratively DOWN（排除 shutdown）。',
      '执行 display transceiver verbose GigabitEthernet0/0/1，观察 Alarm 与 Diagnostic 信息。',
      '发现 TX bias current 为 0、RX power 为 -40dBm，判定光模块不发光且不收光。',
      '重新拔插光模块并更换备品，确保插紧、光纤端面清洁。',
      '再次 display transceiver verbose 确认光功率恢复，display interface 确认接口 up，对端 ping 复测。',
    ],
    rootCauseAnalysis:
      '光口链路物理 down 的常见原因包括：接口 shutdown、光模块故障或未插紧、光纤断裂或端面脏污、速率双工不匹配。本例证据中接口未被 shutdown（状态为 DOWN 而非 Administratively DOWN），速率双工为自协商默认值；而 display transceiver verbose 显示 TX bias 为 0（激光器不发光）、RX power 为 -40dBm（接收无光），这是光模块未插紧或已损坏的典型特征。光模块不发光，对端自然收不到光，链路无法协商，物理层一直 down。',
    solution:
      '重新拔插光模块确保插紧到位，若仍不发光则更换同型号光模块，并清洁光纤端面与光口。更换后 display transceiver verbose 显示 RX 与 TX 功率在正常范围（通常 -1 到 -10dBm 之间），display interface 显示接口 Physical 与 Protocol 均 up，链路恢复。',
    prevention: [
      '光口链路开通前，用 display transceiver verbose 核查光功率在正常范围，建立光功率基线。',
      '光模块与光纤为易损件，机房维护时避免弯折光纤，保持端面清洁，备品匹配型号与波长。',
      '对生产光口配置光功率告警阈值，光功率异常时及时上报告警。',
    ],
    lessonId: 'm11-l01',
  },
  {
    id: 'tshoot-7',
    title: '三层交换 VLAN 间互访不通 SVI down',
    level: '熟悉',
    summary: '同交换机 VLAN 10 正常，VLAN 20 终端无法访问其它网段。',
    symptom:
      '三层交换机 SW1 上 VLAN 10 与 VLAN 20 已配置 SVI 作为终端网关，VLAN 10 终端可正常访问其它网段，VLAN 20 终端连自己的网关都 ping 不通，VLAN 间通信失败。',
    evidence: [
      {
        title: 'SW1 display ip interface brief',
        text: [
          'Interface              IP Address/Mask      Physical   Protocol',
          'Vlanif10               192.168.10.1/24      up         up',
          'Vlanif20               192.168.20.1/24      up         down',
          'GigabitEthernet0/0/1   10.0.0.1/30          up         up',
        ].join('\n'),
      },
      {
        title: 'SW1 display vlan 20',
        text: [
          'The total number of vlans is : 2',
          'U: Up;         D: Down;         TG: Tagged;         UT: Untagged;',
          'VID  Type    Ports',
          '20   common  UT:Eth0/0/2(D)',
        ].join('\n'),
      },
      {
        title: 'SW1 display port vlan Ethernet0/0/2',
        text: [
          'Port                    Link Type    PVID   Trunk VLAN List',
          'Ethernet0/0/2           access       1      -',
        ].join('\n'),
      },
    ],
    rootCauses: [
      { id: 'svi-down', text: 'VLAN 20 没有 up 的物理成员口，导致 Vlanif20 协议 down，无法转发' },
      { id: 'no-route', text: '交换机未开启 VLAN 间路由，缺少到达 VLAN 20 的路由' },
      { id: 'gateway-wrong', text: 'VLAN 20 终端的网关地址配置错误' },
      { id: 'acl-deny', text: 'ACL 拦截了 VLAN 10 与 VLAN 20 之间的流量' },
    ],
    answer: 'svi-down',
    repairs: [
      { id: 'add-port-vlan', text: '将接入口 Ethernet0/0/2 划入 VLAN 20', command: 'interface Ethernet0/0/2\n port link-type access\n port default vlan 20' },
      { id: 'verify-svi', text: '查看接口状态确认 Vlanif20 的 Protocol 变为 up', command: 'display ip interface brief' },
      { id: 'retest', text: '让 VLAN 20 终端 ping 网关与 VLAN 10 终端复测' },
      { id: 'add-static-route', text: '在 SW1 上配置到 192.168.20.0 的静态路由' },
      { id: 'change-gateway', text: '把 VLAN 20 终端网关改为 192.168.10.1' },
      { id: 'permit-acl', text: '在 Vlanif20 上配置 ACL 允许所有流量' },
    ],
    correctRepairs: ['add-port-vlan', 'verify-svi', 'retest'],
    explanation:
      'display ip interface brief 显示 Vlanif20 的 Protocol 为 down。三层 VLAN 接口（Vlanif）的 line protocol 依赖于对应 VLAN 内是否存在 up 的物理端口。display vlan 20 显示成员端口 Eth0/0/2 状态为 D（down），且 display port vlan 显示该口 PVID 仍为 1，说明接入口没有正确划入 VLAN 20，VLAN 20 内没有 up 成员，Vlanif20 协议 down，自然无法转发 VLAN 20 的流量。将接入口划入 VLAN 20 并使其 up 后，Vlanif20 协议恢复 up，VLAN 间互通。',
    hint: 'Vlanif 的 Protocol down，先看对应 VLAN 内有没有 up 的物理成员口。',
    triageSteps: [
      '执行 display ip interface brief，发现 Vlanif20 的 Protocol 为 down，而 Vlanif10 正常 up/up。',
      '执行 display vlan 20，查看 VLAN 20 的成员端口及状态，发现成员口 Eth0/0/2 状态为 D（down）。',
      '执行 display port vlan Ethernet0/0/2，确认接入口 PVID 为 1，未划入 VLAN 20。',
      '在接入口配置 port link-type access 与 port default vlan 20，将端口划入 VLAN 20。',
      'display ip interface brief 确认 Vlanif20 Protocol 变为 up，终端 ping 网关与跨 VLAN 复测。',
    ],
    rootCauseAnalysis:
      '三层交换机的 Vlanif 接口是逻辑三层接口，其 line protocol 状态取决于所属 VLAN 内是否有处于 up 状态的物理成员端口。当 VLAN 内没有任何 up 的物理口时，Vlanif 协议层 down，设备不会在该 VLAN 收发三层流量，终端连网关都无法 ping 通。本例中接入口 Ethernet0/0/2 的 PVID 仍为默认 VLAN 1，没有划入 VLAN 20，导致 VLAN 20 无 up 成员，Vlanif20 协议 down，VLAN 间路由失效。这与是否开启三层路由、ACL 或终端网关配置无关。',
    solution:
      '将接入口划入 VLAN 20 并确保物理链路 up：interface Ethernet0/0/2 → port link-type access → port default vlan 20。端口 up 后 VLAN 20 拥有 up 成员，Vlanif20 的 line protocol 立即变为 up，VLAN 间路由自动生效，VLAN 20 终端可访问网关及其它网段。',
    prevention: [
      '新增业务 VLAN 时，必须同步将接入口划入对应 VLAN，并 display vlan 确认成员口状态为 U（up）。',
      'VLAN 间业务开通后，display ip interface brief 巡检所有 Vlanif 的 Physical 与 Protocol 必须为 up。',
      '建立「VLAN - 接入口 - Vlanif」关联表，避免只建 VLAN 和 SVI 却漏配接入口。',
    ],
    lessonId: 'm13-l06',
  },
  {
    id: 'tshoot-8',
    title: '终端无法通过 DHCP 获取地址',
    level: '熟悉',
    summary: '交换机已配地址池，终端却始终拿不到 IP，显示 APIPA 地址。',
    symptom:
      '三层交换机 SW1 作为 DHCP 服务器，已配置全局地址池 192.168.30.0/24 并在 Vlanif30 配置网关。VLAN 30 下的终端开机后无法获取 IP，自动显示 169.254.x.x 地址。',
    evidence: [
      {
        title: 'SW1 display current-configuration interface Vlanif30',
        text: [
          'interface Vlanif30',
          ' ip address 192.168.30.1 255.255.255.0',
          '#',
        ].join('\n'),
      },
      {
        title: 'SW1 display ip pool',
        text: [
          'Pool-name      : pool30',
          'Pool-No        : 0',
          'Lease          : 1 Days 0 Hours 0 Minutes',
          'Domain-name    : -',
          'DNS-server-0   : 8.8.8.8',
          'Option-0       : -',
          'NBNS-server-0  : -',
          'Netbios-type   : -',
          'Position       : Local           Status           : Unlocked',
          'Gateway-0      : 192.168.30.1',
          'Mask           : 255.255.255.0',
          'VPN instance   : --',
          'Network segment: 192.168.30.0      mask: 255.255.255.0',
          'Conflicted address: 0  Expired address: 0   Total: 253  Used: 0  Idle: 253',
        ].join('\n'),
      },
      {
        title: 'SW1 display dhcp server statistics',
        text: [
          'DHCP server statistics:',
          '  Received packets: 47',
          '  Sent packets: 0',
          '  Offer: 0     Ack: 0     Nak: 0     Decline: 0',
        ].join('\n'),
      },
    ],
    rootCauses: [
      { id: 'no-dhcp-select', text: 'Vlanif30 接口未配置 dhcp select global，不处理 DHCP 请求' },
      { id: 'pool-exhausted', text: 'DHCP 地址池已耗尽，没有空闲地址可分配' },
      { id: 'gateway-wrong', text: '终端静态配置了错误的网关地址' },
      { id: 'stp-block', text: '接入端口被 STP 阻塞，DHCP 报文无法到达' },
    ],
    answer: 'no-dhcp-select',
    repairs: [
      { id: 'enable-dhcp', text: '在 Vlanif30 下使能 DHCP 选择全局地址池', command: 'interface Vlanif30\n dhcp select global' },
      { id: 'verify-stats', text: '查看 DHCP 统计确认已发送 Offer 与 Ack', command: 'display dhcp server statistics' },
      { id: 'renew', text: '在终端执行 ipconfig /release 与 /renew 重新获取地址' },
      { id: 'expand-pool', text: '缩短掩码扩大地址池范围为 /16' },
      { id: 'config-route', text: '在 SW1 上配置默认路由' },
      { id: 'force-static', text: '给终端手工配置静态 IP 地址' },
    ],
    correctRepairs: ['enable-dhcp', 'verify-stats', 'renew'],
    explanation:
      'VRP 中设备作为 DHCP 服务器时，必须在接口视图下配置 dhcp select global（使用全局地址池）或 dhcp select interface（使用接口地址池），设备才会处理该接口收到的 DHCP 报文。本例 Vlanif30 配置缺这一命令，display dhcp server statistics 显示收到 47 个包但 Sent 为 0、Offer 为 0，说明请求到达设备但未被服务器处理。地址池 display ip pool 显示 Idle 253 未耗尽，排除地址池问题。补配 dhcp select global 后即可正常分配。',
    hint: 'DHCP 请求到达但不分配，先看接口下有没有 dhcp select 命令。',
    triageSteps: [
      '在终端确认获取到 169.254.x.x 的 APIPA 地址，说明 DHCP 失败。',
      '在 SW1 上 display current-configuration interface Vlanif30，确认接口仅配了 IP，缺少 dhcp select global。',
      'display ip pool 确认地址池 pool30 存在且有空闲地址（Idle 253），排除地址池耗尽。',
      'display dhcp server statistics 显示 Received 有值但 Offer 与 Ack 为 0，确认请求未被处理。',
      '在 Vlanif30 下配置 dhcp select global，终端 release/renew，display dhcp server statistics 确认分配成功。',
    ],
    rootCauseAnalysis:
      '华为 VRP 的 DHCP 服务器功能分两级：全局/接口地址池定义了可分配的地址范围，但设备是否在某个三层接口上提供 DHCP 服务，取决于该接口下是否配置了 dhcp select 命令。未配置时，设备收到 DHCP 广播报文后不会交由 DHCP 服务器模块处理，直接丢弃，因此终端发了 Discover 却收不到 Offer，超时后使用 APIPA 地址。display dhcp server statistics 的 Received 计数来自底层收包，而 Offer 为 0 正是服务器未使能的铁证。',
    solution:
      '在网关接口 Vlanif30 下使能 DHCP 并选择全局地址池：interface Vlanif30 → dhcp select global。若地址池为接口地址池则用 dhcp select interface。配置后设备开始处理 VLAN 30 的 DHCP 请求，终端重新获取即可得到 192.168.30.0/24 网段地址。',
    prevention: [
      '部署 DHCP 时必须同时完成地址池配置与接口下 dhcp select 使能，二者缺一不可。',
      '开通后用 display dhcp server statistics 确认 Offer 与 Ack 计数增长，验证分配链路。',
      '对跨三层的 DHCP 场景，在用户网关接口配置 dhcp select relay 与 dhcp relay server-ip，注意中继场景不要漏配。',
    ],
    lessonId: 'm12-l03',
  },
  {
    id: 'tshoot-9',
    title: '接入端口被 STP 置为 error-down 引发震荡',
    level: '熟悉',
    summary: '终端频繁断网，接入端口反复进入 error-down，拓扑变化计数飙升。',
    symptom:
      '接入交换机 SW2 上连接终端的 GigabitEthernet0/0/3 端口反复 up/down，终端间歇性断网。全局已开启 stp bpdu-protection，但接入口未配置边缘端口，端口收到 BPDU 后被置为 error-down，同时 STP 拓扑变化计数持续增长。',
    evidence: [
      {
        title: 'SW2 display interface GigabitEthernet0/0/3',
        text: [
          'GigabitEthernet0/0/3 current state : ERROR DOWN(Link-flap)',
          'Line protocol current state : DOWN',
          'Description: link-to-PC',
          'The Maximum Frame Length is 9216',
          'Last physical up time   : 2026-11-19 14:02:11',
          'Last physical down time : 2026-11-19 14:05:33',
        ].join('\n'),
      },
      {
        title: 'SW2 display stp topology-change',
        text: [
          'CIST topology change information',
          '  Number of topology changes             : 138',
          '  Time since last topology change        : 0 days 0h:1m:22s',
          '  Topology change initiator: GigabitEthernet0/0/3',
          '  Topology change last recv. from: 00e0-fc99-8877',
        ].join('\n'),
      },
      {
        title: 'SW2 display stp brief',
        text: [
          'MSTID  Port                        Role  STP State     Protection',
          '  0    GigabitEthernet0/0/3         DESI  DISCARDING    BPDU',
        ].join('\n'),
      },
    ],
    rootCauses: [
      { id: 'no-edged-port', text: '接入口未配置 stp edged-port enable，开启 bpdu-protection 后收到 BPDU 即 error-down' },
      { id: 'loop', text: '网络中存在二层环路导致广播风暴' },
      { id: 'router-id-conflict', text: '交换机桥优先级配置冲突' },
      { id: 'vlan-mismatch', text: '两端端口 VLAN 配置不一致' },
    ],
    answer: 'no-edged-port',
    repairs: [
      { id: 'set-edged', text: '在接入口配置边缘端口，使其不参与 STP 计算', command: 'interface GigabitEthernet0/0/3\n stp edged-port enable' },
      { id: 'auto-recover', text: '配置 error-down 自动恢复，避免端口长期卡死', command: 'error-down auto-recovery cause bpdu-protection interval 30' },
      { id: 'verify-stable', text: '查看端口与拓扑变化，确认不再震荡', command: 'display interface GigabitEthernet0/0/3\ndisplay stp topology-change' },
      { id: 'disable-stp', text: '全局 undo stp 关闭生成树协议' },
      { id: 'change-priority', text: '把 SW2 的桥优先级改为 0' },
      { id: 'to-trunk', text: '把接入口改为 Trunk 口并放通所有 VLAN' },
    ],
    correctRepairs: ['set-edged', 'auto-recover', 'verify-stable'],
    explanation:
      'display interface 显示端口处于 ERROR DOWN(Link-flap)，display stp brief 显示该端口 Protection 为 BPDU，display stp topology-change 显示拓扑变化由该端口发起且计数达 138。接入口下挂终端不应收到 BPDU，一旦收到说明有人私接交换机或链路异常；由于该口未配 edged-port，全局 bpdu-protection 将其 error-down，端口反复 up/down 触发 TC 报文泛洪，引发全网震荡。配置边缘端口后接入口不再参与 STP，收到 BPDU 也不会被置 down（或仅丢弃），同时配置 error-down 自动恢复缩短中断时间。',
    hint: '接入口 error-down 且 Protection 为 BPDU，十有八九是没配边缘端口。',
    triageSteps: [
      '执行 display interface GigabitEthernet0/0/3，确认端口状态为 ERROR DOWN(Link-flap)。',
      '执行 display stp brief，确认该端口 Protection 列显示 BPDU。',
      '执行 display stp topology-change，发现拓扑变化计数高且发起端口为该接入口。',
      '进入接口视图配置 stp edged-port enable，将接入口设为边缘端口。',
      '配置 error-down auto-recovery cause bpdu-protection interval 30 使端口自动恢复，复测确认稳定。',
    ],
    rootCauseAnalysis:
      '接入层端口下挂的是终端，正常不会产生 BPDU。华为交换机全局开启 stp bpdu-protection 后，若非边缘端口收到 BPDU，会将端口置为 error-down 以防止私接交换机引入环路或拓扑变化。本例接入口未配置 stp edged-port enable，被当作普通 STP 端口，一旦收到 BPDU（用户私接小交换机或环路）就被 error-down，随后自动恢复又再次 down，形成 flap，每一次 up/down 都触发 TC 报文，导致全网 MAC 地址表与 ARP 表频繁刷新，表现为大面积间歇性断网。',
    solution:
      '将所有下挂终端的接入口配置为边缘端口：interface GigabitEthernet0/0/3 → stp edged-port enable。边缘端口不参与 STP 拓扑计算，也不会因收到 BPDU 而 error-down（配合 bpdu-protection 时若需严格保护可保留保护，但常规接入推荐 edged-port）。同时全局配置 error-down auto-recovery cause bpdu-protection interval 30，使偶发 error-down 端口能自动恢复，缩短业务中断。配置后 display stp topology-change 计数停止增长，网络稳定。',
    prevention: [
      '接入层所有下挂终端的端口必须统一配置 stp edged-port enable，纳入配置基线。',
      '全局开启 bpdu-protection 的同时，配置 error-down auto-recovery cause bpdu-protection interval 合理值，避免端口长期卡死。',
      '日常巡检 display stp topology-change，拓扑变化计数异常增长时立即排查接入端口。',
    ],
    lessonId: 'm12-l04',
  },
  {
    id: 'tshoot-10',
    title: '静态路由不生效下一跳不可达',
    level: '熟悉',
    summary: '配了默认静态路由，路由表里却没有，外网访问全部失败。',
    symptom:
      '出口路由器 R1 配置了默认静态路由指向对端 10.0.12.2，但内网用户无法访问外网。display ip routing-table 中没有默认路由，也没有到达 10.0.12.0/24 的路由。',
    evidence: [
      {
        title: 'R1 display current-configuration | include ip route-static',
        text: 'ip route-static 0.0.0.0 0.0.0.0 10.0.12.2',
      },
      {
        title: 'R1 display ip interface brief',
        text: [
          'Interface              IP Address/Mask      Physical   Protocol',
          'GigabitEthernet0/0/0   192.168.12.1/24      up         up',
          'GigabitEthernet0/0/1   192.168.1.1/24       up         up',
        ].join('\n'),
      },
      {
        title: 'R1 display ip routing-table',
        text: [
          'Route Flags: R - relay, D - download to fib',
          '---------------------------------------------------------------------',
          'Destination/Mask   Proto   Pre  Cost    Flags  NextHop    Interface',
          '192.168.1.0/24     Direct  0    0       D      192.168.1.1  GE0/0/1',
          '192.168.12.0/24    Direct  0    0       D      192.168.12.1 GE0/0/0',
        ].join('\n'),
      },
    ],
    rootCauses: [
      { id: 'next-hop-unreachable', text: '静态路由下一跳 10.0.12.2 三层不可达，路由未被激活加入路由表' },
      { id: 'pref-wrong', text: '静态路由优先级 preference 配置错误' },
      { id: 'acl-deny', text: 'ACL 拒绝了转发的外网流量' },
      { id: 'if-down', text: '出接口 GigabitEthernet0/0/0 被 shutdown' },
    ],
    answer: 'next-hop-unreachable',
    repairs: [
      { id: 'fix-nexthop', text: '把默认路由下一跳修正为直连可达的 192.168.12.2', command: 'undo ip route-static 0.0.0.0 0.0.0.0 10.0.12.2\nip route-static 0.0.0.0 0.0.0.0 192.168.12.2' },
      { id: 'verify-route', text: '查看路由表确认默认路由已出现并下发 FIB', command: 'display ip routing-table' },
      { id: 'ping-public', text: '从内网 ping 公网地址复测连通性' },
      { id: 'change-pref', text: '把静态路由优先级 preference 改为 60' },
      { id: 'permit-acl', text: '在出接口配置 ACL 允许所有流量通过' },
      { id: 'reboot', text: '重启路由器让静态路由生效' },
    ],
    correctRepairs: ['fix-nexthop', 'verify-route', 'ping-public'],
    explanation:
      'VRP 中静态路由只有在下一跳可达时才会被激活并写入路由表。R1 的互联口地址是 192.168.12.1/24，对端应为 192.168.12.2，但静态路由却写成了下一跳 10.0.12.2。display ip routing-table 显示不存在 10.0.12.0/24 网段路由，下一跳 10.0.12.2 递归不可达，因此该静态路由未被激活，路由表中没有默认路由，内网无外网路由导致访问失败。将下一跳修正为直连可达的 192.168.12.2 后路由立即生效。',
    hint: '配置了静态路由但路由表里没有，先 ping 一下下一跳，看是否可达。',
    triageSteps: [
      '执行 display current-configuration | include ip route-static，查看已配置的静态路由。',
      '执行 display ip routing-table，确认默认路由 0.0.0.0/0 未出现在表中。',
      '执行 display ip interface brief，确认本端互联口地址为 192.168.12.1/24。',
      'ping 10.0.12.2 与 192.168.12.2，前者不通后者通，确认下一跳写错。',
      '修正默认路由下一跳为 192.168.12.2，display ip routing-table 确认默认路由出现，内网 ping 公网复测。',
    ],
    rootCauseAnalysis:
      '静态路由是典型的递归路由：设备需要先在路由表中查找下一跳地址的可达路由，若下一跳不可达（无对应路由且非直连），则该静态路由不会被激活，也不会下发到 FIB。本例中 R1 与对端直连网段为 192.168.12.0/24，对端地址应为 192.168.12.2，但管理员误配置为 10.0.12.2，而路由表中不存在到 10.0.12.0/24 的任何路由，下一跳不可达，静态路由处于未激活状态，表现为「配了路由却不生效」。这与优先级、ACL、接口状态无关。',
    solution:
      '删除错误的静态路由并按可达下一跳重新配置：undo ip route-static 0.0.0.0 0.0.0.0 10.0.12.2 → ip route-static 0.0.0.0 0.0.0.0 192.168.12.2。配置后 display ip routing-table 可见 0.0.0.0/0 静态路由且 Flags 含 D（已下发 FIB），内网流量按默认路由转发到对端，外网访问恢复。',
    prevention: [
      '配置静态路由前必须确认下一跳地址真实可达，优先使用直连下一跳，配置后 display ip routing-table 验证路由存在。',
      '建立路由配置复核流程，对下一跳地址与互联网段做交叉校验。',
      '对下一跳可能震荡的场景，可使用 BFD 与静态路由联动（ip route-static ... track bfd-session），快速感知下一跳不可达。',
    ],
    lessonId: 'm12-l01',
  },
  {
    id: 'tshoot-11',
    title: 'NAT 转换失败内网无法上外网',
    level: '精通',
    summary: '内网能 ping 通网关，但访问公网全部超时，NAT 无会话。',
    symptom:
      '出口路由器 R1 配置了默认路由与 ACL 2000 匹配内网网段，内网用户能 ping 通网关 192.168.1.1，但访问公网 8.8.8.8 全部超时。display nat session all 显示没有任何转换会话。',
    evidence: [
      {
        title: 'R1 display current-configuration interface GigabitEthernet0/0/0',
        text: [
          'interface GigabitEthernet0/0/0',
          ' description to-Internet',
          ' ip address 202.100.1.10 255.255.255.0',
          '#',
        ].join('\n'),
      },
      {
        title: 'R1 display acl 2000',
        text: [
          'Basic ACL 2000, 1 rule',
          "rule 5 permit source 192.168.1.0 0.0.0.255",
        ].join('\n'),
      },
      {
        title: 'R1 display nat session all',
        text: [
          'NAT Session Table Information:',
          '  There is no NAT session.',
        ].join('\n'),
      },
    ],
    rootCauses: [
      { id: 'no-nat-outbound', text: '出接口未绑定 nat outbound，内网报文不做源地址转换' },
      { id: 'no-default-route', text: '缺少指向公网的默认路由' },
      { id: 'acl-wrong', text: 'ACL 2000 没有匹配内网网段' },
      { id: 'dns-fail', text: '终端 DNS 解析失败导致无法访问' },
    ],
    answer: 'no-nat-outbound',
    repairs: [
      { id: 'bind-nat', text: '在出接口绑定 nat outbound 关联 ACL 2000', command: 'interface GigabitEthernet0/0/0\n nat outbound 2000' },
      { id: 'verify-session', text: '查看 NAT 会话表确认转换会话已建立', command: 'display nat session all' },
      { id: 'ping-public', text: '从内网 ping 8.8.8.8 复测公网连通性' },
      { id: 'nat-server', text: '在出接口配置 nat server 做端口映射' },
      { id: 'add-route', text: '再配置一条默认路由指公网' },
      { id: 'change-dns', text: '把终端 DNS 改为 8.8.8.8' },
    ],
    correctRepairs: ['bind-nat', 'verify-session', 'ping-public'],
    explanation:
      '内网访问公网需要源 NAT 转换（Easy-IP 或地址池）。VRP 中必须在出接口下配置 nat outbound 并关联匹配内网的 ACL，设备才会对命中的流量做源地址转换。本例出接口配置中没有 nat outbound 命令，display nat session all 为空，说明报文未经过 NAT 转换直接发出，公网回程报文找不到私有地址路由而丢弃。ACL 2000 已正确匹配内网、默认路由已存在（能 ping 网关且故障定位到 NAT），补配 nat outbound 后转换生效。',
    hint: '能 ping 网关但上不了公网、NAT 会话表为空，先看出接口有没有 nat outbound。',
    triageSteps: [
      '确认内网终端能 ping 通网关，排除内网与默认路由问题。',
      '执行 display current-configuration interface GigabitEthernet0/0/0，确认出接口缺少 nat outbound 命令。',
      '执行 display acl 2000，确认 ACL 已正确匹配内网 192.168.1.0/24。',
      '执行 display nat session all，确认无任何 NAT 会话。',
      '在出接口下配置 nat outbound 2000，内网 ping 8.8.8.8，display nat session all 确认会话建立。',
    ],
    rootCauseAnalysis:
      '源 NAT 是内网访问公网的必要环节：内网终端使用私有地址（192.168.1.0/24），公网无法路由回私有地址，必须在出口设备上将源地址转换为公网地址。VRP 的 Easy-IP NAT 通过在出接口配置 nat outbound <acl> 实现：匹配 ACL 的流量在出接口做源地址转换为接口公网地址。缺少 nat outbound 绑定时，设备不进行任何转换，报文以私有源地址发出，公网侧回程不可达，表现为「能 ping 网关但 ping 不通公网」。display nat session all 为空是直接证据——正常情况下内网访问公网会产生 NAT 会话。',
    solution:
      '在连接公网的出接口下绑定 NAT：interface GigabitEthernet0/0/0 → nat outbound 2000。该命令将匹配 ACL 2000（内网 192.168.1.0/24）的流量在出接口做源地址转换为接口地址 202.100.1.10（Easy-IP）。配置后内网访问公网时 display nat session all 可见转换会话，回程报文被正确还原，公网访问恢复。',
    prevention: [
      '出口 NAT 配置必须三要素齐全：匹配内网的 ACL、出接口下 nat outbound 绑定、可达的默认路由，缺一不可。',
      '变更后用 display nat session all 与 display nat outbound 验证转换生效，并从内网实测公网访问。',
      '对 NAT 故障，先分层定位：ping 网关（内网）→ ping 公网下一跳（路由）→ 查 NAT 会话（转换）→ 查应用（DNS/端口）。',
    ],
    lessonId: 'm13-l07',
  },
  {
    id: 'tshoot-12',
    title: '二层环路引发广播风暴导致 CPU 飙高',
    level: '精通',
    summary: '交换机 CPU 持续 95% 以上，全网卡顿，MAC 地址频繁漂移。',
    symptom:
      '核心交换机 SW1 突然响应缓慢，远程登录卡顿，display cpu-usage 显示 CPU 占用 95% 以上。接入侧多个端口入方向包率极高，display mac-address flapping 记录到 MAC 地址在多个端口间反复漂移。',
    evidence: [
      {
        title: 'SW1 display cpu-usage',
        text: [
          'CPU utilization for five seconds: 96%: one minute: 94%: five minutes: 92%',
          'Max CPU Usage is 99%',
        ].join('\n'),
      },
      {
        title: 'SW1 display interface GigabitEthernet0/0/2 | include rate',
        text: [
          'Input:  1488000 packets, 95232000 bytes',
          '  30 seconds input rate: 980000 bits/sec, 12000 packets/sec',
          'Output: 32000 packets, 2048000 bytes',
          '  30 seconds output rate: 0 bits/sec, 0 packets/sec',
        ].join('\n'),
      },
      {
        title: 'SW1 display mac-address flapping',
        text: [
          'S  : start time    E  : end time    (D) : error down',
          '------------------------------------------------------------------',
          'MAC Address    VLAN  Original-Port        Move-To            Move-Time',
          '00e0-fc11-2233 10    GE0/0/2              GE0/0/3            2026-11-19 15:01:12',
          '00e0-fc11-2233 10    GE0/0/3              GE0/0/2            2026-11-19 15:01:13',
          '00e0-fc44-5566 20    GE0/0/4              GE0/0/5            2026-11-19 15:01:15',
        ].join('\n'),
      },
    ],
    rootCauses: [
      { id: 'l2-loop', text: '网络中存在二层环路，广播风暴与 MAC 漂移占满交换机 CPU' },
      { id: 'hardware-fault', text: '交换机硬件故障导致处理能力下降' },
      { id: 'config-large', text: '配置文件过大导致设备处理慢' },
      { id: 'high-temp', text: '设备温度过高触发降频' },
    ],
    answer: 'l2-loop',
    repairs: [
      { id: 'break-loop', text: '排查并破除冗余环路（关闭成环端口或启用 STP）', command: 'display stp brief\nshutdown 冗余链路端口' },
      { id: 'verify-cpu', text: '查看 CPU 占用确认下降到正常范围', command: 'display cpu-usage' },
      { id: 'verify-mac', text: '查看 MAC 漂移记录确认不再产生新漂移', command: 'display mac-address flapping' },
      { id: 'reboot', text: '重启核心交换机释放 CPU' },
      { id: 'upgrade', text: '升级交换机软件版本' },
      { id: 'increase-memory', text: '清理配置文件减小占用' },
    ],
    correctRepairs: ['break-loop', 'verify-cpu', 'verify-mac'],
    explanation:
      'display cpu-usage 显示 CPU 高达 96%，display interface 显示接入端口入方向包率异常高（广播风暴特征），display mac-address flapping 显示同一 MAC 在 GE0/0/2 与 GE0/0/3 之间反复漂移——这是典型二层环路。环路导致广播帧在环路中无限复制泛洪，占满带宽与交换机转发资源，CPU 忙于处理海量广播与 MAC 漂移而飙升，全网业务卡顿。破除环路（关闭冗余口或确保 STP 阻塞）后，广播流量与 MAC 漂移立即停止，CPU 恢复正常。',
    hint: 'CPU 飙高 + 端口入包率异常 + MAC 漂移，先怀疑二层环路。',
    triageSteps: [
      '执行 display cpu-usage，确认 CPU 占用持续 90% 以上。',
      '执行 display interface 对比各端口入方向包率，定位哪些端口流量异常。',
      '执行 display mac-address flapping，确认存在 MAC 地址在端口间反复漂移。',
      '结合 display stp brief 与拓扑，找到成环的冗余链路，临时 shutdown 其中一端口破除环路。',
      '观察 display cpu-usage 下降、display mac-address flapping 不再新增，再修复根因（启用 STP 或修正拓扑）。',
    ],
    rootCauseAnalysis:
      '二层网络中若存在物理环路且生成树未正确阻塞冗余端口，广播帧会在环路中无限循环复制，形成广播风暴。同时单播帧的源 MAC 会在环路两端口被反复学习，表现为 MAC 地址漂移（flapping）。交换机需在 CPU 上处理大量广播、未知单播泛洪以及 MAC 表频繁刷新，导致 CPU 占用飙升、业务转发时延增大甚至丢包。display mac-address flapping 记录的 MAC 在端口间秒级来回移动，是二层环路最直接的证据；display interface 的入方向包率远超正常水平印证了广播风暴。',
    solution:
      '立即破除环路：通过 display stp brief 与拓扑确认冗余链路，临时 shutdown 成环端口中的一个，广播风暴即刻停止。根本解决应确保全网启用 STP 或 RSTP/MSTP，并将接入口设为边缘端口，让生成树正确阻塞冗余链路。环路破除后 display cpu-usage 迅速下降到正常范围（通常 30% 以下），display mac-address flapping 不再产生新记录，业务恢复正常。',
    prevention: [
      '二层网络必须启用生成树协议（STP/RSTP/MSTP），并保证核心桥优先级等参数规划正确，避免冗余链路成环。',
      '接入端口统一配置 stp edged-port enable，防止终端侧引入环路与拓扑震荡。',
      '配置 MAC 漂移检测告警（mac-address flapping detection），CPU 占用与端口流量纳入监控阈值告警。',
    ],
    lessonId: 'm12-l04',
  },
  {
    id: 'tshoot-13',
    title: '管理员登录被拒本地用户被锁定',
    level: '熟悉',
    summary: 'SSH/Telnet 登录提示认证失败，用户状态显示为 block。',
    symptom:
      '管理员通过 SSH 登录交换机 SW1 时提示认证失败（Authentication fail），多次重试仍被拒。display aaa local-user 显示对应用户状态为 block。',
    evidence: [
      {
        title: 'SW1 display current-configuration user-interface vty 0 4',
        text: [
          'user-interface vty 0 4',
          ' authentication-mode aaa',
          ' protocol inbound ssh',
        ].join('\n'),
      },
      {
        title: 'SW1 display aaa local-user',
        text: [
          'Username             State    AuthType  AccessLimit  Priority',
          'admin                active   local     5            15',
          'netops               block    local     2            3',
        ].join('\n'),
      },
      {
        title: 'SW1 display ssh server status',
        text: [
          'SSH version: 2.0',
          'SSH server status: enabled',
          'Timeout(in minute): 5',
          'SSH server source address: 0.0.0.0',
        ].join('\n'),
      },
    ],
    rootCauses: [
      { id: 'user-blocked', text: '本地用户 netops 因密码错误次数超限被系统锁定（state block）' },
      { id: 'ssh-disabled', text: '设备未使能 SSH 服务' },
      { id: 'no-service-type', text: '本地用户未配置 service-type ssh' },
      { id: 'priv-low', text: '用户优先级 level 不足 15' },
    ],
    answer: 'user-blocked',
    repairs: [
      { id: 'unlock-user', text: '在 AAA 视图下将锁定用户激活解锁', command: 'aaa\n local-user netops state active' },
      { id: 'verify-state', text: '查看本地用户状态确认已变为 active', command: 'display aaa local-user' },
      { id: 'relogin', text: '使用正确密码重新 SSH 登录验证' },
      { id: 'delete-user', text: '删除 netops 用户后重新创建' },
      { id: 'close-auth', text: '将 vty 认证模式改为 password 跳过 AAA' },
      { id: 'raise-priv', text: '把 netops 的 level 提升到 15' },
    ],
    correctRepairs: ['unlock-user', 'verify-state', 'relogin'],
    explanation:
      'display aaa local-user 显示 netops 状态为 block，说明该用户被锁定。华为 VRP 默认配置了本地用户密码错误重试次数限制（local-aaa-user wrong-password），连续输错密码达到阈值后用户会被锁定一段时间，期间任何登录都被拒绝，即使后续输入正确密码也不行。vty 已配置 authentication-mode aaa、protocol inbound ssh，SSH 服务已使能，这些均正常。在 AAA 视图下执行 local-user netops state active 即可解锁，或等待锁定时间到期。',
    hint: '登录认证失败先 display aaa local-user 看用户是不是 block 状态。',
    triageSteps: [
      '确认登录现象为认证失败，且使用的是正确的用户名密码。',
      '执行 display current-configuration user-interface vty，确认 vty 已配置 aaa 认证与 ssh 协议。',
      '执行 display ssh server status，确认 SSH 服务已使能。',
      '执行 display aaa local-user，发现对应用户状态为 block。',
      '进入 AAA 视图执行 local-user netops state active 解锁，display aaa local-user 确认 active，重新登录验证。',
    ],
    rootCauseAnalysis:
      'VRP 的 AAA 本地认证默认开启密码错误锁定保护（local-aaa-user wrong-password retry-interval retry-time block-time），当某个本地用户在指定时间窗口内连续输错密码达到上限，系统会将该用户状态置为 block 并锁定一段时间，防止暴力破解。锁定期间该用户的登录请求被直接拒绝，与密码是否正确无关。display aaa local-user 的 State 列显示 block 是直接证据。若未配置该保护，则不会出现 block 状态，此时应排查密码、service-type、vty 配置等其它原因。',
    solution:
      '在 AAA 视图下激活被锁定用户：aaa → local-user netops state active。解锁后用户立即恢复 active 状态，可用正确密码登录。若需调整锁定策略，可配置 local-aaa-user wrong-password retry-interval 5 retry-time 3 block-time 5，或对管理员用户适当放宽。解锁后 display aaa local-user 确认 State 为 active，重新 SSH 登录成功。',
    prevention: [
      '登录失败先 display aaa local-user 排查用户是否被锁定，避免反复尝试加剧锁定。',
      '合理配置 local-aaa-user wrong-password 参数，兼顾安全与运维便利性，管理员账号可单独评估策略。',
      '为高权限账号配置双因素认证，并保留至少一个应急账号，避免所有账号被锁无法登录。',
    ],
    lessonId: 'm14-l02',
  },
  {
    id: 'tshoot-14',
    title: 'Eth-Trunk 成员口不选中聚合带宽不足',
    level: '熟悉',
    summary: '配置了两成员链路聚合，只有一个成员选中，冗余与带宽失效。',
    symptom:
      'SW1 与 SW2 之间配置 Eth-Trunk 1，包含两个成员口 GigabitEthernet0/0/1 与 GigabitEthernet0/0/2。display eth-trunk 1 显示只有一个成员口为 Select 状态，另一个为 Unselect，聚合带宽未达到预期，且链路无冗余。',
    evidence: [
      {
        title: 'SW1 display eth-trunk 1',
        text: [
          'Eth-Trunk1\'s state information is:',
          'WorkingMode: NORMAL           Hash arithmetic: According to SIP-XOR-DIP',
          'Least Active-linknumber: 1    Max Bandwidth-affected-linknumber: 8',
          'Operate status: up            Number Of Up Ports In Trunk: 1',
          '--------------------------------------------------------------------------------',
          'PortName                      Status     Weight     Active',
          'GigabitEthernet0/0/1          Up         1          YES',
          'GigabitEthernet0/0/2          Up         1          NO',
        ].join('\n'),
      },
      {
        title: 'SW1 display current-configuration interface Eth-Trunk1',
        text: [
          'interface Eth-Trunk1',
          ' mode lacp-static',
          ' port link-type trunk',
          ' port trunk allow-pass vlan 10 20',
        ].join('\n'),
      },
      {
        title: 'SW2 display current-configuration interface Eth-Trunk1',
        text: [
          'interface Eth-Trunk1',
          ' mode manual load-balance',
          ' port link-type trunk',
          ' port trunk allow-pass vlan 10 20',
        ].join('\n'),
      },
    ],
    rootCauses: [
      { id: 'mode-mismatch', text: '两端 Eth-Trunk 模式不一致（一端 LACP 一端手工），导致成员不选中' },
      { id: 'member-shutdown', text: '成员口 GigabitEthernet0/0/2 被 shutdown' },
      { id: 'vlan-mismatch', text: '两端成员口允许的 VLAN 列表不一致' },
      { id: 'peer-notrunk', text: '对端设备未配置 Eth-Trunk 聚合' },
    ],
    answer: 'mode-mismatch',
    repairs: [
      { id: 'unify-mode', text: '将两端聚合模式统一（都改为 lacp-static 或都手工）', command: 'interface Eth-Trunk1\n mode lacp-static' },
      { id: 'verify-select', text: '查看 Eth-Trunk 确认两个成员都变为 Select', command: 'display eth-trunk 1' },
      { id: 'verify-throughput', text: '打流验证聚合带宽与冗余切换正常' },
      { id: 'add-member', text: '再增加一个成员口到 Eth-Trunk' },
      { id: 'change-vlan', text: '修改 Trunk 放通的 VLAN 列表' },
      { id: 'shutdown-bad', text: 'shutdown 不选中的成员口放弃冗余' },
    ],
    correctRepairs: ['unify-mode', 'verify-select', 'verify-throughput'],
    explanation:
      'display eth-trunk 1 显示 GE0/0/2 状态 Up 但 Active 为 NO（Unselect）。对比两端配置：SW1 的 Eth-Trunk1 模式为 lacp-static，SW2 为 manual load-balance，两端模式不一致。LACP 模式要求两端通过 LACP 协议协商选举活动链路，对端若为手工模式不发 LACPDU，本端无法协商成功，该成员口被置为 Unselect。两端物理都 Up、VLAN 放通一致，排除端口与 VLAN 问题。统一两端聚合模式后所有成员口均可选中。',
    hint: '成员口 Up 却不 Select，先对比两端 Eth-Trunk 的 mode 是否一致。',
    triageSteps: [
      '执行 display eth-trunk 1，确认成员口 Up 但 Active 为 NO（Unselect）。',
      '在两端分别 display current-configuration interface Eth-Trunk1，对比 mode 配置。',
      '发现 SW1 为 mode lacp-static，SW2 为 mode manual load-balance，模式不一致。',
      '将两端模式统一，例如都改为 lacp-static（或都改为手工模式）。',
      'display eth-trunk 1 确认两个成员均为 Select 且 Active YES，打流验证带宽与冗余。',
    ],
    rootCauseAnalysis:
      '链路聚合 Eth-Trunk 有两种模式：manual load-balance（手工负载分担）不依赖协议，只要成员口 Up 就都选中；lacp-static（静态 LACP）通过 LACP 协议协商选举活动成员链路，要求两端都运行 LACP 且参数匹配。当两端模式不一致时，LACP 端发送 LACPDU 而手工端不响应，LACP 协商失败，本端会将无法协商的成员口置为 Unselect，只保留一条链路转发，导致聚合带宽减半且失去冗余。成员口物理 Up 说明链路本身正常，问题在聚合控制平面。',
    solution:
      '统一两端 Eth-Trunk 模式：在模式不一致的一端修改 mode 与对端一致。例如将 SW2 改为 mode lacp-static：interface Eth-Trunk1 → mode lacp-static（或两端都改回 manual load-balance）。统一后 LACP 协商成功，display eth-trunk 1 显示两个成员口均为 Up 且 Active YES，聚合带宽恢复，冗余生效。',
    prevention: [
      '配置链路聚合时，两端的 mode（手工/LACP）必须保持一致，纳入配置基线核查。',
      '成员口属性（速率、双工、VLAN、优先级）也需两端对齐，display eth-trunk 巡检所有成员必须为 Select。',
      'LACP 模式建议配置 max active-linknumber 与 least active-linknumber，明确活动链路数与最小可用阈值。',
    ],
    lessonId: 'm12-l02',
  },
  {
    id: 'tshoot-15',
    title: 'NTP 时钟不同步设备时间偏差大',
    level: '了解',
    summary: '设备 display clock 与标准时间相差数小时，NTP 一直未同步。',
    symptom:
      '路由器 R1 配置了 NTP 服务器 10.0.0.1，但 display clock 显示的时间与标准时间相差较大。display ntp status 一直显示 clock unsynchronized，日志时间戳也不准确。',
    evidence: [
      {
        title: 'R1 display ntp status',
        text: [
          ' clock status: unsynchronized',
          ' clock stratum: 16',
          ' clock reference: 0.0.0.0',
          ' clock offset: 0.0000 ms',
          ' clock delay: 0.00 ms',
          ' clock disper: 0.00 ms',
        ].join('\n'),
      },
      {
        title: 'R1 display ntp sessions',
        text: [
          ' clock source: 10.0.0.1',
          ' reach: 0,   current operation: no data',
          ' delay: 0.000, offset: 0.0000, disper: 0.000',
        ].join('\n'),
      },
      {
        title: 'R1 测试 ping 10.0.0.1',
        text: [
          'PING 10.0.0.1: 56  data bytes, press CTRL_C to break',
          'Request time out',
          '--- 10.0.0.1 ping statistics ---',
          '5 packet(s) transmitted, 0 packet(s) received, 100.00% packet loss',
        ].join('\n'),
      },
    ],
    rootCauses: [
      { id: 'server-unreachable', text: '设备到 NTP 服务器 10.0.0.1 三层不可达，NTP 报文无法交互' },
      { id: 'version-mismatch', text: '设备与 NTP 服务器的 NTP 版本号不匹配' },
      { id: 'timezone-wrong', text: '设备时区配置错误导致显示时间偏差' },
      { id: 'no-clock', text: '设备未配置 clock datetime 基础时间' },
    ],
    answer: 'server-unreachable',
    repairs: [
      { id: 'fix-route', text: '修正路由或服务器地址，打通到 NTP 服务器的三层连通性', command: '排查路由后 ping 10.0.0.1 确认可达' },
      { id: 'verify-ntp', text: '查看 NTP 状态确认进入 synchronized', command: 'display ntp status\ndisplay ntp sessions' },
      { id: 'verify-clock', text: '查看设备时钟确认与标准时间一致', command: 'display clock' },
      { id: 'set-timezone', text: '把设备时区改为 clock timezone GMT+8' },
      { id: 'manual-clock', text: '手动 clock datetime 设定一个大概时间' },
      { id: 'change-version', text: '把 NTP 版本号改为 version 3' },
    ],
    correctRepairs: ['fix-route', 'verify-ntp', 'verify-clock'],
    explanation:
      'display ntp status 显示 clock status: unsynchronized、stratum 16（未同步的默认值），display ntp sessions 显示 reach: 0 且无数据，说明设备根本没有收到 NTP 服务器的响应。进一步 ping 10.0.0.1 100% 丢包，证实设备到 NTP 服务器三层不可达，NTP 报文（UDP 123）无法交互，自然无法同步。版本号与时区问题不会导致 reach 为 0；手动设时钟治标不治本。打通路由或修正服务器地址后 NTP 即可同步。',
    hint: 'NTP 不同步先 ping 服务器：reach 为 0 多半是三层不通。',
    triageSteps: [
      '执行 display ntp status，确认 clock status 为 unsynchronized，stratum 为 16。',
      '执行 display ntp sessions，确认 reach 为 0、无有效会话数据。',
      'ping NTP 服务器 10.0.0.1，发现 100% 丢包，确认三层不可达。',
      '排查路由（display ip routing-table）修正下一跳或服务器地址，确保 ping 服务器可达。',
      'display ntp status 确认进入 synchronized，display clock 确认时间准确。',
    ],
    rootCauseAnalysis:
      'NTP 同步要求客户端与服务器之间能正常交互 NTP 报文（UDP 123）。display ntp sessions 中的 reach 字段是一个 8 位滑动窗口寄存器，反映最近 8 次轮询是否收到服务器响应；reach 为 0 表示连续多次未收到任何响应，说明 NTP 报文无法到达服务器或回程被丢弃，最常见原因就是三层不可达。stratum 16 与 reference 0.0.0.0 是未同步的默认状态。只有打通三层连通性，客户端才能收到服务器的 NTP 报文并完成时钟过滤与选择，进入 synchronized 状态。版本不匹配通常会表现为收到报文但无法解析，不会是 reach 为 0。',
    solution:
      '打通到 NTP 服务器的三层连通性：排查 display ip routing-table 与下一跳，确保 R1 能 ping 通 10.0.0.1；若服务器地址配置错误则用 ntp-service unicast-server <正确地址> 修正。连通后 display ntp sessions 的 reach 逐步变为非 0，display ntp status 显示 clock status: synchronized，display clock 时间与标准时间一致，日志时间戳恢复准确。',
    prevention: [
      '部署 NTP 前先确认管理网到 NTP 服务器三层可达（ping 测试），并确保中间防火墙放通 UDP 123。',
      '设备统一配置时区 clock timezone BJ add 08:00:00 与夏令时规则，保证显示时间正确。',
      '建议配置至少两个 NTP 服务器（ntp-service unicast-server）做冗余，并用 display ntp status 纳入日常巡检。',
    ],
    lessonId: 'm14-l01',
  },
];

export function getTroubleshootCase(id: string): TroubleshootCase | undefined {
  return troubleshootCases.find((item) => item.id === id);
}
