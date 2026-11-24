import type { QuizQuestion } from '@/types';

const list: QuizQuestion[] = [
  {
    id: 'q-m05-01',
    moduleId: 'm05',
    lessonId: 'm05-l01',
    type: 'single',
    depth: '了解',
    question: 'BGP 建立邻居时使用的传输层协议和默认端口是什么？',
    options: ['UDP 179', 'TCP 179', 'TCP 89', 'UDP 520'],
    answer: [1],
    explanation:
      'BGP 使用 TCP 179 端口建立可靠连接，再通过 Open 报文协商参数。TCP 保证报文有序可靠传输，因此 BGP 不重复实现重传机制。OSPF 使用 IP 协议号 89，RIP 才使用 UDP 520，注意区分。',
  },
  {
    id: 'q-m05-02',
    moduleId: 'm05',
    lessonId: 'm05-l01',
    type: 'single',
    depth: '熟悉',
    question: '华为设备上 eBGP 邻居的默认 TTL 值是多少？',
    options: ['1', '64', '255', '128'],
    answer: [0],
    explanation:
      'eBGP 默认 TTL 为 1，因此邻居通常要求直连；跨多跳建立 eBGP 时需要配置 peer ebgp-max-hop。iBGP 默认 TTL 为 255，但仍需要底层 IGP 提供到达对端更新源地址的路由，否则连接无法建立。',
  },
  {
    id: 'q-m05-03',
    moduleId: 'm05',
    lessonId: 'm05-l02',
    type: 'multiple',
    depth: '熟悉',
    question: '下列哪些属于 BGP 的报文类型？',
    options: ['Open', 'Update', 'Notification', 'Keepalive', 'Hello'],
    answer: [0, 1, 2, 3],
    explanation:
      'BGP 有 Open、Update、Notification、Keepalive 四种基本报文，支持路由刷新时还有 Route-refresh。Hello 是 OSPF 和 IS-IS 用来发现邻居的报文，BGP 依靠 TCP 连接和 Keepalive 维持邻居，因此不选 Hello。',
  },
  {
    id: 'q-m05-04',
    moduleId: 'm05',
    lessonId: 'm05-l02',
    type: 'single',
    depth: '熟悉',
    question: 'BGP 邻居状态机中，表示邻居关系建立完成、可以交换路由的状态是？',
    options: ['OpenSent', 'OpenConfirm', 'Established', 'Active'],
    answer: [2],
    explanation:
      'Established 是 BGP 邻居的最终稳定状态，表示 TCP 连接、Open 协商和 Keepalive 交互都已完成，可以收发 Update 路由。OpenSent 和 OpenConfirm 是中间状态，Active 表示正在尝试建立 TCP 连接，通常意味着邻居配置或可达性有问题。',
  },
  {
    id: 'q-m05-05',
    moduleId: 'm05',
    lessonId: 'm05-l03',
    type: 'single',
    depth: '精通',
    question: 'iBGP 水平分割规则的含义是什么？',
    options: [
      '从 iBGP 邻居学到的路由不再通告给其他 iBGP 邻居',
      '从 eBGP 邻居学到的路由不再通告给任何邻居',
      '所有 BGP 路由都只通告一跳',
      '只向 iBGP 邻居通告本地产生的路由',
    ],
    answer: [0],
    explanation:
      'iBGP 水平分割规定，从 iBGP 邻居学到的路由不能再传给其他 iBGP 邻居，以防止 AS 内部出现环路。这要求 iBGP 邻居全连接，或使用路由反射器、联盟来减少连接数量，因此大型网络中 RR 非常常见。',
  },
  {
    id: 'q-m05-06',
    moduleId: 'm05',
    lessonId: 'm05-l08',
    type: 'multiple',
    depth: '熟悉',
    question: '解决 iBGP 全连接问题的常见方案有哪些？',
    options: ['路由反射器', 'BGP 联盟', 'iBGP 全连接', '把 iBGP 改为 eBGP 并修改 AS 号'],
    answer: [0, 1, 2],
    explanation:
      '路由反射器通过 Cluster 和 Originator ID 反射路由，BGP 联盟把一个大 AS 划分为多个子 AS，全连接则是最直接的兜底方案。随意把 iBGP 改成 eBGP 会改变 AS 路径并引入环路风险，不是标准解法。',
  },
  {
    id: 'q-m05-07',
    moduleId: 'm05',
    lessonId: 'm05-l07',
    type: 'single',
    depth: '精通',
    question: '华为 BGP 选路中，用于控制本 AS 流量出口、在本地优先值之后比较的主要属性是哪个？',
    options: ['Local_Preference', 'AS_Path 长度', 'Origin 类型', 'MED 值'],
    answer: [0],
    explanation:
      '华为 BGP 选路在 Preferred-Value 之后优先比较 Local_Preference，数值越大越优，因此常用它控制本 AS 的流量出口。AS_Path 长度、Origin、MED 都在其后比较，调整 LP 时要保证 AS 内各设备的策略一致，避免出现绕行。',
  },
  {
    id: 'q-m05-08',
    moduleId: 'm05',
    lessonId: 'm05-l05',
    type: 'single',
    depth: '精通',
    question: 'BGP 路由的 Next_Hop 属性在 eBGP 与 iBGP 中的默认行为是什么？',
    options: [
      'eBGP 通告时通常改为自身接口地址，iBGP 默认保持不变',
      'eBGP 和 iBGP 都默认保持不变',
      'eBGP 默认保持不变，iBGP 改为自身地址',
      '两者都默认改为 0.0.0.0',
    ],
    answer: [0],
    explanation:
      'eBGP 把路由发给外部邻居时，Next_Hop 通常改为自己的接口地址；iBGP 默认保留从 eBGP 学到的 Next_Hop 不变。若 iBGP 邻居没有到达该 Next_Hop 的路由，路由会因下一跳不可达而无效，需要 next-hop-local 或底层 IGP 支持。',
  },
  {
    id: 'q-m05-09',
    moduleId: 'm05',
    lessonId: 'm05-l06',
    type: 'boolean',
    depth: '精通',
    question: 'MED 主要用于影响相邻 AS 的入口流量，默认只在相邻 AS 之间传递。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      'MED 即 Multi-Exit Discriminator，用来告诉相邻 AS 从哪个入口进入本 AS 更优。它默认不会跨多个 AS 继续传递，除非配置了相关命令。与 Local_Preference 影响本 AS 出口不同，MED 影响的是对端 AS 的入口选择。',
  },
  {
    id: 'q-m05-10',
    moduleId: 'm05',
    lessonId: 'm05-l09',
    type: 'multiple',
    depth: '精通',
    question: 'BGP 用于防止路由环路的机制包括哪些？',
    options: ['AS_Path 中看到本 AS 号则丢弃', 'iBGP 水平分割', '路由反射器的 Originator ID 与 Cluster List', '依靠 STP 阻塞冗余链路'],
    answer: [0, 1, 2],
    explanation:
      'AS_Path 防止 AS 间环路，iBGP 水平分割防止 AS 内 iBGP 环路，路由反射器再用 Originator ID 和 Cluster List 防止簇内反射环路。STP 工作在二层，解决的是以太网物理环路和广播风暴，与 BGP 路由环路无关。',
  },
  {
    id: 'q-m05-11',
    moduleId: 'm05',
    lessonId: 'm05-l05',
    type: 'single',
    depth: '熟悉',
    question: 'BGP Origin 属性的三种取值中，优先级最高的是哪一种？',
    options: ['IGP', 'EGP', 'Incomplete', '三者优先级相同'],
    answer: [0],
    explanation:
      'Origin 属性表示路由来源，优先级从高到低为 IGP、EGP、Incomplete。IGP 表示由 network 命令精确引入，EGP 来自旧式 EGP，Incomplete 通常由 import-route 引入。Origin 在 AS_Path 之后比较，影响的是同一阶段的选路结果。',
  },
];

export default list;
