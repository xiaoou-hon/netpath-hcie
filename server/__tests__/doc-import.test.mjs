import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import http from 'node:http';

import { handleRequest } from '../index.mjs';
import {
  parseDocument,
  classifyDocument,
  sanitizeHtml,
  DocumentImportError,
} from '../doc-import.mjs';

/* ------------------------------ 测试夹具构造 ------------------------------ */

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function dosTime(d = new Date()) {
  return ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
}
function dosDate(d = new Date()) {
  return (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
}

/** 构造最小 store-only ZIP：[Content_Types].xml + _rels/.rels + word/document.xml */
function makeDocxBuffer(documentXml) {
  const files = [
    {
      name: '[Content_Types].xml',
      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>',
    },
    { name: 'word/document.xml', data: documentXml },
  ];

  const localParts = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const nameBuf = Buffer.from(f.name, 'utf8');
    const data = Buffer.from(f.data, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dosTime(), 10);
    local.writeUInt16LE(dosDate(), 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);
    localParts.push(local, data);

    const cd = Buffer.alloc(46 + nameBuf.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(dosTime(), 12);
    cd.writeUInt16LE(dosDate(), 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    nameBuf.copy(cd, 46);
    central.push(cd);
    offset += local.length + data.length;
  }
  const cdBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, cdBuf, eocd]);
}

function docxParagraph(text, style) {
  const pPr = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : '';
  return `<w:p>${pPr}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
}

function buildDocx(parts) {
  const body = parts.map((p) => docxParagraph(p.text, p.style)).join('');
  const xml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${body}</w:body></w:document>`;
  return makeDocxBuffer(xml);
}

/** 构造最小单页 PDF（仅一页、一段文本），精确计算 xref 偏移。 */
function makePdfBuffer(text) {
  const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const stream = `BT /F1 24 Tf 72 720 Td (${escaped}) Tj ET\n`;
  const streamLen = Buffer.byteLength(stream, 'latin1');

  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${streamLen} >>\nstream\n${stream}endstream`,
  ];

  const parts = ['%PDF-1.4\n'];
  const offsets = [];
  let pos = Buffer.byteLength(parts[0], 'latin1');
  for (let i = 0; i < objs.length; i++) {
    offsets.push(pos);
    const block = `${i + 1} 0 obj\n${objs[i]}\nendobj\n`;
    parts.push(block);
    pos += Buffer.byteLength(block, 'latin1');
  }
  const xrefPos = pos;
  let xref = `xref\n0 ${objs.length + 1}\n`;
  xref += '0000000000 65535 f \r\n';
  for (const off of offsets) {
    xref += `${String(off).padStart(10, '0')} 00000 n \r\n`;
  }
  parts.push(xref);
  parts.push(`trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);
  return Buffer.from(parts.join(''), 'latin1');
}

/* ---------------------------------- 用例 ---------------------------------- */

test('doc import: docx 解析出标题/分段/命令并提示未完全识别', async () => {
  const buffer = buildDocx([
    { text: 'OSPF 邻居卡在 ExStart 排查', style: 'Heading1' },
    { text: '故障现象：邻居一直停留在 ExStart。' },
    { text: '排查步骤', style: 'Heading2' },
    { text: '1. 检查邻居状态' },
    { text: 'display ospf peer' },
    { text: '2. 查看接口信息' },
    { text: 'display interface brief' },
    { text: '根因', style: 'Heading2' },
    { text: 'MTU 不匹配导致 DBD 协商失败。' },
  ]);

  const result = await parseDocument({
    filename: 'ospf-exstart.docx',
    buffer,
    kind: 'troubleshoot',
  });

  assert.equal(result.type, 'docx');
  assert.equal(result.kind, 'troubleshoot');
  assert.equal(result.filename, 'ospf-exstart.docx');
  assert.ok(result.sections.length >= 3, `sections=${result.sections.length}`);
  assert.equal(result.title, 'OSPF 邻居卡在 ExStart 排查');
  assert.match(result.summary, /故障现象/);
  assert.ok(result.symptom.includes('ExStart'));
  assert.equal(result.triageSteps.length, 2);
  assert.equal(result.rootCauseAnalysis, 'MTU 不匹配导致 DBD 协商失败。');
  assert.deepEqual(result.keyCommands, ['display ospf peer', 'display interface brief']);
  assert.ok(result.warnings.some((w) => w.includes('部分字段未自动识别')));
  assert.equal(result.stats.sections, result.sections.length);
  assert.equal(result.stats.commands, 2);
  assert.ok(result.stats.chars > 0);
});

test('doc import: pdf 提取文本并生成非空 sections', async () => {
  const buffer = makePdfBuffer('OSPF neighbor stuck ExStart');
  const result = await parseDocument({
    filename: 'stuck.pdf',
    buffer,
    kind: 'manual',
  });

  assert.equal(result.type, 'pdf');
  assert.ok(result.sections.length >= 1);
  const all = result.sections.map((s) => `${s.heading}\n${s.content}`).join('\n');
  assert.ok(all.includes('ExStart'), `extracted=${JSON.stringify(all)}`);
  assert.ok(result.stats.chars > 0);
});

test('doc import: sanitizeHtml 移除脚本/事件/危险协议并保留正文', () => {
  const out = sanitizeHtml(
    '<script>alert(1)</script><img src=x onerror=alert(2)><a href="javascript:alert(3)">x</a><p>ok</p>',
  );
  assert.ok(!out.includes('script'), `should not contain script: ${out}`);
  assert.ok(!out.includes('onerror'), `should not contain onerror: ${out}`);
  assert.ok(!out.includes('javascript:'), `should not contain javascript:: ${out}`);
  assert.ok(out.includes('ok'));
});

test('doc import: classifyDocument 按扩展名与魔数分类', () => {
  assert.throws(
    () => classifyDocument('notes.txt', Buffer.from('hello')),
    (err) => err instanceof DocumentImportError && err.code === 'unsupported_format',
  );
  // .doc 信任扩展名：内容无效也返回 ext=doc，交给解析阶段判 parse_failed
  assert.deepEqual(classifyDocument('legacy.doc', Buffer.from('not-an-ole-file')), { ext: 'doc' });
  // docx 需 ZIP 魔数
  assert.throws(
    () => classifyDocument('fake.docx', Buffer.from('not a zip')),
    (err) => err.code === 'unsupported_format',
  );
  // pdf 需 %PDF- 头
  assert.throws(
    () => classifyDocument('fake.pdf', Buffer.from('hello world')),
    (err) => err.code === 'unsupported_format',
  );
});

test('doc import: 超过 maxBytes 抛 file_too_large', async () => {
  await assert.rejects(
    () =>
      parseDocument({
        filename: 'big.docx',
        buffer: Buffer.alloc(32),
        kind: 'troubleshoot',
        maxBytes: 10,
      }),
    (err) => err instanceof DocumentImportError && err.code === 'file_too_large',
  );
});

test('doc import: 空 buffer 与空文本抛 empty_content', async () => {
  await assert.rejects(
    () => parseDocument({ filename: 'empty.docx', buffer: Buffer.alloc(0), kind: 'troubleshoot' }),
    (err) => err.code === 'empty_content',
  );
  // docx 解析后正文为空
  const emptyDocx = buildDocx([]);
  await assert.rejects(
    () => parseDocument({ filename: 'empty.docx', buffer: emptyDocx, kind: 'troubleshoot' }),
    (err) => err.code === 'empty_content',
  );
});

test('doc import: 无效 .doc 内容抛 parse_failed', async () => {
  await assert.rejects(
    () =>
      parseDocument({
        filename: 'broken.doc',
        buffer: Buffer.from('this is definitely not an OLE2 compound document'),
        kind: 'manual',
      }),
    (err) => err.code === 'parse_failed',
  );
});

/* ----------------------------- HTTP 路由集成 ----------------------------- */

function postBytes(url, body) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/octet-stream',
          'content-length': body.length,
        },
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          resolve({
            status: response.statusCode,
            payload: JSON.parse(Buffer.concat(chunks).toString('utf8')),
          });
        });
      },
    );
    request.on('error', reject);
    request.end(body);
  });
}

async function createHttpFixture() {
  const server = http.createServer((req, res) => {
    void handleRequest(req, res, {});
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    base: `http://127.0.0.1:${port}`,
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

test('doc import http: 原始字节路由返回结构化结果', async () => {
  const fixture = await createHttpFixture();
  try {
    const buffer = buildDocx([
      { text: '实验手册：静态路由', style: 'Heading1' },
      { text: '1. 配置接口 IP 地址' },
      { text: 'ip address 10.0.0.1 24' },
      { text: '2. 验证连通性' },
      { text: 'ping 10.0.0.2 通' },
    ]);
    const { status, payload } = await postBytes(
      `${fixture.base}/api/import/document?filename=${encodeURIComponent('lab.docx')}&kind=manual`,
      buffer,
    );
    assert.equal(status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.data.type, 'docx');
    assert.equal(payload.data.kind, 'manual');
    assert.ok(payload.data.steps.length >= 2);
    assert.ok(payload.data.keyCommands.includes('ip address 10.0.0.1 24'));
    assert.ok(payload.data.stats.chars > 0);
  } finally {
    await fixture.close();
  }
});

test('doc import http: 非法 kind 与缺失 filename 返回错误', async () => {
  const fixture = await createHttpFixture();
  try {
    const buffer = buildDocx([{ text: 'x' }]);
    const badKind = await postBytes(
      `${fixture.base}/api/import/document?filename=a.docx&kind=unknown`,
      buffer,
    );
    assert.equal(badKind.status, 400);
    assert.equal(badKind.payload.ok, false);
    assert.equal(badKind.payload.error.code, 'invalid_body');

    const noName = await postBytes(
      `${fixture.base}/api/import/document?kind=troubleshoot`,
      buffer,
    );
    assert.equal(noName.status, 400);
    assert.equal(noName.payload.ok, false);
    assert.equal(noName.payload.error.code, 'invalid_body');

    const unsupported = await postBytes(
      `${fixture.base}/api/import/document?filename=a.txt&kind=troubleshoot`,
      Buffer.from('hello'),
    );
    assert.equal(unsupported.status, 400);
    assert.equal(unsupported.payload.error.code, 'unsupported_format');
  } finally {
    await fixture.close();
  }
});
