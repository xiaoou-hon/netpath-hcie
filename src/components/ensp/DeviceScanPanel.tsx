import { useEffect, useState } from 'react';
import type {
  EnspDeviceInfo,
  TopologyDeviceRuntime,
  TopologyDeviceState,
  TopologyDocument,
} from '@/types/ensp';
import { Icon } from '@/components/ui';
import { canConnectTopologyDevice } from '@/lib/bridge/workbench-state';

export interface DeviceScanPanelProps {
  topology: TopologyDocument;
  runtime: Record<string, TopologyDeviceRuntime>;
  devices: EnspDeviceInfo[];
  scanning: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onScan: (from: number, to: number, ports?: number[]) => void;
  manualPort: string;
  onManualPortChange: (value: string) => void;
  onAddManualPort: (port: number) => void;
  mappings: Record<string, number>;
  onMap: (deviceId: string, port: number) => void;
  onConnect: (deviceId: string) => void;
  onDisconnect?: (deviceId: string) => void;
  connectedRoles: string[];
  connectingRoles: string[];
}

const stateLabel: Record<EnspDeviceInfo['state'], string> = {
  shell: '可登录',
  login: '需认证',
  open: '仅开放',
};

const stateTone: Record<EnspDeviceInfo['state'], string> = {
  shell: 'ok',
  login: 'warn',
  open: '',
};

const runtimeLabels: Record<TopologyDeviceState, string> = {
  offline: '离线',
  starting: '启动中',
  ready: 'VRP 就绪',
  'auth-pending': '等待认证',
  error: '探测异常',
  'name-mismatch': '名称疑似不匹配',
  unavailable: '无 VRP Console',
};

export function DeviceScanPanel({
  topology,
  runtime,
  devices,
  scanning,
  refreshing,
  onRefresh,
  onScan,
  manualPort,
  onManualPortChange,
  onAddManualPort,
  mappings,
  onMap,
  onConnect,
  onDisconnect,
  connectedRoles,
  connectingRoles,
}: DeviceScanPanelProps) {
  const [from, setFrom] = useState('2000');
  const [to, setTo] = useState('2050');
  const [portError, setPortError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts(Object.fromEntries(
      topology.devices.map((device) => [device.id, mappings[device.id] ? String(mappings[device.id]) : '']),
    ));
  }, [topology, mappings]);

  const startScan = () => {
    const fromNumber = Number(from);
    const toNumber = Number(to);
    if (!Number.isInteger(fromNumber) || !Number.isInteger(toNumber) || fromNumber < 1 || toNumber > 65535 || fromNumber > toNumber) {
      setPortError('请输入 1–65535 之间的端口区间，且起始端口不大于结束端口。');
      return;
    }
    setPortError('');
    onScan(fromNumber, toNumber);
  };

  const addManual = () => {
    const port = Number(manualPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      setPortError('手动端口必须是 1–65535 之间的整数。');
      return;
    }
    setPortError('');
    onAddManualPort(port);
  };

  const commitMapping = (deviceId: string) => {
    const port = Number(drafts[deviceId]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      setPortError('每台设备的 comPort 必须是 1–65535 之间的整数。');
      setDrafts((prev) => ({ ...prev, [deviceId]: mappings[deviceId] ? String(mappings[deviceId]) : '' }));
      return;
    }
    setPortError('');
    if (port !== mappings[deviceId]) onMap(deviceId, port);
  };

  return (
    <div className="vstack" style={{ gap: 12 }}>
      <div className="ensp-runtime-head">
        <div>
          <div className="small" style={{ fontWeight: 600 }}>拓扑运行状态</div>
          <div className="tiny faint">POST /api/ensp/scan 仅更新探测结果，不改写静态拓扑。</div>
        </div>
        <button type="button" className="btn btn-sm btn-primary" onClick={onRefresh} disabled={refreshing}>
          <Icon name="reset" size={13} />
          {refreshing ? '刷新中…' : '刷新运行状态'}
        </button>
      </div>

      {portError ? <div className="ensp-error small" role="alert">{portError}</div> : null}

      <div className="vstack" style={{ gap: 6 }}>
        {topology.devices.map((device) => {
          const port = mappings[device.id];
          const deviceRuntime = runtime[device.id];
          const connected = connectedRoles.includes(device.id);
          const connecting = connectingRoles.includes(device.id);
          const disabled = !device.vrpCapable || device.comPort === 0;
          const canConnect = canConnectTopologyDevice(device, deviceRuntime, port);
          return (
            <div className="ensp-map-row ensp-runtime-row" key={device.id}>
              <div className="ensp-runtime-device">
                <span style={{ fontWeight: 600 }}>{device.name}</span>
                <span className="tiny faint">{device.model} · 文件 comPort {device.comPort || '无'}</span>
              </div>
              <span className={`badge ${deviceRuntime?.state === 'ready' || connected ? 'ok' : deviceRuntime?.state === 'auth-pending' || deviceRuntime?.state === 'name-mismatch' ? 'warn' : ''}`}>
                {disabled ? '无 VRP Console' : deviceRuntime ? runtimeLabels[deviceRuntime.state] : '待探测'}
              </span>
              {deviceRuntime?.name && deviceRuntime.name !== device.name ? (
                <span className="tiny" style={{ color: 'var(--warn)' }}>实际：{deviceRuntime.name}</span>
              ) : null}
              <label className="ensp-runtime-port">
                <span className="tiny faint">comPort</span>
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={drafts[device.id] ?? ''}
                  disabled={disabled || connected}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [device.id]: event.target.value }))}
                  onBlur={() => {
                    if (!disabled && !connected) commitMapping(device.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                  }}
                  aria-label={`${device.name} 手动 comPort 映射`}
                />
              </label>
              <span className="spacer" />
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => onConnect(device.id)}
                disabled={!canConnect || connected || connecting}
                aria-label={`连接设备 ${device.name}`}
                title={deviceRuntime && !deviceRuntime.connectable ? '请先修正映射并刷新到 VRP 就绪或等待认证状态' : undefined}
              >
                {connecting ? '连接中…' : connected ? '已连接' : '连接'}
              </button>
              {connected && onDisconnect ? (
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => onDisconnect(device.id)} aria-label={`断开设备 ${device.name}`}>
                  断开
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <details className="ensp-legacy-scan">
        <summary>高级：扫描其他 Console 端口</summary>
        <div className="vstack" style={{ gap: 12, marginTop: 12 }}>
          <div className="ensp-scan-form">
            <label className="ensp-field ensp-field-num">
              <span className="tiny faint">起始端口</span>
              <input type="number" min={1} max={65535} value={from} onChange={(event) => setFrom(event.target.value)} aria-label="扫描起始端口" />
            </label>
            <label className="ensp-field ensp-field-num">
              <span className="tiny faint">结束端口</span>
              <input type="number" min={1} max={65535} value={to} onChange={(event) => setTo(event.target.value)} aria-label="扫描结束端口" />
            </label>
            <button type="button" className="btn btn-sm" onClick={startScan} disabled={scanning} aria-label="扫描 eNSP 设备端口">
              <Icon name="search" size={13} />{scanning ? '扫描中…' : '扫描端口'}
            </button>
            <span className="ensp-scan-sep" aria-hidden="true" />
            <label className="ensp-field ensp-field-num">
              <span className="tiny faint">手动端口</span>
              <input type="number" min={1} max={65535} value={manualPort} onChange={(event) => onManualPortChange(event.target.value)} placeholder="如 2001" aria-label="手动添加端口" />
            </label>
            <button type="button" className="btn btn-sm" onClick={addManual} aria-label="添加手动端口到设备列表">添加</button>
          </div>

          {devices.length > 0 ? (
            <div className="vstack" style={{ gap: 4 }}>
              <div className="tiny faint">发现 {devices.length} 个其他端口</div>
              {devices.map((device) => (
                <div className="ensp-device-row" key={device.port}>
                  <span className="mono ensp-device-port">{device.port}</span>
                  <span className="ensp-device-name" title={device.name || '未知设备'}>{device.name || '未知设备'}</span>
                  <span className={`badge ${stateTone[device.state]}`}>{stateLabel[device.state]}</span>
                  <select
                    className="ensp-select"
                    value=""
                    onChange={(event) => {
                      const deviceId = event.target.value;
                      if (deviceId) onMap(deviceId, device.port);
                    }}
                    aria-label={`把端口 ${device.port} 映射到拓扑设备`}
                  >
                    <option value="">映射到设备…</option>
                    {topology.devices.filter((item) => item.vrpCapable && item.comPort !== 0).map((item) => (
                      <option key={item.id} value={item.id}>{item.name}（{item.id}）</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ) : <div className="tiny faint">尚未执行额外端口扫描；常规刷新无需扫描整个区间。</div>}
        </div>
      </details>
    </div>
  );
}
