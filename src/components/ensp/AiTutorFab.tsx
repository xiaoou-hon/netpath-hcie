import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui';

export type FabSide = 'left' | 'right';
export type QuickAskKind = 'explain' | 'diagnose' | 'next';

const POS_KEY = 'netpath:ensp:ai-fab-pos:v2';
const SIZE = 56;
const MARGIN = 14;
const CORNER_GAP = 20;
const DRAG_THRESHOLD = 4;
const LONG_PRESS_MS = 600;

interface FabPos {
  x: number;
  y: number;
}

const QUICK_ITEMS: { kind: QuickAskKind; label: string; icon: string }[] = [
  { kind: 'explain', label: '解释这一步', icon: 'target' },
  { kind: 'diagnose', label: '诊断报错', icon: 'shield' },
  { kind: 'next', label: '下一组命令', icon: 'arrowRight' },
];

function clampPos(pos: FabPos): FabPos {
  const maxX = Math.max(MARGIN, window.innerWidth - SIZE - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - SIZE - MARGIN);
  return {
    x: Math.min(Math.max(pos.x, MARGIN), maxX),
    y: Math.min(Math.max(pos.y, MARGIN), maxY),
  };
}

function defaultPos(): FabPos {
  // 默认停靠右下角，避开页面内容主线
  return clampPos({
    x: window.innerWidth - SIZE - CORNER_GAP,
    y: window.innerHeight - SIZE - CORNER_GAP,
  });
}

function readPos(): FabPos | null {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FabPos>;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null;
    return clampPos({ x: parsed.x, y: parsed.y });
  } catch {
    return null;
  }
}

function savePos(pos: FabPos) {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(pos));
  } catch {
    /* 隐私模式下写入失败时忽略 */
  }
}

export interface AiTutorFabProps {
  open: boolean;
  onToggle: () => void;
  /** 球停靠在左/右侧时通知父级，用于决定浮窗展开方向 */
  onSideChange?: (side: FabSide) => void;
  /** 是否有设备已连接（外圈显示绿色状态环） */
  connected?: boolean;
  /** AI 正在回答（球做呼吸动画） */
  busy?: boolean;
  /** 窗口关闭期间收到了新回答（显示红点） */
  unread?: boolean;
  /** 快捷提问：解释这一步 / 诊断报错 / 下一组命令 */
  onQuickAsk?: (kind: QuickAskKind) => void;
  onOpenSettings?: () => void;
}

/**
 * AI 助手悬浮球：
 * - 单击开/关、拖动吸附左右边缘、位置记忆
 * - 长按 600ms 或右键打开快捷菜单
 * - 状态反馈：已连接绿环、回答中呼吸、未读红点
 */
export function AiTutorFab({
  open,
  onToggle,
  onSideChange,
  connected,
  busy,
  unread,
  onQuickAsk,
  onOpenSettings,
}: AiTutorFabProps) {
  const [pos, setPos] = useState<FabPos>(() => readPos() ?? defaultPos());
  const [dragging, setDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const posRef = useRef(pos);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const longPressRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);

  const side: FabSide = pos.x + SIZE / 2 < window.innerWidth / 2 ? 'left' : 'right';

  const applyPos = (next: FabPos) => {
    posRef.current = next;
    setPos(next);
  };

  const clearLongPress = () => {
    if (longPressRef.current !== null) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  useEffect(() => {
    savePos(pos);
    onSideChange?.(pos.x + SIZE / 2 < window.innerWidth / 2 ? 'left' : 'right');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos]);

  useEffect(() => {
    const onResize = () => applyPos(clampPos(posRef.current));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // 菜单打开时点击外部关闭
  useEffect(() => {
    if (!menuOpen) return;
    const onDocDown = (event: globalThis.PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDocDown);
    return () => document.removeEventListener('pointerdown', onDocDown);
  }, [menuOpen]);

  useEffect(() => clearLongPress, []);

  if (open) return null;

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: posRef.current.x,
      originY: posRef.current.y,
      moved: false,
    };
    setDragging(true);
    longPressFiredRef.current = false;
    clearLongPress();
    longPressRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      setMenuOpen(true);
      setDragging(false);
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    clearLongPress();
    if (menuOpen) setMenuOpen(false);
    applyPos(clampPos({ x: drag.originX + dx, y: drag.originY + dy }));
  };

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    const wasLongPress = longPressFiredRef.current;
    clearLongPress();
    if (!drag) return;
    if (event.currentTarget.hasPointerCapture(drag.pointerId)) {
      event.currentTarget.releasePointerCapture(drag.pointerId);
    }
    if (wasLongPress) return;
    if (!drag.moved) {
      onToggle();
      return;
    }
    // 松手吸附到最近的左右边缘
    const snapX =
      posRef.current.x + SIZE / 2 < window.innerWidth / 2
        ? MARGIN
        : window.innerWidth - SIZE - MARGIN;
    applyPos(clampPos({ x: snapX, y: posRef.current.y }));
  };

  const onPointerCancel = () => {
    dragRef.current = null;
    setDragging(false);
    clearLongPress();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  };

  const pick = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  const resetPosition = () => {
    applyPos(defaultPos());
  };

  const classes = [
    'ensp-fab-ball',
    dragging ? 'dragging' : '',
    connected ? 'connected' : '',
    busy ? 'busy' : '',
    unread ? 'unread' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // 用 Portal 挂到 body：页面容器的 transform 会让 position:fixed 相对容器定位，
  // 直接挂在 body 才能保证球始终相对视口停在右下角。
  return createPortal(
    <div className={`ensp-fab-wrap ${side}`} style={{ left: pos.x, top: pos.y }} ref={wrapRef}>
      <button
        type="button"
        className={classes}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(event) => {
          event.preventDefault();
          setMenuOpen(true);
        }}
        onKeyDown={onKeyDown}
        aria-label="打开 AI 实验助教（右键或长按显示快捷菜单）"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title="AI 实验助教 · 可拖动 · 右键/长按更多"
      >
        <Icon name="bolt" size={20} />
        <span className="ensp-fab-ball-text">AI</span>
      </button>

      {menuOpen ? (
        <div
          className={`ensp-fab-menu ${side}${pos.y < 320 ? ' below' : ''}`}
          role="menu"
          aria-label="AI 助手快捷操作"
        >
          <div className="ensp-fab-menu-title">
            <span className="ensp-fab-menu-dot" aria-hidden="true" />
            AI 助教
          </div>
          {QUICK_ITEMS.map((item) => (
            <button
              type="button"
              key={item.kind}
              role="menuitem"
              onClick={() => pick(() => onQuickAsk?.(item.kind))}
            >
              <Icon name={item.icon} size={15} />
              <span>{item.label}</span>
            </button>
          ))}
          <div className="ensp-fab-menu-sep" role="separator" />
          <button type="button" role="menuitem" onClick={() => pick(() => onOpenSettings?.())}>
            <Icon name="gear" size={15} />
            <span>AI 设置</span>
          </button>
          <button type="button" role="menuitem" onClick={() => pick(resetPosition)}>
            <Icon name="reset" size={15} />
            <span>回到右下角</span>
          </button>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
