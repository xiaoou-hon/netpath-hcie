/** 真机终端的纯数据流工具；不依赖 DOM、React 或桥接服务。 */

export const TERMINAL_REPLAY_LIMIT = 200_000;
export const TERMINAL_AI_OUTPUT_LIMIT = 6_000;

export interface BracketedInput {
  data: string;
  bracketed: boolean;
}

export function unwrapBracketedPaste(data: string): BracketedInput {
  const prefix = '\x1b[200~';
  const suffix = '\x1b[201~';
  const bracketed = data.startsWith(prefix) && data.endsWith(suffix);
  return {
    data: bracketed ? data.slice(prefix.length, -suffix.length) : data,
    bracketed,
  };
}

export function hasInputLineBreak(data: string): boolean {
  return /[\r\n]/.test(unwrapBracketedPaste(data).data);
}

export function inputLineCount(data: string): number {
  return unwrapBracketedPaste(data).data.split(/\r\n|\r|\n/).length;
}

/** 仅用于确认条预览，实际发送的数据不做任何改写。 */
export function inputPreview(data: string, maxLength = 1_600): string {
  const clean = unwrapBracketedPaste(data).data
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\x03/g, '^C')
    .replace(/\r\n?/g, '\n')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength)}\n…（预览已截断，确认后仍发送完整内容）`;
}

/**
 * WebSocket 重连后服务端会先回放有界缓冲。返回回放中尚未展示的尾部，
 * 同时保留断线期间新产生的输出，避免把整段回放重复写入 xterm。
 */
export function unreplayedSuffix(recent: string, replay: string): string {
  if (!replay) return '';
  if (!recent) return replay;
  const maxOverlap = Math.min(recent.length, replay.length);
  const prefix = replay.slice(0, maxOverlap);
  const fallback = new Array<number>(prefix.length).fill(0);
  for (let index = 1, matched = 0; index < prefix.length; index += 1) {
    while (matched > 0 && prefix[index] !== prefix[matched]) matched = fallback[matched - 1];
    if (prefix[index] === prefix[matched]) matched += 1;
    fallback[index] = matched;
  }
  let matched = 0;
  const start = recent.length - maxOverlap;
  for (let index = start; index < recent.length; index += 1) {
    while (matched > 0 && recent[index] !== prefix[matched]) matched = fallback[matched - 1];
    if (recent[index] === prefix[matched]) matched += 1;
    if (matched === prefix.length && index < recent.length - 1) matched = fallback[matched - 1];
  }
  return replay.slice(matched);
}

export function appendBounded(previous: string, data: string, limit = TERMINAL_REPLAY_LIMIT): string {
  return `${previous}${data}`.slice(-limit);
}

/** AI 上下文使用规范化纯文本，并在移除控制序列后限制长度。 */
export function terminalOutputContext(data: string, limit = TERMINAL_AI_OUTPUT_LIMIT): string {
  return data
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b[NO\\^_]/g, '')
    .replace(/\x00/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .slice(-limit);
}

export interface TrackedInput {
  line: string;
  commands: string[];
}

/**
 * 只跟踪最近命令/危险确认所需的近似当前行；补全、历史和执行仍完全由 VRP 处理。
 * resolveCurrent 用于方向键恢复历史后、本地尚无可靠文本时读取 xterm 回显。
 */
export function trackTerminalInput(
  previousLine: string,
  input: string,
  resolveCurrent: () => string,
  accepted = true,
): TrackedInput {
  if (!accepted) return { line: previousLine, commands: [] };
  const data = unwrapBracketedPaste(input).data;
  const commands: string[] = [];
  let line = previousLine;
  let entered = false;

  for (let index = 0; index < data.length; index += 1) {
    const char = data[index];
    if (char === '\x1b') {
      const rest = data.slice(index);
      const csi = /^\x1b\[([0-9;?]*[ -/]*)([@-~])/.exec(rest);
      if (csi) {
        if (csi[2] === 'A' || csi[2] === 'B') line = '';
        index += csi[0].length - 1;
      } else {
        const ss3 = /^\x1bO./.exec(rest);
        if (ss3) index += ss3[0].length - 1;
      }
      continue;
    }
    if (char === '\r' || char === '\n') {
      if (char === '\r' && data[index + 1] === '\n') index += 1;
      const command = line.trim() || (!entered ? resolveCurrent().trim() : '');
      if (command) commands.push(command);
      line = '';
      entered = true;
      continue;
    }
    if (char === '\x03' || char === '\x15') {
      line = '';
      continue;
    }
    if (char === '\x17') {
      line = line.replace(/\S+\s*$/, '');
      continue;
    }
    if (char === '\x7f' || char === '\b') {
      line = Array.from(line).slice(0, -1).join('');
      continue;
    }
    // Tab 与 ? 是交给 VRP 的控制键，不属于最终命令文本。
    if (char === '\t' || char === '?') continue;
    if (char >= ' ') line += char;
  }

  return { line, commands };
}
