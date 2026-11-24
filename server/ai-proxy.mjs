/**
 * Normalise a user supplied base URL into an OpenAI-compatible
 * `/chat/completions` endpoint.
 */
export function normalizeChatUrl(baseUrl) {
  if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
    throw new Error('baseUrl is required');
  }
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed;
  if (/\/v1$/i.test(trimmed)) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

function truncate(value, max = 500) {
  const text = String(value == null ? '' : value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function writeSseError(res, status, message) {
  const payload = JSON.stringify({ error: { status, message: truncate(message) } });
  res.write(`data: ${payload}\n\n`);
}

/**
 * Stream an upstream chat completion through as SSE. The bridge never builds
 * prompts; it only forwards `messages`.
 */
export async function proxyChat(options) {
  const {
    baseUrl,
    apiKey,
    model,
    messages,
    temperature,
    req,
    res,
    timeoutMs = 120000,
  } = options;

  const url = normalizeChatUrl(baseUrl);
  const controller = new AbortController();
  let finished = false;
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  if (typeof timer.unref === 'function') timer.unref();

  const onClientClose = () => {
    if (!finished && !res.writableEnded) controller.abort();
  };
  res.on('close', onClientClose);

  const cleanup = () => {
    finished = true;
    clearTimeout(timer);
    res.removeListener('close', onClientClose);
  };

  let upstream;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
        authorization: `Bearer ${apiKey || ''}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        stream: true,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    cleanup();
    if (controller.signal.aborted || res.writableEnded || res.destroyed) {
      if (!res.writableEnded && !res.destroyed) res.end();
      return;
    }
    res.writeHead(502, { 'content-type': 'text/event-stream; charset=utf-8' });
    writeSseError(res, 502, error.message || 'Upstream request failed');
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  if (!upstream.ok) {
    let message = `Upstream returned HTTP ${upstream.status}`;
    try {
      const text = await upstream.text();
      if (text) {
        try {
          const parsed = JSON.parse(text);
          message = parsed?.error?.message || parsed?.message || text;
        } catch {
          message = text;
        }
      }
    } catch {
      // keep the status-based message
    }
    // Never echo credentials back to the browser.
    const safeMessage = apiKey
      ? String(message).split(apiKey).join('[redacted]')
      : String(message);
    writeSseError(res, upstream.status, safeMessage);
    res.write('data: [DONE]\n\n');
    cleanup();
    res.end();
    return;
  }

  if (!upstream.body) {
    writeSseError(res, 502, 'Upstream response had no body');
    res.write('data: [DONE]\n\n');
    cleanup();
    res.end();
    return;
  }

  try {
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      if (text && !res.writableEnded) res.write(text);
    }
    const tail = decoder.decode();
    if (tail && !res.writableEnded && !res.destroyed) res.write(tail);
    if (!res.writableEnded && !res.destroyed) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error) {
    if (!res.writableEnded && !res.destroyed) {
      if (timedOut) {
        writeSseError(res, 504, 'Upstream request timed out');
      } else if (!controller.signal.aborted) {
        writeSseError(res, 502, error.message || 'Upstream stream failed');
      }
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } finally {
    cleanup();
  }
}

export default proxyChat;
