import { useState } from 'react';
import { Link } from 'react-router-dom';
import { lessons, moduleById, modules } from '@/data/curriculum';
import { stages } from '@/data/stages';
import { InteractiveBlock } from '@/components/interactive/registry';
import {
  moduleMastery,
  moduleProgress,
  nextLesson,
  overallProgress,
  recentActivity,
  resetProgress,
  stageProgress,
  streakDays,
  useLearning,
  weakModules,
} from '@/store/learningStore';
import { EmptyState, Icon, ProgressBar, toast } from '@/components/ui';

function pad(value: number): string {
  return `${value}`.padStart(2, '0');
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatMinutes(total: number): string {
  if (total <= 0) return '0 分钟';
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} 分钟`;
  if (minutes === 0) return `${hours} 小时`;
  return `${hours} 小时 ${minutes} 分`;
}

function percent(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

function weakReason(ratio: number, best: number | undefined): string {
  const reasons: string[] = [];
  if (ratio < 0.6) reasons.push('课时完成率低');
  if (best !== undefined && best < 0.6) reasons.push('小测成绩偏低');
  if (best === undefined) reasons.push('还没做过模块小测');
  if (!reasons.length) reasons.push('掌握度偏低');
  return reasons.join(' · ');
}

export function DashboardPage() {
  const learning = useLearning();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const overall = overallProgress();
  const streak = streakDays();
  const activity = recentActivity(7);
  const upcoming = nextLesson();
  const attempts = learning.attempts.slice(0, 5);

  const studiedMinutes = lessons
    .filter((lesson) => Boolean(learning.completedLessons[lesson.id]))
    .reduce((sum, lesson) => sum + lesson.minutes, 0);

  const maxActivity = activity.reduce((max, day) => Math.max(max, day.count), 0);
  const totalActivity = activity.reduce((sum, day) => sum + day.count, 0);

  const lessonHref = upcoming ? `/lesson/${upcoming.id}` : '/quiz';
  const weak = weakModules(3).filter((item) => item.mastery < 0.6);

  const handleReset = () => {
    resetProgress();
    setConfirmingReset(false);
    toast('学习数据已重置');
  };

  return (
    <div className="fade-up">
      <div className="page-head">
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 className="page-title">我的学习仪表盘</h1>
          <p className="page-sub" style={{ marginTop: 6 }}>
            总进度、模块掌握度、学习节奏与测验表现，一页看清你离下一阶段还差多少。
          </p>
        </div>
        <Link to={lessonHref} className="btn btn-primary">
          继续学习 <Icon name="arrowRight" size={14} />
        </Link>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 26 }}>
        <div className="stat">
          <div className="n">{percent(overall.ratio)}%</div>
          <div className="l">总完成率</div>
          <div className="tiny faint" style={{ marginTop: 4 }}>
            还剩 {Math.max(0, overall.total - overall.completed)} 个课时待完成
          </div>
        </div>
        <div className="stat">
          <div className="n">
            {overall.completed} / {overall.total}
          </div>
          <div className="l">已完成课时</div>
          <div className="tiny faint" style={{ marginTop: 4 }}>
            完成一课后会自动打卡
          </div>
        </div>
        <div className="stat">
          <div className="n">{streak} 天</div>
          <div className="l">连续学习天数</div>
          <div className="tiny faint" style={{ marginTop: 4 }}>
            {streak > 0 ? '保持节奏，明天继续' : '今天学一课，开启连续记录'}
          </div>
        </div>
        <div className="stat">
          <div className="n" style={{ fontSize: 22 }}>{formatMinutes(studiedMinutes)}</div>
          <div className="l">累计学习时长</div>
          <div className="tiny faint" style={{ marginTop: 4 }}>
            按已完成课时的预计时长累加
          </div>
        </div>
      </div>

      <div className="hstack" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, fontWeight: 750 }}>阶段进度</h2>
        <span className="tiny faint">{stages.map((s) => `${s.id} ${s.name}`).join(' → ')}</span>
        <span className="spacer" />
        <Link to="/path" className="small" style={{ color: 'var(--accent)' }}>
          查看完整路径 <Icon name="next" size={12} />
        </Link>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 30 }}>
        {stages.map((stage) => {
          const progress = stageProgress(stage.id);
          return (
            <div key={stage.id} className="stage-card" data-stage={stage.id}>
              <div className="hstack">
                <span className="stage-num">{stage.id}</span>
                <span className="spacer" />
                <span className="badge">
                  {progress.completed}/{progress.total} 课时
                </span>
                {progress.ratio >= 1 ? <span className="badge ok">阶段达成</span> : null}
              </div>
              <div className="stage-name">{stage.name}</div>
              <div className="stage-sub">{stage.subtitle}</div>
              <div className="hstack tiny faint" style={{ marginTop: 12, justifyContent: 'space-between' }}>
                <span>完成度 {percent(progress.ratio)}%</span>
                <span>{progress.total > 0 ? '按课时统计' : '暂无课时'}</span>
              </div>
              <div style={{ marginTop: 6 }}>
                <ProgressBar value={progress.ratio} thin label={`${stage.name}阶段进度`} />
              </div>
              <div className="tiny faint" style={{ marginTop: 12 }}>
                <strong className="small" style={{ color: 'var(--text-dim)' }}>晋升条件：</strong>
                {stage.promotion}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginBottom: 30 }}>
        <div className="hstack" style={{ marginBottom: 12 }}>
          <Icon name="target" size={17} className="muted" />
          <h2 style={{ fontSize: 18, fontWeight: 750 }}>能力雷达 · 对标 HCIE-Datacom</h2>
          <span className="spacer" />
          <span className="tiny faint">按能力维度聚合全部 {modules.length} 个模块，虚线为专家基线</span>
        </div>
        <InteractiveBlock interactiveKey="mastery-radar" />
      </div>

      <div className="hstack" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, fontWeight: 750 }}>模块掌握度明细</h2>
        <span className="tiny faint">{modules.length} 个模块</span>
      </div>

      {modules.length === 0 ? (
        <EmptyState title="课程数据正在生成" hint="模块内容将自动出现在这里" />
      ) : (
        <div className="grid grid-2" style={{ marginBottom: 30 }}>
          {modules.map((module) => {
            const progress = moduleProgress(module.id);
            const mastery = moduleMastery(module.id);
            const hasBest = module.id in learning.moduleBest;
            const best = hasBest ? learning.moduleBest[module.id] : undefined;
            return (
              <Link key={module.id} to={`/module/${module.id}`} className="card hoverable card-link">
                <div className="hstack">
                  <span className="mono tiny" style={{ color: 'var(--accent)' }}>{module.code}</span>
                  <span style={{ fontWeight: 650, fontSize: 14 }}>{module.title}</span>
                  <span className="spacer" />
                  <span className={`badge${best !== undefined ? (best >= 0.6 ? ' ok' : ' warn') : ''}`}>
                    {best !== undefined ? `小测 ${percent(best)}%` : '未测'}
                  </span>
                </div>
                <div
                  className="hstack tiny faint"
                  style={{ marginTop: 12, marginBottom: 5, justifyContent: 'space-between' }}
                >
                  <span>掌握度 {percent(mastery)}%</span>
                  <span>{progress.completed}/{progress.total} 课时</span>
                </div>
                <ProgressBar value={mastery} thin label={`${module.title}掌握度`} />
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid grid-2" style={{ marginBottom: 30 }}>
        <div className="card">
          <div className="hstack" style={{ marginBottom: 10 }}>
            <Icon name="chart" size={17} className="muted" />
            <h2 style={{ fontSize: 17, fontWeight: 750 }}>近 7 天学习热力</h2>
            <span className="spacer" />
            <span className="tiny faint">共 {totalActivity} 次学习动作</span>
          </div>
          <div className="heatmap" style={{ gap: 8 }}>
            {activity.map((day) => {
              const height = maxActivity > 0 ? 6 + Math.round((day.count / maxActivity) * 84) : 6;
              return (
                <div
                  key={day.date}
                  style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
                >
                  <div style={{ height: 90, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                    <div
                      className="heat-cell"
                      data-active={day.count > 0}
                      style={{ height }}
                      title={`${day.date} · ${day.count} 次`}
                    />
                  </div>
                  <div className="tiny faint mono">{day.date.slice(5)}</div>
                  <div className="tiny faint">{day.count}</div>
                </div>
              );
            })}
          </div>
          {maxActivity === 0 ? (
            <div className="hstack" style={{ marginTop: 16 }}>
              <span className="small muted">今天还没开始，去学一课</span>
              <span className="spacer" />
              <Link to={lessonHref} className="btn btn-primary btn-sm">
                去学习 <Icon name="arrowRight" size={12} />
              </Link>
            </div>
          ) : (
            <div className="tiny faint" style={{ marginTop: 14 }}>
              柱高表示当天学习动作次数，完成课时或提交测验都会记一次。
            </div>
          )}
        </div>

        <div className="card">
          <div className="hstack" style={{ marginBottom: 10 }}>
            <Icon name="quiz" size={17} className="muted" />
            <h2 style={{ fontSize: 17, fontWeight: 750 }}>最近测验记录</h2>
            <span className="spacer" />
            {attempts.length > 0 ? (
              <Link to="/quiz" className="tiny" style={{ color: 'var(--text-faint)' }}>
                去测验
              </Link>
            ) : null}
          </div>
          {attempts.length === 0 ? (
            <>
              <EmptyState title="还没有测验记录" hint="做一轮模块小测或综合卷，看看真实水平" />
              <div className="hstack" style={{ marginTop: 12, justifyContent: 'center' }}>
                <Link to="/quiz" className="btn btn-primary btn-sm">
                  去测验 <Icon name="arrowRight" size={12} />
                </Link>
              </div>
            </>
          ) : (
            <div className="vstack" style={{ gap: 2 }}>
              {attempts.map((attempt) => {
                const score = attempt.total > 0 ? percent(attempt.correct / attempt.total) : 0;
                return (
                  <div key={attempt.id} className="lesson-row">
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <div className="title">{attempt.scope}</div>
                      <div className="sub mono">{formatDateTime(attempt.at)}</div>
                    </span>
                    <span className="tail">
                      <span className="mono small muted">
                        {attempt.correct}/{attempt.total}
                      </span>
                      <span className={`badge ${score >= 60 ? 'ok' : 'warn'}`}>{score}%</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="hstack" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, fontWeight: 750 }}>薄弱模块建议</h2>
        <span className="tiny faint">掌握度低于 60% 的模块优先补强</span>
      </div>

      <div className="card" style={{ marginBottom: 30 }}>
        {weak.length === 0 ? (
          <EmptyState title="暂时没有薄弱模块" hint="所有模块掌握度都在 60% 以上，继续保持" />
        ) : (
          <div className="vstack" style={{ gap: 4 }}>
            {weak.map((item) => {
              const module = moduleById.get(item.moduleId);
              if (!module) return null;
              const progress = moduleProgress(module.id);
              const hasBest = module.id in learning.moduleBest;
              const best = hasBest ? learning.moduleBest[module.id] : undefined;
              return (
                <div key={item.moduleId} className="lesson-row">
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <div className="title">
                      <span className="mono tiny" style={{ color: 'var(--accent)' }}>{module.code}</span>{' '}
                      {module.title}
                    </div>
                    <div className="sub">
                      掌握度 {percent(item.mastery)}% · {weakReason(progress.ratio, best)}
                    </div>
                  </span>
                  <span className="tail">
                    <Link to={`/module/${module.id}`} className="btn btn-sm">
                      去补课 <Icon name="next" size={12} />
                    </Link>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        {confirmingReset ? (
          <div className="hstack">
            <span className="tiny faint">确认清空全部学习记录？此操作不可撤销。</span>
            <span className="spacer" />
            <button type="button" className="btn btn-sm btn-danger" onClick={handleReset}>
              确认重置
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setConfirmingReset(false)}
            >
              取消
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            style={{ color: 'var(--text-faint)' }}
            onClick={() => setConfirmingReset(true)}
          >
            <Icon name="trash" size={12} /> 重置学习数据
          </button>
        )}
      </div>
    </div>
  );
}
