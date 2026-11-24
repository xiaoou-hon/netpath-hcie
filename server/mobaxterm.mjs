/**
 * 本机 MobaXterm 接入
 * ------------------------------------------------------------------
 * 只做两件事：
 *   1. 在常见安装位置探测 MobaXterm 可执行文件；
 *   2. 用 `-newtab "telnet <host> <port>"` 启动一个新标签页。
 * 不修改、不反编译 MobaXterm 本体。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const EXE_RE = /^mobaxterm.*\.exe$/i;

function expandEnv(value) {
  return String(value)
    .replace(/%([^%]+)%/g, (whole, name) => {
      const key = Object.keys(process.env).find((k) => k.toLowerCase() === String(name).toLowerCase());
      return key ? process.env[key] : whole;
    })
    .replace(/\$\{([^}]+)\}/g, (whole, name) => process.env[name] ?? whole);
}

function statSafe(target) {
  try {
    return fs.statSync(target);
  } catch {
    return null;
  }
}

/** 目录下找 MobaXterm*.exe，优先 Personal 版 */
function findExeInDir(dir) {
  const stat = statSafe(dir);
  if (!stat || !stat.isDirectory()) return null;
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return null;
  }
  const matches = entries.filter((name) => EXE_RE.test(name)).sort((a, b) => {
    const score = (name) => (name.toLowerCase().includes('personal') ? 0 : 1);
    return score(a) - score(b);
  });
  if (matches.length === 0) return null;
  return path.join(dir, matches[0]);
}

function resolveCandidate(candidate) {
  if (!candidate) return null;
  const expanded = expandEnv(String(candidate).trim());
  if (!expanded) return null;
  const stat = statSafe(expanded);
  if (!stat) return null;
  if (stat.isFile()) return EXE_RE.test(path.basename(expanded)) ? expanded : null;
  if (stat.isDirectory()) return findExeInDir(expanded);
  return null;
}

function defaultRoots() {
  const home = os.homedir();
  const roots = [];
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  roots.push(path.join(programFiles, 'Mobatek', 'MobaXterm'));
  roots.push(path.join(programFilesX86, 'Mobatek', 'MobaXterm'));
  roots.push(path.join(home, 'Documents', 'MobaXterm'));
  roots.push(path.join(home, 'Desktop'));
  roots.push(path.join(home, 'Downloads'));
  roots.push('D:\\MobaXterm');
  roots.push('D:\\MobaXterm_Portable');
  return roots;
}

/**
 * 探测本机 MobaXterm。
 * @param {{ candidates?: string[], includeDefaults?: boolean }} [options]
 *   candidates: 配置文件中的候选路径（文件或目录）；includeDefaults: 是否附带常见安装位置
 * @returns {{ found: boolean, path?: string, candidates: string[] }}
 */
export function detectMobaxterm({ candidates = [], includeDefaults = true } = {}) {
  const list = includeDefaults ? [...candidates, ...defaultRoots()] : [...candidates];
  const tried = [];
  for (const item of list) {
    if (!item) continue;
    const resolved = resolveCandidate(item);
    if (resolved) {
      return { found: true, path: resolved, candidates: [...new Set([...tried, resolved])] };
    }
    const expanded = expandEnv(String(item).trim());
    if (expanded) tried.push(expanded);
  }
  return { found: false, candidates: [...new Set(tried)] };
}

/**
 * 用 MobaXterm 打开一个 telnet 会话标签页。
 * @param {{ exe: string, port: number, host?: string, telnetBinary?: string }} params
 */
export function openMobaxterm({ exe, port, host = '127.0.0.1' }) {
  const target = String(exe || '').trim();
  if (!target || !EXE_RE.test(path.basename(target))) {
    const error = new Error('无效的 MobaXterm 可执行文件路径');
    error.code = 'mobaxterm_invalid_exe';
    throw error;
  }
  const stat = statSafe(target);
  if (!stat || !stat.isFile()) {
    const error = new Error(`MobaXterm 不存在：${target}`);
    error.code = 'mobaxterm_not_found';
    throw error;
  }
  const numericPort = Number(port);
  if (!Number.isInteger(numericPort) || numericPort < 1 || numericPort > 65535) {
    const error = new Error('端口必须是 1–65535 之间的整数');
    error.code = 'invalid_port';
    throw error;
  }

  const command = `telnet ${host} ${numericPort}`;
  const child = spawn(target, ['-newtab', command], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  });
  // 启动失败（权限 / 文件损坏等）不应把桥接进程带崩
  child.on('error', () => undefined);
  child.unref();

  return { launched: true, exe: target, args: ['-newtab', command], port: numericPort };
}
