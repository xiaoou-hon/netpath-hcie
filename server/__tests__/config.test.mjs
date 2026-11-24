import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig } from '../config.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MISSING_CONFIG = path.join(os.tmpdir(), 'netpath-test-no-config.json');

test('config: localhost from file or environment is normalized to 127.0.0.1', async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'netpath-config-'));
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true }));
  const configPath = path.join(tempRoot, 'bridge.json');
  await fs.writeFile(configPath, JSON.stringify({ host: 'localhost' }));

  assert.equal(loadConfig({ env: {}, configPath }).host, '127.0.0.1');
  assert.equal(loadConfig({ env: { BRIDGE_HOST: 'localhost' }, configPath: MISSING_CONFIG }).host, '127.0.0.1');
  assert.equal(loadConfig({ env: { BRIDGE_HOST: '127.0.0.1' }, configPath: MISSING_CONFIG }).host, '127.0.0.1');
});

test('config: non-loopback listen addresses are rejected', () => {
  for (const host of ['0.0.0.0', '::', '::1', '192.168.1.10', 'example.com']) {
    assert.throws(
      () => loadConfig({ env: { BRIDGE_HOST: host }, configPath: MISSING_CONFIG }),
      /127\.0\.0\.1|loopback/i,
      host,
    );
  }
});

function launchBridge(host, port = '0') {
  const child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, BRIDGE_HOST: host, BRIDGE_PORT: port },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  return { child, output: () => ({ stdout, stderr }) };
}

function waitForExit(child) {
  return new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })));
}

test('config: real bridge process refuses to start on 0.0.0.0', async (t) => {
  const { child, output } = launchBridge('0.0.0.0');
  t.after(() => { if (child.exitCode === null) child.kill(); });

  const result = await Promise.race([
    waitForExit(child),
    new Promise((resolve) => child.stdout.on('data', () => {
      if (output().stdout.includes('Listening on')) resolve({ code: null, signal: null });
    })),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out waiting for bridge rejection')), 3000)),
  ]);

  assert.notEqual(result.code, 0, `Bridge unexpectedly started: ${JSON.stringify(output())}`);
  assert.equal(result.signal, null);
  assert.match(`${output().stdout}${output().stderr}`, /127\.0\.0\.1|loopback/i);
});

test('config: real bridge launched with localhost listens on IPv4 loopback', async (t) => {
  const reservation = net.createServer();
  await new Promise((resolve, reject) => {
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', resolve);
  });
  const { port } = reservation.address();
  await new Promise((resolve) => reservation.close(resolve));

  const { child, output } = launchBridge('localhost', String(port));
  t.after(() => { if (child.exitCode === null) child.kill(); });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Bridge did not listen: ${JSON.stringify(output())}`)), 4000);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Bridge exited early (${code}): ${JSON.stringify(output())}`));
    });
    child.stdout.on('data', () => {
      if (output().stdout.includes(`Listening on http://127.0.0.1:${port}`)) {
        clearTimeout(timer);
        resolve();
      }
    });
  });

  const probeResponse = await fetch(`http://127.0.0.1:${port}/api/health?probe=1`);
  const probe = await probeResponse.json();
  assert.equal(probeResponse.status, 200);
  assert.deepEqual(probe, { ok: true, data: { service: 'netpath-hcie-bridge' } });

  await new Promise((resolve, reject) => {
    const socket = net.connect({ host: '127.0.0.1', port }, resolve);
    socket.once('error', reject);
    socket.once('connect', () => socket.destroy());
  });
});
