/**
 * 导入内容的本地持久化（localStorage）：故障排查案例库 / 实验手册库。
 * 与应用既有 localStorage 模式一致，导入内容不依赖后端存储。
 */
import type { ImportedTroubleshootCase, ImportedManual } from '@/types/import';

const TS_KEY = 'netpath:imported-troubleshoot';
const MANUAL_KEY = 'netpath:imported-manuals';

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* 配额或隐私模式失败时静默降级 */
  }
}

export function loadImportedTroubleshoot(): ImportedTroubleshootCase[] {
  return readList<ImportedTroubleshootCase>(TS_KEY);
}

export function saveImportedTroubleshoot(items: ImportedTroubleshootCase[]): void {
  writeList(TS_KEY, items);
}

export function addImportedTroubleshoot(item: ImportedTroubleshootCase): ImportedTroubleshootCase[] {
  const list = loadImportedTroubleshoot();
  const next = [item, ...list.filter((x) => x.id !== item.id)];
  saveImportedTroubleshoot(next);
  return next;
}

export function removeImportedTroubleshoot(id: string): ImportedTroubleshootCase[] {
  const next = loadImportedTroubleshoot().filter((x) => x.id !== id);
  saveImportedTroubleshoot(next);
  return next;
}

export function loadImportedManuals(): ImportedManual[] {
  return readList<ImportedManual>(MANUAL_KEY);
}

export function saveImportedManuals(items: ImportedManual[]): void {
  writeList(MANUAL_KEY, items);
}

export function addImportedManual(item: ImportedManual): ImportedManual[] {
  const list = loadImportedManuals();
  const next = [item, ...list.filter((x) => x.id !== item.id)];
  saveImportedManuals(next);
  return next;
}

export function removeImportedManual(id: string): ImportedManual[] {
  const next = loadImportedManuals().filter((x) => x.id !== id);
  saveImportedManuals(next);
  return next;
}

export function newImportId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
