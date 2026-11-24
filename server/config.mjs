import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(SERVER_DIR, '..');
export const DEFAULT_CONFIG_PATH = path.join(PROJECT_ROOT, 'ensp-bridge.config.json');

const DEFAULTS = {
  port: 7701,
  host: '127.0.0.1',
  scanRange: [2000, 2050],
  enspPaths: [
    'D:\\eNSP',
    'C:\\Program Files\\Huawei\\eNSP',
    'C:\\Program Files (x86)\\Huawei\\eNSP',
  ],
  mcpCommands: ['ensp-mcp', 'python -m ensp_mcp.server'],
  dshEnspCommand: 'npx --yes dsh-ensp',
  mobaxtermPaths: [
    'D:\\ALL实验\\HCIE 实验\\MobaXterm_Portable_v25.1_CHS\\MobaXterm_Personal_25.1_CHS.exe',
    'C:\\Program Files\\Mobatek\\MobaXterm',
    'C:\\Program Files (x86)\\Mobatek\\MobaXterm',
  ],
  credentials: { username: '', password: '' },
  limits: {
    maxSessions: 8,
    idleTimeoutMs: 600000,
    connectTimeoutMs: 5000,
    execTimeoutMs: 15000,
    completeTimeoutMs: 2000,
    pingTimeoutMs: 40000,
    maxOutputChars: 200000,
  },
};

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function merge(base, override) {
  if (!isPlainObject(override)) return base;
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    out[key] = isPlainObject(value) && isPlainObject(base[key]) ? merge(base[key], value) : value;
  }
  return out;
}

/**
 * Load bridge configuration: defaults, then optional `<project>/ensp-bridge.config.json`,
 * then environment overrides.
 */
export function loadConfig({ env = process.env, configPath = DEFAULT_CONFIG_PATH } = {}) {
  let fileConfig = {};
  try {
    fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    fileConfig = {};
  }

  const config = merge(DEFAULTS, fileConfig);

  if (env.BRIDGE_PORT !== undefined && env.BRIDGE_PORT !== '') {
    const port = Number(env.BRIDGE_PORT);
    if (Number.isFinite(port) && port >= 0 && port <= 65535) config.port = port;
  }
  if (env.BRIDGE_HOST) config.host = String(env.BRIDGE_HOST);

  const requestedHost = String(config.host).trim().toLowerCase();
  if (requestedHost === 'localhost') config.host = '127.0.0.1';
  if (config.host !== '127.0.0.1') {
    throw new Error('Bridge host must be loopback 127.0.0.1; localhost is normalized automatically');
  }

  if (!Array.isArray(config.enspPaths)) config.enspPaths = [...DEFAULTS.enspPaths];
  if (!Array.isArray(config.mcpCommands) || config.mcpCommands.length === 0) {
    config.mcpCommands = [...DEFAULTS.mcpCommands];
  }
  if (!Array.isArray(config.mobaxtermPaths)) {
    config.mobaxtermPaths = [...DEFAULTS.mobaxtermPaths];
  }
  if (!Array.isArray(config.scanRange) || config.scanRange.length !== 2) {
    config.scanRange = [...DEFAULTS.scanRange];
  }

  return config;
}

export const config = loadConfig();

export default config;
