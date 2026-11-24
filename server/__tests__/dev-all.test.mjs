import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function waitFor(predicate, message, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(message);
}

function stopTree(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

test('dev:all reuses a healthy NetPath bridge instead of starting a duplicate', async (t) => {
  const bridge = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname !== '/api/health') {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    const data = url.searchParams.get('probe') === '1'
      ? { service: 'netpath-hcie-bridge' }
      : { ensp: {}, mobaxterm: {}, worker: {} };
    res.end(JSON.stringify({ ok: true, data }));
  });
  await new Promise((resolve, reject) => {
    bridge.once('error', reject);
    bridge.listen(0, '127.0.0.1', resolve);
  });
  const { port } = bridge.address();

  const child = spawn(process.execPath, ['scripts/dev-all.mjs'], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, BRIDGE_PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });

  t.after(async () => {
    stopTree(child);
    await new Promise((resolve) => bridge.close(resolve));
  });

  await waitFor(
    () => output.includes('[dev:all] using existing bridge') || child.exitCode !== null,
    `dev:all did not probe the existing bridge: ${output}`,
  );

  assert.equal(child.exitCode, null, `dev:all exited instead of reusing the bridge: ${output}`);
  assert.match(output, /\[dev:all\] using existing bridge/);
  assert.doesNotMatch(output, /already in use/);
  await waitFor(() => output.includes('ready in'), `Vite was not started: ${output}`);
});
