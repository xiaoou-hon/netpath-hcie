import { Link } from 'react-router-dom';
import { modules, lessons, totalMinutes } from '@/data/curriculum';
import { stages } from '@/data/stages';
import { interactiveMetas } from '@/components/interactive/registry';
import { questions } from '@/data/curriculum';
import { ContinueCard, ModuleCard } from '@/components/ModuleCard';
import { overallProgress, stageProgress, useLearning } from '@/store/learningStore';
import { Icon, ProgressBar } from '@/components/ui';

export function HomePage() {
  useLearning();
  const overall = overallProgress();
  const totalHours = Math.round(totalMinutes / 60);

  return (
    <div className="fade-up">
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-inner">
          <div className="hero-eyebrow">
            <Icon name="layers" size={14} /> 对标 HCIE-Datacom · 从零基础到专家
          </div>
          <h1 className="hero-title">
            把网络<span className="grad">真正看懂</span>
            <br />
            从一根网线到一张企业网
          </h1>
          <p className="hero-sub">
            {modules.length} 个模块、{lessons.length} 个可视化课时，覆盖 TCP/IP、IGP/BGP、交换与 WLAN、网络安全、IPv6、运维排障与自动化。
            每个知识点都配有可动手的图解、华为 VRP 命令和排错路径，按「了解 → 熟悉 → 精通」三档逐步加码。
          </p>
          <div className="hero-actions">
            <Link to="/path" className="btn btn-primary">
              开始学习路径 <Icon name="arrowRight" size={14} />
            </Link>
            <Link to="/lab" className="btn">
              <Icon name="lab" size={14} /> 进故障排查实训
            </Link>
            <Link to="/quiz" className="btn btn-ghost">
              <Icon name="quiz" size={14} /> 先测测水平
            </Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="n">{modules.length || 12}</div>
              <div className="l">课程模块</div>
            </div>
            <div className="hero-stat">
              <div className="n">{lessons.length || 64}+</div>
              <div className="l">可视化课时</div>
            </div>
            <div className="hero-stat">
              <div className="n">{interactiveMetas.length || 15}</div>
              <div className="l">互动图解</div>
            </div>
            <div className="hero-stat">
              <div className="n">{questions.length || 120}+</div>
              <div className="l">自测题</div>
            </div>
            <div className="hero-stat">
              <div className="n">{totalHours || 30}h</div>
              <div className="l">总学时</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-3" style={{ marginBottom: 26 }}>
        <ContinueCard />
        <div className="card">
          <div className="hstack">
            <Icon name="chart" size={17} className="muted" />
            <strong>当前进度</strong>
            <span className="spacer" />
            <span className="mono small">{Math.round(overall.ratio * 100)}%</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <ProgressBar value={overall.ratio} label="总进度" />
          </div>
          <div className="hstack tiny faint" style={{ marginTop: 10 }}>
            <span>已完成 {overall.completed} 课时</span>
            <span>·</span>
            <span>剩余 {overall.total - overall.completed} 课时</span>
          </div>
          <div className="hstack" style={{ marginTop: 12 }}>
            <Link to="/dashboard" className="btn btn-sm">查看仪表盘</Link>
            <Link to="/library" className="btn btn-sm btn-ghost">我的笔记</Link>
          </div>
        </div>
        <div className="card">
          <div className="hstack">
            <Icon name="target" size={17} className="muted" />
            <strong>怎么用这套课程</strong>
          </div>
          <div className="vstack" style={{ marginTop: 10, gap: 8 }}>
            {[
              ['1', '先看类比和图解', '建立直觉，不怕术语'],
              ['2', '跟着敲华为命令', '实验室里立刻验证'],
              ['3', '用自测题查漏', '错题自动进错题本'],
              ['4', '按路径逐级晋升', `从${stages[0]?.name ?? '入门'}到${stages[stages.length - 1]?.name ?? '专家'}`],
            ].map(([n, t, d]) => (
              <div key={n} className="hstack" style={{ gap: 10 }}>
                <span className="badge accent">{n}</span>
                <span>
                  <span style={{ fontSize: 13.5 }}>{t}</span>
                  <span className="tiny faint" style={{ marginLeft: 6 }}>{d}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hstack" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, fontWeight: 750 }}>{stages.length} 个阶段的成长路径</h2>
        <span className="tiny faint">{stages.map((s) => `${s.id} ${s.name}`).join(' → ')}</span>
        <span className="spacer" />
        <Link to="/path" className="small" style={{ color: 'var(--accent)' }}>
          查看完整路径 <Icon name="next" size={12} />
        </Link>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 30 }}>
        {stages.map((s) => {
          const p = stageProgress(s.id);
          return (
            <Link key={s.id} to="/path" className="stage-card card-link" data-stage={s.id}>
              <div className="hstack">
                <span className="stage-num">{s.id}</span>
                <span className="spacer" />
                <span className="badge">{p.completed}/{p.total} 课时</span>
              </div>
              <div className="stage-name">{s.name}</div>
              <div className="stage-sub">{s.subtitle}</div>
              <div className="card-desc" style={{ marginTop: 8, minHeight: 62 }}>{s.description}</div>
              <div style={{ marginTop: 8 }}>
                <ProgressBar value={p.ratio} thin label={`${s.name}进度`} />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="hstack" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, fontWeight: 750 }}>课程地图</h2>
        <span className="tiny faint">{modules.length} 个模块，难度依次递进</span>
      </div>

      {modules.length === 0 ? (
        <div className="empty">
          <div className="t">课程数据正在生成</div>
          <div className="small">内容模块将自动出现在这里</div>
        </div>
      ) : (
        <div className="grid grid-3">
          {modules.map((m) => (
            <ModuleCard key={m.id} module={m} />
          ))}
        </div>
      )}
    </div>
  );
}
