import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm11',
  code: 'M11',
  title: '综合排错与实战',
  summary:
    '把前十个模块的知识收束成一套可执行的排错与交付方法：从物理到应用的分层定位、五个真实故障案例的完整闭环，到 HCIE 实验考试的时间分配、能力自评与生产变更回滚规范。',
  stage: 'L3',
  order: 11,
  goals: [
    '能按物理、数据链路、网络、传输、应用五层顺序收敛故障范围',
    '能独立完成 OSPF、BGP、VLAN、WLAN、IPsec 五类典型故障的定位与修复',
    '能对每个故障写出「现象、原因、验证命令、修复动作」的完整闭环记录',
    '能按分值分配 HCIE 实验考试时间，并在压力下保持验证节奏',
    '能遵守生产变更的审批、备份、灰度与回滚规范',
  ],
  keywords: [
    '分层排错',
    'OSPF 邻居',
    'BGP Active',
    'VLAN 不通',
    'AP 上线',
    'IPsec 隧道',
    'HCIE 实验',
    '变更回滚',
  ],
  lessons: [
    {
      id: 'm11-l01',
      moduleId: 'm11',
      title: '分层排错方法论：从物理到应用',
      depth: '熟悉',
      minutes: 26,
      summary: '掌握物理到应用的分层排错方法，用五步闭环把现象收敛到根因。',
      objectives: [
        '把任意故障现象映射到 OSI 的某一层，并说出该层的验证手段',
        '按「定义现象、缩小范围、分层验证、定位根因、修复验证」完成一次排查',
        '用基线对比与二分法减少无效尝试',
      ],
      keywords: ['分层排错', 'OSI', '五步闭环', '基线', '二分法', '验证命令'],
      blocks: [
        {
          type: 'paragraph',
          text: '排错最大的浪费不是不会命令，而是没有顺序。看到「业务不通」就 SSH 上去改配置，很容易在无关的层反复折腾，甚至把原本正常的配置改坏。分层排错的核心是把现象按 OSI 逐层切开：物理层看链路是否 up，数据链路层看 VLAN、MAC 与 STP，网络层看地址、路由与 ACL，传输层看端口与连接状态，应用层看服务与解析。每层都有明确的验证命令，先确认下层正常，再向上排查。',
        },
        {
          type: 'heading',
          text: '五步闭环，而不是五条命令',
          level: 3,
        },
        {
          type: 'paragraph',
          text: '一次合格的排错必须能写成闭环：现象是什么、可能原因有哪些、用哪条命令验证、排除后剩哪个根因、做了什么修复、修复后如何确认。缺少任何一环，问题都可能在换个时间、换台设备后再次出现。方法上先做范围收敛：是一台设备还是整栋楼，是一个 VLAN 还是所有 VLAN，是新增变更后出现还是一直存在。范围越窄，需要检查的层次越少。',
        },
        {
          type: 'analogy',
          title: '像医生问诊，而不是直接开刀',
          text: '医生不会因为病人说「不舒服」就立刻手术，而是先量体温、验血、做影像，一层层排除。网络排错也一样：先确认链路有没有通（体温），再看二层与三层是否正常（验血），最后才动配置（手术）。同时要问「什么时候开始的、之前改过什么」，这正是病史，往往比任何命令都更快指向根因。',
        },
        {
          type: 'table',
          title: '分层现象与验证手段',
          columns: ['层次', '典型现象', '华为设备验证命令'],
          rows: [
            ['物理层', '接口 down、光模块告警、错包增长', 'display interface brief、display transceiver diagnosis'],
            ['数据链路层', '同网段不通、VLAN 内丢包、MAC 漂移', 'display port vlan、display mac-address、display stp brief'],
            ['网络层', '跨网段不通、路由缺失、被 ACL 拦截', 'display ip routing-table、display arp、display acl'],
            ['传输层', '端口不通、连接建立失败', 'display tcp status、ping、tracert'],
            ['应用层', '网页打不开、域名解析失败、认证失败', 'display dns server、服务端日志'],
          ],
        },
        {
          type: 'steps',
          items: [
            {
              title: '定义现象',
              text: '用一句话写清谁、从哪里、访问什么、不通的具体表现，并记录发生时间与最近变更。',
            },
            {
              title: '缩小范围',
              text: '用替换法与对比法判断是单点还是成片，是同 VLAN 还是跨网段，是单向还是双向。',
            },
            {
              title: '分层验证',
              text: '从物理层向上逐层执行验证命令，每层只回答「这一层是否正常」，不跳层猜测。',
            },
            {
              title: '定位根因',
              text: '把验证结果与预期基线对比，找出唯一能解释全部现象的原因，而不是罗列多个可能。',
            },
            {
              title: '修复验证',
              text: '做最小改动修复，立即用同一组命令复测，并观察一段时间确认没有引入新问题。',
            },
          ],
        },
        {
          type: 'code',
          title: '一次自下而上的分层验证',
          lang: 'vrp',
          code: `# 物理层：先确认接口与光模块
display interface brief
display transceiver diagnosis interface GigabitEthernet0/0/1

# 数据链路层：VLAN、MAC 与生成树
display port vlan GigabitEthernet0/0/1
display mac-address 00e0-fc12-3456
display stp brief

# 网络层：地址、路由与策略
display ip interface brief
display ip routing-table 192.168.20.0
display acl 3000

# 传输与应用：连通性与端口
ping -a 192.168.10.1 192.168.20.10
tracert -a 192.168.10.1 192.168.20.10
display tcp status`,
        },
        {
          type: 'output',
          title: '验证：display interface brief 的异常信号',
          text: `[SW1] display interface brief
PHY: Physical  *down: administratively down
Interface            PHY     Protocol  InUti OutUti   inErrors  outErrors
GigabitEthernet0/0/1 up      up          12%    8%          0         0
GigabitEthernet0/0/2 down    down         0%    0%     12845         0
GigabitEthernet0/0/3 up      up           1%    1%          0         0
Vlanif10             up      up           -      -          0         0`,
        },
        {
          type: 'list',
          title: '这段回显说明什么',
          items: [
            'GigabitEthernet0/0/2 物理层 down，先查光纤、模块与对端端口，不要急着查路由',
            'inErrors 持续增长说明链路质量或双工协商有问题，即使状态是 up 也要处理',
            'Vlanif10 是 up 的，说明本端网关正常，问题范围可以收缩到具体物理口',
            '没有异常计数不代表没问题，还要看协议状态与速率是否符合规划',
          ],
        },
        {
          type: 'warning',
          title: '不要一次改多个变量',
          text: '同时改 VLAN、改路由、重启接口，即使业务恢复也无法知道是哪一步起了作用，下次再犯仍然不会。每次只改一个变量，改完立刻验证并记录，这是排错与变更共同的铁律。另外，生产环境不要用 reset 或重启来「试试看」，一次重启可能让邻居全断、业务大面积抖动。',
        },
        {
          type: 'tip',
          title: '先找基线，再谈差异',
          text: '同一型号、同一角色的设备配置通常高度相似。把故障设备与正常设备的 display current-configuration 做对比，差异点往往就是根因。没有基线时，至少对比变更前的备份，或者对比同 VLAN、同角色的另一台设备。',
        },
        {
          type: 'checklist',
          title: '排错记录自查',
          items: [
            '现象是否写到可以复现，而不是「网络不通」',
            '是否记录了发生时间与最近的变更内容',
            '每一层是否都有明确的验证结果，而不是凭经验跳过',
            '根因是否能解释全部现象，而不只是其中一条',
            '修复动作是否最小化，是否留下了回滚手段',
            '修复后是否用同一组命令复测并观察',
          ],
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm11-l02',
      moduleId: 'm11',
      title: '案例一：OSPF 邻居无法建立',
      depth: '精通',
      minutes: 32,
      summary: '从状态机卡点定位 OSPF 邻居故障，完成验证、修复与复测的完整闭环。',
      objectives: [
        '根据邻居停留在 Init、2-Way、ExStart、Exchange 判断故障类型',
        '用 display ospf interface 与 display ospf error 定位参数不一致',
        '修复区域、定时器、认证、MTU 或网络类型问题并验证邻居 Full',
      ],
      keywords: ['OSPF 邻居', '状态机', 'Hello', 'MTU', '认证', 'display ospf error'],
      blocks: [
        {
          type: 'paragraph',
          text: 'OSPF 邻居建立失败是现网最高频的路由故障之一，但它的表现很有规律：邻居不会凭空消失，而是卡在状态机的某一步。Step 越靠后，说明底层越正常。Init 表示只收到对方 Hello、对方没收到自己的；2-Way 表示双向都收到但选举或网络类型有问题；ExStart 与 Exchange 卡住，多半是 MTU 不一致或 Router ID 冲突。把状态与原因对应起来，比逐条猜配置高效得多。',
        },
        {
          type: 'analogy',
          title: '邻居卡在哪一步，就像两个人对暗号对到哪一句',
          text: 'Init 像你喊了对方名字，对方没听见；2-Way 像互相听见了，但还没确认谁先说话；ExStart 像开始核对暗号，结果发现两人拿的暗号本版本不同（MTU 不一致）；Exchange 像暗号对上了但交换的信封大小不一样，装不下就中断。只要知道卡在第几句，就知道该查哪本暗号本。',
        },
        {
          type: 'interactive',
          key: 'ospf-fsm',
          caption: '逐步点击状态迁移，注意 Init 与 2-Way 的差别，以及 ExStart 阶段 MTU 协商失败会如何退回 Init。',
        },
        {
          type: 'table',
          title: '卡点与常见根因对照',
          columns: ['卡住状态', '常见原因', '优先验证'],
          rows: [
            ['Down / Attempt', '接口未使能 OSPF、链路不通、被 silent-interface 抑制', 'display ospf interface、ping'],
            ['Init', '单向可达、Hello 被 ACL 拦截、认证失败', 'display ospf error、display acl'],
            ['2-Way', '广播网络非 DR/BDR 之间属正常；否则检查网络类型与优先级', 'display ospf peer、display ospf interface'],
            ['ExStart', 'MTU 不一致、Router ID 冲突、MTU 检测未关闭', 'display ospf interface 的 MTU 字段'],
            ['Exchange / Loading', 'LSA 请求得不到响应、数据库异常', 'display ospf lsdb、display ospf error'],
          ],
        },
        {
          type: 'code',
          title: '定位命令组合',
          lang: 'vrp',
          code: `# 1. 看接口是否使能 OSPF、区域与网络类型
display ospf interface GigabitEthernet0/0/1

# 2. 看邻居状态与角色
display ospf peer

# 3. 看错误统计，认证、区域、MTU 问题都会计数
display ospf error

# 4. 对比两端关键配置
display current-configuration configuration ospf

# 5. 验证三层可达与单向问题
ping -a 10.0.12.1 10.0.12.2
display acl 3000`,
        },
        {
          type: 'output',
          title: '验证：display ospf peer 与 display ospf error',
          text: `[AR1] display ospf peer
OSPF Process 1 with Router ID 1.1.1.1
 Neighbors

 Area 0.0.0.0 interface 10.0.12.1(GigabitEthernet0/0/1)'s neighbors
 Router ID: 2.2.2.2        Address: 10.0.12.2
   State: Init           Mode: Nbr is Master   Priority: 1
   DR: 10.0.12.2         BDR: 10.0.12.1
   Dead timer due in 00:00:32

[AR1] display ospf error
OSPF Process 1 with Router ID 1.1.1.1
  OSPF error statistics
  Bad authentication: 12
  Area mismatch: 0
  MTU mismatch: 0`,
        },
        {
          type: 'steps',
          items: [
            {
              title: '现象',
              text: '两端接口 up、地址互通，但 display ospf peer 一直显示 Init，邻居无法进入 Full。',
            },
            {
              title: '可能原因',
              text: '认证方式或密钥不一致，导致对端丢弃 Hello；也可能是 ACL 拦截了 224.0.0.5 或单向路由问题。',
            },
            {
              title: '验证',
              text: 'display ospf error 中 Bad authentication 持续增长，说明 Hello 被认证校验拒绝；再对比两端认证配置。',
            },
            {
              title: '修复',
              text: '统一认证模式与密钥，注意明文与密文参数的差异；修复后邻居应在 Dead 时间内进入 Full。',
            },
            {
              title: '复测',
              text: 'display ospf peer 确认 State 为 Full，display ospf error 计数不再增长，路由表出现预期 OSPF 路由。',
            },
          ],
        },
        {
          type: 'warning',
          title: '2-Way 不一定是故障',
          text: '在广播网络中，非 DR/BDR 的路由器之间长期保持 2-Way 是正常设计，它们不需要建立 Full 邻接。看到 2-Way 就断定故障，是典型的误判。真正的判断依据是：是否有设备与 DR/BDR 建立了 Full，以及路由是否完整。只有当所有邻居都停在 2-Way、且没有 DR 时，才需要继续排查。',
        },
        {
          type: 'tip',
          title: 'MTU 不一致的信号很隐蔽',
          text: 'MTU 不一致常表现为邻居卡在 ExStart 或 Exchange，然后反复超时回到 Init，日志里可能出现「Packet too big」。在华为设备上用 display ospf interface 查看接口 MTU，并确认两端一致。若确实需要不同 MTU，可开启 MTU 检测忽略，但更推荐统一规划。',
        },
        {
          type: 'checklist',
          title: 'OSPF 邻居排查清单',
          items: [
            '接口是否 up，地址是否同网段且双向可达',
            '接口是否被 silent-interface 抑制',
            '两端区域 ID、网络类型、Hello 与 Dead 定时器是否一致',
            '认证模式与密钥是否一致，是否有多余的空格或大小写差异',
            '接口 MTU 是否一致，Router ID 是否冲突',
            'ACL 或防火墙是否拦截 224.0.0.5 与 224.0.0.6',
            '修复后邻居是否 Full，路由与 LSA 是否正常',
          ],
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm11-l03',
      moduleId: 'm11',
      title: '案例二：BGP 邻居卡在 Active',
      depth: '精通',
      minutes: 32,
      summary: '读懂 BGP Active 背后的真实原因，按可达性、端口、参数逐层排除。',
      objectives: [
        '说明 Active 状态的含义，并区分它与 Established 的本质差别',
        '用 display bgp peer verbose 与 display tcp status 定位 TCP 179 是否可达',
        '修复更新源、TTL、AS 号、认证与路由策略导致的建邻失败',
      ],
      keywords: ['BGP Active', 'TCP 179', 'connect-interface', 'ebgp-max-hop', 'AS 号', '认证'],
      blocks: [
        {
          type: 'paragraph',
          text: 'BGP 邻居卡在 Active，是初学者最容易误判的状态。Active 不是「已激活」，而是「TCP 连接没有建立、正在等待重试」。BGP 跑在 TCP 179 之上，因此建邻失败的根因一定在 TCP 之前或 TCP 之中：要么三层不可达，要么 179 被拦截，要么两端参数不匹配导致连接被对端重置。按「先通、再连、后协商」的顺序检查，基本不会走偏。',
        },
        {
          type: 'analogy',
          title: 'Active 像电话一直拨不通',
          text: '你想给对方打电话，号码不对就根本拨不出去（三层不可达）；号码对但对方停机，就一直听忙音（179 未监听或被拦）；接通了却因为暗号不对被挂断（AS 号、认证、能力不匹配）。Active 就是「还没接通」这个阶段，先确认号码与线路，再谈暗号。',
        },
        {
          type: 'table',
          title: 'Active 的常见原因与验证',
          columns: ['可能原因', '典型特征', '验证命令', '修复动作'],
          rows: [
            ['三层不可达', 'ping 不通，无回程路由', 'ping、tracert、display ip routing-table', '补路由或修正地址'],
            ['TCP 179 被拦', 'ping 通但连接建立失败', 'display tcp status、display acl', '放行 179 或调整 ACL'],
            ['更新源不一致', 'IBGP 用环回口但未配 connect-interface', 'display current-configuration configuration bgp', '两端统一 connect-interface'],
            ['EBGP 非直连', '跨设备建邻但 TTL 为 1', 'display bgp peer verbose', '配置 ebgp-max-hop'],
            ['AS 号或认证错', '能连上但立即断开', 'display bgp peer verbose 的最后断开原因', '核对 AS 号与密钥'],
          ],
        },
        {
          type: 'code',
          title: '按顺序排除 Active',
          lang: 'vrp',
          code: `# 1. 三层是否可达，回程是否存在
ping -a 10.0.0.1 10.0.0.2
tracert -a 10.0.0.1 10.0.0.2

# 2. 邻居状态、更新源与最后断开原因
display bgp peer
display bgp peer 10.0.0.2 verbose

# 3. TCP 179 是否监听、是否被 ACL 拦截
display tcp status
display acl 3000

# 4. 核对两端 BGP 关键配置
display current-configuration configuration bgp`,
        },
        {
          type: 'output',
          title: '验证：display bgp peer verbose',
          text: `[AR1] display bgp peer 10.0.0.2 verbose
BGP Peer is 10.0.0.2,  remote AS 65002
         Type: EBGP link
BGP version 4, Remote router ID 0.0.0.0
BGP current state: Active
BGP current event: ConnectRetry
BGP last state: Connect
Port: Local - 51234          Remote - 179
Configured: Active Hold Time: 180 sec   Keepalive Time: 60 sec
Last down reason: TCP connection failed`,
        },
        {
          type: 'list',
          title: '回显给出的线索',
          items: [
            'current state 为 Active、last state 为 Connect，说明 TCP 握手没有完成',
            'Remote router ID 为 0.0.0.0，说明从未收到对端的 Open 报文',
            'Local 端口是随机高端口，Remote 固定为 179，方向是本地主动连接对端',
            'Last down reason 为 TCP connection failed，直接把排查锁定在可达性与端口上',
          ],
        },
        {
          type: 'steps',
          items: [
            {
              title: '现象',
              text: 'BGP 邻居长期 Active，业务侧表现为对端前缀始终学不到，但接口与直连 ping 正常。',
            },
            {
              title: '可能原因',
              text: '中间防火墙只放行了 ICMP，未放行 TCP 179；或设备 ACL 误拦了源地址。',
            },
            {
              title: '验证',
              text: 'display tcp status 看不到到对端 179 的 ESTABLISHED 会话，抓包可见 SYN 无回应。',
            },
            {
              title: '修复',
              text: '在防火墙与设备 ACL 上放行双向 TCP 179，注意源目地址与方向都要覆盖。',
            },
            {
              title: '复测',
              text: 'display bgp peer 显示 Established，PrefRcv 增长，业务路由恢复。',
            },
          ],
        },
        {
          type: 'warning',
          title: '别用 reset bgp all 掩盖问题',
          text: '看到 Active 就反复 reset，只会让状态在 Active 与 Idle 之间来回跳，问题一点没解决，还可能影响其他正常邻居。先看 Last down reason，再决定是查路由、查端口还是查参数。另外，IBGP 使用环回口建邻时，必须保证两端环回口地址互相有 IGP 路由，否则 TCP 根本到不了。',
        },
        {
          type: 'tip',
          title: '两端都要看，方向要对称',
          text: '只在一端查配置，很容易漏掉对端的 ACL、AS 号或更新源问题。排错时同时在两端执行 display bgp peer verbose，对比 Local 与 Remote 端口、Router ID 与断开原因。若一侧显示 Connect、另一侧显示 Active，通常是单向可达或端口过滤。',
        },
        {
          type: 'checklist',
          title: 'BGP 建邻检查清单',
          items: [
            '邻居地址是否 ping 通，是否有回程路由',
            'TCP 179 是否在两端监听，ACL 与防火墙是否放行',
            '更新源接口是否与对端配置的邻居地址一致',
            'EBGP 跨设备时是否配置足够的 ebgp-max-hop',
            '两端 AS 号、认证、Hold Time 是否匹配',
            '是否触发 route-limit 或策略导致邻居被断开',
            '修复后是否 Established 且前缀数量正常',
          ],
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm11-l04',
      moduleId: 'm11',
      title: '案例三：VLAN 不通与 WLAN AP 无法上线',
      depth: '精通',
      minutes: 38,
      summary: '用二层与 CAPWAP 视角分别排查 VLAN 不通与 AP 无法上线。',
      objectives: [
        '按 PVID、允许列表、VLAN 创建与 STP 顺序定位 VLAN 不通',
        '用 display port vlan 与 display mac-address 判断二层路径断点',
        '从地址、CAPWAP 端口、Option 43 与许可证定位 AP 上线失败',
      ],
      keywords: ['VLAN 不通', 'Trunk', 'PVID', 'CAPWAP', 'Option 43', 'AP 上线'],
      blocks: [
        {
          type: 'paragraph',
          text: 'VLAN 不通几乎都出在二层的三个细节：VLAN 有没有创建、接口的 PVID 对不对、Trunk 的允许列表有没有放行。很多故障不是「没配」，而是「配了但没生效」，例如 Trunk 默认只放行 VLAN 1，新建的 VLAN 10 没有加入允许列表；或者 Access 口 PVID 改成了 20，终端却还按 VLAN 10 发包。先用 display port vlan 看清每个口的链路类型、PVID 与允许列表，再谈三层。',
        },
        {
          type: 'analogy',
          title: 'VLAN 像楼栋门禁，Trunk 像主通道的放行名单',
          text: 'Access 口是单元门，进门只认一张卡（PVID），刷卡后就归到这栋楼。Trunk 口是连接楼栋的主通道，保安手里有一份放行名单，名单上没有的楼栋号一律拦下。VLAN 没创建，相当于这栋楼根本不存在；PVID 配错，相当于把住户分到了隔壁楼；允许列表漏配，相当于主通道不放行，楼里人出不去也进不来。',
        },
        {
          type: 'table',
          title: 'VLAN 不通的分层排查',
          columns: ['检查点', '典型问题', '验证命令'],
          rows: [
            ['VLAN 是否存在', '只在部分设备创建，端到端不一致', 'display vlan'],
            ['接口链路类型', '该 Access 却配成 Trunk，或反之', 'display port vlan'],
            ['PVID', '终端所属 VLAN 与接口 PVID 不一致', 'display port vlan'],
            ['Trunk 允许列表', '未放行业务 VLAN，默认只放行 VLAN 1', 'display port vlan'],
            ['STP 状态', '端口被阻塞或拓扑震荡', 'display stp brief'],
            ['MAC 学习', 'MAC 漂移或未学习到，说明路径断', 'display mac-address'],
          ],
        },
        {
          type: 'code',
          title: 'VLAN 故障定位命令',
          lang: 'vrp',
          code: `# VLAN 是否创建、端口是否加入
display vlan
display vlan 10

# 链路类型、PVID 与 Trunk 允许列表
display port vlan GigabitEthernet0/0/1

# 接口状态与生成树
display interface GigabitEthernet0/0/1
display stp brief

# 终端 MAC 是否学到、从哪个口学到
display mac-address 00e0-fc12-3456`,
        },
        {
          type: 'output',
          title: '验证：display port vlan',
          text: `[SW1] display port vlan GigabitEthernet0/0/1
Port                    Link Type    PVID  Trunk VLAN List
-------------------------------------------------------------------------------
GigabitEthernet0/0/1    trunk        1     1,10,30-40
GigabitEthernet0/0/2    access       10    -
GigabitEthernet0/0/3    trunk        1     1-4094

# 业务 VLAN 20 不在 G0/0/1 的允许列表中，
# 该口下挂的 VLAN 20 终端无法跨设备通信`,
        },
        {
          type: 'paragraph',
          text: 'WLAN 侧的问题则要沿 CAPWAP 隧道查。AP 上电后先通过 DHCP 获取管理地址，再找 AC 的地址建立 CAPWAP 隧道（UDP 5246 控制、5247 数据），随后下载配置与版本并上线。任何一步断了，AP 都上不了线。所以顺序是：AP 有没有拿到地址、能不能 ping 通 AC、AC 地址有没有通过 DHCP Option 43 或 DNS 告诉 AP、中间是否放行 5246 与 5247、AC 上是否还有许可证与 AP 型号支持。',
        },
        {
          type: 'table',
          title: 'AP 无法上线的常见原因',
          columns: ['阶段', '现象', '验证与修复'],
          rows: [
            ['获取地址', 'AP 无 IP，反复重启', '查 DHCP 地址池与 AP 管理 VLAN'],
            ['发现 AC', '有地址但找不到 AC', '配置 Option 43，或确认 AC 源地址可达'],
            ['建立隧道', 'CAPWAP 建链失败', '放行 UDP 5246、5247，检查 NAT 映射'],
            ['版本与型号', '隧道建立后立即下线', '核对 AC 支持的 AP 型号与版本'],
            ['许可证', 'AP 显示未授权', '检查 AC 许可证数量与有效期'],
          ],
        },
        {
          type: 'code',
          title: 'WLAN 故障定位命令',
          lang: 'vrp',
          code: `# AP 在线状态与失败原因
display ap all
display ap online-fail-record all

# AC 的 CAPWAP 与源地址配置
display capwap configuration
display current-configuration configuration wlan

# 从 AP 侧验证管理地址与 AC 可达性
ping -a 10.10.20.11 10.10.100.10`,
        },
        {
          type: 'output',
          title: '验证：display ap all 与失败记录',
          text: `[AC1] display ap all
Total number of APs: 2
AP ID  AP Name   AP MAC            State   Type  IP Address
0      AP-1      00e0-fc12-3456    nor     R     10.10.20.11
1      AP-2      00e0-fc12-3478    fault   R     -

[AC1] display ap online-fail-record all
AP MAC            Fail Time              Reason
00e0-fc12-3478    2026-11-12 09:31:22    CAPWAP tunnel establishment failed
00e0-fc12-3478    2026-11-12 09:28:10    No AC address obtained from DHCP`,
        },
        {
          type: 'warning',
          title: 'Trunk 放行与 PVID 是两件事',
          text: 'Trunk 口的 PVID 决定未打标签的帧归哪个 VLAN，允许列表决定哪些 VLAN 能通过。只把业务 VLAN 加进允许列表，却忘了 AP 管理 VLAN，就会出现「业务 VLAN 通了、AP 却上不了线」。同理，AP 管理 VLAN 与 AC 源地址不在同一可达范围，隧道也建不起来。配置后一定用 display port vlan 逐口核对。',
        },
        {
          type: 'tip',
          title: '先 ping 通，再看 CAPWAP',
          text: 'AP 上线失败时，先确认 AP 是否拿到管理地址并 ping 通 AC，再查 5246 与 5247。若 ping 不通，问题在二层或 DHCP；ping 通但隧道失败，才去看 CAPWAP 与证书、许可证。把这两段分开，能省掉大量无效的 AC 侧配置检查。',
        },
        {
          type: 'checklist',
          title: 'VLAN 与 WLAN 联合排查',
          items: [
            '业务 VLAN 与 AP 管理 VLAN 是否在所有相关设备上创建',
            'Access 口 PVID 是否与终端规划一致',
            'Trunk 允许列表是否包含全部业务与管理 VLAN',
            'STP 是否存在阻塞端口或频繁拓扑变化',
            'AP 是否获取到管理地址，DHCP 地址池是否耗尽',
            'Option 43 或 DNS 是否正确指向 AC',
            'UDP 5246 与 5247 是否端到端放行',
            'AC 许可证与 AP 型号、版本是否匹配',
          ],
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm11-l05',
      moduleId: 'm11',
      title: '案例四：IPsec 隧道无法建立',
      depth: '熟悉',
      minutes: 30,
      summary: '按 IKE 与 IPsec 两阶段定位隧道失败，修复 ACL 与 NAT 场景问题。',
      objectives: [
        '区分 IKE 第一阶段与 IPsec 第二阶段的失败表现',
        '用 display ike sa 与 display ipsec sa 判断卡在哪一阶段',
        '修复 ACL 不对称、预共享密钥、NAT 穿越与提议不匹配问题',
      ],
      keywords: ['IPsec', 'IKE', 'IPsec SA', 'ACL', 'NAT-T', '预共享密钥'],
      blocks: [
        {
          type: 'paragraph',
          text: 'IPsec 隧道建立分两个阶段。第一阶段由 IKE 协商管理通道，验证双方身份并生成 IKE SA；第二阶段在 IKE SA 的保护下协商业务通道，生成 IPsec SA。第一阶段失败，display ike sa 里什么都看不到；第一阶段成功但第二阶段失败，会看到 IKE SA 正常、IPsec SA 为空。这个分界线是排错的第一刀，能直接砍掉一半的排查面。',
        },
        {
          type: 'analogy',
          title: '先握手确认身份，再商量怎么运货',
          text: 'IKE 第一阶段像两个仓库管理员先对暗号、验工牌，确认对方是自己人，并约定一个安全的通话频道。第二阶段才在这个频道里商量：哪些货物走加密通道（ACL）、用什么锁和箱子（提议）、从哪个门进出。暗号不对，连话都说不上；暗号对了但货物清单对不上，通道照样建不起来。',
        },
        {
          type: 'interactive',
          key: 'fw-policy',
          caption: '观察安全策略如何依次匹配源目地址、端口与协议，注意 UDP 500 与 4500 被拒绝时 IKE 会在哪一步停住。',
        },
        {
          type: 'table',
          title: '两阶段失败原因对照',
          columns: ['阶段', '失败表现', '常见原因'],
          rows: [
            ['IKE 第一阶段', 'display ike sa 无任何条目', 'UDP 500 被拦、PSK 不一致、对端地址错、提议不匹配'],
            ['IKE 第一阶段', '有 IKE SA 但反复重建', '身份认证失败、DPD 检测超时'],
            ['IPsec 第二阶段', 'IKE SA 正常，IPsec SA 为空', 'ACL 不镜像、提议不匹配、NAT 未穿越'],
            ['IPsec 第二阶段', 'SA 建立但业务不通', 'ACL 未覆盖实际流量、路由未指向隧道'],
          ],
        },
        {
          type: 'code',
          title: '两端 IPsec 基础配置（以 AR1 为例）',
          lang: 'vrp',
          code: `system-view
sysname AR1
#
acl number 3000
 rule 5 permit ip source 192.168.10.0 0.0.0.255 destination 192.168.20.0 0.0.0.255
#
ike proposal 10
 encryption-algorithm aes-256
 authentication-algorithm sha2-256
 dh group14
#
ike peer PEER1 v2
 pre-shared-key cipher Netpath@2026
 remote-address 202.1.1.2
#
ipsec proposal PROP1
 esp authentication-algorithm sha2-256
 esp encryption-algorithm aes-256
#
ipsec policy POL1 10 isakmp
 security acl 3000
 ike-peer PEER1
 proposal PROP1
#
interface GigabitEthernet0/0/1
 ip address 202.1.1.1 255.255.255.252
 ipsec policy POL1`,
        },
        {
          type: 'output',
          title: '验证：display ike sa 与 display ipsec sa',
          text: `[AR1] display ike sa
IKE SA information :
    Conn-ID  Peer            VPN   Flag(s)   Phase   RemoteType  RemoteID
    1        202.1.1.2:500   0     RD|ST     v2:1    IP          202.1.1.2

  Number of IKE SA : 1

[AR1] display ipsec sa
  IPSec SA information :
    No IPSec SA found.`,
        },
        {
          type: 'steps',
          items: [
            {
              title: '现象',
              text: 'IKE SA 已建立，但对端业务网段无法访问，display ipsec sa 没有任何条目。',
            },
            {
              title: '可能原因',
              text: '两端 ACL 未镜像，或一端把源目写反，导致第二阶段提议找不到匹配的流量。',
            },
            {
              title: '验证',
              text: '对比两端 ACL 的源目网段与掩码，确认互为镜像；检查 ipsec policy 是否被接口正确引用。',
            },
            {
              title: '修复',
              text: '把两端 ACL 改成严格镜像，确保掩码一致；若存在 NAT，确认 UDP 4500 已放行并启用 NAT-T。',
            },
            {
              title: '复测',
              text: 'display ipsec sa 出现入向与出向 SA，ping 业务地址通，丢包与延迟正常。',
            },
          ],
        },
        {
          type: 'warning',
          title: 'ACL 必须镜像，NAT 场景要放行 4500',
          text: 'IPsec 的 ACL 不是防火墙策略，而是「哪些流量要加密」的选择器，两端必须严格镜像，掩码差一位都可能协商失败。中间经过 NAT 设备时，IKE 会从 UDP 500 切换到 4500 做 NAT 穿越，只放行 500 会导致第一阶段成功、第二阶段失败。另外，预共享密钥区分大小写，复制粘贴时很容易带上多余空格。',
        },
        {
          type: 'tip',
          title: '先看 IKE，再看 IPsec',
          text: '排错顺序固定为：display ike sa 看第一阶段，display ipsec sa 看第二阶段，再看 ACL 与路由。第一阶段不通就查 UDP 500、PSK 与对端地址；第一阶段通了第二阶段不通，优先查 ACL 镜像与提议参数。不要一上来就抓包，先把 SA 状态看清楚。',
        },
        {
          type: 'checklist',
          title: 'IPsec 隧道排查清单',
          items: [
            '两端公网地址是否可达，UDP 500 与 4500 是否放行',
            'IKE 提议的加密、认证、DH 组是否一致',
            '预共享密钥是否完全一致，是否有多余空格',
            '对端 ID 与 remote-address 是否匹配',
            'ACL 是否严格镜像，是否覆盖真实业务流量',
            'IPsec 提议与封装模式是否一致',
            '接口是否正确引用 ipsec policy',
            'NAT 场景是否启用 NAT-T 并放行 4500',
          ],
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm11-l06',
      moduleId: 'm11',
      title: 'HCIE 实验思路与生产变更规范',
      depth: '熟悉',
      minutes: 30,
      summary: '用考试化的时间分配与变更回滚规范，把能力转化为稳定交付。',
      objectives: [
        '按分值规划 HCIE 实验考试的读题、配置、验证与排错时间',
        '说出生产变更前、中、后的关键动作与回滚触发条件',
        '用能力自评清单找出下一阶段的补强方向',
      ],
      keywords: ['HCIE 实验', '时间分配', '变更管理', '回滚', '能力自评', '配置备份'],
      blocks: [
        {
          type: 'paragraph',
          text: 'HCIE-Datacom 实验考试通常持续约 8 小时，考查的不是单个命令，而是在时间压力下完成规划、实施、验证与排错的完整工程能力。很多人失分不是因为不会，而是因为在前半段追求完美、后半段没时间验证，或者改坏配置后没有回退手段。考场与生产现场的共同点是：先设计再动手，先备份再变更，每一步都要有可验证的结果。',
        },
        {
          type: 'analogy',
          title: '像外科手术一样做变更',
          text: '手术前要查体、备血、确认方案，术中只动目标部位、随时监测生命体征，术后观察并准备二次处理。生产变更同样如此：变更前备份与审批，变更中只做计划内的最小改动并逐步验证，变更后观察指标并保留回滚窗口。边开刀边改方案，在任何手术室里都是禁忌。',
        },
        {
          type: 'table',
          title: '8 小时实验考试时间分配参考',
          columns: ['阶段', '建议时长', '关键动作'],
          rows: [
            ['读题与规划', '60 分钟', '标注分值、画拓扑、列地址与 AS 规划、识别隐含依赖'],
            ['基础与 Underlay', '90 分钟', '接口、VLAN、IGP 打通并逐段验证'],
            ['业务配置', '150 分钟', 'BGP、EVPN、策略、安全等按模块推进'],
            ['验证与优化', '60 分钟', '按题目逐条核对，补齐遗漏项'],
            ['排错', '90 分钟', '用分层方法定位，先拿确定的分'],
            ['复查与保存', '30 分钟', '检查未保存配置、清理临时策略、确认提交'],
          ],
        },
        {
          type: 'steps',
          items: [
            {
              title: '先通读，再动笔',
              text: '花时间把题目全部读完，按分值标注优先级，标记前后依赖，避免做到一半发现地址规划冲突。',
            },
            {
              title: '先搭骨架，再填业务',
              text: '优先打通 Underlay 与基础连通性，确认每一段都能 ping 通，再叠加 BGP、EVPN 等业务配置。',
            },
            {
              title: '每完成一题立即验证',
              text: '用题目给出的验收条件自查，通过后再进入下一题，避免错误累积到最后无法定位。',
            },
            {
              title: '排错先易后难',
              text: '先解决能明确复现、验证路径清晰的问题，把不确定的留到后面，保证基础分不丢。',
            },
            {
              title: '最后统一保存与复查',
              text: '留出时间执行 save，检查是否有临时 ACL 或调试命令未清理，确认启动配置正确。',
            },
          ],
        },
        {
          type: 'paragraph',
          text: '生产变更比考试更严格，因为影响的是真实业务。规范的做法是：变更前提交申请并评审，明确影响范围、验证方法与回滚条件；变更窗口内先备份配置与镜像，按最小步骤执行，每步验证后再继续；变更后观察关键指标至少一个业务周期，确认无异常再关闭变更单。任何一步验证失败，立即触发回滚，而不是在现场「再改改看」。',
        },
        {
          type: 'table',
          title: '变更三阶段的关键动作',
          columns: ['阶段', '关键动作', '产出'],
          rows: [
            ['变更前', '申请审批、影响评估、配置备份、回滚预案、双人复核', '变更单、备份文件、回滚步骤'],
            ['变更中', '按脚本逐条执行、每步验证、记录实际命令与回显', '执行记录、验证截图'],
            ['变更后', '观察指标、业务抽检、关闭变更单、归档配置', '验收记录、更新后的基线'],
          ],
        },
        {
          type: 'code',
          title: '备份、变更与回退',
          lang: 'vrp',
          code: `# 变更前：把当前配置保存为独立备份文件
save backup-20261112.cfg

# 变更中：小步执行，每步立即验证
display current-configuration | include bgp
display bgp peer

# 变更失败：把下次启动配置指向备份，重启后回到变更前状态
startup saved-configuration backup-20261112.cfg
display startup

# 确认无误后，再把启动文件切回正式配置并保存
startup saved-configuration vrpcfg.zip
save`,
        },
        {
          type: 'output',
          title: '验证：display startup',
          text: `[Core1] display startup
MainBoard:
  Startup system software:              flash:/ce.cc
  Next startup system software:         flash:/ce.cc
  Startup saved-configuration file:     flash:/vrpcfg.zip
  Next startup saved-configuration file: flash:/backup-20261112.cfg
  Startup license file:                 flash:/license.dat`,
        },
        {
          type: 'warning',
          title: '没有回滚预案的变更不允许上线',
          text: '「改完再看」不是预案。真正的回滚预案要写清触发条件、回滚命令、预计耗时与验证方法，并且备份文件必须确认可用、启动配置指向正确。另一个常见事故是改了配置却没 save，设备重启后配置丢失；或者 save 了却没确认启动文件，回退时找不到正确版本。变更结束前务必用 display startup 核对。',
        },
        {
          type: 'tip',
          title: '把每次排错沉淀成案例',
          text: '做完一个故障，用固定模板记录：现象、影响范围、可能原因、验证命令、根因、修复动作、后续改进。积累二十个案例后，你会发现自己排错不再依赖灵感，而是有一套可复用的模式库。这也是从「会配设备」走向「能扛生产」的关键一步。',
        },
        {
          type: 'checklist',
          title: '能力自评清单',
          items: [
            '能独立完成园区网与数据中心的基础规划与地址设计',
            '能配置并解释 OSPF、IS-IS、BGP 的邻居、选路与策略',
            '能定位 OSPF 邻居、BGP 邻居、VLAN、WLAN、IPsec 五类典型故障',
            '能读懂 display 回显中的状态码、计数与异常字段',
            '能使用 NETCONF、RESTful 或 Telemetry 完成一次自动化任务',
            '能解释 VXLAN 与 EVPN 的转发过程与常见故障点',
            '能在 8 小时内按分值完成一套完整实验并自查',
            '能编写变更方案，包含影响评估、验证方法与回滚步骤',
            '能在压力下坚持「一次只改一个变量」并记录过程',
            '能把自己的排错过程整理成可复用的案例文档',
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
