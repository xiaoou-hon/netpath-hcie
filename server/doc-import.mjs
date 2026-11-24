/**
 * 文档导入（Word / PDF）解析模块
 * ------------------------------------------------------------------
 * 契约与 src/types/import.ts 的 DocumentParseResult 保持一致。
 * 仅依赖动态 import 的 mammoth / pdf-parse / word-extractor，避免桥接主进程
 * 启动时强制加载重型解析器；路由层按需调用 parseDocument。
 */

export const MAX_DOC_BYTES = 20 * 1024 * 1024;
export const SUPPORTED_DOC_EXT = Object.freeze(['docx', 'doc', 'pdf']);

const MAX_HTML_CHARS = 500_000;
// 单条 base64 图片 data URI 允许的最大长度，超出截断（防止巨型内联资源撑爆预览）。
const MAX_DATA_URI_CHARS = 8192;

/** 与 TopologyImportError 同构，路由层通过 instanceof 识别并回写 status/code。 */
export class DocumentImportError extends Error {
  constructor(code, message, status = 400, detail) {
    super(message);
    this.name = 'DocumentImportError';
    this.code = code;
    this.status = status;
    if (detail !== undefined) this.detail = detail;
  }
}

function fail(code, message, status = 400, detail) {
  throw new DocumentImportError(code, message, status, detail);
}

function asBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  fail('invalid_body', '文档上传必须包含原始文件字节');
  return Buffer.alloc(0);
}

/* ------------------------------- 分类校验 ------------------------------- */

/**
 * 按扩展名 + 容器魔数识别文档类型。
 * - 扩展名不在支持集合 -> unsupported_format
 * - docx 需 ZIP 本地文件头 PK\x03\x04；pdf 需 %PDF-
 * - .doc 为 OLE2 复合文档，魔数校验留给解析器（classify 仅按扩展名接受），
 *   避免把扩展名明确的 .doc 在分类阶段误杀
 */
export function classifyDocument(filename, buffer) {
  const name = typeof filename === 'string' ? filename : '';
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
  if (!SUPPORTED_DOC_EXT.includes(ext)) {
    fail('unsupported_format', `不支持的文档格式：${ext ? `.${ext}` : '(无扩展名)'}，仅支持 docx / doc / pdf`);
  }
  const bytes = asBuffer(buffer);
  if (ext === 'docx') {
    const isZip =
      bytes.length >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      bytes[2] === 0x03 &&
      bytes[3] === 0x04;
    if (!isZip) fail('unsupported_format', 'docx 文件签名无效（不是有效的 ZIP 容器）');
  } else if (ext === 'pdf') {
    const head = bytes.subarray(0, 5).toString('latin1');
    if (head !== '%PDF-') fail('unsupported_format', 'PDF 文件签名无效（缺少 %PDF- 头）');
  }
  // .doc (OLE2, D0 CF 11 E0)：信任扩展名，解析阶段由 word-extractor 校验内容。
  return { ext };
}

/* -------------------------------- HTML 净化 ------------------------------- */

function stripTags(html) {
  return String(html).replace(/<[^>]+>/g, '');
}

function decodeHtmlEntities(text) {
  return String(text)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

/**
 * 净化 mammoth 产出的 HTML：移除脚本/样式/嵌入标签、事件属性、危险协议、
 * 注释与控制字符，截断超长 base64 data URI，并限制总长度。
 * 纯字符串处理（mammoth 输出结构简单可控），不引入 DOM 依赖。
 */
export function sanitizeHtml(input) {
  let html = typeof input === 'string' ? input : '';
  // 移除 null 与控制字符（保留 \t \n \r）
  html = html.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  // 移除 HTML 注释
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  // 移除 script/style/iframe/object/embed 整块（含内容）
  html = html.replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1>/gi, '');
  // 移除残留的危险标签开/闭合（无配对内容的情况）
  html = html.replace(/<\/?(script|style|iframe|object|embed)\b[^>]*>/gi, '');
  // 移除所有 on* 事件属性（支持引号 / 无引号值）
  html = html.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // 中和 href/src 中的 javascript: 与非图片 data:
  html = html.replace(/\s(href|src)\s*=\s*("(?:[^"]*)"|'(?:[^']*)')/gi, (match, attr, quoted) => {
    const inner = quoted.slice(1, -1).trim();
    if (/^javascript:/i.test(inner)) return ` ${attr}=""`;
    if (/^data:/i.test(inner) && !/^data:image\//i.test(inner)) return ` ${attr}=""`;
    if (/^data:image\/[^;]+;base64,/i.test(inner) && inner.length > MAX_DATA_URI_CHARS) {
      return ` ${attr}="${inner.slice(0, MAX_DATA_URI_CHARS)}"`;
    }
    return match;
  });
  if (html.length > MAX_HTML_CHARS) {
    html = html.slice(0, MAX_HTML_CHARS);
  }
  return html;
}

/* ------------------------------ 文本结构化 ------------------------------ */

// 命令行特征：匹配常见 VRP / 网络排障命令关键字（来自契约描述）。
const COMMAND_RE =
  /display\s|undo\s|interface\s|ip\s|ospf|bgp|vlan\s|ping\s|system-view|sysname|quit|shutdown|description|port\s|acl\s|nat\s|route-policy|stp\s|dhcp/i;
// 疑似标题关键词（纯文本无标签时用于切分 sections）
const HEADING_KEYWORD_RE =
  /故障现象|现象|排查步骤|排查|根因|原因分析|原因|解决方案|解决|修复|处理|规避|预防|实验步骤|实验|关键命令|命令参考|命令|验证|验收|检查|步骤|背景|拓扑|配置|结论|附录|symptom|triage|root cause|solution|prevention|acceptance/i;
// 编号步骤行：1. / 1、/ 1)
const NUMBERED_RE = /^\s*\d+\s*[.、)]\s*/;
// pdf-parse 注入的页码标记行：-- 1 of 1 --
const PDF_PAGE_MARKER_RE = /^\s*--\s*\d+\s*of\s*\d+\s*--\s*$/;

function isCommandLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (NUMBERED_RE.test(trimmed)) return false;
  return COMMAND_RE.test(trimmed);
}

function isSuspectedHeading(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 50) return false;
  if (NUMBERED_RE.test(trimmed) || COMMAND_RE.test(trimmed)) return false;
  if (/[。！？.!?]$/.test(trimmed)) return false;
  return HEADING_KEYWORD_RE.test(trimmed);
}

function extractCommands(line) {
  const trimmed = line.trim();
  if (!isCommandLine(trimmed)) return [];
  return [trimmed];
}

function splitLines(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n');
}

/** 把 HTML 转为带标题标记的纯文本：<h1..6> 前缀 \x01Hn\x01，块级标签转换行。 */
function htmlToTaggedText(html) {
  let s = sanitizeHtml(html);
  s = s.replace(
    /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_, level, inner) => `\n\x01H${level}\x01${stripTags(inner).trim()}\n`,
  );
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(p|div|li|tr|table|ul|ol)>/gi, '\n');
  s = stripTags(s);
  s = decodeHtmlEntities(s);
  return s;
}

function buildSectionsFromTagged(tagged) {
  const sections = [];
  let current = { heading: '', content: '' };
  let title = '';
  const lines = splitLines(tagged);
  for (const raw of lines) {
    const marker = raw.match(/^\x01H([1-6])\x01(.*)$/);
    if (marker) {
      if (current.heading || current.content.trim()) sections.push(current);
      const heading = marker[2].trim();
      if (!title && marker[1] === '1') title = heading;
      current = { heading, content: '' };
      continue;
    }
    current.content += raw + '\n';
  }
  if (current.heading || current.content.trim()) sections.push(current);
  // 去除纯空白段
  return { sections: sections.filter((s) => s.heading || s.content.trim()), title };
}

function buildSectionsFromPlainText(text) {
  const clean = splitLines(text)
    .filter((line) => !PDF_PAGE_MARKER_RE.test(line))
    .join('\n');
  const sections = [];
  let current = { heading: '', content: '' };
  const lines = splitLines(clean);
  for (const raw of lines) {
    if (isSuspectedHeading(raw)) {
      if (current.heading || current.content.trim()) sections.push(current);
      current = { heading: raw.trim(), content: '' };
      continue;
    }
    current.content += raw + '\n';
  }
  if (current.heading || current.content.trim()) sections.push(current);
  return { sections: sections.filter((s) => s.heading || s.content.trim()), title: sections[0]?.heading || '' };
}

function analyzeSections(sections, fullText) {
  // 仅从各 section 的正文行提取命令 / 编号 / 验收行，标题行（可能含 OSPF 等关键词）不计入。
  const allLines = [];
  const commands = [];
  const numbered = [];
  const seenCommands = new Set();
  for (const section of sections) {
    for (const raw of splitLines(section.content)) {
      if (!raw.trim() || PDF_PAGE_MARKER_RE.test(raw)) continue;
      const line = raw.trim();
      allLines.push(line);
      if (NUMBERED_RE.test(line)) numbered.push(line);
      for (const cmd of extractCommands(line)) {
        if (!seenCommands.has(cmd)) {
          seenCommands.add(cmd);
          commands.push(cmd);
        }
      }
    }
  }
  const chars = (fullText || sections.map((s) => `${s.heading}\n${s.content}`).join('\n')).replace(/\s+/g, '').length;
  return { sections, commands, numbered, allLines, chars };
}

function structureFromHtml(html) {
  const tagged = htmlToTaggedText(html);
  const { sections, title } = buildSectionsFromTagged(tagged);
  const fullText = sections.map((s) => `${s.heading}\n${s.content}`).join('\n');
  return { ...analyzeSections(sections, fullText), title };
}

function structureFromText(text) {
  const clean = splitLines(text)
    .filter((line) => !PDF_PAGE_MARKER_RE.test(line))
    .join('\n');
  const { sections, title } = buildSectionsFromPlainText(clean);
  const fullText = sections.map((s) => `${s.heading}\n${s.content}`).join('\n');
  return { ...analyzeSections(sections, fullText), title };
}

/* ------------------------------- 字段映射 ------------------------------- */

function stripExt(filename) {
  const base = String(filename || '').replace(/^.*[\\/]/, '');
  return base.replace(/\.(docx?|pdf)$/i, '');
}

function nonEmptyLines(text) {
  return splitLines(text)
    .map((l) => l.trim())
    .filter(Boolean);
}

function numberedLines(text) {
  return nonEmptyLines(text).filter((l) => NUMBERED_RE.test(l));
}

function firstNonEmptyParagraph(structured) {
  for (const section of structured.sections) {
    const line = nonEmptyLines(section.content).find((l) => !NUMBERED_RE.test(l) && !PDF_PAGE_MARKER_RE.test(l));
    if (line) return line;
    if (section.heading && section.heading !== structured.title) return section.heading;
  }
  return '';
}

function mapTroubleshoot(structured, filename) {
  const symptom = { value: '' };
  const triageSteps = [];
  const rootCauseAnalysis = { value: '' };
  const solution = { value: '' };
  const prevention = [];

  for (const section of structured.sections) {
    const h = section.heading;
    const c = section.content.trim();
    const combined = `${h}\n${c}`;
    if (!symptom.value && /故障现象|现象|symptom/i.test(combined)) symptom.value = c;
    if (/排查步骤|排查|triage|步骤/i.test(h)) {
      for (const line of numberedLines(section.content)) triageSteps.push(line);
    }
    if (!rootCauseAnalysis.value && /根因|原因|root cause|rca/i.test(h)) rootCauseAnalysis.value = c;
    if (!solution.value && /解决方案|解决|修复|处理办法|处理|solution/i.test(h)) solution.value = c;
    if (/预防|规避|prevention/i.test(h)) {
      for (const line of nonEmptyLines(section.content)) prevention.push(line);
    }
  }

  const warnings = [];
  const missing = [
    !symptom.value && '故障现象',
    !triageSteps.length && '排查步骤',
    !rootCauseAnalysis.value && '根因分析',
    !solution.value && '解决方案',
  ].filter(Boolean);
  if (missing.length) {
    warnings.push(`部分字段未自动识别（${missing.join('、')}），请在预览中确认并补全`);
  }

  return {
    title: structured.title || stripExt(filename) || '导入故障案例',
    summary: firstNonEmptyParagraph(structured),
    symptom: symptom.value,
    triageSteps,
    rootCauseAnalysis: rootCauseAnalysis.value,
    solution: solution.value,
    prevention,
    warnings,
  };
}

function mapManual(structured, filename) {
  const steps = structured.numbered.map((line, index) => ({
    title: `步骤 ${index + 1}`,
    text: line,
    commands: extractCommands(line),
  }));
  const keyCommands = [...structured.commands];
  const acceptanceSet = new Set();
  const acceptance = [];
  for (const line of structured.allLines) {
    const trimmed = line.trim();
    if (/验证|验收|检查|可达|连通|ping 通|通了|通过/i.test(trimmed)) {
      if (!acceptanceSet.has(trimmed)) {
        acceptanceSet.add(trimmed);
        acceptance.push(trimmed);
      }
    }
  }
  const warnings = [];
  if (!steps.length) warnings.push('未识别到编号步骤，请在预览中确认并补全步骤');
  return {
    title: structured.title || stripExt(filename) || '导入实验手册',
    summary: firstNonEmptyParagraph(structured),
    steps,
    keyCommands,
    acceptance,
    warnings,
  };
}

/* ------------------------------- 主入口 ------------------------------- */

async function parseByExt(ext, bytes) {
  if (ext === 'docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.convertToHtml({ buffer: bytes });
    return { html: typeof result?.value === 'string' ? result.value : '' };
  }
  if (ext === 'doc') {
    const mod = await import('word-extractor');
    const WordExtractor = mod.default || mod;
    const doc = await new WordExtractor().extract(bytes);
    const body = typeof doc?.getBody === 'function' ? doc.getBody() : '';
    return { text: typeof body === 'string' ? body : '' };
  }
  if (ext === 'pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: bytes });
    try {
      const result = await parser.getText();
      return { text: typeof result?.text === 'string' ? result.text : '' };
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }
  fail('unsupported_format', `未知文档类型：${ext}`);
  return {};
}

/**
 * 解析文档字节并返回 DocumentParseResult。
 * 抛出 DocumentImportError，code ∈ unsupported_format | file_too_large | empty_content | parse_failed | unsafe_content。
 */
export async function parseDocument({ filename, buffer, kind, maxBytes = MAX_DOC_BYTES }) {
  const bytes = asBuffer(buffer);
  if (bytes.length > maxBytes) {
    fail('file_too_large', `文档超过 ${Math.floor(maxBytes / 1024 / 1024)} MiB 上限`, 413);
  }
  if (bytes.length === 0) {
    fail('empty_content', '文档内容为空');
  }

  const { ext } = classifyDocument(filename, bytes);

  let parsed;
  try {
    parsed = await parseByExt(ext, bytes);
  } catch (error) {
    const message = error instanceof DocumentImportError ? error.message : error?.message || String(error);
    fail('parse_failed', `文档解析失败：${message}`);
  }

  let structured;
  let raw = '';
  if (ext === 'docx') {
    raw = parsed.html || '';
    structured = structureFromHtml(raw);
  } else {
    raw = parsed.text || '';
    structured = structureFromText(raw);
  }

  if (structured.chars === 0) {
    // 原始抽取内容非空但净化后为空，说明几乎全是危险标签 -> 判为不安全内容
    if (/<(script|iframe|object|embed)\b|onerror\s*=|javascript:|on\w+\s*=/i.test(raw)) {
      fail('unsafe_content', '文档内容包含不安全的脚本或事件属性');
    }
    fail('empty_content', '文档解析后内容为空');
  }

  const mapped =
    kind === 'manual' ? mapManual(structured, filename) : mapTroubleshoot(structured, filename);

  const commands = structured.commands;
  const stats = {
    chars: structured.chars,
    sections: structured.sections.length,
    commands: commands.length,
  };

  return {
    filename: String(filename || ''),
    kind: kind === 'manual' ? 'manual' : 'troubleshoot',
    type: ext,
    title: mapped.title,
    summary: mapped.summary,
    ...(kind === 'manual'
      ? {
          steps: mapped.steps,
          keyCommands: mapped.keyCommands,
          acceptance: mapped.acceptance,
        }
      : {
          symptom: mapped.symptom,
          triageSteps: mapped.triageSteps,
          rootCauseAnalysis: mapped.rootCauseAnalysis,
          solution: mapped.solution,
          prevention: mapped.prevention,
        }),
    // 两种 kind 都带上 keyCommands，便于前端预览与命令提取
    keyCommands: commands,
    sections: structured.sections,
    warnings: mapped.warnings,
    stats,
  };
}
