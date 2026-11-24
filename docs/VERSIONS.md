# 版本与线上部署记录

本文件汇总项目已发布版本与线上展示入口，便于追溯与回退。

## v1.2.0（当前工作区版本）

- 前端：React 18 + Vite 5 + TypeScript
- 桥接：Node.js 服务（127.0.0.1:7701）
- 设备执行器：Python sidecar（netmiko / ntc-templates / textfsm）
- 构建：`npm run build`，静态产物输出至 `dist/`

## v1.1.0 · 知识库扩充与文档导入版（2026-11-20）

- 故障排查案例扩充至 15 个，统一为五段式结构
- 实验手册 5 个场景按「实验步骤 / 关键命令 / 验证标准」标准化
- 新增 Word（docx/doc）与 PDF 文档导入、结构化拆分与导入前预览
- 导入内容可关联案例库与实验手册库，含体积/扩展名/HTML 净化等校验
- 线上展示：https://37jvuljvvx51pwvubrz.traesite.cn （static-web，公开，已验证可访问）
- 回退部署 ID：dep_6af98fe570ecc07b5d2f91cb（v1.0.0）

## v1.0.0

- 初始版本：课程模块、互动图解、测验与 eNSP 工作台基础能力
- 快照保留于本地 `versions/v1.0.0/`，不纳入 Git 仓库
