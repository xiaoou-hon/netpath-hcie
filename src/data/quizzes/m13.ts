import type { QuizQuestion } from '@/types';

const list: QuizQuestion[] = [
  {
    id: 'q-m13-01',
    moduleId: 'm13',
    lessonId: 'm13-l01',
    type: 'single',
    depth: '了解',
    question: '关于网络运维体系，下列理解正确的是？',
    options: [
      '监控告警只能事后统计，对隐患发现没有价值',
      '配置备份与基线巡检属于主动性运维，既能提前发现隐患，也能在故障时快速恢复',
      '变更只要口头通知即可实施，不需要评审与回滚预案',
      '故障复盘的主要目的是追究个人责任',
    ],
    answer: [1],
    explanation:
      '完整的运维体系包含监控告警、配置与备份管理、巡检基线、变更管理、应急响应和复盘改进。备份与基线核查属于主动性运维，可在故障时提供回滚依据并提前暴露配置漂移；变更必须经过评审、窗口安排和回滚预案，否则一次误操作就可能演变为大范围故障；复盘的目标是改进流程与技术短板。',
  },
  {
    id: 'q-m13-02',
    moduleId: 'm13',
    lessonId: 'm13-l02',
    type: 'single',
    depth: '熟悉',
    question: '接到"某业务访问慢"的报障后，最合理的第一步是什么？',
    options: [
      '立即重启核心设备',
      '先确认影响范围、发生时间与近期变更，判断是单点、区域还是全局问题',
      '直接修改 QoS 策略',
      '先更换全部网线',
    ],
    answer: [1],
    explanation:
      '排障的第一步是界定边界而不是动手改配置。确认影响范围、起始时间与近期变更有助于判断故障域：单点问题多查接入与终端，区域问题看网关与路由，全局问题优先怀疑出口、策略或变更引入。盲目重启会破坏现场、丢失日志，还可能让故障扩大，因此必须先用证据缩小范围再定位分层原因。',
  },
  {
    id: 'q-m13-03',
    moduleId: 'm13',
    lessonId: 'm13-l03',
    type: 'single',
    depth: '熟悉',
    question: 'OSPF 邻居长期停留在 Init 状态，最可能的原因是什么？',
    options: [
      '本端能收到对端 Hello，但对端收不到本端 Hello，存在单向可达或 Hello 被过滤',
      '两端接口 MTU 不一致',
      '双方 LSDB 中的 LSA 无法获取',
      'DR 选举尚未完成',
    ],
    answer: [0],
    explanation:
      'Init 的含义是本端已收到对端 Hello，但对端 Hello 的邻居列表中没有本端 Router ID，本质是"我能听见你、你听不见我"。常见原因包括光纤收发反接或单向链路、ACL/防火墙过滤 224.0.0.5、认证失败，以及 Hello/Dead 间隔不一致导致对端丢弃报文。MTU 不一致卡在 ExStart，LSA 获取失败卡在 Loading，DR 选举未完成则表现为 2-Way。',
  },
  {
    id: 'q-m13-04',
    moduleId: 'm13',
    lessonId: 'm13-l03',
    type: 'single',
    depth: '精通',
    question: '在广播网络中，两台非 DR/BDR 的路由器邻居状态长期稳定在 2-Way，应如何判断？',
    options: [
      '属于正常现象，只有 DR/BDR 与其他路由器之间才需要建立 Full 邻接',
      '一定是接口 MTU 不一致导致的故障',
      '说明 Router ID 冲突，必须立即修改',
      '说明区域号配置错误',
    ],
    answer: [0],
    explanation:
      '广播网中 DROther 之间只保持 2-Way，双方通过 DR 集中交换 LSA 即可完成同步，这是减少邻接数量的正常设计。只有当两端本应建立邻接（例如期望它们成为 DR/BDR，或链路被改为 P2P/P2MP）却停在 2-Way 时，才检查接口 DR 优先级、网络类型与 filter 策略。把 2-Way 一律当成故障会误导排障方向。',
  },
  {
    id: 'q-m13-05',
    moduleId: 'm13',
    lessonId: 'm13-l03',
    type: 'single',
    depth: '精通',
    question: 'OSPF 邻居卡在 ExStart 并反复重传 DD 报文，最常见的原因是什么？',
    options: [
      '两端接口 MTU 不一致，较大的 DD 报文被丢弃',
      'Hello 时间不一致',
      '组播地址被 ACL 过滤',
      '区域号不一致',
    ],
    answer: [0],
    explanation:
      'ExStart 阶段要选出主从路由器并确定 DD 序列号，DD 报文按接口 MTU 发送且不允许分片，MTU 小的一端收到超长 DD 会直接丢弃，导致协商失败后反复重来。解决办法是两端保持一致 MTU，或在确认不影响转发后配置 mtu-ignore。Hello 时间、区域号、组播过滤等问题通常更早卡在 Down 或 Init，不会走到 ExStart。',
  },
  {
    id: 'q-m13-06',
    moduleId: 'm13',
    lessonId: 'm13-l03',
    type: 'single',
    depth: '精通',
    question: 'OSPF 邻居进入 Loading 后长时间无法到达 Full，最可能的原因是什么？',
    options: [
      '本端 LSR 请求的 LSA 无法从对端获得，如被 ACL 过滤或大 LSU 被 MTU 丢弃',
      '接口 DR 优先级被配置为 0',
      '接口被配置为静默接口',
      '两端 Router ID 相同',
    ],
    answer: [0],
    explanation:
      'Loading 表示双方已交换 DD 摘要，本端正用 LSR 请求缺失的 LSA 并等待 LSU 回应。若 LSR/LSU 被 ACL 过滤、含多个 LSA 的 LSU 超过 MTU 被丢弃、对端 LSA 已老化或链路抖动造成反复重传，状态就迟迟进不到 Full。可用 display ospf lsdb 与 display ospf error 观察请求与重传计数。静默接口根本不发 Hello，状态停在 Down。',
  },
  {
    id: 'q-m13-07',
    moduleId: 'm13',
    lessonId: 'm13-l03',
    type: 'boolean',
    depth: '精通',
    question:
      'OSPF 邻居停留在 ExStart，说明 DD 报文的主从协商尚未完成，接口 MTU 不一致是常见原因之一。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      'ExStart 的核心任务是选出主从路由器并确定 DD 序列号，DD 报文不分片，MTU 不一致会使一方丢弃超长报文，协商因此反复失败。除 MTU 外，Router ID 冲突、单向过滤 DD、接口状态不稳定也会造成同样表现。排查时应结合 display ospf error 与两端接口 MTU 一起确认，而不是只改一处配置就结束。',
  },
  {
    id: 'q-m13-08',
    moduleId: 'm13',
    lessonId: 'm13-l04',
    type: 'single',
    depth: '精通',
    question: 'OSPF 邻居已经是 Full，但学不到某条区域间路由，应优先检查什么？',
    options: [
      '接口 MTU 与 Hello 时间',
      'ABR 上是否对该区域做了汇总或过滤，以及区域类型（如 Totally Stub）是否过滤了 Type 3',
      '交换机的 VLAN 划分',
      '端口的双工模式',
    ],
    answer: [1],
    explanation:
      '邻居 Full 说明 Hello 交互与 LSDB 同步都正常，问题出在 LSA 的产生与传递环节：ABR 的 abr-summary 汇总范围、filter 策略以及 Totally Stub/NSSA 等区域类型都会改变 Type 3/5 的下发，导致明细路由缺失。也可能是源区域本身没有该路由或开销被改大。应按"邻居→LSDB→路由表"逐级确认 LSA 是否到达本机。',
  },
  {
    id: 'q-m13-09',
    moduleId: 'm13',
    lessonId: 'm13-l05',
    type: 'multiple',
    depth: '熟悉',
    question: 'eBGP 邻居无法建立，可能的原因包括哪些？',
    options: [
      '两端 AS 号配置不一致',
      '更新源地址不可达或未指定 update-source',
      'TCP 179 被 ACL 或防火墙阻断',
      '跨多跳时未配置 ebgp-max-hop',
      '没有配置 OSPF 就一定无法建立直连 eBGP',
    ],
    answer: [0, 1, 2, 3],
    explanation:
      '直连 eBGP 依靠直连路由即可建立，并不依赖 IGP，因此最后一项不成立。AS 号不匹配会收到 Notification 并断开；更新源与对端 peer 地址不一致会导致 TCP 握手失败；eBGP 默认 TTL 为 1，跨跳必须配置 ebgp-max-hop；179 被过滤则表现为连接超时。排查可先 ping 对端，再尝试 telnet 179 验证 TCP 连通性。',
  },
  {
    id: 'q-m13-10',
    moduleId: 'm13',
    lessonId: 'm13-l06',
    type: 'single',
    depth: '熟悉',
    question:
      '接入交换机端口状态正常，但用户时通时断，display interface 显示 CRC 错误持续增长，最可能的原因是什么？',
    options: [
      '物理层问题，如网线质量差、水晶头接触不良或光模块/光纤脏污',
      'OSPF 区域号不一致',
      'BGP AS 号配置错误',
      'DNS 服务器地址错误',
    ],
    answer: [0],
    explanation:
      'CRC 错误表示帧校验失败，通常来自线缆质量、接头氧化、光模块老化或光纤端面污染，属于物理层问题，表现为随机丢包和时通时断而非彻底中断。处理时应更换跳线或尾纤、清洁光接口、确认速率与双工协商一致，再观察 CRC 是否继续增长。路由协议与 DNS 配置错误不会引起 CRC 计数增加。',
  },
  {
    id: 'q-m13-11',
    moduleId: 'm13',
    lessonId: 'm13-l07',
    type: 'single',
    depth: '熟悉',
    question: '无线终端能搜到 SSID 并关联成功，但始终获取不到 IP 地址，最应先检查什么？',
    options: [
      '终端天线增益',
      '业务 VLAN 与 DHCP 配置，以及 AP 到 AC/网关的转发路径是否放通该 VLAN',
      'AC 的软件版本号',
      '终端的屏幕亮度设置',
    ],
    answer: [1],
    explanation:
      '能关联成功说明射频信号与 WLAN 认证基本正常，问题多在地址分配或数据转发环节：业务 VLAN 未在 AP 上行或隧道中放通、DHCP 中继缺失、地址池耗尽、VLAN 与 VAP 绑定错误都会导致拿不到地址。应先在 AC 查看 AP 在线状态与 VAP 绑定，再核对接入与汇聚的 VLAN 及 DHCP 中继配置。',
  },
  {
    id: 'q-m13-12',
    moduleId: 'm13',
    lessonId: 'm13-l09',
    type: 'boolean',
    depth: '精通',
    question:
      '割接前应完成配置备份、影响评估和回滚预案，割接后还要验证业务与关键监控指标。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      '变更割接的风险主要来自不可逆操作，配置备份与回滚预案保证失败时能在窗口内恢复业务，影响评估用于确定窗口、通知相关方并准备应急资源。割接后应逐项验证路由邻居、业务连通性和监控指标，确认无异常后再关闭变更单。复盘的目的是沉淀问题与改进项，而不是简单记录"已完成"。',
  },
];

export default list;
