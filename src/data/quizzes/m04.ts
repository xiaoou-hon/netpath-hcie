import type { QuizQuestion } from '@/types';

const list: QuizQuestion[] = [
  {
    id: 'q-m04-01',
    moduleId: 'm04',
    lessonId: 'm04-l01',
    type: 'single',
    depth: '熟悉',
    question: '华为 IS-IS 的 NET 地址中，最后一位 SEL 通常取值是什么？',
    options: ['00', '01', '10', 'FF'],
    answer: [0],
    explanation:
      'NET 由区域地址、System ID 和 SEL 三部分组成，SEL 相当于网络层服务标识，在 IP 网络中固定为 00。System ID 固定 6 字节，必须全网唯一，区域地址则用于标识 Level-1 区域，规划时不要随意改动已有 NET。',
  },
  {
    id: 'q-m04-02',
    moduleId: 'm04',
    lessonId: 'm04-l01',
    type: 'single',
    depth: '熟悉',
    question: 'IS-IS 的 System ID 默认长度是多少？',
    options: ['2 字节', '4 字节', '6 字节', '8 字节'],
    answer: [2],
    explanation:
      'IS-IS 的 System ID 固定为 6 字节，通常用十六进制书写，例如 0000.0000.0001。它相当于路由器的身份标识，在同一区域内必须唯一。NET 中的区域地址长度可变，但 System ID 和 SEL 的长度是固定的。',
  },
  {
    id: 'q-m04-03',
    moduleId: 'm04',
    lessonId: 'm04-l01',
    type: 'single',
    depth: '精通',
    question: 'IS-IS 在广播网络上选举 DIS 时，首先比较什么？',
    options: ['接口优先级，优先级高者当选', '接口 IP 地址，地址小者当选', '到根桥的开销，开销小者当选', 'Router-ID，数值小者当选'],
    answer: [0],
    explanation:
      'IS-IS 先比较接口优先级，优先级高者成为 DIS，优先级相同再比较 MAC 地址，地址大者当选。DIS 与 OSPF 的 DR 类似，但没有 Backup DIS，且新设备优先级更高时可以立即抢占，这是两者容易被混淆的差异点。',
  },
  {
    id: 'q-m04-04',
    moduleId: 'm04',
    lessonId: 'm04-l04',
    type: 'multiple',
    depth: '熟悉',
    question: '下列哪些属于 IS-IS 使用的 PDU 类型？',
    options: ['IIH', 'LSP', 'CSNP', 'PSNP', 'LSU'],
    answer: [0, 1, 2, 3],
    explanation:
      'IS-IS 使用 IIH 建立和维持邻居，使用 LSP 携带链路状态信息，使用 CSNP 和 PSNP 完成数据库同步与确认。LSU 是 OSPF 的报文类型，不要与 IS-IS 的 LSP 混淆，两者名称相近但所属协议不同。',
  },
  {
    id: 'q-m04-05',
    moduleId: 'm04',
    lessonId: 'm04-l02',
    type: 'single',
    depth: '精通',
    question: 'IS-IS Level-1 路由器访问其他区域时，主要依靠什么信息？',
    options: [
      'Level-1-2 路由器下发的 ATT 位及默认路由',
      'Level-2 路由器下发的 Type 5 LSA',
      'DIS 选举结果中的优先级',
      'CSNP 报文中的区域号',
    ],
    answer: [0],
    explanation:
      'Level-1-2 路由器连接 Level-1 和 Level-2，会在 Level-1 LSP 中置位 ATT 位，提示 Level-1 路由器存在通往其他区域的出口。Level-1 路由器据此生成指向最近的 Level-1-2 路由器的默认路由，实现跨区域访问。',
  },
  {
    id: 'q-m04-06',
    moduleId: 'm04',
    lessonId: 'm04-l02',
    type: 'boolean',
    depth: '精通',
    question: 'IS-IS Level-1-2 路由器会向 Level-1 区域通告 ATT 位，用于指示默认路由出口。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      'ATT 位即 Attach Bit，由 Level-1-2 路由器在 Level-1 LSP 中设置，表示该设备可以通往 Level-2 或其他区域。Level-1 路由器收到后会生成默认路由，指向通告 ATT 位的最近设备，这是 IS-IS 区域间通信的关键机制。',
  },
  {
    id: 'q-m04-07',
    moduleId: 'm04',
    lessonId: 'm04-l01',
    type: 'boolean',
    depth: '熟悉',
    question: 'IS-IS 在广播网络上会同时选举 DIS 和 Backup DIS，以保证主备切换。',
    options: ['正确', '错误'],
    answer: [1],
    explanation:
      'IS-IS 只选举 DIS，没有 Backup DIS；OSPF 才有 DR 和 BDR 的备份机制。DIS 失效后，其他路由器会重新选举，期间数据库同步可能短暂受影响。两者的选举规则和抢占行为不同，比较时不能直接套用。',
  },
  {
    id: 'q-m04-08',
    moduleId: 'm04',
    lessonId: 'm04-l04',
    type: 'single',
    depth: '熟悉',
    question: '在华为设备上为 IS-IS 进程 1 配置 NET，正确的命令是？',
    options: [
      'network-entity 49.0001.0000.0000.0001.00',
      'router-id 49.0001.0000.0000.0001.00',
      'isis net 49.0001.0000.0000.0001.00',
      'net 49.0001.0000.0000.0001.00',
    ],
    answer: [0],
    explanation:
      '在 isis 1 视图下使用 network-entity 命令配置 NET，格式为区域地址加 System ID 加 SEL，例如 49.0001.0000.0000.0001.00。router-id 用于其他协议标识设备，isis net 和 net 都不是华为 VRP 的正确命令形式。',
  },
  {
    id: 'q-m04-09',
    moduleId: 'm04',
    lessonId: 'm04-l03',
    type: 'multiple',
    depth: '精通',
    question: '关于 IS-IS 与 OSPF 的差异，下列说法正确的有哪些？',
    options: [
      'IS-IS 直接运行在链路层，OSPF 运行在 IP 之上',
      'IS-IS 使用 TLV 结构扩展，OSPF 使用 LSA 类型扩展',
      'IS-IS 有 Level-1、Level-2 层次，OSPF 有区域层次',
      'IS-IS 在广播网有 Backup DIS，OSPF 没有 BDR',
    ],
    answer: [0, 1, 2],
    explanation:
      'IS-IS 基于 CLNS 直接封装在链路层，使用 TLV 灵活扩展；OSPF 封装在 IP 协议号 89 之上，通过 LSA 类型扩展。IS-IS 只选举 DIS 没有备份，OSPF 才有 DR 和 BDR，因此第四项把两者说反了，不能选。',
  },
  {
    id: 'q-m04-10',
    moduleId: 'm04',
    lessonId: 'm04-l03',
    type: 'single',
    depth: '精通',
    question: '从 OSPF 迁移到 IS-IS 时，为避免次优路径，通常应重点调整什么？',
    options: ['两种协议的优先级，保证优选路径一致', '接口的 MTU，保证分片一致', 'VLAN ID，保证广播域一致', 'TCP 端口号，保证会话一致'],
    answer: [0],
    explanation:
      'OSPF 与 IS-IS 默认优先级不同，双协议共存时可能导致流量走向与设计不一致。迁移阶段要统一规划协议优先级，让主用协议的路由被优选，同时保持双向可达，待邻居和路由稳定后再逐步撤销旧协议。',
  },
];

export default list;
