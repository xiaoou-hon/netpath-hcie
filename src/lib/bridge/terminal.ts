/**
 * eNSP 终端回显解析工具（纯函数）
 * ------------------------------------------------------------------
 * 不依赖任何运行时模块，可直接在浏览器或 Node 中单测。
 */
import type { EnspCheck, EnspView } from '@/types/ensp';

export interface EnspCheckResult {
  pass: boolean;
  reason: string;
}

export interface ParsedPrompt {
  /** 完整提示符，如 '<R1>' / '[R1-GigabitEthernet0/0/0]' */
  prompt: string;
  view: EnspView;
  /** 设备名，如 'R1'；无法识别时为空串 */
  deviceName: string;
}

/** 视图的中文标签 */
export function viewLabel(view: EnspView | string): string {
  switch (view) {
    case 'user':
      return '用户视图';
    case 'system':
      return '系统视图';
    case 'sub':
      return '子视图';
    default:
      return '未知视图';
  }
}

/** 从回显末尾识别提示符，判断当前视图与设备名 */
export function parsePrompt(text: string): ParsedPrompt {
  const lines = splitOutputLines(text);
  const last = lines.length ? lines[lines.length - 1].trim() : '';
  const userMatch = /<([A-Za-z0-9_.-]+)>$/.exec(last);
  if (userMatch) {
    return { prompt: userMatch[0], view: 'user', deviceName: userMatch[1] };
  }
  const systemMatch = /^\[([A-Za-z0-9_.-]+)\]$/.exec(last);
  if (systemMatch) {
    return { prompt: systemMatch[0], view: 'system', deviceName: systemMatch[1] };
  }
  const subMatch = /^\[([A-Za-z0-9_.-]+)(-[^\]]+)\]$/.exec(last);
  if (subMatch) {
    return { prompt: subMatch[0], view: 'sub', deviceName: subMatch[1] };
  }
  return { prompt: last, view: 'user', deviceName: '' };
}

/** 危险 / 破坏性命令（层 1 拦截，执行前提醒或禁止） */
export const DANGEROUS_COMMANDS = [
  'reboot',
  'reset saved-configuration',
  'format',
  'delete /unreserved',
  'startup saved-configuration',
];

/** 判断命令是否为危险命令（忽略大小写与多余空白） */
export function isDangerousCommand(cmd: string): boolean {
  const normalized = cmd.trim().replace(/\s+/g, ' ').toLowerCase();
  return DANGEROUS_COMMANDS.some(
    (dangerous) => normalized === dangerous || normalized.startsWith(`${dangerous} `),
  );
}

/** 设备未回显按键时，使用本地跟踪的当前输入行。 */
export function resolveInputCommand(line: string, prompt: string | undefined, tracked: string): string {
  const fallback = tracked.trim();
  if (!prompt) return fallback;
  const promptIndex = line.lastIndexOf(prompt);
  if (promptIndex < 0) return fallback;
  return line.slice(promptIndex + prompt.length).trim() || fallback;
}

/** 把终端回显切分为行，去掉 CR 与末尾空行 */
export function splitOutputLines(text: string): string[] {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\r$/, ''));
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  return lines;
}

/** 抹掉回显中的口令、密钥，便于把输出喂给 AI */
export function redactSecrets(text: string): string {
  return text
    .replace(/(password\s+(?:cipher\s+|simple\s+)?)[^\s]+/gi, '$1******')
    .replace(/(set\s+authentication\s+password\s+(?:cipher\s+|simple\s+)?)[^\s]+/gi, '$1******')
    .replace(/(api[_-]?key\s*[:=]\s*)[^\s,]+/gi, '$1******')
    .replace(/\bsk-[A-Za-z0-9_-]+/g, '******');
}

/** 构造正则：支持 `(?i)` 之类的内联修饰符（JS 原生不支持） */
function compilePattern(pattern: string, extraFlags = ''): RegExp {
  const chars = new Set(extraFlags.split('').filter((f) => 'imsu'.includes(f)));
  let source = pattern;
  const inline = /^\(\?([imsu]+)\)/.exec(source);
  if (inline) {
    for (const flag of inline[1]) {
      if ('imsu'.includes(flag)) chars.add(flag);
    }
    source = source.slice(inline[0].length);
  }
  chars.add('m');
  return new RegExp(source, Array.from(chars).join(''));
}

function countMatches(output: string, pattern: string): number {
  const re = compilePattern(pattern, 'g');
  const matches = output.match(re);
  return matches ? matches.length : 0;
}

/** 从 ping 回显中解析丢包率（百分比），无法解析返回 null */
function parseLoss(output: string): number | null {
  const match = /(\d+(?:\.\d+)?)\s*%\s*(?:packet\s*)?loss/i.exec(output);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

/**
 * 验收检查：根据设备回显判定是否通过。
 * 纯函数，不发起任何 IO。
 */
export function evaluateCheck(check: EnspCheck, output: string): EnspCheckResult {
  const text = output ?? '';
  const failures: string[] = [];
  let hasCondition = false;

  if (check.reject) {
    hasCondition = true;
    try {
      const re = compilePattern(check.reject);
      if (re.test(text)) {
        failures.push(`回显中出现不应存在的匹配 /${check.reject}/`);
      }
    } catch {
      return { pass: false, reason: `反例正则 /${check.reject}/ 无法解析，请检查场景配置` };
    }
  }

  if (check.expect) {
    hasCondition = true;
    try {
      const re = compilePattern(check.expect);
      if (!re.test(text)) {
        failures.push(`回显未命中期望 /${check.expect}/`);
      }
    } catch {
      return { pass: false, reason: `期望正则 /${check.expect}/ 无法解析，请检查场景配置` };
    }
  }

  if (check.minCountPattern) {
    hasCondition = true;
    const atLeast = check.minCountAtLeast ?? 1;
    try {
      const count = countMatches(text, check.minCountPattern);
      if (count < atLeast) {
        failures.push(`/${check.minCountPattern}/ 只出现 ${count} 次，至少需要 ${atLeast} 次`);
      }
    } catch {
      return {
        pass: false,
        reason: `计数正则 /${check.minCountPattern}/ 无法解析，请检查场景配置`,
      };
    }
  }

  if (check.reachable) {
    hasCondition = true;
    const escaped = check.reachable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const replyPattern = new RegExp(
      `(?:Reply from ${escaped}\\b|bytes from ${escaped}\\b|${escaped}\\b[^\\n]*(?:ttl|time)\\s*[=<])`,
      'i',
    );
    if (!replyPattern.test(text)) {
      failures.push(`未看到来自 ${check.reachable} 的 Reply 回显`);
    }
  }

  if (typeof check.maxLoss === 'number') {
    hasCondition = true;
    const loss = parseLoss(text);
    if (loss === null) {
      failures.push(`回显中未找到丢包率（要求 ≤ ${check.maxLoss}%）`);
    } else if (loss > check.maxLoss) {
      failures.push(`丢包率 ${loss}% 超过上限 ${check.maxLoss}%`);
    }
  }

  if (!hasCondition) {
    return { pass: false, reason: '检查项未配置验收条件' };
  }

  if (failures.length) {
    return { pass: false, reason: failures.join('；') };
  }
  return { pass: true, reason: check.text };
}
