import type { StageMeta } from '@/types';

export const stages: StageMeta[] = [
  {
    id: 'L1',
    name: '小白入门',
    subtitle: '看得懂网络在说什么',
    description:
      '从「网线里跑的是什么」开始，建立分层、封装、编址、转发这四个最基本的直觉。学完能看懂 IP 地址、能规划小型办公网、能 ping 通并解释每一步发生了什么。',
    goals: [
      '用分层模型解释一次网页访问的完整过程',
      '独立完成 IPv4 地址规划与子网划分',
      '配置基础接口、静态路由并验证连通性',
      '读懂交换机与路由器的基本转发行为',
    ],
    promotion: '完成 L1 全部必修课时，并完成「网络入门」模块小测（正确率 ≥ 60%）',
  },
  {
    id: 'L2',
    name: '半专业人员',
    subtitle: '配得出、排得掉',
    description:
      '进入企业网的真实场景：OSPF/IS-IS 建邻居与选路、BGP 互联、VLAN 与生成树、WLAN 上线、防火墙策略。目标是能独立完成中小型园区的开局与常见故障处理。',
    goals: [
      '独立完成 OSPF 单/多区域与 BGP 邻居配置和排错',
      '设计并实现 VLAN、Trunk、STP、链路聚合二层方案',
      '完成 AC + AP 的 WLAN 基础组网与漫游验证',
      '配置防火墙安全策略、NAT 与 IPsec VPN',
    ],
    promotion: '完成 L2 全部必修课时，且 OSPF / BGP / 安全三个模块小测正确率均 ≥ 70%',
  },
  {
    id: 'L3',
    name: '专业人员',
    subtitle: '设计得了架构，扛得住故障',
    description:
      '面向 HCIE-Datacom 的能力要求：复杂路由策略与选路控制、MPLS/SR、VXLAN/EVPN 数据中心网络、安全架构与纵深防御、自动化与 Telemetry，以及大型网络的系统化排错。',
    goals: [
      '设计多协议互操作的路由方案并控制选路结果',
      '解释并部署 VXLAN/EVPN 与 MPLS L3VPN 基本架构',
      '输出企业级安全架构方案（边界、内网、终端、运维）',
      '使用分层方法论定位复杂现网故障并给出加固建议',
    ],
    promotion:
      '完成 L3 全部必修课时，通过综合卷（正确率 ≥ 80%），并能独立完成全部 3 个命令行实验场景',
  },
  {
    id: 'L4',
    name: '云网络工程师',
    subtitle: '把路由交换能力迁移到云上',
    description:
      '从传统网络走向云网络：理解资源池化与网络虚拟化，掌握 VPC、云上路由与互联，进一步覆盖云原生网络、SDN/NFV 与 Overlay、SRv6、云安全、混合云与多云互联，最后用自动化与可观测性把设计真正落地。',
    goals: [
      '用云网络坐标（Region / AZ / VPC / 子网）解释云上网络的分层与边界',
      '完成 VPC 地址规划、云上路由设计，并用对等连接或企业路由实现 VPC 互联',
      '说明容器网络模型与 CNI 实现差异，配置 NetworkPolicy 治理东西向流量',
      '解释 SDN/NFV、VXLAN/EVPN 与 SRv6 的原理，并说明云骨干中的落地方式',
      '设计云上安全边界（安全组、NACL、云防火墙、零信任）与混合云/多云互联方案',
      '用 API、Terraform 与 GitOps 完成云网络自动化，并用流日志与 Telemetry 观测',
    ],
    promotion:
      '完成 L4 全部必修课时，云网络各模块小测正确率 ≥70%（P0 模块建议 ≥80%），并完成 M22 综合设计验收',
  },
];

export const stageById = new Map(stages.map((s) => [s.id, s]));

export const stageOrder = ['L1', 'L2', 'L3', 'L4'] as const;
