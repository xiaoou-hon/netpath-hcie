import type {
  TopologyDeviceRuntime,
  TopologyDocument,
} from '@/types/ensp';
import { EmptyState } from '@/components/ui';
import { layoutTopology } from '@/lib/bridge/workbench-state';

export interface EnspTopologyProps {
  topology: TopologyDocument;
  mappings: Record<string, number>;
  runtime: Record<string, TopologyDeviceRuntime>;
  connectedRoles: string[];
  activeRole: string;
  onSelect: (deviceId: string) => void;
}

const runtimeLabels: Record<string, string> = {
  offline: '离线',
  starting: '启动中',
  ready: '就绪',
  'auth-pending': '等待认证',
  error: '探测异常',
  'name-mismatch': '名称不匹配',
  unavailable: '无 VRP Console',
};

export function EnspTopology({
  topology,
  mappings,
  runtime,
  connectedRoles,
  activeRole,
  onSelect,
}: EnspTopologyProps) {
  if (topology.devices.length === 0) {
    return <EmptyState title="当前拓扑没有设备" hint="请导入包含设备声明的 .topo 文件。" />;
  }

  const layout = layoutTopology(topology);
  const devices = new Map(topology.devices.map((device) => [device.id, device]));
  const isOnline = (deviceId: string) =>
    connectedRoles.includes(deviceId) || runtime[deviceId]?.state === 'ready';

  return (
    <div className="ensp-topo">
      <svg viewBox={layout.viewBox} role="img" aria-label={`${topology.name} 拓扑`}>
        <g aria-hidden="true">
          {topology.links.map((link) => {
            const from = layout.positions[link.source.deviceId];
            const to = layout.positions[link.target.deviceId];
            if (!from || !to) return null;
            const online = isOnline(link.source.deviceId) && isOnline(link.target.deviceId);
            const sourceX = from.x + (to.x - from.x) * 0.27;
            const sourceY = from.y + (to.y - from.y) * 0.27 - 8;
            const targetX = from.x + (to.x - from.x) * 0.73;
            const targetY = from.y + (to.y - from.y) * 0.73 + 15;
            return (
              <g key={link.id}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className={`ensp-topo-link${online ? ' online' : ''}`}
                />
                <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 7} className="ensp-topo-link-name">
                  {link.name}
                </text>
                <text x={sourceX} y={sourceY} className="ensp-topo-interface">
                  {link.source.interfaceName}
                </text>
                <text x={targetX} y={targetY} className="ensp-topo-interface">
                  {link.target.interfaceName}
                </text>
                <title>{`${devices.get(link.source.deviceId)?.name ?? link.source.deviceId} ${link.source.interfaceName} ↔ ${devices.get(link.target.deviceId)?.name ?? link.target.deviceId} ${link.target.interfaceName}`}</title>
              </g>
            );
          })}
        </g>
        {topology.devices.map((device) => {
          const position = layout.positions[device.id];
          const port = mappings[device.id];
          const deviceRuntime = runtime[device.id];
          const connected = connectedRoles.includes(device.id);
          const online = isOnline(device.id);
          const active = activeRole === device.id;
          const vrpDisabled = !device.vrpCapable || device.comPort === 0;
          const subtitle = vrpDisabled
            ? '无 VRP Console'
            : connected
              ? `已连接 · 端口 ${port}`
              : deviceRuntime
                ? `${runtimeLabels[deviceRuntime.state] ?? deviceRuntime.state} · 端口 ${deviceRuntime.port || '未映射'}`
                : port
                  ? `待探测 · 端口 ${port}`
                  : '未映射';
          return (
            <g
              key={device.id}
              role={vrpDisabled ? 'img' : 'button'}
              tabIndex={vrpDisabled ? -1 : 0}
              aria-label={`${device.name}（${device.model}，${subtitle}）`}
              aria-pressed={vrpDisabled ? undefined : active}
              aria-disabled={vrpDisabled}
              className={`ensp-topo-node${vrpDisabled ? ' disabled' : ''}`}
              onClick={() => {
                if (!vrpDisabled) onSelect(device.id);
              }}
              onKeyDown={(event) => {
                if (!vrpDisabled && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  onSelect(device.id);
                }
              }}
            >
              <rect
                x={position.x - 68}
                y={position.y - 31}
                width={136}
                height={62}
                rx={12}
                fill={active ? 'var(--accent-soft)' : 'var(--surface-2)'}
                stroke={active ? 'var(--accent)' : online ? 'var(--ok)' : 'var(--border-strong)'}
                strokeWidth={active ? 2.4 : 1.5}
                strokeDasharray={deviceRuntime && !online ? '5 4' : undefined}
              />
              <text x={position.x} y={position.y - 7} textAnchor="middle" className="ensp-topo-device-name">
                {device.name}
              </text>
              <text
                x={position.x}
                y={position.y + 12}
                textAnchor="middle"
                className={`ensp-topo-device-meta${online ? ' online' : ''}`}
              >
                {device.model} · {subtitle}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="ensp-legend">
        <span><i className="ensp-legend-line online" aria-hidden="true" /> 就绪 / 已连接</span>
        <span><i className="ensp-legend-line offline" aria-hidden="true" /> 未就绪</span>
        <span>链路标注为文件中的接口声明</span>
      </div>
    </div>
  );
}
