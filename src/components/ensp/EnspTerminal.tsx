import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import type { EnspSessionInfo, EnspSessionStatus } from '@/types/ensp';
import { isDangerousCommand, redactSecrets, resolveInputCommand, viewLabel } from '@/lib/bridge/terminal';
import { EnspTerminalSocket, workerParse } from '@/lib/bridge/client';
import {
  appendBounded,
  hasInputLineBreak,
  inputLineCount,
  inputPreview,
  terminalOutputContext,
  trackTerminalInput,
  unreplayedSuffix,
  unwrapBracketedPaste,
} from '@/lib/bridge/terminal-stream';

export type EnspTerminalInputSource = 'keyboard' | 'paste';

export interface EnspTerminalInputContext {
  sessionId: string;
  deviceId: string;
  source: EnspTerminalInputSource;
  bracketedPaste: boolean;
  currentCommand: string;
  confirmed: boolean;
  /** Task 7 只可 fan-out 标记为 true 的用户输入；AI 写入不经过此回调。 */
  allowFanOut: true;
}

export interface EnspTerminalAiContext {
  sessionId: string;
  deviceId: string;
  deviceName: string;
  prompt: string;
  view: string;
  currentInput: string;
  recentCommands: string[];
  recentOutput: string;
  selection?: string;
}

export interface EnspTerminalHandle {
  /** 实际写入当前会话，不再触发 onInput，供 Task 7 逐目标 fan-out。 */
  write: (data: string) => boolean;
  isWritable: () => boolean;
  getStatus: () => ConnectionStatus;
  getCurrentCommand: () => string;
  focus: () => void;
  getSelection: () => string;
  /** 仅在用户主动提问时读取；字段已有界并脱敏。 */
  getContext: () => EnspTerminalAiContext;
}

export interface EnspTerminalProps {
  scenarioDevice: { id: string; name: string };
  port?: number;
  session?: EnspSessionInfo;
  connecting: boolean;
  active: boolean;
  visible: boolean;
  syncDescription: string;
  syncActive: boolean;
  getSyncDangerousCommands?: () => string[];
  onConnect: () => void;
  onDisconnect: () => void;
  /** xterm 的唯一用户输入出口；组件不会先本地发送，返回 false 表示拦截。 */
  onInput: (data: string, context: EnspTerminalInputContext) => boolean | void;
  onOutput: (text: string) => void;
  onCommand: (command: string) => void;
  onTransportError: (message: string) => void;
  onStatusChange?: (status: 'idle' | EnspSessionStatus) => void;
  onAskAi?: (text: string, context: EnspTerminalAiContext) => void;
  pendingInsert?: { command: string; at: number } | null;
  pendingRun?: { command: string; at: number } | null;
  disabledReason?: string;
}

type ConnectionStatus = 'idle' | EnspSessionStatus;

interface PendingInput {
  label: string;
  preview: string;
  data: string;
  source: EnspTerminalInputSource;
  bracketedPaste: boolean;
  localOnly: boolean;
  cancelData?: string;
}

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  idle: '未连接',
  connecting: '连接中',
  ready: '已连接',
  reconnecting: '正在重连',
  locked: '验收占用中',
  closed: '设备已断开',
  error: '连接异常',
};

const RECENT_COMMAND_LIMIT = 25;
const SELECTION_CONTEXT_LIMIT = 8_000;
// 父页面会保留最近一次 AI 请求；同一对象只能被一个活动终端消费一次。
const consumedInsertRequests = new WeakSet<object>();
const consumedRunRequests = new WeakSet<object>();

export const EnspTerminal = forwardRef<EnspTerminalHandle, EnspTerminalProps>(function EnspTerminal(
  props,
  ref,
) {
  const {
    scenarioDevice,
    port,
    session,
    connecting,
    active,
    visible,
    syncDescription,
    onConnect,
    onDisconnect,
    onAskAi,
    disabledReason,
  } = props;
  const [status, setStatus] = useState<ConnectionStatus>(session ? 'connecting' : 'idle');
  const [pending, setPending] = useState<PendingInput | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastError, setLastError] = useState('');
  const [parseView, setParseView] = useState<{
    loading: boolean;
    command: string;
    structured: unknown;
    note?: string;
    error?: string;
  } | null>(null);

  const hostRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<EnspTerminalSocket | null>(null);
  const reconnectRef = useRef<(() => void) | null>(null);
  const pendingRef = useRef<PendingInput | null>(null);
  const lineRef = useRef('');
  const localLineRef = useRef('');
  const recentCommandsRef = useRef<string[]>([]);
  const rawOutputRef = useRef('');
  const remoteSessionRef = useRef<EnspSessionInfo | undefined>(session);
  const lastSessionPropRef = useRef<EnspSessionInfo | undefined>(session);
  const lastSizeRef = useRef('');
  const followRef = useRef(true);
  const pastingRef = useRef(false);
  const fitFrameRef = useRef<number | null>(null);
  const focusAfterFitRef = useRef(false);
  const resizeTimerRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const activeRef = useRef(active);
  activeRef.current = active;

  if (props.session !== lastSessionPropRef.current) {
    lastSessionPropRef.current = props.session;
    if (props.session) {
      remoteSessionRef.current = { ...remoteSessionRef.current, ...props.session };
    }
  }

  const updatePending = useCallback((next: PendingInput | null) => {
    pendingRef.current = next;
    setPending(next);
  }, []);

  const writeTerminal = useCallback((data: string) => {
    const terminal = terminalRef.current;
    if (!terminal || !data) return;
    const shouldFollow = followRef.current;
    terminal.write(data, () => {
      if (shouldFollow && terminalRef.current === terminal) terminal.scrollToBottom();
    });
  }, []);

  const currentCommand = useCallback(() => {
    const terminal = terminalRef.current;
    const currentSession = remoteSessionRef.current ?? propsRef.current.session;
    const buffer = terminal?.buffer.active;
    const line = buffer?.getLine(buffer.baseY + buffer.cursorY)?.translateToString(true) ?? '';
    return resolveInputCommand(
      line,
      currentSession?.prompt,
      activeRef.current ? localLineRef.current : lineRef.current,
    );
  }, []);

  const trackInput = useCallback((data: string) => {
    const tracked = trackTerminalInput(lineRef.current, data, currentCommand);
    lineRef.current = tracked.line;
    if (!tracked.commands.length) return;
    const commands = [...recentCommandsRef.current, ...tracked.commands].slice(-RECENT_COMMAND_LIMIT);
    recentCommandsRef.current = commands;
    tracked.commands.forEach((command) => propsRef.current.onCommand(command));
  }, [currentCommand]);

  /** 实际传输入口：不会再调用 onInput，因此同步广播不会递归或双发。 */
  const write = useCallback((data: string): boolean => {
    const socket = socketRef.current;
    if (!socket?.canWrite || !data) return false;
    const sent = socket.write(data);
    if (sent) trackInput(data);
    return sent;
  }, [trackInput]);

  const sendResizeNow = useCallback((force = false) => {
    const terminal = terminalRef.current;
    const socket = socketRef.current;
    if (!propsRef.current.visible || !terminal || !socket || terminal.cols < 1 || terminal.rows < 1) return;
    const size = `${terminal.cols}:${terminal.rows}`;
    if (!force && lastSizeRef.current === size) return;
    if (socket.resize(terminal.cols, terminal.rows)) lastSizeRef.current = size;
  }, []);

  const scheduleResize = useCallback(() => {
    if (resizeTimerRef.current !== null) return;
    resizeTimerRef.current = window.setTimeout(() => {
      resizeTimerRef.current = null;
      sendResizeNow();
    }, 80);
  }, [sendResizeNow]);

  const scheduleFit = useCallback((focus = false) => {
    focusAfterFitRef.current ||= focus;
    if (fitFrameRef.current !== null) return;
    fitFrameRef.current = window.requestAnimationFrame(() => {
      fitFrameRef.current = null;
      const host = hostRef.current;
      const terminal = terminalRef.current;
      if (!propsRef.current.visible || !host || !terminal || !host.clientWidth || !host.clientHeight) {
        focusAfterFitRef.current = false;
        return;
      }
      try {
        fitRef.current?.fit();
        scheduleResize();
        if (focusAfterFitRef.current && activeRef.current) terminal.focus();
      } catch {
        // 隐藏/分屏布局尚未稳定时等待下一次 ResizeObserver。
      } finally {
        focusAfterFitRef.current = false;
      }
    });
  }, [scheduleResize]);

  const trackLocalInput = useCallback((data: string, accepted: boolean) => {
    localLineRef.current = trackTerminalInput(localLineRef.current, data, currentCommand, accepted).line;
  }, [currentCommand]);

  const dispatchInput = useCallback((
    data: string,
    source: EnspTerminalInputSource,
    bracketedPaste: boolean,
    confirmed = false,
  ): boolean => {
    const currentProps = propsRef.current;
    const currentSession = currentProps.session;
    if (!currentSession || (!currentProps.syncActive && !socketRef.current?.canWrite)) {
      setLastError('终端尚未就绪或正被验收占用，本次输入未发送');
      return false;
    }
    const command = currentCommand();
    const accepted = currentProps.onInput(data, {
      sessionId: currentSession.sessionId,
      deviceId: currentProps.scenarioDevice.id,
      source,
      bracketedPaste,
      currentCommand: command,
      confirmed,
      allowFanOut: true,
    }) !== false;
    // 未入选同步目标时输入未写入活动终端，必须保留原有本地命令跟踪。
    trackLocalInput(data, accepted);
    return accepted;
  }, [currentCommand, trackLocalInput]);

  const handleUserData = useCallback((data: string, source: EnspTerminalInputSource) => {
    if (!activeRef.current || pendingRef.current || (!propsRef.current.syncActive && !socketRef.current?.canWrite)) return;
    const unwrapped = unwrapBracketedPaste(data);
    const isSingleEnter = unwrapped.data === '\r' || unwrapped.data === '\n';

    if (hasInputLineBreak(data) && !isSingleEnter) {
      const dangerous = unwrapped.data
        .split(/\r\n|\r|\n/)
        .some((line) => isDangerousCommand(line));
      updatePending({
        label: `多行${source === 'paste' ? '粘贴' : '输入'}（${inputLineCount(data)} 行）${dangerous ? ' · 含危险命令' : ''}`,
        preview: inputPreview(data, propsRef.current.syncActive ? Number.MAX_SAFE_INTEGER : 1_600),
        data,
        source,
        bracketedPaste: unwrapped.bracketed,
        localOnly: false,
      });
      return;
    }

    if (isSingleEnter) {
      const command = currentCommand();
      const dangerousCommands = propsRef.current.syncActive
        ? propsRef.current.getSyncDangerousCommands?.() ?? (isDangerousCommand(command) ? [command] : [])
        : isDangerousCommand(command) ? [command] : [];
      if (dangerousCommands.length > 0) {
        updatePending({
          label: `危险命令：${dangerousCommands.join('、')}`,
          preview: dangerousCommands.join('\n'),
          data,
          source,
          bracketedPaste: unwrapped.bracketed,
          localOnly: false,
          cancelData: '\x03',
        });
        return;
      }
    }

    dispatchInput(data, source, unwrapped.bracketed);
    terminalRef.current?.scrollToBottom();
  }, [currentCommand, dispatchInput, updatePending]);

  const pasteText = useCallback((text: string) => {
    const terminal = terminalRef.current;
    if (!terminal || !text || !activeRef.current || (!propsRef.current.syncActive && !socketRef.current?.canWrite)) return;
    pastingRef.current = true;
    try {
      // xterm 统一换行并按设备模式添加 ESC[200~ / ESC[201~。
      terminal.paste(text);
    } finally {
      pastingRef.current = false;
    }
    terminal.focus();
  }, []);

  const copyText = useCallback(async (selectionOnly = false) => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    let text = terminal.getSelection();
    if (!text && !selectionOnly) {
      const buffer = terminal.buffer.active;
      const lines: string[] = [];
      for (let index = 0; index < buffer.length; index += 1) {
        lines.push(buffer.getLine(index)?.translateToString(true) ?? '');
      }
      text = lines.join('\n').trimEnd();
    }
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => {
        copyTimerRef.current = null;
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  }, []);

  const handleParseRecent = useCallback(async () => {
    const terminal = terminalRef.current;
    const commands = recentCommandsRef.current;
    const command = commands.length ? commands[commands.length - 1] : '';
    if (!command) {
      setParseView({ loading: false, command: '', structured: null, error: '尚无已执行的命令可解析' });
      return;
    }
    // 优先解析终端选区；否则取最近一条命令回显之后的输出。
    const selection = (terminal?.getSelection() ?? '').trim();
    let output = selection;
    if (!output) {
      const raw = rawOutputRef.current;
      const idx = raw.lastIndexOf(command);
      output = idx >= 0 ? raw.slice(idx) : raw.slice(-4000);
    }
    setParseView({ loading: true, command, structured: null });
    try {
      const res = await workerParse({ command, output });
      setParseView({
        loading: false,
        command,
        structured: res.data.structured,
        note: res.data.parseNote,
      });
    } catch (err) {
      setParseView({
        loading: false,
        command,
        structured: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const actionsRef = useRef({ pasteText, copyText });
  actionsRef.current = { pasteText, copyText };

  const buildAiContext = useCallback((selection = ''): EnspTerminalAiContext => {
    const currentProps = propsRef.current;
    const currentSession = remoteSessionRef.current ?? currentProps.session;
    const recentOutput = redactSecrets(terminalOutputContext(rawOutputRef.current));
    return {
      sessionId: currentSession?.sessionId ?? '',
      deviceId: currentProps.scenarioDevice.id,
      deviceName: currentSession?.deviceName || currentProps.scenarioDevice.name,
      prompt: currentSession?.prompt ?? '',
      view: currentSession?.view ?? 'user',
      currentInput: redactSecrets(currentCommand()).slice(0, 2_000),
      recentCommands: recentCommandsRef.current.slice(-10).map((command) => redactSecrets(command).slice(0, 500)),
      recentOutput,
      selection: selection
        ? redactSecrets(selection).slice(0, SELECTION_CONTEXT_LIMIT)
        : undefined,
    };
  }, [currentCommand]);

  useImperativeHandle(ref, () => ({
    write,
    isWritable: () => Boolean(socketRef.current?.canWrite),
    getStatus: () => status,
    getCurrentCommand: currentCommand,
    focus: () => terminalRef.current?.focus(),
    getSelection: () => terminalRef.current?.getSelection() ?? '',
    getContext: () => buildAiContext(),
  }), [buildAiContext, currentCommand, status, write]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const terminal = new Terminal({
      cursorBlink: true,
      scrollback: 5_000,
      fontSize: 13,
      fontFamily: 'Cascadia Mono, Consolas, SFMono-Regular, monospace',
      ignoreBracketedPasteMode: false,
      theme: {
        background: '#0a0c10',
        foreground: '#e8e2d4',
        cursor: '#f2c57c',
        selectionBackground: '#4a3f22',
        black: '#11151c',
        green: '#4ade80',
        red: '#f87171',
        cyan: '#f2c57c',
      },
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(host);
    terminalRef.current = terminal;
    fitRef.current = fit;

    const dataDisposable = terminal.onData((data) => {
      handleUserData(data, pastingRef.current ? 'paste' : 'keyboard');
    });
    const scrollDisposable = terminal.onScroll(() => {
      const buffer = terminal.buffer.active;
      followRef.current = buffer.viewportY >= buffer.baseY;
    });
    terminal.attachCustomKeyEventHandler((event) => {
      if (
        event.type === 'keydown' &&
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === 'c'
      ) {
        event.preventDefault();
        event.stopPropagation();
        void actionsRef.current.copyText(true);
        return false;
      }
      // 普通字符、方向键、Tab、? 与 Ctrl+C 均继续走 xterm onData。
      return true;
    });

    const onPaste = (event: ClipboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const text = event.clipboardData?.getData('text/plain') ?? '';
      actionsRef.current.pasteText(text);
    };
    host.addEventListener('paste', onPaste, true);

    const observer = new ResizeObserver(() => scheduleFit());
    observer.observe(host);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') scheduleFit(activeRef.current);
    };
    document.addEventListener('visibilitychange', onVisibility);
    scheduleFit(activeRef.current);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      host.removeEventListener('paste', onPaste, true);
      dataDisposable.dispose();
      scrollDisposable.dispose();
      if (fitFrameRef.current !== null) {
        window.cancelAnimationFrame(fitFrameRef.current);
        fitFrameRef.current = null;
      }
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
      terminal.dispose();
      terminalRef.current = null;
      fitRef.current = null;
    };
  }, [handleUserData, scheduleFit]);

  useEffect(() => {
    if (active) localLineRef.current = lineRef.current;
  }, [active]);

  useEffect(() => {
    propsRef.current.onStatusChange?.(status);
  }, [status]);

  useEffect(() => {
    if (visible) scheduleFit(active);
  }, [active, scheduleFit, visible]);

  useEffect(() => {
    const sessionId = session?.sessionId;
    reconnectRef.current = null;
    remoteSessionRef.current = session;
    lineRef.current = '';
    localLineRef.current = '';
    recentCommandsRef.current = [];
    rawOutputRef.current = '';
    lastSizeRef.current = '';
    followRef.current = true;
    updatePending(null);
    setLastError('');
    terminalRef.current?.reset();

    if (!sessionId) {
      setStatus('idle');
      return;
    }

    const client = new EnspTerminalSocket(sessionId, {
      onTransport: (transport, detail) => {
        if (transport === 'connecting') {
          setStatus('connecting');
        } else if (transport === 'reconnecting') {
          setStatus('reconnecting');
          setLastError('终端通道已断开，正在重连；不会自动重放命令');
          writeTerminal(`\r\n\x1b[33m[终端通道重连 ${detail?.attempt ?? 1}/${detail?.maxAttempts ?? 3}]\x1b[0m\r\n`);
        } else if (transport === 'error') {
          setStatus('error');
          const message = detail?.message ?? '终端通道连接失败';
          setLastError(message);
          writeTerminal(`\r\n\x1b[31m[${message}]\x1b[0m\r\n`);
        }
      },
      onReady: (info, reconnected) => {
        remoteSessionRef.current = info;
        const nextStatus: ConnectionStatus = info.locked || info.status === 'locked'
          ? 'locked'
          : info.status ?? 'ready';
        setStatus(nextStatus);
        setLastError(info.error ?? '');
        if (reconnected) writeTerminal('\r\n\x1b[33m[终端通道已恢复]\x1b[0m\r\n');
        sendResizeNow(true);
        scheduleFit(activeRef.current);
      },
      onOutput: (data, replay) => {
        const fresh = replay ? unreplayedSuffix(rawOutputRef.current, data) : data;
        if (!fresh) return;
        rawOutputRef.current = appendBounded(rawOutputRef.current, fresh);
        writeTerminal(fresh);
        propsRef.current.onOutput(fresh);
      },
      onState: (event) => {
        setStatus(event.status);
        if (event.status === 'ready') setLastError('');
        else if (event.reason) setLastError(event.reason);
        if (event.status === 'locked') updatePending(null);
        if (event.status === 'closed') {
          writeTerminal(`\r\n\x1b[31m[${event.reason || '设备连接已断开'}]\x1b[0m\r\n`);
        }
      },
      onError: (message) => {
        setLastError(message);
        propsRef.current.onTransportError(message);
      },
    });
    socketRef.current = client;
    reconnectRef.current = () => client.reconnect();

    return () => {
      client.dispose();
      if (socketRef.current === client) socketRef.current = null;
      reconnectRef.current = null;
    };
  }, [scheduleFit, sendResizeNow, session?.sessionId, updatePending, writeTerminal]);

  useEffect(() => {
    const request = props.pendingInsert;
    if (!request || consumedInsertRequests.has(request)) return;
    consumedInsertRequests.add(request);
    // 「填入」永不包含回车，避免 AI 建议被意外执行或进入广播。
    const command = request.command.replace(/[\r\n]/g, ' ');
    if (write(command)) trackLocalInput(command, true);
    terminalRef.current?.focus();
  }, [props.pendingInsert?.at, trackLocalInput, write]);

  useEffect(() => {
    const request = props.pendingRun;
    if (!request || consumedRunRequests.has(request)) return;
    consumedRunRequests.add(request);
    const command = request.command.trim();
    if (!command) return;
    // AI 建议命令直接下发到当前设备终端，不再弹确认（设备命令执行无需人工确认）。
    // 连接刚建立时 socket 可能尚未就绪，短重试直到可写或超时。
    const data = `\x03${command}\r`;
    let attempts = 0;
    const trySend = () => {
      attempts += 1;
      if (write(data)) {
        trackLocalInput(data, true);
        terminalRef.current?.focus();
        return;
      }
      if (attempts < 30) window.setTimeout(trySend, 200);
      else setLastError('终端尚未就绪，AI 建议未执行');
    };
    trySend();
  }, [props.pendingRun?.at, write, trackLocalInput]);

  const reconnect = () => {
    updatePending(null);
    setLastError('');
    if (status === 'closed' || status === 'error') onConnect();
    else reconnectRef.current?.();
  };

  const askAi = () => {
    if (!onAskAi || !session) return;
    const selection = terminalRef.current?.getSelection().trim() ?? '';
    const context = buildAiContext(selection);
    const subject = selection
      ? '请解释这段终端选区及其关键输出。'
      : context.currentInput
        ? '请解释当前输入命令的用途和关键参数。'
        : context.recentCommands.length
          ? '请解释最近命令及其输出要点；若有错误请给出排查步骤。'
          : '请解释当前终端提示符和最近输出。';
    const text = [
      subject,
      `设备：${context.deviceName}；会话：${context.sessionId}；提示符：${context.prompt || '未知'}；视图：${context.view}`,
      context.selection ? `用户选区（已脱敏）：\n${context.selection}` : '',
      !selection && context.currentInput ? `当前输入（已脱敏）：${context.currentInput}` : '',
      context.recentCommands.length ? `最近命令（最新在后）：${context.recentCommands.join('；')}` : '',
      `有界最近输出（已脱敏）：\n${context.recentOutput || '（无）'}`,
    ].filter(Boolean).join('\n');
    onAskAi(text, context);
  };

  const effectivePort = session?.port ?? port;
  const online = status === 'ready' || status === 'locked';

  return (
    <div className={`terminal ensp-term${active ? ' active' : ''}${status === 'locked' ? ' is-locked' : ''}`}>
      <div className="terminal-bar">
        <span className={`ensp-term-dot${online ? ' online' : ''}`} />
        <span className="name">
          {scenarioDevice.name} · {viewLabel(session?.view ?? 'user')}
          {effectivePort ? ` · :${effectivePort}` : ''}
        </span>
        <span className="spacer" />
        <button type="button" className="btn btn-sm btn-ghost ensp-term-tool" onClick={() => void copyText()}>
          {copied ? '已复制' : '复制'}
        </button>
        <button type="button" className="btn btn-sm btn-ghost ensp-term-tool" onClick={() => terminalRef.current?.clear()}>
          清屏
        </button>
        {onAskAi && session ? (
          <button
            type="button"
            className="btn btn-sm btn-ghost ensp-term-tool"
            onClick={askAi}
            title="有选区时仅解释授权选区；否则解释当前输入或最近命令/输出"
            aria-label={`${scenarioDevice.name} 选区问 AI；无选区时解释当前输入或最近命令和输出`}
          >
            问 AI
          </button>
        ) : null}
        {session ? (
          <button
            type="button"
            className="btn btn-sm btn-ghost ensp-term-tool"
            onClick={() => void handleParseRecent()}
            title="用 ntc-templates 把最近一条 show/display 回显解析为结构化 JSON；有选区时仅解析选区"
          >
            结构化
          </button>
        ) : null}
        {session ? (
          <>
            {status === 'closed' || status === 'error' ? (
              <button type="button" className="btn btn-sm btn-ghost ensp-term-tool" onClick={reconnect}>
                {status === 'closed' ? '重连设备' : '重连'}
              </button>
            ) : null}
            <button type="button" className="btn btn-sm btn-ghost ensp-term-tool" onClick={onDisconnect}>
              断开
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-sm btn-ghost ensp-term-tool" onClick={onConnect} disabled={connecting || !port}>
            {connecting ? '连接中…' : '连接'}
          </button>
        )}
      </div>

      <div className="ensp-xterm-wrap" onClick={() => terminalRef.current?.focus()}>
        <div className="ensp-xterm-host" ref={hostRef} data-session-id={session?.sessionId} />
        {!session ? (
          <div className="ensp-term-empty">
            <strong>{scenarioDevice.name} 尚未连接</strong>
            <span>{disabledReason ?? '请先映射 Console 端口。'}</span>
            <button type="button" className="btn btn-sm btn-primary" onClick={onConnect} disabled={connecting || !port}>
              {connecting ? '连接中…' : '连接设备'}
            </button>
          </div>
        ) : null}
        {pending ? (
          <div className="ensp-confirm ensp-xterm-confirm" role="alertdialog" aria-label={pending.label}>
            <strong>{pending.label}</strong>
            <pre className="ensp-xterm-preview">{pending.preview}</pre>
            <span className="tiny faint">目标：{pending.localOnly ? scenarioDevice.name : syncDescription}</span>
            <span className="spacer" />
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => {
                const request = pendingRef.current;
                if (!request) return;
                updatePending(null);
                let sent: boolean;
                if (request.localOnly) {
                  sent = write(request.data);
                  if (sent) trackLocalInput(request.data, true);
                } else {
                  sent = dispatchInput(request.data, request.source, request.bracketedPaste, true);
                }
                if (!sent && request.localOnly) setLastError('终端尚未就绪，AI 建议未执行');
                terminalRef.current?.focus();
              }}
            >
              确认发送
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                const request = pendingRef.current;
                updatePending(null);
                if (request?.cancelData) {
                  dispatchInput(request.cancelData, 'keyboard', false);
                }
                terminalRef.current?.focus();
              }}
            >
              取消
            </button>
          </div>
        ) : null}
        {parseView ? (
          <div className="ensp-structured-panel" role="dialog" aria-label="结构化解析结果">
            <div className="ensp-structured-head">
              <strong title={parseView.command}>结构化 · {parseView.command || '（无命令）'}</strong>
              <span className="spacer" />
              <button
                type="button"
                className="btn btn-sm btn-ghost ensp-term-tool"
                onClick={() => setParseView(null)}
              >
                关闭
              </button>
            </div>
            {parseView.loading ? (
              <div className="ensp-structured-body faint">解析中…</div>
            ) : parseView.error ? (
              <div className="ensp-structured-body error">{parseView.error}</div>
            ) : parseView.structured == null ? (
              <div className="ensp-structured-body faint">
                {parseView.note || '未匹配到 ntc-templates 模板，已保留原始回显。'}
              </div>
            ) : (
              <pre className="ensp-structured-body">{JSON.stringify(parseView.structured, null, 2)}</pre>
            )}
          </div>
        ) : null}
      </div>

      <div className="ensp-term-status" role="status" aria-live="polite">
        <span className={`ensp-term-dot${online ? ' online' : ''}`} />
        <span>{STATUS_LABELS[status]}</span>
        {lastError ? <span className="ensp-term-error" title={lastError}>{lastError}</span> : null}
        <span className="spacer" />
        <span>{status === 'locked' ? '验收执行期间输入已锁定' : '真实按键 · Tab 补全 · ↑↓ 历史 · Ctrl+C 中断'}</span>
      </div>
    </div>
  );
});
