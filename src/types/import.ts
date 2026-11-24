/**
 * 文档导入（Word / PDF）共享类型契约
 * ------------------------------------------------------------------
 * 后端解析 -> 前端预览编辑 -> localStorage 落地 -> 关联到故障排查案例库 / 实验手册库。
 */
import type { Depth } from '@/types';

export type DocKind = 'troubleshoot' | 'manual';
export type DocType = 'docx' | 'doc' | 'pdf';

export interface ParsedSection {
  heading: string;
  content: string;
}

export interface ParsedManualStep {
  title: string;
  text: string;
  commands: string[];
}

/** 服务端 `/api/import/document` 返回的结构化结果，用于前端预览与编辑 */
export interface DocumentParseResult {
  filename: string;
  kind: DocKind;
  type: DocType;
  title: string;
  summary: string;
  /** 故障案例候选字段（kind=troubleshoot） */
  symptom?: string;
  triageSteps?: string[];
  rootCauseAnalysis?: string;
  solution?: string;
  prevention?: string[];
  /** 实验手册候选字段（kind=manual） */
  steps?: ParsedManualStep[];
  keyCommands?: string[];
  acceptance?: string[];
  /** 原始结构化分段，供预览展示与用户二次编辑 */
  sections: ParsedSection[];
  warnings: string[];
  stats: { chars: number; sections: number; commands: number };
}

/** 落地到 localStorage 的导入故障案例（只读五段式参考案例，不进入判分交互） */
export interface ImportedTroubleshootCase {
  id: string;
  imported: true;
  source: string;
  createdAt: number;
  title: string;
  summary: string;
  level: Depth;
  symptom: string;
  triageSteps: string[];
  rootCauseAnalysis: string;
  solution: string;
  prevention: string[];
}

/** 落地到 localStorage 的导入实验手册 */
export interface ImportedManual {
  id: string;
  imported: true;
  source: string;
  createdAt: number;
  title: string;
  summary: string;
  level: '入门' | '进阶' | '综合';
  tags: string[];
  steps: ParsedManualStep[];
  keyCommands: string[];
  acceptance: string[];
}
