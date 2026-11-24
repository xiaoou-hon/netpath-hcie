import type { QuizQuestion } from '@/types';

const list: QuizQuestion[] = [
  {
    id: 'q-m03-01',
    moduleId: 'm03',
    lessonId: 'm03-l01',
    type: 'single',
    depth: '了解',
    question: 'OSPF 运行过程中维护的三张表分别是什么？',
    options: [
      '邻居表、链路状态数据库、路由表',
      'MAC 表、ARP 表、路由表',
      '会话表、NAT 表、安全策略表',
      'VLAN 表、STP 表、转发表',
    ],
    answer: [0],
    explanation:
      'OSPF 通过邻居表维护邻接关系，通过链路状态数据库 LSDB 保存拓扑信息，再用 SPF 算法计算出路由表。三张表层层递进，排错时通常按邻居、LSDB、路由的顺序逐级检查，能快速定位问题所在。',
  },
  {
    id: 'q-m03-02',
    moduleId: 'm03',
    lessonId: 'm03-l02',
    type: 'multiple',
    depth: '熟悉',
    question: '下列哪些属于 OSPF 的五种报文？',
    options: ['Hello', 'DD', 'LSR', 'LSU', 'PING'],
    answer: [0, 1, 2, 3],
    explanation:
      'OSPF 五种报文是 Hello、DD、LSR、LSU 和 LSAck，分别用于邻居发现、数据库摘要交换、请求缺失 LSA、发送完整 LSA 和确认接收。PING 属于 ICMP 报文，不参与 OSPF 邻居建立和数据库同步。',
  },
  {
    id: 'q-m03-03',
    moduleId: 'm03',
    lessonId: 'm03-l02',
    type: 'single',
    depth: '精通',
    question: 'OSPF 邻居长期停留在 ExStart 状态，最常见的原因是什么？',
    options: ['接口 MTU 不一致', 'Router-ID 重复', '区域号不一致', 'Hello 时间不一致'],
    answer: [0],
    explanation:
      'ExStart 阶段双方要协商主从关系并确定 DD 报文序列号，MTU 不一致会导致 DD 报文被丢弃，邻居无法进入 Exchange。Router-ID 重复或区域号不一致通常卡在 Init 或 2-Way，应先比较两端接口 MTU 和 display ospf error。',
  },
  {
    id: 'q-m03-04',
    moduleId: 'm03',
    lessonId: 'm03-l03',
    type: 'single',
    depth: '熟悉',
    question: '在广播型网络中，OSPF 选举 DR 时首先比较什么？',
    options: ['接口的 DR 优先级，优先级大者优先', 'Router-ID 的数值，数值大者优先', '接口的 IP 地址，地址小者优先', '接口的带宽，带宽大者优先'],
    answer: [0],
    explanation:
      'DR 选举先比较接口 DR 优先级，优先级为 0 表示不参与选举；优先级相同再比较 Router-ID，数值大者当选。优先级修改后通常不会立即抢占，需要等待选举过程重新进行，排错时要考虑这个时间因素。',
  },
  {
    id: 'q-m03-05',
    moduleId: 'm03',
    lessonId: 'm03-l04',
    type: 'multiple',
    depth: '精通',
    question: '关于 OSPF 的 LSA 类型，下列说法正确的有哪些？',
    options: [
      'Type 1 描述路由器的链路状态',
      'Type 2 由 DR 产生，描述广播网段的拓扑',
      'Type 3 由 ABR 产生，描述区域间路由',
      'Type 5 由 ABR 产生，描述区域内的明细路由',
    ],
    answer: [0, 1, 2],
    explanation:
      'Type 1 是 Router LSA，Type 2 是 Network LSA 且由 DR 产生，Type 3 是 ABR 生成的 Summary LSA。Type 5 是 ASBR 产生的外部路由 LSA，不是 ABR 描述区域内明细的路由，区域内明细由 Type 1 和 Type 2 描述。',
  },
  {
    id: 'q-m03-06',
    moduleId: 'm03',
    lessonId: 'm03-l05',
    type: 'single',
    depth: '熟悉',
    question: '同时连接多个 OSPF 区域、且至少有一个接口属于 Area 0 的路由器称为什么？',
    options: ['ABR', 'ASBR', 'DR', 'BDR'],
    answer: [0],
    explanation:
      'ABR 是区域边界路由器，负责在骨干区域与非骨干区域之间生成和转发 Type 3 汇总路由。ASBR 负责引入 OSPF 域外路由，DR 和 BDR 是广播网中减少邻接数量的角色，三者职责不能混淆。',
  },
  {
    id: 'q-m03-07',
    moduleId: 'm03',
    lessonId: 'm03-l06',
    type: 'boolean',
    depth: '精通',
    question: 'NSSA 区域内的 ASBR 会直接产生 Type 5 LSA 向整个 OSPF 域泛洪。',
    options: ['正确', '错误'],
    answer: [1],
    explanation:
      'NSSA 是末梢区域的一种扩展，允许引入外部路由，但 ASBR 在区域内产生的是 Type 7 LSA。Type 7 到达 ABR 后会被转换为 Type 5 再泛洪到其他区域，因此 NSSA 内不会直接出现 Type 5 LSA。',
  },
  {
    id: 'q-m03-08',
    moduleId: 'm03',
    lessonId: 'm03-l07',
    type: 'single',
    depth: '精通',
    question: 'OSPF 虚连接的主要作用是什么？',
    options: [
      '通过传输区域把非骨干区域逻辑上连接到 Area 0',
      '把 Type 5 LSA 转换成 Type 7 LSA',
      '替代所有物理链路实现负载分担',
      '在广播网上选举 DR 和 BDR',
    ],
    answer: [0],
    explanation:
      '当非骨干区域无法物理直连 Area 0 时，可以在两端 ABR 上配置虚连接，借助中间的传输区域建立逻辑链路。虚连接属于补救手段，不是设计首选，配置前要确认传输区域本身可达且路由正常。',
  },
  {
    id: 'q-m03-09',
    moduleId: 'm03',
    lessonId: 'm03-l06',
    type: 'single',
    depth: '精通',
    question: 'Totally STUB 区域会过滤掉哪些 LSA，只保留一条默认路由？',
    options: ['Type 3、Type 4 和 Type 5', 'Type 1 和 Type 2', '只过滤 Type 7', '只过滤 Type 1'],
    answer: [0],
    explanation:
      'Totally STUB 由 ABR 配置，向区域内只下发一条 Type 3 默认路由，同时过滤区域间 Type 3、Type 4 和外部 Type 5 LSA。区域内的 Type 1 和 Type 2 仍然保留，用于描述本区域拓扑，因此不能把过滤范围扩大。',
  },
  {
    id: 'q-m03-10',
    moduleId: 'm03',
    lessonId: 'm03-l08',
    type: 'single',
    depth: '精通',
    question: '在 ABR 上对区域间路由做汇总，应使用哪条命令？',
    options: [
      'abr-summary 10.1.0.0 255.255.0.0',
      'asbr-summary 10.1.0.0 255.255.0.0',
      'import-route static',
      'default-route-advertise always',
    ],
    answer: [0],
    explanation:
      'ABR 使用 abr-summary 对 Type 3 区域间路由进行汇总，ASBR 则使用 asbr-summary 汇总自己引入的外部路由。汇总只影响通告给其他区域的 LSA，本地明细路由仍然保留，因此汇总范围过大可能造成流量黑洞。',
  },
];

export default list;
