import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLesson, getModule } from '@/data/curriculum';
import type { Lesson } from '@/types';
import {
  isLessonCompleted,
  setNote,
  toggleBookmark,
  useLearning,
} from '@/store/learningStore';
import { DepthBadge, EmptyState, Icon, toast } from '@/components/ui';

type LibraryTab = 'bookmarks' | 'notes';

const NOTE_PREVIEW_LENGTH = 160;

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const hh = `${date.getHours()}`.padStart(2, '0');
  const mm = `${date.getMinutes()}`.padStart(2, '0');
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return `今天 ${hh}:${mm}`;
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day} ${hh}:${mm}`;
}

interface NoteEntry {
  lesson: Lesson;
  text: string;
  updatedAt: string;
}

export function LibraryPage() {
  const learning = useLearning();
  const [tab, setTab] = useState<LibraryTab>('bookmarks');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const bookmarked = useMemo(
    () =>
      learning.bookmarks
        .map((id) => getLesson(id))
        .filter((lesson): lesson is Lesson => Boolean(lesson)),
    [learning.bookmarks],
  );

  const notes = useMemo<NoteEntry[]>(
    () =>
      Object.entries(learning.notes)
        .map(([lessonId, note]) => ({ lesson: getLesson(lessonId), text: note.text, updatedAt: note.updatedAt }))
        .filter((entry): entry is NoteEntry => Boolean(entry.lesson))
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0)),
    [learning.notes],
  );

  const startEdit = (entry: NoteEntry) => {
    setEditingId(entry.lesson.id);
    setDraft(entry.text);
  };

  const saveNote = (lessonId: string, text: string) => {
    setNote(lessonId, text);
    setEditingId(null);
    toast(text.trim() ? '笔记已保存' : '空笔记已移除');
  };

  const deleteNote = (lessonId: string) => {
    setNote(lessonId, '');
    if (editingId === lessonId) setEditingId(null);
    toast('笔记已删除');
  };

  const tabs: { value: LibraryTab; label: string; count: number }[] = [
    { value: 'bookmarks', label: '我的收藏', count: bookmarked.length },
    { value: 'notes', label: '我的笔记', count: notes.length },
  ];

  return (
    <div className="fade-up">
      <h1 className="page-title">收藏与笔记</h1>
      <p className="page-sub" style={{ marginBottom: 18 }}>
        集中管理收藏的课时和本机笔记，数据只保存在当前浏览器。
      </p>

      <div style={{ marginBottom: 18, maxWidth: '100%', overflowX: 'auto' }}>
        <div className="tabs" role="tablist">
          {tabs.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={tab === item.value}
              className={`tab${tab === item.value ? ' active' : ''}`}
              onClick={() => setTab(item.value)}
            >
              {item.label}
              <span className="badge" style={{ marginLeft: 6, padding: '0 7px', fontSize: 10 }}>
                {item.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {tab === 'bookmarks' ? (
        bookmarked.length === 0 ? (
          <EmptyState
            title="还没有收藏的课时"
            hint="在课时页点击「收藏本课」，就能在这里快速回顾。"
          />
        ) : (
          <div className="vstack" style={{ gap: 10 }}>
            {bookmarked.map((lesson) => {
              const module = getModule(lesson.moduleId);
              const done = isLessonCompleted(lesson.id) || Boolean(learning.completedLessons[lesson.id]);
              return (
                <div key={lesson.id} className="card" style={{ padding: '14px 16px' }}>
                  <div className="hstack" style={{ gap: 8 }}>
                    {module ? <span className="badge accent">{module.code}</span> : null}
                    <Link
                      to={`/lesson/${lesson.id}`}
                      style={{ fontSize: 15, fontWeight: 620, minWidth: 0, wordBreak: 'break-word' }}
                    >
                      {lesson.title}
                    </Link>
                    <span className="spacer" />
                    {done ? <span className="badge ok">已完成</span> : <span className="badge">未完成</span>}
                  </div>
                  <div className="hstack" style={{ gap: 8, marginTop: 8 }}>
                    <span className="tiny faint">
                      {module ? `${module.code} ${module.title}` : lesson.moduleId}
                    </span>
                    <DepthBadge depth={lesson.depth} />
                    <span className="tiny faint">{lesson.minutes} 分钟</span>
                    <span className="spacer" />
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        toggleBookmark(lesson.id);
                        toast('已取消收藏');
                      }}
                    >
                      <Icon name="bookmark" size={13} /> 取消收藏
                    </button>
                  </div>
                  <div className="small muted" style={{ marginTop: 8, lineHeight: 1.65 }}>
                    {lesson.summary}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : notes.length === 0 ? (
        <EmptyState
          title="还没有写笔记"
          hint="学习任意课时时，在「我的笔记」区域记录想法，这里会自动汇总。"
        />
      ) : (
        <div className="vstack" style={{ gap: 10 }}>
          {notes.map((entry) => {
            const { lesson, text, updatedAt } = entry;
            const module = getModule(lesson.moduleId);
            const isLong = text.length > NOTE_PREVIEW_LENGTH;
            const isOpen = Boolean(expanded[lesson.id]);
            const shown = isLong && !isOpen ? `${text.slice(0, NOTE_PREVIEW_LENGTH)}…` : text;
            return (
              <div key={lesson.id} className="card" style={{ padding: '14px 16px' }}>
                <div className="hstack" style={{ gap: 8 }}>
                  {module ? <span className="badge accent">{module.code}</span> : null}
                  <Link
                    to={`/lesson/${lesson.id}`}
                    style={{ fontSize: 14.5, fontWeight: 620, minWidth: 0, wordBreak: 'break-word' }}
                  >
                    {lesson.title}
                  </Link>
                  <span className="spacer" />
                  <span className="tiny faint">{formatTime(updatedAt)}</span>
                </div>
                <div className="tiny faint" style={{ marginTop: 4 }}>
                  {module ? `${module.code} ${module.title}` : lesson.moduleId}
                </div>

                {editingId === lesson.id ? (
                  <>
                    <textarea
                      value={draft}
                      autoFocus
                      rows={5}
                      aria-label={`编辑「${lesson.title}」的笔记`}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => saveNote(lesson.id, draft)}
                      style={{
                        width: '100%',
                        marginTop: 10,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                        color: 'var(--text)',
                        fontFamily: 'inherit',
                        fontSize: 13.5,
                        lineHeight: 1.7,
                        resize: 'vertical',
                      }}
                    />
                    <div className="hstack" style={{ marginTop: 8, justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setEditingId(null)}
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => saveNote(lesson.id, draft)}
                      >
                        保存
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="small muted" style={{ marginTop: 8, lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {shown}
                    </div>
                    <div className="hstack" style={{ marginTop: 10, gap: 8 }}>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => startEdit(entry)}>
                        <Icon name="note" size={13} /> 编辑
                      </button>
                      {isLong ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() =>
                            setExpanded((prev) => ({ ...prev, [lesson.id]: !prev[lesson.id] }))
                          }
                        >
                          {isOpen ? '收起' : '展开'}
                        </button>
                      ) : null}
                      <Link to={`/lesson/${lesson.id}`} className="btn btn-sm btn-ghost">
                        去课时 <Icon name="arrowRight" size={13} />
                      </Link>
                      <span className="spacer" />
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteNote(lesson.id)}
                      >
                        <Icon name="trash" size={13} /> 删除
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
