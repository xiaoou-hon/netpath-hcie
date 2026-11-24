import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getLesson, getModule, searchAll } from '@/data/curriculum';
import type { SearchHit } from '@/data/curriculum';
import type { Lesson } from '@/types';
import { useLearning } from '@/store/learningStore';
import { DepthBadge, EmptyState, Icon } from '@/components/ui';

const SUGGESTIONS = ['display ospf peer', '子网划分', 'BGP 选路', 'CAPWAP', 'IPsec', 'VXLAN'];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 按空格拆分的关键词高亮；大小写不敏感，返回 React 节点而非注入 HTML */
function highlight(text: string, tokens: string[]): ReactNode {
  const valid = tokens.filter(Boolean);
  if (!valid.length || !text) return text;
  const pattern = valid
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  if (!pattern) return text;
  const parts = text.split(new RegExp(`(${pattern})`, 'gi'));
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark
        key={index}
        style={{
          background: 'var(--accent-soft)',
          color: 'var(--accent)',
          padding: '0 2px',
          borderRadius: 3,
        }}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return sameDay ? '今天' : `${mm}-${dd}`;
}

function ResultRow({ hit, tokens }: { hit: SearchHit; tokens: string[] }) {
  const module = getModule(hit.moduleId);
  const to = hit.kind === 'module' ? `/module/${hit.id}` : `/lesson/${hit.id}`;
  return (
    <Link to={to} className="card card-link hoverable" style={{ padding: '13px 15px' }}>
      <div className="hstack" style={{ gap: 8, alignItems: 'baseline' }}>
        {module ? <span className="badge accent">{module.code}</span> : null}
        <span style={{ fontWeight: 620, fontSize: 14.5, minWidth: 0 }}>{highlight(hit.title, tokens)}</span>
        <span className="spacer" />
        <Icon name="arrowRight" size={13} className="muted" />
      </div>
      <div className="tiny faint" style={{ marginTop: 4 }}>
        {hit.kind === 'module' ? '模块' : `所属模块：${hit.moduleTitle}`}
      </div>
      <div className="small muted" style={{ marginTop: 6, lineHeight: 1.7, wordBreak: 'break-word' }}>
        {highlight(hit.snippet, tokens)}
      </div>
    </Link>
  );
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const learning = useLearning();

  const activeQuery = query.trim();
  const tokens = useMemo(
    () => activeQuery.toLowerCase().split(/\s+/).filter(Boolean),
    [activeQuery],
  );
  const hits = useMemo(() => searchAll(activeQuery), [activeQuery]);
  const moduleHits = hits.filter((hit) => hit.kind === 'module');
  const lessonHits = hits.filter((hit) => hit.kind === 'lesson');

  const recentDone = useMemo(() => {
    return Object.entries(learning.completedLessons)
      .sort((a, b) => (a[1].at < b[1].at ? 1 : a[1].at > b[1].at ? -1 : 0))
      .slice(0, 5)
      .map(([id]) => ({ lesson: getLesson(id), at: learning.completedLessons[id]?.at ?? '' }))
      .filter((item): item is { lesson: Lesson; at: string } => Boolean(item.lesson));
  }, [learning.completedLessons]);

  const applyQuery = (value: string) => {
    setQuery(value);
    setSearchParams(value.trim() ? { q: value } : {}, { replace: true });
    inputRef.current?.focus();
  };

  const onChange = (value: string) => {
    setQuery(value);
    setSearchParams(value.trim() ? { q: value } : {}, { replace: true });
  };

  return (
    <div className="fade-up">
      <h1 className="page-title">全局搜索</h1>
      <p className="page-sub" style={{ marginBottom: 18 }}>
        搜索模块、课时、命令与知识点，输入即搜。
      </p>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <span
          style={{
            position: 'absolute',
            left: 15,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            color: focused ? 'var(--accent)' : 'var(--text-faint)',
            pointerEvents: 'none',
          }}
        >
          <Icon name="search" size={18} />
        </span>
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              applyQuery('');
            }
          }}
          placeholder="搜索命令、术语或知识点…（例如：OSPF 邻居、display bgp peer）"
          aria-label="全局搜索"
          style={{
            width: '100%',
            padding: '15px 46px 15px 46px',
            borderRadius: 14,
            border: `1px solid ${focused ? 'var(--accent)' : 'var(--border-strong)'}`,
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: 15.5,
            fontFamily: 'inherit',
            outline: 'none',
            boxShadow: focused ? 'var(--shadow-soft)' : 'none',
            transition: 'border-color var(--dur), box-shadow var(--dur)',
          }}
        />
        {query ? (
          <button
            type="button"
            className="icon-btn"
            aria-label="清空搜索"
            onClick={() => applyQuery('')}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 30,
              height: 30,
              border: 'none',
              background: 'transparent',
            }}
          >
            <Icon name="close" size={15} />
          </button>
        ) : null}
      </div>

      {!activeQuery ? (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">
              <Icon name="bolt" size={15} /> 热门搜索
            </div>
            <div className="hstack" style={{ gap: 8, marginTop: 12 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chip"
                  style={{ cursor: 'pointer' }}
                  onClick={() => applyQuery(s)}
                >
                  <Icon name="search" size={12} />
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              <Icon name="check" size={15} /> 最近完成
              <span className="spacer" />
              <span className="tiny faint">最近 5 条</span>
            </div>
            {recentDone.length ? (
              <div className="vstack" style={{ gap: 2, marginTop: 8 }}>
                {recentDone.map(({ lesson, at }) => {
                  const module = getModule(lesson.moduleId);
                  return (
                    <Link key={lesson.id} to={`/lesson/${lesson.id}`} className="lesson-row">
                      <span className="check-dot done">✓</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <div className="title">{lesson.title}</div>
                        <div className="sub">
                          {module ? `${module.code} ${module.title}` : lesson.moduleId}
                          {at ? ` · ${formatDay(at)}完成` : ''}
                        </div>
                      </span>
                      <span className="tail">
                        <DepthBadge depth={lesson.depth} />
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="small faint" style={{ marginTop: 10 }}>
                还没有完成记录；完成一节课后，会在这里快速回到它。
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div
            className="hstack"
            style={{ marginBottom: 12, justifyContent: 'space-between', gap: 8 }}
          >
            <span className="small muted">
              共 <strong>{hits.length}</strong> 条结果
              {hits.length ? `（模块 ${moduleHits.length} · 课时 ${lessonHits.length}）` : ''}
            </span>
            <span className="tiny faint">Esc 清空</span>
          </div>

          {hits.length === 0 ? (
            <>
              <EmptyState
                title="没有找到相关内容"
                hint={`换个关键词试试，例如「${SUGGESTIONS.slice(0, 3).join('」「')}」`}
              />
              <div className="hstack" style={{ gap: 8, marginTop: 14, justifyContent: 'center' }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip"
                    style={{ cursor: 'pointer' }}
                    onClick={() => applyQuery(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {moduleHits.length ? (
                <section style={{ marginBottom: 20 }}>
                  <div className="hstack" style={{ gap: 8, marginBottom: 8 }}>
                    <Icon name="layers" size={15} className="muted" />
                    <h2 style={{ fontSize: 15, fontWeight: 700 }}>模块</h2>
                    <span className="badge">{moduleHits.length}</span>
                  </div>
                  <div className="vstack" style={{ gap: 8 }}>
                    {moduleHits.map((hit) => (
                      <ResultRow key={hit.id} hit={hit} tokens={tokens} />
                    ))}
                  </div>
                </section>
              ) : null}

              {lessonHits.length ? (
                <section>
                  <div className="hstack" style={{ gap: 8, marginBottom: 8 }}>
                    <Icon name="book" size={15} className="muted" />
                    <h2 style={{ fontSize: 15, fontWeight: 700 }}>课时</h2>
                    <span className="badge">{lessonHits.length}</span>
                  </div>
                  <div className="vstack" style={{ gap: 8 }}>
                    {lessonHits.map((hit) => (
                      <ResultRow key={hit.id} hit={hit} tokens={tokens} />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
