import { useSyncExternalStore } from 'react';
import type { AiSettings, BridgeSettings, EnspSettings } from '@/types/ensp';

const STORAGE_KEY = 'netpath:ensp:v1';

function createDefault(): EnspSettings {
  return {
    bridge: {
      bridgeUrl: 'http://127.0.0.1:7701',
      mcpCommand: 'ensp-mcp',
      credentials: { username: 'admin', password: 'admin' },
    },
    ai: {
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: '',
      model: 'deepseek-chat',
      temperature: 0.3,
    },
    mappings: {},
    completed: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function loadSettings(): EnspSettings {
  const fallback = createDefault();
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return fallback;

    const bridge = isRecord(parsed.bridge) ? parsed.bridge : {};
    const credentials = isRecord(bridge.credentials) ? bridge.credentials : {};
    const ai = isRecord(parsed.ai) ? parsed.ai : {};

    return {
      bridge: {
        bridgeUrl:
          typeof bridge.bridgeUrl === 'string' && bridge.bridgeUrl
            ? bridge.bridgeUrl
            : fallback.bridge.bridgeUrl,
        mcpCommand:
          typeof bridge.mcpCommand === 'string' && bridge.mcpCommand
            ? bridge.mcpCommand
            : fallback.bridge.mcpCommand,
        credentials: {
          username:
            typeof credentials.username === 'string'
              ? credentials.username
              : fallback.bridge.credentials.username,
          password:
            typeof credentials.password === 'string'
              ? credentials.password
              : fallback.bridge.credentials.password,
        },
      },
      ai: {
        baseUrl: typeof ai.baseUrl === 'string' && ai.baseUrl ? ai.baseUrl : fallback.ai.baseUrl,
        apiKey: typeof ai.apiKey === 'string' ? ai.apiKey : fallback.ai.apiKey,
        model: typeof ai.model === 'string' && ai.model ? ai.model : fallback.ai.model,
        temperature: typeof ai.temperature === 'number' ? ai.temperature : fallback.ai.temperature,
      },
      mappings: isRecord(parsed.mappings)
        ? (parsed.mappings as EnspSettings['mappings'])
        : {},
      completed: isRecord(parsed.completed)
        ? (parsed.completed as EnspSettings['completed'])
        : {},
    };
  } catch {
    return fallback;
  }
}

let state: EnspSettings = loadSettings();
const listeners = new Set<() => void>();

function emit() {
  state = { ...state };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 存储不可用时降级为内存态 */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getEnspSettings(): EnspSettings {
  return state;
}

export function useEnspSettings(): EnspSettings {
  return useSyncExternalStore(subscribe, getEnspSettings, getEnspSettings);
}

/* ---------------------------------- 动作 ---------------------------------- */

export function setBridgeSettings(patch: Partial<BridgeSettings>) {
  state.bridge = {
    ...state.bridge,
    ...patch,
    credentials: {
      ...state.bridge.credentials,
      ...(patch.credentials ?? {}),
    },
  };
  emit();
}

export function setAiSettings(patch: Partial<AiSettings>) {
  state.ai = { ...state.ai, ...patch };
  emit();
}

export function setDeviceMapping(scenarioId: string, role: string, port: number) {
  const prev = state.mappings[scenarioId] ?? {};
  state.mappings = { ...state.mappings, [scenarioId]: { ...prev, [role]: port } };
  emit();
}

export function clearScenarioMapping(scenarioId: string) {
  const next = { ...state.mappings };
  delete next[scenarioId];
  state.mappings = next;
  emit();
}

export function markScenarioCompleted(scenarioId: string) {
  if (state.completed[scenarioId]) return;
  state.completed = { ...state.completed, [scenarioId]: { at: new Date().toISOString() } };
  emit();
}

export function unmarkScenarioCompleted(scenarioId: string) {
  if (!state.completed[scenarioId]) return;
  const next = { ...state.completed };
  delete next[scenarioId];
  state.completed = next;
  emit();
}

export function resetEnspSettings() {
  state = createDefault();
  emit();
}

/* ---------------------------------- 派生 ---------------------------------- */

export function scenarioDevicesMapped(scenarioId: string, roles: string[]): boolean {
  const mapping = state.mappings[scenarioId];
  if (!mapping) return false;
  return roles.every((role) => typeof mapping[role] === 'number');
}

export function getScenarioPorts(scenarioId: string, roles: string[]): Record<string, number> {
  const mapping = state.mappings[scenarioId] ?? {};
  const result: Record<string, number> = {};
  for (const role of roles) {
    const port = mapping[role];
    if (typeof port === 'number') result[role] = port;
  }
  return result;
}
