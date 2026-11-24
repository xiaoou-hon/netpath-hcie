import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { LabResource } from '@/data/lab/library';
import { labResources } from '@/data/lab/library';
import { getScenario } from '@/data/lab/scenarios';
import { CopyButton, EmptyState, Icon } from '@/components/ui';
import { DocumentImportModal } from '@/components/lab/DocumentImportModal';
import { loadImportedManuals, removeImportedManual } from '@/lib/imported-store';
import type { DocKind, ImportedManual } from '@/types/import';

type Filter = 'all' | 'local' | 'github';

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'local', label: '本地手册' },
  { value: 'github', label: 'GitHub 资源' },
];

const kindLabels: Record<LabResource['kind'], string> = {
  local: '本地手册',
  github: 'GitHub',
};

/** 导入手册在列表中额外带一个 kind 判别字段，不修改 library.ts 类型 */
type ImportedManualItem = ImportedManual & { kind: 'imported' };
type LibraryItem = LabResource | ImportedManualItem;

function itemKindLabel(item: LibraryItem): string {
  if (item.kind === 'imported') return '导入';
  return kindLabels[item.kind];
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ensp-library-section">
      <h3 className="ensp-library-h3">{title}</h3>
      {children}
    </section>
  );
}

function TagList({ tags }: { tags: string[] }) {
  return (
    <div className="ensp-library-tags">
      {tags.map((tag) => (
        <span className="ensp-library-tag" key={tag}>
          {tag}
        </span>
      ))}
    </div>
  );
}

/* ----------------------- 实验手册统一三区块渲染 ----------------------- */

interface ManualStepView {
  title: string;
  text: string;
  commands?: string[];
  device?: string;
}

interface ManualKeyCommandView {
  command: string;
  device?: string;
  text?: string;
}

/**
 * 实验步骤 / 关键命令 / 验证标准 三区块，built-in 与导入手册共用，保证视觉统一。
 */
function ManualDetailBody({
  steps,
  keyCommands,
  acceptance,
}: {
  steps: ManualStepView[];
  keyCommands: ManualKeyCommandView[];
  acceptance: string[];
}) {
  return (
    <>
      <Section title="实验步骤">
        {steps.length === 0 ? (
          <p className="small muted">暂无实验步骤。</p>
        ) : (
          <ol className="ensp-library-steps">
            {steps.map((step, index) => (
              <li className="ensp-library-step" key={index}>
                <span className="ensp-library-step-num" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="ensp-library-step-body">
                  <div className="ensp-library-step-title">
                    <span>{step.title || `步骤 ${index + 1}`}</span>
                    {step.device ? <span className="badge">{step.device}</span> : null}
                  </div>
                  <p className="small muted ensp-library-text">{step.text}</p>
                  {step.commands?.length ? (
                    <pre className="ensp-library-code mono">{step.commands.join('\n')}</pre>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="关键命令">
        {keyCommands.length === 0 ? (
          <p className="small muted">暂未识别到关键命令。</p>
        ) : (
          <div className="vstack" style={{ gap: 8 }}>
            {keyCommands.map((item, index) => (
              <div className="ensp-library-command" key={index}>
                <div className="ensp-library-command-head">
                  {item.device ? <span className="badge accent">{item.device}</span> : null}
                  <code className="mono">{item.command}</code>
                  <span className="spacer" />
                  <CopyButton text={item.command} small />
                </div>
                {item.text ? <div className="tiny faint">{item.text}</div> : null}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="验证标准">
        {acceptance.length === 0 ? (
          <p className="small muted">暂未提供验收标准，请按实验步骤完成配置后自行验证。</p>
        ) : (
          <ol className="ensp-library-acceptance">
            {acceptance.map((text, index) => (
              <li key={index}>
                <span className="ensp-check-dot pass" aria-hidden="true" />
                <span className="small muted">{text}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </>
  );
}

function LocalManual({
  scenarioId,
  onStart,
  onAskAi,
}: {
  scenarioId: string;
  onStart: () => void;
  onAskAi: () => void;
}) {
  const scenario = getScenario(scenarioId);
  if (!scenario) {
    return <p className="small muted">未找到该实验对应的场景数据。</p>;
  }

  const deviceName = (id: string) =>
    scenario.devices.find((device) => device.id === id)?.name ?? id;

  const checks = scenario.ensp?.checks ?? [];
  const uniqueChecks: ManualKeyCommandView[] = [];
  const seen = new Set<string>();
  for (const check of checks) {
    if (seen.has(check.command)) continue;
    seen.add(check.command);
    uniqueChecks.push({
      command: check.command,
      text: check.text,
      device: deviceName(check.deviceId),
    });
  }

  const acceptanceTexts =
    scenario.acceptance.length > 0
      ? scenario.acceptance
      : checks.map((check) => check.text);

  const steps: ManualStepView[] = scenario.steps.map((step) => ({
    title: step.title,
    text: step.text,
    commands: step.commands,
    device: step.deviceId ? deviceName(step.deviceId) : undefined,
  }));

  return (
    <div className="vstack" style={{ gap: 16 }}>
      <Section title="实验目标">
        <p className="small muted ensp-library-text">{scenario.summary}</p>
        <div className="ensp-library-meta">
          <span className="badge">难度 {scenario.level}</span>
          <span className="tiny faint">
            {scenario.devices.length} 台设备 · {scenario.steps.length} 个步骤
          </span>
        </div>
      </Section>

      <ManualDetailBody steps={steps} keyCommands={uniqueChecks} acceptance={acceptanceTexts} />

      <div className="ensp-library-actions ensp-library-hide-print">
        <button type="button" className="btn btn-sm btn-primary" onClick={onStart}>
          开始这个实验
        </button>
        <button type="button" className="btn btn-sm" onClick={onAskAi}>
          让 AI 讲解
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => window.print()}>
          打印/导出 PDF
        </button>
      </div>
    </div>
  );
}

function ImportedManualDetail({
  manual,
  onDeleted,
  onClose,
}: {
  manual: ImportedManualItem;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const uniqueCommands = useMemo(
    () => Array.from(new Set(manual.keyCommands)),
    [manual.keyCommands],
  );

  const handleDelete = () => {
    removeImportedManual(manual.id);
    onDeleted();
    onClose();
  };

  return (
    <div className="vstack" style={{ gap: 16 }}>
      <Section title="实验目标">
        <p className="small muted ensp-library-text">{manual.summary || '暂无摘要'}</p>
        <div className="ensp-library-meta">
          <span className="badge accent">导入</span>
          <span className="badge">{manual.level}</span>
          {manual.tags.length ? <TagList tags={manual.tags} /> : null}
          <span className="tiny faint">来源：{manual.source}</span>
        </div>
      </Section>

      <ManualDetailBody
        steps={manual.steps.map((s) => ({ title: s.title, text: s.text, commands: s.commands }))}
        keyCommands={uniqueCommands.map((c) => ({ command: c }))}
        acceptance={manual.acceptance}
      />

      <div className="ensp-library-actions ensp-library-hide-print">
        <button type="button" className="btn btn-sm btn-danger" onClick={handleDelete}>
          删除
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => window.print()}>
          打印/导出 PDF
        </button>
      </div>
    </div>
  );
}

function GithubDetail({ resource, onPractice }: { resource: LabResource; onPractice: () => void }) {
  return (
    <div className="vstack" style={{ gap: 14 }}>
      <p className="small muted ensp-library-text">{resource.summary}</p>

      <div className="ensp-library-meta">
        <span className="badge">许可：{resource.license ?? '未标注'}</span>
        {resource.note ? <span className="tiny faint">{resource.note}</span> : null}
      </div>

      <TagList tags={resource.tags} />

      <div className="ensp-library-actions ensp-library-hide-print">
        {resource.url ? (
          <a
            className="btn btn-sm btn-primary"
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            在 GitHub 打开
          </a>
        ) : null}
        {resource.scenarioId ? (
          <button type="button" className="btn btn-sm" onClick={onPractice}>
            在实验室练习
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function LabLibraryPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [importedTick, setImportedTick] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [importKind, setImportKind] = useState<DocKind>('manual');
  const titleRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // 合并导入手册与内置资源；importedTick 变化时重新读取 localStorage
  const all = useMemo<LibraryItem[]>(() => {
    const imported = loadImportedManuals().map(
      (m) => ({ ...m, kind: 'imported' as const }) satisfies ImportedManualItem,
    );
    return [...imported, ...labResources];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importedTick]);

  const list = useMemo(
    () =>
      all.filter((item) => {
        if (filter === 'all') return true;
        if (filter === 'local') return item.kind === 'local' || item.kind === 'imported';
        return item.kind === filter;
      }),
    [all, filter],
  );

  const refreshImported = () => setImportedTick((t) => t + 1);

  const close = () => {
    setSelected(null);
    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (trigger) trigger.focus();
  };

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // close 只依赖 setSelected 与 ref，保持与 selected 同步即可
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const timer = window.setTimeout(() => titleRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [selected]);

  const openDetail = (resource: LibraryItem, trigger: HTMLElement | null) => {
    triggerRef.current = trigger;
    setSelected(resource);
  };

  const openImport = () => {
    setImportKind('manual');
    setModalOpen(true);
  };

  return (
    <div className="fade-up">
      <h1 className="page-title">实验手册</h1>
      <p className="page-sub" style={{ marginBottom: 14 }}>
        本地手册按步骤在实验室里做；外部资源仅提供链接，遵循各自许可证。可导入 Word / PDF 文档自动生成本地手册。
      </p>

      <div className="tabs" role="tablist" aria-label="实验室模式" style={{ marginBottom: 14 }}>
        <Link to="/lab" role="tab" aria-selected="false" className="tab">
          故障排查
        </Link>
        <Link to="/lab/ensp" role="tab" aria-selected="false" className="tab">
          eNSP 真机
        </Link>
        <Link to="/lab/library" role="tab" aria-selected="true" className="tab active">
          实验手册
        </Link>
      </div>

      <div
        className="hstack"
        style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}
      >
        <div style={{ flex: '1 1 auto', minWidth: 0, maxWidth: '100%', overflowX: 'auto' }}>
          <div className="tabs" role="tablist" aria-label="实验手册筛选">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={filter === item.value}
                className={`tab${filter === item.value ? ' active' : ''}`}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-sm btn-primary" onClick={openImport}>
          导入文档
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState title="没有符合条件的资源" hint="试试切换到「全部」查看完整列表。" />
      ) : (
        <div className="ensp-library-grid">
          {list.map((resource) => {
            const isImported = resource.kind === 'imported';
            return (
              <button
                key={resource.id}
                type="button"
                className="card hoverable ensp-library-card"
                onClick={(event) => openDetail(resource, event.currentTarget)}
                aria-label={`查看「${resource.title}」详情`}
              >
                <div className="ensp-library-card-top">
                  <span className="badge accent">{itemKindLabel(resource)}</span>
                  <span className="badge">{resource.level}</span>
                  <span className="spacer" />
                  <Icon
                    name={isImported ? 'book' : resource.kind === 'local' ? 'book' : 'layers'}
                    size={15}
                  />
                </div>

                <div className="ensp-library-card-title">{resource.title}</div>

                <TagList tags={resource.tags} />

                <div className="small muted ensp-library-card-summary">{resource.summary}</div>

                {isImported ? (
                  <div className="tiny faint">来源：{resource.source}</div>
                ) : resource.license ? (
                  <div className="tiny faint">许可：{resource.license}</div>
                ) : null}

                <div className="ensp-library-card-more">
                  查看详情 <Icon name="arrowRight" size={12} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected ? (
        <div className="ensp-library-layer">
          <div className="ensp-library-backdrop" onClick={close} aria-hidden="true" />
          <div
            className="ensp-library-dialog ensp-library-print"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ensp-library-title"
          >
            <div className="ensp-library-toolbar ensp-library-hide-print">
              <span className="badge accent">{itemKindLabel(selected)}</span>
              <span className="badge">{selected.level}</span>
              <span className="spacer" />
              <button type="button" className="icon-btn" onClick={close} aria-label="关闭手册详情">
                <Icon name="close" size={16} />
              </button>
            </div>

            <h2 className="ensp-library-title" id="ensp-library-title" ref={titleRef} tabIndex={-1}>
              {selected.title}
            </h2>

            {selected.kind === 'imported' ? (
              <ImportedManualDetail
                manual={selected}
                onDeleted={refreshImported}
                onClose={close}
              />
            ) : selected.kind === 'local' ? (
              selected.scenarioId ? (
                <LocalManual
                  scenarioId={selected.scenarioId}
                  onStart={() => navigate(`/lab/ensp?scenario=${selected.scenarioId}`)}
                  onAskAi={() => navigate(`/lab/ensp?scenario=${selected.scenarioId}&ai=1`)}
                />
              ) : (
                <p className="small muted">该资源未关联实验场景。</p>
              )
            ) : (
              <GithubDetail
                resource={selected}
                onPractice={() => {
                  if (selected.scenarioId) navigate(`/lab/ensp?scenario=${selected.scenarioId}`);
                }}
              />
            )}
          </div>
        </div>
      ) : null}

      <DocumentImportModal
        open={modalOpen}
        initialKind={importKind}
        onClose={() => setModalOpen(false)}
        onSaved={(kind) => {
          if (kind === 'manual') refreshImported();
        }}
      />
    </div>
  );
}
