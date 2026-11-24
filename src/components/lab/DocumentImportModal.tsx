import { useEffect, useMemo, useRef, useState } from 'react';
import { importDocument } from '@/lib/bridge/client';
import { addImportedManual, addImportedTroubleshoot, newImportId } from '@/lib/imported-store';
import { Icon, Segmented, toast } from '@/components/ui';
import type {
  DocKind,
  DocumentParseResult,
  ImportedManual,
  ImportedTroubleshootCase,
} from '@/types/import';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MiB
const ALLOWED_EXT = new Set(['docx', 'doc', 'pdf']);

type Phase = 'select' | 'parsing' | 'preview';

const KIND_OPTIONS: { value: DocKind; label: string }[] = [
  { value: 'troubleshoot', label: '故障排查案例' },
  { value: 'manual', label: '实验手册' },
];

/** 按换行拆分、去除空行并 trim，用于 triageSteps / prevention / 步骤覆盖等文本域 */
function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function typeLabel(type: DocumentParseResult['type']): string {
  if (type === 'pdf') return 'PDF';
  if (type === 'doc') return 'Word (.doc)';
  return 'Word (.docx)';
}

interface DocumentImportModalProps {
  open: boolean;
  initialKind: DocKind;
  onClose: () => void;
  onSaved: (kind: DocKind) => void;
}

export function DocumentImportModal({ open, initialKind, onClose, onSaved }: DocumentImportModalProps) {
  const [kind, setKind] = useState<DocKind>(initialKind);
  const [phase, setPhase] = useState<Phase>('select');
  const [result, setResult] = useState<DocumentParseResult | null>(null);
  const [filename, setFilename] = useState('');

  // 可编辑字段（初始值来自解析结果）
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [tsSymptom, setTsSymptom] = useState('');
  const [tsTriage, setTsTriage] = useState('');
  const [tsRootCause, setTsRootCause] = useState('');
  const [tsSolution, setTsSolution] = useState('');
  const [tsPrevention, setTsPrevention] = useState('');
  const [manualSteps, setManualSteps] = useState('');
  const [manualAcceptance, setManualAcceptance] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const resetState = () => {
    setPhase('select');
    setResult(null);
    setFilename('');
    setEditTitle('');
    setEditSummary('');
    setTsSymptom('');
    setTsTriage('');
    setTsRootCause('');
    setTsSolution('');
    setTsPrevention('');
    setManualSteps('');
    setManualAcceptance('');
    if (inputRef.current) inputRef.current.value = '';
  };

  // 打开时同步目标库；关闭时重置内部状态并取消进行中的请求
  useEffect(() => {
    if (open) {
      setKind(initialKind);
      resetState();
    } else {
      abortRef.current?.abort();
      abortRef.current = null;
      resetState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 同步 initialKind（父组件重新打开时可能变化）
  useEffect(() => {
    if (open) setKind(initialKind);
  }, [initialKind, open]);

  // Escape 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    onClose();
  };

  const handleKindChange = (next: DocKind) => {
    if (next === kind) return;
    setKind(next);
    // 切换目标库需要重新解析，丢弃当前预览
    if (phase !== 'select') {
      setPhase('select');
      setResult(null);
    }
  };

  const pickFile = () => inputRef.current?.click();

  const validateFile = (file: File): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXT.has(ext)) {
      toast('仅支持 .docx / .doc / .pdf 格式的文件');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast('文件大小不能超过 20 MiB');
      return false;
    }
    return true;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    if (!validateFile(file)) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setFilename(file.name);
    setPhase('parsing');

    try {
      const buffer = await file.arrayBuffer();
      const parsed = await importDocument(file.name, buffer, kind, { signal: controller.signal });
      setResult(parsed);
      setEditTitle(parsed.title ?? '');
      setEditSummary(parsed.summary ?? '');
      if (kind === 'troubleshoot') {
        setTsSymptom(parsed.symptom ?? '');
        setTsTriage((parsed.triageSteps ?? []).join('\n'));
        setTsRootCause(parsed.rootCauseAnalysis ?? '');
        setTsSolution(parsed.solution ?? '');
        setTsPrevention((parsed.prevention ?? []).join('\n'));
      } else {
        setManualSteps((parsed.steps ?? []).map((s) => s.text).join('\n'));
        setManualAcceptance((parsed.acceptance ?? []).join('\n'));
      }
      setPhase('preview');
    } catch (error) {
      if (controller.signal.aborted) return;
      toast(error instanceof Error ? error.message : '文档解析失败，请稍后重试');
      setPhase('select');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const uniqueKeyCommands = useMemo(
    () => (result ? Array.from(new Set(result.keyCommands ?? [])) : []),
    [result],
  );

  const handleConfirm = () => {
    if (!result) return;
    const source = filename || result.filename;
    const finalTitle = editTitle.trim() || source;

    if (kind === 'troubleshoot') {
      const item: ImportedTroubleshootCase = {
        id: newImportId('tshoot'),
        imported: true,
        source,
        createdAt: Date.now(),
        title: finalTitle,
        summary: editSummary,
        level: '了解',
        symptom: tsSymptom,
        triageSteps: splitLines(tsTriage),
        rootCauseAnalysis: tsRootCause,
        solution: tsSolution,
        prevention: splitLines(tsPrevention),
      };
      addImportedTroubleshoot(item);
    } else {
      const stepLines = splitLines(manualSteps);
      const steps = stepLines.length
        ? stepLines.map((text) => ({
            title: text.length > 30 ? `${text.slice(0, 30)}…` : text,
            text,
            commands: [] as string[],
          }))
        : result.steps ?? [];
      const accLines = splitLines(manualAcceptance);
      const acceptance = accLines.length ? accLines : result.acceptance ?? [];
      const item: ImportedManual = {
        id: newImportId('manual'),
        imported: true,
        source,
        createdAt: Date.now(),
        title: finalTitle,
        summary: editSummary,
        level: '进阶',
        tags: ['导入'],
        steps,
        keyCommands: result.keyCommands ?? [],
        acceptance,
      };
      addImportedManual(item);
    }

    toast(`已导入「${finalTitle}」`);
    onSaved(kind);
    handleClose();
  };

  if (!open) return null;

  return (
    <div className="doc-import-layer">
      <div className="doc-import-backdrop" onClick={handleClose} aria-hidden="true" />
      <div
        className="doc-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="doc-import-title"
      >
        <div className="doc-import-toolbar">
          <h2 className="doc-import-title" id="doc-import-title">
            导入文档
          </h2>
          <span className="spacer" />
          <button
            type="button"
            className="icon-btn"
            onClick={handleClose}
            aria-label="关闭导入"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="doc-import-kind">
          <Segmented<DocKind>
            options={KIND_OPTIONS}
            value={kind}
            onChange={handleKindChange}
            ariaLabel="目标库"
          />
          <span className="tiny faint">
            解析结果将关联到{kind === 'troubleshoot' ? '故障排查案例库' : '实验手册库'}
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".docx,.doc,.pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {phase === 'select' ? (
          <div className="doc-import-dropzone" onClick={pickFile} role="button" tabIndex={0}>
            <Icon name="book" size={28} />
            <div className="doc-import-dropzone-title">点击选择 Word / PDF 文档</div>
            <div className="tiny faint">支持 .docx / .doc / .pdf，单文件不超过 20 MiB</div>
            <button type="button" className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); pickFile(); }}>
              选择文件
            </button>
          </div>
        ) : null}

        {phase === 'parsing' ? (
          <div className="doc-import-loading">
            <div className="doc-import-spinner" aria-hidden="true" />
            <div className="small muted">正在解析「{filename}」…</div>
            <div className="tiny faint">文档解析可能需要数秒，请稍候</div>
          </div>
        ) : null}

        {phase === 'preview' && result ? (
          <div className="vstack" style={{ gap: 14 }}>
            <div className="doc-import-summary">
              <div className="doc-import-summary-main">
                <div className="doc-import-filename" title={filename}>{filename}</div>
                <div className="doc-import-stats">
                  <span className="badge">{typeLabel(result.type)}</span>
                  <span className="tiny faint">{result.stats.chars} 字符</span>
                  <span className="tiny faint">{result.stats.sections} 段</span>
                  <span className="tiny faint">{result.stats.commands} 命令</span>
                </div>
              </div>
              {result.warnings.length > 0 ? (
                <div className="doc-import-warning" role="alert">
                  <strong>部分字段未自动识别，请检查补全</strong>
                  <ul>
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {kind === 'troubleshoot' ? (
              <div className="doc-import-grid">
                <div className="doc-import-field doc-import-span-2">
                  <label className="doc-import-label" htmlFor="di-title">标题</label>
                  <input
                    id="di-title"
                    className="doc-import-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="未识别到标题，将默认使用文件名"
                  />
                </div>
                <div className="doc-import-field doc-import-span-2">
                  <label className="doc-import-label" htmlFor="di-summary">摘要</label>
                  <textarea
                    id="di-summary"
                    className="doc-import-textarea"
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    placeholder="一句话描述该案例"
                  />
                </div>
                <div className="doc-import-field doc-import-span-2">
                  <label className="doc-import-label" htmlFor="di-symptom">故障现象</label>
                  <textarea
                    id="di-symptom"
                    className="doc-import-textarea"
                    value={tsSymptom}
                    onChange={(e) => setTsSymptom(e.target.value)}
                    placeholder="描述故障表现"
                  />
                </div>
                <div className="doc-import-field doc-import-span-2">
                  <label className="doc-import-label" htmlFor="di-triage">排查步骤（每行一步）</label>
                  <textarea
                    id="di-triage"
                    className="doc-import-textarea"
                    value={tsTriage}
                    onChange={(e) => setTsTriage(e.target.value)}
                    placeholder={"1. 检查接口状态\n2. 查看路由表"}
                  />
                </div>
                <div className="doc-import-field doc-import-span-2">
                  <label className="doc-import-label" htmlFor="di-root">根因分析</label>
                  <textarea
                    id="di-root"
                    className="doc-import-textarea"
                    value={tsRootCause}
                    onChange={(e) => setTsRootCause(e.target.value)}
                    placeholder="分析故障根因"
                  />
                </div>
                <div className="doc-import-field doc-import-span-2">
                  <label className="doc-import-label" htmlFor="di-solution">解决方案</label>
                  <textarea
                    id="di-solution"
                    className="doc-import-textarea"
                    value={tsSolution}
                    onChange={(e) => setTsSolution(e.target.value)}
                    placeholder="修复命令或操作步骤"
                  />
                </div>
                <div className="doc-import-field doc-import-span-2">
                  <label className="doc-import-label" htmlFor="di-prevention">规避措施（每行一条）</label>
                  <textarea
                    id="di-prevention"
                    className="doc-import-textarea"
                    value={tsPrevention}
                    onChange={(e) => setTsPrevention(e.target.value)}
                    placeholder="如何避免同类问题"
                  />
                </div>
              </div>
            ) : (
              <div className="doc-import-grid">
                <div className="doc-import-field doc-import-span-2">
                  <label className="doc-import-label" htmlFor="di-title">标题</label>
                  <input
                    id="di-title"
                    className="doc-import-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="未识别到标题，将默认使用文件名"
                  />
                </div>
                <div className="doc-import-field doc-import-span-2">
                  <label className="doc-import-label" htmlFor="di-summary">摘要</label>
                  <textarea
                    id="di-summary"
                    className="doc-import-textarea"
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    placeholder="一句话描述该实验"
                  />
                </div>

                {(result.steps?.length ?? 0) > 0 ? (
                  <div className="doc-import-field doc-import-span-2">
                    <div className="doc-import-label">解析出的实验步骤（只读预览）</div>
                    <div className="doc-import-preview-list">
                      {result.steps!.map((step, i) => (
                        <div className="doc-import-preview-item" key={i}>
                          <div className="doc-import-preview-head">
                            <span className="doc-import-preview-num">{i + 1}</span>
                            <span className="small">{step.title || `步骤 ${i + 1}`}</span>
                          </div>
                          <p className="tiny faint" style={{ margin: '2px 0 0' }}>{step.text}</p>
                          {step.commands?.length ? (
                            <pre className="doc-import-preview-code">{step.commands.join('\n')}</pre>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {uniqueKeyCommands.length > 0 ? (
                  <div className="doc-import-field doc-import-span-2">
                    <div className="doc-import-label">关键命令（只读预览）</div>
                    <div className="doc-import-cmds">
                      {uniqueKeyCommands.map((cmd, i) => (
                        <code className="doc-import-cmd" key={i}>{cmd}</code>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="doc-import-field doc-import-span-2">
                  <label className="doc-import-label" htmlFor="di-steps">覆盖实验步骤（每行一步，留空则使用解析结果）</label>
                  <textarea
                    id="di-steps"
                    className="doc-import-textarea"
                    value={manualSteps}
                    onChange={(e) => setManualSteps(e.target.value)}
                    placeholder={"步骤一文本\n步骤二文本"}
                  />
                </div>
                <div className="doc-import-field doc-import-span-2">
                  <label className="doc-import-label" htmlFor="di-acceptance">覆盖验证标准（每行一条，留空则使用解析结果）</label>
                  <textarea
                    id="di-acceptance"
                    className="doc-import-textarea"
                    value={manualAcceptance}
                    onChange={(e) => setManualAcceptance(e.target.value)}
                    placeholder={"标准一\n标准二"}
                  />
                </div>
              </div>
            )}

            <details className="doc-import-raw">
              <summary>原始分段预览（{result.sections.length} 段）</summary>
              <div className="doc-import-raw-body">
                {result.sections.length === 0 ? (
                  <p className="tiny faint">未解析到分段内容。</p>
                ) : (
                  result.sections.map((section, i) => (
                    <div className="doc-import-raw-section" key={i}>
                      <div className="doc-import-raw-heading">{section.heading || `段落 ${i + 1}`}</div>
                      <pre className="doc-import-raw-content">
                        {section.content.length > 1200
                          ? `${section.content.slice(0, 1200)}…（已截断）`
                          : section.content}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </details>

            <div className="doc-import-actions">
              <button type="button" className="btn btn-sm" onClick={pickFile}>
                重新选择文件
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleConfirm}
                disabled={!editTitle.trim() && !filename}
              >
                确认导入
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
