import type { ComponentType } from 'react';
import { Icon } from '@/components/ui';
import type { InteractiveKey } from '@/types';

export interface InteractiveMeta {
  key: InteractiveKey | string;
  title: string;
  subtitle?: string;
  order?: number;
}

type VizModule = {
  meta?: InteractiveMeta;
  default?: ComponentType;
};

const vizFiles = import.meta.glob('./viz/*.tsx', { eager: true }) as Record<string, VizModule>;

export const interactiveComponents: Record<string, ComponentType> = {};
export const interactiveMetas: InteractiveMeta[] = [];

Object.values(vizFiles).forEach((mod) => {
  if (mod.meta && mod.default) {
    interactiveComponents[mod.meta.key] = mod.default;
    interactiveMetas.push(mod.meta);
  }
});

interactiveMetas.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

export function getInteractiveMeta(key: string): InteractiveMeta | undefined {
  return interactiveMetas.find((m) => m.key === key);
}

/**
 * 统一的可视化容器：标题栏 + 内容区。
 * 具体组件只负责渲染内容区（图表 + 控件）。
 */
export function InteractiveBlock({
  interactiveKey,
  caption,
}: {
  interactiveKey: InteractiveKey | string;
  caption?: string;
}) {
  const Comp = interactiveComponents[interactiveKey];
  const meta = getInteractiveMeta(interactiveKey);

  return (
    <div className="viz">
      <div className="viz-head">
        <Icon name="bolt" size={15} className="muted" />
        <span className="viz-title">{meta?.title ?? '互动图解'}</span>
        {meta?.subtitle ? <span className="badge">可交互</span> : null}
        <span className="spacer" />
        <span className="tiny faint">拖动 / 点击 / 播放试试</span>
      </div>
      <div className="viz-body">
        {Comp ? (
          <Comp />
        ) : (
          <div className="empty">
            <div className="t">图解正在建设中</div>
            <div className="small">该互动组件尚未加载</div>
          </div>
        )}
      </div>
      {caption ? <div className="viz-caption">{caption}</div> : null}
    </div>
  );
}
