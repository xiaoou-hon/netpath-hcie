import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { glossaryPattern, lookupGlossary } from '@/data/glossary';
import type { GlossaryEntry } from '@/data/glossary';

function GlossaryTerm({ display, entry }: { display: string; entry: GlossaryEntry }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; below: boolean } | null>(null);
  const tipId = useId();

  const show = () => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = Math.min(150, window.innerWidth / 2 - 12);
    const below = rect.top < 150;
    setPos({
      x: Math.min(Math.max(rect.left + rect.width / 2, margin), window.innerWidth - margin),
      y: below ? rect.bottom + 8 : rect.top - 8,
      below,
    });
  };

  const hide = () => setPos(null);

  return (
    <span
      ref={ref}
      className="glossary-term"
      tabIndex={0}
      aria-describedby={pos ? tipId : undefined}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {display}
      {pos
        ? createPortal(
            <span
              className={`glossary-tip${pos.below ? ' below' : ''}`}
              role="tooltip"
              id={tipId}
              style={{ left: pos.x, top: pos.y }}
            >
              <span className="g-head">
                <strong>{entry.term}</strong>
                {entry.full ? <span className="g-full">{entry.full}</span> : null}
              </span>
              <span className="g-desc">{entry.desc}</span>
              <span className="g-cat">{entry.category}</span>
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

/**
 * 把纯文本中的英文缩写自动包成可悬停的术语，未识别到术语时原样输出。
 * 仅用于正文/表格/题干等自然语言，不要用于命令与回显。
 */
export function GlossaryText({ text }: { text: string }) {
  const pattern = new RegExp(glossaryPattern.source, 'gi');
  const nodes: ReactNode[] = [];
  let last = 0;
  let index = 0;
  let match: RegExpExecArray | null = pattern.exec(text);

  while (match) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const entry = lookupGlossary(match[0]);
    if (entry) {
      nodes.push(<GlossaryTerm key={`g-${index}`} display={match[0]} entry={entry} />);
      index += 1;
    } else {
      nodes.push(match[0]);
    }
    last = match.index + match[0].length;
    match = pattern.exec(text);
  }

  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}
