import type {
  EnspSessionInfo,
  TopologyCoordinate,
  TopologyDevice,
  TopologyDeviceRuntime,
  TopologyDocument,
} from '@/types/ensp';

export type WorkbenchLayout = 1 | 2 | 4;

export interface EnspWorkbenchState {
  topology: TopologyDocument;
  imported: boolean;
  runtime: Record<string, TopologyDeviceRuntime>;
  manualMappings: Record<string, number>;
  sessions: Record<string, EnspSessionInfo | undefined>;
  openTabs: string[];
  activeId: string;
  tabNames: Record<string, string>;
  layout: WorkbenchLayout;
}

export type EnspWorkbenchAction =
  | { type: 'topology/replace'; topology: TopologyDocument; imported: boolean }
  | { type: 'runtime/replace'; devices: TopologyDeviceRuntime[] }
  | { type: 'mapping/set'; deviceId: string; port: number }
  | { type: 'session/open'; deviceId: string; session: EnspSessionInfo }
  | { type: 'session/focus'; deviceId: string }
  | { type: 'session/update'; deviceId: string; session: EnspSessionInfo }
  | { type: 'session/close'; deviceId: string }
  | { type: 'sessions/clear' }
  | { type: 'tab/rename'; deviceId: string; name: string }
  | { type: 'layout/set'; layout: WorkbenchLayout };

export interface TopologyLayout {
  positions: Record<string, TopologyCoordinate>;
  viewBox: string;
}

export function createWorkbenchState(
  topology: TopologyDocument,
  imported = topology.source.type !== 'preset',
): EnspWorkbenchState {
  return {
    topology,
    imported,
    runtime: {},
    manualMappings: {},
    sessions: {},
    openTabs: [],
    activeId: '',
    tabNames: {},
    layout: 1,
  };
}

export function workbenchReducer(
  state: EnspWorkbenchState,
  action: EnspWorkbenchAction,
): EnspWorkbenchState {
  switch (action.type) {
    case 'topology/replace':
      return {
        ...createWorkbenchState(action.topology, action.imported),
        layout: state.layout,
      };
    case 'runtime/replace':
      return {
        ...state,
        runtime: Object.fromEntries(action.devices.map((device) => [device.deviceId, device])),
      };
    case 'mapping/set': {
      const runtime = { ...state.runtime };
      delete runtime[action.deviceId];
      return {
        ...state,
        runtime,
        manualMappings: { ...state.manualMappings, [action.deviceId]: action.port },
      };
    }
    case 'session/open':
      return {
        ...state,
        sessions: { ...state.sessions, [action.deviceId]: action.session },
        openTabs: state.openTabs.includes(action.deviceId)
          ? state.openTabs
          : [...state.openTabs, action.deviceId],
        activeId: action.deviceId,
      };
    case 'session/focus':
      return state.openTabs.includes(action.deviceId)
        ? { ...state, activeId: action.deviceId }
        : state;
    case 'session/update':
      return state.sessions[action.deviceId]
        ? {
            ...state,
            sessions: { ...state.sessions, [action.deviceId]: action.session },
          }
        : state;
    case 'session/close': {
      const index = state.openTabs.indexOf(action.deviceId);
      const openTabs = state.openTabs.filter((id) => id !== action.deviceId);
      const sessions = { ...state.sessions };
      const tabNames = { ...state.tabNames };
      delete sessions[action.deviceId];
      delete tabNames[action.deviceId];
      return {
        ...state,
        sessions,
        tabNames,
        openTabs,
        activeId: state.activeId === action.deviceId
          ? openTabs[Math.min(Math.max(index, 0), Math.max(openTabs.length - 1, 0))] ?? ''
          : state.activeId,
      };
    }
    case 'sessions/clear':
      return {
        ...state,
        sessions: {},
        openTabs: [],
        activeId: '',
        tabNames: {},
      };
    case 'tab/rename':
      return state.openTabs.includes(action.deviceId) && action.name.trim()
        ? {
            ...state,
            tabNames: { ...state.tabNames, [action.deviceId]: action.name.trim().slice(0, 40) },
          }
        : state;
    case 'layout/set':
      return { ...state, layout: action.layout };
    default:
      return state;
  }
}

export function effectiveTopologyMappings(
  state: Pick<EnspWorkbenchState, 'topology' | 'manualMappings'>,
): Record<string, number> {
  const mappings: Record<string, number> = {};
  for (const device of state.topology.devices) {
    const manual = state.manualMappings[device.id];
    const port = Number.isInteger(manual) ? manual : device.comPort;
    if (Number.isInteger(port) && port > 0 && port <= 65535) mappings[device.id] = port;
  }
  return mappings;
}

export function canConnectTopologyDevice(
  device: TopologyDevice,
  runtime: TopologyDeviceRuntime | undefined,
  port: number | undefined,
): boolean {
  if (!device.vrpCapable || device.comPort === 0 || !port) return false;
  return runtime ? runtime.connectable : true;
}

export function visibleTerminalIds(
  state: Pick<EnspWorkbenchState, 'openTabs' | 'activeId' | 'layout'>,
  narrow: boolean,
): string[] {
  const ordered = state.activeId
    ? [state.activeId, ...state.openTabs.filter((id) => id !== state.activeId)]
    : state.openTabs;
  return ordered.slice(0, narrow ? 1 : state.layout);
}

export function layoutTopology(topology: TopologyDocument): TopologyLayout {
  const positions: Record<string, TopologyCoordinate> = {};
  const columns = Math.max(1, Math.ceil(Math.sqrt(topology.devices.length)));
  topology.devices.forEach((device, index) => {
    positions[device.id] = device.position
      ? { ...device.position }
      : {
          x: 120 + (index % columns) * 240,
          y: 100 + Math.floor(index / columns) * 170,
        };
  });

  const points = Object.values(positions);
  if (!points.length) return { positions, viewBox: '0 0 640 240' };
  const minX = Math.min(...points.map((point) => point.x)) - 100;
  const minY = Math.min(...points.map((point) => point.y)) - 80;
  const maxX = Math.max(...points.map((point) => point.x)) + 100;
  const maxY = Math.max(...points.map((point) => point.y)) + 90;
  return {
    positions,
    viewBox: `${minX} ${minY} ${Math.max(maxX - minX, 320)} ${Math.max(maxY - minY, 220)}`,
  };
}
