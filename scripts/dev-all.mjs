import { spawn, spawnSync } from 'node:child_process';
import config from '../server/config.mjs';

const children = [];
let stopping = false;
let exitCode = 0;

function pipeOutput(stream, name) {
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).replace(/\r$/, '');
      console.log(`[${name}] ${line}`);
      buffer = buffer.slice(index + 1);
    }
  });
  stream.on('end', () => {
    if (buffer) console.log(`[${name}] ${buffer}`);
  });
}

function terminate(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  try {
    if (process.platform === 'win32') {
      // Windows 下结束整棵进程树，避免 Vite/bridge 的子进程残留并占用端口。
      spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    } else {
      child.kill();
    }
  } catch {
    // ignore
  }
}

function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const entry of children) terminate(entry.child);
  exitCode = code;
  setTimeout(() => process.exit(exitCode), 300).unref();
}

function run(name, command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
  children.push({ name, child });
  pipeOutput(child.stdout, name);
  pipeOutput(child.stderr, name);

  child.on('error', (error) => {
    console.error(`[${name}] failed to start: ${error.message}`);
    stopAll(1);
  });

  child.on('exit', (code, signal) => {
    if (stopping) return;
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.error(`[${name}] exited with ${reason}`);
    stopAll(code === 0 ? 0 : 1);
  });

  return child;
}

async function hasHealthyBridge(url) {
  // 旧版 bridge 没有轻量探测，完整健康检查偶发较慢时进行有限重试。
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (!response.ok) return false;
      const payload = await response.json();
      const data = payload?.data;
      return payload?.ok === true && data && typeof data === 'object' && (
        data.service === 'netpath-hcie-bridge' || ('ensp' in data && 'mobaxterm' in data)
      );
    } catch {
      // 连接拒绝表示服务尚未启动；超时则再试一次，避免误判慢响应。
    }
  }
  return false;
}

async function main() {
  const bridgeUrl = `http://${config.host}:${config.port}`;
  if (await hasHealthyBridge(`${bridgeUrl}/api/health?probe=1`)) {
    console.log(`[dev:all] using existing bridge at ${bridgeUrl}`);
  } else {
    run('bridge', process.execPath, ['server/index.mjs']);
  }
  run('vite', process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1']);
}

process.on('SIGINT', () => {
  console.log('[dev:all] received SIGINT, stopping children');
  stopAll(0);
});
process.on('SIGTERM', () => stopAll(0));

main().catch((error) => {
  console.error(`[dev:all] failed to start: ${error.message}`);
  stopAll(1);
});
