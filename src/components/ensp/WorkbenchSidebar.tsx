import { createPortal } from 'react-dom';
import type {
  EnspSessionInfo,
  TopologyDeviceRuntime,
  TopologyDocument,
} from '@/types/ensp';
import { EnspTopology } from './EnspTopology';

export interface WorkbenchSidebarProps {
  topology: TopologyDocument;
  mappings: Record<string, number>;
  runtime: Record<string, TopologyDeviceRuntime>;
  sessions: Record<string, EnspSessionInfo | undefined>;
  openTabs: string[];
  activeId: string;
  tabNames: Record<string, string>;
  mobile: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenDevice: (deviceId: string) => void;
  onFocusSession: (deviceId: string) => void;
  onOpenMappings: () => void;
  onOpenMobaxterm: (deviceId: string) => void;
}

const stateLabels: Record<string, string> = {
  offline: '离线',
  starting: '启动中',
  ready: '就绪',
  'auth-pending': '待认证',
  error: '异常',
  'name-mismatch': '名称不匹配',
  unavailable: '无 VRP',
};

export function WorkbenchSidebar(props: WorkbenchSidebarProps) {
  const {
    topology,
    mappings,
    runtime,
    sessions,
    openTabs,
    activeId,
    tabNames,
    mobile,
    mobileOpen,
    onCloseMobile,
    onOpenDevice,
    onFocusSession,
    onOpenMappings,
    onOpenMobaxterm,
  } = props;
  const connectedCount = openTabs.filter((id) => Boolean(sessions[id])).length;

  const tree = (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="ensp-workbench-backdrop moba-mobile-only"
          onClick={onCloseMobile}
          aria-label="关闭拓扑与会话抽屉"
        />
      ) : null}
      <aside className={`moba-sidebar ensp-workbench-sidebar${mobileOpen ? ' mobile-open' : ''}`} aria-label="拓扑与会话树">
        <div className="moba-side-head">
          <span>拓扑 / 会话</span>
          <button type="button" className="moba-plus moba-mobile-only" onClick={onCloseMobile} aria-label="收起会话树">×</button>
          <button type="button" className="moba-plus moba-desktop-only" onClick={onOpenMappings} aria-label="打开设备运行状态与端口映射">＋</button>
        </div>
        <div className="ensp-workbench-topology">
          <div className="moba-tree-root" title={topology.name}>▾ {topology.name}</div>
          <EnspTopology
            topology={topology}
            mappings={mappings}
            runtime={runtime}
            connectedRoles={openTabs}
            activeRole={activeId}
            onSelect={(deviceId) => {
              onOpenDevice(deviceId);
              onCloseMobile();
            }}
          />
        </div>

        <div className="moba-tree ensp-workbench-tree">
          <div className="moba-tree-root">▾ 拓扑设备（{topology.devices.length}）</div>
          {topology.devices.map((device) => {
            const session = sessions[device.id];
            const deviceRuntime = runtime[device.id];
            const active = activeId === device.id;
            const ready = Boolean(session) || deviceRuntime?.state === 'ready';
            const disabled = !device.vrpCapable || device.comPort === 0;
            return (
              <div
                key={device.id}
                role="button"
                tabIndex={disabled ? -1 : 0}
                className={`moba-tree-item${active ? ' active' : ''}${disabled ? ' disabled' : ''}`}
                onClick={() => {
                  if (disabled) return;
                  onOpenDevice(device.id);
                  onCloseMobile();
                }}
                onKeyDown={(event) => {
                  if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onOpenDevice(device.id);
                    onCloseMobile();
                  }
                }}
                aria-current={active ? 'true' : undefined}
                aria-disabled={disabled}
              >
                <span className={`moba-dot${ready ? ' on' : ''}`} aria-hidden="true" />
                <span className="moba-tree-name">{device.name}</span>
                <span className="moba-tree-meta">
                  {disabled ? '无 VRP' : deviceRuntime ? stateLabels[deviceRuntime.state] : mappings[device.id] ? `:${mappings[device.id]}` : '未映射'}
                </span>
                <button
                  type="button"
                  className="moba-mini"
                  disabled={disabled || !mappings[device.id]}
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenMobaxterm(device.id);
                  }}
                  title={`用 MobaXterm 打开 ${device.name}`}
                  aria-label={`用 MobaXterm 打开 ${device.name}`}
                >
                  M
                </button>
              </div>
            );
          })}
          <button type="button" className="moba-tree-action" onClick={onOpenMappings}>
            刷新状态 / 手动 comPort 映射
          </button>

          <div className="moba-tree-root ensp-session-tree-title">▾ 已开会话（{connectedCount}）</div>
          {openTabs.length === 0 ? (
            <div className="ensp-workbench-tree-empty">点击上方设备打开会话</div>
          ) : openTabs.map((deviceId) => {
            const device = topology.devices.find((item) => item.id === deviceId);
            const session = sessions[deviceId];
            if (!device || !session) return null;
            const active = activeId === deviceId;
            return (
              <button
                type="button"
                key={deviceId}
                className={`moba-tree-item ensp-session-tree-item${active ? ' active' : ''}`}
                onClick={() => {
                  onFocusSession(deviceId);
                  onCloseMobile();
                }}
                aria-current={active ? 'true' : undefined}
              >
                <span className={`moba-dot${session.status === 'error' ? '' : ' on'}`} aria-hidden="true" />
                <span className="moba-tree-name">{tabNames[deviceId] || device.name}</span>
                <span className="moba-tree-meta">:{session.port}</span>
              </button>
            );
          })}
        </div>
        <div className="moba-side-foot">
          <span className={`moba-dot${connectedCount ? ' on' : ''}`} aria-hidden="true" />
          已连接 {connectedCount} / {topology.devices.filter((device) => device.vrpCapable && device.comPort !== 0).length}
          <span className="spacer" />
          <span className="tiny faint">{topology.source.type === 'preset' ? '预置场景' : '导入快照'}</span>
        </div>
      </aside>
    </>
  );

  return mobile ? createPortal(tree, document.body) : tree;
}
