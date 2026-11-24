import type { QuizQuestion } from '@/types';

const list: QuizQuestion[] = [
  {
    id: 'q-m09-01',
    moduleId: 'm09',
    type: 'single',
    depth: '熟悉',
    question: '华为防火墙默认安全区域中，Trust 区域的优先级通常是多少？',
    options: ['5', '50', '85', '100'],
    answer: [2],
    explanation:
      '华为防火墙默认安全区域优先级为 Local 100、Trust 85、DMZ 50、Untrust 5。优先级用于标识区域可信程度，跨区域流量需要安全策略放行。不同版本可能存在细微差异，配置前应以设备实际 display zone 回显为准。',
  },
  {
    id: 'q-m09-02',
    moduleId: 'm09',
    type: 'multiple',
    depth: '熟悉',
    question: '华为防火墙处理一个跨区域报文时，通常会涉及哪些环节？',
    options: ['查找会话表', '匹配安全策略', '查询路由表', '执行 NAT 策略'],
    answer: [0, 1, 2, 3],
    explanation:
      '报文进入防火墙后先查会话表，首包需要匹配安全策略并查询路由，必要时执行源 NAT 或目的 NAT，随后建立会话并转发。后续报文命中会话后可快速转发。排错时要按会话、策略、路由、NAT 的顺序逐项确认。',
  },
  {
    id: 'q-m09-03',
    moduleId: 'm09',
    type: 'single',
    depth: '精通',
    question: 'IPsec 使用 IKEv1 协商时，第一阶段和第二阶段分别建立什么？',
    options: [
      '第一阶段建立 IKE SA，第二阶段建立 IPsec SA',
      '第一阶段建立 IPsec SA，第二阶段建立 IKE SA',
      '两个阶段都只建立 IKE SA',
      '两个阶段都只建立路由会话',
    ],
    answer: [0],
    explanation:
      'IKEv1 第一阶段在协商双方之间建立 IKE SA，用于保护后续协商报文；第二阶段在 IKE SA 保护下建立 IPsec SA，定义加密、认证和感兴趣流。IKEv2 虽然报文交互不同，但同样区分 IKE SA 和 IPsec SA 两类安全联盟。',
  },
  {
    id: 'q-m09-04',
    moduleId: 'm09',
    type: 'single',
    depth: '熟悉',
    question: 'IPsec 中 AH 与 ESP 的主要区别是什么？',
    options: [
      'ESP 提供加密和认证，AH 只提供认证不提供加密',
      'AH 提供加密，ESP 只提供认证',
      '两者都只提供加密不提供认证',
      '两者都只提供压缩功能',
    ],
    answer: [0],
    explanation:
      'AH 通过认证头保护报文完整性并验证来源，但不加密数据；ESP 既能加密载荷，也能提供认证，因此实际 IPsec VPN 多采用 ESP。AH 不能穿越 NAT，因为 NAT 会修改地址破坏认证，这也是 ESP 更常用的原因之一。',
  },
  {
    id: 'q-m09-05',
    moduleId: 'm09',
    type: 'multiple',
    depth: '精通',
    question: '建立 IPsec VPN 时，两端必须协商一致的参数包括哪些？',
    options: ['加密算法', '认证算法', '预共享密钥或证书', '感兴趣流'],
    answer: [0, 1, 2, 3],
    explanation:
      'IPsec 两端需要在 IKE 阶段协商加密算法、认证算法、DH 组和认证方式，在 IPsec 阶段协商协议、加密算法和感兴趣流。任一参数不匹配都会导致第一阶段或第二阶段协商失败，排错时应逐项比对两端配置。',
  },
  {
    id: 'q-m09-06',
    moduleId: 'm09',
    type: 'boolean',
    depth: '熟悉',
    question: 'IPsec 传输模式会保护整个原始 IP 报文，包括原始 IP 头。',
    options: ['正确', '错误'],
    answer: [1],
    explanation:
      '传输模式只保护 IP 载荷，保留原始 IP 头，通常用于主机到主机通信；隧道模式会把整个原始 IP 报文封装进新的 IP 报文，从而保护原始 IP 头。站点到站点的 VPN 网关之间通常使用隧道模式，以便隐藏私网地址。',
  },
  {
    id: 'q-m09-07',
    moduleId: 'm09',
    type: 'single',
    depth: '精通',
    question: '内网访问公网同时需要经过 NAT 和 IPsec 时，常见处理方式是什么？',
    options: [
      '对 IPsec 感兴趣流配置 NAT 豁免，避免地址被转换',
      '关闭所有 NAT 功能',
      '把 IPsec 报文改成明文',
      '只保留目的 NAT，不保留源 NAT',
    ],
    answer: [0],
    explanation:
      '如果 IPsec 感兴趣流被 NAT 修改，两端协商的感兴趣流和实际报文可能不一致，导致隧道建立失败或流量无法进入隧道。通常通过 NAT 策略豁免匹配 IPsec 网段的流量，或在设计时规划好地址与策略顺序，确保先匹配正确的 NAT 规则。',
  },
  {
    id: 'q-m09-08',
    moduleId: 'm09',
    type: 'single',
    depth: '熟悉',
    question: '华为防火墙安全策略通常依据哪些要素匹配流量？',
    options: [
      '源目安全区域、源目地址、服务或应用',
      '只需要目的 MAC 地址',
      '只需要 VLAN ID',
      '只需要接口的物理编号',
    ],
    answer: [0],
    explanation:
      '安全策略通常匹配源安全区域、目的安全区域、源地址、目的地址、服务或应用、用户和时间等要素，动作包括允许和拒绝。只凭 MAC 或 VLAN 无法表达完整的访问控制意图，实际配置要遵循最小权限原则。',
  },
  {
    id: 'q-m09-09',
    moduleId: 'm09',
    type: 'boolean',
    depth: '熟悉',
    question: '状态检测防火墙会放行由内网主动发起、已经建立会话的返回流量。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      '状态检测防火墙维护会话表，内网主动发起连接后，返回报文只要命中已有会话即可放行，无需额外配置反向安全策略。这减少了策略数量，但也要求会话老化时间合理，否则长连接可能因会话超时被中断，需要调整老化参数。',
  },
  {
    id: 'q-m09-10',
    moduleId: 'm09',
    type: 'single',
    depth: '精通',
    question: '华为防火墙双机热备中，VRRP 与 HRP 的分工是什么？',
    options: [
      'VRRP 负责主备状态选举，HRP 负责会话表和配置同步',
      'VRRP 负责配置同步，HRP 负责选路',
      '两者都只负责 NAT 转换',
      '两者都只负责日志记录',
    ],
    answer: [0],
    explanation:
      'VRRP 或 VGMP 负责双机主备状态选举和流量切换，HRP 负责在设备间同步会话表、配置和部分状态信息。只有两者都正常，主设备故障时备设备才能接管并保持已有连接，因此要同时监控 VRRP 状态和 HRP 同步状态。',
  },
];

export default list;
