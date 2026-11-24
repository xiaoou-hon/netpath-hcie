import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { LabScenario } from '@/types';
import type {
  AiSettings,
  BridgeHealth,
  EnspDeviceInfo,
  EnspSessionInfo,
  EnspSessionStatus,
  TopologyDocument,
} from '@/types/ensp';
import { getScenario, scenarios } from '@/data/lab/scenarios';
import { scenarioToTopology } from '@/data/lab/scenario-topology';
import { evaluateCheck } from '@/lib/bridge/terminal';
import {
  canConnectTopologyDevice,
  createWorkbenchState,
  effectiveTopologyMappings,
  visibleTerminalIds,
  workbenchReducer,
} from '@/lib/bridge/workbench-state';
import * as client from '@/lib/bridge/client';
import type { ConnectResult, MobaxtermDetectResult } from '@/lib/bridge/client';
import { resolveAiTargetRole } from '@/lib/bridge/ai-request';
import type { AiCommandExecResult, AiQuestion, AiQuestionKind, AiSessionContext } from '@/lib/bridge/ai-request';
import {
  markScenarioCompleted,
  resetEnspSettings,
  setAiSettings,
  setBridgeSettings,
  setDeviceMapping,
  useEnspSettings,
} from '@/store/enspStore';
import { toast } from '@/components/ui';
import { BridgeStatusCard } from '@/components/ensp/BridgeStatusCard';
import { SetupGuide } from '@/components/ensp/SetupGuide';
import { DeviceScanPanel } from '@/components/ensp/DeviceScanPanel';
import { EnspTerminal } from '@/components/ensp/EnspTerminal';
import type { EnspTerminalAiContext, EnspTerminalHandle, EnspTerminalInputContext } from '@/components/ensp/EnspTerminal';
import {
  canEnableSync,
  dangerousSyncCommands,
  resolveSyncTargets,
  sendSyncInput,
} from '@/lib/bridge/sync-targets';
import type { SyncInputStatus, SyncInputTarget } from '@/lib/bridge/sync-targets';
import { WorkbenchSidebar } from '@/components/ensp/WorkbenchSidebar';
import { WorkbenchTabs } from '@/components/ensp/WorkbenchTabs';
import { RemoteAcceptance } from '@/components/ensp/RemoteAcceptance';
import type { AcceptanceResult } from '@/components/ensp/RemoteAcceptance';
import { McpTopologyPanel } from '@/components/ensp/McpTopologyPanel';
import type { McpStep } from '@/components/ensp/McpTopologyPanel';
import { EnspSettingsDrawer } from '@/components/ensp/EnspSettingsDrawer';
import type { SettingsPatch, TestResultState } from '@/components/ensp/EnspSettingsDrawer';
import { AiTutorDrawer } from '@/components/ensp/AiTutorDrawer';
import { AiTutorFab } from '@/components/ensp/AiTutorFab';
import type { FabSide } from '@/components/ensp/AiTutorFab';
import { errorMessage } from '@/components/ensp/utils';

const enspScenarios = scenarios;
const idleTest: TestResultState = { state: 'idle' };
const MAX_TOPO_BYTES = 5 * 1024 * 1024;
const SYNC_STATUS_LABELS: Record<SyncInputStatus, string> = {
  sent: '已发送',
  ready: '就绪',
  offline: '离线或未就绪',
  locked: '验收锁定',
  unavailable: '终端不可用',
  'write-failed': '写入失败',
  'confirmation-required': '等待确认',
};

interface RunRequest {
  command: string;
  role: string;
  at: number;
}

function sourceLabel(topology: TopologyDocument): string {
  if (topology.source.type === 'ensp-mcp') {
    return `ensp-mcp${topology.source.tool ? ` · ${topology.source.tool}` : ''}`;
  }
  if (topology.source.type === 'fallback-xml') return '本机 XML 备用解析';
  return '预置场景拓扑';
}

export function EnspLabPage() {
  const [searchParams] = useSearchParams();
  const scenarioParam = searchParams.get('scenario');
  const aiParam = searchParams.get('ai');
  const settings = useEnspSettings();
  const [scenarioId, setScenarioId] = useState<string>(() => {
    if (scenarioParam && enspScenarios.some((item) => item.id === scenarioParam)) return scenarioParam;
    return enspScenarios[0]?.id ?? 'lab-1';
  });
  const scenario: LabScenario = getScenario(scenarioId) ?? enspScenarios[0];
  const [workbench, dispatch] = useReducer(
    workbenchReducer,
    createWorkbenchState(
      scenarioToTopology(scenario, settings.mappings[scenario.id] ?? {}),
      false,
    ),
  );
  const {
    topology,
    imported,
    runtime,
    manualMappings,
    sessions,
    openTabs,
    activeId,
    tabNames,
    layout,
  } = workbench;

  const [health, setHealth] = useState<BridgeHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [guideOpen, setGuideOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(aiParam === '1');
  const [fabSide, setFabSide] = useState<FabSide>('right');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiUnread, setAiUnread] = useState(false);

  const [devices, setDevices] = useState<EnspDeviceInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [manualPort, setManualPort] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobaxterm, setMobaxterm] = useState<MobaxtermDetectResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [connectingIds, setConnectingIds] = useState<string[]>([]);
  const [workspaceIssue, setWorkspaceIssue] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncSelected, setSyncSelected] = useState<string[]>([]);
  const [syncResults, setSyncResults] = useState<Record<string, SyncInputStatus>>({});
  const [terminalStatuses, setTerminalStatuses] = useState<Record<string, 'idle' | EnspSessionStatus>>({});
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 767px)').matches);

  const [acceptanceResults, setAcceptanceResults] = useState<Record<string, AcceptanceResult>>({});
  const [accepting, setAccepting] = useState(false);
  const [mcp, setMcp] = useState<{ available: boolean; command?: string; toolsCount?: number } | null>(null);
  const [mcpSteps, setMcpSteps] = useState<McpStep[]>([]);
  const [mcpGenerating, setMcpGenerating] = useState(false);
  const [topoPath, setTopoPath] = useState<string | undefined>(undefined);
  const [mcpError, setMcpError] = useState<string | undefined>(undefined);

  const [pendingInsert, setPendingInsert] = useState<RunRequest | null>(null);
  const [pendingRun, setPendingRun] = useState<RunRequest | null>(null);
  const [recentOutput, setRecentOutput] = useState<Record<string, string>>({});
  const [recentCommands, setRecentCommands] = useState<Record<string, string[]>>({});
  const [pendingAsk, setPendingAsk] = useState<AiQuestion | null>(null);
  const [bridgeTest, setBridgeTest] = useState<TestResultState>(idleTest);
  const [mcpTest, setMcpTest] = useState<TestResultState>(idleTest);
  const [aiTest, setAiTest] = useState<TestResultState>(idleTest);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalRefs = useRef<Record<string, EnspTerminalHandle | null>>({});
  const outputBuffersRef = useRef<Record<string, string>>({});
  const aiRequestSequenceRef = useRef(0);
  const connectingRef = useRef(new Set<string>());
  const workbenchRef = useRef(workbench);
  workbenchRef.current = workbench;
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  /** 每设备复用一个 netmiko worker 会话：deviceId -> worker sessionId。 */
  const workerSessionsRef = useRef<Record<string, string>>({});
  const syncEnabledRef = useRef(syncEnabled);
  syncEnabledRef.current = syncEnabled;
  const syncSelectedRef = useRef(syncSelected);
  syncSelectedRef.current = syncSelected;

  const mappings = useMemo(
    () => effectiveTopologyMappings({ topology, manualMappings }),
    [topology, manualMappings],
  );
  const scenarioMappings = settings.mappings[scenario.id] ?? {};
  const checks = scenario.ensp?.checks ?? [];
  const activeDevice = topology.devices.find((device) => device.id === activeId);
  const activeSession = activeDevice ? sessions[activeDevice.id] : undefined;
  const connectedRoles = openTabs.filter((id) => Boolean(sessions[id]));
  const visibleIds = visibleTerminalIds(workbench, narrow);
  const currentPrompt = activeSession?.prompt ?? '<未连接>';
  const currentView = activeSession?.view ?? 'user';
  const roleName = (deviceId: string) =>
    topology.devices.find((device) => device.id === deviceId)?.name ?? deviceId;
  const readyCount = Object.values(runtime).filter((device) => device.state === 'ready').length;
  const syncTargetNames = syncSelected.map((deviceId) => tabNames[deviceId] || roleName(deviceId));

  const updateSyncEnabled = (enabled: boolean) => {
    syncEnabledRef.current = enabled;
    setSyncEnabled(enabled);
    if (!enabled) setSyncResults({});
  };

  const updateSyncSelection = (roles: string[]) => {
    const next = [...new Set(roles)];
    syncSelectedRef.current = next;
    setSyncSelected(next);
    setSyncResults({});
    if (syncEnabledRef.current && next.length < 2) updateSyncEnabled(false);
  };

  const resetSync = () => {
    syncEnabledRef.current = false;
    syncSelectedRef.current = [];
    setSyncEnabled(false);
    setSyncSelected([]);
    setSyncResults({});
  };

  const syncTarget = (deviceId: string): SyncInputTarget | undefined => {
    const terminal = terminalRefs.current[deviceId];
    if (!terminal) return undefined;
    return {
      status: () => {
        const current = workbenchRef.current;
        if (!current.sessions[deviceId]) return 'offline';
        const status = terminal.getStatus();
        if (status === 'locked') return 'locked';
        if (status !== 'ready' || !terminal.isWritable()) return 'offline';
        return 'ready';
      },
      write: (data) => terminalRefs.current[deviceId]?.write(data) ?? false,
      currentCommand: () => terminalRefs.current[deviceId]?.getCurrentCommand() ?? '',
    };
  };

  const syncTargetMap = (roles: string[]): Record<string, SyncInputTarget | undefined> =>
    Object.fromEntries(roles.map((deviceId) => [deviceId, syncTarget(deviceId)]));

  const syncDangerousCommandLabels = (deviceId: string): string[] => {
    const current = workbenchRef.current;
    const connected = current.openTabs.filter((id) => Boolean(current.sessions[id]));
    const targetIds = resolveSyncTargets(deviceId, true, syncSelectedRef.current, connected);
    return dangerousSyncCommands('\r', targetIds, syncTargetMap(targetIds))
      .map((item) => `${roleName(item.deviceId)}：${item.command}`);
  };

  const toggleSync = () => {
    if (syncEnabledRef.current) {
      updateSyncEnabled(false);
      setWorkspaceIssue('');
      return;
    }
    const selected = syncSelectedRef.current;
    const targets = syncTargetMap(selected);
    if (!canEnableSync(selected, targets)) {
      const states = Object.fromEntries(selected.map((deviceId) => [
        deviceId,
        targets[deviceId]?.status() ?? 'unavailable',
      ])) as Record<string, SyncInputStatus>;
      setSyncResults(states);
      setWorkspaceIssue(selected.length < 2
        ? '同步未开启：请先显式选择至少两台设备'
        : `同步未开启：${selected.map((deviceId) => `${roleName(deviceId)} ${SYNC_STATUS_LABELS[states[deviceId]]}`).join('；')}`);
      return;
    }
    setSyncResults({});
    updateSyncEnabled(true);
    setWorkspaceIssue('');
  };

  const selectAllSyncTargets = () => {
    const ready = connectedRoles.filter((deviceId) => syncTarget(deviceId)?.status() === 'ready');
    updateSyncSelection(ready);
    setWorkspaceIssue(ready.length < 2 ? '可选就绪且可写的设备不足两台，请先连接设备' : '');
  };

  /* --------------------------------- 健康检查 -------------------------------- */

  const loadHealth = async (silent: boolean) => {
    if (!silent) setHealthLoading(true);
    try {
      const res = await client.health();
      setHealth(res.data);
      setHealthError(null);
    } catch (error) {
      setHealth(null);
      setHealthError(errorMessage(error));
    } finally {
      if (!silent) setHealthLoading(false);
    }
  };

  const loadMcpStatus = async () => {
    try {
      const res = await client.mcpStatus();
      const data = res.data;
      setMcp({
        available: data.available === true,
        command: typeof data.command === 'string' ? data.command : undefined,
        toolsCount: typeof data.toolsCount === 'number' ? data.toolsCount : undefined,
      });
      setMcpError(undefined);
    } catch (error) {
      setMcp({ available: false });
      setMcpError(errorMessage(error));
    }
  };

  const loadMobaxterm = async () => {
    try {
      const res = await client.mobaxtermDetect();
      setMobaxterm(res.data);
    } catch {
      setMobaxterm({ found: false });
    }
  };

  useEffect(() => {
    void loadHealth(false);
    void loadMcpStatus();
    void loadMobaxterm();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadHealth(true);
    }, 15000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadHealth(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // 仅在页面挂载时启动轮询
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const valid = syncSelectedRef.current.filter((deviceId) =>
      openTabs.includes(deviceId) &&
      Boolean(sessions[deviceId]) &&
      topology.devices.some((device) => device.id === deviceId));
    if (valid.length !== syncSelectedRef.current.length) updateSyncSelection(valid);
  }, [openTabs, sessions, topology]);

  useEffect(() => () => {
    for (const item of Object.values(sessionsRef.current)) {
      if (item) void client.disconnect(item.sessionId).catch(() => undefined);
    }
    for (const sid of Object.values(workerSessionsRef.current)) {
      void client.workerDisconnect(sid).catch(() => undefined);
    }
    workerSessionsRef.current = {};
  }, []);

  /* ------------------------------ 拓扑导入与扫描 ------------------------------ */

  const disconnectAll = async () => {
    // 切换拓扑/场景时一并回收全部 worker 会话（设备端口映射可能变化）。
    const workerSids = Object.values(workerSessionsRef.current);
    workerSessionsRef.current = {};
    await Promise.all(workerSids.map((sid) => client.workerDisconnect(sid).catch(() => undefined)));
    const entries = Object.values(sessionsRef.current).filter((item): item is EnspSessionInfo => Boolean(item));
    await Promise.all(entries.map(async (item) => {
      try {
        await client.disconnect(item.sessionId);
      } catch {
        /* 切换拓扑时尽力断开，失败不阻塞本地状态清理 */
      }
    }));
    dispatch({ type: 'sessions/clear' });
  };

  const resetSessionContext = () => {
    resetSync();
    setAcceptanceResults({});
    setRecentOutput({});
    setRecentCommands({});
    outputBuffersRef.current = {};
    setDevices([]);
    setPendingInsert(null);
    setPendingRun(null);
    setPendingAsk(null);
    setWorkspaceIssue('');
  };

  const importTopoFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!/\.topo$/i.test(file.name)) {
      setImportError('请选择已保存的 .topo 文件；当前拓扑保持不变。');
      input.value = '';
      return;
    }
    if (file.size === 0 || file.size > MAX_TOPO_BYTES) {
      setImportError(file.size === 0 ? '拓扑文件为空；当前拓扑保持不变。' : '拓扑文件超过 5 MiB；当前拓扑保持不变。');
      input.value = '';
      return;
    }

    setImporting(true);
    setImportError('');
    try {
      const content = await file.arrayBuffer();
      const res = await client.importTopology(file.name, content);
      await disconnectAll();
      dispatch({ type: 'topology/replace', topology: res.data, imported: true });
      resetSessionContext();
      setSidebarOpen(false);
      toast(`已导入 ${res.data.name}：${res.data.devices.length} 台设备，${res.data.links.length} 条链路`);
    } catch (error) {
      const message = errorMessage(error);
      setImportError(`${message}；当前拓扑未被覆盖。`);
      toast(`拓扑导入失败：${message}`);
    } finally {
      setImporting(false);
      input.value = '';
    }
  };

  const refreshTopology = async () => {
    const snapshot = topology;
    setRefreshing(true);
    try {
      const res = await client.scanTopology(snapshot, manualMappings);
      if (workbenchRef.current.topology !== snapshot) return;
      dispatch({ type: 'runtime/replace', devices: res.data.devices });
      const ready = res.data.devices.filter((device) => device.state === 'ready').length;
      toast(`运行状态已刷新：${ready} 台 VRP 就绪，探测 ${res.data.scanned} 个端口`);
    } catch (error) {
      toast(`刷新运行状态失败：${errorMessage(error)}`);
    } finally {
      setRefreshing(false);
    }
  };

  const runScan = async (from: number, to: number, ports?: number[]) => {
    setScanning(true);
    try {
      const res = await client.scan({ from, to, ports });
      const list = res.data.devices ?? [];
      setDevices(list);
      toast(`扫描完成：发现 ${list.length} 个端口`);
    } catch (error) {
      toast(`扫描失败：${errorMessage(error)}`);
    } finally {
      setScanning(false);
    }
  };

  const addManualPort = (port: number) => {
    setDevices((prev) => {
      if (prev.some((device) => device.port === port)) return prev;
      return [...prev, { port, state: 'open' as const }].sort((a, b) => a.port - b.port);
    });
    setManualPort('');
    toast(`已添加端口 ${port}`);
  };

  const handleMap = (deviceId: string, port: number) => {
    const device = topology.devices.find((item) => item.id === deviceId);
    if (!device || !device.vrpCapable || device.comPort === 0) return;
    dispatch({ type: 'mapping/set', deviceId, port });
    if (!imported) setDeviceMapping(scenario.id, deviceId, port);
    toast(`已把 ${device.name} 的 comPort 修正为 ${port}，请刷新运行状态`);
  };

  const returnToPreset = async () => {
    await disconnectAll();
    const nextMappings = imported
      ? scenarioMappings
      : { ...scenarioMappings, ...manualMappings };
    dispatch({
      type: 'topology/replace',
      topology: scenarioToTopology(scenario, nextMappings),
      imported: false,
    });
    resetSessionContext();
    setImportError('');
  };

  /* ---------------------------------- 连接 ---------------------------------- */

  const focusSession = (deviceId: string) => {
    dispatch({ type: 'session/focus', deviceId });
    window.requestAnimationFrame(() => terminalRefs.current[deviceId]?.focus());
  };

  const openDevice = async (deviceId: string, replaceExisting = false): Promise<boolean> => {
    const current = workbenchRef.current;
    const existing = current.sessions[deviceId];
    if (existing && !replaceExisting) {
      focusSession(deviceId);
      return true;
    }
    if (connectingRef.current.has(deviceId)) return false;
    const device = current.topology.devices.find((item) => item.id === deviceId);
    if (!device) return false;
    const currentMappings = effectiveTopologyMappings(current);
    const port = currentMappings[deviceId];
    const deviceRuntime = current.runtime[deviceId];
    if (!canConnectTopologyDevice(device, deviceRuntime, port)) {
      setScanOpen(true);
      if (!device.vrpCapable || device.comPort === 0) toast(`${device.name} 没有可用的 VRP Console`);
      else if (!port) toast(`请先为 ${device.name} 映射 comPort`);
      else if (deviceRuntime?.state === 'name-mismatch') toast(`${device.name} 的提示符主机名不匹配，请修正端口后刷新`);
      else toast(`${device.name} 尚未通过 VRP 探测，请刷新运行状态`);
      return false;
    }

    const snapshot = current.topology;
    const presetScenarioId = current.imported ? null : scenario.id;
    connectingRef.current.add(deviceId);
    setConnectingIds([...connectingRef.current]);
    try {
      if (existing) {
        await client.disconnect(existing.sessionId).catch(() => undefined);
        dispatch({ type: 'session/close', deviceId });
      }
      const res = await client.connect({
        port: port!,
        username: settings.bridge.credentials.username,
        password: settings.bridge.credentials.password,
      });
      const raw = res.data as ConnectResult & {
        prompt?: string;
        view?: string;
        deviceName?: string;
        createdAt?: string;
        lastActiveAt?: string;
      };
      if (workbenchRef.current.topology !== snapshot) {
        await client.disconnect(raw.sessionId).catch(() => undefined);
        return false;
      }
      const deviceName = raw.deviceName || raw.device?.name || device.name;
      const now = new Date().toISOString();
      const info: EnspSessionInfo = {
        sessionId: raw.sessionId,
        port: typeof raw.port === 'number' ? raw.port : port!,
        deviceName,
        prompt: raw.prompt || `<${deviceName}>`,
        view: raw.view || 'user',
        createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
        lastActiveAt: typeof raw.lastActiveAt === 'string' ? raw.lastActiveAt : now,
      };
      dispatch({ type: 'session/open', deviceId, session: info });
      if (presetScenarioId) setDeviceMapping(presetScenarioId, deviceId, port!);
      window.requestAnimationFrame(() => terminalRefs.current[deviceId]?.focus());
      toast(`已连接 ${deviceName}（端口 ${info.port}）`);
      return true;
    } catch (error) {
      toast(`连接失败：${errorMessage(error)}`);
      return false;
    } finally {
      connectingRef.current.delete(deviceId);
      setConnectingIds([...connectingRef.current]);
    }
  };

  const closeSession = async (deviceId: string) => {
    // 先回收该设备的 netmiko worker 会话（独立于 bridge telnet 会话追踪）。
    const workerSid = workerSessionsRef.current[deviceId];
    if (workerSid) {
      delete workerSessionsRef.current[deviceId];
      try {
        await client.workerDisconnect(workerSid);
      } catch {
        /* 清理失败不阻塞本地状态关闭 */
      }
    }
    const item = sessionsRef.current[deviceId];
    if (!item) return;
    try {
      await client.disconnect(item.sessionId);
    } catch (error) {
      toast(`断开失败：${errorMessage(error)}`);
    }
    dispatch({ type: 'session/close', deviceId });
  };

  const renameTab = (deviceId: string) => {
    const current = tabNames[deviceId] || roleName(deviceId);
    const name = window.prompt('输入会话标签名称（最多 40 个字符）', current);
    if (name?.trim()) dispatch({ type: 'tab/rename', deviceId, name });
  };

  const openInMobaxterm = async (deviceId: string) => {
    const port = mappings[deviceId];
    if (typeof port !== 'number') {
      setScanOpen(true);
      toast('该设备还没有映射端口，请先刷新或手动修正');
      return;
    }
    try {
      await client.mobaxtermOpen(mobaxterm?.path ? { port, exe: mobaxterm.path } : { port });
      toast(`已在 MobaXterm 打开 ${roleName(deviceId)}（telnet 127.0.0.1:${port}）`);
    } catch (error) {
      toast(`打开 MobaXterm 失败：${errorMessage(error)}`);
    }
  };

  /* ---------------------------------- 执行与验收 ------------------------------ */

  const execOnRole = async (deviceId: string, command: string) => {
    const item = sessionsRef.current[deviceId];
    if (!item) throw new Error('设备未连接，请先连接设备');
    const res = await client.exec({ sessionId: item.sessionId, command });
    const next: EnspSessionInfo = {
      ...item,
      prompt: res.data.prompt ?? item.prompt,
      view: res.data.view ?? item.view,
      lastActiveAt: new Date().toISOString(),
    };
    dispatch({ type: 'session/update', deviceId, session: next });
    setRecentCommands((prev) => ({
      ...prev,
      [deviceId]: [...(prev[deviceId] ?? []), command].slice(-25),
    }));
    return { output: res.data.output ?? '', prompt: next.prompt, view: next.view };
  };

  const runAcceptance = async () => {
    if (checks.length === 0 || imported) return;
    setAccepting(true);
    const next: Record<string, AcceptanceResult> = {};
    for (const check of checks) {
      if (!sessionsRef.current[check.deviceId]) {
        next[check.id] = { pass: false, reason: '对应设备未连接' };
        continue;
      }
      try {
        const result = await execOnRole(check.deviceId, check.command);
        const evaluated = evaluateCheck(check, result.output);
        next[check.id] = { pass: evaluated.pass, reason: evaluated.reason, raw: result.output };
      } catch (error) {
        next[check.id] = { pass: false, reason: `命令执行失败：${errorMessage(error)}` };
      }
    }
    setAcceptanceResults(next);
    const allPass = checks.every((check) => next[check.id]?.pass);
    if (allPass) {
      markScenarioCompleted(scenario.id);
      toast('验收全部通过，场景已标记为完成');
    } else toast('验收未全部通过，请查看失败原因');
    setAccepting(false);
  };

  /* ---------------------------------- MCP ---------------------------------- */

  const generateTopology = async () => {
    if (!scenario.ensp) return;
    setMcpGenerating(true);
    setMcpError(undefined);
    setMcpSteps([{
      name: '读取场景规格',
      ok: true,
      message: `${Object.keys(scenario.ensp.models).length} 台设备 / ${scenario.ensp.links.length} 条链路`,
    }]);
    try {
      const res = await client.topoGenerate({
        scenarioId: scenario.id,
        spec: scenario.ensp,
        outPath: `./ensp-topo/${scenario.id}.json`,
      });
      const data = res.data;
      const tool = typeof data.tool === 'string' ? data.tool : 'generate_topology';
      const outPath = typeof data.outPath === 'string' ? data.outPath : undefined;
      setTopoPath(outPath);
      setMcpSteps([
        { name: '读取场景规格', ok: true, message: `${Object.keys(scenario.ensp.models).length} 台设备 / ${scenario.ensp.links.length} 条链路` },
        { name: `调用 MCP 工具 ${tool}`, ok: true, message: '工具调用成功' },
        { name: '写入拓扑文件', ok: Boolean(outPath), message: outPath ?? '后端未返回文件路径' },
      ]);
      toast('拓扑生成完成');
    } catch (error) {
      const message = errorMessage(error);
      setMcpError(message);
      setMcpSteps((prev) => [...prev, { name: '生成拓扑', ok: false, message }]);
      toast(`拓扑生成失败：${message}`);
    } finally {
      setMcpGenerating(false);
    }
  };

  /* --------------------------------- 场景与 URL ------------------------------- */

  const selectScenario = (id: string) => {
    if (id === scenario.id && !imported) return;
    const nextScenario = getScenario(id);
    if (!nextScenario) return;
    void (async () => {
      await disconnectAll();
      setScenarioId(id);
      dispatch({
        type: 'topology/replace',
        topology: scenarioToTopology(nextScenario, settings.mappings[id] ?? {}),
        imported: false,
      });
      resetSessionContext();
      setMcpSteps([]);
      setTopoPath(undefined);
      setMcpError(undefined);
      setManualPort('');
      setImportError('');
    })();
  };

  useEffect(() => {
    if (!scenarioParam || scenarioParam === scenarioId || !enspScenarios.some((item) => item.id === scenarioParam)) return;
    selectScenario(scenarioParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioParam, scenarioId]);

  useEffect(() => {
    if (aiParam === '1') setAiOpen(true);
  }, [aiParam]);

  /* --------------------------------- 设置与测试 ------------------------------- */

  const handleSaveSettings = (patch: SettingsPatch) => {
    if (patch.bridge) setBridgeSettings(patch.bridge);
    if (patch.ai) setAiSettings(patch.ai);
    void loadHealth(true);
    void loadMcpStatus();
  };

  const handleResetSettings = () => {
    resetEnspSettings();
    setBridgeTest(idleTest);
    setMcpTest(idleTest);
    setAiTest(idleTest);
    toast('已恢复默认设置');
  };

  const testBridge = async () => {
    setBridgeTest({ state: 'loading' });
    try {
      await client.health();
      setBridgeTest({ state: 'ok', message: '桥接连接正常' });
    } catch (error) {
      setBridgeTest({ state: 'fail', message: errorMessage(error) });
    }
  };

  const testMcp = async () => {
    setMcpTest({ state: 'loading' });
    try {
      const res = await client.mcpStatus();
      const count = typeof res.data.toolsCount === 'number' ? res.data.toolsCount : 0;
      if (res.data.available === true) setMcpTest({ state: 'ok', message: `MCP 可用，共 ${count} 个工具` });
      else setMcpTest({ state: 'fail', message: 'MCP 不可用，请检查安装与命令' });
    } catch (error) {
      setMcpTest({ state: 'fail', message: errorMessage(error) });
    }
  };

  const testAi = async (override?: AiSettings) => {
    const ai: AiSettings = override ?? settings.ai;
    if (!ai.apiKey.trim()) {
      setAiTest({ state: 'fail', message: '未填写 API Key，无法测试' });
      return;
    }
    setAiTest({ state: 'loading' });
    try {
      await client.aiChatStream({
        messages: [{ role: 'user', content: '只回复 ok' }],
        baseUrl: ai.baseUrl,
        apiKey: ai.apiKey,
        model: ai.model,
        temperature: 0,
      }, { onDelta: () => undefined });
      setAiTest({ state: 'ok', message: `AI 接口连接正常（${ai.model}）` });
    } catch (error) {
      const detail = errorMessage(error);
      const hint = detail.includes('bridge_unreachable') || detail.includes('Failed to fetch') ? '（桥接服务未启动，请先运行 npm run bridge）' : '';
      setAiTest({ state: 'fail', message: `连接失败：${detail}${hint}` });
    }
  };

  /* ---------------------------------- 终端与 AI ------------------------------- */

  const insertCommand = (command: string, device: string): boolean => {
    const role = resolveAiTargetRole(device, topology.devices, activeId);
    if (!role) {
      toast(`未找到 AI 指定的设备：${device}`);
      return false;
    }
    if (!sessions[role]) {
      toast(`${roleName(role)} 未连接，无法填入命令`);
      return false;
    }
    dispatch({ type: 'session/focus', deviceId: role });
    setPendingInsert({ command, role, at: Date.now() });
    return true;
  };

  /** 获取（或建立并缓存）指定设备的 netmiko worker 会话，每设备复用一个。 */
  const ensureWorkerSession = async (deviceId: string, portOverride?: number): Promise<string> => {
    const cached = workerSessionsRef.current[deviceId];
    if (cached) return cached;
    const port = portOverride ?? mappings[deviceId];
    if (typeof port !== 'number') {
      throw new Error(`设备 ${roleName(deviceId)} 未映射端口，无法建立 worker 会话`);
    }
    const res = await client.workerConnect({
      host: '127.0.0.1',
      port,
      deviceType: 'huawei_telnet',
      username: settings.bridge.credentials.username,
      password: settings.bridge.credentials.password,
    });
    workerSessionsRef.current[deviceId] = res.data.sessionId;
    return res.data.sessionId;
  };

  const executeCommand = async (command: string, device: string): Promise<AiCommandExecResult | null> => {
    const role = resolveAiTargetRole(device, topology.devices, activeId);
    if (!role) {
      toast(`未找到 AI 指定的设备：${device}`);
      return null;
    }
    if (!sessions[role]) {
      toast(`${roleName(role)} 未连接，无法执行`);
      return null;
    }
    dispatch({ type: 'session/focus', deviceId: role });
    const devName = topology.devices.find((item) => item.id === role)?.name ?? roleName(role);

    const terminalSession = sessions[role];

    // 优先复用已连接的终端会话：命令与回显直接出现在终端，提示符驱动返回，
    // 没有额外建连与固定静默窗口，体感最快。
    if (terminalSession) {
      try {
        const execRes = await client.exec({ sessionId: terminalSession.sessionId, command });
        const output = execRes.data.output ?? '';
        setRecentCommands((prev) => ({
          ...prev,
          [role]: [...(prev[role] ?? []), command].slice(-25),
        }));
        setRecentOutput((prev) => ({
          ...prev,
          [role]: `${prev[role] ?? ''}\n${output}`.slice(-5000),
        }));
        // 只读命令顺带做结构化解析（纯解析、不建连，失败忽略）。
        let structured: unknown;
        let parseNote: string | undefined;
        if (health?.worker?.available && /^(?:display|show)\b/i.test(command.trim())) {
          try {
            const parsed = await client.workerParse({ command, output });
            structured = parsed.data.structured ?? undefined;
            parseNote = parsed.data.parseNote;
          } catch {
            /* 结构化失败不影响命令执行结果 */
          }
        }
        return {
          ok: true,
          deviceId: role,
          deviceName: devName,
          command,
          output,
          structured,
          parseNote,
          view: execRes.data.view,
          viaWorker: false,
        };
      } catch {
        /* 终端通道失败时再用 worker 兜底 */
      }
    }

    // worker 可用时走 netmiko：健壮执行（含视图切换）+ 结构化解析，结果回灌 AI 对话。
    if (health?.worker?.available) {
      try {
        const sessionId = await ensureWorkerSession(role);
        const execRes = await client.workerExec({ sessionId, command, parse: true });
        setRecentCommands((prev) => ({
          ...prev,
          [role]: [...(prev[role] ?? []), command].slice(-25),
        }));
        setRecentOutput((prev) => ({
          ...prev,
          [role]: `${prev[role] ?? ''}\n${execRes.data.output ?? ''}`.slice(-5000),
        }));
        return {
          ok: true,
          deviceId: role,
          deviceName: devName,
          command,
          output: execRes.data.output,
          structured: execRes.data.structured,
          parseNote: execRes.data.parseNote,
          view: execRes.data.view,
          viaWorker: true,
        };
      } catch {
        // worker 失效：清理缓存，降级到终端通道，不阻塞、不报错。
        delete workerSessionsRef.current[role];
      }
    }

    // 降级：现有终端通道（回显由终端异步更新 recentOutput）。
    setPendingRun({ command, role, at: Date.now() });
    return {
      ok: true,
      deviceId: role,
      deviceName: devName,
      command,
      viaWorker: false,
    };
  };

  const handleTerminalOutput = (deviceId: string, text: string) => {
    const clean = text
      .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
      .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
      .replace(/\x00/g, '');
    setRecentOutput((prev) => ({ ...prev, [deviceId]: `${prev[deviceId] ?? ''}${clean}`.slice(-5000) }));
    const combined = `${outputBuffersRef.current[deviceId] ?? ''}${clean}`.slice(-6000);
    outputBuffersRef.current[deviceId] = combined;
    const prompts = [...combined.matchAll(/(?:^|\r?\n)([<\[][A-Za-z0-9_.\-/:]+[>\]])/g)];
    const prompt = prompts[prompts.length - 1]?.[1];
    if (!prompt) return;
    const item = workbenchRef.current.sessions[deviceId];
    if (!item || item.prompt === prompt) return;
    dispatch({
      type: 'session/update',
      deviceId,
      session: {
        ...item,
        prompt,
        deviceName: prompt.slice(1, -1).split('-')[0] || item.deviceName,
        view: prompt.startsWith('<') ? 'user' : prompt.includes('-') ? 'sub' : 'system',
      },
    });
  };

  const handleTerminalCommand = (deviceId: string, command: string) => {
    setRecentCommands((prev) => ({
      ...prev,
      [deviceId]: [...(prev[deviceId] ?? []), command].slice(-25),
    }));
  };

  const handleTerminalInput = (
    deviceId: string,
    data: string,
    context: EnspTerminalInputContext,
  ): boolean => {
    const current = workbenchRef.current;
    const enabled = syncEnabledRef.current;
    const connected = current.openTabs.filter((id) => Boolean(current.sessions[id]));
    const targetIds = resolveSyncTargets(deviceId, enabled, syncSelectedRef.current, connected);
    if ((enabled && targetIds.length < 2) || targetIds.length === 0) {
      if (enabled) updateSyncEnabled(false);
      setWorkspaceIssue(enabled
        ? '同步已关闭：有效目标不足两台，本次输入未发送'
        : `${roleName(deviceId)} 未连接，本次输入未发送`);
      return false;
    }
    const results = sendSyncInput(data, targetIds, syncTargetMap(targetIds), {
      currentCommand: context.currentCommand,
      confirmed: context.confirmed,
    });
    if (enabled) {
      setSyncResults(Object.fromEntries(results.map((result) => [result.deviceId, result.status])));
    }
    const failed = results.filter((result) => result.status !== 'sent');
    setWorkspaceIssue(failed.length
      ? `${enabled ? '同步输入' : '输入'}：${results.map((result) => `${roleName(result.deviceId)} ${SYNC_STATUS_LABELS[result.status]}`).join('；')}`
      : '');
    return results.find((result) => result.deviceId === deviceId)?.status === 'sent';
  };

  const nextAiQuestionId = () => {
    aiRequestSequenceRef.current += 1;
    return `ai-${Date.now().toString(36)}-${aiRequestSequenceRef.current}`;
  };

  /** 只在显式 AI 操作中调用；终端输入、输出、切标签和同步路径不会读取或发送它。 */
  const captureAiContext = (deviceId: string, snapshot?: EnspTerminalAiContext): AiSessionContext => {
    const current = workbenchRef.current;
    const device = current.topology.devices.find((item) => item.id === deviceId);
    const terminal = snapshot ?? (deviceId ? terminalRefs.current[deviceId]?.getContext() : undefined);
    const session = current.sessions[deviceId];
    const topologyId = current.topology.source.scenarioId ?? `${current.topology.source.type}:${current.topology.name}`;
    return {
      topology: { id: topologyId, name: current.topology.name, source: current.topology.source.type },
      scenario: { id: scenario.id, title: scenario.title, summary: scenario.summary, hints: scenario.hints },
      device: { id: deviceId, name: terminal?.deviceName || device?.name || '未打开设备' },
      sessionId: terminal?.sessionId || session?.sessionId || '',
      prompt: terminal?.prompt || session?.prompt || '',
      view: terminal?.view || session?.view || 'user',
      currentInput: terminal?.currentInput ?? '',
      recentCommands: terminal?.recentCommands ?? recentCommands[deviceId] ?? [],
      recentOutput: terminal?.recentOutput ?? recentOutput[deviceId] ?? '',
      selection: terminal?.selection,
      acceptanceSummary,
      sessions: Object.entries(current.sessions).flatMap(([id, item]) => item ? [{
        deviceId: id,
        deviceName: current.topology.devices.find((entry) => entry.id === id)?.name ?? item.deviceName,
        sessionId: item.sessionId,
        prompt: item.prompt,
      }] : []),
      // 同步选择仅作为快照上下文；AI 填入/执行仍只使用上方单一明确 device。
      syncTargets: syncEnabledRef.current ? syncSelectedRef.current.map((id) => ({
        deviceId: id,
        deviceName: current.topology.devices.find((entry) => entry.id === id)?.name ?? id,
        sessionId: current.sessions[id]?.sessionId ?? '',
      })) : [],
    };
  };

  const queueAiQuestion = (deviceId: string, kind: AiQuestionKind, text: string, snapshot?: EnspTerminalAiContext) => {
    if (deviceId) dispatch({ type: 'session/focus', deviceId });
    setPendingAsk({
      id: nextAiQuestionId(),
      kind,
      text,
      context: captureAiContext(deviceId, snapshot),
    });
    setAiOpen(true);
  };

  const handleAskAi = (deviceId: string, snapshot: EnspTerminalAiContext) => {
    const kind: AiQuestionKind = snapshot.selection
      ? 'selection'
      : snapshot.currentInput
        ? 'current-input'
        : 'recent';
    const text = kind === 'selection'
      ? '请解释这段用户授权终端选区及其关键输出。'
      : kind === 'current-input'
        ? '请解释当前输入命令的用途、关键参数和注意事项。'
        : '请解释最近命令及其输出要点；若有错误请给出可能原因和排查步骤。';
    queueAiQuestion(deviceId, kind, text, snapshot);
  };

  const handleQuickAsk = (kind: 'explain' | 'diagnose' | 'next') => {
    const questionKind: AiQuestionKind = kind === 'explain' ? 'step' : kind;
    const text = kind === 'explain'
      ? '请结合当前设备、提示符和视图，解释这一步应该做什么。'
      : kind === 'diagnose'
        ? '请根据有界最近输出诊断可能的报错，并给出排查步骤。'
        : '请结合当前场景和验收状态，给我下一组要执行的命令。';
    queueAiQuestion(activeDevice?.id ?? '', questionKind, text);
  };

  useEffect(() => {
    if (aiOpen) setAiUnread(false);
  }, [aiOpen]);

  const acceptanceSummary = checks.map((check) => {
    const result = acceptanceResults[check.id];
    return `${check.text}：${result ? (result.pass ? '通过' : `未通过（${result.reason}）`) : '未运行'}`;
  }).join('；');
  const completedCount = enspScenarios.filter((item) => settings.completed[item.id]).length;

  if (!activeDevice && topology.devices.length === 0) {
    return (
      <div className="fade-up">
        <h1 className="page-title">eNSP 真机实验室</h1>
        <p className="page-sub">当前拓扑没有可用设备，请导入有效的 .topo 文件。</p>
        <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>导入 .topo</button>
        <input ref={fileInputRef} type="file" accept=".topo" hidden onChange={(event) => void importTopoFile(event)} />
      </div>
    );
  }

  return (
    <div className="fade-up ensp-workbench-page">
      <h1 className="page-title">eNSP 真机实验室</h1>
      <p className="page-sub" style={{ marginBottom: 12 }}>
        导入已保存的 eNSP 拓扑，按真实 Console 状态打开独立终端；预置场景、远程验收与 AI 手册引导仍可直接使用。
      </p>

      <div className="tabs" role="tablist" aria-label="实验室模式" style={{ marginBottom: 12 }}>
        <Link to="/lab" role="tab" aria-selected="false" className="tab">故障排查</Link>
        <Link to="/lab/ensp" role="tab" aria-selected="true" className="tab active">eNSP 真机</Link>
        <Link to="/lab/library" role="tab" aria-selected="false" className="tab">实验手册</Link>
      </div>

      <div className="moba-scenarios" role="group" aria-label="选择实验场景">
        <span className="tiny faint">场景</span>
        {enspScenarios.map((item) => {
          const active = item.id === scenario.id && !imported;
          const done = Boolean(settings.completed[item.id]);
          return (
            <button key={item.id} type="button" className={`chip${active ? ' active' : ''}`} onClick={() => selectScenario(item.id)} aria-pressed={active} title={item.summary}>
              {item.title}{done ? <span className="badge ok" style={{ padding: '0 6px' }}>已完成</span> : null}
            </button>
          );
        })}
        <span className="spacer" />
        <span className="tiny faint">已完成 {completedCount} / {enspScenarios.length}</span>
      </div>

      <input ref={fileInputRef} type="file" accept=".topo" hidden onChange={(event) => void importTopoFile(event)} aria-label="选择 eNSP .topo 文件" />
      <div className="moba-window ensp-workbench-window">
        <div className="moba-titlebar">
          <span className="moba-lights" aria-hidden="true"><i /><i /><i /></span>
          <span className="moba-window-title">{topology.name}</span>
          <span className="moba-window-sub">{sourceLabel(topology)} · {topology.devices.length} 台设备</span>
          <span className="spacer" />
          <span className={`moba-bridge-pill${health ? ' ok' : ' bad'}`} title={healthError ?? undefined}>{health ? '桥接在线' : '桥接离线'}</span>
          <button type="button" className="moba-bar-btn" onClick={() => fileInputRef.current?.click()} disabled={importing}>{importing ? '导入中…' : '导入 .topo'}</button>
          <button type="button" className="moba-bar-btn" onClick={() => void refreshTopology()} disabled={refreshing}>{refreshing ? '刷新中…' : '刷新状态'}</button>
          <button type="button" className="moba-bar-btn" onClick={() => setSettingsOpen(true)} aria-label="打开设置">设置</button>
        </div>

        <div className={`moba-body${aiOpen && !narrow ? ' with-ai' : ''}`}>
          <WorkbenchSidebar
            topology={topology}
            mappings={mappings}
            runtime={runtime}
            sessions={sessions}
            openTabs={openTabs}
            activeId={activeId}
            tabNames={tabNames}
            mobile={narrow}
            mobileOpen={sidebarOpen}
            onCloseMobile={() => setSidebarOpen(false)}
            onOpenDevice={(deviceId) => void openDevice(deviceId)}
            onFocusSession={focusSession}
            onOpenMappings={() => setScanOpen(true)}
            onOpenMobaxterm={(deviceId) => void openInMobaxterm(deviceId)}
          />

          <section className="moba-main">
            <WorkbenchTabs
              topology={topology}
              openTabs={openTabs}
              activeId={activeId}
              tabNames={tabNames}
              sessions={sessions}
              onFocus={focusSession}
              onRename={renameTab}
              onClose={(deviceId) => void closeSession(deviceId)}
            />

            <div className="moba-crumb ensp-workbench-toolbar">
              <button type="button" className="btn btn-sm btn-ghost moba-mobile-only" onClick={() => setSidebarOpen(true)}>会话树</button>
              <span className="moba-crumb-path">{topology.name} / {activeDevice?.name ?? '未打开会话'}</span>
              <span className="tiny faint">{activeSession ? `telnet 127.0.0.1:${activeSession.port}` : `${connectedRoles.length} 个已开会话`}</span>
              <span className="spacer" />
              <div className="moba-layout-switch" role="group" aria-label="终端分屏">
                {([1, 2, 4] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={(narrow ? 1 : layout) === count ? 'active' : ''}
                    aria-pressed={(narrow ? 1 : layout) === count}
                    disabled={narrow && count !== 1}
                    title={narrow && count !== 1 ? '窄屏强制单窗格' : undefined}
                    onClick={() => dispatch({ type: 'layout/set', layout: count })}
                  >
                    {count === 1 ? '单屏' : count === 2 ? '双分屏' : '四分屏'}
                  </button>
                ))}
              </div>
              {imported ? <button type="button" className="btn btn-sm btn-ghost" onClick={() => void returnToPreset()}>返回场景</button> : null}
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => activeDevice && void openInMobaxterm(activeDevice.id)} disabled={!activeDevice || !mappings[activeDevice.id]}>外部打开</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setScanOpen(true)}>运行 / 映射</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAiOpen((value) => !value)} aria-expanded={aiOpen}>{aiOpen ? '收起 AI' : 'AI 助教'}</button>
            </div>

            <div className={`moba-syncbar${syncEnabled ? ' active' : ''}`} role="group" aria-label="MultiExec 同步输入">
              <button
                type="button"
                className="moba-sync-toggle"
                aria-pressed={syncEnabled}
                onClick={toggleSync}
              >
                {syncEnabled ? '关闭同步' : '开启同步'}
              </button>
              <button type="button" className="moba-sync-toggle" onClick={selectAllSyncTargets} disabled={connectedRoles.length === 0}>
                全选就绪
              </button>
              <div className="moba-sync-targets" aria-label="同步目标（至少选择两台）">
                {connectedRoles.length === 0 ? <span>暂无已连接设备</span> : connectedRoles.map((deviceId) => {
                  const selected = syncSelected.includes(deviceId);
                  const ready = terminalStatuses[deviceId] === 'ready';
                  const name = tabNames[deviceId] || roleName(deviceId);
                  const result = syncResults[deviceId];
                  return (
                    <label key={deviceId} className={selected ? 'selected' : ''} title={ready ? name : `${name} 当前未就绪`}>
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={!ready && !selected}
                        aria-label={`同步到 ${name}`}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...syncSelectedRef.current, deviceId]
                            : syncSelectedRef.current.filter((id) => id !== deviceId);
                          updateSyncSelection(next);
                          if (syncEnabled && next.length < 2) setWorkspaceIssue('同步已关闭：选中目标不足两台');
                        }}
                      />
                      <span>{name}{!ready ? ' · 未就绪' : ''}{result ? ` · ${SYNC_STATUS_LABELS[result]}` : ''}</span>
                    </label>
                  );
                })}
              </div>
              <span className={syncEnabled ? 'moba-sync-broadcast' : 'tiny faint'}>
                {syncEnabled
                  ? `广播中，仅发送至：${syncTargetNames.join('、')}`
                  : '默认关闭；选择至少两台就绪且可写设备后才能开启'}
              </span>
            </div>

            {imported || importError ? (
              <div className="ensp-import-status">
                <div className="tiny">
                  <strong>解析来源：</strong>{sourceLabel(topology)}
                  {topology.source.fallbackReason ? <span> · 降级原因：{topology.source.fallbackReason}</span> : null}
                </div>
                {topology.warnings.length ? (
                  <details>
                    <summary>解析告警（{topology.warnings.length}）</summary>
                    <ul>{topology.warnings.map((warning, index) => <li key={`${warning.code}-${index}`}>{warning.message}{warning.deviceId ? `（${warning.deviceId}）` : ''}</li>)}</ul>
                  </details>
                ) : null}
                {importError ? <div className="ensp-error small" role="alert">{importError}</div> : null}
              </div>
            ) : null}
            {workspaceIssue ? <div className="ensp-workspace-issue" role="status">{workspaceIssue}</div> : null}

            <div className={`moba-pane moba-pane-grid layout-${narrow ? 1 : layout}`}>
              {openTabs.length === 0 ? (
                <div className="ensp-workbench-empty">
                  <strong>从拓扑开始实验</strong>
                  <span>先刷新运行状态，再点击就绪设备；已开标签可切换、重命名、关闭或分屏。</span>
                  <div className="hstack" style={{ justifyContent: 'center' }}>
                    <button type="button" className="btn btn-sm" onClick={() => setScanOpen(true)}>运行状态 / 映射</button>
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => fileInputRef.current?.click()}>导入 .topo</button>
                  </div>
                </div>
              ) : openTabs.map((deviceId) => {
                const device = topology.devices.find((item) => item.id === deviceId);
                const deviceSession = sessions[deviceId];
                if (!device || !deviceSession) return null;
                const visible = visibleIds.includes(deviceId);
                const active = activeId === deviceId;
                return (
                  <section
                    key={deviceId}
                    className={`moba-terminal-cell${visible ? '' : ' is-hidden'}${active ? ' active' : ''}`}
                    onMouseDownCapture={() => dispatch({ type: 'session/focus', deviceId })}
                    aria-label={`${tabNames[deviceId] || device.name} 终端窗格`}
                  >
                    <EnspTerminal
                      ref={(handle) => { terminalRefs.current[deviceId] = handle; }}
                      scenarioDevice={{ id: device.id, name: tabNames[deviceId] || device.name }}
                      port={mappings[device.id]}
                      session={deviceSession}
                      connecting={connectingIds.includes(deviceId)}
                      active={active}
                      visible={visible}
                      syncDescription={syncEnabled ? syncTargetNames.join('、') : device.name}
                      syncActive={syncEnabled}
                      getSyncDangerousCommands={() => syncDangerousCommandLabels(device.id)}
                      onConnect={() => void openDevice(device.id, true)}
                      onDisconnect={() => void closeSession(device.id)}
                      onInput={(data, context) => handleTerminalInput(device.id, data, context)}
                      onOutput={(text) => handleTerminalOutput(device.id, text)}
                      onCommand={(command) => handleTerminalCommand(device.id, command)}
                      onTransportError={(message) => setWorkspaceIssue(`${device.name}：${message}`)}
                      onStatusChange={(status) => setTerminalStatuses((current) =>
                        current[deviceId] === status ? current : { ...current, [deviceId]: status }
                      )}
                      onAskAi={(_text, context) => handleAskAi(device.id, context)}
                      pendingInsert={pendingInsert?.role === device.id ? pendingInsert : null}
                      pendingRun={pendingRun?.role === device.id ? pendingRun : null}
                      disabledReason="请检查运行状态与 comPort 映射后重新连接。"
                    />
                  </section>
                );
              })}
            </div>
          </section>

          <AiTutorDrawer
            open={aiOpen}
            onClose={() => setAiOpen(false)}
            scenario={scenario}
            activeTargetKey={`${topology.source.scenarioId ?? topology.name}:${activeDevice?.id ?? ''}:${activeSession?.sessionId ?? ''}`}
            captureContext={() => captureAiContext(activeDevice?.id ?? '')}
            ai={settings.ai}
            onOpenSettings={() => {
              setAiOpen(false);
              setSettingsOpen(true);
            }}
            onInsertCommand={insertCommand}
            onExecuteCommand={executeCommand}
            initialPrompt={aiParam === '1' ? `请按《${scenario.title}》手册带我完成这个实验：先说明目标，再给出第一步命令并解释。` : undefined}
            pendingAsk={pendingAsk}
            side={fabSide}
            onBusyChange={setAiBusy}
            onAnswered={() => {
              if (!aiOpen) setAiUnread(true);
            }}
            presentation={narrow ? 'drawer' : 'inline'}
          />
        </div>
      </div>

      <details className="moba-config">
        <summary>桥接状态与接入指引</summary>
        <div style={{ marginTop: 10 }}>
          <BridgeStatusCard
            health={health}
            error={healthError}
            loading={healthLoading}
            deviceCount={readyCount || devices.length}
            guideOpen={guideOpen}
            onRefresh={() => {
              void loadHealth(false);
              void loadMcpStatus();
              void loadMobaxterm();
            }}
            onOpenSettings={() => setSettingsOpen(true)}
            onToggleGuide={() => setGuideOpen((value) => !value)}
          />
        </div>
        <div style={{ marginTop: 10 }}><SetupGuide open={guideOpen} onToggle={() => setGuideOpen((value) => !value)} /></div>
      </details>

      {scanOpen ? (
        <div className="ensp-library-layer" role="dialog" aria-modal="true" aria-label="设备运行状态与端口映射">
          <div className="ensp-library-backdrop" onClick={() => setScanOpen(false)} />
          <div className="ensp-library-dialog ensp-runtime-dialog">
            <div className="hstack" style={{ justifyContent: 'space-between' }}>
              <div className="card-title">设备运行状态与 comPort 映射</div>
              <button type="button" className="btn btn-sm" onClick={() => setScanOpen(false)} aria-label="关闭设备扫描面板">关闭</button>
            </div>
            <div className="tiny faint" style={{ overflowWrap: 'anywhere' }}>
              {mobaxterm?.found ? `可选外部终端：${mobaxterm.path}` : '未检测到 MobaXterm；应用内终端不依赖外部程序。'}
            </div>
            <DeviceScanPanel
              topology={topology}
              runtime={runtime}
              devices={devices}
              scanning={scanning}
              refreshing={refreshing}
              onRefresh={() => void refreshTopology()}
              onScan={runScan}
              manualPort={manualPort}
              onManualPortChange={setManualPort}
              onAddManualPort={addManualPort}
              mappings={mappings}
              onMap={handleMap}
              onConnect={(deviceId) => {
                void openDevice(deviceId).then((opened) => {
                  if (opened) setScanOpen(false);
                });
              }}
              onDisconnect={(deviceId) => void closeSession(deviceId)}
              connectedRoles={connectedRoles}
              connectingRoles={connectingIds}
            />
          </div>
        </div>
      ) : null}

      <div className="ensp-grid moba-secondary">
        {imported ? (
          <section className="card ensp-acceptance" aria-label="预置场景远程验收">
            <div className="card-title">远程验收</div>
            <p className="small muted" style={{ marginTop: 8 }}>导入文件不包含预置场景验收数据。返回「{scenario.title}」后可继续使用原有远程验收与学习进度。</p>
            <button type="button" className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => void returnToPreset()}>返回预置场景</button>
          </section>
        ) : (
          <RemoteAcceptance scenario={scenario} mappings={mappings} sessionsByRole={sessions} onRun={runAcceptance} results={acceptanceResults} running={accepting} />
        )}
        <McpTopologyPanel status={mcp} onGenerate={generateTopology} generating={mcpGenerating} steps={mcpSteps} topoPath={topoPath} error={mcpError} />
      </div>

      <AiTutorFab
        open={aiOpen}
        onToggle={() => setAiOpen((value) => !value)}
        onSideChange={setFabSide}
        connected={connectedRoles.length > 0}
        busy={aiBusy}
        unread={aiUnread}
        onQuickAsk={handleQuickAsk}
        onOpenSettings={() => {
          setAiOpen(false);
          setSettingsOpen(true);
        }}
      />

      <EnspSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        bridgeTest={bridgeTest}
        mcpTest={mcpTest}
        aiTest={aiTest}
        onTestBridge={() => void testBridge()}
        onTestMcp={() => void testMcp()}
        onTestAi={() => void testAi()}
        onReset={handleResetSettings}
      />
    </div>
  );
}
