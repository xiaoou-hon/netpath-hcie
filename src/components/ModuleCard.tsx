import { Link } from 'react-router-dom';
import type { ModuleMeta } from '@/types';
import { moduleMastery, moduleProgress, nextLesson } from '@/store/learningStore';
import { countByDepth } from '@/data/curriculum';
import { DepthBadge, Icon, ProgressBar } from '@/components/ui';

export function ModuleCard({ module }: { module: ModuleMeta }) {
  const progress = moduleProgress(module.id);
  const mastery = moduleMastery(module.id);
  const depths = countByDepth(module);
  const done = progress.ratio >= 1;

  return (
    <Link to={`/module/${module.id}`} className="card hoverable card-link">
      <div className="hstack" style={{ marginBottom: 8 }}>
        <span className="mono tiny" style={{ color: 'var(--accent)' }}>{module.code}</span>
        <span className="spacer" />
        {done ? <span className="badge ok">已完成</span> : <span className="badge">{module.lessons.length} 课时</span>}
      </div>
      <div className="card-title">{module.title}</div>
      <div className="card-desc" style={{ minHeight: 44 }}>{module.summary}</div>

      <div className="hstack tiny faint" style={{ marginTop: 10, gap: 6 }}>
        {(['了解', '熟悉', '精通'] as const).map((d) =>
          depths[d] ? (
            <span key={d} className="hstack" style={{ gap: 4 }}>
              <DepthBadge depth={d} />
              <span>×{depths[d]}</span>
            </span>
          ) : null,
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="hstack tiny faint" style={{ justifyContent: 'space-between', marginBottom: 5 }}>
          <span>掌握度 {Math.round(mastery * 100)}%</span>
          <span>
            {progress.completed}/{progress.total}
          </span>
        </div>
        <ProgressBar value={mastery} thin label={`${module.title}掌握度`} />
      </div>
    </Link>
  );
}

export function ContinueCard() {
  const upcoming = nextLesson();
  if (!upcoming) {
    return (
      <div className="card" style={{ borderColor: 'rgba(74,222,128,.3)' }}>
        <div className="hstack">
          <Icon name="check" size={18} className="muted" />
          <strong>全部课时已完成</strong>
        </div>
        <div className="card-desc">去测验中心做综合卷，或用故障排查实训检查排障能力。</div>
        <div className="hstack" style={{ marginTop: 12 }}>
          <Link to="/quiz" className="btn btn-primary btn-sm">去做综合卷</Link>
          <Link to="/lab" className="btn btn-sm">进入故障排查</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="card" style={{ borderColor: 'var(--border-strong)' }}>
      <div className="hstack">
        <span className="badge accent">从这里开始</span>
        <span className="tiny faint">{upcoming.minutes} 分钟</span>
      </div>
      <div className="card-title" style={{ marginTop: 8 }}>{upcoming.title}</div>
      <div className="card-desc">{upcoming.summary}</div>
      <div className="hstack" style={{ marginTop: 12 }}>
        <Link to={`/lesson/${upcoming.id}`} className="btn btn-primary btn-sm">
          继续学习 <Icon name="arrowRight" size={13} />
        </Link>
        <Link to="/path" className="btn btn-sm btn-ghost">查看完整路径</Link>
      </div>
    </div>
  );
}
