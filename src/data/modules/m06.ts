import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm06',
  code: 'M06',
  title: '以太网交换与二层',
  summary:
    '从二层转发讲起：VLAN 把广播域切开，Access、Trunk、Hybrid 决定标签怎么打、怎么剥；STP 用选举打破环路，RSTP 与 MSTP 把收敛压到秒级；Eth-Trunk、堆叠与端口安全让接入层又宽又稳。',
  stage: 'L2',
  order: 6,
  goals: [
    '能按业务规划 VLAN，并正确配置 Access、Trunk、Hybrid 端口',
    '能解释并验证 STP、RSTP、MSTP 的选举结果与端口角色',
    '能用 BPDU 保护、根保护、环路保护加固二层网络',
    '能设计 Eth-Trunk 与堆叠方案，并启用 MAD 防止双主',
    '能配置端口安全与 DHCP Snooping 抵御接入层攻击',
  ],
  keywords: ['VLAN', 'Trunk', 'Hybrid', 'PVID', 'STP', 'RSTP', 'MSTP', 'Eth-Trunk', 'LACP', 'DHCP Snooping'],
  lessons: [
    {
      id: 'm06-l01',
      moduleId: 'm06',
      title: 'VLAN 与 Access 端口：把广播域切开',
      depth: '熟悉',
      minutes: 22,
      summary: 'VLAN 用逻辑边界切分广播域，Access 端口靠 PVID 决定一帧属于哪个 VLAN。',
      objectives: [
        '解释广播域过大带来的性能与安全问题',
        '用 vlan batch 创建 VLAN 并把端口划入 Access',
        '用 display vlan 验证端口与 VLAN 的归属关系',
      ],
      keywords: ['VLAN', '广播域', 'Access', 'PVID', 'vlan batch'],
      blocks: [
        {
          type: 'paragraph',
          text: '交换机刚上电时，所有端口属于同一个广播域。任何一台主机发出的 ARP 请求、DHCP Discover 都会被泛洪到其余所有端口，主机越多，无关流量越大，这就是广播域过大的直接代价。VLAN 的作用，是在一台物理交换机上切出多个逻辑广播域，让广播只在自己那一组端口内传播。',
        },
        {
          type: 'heading',
          text: '广播域、冲突域与 VLAN',
          level: 3,
        },
        {
          type: 'analogy',
          title: '给开放式办公区加隔断',
          text: '一间隔断都没有的开放式办公区，任何人打电话全公司都能听见。VLAN 就像给办公区加上隔断和独立门牌：市场部和研发部各说各的，互不打扰。区别在于隔断是逻辑的，不需要重新装修，改一条配置就能把某个工位搬到另一个部门。',
        },
        {
          type: 'list',
          title: 'VLAN 的三种划分方式',
          items: [
            '基于端口：把端口静态划入 VLAN，最常用，管理简单，端口换人就要改配置',
            '基于 MAC 地址：按主机网卡归属划分，主机换端口仍属原 VLAN，但维护量很大',
            '基于子网或协议：按 IP 子网映射到 VLAN，跨交换机移动方便，但依赖三层信息',
          ],
        },
        {
          type: 'paragraph',
          text: 'Access 端口内部有一个 PVID（Port VLAN ID），默认是 1。收到无标签帧时，交换机会打上 PVID 对应的 VLAN 标签；向外发送时，再把标签剥掉。所以接终端的端口看起来完全无感，实际上帧在交换机内部一直带着 VLAN 身份在转发。',
        },
        {
          type: 'code',
          title: '创建 VLAN 并把端口划入 Access',
          lang: 'vrp',
          code: `vlan batch 10 20
vlan 10
 description MA
quit
interface GigabitEthernet0/0/1
 port link-type access
 port default vlan 10
quit
interface GigabitEthernet0/0/2
 port link-type access
 port default vlan 20`,
        },
        {
          type: 'output',
          title: '查看 VLAN 与端口归属',
          text: `<SW1> display vlan
The total number of vlans is : 3

U: Up;         D: Down;         TG: Tagged;         UT: Untagged;
MP: Vlan-mapping;               ST: Vlan-stacking;

VID  Type    Ports
---------------------------------------------------------------
1    common  UT:GE0/0/23(U)      TG:GE0/0/24(U)
10   common  UT:GE0/0/1(U)       TG:GE0/0/24(U)
20   common  UT:GE0/0/2(U)       TG:GE0/0/24(U)`,
        },
        {
          type: 'table',
          title: 'VLAN ID 的范围与用途',
          columns: ['VLAN ID', '属性', '说明'],
          rows: [
            ['0', '保留', '系统保留，不能用于业务'],
            ['1', '默认 VLAN', '所有端口初始属于 VLAN 1，不建议承载业务'],
            ['2 - 4094', '可配置', '业务 VLAN 的可用范围，规划时留出余量'],
            ['4095', '保留', '协议保留值，禁止使用'],
          ],
        },
        {
          type: 'interactive',
          key: 'arp-switch',
          caption: '观察 ARP 广播：同一 VLAN 内泛洪，跨 VLAN 必须经过三层',
        },
        {
          type: 'warning',
          title: '不要把业务放在 VLAN 1',
          text: 'VLAN 1 是所有端口的默认 VLAN，也是很多协议报文和控制流量默认使用的 VLAN。业务和管理都挤在 VLAN 1，一旦出现环路或广播风暴，连登录设备都困难。正确做法是业务、管理、互联各用独立 VLAN，并把未使用端口划入一个隔离 VLAN 后关闭。',
        },
        {
          type: 'tip',
          title: '两条命令快速核对',
          text: 'display vlan 看全局有哪些 VLAN、各包含哪些端口；display port vlan 看每个端口的链路类型与 PVID。排查「同一个 VLAN 却不通」时，先确认两端端口是否真的在同一个 VLAN，而不是先怀疑链路。',
        },
        {
          type: 'checklist',
          title: '配置完成后自查',
          items: [
            '业务 VLAN 已创建且有描述，编号符合规划表',
            '接终端的端口为 access，port default vlan 指向正确',
            '未使用端口已 shutdown 并划入隔离 VLAN',
            'VLAN 1 上没有承载业务地址',
            'display vlan 的输出与规划表逐条对得上',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm06-l02',
      moduleId: 'm06',
      title: 'Trunk 与 Hybrid：帧在干道上怎么带标签',
      depth: '精通',
      minutes: 28,
      summary: 'Trunk 用 802.1Q 标签在一条链路上承载多个 VLAN，PVID 决定无标签帧归谁。',
      objectives: [
        '说清 Access、Trunk、Hybrid 在收发方向对标签的处理',
        '配置 Trunk 允许列表，并用 Hybrid 的 untagged 实现特殊接入',
        '定位 PVID 不一致导致的 VLAN 不通',
      ],
      keywords: ['Trunk', '802.1Q', 'Hybrid', 'PVID', 'allow-pass'],
      blocks: [
        {
          type: 'paragraph',
          text: '如果两台交换机上各有十个 VLAN，用 Access 口互联就要十根线，成本高且浪费端口。Trunk 的做法是在以太网帧头插入 4 字节的 802.1Q 标签，用一条链路承载所有 VLAN，这就是干道。标签只在交换机之间有意义，终端收到带标签的帧通常无法识别，所以出口要负责把标签剥掉。',
        },
        {
          type: 'analogy',
          title: '干线货车与面单',
          text: '快递中转站不会为每个小区单开一辆车。它把包裹按小区贴上标签，统一装进一辆干线货车，到了分拨中心再按标签拆包。VLAN 标签就是那张面单，Trunk 就是那辆干线车，PVID 则是「没贴面单的包裹默认算哪个小区」的兜底规则。',
        },
        {
          type: 'heading',
          text: '入方向打标签，出方向决定剥不剥',
          level: 3,
        },
        {
          type: 'table',
          title: '三种端口类型的标签处理',
          columns: ['端口类型', '入方向', '出方向', '典型场景'],
          rows: [
            ['Access', '无标签帧打上 PVID', '去掉标签后发出', '接 PC、打印机、AP 管理口'],
            ['Trunk', '无标签帧打 PVID，带标签帧按标签透传', 'PVID 对应 VLAN 去标签，其余允许 VLAN 带标签', '交换机之间的干道'],
            ['Hybrid', '与 Trunk 相同', '按 tagged 与 untagged 列表逐 VLAN 决定', '干道，或需要给服务器打多 VLAN 的场景'],
          ],
        },
        {
          type: 'code',
          title: '配置 Trunk 干道',
          lang: 'vrp',
          code: `interface GigabitEthernet0/0/24
 port link-type trunk
 port trunk allow-pass vlan 10 20
 port trunk pvid vlan 99
quit`,
        },
        {
          type: 'code',
          title: '配置 Hybrid：VLAN 10 不打标签，VLAN 30 带标签',
          lang: 'vrp',
          code: `interface GigabitEthernet0/0/3
 port link-type hybrid
 port hybrid pvid vlan 10
 port hybrid untagged vlan 10 20
 port hybrid tagged vlan 30
quit`,
        },
        {
          type: 'output',
          title: '查看端口的链路类型与 PVID',
          text: `<SW1> display port vlan
Port                    Link Type    PVID  Trunk VLAN List
-------------------------------------------------------------------------------
GigabitEthernet0/0/1    access       10    -
GigabitEthernet0/0/2    access       20    -
GigabitEthernet0/0/3    hybrid       10    -
GigabitEthernet0/0/24   trunk        99    10 20 30`,
        },
        {
          type: 'warning',
          title: 'PVID 不一致是最隐蔽的不通',
          text: '两端 Trunk 的 PVID 如果不同，无标签帧在两端会被归入不同 VLAN，表现为「有的 VLAN 通、有的不通」或「带标签能通、不带标签不通」。互联前把两侧 PVID 统一改成同一个专用 VLAN（如 99），并且不要把这个 VLAN 用于业务，可以避免大量莫名故障。',
        },
        {
          type: 'tip',
          title: '允许列表做减法',
          text: 'allow-pass vlan all 省事但危险：任何新加的 VLAN 都会自动涌上干道，广播域被意外拉大。按规划逐条写 allow-pass，既能限制广播范围，也能在出现未知 VLAN 流量时第一时间发现异常。',
        },
        {
          type: 'kv',
          items: [
            { label: '802.1Q 标签', value: '4 字节，含 12 位 VLAN ID，最多 4094 个可用 VLAN' },
            { label: 'PVID', value: '端口默认 VLAN，入方向给无标签帧打标签，出方向通常去标签' },
            { label: 'Tagged', value: '出方向保留标签，对端必须是能识别标签的设备' },
            { label: 'Untagged', value: '出方向剥离标签，适合接普通终端或服务器' },
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm06-l03',
      moduleId: 'm06',
      title: 'STP 选举：谁当根桥，谁被阻塞',
      depth: '精通',
      minutes: 30,
      summary: 'STP 比较桥 ID 与路径开销选出一棵无环树，被阻塞的端口就是冗余的代价。',
      objectives: [
        '说明二层环路为什么必然导致广播风暴',
        '按根桥、根端口、指定端口三步推演选举结果',
        '用 display stp brief 读懂端口角色与状态',
      ],
      keywords: ['STP', '根桥', 'BID', '路径开销', 'BPDU', '阻塞端口'],
      blocks: [
        {
          type: 'paragraph',
          text: 'IP 报文有 TTL，每经过一个路由设备就减一，减到零就丢弃，所以三层环路会自己停下来。二层以太网帧没有 TTL 字段，一旦两台交换机之间存在多条通路，广播帧会沿环路不断复制、转发，几秒钟内就能占满链路带宽和交换机 CPU，这就是广播风暴。STP 的任务，是用软件的方式把环形拓扑剪成一棵树。',
        },
        {
          type: 'analogy',
          title: '环形跑道上的接力棒',
          text: '一群人站在环形跑道上传递接力棒，没有人喊停，棒就会永远转圈，而且每经过一个人还会多复制一根。STP 相当于在环上选一个人「站在原地不许接棒」，环就被打断成一条链，接力棒有终点、会自然停止。被选中的那个人，就是阻塞端口。',
        },
        {
          type: 'heading',
          text: '选举三步走',
          level: 3,
        },
        {
          type: 'steps',
          items: [
            {
              title: '选根桥',
              text: '全网比较桥 ID，即 2 字节优先级加 6 字节 MAC，数值最小者成为根桥。根桥的所有端口都是指定端口，负责周期性发出 BPDU。',
            },
            {
              title: '选根端口',
              text: '每台非根桥选出一个到根桥路径开销最小的端口作为根端口，负责朝根桥方向转发。开销相同时比较上游桥 ID，再比较上游端口 ID。',
            },
            {
              title: '选指定端口',
              text: '每条链路上选出一个指定端口负责转发 BPDU，另一端的端口既不是根端口也不是指定端口，只能进入阻塞状态，作为备份路径。',
            },
          ],
        },
        {
          type: 'interactive',
          key: 'stp-election',
          caption: '改变优先级与链路开销，观察根桥与阻塞端口如何变化',
        },
        {
          type: 'table',
          title: '选举时的比较顺序',
          columns: ['比较项', '含义', '谁更优'],
          rows: [
            ['桥 ID', '2 字节优先级加 6 字节 MAC', '数值更小'],
            ['根路径开销', '到根桥的累计开销，带宽越高开销越小', '数值更小'],
            ['发送者桥 ID', '上游交换机的桥 ID', '数值更小'],
            ['发送者端口 ID', '端口优先级加端口号', '数值更小'],
          ],
        },
        {
          type: 'code',
          title: '指定根桥并调整端口开销',
          lang: 'vrp',
          code: `stp mode stp
stp root primary
quit
interface GigabitEthernet0/0/1
 stp cost 20000
quit`,
        },
        {
          type: 'output',
          title: '查看端口角色与状态',
          text: `<SW1> display stp brief
 MSTID  Port                        Role  STP State     Protection
    0    GigabitEthernet0/0/1        DESI  FORWARDING    NONE
    0    GigabitEthernet0/0/2        DESI  FORWARDING    NONE
    0    GigabitEthernet0/0/23       ROOT  FORWARDING    NONE
    0    GigabitEthernet0/0/24       ALTE  DISCARDING    NONE`,
        },
        {
          type: 'warning',
          title: '默认优先级会让根桥落在接入层',
          text: '所有交换机默认优先级都是 32768，于是 MAC 最小的那台自动成为根桥，很可能是某台接入交换机。根桥位置偏了，全网流量要先绕到接入层再回核心，时延和带宽都被浪费。规划时必须手工把核心双机设为根桥与备根，并用 display stp 核对根桥 BID 是否符合设计。',
        },
        {
          type: 'tip',
          title: '优先级步长是 4096',
          text: 'STP 优先级只有高 4 位有效，配置值必须是 4096 的倍数，例如 4096、8192、12288。写 100 会被自动取整。备根不要用 root secondary 就完事，最好显式给一个比主根大、比其他设备小的值。',
        },
        {
          type: 'list',
          title: 'STP 的五个端口状态',
          items: [
            'Disabled：端口被关闭或不参与 STP',
            'Blocking：只收 BPDU，不转发业务帧，用于打破环路',
            'Listening：参与选举但不学习 MAC，持续 15 秒',
            'Learning：开始学习 MAC 但不转发，再持续 15 秒',
            'Forwarding：正常转发业务帧',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm06-l04',
      moduleId: 'm06',
      title: 'RSTP、MSTP 与根桥防护',
      depth: '精通',
      minutes: 30,
      summary: 'RSTP 用提议确认把收敛压到秒级，MSTP 按实例分流 VLAN，防护特性挡住异常 BPDU。',
      objectives: [
        '说明 RSTP 的端口状态、端口角色与边缘端口',
        '配置 MSTP 多实例并验证区域参数一致',
        '针对不同攻击面选择 BPDU 保护、根保护或环路保护',
      ],
      keywords: ['RSTP', 'MSTP', '边缘端口', 'BPDU 保护', '根保护', '环路保护'],
      blocks: [
        {
          type: 'paragraph',
          text: 'STP 收敛慢的根源在于状态机：从阻塞到转发要经历 Listening 与 Learning 各 15 秒，再叠加拓扑变化后的老化时间，最坏情况接近 50 秒。对语音和视频业务来说这是不可接受的。RSTP 引入提议与确认的握手机制，让指定端口可以主动询问下游能否直接进入转发，把收敛压到毫秒到秒级。',
        },
        {
          type: 'analogy',
          title: '老式红绿灯与感应信号灯',
          text: 'STP 像固定配时的红绿灯：不管有没有车，每个方向都要等满 15 秒。RSTP 像地感信号灯：检测到这边有车、那边没车，立刻切换，不必空等。MSTP 更进一步，像分时段车道：早高峰把三条车道给进城方向，晚高峰反过来，同一批 VLAN 在不同实例里走不同路径。',
        },
        {
          type: 'table',
          title: 'STP 与 RSTP 的关键差异',
          columns: ['维度', 'STP（802.1D）', 'RSTP（802.1w）'],
          rows: [
            ['端口状态', '5 种：Disabled、Blocking、Listening、Learning、Forwarding', '3 种：Discarding、Learning、Forwarding'],
            ['端口角色', '根端口、指定端口、阻塞端口', '根端口、指定端口、Alternate、Backup'],
            ['收敛机制', '计时器驱动，30 到 50 秒', '提议确认，通常 1 秒内'],
            ['边缘端口', '无', '边缘端口接入终端可立即转发'],
          ],
        },
        {
          type: 'code',
          title: '配置 MSTP 多实例',
          lang: 'vrp',
          code: `stp mode mstp
stp region-configuration
 region-name CORE
 revision-level 1
 instance 1 vlan 10 20
 instance 2 vlan 30 40
 active region-configuration
quit
stp instance 1 root primary
stp instance 2 root secondary`,
        },
        {
          type: 'output',
          title: '查看 MSTP 区域配置',
          text: `<SW1> display stp region-configuration
 Oper configuration
   Format selector      : 0
   Region name          : CORE
   Revision level       : 1

   Instance   VLANs Mapped
      0       1 to 9, 21 to 29, 41 to 4094
      1       10, 20
      2       30, 40`,
        },
        {
          type: 'code',
          title: '三类二层防护配置',
          lang: 'vrp',
          code: `stp bpdu-protection
quit
interface GigabitEthernet0/0/1
 stp edged-port enable
quit
interface GigabitEthernet0/0/23
 stp root-protection
quit
interface GigabitEthernet0/0/24
 stp loop-protection
quit`,
        },
        {
          type: 'table',
          title: '三种防护各自防什么',
          columns: ['特性', '部署位置', '触发条件', '动作'],
          rows: [
            ['BPDU 保护', '全局开启，作用于边缘端口', '边缘端口收到 BPDU', '端口 error-down，需手动或自动恢复'],
            ['根保护', '面向下游的指定端口', '收到优先级优于本机的 BPDU', '端口进入 Discarding，忽略该 BPDU'],
            ['环路保护', '根端口或 Alternate 端口', '长时间收不到 BPDU', '端口进入 Discarding，避免单向链路成环'],
          ],
        },
        {
          type: 'warning',
          title: '根保护与环路保护不能同端口',
          text: '根保护用在指定端口，环路保护用在根端口或 Alternate 端口，两者角色互斥，同时配置会报错。另外 BPDU 保护一旦触发会让端口 error-down，恢复需要 shutdown 再 undo shutdown，或配置 error-down auto-recovery，否则接入用户会一直投诉上不了网。',
        },
        {
          type: 'tip',
          title: '边缘端口是接入层的标配',
          text: '接 PC、打印机、AP 的端口都应设为边缘端口，接入终端时直接进入转发，不参与 STP 收敛。边缘端口必须搭配 BPDU 保护，否则用户私接一台交换机就可能把 BPDU 带进来，引发拓扑震荡。',
        },
        {
          type: 'checklist',
          title: 'MSTP 上线前核对',
          items: [
            '所有交换机 region-name、revision-level、实例与 VLAN 映射完全一致',
            '主根与备根已显式指定，且位于核心层',
            '实例 0 之外还有实例承载业务，避免单实例承担全部 VLAN',
            '接入端口已设边缘端口并开启 BPDU 保护',
            'display stp brief 中每个实例的根端口方向正确',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm06-l05',
      moduleId: 'm06',
      title: 'Eth-Trunk、堆叠与 MAD：把两台设备当一台用',
      depth: '熟悉',
      minutes: 26,
      summary: '链路聚合成一条逻辑链路提升带宽与可靠性，堆叠把两台交换机变成一台，MAD 防止分裂双主。',
      objectives: [
        '区分手工负载分担与 LACP 模式的适用场景',
        '配置 Eth-Trunk 并验证成员口与活动链路数量',
        '说明堆叠分裂的风险以及 MAD 的作用',
      ],
      keywords: ['Eth-Trunk', 'LACP', '堆叠', 'MAD', '链路聚合'],
      blocks: [
        {
          type: 'paragraph',
          text: '两台交换机之间只拉一根千兆线，带宽上限就是一千兆，线一断业务全断。链路聚合把多条物理链路捆成一条逻辑链路，既能叠加带宽，又能在单条链路故障时自动把流量切到剩余成员口。对 STP 来说，这条逻辑链路只是一个端口，不会因为多根线而产生环路。',
        },
        {
          type: 'analogy',
          title: '多车道高速与收费站',
          text: '单链路像单车道，一辆车抛锚就堵死。Eth-Trunk 像把两条车道合并成一条多车道高速：车可以同时走多条车道，某条车道施工时车流自动并到其他车道，收费站的收费杆只看「一辆车」，不关心它走的是哪条车道。堆叠则相当于把两个收费站合并成一个管理中心。',
        },
        {
          type: 'table',
          title: '手工模式与 LACP 模式',
          columns: ['对比项', '手工负载分担', 'LACP 模式'],
          rows: [
            ['协商', '不协商，配了成员口就转发', '通过 LACPDU 协商，检查速率、双工、VLAN 等'],
            ['故障检测', '只能感知物理链路 down', '可感知对端配置错误与单向故障'],
            ['成员口数量', '最多 8 个', '最多 8 个活动链路，可配置备份'],
            ['适用场景', '对端不支持 LACP 的设备', '交换机之间互联，推荐默认使用'],
          ],
        },
        {
          type: 'code',
          title: '配置 LACP 模式的 Eth-Trunk',
          lang: 'vrp',
          code: `interface Eth-Trunk 1
 mode lacp-static
 port link-type trunk
 port trunk allow-pass vlan 10 20
 trunkport GigabitEthernet0/0/1
 trunkport GigabitEthernet0/0/2
 max active-linknumber 2
quit`,
        },
        {
          type: 'output',
          title: '查看聚合链路状态',
          text: `<SW1> display eth-trunk 1
Eth-Trunk1's state information is:
LAG ID: 1                   WorkingMode: LACP
Preempt Delay: Disabled     Hash arithmetic: According to SIP-XOR-DIP
System Priority: 32768      System ID: 00e0-fc12-3456
Least Active-linknumber: 1  Max Active-linknumber: 2
Operate status: up          Number Of Up Port In Trunk: 2
-------------------------------------------------------------------------------
ActorPortName          Status   PortType  PortPri  PortNo
GigabitEthernet0/0/1   Selected 1GE       32768    1
GigabitEthernet0/0/2   Selected 1GE       32768    2`,
        },
        {
          type: 'steps',
          items: [
            {
              title: '规划主备与优先级',
              text: '堆叠优先级默认 100，数值越大越优先成为主交换机。把核心主设备设为 150 以上，备设备保持默认，避免每次重启都重新选举。',
            },
            {
              title: '连接堆叠线',
              text: '使用专用堆叠卡或业务口做堆叠链路，优先组成环形以提高可靠性，单链形在一根线断后仍可工作但带宽减半。',
            },
            {
              title: '配置堆叠端口',
              text: '在 stack-port 视图下绑定物理成员口。成员口一旦加入堆叠端口，就不能再当普通业务口使用。',
            },
            {
              title: '上电合并',
              text: '先给主设备上电并确认配置，再给备设备上电。备机会重启并以成员身份加入，两台设备形成统一管理平面。',
            },
            {
              title: '启用 MAD 双主检测',
              text: '用一条独立的直连链路或跨设备聚合口做检测链路，堆叠正常时它不转发业务，分裂时用来判定谁退出。',
            },
          ],
        },
        {
          type: 'code',
          title: '堆叠与 MAD 双主检测',
          lang: 'vrp',
          code: `stack
 stack member 1 priority 150
quit
interface stack-port 1/1
 port interface GigabitEthernet1/0/1 enable
 port interface GigabitEthernet1/0/2 enable
quit
interface Eth-Trunk 10
 mode lacp-static
 mad detect mode direct
quit`,
        },
        {
          type: 'warning',
          title: '堆叠分裂会同时出现两个主设备',
          text: '堆叠线断开后，两台设备都认为自己是主，管理 IP、VLAN 配置、STP 根全部同时生效，网络里出现两个网关和两个根桥，故障极难定位。MAD 的作用就是检测到分裂后，让其中一台进入 Recovery 状态并关闭业务口，只保留一台转发。没配 MAD 的堆叠，等于把双倍风险引入了网络。',
        },
        {
          type: 'tip',
          title: '跨设备聚合依赖堆叠',
          text: '把两台交换机的端口做成一个 Eth-Trunk 连向服务器或下游交换机，前提是这两台设备已经堆叠成一台逻辑设备。没有堆叠就想跨设备聚合，需要更复杂的协议支持，普通园区网不要这样设计。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm06-l06',
      moduleId: 'm06',
      title: '端口安全与 DHCP Snooping：守住接入层',
      depth: '熟悉',
      minutes: 24,
      summary: '端口安全限制 MAC 数量，DHCP Snooping 过滤伪造服务器，两者共同守住接入层。',
      objectives: [
        '配置端口安全的 MAC 数量限制与违规动作',
        '部署 DHCP Snooping 的信任端口与报文限速',
        '说明 IPSG 如何依赖绑定表防止地址伪造',
      ],
      keywords: ['端口安全', 'MAC 限制', 'DHCP Snooping', '信任端口', 'IPSG'],
      blocks: [
        {
          type: 'paragraph',
          text: '接入层交换机放在走廊、工位和弱电井，任何人都可能拔掉网线插上自己的设备。私接家用路由器、伪造 DHCP 服务器、冒用他人 IP，这些攻击不需要攻破交换机，只要插上一根线就能发起。端口安全与 DHCP Snooping 就是在这个最容易被忽略的位置做第一道过滤。',
        },
        {
          type: 'analogy',
          title: '门禁与访客登记',
          text: '端口安全像门禁：只允许登记过的 MAC 进出，一个工位最多登记两个设备，出现陌生卡就报警或锁门。DHCP Snooping 像前台登记：只认公司指定的接待人员发放门禁卡，冒充接待人员给访客发假卡的人会被当场拦下。',
        },
        {
          type: 'table',
          title: '端口安全的三种违规动作',
          columns: ['动作', '行为', '适用场景'],
          rows: [
            ['protect', '丢弃违规报文，不产生告警', '只关心可用性、不想被日志淹没'],
            ['restrict', '丢弃违规报文并上报告警', '办公接入，推荐默认使用'],
            ['shutdown', '端口 error-down，需人工或自动恢复', '高安全区域、财务与机房'],
          ],
        },
        {
          type: 'code',
          title: '配置端口安全',
          lang: 'vrp',
          code: `interface GigabitEthernet0/0/1
 port-security enable
 port-security max-mac-num 2
 port-security mac-address sticky
 port-security protect-action restrict
quit`,
        },
        {
          type: 'output',
          title: '查看端口安全状态',
          text: `<SW1> display port-security interface GigabitEthernet0/0/1
Port security              : Enabled
Port status                : Up
Port mode                  : Auto learn
Maximum MAC address number : 2
Current MAC address number : 1
MAC address list           :
    00e0-fc12-3456  Sticky
Protect action             : Restrict`,
        },
        {
          type: 'code',
          title: '配置 DHCP Snooping 与限速',
          lang: 'vrp',
          code: `dhcp enable
dhcp snooping enable
quit
interface GigabitEthernet0/0/24
 dhcp snooping trusted
quit
interface GigabitEthernet0/0/1
 dhcp snooping enable
 dhcp snooping check dhcp-rate enable
 dhcp snooping check dhcp-rate 20
 dhcp snooping option82 insert enable
quit`,
        },
        {
          type: 'list',
          title: 'DHCP Snooping 做的四件事',
          items: [
            '区分信任与非信任端口，只有信任端口方向的 DHCP Offer 才允许通过',
            '监听 DHCP 交互并生成绑定表，记录 MAC、IP、VLAN、端口与租期',
            '限制单位时间内的 DHCP 报文数量，抑制地址池耗尽攻击',
            '插入 Option82 选项，把接入位置信息带给 DHCP 服务器，便于定位与分配',
          ],
        },
        {
          type: 'warning',
          title: '信任端口配反会让全网拿不到地址',
          text: '信任端口必须指向 DHCP 服务器所在方向，通常是上行口或服务器接入口。如果把用户口设成 trusted，伪造服务器就能直接给终端下发错误网关；反过来，上行口忘了设 trusted，所有 DHCP 请求都会被丢弃，表现是整栋楼终端都拿不到 IP，而交换机本身一切正常。',
        },
        {
          type: 'tip',
          title: '配合 IPSG 才算闭环',
          text: 'DHCP Snooping 生成的绑定表可以给 IPSG 使用：端口只允许绑定表里的源 IP 通过，冒用地址的报文直接丢弃。只开 Snooping 不开 IPSG，能防假 DHCP 服务器，但防不住手工配静态 IP 冒用他人地址。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
