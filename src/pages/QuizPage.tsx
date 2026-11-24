import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Lesson, QuizQuestion } from '@/types';
import { getLesson, getModule, getQuestionsByModule, questions } from '@/data/curriculum';
import {
  addWrongQuestions,
  clearWrongQuestions,
  recordAttempt,
  removeWrongQuestion,
  useLearning,
} from '@/store/learningStore';
import { EmptyState, Icon, ProgressBar, Tabs, toast } from '@/components/ui';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

type Mode = 'module' | 'mixed' | 'wrong';

type RetryConfig = { kind: 'module'; moduleId: string } | { kind: 'mixed'; count: number };

interface PaperMeta {
  scope: string;
  moduleId?: string;
  retry: RetryConfig;
}

interface PaperResult {
  questions: QuizQuestion[];
  answers: Record<string, number[]>;
  correct: number;
  scope: string;
  retry: RetryConfig;
}

function typeLabel(type: QuizQuestion['type']): string {
  if (type === 'single') return '单选';
  if (type === 'multiple') return '多选';
  return '判断';
}

function sameAnswer(picked: number[] | undefined, answer: number[]): boolean {
  if (!picked || !picked.length) return false;
  if (picked.length !== answer.length) return false;
  const a = [...picked].sort((x, y) => x - y);
  const b = [...answer].sort((x, y) => x - y);
  return a.every((v, i) => v === b[i]);
}

function lettersOf(picked: number[] | undefined): string {
  if (!picked || !picked.length) return '未作答';
  return [...picked]
    .sort((x, y) => x - y)
    .map((i) => LETTERS[i] ?? '?')
    .join('、');
}

function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function gradeOf(pct: number): { label: string; cls: string } {
  if (pct < 60) return { label: '需巩固', cls: 'badge warn' };
  if (pct < 80) return { label: '合格', cls: 'badge' };
  if (pct < 90) return { label: '良好', cls: 'badge accent' };
  return { label: '优秀', cls: 'badge ok' };
}

export function QuizPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const learning = useLearning();

  const [mode, setMode] = useState<Mode>('module');
  const [mixedCount, setMixedCount] = useState(20);
  const [paper, setPaper] = useState<QuizQuestion[]>([]);
  const [paperMeta, setPaperMeta] = useState<PaperMeta | null>(null);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<PaperResult | null>(null);

  const [expandedWrong, setExpandedWrong] = useState<Record<string, boolean>>({});
  const [redoOpen, setRedoOpen] = useState<Record<string, boolean>>({});
  const [redoAnswers, setRedoAnswers] = useState<Record<string, number[]>>({});
  const [redoChecked, setRedoChecked] = useState<Record<string, boolean>>({});

  const quizModules = useMemo(() => {
    const counts = new Map<string, number>();
    for (const q of questions) counts.set(q.moduleId, (counts.get(q.moduleId) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([id, count]) => {
        const meta = getModule(id);
        return {
          id,
          count,
          code: meta?.code ?? id.toUpperCase(),
          title: meta?.title ?? `模块 ${id.toUpperCase()}`,
        };
      });
  }, []);

  const paramModule = searchParams.get('module');
  const selectedModuleId =
    quizModules.find((m) => m.id === paramModule)?.id ?? quizModules[0]?.id ?? '';
  const selectedModule = quizModules.find((m) => m.id === selectedModuleId);

  const wrongEntries = useMemo(() => {
    const byId = new Map(questions.map((q) => [q.id, q]));
    return Object.entries(learning.wrongQuestions)
      .map(([id, rec]) => ({ id, rec, question: byId.get(id) }))
      .filter(
        (
          entry,
        ): entry is { id: string; rec: { count: number; lastAt: string }; question: QuizQuestion } =>
          Boolean(entry.question),
      )
      .sort((a, b) => b.rec.count - a.rec.count || b.rec.lastAt.localeCompare(a.rec.lastAt));
  }, [learning.wrongQuestions]);

  function resetCenter() {
    setPaper([]);
    setPaperMeta(null);
    setAnswers({});
    setIndex(0);
    setResult(null);
  }

  function startPaper(
    list: QuizQuestion[],
    meta: PaperMeta,
  ) {
    if (!list.length) {
      toast('当前范围暂无题目');
      return;
    }
    setPaper(list);
    setPaperMeta(meta);
    setAnswers({});
    setIndex(0);
    setResult(null);
  }

  function startModule(moduleId: string) {
    const info = quizModules.find((m) => m.id === moduleId);
    const list = getQuestionsByModule(moduleId);
    startPaper(list, {
      scope: `${info?.code ?? moduleId.toUpperCase()} ${info?.title ?? ''} 模块小测`.trim(),
      moduleId,
      retry: { kind: 'module', moduleId },
    });
  }

  function startMixed(count = mixedCount) {
    const size = Math.min(count, questions.length);
    const list = shuffle(questions).slice(0, size);
    startPaper(list, {
      scope: `随机综合卷（${size} 题）`,
      retry: { kind: 'mixed', count },
    });
  }

  function submitPaper() {
    if (!paper.length || !paperMeta) return;
    const wrongIds = paper.filter((q) => !sameAnswer(answers[q.id], q.answer)).map((q) => q.id);
    const correct = paper.length - wrongIds.length;

    if (wrongIds.length) addWrongQuestions(wrongIds);
    recordAttempt({
      scope: paperMeta.scope,
      total: paper.length,
      correct,
      ...(paperMeta.moduleId ? { moduleId: paperMeta.moduleId } : {}),
    });

    setResult({
      questions: paper,
      answers,
      correct,
      scope: paperMeta.scope,
      retry: paperMeta.retry,
    });
    setPaper([]);
    setIndex(0);
  }

  function choose(question: QuizQuestion, optionIndex: number) {
    setAnswers((prev) => {
      const current = prev[question.id] ?? [];
      if (question.type === 'multiple') {
        const next = current.includes(optionIndex)
          ? current.filter((i) => i !== optionIndex)
          : [...current, optionIndex].sort((a, b) => a - b);
        return { ...prev, [question.id]: next };
      }
      return { ...prev, [question.id]: [optionIndex] };
    });
  }

  function chooseRedo(question: QuizQuestion, optionIndex: number) {
    if (redoChecked[question.id]) return;
    setRedoAnswers((prev) => {
      const current = prev[question.id] ?? [];
      if (question.type === 'multiple') {
        const next = current.includes(optionIndex)
          ? current.filter((i) => i !== optionIndex)
          : [...current, optionIndex].sort((a, b) => a - b);
        return { ...prev, [question.id]: next };
      }
      return { ...prev, [question.id]: [optionIndex] };
    });
  }

  function checkRedo(question: QuizQuestion) {
    const picked = redoAnswers[question.id] ?? [];
    if (!picked.length) return;
    setRedoChecked((prev) => ({ ...prev, [question.id]: true }));
    if (sameAnswer(picked, question.answer)) {
      removeWrongQuestion(question.id);
      toast('回答正确，已移出错题本');
    }
  }

  function retryRedo(questionId: string) {
    setRedoAnswers((prev) => ({ ...prev, [questionId]: [] }));
    setRedoChecked((prev) => ({ ...prev, [questionId]: false }));
  }

  function onClearWrong() {
    if (!wrongEntries.length) return;
    if (window.confirm('确定清空错题本吗？此操作不可撤销。')) {
      clearWrongQuestions();
      toast('错题本已清空');
    }
  }

  /* ------------------------------ 结算页面 ------------------------------ */
  if (result) {
    const total = result.questions.length;
    const pct = total ? Math.round((result.correct / total) * 100) : 0;
    const grade = gradeOf(pct);

    const wrongLessons: string[] = [];
    for (const q of result.questions) {
      if (!sameAnswer(result.answers[q.id], q.answer) && q.lessonId && !wrongLessons.includes(q.lessonId)) {
        wrongLessons.push(q.lessonId);
      }
    }
    const suggestions = wrongLessons
      .map((id) => getLesson(id))
      .filter((l): l is Lesson => Boolean(l))
      .slice(0, 5);

    return (
      <div className="fade-up">
        <div className="breadcrumb">
          <Link to="/">首页</Link> <span>/</span>
          <span>测验中心</span> <span>/</span>
          <span>结算</span>
        </div>
        <h1 className="page-title">测验结算</h1>
        <p className="page-sub" style={{ marginBottom: 18 }}>{result.scope}</p>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="hstack" style={{ gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div className="tiny faint">得分</div>
              <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.1 }}>
                {pct}
                <span style={{ fontSize: 16, fontWeight: 600 }}>%</span>
              </div>
            </div>
            <div className="vstack" style={{ gap: 4 }}>
              <span className={grade.cls} style={{ alignSelf: 'flex-start' }}>
                {grade.label}
              </span>
              <span className="small muted">
                答对 {result.correct} 题 / 共 {total} 题
              </span>
              <span className="tiny faint">
                错误 {total - result.correct} 题已自动加入错题本
              </span>
            </div>
            <span className="spacer" />
            <div className="hstack">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (result.retry.kind === 'module') startModule(result.retry.moduleId);
                  else startMixed(result.retry.count);
                }}
              >
                <Icon name="reset" size={14} /> 再测一次
              </button>
              <button type="button" className="btn" onClick={resetCenter}>
                返回测验中心
              </button>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <ProgressBar value={total ? result.correct / total : 0} thin label="正确率" />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">
            <Icon name="target" size={15} /> 针对薄弱课时的学习建议
          </div>
          {suggestions.length ? (
            <div className="vstack" style={{ gap: 8, marginTop: 10 }}>
              {suggestions.map((lesson) => {
                const mod = getModule(lesson.moduleId);
                return (
                  <Link key={lesson.id} to={`/lesson/${lesson.id}`} className="lesson-row">
                    <span className="idx">{mod?.code ?? lesson.moduleId.toUpperCase()}</span>
                    <span>
                      <span className="title" style={{ display: 'block' }}>{lesson.title}</span>
                      <span className="sub">{lesson.summary}</span>
                    </span>
                    <span className="tail">
                      <span className="badge">回看课时</span>
                      <Icon name="next" size={14} />
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="card-desc" style={{ marginTop: 8 }}>
              {total - result.correct === 0
                ? '本次全部答对，暂无薄弱课时，可以继续挑战更高难度的综合卷。'
                : '本次错题暂未关联到具体课时，可以回到对应模块重新学习后再测。'}
            </p>
          )}
        </div>

        <div className="vstack" style={{ gap: 14 }}>
          {result.questions.map((q, qi) => {
            const picked = result.answers[q.id] ?? [];
            const right = sameAnswer(picked, q.answer);
            const mod = getModule(q.moduleId);
            return (
              <div
                className="quiz-card"
                key={q.id}
                style={right ? undefined : { borderColor: 'rgba(248, 113, 113, 0.35)' }}
              >
                <div className="hstack" style={{ marginBottom: 10 }}>
                  <span className="badge">{`第 ${qi + 1} 题`}</span>
                  <span className="badge accent">{typeLabel(q.type)}</span>
                  <span className="badge" data-depth={q.depth}>{q.depth}</span>
                  {mod ? <span className="badge">{mod.code}</span> : null}
                  <span className={`badge ${right ? 'ok' : 'warn'}`}>
                    {right ? '回答正确' : '回答错误'}
                  </span>
                </div>
                <div className="quiz-q">{q.question}</div>
                <div className="quiz-options">
                  {q.options.map((opt, oi) => {
                    const isAnswer = q.answer.includes(oi);
                    const isPicked = picked.includes(oi);
                    let cls = 'option';
                    if (isAnswer) cls += ' correct';
                    else if (isPicked) cls += ' wrong';
                    return (
                      <div key={oi} className={cls}>
                        <span className="mark">{isAnswer ? '✓' : LETTERS[oi]}</span>
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="hstack tiny" style={{ marginTop: 12, gap: 16 }}>
                  <span className={right ? 'muted' : 'faint'}>你的答案：{lettersOf(picked)}</span>
                  <span className="muted">正确答案：{lettersOf(q.answer)}</span>
                </div>
                <div className="quiz-explain">
                  <strong>解析：</strong>
                  {q.explanation}
                </div>
              </div>
            );
          })}
        </div>

        <div className="hstack" style={{ marginTop: 18 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (result.retry.kind === 'module') startModule(result.retry.moduleId);
              else startMixed(result.retry.count);
            }}
          >
            <Icon name="reset" size={14} /> 再测一次
          </button>
          <button type="button" className="btn" onClick={resetCenter}>
            返回测验中心
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------ 答题页面 ------------------------------ */
  if (paper.length && paperMeta) {
    const q = paper[index];
    const picked = answers[q.id] ?? [];
    const answeredCount = paper.filter((item) => (answers[item.id]?.length ?? 0) > 0).length;
    const isLast = index === paper.length - 1;

    return (
      <div className="fade-up">
        <div className="breadcrumb">
          <Link to="/">首页</Link> <span>/</span>
          <span>测验中心</span> <span>/</span>
          <span>{paperMeta.scope}</span>
        </div>
        <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>{paperMeta.scope}</h1>
            <p className="page-sub">
              已答 {answeredCount} / {paper.length} 题 · 选择后不立即判定，交卷后统一评分
            </p>
          </div>
          <button type="button" className="btn btn-sm" onClick={resetCenter}>
            <Icon name="close" size={13} /> 退出
          </button>
        </div>

        <ProgressBar value={answeredCount / paper.length} thin label="答题进度" />

        <div className="quiz-card" style={{ marginTop: 14 }}>
          <div className="hstack" style={{ marginBottom: 10 }}>
            <span className="badge accent">{`第 ${index + 1} / ${paper.length} 题`}</span>
            <span className="badge">{typeLabel(q.type)}</span>
            <span className="badge" data-depth={q.depth}>{q.depth}</span>
            {q.type === 'multiple' ? <span className="tiny faint">多选题需全部选对</span> : null}
          </div>
          <div className="quiz-q">{q.question}</div>
          <div className="quiz-options">
            {q.options.map((opt, oi) => {
              const isPicked = picked.includes(oi);
              return (
                <button
                  key={oi}
                  type="button"
                  className={`option${isPicked ? ' selected' : ''}`}
                  onClick={() => choose(q, oi)}
                  aria-pressed={isPicked}
                >
                  <span className="mark">{LETTERS[oi]}</span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <div className="hstack" style={{ marginBottom: 10 }}>
            <span className="card-title" style={{ fontSize: 14 }}>答题卡</span>
            <span className="tiny faint">已答 {answeredCount} · 未答 {paper.length - answeredCount}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {paper.map((item, qi) => {
              const answered = (answers[item.id]?.length ?? 0) > 0;
              const current = qi === index;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`btn btn-sm${current ? ' btn-primary' : ''}`}
                  onClick={() => setIndex(qi)}
                  aria-label={`第 ${qi + 1} 题，${answered ? '已作答' : '未作答'}`}
                  aria-current={current ? 'step' : undefined}
                  style={
                    !current && answered
                      ? { borderColor: 'rgba(74, 222, 128, 0.45)', background: 'var(--ok-soft)' }
                      : undefined
                  }
                >
                  {qi + 1}
                </button>
              );
            })}
          </div>
          <div className="hstack tiny faint" style={{ marginTop: 8, gap: 12 }}>
            <span>绿色：已答</span>
            <span>默认：未答</span>
            <span>高亮：当前题</span>
          </div>
        </div>

        <div className="hstack" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            <Icon name="prev" size={13} /> 上一题
          </button>
          <span className="spacer" />
          {answeredCount < paper.length ? (
            <span className="tiny faint">还有 {paper.length - answeredCount} 题未作答</span>
          ) : null}
          {isLast ? (
            <button type="button" className="btn btn-primary" onClick={submitPaper}>
              <Icon name="check" size={14} /> 交卷
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIndex((i) => Math.min(paper.length - 1, i + 1))}
            >
              下一题 <Icon name="next" size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ------------------------------ 测验中心 ------------------------------ */
  return (
    <div className="fade-up">
      <h1 className="page-title">测验中心</h1>
      <p className="page-sub" style={{ marginBottom: 18 }}>
        按模块小测或随机综合卷检验掌握程度，答错的题会自动进入错题本。
      </p>

      <Tabs<Mode>
        items={[
          { value: 'module', label: '模块小测' },
          { value: 'mixed', label: '综合卷' },
          { value: 'wrong', label: `错题本${wrongEntries.length ? ` (${wrongEntries.length})` : ''}` },
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          resetCenter();
        }}
      />

      {mode === 'module' ? (
        <div style={{ marginTop: 16 }}>
          {quizModules.length ? (
            <>
              <div className="hstack tiny faint" style={{ marginBottom: 10 }}>
                <span>共 {quizModules.length} 个模块 · {questions.length} 道题</span>
                <span>点击卡片选择模块，或直接开始对应小测</span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                  gap: 12,
                }}
              >
                {quizModules.map((m) => {
                  const active = m.id === selectedModuleId;
                  const best = learning.moduleBest[m.id];
                  return (
                    <div
                      key={m.id}
                      className="card hoverable"
                      onClick={() => setSearchParams({ module: m.id })}
                      style={{
                        cursor: 'pointer',
                        borderColor: active ? 'var(--accent)' : undefined,
                      }}
                    >
                      <div className="hstack" style={{ justifyContent: 'space-between' }}>
                        <span className="badge accent">{m.code}</span>
                        <span className="tiny faint">{m.count} 题</span>
                      </div>
                      <div className="card-title" style={{ marginTop: 10 }}>{m.title}</div>
                      <div className="card-desc">
                        {best !== undefined ? `历史最好成绩 ${Math.round(best * 100)}%` : '尚未测试'}
                      </div>
                      <button
                        type="button"
                        className={`btn btn-sm${active ? ' btn-primary' : ''}`}
                        style={{ marginTop: 12 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchParams({ module: m.id });
                          startModule(m.id);
                        }}
                      >
                        <Icon name="play" size={12} /> 开始 {m.count} 题
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState title="题库尚未加载" hint="请确认 src/data/quizzes 下的题库文件存在" />
          )}
        </div>
      ) : null}

      {mode === 'mixed' ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">
            <Icon name="layers" size={15} /> 随机综合卷
          </div>
          <p className="card-desc">
            从全部 {questions.length} 道题中随机抽取，覆盖所有模块与考点，适合阶段性自测。
          </p>
          <div className="hstack" style={{ marginTop: 12 }}>
            <span className="tiny faint">抽题数量</span>
            {[10, 20, 30].map((n) => (
              <button
                key={n}
                type="button"
                className={`chip${mixedCount === n ? ' active' : ''}`}
                onClick={() => setMixedCount(n)}
                aria-pressed={mixedCount === n}
              >
                {n} 题
              </button>
            ))}
          </div>
          <div className="hstack" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => startMixed()}
              disabled={!questions.length}
            >
              <Icon name="play" size={13} /> 开始 {Math.min(mixedCount, questions.length)} 题
            </button>
            <span className="tiny faint">每次抽题顺序和题目均随机</span>
          </div>
        </div>
      ) : null}

      {mode === 'wrong' ? (
        <div style={{ marginTop: 16 }}>
          {wrongEntries.length ? (
            <>
              <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="tiny faint">
                  共 {wrongEntries.length} 道错题，按错误次数排序
                </span>
                <button type="button" className="btn btn-sm btn-danger" onClick={onClearWrong}>
                  <Icon name="trash" size={13} /> 清空错题本
                </button>
              </div>
              <div className="vstack" style={{ gap: 12 }}>
                {wrongEntries.map(({ id, rec, question }, wi) => {
                  const mod = getModule(question.moduleId);
                  const expanded = Boolean(expandedWrong[id]);
                  const open = Boolean(redoOpen[id]);
                  const chosen = redoAnswers[id] ?? [];
                  const checked = Boolean(redoChecked[id]);
                  const right = sameAnswer(chosen, question.answer);
                  return (
                    <div className="quiz-card" key={id}>
                      <div className="hstack" style={{ marginBottom: 10 }}>
                        <span className="badge">{`第 ${wi + 1} 题`}</span>
                        <span className="badge accent">{typeLabel(question.type)}</span>
                        <span className="badge warn">错 {rec.count} 次</span>
                        {mod ? <span className="badge">{mod.code}</span> : null}
                      </div>
                      <div className="quiz-q">{question.question}</div>

                      {open ? (
                        <>
                          <div className="quiz-options">
                            {question.options.map((opt, oi) => {
                              const isAnswer = question.answer.includes(oi);
                              const isPicked = chosen.includes(oi);
                              let cls = 'option';
                              if (checked && isAnswer) cls += ' correct';
                              else if (checked && isPicked) cls += ' wrong';
                              else if (isPicked) cls += ' selected';
                              return (
                                <button
                                  key={oi}
                                  type="button"
                                  className={cls}
                                  onClick={() => chooseRedo(question, oi)}
                                  aria-pressed={isPicked}
                                >
                                  <span className="mark">{checked && isAnswer ? '✓' : LETTERS[oi]}</span>
                                  <span>{opt}</span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="hstack" style={{ marginTop: 12 }}>
                            {!checked ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                disabled={!chosen.length}
                                onClick={() => checkRedo(question)}
                              >
                                提交重做
                              </button>
                            ) : (
                              <span className={`badge ${right ? 'ok' : 'warn'}`}>
                                {right ? '回答正确，已移出错题本' : '仍答错，已保留在错题本'}
                              </span>
                            )}
                            {checked && !right ? (
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => retryRedo(id)}
                              >
                                重新作答
                              </button>
                            ) : null}
                          </div>
                        </>
                      ) : null}

                      <div className="hstack" style={{ marginTop: 12 }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => setRedoOpen((prev) => ({ ...prev, [id]: !open }))}
                          aria-expanded={open}
                        >
                          <Icon name="reset" size={12} /> {open ? '收起重做' : '重做本题'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => setExpandedWrong((prev) => ({ ...prev, [id]: !expanded }))}
                          aria-expanded={expanded}
                        >
                          <Icon name="book" size={12} /> {expanded ? '收起解析' : '展开解析'}
                        </button>
                      </div>

                      {expanded ? (
                        <div className="quiz-explain">
                          <strong>解析：</strong>
                          {question.explanation}
                          <div className="tiny" style={{ marginTop: 6 }}>
                            正确答案：{lettersOf(question.answer)}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState
              title="错题本是空的"
              hint="完成模块小测或综合卷后，答错的题会自动收录到这里"
            />
          )}
        </div>
      ) : null}

      {mode === 'module' && selectedModule ? (
        <p className="tiny faint" style={{ marginTop: 12 }}>
          当前选中：{selectedModule.code} {selectedModule.title} · {selectedModule.count} 题
        </p>
      ) : null}
    </div>
  );
}
