import type { Lesson, ModuleMeta, QuizQuestion, StageId } from '@/types';

/**
 * 自动聚合 src/data/modules/*.ts 中的默认导出（ModuleMeta）。
 * 新增模块只需新增文件，无需改动此处。
 */
const moduleFiles = import.meta.glob('./modules/*.ts', { eager: true }) as Record<
  string,
  { default?: ModuleMeta }
>;

const quizFiles = import.meta.glob('./quizzes/*.ts', { eager: true }) as Record<
  string,
  { default?: QuizQuestion[] }
>;

export const modules: ModuleMeta[] = Object.values(moduleFiles)
  .map((m) => m.default)
  .filter((m): m is ModuleMeta => Boolean(m && m.id && Array.isArray(m.lessons)))
  .sort((a, b) => a.order - b.order);

export const lessons: Lesson[] = modules.flatMap((m) => m.lessons);

export const questions: QuizQuestion[] = Object.values(quizFiles)
  .flatMap((q) => q.default ?? [])
  .filter(Boolean);

export const moduleById = new Map(modules.map((m) => [m.id, m]));
export const lessonById = new Map(lessons.map((l) => [l.id, l]));

export function getModule(id: string | undefined): ModuleMeta | undefined {
  return id ? moduleById.get(id) : undefined;
}

export function getLesson(id: string | undefined): Lesson | undefined {
  return id ? lessonById.get(id) : undefined;
}

export function getLessonsByStage(stage: StageId): Lesson[] {
  return modules.filter((m) => m.stage === stage).flatMap((m) => m.lessons);
}

export function getStageLessons(stage: StageId): { module: ModuleMeta; lesson: Lesson }[] {
  return modules
    .filter((m) => m.stage === stage)
    .flatMap((m) => m.lessons.map((lesson) => ({ module: m, lesson })));
}

export function getLessonNeighbors(id: string): {
  prev?: Lesson;
  next?: Lesson;
} {
  const index = lessons.findIndex((l) => l.id === id);
  if (index < 0) return {};
  return { prev: lessons[index - 1], next: lessons[index + 1] };
}

export function getFirstLesson(): Lesson | undefined {
  return lessons[0];
}

export function getQuestionsByModule(moduleId: string): QuizQuestion[] {
  return questions.filter((q) => q.moduleId === moduleId);
}

export function getQuestionsByLesson(lessonId: string): QuizQuestion[] {
  return questions.filter((q) => q.lessonId === lessonId);
}

/** 课时自测题：优先取绑定本课的题，否则从所属模块中取前若干题 */
export function resolveLessonQuiz(lesson: Lesson, ids?: string[]): QuizQuestion[] {
  if (ids && ids.length) {
    return ids.map((id) => questions.find((q) => q.id === id)).filter((q): q is QuizQuestion => Boolean(q));
  }
  const own = getQuestionsByLesson(lesson.id);
  if (own.length) return own;
  return getQuestionsByModule(lesson.moduleId).slice(0, 3);
}

export function countByDepth(module: ModuleMeta): Record<string, number> {
  return module.lessons.reduce<Record<string, number>>((acc, l) => {
    acc[l.depth] = (acc[l.depth] ?? 0) + 1;
    return acc;
  }, {});
}

/** 所有互动组件 key → 使用它的课时（用于「这个图解出现在哪些课」） */
export function lessonsUsingInteractive(key: string): Lesson[] {
  return lessons.filter((l) =>
    l.blocks.some((b) => b.type === 'interactive' && b.key === key),
  );
}

/** 课程总时长（分钟） */
export const totalMinutes = lessons.reduce((sum, l) => sum + l.minutes, 0);

/** 搜索索引条目 */
export interface SearchHit {
  kind: 'module' | 'lesson';
  id: string;
  title: string;
  moduleId: string;
  moduleTitle: string;
  snippet: string;
  score: number;
}

function blocksToText(lesson: Lesson): string {
  const parts: string[] = [lesson.title, lesson.summary, ...(lesson.keywords ?? []), ...lesson.objectives];
  for (const b of lesson.blocks) {
    switch (b.type) {
      case 'paragraph':
      case 'analogy':
      case 'warning':
      case 'tip':
        parts.push(b.text);
        break;
      case 'heading':
        parts.push(b.text);
        break;
      case 'list':
      case 'checklist':
        parts.push(b.items.join(' '));
        break;
      case 'code':
        parts.push(b.code);
        break;
      case 'output':
        parts.push(b.text);
        break;
      case 'table':
        parts.push(b.columns.join(' '), ...b.rows.flat());
        break;
      case 'steps':
        parts.push(...b.items.map((i) => `${i.title} ${i.text}`));
        break;
      case 'kv':
        parts.push(...b.items.map((i) => `${i.label} ${i.value}`));
        break;
      default:
        break;
    }
  }
  return parts.join('\n');
}

let searchIndexCache: { lesson: Lesson; text: string; moduleId: string }[] | null = null;

export function getSearchIndex() {
  if (!searchIndexCache) {
    searchIndexCache = lessons.map((lesson) => ({
      lesson,
      text: blocksToText(lesson).toLowerCase(),
      moduleId: lesson.moduleId,
    }));
  }
  return searchIndexCache;
}

export function searchAll(rawQuery: string): SearchHit[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];
  const tokens = query.split(/\s+/).filter(Boolean);
  const hits: SearchHit[] = [];

  for (const m of modules) {
    const hay = `${m.code} ${m.title} ${m.summary} ${m.keywords.join(' ')}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (!hay.includes(t)) continue;
      score += m.title.toLowerCase().includes(t) ? 6 : 2;
    }
    if (score > 0) {
      hits.push({
        kind: 'module',
        id: m.id,
        title: `${m.code} ${m.title}`,
        moduleId: m.id,
        moduleTitle: m.title,
        snippet: m.summary,
        score: score + 4,
      });
    }
  }

  for (const { lesson, text, moduleId } of getSearchIndex()) {
    let score = 0;
    const title = lesson.title.toLowerCase();
    for (const t of tokens) {
      if (title.includes(t)) score += 8;
      if (text.includes(t)) score += 2;
    }
    if (score > 0) {
      const idx = text.indexOf(tokens[0]);
      const snippet = idx >= 0 ? text.slice(Math.max(0, idx - 30), idx + 60).replace(/\n/g, ' ') : lesson.summary;
      hits.push({
        kind: 'lesson',
        id: lesson.id,
        title: lesson.title,
        moduleId,
        moduleTitle: moduleById.get(moduleId)?.title ?? '',
        snippet,
        score,
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, 30);
}
