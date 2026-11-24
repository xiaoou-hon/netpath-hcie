# AI 直连设备与执行配置命令 · 开源项目调研报告

> 目标场景：NetPath（HCIE-Datacom 命令行实验室）希望让 AI 能直接操作设备、执行配置命令，对接 eNSP 模拟器中的华为 VRP 设备（telnet 127.0.0.1:<端口>），并与现有 Node 桥接 + AI 代理 + Web 终端融合。
>
> 数据来源：GitHub REST / Search API，检索日期 2026-11-21。活跃度以 `pushed_at`（代码推送）为准；`updated_at` 仅含元数据变更，不作为活跃依据。
>
> 筛选口径：优先 Star > 500 且最近 3 个月（2026-08-21 之后）有代码更新；AI 原生的 MCP 层项目因普遍较新（2025–2026），Star 普遍偏低，单独列出并标注。

---

## 一、候选项目清单（结构化）

### A 类 · 设备操作 / 执行 / 校验（核心落地层）

| # | 项目 | 仓库 | Star | 最近推送 | 技术栈 / 协议 | 核心特性 | 本场景契合度 | 推荐指数 |
|---|------|------|------|----------|----------------|----------|--------------|----------|
| A1 | **netmiko** | [ktbyers/netmiko](https://github.com/ktbyers/netmiko) | 4,324 | 2026-11-10 | Python · SSH/Telnet/Serial · 100+ 厂商驱动 | 多厂商连接、命令执行、`send_config_set` 批量下发；原生支持华为 VRP（`huawei` / `huawei_telnet` / `huawei_vrpv8`）；登录/提示符/视图解析成熟；TextFSM 可选结构化输出 | 极高：直接覆盖 eNSP telnet 场景，AI 执行配置的核心执行器 | ★★★★★ |
| A2 | **scrapli** | [carlmontanari/scrapli](https://github.com/carlmontanari/scrapli) | 710 | 2026-11-12 | Python · 同步/异步 SSH/NETCONF/Telnet · 传输无关 | 高性能、类型完备、可测试；`scrapli-community` 提供 huawei_vrp 驱动；异步并发适合多设备 | 高：性能优于 netmiko，但华为 telnet 生态/示例少于 netmiko | ★★★★ |
| A3 | **ntc-templates** | [networktocode/ntc-templates](https://github.com/networktocode/ntc-templates) | 1,308 | 2026-11-19 | Python · TextFSM 模板 | 将 `show`/`display` 命令原始文本解析为结构化 JSON；含 `huawei_vrp` 系列模板（display version / ip interface brief 等） | 高：让 AI 把设备回显变成可推理的状态数据，支撑验收与"解释当前状态" | ★★★★ |
| A4 | **batfish** | [batfish/batfish](https://github.com/batfish/batfish) | 1,536 | 2026-11-14 | Java 引擎 + pybatfish Python 客户端 · 离线分析 | 不连设备即可对配置做可达性/路由/ACL/黑洞分析；`init_snapshot` 模拟变更前后差异；AWS 托管 OSS | 极高：AI 生成配置 → Batfish 离线校验 → 校验通过再下发，是"AI 直接改配置"的安全护栏 | ★★★★★ |
| A5 | **netmiko_mcp** | [ktbyers/netmiko_mcp](https://github.com/ktbyers/netmiko_mcp) | 24 | 2026-11-09 | Python · MCP 2.x（stdio/HTTP） · 基于 netmiko | netmiko 作者官方维护的 MCP 服务器；暴露 7 个工具（`send_show_command`、并发组执行、`list_devices`、读取历史输出、`ping` 等）；`commands.yml` 白/黑名单；推荐 AAA/TACACS+ 只读账号；凭据可加密 | 极高：用 MCP 标准协议让 AI 直连设备，自带安全模型；但**当前仅开放 show/读命令**，配置下发需自行扩展工具 | ★★★★★ |

### B 类 · 编排 / 厂商抽象（规模化，本场景可后置）

| # | 项目 | 仓库 | Star | 最近推送 | 技术栈 | 核心特性 | 本场景契合度 | 推荐指数 |
|---|------|------|------|----------|--------|----------|--------------|----------|
| B1 | **nornir** | [nornir-automation/nornir](https://github.com/nornir-automation/nornir) | 1,641 | 2026-11-17 | Python · 纯 Python 编排框架 | 清单驱动、多线程并发、可插拔 inventory/transformer；搭配 netmiko/napalm/scrapli 作为连接后端 | 中：2–6 台 eNSP 设备的学习实验室用不到多设备编排规模 | ★★★ |
| B2 | **napalm** | [napalm-automation/napalm](https://github.com/napalm-automation/napalm) | 2,530 | 2026-08-12 | Python · 厂商无关 get/config API | 统一 `get_facts` / `get_interfaces` / `load_merge_candidate` / `commit_config`；含回滚与配置差异 | 中：华为 VRP 支持依赖社区 driver，维护活跃度一般（约 3.3 个月未推送，临界） | ★★★ |
| B3 | **ansible** | [ansible/ansible](https://github.com/ansible/ansible) | 71,535 | 2026-11-19 | Python · SSH 无代理 · YAML playbook | 企业级自动化引擎，内置丰富网络模块（含华为）；生态最大 | 低：对 2–6 台实验室设备过重；**GPL-3.0 传染性许可**，若分发 NetPath 需注意合规 | ★★ |

### C 类 · 数据源 / 真相源（本场景不需要）

| # | 项目 | 仓库 | Star | 最近推送 | 技术栈 | 核心特性 | 本场景契合度 | 推荐指数 |
|---|------|------|------|----------|--------|----------|--------------|----------|
| C1 | **netbox** | [netbox-community/netbox](https://github.com/netbox-community/netbox) | 21,914 | 2026-11-21 | Python/Django · IPAM/DCIM | 网络资源真相源，IP/设备/机架/电路管理 | 低：学习实验室无需 IPAM 系统 | ★★ |
| C2 | **nautobot** | [nautobot/nautobot](https://github.com/nautobot/nautobot) | 1,642 | 2026-11-20 | Python/Django · 网络 SoT + 自动化平台 | 网工的 SoT 与作业编排平台（原 networktocode 项目迁入） | 低：同上，过度工程化 | ★★ |

### D 类 · 仅参考 / 不达标（供对比，不建议落地）

| 项目 | 仓库 | Star | 状态 | 不采用原因 |
|------|------|------|------|------------|
| Juniper junos-mcp-server | [Juniper/junos-mcp-server](https://github.com/Juniper/junos-mcp-server) | 114 | 2026-11-02 活跃 | 厂商官方 MCP 参考实现，**仅支持 Junos**，不覆盖华为 VRP；可作为 MCP 服务器架构参考 |
| gns3-copilot | [yueguobin/gns3-copilot](https://github.com/yueguobin/gns3-copilot) | 48 | 已 **archived**（2026-08-01） | 已并入 GNS3 3.1 内置，不再独立维护；可借鉴"AI + 网络模拟器"的交互架构 |
| upa/mcp-netmiko-server | [upa/mcp-netmiko-server](https://github.com/upa/mcp-netmiko-server) | 35 | 2025-05-30 起停滞 | 长时间无更新、无许可证，风险高 |
| ntunes/netmiko-mcp-server | [ntunes/netmiko-mcp-server](https://github.com/ntunes/netmiko-mcp-server) | 5 | 2026-01 起停滞 | 仅初始提交、无许可证，不成熟 |
| genieparser | [CiscoTestAutomation/genieparser](https://github.com/CiscoTestAutomation/genieparser) | 284 | 2026-11-03 活跃 | Cisco 侧重，Star 不足 500；华为 VRP 解析覆盖弱于 ntc-templates |

---

## 二、方案对比（实现复杂度 / 兼容性 / 安全性）

| 维度 | netmiko | scrapli | ntc-templates | batfish | netmiko_mcp | nornir/napalm | ansible |
|------|---------|---------|---------------|---------|-------------|---------------|---------|
| **实现复杂度** | 低：单库、API 直观 | 中：异步心智、driver 体系 | 低：调用一个解析函数 | 中高：需 Docker 起引擎 + pybatfish 建模 | 低（读路径）/ 中（扩展配置工具） | 中：清单 + 任务模型 | 高：playbook + inventory + 模块体系 |
| **华为 VRP / eNSP 兼容** | ✅ 原生 `huawei_telnet` / `huawei_vrpv8`，支持 telnet | ✅ scrapli-community huawei_vrp | ✅ 有 huawei_vrp 模板 | ✅ 支持华为配置分析 | ✅ 继承 netmiko 驱动 | ⚠️ 社区 driver，质量参差 | ✅ 有华为模块但偏重 SSH |
| **AI 集成方式** | 在桥接侧封装为工具 | 同左 | 给 AI 喂结构化数据 | AI 生成配置后离线校验 | 直接用 MCP 工具调用，标准协议 | 需自建工具层 | 需自建工具层 |
| **安全模型** | 无内置，需自加白名单 | 无内置，需自加 | 只读解析，安全 | **离线校验，不下发即验证，最安全** | **内置 `commands.yml` 白/黑名单 + 只读账号建议** | 部分（napalm candidate/rollback） | 部分（check mode） |
| **许可** | MIT | MIT | Apache 类（待核） | Apache-2.0 | Apache-2.0 | Apache-2.0 | **GPL-3.0** |
| **运行形态** | 库（需宿主进程） | 库 | 库 | Docker 引擎 + 客户端 | **独立 MCP 服务（stdio/HTTP）** | 库 | 独立执行器 |

---

## 三、结合 /goal 与 github 插件能力的落地筛选

**github 插件能力边界说明：** 已加载 `trae-remote-official:github`，其强项是对**已识别仓库**做 PR/Issue/补丁的定向 triage，而非仓库发现搜索（环境无 `gh`/`git` CLI）。本调研因此采用 GitHub REST/Search API 获取仓库元数据来完成"发现 + 核实"，github 插件的 connector-first 原则用于约束：只对**最终推荐的仓库**做进一步深入，避免在低价值仓库上空转。

**筛选结论：最适合当前 NetPath 场景的可落地方案是 A 类组合，按优先级分三层：**

### 第 1 层（立即落地，低风险高收益）—— 执行器 + 安全护栏 + 解析
1. **netmiko（A1）** 作为 AI 操作设备的执行器。用 `device_type: huawei_vrpv8`（或 `huawei_telnet`）连接 eNSP 暴露的 `127.0.0.1:<port>`，替换/补强当前桥接里手写的 telnet 会话管理，获得成熟的登录、提示符、视图解析与 `send_config_set`。NetPath 桥接是 Node，可起一个轻量 Python sidecar（FastAPI 或直接跑 netmiko_mcp）供 Node 调用，避免在 Node 里重写 telnet 解析。
2. **batfish（A4）** 作为安全护栏：AI 生成候选配置 → 先喂给 Batfish 做离线分析（接口 up/down、路由可达、ACL 影响）→ 校验通过才下发。这正是"AI 直接执行配置命令"最关键的安全与教学价值点（让学习者看到"为什么这段配置有问题"）。
3. **ntc-templates（A3）** 让 `display` 回显变成结构化 JSON，喂给 AI 做状态推理，并可直接驱动现有验收检查（`scenario.ensp.checks`）。

### 第 2 层（标准化 AI–设备接口）—— MCP
4. **netmiko_mcp（A5）** 跑成本地 MCP sidecar，让 NetPath 的 AI 代理通过 **MCP 标准工具** 调用设备能力，而非私有工具协议——这同时带来：跨 AI 客户端兼容（Claude/Cursor/Copilot 均可复用）、内置 `commands.yml` 白/黑名单、只读账号最佳实践。**注意其当前只开放 show 命令**；配置下发需在 fork 中新增一个受保护的 `send_config` 工具：要求人工确认（human-in-the-loop）+ 按实验场景的命令白名单 + 先过 Batfish 校验。

### 第 3 层（暂不采用）
- B 类（nornir / napalm / ansible）：2–6 台设备的学习实验室不需要多设备编排规模，且 ansible 的 GPL-3.0 对分发不友好。
- C 类（netbox / nautobot）：与"设备操作"目标无关，属过度工程。
- D 类：要么厂商不匹配、要么已归档/无许可/Star 不达标，仅作架构参考。

---

## 四、建议的最小落地路径（P0 → P2）

| 阶段 | 动作 | 引入项目 | 预期产出 |
|------|------|----------|----------|
| **P0** | 桥接侧新增 Python sidecar，封装 netmiko 的 Huawei 驱动（connect / exec / config_set / disconnect），暴露 HTTP，Node 桥接调用之 | netmiko | AI 能稳定连接 eNSP 设备并执行 show + 配置命令 |
| **P1** | 接入 ntc-templates 解析关键 `display` 输出为结构化数据；AI 助教用其解释状态、自动判定验收项 | ntc-templates | 终端回显可被 AI 结构化理解 |
| **P2** | 跑 netmiko_mcp 作为 MCP sidecar，AI 走 MCP 工具；新增受保护的配置工具（人工确认 + 白名单 + Batfish 预校验） | netmiko_mcp + batfish | 标准化、安全可控的"AI 直接改配置"闭环 |

> 安全红线（贯穿始终）：配置类命令默认禁止自动执行；必须经"AI 提议 → Batfish 校验 → 用户确认 → 下发 → 回显验证"五段式；生产账号只读，实验室环境单独隔离。

---

*数据核验：所有 Star 与 `pushed_at` 均来自 GitHub API（2026-11-21）。单仓库 REST 接口对超大仓库存在缓存延迟，已用 Search API 交叉验证 ansible / netbox 的最新推送时间。*
