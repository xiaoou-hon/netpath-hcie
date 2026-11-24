import { Link } from 'react-router-dom';
import { stages } from '@/data/stages';
import { lessons, moduleById, modules } from '@/data/curriculum';
import {
  isLessonCompleted,
  nextLesson,
  stageProgress,
  useLearning,
} from '@/store/learningStore';
import { DepthBadge, Icon, ProgressBar } from '@/components/ui';

export function PathPage() {
  const learning = useLearning();
  const upcoming = nextLesson();

  return (
    <div className="fade-up">
      <div className="page-head">
        <div>
          <div className="breadcrumb">
            <Link to="/">首页</Link> <span>/</span> <span>成长路径</span>
          </div>
          <h1 className="page-title">从零基础到 HCIE-Datacom 的成长路径</h1>
          <p className="page-sub">
            {stages.length} 个阶段、{modules.length} 个模块、{lessons.length} 个课时。按顺序学完，你会从「听不懂术语」到
            「能设计、能配置、能排错」。每个阶段都有明确的晋级条件。
          </p>
        </div>
      </div>

      {upcoming ? (
        <div className="card" style={{ borderColor: 'var(--border-strong)', marginBottom: 22 }}>
          <div className="hstack">
            <span className="badge accent">下一步</span>
            <span className="small muted">{upcoming.title}</span>
            <span className="spacer" />
            <Link to={`/lesson/${upcoming.id}`} className="btn btn-primary btn-sm">
              继续学习 <Icon name="arrowRight" size={13} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="card" style={{ borderColor: 'rgba(74,222,128,.3)', marginBottom: 22 }}>
          <div className="hstack">
            <span className="badge ok">全部完成</span>
            <span className="small muted">所有课时已学完，建议进入测验中心与实验室巩固。</span>
            <span className="spacer" />
            <Link to="/quiz" className="btn btn-sm">综合卷</Link>
          </div>
        </div>
      )}

      <div className="vstack" style={{ gap: 26 }}>
        {stages.map((stage) => {
          const progress = stageProgress(stage.id);
          const stageModules = modules.filter((m) => m.stage === stage.id);
          return (
            <section key={stage.id} className="stage-card" data-stage={stage.id}>
              <div className="hstack" style={{ marginBottom: 4 }}>
                <span className="stage-num">{stage.id}</span>
                <span className="spacer" />
                <span className="badge">{progress.completed}/{progress.total} 课时</span>
                <span className={`badge ${progress.ratio >= 1 ? 'ok' : ''}`}>
                  {progress.ratio >= 1 ? '阶段达成' : `完成度 ${Math.round(progress.ratio * 100)}%`}
                </span>
              </div>
              <div className="stage-name">{stage.name}</div>
              <div className="stage-sub">{stage.subtitle}</div>
              <p className="card-desc" style={{ marginTop: 10, maxWidth: 880 }}>{stage.description}</p>

              <div className="grid grid-2" style={{ marginTop: 16 }}>
                <div>
                  <div className="tiny faint" style={{ letterSpacing: '.08em', marginBottom: 6 }}>阶段能力目标</div>
                  <ul className="small muted" style={{ paddingLeft: 18 }}>
                    {stage.goals.map((g) => (
                      <li key={g} style={{ margin: '4px 0' }}>{g}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="tiny faint" style={{ letterSpacing: '.08em', marginBottom: 6 }}>晋升条件</div>
                  <div className="small muted">{stage.promotion}</div>
                  <div style={{ marginTop: 12 }}>
                    <ProgressBar value={progress.ratio} thin label={`${stage.name}阶段进度`} />
                  </div>
                </div>
              </div>

              <div className="divider" />

              <div className="vstack" style={{ gap: 14 }}>
                {stageModules.map((m) => {
                  const doneCount = m.lessons.filter((l) => isLessonCompleted(l.id) || learning.completedLessons[l.id]).length;
                  return (
                    <div key={m.id}>
                      <div className="hstack" style={{ marginBottom: 4 }}>
                        <span className="mono tiny" style={{ color: 'var(--accent)' }}>{m.code}</span>
                        <Link to={`/module/${m.id}`} style={{ fontWeight: 650, fontSize: 14.5 }}>{m.title}</Link>
                        {m.priority ? (
                          <span className={`badge${m.priority === 'P0' ? ' accent' : m.priority === 'P2' ? ' faint' : ''}`}>
                            {m.priority}
                          </span>
                        ) : null}
                        <span className="tiny faint">{doneCount}/{m.lessons.length}</span>
                        <span className="spacer" />
                        <Link to={`/module/${m.id}`} className="tiny" style={{ color: 'var(--text-faint)' }}>
                          模块详情
                        </Link>
                      </div>
                      {m.prerequisites?.length ? (
                        <div className="hstack tiny faint" style={{ gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span>前置模块</span>
                          {m.prerequisites.map((id) => {
                            const pre = moduleById.get(id);
                            return pre ? (
                              <Link key={id} to={`/module/${id}`} style={{ color: 'var(--accent-2)' }}>
                                {pre.code} {pre.title}
                              </Link>
                            ) : null;
                          })}
                        </div>
                      ) : null}
                      <div className="vstack" style={{ gap: 2 }}>
                        {m.lessons.map((l, idx) => {
                          const done = Boolean(learning.completedLessons[l.id]);
                          return (
                            <Link key={l.id} to={`/lesson/${l.id}`} className={`lesson-row${done ? ' done' : ''}`}>
                              <span className="idx">{String(idx + 1).padStart(2, '0')}</span>
                              <span className={`check-dot${done ? ' done' : ''}`}>{done ? '✓' : ''}</span>
                              <span style={{ minWidth: 0 }}>
                                <div className="title">{l.title}</div>
                                <div className="sub">{l.summary}</div>
                              </span>
                              <span className="tail">
                                <span className="tiny faint hide-sm">{l.minutes} 分钟</span>
                                <DepthBadge depth={l.depth} />
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
