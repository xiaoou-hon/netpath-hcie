import { useEffect, useRef } from 'react';
import type { VrpCandidate } from '@/lib/bridge/vrp-commands';

export interface CompletionPopupProps {
  candidates: VrpCandidate[];
  index: number;
  title?: string;
  onSelect: (word: string) => void;
  onHover: (index: number) => void;
}

/**
 * 终端命令补全 / 帮助弹窗：浮在输入行上方，列出 VRP 候选命令与中文说明。
 * 键盘 ↑/↓ 导航，Enter/Tab/→ 确认，Esc 关闭（关闭逻辑在父组件）。
 */
export function CompletionPopup({ candidates, index, title, onSelect, onHover }: CompletionPopupProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // 选中项变化时滚动到可见区域
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[data-active="true"]');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }, [index]);

  if (candidates.length === 0) return null;

  return (
    <div className="ensp-completion-popup" role="listbox" aria-label={title ?? '命令补全'}>
      {title ? <div className="ensp-completion-title">{title}</div> : null}
      <div className="ensp-completion-list" ref={listRef}>
        {candidates.map((c, i) => (
          <button
            type="button"
            key={`${c.word}-${i}`}
            className={`ensp-completion-item${i === index ? ' active' : ''}`}
            data-active={i === index}
            onMouseEnter={() => onHover(i)}
            onClick={() => onSelect(c.word)}
            role="option"
            aria-selected={i === index}
          >
            <span className="ensp-completion-word">{c.word}</span>
            {c.desc ? <span className="ensp-completion-desc">{c.desc}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
