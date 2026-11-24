import { useState } from 'react';
import { Link } from 'react-router-dom';
import { moduleById } from '@/data/curriculum';
import {
  cloudAbilities,
  cloudAcceptanceItems,
  cloudExamThreshold,
  cloudExamThresholdP0,
  cloudMappings,
  cloudPractices,
  cloudRecommendedOrder,
  keyNodes,
  l4Modules,
  priorityGroups,
} from '@/data/cloud-path';
import { useLearning } from '@/store/learningStore';
import { Icon, ProgressBar } from '@/components/ui';

const ACCEPTANCE_KEY = 'netpath:cloud-acceptance:v1';

function loadAcceptance(): string[] {
  try {
    const raw = window.localStorage.getItem(ACCEPTANCE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

function saveAcceptance(ids: string[]) {
  try {
    window.localStorage.setItem(ACCEPTANCE_KEY, JSON.stringify(ids));
  } catch {
    /* 存储不可用时仅当前会话生效 */
  }
}

function priorityOf(moduleId: string): 'P0' | 'P1' | 'P2' {
  const fromModule = moduleById.get(moduleId)?.priority;
  if (fromModule) return fromModule;
  const group = priorityGroups.find((g) => g.moduleIds.includes(moduleId));
  return group?.id ?? 'P2';
}

function thresholdOf(moduleId: string): number {
  return priorityOf(moduleId) === 'P0' ? cloudExamThresholdP0 : cloudExamThreshold;
}

/** 模块链接：模块内容尚未落地时降级显示 id */
function ModuleLink({ id }: { id: string }) {
  const mod = moduleById.get(id);
  return (
    <Link to={`/module/${id}`} style={{ color: 'var(--accent-2)' }}>
      {mod ? `${mod.code} ${mod.title}` : id.toUpperCase()}
    </Link>
  );
}

function SectionHead({ index, title, desc }: { index: string; title: string; desc: string }) {
  return (
    <div className="hstack" style={{ marginBottom: 14 }}>
      <span className="mono tiny" style={{ color: 'var(--accent)', letterSpacing: '.1em' }}>
        {index}
      </span>
      <h2 style={{ fontSize: 20, fontWeight: 750 }}>{title}</h2>
      <span className="tiny faint">{desc}</span>
    </div>
  );
}

export function CloudPathPage() {
  const learning = useLearning();
  const [acceptance, setAcceptance] = useState<string[]>(loadAcceptance);

  const cloudModules = l4Modules();
  const cloudLessons = cloudModules.flatMap((m) => m.lessons);
  const completedLessons = cloudLessons.filter((l) => Boolean(learning.completedLessons[l.id])).length;
  const totalLessons = cloudLessons.length;
  const lessonRatio = totalLessons > 0 ? completedLessons / totalLessons : 0;

  const allCloudModuleIds = priorityGroups.flatMap((g) => g.moduleIds);
  const metModules = allCloudModuleIds.filter((id) => {
    const best = id in learning.moduleBest ? learning.moduleBest[id] : undefined;
    return best !== undefined && Math.round(best * 100) >= thresholdOf(id);
  }).length;

  const checkedCount = cloudAcceptanceItems.filter((item) => acceptance.includes(item.id)).length;
  const allChecked = checkedCount === cloudAcceptanceItems.length;
  const allLessonsDone = totalLessons > 0 && completedLessons === totalLessons;
  const transformed = allChecked && allLessonsDone && allCloudModuleIds.length > 0 && metModules === allCloudModuleIds.length;

  const toggleAcceptance = (id: string) => {
    setAcceptance((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveAcceptance(next);
      return next;
    });
  };

  const renderModuleCard = (moduleId: string) => {
    const mod = moduleById.get(moduleId);
    const done = mod ? mod.lessons.filter((l) => Boolean(learning.completedLessons[l.id])).length : 0;
    const total = mod?.lessons.length ?? 0;
    const best = moduleId in learning.moduleBest ? learning.moduleBest[moduleId] : undefined;
    const bestPercent = best !== undefined ? Math.round(best * 100) : undefined;
    const threshold = thresholdOf(moduleId);
    const priority = priorityOf(moduleId);

    return (
      <div key={moduleId} className="card">
        <div className="hstack" style={{ marginBottom: 4 }}>
          <span className="mono tiny" style={{ color: 'var(--accent)' }}>
            {mod?.code ?? moduleId.toUpperCase()}
          </span>
          <span style={{ fontWeight: 650, fontSize: 14.5 }}>
            {mod?.title ?? '模块内容生成中'}
          </span>
          <span className="spacer" />
          <span className={`badge${priority === 'P0' ? ' accent' : priority === 'P2' ? ' faint' : ''}`}>
            {priority}
          </span>
        </div>

        <div className="card-desc">
          {mod?.summary ?? '该模块的课时与题库正在创建，内容就绪后会自动显示。'}
        </div>

        {mod?.prerequisites?.length ? (
          <div className="hstack tiny faint" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <span>前置模块</span>
            {mod.prerequisites.map((id) => (
              <ModuleLink key={id} id={id} />
            ))}
          </div>
        ) : null}

        <div className="hstack tiny faint" style={{ marginTop: 12, justifyContent: 'space-between' }}>
          <span>{mod ? `${total} 课时` : '课时数 —'}</span>
          <span>{mod ? `${done}/${total} 已完成` : '进度 —'}</span>
        </div>
        <div style={{ marginTop: 6 }}>
          <ProgressBar value={total > 0 ? done / total : 0} thin label={`${mod?.title ?? moduleId}课时进度`} />
        </div>

        <div className="hstack" style={{ marginTop: 12 }}>
          {bestPercent === undefined ? (
            <span className="badge">小测未测</span>
          ) : (
            <span className={`badge ${bestPercent >= threshold ? 'ok' : 'warn'}`}>
              小测 {bestPercent}% · {bestPercent >= threshold ? '达标' : '未达标'}
            </span>
          )}
          <span className="tiny faint">达标线 {threshold}%</span>
          <span className="spacer" />
          <Link to={`/module/${moduleId}`} className="tiny" style={{ color: 'var(--text-faint)' }}>
            进入模块
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="fade-up">
      <div className="page-head">
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="breadcrumb">
            <Link to="/">首页</Link> <span>/</span> <Link to="/path">成长路径</Link> <span>/</span>
            <span>云网转型</span>
          </div>
          <h1 className="page-title">云网络转型路线</h1>
          <p className="page-sub" style={{ marginTop: 6 }}>
            从传统网络到云网络的分层递进路径：先把 VLAN/VRF、路由交换的能力映射到 VPC 与云路由，
            再补齐云原生、Overlay/SRv6、云安全与混合云自动化，最后用综合设计与验收清单确认转型完成。
          </p>
        </div>
        <div className="hstack">
          <Link to="/path" className="btn btn-sm">
            查看成长路径
          </Link>
          <Link to="/module/m16" className="btn btn-primary">
            从 M16 开始 <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </div>

      <div className="card" style={{ borderColor: 'var(--border-strong)', marginBottom: 26 }}>
        <div className="hstack">
          <span className="badge accent">L4</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>云网络工程师 · 转型进度</span>
          <span className="spacer" />
          <span className="tiny faint">
            小测达标线 {cloudExamThreshold}%，P0 建议 {cloudExamThresholdP0}%
          </span>
        </div>

        <div className="hstack" style={{ marginTop: 12, justifyContent: 'space-between' }}>
          <span className="small muted">
            L4 课时完成 {completedLessons} / {totalLessons}
          </span>
          <span className="mono small">{Math.round(lessonRatio * 100)}%</span>
        </div>
        <div style={{ marginTop: 6 }}>
          <ProgressBar value={lessonRatio} thin label="L4 云网络课时完成度" />
        </div>

        <div className="hstack" style={{ marginTop: 14 }}>
          <span className="badge">
            模块小测达标 {metModules}/{allCloudModuleIds.length}
          </span>
          <span className={`badge${allChecked ? ' ok' : ''}`}>
            验收清单 {checkedCount}/{cloudAcceptanceItems.length}
          </span>
          {transformed ? <span className="badge ok">云网络转型完成</span> : null}
          <span className="spacer" />
          {totalLessons > 0 && !allLessonsDone ? (
            <Link to={`/module/${cloudModules[0]?.id ?? 'm16'}`} className="btn btn-sm">
              继续云网络课程 <Icon name="next" size={12} />
            </Link>
          ) : null}
        </div>
      </div>

      {/* 01 知识模块划分 */}
      <section style={{ marginBottom: 34 }}>
        <SectionHead index="01" title="知识模块划分" desc="按 P0 → P1 → P2 分组，先学什么、为什么" />

        {cloudModules.length === 0 ? (
          <div className="card" style={{ borderStyle: 'dashed', marginBottom: 16 }}>
            <div className="small muted">
              L4 课程内容尚未加载完成，下方模块卡会显示模块 id 与占位信息；M16–M22 内容落地后自动补齐，
              不影响跳转与进度统计。
            </div>
          </div>
        ) : null}

        {priorityGroups.map((group) => (
          <div key={group.id} style={{ marginBottom: 20 }}>
            <div className="hstack" style={{ marginBottom: 6 }}>
              <span className={`badge${group.id === 'P0' ? ' accent' : group.id === 'P2' ? ' faint' : ''}`}>
                {group.id}
              </span>
              <span style={{ fontWeight: 650, fontSize: 14 }}>{group.title}</span>
              <span className="tiny faint">{group.moduleIds.length} 个模块</span>
            </div>
            <p className="small muted" style={{ marginBottom: 10, maxWidth: 920 }}>
              {group.desc}
            </p>
            {group.moduleIds.length === 0 ? (
              <div className="card" style={{ borderStyle: 'dashed' }}>
                <div className="small muted">暂无必修模块，主线完成后可按上面的方向拓展。</div>
              </div>
            ) : (
              <div className="grid grid-3">{group.moduleIds.map(renderModuleCard)}</div>
            )}
          </div>
        ))}

        <p className="tiny faint" style={{ maxWidth: 980 }}>
          {cloudRecommendedOrder}
        </p>
      </section>

      {/* 02 关键转型节点 */}
      <section style={{ marginBottom: 34 }}>
        <SectionHead index="02" title="关键转型节点" desc="五个节点，标注对应模块与可检验的能力标志" />
        <div className="grid grid-2">
          {keyNodes.map((node, index) => (
            <div key={node.id} className="card">
              <div className="hstack" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                <span
                  className="mono"
                  style={{ fontSize: 20, fontWeight: 750, color: 'var(--accent)', lineHeight: 1.2 }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 650, fontSize: 14.5 }}>{node.title}</div>
                  <div className="card-desc">{node.goal}</div>
                  <div className="tiny" style={{ marginTop: 10, color: 'var(--accent-2)' }}>
                    能力标志：{node.capability}
                  </div>
                  <div className="hstack tiny faint" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <span>对应模块</span>
                    {node.moduleIds.map((id) => (
                      <ModuleLink key={id} id={id} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 03 传统到云衔接映射 */}
      <section style={{ marginBottom: 34 }}>
        <SectionHead
          index="03"
          title="传统 → 云衔接映射"
          desc="每一行都是既有能力在新环境里的落点，避免无前置铺垫的跳跃"
        />
        <div className="block-table">
          <table>
            <thead>
              <tr>
                <th>传统网络</th>
                <th>云上对应</th>
                <th>迁移要点</th>
                <th>关联模块</th>
              </tr>
            </thead>
            <tbody>
              {cloudMappings.map((row) => (
                <tr key={row.traditional}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{row.traditional}</td>
                  <td style={{ color: 'var(--accent)', whiteSpace: 'nowrap' }}>{row.cloud}</td>
                  <td className="small muted" style={{ minWidth: 280 }}>{row.note}</td>
                  <td>
                    <div className="hstack tiny" style={{ gap: 6, flexWrap: 'wrap' }}>
                      {row.moduleIds.map((id) => (
                        <ModuleLink key={id} id={id} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 04 实践落地路径 */}
      <section style={{ marginBottom: 34 }}>
        <SectionHead
          index="04"
          title="实践落地路径"
          desc="每个模块一个动手任务：无云账号也能用代码阅读、改写与 eNSP 等价实验完成"
        />
        <div className="grid grid-2">
          {cloudPractices.map((practice) => {
            const mod = moduleById.get(practice.moduleId);
            return (
              <div key={practice.moduleId} className="card">
                <div className="hstack" style={{ marginBottom: 4 }}>
                  <span className="mono tiny" style={{ color: 'var(--accent)' }}>
                    {mod?.code ?? practice.moduleId.toUpperCase()}
                  </span>
                  <span style={{ fontWeight: 650, fontSize: 14 }}>{practice.task}</span>
                </div>
                <ol className="small muted" style={{ paddingLeft: 18, margin: '8px 0 0' }}>
                  {practice.steps.map((step) => (
                    <li key={step} style={{ margin: '4px 0' }}>
                      {step}
                    </li>
                  ))}
                </ol>
                <div className="small" style={{ marginTop: 10 }}>
                  <span className="badge ok">验证</span>{' '}
                  <span className="muted">{practice.verify}</span>
                </div>
                <div className="hstack" style={{ marginTop: 12 }}>
                  <Link to={`/module/${practice.moduleId}`} className="btn btn-sm">
                    进入模块 <Icon name="next" size={12} />
                  </Link>
                  {practice.lab ? (
                    <Link to={practice.lab.to} className="btn btn-sm btn-ghost">
                      {practice.lab.label}
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 05 能力验证标准 */}
      <section style={{ marginBottom: 20 }}>
        <SectionHead
          index="05"
          title="能力验证标准"
          desc="阈值为 70% / 80%，5 维能力矩阵自评，6 项综合设计验收"
        />

        <div className="grid grid-2" style={{ marginBottom: 18 }}>
          <div className="card">
            <div className="hstack" style={{ marginBottom: 6 }}>
              <span className="badge">模块达标</span>
              <span style={{ fontWeight: 650, fontSize: 14 }}>正确率 ≥ {cloudExamThreshold}%</span>
            </div>
            <div className="small muted">
              每个云模块的小测最好正确率达到 {cloudExamThreshold}%，记为模块达标。
              未达标先回看对应课时与错题，再重做模块小测；达标后进入下一模块。
            </div>
          </div>
          <div className="card">
            <div className="hstack" style={{ marginBottom: 6 }}>
              <span className="badge accent">P0 建议</span>
              <span style={{ fontWeight: 650, fontSize: 14 }}>正确率 ≥ {cloudExamThresholdP0}%</span>
            </div>
            <div className="small muted">
              P0 模块（M16/M17/M19/M20/M22）是转型主线，建议达到 {cloudExamThresholdP0}%
              再进入下一模块；这里的成绩会直接反映综合设计与混合云方案的质量。
            </div>
          </div>
        </div>

        <div className="hstack" style={{ marginBottom: 10 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>5 维能力矩阵</h3>
          <span className="tiny faint">按映射模块的课时完成度与小测成绩估分：1–5 分，3 分为可独立完成</span>
        </div>
        <div className="grid grid-3" style={{ marginBottom: 18 }}>
          {cloudAbilities.map((ability) => (
            <div key={ability.id} className="card">
              <div className="hstack" style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 650, fontSize: 14 }}>{ability.name}</span>
                <span className="spacer" />
                <span className="tiny faint">自评 1–5</span>
              </div>
              <div className="card-desc">{ability.desc}</div>
              <div className="hstack tiny faint" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <span>映射模块</span>
                {ability.moduleIds.map((id) => (
                  <ModuleLink key={id} id={id} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ borderColor: transformed ? 'rgba(74,222,128,.35)' : undefined }}>
          <div className="hstack" style={{ marginBottom: 10 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>M22 综合设计验收清单</h3>
            <span className={`badge${allChecked ? ' ok' : ''}`}>
              {checkedCount}/{cloudAcceptanceItems.length}
            </span>
            <span className="spacer" />
            <span className="tiny faint">勾选结果保存在本机，刷新后保留</span>
          </div>

          <div className="vstack" style={{ gap: 2 }}>
            {cloudAcceptanceItems.map((item) => {
              const checked = acceptance.includes(item.id);
              return (
                <label
                  key={item.id}
                  className="lesson-row"
                  style={{ cursor: 'pointer', alignItems: 'flex-start' }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAcceptance(item.id)}
                    style={{ accentColor: 'var(--accent)', marginTop: 3, width: 15, height: 15 }}
                  />
                  <span style={{ minWidth: 0 }}>
                    <span className="small" style={{ color: checked ? 'var(--text-dim)' : 'var(--text)' }}>
                      {item.text}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="divider" />

          {transformed ? (
            <div className="hstack">
              <span className="badge ok">云网络转型完成</span>
              <span className="small muted">
                L4 课时已全部完成、验收清单全部勾选。继续方向：多云治理与平台化运维，或云原生安全。
              </span>
              <span className="spacer" />
              <Link to="/quiz" className="btn btn-sm">
                去综合测验
              </Link>
            </div>
          ) : (
            <div className="hstack">
              <span className="small muted">
                当前进度：L4 课时 {completedLessons}/{totalLessons}，验收 {checkedCount}/
                {cloudAcceptanceItems.length}，模块小测达标 {metModules}/{allCloudModuleIds.length}。
                {!allLessonsDone ? ' 完成全部 L4 课时并勾选验收项后，这里会显示「云网络转型完成」。' : ''}
                {metModules < allCloudModuleIds.length
                  ? ' 各模块小测需达到达标线（P0 建议更高），全部达标后才会显示「云网络转型完成」。'
                  : ''}
              </span>
              <span className="spacer" />
              <Link to="/module/m22" className="btn btn-sm">
                去做 M22 综合设计 <Icon name="arrowRight" size={12} />
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
