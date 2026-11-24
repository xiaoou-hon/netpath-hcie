import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { normalizeChatUrl } from '../ai-proxy.mjs';
import { handleRequest } from '../index.mjs';
import { createMockAi } from '../__fixtures__/mock-ai.mjs';

test('ai-proxy: bare base URL gets /v1/chat/completions', () => {
  assert.equal(
    normalizeChatUrl('https://api.example.com'),
    'https://api.example.com/v1/chat/completions',
  );
});

test('ai-proxy: base URL ending in /v1 gets /chat/completions', () => {
  assert.equal(
    normalizeChatUrl('https://api.example.com/v1'),
    'https://api.example.com/v1/chat/completions',
  );
});

test('ai-proxy: full /chat/completions URL is kept as-is', () => {
  assert.equal(
    normalizeChatUrl('https://api.example.com/v1/chat/completions'),
    'https://api.example.com/v1/chat/completions',
  );
});

test('ai-proxy: trailing slashes are trimmed', () => {
  assert.equal(
    normalizeChatUrl('https://api.example.com/v1/'),
    'https://api.example.com/v1/chat/completions',
  );
});

function parseOpenAiSse(text) {
  let content = '';
  let deltaCount = 0;
  let done = false;
  for (const block of text.split(/\r?\n\r?\n/)) {
    const data = block.split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n');
    if (!data) continue;
    if (data === '[DONE]') {
      done = true;
      continue;
    }
    const event = JSON.parse(data);
    const delta = event.choices?.[0]?.delta?.content;
    if (typeof delta === 'string') {
      content += delta;
      deltaCount += 1;
    }
  }
  return { content, deltaCount, done };
}

test('mock AI fixture: supports a specified loopback port', async () => {
  const initial = await createMockAi();
  const { port } = initial;
  await initial.close();
  const fixture = await createMockAi({ port });
  try {
    assert.equal(fixture.port, port);
    assert.equal(fixture.baseUrl, `http://127.0.0.1:${port}/v1`);
    const response = await fetch(`${fixture.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'mock-model', messages: [{ role: 'user', content: 'test' }] }),
    });
    assert.equal(response.status, 200);
    await response.text();
  } finally {
    await fixture.close();
  }
});

test('mock AI fixture: deterministic SSE passes through the bridge without exposing credentials', async () => {
  const upstream = await createMockAi();
  const bridge = http.createServer((req, res) => void handleRequest(req, res));
  await new Promise((resolve) => bridge.listen(0, '127.0.0.1', resolve));
  const bridgeUrl = `http://127.0.0.1:${bridge.address().port}/api/ai/chat`;
  const credential = 'fixture-credential-not-for-logging';

  async function ask() {
    const response = await fetch(bridgeUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        baseUrl: upstream.baseUrl,
        apiKey: credential,
        model: 'mock-model',
        temperature: 0,
        messages: [{ role: 'user', content: '请解释 display ip interface brief' }],
      }),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /text\/event-stream/);
    const text = await response.text();
    assert.equal(text.includes(credential), false);
    return parseOpenAiSse(text);
  }

  try {
    const first = await ask();
    assert.equal(upstream.requestCount, 1);
    assert.equal(first.done, true);
    assert.ok(first.deltaCount > 2);
    const answer = JSON.parse(first.content);
    assert.match(answer.answer, /命令用途/);
    assert.match(answer.answer, /关键参数/);
    assert.match(answer.answer, /输出要点/);
    assert.deepEqual(answer.commands, []);

    const second = await ask();
    assert.equal(upstream.requestCount, 2);
    assert.equal(second.content, first.content);
    assert.equal(second.deltaCount, first.deltaCount);
  } finally {
    await new Promise((resolve) => bridge.close(resolve));
    await upstream.close();
  }
});
