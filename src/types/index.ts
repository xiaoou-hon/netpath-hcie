/**
 * NetPath 数据模型
 * ------------------------------------------------------------------
 * 内容全部以「结构化数据」描述，页面通过统一渲染器消费。
 * 新增模块 = 在 src/data/modules/ 下新增一个 mXX.ts 文件（默认导出 ModuleMeta），
 * 不需要修改任何页面或注册表代码（由 import.meta.glob 自动聚合）。
 */

import type { EnspLabSpec } from './ensp';

/** 学习深度：了解 / 熟悉 / 精通 */
export type Depth = '了解' | '熟悉' | '精通';

/** 学习阶段：L1 小白入门 → L2 半专业人员 → L3 专业人员 → L4 云网络工程师 */
export type StageId = 'L1' | 'L2' | 'L3' | 'L4';

/** 互动可视化组件的唯一 key（与 src/components/interactive/*.tsx 的 meta.key 对应） */
export type InteractiveKey =
  | 'encapsulation'
  | 'protocol-explorer'
  | 'tcp-handshake'
  | 'subnet-calculator'
  | 'arp-switch'
  | 'ospf-fsm'
  | 'ospf-flooding'
  | 'bgp-fsm'
  | 'bgp-bestpath'
  | 'stp-election'
  | 'vrrp-failover'
  | 'wlan-onboarding'
  | 'fw-policy'
  | 'nat-ipsec'
  | 'vxlan-evpn'
  | 'ospf-troubleshoot'
  | 'mastery-radar';

/** 课时正文的内容块 */
export type ContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string; level?: 2 | 3 | 4 }
  | { type: 'list'; items: string[]; ordered?: boolean; title?: string }
  | { type: 'analogy'; title?: string; text: string }
  | { type: 'warning'; title?: string; text: string }
  | { type: 'tip'; title?: string; text: string }
  | { type: 'code'; title?: string; lang?: string; code: string }
  | { type: 'output'; title?: string; text: string }
  | { type: 'table'; title?: string; columns: string[]; rows: string[][] }
  | { type: 'interactive'; key: InteractiveKey; caption?: string }
  | { type: 'quiz'; title?: string; ids?: string[] }
  | { type: 'steps'; title?: string; items: { title: string; text: string }[] }
  | { type: 'kv'; items: { label: string; value: string }[] }
  | { type: 'checklist'; title?: string; items: string[] };

/** 课时 */
export interface Lesson {
  /** 全局唯一，形如 'm03-l02' */
  id: string;
  moduleId: string;
  title: string;
  depth: Depth;
  /** 预计学习分钟 */
  minutes: number;
  /** 一句话摘要 */
  summary: string;
  /** 学完能做到什么（2-4 条） */
  objectives: string[];
  blocks: ContentBlock[];
  /** 关键术语，用于搜索与标签 */
  keywords?: string[];
}

/** 模块 */
export interface ModuleMeta {
  /** 'm00' ... 'm11' */
  id: string;
  /** 展示编号 'M00' */
  code: string;
  title: string;
  summary: string;
  stage: StageId;
  /** 全局排序，从 0 开始 */
  order: number;
  /** 该模块的能力目标 */
  goals: string[];
  keywords: string[];
  /** 主题色（可选，缺省使用主题色板轮换） */
  accent?: string;
  /** 学习轨道：传统数据通信 / 云网络（可选，用于区分学习方向） */
  track?: 'datacom' | 'cloud';
  /** 学习优先级：P0 核心必学、P1 推荐、P2 拓展（可选） */
  priority?: 'P0' | 'P1' | 'P2';
  /** 前置模块 id 列表，如 ['m00', 'm01']（可选，用于提示学习顺序） */
  prerequisites?: string[];
  lessons: Lesson[];
}

/** 阶段 */
export interface StageMeta {
  id: StageId;
  name: string;
  subtitle: string;
  description: string;
  /** 阶段能力目标 */
  goals: string[];
  /** 晋升条件说明 */
  promotion: string;
}

/** 测验题型 */
export type QuizType = 'single' | 'multiple' | 'boolean';

/** 测验题 */
export interface QuizQuestion {
  id: string;
  moduleId: string;
  /** 关联课时，用于课时内自测与错题定位 */
  lessonId?: string;
  type: QuizType;
  depth: Depth;
  question: string;
  options: string[];
  /** 正确选项下标；多选可多个 */
  answer: number[];
  explanation: string;
}

/** 测验成绩记录 */
export interface QuizAttempt {
  id: string;
  /** 展示用范围名称，如「BGP 模块小测」「随机综合卷」 */
  scope: string;
  moduleId?: string;
  total: number;
  correct: number;
  /** ISO 时间 */
  at: string;
}

/** 学习状态（localStorage 持久化） */
export interface LearningState {
  version: 1;
  completedLessons: Record<string, { at: string }>;
  bookmarks: string[];
  notes: Record<string, { text: string; updatedAt: string }>;
  attempts: QuizAttempt[];
  /** moduleId -> 最好正确率 0..1 */
  moduleBest: Record<string, number>;
  /** questionId -> 错题记录 */
  wrongQuestions: Record<string, { count: number; lastAt: string }>;
  /** 'YYYY-MM-DD' -> 当日学习动作次数 */
  activity: Record<string, number>;
  theme: 'dark' | 'light';
}

/* ----------------------------- 实验室数据模型 ----------------------------- */

export interface VrpInterface {
  /** 如 'GigabitEthernet0/0/0' */
  name: string;
  /** 如 '192.168.1.1' */
  ip?: string;
  /** 点分掩码，如 '255.255.255.0' */
  mask?: string;
  shutdown: boolean;
}

export interface VrpOspf {
  processId: string;
  routerId?: string;
  areas: { areaId: string; networks: { ip: string; wildcard: string }[] }[];
}

export interface VrpBgp {
  asNumber: string;
  routerId?: string;
  peers: { ip: string; remoteAs: string }[];
  /** ipv4-family unicast 下 network 宣告的网段 */
  networks?: { ip: string; mask: string }[];
}

export interface VrpDevice {
  id: string;
  /** 设备默认主机名，如 'R1' */
  name: string;
  sysname?: string;
  interfaces: VrpInterface[];
  ospf?: VrpOspf;
  bgp?: VrpBgp;
  /** 静态路由 */
  staticRoutes?: { dest: string; mask: string; nextHop: string }[];
  /** 管理平面互通的链路（用于 ping / 拓扑） */
  links?: { to: string; localIf: string; remoteIf: string }[];
}

export interface LabStep {
  title: string;
  text: string;
  /** 该步骤期望输入的命令（用于「填入命令」按钮） */
  commands?: string[];
  /** 设备 id，默认第一台 */
  deviceId?: string;
}

export interface LabScenario {
  id: string;
  title: string;
  level: Depth;
  summary: string;
  /** 拓扑中展示的设备顺序 */
  devices: VrpDevice[];
  steps: LabStep[];
  /** 验收标准文本，用于实验手册展示 */
  acceptance: string[];
  hints: string[];
  /** eNSP 开局规格 */
  ensp?: EnspLabSpec;
}

export type { EnspCheck, EnspLabSpec } from './ensp';
