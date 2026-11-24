import { CopyButton, Icon } from '@/components/ui';

export interface McpStep {
  name: string;
  ok: boolean;
  message: string;
}

export interface McpTopologyPanelProps {
  status: { available: boolean; command?: string; toolsCount?: number } | null;
  onGenerate: () => Promise<void>;
  generating: boolean;
  steps: McpStep[];
  topoPath?: string;
  error?: string;
}

const INSTALL_CMD =
  'git clone https://github.com/Heaxu/ensp-mcp.git && cd ensp-mcp && python -m pip install -e .';

export function McpTopologyPanel({
  status,
  onGenerate,
  generating,
  steps,
  topoPath,
  error,
}: McpTopologyPanelProps) {
  const available = Boolean(status?.available);

  return (
    <section className="card ensp-mcp" aria-label="MCP 拓扑生成">
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <div className="card-title">
          <Icon name="layers" size={16} />
          MCP 自动生成拓扑
        </div>
        {status ? (
          <span className={`badge ${available ? 'ok' : 'warn'}`}>{available ? '可用' : '未安装'}</span>
        ) : (
          <span className="badge">检测中</span>
        )}
      </div>

      {!available ? (
        <div className="vstack" style={{ marginTop: 10, gap: 8 }}>
          <div className="small muted">
            检测到本地 MCP 服务不可用。安装后可按场景规格自动生成 eNSP 拓扑；不安装也可以手工连线实验。
          </div>
          <div className="ensp-cmd-line">
            <code>{INSTALL_CMD}</code>
            <span className="spacer" />
            <CopyButton text={INSTALL_CMD} small />
          </div>
          <a
            className="tiny"
            href="https://github.com/Heaxu/ensp-mcp"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent)' }}
          >
            打开 ensp-mcp 仓库
          </a>
          {status?.command ? (
            <div className="tiny faint">当前命令：{status.command}</div>
          ) : null}
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled
            aria-label="MCP 不可用，无法生成拓扑"
          >
            生成拓扑
          </button>
        </div>
      ) : (
        <div className="vstack" style={{ marginTop: 10, gap: 8 }}>
          <div className="tiny faint">
            工具数量：{typeof status?.toolsCount === 'number' ? status.toolsCount : '未知'}
            {status?.command ? ` · 命令：${status.command}` : ''}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => void onGenerate()}
            disabled={generating}
            aria-label="按当前场景规格生成 eNSP 拓扑"
          >
            {generating ? '生成中…' : '生成拓扑'}
          </button>
        </div>
      )}

      {steps.length > 0 ? (
        <div className="vstack" style={{ marginTop: 10, gap: 6 }}>
          {steps.map((step, index) => (
            <div className="hstack" key={`${step.name}-${index}`} style={{ gap: 7, alignItems: 'flex-start' }}>
              <span className={`ensp-step-mark ${step.ok ? 'ok' : 'fail'}`} aria-hidden="true">
                {step.ok ? '✓' : '✕'}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="small">{step.name}</div>
                <div className="tiny faint" style={{ wordBreak: 'break-word' }}>
                  {step.message}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {topoPath ? (
        <div className="ensp-cmd-line" style={{ marginTop: 10 }}>
          <span className="tiny faint">拓扑文件：</span>
          <code>{topoPath}</code>
          <span className="spacer" />
          <CopyButton text={topoPath} small />
        </div>
      ) : null}

      {error ? (
        <div className="ensp-error small" role="alert" style={{ marginTop: 8 }}>
          {error}
        </div>
      ) : null}
    </section>
  );
}
