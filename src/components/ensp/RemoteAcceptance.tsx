import type { LabScenario } from '@/types';
import type { EnspSessionInfo } from '@/types/ensp';
import { Icon } from '@/components/ui';

export interface AcceptanceResult {
  pass: boolean;
  reason: string;
  raw?: string;
}

export interface RemoteAcceptanceProps {
  scenario: LabScenario;
  mappings: Record<string, number>;
  sessionsByRole: Record<string, EnspSessionInfo | undefined>;
  onRun: () => Promise<void>;
  results: Record<string, AcceptanceResult>;
  running: boolean;
}

export function RemoteAcceptance({
  scenario,
  mappings,
  sessionsByRole,
  onRun,
  results,
  running,
}: RemoteAcceptanceProps) {
  const checks = scenario.ensp?.checks ?? [];
  const connectedRoles = scenario.devices
    .filter((dev) => Boolean(sessionsByRole[dev.id]))
    .map((dev) => dev.id);
  const hasConnection = connectedRoles.length > 0;
  const passedCount = checks.filter((check) => results[check.id]?.pass).length;

  return (
    <section className="card ensp-acceptance" aria-label="真机验收">
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <div className="card-title">
          <Icon name="shield" size={16} />
          真机验收
        </div>
        <span className="tiny faint">
          {passedCount} / {checks.length} 通过
        </span>
      </div>

      <div className="vstack" style={{ marginTop: 10, gap: 8 }}>
        {checks.length === 0 ? (
          <div className="ensp-empty-note">当前场景没有配置真机验收项。</div>
        ) : (
          checks.map((check) => {
            const result = results[check.id];
            const device = scenario.devices.find((dev) => dev.id === check.deviceId);
            const rawLines = result?.raw ? result.raw.replace(/\r/g, '').split('\n') : [];
            const truncated = rawLines.length > 30;
            return (
              <div className="ensp-check-row" key={check.id}>
                <span
                  className={`ensp-check-dot${result ? (result.pass ? ' pass' : ' fail') : ''}`}
                  aria-hidden="true"
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="small" style={{ lineHeight: 1.55 }}>
                    {check.text}
                  </div>
                  <div className="hstack" style={{ gap: 8, marginTop: 3 }}>
                    <span className="tiny faint">
                      设备：{device ? device.name : check.deviceId}
                      {typeof mappings[check.deviceId] === 'number'
                        ? ` · 端口 ${mappings[check.deviceId]}`
                        : ' · 未映射'}
                    </span>
                    <span className="tiny" style={{ color: result ? (result.pass ? 'var(--ok)' : 'var(--danger)') : 'var(--text-faint)' }}>
                      {result ? (result.pass ? '通过' : '未通过') : '未运行'}
                    </span>
                  </div>
                  <pre className="ensp-check-cmd">{check.command}</pre>
                  {result && !result.pass ? (
                    <div className="tiny" style={{ color: 'var(--danger)', marginTop: 4 }}>
                      {result.reason}
                    </div>
                  ) : null}
                  {result?.pass && result.raw ? (
                    <details className="ensp-raw">
                      <summary>原始回显</summary>
                      <pre>
                        {rawLines.slice(0, 30).join('\n')}
                        {truncated ? `\n…（共 ${rawLines.length} 行，已截断）` : ''}
                      </pre>
                    </details>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="divider" style={{ margin: '12px 0' }} />

      {!hasConnection ? (
        <div className="tiny faint" style={{ marginBottom: 8 }}>
          所有角色都未连接，先连接至少一台设备才能运行验收。
        </div>
      ) : (
        <div className="tiny faint" style={{ marginBottom: 8 }}>
          将对每项检查在对应设备上执行命令并判定回显；未连接的设备会标记为未通过。
        </div>
      )}
      <button
        type="button"
        className="btn btn-sm btn-primary"
        onClick={() => void onRun()}
        disabled={!hasConnection || running || checks.length === 0}
        aria-label="运行真机验收"
      >
        {running ? '验收中…' : '运行验收'}
      </button>
    </section>
  );
}
