import { spawn } from 'node:child_process';
import config from './config.mjs';

const DEFAULT_INIT_TIMEOUT_MS = 15000;
const DEFAULT_CALL_TIMEOUT_MS = 60000;
const TOPO_TIMEOUT_MS = 180000;
const STDERR_LIMIT = 4096;

export class McpError extends Error {
  constructor(message, code = 'mcp_error', detail) {
    super(message || code);
    this.name = 'McpError';
    this.code = code;
    if (detail !== undefined) this.detail = detail;
  }
}

function isTopoTool(name) {
  return /topo|topology/i.test(name);
}

/**
 * Tiny JSON-RPC 2.0 MCP stdio client (line-delimited JSON).
 */
export class McpClient {
  constructor(options = {}) {
    this.commands = options.commands || config.mcpCommands;
    this.initTimeoutMs = options.initTimeoutMs ?? DEFAULT_INIT_TIMEOUT_MS;
    this.stderrLimit = options.stderrLimit ?? STDERR_LIMIT;

    this.child = null;
    this.command = null;
    this.initialized = false;
    this.tools = [];
    this.serverInfo = null;
    this.version = null;
    this.error = null;
    this.stderr = '';
    this.nextId = 1;
    this.pending = new Map();
    this.stdoutBuffer = '';
    this._starting = null;
    this._closing = false;
    this._activeCommandIndex = 0;
  }

  _spawnAttempt(spec) {
    return new Promise((resolve, reject) => {
      let child;
      try {
        child = spawn(spec, {
          shell: /\s/.test(spec),
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
        });
      } catch (error) {
        reject(error);
        return;
      }

      const onError = (error) => {
        child.removeListener('spawn', onSpawn);
        reject(error);
      };
      const onSpawn = () => {
        child.removeListener('error', onError);
        resolve(child);
      };

      child.once('error', onError);
      child.once('spawn', onSpawn);
    });
  }

  _attach(child, spec) {
    this.child = child;
    this.command = spec;
    this.initialized = false;
    this.tools = [];
    this.stdoutBuffer = '';
    this.stderr = '';
    this.error = null;

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => this._onStdout(chunk));

    child.stdin.on('error', () => {
      // EPIPE when the process dies mid-write; the exit handler reports it.
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      this.stderr = (this.stderr + chunk).slice(-this.stderrLimit);
    });

    child.on('exit', (code, signal) => {
      if (this.child === child) {
        this.child = null;
        this.initialized = false;
        this.error = `MCP process exited (code=${code}, signal=${signal || 'none'})`;
        this._rejectPending(new McpError(this.error));
      }
    });

    child.on('error', (error) => {
      this.error = error.message;
      this._rejectPending(new McpError(error.message));
    });
  }

  _onStdout(chunk) {
    this.stdoutBuffer += chunk;
    let newlineIndex;
    while ((newlineIndex = this.stdoutBuffer.indexOf('\n')) >= 0) {
      const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
      if (!line) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }
      this._onMessage(message);
    }
  }

  _onMessage(message) {
    if (message && message.id !== undefined && this.pending.has(message.id)) {
      const entry = this.pending.get(message.id);
      this.pending.delete(message.id);
      clearTimeout(entry.timer);
      if (message.error) {
        entry.reject(new McpError(message.error.message || 'MCP protocol error', 'mcp_error', message.error));
      } else {
        entry.resolve(message.result);
      }
    }
  }

  _rejectPending(error) {
    for (const [id, entry] of [...this.pending.entries()]) {
      this.pending.delete(id);
      clearTimeout(entry.timer);
      entry.reject(error);
    }
  }

  _send(payload) {
    if (!this.child || !this.child.stdin || this.child.stdin.destroyed) {
      throw new McpError('MCP process is not running');
    }
    this.child.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  _request(method, params, timeoutMs) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new McpError(`Timed out waiting for MCP response to ${method}`, 'timeout'));
      }, timeoutMs);
      if (typeof timer.unref === 'function') timer.unref();
      this.pending.set(id, { resolve, reject, timer });
      try {
        this._send({ jsonrpc: '2.0', id, method, params });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error instanceof McpError ? error : new McpError(error.message));
      }
    });
  }

  _notify(method, params) {
    this._send({ jsonrpc: '2.0', method, params });
  }

  async _handshake() {
    const result = await this._request(
      'initialize',
      {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'netpath-bridge', version: '1.0.0' },
      },
      this.initTimeoutMs,
    );
    this.serverInfo = result?.serverInfo || null;
    this.version = result?.serverInfo?.version || null;
    this._notify('notifications/initialized', {});
    const toolsResult = await this._request('tools/list', {}, this.initTimeoutMs);
    this.tools = Array.isArray(toolsResult?.tools) ? toolsResult.tools : [];
    this.initialized = true;
    this.error = null;
  }

  async _start() {
    let lastError = null;
    for (let attempt = 0; attempt < this.commands.length; attempt += 1) {
      const spec = this.commands[attempt];
      let child;
      try {
        child = await this._spawnAttempt(spec);
      } catch (error) {
        lastError = error;
        if (error.code === 'ENOENT') continue;
        break;
      }

      this._attach(child, spec);
      try {
        await this._handshake();
        return;
      } catch (error) {
        lastError = error;
        this.error = error.message;
        this._teardown();
        break;
      }
    }
    this.error = lastError ? lastError.message : 'No MCP command available';
    throw lastError instanceof McpError
      ? lastError
      : new McpError(`Unable to start MCP server: ${this.error}`);
  }

  _teardown() {
    const child = this.child;
    this.child = null;
    this.initialized = false;
    this._rejectPending(new McpError(this.error || 'MCP server unavailable'));
    if (child) {
      try {
        child.stdin.end();
      } catch {
        // ignore
      }
      try {
        child.kill();
      } catch {
        // ignore
      }
    }
  }

  async _ensureStarted() {
    if (this.child && this.initialized) return;
    if (this._starting) return this._starting;
    this._starting = this._start().finally(() => {
      this._starting = null;
    });
    return this._starting;
  }

  async getTools() {
    await this._ensureStarted();
    return this.tools;
  }

  async callTool(name, args = {}, timeoutMs) {
    if (!name || typeof name !== 'string') {
      throw new McpError('Tool name is required', 'invalid_tool');
    }
    const timeout =
      timeoutMs ?? (isTopoTool(name) ? TOPO_TIMEOUT_MS : DEFAULT_CALL_TIMEOUT_MS);
    await this._ensureStarted();

    const result = await this._request(
      'tools/call',
      { name, arguments: args },
      timeout,
    );

    const content = Array.isArray(result?.content) ? result.content : [];
    const text = content
      .filter((item) => item && item.type === 'text')
      .map((item) => item.text)
      .join('\n');

    if (result?.isError) {
      throw new McpError(text || `MCP tool ${name} returned an error`, 'mcp_error');
    }
    return { text, raw: result };
  }

  /**
   * Snapshot of the client state. Attempts a single background probe when the
   * client has never been started, but never restarts a crashed process here.
   */
  async status() {
    if (!this.child && !this.initialized && !this.error && !this._closing) {
      try {
        await this._ensureStarted();
      } catch (error) {
        this.error = this.error || error.message;
      }
    }
    const alive = Boolean(this.child && this.child.exitCode === null);
    return {
      available: alive && this.initialized,
      command: this.command,
      version: this.version,
      toolsCount: this.tools.length,
      error: this.initialized ? undefined : this.error || undefined,
      stderr: this.stderr ? this.stderr.slice(-1024) : undefined,
    };
  }

  close() {
    this._closing = true;
    this._teardown();
  }
}

export default McpClient;
