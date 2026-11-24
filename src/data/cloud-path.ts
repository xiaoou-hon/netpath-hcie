/**
 * 云网转型路线数据（传统网络 → 云网络）
 * ------------------------------------------------------------------
 * 页面只消费本文件与 curriculum 的查询结果：模块内容由 import.meta.glob 自动聚合，
 * 本文件用模块 id 字符串表达关联关系，模块尚未落地时页面降级显示 id。
 */

import type { ModuleMeta } from '@/types';
import { modules } from '@/data/curriculum';

/* ------------------------------- 衔接映射 ------------------------------- */

export interface CloudMappingRow {
  /** 传统网络中的既有知识点 */
  traditional: string;
  /** 云网络中的对应落点 */
  cloud: string;
  /** 迁移要点：哪里能直接复用、哪里必须换思路 */
  note: string;
  /** 关联模块 id */
  moduleIds: string[];
}

export const cloudMappings: CloudMappingRow[] = [
  {
    traditional: 'VLAN / VRF',
    cloud: 'VPC / 子网 / 路由表',
    note:
      'VLAN 隔离二层广播域、VRF 隔离路由实例；云上用 VPC 承载独立地址空间与路由表，子网再按可用区切分。VPC 之间默认不同，必须用对等连接或企业路由显式打通。',
    moduleIds: ['m16', 'm17'],
  },
  {
    traditional: 'STP / 堆叠 / 链路聚合',
    cloud: '多可用区 / ELB',
    note:
      '云上不暴露二层环路，冗余从「阻塞端口 + 堆叠」转为「多 AZ 部署 + ELB 健康检查」。要关注跨 AZ 时延、ELB 跨 AZ 转发与后端权重，而不是端口角色选举。',
    moduleIds: ['m17', 'm22'],
  },
  {
    traditional: 'OSPF / BGP',
    cloud: '云路由表 / 企业路由 / CEN / Transit Gateway',
    note:
      'VPC 内路由表只做静态条目与最长前缀匹配，不能跑 OSPF；跨 VPC、跨地域、入 IDC 分别由对等连接、企业路由、CEN 或 Transit Gateway 承担，BGP 只出现在专线/VPN 与云骨干边界。',
    moduleIds: ['m17', 'm19', 'm21'],
  },
  {
    traditional: 'ACL / 防火墙策略',
    cloud: '安全组 / 网络 ACL',
    note:
      '安全组是有状态、实例级的白名单，源可以直接引用另一个安全组；NACL 是无状态、子网级的，进出方向必须分别写规则。传统 ACL 的「通配符 + 反掩码」思维要改成「默认拒绝 + 最小放行」。',
    moduleIds: ['m20'],
  },
  {
    traditional: 'NAT / NAT Server',
    cloud: 'NAT 网关 / EIP',
    note:
      'SNAT 出网由 NAT 网关承担，DNAT 入网通常落到 ELB 或 EIP 一对一绑定。要提前算端口耗尽、并发连接数与带宽上限，云上 NAT 不是「配一条 nat outbound 就完事」。',
    moduleIds: ['m17', 'm20'],
  },
  {
    traditional: 'MPLS VPN',
    cloud: '云专线 / IPsec VPN',
    note:
      '专线给稳定时延与独占带宽，VPN 走公网加密、成本低但抖动大，生产上常做主备双通道。云侧与 IDC 侧仍可用 BGP 交换路由，重点是网段不重叠与路由收敛时间。',
    moduleIds: ['m19', 'm21'],
  },
  {
    traditional: 'VXLAN / EVPN',
    cloud: '云 Overlay 网络',
    note:
      '云厂商在 Underlay IP 网上用 Overlay 承载多租户隔离，VNI 对应租户或虚拟网络，EVPN 作控制面通告 MAC/IP。理解封装、MTU 与控制面，就能看懂云网络「为什么能大规模隔离」。',
    moduleIds: ['m19'],
  },
  {
    traditional: 'DNS / DHCP',
    cloud: '私网 DNS / CoreDNS / 元数据服务',
    note:
      '云上私网域名由 VPC 内网 DNS 解析，容器内 Service 名由 CoreDNS 承接。要关注自定义 DNS 转发、search 域与 ndots 设置，排障时先分清「解析不到」还是「解析到了但连不通」。',
    moduleIds: ['m17', 'm18'],
  },
  {
    traditional: 'Telemetry / SNMP',
    cloud: '云监控 / VPC 流日志',
    note:
      'SNMP 轮询被指标、日志与流日志取代：Telemetry 推送性能数据，VPC 流日志记录五元组用于审计与排障。注意采样率、日志存储成本与保留周期，别把全量流日志当默认选项。',
    moduleIds: ['m21', 'm22'],
  },
  {
    traditional: 'QoS / 流量整形',
    cloud: '带宽包 / 限速策略',
    note:
      '云上 QoS 主要表现为 EIP 与共享带宽的上限、ELB 限速与实例规格带宽，无法像本地设备那样精细调度队列。保障要靠带宽包、限速与架构分流，而不是 WRED/队列权重。',
    moduleIds: ['m17', 'm21'],
  },
  {
    traditional: 'VRRP 双机热备',
    cloud: '多可用区 / 多活',
    note:
      '云上一般不提供组播与免费 ARP 通告，VRRP 主备难以照搬。改用 ELB 多后端、跨 AZ 部署、DNS/GTM 多活，并把会话状态外置到共享存储，接受「实例随时可替换」。',
    moduleIds: ['m17', 'm22'],
  },
  {
    traditional: '堡垒机 / 运维跳板',
    cloud: '云堡垒机 / 零信任',
    note:
      '运维入口从网络层跳板转为身份感知访问：云堡垒机负责运维审计与命令回放，零信任按身份、设备与上下文动态授权，替代「进了内网就默认可信」的边界假设。',
    moduleIds: ['m20', 'm21'],
  },
];

/* ------------------------------ 关键转型节点 ------------------------------ */

export interface CloudKeyNode {
  id: string;
  title: string;
  /** 该节点要达成的阶段目标 */
  goal: string;
  moduleIds: string[];
  /** 可检验的能力标志 */
  capability: string;
}

export const keyNodes: CloudKeyNode[] = [
  {
    id: 'virtualization',
    title: '网络虚拟化认知',
    goal:
      '把 VLAN/VRF、路由转发映射到 VPC/子网/路由表，理解资源池化、租户隔离与责任共担，先用云网络坐标描述一张已有拓扑。',
    moduleIds: ['m16'],
    capability: '能画出 Region/AZ/VPC/子网四级坐标，并说清每一级的隔离边界与故障域',
  },
  {
    id: 'routing',
    title: '云上路由与互联',
    goal:
      '掌握云路由表的最长匹配、VPC 对等/企业路由/CEN，完成地址规划、东西向互通与南北向出口设计。',
    moduleIds: ['m17'],
    capability: '给定地址规划能设计互通与出口，并逐跳说明报文命中哪条路由、在哪被拒绝',
  },
  {
    id: 'cloud-native',
    title: '云原生网络',
    goal:
      '理解 Pod/Service/Ingress 的流量路径与 CNI 实现差异，用 NetworkPolicy 治理东西向访问，读懂覆盖网络与 VPC 原生网络的取舍。',
    moduleIds: ['m18', 'm19'],
    capability: '能判断 Service 不通是 CNI、kube-proxy 还是 NetworkPolicy 导致，并给出验证命令',
  },
  {
    id: 'security',
    title: '云安全与零信任',
    goal:
      '把安全组、NACL、云防火墙、WAF/DDoS 与零信任组合成纵深防御，明确责任共担下哪些边界必须自建。',
    moduleIds: ['m20'],
    capability: '能输出一份默认拒绝的安全边界设计，并解释每条放行规则对应的业务与风险',
  },
  {
    id: 'hybrid',
    title: '混合云与自动化',
    goal:
      '用专线/VPN/SD-WAN 打通云下云上，用 API、Terraform 与 GitOps 固化网络配置，并用流日志与 Telemetry 闭环观测。',
    moduleIds: ['m21', 'm22'],
    capability: '能交付可重复执行的 IaC 代码与回滚方案，并对关键链路给出监控指标与告警阈值',
  },
];

/* ------------------------------ 学习优先级 ------------------------------ */

export interface CloudPriorityGroup {
  id: 'P0' | 'P1' | 'P2';
  title: string;
  desc: string;
  moduleIds: string[];
}

export const priorityGroups: CloudPriorityGroup[] = [
  {
    id: 'P0',
    title: '核心必学',
    desc:
      '转型主线：先建立云网络坐标与路由能力，再补 Overlay/SRv6 与云安全，最后用综合设计收口。建议小测正确率达到 80% 再进入下一模块。',
    moduleIds: ['m16', 'm17', 'm19', 'm20', 'm22'],
  },
  {
    id: 'P1',
    title: '推荐补齐',
    desc:
      '决定你的方向深度：云原生方向补 M18（容器网络），平台/运维方向补 M21（混合云与自动化）。前置模块完成后按需穿插。',
    moduleIds: ['m18', 'm21'],
  },
  {
    id: 'P2',
    title: '拓展方向',
    desc:
      '暂无必修模块。P0/P1 打通后可延伸到多云治理平台（MSP）、云原生安全（CSPM/CWPP）、SD-WAN 策略编排与 SRv6 跨域编排；先保证主线能力可验证，再扩边界。',
    moduleIds: [],
  },
];

/** 推荐学习顺序说明（不承诺具体日历时间） */
export const cloudRecommendedOrder =
  '推荐顺序：M16 → M17 → M19 → M20 → M22 构成 P0 主线，先有坐标与路由，再补 Overlay/SRv6 与安全，最后做综合设计；M18 可在 M17 之后穿插（云原生方向必学），M21 在 M17/M19 之后补齐混合云与自动化。每个模块按 1 周节奏推进，小测达标再前进。';

/* ------------------------------ 实践落地路径 ------------------------------ */

export interface CloudPractice {
  moduleId: string;
  task: string;
  steps: string[];
  verify: string;
  /** 无云账号时的等价实验室练习 */
  lab?: { label: string; to: string };
}

export const cloudPractices: CloudPractice[] = [
  {
    moduleId: 'm16',
    task: '把一张熟悉的传统园区网拓扑改写成云上坐标图',
    steps: [
      '选一个做过 VLAN + OSPF 的场景，标出业务区、出口与运维入口',
      '按 Region / AZ / VPC / 子网四级重新标注每台设备与每段地址',
      '写出等价物：接入交换机→子网，核心路由→VPC 路由表，防火墙→安全组 + NACL，出口→NAT 网关/EIP',
      '列出至少 3 项无法直接映射的部分（如 STP、VRRP 组播），并说明云上的替代方案',
    ],
    verify: '任取一条流量，能说明它经过哪些子网、命中哪张路由表、在哪个边界被策略检查',
    lab: { label: 'eNSP：用 VLAN + OSPF 复现被迁移的园区网', to: '/lab/ensp' },
  },
  {
    moduleId: 'm17',
    task: '为双可用区业务完成 VPC 地址规划与路由设计',
    steps: [
      '用 10.10.0.0/16 规划 VPC，并按两个 AZ 各划一个 /20 业务子网与一个 /24 管理子网',
      '预留互联网段（VPC 对等）与 IDC 专线网段，标注掩码与可用 IP 数',
      '写出三类路由：去往对端 VPC、去往 IDC、去往公网（NAT 网关）',
      '在 eNSP 中用静态路由模拟 VPC 对等，验证源/目的双向可达',
      '按「查网段—查路由—查安全组—查 NACL—查监听」五步法记录一次排障过程',
    ],
    verify: '地址无重叠、每个子网有明确用途，路由表中无黑洞路由与相互覆盖的冲突条目',
    lab: { label: '故障排查实训：路由与策略导致的不通', to: '/lab' },
  },
  {
    moduleId: 'm18',
    task: '读懂两种 CNI 配置，画出 Pod 到 Service 的完整包路径',
    steps: [
      '对照 Calico（BGP/Overlay）与 Cilium（eBPF）的地址分配与转发方式，列出差异表',
      '在本地 kind/minikube 中（或纯阅读 YAML）创建 Service 与 Deployment，查看 Endpoint 列表',
      '写一条 NetworkPolicy：仅允许同命名空间的 frontend 访问 backend 的 8080',
      '用 kubectl describe / 抓包确认 DNAT 发生位置与策略丢弃时的现象',
    ],
    verify: '能解释 ClusterIP→Pod IP 的转换发生在哪一层，以及策略拒绝时是超时还是拒绝连接',
    lab: { label: 'eNSP：用 ACL 模拟 NetworkPolicy 的默认拒绝', to: '/lab/ensp' },
  },
  {
    moduleId: 'm19',
    task: '在 eNSP 中打通 VXLAN 隧道，并推演一次 SRv6 路径编程',
    steps: [
      'Underlay 用 OSPF 打通两台 VTEP 的 loopback 可达',
      '配置 VTEP、VNI 与二层子接口映射，使跨 VTEP 的同网段主机互通',
      '抓包确认 VXLAN 头部、VNI 与 MTU 开销，记录封装前后包长',
      '用 SRv6 Locator/SID 列表写出一个两跳 TE 路径，说明 SRH 中 Segment List 的执行顺序',
    ],
    verify: '隧道前后报文正确、VNI 匹配，能说出 SRv6 与 MPLS SR 在转发面与控制面上的异同',
    lab: { label: 'eNSP：VXLAN 与 Underlay 路由实验', to: '/lab/ensp' },
  },
  {
    moduleId: 'm20',
    task: '为 Web / App / DB 三层业务设计安全组与 NACL，并与 ACL 做等价对照',
    steps: [
      '先画访问矩阵：谁能访问谁、哪个端口、是否需要出网',
      '安全组按最小权限放行，源尽量引用安全组而不是网段',
      'NACL 按子网写双向规则，逐条标注与安全组规则的对应关系',
      '用 eNSP ACL 复现同一策略，对比无状态与有状态的行为差异',
      '补充 WAF、DDoS 防护与堡垒机/零信任的介入点',
    ],
    verify: '默认拒绝成立、规则无冗余且顺序不产生遮蔽，任一放行都能对应到具体业务需求',
    lab: { label: '故障排查实训：策略误拦截定位', to: '/lab' },
  },
  {
    moduleId: 'm21',
    task: '阅读并改写一段 Terraform VPC + 对等连接代码，产出可评审的变更计划',
    steps: [
      '读 main.tf：provider、vpc、subnet、route_table、route 资源及依赖关系',
      '把硬编码 CIDR 抽成变量，并为两个环境提供不同 tfvars',
      '补充对等连接与双向路由，确认没有循环依赖',
      '执行 terraform plan 只读 diff（不 apply），逐条解释新增与变更',
      '用分支 + PR 描述变更范围、验证方式与回滚步骤',
    ],
    verify: 'plan 结果与预期一致、无销毁核心资源的意外变更，代码可重复执行且不依赖手工补配置',
    lab: { label: '故障排查实训：链路切换与收敛验证', to: '/lab' },
  },
  {
    moduleId: 'm22',
    task: '完成多 VPC 多地域企业云网方案，并逐项自检验收清单',
    steps: [
      '写清需求：业务域划分、地域与合规约束、可用性与成本目标',
      '输出地址规划表（VPC/子网/互联/专线），标注掩码与预留',
      '输出互联与出口拓扑：对等连接、CEN/TGW、专线/VPN、NAT/EIP',
      '输出安全与可观测方案：安全组矩阵、边界防护、流日志与告警阈值',
      '按本页 6 项验收清单逐条准备证据（配置片段、路由表、日志样例）',
    ],
    verify: '他人能按图复现方案，每项验收都有可出示的证据，且能说清单 AZ 故障时的收敛路径',
  },
];

/* ------------------------------ 能力验证标准 ------------------------------ */

export interface CloudAbility {
  id: string;
  name: string;
  desc: string;
  moduleIds: string[];
}

export const cloudAbilities: CloudAbility[] = [
  {
    id: 'architecture',
    name: '云网络架构',
    desc: '把 Region/AZ/VPC/子网、弹性与隔离边界讲清楚，能完成地址规划与容灾分区设计。',
    moduleIds: ['m16', 'm17', 'm22'],
  },
  {
    id: 'routing',
    name: '云上路由互联',
    desc: '掌握云路由表匹配、VPC 对等、企业路由、CEN/Transit Gateway，以及专线与 VPN 组网。',
    moduleIds: ['m17', 'm21'],
  },
  {
    id: 'cloud-native',
    name: '云原生网络',
    desc: '理解容器网络模型与 CNI 实现差异，能用 NetworkPolicy 与服务网格治理东西向流量。',
    moduleIds: ['m18', 'm19'],
  },
  {
    id: 'security',
    name: '云安全',
    desc: '组合安全组、NACL、云防火墙、WAF/DDoS 与零信任，建立纵深防御与审计闭环。',
    moduleIds: ['m20', 'm22'],
  },
  {
    id: 'automation',
    name: '自动化运维',
    desc: '用 API、Terraform、Ansible 与 GitOps 固化网络配置，用流日志与 Telemetry 闭环观测。',
    moduleIds: ['m21', 'm22'],
  },
];

export interface CloudAcceptanceItem {
  id: string;
  text: string;
}

export const cloudAcceptanceItems: CloudAcceptanceItem[] = [
  { id: 'addressing', text: '地址规划：VPC 与子网网段无重叠，预留互联与专线网段，并给出掩码与可用 IP 计算。' },
  { id: 'interconnect', text: 'VPC 互联：至少两个 VPC 通过显式路由互通，路由表无黑洞、无环路。' },
  { id: 'security', text: '安全策略：默认拒绝，业务端口按最小权限放行，安全组与 NACL 双向规则可对照。' },
  { id: 'hybrid', text: '混合云接入：云下 IDC 通过专线或 VPN 接入，主备链路与路由收敛过程有明确说明。' },
  { id: 'automation', text: '自动化：网络资源由 IaC 定义，可重复执行，变更可通过版本回滚。' },
  { id: 'observability', text: '可观测性：关键链路具备流日志与指标监控，并给出至少 3 条告警阈值。' },
];

/** 模块小测达标阈值（正确率百分比） */
export const cloudExamThreshold = 70;
/** P0 模块建议达标阈值（正确率百分比） */
export const cloudExamThresholdP0 = 80;

/** L4 云网络模块（按 order 排序）；内容尚未落地时返回空数组 */
export function l4Modules(): ModuleMeta[] {
  return modules.filter((m) => m.stage === 'L4').sort((a, b) => a.order - b.order);
}
