import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveInputCommand } from '../../src/lib/bridge/terminal.ts';

test('terminal input: falls back to tracked input when the device does not echo keys', () => {
  assert.equal(resolveInputCommand('<R1> ', '<R1>', 'reboot'), 'reboot');
});

test('terminal input: prefers device echo for history and edited commands', () => {
  assert.equal(resolveInputCommand('<R1>display version', '<R1>', 'disp'), 'display version');
});
