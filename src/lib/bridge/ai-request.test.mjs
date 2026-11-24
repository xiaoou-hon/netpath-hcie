import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AI_CONTEXT_LIMITS,
  AiRequestCoordinator,
  AiTutorRequestService,
  prepareAiRequest,
  resolveAiTargetRole,
} from './ai-request.ts';

const devices = [
  { id: 'r1', name: 'R1' },
  { id: 'r2', name: 'R2' },
];

const settings = {
  baseUrl: 'https://example.invalid/v1',
  apiKey: 'sk-test-key',
  model: 'mock-model',
  temperature: 0,
};

function makeContext(overrides = {}) {
  return {
    topology: { id: 'topology-1', name: '双设备实验', source: 'fallback-xml' },
    scenario: { id: 'lab-1', title: '静态路由', summary: '完成双设备互通', hints: ['先配置接口地址', '用 display 核查'] },
    device: { id: 'r1', name: 'R1' },
    sessionId: 'session-r1',
    prompt: '<R1>',
    view: 'user',
    currentInput: 'display ip interface brief',
    recentCommands: ['system-view', 'interface GigabitEthernet0/0/0'],
    recentOutput: '<R1>display version\nVRP Version 5.130',
    acceptanceSummary: '接口地址：未运行',
    sessions: [
      { deviceId: 'r1', deviceName: 'R1', sessionId: 'session-r1', prompt: '<R1>' },
      { deviceId: 'r2', deviceName: 'R2', sessionId: 'session-r2', prompt: '[R2]' },
    ],
    syncTargets: [{ deviceId: 'r1', deviceName: 'R1', sessionId: 'session-r1' }],
    ...overrides,
  };
}

function makeQuestion(kind = 'current-input', contextOverrides = {}, text = '请解释当前输入') {
  return {
    id: `request-${kind}`,
    kind,
    text,
    context: makeContext(contextOverrides),
  };
}

function prepared(kind = 'current-input', contextOverrides = {}, history = []) {
  return prepareAiRequest(makeQuestion(kind, contextOverrides), history);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('AI command target resolves an explicit device and rejects unknown devices', () => {
  assert.equal(resolveAiTargetRole('R2', devices, 'r1'), 'r2');
  assert.equal(resolveAiTargetRole('r2', devices, 'r1'), 'r2');
  assert.equal(resolveAiTargetRole('当前设备', devices, 'r1'), 'r1');
  assert.equal(resolveAiTargetRole('R3', devices, 'r1'), null);
});

test('a new AI request aborts the old request and owns completion', () => {
  const coordinator = new AiRequestCoordinator();
  const first = coordinator.start();
  const second = coordinator.start();

  assert.equal(first.signal.aborted, true);
  assert.equal(second.signal.aborted, false);
  assert.equal(coordinator.isActive(first), false);
  assert.equal(coordinator.isActive(second), true);
  assert.equal(coordinator.finish(first), false);
  assert.equal(coordinator.isActive(second), true);
  assert.equal(coordinator.finish(second), true);
  assert.equal(coordinator.isActive(second), false);
});

test('cancelling an AI request aborts it and ignores its finalizer', () => {
  const coordinator = new AiRequestCoordinator();
  const request = coordinator.start();
  assert.equal(coordinator.cancel(), true);
  assert.equal(coordinator.cancel(), false);
  assert.equal(request.signal.aborted, true);
  assert.equal(coordinator.isActive(request), false);
  assert.equal(coordinator.finish(request), false);
});

test('request context correlates request, topology, device, session and sync target', () => {
  const request = prepared('recent');
  const system = request.messages[0].content;
  assert.equal(request.requestId, 'request-recent');
  assert.equal(request.deviceId, 'r1');
  for (const expected of [
    'request-recent', 'topology-1', '双设备实验', 'fallback-xml',
    'R1/r1', 'session-r1', '<R1>', '同步目标快照', '接口地址：未运行',
  ]) {
    assert.ok(system.includes(expected), `missing context: ${expected}`);
  }
  assert.equal(request.messages.at(-1).content, '请解释当前输入');
});

test('all outbound context and history are redacted before truncation', () => {
  const request = prepared('recent', {
    currentInput: 'password cipher current-secret',
    recentCommands: ['api_key=command-secret'],
    recentOutput: 'token=output-secret and sk-live-SECRET',
    acceptanceSummary: 'Authorization: Bearer acceptance-secret',
  }, [
    { role: 'user', content: 'password simple history-secret', deviceId: 'r1' },
    { role: 'assistant', content: 'safe answer', deviceId: 'r1' },
  ]);
  const outbound = JSON.stringify(request.messages);
  for (const secret of [
    'current-secret', 'command-secret', 'output-secret', 'sk-live-SECRET',
    'acceptance-secret', 'history-secret',
  ]) {
    assert.equal(outbound.includes(secret), false, secret);
  }
  assert.ok(outbound.includes('******'));
  const withSecretQuestion = prepareAiRequest(makeQuestion('freeform', {}, '请分析 pwd=question-secret'));
  assert.equal(JSON.stringify(withSecretQuestion.messages).includes('question-secret'), false);
});

test('context bounds retain recent output tail, ten commands and six history messages', () => {
  const history = Array.from({ length: 10 }, (_, index) => ({
    role: index % 2 ? 'assistant' : 'user',
    content: `history-${index}-${'h'.repeat(3000)}`,
    deviceId: 'r1',
  }));
  const request = prepared('recent', {
    currentInput: 'i'.repeat(5000),
    recentCommands: Array.from({ length: 30 }, (_, index) => `command-${index}-${'c'.repeat(600)}`),
    recentOutput: `output-start-${'o'.repeat(10000)}-output-end`,
  }, history);
  const system = request.messages[0].content;
  assert.equal(system.includes('output-start-'), false);
  assert.equal(system.includes('-output-end'), true);
  assert.equal(system.includes('command-0-'), false);
  assert.equal(system.includes('command-29-'), true);
  assert.equal(request.messages.length, 1 + AI_CONTEXT_LIMITS.historyMessages + 1);
  assert.equal(request.messages[1].content.length <= AI_CONTEXT_LIMITS.historyContent, true);
  assert.equal(request.messages.at(-2).content.startsWith('history-9-'), true);
  assert.equal(system.length < 20_000, true);
});

test('selection questions omit history, current input and recent commands but keep bounded authorized context', () => {
  const request = prepared('selection', {
    currentInput: 'do-not-send-current-input',
    recentCommands: ['do-not-send-recent-command'],
    recentOutput: 'bounded-terminal-output',
    selection: `authorized-selection-${'s'.repeat(9000)}`,
  }, [{ role: 'user', content: 'do-not-send-history', deviceId: 'r1' }]);
  const outbound = JSON.stringify(request.messages);
  assert.equal(request.messages.length, 2);
  assert.ok(outbound.includes('authorized-selection-'));
  assert.ok(outbound.includes('bounded-terminal-output'));
  assert.equal(outbound.includes('do-not-send-current-input'), false);
  assert.equal(outbound.includes('do-not-send-recent-command'), false);
  assert.equal(outbound.includes('do-not-send-history'), false);
  assert.equal(outbound.length < 18_000, true);
});

test('constructing service and workbench activity without explicit submit makes zero network requests', async () => {
  let calls = 0;
  const service = new AiTutorRequestService(async () => {
    calls += 1;
    return 'unexpected';
  });
  // 输入、输出、切标签、同步只更新各自状态，不调用 submit；cancel 也不会联网。
  for (const _event of ['input', 'command', 'output', 'tab-change', 'sync-input']) {
    // 此处没有 AI 提交是请求门禁的一部分。
  }
  assert.equal(service.cancel(), false);
  await Promise.resolve();
  assert.equal(calls, 0);
});

test('blank or missing API key uses deterministic local explanation with zero transport calls', async () => {
  let calls = 0;
  const service = new AiTutorRequestService(async () => {
    calls += 1;
    return 'unexpected';
  });
  for (const apiKey of ['', '   ']) {
    const result = await service.submit(prepared('current-input'), { ...settings, apiKey });
    assert.equal(result.status, 'local');
    assert.match(result.content, /本地规则说明（未联网，未调用模型）/);
    assert.match(result.content, /display ip interface brief/);
  }
  assert.equal(calls, 0);
});

test('each explicit submit creates exactly one correlated streaming request', async () => {
  const payloads = [];
  const deltas = [];
  const service = new AiTutorRequestService(async (payload, options) => {
    payloads.push(payload);
    options.onDelta(`answer-${payload.clientRequestId}`);
    return `answer-${payload.clientRequestId}`;
  });
  const first = prepared('current-input');
  const second = prepareAiRequest({ ...makeQuestion('recent'), id: 'request-second' });
  const firstResult = await service.submit(first, settings, { onDelta: (delta) => deltas.push(delta) });
  const secondResult = await service.submit(second, settings, { onDelta: (delta) => deltas.push(delta) });

  assert.equal(payloads.length, 2);
  assert.deepEqual(payloads.map((payload) => payload.clientRequestId), ['request-current-input', 'request-second']);
  assert.equal(firstResult.status, 'completed');
  assert.equal(secondResult.status, 'completed');
  assert.deepEqual(deltas, ['answer-request-current-input', 'answer-request-second']);
});

test('latest request wins: old signal aborts and old deltas/completion are ignored', async () => {
  const first = deferred();
  const second = deferred();
  const calls = [];
  const deltas = [];
  const service = new AiTutorRequestService((payload, options) => {
    calls.push({ payload, options });
    return calls.length === 1 ? first.promise : second.promise;
  });
  const firstResultPromise = service.submit(prepared('current-input'), settings, {
    onDelta: (delta) => deltas.push(delta),
  });
  const secondQuestion = prepareAiRequest({ ...makeQuestion('recent'), id: 'request-new-target' });
  const secondResultPromise = service.submit(secondQuestion, settings, {
    onDelta: (delta) => deltas.push(delta),
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.signal.aborted, true);
  calls[0].options.onDelta('stale-delta');
  calls[1].options.onDelta('fresh-delta');
  second.resolve('fresh-answer');
  assert.equal((await secondResultPromise).status, 'completed');
  first.resolve('stale-answer');
  assert.equal((await firstResultPromise).status, 'stale');
  assert.deepEqual(deltas, ['fresh-delta']);
});

test('switching question target cancels transport and ignores late stream events', async () => {
  const pending = deferred();
  let streamOptions;
  const deltas = [];
  const service = new AiTutorRequestService(async (_payload, options) => {
    streamOptions = options;
    return pending.promise;
  });
  const resultPromise = service.submit(prepared('selection', { selection: 'authorized' }), settings, {
    onDelta: (delta) => deltas.push(delta),
  });
  assert.equal(service.cancel(), true);
  assert.equal(streamOptions.signal.aborted, true);
  streamOptions.onDelta('late-delta');
  pending.resolve('late-answer');
  assert.equal((await resultPromise).status, 'stale');
  assert.deepEqual(deltas, []);
});

test('a no-key follow-up cancels an older remote request without another network call', async () => {
  const pending = deferred();
  let calls = 0;
  const service = new AiTutorRequestService(async () => {
    calls += 1;
    return pending.promise;
  });
  const remoteResult = service.submit(prepared('current-input'), settings);
  const localResult = await service.submit(
    prepareAiRequest({ ...makeQuestion('recent'), id: 'request-local-new' }),
    { ...settings, apiKey: '' },
  );
  assert.equal(localResult.status, 'local');
  pending.resolve('old-answer');
  assert.equal((await remoteResult).status, 'stale');
  assert.equal(calls, 1);
});

test('AI transport failure is contained, redacted and never retried automatically', async () => {
  let calls = 0;
  const service = new AiTutorRequestService(async () => {
    calls += 1;
    throw new Error('upstream rejected sk-live-SECRET');
  });
  const result = await service.submit(prepared('diagnose'), settings);
  assert.equal(result.status, 'error');
  assert.equal(result.error.includes('sk-live-SECRET'), false);
  assert.equal(calls, 1);
});

test('history is limited to the same device and excludes local fallback cards', () => {
  const request = prepared('recent', {}, [
    { role: 'user', content: 'same-device', deviceId: 'r1' },
    { role: 'user', content: 'other-device', deviceId: 'r2' },
    { role: 'assistant', content: 'local-only', deviceId: 'r1', local: true },
    { role: 'system', content: 'injected-system', deviceId: 'r1' },
  ]);
  const outbound = JSON.stringify(request.messages);
  assert.ok(outbound.includes('same-device'));
  assert.equal(outbound.includes('other-device'), false);
  assert.equal(outbound.includes('local-only'), false);
  assert.equal(outbound.includes('injected-system'), false);
});
