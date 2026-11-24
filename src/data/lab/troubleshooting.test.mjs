/**
 * 故障排查案例库数据契约校验
 * ------------------------------------------------------------------
 * 通过 vite SSR 加载 TypeScript 数据模块，断言：
 * 1. 案例数量与 id 序列（tshoot-1 .. tshoot-15）完整，且 id 唯一；
 * 2. 每个案例的五段式字段（triageSteps / rootCauseAnalysis / solution / prevention）非空；
 * 3. correctRepairs 非空且是 repairs 中 id 的子集；
 * 4. answer 命中 rootCauses 中某个选项的 id。
 */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const vite = await createServer({
  root: fileURLToPath(new URL('../../..', import.meta.url)),
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});
const { troubleshootCases } = await vite.ssrLoadModule('/src/data/lab/troubleshooting.ts');
after(() => vite.close());

const EXPECTED_COUNT = 15;

test(`案例库应包含 ${EXPECTED_COUNT} 个案例，id 为 tshoot-1 到 tshoot-15`, () => {
  assert.equal(Array.isArray(troubleshootCases), true);
  assert.equal(troubleshootCases.length, EXPECTED_COUNT);
  const ids = troubleshootCases.map((item) => item.id);
  for (let i = 1; i <= EXPECTED_COUNT; i += 1) {
    assert.ok(ids.includes(`tshoot-${i}`), `缺少案例 tshoot-${i}`);
  }
});

test('所有案例 id 唯一', () => {
  const ids = troubleshootCases.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, `存在重复 id: ${ids.join(', ')}`);
});

test('每个案例的五段式字段都非空', () => {
  for (const item of troubleshootCases) {
    assert.ok(Array.isArray(item.triageSteps) && item.triageSteps.length > 0, `${item.id}: triageSteps 为空`);
    assert.equal(typeof item.rootCauseAnalysis, 'string', `${item.id}: rootCauseAnalysis 不是字符串`);
    assert.ok(item.rootCauseAnalysis.trim().length > 0, `${item.id}: rootCauseAnalysis 为空`);
    assert.equal(typeof item.solution, 'string', `${item.id}: solution 不是字符串`);
    assert.ok(item.solution.trim().length > 0, `${item.id}: solution 为空`);
    assert.ok(Array.isArray(item.prevention) && item.prevention.length > 0, `${item.id}: prevention 为空`);
    for (const step of item.triageSteps) {
      assert.equal(typeof step, 'string', `${item.id}: triageSteps 存在非字符串元素`);
      assert.ok(step.trim().length > 0, `${item.id}: triageSteps 存在空字符串元素`);
    }
    for (const p of item.prevention) {
      assert.equal(typeof p, 'string', `${item.id}: prevention 存在非字符串元素`);
      assert.ok(p.trim().length > 0, `${item.id}: prevention 存在空字符串元素`);
    }
  }
});

test('correctRepairs 非空且是 repairs 中 id 的子集', () => {
  for (const item of troubleshootCases) {
    assert.ok(Array.isArray(item.correctRepairs) && item.correctRepairs.length > 0, `${item.id}: correctRepairs 为空`);
    assert.ok(Array.isArray(item.repairs) && item.repairs.length > 0, `${item.id}: repairs 为空`);
    const repairIds = new Set(item.repairs.map((r) => r.id));
    for (const id of item.correctRepairs) {
      assert.ok(repairIds.has(id), `${item.id}: correctRepairs 中的 ${id} 不在 repairs 里`);
    }
    assert.equal(new Set(item.correctRepairs).size, item.correctRepairs.length, `${item.id}: correctRepairs 存在重复 id`);
  }
});

test('answer 属于 rootCauses 中某个选项的 id', () => {
  for (const item of troubleshootCases) {
    assert.ok(Array.isArray(item.rootCauses) && item.rootCauses.length > 0, `${item.id}: rootCauses 为空`);
    assert.equal(typeof item.answer, 'string', `${item.id}: answer 不是字符串`);
    const causeIds = item.rootCauses.map((c) => c.id);
    assert.ok(causeIds.includes(item.answer), `${item.id}: answer=${item.answer} 不在 rootCauses 的 id 列表 [${causeIds.join(', ')}] 中`);
    assert.equal(new Set(causeIds).size, causeIds.length, `${item.id}: rootCauses 存在重复 id`);
  }
});
