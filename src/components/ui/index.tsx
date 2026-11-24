import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Depth } from '@/types';

/* --------------------------------- Toast --------------------------------- */
type ToastItem = { id: number; text: string };
let toastSeq = 0;
const toastListeners = new Set<(item: ToastItem) => void>();

export function toast(text: string) {
  const item = { id: ++toastSeq, text };
  toastListeners.forEach((fn) => fn(item));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (item: ToastItem) => {
      setItems((prev) => [...prev, item]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }, 1900);
    };
    toastListeners.add(handler);
    return () => {
      toastListeners.delete(handler);
    };
  }, []);

  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      {items.map((i) => (
        <div className="toast" key={i.id}>
          {i.text}
        </div>
      ))}
    </div>
  );
}

/* --------------------------------- 图标 --------------------------------- */
const iconPaths: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5" />,
  map: <path d="M9 3 3 5.5v15L9 18l6 3 6-2.5v-15L15 6 9 3Zm0 0v15m6-12v15" />,
  book: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Zm0 15A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5Z" />,
  lab: <path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3M7.5 15h9" />,
  quiz: <path d="M9 8.5a3 3 0 1 1 4.6 2.6c-.9.6-1.6 1.3-1.6 2.4M12 17h.01M4 4h16v16H4z" />,
  chart: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
  search: <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35" />,
  bookmark: <path d="M6 3h12v18l-6-4.5L6 21V3Z" />,
  note: <path d="M5 3h9l5 5v13H5V3Zm9 0v5h5M8 13h8M8 17h5" />,
  sun: <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-14v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4" />,
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  check: <path d="m4 12.5 5 5L20 6.5" />,
  arrowRight: <path d="M4 12h16m-6-6 6 6-6 6" />,
  arrowLeft: <path d="M20 12H4m6-6-6 6 6 6" />,
  copy: <path d="M9 9h11v11H9V9ZM5 15H4V4h11v1" />,
  play: <path d="M7 4.5 19 12 7 19.5v-15Z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  next: <path d="M9 5l7 7-7 7" />,
  prev: <path d="M15 5l-7 7 7 7" />,
  reset: <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  target: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />,
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
  shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Zm-2 9 1.5 1.5L14.5 10" />,
  wifi: <path d="M2.5 9a14 14 0 0 1 19 0M6 12.5a9 9 0 0 1 12 0M9.5 16a4 4 0 0 1 5 0M12 20h.01" />,
  trash: <path d="M4 7h16M9 7V4h6v3m-8 0 1 14h8l1-14" />,
  layers: <path d="m12 3 9 5-9 5-9-5 9-5Zm9 9-9 5-9-5m18 4-9 5-9-5" />,
  gear: <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v2m0 13v2M3.5 12h2m13 0h2M5.9 5.9l1.4 1.4m9.4 9.4 1.4 1.4m0-12.2-1.4 1.4M7.3 16.7l-1.4 1.4" />,
};

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.7,
  className,
}: {
  name: keyof typeof iconPaths | string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {iconPaths[name] ?? iconPaths.map}
    </svg>
  );
}

/* --------------------------------- 徽章 --------------------------------- */
export function DepthBadge({ depth }: { depth: Depth }) {
  return <span className="badge" data-depth={depth}>{depth}</span>;
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'ok' | 'warn' | 'accent';
}) {
  return <span className={`badge ${tone === 'default' ? '' : tone}`}>{children}</span>;
}

/* -------------------------------- 进度条 -------------------------------- */
export function ProgressBar({
  value,
  thin,
  label,
}: {
  value: number;
  thin?: boolean;
  label?: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      className={`progress${thin ? ' thin' : ''}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? '进度'}
    >
      <div className="progress-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* --------------------------------- Tabs --------------------------------- */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          role="tab"
          aria-selected={value === item.value}
          className={`tab${value === item.value ? ' active' : ''}`}
          onClick={() => onChange(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------- 空状态 ------------------------------- */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <div className="t">{title}</div>
      {hint ? <div className="small">{hint}</div> : null}
    </div>
  );
}

/* ------------------------------ 复制按钮 ------------------------------ */
export function CopyButton({ text, small }: { text: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast('已复制到剪贴板');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      className={`btn ${small ? 'btn-sm' : ''} btn-ghost`}
      onClick={onCopy}
      aria-label="复制"
    >
      <Icon name={copied ? 'check' : 'copy'} size={13} />
      {copied ? '已复制' : '复制'}
    </button>
  );
}

/* ------------------------------ 分段控件 ------------------------------ */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="tabs" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          className={`tab${value === o.value ? ' active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
