import net from 'node:net';
import { EventEmitter } from 'node:events';
import { StringDecoder } from 'node:string_decoder';

const IAC = 0xff;
const DONT = 0xfe;
const DO = 0xfd;
const WONT = 0xfc;
const WILL = 0xfb;
const SB = 0xfa;
const SE = 0xf0;

// Options we are willing to enable on our side (ECHO, SUPPRESS-GO-AHEAD, NAWS).
const ACCEPTED_OPTIONS = new Set([1, 3, 31]);

const AUTH_FAILURE_RE = /Login failed|authentication failed|认证失败|Error:\s*Login/i;

export class TelnetError extends Error {
  constructor(code, message, detail) {
    super(message || code);
    this.name = 'TelnetError';
    this.code = code;
    if (detail !== undefined) this.detail = detail;
  }
}

/**
 * Find the last VRP style prompt in `text`.
 * Returns { prompt, index, length } where index points at the newline (or 0) preceding it.
 */
export function findLastPrompt(text) {
  if (!text) return null;
  const re = /(?:^|\n)([<\[][A-Za-z0-9_.\-/:]+[>\]])/g;
  let last = null;
  let match;
  while ((match = re.exec(text)) !== null) {
    last = { prompt: match[1], index: match.index, length: match[0].length };
  }
  return last;
}

/**
 * view: user ('<R1>'), system ('[R1]'), sub ('[R1-GigabitEthernet0/0/0]').
 */
export function detectView(prompt) {
  if (!prompt) return 'unknown';
  if (prompt.startsWith('<')) return 'user';
  if (prompt.startsWith('[')) {
    const inner = prompt.slice(1, -1);
    return inner.includes('-') ? 'sub' : 'system';
  }
  return 'unknown';
}

export function deviceNameFromPrompt(prompt) {
  if (!prompt) return null;
  const inner = prompt.slice(1, -1);
  return inner.split('-')[0] || null;
}

/**
 * 从设备对 Tab 的响应里解析候选命令字。
 * - 唯一匹配：设备只回写「剩余字符」（如 partial=dis 时回写 play），不换行；
 * - 多匹配：逐行（或空格分列）列出候选，最后重印提示符 + partial。
 */
export function parseCompletionCandidates(raw, partial) {
  if (!raw) return [];
  const partialLower = String(partial ?? '').toLowerCase().trim();

  const cleaned = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^[<\[][A-Za-z0-9_.\-/:]+[>\]]/.test(line));
  if (cleaned.length === 0) return [];

  // 唯一补全：只有一段无空白的字符
  if (cleaned.length === 1 && !/\s/.test(cleaned[0])) {
    const suffix = cleaned[0];
    if (!/^[A-Za-z][\w-]*$/.test(suffix)) return [];
    const lower = suffix.toLowerCase();
    // 设备重印完整词时直接返回；只回写剩余字符时与 partial 拼接
    if (partialLower && lower.startsWith(partialLower)) return [suffix];
    return [partialLower ? `${partialLower}${lower}` : suffix];
  }

  // 多匹配：逐行拆 token
  const seen = new Set();
  const out = [];
  for (const line of cleaned) {
    for (const token of line.split(/\s+/)) {
      if (!/^[A-Za-z][\w-]*$/.test(token) || token.length < 2) continue;
      const key = token.toLowerCase();
      if (key === partialLower) continue; // 回显的前缀本身
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(token);
    }
  }
  return out;
}

export function stripAnsi(text) {
  // CSI sequences (colours, cursor movement), OSC sequences and plain ESC pairs.
  return text
    .replace(/\x1b\][^\x07]*(\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b[@-_]/g, '')
    .replace(/\x00/g, '');
}

function mapNetError(err) {
  if (!err) return new TelnetError('socket_error', 'Socket error');
  if (err.code === 'ECONNREFUSED') {
    return new TelnetError('connection_refused', `Connection refused: ${err.message}`);
  }
  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
    return new TelnetError('timeout', `Connection failed: ${err.message}`);
  }
  return new TelnetError('socket_error', err.message || String(err));
}

/**
 * Minimal Telnet client tailored to Huawei VRP consoles.
 * Emits: 'data' (cleaned text), 'close', 'error'.
 */
export class TelnetClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.host = options.host || '127.0.0.1';
    this.maxOutputChars = options.maxOutputChars || 200000;
    this.execTimeoutMs = options.execTimeoutMs || 15000;

    this.socket = null;
    this.closed = false;
    this.transportConnected = false;
    this.authenticated = false;
    this.buffer = '';
    this.totalLen = 0;
    this.waiters = new Set();
    this.decoder = new StringDecoder('utf8');

    this._iacState = 0; // 0=normal, 1=IAC, 2=option, 3=subnegotiation
    this._iacCommand = 0;
    this._subnegotiationIac = false;
    this.nawsEnabled = false;
    this.cols = null;
    this.rows = null;

    this.prompt = null;
    this.view = 'unknown';
    this.deviceName = null;
    this.paginationDisabled = false;
    this.suppressTerminalOutput = false;
    this.lastError = null;
  }

  _write(data) {
    if (!this.socket || this.socket.destroyed || this.closed) {
      throw new TelnetError('socket_error', 'Socket is not connected');
    }
    this.socket.write(data);
  }

  write(data) {
    this._write(data);
  }

  pause() {
    if (this.socket && !this.socket.destroyed) this.socket.pause();
  }

  resume() {
    if (this.socket && !this.socket.destroyed && !this.closed) this.socket.resume();
  }

  resize(cols, rows) {
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1 || cols > 65535 || rows > 65535) {
      throw new TelnetError('invalid_resize', 'Terminal dimensions must be integers between 1 and 65535');
    }
    this.cols = cols;
    this.rows = rows;
    if (this.nawsEnabled) this._sendNaws();
  }

  _sendNaws() {
    if (!this.nawsEnabled || !this.cols || !this.rows) return;
    const dimensions = [
      (this.cols >> 8) & 0xff,
      this.cols & 0xff,
      (this.rows >> 8) & 0xff,
      this.rows & 0xff,
    ];
    const escaped = [];
    for (const byte of dimensions) {
      escaped.push(byte);
      if (byte === IAC) escaped.push(IAC);
    }
    this._write(Buffer.from([IAC, SB, 31, ...escaped, IAC, SE]));
  }

  _writeNegotiation(verb, option) {
    if (!this.socket || this.socket.destroyed) return;
    this.socket.write(Buffer.from([IAC, verb, option]));
  }

  _stripTelnet(chunk) {
    const out = [];
    for (let i = 0; i < chunk.length; i += 1) {
      const byte = chunk[i];
      switch (this._iacState) {
        case 0:
          if (byte === IAC) {
            this._iacState = 1;
          } else {
            out.push(byte);
          }
          break;
        case 1:
          if (byte === IAC) {
            out.push(IAC);
            this._iacState = 0;
          } else if (byte === WILL || byte === WONT || byte === DO || byte === DONT) {
            this._iacCommand = byte;
            this._iacState = 2;
          } else if (byte === SB) {
            this._subnegotiationIac = false;
            this._iacState = 3;
          } else {
            // Two-byte command such as NOP / GA; ignore.
            this._iacState = 0;
          }
          break;
        case 2: {
          const accepted = ACCEPTED_OPTIONS.has(byte);
          if (this._iacCommand === DO) {
            this._writeNegotiation(accepted ? WILL : WONT, byte);
            if (byte === 31) {
              this.nawsEnabled = accepted;
              if (accepted) this._sendNaws();
            }
          } else if (this._iacCommand === WILL) {
            this._writeNegotiation(accepted ? DO : DONT, byte);
          } else if (this._iacCommand === DONT && byte === 31) {
            this.nawsEnabled = false;
          }
          this._iacState = 0;
          break;
        }
        case 3:
          if (this._subnegotiationIac) {
            this._subnegotiationIac = false;
            if (byte === SE) this._iacState = 0;
          } else if (byte === IAC) {
            this._subnegotiationIac = true;
          }
          break;
        default:
          this._iacState = 0;
      }
    }
    return out.length ? Buffer.from(out) : null;
  }

  _append(text) {
    this.buffer += text;
    this.totalLen += text.length;
    if (this.buffer.length > this.maxOutputChars) {
      this.buffer = this.buffer.slice(this.buffer.length - this.maxOutputChars);
    }
  }

  _sliceFrom(absoluteOffset) {
    const bufferStart = this.totalLen - this.buffer.length;
    const relative = Math.max(0, absoluteOffset - bufferStart);
    return this.buffer.slice(relative);
  }

  _onData(chunk) {
    const clean = this._stripTelnet(chunk);
    if (!clean) return;
    let text = this.decoder.write(clean);
    if (!text) return;
    if (!this.suppressTerminalOutput) this.emit('terminalData', text.replace(/\x00/g, ''));
    text = stripAnsi(text);
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    this._append(text);
    this.emit('data', text);
    // 分页提示：自动补空格翻页，避免长输出卡在 ---- More ----。
    if (/----\s*More\s*----\s*$/.test(this.buffer)) {
      try {
        this._write(' ');
      } catch {
        /* socket 已关闭，忽略 */
      }
    }
    this._checkWaiters();
  }

  _checkWaiters() {
    for (const waiter of [...this.waiters]) {
      let value;
      try {
        value = waiter.fn();
      } catch {
        continue;
      }
      if (value) {
        clearTimeout(waiter.timer);
        this.waiters.delete(waiter);
        waiter.resolve(value);
      }
    }
  }

  _waitUntil(fn, timeoutMs) {
    let immediate;
    try {
      immediate = fn();
    } catch {
      immediate = null;
    }
    if (immediate) return Promise.resolve(immediate);

    return new Promise((resolve, reject) => {
      const waiter = { fn, resolve, reject, timer: null };
      waiter.timer = setTimeout(() => {
        this.waiters.delete(waiter);
        reject(new TelnetError('timeout', 'Operation timed out waiting for device output'));
      }, Math.max(1, timeoutMs));
      if (typeof waiter.timer.unref === 'function') waiter.timer.unref();
      this.waiters.add(waiter);
    });
  }

  _rejectWaiters(error) {
    for (const waiter of [...this.waiters]) {
      clearTimeout(waiter.timer);
      this.waiters.delete(waiter);
      waiter.reject(error);
    }
  }

  async connect(port, credentials = {}, timeoutMs = 5000) {
    await this._open(port, timeoutMs);

    const loginTimeout = timeoutMs;
    let prompt;
    try {
      prompt = await this._login(credentials || {}, loginTimeout);
    } catch (error) {
      if (this.transportConnected && !this.authenticated) error.authWaiting = true;
      throw error;
    }
    this.authenticated = true;

    this.prompt = prompt;
    this.view = detectView(prompt);
    this.deviceName = deviceNameFromPrompt(prompt);

    // 真实 console 可能不支持该命令（如 VRP5 AR2220 报 VTY 类型错误）。
    // 初始化仅作分页优化，不把命令回显和报错写进用户可见的终端回放。
    this.suppressTerminalOutput = true;
    try {
      const result = await this._runInitCommand('screen-length 0 temporary', 2000);
      if (result && !/Error:/i.test(result.text)) {
        this.paginationDisabled = true;
        if (result.prompt) {
          this.prompt = result.prompt;
          this.view = detectView(result.prompt);
        }
      }
    } catch {
      // Pagination is an optimisation only; keep the session usable.
    } finally {
      this.suppressTerminalOutput = false;
    }

    return {
      socket: this.socket,
      prompt: this.prompt,
      view: this.view,
      deviceName: this.deviceName,
    };
  }

  _open(port, timeoutMs) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const socket = net.connect({ host: this.host, port });
      this.socket = socket;
      socket.setNoDelay(true);

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        socket.destroy();
        reject(new TelnetError('timeout', `Timed out connecting to ${this.host}:${port}`));
      }, timeoutMs);

      socket.once('connect', () => {
        if (settled) return;
        settled = true;
        this.transportConnected = true;
        clearTimeout(timer);
        resolve();
      });

      socket.once('error', (err) => {
        this.lastError = err;
        const mapped = mapNetError(err);
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(mapped);
        }
      });

      socket.on('error', (err) => {
        this.lastError = err;
        this._rejectWaiters(mapNetError(err));
      });

      socket.on('data', (chunk) => this._onData(chunk));

      socket.on('close', () => {
        this.closed = true;
        const error = new TelnetError('socket_error', 'Connection closed by remote host', null);
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(error);
        }
        this._rejectWaiters(error);
        this.emit('close');
      });
    });
  }

  async _login(credentials, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    const username = credentials.username ?? '';
    const password = credentials.password ?? '';
    let sentUsername = false;
    let sentPassword = false;
    let cursor = 0;
    let wakeCount = 0;

    for (;;) {
      const text = this._sliceFrom(cursor);

      if (AUTH_FAILURE_RE.test(text)) {
        throw new TelnetError('auth_failed', 'Authentication failed (invalid credentials)');
      }

      const promptMatch = findLastPrompt(text);
      if (promptMatch) return promptMatch.prompt;

      if (!sentUsername) {
        const userMatch = /Username:\s*/i.exec(text);
        if (userMatch) {
          sentUsername = true;
          cursor += userMatch.index + userMatch[0].length;
          this._write(`${username}\r\n`);
          continue;
        }
      }

      if (!sentPassword) {
        const passMatch = /Password:\s*/i.exec(text);
        if (passMatch) {
          sentPassword = true;
          cursor += passMatch.index + passMatch[0].length;
          this._write(`${password}\r\n`);
          continue;
        }
      }

      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new TelnetError('timeout', 'Timed out waiting for login prompt');
      }
      const mark = this.totalLen;
      try {
        await this._waitUntil(
          () => (this.totalLen > mark ? true : null),
          Math.min(remaining, 800),
        );
      } catch (error) {
        // 部分 eNSP 镜像只在回车后才输出提示符，空闲时补发回车再等。
        if (wakeCount < 3 && !this.closed) {
          wakeCount += 1;
          this._write('\r\n');
          continue;
        }
        throw error;
      }
    }
  }

  async _runInitCommand(command, timeoutMs) {
    const start = this.totalLen;
    this._write(`${command}\r\n`);
    return this._waitUntil(() => {
      const text = this._sliceFrom(start);
      const promptMatch = findLastPrompt(text);
      if (!promptMatch) return null;
      return { prompt: promptMatch.prompt, text };
    }, timeoutMs);
  }

  async exec(command, options = {}) {
    if (!this.socket || this.socket.destroyed || this.closed) {
      throw new TelnetError('socket_error', 'Socket is not connected');
    }
    const timeoutMs = options.waitMs ?? this.execTimeoutMs;
    const start = this.totalLen;
    this._write(`${command}\r\n`);

    // 若设备迟迟没有回显，补一个空回车把提示符激出来（不重复下发命令）。
    const wakeTimer = setTimeout(() => {
      if (this.closed || this.totalLen !== start) return;
      try {
        this._write('\r');
      } catch {
        /* socket 已关闭，忽略 */
      }
    }, 800);
    if (typeof wakeTimer.unref === 'function') wakeTimer.unref();

    let found;
    try {
      found = await this._waitUntil(() => {
        const text = this._sliceFrom(start);
        const promptMatch = findLastPrompt(text);
        if (!promptMatch) return null;
        const echoIndex = text.indexOf(command);
        // 必须看到命令回显后再出现提示符，否则可能把上一次命令残留的提示符
        // （例如 screen-length 的报错）当成这次命令的结束。
        if (echoIndex < 0) return null;
        if (promptMatch.index < echoIndex + command.length) return null;
        return { text, promptMatch };
      }, timeoutMs);
    } catch (error) {
      if (error instanceof TelnetError) throw error;
      throw new TelnetError('socket_error', error.message);
    } finally {
      clearTimeout(wakeTimer);
    }

    const { text, promptMatch } = found;
    const echoIndex = text.lastIndexOf(command);
    const bodyStart = echoIndex >= 0 ? echoIndex + command.length : 0;
    let output = text.slice(bodyStart, Math.max(bodyStart, promptMatch.index));
    output = output.replace(/^\n+/, '');
    output = output.replace(/^\n/, '').replace(/\n+$/, '');
    output = output.replace(/---- More ----/g, '').replace(/\n+$/, '');

    this.prompt = promptMatch.prompt;
    this.view = detectView(promptMatch.prompt);

    return { output, prompt: this.prompt, view: this.view };
  }

  /**
   * 等待设备输出进入「空闲」：连续 idleMs 没有新数据即返回。
   * 用于 Tab 补全这类不以提示符结束的交互读取。
   */
  async _waitForIdle(idleMs, timeoutMs) {
    const deadline = Date.now() + Math.max(50, timeoutMs);
    while (Date.now() < deadline) {
      if (this.closed) return;
      const mark = this.totalLen;
      await new Promise((resolve) => setTimeout(resolve, Math.min(idleMs, 200)));
      if (this.totalLen === mark) return; // 连续 idleMs 无新数据
    }
  }

  /**
   * 设备端实时补全：向设备发送 partial + Tab，读取候选，再用 Ctrl+C 取消当前
   * 输入行回到干净提示符。返回原始输出与解析出的候选词；失败不抛出（降级到
   * 前端词典补全）。
   */
  async complete(partial, options = {}) {
    if (!this.socket || this.socket.destroyed || this.closed) {
      throw new TelnetError('socket_error', 'Socket is not connected');
    }
    const timeoutMs = options.timeoutMs ?? this.execTimeoutMs;
    const idleMs = options.idleMs ?? 280;
    const safe = String(partial ?? '').replace(/[\r\n\x03]/g, '');
    const start = this.totalLen;
    this._write(`${safe}\t`);

    await this._waitForIdle(idleMs, timeoutMs);
    const raw = this._sliceFrom(start);

    // 取消当前输入行，回到干净提示符，避免 partial 残留影响下一次 exec。
    const cancelStart = this.totalLen;
    try {
      this._write('\x03');
    } catch {
      /* socket 已关闭，忽略 */
    }
    await this._waitForIdle(idleMs, Math.min(timeoutMs, 1200)).catch(() => undefined);
    const afterCancel = this._sliceFrom(cancelStart);
    const promptMatch = findLastPrompt(afterCancel) || findLastPrompt(raw);
    if (promptMatch) {
      this.prompt = promptMatch.prompt;
      this.view = detectView(promptMatch.prompt);
    }

    const candidates = parseCompletionCandidates(raw, safe);
    return { raw, candidates, prompt: this.prompt, view: this.view };
  }

  close() {
    this.closed = true;
    if (this.socket) {
      this.socket.removeAllListeners('data');
      this.socket.destroy();
      this.socket = null;
    }
    this._rejectWaiters(new TelnetError('socket_error', 'Client closed'));
    this.removeAllListeners('data');
  }
}

export default TelnetClient;
