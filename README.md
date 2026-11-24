# NetPath · 网络工程师成长引擎

> 从零基础到 HCIE-Datacom 专家的可视化学习平台。把网络「真正看懂」——从一根网线到一张企业网，再到云上网络。

[![version](https://img.shields.io/badge/version-v1.2.0-14b8a6)](package.json) [![stack](https://img.shields.io/badge/stack-React%20%7C%20Vite%20%7C%20TypeScript-61dafb)](#技术栈) [![license](https://img.shields.io/badge/license-MIT-ffd54f)](LICENSE)

## 这是什么

NetPath 面向网络工程师学习者，把抽象的协议与组网过程做成**可交互的图解**和**可动手的实验**，按阶段推进、用测验验收、用仪表盘跟踪进度。项目对标华为 HCIE-Datacom 能力要求，并额外提供传统网络向云网络转型的学习路径。

- **中文优先**：术语、类比、命令、排错路径全部围绕华为 VRP 与国内企业园区场景组织。
- **可视化 + 可交互**：不是静态文章，而是能拖动、点击、播放的协议图解。
- **学练一体**：课程 → 命令 → 实验 → 测验 → 错题与进度回流，形成闭环。

## 核心功能

| 模块 | 能力 |
| --- | --- |
| 成长路径 | L1 小白入门 → L2 半专业人员 → L3 专业人员 → L4 云网络工程师，逐级晋升并带达标条件 |
| 可视化课程 | 覆盖 TCP/IP、IGP/BGP、交换与 WLAN、网络安全、IPv6、运维排障与自动化 |
| 互动图解 | STP 选举、OSPF 邻居/洪泛/排障、BGP 选路/状态机、TCP 握手、子网计算、VRRP、VXLAN/EVPN、WLAN 上线、TCP/IP 封装等 |
| 测验中心 | 分模块自测、错题回流、达标阈值判定 |
| 故障排查实训 | 按「故障现象 / 排查步骤 / 根因分析 / 解决方案 / 规避措施」组织的案例库 |
| eNSP 桥接实验室 | 拓扑可视化、Web 终端、设备扫描、多终端同步输入、AI 助教、远程验收 |
| 云网转型 | 传统网络到 VPC/路由表/安全组/CNI 的映射、学习优先级与综合设计验收 |
| 文档导入 | 解析 Word（docx/doc）与 PDF，结构化拆分后关联案例库与实验手册 |
| 个人中心 | 仪表盘、收藏与笔记、全局搜索（`/` 快捷键）、深浅色主题 |

## 数据规模

仓库内的课程与题库以源码形式维护（`src/data/modules/`、`src/data/quizzes/`），新增内容只需新增文件，自动聚合。

- 23 个课程模块（M00–M22）、约 136 个可视化课时
- 17 个互动图解组件（`src/components/interactive/viz/`）
- 4 个成长阶段与 12 项云网转型映射
- 15 个故障排查案例、5 个实验手册场景

## 技术栈

- **前端**：React 18 + Vite 5 + TypeScript + React Router（HashRouter，便于静态托管）
- **终端**：@xterm/xterm + @xterm/addon-fit
- **桥接服务**：Node.js（原生 http + WebSocket），监听 `127.0.0.1:7701`
- **设备执行器**：Python sidecar（netmiko + ntc-templates + textfsm），监听 `127.0.0.1:7710`
- **文档解析**：mammoth（docx）、word-extractor（doc）、pdf-parse v2（pdf）
- **持久化**：浏览器 localStorage（学习进度、设置、笔记、导入内容）

## 快速开始

需要 Node.js 18+。eNSP 实验另需 Windows 上的 eNSP / MobaXterm 与 Python 3.10+。

```bash
npm install
npm run dev        # 前端开发服务器
npm run bridge     # 桥接服务（含 eNSP 实验时需要）
npm run dev:all    # 同时启动前端与桥接服务
npm run build      # 类型检查 + 生产构建，产物在 dist/
npm run preview    # 本地预览构建产物
```

测试：

```bash
npm run test:server     # 桥接服务测试
npm run test:client     # 前端与课程数据测试
npm run test:terminal   # 终端流测试
```

Python sidecar（可选）：

```bash
python -m pip install -r python/requirements.txt
python python/worker.py --port 7710
```

## eNSP 实验与安全说明

桥接服务与 Python sidecar **仅监听 127.0.0.1**，用于连接本机 eNSP 暴露的 VRP 设备端口。

> ⚠️ 当前 Python sidecar 对 `show/display` 与配置命令均直接下发，**不做人工确认拦截**。请仅在隔离的实验环境使用，使用只读/低权限账号；不要让桥接服务对公网暴露。生产场景应补充命令白名单、人工确认与变更审计（仓库内 `AI直连设备开源项目调研报告.md` 记录了相关方案调研）。

## 目录结构

```
.
├── index.html            页面入口与元信息
├── src/                  前端源码
│   ├── pages/            路由页面（首页/路径/课程/测验/实验/仪表盘/搜索等）
│   ├── components/       布局、图解、eNSP 工作台、课程渲染等组件
│   ├── data/             课程、题库、测验、云网转型与故障案例数据
│   ├── lib/              桥接客户端、终端流、导入存储等逻辑
│   ├── store/            学习进度与 eNSP 设置状态
│   └── styles/           设计令牌与样式
├── server/               Node 桥接服务（会话、终端 WebSocket、MCP、AI 代理、扫描、导入）
├── scripts/              开发启动与 MCP 安装脚本
├── python/               netmiko 设备执行器 sidecar（不含虚拟环境）
├── public/               第三方许可声明
└── docs/                 项目调研文档
```

## 线上展示

- 前端为纯静态构建（`base: './'` + HashRouter），可直接部署到任意静态托管。
- 推送到 `main` 分支后，`.github/workflows/deploy-pages.yml` 会构建并发布到 GitHub Pages。首次使用需在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
- 仓库内 `docs/VERSIONS.md` 记录历史版本与线上部署信息。

## 许可

MIT © 2026 xiaoou-hon。第三方依赖许可见 [public/THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt)。
