import type { ReactNode } from 'react';
import type { BridgeHealth } from '@/types/ensp';
import { CopyButton, Icon } from '@/components/ui';

export interface BridgeStatusCardProps {
  health: BridgeHealth | null;
  error: string | null;
  loading: boolean;
  /** 当前扫描到的在线设备数 */
  deviceCount: number;
  guideOpen: boolean;
  mock?: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onToggleGuide: () => void;
}

function StatusItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: 'ok' | 'bad' | 'warn';
}) {
  return (
    <div className="ensp-status-item">
      <div className="ensp-status-label">{label}</div>
      <div className={`ensp-status-value${tone ? ` ${tone}` : ''}`}>{value}</div>
    </div>
  );
}

export function BridgeStatusCard({
  health,
  error,
  loading,
  deviceCount,
  guideOpen,
  mock,
  onRefresh,
  onOpenSettings,
  onToggleGuide,
}: BridgeStatusCardProps) {
  const connected = Boolean(health) && !error;
  const bridgeVersion = health?.bridge?.version;
  const ensp = health?.ensp;
  const mcpAvailable = Boolean(health?.mcp?.available);

  return (
    <section className="card ensp-bridge" aria-label="本地桥接状态">
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <div className="card-title">
          <Icon name="wifi" size={16} />
          本地桥接状态
          {mock ?? health?.mock ? <span className="badge accent">Mock 模式</span> : null}
        </div>
        <div className="hstack" style={{ gap: 6 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={onRefresh}
            disabled={loading}
            aria-label="重新检测桥接状态"
          >
            {loading ? '检测中…' : '刷新'}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={onToggleGuide}
            aria-expanded={guideOpen}
            aria-label={guideOpen ? '收起接入引导' : '展开接入引导'}
          >
            引导
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={onOpenSettings}
            aria-label="打开 eNSP 实验设置"
          >
            设置
          </button>
        </div>
      </div>

      <div className="ensp-status-grid">
        <StatusItem
          label="桥接"
          value={
            loading && !health
              ? '检测中…'
              : connected
                ? `已连接${bridgeVersion ? ` · v${bridgeVersion}` : ''}`
                : '未连接'
          }
          tone={connected ? 'ok' : 'bad'}
        />
        <StatusItem
          label="eNSP"
          value={ensp?.installed ? `已安装${ensp.version ? ` · ${ensp.version}` : ''}` : '未安装'}
          tone={ensp?.installed ? 'ok' : 'bad'}
        />
        <StatusItem
          label="VirtualBox"
          value={health?.vbox?.version ? health.vbox.version : '未检测到'}
          tone={health?.vbox?.version ? 'ok' : 'warn'}
        />
        <StatusItem
          label="Python"
          value={health?.python?.version ? health.python.version : '未检测到'}
          tone={health?.python?.version ? 'ok' : 'warn'}
        />
        <StatusItem
          label="MCP"
          value={mcpAvailable ? '可用' : '未安装'}
          tone={mcpAvailable ? 'ok' : 'warn'}
        />
        <StatusItem
          label="AI 执行器"
          value={
            health?.worker?.available
              ? `可用${health.worker.netmiko ? ` · netmiko ${health.worker.netmiko}` : ''}`
              : '未就绪'
          }
          tone={health?.worker?.available ? 'ok' : 'warn'}
        />
        <StatusItem label="在线设备" value={`${deviceCount} 台`} tone={deviceCount ? 'ok' : undefined} />
      </div>

      {!connected ? (
        <div className="ensp-status-cmd">
          <span className="small muted">桥接未连接，先在项目根目录启动本地桥接：</span>
          <code>npm run bridge</code>
          <CopyButton text="npm run bridge" small />
        </div>
      ) : null}

      {ensp?.installed && ensp.running === false ? (
        <div className="ensp-warn small" role="status">
          eNSP 未运行或设备未开机：请打开 eNSP 并启动拓扑中的设备，再返回页面重新扫描。
        </div>
      ) : null}

      {error ? (
        <div className="ensp-error small" role="alert">
          桥接检测失败：{error}
        </div>
      ) : null}
    </section>
  );
}
