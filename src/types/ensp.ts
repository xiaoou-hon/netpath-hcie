/**
 * eNSP 桥接相关数据模型
 * ------------------------------------------------------------------
 * 这里只描述「前端 ↔ 本地桥接程序」之间的数据形状，
 * 不依赖 index.ts，避免类型循环引用。
 */

/** 命令行视图归类：用户视图 / 系统视图 / 子视图 */
export type EnspView = 'user' | 'system' | 'sub';

/** 导入拓扑的原始画布坐标 */
export interface TopologyCoordinate {
  x: number;
  y: number;
}

/** 拓扑设备上的已声明接口，序号来自文件而非型号猜测 */
export interface TopologyInterface {
  id: string;
  name: string;
  slot?: number;
  subslot?: number;
  port?: number;
}

/** 设备板卡；接口统一保存在设备的 interfaces 列表中 */
export interface TopologyBoard {
  slot: number;
  model: string;
}

/** 统一拓扑设备模型 */
export interface TopologyDevice {
  id: string;
  name: string;
  model: string;
  /** 原始 com_port；0 表示没有可用 VRP console */
  comPort: number;
  /** PC、Server、Cloud 或 com_port=0 时为 false */
  vrpCapable: boolean;
  boards: TopologyBoard[];
  interfaces: TopologyInterface[];
  /** 未声明坐标时由展示层进行确定性布局 */
  position?: TopologyCoordinate;
}

/** 链路的一端，同时保留设备 id 与文件中声明的接口名 */
export interface TopologyLinkEndpoint {
  deviceId: string;
  interfaceName: string;
  interfaceId: string;
}

/** 扁平化后的设备间链路 */
export interface TopologyLink {
  id: string;
  name: string;
  source: TopologyLinkEndpoint;
  target: TopologyLinkEndpoint;
}

/** 拓扑解析来源；降级原因不包含服务器临时路径 */
export interface TopologyParseSource {
  type: 'ensp-mcp' | 'fallback-xml' | 'preset';
  tool?: string;
  fallbackReason?: string;
  scenarioId?: string;
}

/** 不阻断导入的解析告警 */
export interface TopologyWarning {
  code: string;
  message: string;
  deviceId?: string;
}

/** MCP 与本机 XML 备用解析共用的拓扑文档 */
export interface TopologyDocument {
  name: string;
  source: TopologyParseSource;
  warnings: TopologyWarning[];
  devices: TopologyDevice[];
  links: TopologyLink[];
}

/** 拓扑设备的实时探测状态；与静态 TopologyDevice 分开保存 */
export type TopologyDeviceState =
  | 'offline'
  | 'starting'
  | 'ready'
  | 'auth-pending'
  | 'error'
  | 'name-mismatch'
  | 'unavailable';

export interface TopologyDeviceRuntime {
  deviceId: string;
  expectedName: string;
  port: number;
  mappingSource: 'topology' | 'manual' | 'none';
  state: TopologyDeviceState;
  /** 仅就绪或等待认证的 VRP console 可以发起会话 */
  connectable: boolean;
  name?: string;
  prompt?: string;
  view?: string;
  reason?: string;
}

export interface TopologyScanResult {
  devices: TopologyDeviceRuntime[];
  scanned: number;
  failures: { port: number; reason: string }[];
}

/** 单条验收检查：对某台设备执行命令后，对回显做纯文本判定 */
export interface EnspCheck {
  /** 全局唯一，如 'lab-1-r1-ip' */
  id: string;
  /** 展示给学习者的检查描述 */
  text: string;
  /** 设备角色 id，与 LabScenario.devices[].id 一致 */
  deviceId: string;
  /** 在该设备上执行的命令 */
  command: string;
  /** 期望命中的正则 */
  expect?: string;
  /** 不应出现的反例正则 */
  reject?: string;
  /** 统计某个正则出现的次数（与 minCountAtLeast 搭配） */
  minCountPattern?: string;
  minCountAtLeast?: number;
  /** ping 目标地址 */
  reachable?: string;
  /** 允许的丢包率 0-100 */
  maxLoss?: number;
}

/** 单个场景在 eNSP 侧的开局规格 */
export interface EnspLabSpec {
  /** 角色 id -> eNSP 设备型号，如 { r1: 'AR2220' } */
  models: Record<string, string>;
  /** 链路：a / b 均为角色 id */
  links: { a: string; b: string }[];
  /** 验收检查（至少 2 条） */
  checks: EnspCheck[];
  /** 开局提示文案 */
  startHint?: string;
}

/** 预置场景转换后的拓扑，继续携带原场景远程验收数据 */
export interface ScenarioTopologyDocument extends TopologyDocument {
  source: TopologyParseSource & { type: 'preset'; scenarioId: string };
  scenarioId: string;
  checks: EnspCheck[];
}

/** 桥接程序返回的设备连接信息 */
export interface EnspDeviceInfo {
  port: number;
  state: 'shell' | 'login' | 'open';
  name?: string;
  prompt?: string;
  view?: string;
}

/** 持久终端会话状态；locked 表示兼容 exec/验收正在独占设备。 */
export type EnspSessionStatus = 'connecting' | 'ready' | 'reconnecting' | 'locked' | 'closed' | 'error';

/** 已建立的设备会话 */
export interface EnspSessionInfo {
  sessionId: string;
  port: number;
  deviceName: string;
  prompt: string;
  view: string;
  createdAt: string;
  lastActiveAt: string;
  locked?: boolean;
  status?: EnspSessionStatus;
  error?: string;
  paginationDisabled?: boolean;
  cols?: number;
  rows?: number;
}

/** 环境体检结果 */
export interface BridgeHealth {
  ok: boolean;
  bridge: { version: string };
  ensp: {
    installed: boolean;
    path?: string;
    version?: string;
    running?: boolean;
    consolePort?: number;
    mngPort?: number;
  };
  vbox: { version?: string };
  python: { version?: string };
  mcp: { available: boolean };
  dshEnsp: { available: boolean };
  /** 本机 MobaXterm 探测结果 */
  mobaxterm?: { found: boolean; path?: string };
  /** netmiko sidecar（Python worker）状态：AI 操作设备与结构化解析的增强通道 */
  worker?: {
    available: boolean;
    port?: number;
    netmiko?: string;
    templatesReady?: boolean;
    sessions?: number;
    error?: string | null;
  };
  mock?: boolean;
}

/** 桥接服务错误体 */
export interface BridgeError {
  code: string;
  message: string;
  detail?: string;
}

/** 桥接服务设置 */
export interface BridgeSettings {
  bridgeUrl: string;
  mcpCommand: string;
  credentials: { username: string; password: string };
}

/** AI 助手设置 */
export interface AiSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
}

/** eNSP 模块全部本地状态（localStorage 持久化） */
export interface EnspSettings {
  bridge: BridgeSettings;
  ai: AiSettings;
  /** scenarioId -> 角色 id -> 串口号 */
  mappings: Record<string, Record<string, number>>;
  /** scenarioId -> 完成时间 */
  completed: Record<string, { at: string }>;
}
