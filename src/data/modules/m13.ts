import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm13',
  code: 'M13',
  title: '网络运维与故障排除',
  summary:
    '本模块把运维体系与排障方法合成一套可执行流程：先建监控、巡检、备份与工单的日常底座，再沿现象-假设-验证-修复闭环深入 OSPF、BGP、二层、WLAN 与安全五类高频故障，最后用变更、割接与复盘把能力固化为工程流程。',
  stage: 'L3',
  order: 13,
  goals: [
    '建立监控、巡检、备份与工单四位一体的日常运维底座',
    '用分层定位与「现象-假设-验证-修复」闭环收敛任意故障范围',
    '独立定位 OSPF 邻居七状态卡点与 BGP 会话、选路故障',
    '处理 VLAN 环路、STP 震荡、WLAN 上线与安全策略、NAT、IPsec 故障',
    '按方案模板完成变更割接、回滚与故障复盘',
  ],
  keywords: [
    '网络运维',
    '故障排除',
    'OSPF 邻居',
    'BGP 状态',
    'VLAN 环路',
    'STP',
    'WLAN 上线',
    'NAT 回流',
    'IPsec',
    '变更回滚',
  ],
  lessons: [
    {
      id: 'm13-l01',
      moduleId: 'm13',
      title: '网络运维体系：监控、巡检、备份与工单',
      depth: '了解',
      minutes: 22,
      summary: '把监控、巡检、备份与工单四条线搭起来，让故障在爆发前被看见。',
      objectives: [
        '说出监控、巡检、备份、工单各自解决什么问题',
        '用华为 VRP 命令完成一次日常健康检查',
        '判断备份文件是否真的可以回退',
        '建立可追溯的故障与变更记录习惯',
      ],
      keywords: ['监控', '巡检', '配置备份', '工单', '告警', '基线'],
      blocks: [
        {
          type: 'paragraph',
          text: '网络运维不是等电话响了再去救火，而是把「发现、预防、兜底、追溯」四件事做成日常。监控负责在用户报障之前发现异常，巡检负责在隐患积累成故障之前清理掉，备份负责在改坏配置之后还能退回去，工单负责把每一次操作和每一场故障变成可审计、可复用的记录。四者缺一，排障就会退化成依赖某个人的记忆。',
        },
        {
          type: 'paragraph',
          text: '成熟的运维体系还有一个隐含前提：基线。所谓基线，是设备在健康状态下的 CPU、内存、接口错包、邻居数量、路由条数、光功率等指标的常态值。没有基线，监控只能告诉你「当前是多少」，无法告诉你「是否异常」；巡检也只能凭感觉判断，容易漏掉缓慢劣化的隐患。',
        },
        {
          type: 'analogy',
          title: '像小区的物业系统',
          text: '监控是摄像头与消防报警，巡检是保安定时巡逻，备份是每户的备用钥匙和消防通道，工单是报修登记簿。摄像头坏了、巡逻停了、钥匙丢了、记录不写，任何一次漏水都可能从一户人家演变成整栋楼的事故。物业的价值不在于出事时跑得多快，而在于让事故少发生、发生后有据可查。',
        },
        {
          type: 'table',
          title: '运维四支柱',
          columns: ['支柱', '解决的问题', '关键动作', '常用验证'],
          rows: [
            ['监控', '故障发现慢、靠用户报障', '采集 CPU、内存、接口、邻居、路由与告警，设置阈值', 'display alarm active'],
            ['巡检', '隐患积累、劣化不可见', '每日看错包与光功率，每周看日志、许可证与配置差异', 'display interface brief、display logbuffer'],
            ['备份', '改坏了回不去', '变更前后保存配置，异地存放，确认启动文件指向', 'save、display startup'],
            ['工单', '责任与过程不可追溯', '记录时间、影响面、操作、验证结果与回滚动作', '工单系统与变更单'],
          ],
        },
        {
          type: 'steps',
          title: '日常运维闭环',
          items: [
            { title: '采集', text: '按固定周期采集设备健康指标与告警，统一时间源，避免多台设备日志时间对不上。' },
            { title: '比对基线', text: '把当前值与历史基线、同角色设备对比，找出偏离而不是只看绝对值。' },
            { title: '分级处置', text: '按影响面分级：影响业务的立即处理，隐患类排入变更窗口，噪声类优化阈值。' },
            { title: '记录归档', text: '把处置过程写进工单，更新基线，形成下一次巡检的参照。' },
          ],
        },
        {
          type: 'code',
          title: '一次例行健康检查',
          lang: 'vrp',
          code: `# 设备整体负载与告警
display cpu-usage
display memory-usage
display alarm active

# 接口与错包
display interface brief
display interface GigabitEthernet0/0/2

# 日志与配置基线
display logbuffer
display current-configuration | include sysname

# 变更前保存独立备份，并确认下次启动文件
save backup-20261112.cfg
display startup`,
        },
        {
          type: 'output',
          title: '巡检回显中的三类信号',
          text: `<Core1> display interface brief
PHY: Physical  *down: administratively down
Interface              PHY   Protocol  InUti OutUti   inErrors  outErrors
GigabitEthernet0/0/1   up    up          12%    8%          0         0
GigabitEthernet0/0/2   down  down         0%    0%      18432         0
GigabitEthernet0/0/3   up    up           1%    1%          0         0
Vlanif10               up    up           -      -          0         0

<Core1> display logbuffer
Nov 12 2026 09:05:18 Core1 %%01IFNET/4/LINK_STATE(l): The line protocol on
  the interface GigabitEthernet0/0/2 has entered the DOWN state.
Nov 12 2026 09:12:41 Core1 %%01SHELL/5/CMDRECORD(s): Command is display ospf peer`,
        },
        {
          type: 'list',
          title: '这段回显给出的判断',
          items: [
            'GigabitEthernet0/0/2 物理层 down，先查光纤、模块与对端端口，而不是先查路由',
            'inErrors 持续增长说明链路质量或双工协商有问题，状态 up 也要处理',
            '日志时间线要和工单时间对齐，才能判断故障前后发生了什么',
            '巡检只是发现线索，真正的根因还要按分层顺序继续验证',
          ],
        },
        {
          type: 'warning',
          title: '只存配置不等于有备份',
          text: '设备上 save 只是把当前配置写入启动文件，如果这个文件本身被改坏，重启后依然是坏的。真正的备份要满足三个条件：独立命名、异地或网管侧留存、确认可回退。每次变更前用 display startup 确认下次启动文件指向正确，并保留至少一份上一个稳定版本的配置。',
        },
        {
          type: 'tip',
          title: '巡检看趋势，不看单点',
          text: '接口错包从 0 涨到 100 可能是偶发，但从 100 持续涨到一万就一定是问题。光功率、CPU、内存、路由条数同理，趋势比瞬时值更能说明劣化。把每周同一时刻的数据存下来做对比，比临时抓一次现场有效得多。',
        },
        {
          type: 'checklist',
          title: '值班交接必须留下的内容',
          items: [
            '当前未闭环的告警与工单，标注影响范围与临时规避手段',
            '最近 24 小时的配置变更与执行人',
            '关键设备与链路的冗余状态，是否存在单点',
            '备份文件位置与最近一次可用性验证时间',
            '下一次计划内变更的窗口与回滚预案',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm13-l02',
      moduleId: 'm13',
      title: '排障方法论：分层定位与「现象-假设-验证-修复」闭环',
      depth: '熟悉',
      minutes: 26,
      summary: '先分层切开现象，再用四步闭环收敛根因，避免没有顺序就改配置。',
      objectives: [
        '把任意故障映射到 OSI 的某一层并说出验证手段',
        '按现象、假设、验证、修复四步完成一次闭环排查',
        '用基线对比与二分法减少无效尝试',
      ],
      keywords: ['分层定位', '闭环', '假设验证', '基线', '二分法'],
      blocks: [
        {
          type: 'paragraph',
          text: '排错最大的浪费不是不会命令，而是没有顺序。看到「业务不通」就登录设备改配置，很容易在无关的层次反复折腾，甚至把原本正常的配置改坏。分层定位的核心是把现象按 OSI 逐层切开：物理层看链路与光模块，数据链路层看 VLAN、MAC 与 STP，网络层看地址、路由与 ACL，传输层看端口与连接，应用层看服务与解析。每一层只回答「这一层是否正常」，确认正常再向上走。',
        },
        {
          type: 'paragraph',
          text: '分层解决了「从哪里查」，闭环解决了「怎么收尾」。一次合格的排错必须能写成闭环：现象是什么、提出了哪几个假设、用哪条命令验证、排除了哪些、剩下哪个根因、做了什么修复、修复后如何确认。缺少任何一环，问题都可能在换个时间、换台设备后再次出现。',
        },
        {
          type: 'analogy',
          title: '像医生问诊，而不是直接开刀',
          text: '医生不会因为病人说「不舒服」就立刻手术，而是先量体温、验血、做影像，一层层排除。网络排错也一样：先确认链路有没有通，再看二层与三层是否正常，最后才动配置。同时要问「什么时候开始的、之前改过什么」，这就是病史，往往比任何命令都更快指向根因。',
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
          title: '四步闭环',
          items: [
            { title: '现象', text: '用一句话写清谁、从哪里、访问什么、怎么不通，记录发生时间与最近的变更。' },
            { title: '假设', text: '基于现象列出 2 到 3 个可验证的假设，而不是罗列所有可能原因。' },
            { title: '验证', text: '为每个假设选一条能推翻它的命令，执行并记录结果，逐条排除。' },
            { title: '修复', text: '做最小改动修复，立即用同一组命令复测，并观察一段时间确认没有引入新问题。' },
          ],
        },
        {
          type: 'code',
          title: '自下而上的分层验证',
          lang: 'vrp',
          code: `# 物理层
display interface brief
display transceiver diagnosis interface GigabitEthernet0/0/1

# 数据链路层
display port vlan GigabitEthernet0/0/1
display mac-address 00e0-fc12-3456
display stp brief

# 网络层
display ip interface brief
display ip routing-table 192.168.20.0
display acl 3000

# 传输与应用
ping -a 192.168.10.1 192.168.20.10
tracert -a 192.168.10.1 192.168.20.10`,
        },
        {
          type: 'output',
          title: '验证：连通性与路由同时看',
          text: `<AR1> ping -a 192.168.10.1 192.168.20.10
PING 192.168.20.10: 56 data bytes, press CTRL_C to break
    Reply from 192.168.20.10: bytes=56 Sequence=1 ttl=253 time=3 ms
    Reply from 192.168.20.10: bytes=56 Sequence=2 ttl=253 time=2 ms
    Reply from 192.168.20.10: bytes=56 Sequence=3 ttl=253 time=4 ms

--- 192.168.20.10 ping statistics ---
    3 packet(s) transmitted
    3 packet(s) received
    0.00% packet loss
    round-trip min/avg/max = 2/3/4 ms

<AR1> display ip routing-table 192.168.20.0
Route Flags: R - relay, D - download to fib
------------------------------------------------------------------------------
Destination/Mask    Proto   Pre  Cost      Flags NextHop         Interface
     192.168.20.0/24  OSPF    10   3           D   10.0.12.2       GigabitEthernet0/0/1`,
        },
        {
          type: 'paragraph',
          text: '回显显示小包能通、路由存在且下一跳正确，说明物理层、二层与三层基本正常，问题范围可以收缩到传输层端口、应用服务或特定大小的报文。这时继续用大包 ping 与端口测试验证，而不是回头再查路由。分层排错的价值就在于每一步都缩小范围，而不是把所有命令重敲一遍。',
        },
        {
          type: 'warning',
          title: '不要一次改多个变量',
          text: '同时改 VLAN、改路由、重启接口，即使业务恢复也无法知道是哪一步起了作用，下次再犯仍然不会。每次只改一个变量，改完立刻验证并记录。生产环境更不要用重启或 reset 来「试试看」，一次重启可能让邻居全断、业务大面积抖动。',
        },
        {
          type: 'tip',
          title: '先找基线，再谈差异',
          text: '同型号、同角色的设备配置通常高度相似。把故障设备与正常设备的 display current-configuration 做对比，差异点往往就是根因。没有基线时，至少对比变更前的备份，或者对比同 VLAN、同角色的另一台设备。',
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
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm13-l03',
      moduleId: 'm13',
      title: 'OSPF 邻居建立失败：卡在哪个状态、怎么定位',
      depth: '精通',
      minutes: 30,
      summary: '邻居卡在哪个状态，就查哪一层；七状态对应七类根因与验证命令。',
      objectives: [
        '按顺序复述 OSPF 七个邻居状态及每个状态的触发条件',
        '根据卡住的状态反推典型根因并选出验证命令',
        '用 MTU 对比与 mtu-ignore 验证 ExStart 卡死',
        '按四先四后的顺序完成一次邻居故障闭环',
      ],
      keywords: ['OSPF 邻居', '七状态', 'ExStart', 'MTU', 'Router ID 冲突', 'display ospf error'],
      blocks: [
        {
          type: 'paragraph',
          text: 'OSPF 邻居建立失败在现网出现频率极高，但它的表现非常有规律：邻居不会凭空消失，而是停在状态机的某一步。Step 越靠后，说明底层越正常。因此排错的第一步不是敲配置，而是看 display ospf peer 里那个 State 字段，把「卡在哪」变成「查什么」。',
        },
        {
          type: 'paragraph',
          text: '七个状态对应七段握手：Down 是没收到 Hello，Init 是只收到对方的 Hello 而对方没看到我，2-Way 是双方都看到了对方，ExStart 是协商主从，Exchange 是交换数据库摘要，Loading 是补齐缺失明细，Full 是数据库完全同步。任何一步参数对不上，就会停在那一步或退回去重来。',
        },
        {
          type: 'table',
          title: '七个邻居状态与卡住原因',
          columns: ['状态', '含义', '卡住的典型原因'],
          rows: [
            ['Down', '没有收到任何合法 Hello', '接口 down、network 未宣告、网段或掩码不一致、Hello/Dead 不一致、ACL 拦截协议号 89'],
            ['Init', '收到对方 Hello，但对方邻居列表里没有我', '单向链路、认证不一致、区域 ID 不一致、Router ID 冲突'],
            ['2-Way', '双方 Hello 都看到了对方', 'DROther 之间属正常；优先级全 0、网络类型不符才是故障'],
            ['ExStart', '用 DD 协商主从关系', 'MTU 不一致（最高频）、Router ID 冲突、DD 被 ACL 或安全设备过滤'],
            ['Exchange', '互发 DD 摘要', '链路丢包、CPU 过高、MTU 偏小导致大 DD 被丢'],
            ['Loading', '用 LSR 请求缺失的 LSA 明细', 'LSR 或 LSU 丢失、对端 LSDB 异常、内存与 CPU 资源不足'],
            ['Full', 'LSDB 同步完成，邻接正常', '邻居没问题，故障在区域、汇总、过滤或外部引入'],
          ],
        },
        {
          type: 'analogy',
          title: '两个人对暗号，卡在第几句就查哪本暗号本',
          text: 'Down 是你喊了对方名字但对方没听见；Init 是对方听见了却不回应，说明话筒只有单向；2-Way 是互相听见了，但还没决定谁先说话；ExStart 是开始核对暗号本，结果发现两人拿的版本不同（MTU 不一致）；Exchange 是暗号对上了但信封大小不一样，装不下就中断；Loading 是清单上列了但包裹一直没送到；Full 是手续全办完，接下来该谈正事（路由）了。',
        },
        {
          type: 'interactive',
          key: 'ospf-troubleshoot',
          caption: '按状态逐个查看现象、可能原因、验证命令与处理动作；ExStart 是现网最高频的卡点，先看 MTU。',
        },
        {
          type: 'interactive',
          key: 'ospf-fsm',
          caption: '再走一遍状态迁移，注意 ExStart 失败时会退回 Init，这也是很多人误判为认证问题的原因。',
        },
        {
          type: 'table',
          title: '每个卡点的定位命令与修复动作',
          columns: ['卡点', '优先验证命令', '修复动作'],
          rows: [
            ['Down', 'display ospf interface、display ip interface brief', '先把接口与地址修好，确认 network 覆盖该接口'],
            ['Init', 'display ospf error、display acl 3000、display ospf brief', '统一认证与区域号，排查单向光路与 ACL'],
            ['2-Way', 'display ospf peer、display ospf interface', '确认是否 DROther；必要时改 p2p 或调整优先级'],
            ['ExStart', 'display interface | include MTU、display ospf error', '统一 MTU，临时可用 ospf mtu-ignore 验证'],
            ['Exchange', 'display cpu-usage、分段 ping、display interface', '处理丢包与高 CPU，统一 MTU，换端口或光纤'],
            ['Loading', 'display ospf lsdb、display ospf error、display memory-usage', '查 LSR/LSU 丢包，资源不足时先降负载再评估重启进程'],
            ['Full', 'display ospf lsdb、display ospf routing、display ospf abr-asbr', '查区域类型、汇总、filter-policy 与引入配置'],
          ],
        },
        {
          type: 'code',
          title: 'ExStart 卡死的取证与验证',
          lang: 'vrp',
          code: `# 1. 看邻居状态与对端报告的 MTU
display ospf peer

# 2. 对比本端接口 MTU
display interface GigabitEthernet0/0/1 | include MTU

# 3. 看错误计数，Bad MTU 持续增长即可确认
display ospf error

# 4. 临时验证：忽略 MTU 检查，若立刻 Full 则确认是 MTU 问题
interface GigabitEthernet0/0/1
 ospf mtu-ignore
 quit

# 5. 正确做法仍是把两端 MTU 改成一致，然后去掉 mtu-ignore
interface GigabitEthernet0/0/1
 mtu 1400
 undo ospf mtu-ignore
 quit`,
        },
        {
          type: 'output',
          title: '真实回显：一端 1500、一端 1400',
          text: `<AR1> display ospf peer
OSPF Process 1 with Router ID 1.1.1.1
 Neighbors

 Area 0.0.0.0 interface 10.0.12.1(GigabitEthernet0/0/1)'s neighbors
 Router ID: 2.2.2.2        Address: 10.0.12.2
   State: ExStart  Mode: Nbr is Master  Priority: 1
   DR: 10.0.12.1  BDR: 10.0.12.2  MTU: 1400
   Dead timer due in 00:00:33
   Neighbor is up for 00:01:12

<AR1> display interface GigabitEthernet0/0/1 | include MTU
    The Maximum Transmit Unit is 1500

<AR1> display ospf error
OSPF Process 1 with Router ID 1.1.1.1
                 OSPF error statistics

 Interface: GigabitEthernet0/0/1 (10.0.12.1)
   DD packet errors:
     Bad MTU                      : 216`,
        },
        {
          type: 'list',
          title: '回显怎么读',
          items: [
            '邻居报告本端 MTU 为 1400，而本端接口实际是 1500，DD 阶段必然无法协商一致',
            'State 停在 ExStart、Mode 已经是 Master，说明主从选举尚未完成，不是认证问题',
            'Bad MTU 计数持续增长，是 MTU 不一致最直接的证据，比反复猜配置快得多',
            '修复后应看到 State 变为 Full，Bad MTU 不再增长，且邻居不再反复掉回 Init',
          ],
        },
        {
          type: 'warning',
          title: 'mtu-ignore 只是止血，不是修复',
          text: 'ospf mtu-ignore 让邻居跳过 DD 报文中的 MTU 检查，能立刻让状态变 Full，但两端真实 MTU 依然不一致。差 100 字节时，小包能通、大包会被丢弃，表现为 ping 正常但网页打不开、TCP 建连卡住。正确顺序是先把两端 MTU 改成一致，再决定是否需要该命令作为过渡；隧道与 VXLAN 场景还要把封装开销算进去。',
        },
        {
          type: 'tip',
          title: '四先四后的排障口诀',
          text: '先物理后协议：接口不 up，任何 OSPF 配置都是空谈。先二层后三层：VLAN 没放通、掩码不一致，Hello 根本到不了。先邻居后 LSA：邻居没到 Full，查 LSDB 没有意义。先 LSDB 后路由表：LSDB 里没有的 LSA，路由表不可能算出来。按这四步走，绝大多数邻居故障在十分钟内能定位到层。',
        },
        {
          type: 'steps',
          title: '决策顺序：先用口诀缩小范围',
          items: [
            { title: '先物理后协议', text: 'display interface brief 确认接口与协议状态，再看 display ospf interface 是否使能。' },
            { title: '先二层后三层', text: '同网段两端能否 ping 通，掩码、VLAN、PVID 是否一致。' },
            { title: '先邻居后 LSA', text: 'display ospf peer 看状态，未到 Full 时不进入 LSDB 排查。' },
            { title: '先 LSDB 后路由表', text: '确认 LSA 是否存在、AdvRouter 是否正确，再看 display ospf routing。' },
          ],
        },
        {
          type: 'steps',
          title: '排障闭环：从卡点到修复',
          items: [
            { title: '现象', text: '两端接口 up、直连可 ping 通，但 display ospf peer 长期停在 ExStart。' },
            { title: '假设', text: '最可能是两端 MTU 不一致；其次怀疑 Router ID 冲突或 DD 被安全设备过滤。' },
            { title: '验证', text: 'display ospf peer 看到对端 MTU 1400，本端 1500，display ospf error 中 Bad MTU 持续增长。' },
            { title: '修复', text: '把两端接口 MTU 统一为 1400，删除 mtu-ignore 等临时配置。' },
            { title: '回归', text: '邻居在 Dead 时间内到 Full，LSDB 与路由恢复，观察一个周期不再抖动。' },
          ],
        },
        {
          type: 'warning',
          title: 'Full 但没路由，别再查邻居',
          text: '邻居已经 Full 说明 Hello、DD、LSR、LSU 全部走通，问题一定在 LSA 的产生、洪泛、过滤或 SPF 计算上。此时继续查认证、MTU、定时器只会浪费时间。正确动作是 display ospf lsdb 看预期 LSA 是否存在，再用 display ospf routing 看是否被计算，最后看 display ip routing-table 是否被其他协议优选。',
        },
        {
          type: 'checklist',
          title: 'OSPF 邻居排查清单',
          items: [
            '接口物理与协议状态是否都 up，地址与掩码是否同网段',
            '接口是否被 silent-interface 抑制，network 是否覆盖该接口',
            '两端区域 ID、网络类型、Hello 与 Dead 定时器是否一致',
            '认证模式与密钥是否一致，是否存在大小写或空格差异',
            '两端接口 MTU 是否一致，Router ID 是否全局唯一',
            'ACL 与安全设备是否放行 IP 协议号 89 与组播 224.0.0.5',
            '修复后是否 Full，Bad MTU、Bad area id 等计数是否停止增长',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm13-l04',
      moduleId: 'm13',
      title: 'OSPF 路由不通与不优：LSDB、区域与汇总排查',
      depth: '精通',
      minutes: 32,
      summary: '邻居 Full 只是开始，按 LSA 产生、洪泛、过滤、计算四段查路由。',
      objectives: [
        '用 LSDB 判断路由缺失是没产生、没洪泛还是被过滤',
        '定位区域类型、虚连接与汇总导致的跨区域不通',
        '区分「没路由」与「有路由但不优」两类问题',
      ],
      keywords: ['LSDB', 'Type 3', 'abr-asbr', '虚连接', 'filter-policy', '路由不优'],
      blocks: [
        {
          type: 'paragraph',
          text: '邻居到达 Full 只说明两台设备能交换 LSA，并不保证路由能学得到、学得对。一条路由要出现在设备上，必须依次满足四件事：LSA 由正确的设备产生、洪泛到了本区域、没有被区域类型或过滤策略拦住、SPF 计算结果被路由表优选。这四个环节对应四组命令，按顺序查比全面撒网有效得多。',
        },
        {
          type: 'paragraph',
          text: '先区分两类现象：完全学不到某条路由，和有路由但走的路不对。前者问题在 LSA 的产生与传递，后者问题在开销、汇总或外部路由类型。把现象归类之后，再决定看 display ospf lsdb 还是 display ospf routing，避免在没有 LSA 的情况下反复研究选路。',
        },
        {
          type: 'analogy',
          title: '快递没到，先查发货还是查分拣',
          text: 'LSA 像一件快递：发货方（产生 LSA 的路由器）有没有发货、分拨中心（ABR）有没有转运、小区门卫（区域类型与过滤）有没有拦下、最后快递柜（路由表）有没有格口，是四个不同的环节。查不到件时先问单号有没有生成，而不是直接去快递柜翻。',
        },
        {
          type: 'table',
          title: '四类现象与检查点',
          columns: ['现象', '最可能环节', '优先命令'],
          rows: [
            ['完全没学到某网段', '源路由器没有产生 LSA，或 network 未宣告', 'display ospf lsdb 与源端 display ospf interface'],
            ['其他区域学不到', 'ABR 未产生 Type 3，或区域未挂到 Area 0', 'display ospf lsdb、display ospf brief'],
            ['学不到但能看到 LSA', 'filter-policy、特殊区域、汇总抑制', 'display current-configuration | include filter'],
            ['有路由但不优', '接口 cost、汇总后 metric、外部路由 Type 1/2', 'display ospf routing、display ip routing-table'],
          ],
        },
        {
          type: 'code',
          title: '按 LSA、区域、路由三段取证',
          lang: 'vrp',
          code: `# 1. LSDB 里有没有预期 LSA，AdvRouter 是谁
display ospf lsdb
display ospf lsdb summary 192.168.20.0

# 2. 区域与 ABR/ASBR 角色
display ospf brief
display ospf abr-asbr

# 3. 路由是否被计算、类型与开销
display ospf routing
display ip routing-table 192.168.20.0

# 4. 是否被过滤或汇总
display current-configuration | include filter
display current-configuration | include summary`,
        },
        {
          type: 'output',
          title: '验证：display ospf abr-asbr 与 routing',
          text: `<R2> display ospf abr-asbr
OSPF Process 1 with Router ID 2.2.2.2
                 Routing Table to ABR and ASBR

 Type      Destination     Area        Cost  Nexthop         AdvRouter
 Intra-area 1.1.1.1        0.0.0.0     1     10.0.12.1       1.1.1.1
 Inter-area 3.3.3.3        0.0.0.1     2     10.0.23.2       3.3.3.3

<R2> display ospf routing
OSPF Process 1 with Router ID 2.2.2.2
 Routing Tables

 Routing for Network
 Destination        Cost  Type       NextHop         AdvRouter       Area
 10.0.12.0/24       1     Transit    10.0.12.2       2.2.2.2         0.0.0.0
 192.168.20.0/24    3     Stub       10.0.23.2       2.2.2.2         0.0.0.1

 Total Nets: 2
 Intra Area: 2  Inter Area: 0  ASE: 0  NSSA: 0`,
        },
        {
          type: 'interactive',
          key: 'ospf-flooding',
          caption: '观察 Type 1 与 Type 3 的转换过程：ABR 重新生成摘要，AdvRouter 变成 ABR 自己，这就是跨区域路由的来源。',
        },
        {
          type: 'paragraph',
          text: '特殊区域是跨区域路由缺失的高频原因。STUB 与 Totally STUB 会过滤 Type 5，Totally STUB 连 Type 3 明细都过滤，只留一条默认路由；NSSA 禁止 Type 5 进入，用 Type 7 在本区域内传递。如果区域类型配置不一致，邻居可能在 Init 或 2-Way 就建不起来；如果配置一致但默认路由没有下发，区域内会出现「有邻居、有明细却无出口」的现象。',
        },
        {
          type: 'warning',
          title: 'filter-policy import 不改变 LSDB',
          text: 'filter-policy import 只控制哪些 OSPF 路由能装进本机路由表，LSDB 里的 LSA 一条都不会少。因此看到「LSDB 有 Type 3、路由表却没有」时，要优先怀疑 import 方向的过滤，而不是怀疑对端没发。反过来，filter-policy export 影响的是本机产生并通告出去的路由，两者作用点完全不同。',
        },
        {
          type: 'tip',
          title: '虚连接与区域合规要一起看',
          text: '非骨干区域必须直连或逻辑连接到 Area 0。两个非骨干区域直接相连时，双方不会交换 Type 3，表现为邻居 Full、路由互不可见。此时要么把链路划入 Area 0，要么在两端 ABR 上配 vlink-peer 建立虚连接，并确认传输区域不是 STUB 或 NSSA。display ospf vlink 能看到虚连接是否 Full。',
        },
        {
          type: 'steps',
          title: '排障闭环：跨区域路由缺失',
          items: [
            { title: '现象', text: '分支区域两台路由器邻居 Full，但学不到总部 192.168.20.0/24，其他区域正常。' },
            { title: '假设', text: 'ABR 未产生 Type 3；或该区域未正确挂到 Area 0；或 filter-policy 拦了该网段。' },
            { title: '验证', text: 'display ospf lsdb 中找不到 Sum-Net 192.168.20.0，且 ABR 的 display ospf brief 显示区域归属异常。' },
            { title: '修复', text: '修正 ABR 的区域归属或补一条 Area 0 链路，必要时用 vlink-peer 恢复逻辑连接。' },
            { title: '回归', text: '两端 LSDB 出现 AdvRouter 为 ABR 的 Type 3，display ospf routing 出现 Inter-area 路由并转发正常。' },
          ],
        },
        {
          type: 'table',
          title: '路由不优的三个常见原因',
          columns: ['原因', '表现', '处置'],
          rows: [
            ['接口 cost 不合理', '明明有更短路径却走了远路', 'display ospf interface 看 Cost，按带宽参考值统一调整'],
            ['汇总后 metric 变化', '明细路径正常，汇总后绕行', '调整 abr-summary 的 cost 参数或改为不汇总'],
            ['外部路由 Type 2', '内部开销不计入，选路与预期相反', '改为 import-route type 1，让内部开销参与比较'],
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm13-l05',
      moduleId: 'm13',
      title: 'BGP 邻居与路由故障：Idle、Active、OpenSent 与选路不生效',
      depth: '精通',
      minutes: 32,
      summary: '会话故障看 TCP 与参数，路由故障看宣告与属性，两段分开查。',
      objectives: [
        '读懂 Idle、Active、OpenSent、OpenConfirm 的实际含义',
        '按可达性、端口、参数、策略顺序定位建邻失败',
        '解释 network 未宣告与属性不生效导致的选路问题',
      ],
      keywords: ['BGP 状态', 'TCP 179', 'update-source', 'ebgp-max-hop', 'network 宣告', '选路属性'],
      blocks: [
        {
          type: 'paragraph',
          text: 'BGP 故障分成两段，必须先分清：会话没到 Established，和会话正常但路由不对。前者是 TCP 179 与参数协商问题，后者是宣告、过滤与选路属性问题。把这两段混在一起查，就会出现「邻居明明是 Established，却一直在查 ACL」这种无效动作。',
        },
        {
          type: 'table',
          title: 'BGP 邻居状态的含义',
          columns: ['状态', '含义', '卡在这里说明什么'],
          rows: [
            ['Idle', '初始状态，尚未发起连接', '路由不可达、未配置 peer、或刚被 reset'],
            ['Connect', '正在建立 TCP 连接', 'SYN 已发出，等待对端响应'],
            ['Active', 'TCP 连接失败，等待重试', '三层不可达、179 被拦、更新源或 TTL 不对'],
            ['OpenSent', '已发出 Open，等待对端 Open', '对端 AS 号、Router ID、认证或能力不匹配被拒绝'],
            ['OpenConfirm', '收到 Open，等待 Keepalive', 'Hold Time 不一致或 Keepalive 丢失'],
            ['Established', '会话建立，开始交换路由', '此时故障一定在宣告、策略或选路'],
          ],
        },
        {
          type: 'analogy',
          title: 'Active 是电话没拨通，不是已激活',
          text: 'Idle 是还没拿起话筒；Connect 是正在拨号；Active 是拨了但没接通，正在等重拨；OpenSent 是接通了、你说了自己的身份，等对方报身份；OpenConfirm 是身份对上了，等对方确认在线；Established 才是真正开始谈业务。看到 Active 就去改路由策略，相当于电话还没通就开始谈合同。',
        },
        {
          type: 'table',
          title: '建邻失败与选路不生效的原因对照',
          columns: ['现象', '常见原因', '验证命令'],
          rows: [
            ['长期 Active', 'TCP 179 不可达、ACL 或防火墙只放行 ICMP', 'display tcp status、display acl 3000'],
            ['建立后立即断开', 'AS 号错、认证不一致、Router ID 冲突', 'display bgp peer verbose 的 Last down reason'],
            ['IBGP 用环回口建不起来', '未配 connect-interface（更新源）或环回口无 IGP 路由', 'display current-configuration configuration bgp'],
            ['EBGP 非直连失败', 'TTL 只有 1，未配 ebgp-max-hop', 'display bgp peer verbose'],
            ['Established 但学不到路由', 'network 未宣告、掩码不精确、聚合抑制', 'display bgp routing-table、display bgp peer'],
            ['有路由但不选它', 'Local-Preference、MED、AS-Path、next-hop 不可达', 'display bgp routing-table 10.0.0.0'],
            ['反射器客户学不到', '未配 reflect-client 或簇 ID 冲突', 'display bgp routing-table、display current-configuration'],
          ],
        },
        {
          type: 'code',
          title: '先通、再连、后协商',
          lang: 'vrp',
          code: `# 1. 三层是否可达，回程是否存在
ping -a 10.0.12.1 10.0.12.2
tracert -a 10.0.12.1 10.0.12.2

# 2. 邻居状态与最后断开原因
display bgp peer
display bgp peer 10.0.12.2 verbose

# 3. TCP 179 是否建立，是否被 ACL 拦
display tcp status
display acl 3000

# 4. 核对两端关键配置
display current-configuration configuration bgp

# 5. 会话正常后，再看宣告与最优路由
display bgp routing-table
display bgp routing-table 192.168.20.0`,
        },
        {
          type: 'output',
          title: '验证：display bgp peer 与 verbose',
          text: `<AR1> display bgp peer
BGP local router ID : 1.1.1.1
 Local AS number : 65001
 Total number of peers : 2          Peers in established state : 1

  Peer            V          AS  MsgRcvd  MsgSent  OutQ  Up/Down       State PrefRcv
  10.0.12.2       4       65002      128      130     0 00:12:31 Established    12
  10.0.13.2       4       65003        0        0     0 00:00:00       Active     0

<AR1> display bgp peer 10.0.13.2 verbose
BGP Peer is 10.0.13.2,  remote AS 65003
         Type: EBGP link
BGP version 4, Remote router ID 0.0.0.0
BGP current state: Active
BGP current event: ConnectRetry
BGP last state: Connect
Port: Local - 51234          Remote - 179
Last down reason: TCP connection failed`,
        },
        {
          type: 'interactive',
          key: 'bgp-fsm',
          caption: '点击状态迁移，重点区分 Active 与 OpenSent：前者连 TCP 都没通，后者 TCP 已通但 Open 协商失败。',
        },
        {
          type: 'paragraph',
          text: '会话到 Established 之后，路由仍然可能学不到。华为设备上 network 命令要求路由表中存在与掩码完全一致的路由，写 network 192.168.20.0 255.255.255.0 时，路由表里若是 192.168.20.0/25，就不会被宣告。另一种常见情况是汇总后明细被抑制，或者 route-policy 把前缀过滤掉。排查时先看本机是否产生该 BGP 路由，再看对端是否收到。',
        },
        {
          type: 'interactive',
          key: 'bgp-bestpath',
          caption: '逐项比较选路属性：Preferred Value、Local-Preference、AS-Path、Origin、MED，理解为什么改了属性却不生效。',
        },
        {
          type: 'warning',
          title: '属性不生效，先看作用范围',
          text: 'Local-Preference 只在 IBGP 内传递，传给 EBGP 邻居前会被清掉；MED 默认只在相邻 AS 之间比较，且不传给第三个 AS；AS-Path 越长越不优。给 EBGP 邻居设 Local-Preference 当然看不到效果。另一类隐形问题是 next-hop 不可达：IBGP 学到的路由下一跳仍是外部地址，若本机没有到它的 IGP 路由，路由不会优选，需要 next-hop-local。',
        },
        {
          type: 'tip',
          title: '路由反射器故障看两点',
          text: 'RR 场景下客户学不到路由，先确认 RR 上是否对客户配置了 reflect-client，再确认 Cluster ID 是否冲突、客户是否真的把路由发给了 RR。display bgp routing-table 中若能看到路由但未优选，问题在选路；若根本没有该前缀，问题在宣告与反射关系。',
        },
        {
          type: 'steps',
          title: '排障闭环：会话正常但前缀缺失',
          items: [
            { title: '现象', text: '与对端 Established 已超过十分钟，但对端前缀一条都没学到。' },
            { title: '假设', text: '本端未宣告、掩码不匹配、被 route-policy 过滤，或对端未把路由发过来。' },
            { title: '验证', text: '本端 display bgp routing-table 无该前缀，display ip routing-table 有明细，说明宣告环节有问题。' },
            { title: '修复', text: '按精确掩码补 network 宣告，或在 ipv4-family unicast 下调整 import-route 与策略。' },
            { title: '回归', text: '本端出现 LocPriv 标记的本地路由，对端 PrefRcv 增长，业务侧路由可达。' },
          ],
        },
        {
          type: 'checklist',
          title: 'BGP 故障排查清单',
          items: [
            '邻居地址是否可达，回程路由是否存在',
            'TCP 179 是否监听，ACL 与防火墙是否双向放行',
            '更新源是否与对端配置的邻居地址一致，环回口是否有 IGP 路由',
            'EBGP 跨设备时 ebgp-max-hop 是否足够',
            '两端 AS 号、Router ID、认证、Hold Time 是否匹配',
            'network 是否精确匹配路由表中的掩码',
            '选路属性的作用范围是否正确，next-hop 是否可达',
            'RR 场景下 reflect-client 与 Cluster ID 是否正确',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm13-l06',
      moduleId: 'm13',
      title: '二层故障：VLAN 不通、环路风暴与 STP 震荡',
      depth: '精通',
      minutes: 30,
      summary: 'VLAN 看放通与 PVID，环路看广播计数，STP 看根桥与端口角色。',
      objectives: [
        '按 VLAN 创建、PVID、Trunk 与 Hybrid 顺序定位 VLAN 不通',
        '用广播计数与 STP 变化次数识别环路与风暴',
        '判断根桥位置异常并配置 BPDU 保护',
      ],
      keywords: ['VLAN', 'Trunk', 'PVID', '广播风暴', 'STP 根桥', 'BPDU 保护'],
      blocks: [
        {
          type: 'paragraph',
          text: '二层故障的表现往往不是彻底不通，而是「时通时不通、越来越慢、整层楼一起卡」。原因集中在三件事：VLAN 没有正确放通、存在环路导致广播风暴、STP 拓扑反复震荡。三者的现象很像，但取证方式不同：VLAN 看端口配置，环路看广播与组播计数，STP 看根桥与拓扑变化次数。',
        },
        {
          type: 'paragraph',
          text: '先把 VLAN 这条线走通：VLAN 是否在所有经过的设备上创建、Access 口 PVID 是否与终端规划一致、Trunk 允许列表是否包含该 VLAN、Hybrid 口的 tagged 与 untagged 是否写反。很多故障不是没配，而是配了但没生效，例如 Trunk 默认只放行 VLAN 1，新建的业务 VLAN 没加进允许列表。',
        },
        {
          type: 'analogy',
          title: 'VLAN 像楼栋门禁，环路像所有人同时喊话',
          text: 'Access 口是单元门，只认一张卡（PVID）；Trunk 是楼栋之间的主通道，保安手里有放行名单。VLAN 没创建相当于楼不存在，PVID 配错相当于把住户分到隔壁楼，允许列表漏配相当于主通道不放行。至于环路，就像楼道里所有人同时大声喊话，声音互相叠加，最后谁也听不清，CPU 也被吵到 100%。',
        },
        {
          type: 'table',
          title: '二层故障排查点',
          columns: ['检查点', '典型问题', '验证命令'],
          rows: [
            ['VLAN 创建', '只在部分设备创建，端到端不一致', 'display vlan'],
            ['链路类型与 PVID', '该 Access 配成 Trunk，或 PVID 与终端不符', 'display port vlan'],
            ['Trunk 允许列表', '未放行业务 VLAN，默认只放行 VLAN 1', 'display port vlan GigabitEthernet0/0/1'],
            ['Hybrid 标签', 'tagged 与 untagged 写反，收发不对称', 'display port vlan'],
            ['环路与风暴', '广播、组播计数暴涨，CPU 升高', 'display interface GigabitEthernet0/0/1'],
            ['STP 角色', '端口被阻塞、根桥位置异常', 'display stp brief、display stp root'],
            ['MAC 漂移', '同一 MAC 在多个端口间跳动', 'display mac-address'],
          ],
        },
        {
          type: 'code',
          title: '二层故障取证命令',
          lang: 'vrp',
          code: `# VLAN 与端口放通
display vlan
display port vlan GigabitEthernet0/0/1

# 接口流量与广播计数
display interface GigabitEthernet0/0/1
display interface brief

# 生成树角色、根桥与拓扑变化
display stp brief
display stp root

# MAC 是否漂移
display mac-address 00e0-fc12-3456`,
        },
        {
          type: 'output',
          title: '验证：广播计数与 STP 端口角色',
          text: `<SW1> display interface GigabitEthernet0/0/1
GigabitEthernet0/0/1 current state : UP
Line protocol current state : UP
Last line protocol up time : 2026-11-12 09:12:31
Description : To-SW2
    Unicast:                  1024,  Multicast:                12888
    Broadcast:              982341,  Jumbo:                        0
    Discard:                     0,  Total Error:                  0

<SW1> display stp brief
 MSTID  Port                        Role  STP State     Protection
    0   GigabitEthernet0/0/1        ROOT  FORWARDING    NONE
    0   GigabitEthernet0/0/2        DESI  FORWARDING    NONE
    0   GigabitEthernet0/0/3        ALTE  DISCARDING    NONE`,
        },
        {
          type: 'list',
          title: '回显说明什么',
          items: [
            'Broadcast 计数接近百万且持续快速增长，是广播风暴最直接的证据',
            'Multicast 同时偏高，说明可能有组播或未知单播在环内反复转发',
            '存在 ALTE 阻塞端口说明 STP 正在防环，但若端口角色频繁变化就是震荡',
            '此时不要先重启交换机，先定位环路端口并 shutdown 止血，再分析根因',
          ],
        },
        {
          type: 'interactive',
          key: 'stp-election',
          caption: '调整优先级重新推演根桥：根桥应放在核心，接入层设备不应抢根。',
        },
        {
          type: 'table',
          title: 'STP 常见异常与处理',
          columns: ['现象', '原因', '处置'],
          rows: [
            ['根桥在接入层', '接入交换机优先级默认 32768，MAC 更小者胜出', '核心设 stp root primary，接入设 stp root secondary'],
            ['端口频繁 FORWARDING / DISCARDING', '链路抖动或收到大量 TCN', '查接口错包与双工，启用 BPDU 保护'],
            ['用户私接交换机导致环路', '接入口收到 BPDU', '接入口配 stp bpdu-protection，触发后 err-down'],
            ['某 VLAN 不通', '该 VLAN 的 STP 实例被阻塞或未创建', 'display stp brief 与 display vlan 对照'],
          ],
        },
        {
          type: 'code',
          title: '固定根桥并保护接入端口',
          lang: 'vrp',
          code: `# 核心交换机固定为根桥
stp mode mstp
stp instance 0 root primary

# 接入交换机作为备份根桥
stp instance 0 root secondary

# 接入端口开启 BPDU 保护，防止私接设备引发环路
interface GigabitEthernet0/0/3
 stp edged-port enable
 stp bpdu-protection
 quit`,
        },
        {
          type: 'warning',
          title: '环路时先止血，再找根因',
          text: '广播风暴会让 CPU 迅速升高，SSH 都可能卡断。此时不要反复登录改配置，也不要直接重启整台设备。正确动作是先在疑似环路口执行 shutdown 止血，观察广播计数是否回落，再通过 MAC 漂移与 STP 变化记录定位环路来源。重启只能让风暴暂停几十秒，根因还在，很快会再次发生。',
        },
        {
          type: 'tip',
          title: 'VLAN 不通先确认三个「有没有」',
          text: '有没有创建 VLAN、接口有没有加入该 VLAN、Trunk 有没有放行该 VLAN。三个都有还没有通，再看 PVID 与 Hybrid 的标签方向，最后看 STP 是否阻塞。按这个顺序查，比一上来就抓包快得多。display port vlan 一行就能同时看到链路类型、PVID 与允许列表。',
        },
        {
          type: 'steps',
          title: '排障闭环：整层楼网速骤降',
          items: [
            { title: '现象', text: '某栋楼所有终端访问变慢、丢包，交换机 CPU 接近 100%，管理页面卡顿。' },
            { title: '假设', text: '存在二层环路导致广播风暴；或上联链路拥塞、光模块劣化。' },
            { title: '验证', text: 'display interface 看到 Broadcast 计数暴涨，display mac-address 出现同一 MAC 在多个端口漂移。' },
            { title: '修复', text: 'shutdown 疑似环路口止血，清理私接交换机，接入口补配 BPDU 保护与边缘端口。' },
            { title: '回归', text: '广播计数回落并稳定，CPU 恢复正常，STP 端口角色不再频繁变化。' },
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm13-l07',
      moduleId: 'm13',
      title: 'WLAN 故障：AP 不上线、终端连不上与漫游异常',
      depth: '精通',
      minutes: 30,
      summary: 'AP 上线看地址与 CAPWAP，终端接入看关联认证，漫游看覆盖与一致性。',
      objectives: [
        '按地址、发现 AC、CAPWAP 隧道、版本许可证四段定位 AP 上线失败',
        '区分终端关联失败、认证失败与 DHCP 失败',
        '判断漫游黏滞与射频干扰的典型表现',
      ],
      keywords: ['AP 上线', 'CAPWAP', 'DHCP Option 43', '终端关联', '漫游', '射频干扰'],
      blocks: [
        {
          type: 'paragraph',
          text: 'WLAN 故障要沿两条链路查：AP 上线和终端接入。AP 上电后先通过 DHCP 获取管理地址，再发现 AC 地址，然后建立 CAPWAP 隧道（UDP 5246 控制、5247 数据，可选 DTLS 加密），最后下载配置与版本、检查许可证并上线。终端接入则是关联、认证、DHCP、转发四步。两条链路任何一步断了，现象都是「连不上」，但根因位置完全不同。',
        },
        {
          type: 'paragraph',
          text: '判断顺序很关键：先看 AP 是否在线，再看 SSID 是否发射，再看终端能否关联，最后看终端能否拿到地址。AP 不在线时查终端毫无意义；AP 在线但终端拿不到地址，问题多半在业务 VLAN 与 DHCP，而不是 AC 配置。',
        },
        {
          type: 'analogy',
          title: 'AP 上线像新员工入职',
          text: '先报到拿工号（DHCP 拿管理地址），再找部门（发现 AC），然后办门禁与邮箱（建立 CAPWAP 隧道），最后领电脑装软件（下载版本与配置）。任何一个环节卡住，人都进不了工位。终端连 Wi-Fi 则像访客进门：先按门铃（关联）、再验身份（认证）、最后领临时卡（DHCP），少一步都进不去。',
        },
        {
          type: 'table',
          title: 'AP 上线四段与失败表现',
          columns: ['阶段', '失败表现', '验证与修复'],
          rows: [
            ['获取地址', 'AP 无 IP、反复重启', '查 DHCP 地址池、AP 管理 VLAN 与 Trunk 放通'],
            ['发现 AC', '有地址但找不到 AC', '配置 Option 43 或 DNS，确认 AC 源地址可达'],
            ['建立隧道', 'CAPWAP 建链失败或反复重连', '放行 UDP 5246/5247，检查 DTLS 与 NAT 映射'],
            ['版本与许可证', '隧道建立后立即下线', '核对 AC 支持的 AP 型号、版本与许可证数量'],
          ],
        },
        {
          type: 'interactive',
          key: 'wlan-onboarding',
          caption: '逐步查看 AP 从获取地址到上线的全过程，注意每一步失败时 display ap all 的状态差异。',
        },
        {
          type: 'code',
          title: 'WLAN 故障取证命令',
          lang: 'vrp',
          code: `# AP 在线状态与上线失败原因
display ap all
display ap online-fail-record all

# CAPWAP 与 AC 源地址配置
display capwap configuration
display current-configuration configuration wlan

# 终端关联与认证状态
display station all
display station ssid Guest

# 从 AP 侧验证到 AC 的可达性
ping -a 10.10.20.11 10.10.100.10`,
        },
        {
          type: 'output',
          title: '验证：AP 状态与失败记录',
          text: `<AC1> display ap all
Total AP number: 3,  Total STA number: 0
AP ID  AP Name   AP MAC            State   Type  IP Address
0      AP-1      00e0-fc12-3456    nor     R     10.10.20.11
1      AP-2      00e0-fc12-3478    fault   R     -
2      AP-3      00e0-fc12-3490    nor     R     10.10.20.13

<AC1> display ap online-fail-record all
AP MAC            Fail Time              Reason
00e0-fc12-3478    2026-11-12 09:31:22    CAPWAP tunnel establishment failed
00e0-fc12-3478    2026-11-12 09:28:10    No AC address obtained from DHCP`,
        },
        {
          type: 'list',
          title: '回显给出的线索',
          items: [
            'AP-2 为 fault 且没有 IP，说明它连管理地址都没拿到，问题在 DHCP 或管理 VLAN',
            '失败记录里先出现「未从 DHCP 获得 AC 地址」，说明发现 AC 阶段就已失败',
            'AP-1 与 AP-3 正常，可对比两者所连端口的 Trunk 放通与 PVID 差异',
            'AP 上线后再看 display station all，才能判断终端侧问题',
          ],
        },
        {
          type: 'table',
          title: '终端连不上与漫游异常',
          columns: ['现象', '常见原因', '验证'],
          rows: [
            ['搜不到 SSID', 'AP 未上线、射频未开启、SSID 未绑定', 'display ap all、display current-configuration configuration wlan'],
            ['关联失败', '安全模板或认证服务器不匹配', 'display station all 看关联状态'],
            ['关联成功但无地址', '业务 VLAN 未放通、DHCP 地址池耗尽', 'display vlan、display ip pool'],
            ['能连但很慢', '信号弱、同频干扰、终端黏滞在远端 AP', 'display station all 看信号强度'],
            ['漫游断流', 'AP 间无重叠覆盖、安全模板不一致', '对比两台 AP 的射频与安全配置'],
          ],
        },
        {
          type: 'warning',
          title: 'Option 43 与 DTLS 是两处高频坑',
          text: 'DHCP Option 43 里的 AC 地址在不同厂商格式不同，华为常用十六进制字符串，写成十进制点分格式 AP 会解析失败。另一处是 DTLS：AC 开启 DTLS 后，AP 与 AC 之间的 CAPWAP 控制报文需要证书校验，证书过期或 AP 不支持会导致隧道反复建立失败。这两处配置看起来都「配了」，但一个字符错就上线不了。',
        },
        {
          type: 'tip',
          title: '漫游异常先看覆盖，再看配置',
          text: '终端在会议室与走廊之间来回切换却始终黏在远端 AP，多半是覆盖重叠不足或没有开启漫游优化。先确认两台 AP 的信号在同一区域有足够重叠，再检查 SSID、安全模板、VLAN 是否完全一致。射频侧优先用 5G，2.4G 只使用 1、6、11 三个非重叠信道，避免同频干扰。',
        },
        {
          type: 'steps',
          title: '排障闭环：AP 无法上线',
          items: [
            { title: '现象', text: '新装 AP 上电后指示灯常亮但 AC 上 state 为 fault，终端搜不到该区域 SSID。' },
            { title: '假设', text: 'AP 未拿到管理地址；或找不到 AC；或 5246/5247 被中间设备拦截。' },
            { title: '验证', text: 'display ap online-fail-record all 显示未从 DHCP 获得 AC 地址，AP 无 IP。' },
            { title: '修复', text: '在管理 VLAN 的 DHCP 池中补 Option 43 指向 AC，确认 Trunk 放行管理 VLAN。' },
            { title: '回归', text: 'AP 获得地址并 nor 上线，终端可关联并拿到业务地址，漫游测试正常。' },
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm13-l08',
      moduleId: 'm13',
      title: '安全故障：策略不生效、NAT 回流与 IPsec 隧道起不来',
      depth: '精通',
      minutes: 32,
      summary: '策略看顺序与会话，NAT 回流看域间放行，IPsec 分两阶段定位。',
      objectives: [
        '解释安全策略的匹配顺序与默认拒绝行为',
        '用会话表判断策略是否真正命中',
        '定位 NAT 回流与 IPsec 两阶段协商失败',
      ],
      keywords: ['安全策略', '会话表', 'NAT 回流', 'IPsec', 'IKE', 'NAT-T'],
      blocks: [
        {
          type: 'paragraph',
          text: '安全故障的典型特征是「配置看起来都对，流量就是不通」。因为防火墙的判断发生在三个不同的位置：策略匹配（五元组、安全域、时间）、会话建立（首包是否被放行、后续是否命中会话）、以及 NAT 与隧道对地址和端口的改写。只查策略不看会话，很容易漏掉「策略放行了但被 NAT 改坏」这类问题。',
        },
        {
          type: 'paragraph',
          text: '安全策略按从上到下的顺序匹配，命中第一条即停止，所有策略都没命中时执行默认拒绝。因此新增策略的位置比内容更关键：把一条宽泛的 permit 放在顶部，会让下面所有精细策略失效；把精细策略放在默认拒绝之后（如果设备允许），则永远不会命中。排查时先看规则顺序与命中计数，再看会话表。',
        },
        {
          type: 'analogy',
          title: '门禁名单、前台登记与押运专线',
          text: '安全策略像门禁名单，按顺序一个个比对，第一个匹配的人决定放不放行，名单上都没有就默认挡住。会话表像前台登记簿，第一个人登记后，后面的人凭登记记录直接进出。NAT 像前台把内部分机号换成对外总机号，外部回拨必须能转回原来的分机。IPsec 则像一条押运专线，先验身份（IKE），再商量箱子和路线（IPsec SA）。',
        },
        {
          type: 'table',
          title: '三类安全故障的检查点',
          columns: ['故障类型', '典型现象', '关键检查'],
          rows: [
            ['策略不生效', '配置了 permit 仍然不通', '规则顺序、源目安全域、地址与端口、是否命中计数'],
            ['NAT 回流失败', '外网能访问、内网访问公网地址打不开', 'NAT Server 映射、内网到服务器所在域的放行、回流支持'],
            ['IPsec 起不来', '隧道不通，业务网段互访失败', 'IKE SA 是否建立、ACL 是否镜像、提议与 NAT-T'],
          ],
        },
        {
          type: 'interactive',
          key: 'fw-policy',
          caption: '调整规则顺序观察命中变化：第一条匹配即停止，默认拒绝是最后一道门。',
        },
        {
          type: 'code',
          title: '策略、会话与 NAT 的取证',
          lang: 'vrp',
          code: `# 策略顺序、命中计数与动作
display security-policy rule all

# 当前会话，判断流量是否真正被放行
display firewall session table
display firewall session table verbose

# NAT 映射是否存在
display nat server
display nat outbound

# 接口与安全域归属
display zone
display interface GigabitEthernet1/0/1`,
        },
        {
          type: 'output',
          title: '验证：策略规则与会话表',
          text: `<FW1> display security-policy rule all
Security policy rule total: 3

RULE ID  RULE NAME          SOURCE-ZONE  DEST-ZONE  SOURCE-ADDRESS   SERVICE  ACTION  ENABLE
1        trust-to-untrust   trust        untrust    any              any      permit  yes
2        dmz-to-untrust     dmz          untrust    any              http     permit  yes
0        default            any          any        any              any      deny    yes

<FW1> display firewall session table
------------------------------------------------------------------
Current Total Sessions : 2
  http  VPN: public --> public  192.168.10.20:51234 --> 202.1.1.10:80
  dns   VPN: public --> public  192.168.10.20:51235 --> 202.1.1.10:53
------------------------------------------------------------------`,
        },
        {
          type: 'list',
          title: '回显给出的线索',
          items: [
            '规则 1 源地址为 any，会先于任何精细策略命中，导致后续策略形同虚设',
            '规则 2 只放行 http 服务，若业务走 8080 端口就不会命中',
            '会话表里没有到目标服务器的会话，说明首包就被拒绝或根本没有发出',
            '有会话不代表业务正常，还要看 NAT 前后的地址是否正确',
          ],
        },
        {
          type: 'paragraph',
          text: 'NAT 回流（hairpin）是内网用户访问公网映射地址时的特殊场景：流量从内网口进入，目的地址是防火墙自己的公网地址，需要先做目的地址转换再「掉头」发回内网。它同时要求 NAT Server 映射存在、内网到服务器所在安全域的策略放行，并且设备支持并启用了回流。任何一条不满足，表现都是「外网访问正常、内网访问公网地址打不开」。',
        },
        {
          type: 'interactive',
          key: 'nat-ipsec',
          caption: '观察地址转换与 IKE/ESP 封装顺序，注意 NAT 场景下 IKE 会切到 UDP 4500。',
        },
        {
          type: 'code',
          title: 'NAT Server 与 IPsec 配置要点',
          lang: 'vrp',
          code: `# 发布内网服务器，内网访问该公网地址需要回流支持
interface GigabitEthernet1/0/1
 ip address 202.1.1.1 255.255.255.0
 nat server protocol tcp global 202.1.1.1 8080 inside 192.168.20.10 80
 quit

# 放行内网到服务器所在安全域（回流同样需要策略）
security-policy
 rule name trust_to_dmz
  source-zone trust
  destination-zone dmz
  destination-address 192.168.20.0 24
  action permit
  quit
 quit

# IPsec：ACL 两端必须镜像
acl number 3000
 rule 5 permit ip source 192.168.10.0 0.0.0.255 destination 192.168.20.0 0.0.0.255
 quit
ipsec policy POL1 10 isakmp
 security acl 3000
 ike-peer PEER1
 proposal PROP1
 quit`,
        },
        {
          type: 'output',
          title: '验证：IKE SA 与 IPsec SA',
          text: `<FW1> display ike sa
IKE SA information :
    Conn-ID  Peer            VPN   Flag(s)   Phase   RemoteType  RemoteID
    1        202.1.1.2:4500   0     RD|ST     v2:1    IP          202.1.1.2

  Number of IKE SA : 1

<FW1> display ipsec sa
  IPSec SA information :
    No IPSec SA found.`,
        },
        {
          type: 'warning',
          title: 'ACL 不镜像，第二阶段一定失败',
          text: 'IPsec 的 ACL 不是防火墙策略，而是「哪些流量要加密」的兴趣流选择器，两端必须严格镜像：源网段对目的网段、掩码完全一致。一端写 /24、另一端写 /25，或者源目写反，都会出现 IKE SA 正常、IPsec SA 为空的典型现象。中间经过 NAT 时，IKE 会从 UDP 500 切到 4500 做 NAT 穿越，只放行 500 会导致第一阶段成功、第二阶段失败。',
        },
        {
          type: 'tip',
          title: '先看会话与 SA，再谈配置',
          text: '策略类故障先 display firewall session table，看流量是否建立会话；没有会话再去查策略顺序与路由。隧道类故障先 display ike sa 看第一阶段，再 display ipsec sa 看第二阶段，最后才看 ACL 与提议。会话与 SA 是设备给出的客观事实，比逐条读配置快得多。',
        },
        {
          type: 'steps',
          title: '排障闭环：内网访问公网映射地址失败',
          items: [
            { title: '现象', text: '外网用户访问 202.1.1.1:8080 正常，内网用户访问同一地址打不开。' },
            { title: '假设', text: 'NAT 回流未生效；或缺少内网到服务器所在安全域的放行策略；或内网 DNS 解析到公网地址但路由绕行。' },
            { title: '验证', text: 'display nat server 映射存在，display firewall session table 无对应会话，说明首包被策略或回流逻辑丢弃。' },
            { title: '修复', text: '放行 trust 到 dmz 的策略，确认设备支持并启用 NAT 回流；或让内网域名直接解析到私网地址。' },
            { title: '回归', text: '会话表出现双向会话，内网访问成功，外网访问不受影响。' },
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm13-l09',
      moduleId: 'm13',
      title: '变更、割接与故障复盘：方案、回滚与验证清单',
      depth: '精通',
      minutes: 28,
      summary: '用六要素方案、量化回滚条件与复盘模板，把每一次变更风险关进流程。',
      objectives: [
        '按现状、目标、步骤、回滚、验证、窗口六要素写出变更方案',
        '执行割接前中后检查清单并记录证据',
        '用固定结构输出有改进项的故障复盘报告',
      ],
      keywords: ['变更方案', '割接', '回滚条件', '验证清单', '故障复盘'],
      blocks: [
        {
          type: 'paragraph',
          text: '现网故障里有相当比例来自变更本身。变更不可怕，可怕的是没有方案、没有备份、没有验证、没有回滚。一个可执行的变更方案必须写清六件事：现状是什么、目标是什么、按什么步骤做、失败怎么回、每步怎么验、在什么窗口做。缺任何一项，现场就只能靠临场发挥，而临场发挥正是事故的温床。',
        },
        {
          type: 'paragraph',
          text: '割接与普通变更的区别在于影响面：割接通常涉及链路切换、设备替换或业务搬迁，必须假设「切换过程中会中断」，并提前准备好回退路径与业务侧的配合动作。验证不能只看设备 up，还要看业务侧的真实成功率、时延与丢包，否则设备显示一切正常、用户却仍然打不开页面。',
        },
        {
          type: 'analogy',
          title: '像换轮胎，而不是边开边修',
          text: '换轮胎要先熄火、拉手刹、放千斤顶、垫好垫块，再拆装，最后按规定扭矩复紧并试车。每一步都有顺序和验证，任何一个环节跳过都可能出事。变更也一样：先备份、再小步执行、每步验证、随时能退回。边开车边换轮胎式的变更，技术再熟也不该被允许。',
        },
        {
          type: 'table',
          title: '变更方案六要素',
          columns: ['要素', '必须写清的内容', '常见缺失'],
          rows: [
            ['现状', '拓扑、版本、配置基线、当前告警与容量', '没写当前版本与已知隐患'],
            ['目标', '变更后要达到的可验证状态', '写成「优化网络」这种无法验收的目标'],
            ['步骤', '逐条命令级操作，标注预计耗时与执行人', '步骤粒度过粗，现场靠猜'],
            ['回滚', '触发条件、回滚命令、预计耗时、验证方法', '只写「必要时回滚」'],
            ['验证', '设备侧与业务侧的具体指标与判定标准', '只看接口 up，不看业务成功率'],
            ['窗口', '开始与结束时间、封网要求、值守安排', '窗口不足，做到一半被叫停'],
          ],
        },
        {
          type: 'steps',
          title: '割接检查清单',
          items: [
            { title: '变更前', text: '审批通过、配置与镜像备份完成、回滚脚本演练过、双人复核命令、业务方确认窗口。' },
            { title: '变更中', text: '按脚本逐条执行，每步立即验证并记录实际回显，出现偏离立即停手评估。' },
            { title: '变更后', text: '按验证清单核对设备指标与业务指标，观察至少一个业务周期，再关闭变更单。' },
            { title: '回滚触发', text: '丢包率、业务成功率、邻居数量等量化指标越过阈值时立即回滚，不现场「再改改看」。' },
          ],
        },
        {
          type: 'code',
          title: '备份、切换与回退',
          lang: 'vrp',
          code: `# 变更前：独立命名保存配置，并记录当前启动文件
save backup-20261112.cfg
display startup

# 变更中：小步执行，每步立即验证
display current-configuration | include bgp
display bgp peer
display ospf peer brief

# 回退：把下次启动配置指向备份，重启后回到变更前状态
startup saved-configuration backup-20261112.cfg
display startup

# 确认无误后，把启动文件切回正式配置并保存
startup saved-configuration vrpcfg.zip
save`,
        },
        {
          type: 'output',
          title: '验证：display startup 确认回退指向',
          text: `<Core1> display startup
MainBoard:
  Startup system software:              flash:/ce.cc
  Next startup system software:         flash:/ce.cc
  Startup saved-configuration file:     flash:/vrpcfg.zip
  Next startup saved-configuration file: flash:/backup-20261112.cfg
  Startup license file:                 flash:/license.dat`,
        },
        {
          type: 'warning',
          title: '回滚条件必须量化',
          text: '「业务异常就回滚」不是条件，因为每个人对异常的理解不同。合格的回滚条件要写成可判定的数字：核心业务成功率低于 95%、关键链路丢包率超过 1%、BGP 邻居丢失超过 3 个、时延超过基线两倍且持续五分钟。条件写清楚，现场才不需要层层请示，也不会因为犹豫错过最佳回退时机。',
        },
        {
          type: 'tip',
          title: '复盘要指向改进，而不是追责',
          text: '复盘报告按固定结构写：时间线、影响范围、直接原因、根本原因、处置过程、改进项与责任人、完成时间。把「人为误操作」当结论没有价值，要继续问为什么这个操作能被执行、为什么没有拦截、为什么没有及时发现。可落地的改进项通常是：加校验、加监控、改流程、补演练。',
        },
        {
          type: 'table',
          title: '故障复盘报告结构',
          columns: ['章节', '写什么', '判定标准'],
          rows: [
            ['时间线', '从首次异常到恢复的每个关键节点', '精确到分钟，能与其他系统日志对齐'],
            ['影响范围', '受影响业务、用户数、地域与持续时间', '有量化数据，不写「部分用户」'],
            ['根本原因', '能解释全部现象的技术原因', '换一个现象仍能被同一原因解释'],
            ['处置过程', '做了哪些动作、哪些有效哪些无效', '保留失败尝试，供后续参考'],
            ['改进项', '可执行、有责任人、有截止时间的动作', '每条都能验收，不写「加强管理」'],
          ],
        },
        {
          type: 'steps',
          title: '排障闭环：变更后业务异常',
          items: [
            { title: '现象', text: '割接完成后设备邻居全 Full、接口全 up，但业务侧成功率从 99% 掉到 70%。' },
            { title: '假设', text: '策略或路由改动导致部分流向绕行；或新链路 MTU 偏小导致大包丢弃。' },
            { title: '验证', text: '对比变更前后路由表与策略命中计数，用大包 ping 验证 MTU 与丢包。' },
            { title: '修复', text: '指标越过预设阈值，立即执行回滚脚本，把启动配置切回备份并重启。' },
            { title: '回归', text: '业务成功率恢复到基线，记录回滚耗时与触发点，纳入复盘报告。' },
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
