/**
 * 实验手册资源库
 * ------------------------------------------------------------------
 * local：与本仓库内置场景一一对应，可在实验室直接练习。
 * github：仅登记外部仓库链接，不复制其内容，使用时遵循各自许可证。
 */
import { getScenario } from './scenarios';

export interface LabResource {
  id: string;
  title: string;
  kind: 'local' | 'github';
  level: '入门' | '进阶' | '综合';
  tags: string[];
  summary: string;
  /** local 资源关联的场景 id */
  scenarioId?: string;
  /** github 资源地址 */
  url?: string;
  license?: string;
  note?: string;
}

const localDefs: { scenarioId: string; level: LabResource['level']; tags: string[] }[] = [
  { scenarioId: 'lab-1', level: '入门', tags: ['基础配置', '接口', 'ping'] },
  { scenarioId: 'lab-2', level: '进阶', tags: ['OSPF', '路由', '邻居'] },
  { scenarioId: 'lab-3', level: '综合', tags: ['BGP', '路由', 'EBGP'] },
  { scenarioId: 'lab-4', level: '进阶', tags: ['VLAN', 'Trunk', '交换'] },
  { scenarioId: 'lab-5', level: '综合', tags: ['防火墙', '安全策略', '安全区域'] },
];

const localResources: LabResource[] = localDefs.flatMap((def) => {
  const scenario = getScenario(def.scenarioId);
  if (!scenario) return [];
  return [
    {
      id: `local-${def.scenarioId}`,
      title: scenario.title,
      kind: 'local' as const,
      level: def.level,
      tags: def.tags,
      summary: scenario.summary,
      scenarioId: def.scenarioId,
    },
  ];
});

const githubNote = '外部资源，仅提供链接，遵循原仓库许可。';

const githubResources: LabResource[] = [
  {
    id: 'github-fengqizihang-network-routing-experiment',
    title: 'VLAN/STP/链路聚合/OSPF/ACL 实验指导手册（含 PDF）',
    kind: 'github',
    level: '进阶',
    tags: ['VLAN', 'STP', '链路聚合', 'OSPF', 'ACL'],
    summary: '覆盖交换与路由核心实验的指导手册，配套 PDF 文档，适合按章节系统练习。',
    url: 'https://github.com/FengQiZihang/network-routing-experiment',
    license: '未声明',
    note: '外部资源，遵循原仓库许可。',
  },
  {
    id: 'github-gangan786-network-ensp',
    title: '交换路由实验报告合集（Apache-2.0）',
    kind: 'github',
    level: '进阶',
    tags: ['交换', '路由', '实验报告', 'OSPF'],
    summary: '多份 eNSP 交换路由实验报告，包含拓扑、配置与验证过程，可对照自己的实验结果。',
    url: 'https://github.com/gangan786/Network_eNSP',
    license: 'Apache-2.0',
    note: githubNote,
  },
  {
    id: 'github-quincyking-campus-network-construction',
    title: '校园网综合实验（MIT）',
    kind: 'github',
    level: '综合',
    tags: ['校园网', '综合实验', 'VLAN', 'OSPF'],
    summary: '以校园网为背景的综合组网实验，串联 VLAN、路由与出口配置，适合课程设计参考。',
    url: 'https://github.com/QuincyKing/Campus-Network-Construction',
    license: 'MIT',
    note: githubNote,
  },
  {
    id: 'github-xuan-cw-ensp',
    title: 'eNSP 网络技术与应用：从基础到实战',
    kind: 'github',
    level: '入门',
    tags: ['基础配置', '交换', '路由', '实战'],
    summary: '由基础命令到综合实战的 eNSP 学习资料，适合刚接触华为 VRP 的学习者跟做。',
    url: 'https://github.com/XUAN-CW/eNSP',
    note: githubNote,
  },
  {
    id: 'github-calacalaboom-enterprise-network',
    title: '企业双出口综合网络实验',
    kind: 'github',
    level: '综合',
    tags: ['企业网', '双出口', 'NAT', '综合实验'],
    summary: '企业双出口场景的完整实验，涉及出口选路、NAT 与安全策略等综合配置。',
    url: 'https://github.com/CalacalaBoom/Enterprise.NetworkExperiment.eNSP',
    note: githubNote,
  },
  {
    id: 'github-mingming-up-enterprise-network-planning',
    title: '中大型企业网络规划（拓扑+配置+README）',
    kind: 'github',
    level: '综合',
    tags: ['企业网', '网络规划', '拓扑', '综合实验'],
    summary: '中大型企业网络的规划案例，提供拓扑、设备配置与说明文档，适合综合设计练习。',
    url: 'https://github.com/Mingming-up/ENSP-Enterprise-Network-Planning',
    note: githubNote,
  },
];

export const labResources: LabResource[] = [...localResources, ...githubResources];
