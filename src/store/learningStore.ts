import { useSyncExternalStore } from 'react';
import type { LearningState, QuizAttempt, StageId } from '@/types';
import { getLessonsByStage, lessons, modules } from '@/data/curriculum';

const STORAGE_KEY = 'netpath:v1';

const defaultState: LearningState = {
  version: 1,
  completedLessons: {},
  bookmarks: [],
  notes: {},
  attempts: [],
  moduleBest: {},
  wrongQuestions: {},
  activity: {},
  theme: 'dark',
};

function loadState(): LearningState {
  if (typeof window === 'undefined') return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<LearningState>;
    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
}

let state: LearningState = loadState();
const listeners = new Set<() => void>();

function emit() {
  state = { ...state };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 存储不可用时降级为内存态 */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getLearningState(): LearningState {
  return state;
}

export function useLearning(): LearningState {
  return useSyncExternalStore(subscribe, getLearningState, getLearningState);
}

function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function touchActivity(count = 1) {
  const key = todayKey();
  state.activity = { ...state.activity, [key]: (state.activity[key] ?? 0) + count };
}

/* ---------------------------------- 动作 ---------------------------------- */

export function setLessonCompleted(lessonId: string, completed: boolean) {
  const next = { ...state.completedLessons };
  if (completed) {
    if (!next[lessonId]) {
      next[lessonId] = { at: new Date().toISOString() };
      touchActivity(1);
    }
  } else {
    delete next[lessonId];
  }
  state.completedLessons = next;
  emit();
}

export function toggleLessonCompleted(lessonId: string) {
  setLessonCompleted(lessonId, !state.completedLessons[lessonId]);
}

export function toggleBookmark(lessonId: string) {
  const exists = state.bookmarks.includes(lessonId);
  state.bookmarks = exists ? state.bookmarks.filter((id) => id !== lessonId) : [...state.bookmarks, lessonId];
  emit();
}

export function setNote(lessonId: string, text: string) {
  const notes = { ...state.notes };
  if (text.trim()) {
    notes[lessonId] = { text, updatedAt: new Date().toISOString() };
  } else {
    delete notes[lessonId];
  }
  state.notes = notes;
  emit();
}

export function recordAttempt(attempt: Omit<QuizAttempt, 'id' | 'at'>) {
  const full: QuizAttempt = {
    ...attempt,
    id: `att-${Date.now()}`,
    at: new Date().toISOString(),
  };
  state.attempts = [full, ...state.attempts].slice(0, 60);
  if (attempt.moduleId && attempt.total > 0) {
    const ratio = attempt.correct / attempt.total;
    const best = state.moduleBest[attempt.moduleId] ?? 0;
    state.moduleBest = { ...state.moduleBest, [attempt.moduleId]: Math.max(best, ratio) };
  }
  touchActivity(1);
  emit();
}

export function addWrongQuestions(questionIds: string[]) {
  if (!questionIds.length) return;
  const now = new Date().toISOString();
  const next = { ...state.wrongQuestions };
  for (const id of questionIds) {
    const prev = next[id];
    next[id] = { count: (prev?.count ?? 0) + 1, lastAt: now };
  }
  state.wrongQuestions = next;
  emit();
}

export function removeWrongQuestion(questionId: string) {
  const next = { ...state.wrongQuestions };
  delete next[questionId];
  state.wrongQuestions = next;
  emit();
}

export function clearWrongQuestions() {
  state.wrongQuestions = {};
  emit();
}

export function setTheme(theme: 'dark' | 'light') {
  state.theme = theme;
  emit();
}

export function resetProgress() {
  state = { ...defaultState, theme: state.theme };
  emit();
}

/* ---------------------------------- 派生 ---------------------------------- */

export function isLessonCompleted(lessonId: string): boolean {
  return Boolean(state.completedLessons[lessonId]);
}

export function moduleProgress(moduleId: string): { completed: number; total: number; ratio: number } {
  const mod = modules.find((m) => m.id === moduleId);
  const total = mod?.lessons.length ?? 0;
  const completed = mod?.lessons.filter((l) => state.completedLessons[l.id]).length ?? 0;
  return { completed, total, ratio: total ? completed / total : 0 };
}

/** 掌握度 = 课时完成率 × 70% + 模块小测最好正确率 × 30% */
export function moduleMastery(moduleId: string): number {
  const { ratio } = moduleProgress(moduleId);
  const best = state.moduleBest[moduleId] ?? 0;
  return Math.min(1, ratio * 0.7 + best * 0.3);
}

export function stageProgress(stage: StageId): { completed: number; total: number; ratio: number } {
  const list = getLessonsByStage(stage);
  const completed = list.filter((l) => state.completedLessons[l.id]).length;
  return { completed, total: list.length, ratio: list.length ? completed / list.length : 0 };
}

export function overallProgress(): { completed: number; total: number; ratio: number } {
  const total = lessons.length;
  const completed = lessons.filter((l) => state.completedLessons[l.id]).length;
  return { completed, total, ratio: total ? completed / total : 0 };
}

export function nextLesson() {
  return lessons.find((l) => !state.completedLessons[l.id]);
}

export function streakDays(): number {
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = todayKey(cursor);
    if (state.activity[key]) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      // 今天还没学，允许从昨天开始算连续
      if (streak === 0 && cursor.getTime() <= Date.now()) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (state.activity[todayKey(yesterday)]) {
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
      }
      break;
    }
  }
  return streak;
}

export function recentActivity(days = 7): { date: string; count: number }[] {
  const result: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    result.push({ date: key, count: state.activity[key] ?? 0 });
  }
  return result;
}

export function weakModules(limit = 3): { moduleId: string; mastery: number }[] {
  return modules
    .map((m) => ({ moduleId: m.id, mastery: moduleMastery(m.id) }))
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, limit);
}
