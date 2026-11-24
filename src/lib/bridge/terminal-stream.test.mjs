import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendBounded,
  hasInputLineBreak,
  inputLineCount,
  inputPreview,
  terminalOutputContext,
  trackTerminalInput,
  unreplayedSuffix,
  unwrapBracketedPaste,
} from './terminal-stream.ts';

test('bracketed paste 保留原始数据，确认逻辑只读取包装内文本', () => {
  const data = '\x1b[200~system-view\rreboot\r\x1b[201~';
  assert.deepEqual(unwrapBracketedPaste(data), {
    data: 'system-view\rreboot\r',
    bracketed: true,
  });
  assert.equal(hasInputLineBreak(data), true);
  assert.equal(inputLineCount(data), 3);
  assert.equal(inputPreview(data), 'system-view\nreboot\n');
  assert.equal(unwrapBracketedPaste('display clock').bracketed, false);
});

test('单行危险粘贴末尾带回车也必须进入发送前确认路径', () => {
  for (const data of ['reboot\r', '\x1b[200~reboot\r\x1b[201~']) {
    assert.equal(hasInputLineBreak(data), true);
    assert.equal(unwrapBracketedPaste(data).data, 'reboot\r');
  }
});

test('WebSocket 回放只返回未展示尾部，包括断线期间新增输出', () => {
  assert.equal(unreplayedSuffix('abc\r\n<R1>', 'abc\r\n<R1>'), '');
  assert.equal(unreplayedSuffix('abc\r\n<R1>', 'abc\r\n<R1>display clock'), 'display clock');
  assert.equal(unreplayedSuffix('old', 'new'), 'new');
  assert.equal(unreplayedSuffix('', 'replay'), 'replay');
  assert.equal(unreplayedSuffix('aaaaab', 'aaaabc'), 'c');
});

test('回放去重与朴素算法一致，覆盖重复字符边界', () => {
  const naive = (recent, replay) => {
    for (let size = Math.min(recent.length, replay.length); size > 0; size -= 1) {
      if (recent.endsWith(replay.slice(0, size))) return replay.slice(size);
    }
    return replay;
  };
  const values = ['', 'a', 'aa', 'ab', 'aba', 'bab', '\r\n', 'a\r\n'];
  for (const recent of values) {
    for (const replay of values) {
      assert.equal(unreplayedSuffix(recent, replay), naive(recent, replay), `${recent}/${replay}`);
    }
  }
});

test('输入跟踪不拦截 Tab/?/方向键，只记录实际命令', () => {
  const typed = trackTerminalInput('', 'display clock\t?', () => '');
  assert.equal(typed.line, 'display clock');
  const entered = trackTerminalInput(typed.line, '\r', () => '');
  assert.deepEqual(entered.commands, ['display clock']);
  assert.equal(entered.line, '');

  const history = trackTerminalInput('', '\x1b[A', () => '');
  assert.equal(history.line, '');
  const recalled = trackTerminalInput(history.line, '\r', () => 'display version');
  assert.deepEqual(recalled.commands, ['display version']);

  const interrupted = trackTerminalInput('reboot', '\x03', () => '');
  assert.equal(interrupted.line, '');
  assert.deepEqual(interrupted.commands, []);
});

test('未写入活动终端的同步输入不得推进或清空本地危险命令跟踪', () => {
  for (const input of ['\r', '\x03', 'reboot']) {
    const tracked = trackTerminalInput('reboot', input, () => '', false);
    assert.equal(tracked.line, 'reboot');
    assert.deepEqual(tracked.commands, []);
  }
});

test('多行 bracketed paste 每行只记录一次', () => {
  const result = trackTerminalInput('', '\x1b[200~system-view\rreboot\r\x1b[201~', () => 'stale');
  assert.deepEqual(result.commands, ['system-view', 'reboot']);
  assert.equal(result.line, '');
});

test('AI 输出上下文移除 ANSI/OSC、统一换行并限制长度', () => {
  const output = terminalOutputContext('\x1b]0;title\x07\x1b[31merror\x1b[0m\r\nnext', 20);
  assert.equal(output, 'error\nnext');
  assert.equal(terminalOutputContext('123456', 3), '456');
  assert.equal(appendBounded('abc', 'def', 4), 'cdef');
  assert.equal(inputPreview('\x03\r'), '^C\n');
});
