/** eNSP 组件共用的小工具 */

/** 把 unknown 异常转成可读文案 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || '未知错误';
  if (typeof error === 'string' && error.trim()) return error.trim();
  return '未知错误';
}

/**
 * 复制文本：优先 navigator.clipboard，失败时退化为 textarea + execCommand。
 * 返回是否复制成功，调用方据此给出不同提示。
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 继续尝试降级方案 */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', 'readonly');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
