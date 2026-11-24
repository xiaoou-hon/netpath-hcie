import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { detectMobaxterm, openMobaxterm } from '../mobaxterm.mjs';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'netpath-moba-'));
}

test('detectMobaxterm: finds MobaXterm exe inside a candidate directory', () => {
  const dir = makeTempDir();
  const exe = path.join(dir, 'MobaXterm_Personal_25.1_CHS.exe');
  fs.writeFileSync(exe, '');
  try {
    const result = detectMobaxterm({ candidates: [dir], includeDefaults: false });
    assert.equal(result.found, true);
    assert.equal(result.path, exe);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('detectMobaxterm: ignores non-MobaXterm executables', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, 'notepad.exe'), '');
  try {
    const result = detectMobaxterm({ candidates: [dir], includeDefaults: false });
    assert.equal(result.found, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('openMobaxterm: rejects invalid executable names and ports', () => {
  assert.throws(() => openMobaxterm({ exe: 'C:\\Windows\\notepad.exe', port: 2000 }), /无效/);
  assert.throws(() => openMobaxterm({ exe: '', port: 2000 }), /无效/);
});
