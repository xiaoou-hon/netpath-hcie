import { useCallback, useEffect, useState } from 'react';

export interface Stepper {
  index: number;
  count: number;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  prev: () => void;
  reset: () => void;
  goTo: (index: number) => void;
  playing: boolean;
  toggle: () => void;
  pause: () => void;
  /** 自动播放倍速：0.5 / 1 / 1.5 / 2 */
  speed: number;
  setSpeed: (speed: number) => void;
}

/**
 * 统一的步骤播放器：支持前进/后退/跳转/自动播放/重置。
 * 播放到末步自动停止；reset 会同时停止播放。
 */
export function useStepper(count: number, options?: { interval?: number; speed?: number }): Stepper {
  const interval = options?.interval ?? 1500;
  const safeCount = Math.max(1, count);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState(options?.speed ?? 1);
  const effectiveInterval = Math.max(160, Math.round(interval / speed));

  useEffect(() => {
    setIndex((current) => Math.min(current, safeCount - 1));
  }, [safeCount]);

  useEffect(() => {
    if (!playing) return undefined;
    if (index >= safeCount - 1) {
      setPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setIndex((current) => Math.min(safeCount - 1, current + 1));
    }, effectiveInterval);
    return () => window.clearTimeout(timer);
  }, [playing, index, safeCount, effectiveInterval]);

  const next = useCallback(() => {
    setIndex((current) => Math.min(safeCount - 1, current + 1));
  }, [safeCount]);

  const prev = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  const reset = useCallback(() => {
    setPlaying(false);
    setIndex(0);
  }, []);

  const goTo = useCallback(
    (target: number) => {
      setPlaying(false);
      setIndex(Math.max(0, Math.min(safeCount - 1, target)));
    },
    [safeCount],
  );

  const toggle = useCallback(() => {
    setPlaying((current) => {
      if (current) return false;
      setIndex((value) => (value >= safeCount - 1 ? 0 : value));
      return true;
    });
  }, [safeCount]);

  const pause = useCallback(() => setPlaying(false), []);

  const setSpeed = useCallback((value: number) => {
    setSpeedState(Math.max(0.25, Math.min(4, value)));
  }, []);

  return {
    index,
    count: safeCount,
    isFirst: index === 0,
    isLast: index >= safeCount - 1,
    next,
    prev,
    reset,
    goTo,
    playing,
    toggle,
    pause,
    speed,
    setSpeed,
  };
}
