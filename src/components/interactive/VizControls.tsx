import type { KeyboardEvent, ReactNode } from 'react';
import type { Stepper } from './useStepper';
import { Icon } from '@/components/ui';

/**
 * 统一的演示控制条：上一步 / 下一步 / 播放 / 重置 / 进度点 / 步骤计数。
 * 容器可聚焦，聚焦后支持 ← → 切换、空格播放暂停。
 */
export function VizControls({
  stepper,
  extra,
  prevLabel = '上一步',
  nextLabel = '下一步',
  showPlay = true,
  showSpeed = true,
  showDots = true,
  ariaLabel = '演示步骤控制',
}: {
  stepper: Stepper;
  extra?: ReactNode;
  prevLabel?: string;
  nextLabel?: string;
  showPlay?: boolean;
  showSpeed?: boolean;
  showDots?: boolean;
  ariaLabel?: string;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      stepper.next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stepper.prev();
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      stepper.toggle();
    }
  };

  const SPEEDS = [0.5, 1, 1.5, 2];
  const cycleSpeed = () => {
    const nextIndex = (SPEEDS.indexOf(stepper.speed) + 1) % SPEEDS.length;
    stepper.setSpeed(SPEEDS[nextIndex] ?? 1);
  };

  return (
    <div
      className="viz-controls"
      role="group"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      title="聚焦后可用 ← → 切换步骤，空格播放/暂停"
    >
      <button
        type="button"
        className="btn btn-sm"
        onClick={stepper.prev}
        disabled={stepper.isFirst}
        aria-label={prevLabel}
      >
        <Icon name="prev" size={12} /> {prevLabel}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        onClick={stepper.next}
        disabled={stepper.isLast}
        aria-label={nextLabel}
      >
        {nextLabel} <Icon name="next" size={12} />
      </button>
      {showPlay ? (
        <>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={stepper.toggle}
            aria-label={stepper.playing ? '暂停自动播放' : '自动播放'}
            aria-pressed={stepper.playing}
          >
            <Icon name={stepper.playing ? 'pause' : 'play'} size={12} />
            {stepper.playing ? '暂停' : '播放'}
          </button>
          {showSpeed ? (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={cycleSpeed}
              aria-label={`播放速度 ${stepper.speed} 倍，点击切换`}
              title="自动播放倍速"
            >
              {stepper.speed}×
            </button>
          ) : null}
        </>
      ) : null}
      <button type="button" className="btn btn-sm btn-ghost" onClick={stepper.reset} aria-label="重置到第一步">
        <Icon name="reset" size={12} /> 重置
      </button>

      {showDots && stepper.count <= 20 ? (
        <div className="viz-dots" role="tablist" aria-label="步骤跳转">
          {Array.from({ length: stepper.count }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === stepper.index}
              aria-label={`跳到第 ${i + 1} 步`}
              className={`viz-dot${i === stepper.index ? ' active' : ''}${i < stepper.index ? ' passed' : ''}`}
              onClick={() => stepper.goTo(i)}
            />
          ))}
        </div>
      ) : null}

      <span className="viz-step">
        {stepper.index + 1} / {stepper.count}
      </span>
      <span className="viz-hint hide-sm">← → 切换 · 空格播放</span>
      {extra}
    </div>
  );
}
