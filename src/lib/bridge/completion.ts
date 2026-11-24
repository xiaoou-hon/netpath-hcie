/**
 * VRP 命令补全 / 帮助引擎（纯函数，可在浏览器与 Node 中复用）。
 * ------------------------------------------------------------------
 * - Tab 补全：根据当前输入行 + 光标位置 + 当前视图，给出候选词与公共前缀。
 * - ? 帮助：列出当前上下文可用的全部命令 / 关键字（华为风格）。
 * 不发起任何 IO，所有数据来自 vrp-commands 词典。
 */
import { VRP_COMMANDS, VRP_SUFFIXES } from './vrp-commands';
import type { VrpCandidate } from './vrp-commands';

export interface CompletionContext {
  /** 桥接返回的视图：user / system / sub */
  view: string;
  /** 设备提示符，用于从子视图提示符识别具体类型（如 interface/ospf） */
  prompt?: string;
  /** 额外候选词（例如场景拓扑中的接口名），会在相关上下文中合并 */
  extraTokens?: string[];
}

export interface CompletionResult {
  /** 匹配的候选（已过滤前缀，但去重、排序） */
  candidates: VrpCandidate[];
  /** 所有候选词的最长公共前缀；长于当前 token 时可直接补全到此处 */
  commonPrefix: string;
  /** 唯一匹配时的完整词（可直接替换 token） */
  unique?: string;
}

/** 从提示符识别具体子视图：[R1-GigabitEthernet0/0/0] -> interface 等 */
export function subViewFromPrompt(prompt?: string): string | null {
  if (!prompt) return null;
  const inner = prompt.trim().replace(/^[\[<]/, '').replace(/[\]>]$/, '');
  const rest = inner.split('-').slice(1).join('-'); // 去掉设备名
  if (!rest) return null;
  const head = rest.split(/\d/)[0].toLowerCase();
  if (head.startsWith('gigabitethernet') || head.startsWith('ge') || head.startsWith('ethernet') || head.startsWith('serial') || head.startsWith('vlanif') || head.startsWith('loopback')) {
    return 'interface';
  }
  if (head.startsWith('ospf')) {
    return rest.includes('-') ? 'ospf-area' : 'ospf';
  }
  if (head.startsWith('bgp')) return 'bgp';
  if (head.startsWith('vlan')) return 'vlan';
  if (head.startsWith('acl')) return 'acl';
  if (head.startsWith('route-policy')) return 'route_policy';
  return null;
}

/** 计算「有效视图」：sub 时尽量识别为具体子视图 */
export function effectiveView(ctx: CompletionContext): string {
  const view = (ctx.view || 'user').toLowerCase();
  if (view === 'sub') {
    return subViewFromPrompt(ctx.prompt) || 'sub';
  }
  return view;
}

/** 取光标前的最后一个 token 及其前缀词列表 */
function splitAtCursor(line: string, cursor: number): { prefixWords: string[]; token: string } {
  const before = line.slice(0, Math.max(0, Math.min(cursor, line.length)));
  const lastSpace = before.search(/\s+$/);
  const tokenStart = lastSpace >= 0 ? lastSpace : -1;
  const token = tokenStart >= 0 ? before.slice(tokenStart) : before;
  const prefixPart = tokenStart >= 0 ? before.slice(0, tokenStart) : '';
  const prefixWords = prefixPart
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  return { prefixWords, token: token.trimStart() };
}

/** 多个字符串的最长公共前缀 */
function longestCommonPrefix(words: string[]): string {
  if (words.length === 0) return '';
  let prefix = words[0];
  for (let i = 1; i < words.length; i += 1) {
    while (!words[i].startsWith(prefix) && prefix.length > 0) {
      prefix = prefix.slice(0, -1);
    }
    if (!prefix) break;
  }
  return prefix;
}

/** 在给定前缀键下取候选池（优先精确匹配，其次逐级回退） */
function candidatePool(prefixWords: string[], view: string, extraTokens?: string[]): VrpCandidate[] {
  const key = prefixWords.join(' ');
  if (key && VRP_SUFFIXES[key]) {
    return VRP_SUFFIXES[key];
  }
  // 回退：前缀更深时，尝试去掉最后一个词再找（保守，避免误匹配）。
  if (prefixWords.length > 1) {
    const shorter = prefixWords.slice(0, -1).join(' ');
    if (VRP_SUFFIXES[shorter]) return VRP_SUFFIXES[shorter];
  }
  // 空前缀 -> 取当前视图的首字命令
  if (!key) {
    const list = VRP_COMMANDS[view] || VRP_COMMANDS.sub || [];
    return list;
  }
  // 已知前缀但无后缀表：合并该前缀词自身的命令池（例如输入了 "display " 之外），
  // 这里不臆造，返回空，让设备端补全 / 学习者自行输入。
  return [];
}

/** 过滤 + 去重 + 排序候选 */
function filterCandidates(
  pool: VrpCandidate[],
  tokenLower: string,
  extraTokens?: string[],
): VrpCandidate[] {
  const seen = new Set<string>();
  const result: VrpCandidate[] = [];
  const push = (c: VrpCandidate) => {
    if (seen.has(c.word)) return;
    seen.add(c.word);
    result.push(c);
  };
  for (const c of pool) {
    if (!c.word) continue;
    if (tokenLower && !c.word.toLowerCase().startsWith(tokenLower)) continue;
    push(c);
  }
  // 合并额外 token（仅在 token 为空或匹配时），用于接口名等场景参数
  if (extraTokens && extraTokens.length) {
    for (const word of extraTokens) {
      if (!word) continue;
      if (tokenLower && !word.toLowerCase().startsWith(tokenLower)) continue;
      push({ word, desc: '场景拓扑中的接口 / 设备名' });
    }
  }
  // 真实命令字优先，参数占位靠后；同组按字典序
  result.sort((a, b) => {
    if (Boolean(a.placeholder) !== Boolean(b.placeholder)) return a.placeholder ? 1 : -1;
    return a.word.localeCompare(b.word);
  });
  return result;
}

/**
 * 计算补全结果。
 * @param line 当前输入行全文
 * @param cursor 光标位置（字符偏移）
 * @param ctx 视图 / 提示符 / 额外 token
 */
export function complete(line: string, cursor: number, ctx: CompletionContext): CompletionResult {
  const view = effectiveView(ctx);
  const { prefixWords, token } = splitAtCursor(line, cursor);
  const tokenLower = token.toLowerCase();
  const pool = candidatePool(prefixWords, view, ctx.extraTokens);
  const candidates = filterCandidates(pool, tokenLower, ctx.extraTokens);

  const words = candidates.map((c) => c.word).filter((w) => !w.startsWith('<'));
  const commonPrefix = longestCommonPrefix(words);
  const unique = candidates.length === 1 ? candidates[0].word : undefined;

  return { candidates, commonPrefix, unique };
}

/**
 * 华为风格「?」帮助：列出当前上下文可用的全部候选（不过滤 token，
 * 但若 token 非空则按 token 过滤，模拟 `disp?` 的行为）。
 */
export function help(line: string, cursor: number, ctx: CompletionContext): VrpCandidate[] {
  const view = effectiveView(ctx);
  const { prefixWords, token } = splitAtCursor(line, cursor);
  const tokenLower = token.toLowerCase();
  const pool = candidatePool(prefixWords, view, ctx.extraTokens);
  // token 为空 -> 全部；非空 -> 过滤（等价于 disp? 列出匹配项）
  return filterCandidates(pool, tokenLower, ctx.extraTokens);
}

/**
 * 把补全结果应用到输入行：返回新的行文本与新的光标位置。
 * - 唯一匹配 / 公共前缀长于 token 时：替换 token 为公共前缀（或唯一词）。
 * - 唯一完整词后追加一个空格，方便继续输入下一个参数（真实终端习惯）。
 */
export function applyCompletion(
  line: string,
  cursor: number,
  result: CompletionResult,
): { line: string; cursor: number } {
  const before = line.slice(0, Math.max(0, Math.min(cursor, line.length)));
  const after = line.slice(cursor);
  const tokenStart = before.search(/\s+$/) >= 0 ? before.search(/\s+$/) : -1;
  const token = tokenStart >= 0 ? before.slice(tokenStart) : before;
  const prefix = tokenStart >= 0 ? before.slice(0, tokenStart) : '';

  let replacement = '';
  if (result.unique && !result.unique.startsWith('<')) {
    replacement = result.unique;
  } else if (result.commonPrefix && result.commonPrefix.length > token.trimStart().length) {
    replacement = result.commonPrefix;
  } else {
    // 无可补全内容，保持原样
    return { line, cursor };
  }

  const tokenHeadSpaces = token.length - token.trimStart().length;
  const newBefore = `${prefix}${' '.repeat(tokenHeadSpaces)}${replacement} `;
  const newLine = `${newBefore}${after}`;
  return { line: newLine, cursor: newBefore.length };
}
