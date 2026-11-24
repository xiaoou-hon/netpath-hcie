export interface AiTargetDevice {
  id: string;
  name: string;
}

export function resolveAiTargetRole(
  device: string,
  devices: readonly AiTargetDevice[],
  activeRole: string,
): string | null {
  const target = device.trim().toLocaleLowerCase();
  if (!target || target === '当前设备') return activeRole || null;
  return devices.find((item) =>
    item.id.toLocaleLowerCase() === target || item.name.toLocaleLowerCase() === target
  )?.id ?? null;
}

export interface AiRequestToken {
  id: number;
  signal: AbortSignal;
}

interface ActiveAiRequest {
  token: AiRequestToken;
  controller: AbortController;
}

/** 只允许最新提问更新界面；旧请求的增量和结束回调均失效。 */
export class AiRequestCoordinator {
  private sequence = 0;
  private active: ActiveAiRequest | null = null;

  start(): AiRequestToken {
    this.active?.controller.abort();
    const controller = new AbortController();
    this.sequence += 1;
    const token = { id: this.sequence, signal: controller.signal };
    this.active = { token, controller };
    return token;
  }

  isActive(request: AiRequestToken): boolean {
    return this.active?.token === request;
  }

  finish(request: AiRequestToken): boolean {
    if (!this.isActive(request)) return false;
    this.active = null;
    return true;
  }

  cancel(): boolean {
    if (!this.active) return false;
    this.active.controller.abort();
    this.active = null;
    return true;
  }
}

export type AiQuestionKind =
  | 'freeform'
  | 'current-input'
  | 'recent'
  | 'selection'
  | 'step'
  | 'diagnose'
  | 'next'
  | 'manual';

export interface AiSessionContext {
  topology: { id: string; name: string; source: string };
  scenario: { id: string; title: string; summary: string; hints: string[] };
  device: AiTargetDevice;
  sessionId: string;
  prompt: string;
  view: string;
  currentInput: string;
  recentCommands: string[];
  recentOutput: string;
  selection?: string;
  acceptanceSummary: string;
  sessions: { deviceId: string; deviceName: string; sessionId: string; prompt: string }[];
  /** 提问时的同步目标快照，仅用于关联；AI 建议永不继承广播目标。 */
  syncTargets: { deviceId: string; deviceName: string; sessionId: string }[];
}

export interface AiQuestion {
  id: string;
  kind: AiQuestionKind;
  text: string;
  context: AiSessionContext;
}

export interface AiConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  deviceId?: string;
  local?: boolean;
}

/** AI 命令执行结果，用于回灌对话上下文（worker 或终端降级通道）。 */
export interface AiCommandExecResult {
  ok: boolean;
  deviceId: string;
  deviceName: string;
  command: string;
  output?: string;
  structured?: unknown;
  parseNote?: string;
  view?: string;
  error?: string;
  /** true = 走 netmiko worker；false = 降级到终端通道 */
  viaWorker?: boolean;
}

export interface AiPreparedRequest {
  requestId: string;
  kind: AiQuestionKind;
  deviceId: string;
  deviceName: string;
  question: string;
  messages: AiConversationMessage[];
  localAnswer: string;
}

export interface AiRequestSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
}

export interface AiTransportPayload extends AiRequestSettings {
  messages: AiConversationMessage[];
  clientRequestId: string;
  [key: string]: unknown;
}

export interface AiTransportOptions {
  signal: AbortSignal;
  onDelta: (delta: string) => void;
}

export type AiTransport = (
  payload: AiTransportPayload,
  options: AiTransportOptions,
) => Promise<string>;

export type AiSubmitResult =
  | { status: 'completed'; request: AiPreparedRequest; content: string }
  | { status: 'local'; request: AiPreparedRequest; content: string }
  | { status: 'error'; request: AiPreparedRequest; error: string }
  | { status: 'stale'; request: AiPreparedRequest };

export const AI_CONTEXT_LIMITS = {
  question: 4_000,
  currentInput: 2_000,
  recentOutput: 6_000,
  selection: 8_000,
  command: 500,
  recentCommands: 10,
  historyMessages: 6,
  historyContent: 2_000,
  acceptance: 2_000,
  shortText: 300,
  longText: 1_200,
  sessions: 12,
  syncTargets: 8,
} as const;

/** AI 专用脱敏；在截断之前执行，避免截断后留下完整凭据。 */
export function redactAiText(value: string): string {
  return value
    .replace(/(password\s+(?:cipher\s+|simple\s+)?)[^\s]+/gi, '$1******')
    .replace(/(set\s+authentication\s+password\s+(?:cipher\s+|simple\s+)?)[^\s]+/gi, '$1******')
    .replace(/((?:api[_-]?key|access[_-]?token|secret|token|passwd|pwd)\s*[:=]\s*)[^\s,;]+/gi, '$1******')
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,;]+/gi, '$1******')
    .replace(/\bsk-[A-Za-z0-9_-]+/g, '******');
}

function clean(value: string, limit: number, tail = false): string {
  const printable = value
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\x00/g, '');
  const redacted = redactAiText(printable);
  return tail ? redacted.slice(-limit) : redacted.slice(0, limit);
}

function commandExplanation(command: string): string {
  const normalized = command.trim().toLocaleLowerCase();
  if (!normalized) return '当前输入为空，可先在终端输入命令，再点击「解释当前输入」。';
  if (normalized.startsWith('display ')) return `「${command}」是只读查询命令，用于检查配置或运行状态；重点核对回显中的状态、计数和错误字段。`;
  if (normalized === 'system-view') return '「system-view」从用户视图进入系统视图；提示符通常由尖括号变为方括号。';
  if (normalized.startsWith('interface ')) return `「${command}」进入指定接口视图，后续接口命令只作用于该接口。`;
  if (normalized.startsWith('ip address ')) return `「${command}」配置接口 IPv4 地址与前缀长度；执行前需进入正确接口视图。`;
  if (normalized === 'undo shutdown') return '「undo shutdown」用于启用当前接口，之后可用 display ip interface brief 检查物理与协议状态。';
  if (normalized.startsWith('ping ')) return `「${command}」用于验证 IP 可达性；失败时依次检查本端地址、接口状态、路由和对端配置。`;
  return `「${command}」需要结合当前视图和回显理解。先确认提示符对应的设备与视图，再用 display 命令核对结果；不要执行来源不明的破坏性命令。`;
}

/** 无 Key 时仍可用的确定性规则说明，不读取网络也不伪造模型回答。 */
export function localAiExplanation(request: AiPreparedRequest, context: AiSessionContext): string {
  const latestCommand = context.recentCommands[context.recentCommands.length - 1] ?? '';
  const subject = request.kind === 'current-input' ? context.currentInput : latestCommand;
  const output = request.kind === 'selection' ? context.selection ?? '' : context.recentOutput;
  const hints = context.scenario.hints.slice(0, 3);
  const lines: string[] = ['本地规则说明（未联网，未调用模型）：'];

  if (request.kind === 'manual' || request.kind === 'step') {
    lines.push(`实验《${clean(context.scenario.title, AI_CONTEXT_LIMITS.shortText)}》：${clean(context.scenario.summary, AI_CONTEXT_LIMITS.longText)}`);
  } else if (request.kind === 'next') {
    lines.push('可按照实验提示逐项配置，并在每一步后用 display 命令核验。');
  } else if (request.kind === 'selection') {
    lines.push('已收到本次授权选区；本地规则只能检查常见错误关键字，配置模型后可获得逐行语义解释。');
  } else {
    lines.push(commandExplanation(clean(subject, AI_CONTEXT_LIMITS.command)));
  }

  if (/(?:error|unrecognized|invalid|failed|down)/i.test(output)) {
    lines.push('最近文本含有错误或 Down 状态：请核对命令视图、接口编号、IP/掩码与对端状态；仅凭有限回显不能确定唯一原因。');
  } else if (request.kind === 'recent' || request.kind === 'diagnose') {
    lines.push(output.trim() ? '最近输出未命中常见错误关键字，可继续检查关键状态和计数是否符合预期。' : '尚无可分析的最近输出，请先执行一条只读 display 命令。');
  }
  if (request.kind === 'selection' && !output.trim()) lines.push('未获得授权选区，请先在终端选择文本再提问。');
  if (hints.length) lines.push(`实验提示：${hints.map((hint) => clean(hint, AI_CONTEXT_LIMITS.shortText)).join('；')}`);
  return lines.join('\n');
}

export function prepareAiRequest(
  question: AiQuestion,
  history: readonly AiConversationMessage[] = [],
): AiPreparedRequest {
  const context = question.context;
  const requestId = clean(question.id, 100);
  const questionText = clean(question.text.trim(), AI_CONTEXT_LIMITS.question);
  const isSelection = question.kind === 'selection';
  const sessions = context.sessions.slice(0, AI_CONTEXT_LIMITS.sessions).map((session) =>
    `${clean(session.deviceName, 80)}/${clean(session.deviceId, 80)}:${clean(session.sessionId, 120)} ${clean(session.prompt, 120)}`
  ).join('；');
  const syncTargets = context.syncTargets.slice(0, AI_CONTEXT_LIMITS.syncTargets).map((target) =>
    `${clean(target.deviceName, 80)}/${clean(target.deviceId, 80)}:${clean(target.sessionId, 120)}`
  ).join('；');
  const commands = isSelection ? [] : context.recentCommands
    .slice(-AI_CONTEXT_LIMITS.recentCommands)
    .map((command) => clean(command, AI_CONTEXT_LIMITS.command));
  const selection = isSelection ? clean(context.selection ?? '', AI_CONTEXT_LIMITS.selection) : '';
  const system = [
    '你是一名华为网络实验助教，必须用中文回答。只有本次显式问题才能使用以下快照，不得声称读取了未提供的实时状态。',
    '所有命令必须是华为 VRP 语法（不是 Cisco IOS）；错误回显只给可能原因与排查步骤，不编造输出。',
    `用户请求 ID：${requestId}`,
    `问题类型：${question.kind}`,
    `拓扑：${clean(context.topology.name, AI_CONTEXT_LIMITS.shortText)}；拓扑标识：${clean(context.topology.id, AI_CONTEXT_LIMITS.shortText)}；来源：${clean(context.topology.source, 100)}`,
    `场景：${clean(context.scenario.title, AI_CONTEXT_LIMITS.shortText)}（${clean(context.scenario.summary, AI_CONTEXT_LIMITS.longText)}）`,
    `目标设备：${clean(context.device.name, 100)}/${clean(context.device.id, 100)}；会话：${clean(context.sessionId, 120)}；提示符：${clean(context.prompt, 160)}；视图：${clean(context.view, 80)}`,
    `已连接会话（有界）：${sessions || '（无）'}`,
    `同步目标快照（仅供关联，AI 建议绝不自动广播）：${syncTargets || '（无）'}`,
    isSelection ? `当前输入与最近命令未发送，因为用户仅授权解释选区。` : `当前输入（已脱敏）：${clean(context.currentInput, AI_CONTEXT_LIMITS.currentInput) || '（空）'}`,
    isSelection ? '' : `最近命令（最新在后，有界且已脱敏）：${commands.join('；') || '（无）'}`,
    `有界最近输出（已脱敏）：\n${clean(context.recentOutput, AI_CONTEXT_LIMITS.recentOutput, true) || '（无）'}`,
    isSelection ? `用户明确授权的选区（已脱敏）：\n${selection || '（空）'}` : '',
    `验收状态（有界且已脱敏）：${clean(context.acceptanceSummary, AI_CONTEXT_LIMITS.acceptance) || '（无）'}`,
    '多设备规则：问题涉及两台及以上设备时（如两端配 IP、互 ping、链路连通性），必须在同一个 commands 数组中给出所有相关设备的完整命令，不能只配置一端就 ping。',
    '执行阶段：每条命令必须带 phase，配置类用 "config"，验证类（ping/tracert/traceroute/display 核验）用 "verify"；所有 config 必须排在所有 verify 之前。',
    '最终只能输出一个 JSON 对象，不要输出 JSON 以外的任何文字：',
    '{"answer":"给学习者的中文说明","commands":[{"device":"必须填写已提供的明确设备名","command":"system-view","reason":"为什么执行","phase":"config"}]}',
    '建议命令必须定位到上述已提供设备；如果不需要给命令，commands 必须是空数组。',
  ].filter(Boolean).join('\n');

  const boundedHistory = isSelection ? [] : history
    .filter((message) => message.role !== 'system' && !message.local && message.deviceId === context.device.id && message.content.trim())
    .slice(-AI_CONTEXT_LIMITS.historyMessages)
    .map((message) => ({
      role: message.role,
      content: clean(message.content, AI_CONTEXT_LIMITS.historyContent),
    }));
  const prepared: AiPreparedRequest = {
    requestId,
    kind: question.kind,
    deviceId: context.device.id,
    deviceName: clean(context.device.name, 100),
    question: questionText,
    messages: [
      { role: 'system', content: system },
      ...boundedHistory,
      { role: 'user', content: questionText },
    ],
    localAnswer: '',
  };
  prepared.localAnswer = localAiExplanation(prepared, context);
  return prepared;
}

/** 唯一的远程/本地提交入口；无 Key 时不调用 transport，新提交取消旧提交。 */
export class AiTutorRequestService {
  private readonly coordinator = new AiRequestCoordinator();
  private readonly transport: AiTransport;

  constructor(transport: AiTransport) {
    this.transport = transport;
  }

  async submit(
    request: AiPreparedRequest,
    settings: AiRequestSettings,
    handlers: { onDelta?: (delta: string) => void } = {},
  ): Promise<AiSubmitResult> {
    if (!settings.apiKey.trim()) {
      this.coordinator.cancel();
      return { status: 'local', request, content: request.localAnswer };
    }

    const token = this.coordinator.start();
    try {
      const content = await this.transport(
        {
          messages: request.messages,
          clientRequestId: request.requestId,
          baseUrl: settings.baseUrl,
          apiKey: settings.apiKey,
          model: settings.model,
          temperature: settings.temperature,
        },
        {
          signal: token.signal,
          onDelta: (delta) => {
            if (this.coordinator.isActive(token)) handlers.onDelta?.(delta);
          },
        },
      );
      if (!this.coordinator.isActive(token)) return { status: 'stale', request };
      return { status: 'completed', request, content };
    } catch (error) {
      if (!this.coordinator.isActive(token)) return { status: 'stale', request };
      const message = error instanceof Error ? error.message : 'AI 请求失败';
      return { status: 'error', request, error: clean(message, 500) };
    } finally {
      this.coordinator.finish(token);
    }
  }

  cancel(): boolean {
    return this.coordinator.cancel();
  }
}
