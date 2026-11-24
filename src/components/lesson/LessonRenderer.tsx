import { useMemo, useState } from 'react';
import type { Lesson, QuizQuestion } from '@/types';
import { resolveLessonQuiz } from '@/data/curriculum';
import { InteractiveBlock } from '@/components/interactive/registry';
import { GlossaryText } from '@/components/glossary/GlossaryText';
import { addWrongQuestions } from '@/store/learningStore';
import { CopyButton, EmptyState, Icon } from '@/components/ui';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function InlineQuiz({
  questions,
  title = '本课自测',
}: {
  questions: QuizQuestion[];
  title?: string;
}) {
  if (!questions.length) {
    return <EmptyState title="本课暂无配套自测题" hint="可以先复习正文，再回到模块页做小测" />;
  }
  return (
    <div className="vstack" style={{ gap: 14 }}>
      {title ? (
        <div className="hstack">
          <Icon name="quiz" size={16} className="muted" />
          <strong style={{ fontSize: 15 }}>{title}</strong>
          <span className="badge">{questions.length} 题</span>
        </div>
      ) : null}
      {questions.map((q) => (
        <QuizItem key={q.id} question={q} />
      ))}
    </div>
  );
}

export function QuizItem({ question, index }: { question: QuizQuestion; index?: number }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const multi = question.type === 'multiple';
  const isRight = useMemo(
    () =>
      selected.length === question.answer.length &&
      selected.every((i) => question.answer.includes(i)),
    [selected, question.answer],
  );

  const toggle = (i: number) => {
    if (submitted) return;
    if (multi) {
      setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
    } else {
      setSelected([i]);
    }
  };

  const submit = () => {
    if (!selected.length) return;
    setSubmitted(true);
    if (!isRight) addWrongQuestions([question.id]);
  };

  return (
    <div className="quiz-card">
      <div className="hstack" style={{ marginBottom: 10 }}>
        <span className="badge accent">
          {question.type === 'single' ? '单选' : question.type === 'multiple' ? '多选' : '判断'}
        </span>
        <span className="badge" data-depth={question.depth}>{question.depth}</span>
        {index !== undefined ? <span className="tiny faint">第 {index + 1} 题</span> : null}
      </div>
      <div className="quiz-q"><GlossaryText text={question.question} /></div>
      <div className="quiz-options">
        {question.options.map((opt, i) => {
          const isAnswer = question.answer.includes(i);
          const isPicked = selected.includes(i);
          let cls = 'option';
          if (submitted && isAnswer) cls += ' correct';
          else if (submitted && isPicked && !isAnswer) cls += ' wrong';
          else if (isPicked) cls += ' selected';
          return (
            <button key={i} type="button" className={cls} onClick={() => toggle(i)} aria-pressed={isPicked}>
              <span className="mark">{submitted && isAnswer ? '✓' : OPTION_LETTERS[i]}</span>
              <span><GlossaryText text={opt} /></span>
            </button>
          );
        })}
      </div>
      <div className="hstack" style={{ marginTop: 12 }}>
        {!submitted ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={!selected.length}>
            提交答案
          </button>
        ) : (
          <span className={`badge ${isRight ? 'ok' : 'warn'}`}>
            {isRight ? '回答正确' : '回答错误，已加入错题本'}
          </span>
        )}
        <span className="tiny faint">
          {multi ? '多选题需全部选对才计为正确' : '选择后点击提交查看解析'}
        </span>
      </div>
      {submitted ? (
        <div className="quiz-explain">
          <strong>解析：</strong>
          <GlossaryText text={question.explanation} />
        </div>
      ) : null}
    </div>
  );
}

function CodeBlock({ code, title, lang }: { code: string; title?: string; lang?: string }) {
  return (
    <div className="code-block">
      <div className="code-head">
        <span>{title ?? '配置示例'}</span>
        <span className="spacer" />
        {lang ? <span className="lang">{lang}</span> : null}
        <CopyButton text={code} small />
      </div>
      <pre className="code-body">{code}</pre>
    </div>
  );
}

function OutputBlock({ text, title }: { text: string; title?: string }) {
  return (
    <div className="code-block output-block">
      <div className="code-head">
        <span>{title ?? '命令回显'}</span>
        <span className="spacer" />
        <span className="lang">output</span>
      </div>
      <pre className="code-body">{text}</pre>
    </div>
  );
}

export function LessonRenderer({ lesson }: { lesson: Lesson }) {
  return (
    <div className="lesson-body">
      {lesson.objectives.length ? (
        <div className="lesson-objectives">
          <h4>学完你能做到</h4>
          <ul>
            {lesson.objectives.map((o) => (
              <li key={o}>
                <GlossaryText text={o} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {lesson.blocks.map((block, i) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <p key={i}>
                <GlossaryText text={block.text} />
              </p>
            );
          case 'heading': {
            const Tag = (`h${block.level ?? 3}` as unknown) as 'h3';
            return <Tag key={i}>{block.text}</Tag>;
          }
          case 'list': {
            const Tag = block.ordered ? 'ol' : 'ul';
            return (
              <div key={i}>
                {block.title ? <h4>{block.title}</h4> : null}
                <Tag>
                  {block.items.map((it, j) => (
                    <li key={j}>
                      <GlossaryText text={it} />
                    </li>
                  ))}
                </Tag>
              </div>
            );
          }
          case 'analogy':
            return (
              <div key={i} className="block-analogy">
                <div className="block-label">
                  <Icon name="bolt" size={13} /> {block.title ?? '打个比方'}
                </div>
                <div><GlossaryText text={block.text} /></div>
              </div>
            );
          case 'warning':
            return (
              <div key={i} className="block-warning">
                <div className="block-label">
                  <Icon name="target" size={13} /> {block.title ?? '易错点'}
                </div>
                <div><GlossaryText text={block.text} /></div>
              </div>
            );
          case 'tip':
            return (
              <div key={i} className="block-tip">
                <div className="block-label">
                  <Icon name="check" size={13} /> {block.title ?? '排错小贴士'}
                </div>
                <div><GlossaryText text={block.text} /></div>
              </div>
            );
          case 'code':
            return <CodeBlock key={i} code={block.code} title={block.title} lang={block.lang} />;
          case 'output':
            return <OutputBlock key={i} text={block.text} title={block.title} />;
          case 'table':
            return (
              <div key={i}>
                {block.title ? <h4>{block.title}</h4> : null}
                <div className="block-table">
                  <table>
                    <thead>
                      <tr>
                        {block.columns.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, r) => (
                        <tr key={r}>
                          {row.map((cell, c) => (
                            <td key={c}><GlossaryText text={cell} /></td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          case 'interactive':
            return <InteractiveBlock key={i} interactiveKey={block.key} caption={block.caption} />;
          case 'quiz': {
            const qs = resolveLessonQuiz(lesson, block.ids);
            return <InlineQuiz key={i} questions={qs} title={block.title} />;
          }
          case 'steps':
            return (
              <div key={i}>
                {block.title ? <h4>{block.title}</h4> : null}
                <div className="block-steps">
                  {block.items.map((s, j) => (
                    <div className="step-item" key={j}>
                      <span className="num">{j + 1}</span>
                      <div>
                        <div className="t">{s.title}</div>
                        <div className="d"><GlossaryText text={s.text} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          case 'kv':
            return (
              <div key={i} className="block-kv">
                {block.items.map((it, j) => (
                  <div className="kv-item" key={j}>
                    <div className="k">{it.label}</div>
                    <div className="v"><GlossaryText text={it.value} /></div>
                  </div>
                ))}
              </div>
            );
          case 'checklist':
            return (
              <div key={i} className="block-checklist">
                {block.title ? <div className="block-label muted">{block.title}</div> : null}
                {block.items.map((it, j) => (
                  <div className="item" key={j}>
                    <GlossaryText text={it} />
                  </div>
                ))}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
