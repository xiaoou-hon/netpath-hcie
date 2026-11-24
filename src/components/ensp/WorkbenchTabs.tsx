import type { EnspSessionInfo, TopologyDocument } from '@/types/ensp';

export interface WorkbenchTabsProps {
  topology: TopologyDocument;
  openTabs: string[];
  activeId: string;
  tabNames: Record<string, string>;
  sessions: Record<string, EnspSessionInfo | undefined>;
  onFocus: (deviceId: string) => void;
  onRename: (deviceId: string) => void;
  onClose: (deviceId: string) => void;
}

export function WorkbenchTabs({
  topology,
  openTabs,
  activeId,
  tabNames,
  sessions,
  onFocus,
  onRename,
  onClose,
}: WorkbenchTabsProps) {
  return (
    <div className="moba-tabs ensp-workbench-tabs" role="tablist" aria-label="已开设备会话">
      {openTabs.length === 0 ? (
        <span className="ensp-workbench-no-tabs">从拓扑或会话树打开设备</span>
      ) : openTabs.map((deviceId) => {
        const device = topology.devices.find((item) => item.id === deviceId);
        const session = sessions[deviceId];
        if (!device || !session) return null;
        const active = activeId === deviceId;
        const name = tabNames[deviceId] || device.name;
        return (
          <div className={`moba-tab-wrap${active ? ' active' : ''}`} key={deviceId}>
            <button
              type="button"
              role="tab"
              aria-selected={active}
              className="moba-tab"
              onClick={() => onFocus(deviceId)}
              title={`${name} · ${device.name} · 端口 ${session.port}`}
            >
              <span className={`moba-dot${session.status === 'error' ? '' : ' on'}`} aria-hidden="true" />
              {name}
            </button>
            <button type="button" className="moba-tab-action" onClick={() => onRename(deviceId)} aria-label={`重命名标签 ${name}`} title="重命名标签">改</button>
            <button type="button" className="moba-tab-action" onClick={() => onClose(deviceId)} aria-label={`关闭标签 ${name}`} title="关闭并断开会话">×</button>
          </div>
        );
      })}
    </div>
  );
}
