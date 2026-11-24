import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getLesson, getLessonNeighbors, getModule, getQuestionsByLesson } from '@/data/curriculum';
import { stageById } from '@/data/stages';
import {
  moduleProgress,
  setLessonCompleted,
  setNote,
  toggleBookmark,
  useLearning,
} from '@/store/learningStore';
import { LessonRenderer } from '@/components/lesson/LessonRenderer';
import { DepthBadge, EmptyState, Icon, ProgressBar, toast } from '@/components/ui';

export function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const lesson = getLesson(lessonId);
  const learning = useLearning();
  const [note, setNoteDraft] = useState('');

  const module = lesson ? getModule(lesson.moduleId) : undefined;
  const neighbors = lesson ? getLessonNeighbors(lesson.id) : {};

  useEffect(() => {
    setNoteDraft(lesson ? learning.notes[lesson.id]?.text ?? '' : '');
    // 仅在切换课时时同步草稿
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id]);

  if (!lesson || !module) {
    return <EmptyState title="课时不存在" hint="可能链接有误，请从课程模块重新进入" />;
  }

  const done = Boolean(learning.completedLessons[lesson.id]);
  const bookmarked = learning.bookmarks.includes(lesson.id);
  const progress = moduleProgress(module.id);
  const stage = stageById.get(module.stage);
  const quizCount = getQuestionsByLesson(lesson.id).length;

  const onNoteChange = (text: string) => {
    setNoteDraft(text);
    setNote(lesson.id, text);
  };

  return (
    <div className="fade-up">
      <div className="breadcrumb">
        <Link to="/">首页</Link> <span>/</span>
        <Link to="/path">成长路径</Link> <span>/</span>
        <Link to={`/module/${module.id}`}>{module.code} {module.title}</Link> <span>/</span>
        <span>课时</span>
      </div>

      <div className="lesson-layout">
        <article>
          <div className="hstack" style={{ gap: 8, marginBottom: 10 }}>
            <span className="badge accent">{module.code}</span>
            <DepthBadge depth={lesson.depth} />
            {stage ? <span className="badge">{stage.id}</span> : null}
            <span className="badge">{lesson.minutes} 分钟</span>
            {done ? <span className="badge ok">已完成</span> : null}
          </div>
          <h1 className="lesson-title">{lesson.title}</h1>
          <p className="page-sub" style={{ marginTop: 8 }}>{lesson.summary}</p>

          <LessonRenderer lesson={lesson} />

          <div className="divider" />

          <div className="hstack" style={{ justifyContent: 'space-between' }}>
            <button
              type="button"
              className={`btn ${done ? '' : 'btn-primary'}`}
              onClick={() => {
                setLessonCompleted(lesson.id, !done);
                toast(done ? '已取消完成标记' : '已完成本课，进度已更新');
              }}
            >
              <Icon name="check" size={15} />
              {done ? '取消完成' : '标记本课完成'}
            </button>
            <div className="hstack">
              {neighbors.prev ? (
                <Link to={`/lesson/${neighbors.prev.id}`} className="btn btn-sm">
                  <Icon name="prev" size={13} /> 上一课
                </Link>
              ) : null}
              {neighbors.next ? (
                <Link to={`/lesson/${neighbors.next.id}`} className="btn btn-sm btn-primary">
                  下一课 <Icon name="next" size={13} />
                </Link>
              ) : null}
            </div>
          </div>

          <div className="card" style={{ marginTop: 18 }}>
            <div className="hstack">
              <Icon name="note" size={15} className="muted" />
              <span className="card-title">我的笔记</span>
              <span className="spacer" />
              <span className="tiny faint">自动保存到本机</span>
            </div>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="写下你的理解、命令速记或待查问题…（例如：OSPF 邻居卡在 ExStart 通常是 MTU 不一致）"
              rows={5}
              aria-label="课时笔记"
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
          </div>
        </article>

        <aside className="lesson-aside">
          <div className="card">
            <div className="card-title"><Icon name="map" size={15} /> 模块进度</div>
            <div className="hstack tiny faint" style={{ marginTop: 10, justifyContent: 'space-between' }}>
              <span>{module.code}</span>
              <span>{progress.completed}/{progress.total}</span>
            </div>
            <div style={{ marginTop: 6 }}>
              <ProgressBar value={progress.ratio} thin label="模块进度" />
            </div>
            <div className="vstack" style={{ gap: 6, marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ justifyContent: 'flex-start' }}
                onClick={() => {
                  toggleBookmark(lesson.id);
                  toast(bookmarked ? '已取消收藏' : '已加入收藏');
                }}
              >
                <Icon name="bookmark" size={14} /> {bookmarked ? '取消收藏' : '收藏本课'}
              </button>
              <Link
                to={`/quiz?module=${module.id}`}
                className="btn btn-sm btn-ghost"
                style={{ justifyContent: 'flex-start' }}
              >
                <Icon name="quiz" size={14} /> 模块小测
              </Link>
              <Link
                to="/lab"
                className="btn btn-sm btn-ghost"
                style={{ justifyContent: 'flex-start' }}
              >
                <Icon name="lab" size={14} /> 去故障排查实训
              </Link>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><Icon name="book" size={15} /> 本课信息</div>
            <div className="vstack tiny" style={{ marginTop: 10, gap: 8, color: 'var(--text-dim)' }}>
              <div className="hstack" style={{ justifyContent: 'space-between' }}>
                <span>深度</span><DepthBadge depth={lesson.depth} />
              </div>
              <div className="hstack" style={{ justifyContent: 'space-between' }}>
                <span>时长</span><span>{lesson.minutes} 分钟</span>
              </div>
              <div className="hstack" style={{ justifyContent: 'space-between' }}>
                <span>配套自测</span><span>{quizCount || '模块题库'} 题</span>
              </div>
              <div className="hstack" style={{ justifyContent: 'space-between' }}>
                <span>状态</span><span>{done ? '已完成' : '未完成'}</span>
              </div>
            </div>
            {lesson.keywords?.length ? (
              <>
                <div className="divider" style={{ margin: '12px 0' }} />
                <div className="hstack" style={{ gap: 5, flexWrap: 'wrap' }}>
                  {lesson.keywords.map((k) => (
                    <span className="chip" key={k} style={{ padding: '2px 8px', fontSize: 11 }}>{k}</span>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => navigate(`/module/${module.id}`)}
            style={{ justifyContent: 'flex-start' }}
          >
            <Icon name="arrowLeft" size={13} /> 返回模块
          </button>
        </aside>
      </div>
    </div>
  );
}
