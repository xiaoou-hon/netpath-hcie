import { useEffect, useState } from 'react';
import type { AiSettings, BridgeSettings, EnspSettings } from '@/types/ensp';
import { Icon, toast } from '@/components/ui';

export interface TestResultState {
  state: 'idle' | 'loading' | 'ok' | 'fail';
  message?: string;
}

export interface SettingsPatch {
  bridge?: Partial<BridgeSettings>;
  ai?: Partial<AiSettings>;
}

export interface EnspSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  settings: EnspSettings;
  onSave: (patch: SettingsPatch) => void;
  bridgeTest: TestResultState;
  mcpTest: TestResultState;
  aiTest: TestResultState;
  onTestBridge: () => void;
  onTestMcp: () => void;
  onTestAi: (draft?: AiSettings) => void;
  onReset: () => void;
}

function TestLine({
  label,
  test,
  onTest,
}: {
  label: string;
  test: TestResultState;
  onTest: () => void;
}) {
  return (
    <div className="ensp-test-line">
      <button
        type="button"
        className="btn btn-sm"
        onClick={onTest}
        disabled={test.state === 'loading'}
        aria-label={`测试${label}连接`}
      >
        {test.state === 'loading' ? '测试中…' : '测试连接'}
      </button>
      <span
        className="tiny"
        style={{
          color:
            test.state === 'ok'
              ? 'var(--ok)'
              : test.state === 'fail'
                ? 'var(--danger)'
                : 'var(--text-faint)',
        }}
        role="status"
      >
        {test.state === 'idle' ? `${label}：未测试` : test.message ?? (test.state === 'ok' ? '连接正常' : '连接失败')}
      </span>
    </div>
  );
}

export function EnspSettingsDrawer({
  open,
  onClose,
  settings,
  onSave,
  bridgeTest,
  mcpTest,
  aiTest,
  onTestBridge,
  onTestMcp,
  onTestAi,
  onReset,
}: EnspSettingsDrawerProps) {
  const [bridgeUrl, setBridgeUrl] = useState(settings.bridge.bridgeUrl);
  const [mcpCommand, setMcpCommand] = useState(settings.bridge.mcpCommand);
  const [username, setUsername] = useState(settings.bridge.credentials.username);
  const [password, setPassword] = useState(settings.bridge.credentials.password);
  const [aiBaseUrl, setAiBaseUrl] = useState(settings.ai.baseUrl);
  const [aiModel, setAiModel] = useState(settings.ai.model);
  const [aiKey, setAiKey] = useState(settings.ai.apiKey);

  useEffect(() => {
    if (!open) return;
    setBridgeUrl(settings.bridge.bridgeUrl);
    setMcpCommand(settings.bridge.mcpCommand);
    setUsername(settings.bridge.credentials.username);
    setPassword(settings.bridge.credentials.password);
    setAiBaseUrl(settings.ai.baseUrl);
    setAiModel(settings.ai.model);
    setAiKey(settings.ai.apiKey);
  }, [open, settings]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const save = () => {
    onSave({
      bridge: {
        bridgeUrl: bridgeUrl.trim() || 'http://127.0.0.1:7701',
        mcpCommand: mcpCommand.trim() || 'ensp-mcp',
        credentials: { username: username.trim(), password },
      },
      ai: {
        baseUrl: aiBaseUrl.trim(),
        model: aiModel.trim(),
        apiKey: aiKey.trim(),
      },
    });
    toast('设置已保存');
  };

  /** 测试前先落盘草稿，避免“刚填的 Key 还没保存就测试”导致误报未配置。 */
  const testBridgeNow = () => {
    onSave({
      bridge: {
        bridgeUrl: bridgeUrl.trim() || 'http://127.0.0.1:7701',
        mcpCommand: mcpCommand.trim() || 'ensp-mcp',
        credentials: { username: username.trim(), password },
      },
    });
    onTestBridge();
  };

  const testMcpNow = () => {
    onSave({
      bridge: {
        bridgeUrl: bridgeUrl.trim() || 'http://127.0.0.1:7701',
        mcpCommand: mcpCommand.trim() || 'ensp-mcp',
        credentials: { username: username.trim(), password },
      },
    });
    onTestMcp();
  };

  const testAiNow = () => {
    const draft: AiSettings = {
      baseUrl: aiBaseUrl.trim(),
      model: aiModel.trim(),
      apiKey: aiKey.trim(),
      temperature: settings.ai.temperature,
    };
    onSave({ ai: draft });
    onTestAi(draft);
  };

  return (
    <div className="ensp-drawer-layer" role="dialog" aria-modal="true" aria-label="eNSP 实验设置">
      <div className="ensp-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="ensp-drawer-panel">
        <div className="ensp-drawer-head">
          <div className="card-title">
            <Icon name="shield" size={16} />
            eNSP 实验设置
          </div>
          <span className="spacer" />
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="关闭设置"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="ensp-drawer-body">
          <div className="vstack" style={{ gap: 10 }}>
            <div className="card-title">本地桥接</div>
            <label className="ensp-field">
              <span className="tiny faint">桥接地址</span>
              <input
                value={bridgeUrl}
                onChange={(event) => setBridgeUrl(event.target.value)}
                placeholder="http://127.0.0.1:7701"
                aria-label="桥接服务地址"
              />
            </label>
            <label className="ensp-field">
              <span className="tiny faint">MCP 命令</span>
              <input
                value={mcpCommand}
                onChange={(event) => setMcpCommand(event.target.value)}
                placeholder="ensp-mcp"
                aria-label="MCP 启动命令"
              />
            </label>
            <label className="ensp-field">
              <span className="tiny faint">默认用户名</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="off"
                aria-label="设备默认用户名"
              />
            </label>
            <label className="ensp-field">
              <span className="tiny faint">默认密码</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                aria-label="设备默认密码"
              />
            </label>
            <TestLine label="桥接" test={bridgeTest} onTest={testBridgeNow} />
            <TestLine label="MCP" test={mcpTest} onTest={testMcpNow} />
          </div>

          <div className="divider" style={{ margin: '2px 0' }} />

          <div className="vstack" style={{ gap: 10 }}>
            <div className="card-title">AI 助教</div>
            <label className="ensp-field">
              <span className="tiny faint">AI Base URL</span>
              <input
                value={aiBaseUrl}
                onChange={(event) => setAiBaseUrl(event.target.value)}
                placeholder="https://api.deepseek.com/v1"
                aria-label="AI 接口地址"
              />
            </label>
            <label className="ensp-field">
              <span className="tiny faint">模型</span>
              <input
                value={aiModel}
                onChange={(event) => setAiModel(event.target.value)}
                placeholder="deepseek-chat"
                aria-label="AI 模型名称"
              />
            </label>
            <label className="ensp-field">
              <span className="tiny faint">API Key</span>
              <input
                type="password"
                value={aiKey}
                onChange={(event) => setAiKey(event.target.value)}
                autoComplete="new-password"
                placeholder="sk-..."
                aria-label="AI API Key"
              />
            </label>
            <div className="tiny faint">Key 仅保存在本机浏览器，不会显示在任何测试结果里。</div>
            <TestLine label="AI" test={aiTest} onTest={testAiNow} />
          </div>
        </div>

        <div className="ensp-drawer-foot">
          <button type="button" className="btn btn-sm btn-primary" onClick={save} aria-label="保存实验设置">
            保存
          </button>
          <button type="button" className="btn btn-sm" onClick={onClose} aria-label="取消并关闭设置">
            取消
          </button>
          <span className="spacer" />
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={onReset}
            aria-label="恢复默认设置"
          >
            恢复默认
          </button>
        </div>
      </aside>
    </div>
  );
}
