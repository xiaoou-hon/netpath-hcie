import type { QuizQuestion } from '@/types';

const list: QuizQuestion[] = [
  {
    id: 'q-m10-01',
    moduleId: 'm10',
    type: 'single',
    depth: '熟悉',
    question: 'VXLAN 封装通常使用哪个 UDP 目的端口？',
    options: ['4789', '5246', '179', '4500'],
    answer: [0],
    explanation:
      'VXLAN 使用 UDP 4789 作为默认目的端口，在 UDP 头之后是 8 字节 VXLAN 头和原始以太网帧。5246 是 CAPWAP 控制端口，179 是 BGP，4500 常用于 IPsec NAT 穿越，配置防火墙时不要混淆这些端口。',
  },
  {
    id: 'q-m10-02',
    moduleId: 'm10',
    type: 'single',
    depth: '熟悉',
    question: 'VXLAN 中 VTEP 的主要功能是什么？',
    options: [
      '对 VXLAN 报文进行封装和解封装',
      '为终端分配 IP 地址',
      '选举生成树根桥',
      '在 OSPF 中选举 DR',
    ],
    answer: [0],
    explanation:
      'VTEP 是 VXLAN 隧道端点，负责把原始二层帧封装进 VXLAN 和 UDP 报文，并在对端解封装还原。VTEP 可以是物理交换机或虚拟交换机，其 IP 地址用于确定隧道起点和终点，底层网络必须能够路由到对端 VTEP 地址。',
  },
  {
    id: 'q-m10-03',
    moduleId: 'm10',
    type: 'multiple',
    depth: '熟悉',
    question: 'VXLAN 相比传统 VLAN 的优势包括哪些？',
    options: [
      'VNI 数量远大于 VLAN ID',
      '可以在三层网络上构建大二层',
      '支持多租户隔离',
      '彻底消除了广播流量',
    ],
    answer: [0, 1, 2],
    explanation:
      'VXLAN 使用 24 位 VNI，数量约 1600 万，远大于 VLAN 的 4094 个；通过 UDP 隧道可以在三层网络上承载二层流量，并支持多租户隔离。VXLAN 仍然存在 BUM 流量，只是通过头端复制或组播等方式转发，并没有消除广播。',
  },
  {
    id: 'q-m10-04',
    moduleId: 'm10',
    type: 'single',
    depth: '精通',
    question: 'EVPN 中用于通告 MAC 地址和 IP 地址的路由类型是？',
    options: ['Type 2', 'Type 1', 'Type 3', 'Type 5'],
    answer: [0],
    explanation:
      'EVPN Type 2 是 MAC/IP Advertisement 路由，用于通告 MAC 地址及可选的 IP 地址，是实现二层桥接和分布式网关的关键。Type 1 用于以太网自动发现，Type 3 用于包含性组播，Type 5 用于 IP 前缀路由，各类型职责不同。',
  },
  {
    id: 'q-m10-05',
    moduleId: 'm10',
    type: 'single',
    depth: '精通',
    question: 'EVPN 的 Type 3 路由主要用于什么？',
    options: [
      '建立 BUM 流量的包含性组播转发关系',
      '通告 MAC 地址表项',
      '通告 IP 前缀路由',
      '建立以太网段',
    ],
    answer: [0],
    explanation:
      'Type 3 是 Inclusive Multicast Ethernet Tag 路由，用于 VTEP 之间建立 BUM 流量的转发关系，实现头端复制列表。它不负责 MAC 或 IP 前缀通告，Type 2 才负责 MAC/IP，Type 5 负责 IP 前缀，Type 4 用于以太网段发现。',
  },
  {
    id: 'q-m10-06',
    moduleId: 'm10',
    type: 'boolean',
    depth: '熟悉',
    question: 'VXLAN 采用 MAC-in-UDP 封装方式，将原始二层帧封装在 UDP 报文中传输。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      'VXLAN 将原始以太网帧完整封装在 VXLAN 头、UDP 头、IP 头和外层以太网头中，属于 MAC-in-UDP 封装。外层 IP 网络负责把报文送到对端 VTEP，内层二层帧保持不变，因此可以在不同数据中心之间延伸二层域。',
  },
  {
    id: 'q-m10-07',
    moduleId: 'm10',
    type: 'single',
    depth: '熟悉',
    question: 'Spine-Leaf 架构中，Leaf 交换机通常与谁互联？',
    options: ['所有 Spine 交换机', '只与一台 Leaf 互联', '只与终端互联', '只与防火墙互联'],
    answer: [0],
    explanation:
      'Spine-Leaf 是典型的两层 CLOS 架构，每台 Leaf 与所有 Spine 互联，Leaf 之间不直接互联，从而保证任意两台 Leaf 之间只有固定跳数。这种结构便于横向扩展和部署 ECMP，适合数据中心东西向流量为主的特点。',
  },
  {
    id: 'q-m10-08',
    moduleId: 'm10',
    type: 'multiple',
    depth: '精通',
    question: '关于 VXLAN 分布式网关与集中式网关，下列说法正确的有哪些？',
    options: [
      '分布式网关把网关部署在每台 Leaf 上，转发路径更短',
      '集中式网关把网关集中在少数设备上，容易形成瓶颈',
      '分布式网关可以减少跨 Leaf 的三层绕行',
      '集中式网关不需要任何路由配置',
    ],
    answer: [0, 1, 2],
    explanation:
      '分布式网关在每台 Leaf 上部署 VXLAN 网关，终端跨网段通信可以在本地 Leaf 完成三层转发，路径短且扩展性好。集中式网关把网关集中在少数设备上，流量容易汇聚成瓶颈。两种方式都需要底层路由和 EVPN 配合，集中式同样需要路由配置。',
  },
  {
    id: 'q-m10-09',
    moduleId: 'm10',
    type: 'boolean',
    depth: '熟悉',
    question: 'VXLAN 的 VNI 与 VLAN ID 一一绑定，因此最多只能支持 4094 个租户。',
    options: ['正确', '错误'],
    answer: [1],
    explanation:
      'VNI 是 24 位标识，理论上可支持约 1600 万个租户，远多于 VLAN ID 的 4094 个。VNI 与 VLAN 之间通常通过映射建立对应关系，但不是一一绑定且数量不受 VLAN 上限限制。VXLAN 正是为解决 VLAN 数量不足而设计的。',
  },
  {
    id: 'q-m10-10',
    moduleId: 'm10',
    type: 'single',
    depth: '精通',
    question: 'VXLAN 中对称 IRB 网关的主要特点是什么？',
    options: [
      '入方向和出方向网关可以不同，统一用 L3 VNI 承载三层流量',
      '所有流量必须绕行到同一台集中网关',
      '只支持二层转发，不支持三层',
      '必须关闭 EVPN 才能使用',
    ],
    answer: [0],
    explanation:
      '对称 IRB 中，入口 Leaf 完成三层转发后使用 L3 VNI 封装，出口 Leaf 解封装后再转发到目的 VNI，两端网关角色可以不同。相比非对称 IRB，它不要求出口保留源 VNI，扩展性和一致性更好，是分布式网关常用的部署方式。',
  },
  {
    id: 'q-m10-11',
    moduleId: 'm10',
    type: 'single',
    depth: '熟悉',
    question: 'VXLAN 网络中 Underlay 网络的主要职责是什么？',
    options: [
      '为 VTEP 之间提供三层可达的 IP 转发路径',
      '为终端分配 VNI',
      '负责 EVPN 路由反射',
      '为无线 AP 提供 CAPWAP 隧道',
    ],
    answer: [0],
    explanation:
      'Underlay 是底层物理网络，负责 VTEP 地址之间的三层可达和负载分担，通常使用 OSPF、IS-IS 或 BGP 构建。VNI 分配、EVPN 路由反射属于 Overlay 控制平面职责，CAPWAP 则是无线接入协议，不属于 VXLAN Underlay。',
  },
];

export default list;
