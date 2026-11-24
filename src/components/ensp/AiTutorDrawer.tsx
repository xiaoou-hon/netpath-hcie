import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { LabScenario } from '@/types';
import type { AiSettings } from '@/types/ensp';
import { aiChatStream } from '@/lib/bridge/client';
import {
  AiTutorRequestService,
  prepareAiRequest,
} from '@/lib/bridge/ai-request';
import type {
  AiCommandExecResult,
  AiPreparedRequest,
  AiQuestion,
  AiQuestionKind,
  AiSessionContext,
} from '@/lib/bridge/ai-request';
import { setAiSettings, useEnspSettings } from '@/store/enspStore';
import { Icon, toast } from '@/components/ui';

export interface AiTutorDrawerProps {
  open: boolean;
  onClose: () => void;
  scenario: LabScenario;
  /** 拓扑/设备/会话任一变化都代表新的提问目标。 */
  activeTargetKey: string;
  /** 只在用户点击提问或解释时调用，不能在 render/effect 中主动采样。 */
  captureContext: () => AiSessionContext;
  ai: AiSettings;
  onOpenSettings: () => void;
  onInsertCommand: (cmd: string, device: string) => boolean;
  onExecuteCommand: (cmd: string, device: string) => Promise<AiCommandExecResult | null>;
  /** 手册跳转只预填该提示词，不自动发送模型请求。 */
  initialPrompt?: string;
  /** 由终端或工作台显式操作创建，已冻结目标与会话上下文。 */
  pendingAsk?: AiQuestion | null;
  side?: 'left' | 'right';
  onBusyChange?: (busy: boolean) => void;
  onAnswered?: () => void;
  presentation?: 'floating' | 'inline' | 'drawer';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  requestId: string;
  deviceId: string;
  deviceName: string;
  local?: boolean;
  /** 设备命令执行结果回灌消息，仅参与 AI 历史，不在聊天列表渲染。 */
  kind?: 'exec';
  /** 只作为下一轮 AI 的上下文，不渲染出来（避免执行结果刷屏）。 */
  hidden?: boolean;
}

/** 命令卡片上的单条命令执行状态，就地展示，不新起消息。 */
interface ExecRunState {
  status: 'pending' | 'ok' | 'error';
  result?: AiCommandExecResult;
  error?: string;
}

interface AiCommand {
  device: string;
  command: string;
  reason?: string;
  /** config 先全部执行完，再执行 verify（ping/display 核验），避免一端未配置就测试。 */
  phase?: 'config' | 'verify';
}

interface ParsedAnswer {
  answer: string;
  commands: AiCommand[];
}

/** 验证类命令前缀：即使模型没给 phase，也排在所有配置命令之后执行。 */
const VERIFY_HEAD_RE = /^(?:ping|tracert|traceroute|display|show)\b/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCommands(value: unknown, fallbackDevice: string): AiCommand[] {
  if (!Array.isArray(value)) return [];
  const result: AiCommand[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const requestedDevice = typeof item.device === 'string' ? item.device.trim() : '';
    const command = typeof item.command === 'string' ? item.command : '';
    if (!command) continue;
    result.push({
      device: !requestedDevice || requestedDevice === '当前设备' ? fallbackDevice : requestedDevice,
      command,
      reason: typeof item.reason === 'string' ? item.reason : undefined,
      phase: item.phase === 'config' || item.phase === 'verify' ? item.phase : undefined,
    });
  }
  return result;
}

/** 从回答中提取 JSON（允许 ```json 代码块包裹）。 */
function parseAnswer(text: string, fallbackDevice: string): ParsedAnswer | null {
  const candidates: string[] = [];
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenced) candidates.push(fenced[1]);
  candidates.push(text);
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) candidates.push(text.slice(first, last + 1));

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (!isRecord(parsed) || typeof parsed.answer !== 'string') continue;
      return { answer: parsed.answer, commands: parseCommands(parsed.commands, fallbackDevice) };
    } catch {
      /* 尝试下一个候选 */
    }
  }
  return null;
}

/** 把设备命令执行结果格式化为可回灌对话的文本（AI 与学习者都可读）。 */
function formatExecMessage(result: AiCommandExecResult): string {
  const lines: string[] = [];
  lines.push(`【设备执行结果】设备：${result.deviceName}（${result.viaWorker ? 'netmiko 直连' : '终端通道'}）`);
  lines.push(`命令：${result.command}`);
  if (result.view) lines.push(`视图：${result.view}`);
  if (result.error) {
    lines.push(`错误：${result.error}`);
  } else {
    lines.push('回显：');
    lines.push(result.output?.trim() || '（无回显）');
    if (result.structured != null) {
      lines.push('结构化解析：');
      try {
        lines.push(JSON.stringify(result.structured, null, 2));
      } catch {
        lines.push(String(result.structured));
      }
    } else if (result.parseNote) {
      lines.push(`结构化解析：${result.parseNote}`);
    }
  }
  return lines.join('\n');
}

function AssistantContent({
  messageId,
  content,
  loading,
  deviceName,
  execStates,
}: {
  messageId: string;
  content: string;
  loading: boolean;
  deviceName: string;
  execStates: Record<string, ExecRunState>;
}) {
  const parsed = parseAnswer(content, deviceName);
  if (!parsed) return <div className="ensp-ai-text">{content || (loading ? '思考中…' : '')}</div>;
  const total = parsed.commands.length;
  const states = parsed.commands.map((_, index) => execStates[`${messageId}:${index}`]);
  const okCount = states.filter((state) => state?.status === 'ok').length;
  const failedCount = states.filter((state) => state?.status === 'error').length;
  const running = states.some((state) => state?.status === 'pending');
  const devices = [...new Set(parsed.commands.map((item) => item.device))].join('、');
  const summary = running
    ? `正在执行 ${okCount + failedCount}/${total}`
    : failedCount
      ? `已执行 ${okCount}/${total}，${failedCount} 条失败`
      : `已执行 ${total} 条命令`;
  return (
    <div className="ensp-ai-text">
      <div>{parsed.answer}</div>
      {total > 0 ? (
        <div className="ensp-exec-summary">
          <span className={`badge ${running ? '' : failedCount ? 'warn' : 'ok'}`}>
            {summary}{devices ? ` · ${devices}` : ''}
          </span>
          <details>
            <summary className="tiny faint">查看命令</summary>
            {parsed.commands.map((item, index) => {
              const state = states[index];
              return (
                <div className="ensp-exec-row" key={`${item.command}-${index}`}>
                  <span className="badge accent">{item.device}</span>
                  <code>{item.command}</code>
                  <span className="tiny faint">
                    {state?.status === 'ok'
                      ? '已执行'
                      : state?.status === 'pending'
                        ? '执行中'
                        : state?.status === 'error'
                          ? '失败'
                          : '待执行'}
                  </span>
                </div>
              );
            })}
          </details>
        </div>
      ) : null}
    </div>
  );
}

export function AiTutorDrawer({
  open,
  onClose,
  scenario,
  activeTargetKey,
  captureContext,
  ai,
  onOpenSettings,
  onInsertCommand,
  onExecuteCommand,
  initialPrompt,
  pendingAsk,
  side = 'right',
  onBusyChange,
  onAnswered,
  presentation = 'floating',
}: AiTutorDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [execStates, setExecStates] = useState<Record<string, ExecRunState>>({});
  const autoRunRef = useRef<Set<string>>(new Set());
  const [input, setInput] = useState('');
  const [keyDraft, setKeyDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ requestId: string; message: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const sentPromptRef = useRef<string | null>(null);
  const sentAskRef = useRef<string | null>(null);
  const prevLoadingRef = useRef(false);
  const previousTargetRef = useRef(activeTargetKey);
  const activeRequestRef = useRef<string | null>(null);
  const sequenceRef = useRef(0);
  const serviceRef = useRef<AiTutorRequestService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = new AiTutorRequestService((payload, options) => aiChatStream(payload, options));
  }
  const storeAi = useEnspSettings().ai;
  const aiSettings: AiSettings = {
    ...ai,
    ...storeAi,
    apiKey: storeAi.apiKey || ai.apiKey,
  };
  const hasKey = Boolean(aiSettings.apiKey.trim());

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    onBusyChange?.(loading);
    if (prevLoadingRef.current && !loading) onAnswered?.();
    prevLoadingRef.current = loading;
    // 仅上报状态，不在这里触发任何提问。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => () => {
    serviceRef.current?.cancel();
  }, []);

  const handleListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  useEffect(() => {
    const el = listRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const updateAssistant = (requestId: string, update: (content: string) => string) => {
    setMessages((prev) => prev.map((message) =>
      message.role === 'assistant' && message.requestId === requestId
        ? { ...message, content: update(message.content) }
        : message
    ));
  };

  const submit = async (question: AiQuestion) => {
    const prepared = prepareAiRequest(question, messages);
    if (!prepared.question) return;
    const service = serviceRef.current!;
    const userMessage: ChatMessage = {
      id: `${prepared.requestId}:user`,
      role: 'user',
      content: prepared.question,
      requestId: prepared.requestId,
      deviceId: prepared.deviceId,
      deviceName: prepared.deviceName,
    };
    const assistantMessage: ChatMessage = {
      id: `${prepared.requestId}:assistant`,
      role: 'assistant',
      content: '',
      requestId: prepared.requestId,
      deviceId: prepared.deviceId,
      deviceName: prepared.deviceName,
      local: !hasKey,
    };
    activeRequestRef.current = hasKey ? prepared.requestId : null;
    atBottomRef.current = true;
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');
    setError(null);
    setLoading(hasKey);

    const result = await service.submit(prepared, aiSettings, {
      onDelta: (delta) => updateAssistant(prepared.requestId, (content) => content + delta),
    });
    if (result.status === 'stale') return;
    activeRequestRef.current = null;
    setLoading(false);
    if (result.status === 'local' || result.status === 'completed') {
      updateAssistant(prepared.requestId, () => result.content);
      return;
    }
    setError({ requestId: prepared.requestId, message: result.error });
    setMessages((prev) => prev.filter((message) =>
      !(message.role === 'assistant' && message.requestId === prepared.requestId && !message.content)
    ));
  };

  const createQuestion = (kind: AiQuestionKind, text: string): AiQuestion => {
    sequenceRef.current += 1;
    return {
      id: `ai-${Date.now().toString(36)}-${sequenceRef.current}`,
      kind,
      text,
      context: captureContext(),
    };
  };

  const ask = (kind: AiQuestionKind, text: string) => {
    // captureContext 只存在于这个显式事件入口中。
    void submit(createQuestion(kind, text));
  };

  /** 把执行结果追加为「隐藏」消息：只进入下一轮 AI 历史，不在聊天列表刷屏。 */
  const appendExecMessage = (result: AiCommandExecResult) => {
    sequenceRef.current += 1;
    const id = `exec-${Date.now().toString(36)}-${sequenceRef.current}`;
    setMessages((prev) => [...prev, {
      id,
      role: 'user',
      content: formatExecMessage(result),
      requestId: id,
      deviceId: result.deviceId,
      deviceName: result.deviceName,
      kind: 'exec',
      hidden: true,
    }]);
  };

  /** 包装 onExecuteCommand：执行后把结果回灌对话；失败仍回灌错误消息以便 AI 排查。 */
  const handleExecuteCommand = async (command: string, device: string) => {
    const result = await onExecuteCommand(command, device);
    if (result) appendExecMessage(result);
    return result;
  };

  /** 单条命令执行：状态就地挂在命令卡片上，不新起聊天消息。 */
  const runCommand = async (messageId: string, index: number, command: string, device: string) => {
    const key = `${messageId}:${index}`;
    setExecStates((prev) => ({ ...prev, [key]: { status: 'pending' } }));
    const result = await handleExecuteCommand(command, device);
    setExecStates((prev) => ({
      ...prev,
      [key]: result
        ? { status: result.ok ? 'ok' : 'error', result, error: result.error }
        : { status: 'error', error: '未执行：设备未连接或目标无效' },
    }));
    if (!result) toast(`未执行 ${command}：设备未连接或目标无效`);
    else if (!result.ok) toast(`执行失败：${result.error || result.command}`);
  };

  /** 自动执行一轮回答的命令：先全部配置，再全部验证；同设备串行、跨设备并行。 */
  const runAnswerCommands = async (messageId: string, commands: AiCommand[]) => {
    const indexed = commands.map((command, index) => ({ ...command, index }));
    const isVerify = (item: AiCommand) =>
      item.phase === 'verify' || (!item.phase && VERIFY_HEAD_RE.test(item.command.trim()));
    for (const stage of ['config', 'verify'] as const) {
      // 先跑完所有设备的配置，再统一执行 ping/display 等验证命令。
      const items = indexed.filter((item) => (stage === 'verify' ? isVerify(item) : !isVerify(item)));
      if (!items.length) continue;
      const byDevice = new Map<string, typeof items>();
      for (const item of items) {
        const group = byDevice.get(item.device);
        if (group) group.push(item);
        else byDevice.set(item.device, [item]);
      }
      await Promise.all([...byDevice.values()].map(async (group) => {
        for (const item of group) {
          await runCommand(messageId, item.index, item.command, item.device);
        }
      }));
    }
  };

  // AI 回答完成后自动执行其建议命令，无需逐条手动点击；同一回答只自动执行一次。
  useEffect(() => {
    if (loading || !hasKey) return;
    for (const message of messages) {
      if (message.role !== 'assistant' || message.local || autoRunRef.current.has(message.id)) continue;
      const parsed = parseAnswer(message.content, message.deviceName);
      if (!parsed) continue;
      autoRunRef.current.add(message.id);
      if (!parsed.commands.length) continue;
      void runAnswerCommands(message.id, parsed.commands);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading, hasKey]);

  // 切换拓扑、设备或会话会作废旧请求，但不产生新请求或新解释。
  useEffect(() => {
    if (previousTargetRef.current === activeTargetKey) return;
    previousTargetRef.current = activeTargetKey;
    const cancelledId = activeRequestRef.current;
    if (!serviceRef.current?.cancel()) return;
    activeRequestRef.current = null;
    setLoading(false);
    setError(null);
    if (cancelledId) {
      updateAssistant(cancelledId, (content) => `${content}${content ? '\n\n' : ''}（问题目标已切换，回答已取消）`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTargetKey]);

  // 手册只准备首轮引导；即使已经配置 Key，也必须再点击「发送」。
  useEffect(() => {
    if (!open || !initialPrompt || sentPromptRef.current === initialPrompt) return;
    sentPromptRef.current = initialPrompt;
    setInput(initialPrompt);
    const guideId = `manual-guide-${scenario.id}`;
    setMessages((prev) => prev.some((message) => message.id === guideId) ? prev : [
      ...prev,
      {
        id: guideId,
        role: 'assistant',
        content: `已准备《${scenario.title}》首轮引导：${scenario.summary}\n点击「发送」后才会请求 AI；未配置 Key 时仅显示本地规则说明。`,
        requestId: guideId,
        deviceId: 'manual',
        deviceName: '实验手册',
        local: true,
      },
    ]);
  }, [open, initialPrompt, scenario.id, scenario.title, scenario.summary]);

  // pendingAsk 本身只能由用户显式点击创建；按 id 去重，渲染和 Key 变化都不会重发。
  useEffect(() => {
    if (!open || !pendingAsk || sentAskRef.current === pendingAsk.id) return;
    sentAskRef.current = pendingAsk.id;
    void submit(pendingAsk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pendingAsk?.id]);

  if (!open) return null;

  const visibleMessages = messages.filter((message) => !message.hidden);

  const submitInput = () => {
    const kind = initialPrompt && input.trim() === initialPrompt.trim() ? 'manual' : 'freeform';
    ask(kind, input);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitInput();
    }
  };
  const hintSuggestions = scenario.hints.slice(0, 3);

  const panel = (
    <aside
      className={presentation === 'inline' ? 'ensp-ai-inline' : `ensp-ai-float ${side}${presentation === 'drawer' ? ' ensp-ai-drawer' : ''}`}
      role="dialog"
      aria-modal={presentation === 'drawer' ? true : undefined}
      aria-label="AI 实验助教"
    >
      <div className="ensp-drawer-head">
        <div className="card-title"><Icon name="bolt" size={16} />AI 实验助教</div>
        <span className="spacer" />
        {messages.length > 0 ? (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              serviceRef.current?.cancel();
              activeRequestRef.current = null;
              setLoading(false);
              setMessages([]);
              setExecStates({});
              setError(null);
            }}
            aria-label="清空 AI 对话"
          >清空</button>
        ) : null}
        <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭 AI 助教"><Icon name="close" size={16} /></button>
      </div>

      <div className="ensp-ai-msgs" ref={listRef} onScroll={handleListScroll}>
        {!hasKey ? (
          <div className="block-tip ensp-ai-key-tip">
            <div className="block-label">未配置 Key · 使用本地规则说明</div>
            <p className="small muted">主动提问也不会联网。保存 Key 后，只有点击发送或解释才请求模型；Key 只保存在本机浏览器。</p>
            <div className="hstack" style={{ gap: 8, marginBottom: 10 }}>
              <input
                type="password"
                value={keyDraft}
                onChange={(event) => setKeyDraft(event.target.value)}
                placeholder="sk-..."
                aria-label="AI API Key"
                autoComplete="new-password"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={!keyDraft.trim()}
                onClick={() => {
                  setAiSettings({ apiKey: keyDraft.trim() });
                  setKeyDraft('');
                  toast('AI Key 已保存；不会自动重发之前的问题');
                }}
                aria-label="保存 AI Key"
              >保存 Key</button>
            </div>
            <button type="button" className="btn btn-sm" onClick={onOpenSettings} aria-label="打开设置填写 AI Key">打开完整设置</button>
          </div>
        ) : null}

        {visibleMessages.length === 0 ? (
          <div className="ensp-empty-note">选择终端文本后点「问 AI」，或主动解释当前输入、最近命令/输出。AI 给出的命令会自动执行，结果显示在命令卡片上。</div>
        ) : visibleMessages.map((message) => (
          <div className={`ensp-ai-msg ${message.role}`} key={message.id} data-request-id={message.requestId} data-device-id={message.deviceId}>
            <div className="ensp-ai-request-meta">
              <span>{message.role === 'user' ? '你' : message.local ? '本地规则' : 'AI 助教'} · {message.deviceName}</span>
              <span>请求 {message.requestId}</span>
            </div>
            {message.role === 'assistant' ? (
              <AssistantContent
                messageId={message.id}
                content={message.content}
                loading={loading && activeRequestRef.current === message.requestId}
                deviceName={message.deviceName}
                execStates={execStates}
              />
            ) : <div className="ensp-ai-text">{message.content}</div>}
          </div>
        ))}
        {error ? <div className="ensp-error small" role="alert">请求 {error.requestId} 失败：{error.message}。终端、拓扑、同步与验收不受影响。</div> : null}
        {!hasKey && hintSuggestions.length ? (
          <div className="vstack" style={{ gap: 8 }}>
            <div className="card-title">场景规则建议</div>
            {hintSuggestions.map((hint) => (
              <div className="ensp-hint-row" key={hint}><span className="ensp-check-dot pass" aria-hidden="true" /><span className="small muted">{hint}</span></div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="ensp-ai-quick" aria-label="显式 AI 解释入口">
        <button type="button" className="btn btn-sm" onClick={() => ask('current-input', '请解释当前输入命令的用途、关键参数和注意事项。')} aria-label="解释当前输入">解释当前输入</button>
        <button type="button" className="btn btn-sm" onClick={() => ask('recent', '请解释最近命令及其输出要点；若有错误请说明可能原因和排查步骤。')} aria-label="解释最近命令和输出">解释最近命令/输出</button>
        <button type="button" className="btn btn-sm" onClick={() => ask('diagnose', '请根据有界最近输出诊断可能的报错，并给出排查步骤；不要编造未提供的输出。')} aria-label="诊断最近报错">诊断报错</button>
        <button type="button" className="btn btn-sm" onClick={() => ask('next', '请结合当前场景和验收状态，给我下一组要执行的命令。')} aria-label="让 AI 给出下一组命令">下一组命令</button>
      </div>

      <div className="ensp-drawer-foot">
        <input
          className="ensp-ai-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={loading ? '继续提问将取消上一回答…' : '描述你的问题，Enter 发送'}
          aria-label="向 AI 助教提问"
        />
        <button type="button" className="btn btn-sm btn-primary" onClick={submitInput} disabled={!input.trim()} aria-label="发送问题">发送</button>
      </div>
    </aside>
  );

  if (presentation === 'inline') return panel;
  return createPortal(
    <div className={`ensp-ai-float-layer${presentation === 'drawer' ? ' ensp-ai-drawer-layer' : ''}`}>
      {presentation === 'drawer' ? <button type="button" className="ensp-ai-drawer-backdrop" onClick={onClose} aria-label="关闭 AI 抽屉" /> : null}
      {panel}
    </div>,
    document.body,
  );
}
