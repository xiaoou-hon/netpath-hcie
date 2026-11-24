import type { QuizQuestion } from '@/types';

const list: QuizQuestion[] = [
  {
    id: 'q-m07-01',
    moduleId: 'm07',
    lessonId: 'm07-l01',
    type: 'single',
    depth: '熟悉',
    question: 'VRRP 使用的虚拟 MAC 地址格式是什么？',
    options: ['0000-5e00-01XX，XX 为 VRID', '0000-0c07-acXX，XX 为 VRID', 'FFFF-FFFF-FFFF', '00e0-fc00-0001'],
    answer: [0],
    explanation:
      'VRRP 虚拟 MAC 地址格式为 0000-5e00-01XX，最后一段由 VRID 决定，同一备份组的主备设备使用相同虚拟 MAC。终端把网关 MAC 学成虚拟 MAC，主备切换后无需重新 ARP，因此能快速恢复转发，这是 VRRP 网关高可用的关键。',
  },
  {
    id: 'q-m07-02',
    moduleId: 'm07',
    lessonId: 'm07-l01',
    type: 'single',
    depth: '熟悉',
    question: 'VRRP 默认优先级和可配置范围分别是什么？',
    options: ['默认 100，范围 1 到 254', '默认 1，范围 1 到 255', '默认 255，范围 0 到 255', '默认 60，范围 1 到 100'],
    answer: [0],
    explanation:
      'VRRP 优先级默认 100，可配置范围为 1 到 254，数值越大越优先。255 保留给虚拟 IP 地址拥有者，0 用于设备主动放弃 Master 角色。配置主备时通常把 Master 设为 120 左右，便于后续调整和跟踪上行接口。',
  },
  {
    id: 'q-m07-03',
    moduleId: 'm07',
    lessonId: 'm07-l01',
    type: 'multiple',
    depth: '熟悉',
    question: 'VRRP 设备的三种状态包括哪些？',
    options: ['Initialize', 'Master', 'Backup', 'Listening'],
    answer: [0, 1, 2],
    explanation:
      'VRRP 只有 Initialize、Master、Backup 三种状态，Initialize 表示未参与备份组，Master 负责转发虚拟网关流量，Backup 监听 Master 报文并准备接管。Listening 是 STP 的端口状态，不属于 VRRP，注意不要混淆。',
  },
  {
    id: 'q-m07-04',
    moduleId: 'm07',
    lessonId: 'm07-l01',
    type: 'boolean',
    depth: '精通',
    question: 'VRRP 配置抢占延迟可以避免上行接口恢复后主备频繁切换。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      '当 Master 的上行接口抖动时，优先级会随跟踪状态变化，可能引发反复抢占。配置抢占延迟后，设备会等待一段时间再重新成为 Master，给上行链路留出稳定时间。延迟值要大于上行接口恢复所需时间，否则保护效果有限。',
  },
  {
    id: 'q-m07-05',
    moduleId: 'm07',
    lessonId: 'm07-l02',
    type: 'single',
    depth: '熟悉',
    question: 'BFD 的主要作用是什么？',
    options: [
      '提供毫秒级的链路或路径故障检测',
      '为终端自动分配 IP 地址',
      '在交换机之间选举根桥',
      '对 BGP 路由进行汇总',
    ],
    answer: [0],
    explanation:
      'BFD 是一种轻量级双向转发检测协议，通过快速发送检测报文在毫秒级发现链路故障，常与 VRRP、OSPF、BGP、静态路由联动触发切换。它不负责地址分配、根桥选举或路由汇总，只解决故障检测速度问题。',
  },
  {
    id: 'q-m07-06',
    moduleId: 'm07',
    lessonId: 'm07-l03',
    type: 'single',
    depth: '精通',
    question: '在 MPLS 转发过程中，LER 和 LSR 的主要分工是什么？',
    options: [
      'LER 负责压入或弹出标签，LSR 负责标签交换',
      'LER 负责标签交换，LSR 负责压入标签',
      '两者都只做 IP 最长匹配转发',
      'LER 只处理 IPv6，LSR 只处理 IPv4',
    ],
    answer: [0],
    explanation:
      'LER 位于 MPLS 域边缘，入口 LER 压入标签，出口 LER 弹出标签；LSR 位于域内，根据标签转发表交换标签并转发。标签交换不需要逐跳查 IP 路由表，因此能提高转发效率，并支撑 VPN、流量工程等业务。',
  },
  {
    id: 'q-m07-07',
    moduleId: 'm07',
    lessonId: 'm07-l04',
    type: 'single',
    depth: '精通',
    question: 'MPLS L3VPN 中 RD 与 RT 的作用分别是什么？',
    options: [
      'RD 用于区分不同 VPN 的相同地址前缀，RT 控制 VPN 路由的导入导出',
      'RD 控制路由导入导出，RT 用于区分地址前缀',
      '两者都用于加密 VPN 流量',
      '两者都用于分配 MPLS 标签',
    ],
    answer: [0],
    explanation:
      'RD 加在 IPv4 前缀前形成 VPNv4 地址，使不同 VPN 中相同的私网地址能够被区分；RT 作为扩展团体属性，决定路由被哪些 VRF 导入和导出。标签分配由 LDP 或 MP-BGP 完成，与 RD、RT 的职责不同。',
  },
  {
    id: 'q-m07-08',
    moduleId: 'm07',
    lessonId: 'm07-l04',
    type: 'multiple',
    depth: '熟悉',
    question: 'MPLS L3VPN 的核心组成包括哪些？',
    options: ['VRF', 'RD', 'RT', 'MP-BGP'],
    answer: [0, 1, 2, 3],
    explanation:
      'VRF 隔离不同 VPN 的路由表和接口，RD 保证相同前缀可区分，RT 控制路由导入导出，MP-BGP 在 PE 之间传递 VPNv4 路由。四者配合完成私网路由的隔离与传递，缺少任一环节都可能导致 VPN 路由无法正常学习。',
  },
  {
    id: 'q-m07-09',
    moduleId: 'm07',
    lessonId: 'm07-l03',
    type: 'boolean',
    depth: '熟悉',
    question: 'MPLS 标签栈遵循后进先出原则，外层标签先被处理。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      'MPLS 标签栈按后进先出方式处理，报文到达时最外层标签位于栈顶，先被转发平面读取和交换。外层标签通常用于隧道转发，内层标签标识业务或 VPN。理解标签栈顺序有助于分析 L3VPN 和标签转发异常。',
  },
  {
    id: 'q-m07-10',
    moduleId: 'm07',
    lessonId: 'm07-l06',
    type: 'single',
    depth: '了解',
    question: 'SRv6 中用于标识网络功能或路径的标识称为什么？',
    options: ['SID', 'VNI', 'RD', 'DSCP'],
    answer: [0],
    explanation:
      'SRv6 使用 Segment Identifier 即 SID 标识网络节点或功能，SID 本身是 IPv6 地址形式，可以编码在段列表中指导转发。VNI 用于 VXLAN 租户标识，RD 用于 VPN 路由区分，DSCP 用于 QoS 分类，概念不能混用。',
  },
];

export default list;
