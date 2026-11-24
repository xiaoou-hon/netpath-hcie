import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm05',
  code: 'M05',
  title: 'BGP 边界网关协议',
  summary:
    'BGP 是互联网的骨架协议。本模块从 AS 与路径矢量讲起，逐层拆开报文、状态机、路径属性、选路、反射器、路由策略与稳定性，并用华为 VRP 配置与 display 回显，训练你读懂域间路由、定位疑难故障的能力。',
  stage: 'L3',
  order: 5,
  goals: [
    '能说清 AS、EBGP、IBGP 的边界，并解释 IBGP 全连接与路由黑洞的成因',
    '能独立完成华为设备上的 BGP 对等体、路由通告、聚合与反射器配置',
    '能按 BGP 选路顺序解释任意一条路由为什么被选中',
    '能用 route-policy、filter-policy、AS_Path Filter 精确控制路由的收发',
    '能通过 display 命令与状态机现象定位常见的 BGP 邻居与路由故障',
  ],
  keywords: [
    'BGP',
    'AS',
    'EBGP',
    'IBGP',
    '路径属性',
    '选路',
    '路由反射器',
    '路由策略',
    '路由振荡',
    '华为 VRP',
  ],
  lessons: [
    {
      id: 'm05-l01',
      moduleId: 'm05',
      title: 'BGP 是什么：AS、EGP 与路径矢量',
      depth: '熟悉',
      minutes: 24,
      summary: '理解 BGP 的定位、AS 与路径矢量思想，并完成一段最小可用的 EBGP 配置。',
      objectives: [
        '说明 IGP 与 EGP 的分工，指出 BGP 只解决域间可达性问题',
        '描述 AS 编号、路径矢量的含义，以及 AS_Path 如何天然防环',
        '在华为设备上配置一对 EBGP 邻居并验证 Established 状态',
      ],
      keywords: ['BGP', 'AS', 'EGP', '路径矢量', 'EBGP', 'TCP 179'],
      blocks: [
        {
          type: 'paragraph',
          text: 'BGP（Border Gateway Protocol，边界网关协议）是当今互联网唯一在用的自治系统间路由协议。自治系统 AS 是一组由同一机构管理、使用统一路由策略的网络，每个 AS 有一个 2 字节或 4 字节的编号。AS 内部用 OSPF、IS-IS 这类 IGP 算出细粒度路由，AS 之间则由 BGP 交换「哪些网段可以从我这边到达」。分工很明确：IGP 关心「怎么走最快」，BGP 关心「能不能走、走哪条政策路径」。',
        },
        {
          type: 'heading',
          text: '为什么域间不能用 OSPF 解决',
          level: 2,
        },
        {
          type: 'paragraph',
          text: 'OSPF 属于链路状态协议，要求所有路由器共享同一套拓扑数据库，并且信任彼此的链路度量。可现实中的运营商互不信任：A 运营商不会把内部拓扑和链路开销暴露给 B，也不希望 B 的度量值影响自己的转发。更关键的是规模，全球路由表已接近百万条，链路状态泛洪根本无法承受。因此 BGP 选择了另一条路：不做拓扑计算，只交换「前缀 + 路径属性」，让每个 AS 自己按政策决定走哪条路。',
        },
        {
          type: 'analogy',
          title: '路径矢量像快递面单上的途经省份',
          text: '把一条 BGP 路由想成一张快递面单：目的地址是收件人，AS_Path 就是面单上依次盖章的途经省份。每经过一个 AS 就多盖一个章，收件方一眼就能看出这条线路绕了几个省、有没有被自己盖过章。如果发现面单上已经有了自己的省章，说明包裹绕回了原地，直接退回即可，这就是 BGP 依靠 AS_Path 天然防环的原理。',
        },
        {
          type: 'table',
          title: 'IGP 与 EGP 的分工对比',
          columns: ['维度', 'IGP（OSPF/IS-IS）', 'EGP（BGP）'],
          rows: [
            ['作用范围', 'AS 内部', 'AS 之间（也可用于 AS 内传递外部路由）'],
            ['核心目标', '最快到达，度量最优', '政策可控，路径可预期'],
            ['承载协议', 'IP 协议号 89 等', 'TCP 179'],
            ['路由信息', '拓扑与链路开销', '前缀 + 路径属性'],
            ['规模', '单域，百至千台', '全球，百万级前缀'],
            ['防环手段', 'SPF 树天然无环', 'AS_Path 与 IBGP 水平分割'],
          ],
        },
        {
          type: 'heading',
          text: '一个最小可用的 EBGP 配置',
          level: 4,
        },
        {
          type: 'paragraph',
          text: '下面假设 R1 属于 AS 65001，R2 属于 AS 65002，两者用直连口 10.0.0.0/30 互联，R1 侧地址 10.0.0.1。配置顺序是：先起 BGP 进程并指定 router-id，再声明对端 AS 号，进入 ipv4-family unicast 视图后激活邻居并通告网段。注意 network 命令的掩码必须与路由表里的掩码完全一致，否则这条路由不会进入 BGP。',
        },
        {
          type: 'code',
          title: 'R1：最小 EBGP 配置',
          lang: 'vrp',
          code: `system-view
sysname R1
#
interface GigabitEthernet0/0/0
 ip address 10.0.0.1 255.255.255.252
#
bgp 65001
 router-id 1.1.1.1
 peer 10.0.0.2 as-number 65002
 #
 ipv4-family unicast
  network 192.168.1.0 255.255.255.0
  peer 10.0.0.2 enable`,
        },
        {
          type: 'output',
          title: '验证：display bgp peer',
          text: `BGP local router ID : 1.1.1.1
Local AS number : 65001
Total number of peers : 1                 Peers in established state : 1

  Peer            V          AS  MsgRcvd  MsgSent  OutQ  Up/Down       State  PrefRcv
  10.0.0.2        4       65002       42       44     0 00:18:12 Established        3`,
        },
        {
          type: 'list',
          title: '看到这段回显要读出的信息',
          items: [
            'Local AS number 是本地 AS 号，必须与规划一致，写错会导致对端拒绝',
            'Peer 一列是邻居地址，V 表示 BGP 版本，当前都是 4',
            'State 必须是 Established 才代表邻居建立完成、可以交换路由',
            'PrefRcv 表示从该邻居收到的、已被优选并加入 BGP 表的前缀数量',
            'Up/Down 是邻居稳定时长，频繁归零说明链路或配置在反复抖动',
          ],
        },
        {
          type: 'warning',
          title: '别把 BGP 当成 IGP 的替代品',
          text: '很多初学者会直接把内网所有明细网段都塞进 BGP。BGP 的收敛速度以秒甚至分钟计，且路由条目会占用大量内存，内网明细应该交给 OSPF，BGP 只承载需要跨 AS 通告的汇总网段和外部路由。另外，EBGP 默认要求邻居直连（TTL 为 1），跨设备建邻居必须显式配置 ebgp-max-hop。',
        },
        {
          type: 'tip',
          title: '建邻居失败时的第一反应',
          text: '先 ping 邻居地址确认三层可达，再用 display bgp peer verbose 查看状态与失败原因；若卡在 Connect 或 Active，多半是 TCP 179 被 ACL 或防火墙拦截，或者对端没有配置本端为邻居。',
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm05-l02',
      moduleId: 'm05',
      title: 'BGP 报文与有限状态机',
      depth: '熟悉',
      minutes: 26,
      summary: '掌握五种 BGP 报文与六个邻居状态，能从状态机判断邻居卡在哪一步。',
      objectives: [
        '说出 Open、Update、Notification、Keepalive、Route-refresh 的作用与触发时机',
        '按顺序描述 Idle 到 Established 六个状态的迁移条件',
        '通过 display bgp peer verbose 定位邻居建立失败的阶段',
      ],
      keywords: ['BGP 报文', '状态机', 'Open', 'Keepalive', 'Established', 'Route-refresh'],
      blocks: [
        {
          type: 'paragraph',
          text: 'BGP 邻居不是「配完就通」，而是一套有明确阶段的三次握手式流程。它跑在 TCP 之上，因此先要有一条可靠的 TCP 连接，再在连接上交换能力协商与路由信息。理解这套流程的价值在于排错：邻居卡在哪个状态，就说明故障发生在哪一层、哪一步，而不是盲目地反复重启进程。',
        },
        {
          type: 'table',
          title: '五种 BGP 报文',
          columns: ['报文', '作用', '典型触发场景'],
          rows: [
            ['Open', '协商版本、AS 号、Hold Time、Router ID 与能力', 'TCP 建立后立即发送'],
            ['Keepalive', '维持邻居关系，默认 60 秒一次，Hold Time 为 180 秒', '周期性发送，收到后重置计时器'],
            ['Update', '携带可达路由（前缀 + 属性）或撤销路由', '路由发生变化时发送'],
            ['Notification', '报告错误并主动断链', '收到非法报文、AS 号不匹配、能力不支持'],
            ['Route-refresh', '请求对端重新发送指定地址族的全部路由', '策略调整后不想重置邻居时使用'],
          ],
        },
        {
          type: 'analogy',
          title: '建立邻居像打一通正式电话',
          text: 'Idle 是还没拿起电话；Connect 是正在拨号，等对方接；Active 是拨号失败后反复重拨；OpenSent 是电话接通、双方开始自报家门；OpenConfirm 是互相确认「听清了吗」，然后互道保重（Keepalive）；Established 才是正式通话、开始谈正事（交换路由）。任何一方挂断（Notification），都会退回 Idle 重新拨号。',
        },
        {
          type: 'interactive',
          key: 'bgp-fsm',
          caption: '逐个点击六个状态，观察触发事件、计时器与报文流向，特别注意 Active 并不是「连接成功」而是「正在重试」。',
        },
        {
          type: 'steps',
          items: [
            {
              title: 'Idle',
              text: '初始状态，等待启动事件。收到 Start 事件后发起 TCP 连接，同时启动 ConnectRetry 计时器。',
            },
            {
              title: 'Connect',
              text: '正在建立 TCP 连接。连接成功则发送 Open 报文进入 OpenSent；失败则等计时器超时后转 Active。',
            },
            {
              title: 'Active',
              text: '主动尝试失败，处于监听并准备重试的状态。此状态停留过久，通常意味着地址不可达或 179 端口被拦。',
            },
            {
              title: 'OpenSent',
              text: '已发出 Open 并等待对端 Open。收到后校验版本、AS 号、Router ID，任一项不合法就发 Notification 断开。',
            },
            {
              title: 'OpenConfirm',
              text: '能力协商通过，等待 Keepalive。收到 Keepalive 后进入 Established，同时启动 Hold 计时器。',
            },
            {
              title: 'Established',
              text: '邻居关系建立完成，开始交换 Update 报文。此后靠 Keepalive 保活，超时未收到则断开回 Idle。',
            },
          ],
        },
        {
          type: 'code',
          title: '查看邻居细节并重置邻居',
          lang: 'vrp',
          code: `# 查看邻居的详细状态、计时器与能力协商结果
display bgp peer verbose

# 策略变更后让邻居重新学习路由（软重置，不中断 TCP）
refresh bgp all import
refresh bgp all export

# 硬重置：断开并重建邻居，会短暂中断路由
reset bgp all`,
        },
        {
          type: 'output',
          title: '验证：display bgp peer verbose',
          text: `BGP Peer is 10.0.0.2,  remote AS 65002
         Type: EBGP link
BGP version 4, Remote router ID 2.2.2.2
Update-group ID: 1
BGP current state: Established, Up for 00h21m08s
BGP current event: RecvKeepalive
BGP last state: OpenConfirm
Port: Local - 179          Remote - 51234
Peer PrefRcv: 3
Configured: Active Hold Time: 180 sec   Keepalive Time: 60 sec
Negotiated: Active Hold Time: 180 sec   Keepalive Time: 60 sec
Peer optional capabilities:
  Route Refresh: advertised and received
  Graceful Restart: advertised
Address family IPv4 Unicast: advertised and received
Received total routes: 3
Sent total routes: 3`,
        },
        {
          type: 'warning',
          title: 'Active 不等于正常',
          text: '很多人看到 Active 以为是「激活成功」，其实它表示 TCP 连接没有建成、正在重试。持续停在 Active，优先检查邻居地址是否可达、对端是否有回程路由、中间设备是否放行 TCP 179。另一个常见坑是 Hold Time 不一致：两端会协商取较小值，若一端配成 0 表示永不超时，容易掩盖链路问题。',
        },
        {
          type: 'tip',
          title: '能软重置就不要硬重置',
          text: '调整 import 或 export 方向的策略后，优先用 refresh bgp all import 与 refresh bgp all export 让邻居重发路由，避免 reset bgp all 造成的全表重建与业务抖动。前提是双方都支持 Route-refresh 能力，这在 display bgp peer verbose 的 capabilities 里可以看到。',
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm05-l03',
      moduleId: 'm05',
      title: 'IBGP 全连接、路由黑洞与水平分割',
      depth: '熟悉',
      minutes: 30,
      summary: '解释 IBGP 为什么必须全连接，识别路由黑洞并掌握两种基础解法。',
      objectives: [
        '复述 IBGP 水平分割规则，说明它为何必须依赖全连接来补偿',
        '描述路由黑洞的产生过程，并用 next-hop-local 或 IGP 可达性修复',
        '正确配置基于环回口的 IBGP 邻居与 EBGP 多跳邻居',
      ],
      keywords: ['IBGP', 'EBGP', '全连接', '路由黑洞', '水平分割', 'next-hop-local'],
      blocks: [
        {
          type: 'paragraph',
          text: '同一个 AS 内的 BGP 邻居叫 IBGP，不同 AS 之间的叫 EBGP。两者最本质的差别不在配置，而在路由传播规则：BGP 规定「从 IBGP 学到的路由，不能再传给其他 IBGP 邻居」，这就是 IBGP 水平分割。它存在的理由是防环——AS 内部没有 AS_Path 变化，一条路由在 IBGP 之间来回传就会形成环路。但这条规则也带来一个代价：如果 R1 与 R3 没有直连 IBGP，R1 从外部学到的路由就永远到不了 R3。',
        },
        {
          type: 'analogy',
          title: '公司内部消息只准传一层',
          text: '把 IBGP 水平分割想成一家公司的传达规则：总部发来的通知，部门经理只能直接告诉自己的直接下属，不能再让下属之间互相转告。好处是绝不会出现「A 告诉 B、B 又告诉 A」的循环；坏处是如果两个同事之间没有直接汇报关系，消息就传不到。想让所有人都收到，只能让每个人两两之间都建立直接沟通渠道，这就是 IBGP 全连接。',
        },
        {
          type: 'table',
          title: '三种邻居关系的关键差异',
          columns: ['对比项', 'EBGP', 'IBGP', 'IGP 邻居'],
          rows: [
            ['AS 号', '不同', '相同', '不涉及'],
            ['默认 TTL', '1，要求直连，跨设备需 ebgp-max-hop', '255，可跨多跳', '1'],
            ['下一跳', '默认改为自己的接口地址', '默认保持不变', '不涉及'],
            ['防环', 'AS_Path 中看到本 AS 即丢弃', '水平分割：不转发给其他 IBGP', 'SPF 树'],
            ['路由优先级', '较高（华为默认 255）', '较低（华为默认 255，同 AS 内比较靠选路规则）', '不涉及'],
          ],
        },
        {
          type: 'paragraph',
          text: '路由黑洞是 IBGP 未全连接的典型后果。假设 R1 通过 EBGP 学到 8.8.8.0/24，它把这条路由通过 IBGP 发给 R2；R2 再到 R3 时受到水平分割限制无法转发。若 R1 到 R3 之间没有 IBGP，R3 的 BGP 表里就没有这条路由。更隐蔽的情况是：R3 从 IGP 学到了去往 8.8.8.0/24 的默认路由，于是报文被 R3 收下却无处可转，最后被静默丢弃，这就是黑洞。',
        },
        {
          type: 'code',
          title: '基于环回口建 IBGP，并让 EBGP 支持多跳',
          lang: 'vrp',
          code: `# R2：用 LoopBack0 作为 BGP 源地址建立 IBGP
interface LoopBack0
 ip address 2.2.2.2 255.255.255.255
#
bgp 65001
 router-id 2.2.2.2
 peer 1.1.1.1 as-number 65001
 peer 3.3.3.3 as-number 65001
 #
 ipv4-family unicast
  peer 1.1.1.1 connect-interface LoopBack0
  peer 1.1.1.1 enable
  peer 3.3.3.3 connect-interface LoopBack0
  peer 3.3.3.3 enable

# R1 与外部 AS 通过环回口建 EBGP，必须放宽 TTL
bgp 65001
 peer 10.1.1.2 as-number 65002
 #
 ipv4-family unicast
  peer 10.1.1.2 ebgp-max-hop 2
  peer 10.1.1.2 connect-interface LoopBack0
  peer 10.1.1.2 enable`,
        },
        {
          type: 'output',
          title: '验证：display bgp peer',
          text: `BGP local router ID : 2.2.2.2
Local AS number : 65001
Total number of peers : 2                 Peers in established state : 2

  Peer            V          AS  MsgRcvd  MsgSent  OutQ  Up/Down       State  PrefRcv
  1.1.1.1         4       65001      980      975     0 06:12:40 Established       12
  3.3.3.3         4       65001      964      970     0 06:11:58 Established        9

# 用 verbose 可以看到邻居类型是 IBGP link，与 EBGP 区分
display bgp peer 1.1.1.1 verbose`,
        },
        {
          type: 'warning',
          title: 'IBGP 下一跳不改，是黑洞的第二个来源',
          text: 'IBGP 传递路由时默认不修改 Next_Hop。R3 收到的 8.8.8.0/24 下一跳仍是 R1 与外部 AS 的互联地址，如果 R3 没有到达该地址的 IGP 路由，这条 BGP 路由就无法优选（valid 但不 best），业务中断。解决方式是在 R2 上对 IBGP 邻居配置 peer x next-hop-local，把下一跳改成自己，或确保该外部互联地址被引入 IGP。',
        },
        {
          type: 'tip',
          title: '设计期就把全连接想清楚',
          text: 'N 台路由器全连接需要 N 乘以 N 减 1 再除以 2 条 IBGP 会话。5 台设备要 10 条，20 台要 190 条，管理成本急剧上升。因此超过四五台设备的中大型网络，应直接规划路由反射器或联盟，而不是硬撑全连接。',
        },
        {
          type: 'checklist',
          title: 'IBGP 建邻自查',
          items: [
            '两端 AS 号是否一致，router-id 是否唯一',
            '是否用 connect-interface 指定了正确的更新源接口',
            '环回口地址是否已被 IGP 或静态路由打通',
            'EBGP 跨设备时是否配置了足够的 ebgp-max-hop',
            'IBGP 邻居是否配置了 next-hop-local，或下一跳是否 IGP 可达',
          ],
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm05-l04',
      moduleId: 'm05',
      title: '路由生成与通告：network、import-route 与聚合',
      depth: '精通',
      minutes: 32,
      summary: '搞清 BGP 路由从哪来、怎么进表，并正确使用聚合与明细抑制。',
      objectives: [
        '区分 network 精确匹配与 import-route 引入的差异',
        '读懂 display bgp routing-table 的状态码与最优标记',
        '配置聚合路由并用 detail-suppressed 控制明细传播',
      ],
      keywords: ['network', 'import-route', '聚合', 'detail-suppressed', '状态码', 'BGP 路由表'],
      blocks: [
        {
          type: 'paragraph',
          text: 'BGP 自己不会算路由，它的路由只有三个来源：手工用 network 声明、用 import-route 从 IGP 或直连引入、从邻居学习。前两者决定了本 AS 向外界「宣布拥有哪些网段」，是域间流量的入口，配错一个掩码就可能导致整段业务不可达。因此必须搞清楚每条命令的匹配条件和副作用。',
        },
        {
          type: 'analogy',
          title: 'network 像报关，import-route 像整柜转运',
          text: 'network 是把一件件具体商品按申报单精确报关：品名、规格、数量必须与系统记录完全一致，差一点都过不了。import-route 则是把某个仓库里的货物整柜转运，只要属于这个来源（比如 OSPF 进程 1）就一并带上，省事但容易夹带不该出境的东西。至于聚合，就是把一堆小包裹打成一个托盘再报关，单据更简洁，但托盘里每件货的细节就看不见了。',
        },
        {
          type: 'list',
          title: '三种来源的适用场景',
          ordered: true,
          items: [
            'network：本 AS 自有、需要精确可控的网段，要求路由表中存在完全匹配（同前缀同掩码）的路由',
            'import-route：把 IGP、直连、静态路由批量引入 BGP，适合边界设备汇总外部路由，但需配合策略过滤',
            '邻居学习：从对端 Update 报文获得，属性由对端决定，本地只能用策略影响是否接收',
          ],
        },
        {
          type: 'code',
          title: '路由生成与聚合配置',
          lang: 'vrp',
          code: `bgp 65001
 router-id 1.1.1.1
 peer 10.0.0.2 as-number 65002
 #
 ipv4-family unicast
  # 精确匹配：路由表中必须已有 192.168.1.0/24
  network 192.168.1.0 255.255.255.0
  # 批量引入：建议配合 route-policy 精确控制
  import-route ospf 1 route-policy RP-IMPORT
  # 手工聚合，并抑制所有明细
  aggregate 192.168.0.0 255.255.0.0 detail-suppressed
  # 只抑制指定明细，其余照常发布
  aggregate 172.16.0.0 255.255.0.0 suppress-policy RP-SUPPRESS
  peer 10.0.0.2 enable`,
        },
        {
          type: 'output',
          title: '验证：display bgp routing-table',
          text: ` BGP local router ID is 1.1.1.1
 Status codes: * - valid, > - best, d - damped, h - history,
               i - internal, s - suppressed, S - Stale
 Origin : i - IGP, e - EGP, ? - incomplete

 Total Number of Routes: 4
      Network            NextHop        MED        LocPrf    PrefVal Path/Ogn
 *>   192.168.0.0/16     0.0.0.0         0                     0      i
 *>   192.168.1.0/24     0.0.0.0         0                     0      i
 *>   172.16.0.0/16      0.0.0.0         0                     0      i
 *>   8.8.8.0/24         10.0.0.2        0                     0      65002?`,
        },
        {
          type: 'table',
          title: 'BGP 路由表状态码',
          columns: ['标记', '含义', '排错含义'],
          rows: [
            ['*', 'valid，下一跳可达且属性合法', '没有星号说明下一跳不可达或属性异常'],
            ['>', 'best，被选为最优并下发 FIB', '没有大于号说明被其他路由压过，需查选路'],
            ['i', 'internal，来自 IBGP 邻居', 'IBGP 路由不转发给其他 IBGP，注意全连接'],
            ['d', 'damped，被振荡抑制', '需查看 dampening 参数或等待惩罚值衰减'],
            ['h', 'history，曾经存在但已撤销', '尚未老化完成，通常短暂出现'],
            ['s', 'suppressed，被聚合抑制', '明细被 detail-suppressed 压制，属预期行为'],
            ['S', 'Stale，GR 期间的老化标记', '邻居重启未恢复，检查 Graceful Restart'],
          ],
        },
        {
          type: 'paragraph',
          text: '注意聚合路由的 AS_Path 与属性处理：手工聚合默认会丢弃明细路由中的 AS_Path 细节，聚合路由的属性取自其中一条明细（通常是最优明细），因此可能丢失部分路径信息，带来潜在的环路风险。华为提供 as-set 参数，把明细的 AS 集合以 AS_SET 形式附加到聚合路由上，既减小表项又保留防环信息。',
        },
        {
          type: 'warning',
          title: 'network 掩码必须完全一致',
          text: '路由表里有 192.168.1.0/24，但写成 network 192.168.1.0 255.255.0.0，这条命令不会产生任何路由，且设备不会报错。另一个常见问题是只写了 network 却没在 ipv4-family unicast 视图下执行，导致配置存在但未生效。排查时用 display bgp routing-table 看本地始发路由是否存在，再用 display current-configuration configuration bgp 核对上下文。',
        },
        {
          type: 'tip',
          title: '聚合前先确认明细的重要性',
          text: '如果明细需要保留以便精确回程或做流量工程，就不要无脑 detail-suppressed。可以先用 suppress-policy 只压制部分明细，或者用 as-set 保留路径信息。聚合后记得在同 AS 内确认所有边界设备都能正确转发，避免「路由有、业务不通」。',
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm05-l05',
      moduleId: 'm05',
      title: '核心属性：Origin、AS_Path 与 Next_Hop',
      depth: '精通',
      minutes: 30,
      summary: '掌握三类公认属性的来源、作用与传递规则，看懂路由详情回显。',
      objectives: [
        '区分公认必遵、公认任意、可选过渡与可选非过渡四类属性',
        '解释 Origin 三种取值的可信度排序及其在选路中的位置',
        '说明 EBGP 与 IBGP 对 Next_Hop 的不同处理并修复下一跳不可达',
      ],
      keywords: ['Origin', 'AS_Path', 'Next_Hop', '路径属性', '公认必遵', 'next-hop-local'],
      blocks: [
        {
          type: 'paragraph',
          text: 'BGP 的每条路由都是一组属性的集合，属性决定了这条路由「从哪来、经过谁、值不值得选」。按是否必须携带与是否可跨 AS 传递，属性分为四类：公认必遵（Origin、AS_Path、Next_Hop，每条 Update 都必须有）、公认任意（Local_Preference、Atomic_Aggregate、Aggregator，所有实现都认识但可以不携带）、可选过渡（Community 等，不认识也能继续传）、可选非过渡（MED、Cluster_List 等，不认识就丢弃）。理解分类是为了判断「为什么这条属性在某个方向消失了」。',
        },
        {
          type: 'table',
          title: '四类路径属性对照',
          columns: ['类别', '代表属性', '是否必须携带', '不识别时的处理'],
          rows: [
            ['公认必遵', 'Origin、AS_Path、Next_Hop', '必须', '不支持则无法处理该路由'],
            ['公认任意', 'Local_Preference、Atomic_Aggregate', '可不携带', '仍可正常处理'],
            ['可选过渡', 'Community', '可不携带', '不认识也继续传递给邻居'],
            ['可选非过渡', 'MED、Cluster_List、Originator_ID', '可不携带', '不认识则丢弃，不继续传'],
          ],
        },
        {
          type: 'analogy',
          title: 'AS_Path 是包裹上的省份印章',
          text: 'AS_Path 记录这条路由依次经过的 AS 编号，每过一个 AS 就在最左边盖一个章。它同时干三件事：防环（看到自己的章就丢弃）、选路（章越少说明途经省份越少，通常更优）、政策（用正则匹配印章序列来过滤路由）。所以它既是安全绳，也是度量尺，还是政策的抓手。',
        },
        {
          type: 'paragraph',
          text: 'Origin 描述这条前缀最初是怎么进入 BGP 的，取值 i 表示由 network 声明（IGP 来源，最可信）、e 表示由 EGP 学到（历史遗留，几乎见不到）、? 表示由 import-route 引入（incomplete，可信度最低）。选路时 Origin 排在 AS_Path 之后，仅在 AS_Path 长度相同时才比较。Next_Hop 则是转发入口：EBGP 发布路由时默认把下一跳改成自己的互联接口地址；IBGP 转发时默认保持原下一跳不变，这是为了避免 AS 内部出现次优路径，但也制造了可达性要求。',
        },
        {
          type: 'code',
          title: '下一跳处理与属性查看',
          lang: 'vrp',
          code: `bgp 65001
 router-id 1.1.1.1
 peer 2.2.2.2 as-number 65001
 peer 10.0.0.2 as-number 65002
 #
 ipv4-family unicast
  # 向 IBGP 邻居发布时，把下一跳改为自己
  peer 2.2.2.2 next-hop-local
  peer 2.2.2.2 enable
  peer 10.0.0.2 enable

# 查看某条路由的完整属性
display bgp routing-table 8.8.8.0
# 按 AS_Path 过滤查看
display bgp routing-table regular-expression 65002`,
        },
        {
          type: 'output',
          title: '验证：display bgp routing-table 8.8.8.0',
          text: ` BGP routing table entry information of 8.8.8.0/24:
 From: 10.0.0.2 (2.2.2.2)
 Route Duration: 0d01h12m40s
 Relay IP Nexthop: 10.0.0.2
 Relay IP Out-Interface: GigabitEthernet0/0/0
 Original nexthop: 10.0.0.2
 Qos information : 0x0
 AS-path 65002 65003, origin igp, MED 0, localpref 100,
 pref-val 0, valid, external, best, select, active, pre 255
 Not advertised to any peer yet`,
        },
        {
          type: 'kv',
          items: [
            { label: 'AS-path', value: '65002 65003，左侧为最近经过的 AS，长度 2' },
            { label: 'origin', value: 'igp，说明对端是通过 network 声明的，可信度最高' },
            { label: 'MED', value: '0，只用于同一邻居 AS 的多入口比较' },
            { label: 'localpref', value: '100，IBGP 内部优先级的默认值' },
            { label: 'valid / best', value: '下一跳可达且被优选，已下发转发表' },
            { label: 'external', value: '来自 EBGP 邻居，标记为外部路由' },
          ],
        },
        {
          type: 'warning',
          title: 'IBGP 下一跳不改导致的隐性故障',
          text: '当 R1 从 EBGP 学到路由后转发给 R2，下一跳仍是外部互联地址。若 R2 到该地址没有 IGP 路由，路由会显示 valid 但没有 best，也不会下发 FIB，表现就是「邻居 Established、路由也在表里，但业务不通」。修复方式是在 R1 上对 IBGP 邻居加 next-hop-local，或在 R2 上保证该地址 IGP 可达。注意 next-hop-local 只对 IBGP 邻居有意义，对 EBGP 邻居配置无效。',
        },
        {
          type: 'tip',
          title: '看路由先看三个字段',
          text: '排错时先看 AS_Path 判断路径是否绕行，再看 origin 判断来源可信度，最后看 Next_Hop 判断转发是否可达。这三项覆盖了绝大多数「路由存在但不通」的问题。',
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm05-l06',
      moduleId: 'm05',
      title: 'Local_Preference、MED 与 Community',
      depth: '精通',
      minutes: 32,
      summary: '用 LocalPref 控制出 AS 选路、用 MED 影响入 AS 选路，并用 Community 打标签。',
      objectives: [
        '说明 LocalPreference 只在 IBGP 内传递、MED 只在 AS 间比较的原因',
        '用 route-policy 设置 local-preference、med 与 community 属性',
        '通过 Community 属性实现批量路由标记与策略匹配',
      ],
      keywords: ['Local_Preference', 'MED', 'Community', 'route-policy', '选路控制', 'apply'],
      blocks: [
        {
          type: 'paragraph',
          text: 'BGP 的选路控制分两个方向：我出去走哪条路，由 Local_Preference 决定；别人进来走哪条路，我只能用 MED 去「建议」。这两个属性经常被混为一谈，其实传递范围完全不同：Local_Preference 是公认任意属性，只在 IBGP 邻居之间传递，出了 AS 就被剥离，所以它天然是「本 AS 内部偏好」；MED 是可选非过渡属性，可以跨 EBGP 传递，但接收方通常只比较来自同一个邻居 AS 的多条路由，因为不同 AS 的 MED 没有可比性。',
        },
        {
          type: 'analogy',
          title: 'LocalPref 是内部排班优先级，MED 是对外报价',
          text: 'LocalPref 像公司内部的排班优先级：只在部门内部有效，出了公司没人认。MED 则像对外报价：你可以告诉客户「从我这里走更便宜」，但客户是否采纳、是否拿你和别家比价，决定权在客户手里。也正因为如此，LocalPref 越大越优先（内部越重视排越前），MED 越小越优先（报价越低越有吸引力），方向刚好相反。',
        },
        {
          type: 'table',
          title: '两个方向性属性的默认值与传递',
          columns: ['属性', '方向', '默认值', '比较方式', '传递范围'],
          rows: [
            ['Local_Preference', '出 AS', '100', '数值越大越优', '仅 IBGP，EBGP 不传'],
            ['MED', '入 AS', '0', '数值越小越优', '可跨 EBGP，通常只比同 AS 邻居'],
            ['Weight（华为私有）', '本地', '0', '数值越大越优', '仅本地有效，不传递'],
            ['Community', '标记', '无', '按标记匹配策略', '可跨 AS，需显式放行'],
          ],
        },
        {
          type: 'paragraph',
          text: 'Community 是一组 32 位的标签，格式为 AS 号:自定义值，例如 65001:100。它本身不影响选路，但可以被策略匹配，从而实现「给一批路由打标签，再在别处按标签统一处理」。常见做法是把客户路由、上游路由、对等体路由分别打上不同 Community，之后无论是调整 LocalPref 还是过滤，都只需匹配标签，而不必逐条写前缀。华为预定义了几个公认 Community：no-export 不向 EBGP 通告、no-advertise 不向任何邻居通告、internet 可向任何邻居通告。',
        },
        {
          type: 'code',
          title: '用 route-policy 设置三类属性',
          lang: 'vrp',
          code: `# 先定义前缀列表，匹配需要打标签的路由
ip ip-prefix P-CUSTOMER index 10 permit 192.168.0.0 16 less-equal 24

# 定义策略：客户路由打标签并提高本地优先级，同时设置 MED
route-policy RP-CUSTOMER permit node 10
 if-match ip-prefix P-CUSTOMER
 apply community 65001:100 additive
 apply local-preference 200
 apply med 50
#
route-policy RP-CUSTOMER permit node 20

bgp 65001
 router-id 1.1.1.1
 peer 10.0.0.2 as-number 65002
 peer 10.0.0.2 route-policy RP-CUSTOMER import
 #
 ipv4-family unicast
  peer 10.0.0.2 enable
  # 允许 Community 属性向该邻居传递
  peer 10.0.0.2 advertise-community`,
        },
        {
          type: 'output',
          title: '验证：display bgp routing-table 192.168.1.0',
          text: ` BGP routing table entry information of 192.168.1.0/24:
 From: 10.0.0.2 (2.2.2.2)
 AS-path 65002, origin igp, MED 50, localpref 200,
 pref-val 0, valid, external, best, select, active, pre 255
 Community: <65001:100>
 Advertised to such 2 peers:
    10.0.0.6
    10.0.0.10`,
        },
        {
          type: 'warning',
          title: 'LocalPref 过不了 AS 边界，MED 不一定被采纳',
          text: '给 EBGP 邻居配置 apply local-preference 是无效的，因为该属性不会被带出 AS，必须改在 IBGP 邻居或本地始发路由上。MED 虽然能传出去，但接收方可能因为厂商实现不同而只比较同 AS 邻居的 MED，甚至完全忽略。想稳定影响入向流量，最终还是要靠前缀长度、AS_Path 长度等更「硬」的路径属性。',
        },
        {
          type: 'tip',
          title: 'Community 记得配 advertise-community',
          text: '默认情况下 Community 属性不会随路由发布给邻居。打了标签却发现对端看不到，先检查是否在对应邻居上配置了 peer x advertise-community。另外，若需要在 AS 之间统一语义，务必在双方约定好标签含义，避免同名不同义。',
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm05-l07',
      moduleId: 'm05',
      title: 'BGP 选路：十三条规则与优先级思维',
      depth: '精通',
      minutes: 35,
      summary: '按顺序掌握 BGP 最优路径选择，并能解释任意一条路由的优选结果。',
      objectives: [
        '完整复述华为设备的 BGP 选路顺序并说明每步的设计动机',
        '区分 Weight、LocalPref、AS_Path 的作用范围与比较方向',
        '用 display bgp routing-table 定位为何某条路由未当选',
      ],
      keywords: ['BGP 选路', 'Weight', 'LocalPreference', 'AS_Path', 'MED', 'Router ID'],
      blocks: [
        {
          type: 'paragraph',
          text: '一条前缀可能从多个邻居收到多份副本，BGP 只选一份作为最优并下发转发表。选路不是「比一个综合分」，而是一串有严格顺序的比较：前一档分出胜负就停止，只有打平才进入下一档。这个顺序的设计逻辑是「先看我最能控制的，再看别人给我的信号，最后才用无争议的客观指标兜底」：Weight 完全本地、LocalPref 本 AS 可控、本地始发最可信、AS_Path 反映真实路径长度、Origin 反映来源质量、MED 是邻居的软建议，之后才是 EBGP 优于 IBGP、IGP 度量、Router ID、Peer IP 这类打破平局的规则。',
        },
        {
          type: 'analogy',
          title: '选路像层层筛选的招聘流程',
          text: '招聘时不会给候选人算一个综合分，而是先卡学历，学历不达标直接淘汰，全部达标才看工作经验，经验再打平才看项目经历。BGP 选路完全一样：Weight、LocalPref 这些「硬门槛」一旦分出高下，后面的 AS_Path、MED 再漂亮也没有机会。所以要影响选路，必须从当前真正在比较的那一档下手。',
        },
        {
          type: 'interactive',
          key: 'bgp-bestpath',
          caption: '拖动多条候选路由的属性，逐步观察比较在哪一档分出胜负。重点体会：高优先级的属性一旦有差异，后面的属性再优也没机会。',
        },
        {
          type: 'table',
          title: '华为设备 BGP 选路顺序',
          columns: ['顺序', '比较项', '比较方式', '作用范围'],
          rows: [
            ['1', 'Weight（PrefVal）', '越大越优', '仅本地，华为私有'],
            ['2', 'Local_Preference', '越大越优', '本 AS 内（IBGP）'],
            ['3', '本地始发路由', 'network/import-route/aggregate 优先', '本地'],
            ['4', 'AS_Path 长度', '越短越优', '跨 AS 有效'],
            ['5', 'Origin', 'IGP 优于 EGP，EGP 优于 Incomplete', '跨 AS'],
            ['6', 'MED', '越小越优（默认只比同 AS 邻居）', 'AS 间建议'],
            ['7', 'EBGP 与 IBGP', 'EBGP 路由优于 IBGP 路由', '本地'],
            ['8', 'IGP 度量到下一跳', '越小越优，部分版本默认不比较', '本 AS'],
            ['9', 'Cluster_List 长度', '越短越优', '反射器环境'],
            ['10', 'Router ID', '越小越优', '破平局'],
            ['11', 'Peer IP', '越小越优', '最后破平局'],
          ],
        },
        {
          type: 'paragraph',
          text: '最容易忽略的是第七条：同一前缀若同时从 EBGP 和 IBGP 学到，即使 IBGP 那条的 AS_Path 更短，也会优先选 EBGP。原因是 EBGP 路由代表「已经出了 AS」，转发路径更直接，避免在 AS 内部绕一圈再从另一个出口出去。第八条 IGP 度量在华为设备上默认不参与比较，必要时可通过 bestroute 相关命令调整，排错时以设备实际回显为准，不要照搬其他厂商教材。',
        },
        {
          type: 'code',
          title: '用 Weight 与 LocalPref 干预选路',
          lang: 'vrp',
          code: `# 方案一：本地 Weight，只影响本机，不传递
bgp 65001
 ipv4-family unicast
  peer 10.0.0.2 preferred-value 200

# 方案二：LocalPref，通过 route-policy 在 AS 内统一生效
route-policy RP-PREFER-A permit node 10
 apply local-preference 300
#
route-policy RP-PREFER-A permit node 20

bgp 65001
 ipv4-family unicast
  peer 10.0.0.2 route-policy RP-PREFER-A import

# 查看两条候选路由的完整属性做对比
display bgp routing-table 8.8.8.0
display bgp routing-table 8.8.8.0 verbose`,
        },
        {
          type: 'output',
          title: '验证：同前缀两条候选的对比',
          text: ` BGP routing table entry information of 8.8.8.0/24:
 From: 10.0.0.2 (2.2.2.2)
 AS-path 65002 65003, origin igp, MED 100, localpref 300,
 pref-val 0, valid, external, best, select, active, pre 255

 BGP routing table entry information of 8.8.8.0/24:
 From: 10.0.0.6 (6.6.6.6)
 AS-path 65002, origin igp, MED 0, localpref 100,
 pref-val 0, valid, external, pre 255

# 第二条 AS_Path 更短，但 localpref 只有 100，
# 在第二档就被淘汰，最终最优仍是第一条`,
        },
        {
          type: 'warning',
          title: 'Weight 只在本机生效',
          text: '用 preferred-value 调整的方向只影响当前设备，换一台设备结果可能完全不同，容易出现「本机看路由正常、下游设备却走了另一条」的诡异现象。需要全网一致时，用 LocalPref 配合 route-policy，在 AS 内统一部署。另外，本地始发路由的优先级高于所有从邻居学来的路由，所以别指望用 AS_Path 去压过自己 network 声明的路由。',
        },
        {
          type: 'tip',
          title: '排错时先判断停在第几档',
          text: '把两条路由的属性逐项按顺序比：先看 PrefVal，再看 LocPrf，再看是不是本地始发，再看 AS_Path 长度。通常前三档就能解释 80% 的「为什么没选我」。若全部打平，再看 EBGP 与 IBGP 的类型差异和 Router ID。',
        },
        {
          type: 'checklist',
          title: '选路结果自查',
          items: [
            '两条路由是否真的同前缀同掩码',
            'PrefVal 是否被本地策略改过',
            'LocPrf 是否一致，是否被 route-policy 影响',
            'AS_Path 长度是否相同，是否存在 AS_SET 影响计长',
            'MED 是否来自同一邻居 AS',
            '路由类型是 EBGP 还是 IBGP，是否触发第七条',
          ],
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm05-l08',
      moduleId: 'm05',
      title: '路由反射器与联盟',
      depth: '精通',
      minutes: 30,
      summary: '用反射器替代 IBGP 全连接，理解 Originator_ID 与 Cluster_List 的防环机制。',
      objectives: [
        '说明路由反射器如何在不破坏防环的前提下减少 IBGP 会话',
        '解释 Originator_ID 与 Cluster_List 分别防止哪类环路',
        '配置反射器与客户机，并用 display 回显验证反射结果',
      ],
      keywords: ['路由反射器', 'RR', 'Cluster_List', 'Originator_ID', '联盟', 'reflect-client'],
      blocks: [
        {
          type: 'paragraph',
          text: 'IBGP 全连接的会话数随设备数平方增长，20 台设备需要 190 条会话，运维几乎不可维护。路由反射器（Route Reflector，RR）的思路是：指定一台设备作为「广播中心」，客户机只需与 RR 建立 IBGP，RR 再把从一台客户机学到的路由反射给其他客户机和非客户机。这样就把网状连接变成了星形连接，会话数从平方级降到线性级。',
        },
        {
          type: 'analogy',
          title: 'RR 是部门主管，客户机是组员',
          text: '一个二十人的团队如果人人都要两两沟通，会议排期会崩溃。于是改成组员只向主管汇报，主管再统一转达给其他组员和隔壁部门。主管必须有完整的「通讯录」（BGP 表），并且要防止同一条消息在自己这里转圈，所以消息上会记录最初是谁说的（Originator_ID）以及经过了哪些主管（Cluster_List）。',
        },
        {
          type: 'table',
          title: '反射器的三条反射规则',
          columns: ['路由来源', '反射给客户机', '反射给非客户机'],
          rows: [
            ['从客户机学到', '允许', '允许'],
            ['从非客户机学到', '允许', '禁止'],
            ['从 EBGP 学到', '允许', '允许'],
          ],
        },
        {
          type: 'paragraph',
          text: '只有「非客户机到非客户机」被禁止，这正是 IBGP 水平分割规则的延续；其余组合都允许，才让星形结构能覆盖全网。为了防止反射过程产生环路，RR 引入了两个属性：Originator_ID 记录路由在 AS 内最初发起者的 Router ID，收到路由时若发现 Originator_ID 等于自己的 Router ID，说明路由绕回原点，直接丢弃；Cluster_List 记录途经的每个 Cluster ID，RR 收到路由时若发现列表里已有自己的 Cluster ID，同样丢弃。Cluster_List 每经过一个 RR 就追加一项，因此它同时还能在选路的第九档作为路径长度的参考。',
        },
        {
          type: 'code',
          title: '反射器与联盟配置',
          lang: 'vrp',
          code: `# RR：指定两台客户机，并显式设置 Cluster ID
bgp 65001
 router-id 1.1.1.1
 peer 2.2.2.2 as-number 65001
 peer 3.3.3.3 as-number 65001
 #
 ipv4-family unicast
  peer 2.2.2.2 reflect-client
  peer 3.3.3.3 reflect-client
  reflector cluster-id 1.1.1.1
  peer 2.2.2.2 enable
  peer 3.3.3.3 enable

# 联盟：把一个大 AS 拆成多个子 AS，对外仍表现为 65000
bgp 65000
 confederation id 65000
 confederation peer-as 65101 65102
 peer 10.0.0.9 as-number 65101
 #
 ipv4-family unicast
  peer 10.0.0.9 enable`,
        },
        {
          type: 'output',
          title: '验证：反射后的路由详情',
          text: ` BGP routing table entry information of 8.8.8.0/24:
 From: 2.2.2.2 (2.2.2.2)
 Route Duration: 0d00h42m16s
 AS-path 65002, origin igp, MED 0, localpref 100,
 pref-val 0, valid, internal, best, select, active, pre 255
 Originator: 2.2.2.2
 Cluster list: 0.0.0.1
 Advertised to such 3 peers:
    3.3.3.3
    10.0.0.2
    10.0.0.6`,
        },
        {
          type: 'warning',
          title: 'Cluster ID 冲突会造成路由被静默丢弃',
          text: '如果两台 RR 配置了相同的 Cluster ID，它们之间的反射路由会被对方判为环路而丢弃，表现为「邻居正常、路由在 RR 本地有、但对端始终收不到」。华为设备默认使用 Router ID 作为 Cluster ID，因此只要 Router ID 唯一通常没问题，但手工配置 reflector cluster-id 时必须确保全网唯一。另外，反射器不修改 Next_Hop，客户机仍需保证下一跳可达。',
        },
        {
          type: 'tip',
          title: '反射器要成对部署',
          text: '单台 RR 是明显的单点故障。生产环境通常部署两台 RR 互为备份，客户机同时与两台 RR 建 IBGP，靠选路规则从其中一台取路由。此时两台 RR 的 Cluster ID 应保持一致，这样客户机视角下它们属于同一个 Cluster，避免重复反射带来的额外开销。',
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm05-l09',
      moduleId: 'm05',
      title: '路由策略：filter-policy、route-policy 与各类过滤器',
      depth: '精通',
      minutes: 32,
      summary: '掌握 BGP 五种常用策略工具的差异，能精确控制路由的收发与加表。',
      objectives: [
        '区分 filter-policy 与 route-policy 的作用层次与默认动作',
        '用 ip-prefix、AS_Path Filter、Community Filter 匹配不同维度的路由',
        '通过 advertised-routes 与 received-routes 验证策略是否生效',
      ],
      keywords: ['filter-policy', 'route-policy', 'ip-prefix', 'AS_Path Filter', 'Community Filter'],
      blocks: [
        {
          type: 'paragraph',
          text: 'BGP 的策略工具看似很多，其实可以按「在哪一层生效」来记：ip-prefix、AS_Path Filter、Community Filter 只负责匹配，本身不改变任何行为；route-policy 把匹配与动作（apply）组合起来，是策略的骨架；filter-policy 则是一个固定的过滤开关，直接决定路由能不能进入路由表或发出去。搞清这三层关系，就不会在「为什么路由被过滤了」上绕圈。',
        },
        {
          type: 'analogy',
          title: '过滤器是安检仪，route-policy 是处置流程',
          text: 'ip-prefix 像 X 光机，只负责看清单里有没有违禁品；AS_Path Filter 像查护照上的途经国家；Community Filter 像看行李上的标签颜色。它们本身不做决定。route-policy 是安检员手里的处置手册：看到什么情况，是放行、拦截还是加收费用（修改属性）。filter-policy 则是安检口本身，规定哪些行李根本不用过机、哪些必须拦下。',
        },
        {
          type: 'table',
          title: '五种策略工具的分工',
          columns: ['工具', '匹配依据', '能否修改属性', '典型用途'],
          rows: [
            ['ip-prefix', '前缀与掩码范围', '否', '精确圈定网段范围'],
            ['AS_Path Filter', 'AS_Path 正则', '否', '按来源 AS 或路径特征过滤'],
            ['Community Filter', 'Community 标签', '否', '按业务标签批量匹配'],
            ['route-policy', '组合各类 if-match', '是（apply）', '既过滤又改属性'],
            ['filter-policy', '前缀或 AS_Path', '否', '控制路由加表或对外发布'],
          ],
        },
        {
          type: 'paragraph',
          text: 'filter-policy 在 BGP 里有特殊语义：import 方向不阻止路由进入 BGP 表，只阻止其参与选路和下发 FIB，也不会影响它再传给其他邻居；export 方向才是真正决定是否对外发布。这一点与 IGP 中的行为不同，很多「过滤不生效」的问题都源于此。另外 route-policy 的节点末尾隐含拒绝：所有节点都不匹配时默认 deny，因此习惯上会补一个空的 permit 节点兜底。',
        },
        {
          type: 'code',
          title: '匹配与策略的完整组合',
          lang: 'vrp',
          code: `# 1. 前缀列表：只放行 192.168.0.0/16 下掩码 24 到 28 的明细
ip ip-prefix P-ALLOW index 10 permit 192.168.0.0 16 greater-equal 24 less-equal 28

# 2. AS_Path Filter：匹配起源于 65002 或经过 65003 的路由
ip as-path-filter 10 permit ^65002_
ip as-path-filter 10 permit _65003_

# 3. Community Filter：匹配标签 65001:100
ip community-filter 1 permit 65001:100

# 4. route-policy：匹配后设置 MED，并保留兜底节点
route-policy RP-IN permit node 10
 if-match ip-prefix P-ALLOW
 apply med 20
#
route-policy RP-IN permit node 20

bgp 65001
 ipv4-family unicast
  # 接收方向：既过滤又改属性
  peer 10.0.0.2 route-policy RP-IN import
  # 接收方向：仅控制加表，不改变传播
  peer 10.0.0.6 filter-policy ip-prefix P-ALLOW import
  # 发布方向：决定对谁发哪些路由
  peer 10.0.0.10 filter-policy ip-prefix P-ALLOW export
  peer 10.0.0.14 as-path-filter 10 export
  peer 10.0.0.18 community-filter 1 export`,
        },
        {
          type: 'output',
          title: '验证：display bgp routing-table peer 10.0.0.2 advertised-routes',
          text: ` BGP local router ID is 1.1.1.1
 Status codes: * - valid, > - best, d - damped, h - history,
               i - internal, s - suppressed, S - Stale
 Origin : i - IGP, e - EGP, ? - incomplete

 Total Number of Routes: 2
      Network            NextHop        MED        LocPrf    PrefVal Path/Ogn
 *>   192.168.1.0/24     10.0.0.1        20                    0      i
 *>   192.168.2.0/24     10.0.0.1        20                    0      i`,
        },
        {
          type: 'paragraph',
          text: '验证策略时，advertised-routes 看到的是「我实际发给对端的内容」，received-routes 看到的是「对端实际发给我的内容」。两者的差异就是策略生效的位置：若 advertised-routes 里有、对端 BGP 表里没有，说明对端在 import 方向把它过滤了；若 advertised-routes 里就没有，问题在本地 export 策略或路由本身未优选。',
        },
        {
          type: 'warning',
          title: 'route-policy 末尾默认拒绝',
          text: '只写了 permit node 10 的 route-policy，会把所有不匹配该节点的路由全部拒绝，而不是放行。这是最常见的策略事故：本想只给一部分路由改属性，结果把其他路由全掐了。要么补一个 permit node 20 的空节点兜底，要么把不需要过滤的方向改用 route-policy 中匹配后不做动作的节点。上线前务必用 advertised-routes 和 received-routes 双向核对。',
        },
        {
          type: 'tip',
          title: 'ip-prefix 的范围写法',
          text: 'ip ip-prefix 中 greater-equal 与 less-equal 描述的是掩码长度范围，必须与前面的掩码联用才能表达「这个网段下的所有明细」。只写 permit 192.168.0.0 16 只匹配一条 /16，不会匹配 /24。若想匹配任意掩码，需要显式写 greater-equal 16 less-equal 32。',
        },
        {
          type: 'checklist',
          title: '策略上线前检查',
          items: [
            '匹配条件是否覆盖预期范围，是否误伤其他业务前缀',
            'route-policy 是否有兜底节点，默认拒绝是否符合预期',
            'filter-policy import 是否真的达到了拦截加表的目的',
            'export 方向是否用 advertised-routes 核对过实际发送内容',
            '调整策略后是否用 refresh bgp 软重置，而不是直接 reset',
          ],
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm05-l10',
      moduleId: 'm05',
      title: 'BGP 稳定性与排错实战',
      depth: '精通',
      minutes: 30,
      summary: '认识路由振荡与路由泄露的破坏力，掌握阻尼、前缀限制与系统化排错方法。',
      objectives: [
        '说明路由振荡对 CPU 与业务的影响，并配置 dampening 抑制',
        '用 route-limit 防止路由泄露导致的对等体崩溃',
        '按「邻居、路由、策略、转发」四层顺序完成一次 BGP 故障排查',
      ],
      keywords: ['路由振荡', 'dampening', 'Maximum Prefix', 'route-limit', 'BGP 排错', 'BFD'],
      blocks: [
        {
          type: 'paragraph',
          text: 'BGP 承载的是跨域流量，任何一次邻居震荡或路由反复撤销，都会被放大成大片业务的抖动。更危险的是路由泄露：一台配置错误的设备把几十万条明细注入对等体，瞬间打满对方内存，导致邻居断开，进而引发连锁反应。因此稳定性配置不是锦上添花，而是域间互联的准入条件。常见的三道防线是阻尼（dampening）、前缀数量限制（route-limit）和快速故障检测（BFD）。',
        },
        {
          type: 'analogy',
          title: 'dampening 像给爱报警的邻居装静音阀',
          text: '有的路由像一扇被风吹得反复开关的门，每开一次就触发一次广播。dampening 给它装了一个惩罚积分：每振荡一次加一笔罚分，罚分超过抑制阈值就暂时不采用这条路由；之后按半衰期慢慢扣分，降到重用阈值以下才恢复。这样偶尔抖一次的门照常使用，只有长期不稳定的门才会被静音。',
        },
        {
          type: 'table',
          title: 'dampening 关键参数',
          columns: ['参数', '含义', '华为默认值'],
          rows: [
            ['half-life', '惩罚值衰减一半所需时间（分钟）', '15'],
            ['reuse', '低于该惩罚值才恢复使用', '750'],
            ['suppress', '高于该惩罚值开始抑制', '2000'],
            ['max-suppress-time', '最长抑制时间（分钟）', '60'],
            ['ceiling', '惩罚值上限，默认 suppress 的 4 倍', '约 8000'],
          ],
        },
        {
          type: 'code',
          title: '稳定性与快速检测配置',
          lang: 'vrp',
          code: `bgp 65001
 router-id 1.1.1.1
 peer 10.0.0.2 as-number 65002
 #
 ipv4-family unicast
  # 限制从该邻居最多接收 1000 条，达到 80% 告警
  peer 10.0.0.2 route-limit 1000 80
  # 开启 BFD，毫秒级发现链路故障
  peer 10.0.0.2 bfd enable
  peer 10.0.0.2 enable

# 对全局或指定路由开启阻尼
bgp 65001
 ipv4-family unicast
  dampening 15 750 2000 60

# 只对特定前缀开启阻尼，减少误伤
route-policy RP-DAMP permit node 10
 if-match ip-prefix P-UNSTABLE
#
bgp 65001
 ipv4-family unicast
  dampening route-policy RP-DAMP`,
        },
        {
          type: 'output',
          title: '验证：被抑制的路由与邻居状态',
          text: ` BGP local router ID is 1.1.1.1
 Status codes: * - valid, > - best, d - damped, h - history,
               i - internal, s - suppressed, S - Stale

 Total Number of Routes: 3
      Network            NextHop        MED        LocPrf    PrefVal Path/Ogn
 *d   10.20.0.0/16       10.0.0.2        0                     0      65002?
 *>   192.168.1.0/24     10.0.0.2        0                     0      65002?

# 邻居因超限被断开时会看到提示
display bgp peer 10.0.0.2 verbose
  BGP current state: Idle
  Last down reason: Route limit exceeded`,
        },
        {
          type: 'steps',
          items: [
            {
              title: '第一步：看邻居状态',
              text: 'display bgp peer 确认 State 是否 Established。若不是，用 verbose 看最后断开原因与计时器，优先排查三层可达性、TCP 179、AS 号与认证。',
            },
            {
              title: '第二步：看路由是否存在',
              text: 'display bgp routing-table 查目标前缀是否有 * 与 >。没有 * 说明下一跳不可达，没有 > 说明未当选，需按选路顺序逐档比较。',
            },
            {
              title: '第三步：看策略是否拦截',
              text: 'advertised-routes 与 received-routes 双向对比，判断是发送端未发、还是接收端被 filter-policy 或 route-policy 拦下。',
            },
            {
              title: '第四步：看转发是否正常',
              text: 'display ip routing-table 确认最优 BGP 路由已下发 FIB，再用 tracert 或 ping 验证实际转发路径是否与预期一致。',
            },
            {
              title: '第五步：看稳定性',
              text: '检查是否有 dampening 抑制、route-limit 告警、频繁的 Up/Down。必要时抓包观察 Update 与 Notification 的频率。',
            },
          ],
        },
        {
          type: 'warning',
          title: 'dampening 会误伤，默认不要全网开',
          text: '阻尼对「抖动一次就恢复」的正常路由也会累积惩罚，若参数过激进，可能把一条只是短暂闪断的重要路由长期压住，反而放大故障。生产上建议只对确实不稳定的外部前缀开启，或者干脆依赖 BFD 与路由策略提升收敛质量。另外 route-limit 到达上限后华为设备默认断开邻居，可能导致整段路由消失，阈值要留足余量。',
        },
        {
          type: 'tip',
          title: '排错顺序比命令更重要',
          text: '永远按「邻居是否建立、路由是否收到、路由是否优选、是否下发转发表、转发是否可达」这五层向下排查，不要一上来就 reset bgp。每次改动前先记录 display 结果，改完再对比，才能确认改动是否真的起作用。',
        },
        {
          type: 'checklist',
          title: 'BGP 故障排查清单',
          items: [
            '邻居状态与最后断开原因是否明确',
            '对端 AS 号、认证、TTL、更新源是否匹配',
            '目标前缀在 BGP 表中是否有 valid 与 best 标记',
            '下一跳是否 IGP 可达，是否需要 next-hop-local',
            '收发方向策略是否误拦，是否用 advertised/received 核对',
            '是否存在 dampening 抑制或 route-limit 超限',
            '最优路由是否已进入 IP 路由表并下发 FIB',
          ],
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
  ],
};

export default mod;
