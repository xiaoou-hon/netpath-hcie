import { isDangerousCommand } from './terminal.ts';
import { hasInputLineBreak, unwrapBracketedPaste } from './terminal-stream.ts';

export type SyncTargetStatus = 'ready' | 'offline' | 'locked' | 'unavailable';
export type SyncInputStatus = 'sent' | SyncTargetStatus | 'write-failed' | 'confirmation-required';

export interface SyncInputTarget {
  status: () => SyncTargetStatus;
  write: (data: string) => boolean;
  currentCommand?: () => string;
}

export interface SyncInputResult {
  deviceId: string;
  status: SyncInputStatus;
}

export interface SyncInputConfirmation {
  currentCommand?: string;
  confirmed?: boolean;
}

/** 同步模式只使用显式目标；关闭时仅返回仍连接的当前设备。 */
export function resolveSyncTargets(
  activeRole: string,
  enabled: boolean,
  selectedRoles: string[],
  connectedRoles: string[],
): string[] {
  const connected = new Set(connectedRoles);
  if (!enabled) return connected.has(activeRole) ? [activeRole] : [];
  return [...new Set(selectedRoles.filter((role) => connected.has(role)))];
}

export function canEnableSync(
  selectedRoles: string[],
  targets: Record<string, SyncInputTarget | undefined>,
): boolean {
  const selected = [...new Set(selectedRoles)];
  return selected.length >= 2 && selected.every((role) => targets[role]?.status() === 'ready');
}

export function needsSyncConfirmation(data: string, currentCommand = ''): boolean {
  const unwrapped = unwrapBracketedPaste(data).data;
  const isSingleEnter = unwrapped === '\r' || unwrapped === '\n';
  if (hasInputLineBreak(data) && !isSingleEnter) return true;
  return isSingleEnter && isDangerousCommand(currentCommand);
}

export interface SyncDangerousCommand {
  deviceId: string;
  command: string;
}

export function dangerousSyncCommands(
  data: string,
  selectedRoles: string[],
  targets: Record<string, SyncInputTarget | undefined>,
): SyncDangerousCommand[] {
  const unwrapped = unwrapBracketedPaste(data).data;
  if (unwrapped !== '\r' && unwrapped !== '\n') return [];
  return [...new Set(selectedRoles)].flatMap((deviceId) => {
    const command = targets[deviceId]?.currentCommand?.() ?? '';
    return isDangerousCommand(command) ? [{ deviceId, command }] : [];
  });
}

/** 逐目标同步写入；任何单目标失败都不会中断其他目标，也不会伪报整体成功。 */
export function sendSyncInput(
  data: string,
  selectedRoles: string[],
  targets: Record<string, SyncInputTarget | undefined>,
  confirmation: SyncInputConfirmation = {},
): SyncInputResult[] {
  const roles = [...new Set(selectedRoles)];
  const needsConfirmation = needsSyncConfirmation(data, confirmation.currentCommand) ||
    dangerousSyncCommands(data, roles, targets).length > 0;
  if (needsConfirmation && !confirmation.confirmed) {
    return roles.map((deviceId) => ({ deviceId, status: 'confirmation-required' }));
  }
  return roles.map((deviceId) => {
    const target = targets[deviceId];
    if (!target) return { deviceId, status: 'unavailable' };
    const status = target.status();
    if (status !== 'ready') return { deviceId, status };
    try {
      return { deviceId, status: target.write(data) ? 'sent' : 'write-failed' };
    } catch {
      return { deviceId, status: 'write-failed' };
    }
  });
}
