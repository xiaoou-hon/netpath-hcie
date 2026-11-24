import { execFile } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import config from './config.mjs';

const DEFAULT_MNG_PORT = 65514;

function run(file, args, options = {}) {
  return new Promise((resolve) => {
    execFile(
      file,
      args,
      {
        timeout: 5000,
        windowsHide: true,
        maxBuffer: 2 * 1024 * 1024,
        ...options,
      },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          code: error ? error.code : 0,
          stdout: String(stdout || ''),
          stderr: String(stderr || ''),
          error: error || null,
        });
      },
    );
  });
}

function isPortOpen(host, port, timeoutMs = 300) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

function readIni(file) {
  const values = {};
  try {
    const text = fs.readFileSync(file, 'utf8');
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith(';') || line.startsWith('#')) continue;
      const section = /^\[([^\]]+)\]/.exec(line);
      if (section) continue;
      const kv = /^([^=\s]+)\s*=\s*(.*)$/.exec(line);
      if (kv) values[kv[1].trim()] = kv[2].trim();
    }
  } catch {
    // config_server.ini is optional (eNSP may not be installed)
  }
  return values;
}

function findEnspPath(candidates, registryLocation) {
  if (registryLocation && fs.existsSync(registryLocation)) return registryLocation;
  for (const dir of candidates) {
    try {
      if (fs.existsSync(path.join(dir, 'eNSP_Client.exe'))) return dir;
    } catch {
      // ignore unreadable paths
    }
  }
  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir)) return dir;
    } catch {
      // ignore
    }
  }
  return null;
}

async function detectFromRegistry() {
  const result = await run(
    'reg',
    [
      'query',
      'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
      '/s',
      '/f',
      'eNSP',
    ],
    { timeout: 5000 },
  );
  if (!result.stdout) return {};

  const candidates = [];
  let current = {};
  for (const rawLine of result.stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^HKEY_/i.test(line)) {
      if (current.DisplayName || current.InstallLocation) candidates.push(current);
      current = {};
      continue;
    }
    const kv = /^([A-Za-z][\w.]*)\s+REG_\w+\s+(.*)$/.exec(line);
    if (!kv) continue;
    current[kv[1]] = kv[2];
  }
  if (current.DisplayName || current.InstallLocation) candidates.push(current);

  const match =
    candidates.find((c) => /ensp/i.test(c.DisplayName || '')) ||
    candidates.find((c) => /ensp/i.test(c.InstallLocation || '')) ||
    candidates[0];

  if (!match) return {};

  let version = match.DisplayVersion || null;
  if (!version && match.DisplayName) {
    const fromName = /(\d+\.\d+(?:\.\d+)*)/.exec(match.DisplayName);
    if (fromName) version = fromName[1];
  }

  const installLocation = (match.InstallLocation || '')
    .replace(/^"|"$/g, '')
    .replace(/[\\/]+$/, '');
  return {
    displayName: match.DisplayName || null,
    version,
    installLocation: installLocation || null,
  };
}

async function detectVBoxVersion() {
  if (process.platform !== 'win32') return undefined;
  const exe = 'C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe';
  if (!fs.existsSync(exe)) return undefined;
  const result = await run(exe, ['--version'], { timeout: 5000 });
  if (!result.ok) return undefined;
  const text = `${result.stdout}${result.stderr}`.trim();
  const match = /(\d+(?:\.\d+)+)/.exec(text);
  return match ? match[1] : text || undefined;
}

async function detectPythonVersion() {
  const result = await run('python', ['--version'], { timeout: 5000 });
  const text = `${result.stdout}${result.stderr}`.trim();
  if (!text) return undefined;
  const match = /Python\s+([\w.]+)/i.exec(text);
  return match ? match[1] : text;
}

async function detectMcp() {
  const whereResult = await run('where', ['ensp-mcp'], { timeout: 3000 });
  if (whereResult.ok && whereResult.stdout.trim()) {
    return { available: true, command: 'ensp-mcp' };
  }
  const venvPython = path.join(
    process.env.USERPROFILE || '',
    '.venvs',
    'ensp-mcp',
    'Scripts',
    'python.exe',
  );
  if (process.env.USERPROFILE && fs.existsSync(venvPython)) {
    const venvCheck = await run(venvPython, ['-c', 'import ensp_mcp'], { timeout: 5000 });
    if (venvCheck.ok) {
      return { available: true, command: `"${venvPython}" -m ensp_mcp.server` };
    }
  }
  const importResult = await run('python', ['-c', 'import ensp_mcp'], { timeout: 5000 });
  if (importResult.ok) {
    return { available: true, command: 'python -m ensp_mcp.server' };
  }
  return { available: false, command: null };
}

let dshCache = { at: 0, available: false };

async function detectDshEnsp(command) {
  const now = Date.now();
  if (now - dshCache.at < 60000) return dshCache.available;

  const result = await run(`${command} --version`, [], {
    shell: true,
    timeout: 3000,
    killSignal: 'SIGKILL',
  });
  const available = result.ok;
  dshCache = { at: Date.now(), available };
  return available;
}

async function detectRunning(mngPort) {
  if (process.platform === 'win32') {
    const result = await run(
      'tasklist',
      ['/FI', 'IMAGENAME eq eNSP_Client.exe', '/NH'],
      { timeout: 4000 },
    );
    if (/eNSP_Client\.exe/i.test(result.stdout)) return { running: true, via: 'process' };
  }
  const open = await isPortOpen('127.0.0.1', mngPort, 300);
  return { running: open, via: open ? 'port' : null };
}

/**
 * Full environment probe for the local eNSP installation.
 * Every step is best-effort; failures degrade to false/undefined instead of throwing.
 */
export async function detectEnsp(options = {}) {
  const {
    enspPaths = config.enspPaths,
    dshEnspCommand = config.dshEnspCommand,
    mock = false,
  } = options;

  const [registry, vboxVersion, pythonVersion, mcp, dshAvailable] = await Promise.all([
    detectFromRegistry(),
    detectVBoxVersion(),
    detectPythonVersion(),
    detectMcp(),
    detectDshEnsp(dshEnspCommand),
  ]);

  const enspPath = findEnspPath(enspPaths, registry.installLocation);
  const ini = enspPath ? readIni(path.join(enspPath, 'cfg', 'config_server.ini')) : {};
  const mngPort = Number(ini.MNG_PORT) || DEFAULT_MNG_PORT;
  const { running, via } = await detectRunning(mngPort);

  return {
    ensp: {
      installed: Boolean(enspPath),
      path: enspPath,
      version: registry.version || null,
      running,
      consolePort: mngPort,
      mngPort,
    },
    vbox: { version: vboxVersion },
    python: { version: pythonVersion },
    mcp,
    dshEnsp: { available: dshAvailable },
    mock,
    runtime: {
      runningVia: via,
      checkedAt: new Date().toISOString(),
    },
  };
}

export { isPortOpen, readIni };
