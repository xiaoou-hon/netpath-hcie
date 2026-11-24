import type { QuizQuestion } from '@/types';

const list: QuizQuestion[] = [
  {
    id: 'q-m19-01',
    moduleId: 'm19',
    lessonId: 'm19-l01',
    type: 'single',
    depth: '熟悉',
    question: 'SDN 相对于传统分布式网络，最核心的改变是什么？',
    options: [
      '把所有设备换成同一厂商的产品',
      '将控制面从设备中抽离，由控制器统一计算并通过南向接口下发',
      '取消路由协议，全部改用静态路由',
      '只在管理面增加一个网管平台',
    ],
    answer: [1],
    explanation:
      'SDN 的核心是控制面与转发面分离：控制器掌握全局拓扑与策略，统一计算路径并生成转发表，设备只按表转发。这样能获得全网视角、批量一致变更与业务意图编排。它并不要求设备同厂商，也不等于全部静态路由；只增加网管平台而设备仍各自算路，属于传统管理面增强，不是 SDN 的控制面集中。',
  },
  {
    id: 'q-m19-02',
    moduleId: 'm19',
    lessonId: 'm19-l01',
    type: 'multiple',
    depth: '熟悉',
    question: '关于 SDN 的层次与接口，下列说法正确的有哪些？',
    options: [
      '北向接口面向上层编排与业务系统，常用 REST API',
      '南向接口连接控制器与设备，可用 NETCONF、OpenFlow 或 gRPC',
      '控制面负责全局拓扑收集与路径计算',
      '转发面负责运行 BGP 并与邻居协商路由',
    ],
    answer: [0, 1, 2],
    explanation:
      'SDN 通常分为管理面、控制面与转发面：管理面做业务编排与策略定义，通过北向 REST 接口调用控制器；控制面收集拓扑、计算路径并生成表项；南向接口承载控制器与设备之间的配置与表项下发，常见 NETCONF/YANG、OpenFlow 与 gRPC。转发面只负责按表转发、计数与告警，BGP 邻居协商属于控制面功能，在 SDN 中通常上移到控制器。',
  },
  {
    id: 'q-m19-03',
    moduleId: 'm19',
    lessonId: 'm19-l02',
    type: 'single',
    depth: '精通',
    question: 'VXLAN 能够支撑大规模多租户网络的关键原因是什么？',
    options: [
      '使用 12 位 VLAN ID，兼容现有交换机',
      '使用 24 位 VNI 标识租户，并通过 UDP 封装跨越三层网络',
      '使用 MPLS 标签栈替代以太网帧',
      '依赖生成树避免环路',
    ],
    answer: [1],
    explanation:
      'VXLAN 用 24 位 VNI 标识租户，可用数量远大于 VLAN 的 12 位，同时把原始二层帧封装进 UDP 与 IP，VTEP 之间跨越三层网络转发，不再受生成树拓扑限制。中间网络只按外层 IP 转发，可通过等价多路径提升链路利用率。VLAN 与生成树是 VXLAN 试图解决的规模瓶颈，不是它的优势；使用 MPLS 标签栈的是其他 Overlay 方案。',
  },
  {
    id: 'q-m19-04',
    moduleId: 'm19',
    lessonId: 'm19-l02',
    type: 'multiple',
    depth: '精通',
    question: '关于 BGP EVPN 的常用路由类型，下列说法正确的有哪些？',
    options: [
      'Type 2 通告 MAC 与 IP 可达性，可用于 ARP 抑制',
      'Type 3 通告 VTEP 与 VNI，用于自动发现与指导泛洪',
      'Type 5 通告 IP 前缀路由，支持跨子网三层互通',
      'Type 2 只用于通告路由器 Loopback 地址',
    ],
    answer: [0, 1, 2],
    explanation:
      'EVPN 用不同类型承载不同可达性信息：Type 2 携带 MAC、IP、VNI 与下一跳 VTEP，是主机 MAC 与 ARP 学习的基础，也支持 ARP 抑制；Type 3 是包含组播路由，用于同 VNI 的 VTEP 自动发现；Type 5 是 IP 前缀路由，用于跨子网转发与分布式网关。Type 2 描述的是主机或 MAC/IP 绑定，不是路由器 Loopback 地址。',
  },
  {
    id: 'q-m19-05',
    moduleId: 'm19',
    lessonId: 'm19-l02',
    type: 'single',
    depth: '精通',
    question: 'VXLAN 数据中心采用分布式网关时，主机跨子网访问的转发特点是什么？',
    options: [
      '所有跨子网流量都必须绕行一对集中式网关',
      '每台 Leaf 都配置统一的网关 IP 与虚拟 MAC，由本 Leaf 直接路由并封装到目的 VTEP',
      '由核心交换机统一做 NAT 后转发',
      '必须关闭 EVPN，改用静态 MAC 表',
    ],
    answer: [1],
    explanation:
      '分布式网关让每台 Leaf 都具备租户网关能力，使用统一的网关 IP 与虚拟 MAC，只对本机下挂主机应答 ARP。跨子网首包由本 Leaf 直接路由并封装到目的 VTEP，路径最短，网关不再是集中带宽瓶颈。代价是每台 Leaf 都要维护一致的 VRF、VNI 与网关配置。集中式网关是另一种设计，会让流量绕行，与分布式网关的优化目标相反。',
  },
  {
    id: 'q-m19-06',
    moduleId: 'm19',
    lessonId: 'm19-l03',
    type: 'single',
    depth: '熟悉',
    question: '服务链中的流量出现非对称路径，最可能导致什么问题？',
    options: [
      '设备 CPU 立即损坏',
      '有状态网元的会话表对不上，连接建立后中断或大流量随机失败',
      '所有报文自动转为组播',
      'VXLAN 的 VNI 冲突',
    ],
    answer: [1],
    explanation:
      '防火墙、负载均衡等网元维护会话状态，若去程经过实例 A、回程经过实例 B，回程报文找不到对应会话，会被丢弃或触发重建，表现为连接建立后立即断开、长连接随机中断。解决办法是让双向流量经过同一组网元，或做会话同步与一致性哈希。非对称路径不会造成硬件损坏，也与 VNI 冲突没有直接关系。',
  },
  {
    id: 'q-m19-07',
    moduleId: 'm19',
    lessonId: 'm19-l03',
    type: 'multiple',
    depth: '熟悉',
    question: '以下哪些可以作为 NFV 服务链的引流方式？',
    options: [
      '在入口设备上配置策略路由，把匹配流量重定向到 vFW',
      '通过 VLAN 把流量引到指定网元再送回',
      '在 SRv6 域边界用 SID 列表编排服务链',
      '通过修改 DNS 记录把流量引到 vFW',
    ],
    answer: [0, 1, 2],
    explanation:
      '服务链的本质是让流量按顺序经过一组网元，常见引流方式包括策略路由、VLAN 引流与 SRv6 服务链。策略路由直观但需维护 ACL 与下一跳；VLAN 引流简单但占用标识且跨域困难；SRv6 可显式编排、支持跨域。修改 DNS 只会改变域名解析结果，无法保证流量经过指定网元，也不能控制回程路径，不属于服务链引流手段。',
  },
  {
    id: 'q-m19-08',
    moduleId: 'm19',
    lessonId: 'm19-l04',
    type: 'single',
    depth: '精通',
    question: 'SRv6 中 Locator 的主要作用是什么？',
    options: [
      '标识租户的 VLAN ID',
      '作为 SID 的高位前缀，由 IGP 通告以保证 SID 在网络中可达',
      '存放 IPSec 的预共享密钥',
      '替代 BGP 通告 IPv4 前缀',
    ],
    answer: [1],
    explanation:
      'SRv6 SID 是 128 位 IPv6 地址，高位是 Locator，低位是 Function 与参数。Locator 由 IGP 在域内通告，使其他节点能把以该前缀为目的的报文路由到执行节点，因此 Locator 可达性是 SRv6 的基础。它不承载租户 VLAN、也不存放密钥，虽然可以与 BGP 配合分发 VPN 路由，但本身不能替代 BGP 的 IPv4 前缀通告功能。',
  },
  {
    id: 'q-m19-09',
    moduleId: 'm19',
    lessonId: 'm19-l04',
    type: 'multiple',
    depth: '精通',
    question: '关于 SRv6 的 SRH 与 End 行为，下列说法正确的有哪些？',
    options: [
      'SRH 是 IPv6 段路由扩展头，携带有序的 SID 列表',
      'End 行为通常把外层目的地址更新为下一个 SID，并将段剩余数减一',
      'End.DT4 表示解封装后按 IPv4 路由表转发',
      'SRv6 BE 必须在 SRH 中写入完整显式路径才能转发',
    ],
    answer: [0, 1, 2],
    explanation:
      'SRH 是 SRv6 的段路由头，携带段列表、段剩余数与可选 TLV，节点按段列表逐跳处理。End 是最基础的行为，更新目的地址并递减段剩余数；End.X 额外指定出链路；End.DT4 解封装后查 IPv4 表，用于 VPN 站点。SRv6 BE 不携带显式段列表，只把外层目的地址设为远端 SID，跟随 IGP 最短路径转发，只有 TE Policy 才需要显式段列表。',
  },
  {
    id: 'q-m19-10',
    moduleId: 'm19',
    lessonId: 'm19-l05',
    type: 'single',
    depth: '精通',
    question: '跨域 SRv6 TE Policy 中，Binding SID 的作用是什么？',
    options: [
      '作为整个策略的引流入口，把匹配流量绑定到对应的候选路径与段列表',
      '用于标识底层链路的 MTU',
      '替代 BGP 的 Router ID',
      '为每个租户分配 MAC 地址',
    ],
    answer: [0],
    explanation:
      'Binding SID 是 TE Policy 对外的稳定入口，业务或上游域只需把流量引到该 SID，头端就会按策略选择候选路径并封装对应段列表，从而实现跨域路径拼接与屏蔽内部细节。它不表示 MTU、Router ID 或 MAC 地址。规划时要保证 Binding SID 属于本域可通告的前缀，并在边界设备上正确生效，否则跨域流量会在入口被丢弃。',
  },
];

export default list;
