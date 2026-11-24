import test, { after, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

// 测试文件位于 src/lib/ 根，向上两级即项目根
const vite = await createServer({
  root: fileURLToPath(new URL('../..', import.meta.url)),
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});
const mod = await vite.ssrLoadModule('/src/lib/imported-store.ts');
const {
  loadImportedTroubleshoot,
  addImportedTroubleshoot,
  removeImportedTroubleshoot,
  loadImportedManuals,
  addImportedManual,
  removeImportedManual,
  newImportId,
} = mod;

after(() => vite.close());

/** 内存版 localStorage，每个用例前重置 */
function makeStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
    key(index) {
      return [...data.keys()][index] ?? null;
    },
    get length() {
      return data.size;
    },
  };
}

const originalStorage = globalThis.localStorage;
beforeEach(() => {
  globalThis.localStorage = makeStorage();
});
afterEach(() => {
  if (originalStorage === undefined) {
    delete globalThis.localStorage;
  } else {
    globalThis.localStorage = originalStorage;
  }
});

const baseTroubleshoot = (overrides = {}) => ({
  id: 'tshoot-base',
  imported: true,
  source: 'case.docx',
  createdAt: 1000,
  title: '基础案例',
  summary: '摘要',
  level: '了解',
  symptom: '现象',
  triageSteps: ['步骤1'],
  rootCauseAnalysis: '根因',
  solution: '方案',
  prevention: ['规避'],
  ...overrides,
});

const baseManual = (overrides = {}) => ({
  id: 'manual-base',
  imported: true,
  source: 'manual.pdf',
  createdAt: 2000,
  title: '基础手册',
  summary: '手册摘要',
  level: '进阶',
  tags: ['导入'],
  steps: [{ title: '步骤1', text: '文本', commands: ['cmd'] }],
  keyCommands: ['cmd'],
  acceptance: ['标准1'],
  ...overrides,
});

test('newImportId 带有正确前缀且不重复', () => {
  assert.ok(newImportId('tshoot').startsWith('tshoot-'));
  assert.ok(newImportId('manual').startsWith('manual-'));
  assert.notEqual(newImportId('x'), newImportId('x'));
});

test('故障排查案例：add 后 load 能读到', () => {
  assert.deepEqual(loadImportedTroubleshoot(), []);
  addImportedTroubleshoot(baseTroubleshoot({ id: 't-1', title: '案例A' }));
  const loaded = loadImportedTroubleshoot();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, 't-1');
  assert.equal(loaded[0].title, '案例A');
});

test('故障排查案例：同 id 去重，后者覆盖前者', () => {
  addImportedTroubleshoot(baseTroubleshoot({ id: 'dup', title: '旧标题', createdAt: 1 }));
  addImportedTroubleshoot(baseTroubleshoot({ id: 'dup', title: '新标题', createdAt: 2 }));
  const loaded = loadImportedTroubleshoot();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].title, '新标题');
  assert.equal(loaded[0].createdAt, 2);
});

test('故障排查案例：remove 按 id 删除并返回剩余', () => {
  addImportedTroubleshoot(baseTroubleshoot({ id: 'r1' }));
  addImportedTroubleshoot(baseTroubleshoot({ id: 'r2' }));
  const remaining = removeImportedTroubleshoot('r1');
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 'r2');
  assert.equal(loadImportedTroubleshoot().length, 1);
});

test('故障排查案例：删除不存在的 id 安全返回原列表', () => {
  addImportedTroubleshoot(baseTroubleshoot({ id: 'keep' }));
  const remaining = removeImportedTroubleshoot('nope');
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 'keep');
});

test('实验手册：add 后 load 能读到', () => {
  assert.deepEqual(loadImportedManuals(), []);
  addImportedManual(baseManual({ id: 'm-1', title: '手册A' }));
  const loaded = loadImportedManuals();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, 'm-1');
  assert.equal(loaded[0].title, '手册A');
});

test('实验手册：同 id 去重，后者覆盖前者', () => {
  addImportedManual(baseManual({ id: 'dup', title: '旧', createdAt: 1 }));
  addImportedManual(baseManual({ id: 'dup', title: '新', createdAt: 2 }));
  const loaded = loadImportedManuals();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].title, '新');
});

test('实验手册：remove 按 id 删除', () => {
  addImportedManual(baseManual({ id: 'm1' }));
  addImportedManual(baseManual({ id: 'm2' }));
  const remaining = removeImportedManual('m1');
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 'm2');
});

test('两个库各自独立，互不污染', () => {
  addImportedTroubleshoot(baseTroubleshoot({ id: 't' }));
  addImportedManual(baseManual({ id: 'm' }));
  assert.equal(loadImportedTroubleshoot().length, 1);
  assert.equal(loadImportedManuals().length, 1);
  assert.equal(loadImportedTroubleshoot()[0].id, 't');
  assert.equal(loadImportedManuals()[0].id, 'm');
});
