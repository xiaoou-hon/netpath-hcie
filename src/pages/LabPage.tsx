import { useState } from 'react';
import { Link } from 'react-router-dom';
import { lessonById } from '@/data/curriculum';
import { troubleshootCases, type TroubleshootCase } from '@/data/lab/troubleshooting';
import { DocumentImportModal } from '@/components/lab/DocumentImportModal';
import type { DocKind, ImportedTroubleshootCase } from '@/types/import';
import { loadImportedTroubleshoot, removeImportedTroubleshoot } from '@/lib/imported-store';

const STORAGE_KEY = 'netpath:troubleshoot';

type AnyCase = TroubleshootCase | ImportedTroubleshootCase;

function loadCompleted(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return {};
    const result: Record<string, boolean> = {};
    for (const id of parsed) {
      if (typeof id === 'string') result[id] = true;
    }
    return result;
  } catch {
    return {};
  }
}

function saveCompleted(next: Record<string, boolean>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.keys(next)));
  } catch {
    /* 存储不可用时忽略 */
  }
}

/** 内置判分案例与导入只读案例的类型收窄：导入案例的 imported 恒为 true */
function isImportedCase(c: AnyCase): c is ImportedTroubleshootCase {
  return c.imported === true;
}

/** 案例解析 · 五段式：现象 / 排查步骤 / 根因分析 / 解决方案 / 规避措施 */
function CaseAnalysis({ data }: { data: AnyCase }) {
  return (
    <div className="vstack" style={{ gap: 14, marginTop: 4 }}>
      <div>
        <div className="tiny faint" style={{ marginBottom: 6 }}>故障现象</div>
        <p className="small muted" style={{ lineHeight: 1.8, margin: 0 }}>
          {data.symptom}
        </p>
      </div>
      <div>
        <div className="tiny faint" style={{ marginBottom: 6 }}>排查步骤</div>
        <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--text-dim)' }}>
          {data.triageSteps.map((step, index) => (
            <li key={index} className="small" style={{ lineHeight: 1.8 }}>
              {step}
            </li>
          ))}
        </ol>
      </div>
      <div>
        <div className="tiny faint" style={{ marginBottom: 6 }}>根因分析</div>
        <p className="small muted" style={{ lineHeight: 1.8, margin: 0 }}>
          {data.rootCauseAnalysis}
        </p>
      </div>
      <div>
        <div className="tiny faint" style={{ marginBottom: 6 }}>解决方案</div>
        <div className="code-block">
          <pre className="code-body">{data.solution}</pre>
        </div>
      </div>
      <div>
        <div className="tiny faint" style={{ marginBottom: 6 }}>规避措施</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-dim)' }}>
          {data.prevention.map((item, index) => (
            <li key={index} className="small" style={{ lineHeight: 1.8 }}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function LabPage() {
  const [cases, setCases] = useState<AnyCase[]>(() => [
    ...troubleshootCases,
    ...loadImportedTroubleshoot(),
  ]);
  const [importOpen, setImportOpen] = useState(false);
  const [caseId, setCaseId] = useState<string>(troubleshootCases[0].id);
  const current = cases.find((item) => item.id === caseId) ?? cases[0];

  const [rootChoice, setRootChoice] = useState<string | null>(null);
  const [repairs, setRepairs] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [completed, setCompleted] = useState<Record<string, boolean>>(loadCompleted);

  const currentIsImported = isImportedCase(current);
  const builtinCase = currentIsImported ? null : current;

  const rootCorrect = builtinCase ? rootChoice === builtinCase.answer : false;
  const repairsCorrect = builtinCase
    ? repairs.length === builtinCase.correctRepairs.length &&
      repairs.every((id) => builtinCase.correctRepairs.includes(id))
    : false;
  const passed = rootCorrect && repairsCorrect;

  const lesson = builtinCase?.lessonId ? lessonById.get(builtinCase.lessonId) : undefined;
  const completedCount = troubleshootCases.filter((item) => completed[item.id]).length;
  const currentIndex = cases.findIndex((item) => item.id === current.id);

  const resetAnswer = () => {
    setRootChoice(null);
    setRepairs([]);
    setSubmitted(false);
    setShowHint(false);
  };

  const selectCase = (id: string) => {
    if (id === current.id) return;
    setCaseId(id);
    resetAnswer();
  };

  const toggleRepair = (id: string) => {
    if (submitted) return;
    setRepairs((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const submit = () => {
    if (!rootChoice || repairs.length === 0 || !builtinCase) return;
    setSubmitted(true);
    if (!passed) return;
    setCompleted((prev) => {
      if (prev[builtinCase.id]) return prev;
      const next = { ...prev, [builtinCase.id]: true };
      saveCompleted(next);
      return next;
    });
  };

  const nextCase = () => {
    const next = cases[(currentIndex + 1) % cases.length];
    setCaseId(next.id);
    resetAnswer();
  };

  const handleDeleteImported = (id: string) => {
    const remaining = removeImportedTroubleshoot(id);
    setCases([...troubleshootCases, ...remaining]);
    if (current.id === id) {
      resetAnswer();
      setCaseId(troubleshootCases[0].id);
    }
  };

  const refreshImportedCases = () => {
    const imported = loadImportedTroubleshoot();
    setCases([...troubleshootCases, ...imported]);
    if (imported[0]) {
      setCaseId(imported[0].id);
      resetAnswer();
    }
  };

  const correctRepairItems = builtinCase
    ? builtinCase.repairs.filter((item) => builtinCase.correctRepairs.includes(item.id))
    : [];

  return (
    <div className="fade-up">
      <h1 className="page-title">故障排查实训</h1>
      <p className="page-sub" style={{ marginBottom: 16 }}>
        阅读故障现象与现场证据，先定位根因，再选出正确的修复动作；提交后自动判分并给出解析。
      </p>

      <div className="tabs" role="tablist" aria-label="实验室模式" style={{ marginBottom: 14 }}>
        <Link to="/lab" role="tab" aria-selected="true" className="tab active">
          故障排查
        </Link>
        <Link to="/lab/ensp" role="tab" aria-selected="false" className="tab">
          eNSP 真机
        </Link>
        <Link to="/lab/library" role="tab" aria-selected="false" className="tab">
          实验手册
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <span className="tiny faint">
          已通关 {completedCount} / {troubleshootCases.length} 个案例
        </span>
        {lesson ? (
          <Link className="chip" to={`/lesson/${lesson.id}`} style={{ fontSize: 11.5 }}>
            相关课时：{lesson.title}
          </Link>
        ) : null}
        <span className="spacer" />
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => setImportOpen(true)}
        >
          导入案例
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {cases.map((item) => {
          const active = item.id === current.id;
          const imported = isImportedCase(item);
          const done = !imported && Boolean(completed[item.id]);
          return (
            <button
              key={item.id}
              type="button"
              className="card hoverable"
              onClick={() => selectCase(item.id)}
              aria-pressed={active}
              style={{
                flex: '1 1 210px',
                minWidth: 0,
                textAlign: 'left',
                padding: 14,
                font: 'inherit',
                color: 'inherit',
                cursor: 'pointer',
                borderColor: active ? 'var(--accent)' : undefined,
                background: active ? 'var(--accent-soft)' : undefined,
              }}
            >
              <div className="hstack" style={{ justifyContent: 'space-between', gap: 8 }}>
                <span className="badge" data-depth={item.level}>{item.level}</span>
                {imported ? (
                  <span className="badge accent">导入</span>
                ) : done ? (
                  <span className="badge ok">已通关</span>
                ) : null}
              </div>
              <div style={{ fontWeight: 650, marginTop: 8 }}>{item.title}</div>
              <div className="small muted" style={{ marginTop: 4, lineHeight: 1.6 }}>{item.summary}</div>
            </button>
          );
        })}
      </div>

      {currentIsImported ? (
        <div className="card" style={{ padding: 16, marginTop: 14 }}>
          <div className="hstack" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div className="card-title">案例解析 · 五段式</div>
            <div className="hstack" style={{ gap: 8 }}>
              <span className="badge accent">导入案例 · 只读</span>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => handleDeleteImported(current.id)}
              >
                删除
              </button>
            </div>
          </div>
          {current.source ? (
            <div className="tiny faint" style={{ marginTop: 6 }}>来源文件：{current.source}</div>
          ) : null}
          <div style={{ marginTop: 12 }}>
            <CaseAnalysis data={current} />
          </div>
        </div>
      ) : (
        <>
          <div
            style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start', marginTop: 14 }}
          >
            <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="card" style={{ padding: 16 }}>
                <div className="card-title">故障现象</div>
                <p className="small muted" style={{ marginTop: 8, lineHeight: 1.8 }}>
                  {current.symptom}
                </p>
                <div className="hstack" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setShowHint((value) => !value)}
                    aria-expanded={showHint}
                  >
                    {showHint ? '收起提示' : '查看提示'}
                  </button>
                </div>
                {showHint ? (
                  <p className="tiny faint" style={{ marginTop: 10, lineHeight: 1.7 }}>
                    {current.hint}
                  </p>
                ) : null}
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div className="card-title">现场证据</div>
                <div className="vstack" style={{ gap: 12, marginTop: 10 }}>
                  {current.evidence.map((item) => (
                    <div key={item.title}>
                      <div className="tiny faint" style={{ marginBottom: 6 }}>{item.title}</div>
                      <div className="code-block">
                        <pre className="code-body">{item.text}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="card" style={{ padding: 16 }}>
                <div className="card-title">第 1 步 · 定位根因</div>
                <div className="vstack" role="radiogroup" aria-label="候选根因" style={{ gap: 8, marginTop: 10 }}>
                  {current.rootCauses.map((option) => {
                    const checked = rootChoice === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        disabled={submitted}
                        onClick={() => setRootChoice(option.id)}
                        className="hstack"
                        style={{
                          gap: 10,
                          alignItems: 'flex-start',
                          textAlign: 'left',
                          padding: '10px 12px',
                          font: 'inherit',
                          color: 'inherit',
                          cursor: submitted ? 'default' : 'pointer',
                          borderRadius: 10,
                          border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                          background: checked ? 'var(--accent-soft)' : 'transparent',
                          opacity: submitted && !checked ? 0.7 : 1,
                        }}
                      >
                        <span className={`check-dot${checked ? ' done' : ''}`} aria-hidden="true">✓</span>
                        <span className="small" style={{ lineHeight: 1.6 }}>{option.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div className="card-title">第 2 步 · 选择修复动作</div>
                <p className="tiny faint" style={{ marginTop: 6 }}>可多选，只有全部选对才算通过。</p>
                <div className="vstack" role="group" aria-label="修复动作" style={{ gap: 8, marginTop: 10 }}>
                  {current.repairs.map((option) => {
                    const checked = repairs.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        disabled={submitted}
                        onClick={() => toggleRepair(option.id)}
                        className="hstack"
                        style={{
                          gap: 10,
                          alignItems: 'flex-start',
                          textAlign: 'left',
                          padding: '10px 12px',
                          font: 'inherit',
                          color: 'inherit',
                          cursor: submitted ? 'default' : 'pointer',
                          borderRadius: 10,
                          border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                          background: checked ? 'var(--accent-soft)' : 'transparent',
                          opacity: submitted && !checked ? 0.7 : 1,
                        }}
                      >
                        <span className={`check-dot${checked ? ' done' : ''}`} aria-hidden="true">✓</span>
                        <span className="small" style={{ lineHeight: 1.6 }}>{option.text}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="hstack" style={{ marginTop: 12, gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={submit}
                    disabled={submitted || !rootChoice || repairs.length === 0}
                  >
                    提交判断
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={resetAnswer}
                    disabled={!rootChoice && repairs.length === 0 && !submitted}
                  >
                    重置本题
                  </button>
                </div>
              </div>

              {submitted ? (
                <div
                  className={passed ? 'block-tip' : 'card'}
                  role="status"
                  aria-live="polite"
                  style={
                    passed
                      ? { padding: 16 }
                      : {
                          padding: 16,
                          borderColor: 'rgba(248, 113, 113, 0.4)',
                          background: 'var(--danger-soft)',
                        }
                  }
                >
                  <div className="block-label" style={passed ? undefined : { color: 'var(--danger)' }}>
                    {passed ? '排查通过' : '还没有定位准确'}
                  </div>
                  <div className="vstack" style={{ gap: 6 }}>
                    <div className="small" style={{ lineHeight: 1.7 }}>
                      根因判断：{rootCorrect ? '正确' : '错误'}
                    </div>
                    <div className="small" style={{ lineHeight: 1.7 }}>
                      修复动作：{repairsCorrect ? '全部正确' : `选对 ${repairs.filter((id) => current.correctRepairs.includes(id)).length} / ${current.correctRepairs.length} 项`}
                    </div>
                  </div>
                  <p className="small muted" style={{ marginTop: 10, lineHeight: 1.8 }}>
                    {current.explanation}
                  </p>
                  <div className="tiny faint" style={{ marginTop: 10 }}>参考修复命令</div>
                  <div className="code-block" style={{ marginTop: 6 }}>
                    <pre className="code-body">
                      {correctRepairItems
                        .map((item) => (item.command ? `# ${item.text}\n${item.command}` : `# ${item.text}`))
                        .join('\n\n')}
                    </pre>
                  </div>
                  <div className="hstack" style={{ marginTop: 12, gap: 8, flexWrap: 'wrap' }}>
                    {passed ? (
                      <button type="button" className="btn btn-sm btn-primary" onClick={nextCase}>
                        下一个案例
                      </button>
                    ) : (
                      <button type="button" className="btn btn-sm btn-primary" onClick={resetAnswer}>
                        再试一次
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="card" style={{ padding: 16, marginTop: 14 }}>
            <div className="card-title">案例解析 · 五段式</div>
            <div style={{ marginTop: 12 }}>
              <CaseAnalysis data={current} />
            </div>
          </div>
        </>
      )}

      <DocumentImportModal
        open={importOpen}
        initialKind="troubleshoot"
        onClose={() => setImportOpen(false)}
        onSaved={(kind: DocKind) => {
          if (kind === 'troubleshoot') refreshImportedCases();
        }}
      />
    </div>
  );
}
