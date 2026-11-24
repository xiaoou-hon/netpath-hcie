import { Link, useParams } from 'react-router-dom';
import { getModule, moduleById } from '@/data/curriculum';
import { stageById } from '@/data/stages';
import {
  isLessonCompleted,
  moduleMastery,
  moduleProgress,
  toggleBookmark,
  useLearning,
} from '@/store/learningStore';
import { DepthBadge, EmptyState, Icon, ProgressBar, toast } from '@/components/ui';
import { GlossaryText } from '@/components/glossary/GlossaryText';

export function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const module = getModule(moduleId);
  const learning = useLearning();

  if (!module) {
    return <EmptyState title="模块不存在" hint="请从左侧课程模块重新进入" />;
  }

  const progress = moduleProgress(module.id);
  const mastery = moduleMastery(module.id);
  const stage = stageById.get(module.stage);
  const firstUnfinished = module.lessons.find((l) => !learning.completedLessons[l.id]) ?? module.lessons[0];

  return (
    <div className="fade-up">
      <div className="breadcrumb">
        <Link to="/">首页</Link> <span>/</span>
        <Link to="/path">成长路径</Link> <span>/</span>
        <span>{module.code}</span>
      </div>

      <div className="page-head">
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="hstack">
            <span className="badge accent">{module.code}</span>
            {module.priority ? (
              <span className={`badge${module.priority === 'P0' ? ' accent' : module.priority === 'P2' ? ' faint' : ''}`}>
                {module.priority}
              </span>
            ) : null}
            {stage ? <span className="badge">{stage.id} · {stage.name}</span> : null}
            <span className="badge">{module.lessons.length} 课时</span>
            <span className="badge">约 {Math.round(module.lessons.reduce((s, l) => s + l.minutes, 0) / 60 * 10) / 10} 小时</span>
          </div>
          <h1 className="page-title" style={{ marginTop: 8 }}>{module.title}</h1>
          <p className="page-sub"><GlossaryText text={module.summary} /></p>
          {module.prerequisites?.length ? (
            <div className="hstack tiny faint" style={{ gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <span>前置模块</span>
              {module.prerequisites.map((id) => {
                const pre = moduleById.get(id);
                return pre ? (
                  <Link key={id} to={`/module/${id}`} style={{ color: 'var(--accent-2)' }}>
                    {pre.code} {pre.title}
                  </Link>
                ) : null;
              })}
            </div>
          ) : null}
        </div>
        <div className="hstack">
          <Link to={`/quiz?module=${module.id}`} className="btn">
            <Icon name="quiz" size={14} /> 模块小测
          </Link>
          {firstUnfinished ? (
            <Link to={`/lesson/${firstUnfinished.id}`} className="btn btn-primary">
              {progress.completed ? '继续学习' : '开始第一课'} <Icon name="arrowRight" size={14} />
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 22 }}>
        <div className="card">
          <div className="card-title"><Icon name="target" size={15} /> 模块能力目标</div>
          <ul className="small muted" style={{ marginTop: 10, paddingLeft: 18 }}>
            {module.goals.map((g) => (
              <li key={g} style={{ margin: '5px 0' }}><GlossaryText text={g} /></li>
            ))}
          </ul>
          <div className="hstack tiny faint" style={{ marginTop: 14, gap: 6 }}>
            {module.keywords.map((k) => (
              <span className="chip" key={k}>{k}</span>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title"><Icon name="chart" size={15} /> 学习进度</div>
          <div className="hstack" style={{ marginTop: 14, alignItems: 'flex-end' }}>
            <span style={{ fontSize: 34, fontWeight: 780, lineHeight: 1 }}>{Math.round(mastery * 100)}%</span>
            <span className="small faint" style={{ paddingBottom: 3 }}>掌握度</span>
            <span className="spacer" />
            <span className="small muted">{progress.completed}/{progress.total} 课时</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <ProgressBar value={mastery} label="模块掌握度" />
          </div>
          <div className="tiny faint" style={{ marginTop: 10 }}>
            掌握度 = 课时完成率 × 70% + 模块小测最好成绩 × 30%。
            {learning.moduleBest[module.id] === undefined ? ' 尚未参加模块小测。' : ` 小测最好成绩 ${Math.round((learning.moduleBest[module.id] ?? 0) * 100)}%。`}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="hstack" style={{ marginBottom: 6 }}>
          <span className="card-title">课时列表</span>
          <span className="spacer" />
          <span className="tiny faint">点击课时开始学习 · 右侧星标可收藏</span>
        </div>
        <div className="vstack" style={{ gap: 2 }}>
          {module.lessons.map((l, idx) => {
            const done = isLessonCompleted(l.id) || Boolean(learning.completedLessons[l.id]);
            const bookmarked = learning.bookmarks.includes(l.id);
            return (
              <div key={l.id} className={`lesson-row${done ? ' done' : ''}`} style={{ cursor: 'default' }}>
                <span className="idx">{String(idx + 1).padStart(2, '0')}</span>
                <span className={`check-dot${done ? ' done' : ''}`}>{done ? '✓' : ''}</span>
                <Link to={`/lesson/${l.id}`} style={{ flex: 1, minWidth: 0 }}>
                  <div className="title">{l.title}</div>
                  <div className="sub">{l.summary}</div>
                </Link>
                <span className="tail">
                  <span className="tiny faint hide-sm">{l.minutes} 分钟</span>
                  <DepthBadge depth={l.depth} />
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ width: 28, height: 28, color: bookmarked ? 'var(--warn)' : 'var(--text-faint)' }}
                    aria-label={bookmarked ? '取消收藏' : '收藏本课'}
                    onClick={() => {
                      toggleBookmark(l.id);
                      toast(bookmarked ? '已取消收藏' : '已加入收藏');
                    }}
                  >
                    <Icon name="bookmark" size={14} />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
