/**
 * eNSP 本地桥接客户端
 * ------------------------------------------------------------------
 * 所有请求都走 HTTP（默认 http://127.0.0.1:7701），
 * 统一把网络错误 / 超时 / 业务错误转换成 BridgeClientError。
 */
import type {
  BridgeHealth,
  EnspDeviceInfo,
  EnspSessionInfo,
  EnspSessionStatus,
  TopologyDocument,
  TopologyScanResult,
} from '@/types/ensp';
import type { DocKind, DocumentParseResult } from '@/types/import';
import { getEnspSettings, setBridgeSettings } from '@/store/enspStore';

export const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:7701';

export class BridgeClientError extends Error {
  code: string;
  detail?: string;

  constructor(code: string, message: string, detail?: string) {
    super(message);
    this.name = 'BridgeClientError';
    this.code = code;
    this.detail = detail;
  }
}

export interface BridgeResponse<T> {
  ok: true;
  data: T;
}

export interface ScanParams {
  from?: number;
  to?: number;
  ports?: number[];
}

export interface ScanResult {
  ports: number[];
  devices?: EnspDeviceInfo[];
}

export interface ConnectParams {
  port: number;
  username?: string;
  password?: string;
}

export interface ConnectResult {
  sessionId: string;
  port: number;
  device?: EnspDeviceInfo;
}

export interface ExecParams {
  sessionId: string;
  command: string;
  waitMs?: number;
}

export interface ExecResult {
  output: string;
  prompt?: string;
  view?: string;
}

export interface CompleteParams {
  sessionId: string;
  line: string;
  cursor?: number;
  timeoutMs?: number;
}

export interface CompleteResult {
  raw?: string;
  candidates?: string[];
  prompt?: string;
  view?: string;
}

export interface SessionsResult {
  sessions: EnspSessionInfo[];
}

export interface MobaxtermDetectResult {
  found: boolean;
  path?: string;
  candidates?: string[];
}

export interface MobaxtermOpenParams {
  port: number;
  exe?: string;
}

export interface MobaxtermOpenResult {
  launched: boolean;
  exe: string;
  args: string[];
  port: number;
}

export interface McpStatus {
  available: boolean;
  [key: string]: unknown;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

export interface McpToolsResult {
  tools: McpTool[];
}

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiChatPayload {
  messages: AiChatMessage[];
  [key: string]: unknown;
}

export interface AiChatStreamOptions {
  onDelta: (delta: string) => void;
  signal?: AbortSignal;
}

/** 读取当前桥接服务地址（来自本地设置） */
export function getBridgeUrl(): string {
  try {
    const url = getEnspSettings().bridge.bridgeUrl;
    return url && url.trim() ? url.trim() : DEFAULT_BRIDGE_URL;
  } catch {
    return DEFAULT_BRIDGE_URL;
  }
}

/** 修改桥接服务地址并持久化 */
export function setBridgeUrl(url: string) {
  setBridgeSettings({ bridgeUrl: url.trim() || DEFAULT_BRIDGE_URL });
}

function joinUrl(base: string, path: string): string {
  const left = base.replace(/\/+$/, '');
  const right = path.startsWith('/') ? path : `/${path}`;
  return `${left}${right}`;
}

export function terminalSocketUrl(sessionId: string): string {
  const url = new URL(joinUrl(getBridgeUrl(), '/api/ensp/terminal'));
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('sessionId', sessionId);
  return url.toString();
}

export type EnspTerminalTransportState = 'connecting' | 'reconnecting' | 'ready' | 'error';

export interface EnspTerminalStateEvent {
  status: EnspSessionStatus;
  reason?: string;
  attempt?: number;
  maxAttempts?: number;
}

export interface EnspTerminalSocketHandlers {
  onReady: (session: EnspSessionInfo, reconnected: boolean) => void;
  onOutput: (data: string, replay: boolean) => void;
  onState: (event: EnspTerminalStateEvent) => void;
  onTransport: (
    state: EnspTerminalTransportState,
    detail?: { attempt?: number; maxAttempts?: number; message?: string },
  ) => void;
  onError: (message: string, code?: string) => void;
}

const TERMINAL_RECONNECT_ATTEMPTS = 3;
const TERMINAL_STATUSES = new Set<EnspSessionStatus>([
  'connecting',
  'ready',
  'reconnecting',
  'locked',
  'closed',
  'error',
]);

/** 每个实例只连接一个 sessionId；dispose 仅分离订阅，不会删除设备会话。 */
export class EnspTerminalSocket {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private attempts = 0;
  private disposed = false;
  private attached = false;
  private interactive = false;
  private deviceClosed = false;
  private expectReplay = false;
  private hasAttached = false;
  private lastStateSignature = '';

  constructor(
    private readonly sessionId: string,
    private readonly handlers: EnspTerminalSocketHandlers,
  ) {
    this.connect();
  }

  get canWrite(): boolean {
    return this.interactive && this.socket?.readyState === WebSocket.OPEN;
  }

  write(data: string): boolean {
    if (!data || !this.canWrite) return false;
    try {
      this.socket!.send(JSON.stringify({ type: 'input', data }));
      return true;
    } catch {
      return false;
    }
  }

  resize(cols: number, rows: number): boolean {
    const socket = this.socket;
    if (
      !this.attached ||
      this.deviceClosed ||
      socket?.readyState !== WebSocket.OPEN ||
      !Number.isInteger(cols) ||
      !Number.isInteger(rows) ||
      cols < 1 ||
      rows < 1
    ) {
      return false;
    }
    try {
      socket.send(JSON.stringify({ type: 'resize', cols, rows }));
      return true;
    } catch {
      return false;
    }
  }

  /** 仅由明确的「关闭设备会话」操作调用；组件卸载应使用 dispose。 */
  closeSession(): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    try {
      this.socket.send(JSON.stringify({ type: 'close' }));
      this.deviceClosed = true;
      this.interactive = false;
      return true;
    } catch {
      return false;
    }
  }

  reconnect(): void {
    if (this.disposed) return;
    this.attempts = 0;
    this.deviceClosed = false;
    this.connect();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clearReconnect();
    this.closeSocket();
    this.attached = false;
    this.interactive = false;
  }

  private clearReconnect(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private closeSocket(): void {
    const socket = this.socket;
    this.socket = null;
    if (!socket) return;
    socket.onmessage = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.close();
  }

  private connect(notify = true): void {
    if (this.disposed) return;
    this.clearReconnect();
    this.closeSocket();
    this.attached = false;
    this.interactive = false;
    this.expectReplay = false;
    this.lastStateSignature = '';
    if (notify) {
      this.handlers.onTransport(this.attempts ? 'reconnecting' : 'connecting', {
        attempt: this.attempts + 1,
        maxAttempts: TERMINAL_RECONNECT_ATTEMPTS,
      });
    }

    const socket = new WebSocket(terminalSocketUrl(this.sessionId));
    this.socket = socket;
    socket.onmessage = (event) => {
      if (this.disposed || this.socket !== socket) return;
      let message: Record<string, unknown>;
      try {
        message = JSON.parse(String(event.data)) as Record<string, unknown>;
      } catch {
        return;
      }

      if (message.type === 'ready' && message.session && typeof message.session === 'object') {
        const session = message.session as EnspSessionInfo;
        this.attached = true;
        this.deviceClosed = false;
        this.interactive = !session.locked && (!session.status || session.status === 'ready');
        this.expectReplay = true;
        this.attempts = 0;
        this.handlers.onTransport('ready');
        this.handlers.onReady(session, this.hasAttached);
        this.hasAttached = true;
        return;
      }
      if (message.type === 'output' && typeof message.data === 'string') {
        const replay = this.expectReplay;
        this.expectReplay = false;
        this.handlers.onOutput(message.data, replay);
        return;
      }
      if ((message.type === 'state' || message.type === 'status') &&
        typeof message.status === 'string' &&
        TERMINAL_STATUSES.has(message.status as EnspSessionStatus)) {
        const status = message.status as EnspSessionStatus;
        const state: EnspTerminalStateEvent = {
          status,
          reason: typeof message.reason === 'string' ? message.reason : undefined,
          attempt: typeof message.attempt === 'number' ? message.attempt : undefined,
          maxAttempts: typeof message.maxAttempts === 'number' ? message.maxAttempts : undefined,
        };
        const signature = JSON.stringify(state);
        if (signature === this.lastStateSignature) return;
        this.lastStateSignature = signature;
        this.interactive = status === 'ready';
        this.deviceClosed = status === 'closed';
        this.handlers.onState(state);
        return;
      }
      if (message.type === 'error') {
        this.handlers.onError(
          typeof message.message === 'string' ? message.message : '终端通道发生错误',
          typeof message.code === 'string' ? message.code : undefined,
        );
      }
    };
    socket.onclose = () => {
      if (this.disposed || this.socket !== socket) return;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      this.socket = null;
      this.attached = false;
      this.interactive = false;
      this.expectReplay = false;
      if (this.deviceClosed) return;
      if (this.attempts < TERMINAL_RECONNECT_ATTEMPTS) {
        this.attempts += 1;
        this.handlers.onTransport('reconnecting', {
          attempt: this.attempts,
          maxAttempts: TERMINAL_RECONNECT_ATTEMPTS,
        });
        this.reconnectTimer = window.setTimeout(
          () => this.connect(false),
          500 * 2 ** (this.attempts - 1),
        );
      } else {
        this.handlers.onTransport('error', { message: 'WebSocket 重连失败，可手动重连或重新连接设备' });
      }
    };
  }
}

interface RawErrorBody {
  code?: unknown;
  message?: unknown;
  detail?: unknown;
  error?: unknown;
}

function toErrorInfo(body: unknown, status: number): { code: string; message: string; detail?: string } {
  const fallback = `桥接服务返回 HTTP ${status}`;
  if (typeof body === 'string' && body.trim()) {
    return { code: 'bridge_http_error', message: body.trim().slice(0, 400) };
  }
  if (body && typeof body === 'object') {
    const rec = body as RawErrorBody;
    const err = rec.error;
    if (err && typeof err === 'object') {
      const inner = err as RawErrorBody;
      return {
        code: typeof inner.code === 'string' ? inner.code : 'bridge_http_error',
        message: typeof inner.message === 'string' ? inner.message : fallback,
        detail: typeof inner.detail === 'string' ? inner.detail : undefined,
      };
    }
    if (typeof err === 'string' && err) {
      return { code: 'bridge_http_error', message: err };
    }
    if (typeof rec.code === 'string' || typeof rec.message === 'string') {
      return {
        code: typeof rec.code === 'string' ? rec.code : 'bridge_http_error',
        message: typeof rec.message === 'string' ? rec.message : fallback,
        detail: typeof rec.detail === 'string' ? rec.detail : undefined,
      };
    }
  }
  return { code: 'bridge_http_error', message: fallback };
}

/**
 * 通用请求：成功返回 { ok: true, data }，失败抛 BridgeClientError。
 * init.method 缺省为 POST（带 JSON body 时）。
 */
export async function request<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 20000,
): Promise<BridgeResponse<T>> {
  const url = joinUrl(getBridgeUrl(), path);
  const controller = new AbortController();
  const external = init.signal ?? undefined;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onExternalAbort = () => controller.abort();
  if (external) external.addEventListener('abort', onExternalAbort);

  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  try {
    let response: Response;
    try {
      response = await fetch(url, { ...init, headers, signal: controller.signal });
    } catch {
      if (timedOut) {
        throw new BridgeClientError('bridge_timeout', `桥接服务响应超时（${timeoutMs}ms）`);
      }
      if (external?.aborted) {
        throw new BridgeClientError('bridge_aborted', '请求已取消');
      }
      throw new BridgeClientError(
        'bridge_unreachable',
        '无法连接实验桥接服务，请确认桥接程序已启动',
      );
    }

    const text = await response.text();
    let body: unknown;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    if (!response.ok) {
      const info = toErrorInfo(body, response.status);
      throw new BridgeClientError(info.code, info.message, info.detail);
    }

    // 桥接服务统一返回 { ok: true, data } 信封，这里拆一层便于调用方直接使用。
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const envelope = body as Record<string, unknown>;
      if (envelope.ok === true && 'data' in envelope) {
        return { ok: true, data: envelope.data as T };
      }
    }
    return { ok: true, data: body as T };
  } finally {
    clearTimeout(timer);
    if (external) external.removeEventListener('abort', onExternalAbort);
  }
}

function post<T>(path: string, body: unknown, timeoutMs?: number): Promise<BridgeResponse<T>> {
  return request<T>(
    path,
    { method: 'POST', body: JSON.stringify(body) },
    timeoutMs,
  );
}

/* ---------------------------------- API ---------------------------------- */

export function health(timeoutMs?: number): Promise<BridgeResponse<BridgeHealth>> {
  return request<BridgeHealth>('/api/health', { method: 'GET' }, timeoutMs ?? 20000);
}

export function scan(params: ScanParams = {}, timeoutMs?: number): Promise<BridgeResponse<ScanResult>> {
  const query = new URLSearchParams();
  if (params.from != null) query.set('from', String(params.from));
  if (params.to != null) query.set('to', String(params.to));
  if (params.ports?.length) query.set('ports', params.ports.join(','));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<ScanResult>(`/api/ensp/scan${suffix}`, { method: 'GET' }, timeoutMs ?? 60000);
}

export function scanTopology(
  topology: TopologyDocument,
  mappings: Record<string, number> = {},
  timeoutMs?: number,
): Promise<BridgeResponse<TopologyScanResult>> {
  return post<TopologyScanResult>(
    '/api/ensp/scan',
    { topology, mappings },
    timeoutMs ?? 60000,
  );
}

export function importTopology(
  fileName: string,
  content: ArrayBuffer,
  timeoutMs?: number,
): Promise<BridgeResponse<TopologyDocument>> {
  const query = new URLSearchParams({ filename: fileName });
  return request<TopologyDocument>(
    `/api/topo/import?${query.toString()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: content,
    },
    timeoutMs ?? 120000,
  );
}

/**
 * 上传 Word / PDF 文档原始字节，返回解析后的结构化结果（已拆 {ok,data} 信封）。
 * 文档解析可能较慢，默认 60s 超时；可通过 opts.signal 提前取消。
 */
export async function importDocument(
  filename: string,
  content: ArrayBuffer,
  kind: DocKind,
  opts?: { signal?: AbortSignal },
): Promise<DocumentParseResult> {
  const query = new URLSearchParams({ filename, kind });
  const { data } = await request<DocumentParseResult>(
    `/api/import/document?${query.toString()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: content,
      signal: opts?.signal,
    },
    60000,
  );
  return data;
}

export function connect(params: ConnectParams, timeoutMs?: number): Promise<BridgeResponse<ConnectResult>> {
  return post<ConnectResult>('/api/ensp/connect', params, timeoutMs ?? 30000);
}

export function exec(params: ExecParams, timeoutMs?: number): Promise<BridgeResponse<ExecResult>> {
  return post<ExecResult>('/api/ensp/exec', params, timeoutMs ?? 30000);
}

export function complete(
  params: CompleteParams,
  timeoutMs?: number,
): Promise<BridgeResponse<CompleteResult>> {
  return post<CompleteResult>('/api/ensp/complete', params, timeoutMs ?? 4000);
}

export function disconnect(sessionId: string, timeoutMs?: number): Promise<BridgeResponse<unknown>> {
  return post<unknown>('/api/ensp/disconnect', { sessionId }, timeoutMs ?? 10000);
}

export function sessions(timeoutMs?: number): Promise<BridgeResponse<SessionsResult>> {
  return request<SessionsResult>('/api/ensp/sessions', { method: 'GET' }, timeoutMs ?? 10000);
}

export function mobaxtermDetect(timeoutMs?: number): Promise<BridgeResponse<MobaxtermDetectResult>> {
  return request<MobaxtermDetectResult>('/api/mobaxterm/detect', { method: 'GET' }, timeoutMs ?? 10000);
}

export function mobaxtermOpen(
  params: MobaxtermOpenParams,
  timeoutMs?: number,
): Promise<BridgeResponse<MobaxtermOpenResult>> {
  return post<MobaxtermOpenResult>('/api/mobaxterm/open', params, timeoutMs ?? 15000);
}

export function mcpStatus(timeoutMs?: number): Promise<BridgeResponse<McpStatus>> {
  return request<McpStatus>('/api/mcp/status', { method: 'GET' }, timeoutMs ?? 10000);
}

export function mcpTools(timeoutMs?: number): Promise<BridgeResponse<McpToolsResult>> {
  return request<McpToolsResult>('/api/mcp/tools', { method: 'GET' }, timeoutMs ?? 10000);
}

export function mcpCall(
  name: string,
  args: Record<string, unknown> = {},
  timeoutMs = 60000,
): Promise<BridgeResponse<unknown>> {
  return post<unknown>('/api/mcp/call', { name, arguments: args }, timeoutMs);
}

export function topoGenerate(
  payload: Record<string, unknown>,
  timeoutMs = 120000,
): Promise<BridgeResponse<Record<string, unknown>>> {
  return post<Record<string, unknown>>('/api/topo/generate', payload, timeoutMs);
}

/* ----------------------------- netmiko worker ---------------------------- */

/** Python sidecar 健康状态（AI 操作设备 + ntc-templates 结构化解析的增强通道） */
export interface WorkerHealthInfo {
  available: boolean;
  port?: number;
  netmiko?: string;
  templatesReady?: boolean;
  sessions?: number;
  error?: string | null;
}

export interface WorkerConnectParams {
  host: string;
  port: number;
  deviceType?: string;
  username?: string;
  password?: string;
}

export interface WorkerConnectResult {
  sessionId: string;
  prompt?: string;
  hostname?: string;
  view?: string;
  deviceType?: string;
}

export interface WorkerExecParams {
  sessionId: string;
  command: string;
  /** 是否用 ntc-templates 尝试把回显解析为结构化 JSON */
  parse?: boolean;
}

export interface WorkerExecResult {
  output: string;
  prompt?: string;
  hostname?: string;
  view?: string;
  /** ntc-templates 解析出的结构化数据；无匹配模板或解析失败时为 null */
  structured?: unknown;
  parseNote?: string;
}

export interface WorkerParseParams {
  command: string;
  output: string;
  platform?: string;
}

export interface WorkerParseResult {
  structured: unknown;
  parseNote?: string;
}

export function workerHealth(timeoutMs?: number): Promise<BridgeResponse<WorkerHealthInfo>> {
  return request<WorkerHealthInfo>('/api/worker/health', { method: 'GET' }, timeoutMs ?? 10000);
}

export function workerConnect(
  params: WorkerConnectParams,
  timeoutMs?: number,
): Promise<BridgeResponse<WorkerConnectResult>> {
  return post<WorkerConnectResult>('/api/worker/connect', params, timeoutMs ?? 30000);
}

export function workerExec(
  params: WorkerExecParams,
  timeoutMs?: number,
): Promise<BridgeResponse<WorkerExecResult>> {
  return post<WorkerExecResult>('/api/worker/exec', params, timeoutMs ?? 30000);
}

export function workerDisconnect(
  sessionId: string,
  timeoutMs?: number,
): Promise<BridgeResponse<{ sessionId: string }>> {
  return post<{ sessionId: string }>('/api/worker/disconnect', { sessionId }, timeoutMs ?? 10000);
}

export function workerParse(
  params: WorkerParseParams,
  timeoutMs?: number,
): Promise<BridgeResponse<WorkerParseResult>> {
  return post<WorkerParseResult>('/api/worker/parse', params, timeoutMs ?? 15000);
}

/* -------------------------------- AI 流式 -------------------------------- */

function extractDelta(chunk: unknown): string {
  if (typeof chunk === 'string') return chunk;
  if (!chunk || typeof chunk !== 'object') return '';
  const rec = chunk as Record<string, unknown>;
  const choices = rec.choices;
  if (Array.isArray(choices) && choices.length) {
    const choice = choices[0] as Record<string, unknown> | null;
    if (choice) {
      const delta = choice.delta;
      if (delta && typeof delta === 'object') {
        const content = (delta as Record<string, unknown>).content;
        if (typeof content === 'string') return content;
      }
      if (typeof choice.text === 'string') return choice.text;
      const message = choice.message;
      if (message && typeof message === 'object') {
        const content = (message as Record<string, unknown>).content;
        if (typeof content === 'string') return content;
      }
    }
  }
  if (typeof rec.delta === 'string') return rec.delta;
  if (typeof rec.content === 'string') return rec.content;
  return '';
}

function extractStreamError(chunk: unknown): string | null {
  if (!chunk || typeof chunk !== 'object') return null;
  const rec = chunk as Record<string, unknown>;
  const err = rec.error;
  if (!err) return null;
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const message = (err as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
    return 'AI 服务返回未知错误';
  }
  return null;
}

/**
 * 调用桥接服务的 AI 流式接口，按 SSE 解析 `data:` 行。
 * 返回拼接后的完整文本；出错时抛 BridgeClientError。
 */
export async function aiChatStream(
  payload: AiChatPayload,
  options: AiChatStreamOptions,
): Promise<string> {
  const url = joinUrl(getBridgeUrl(), '/api/ai/chat');
  const headers = new Headers({
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: options.signal,
    });
  } catch {
    if (options.signal?.aborted) {
      throw new BridgeClientError('bridge_aborted', '请求已取消');
    }
    throw new BridgeClientError('bridge_unreachable', '无法连接实验桥接服务，请确认桥接程序已启动');
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let body: unknown = text;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        /* 保持纯文本 */
      }
    }
    const info = toErrorInfo(body, response.status);
    throw new BridgeClientError(info.code, info.message, info.detail);
  }

  if (!response.body) {
    throw new BridgeClientError('bridge_stream_error', '桥接服务未返回流式响应');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  const handleData = (data: string): boolean => {
    if (!data) return false;
    if (data === '[DONE]') return true;
    let chunk: unknown;
    try {
      chunk = JSON.parse(data);
    } catch {
      full += data;
      options.onDelta(data);
      return false;
    }
    const error = extractStreamError(chunk);
    if (error) {
      throw new BridgeClientError('ai_stream_error', error);
    }
    const delta = extractDelta(chunk);
    if (delta) {
      full += delta;
      options.onDelta(delta);
    }
    return false;
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':') || !trimmed.startsWith('data:')) continue;
        if (handleData(trimmed.slice(5).trim())) return full;
      }
    }
    if (buffer.trim().startsWith('data:')) {
      handleData(buffer.trim().slice(5).trim());
    }
  } catch (err) {
    if (err instanceof BridgeClientError) throw err;
    if (options.signal?.aborted) {
      throw new BridgeClientError('bridge_aborted', '请求已取消');
    }
    throw new BridgeClientError('bridge_stream_error', 'AI 流式响应解析失败');
  } finally {
    reader.releaseLock();
  }

  return full;
}
