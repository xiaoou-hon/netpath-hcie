import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm03',
  code: 'M03',
  title: 'OSPF 路由协议',
  summary:
    'OSPF 是现网出现频率最高的 IGP。本模块从三张表、五种报文与状态机讲起，深入 DR 选举、六类 LSA、多区域与特殊区域、虚连接、汇总过滤和路由引入，最后给出一套可复用的邻居与选路故障排查顺序。',
  stage: 'L2',
  order: 3,
  goals: [
    '独立完成 OSPF 单区域与多区域的规划、配置和验证',
    '读懂 LSDB，并说清每条路由来自哪类 LSA、由哪台设备产生',
    '设计 STUB、Totally STUB、NSSA 区域并控制默认路由',
    '用汇总、过滤和路由引入控制路由表规模与选路结果',
    '按邻居、LSDB、路由、转发的顺序定位并修复常见故障',
  ],
  keywords: [
    'OSPF',
    '链路状态',
    'LSDB',
    'LSA',
    'DR/BDR',
    'ABR',
    'ASBR',
    'STUB',
    'NSSA',
    '路由汇总',
  ],
  lessons: [
    {
      id: 'm03-l01',
      moduleId: 'm03',
      title: 'OSPF 为什么存在：链路状态与三张表',
      depth: '熟悉',
      minutes: 20,
      summary: '先弄清 OSPF 为什么比 RIP 更可靠：链路状态、洪泛与三张表如何配合算出最短路径。',
      objectives: [
        '说出邻居表、LSDB、路由表各自存什么、谁先谁后',
        '解释链路状态算法与距离矢量算法的本质差别',
        '完成单区域 OSPF 基础配置并验证邻居与路由',
        '判断 Router-ID 与 network 通配符的写法是否正确',
      ],
      keywords: ['链路状态', '三张表', 'LSDB', 'SPF', 'Router-ID', 'network 命令'],
      blocks: [
        {
          type: 'paragraph',
          text: 'OSPF（Open Shortest Path First，开放最短路径优先）是典型的链路状态（Link State）路由协议。它要解决的核心问题是：在一个几十台甚至几百台路由器的网络里，如何让每台设备都拿到一份一致、可快速收敛的全网拓扑，而不是靠邻居口口相传的距离。',
        },
        {
          type: 'paragraph',
          text: 'RIP 这类距离矢量协议只告诉邻居「我到某个网段有多远」，路由器并不真正知道网络长什么样，防环只能依靠水平分割、毒性逆转和最大跳数兜底，收敛慢且故障期间容易出现临时环路。OSPF 换了个思路：每台路由器只描述「我直连了谁、链路开销多少」，把这份描述洪泛（flooding，向区域内所有邻居转发同一份信息）出去，最终同区域每台设备的 LSDB（Link State Database，链路状态数据库）完全一致。',
        },
        {
          type: 'analogy',
          title: '把路由当成拼地图',
          text: '链路状态像一群探险队员各画一张局部地图：我只画自己脚下的路和路口，然后把这张小卡片复印给所有同伴；每个人手里的卡片拼起来，就是同一张完整地图。之后每个人独立用同一套算法算最短路，结果必然一致。距离矢量更像问路：你只知道「往东走三个路口能到」，却不知道东边到底是什么地形。',
        },
        { type: 'heading', text: '三张表：OSPF 的工作产物', level: 2 },
        {
          type: 'table',
          title: 'OSPF 三张表的职责',
          columns: ['表', '存的是什么', '关键点', '验证命令'],
          rows: [
            [
              '邻居表',
              '与本机建立邻接关系的路由器、状态、DR/BDR 角色',
              '只看得到直连邻居，到 Full 才算邻接完成',
              'display ospf peer',
            ],
            [
              'LSDB 拓扑表',
              '本区域内所有路由器、链路、外部路由的 LSA',
              '同区域所有设备的 LSDB 应完全一致',
              'display ospf lsdb',
            ],
            [
              '路由表',
              'SPF 计算后选出的最优路径',
              '只放最优路由，等价路径会形成负载分担',
              'display ospf routing',
            ],
          ],
        },
        {
          type: 'paragraph',
          text: '三张表的依赖顺序不能颠倒：先有邻居（Hello 互通），才有 LSA 交换（LSDB 同步），最后才有 SPF 计算和路由下发。排错时按这个顺序看，比一上来就盯路由表有效得多。',
        },
        {
          type: 'code',
          title: 'R1 单区域 OSPF 基础配置',
          lang: 'vrp',
          code: `system-view
sysname R1
interface GigabitEthernet0/0/0
 ip address 10.0.1.1 255.255.255.0
 quit
interface LoopBack0
 ip address 1.1.1.1 255.255.255.255
 quit
ospf 1 router-id 1.1.1.1
 area 0.0.0.0
  network 10.0.1.0 0.0.0.255
  network 1.1.1.1 0.0.0.0
 quit
 quit`,
        },
        {
          type: 'output',
          title: 'display ospf peer 验证邻居',
          text: `OSPF Process 1 with Router ID 1.1.1.1
 Neighbors

 Area 0.0.0.0 interface 10.0.1.1(GigabitEthernet0/0/0)'s neighbors
 Router ID: 2.2.2.2        Address: 10.0.1.2
   State: Full  Mode: Nbr is Master  Priority: 1
   DR: 10.0.1.1  BDR: 10.0.1.2  MTU: 0
   Dead timer due in 38 sec
   Retrans Timer interval: 5
   Neighbor is up for 00:03:21
   Authentication Sequence: [ 0 ]`,
        },
        {
          type: 'tip',
          title: 'Router-ID 的选择顺序',
          text: '华为 VRP 的 Router-ID 优先级是：手工用 ospf 1 router-id 指定优先；没有手工指定时取所有 Loopback 接口中最大的 IP；再没有则取所有物理接口中最大的 IP。生产环境建议手工指定并保证全网唯一，否则设备重启或接口增删会导致 Router-ID 漂移，邻居关系跟着抖动。',
        },
        {
          type: 'warning',
          title: 'network 后面跟的是反掩码',
          text: 'network 10.0.1.0 0.0.0.255 里的 0.0.0.255 是通配符（反掩码）：0 表示该位必须匹配，255 表示任意。写成 255.255.255.0 会把接口地址算错，结果是接口没有进入 OSPF，邻居根本建不起来。也可以写成 network 10.0.1.1 0.0.0.0，精确匹配单个接口地址。',
        },
        {
          type: 'checklist',
          title: '本课自检',
          items: [
            '能不看笔记说出三张表的先后依赖关系',
            '能解释为什么同区域 LSDB 必须一致',
            '能用 display ospf peer 判断邻居是否到达 Full',
            '知道 Router-ID 的三级选择顺序与代价',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm03-l02',
      moduleId: 'm03',
      title: '五种报文与邻居状态机',
      depth: '精通',
      minutes: 32,
      summary: '五种报文如何配合，把两台路由器从陌生一路推到邻接完成 Full。',
      objectives: [
        '说出五种 OSPF 报文的用途与目的地址',
        '按顺序复述七个邻居状态及每个状态的触发条件',
        '区分正常的 2-Way 与故障性的 2-Way',
        '能根据卡住的状态快速缩小排错范围',
      ],
      keywords: ['Hello', 'DD', 'LSR', 'LSU', '邻居状态机', 'ExStart'],
      blocks: [
        {
          type: 'paragraph',
          text: '两台路由器在同一个网段上，默认情况下既不知道对方是否运行 OSPF，也不知道对方的区域号、定时器、认证方式是否和自己一致，更不知道对方手里有哪些 LSA。邻居状态机就是一套握手协议：先确认参数一致，再比较数据库摘要，最后补齐缺失明细，任何一步对不上都会停在该状态。',
        },
        { type: 'heading', text: '五种报文，各管一段', level: 3 },
        {
          type: 'table',
          title: 'OSPF 五种报文',
          columns: ['报文', '全称', '作用', '目的地址'],
          rows: [
            ['Hello', 'Hello Packet', '发现并维持邻居，协商定时器、区域号、认证与特殊区域标志', '224.0.0.5'],
            ['DD', 'Database Description', '交换 LSDB 摘要，只带 LSA 头部，同时协商主从关系', '单播'],
            ['LSR', 'Link State Request', '按摘要请求本机缺失或过期的 LSA 明细', '单播'],
            ['LSU', 'Link State Update', '携带真正的 LSA 内容，一条报文可装多条 LSA', '单播或 224.0.0.6'],
            ['LSAck', 'Link State Acknowledgment', '确认收到 LSU，保证洪泛可靠', '单播或 224.0.0.6'],
          ],
        },
        {
          type: 'paragraph',
          text: '224.0.0.5 是 AllSPFRouters，所有运行 OSPF 的接口都监听；224.0.0.6 是 AllDRouters，只有 DR 和 BDR 监听，所以非 DR 路由器发送的 LSU 会先送到 224.0.0.6，再由 DR 转发给 224.0.0.5。这两个地址是排错时的第一手线索：ACL 或防火墙把组播一挡，Hello 就过不去。',
        },
        {
          type: 'analogy',
          title: '一次需要签收的快递',
          text: 'Hello 是敲门确认「有人吗、地址对不对」；DD 是双方先对清单，确认各自手里有哪些件；LSR 是「这几件我没有，请补给我」；LSU 是真正把包裹送上门；LSAck 是签收单。任何一步信息对不上，比如地址、认证或包裹尺寸，流程就卡在当时那一环。',
        },
        {
          type: 'interactive',
          key: 'ospf-fsm',
          caption: '点击每个状态查看触发条件；注意 2-Way 和 ExStart 是两个最容易被误判的卡点。',
        },
        {
          type: 'steps',
          title: '一次完整的邻接建立',
          items: [
            { title: 'Down', text: '接口刚启用 OSPF，还没有收到任何 Hello。' },
            { title: 'Init', text: '收到了对方的 Hello，但对方的邻居列表里还没有我，说明只有单向可见。' },
            { title: '2-Way', text: '双方 Hello 里都出现了对方；广播网中 DROther 之间停在这里是正常的。' },
            { title: 'ExStart', text: '用 DD 报文协商主从，Router-ID 大的一方当 Master，负责控制后续交互节奏。' },
            { title: 'Exchange', text: '互发 DD 摘要，告诉对方自己 LSDB 里有哪些 LSA、序列号是多少。' },
            { title: 'Loading', text: '用 LSR 请求缺失明细，对方用 LSU 回应，直到请求列表清空。' },
            { title: 'Full', text: 'LSDB 完全同步，双方各自独立运行 SPF，邻接关系建立完成。' },
          ],
        },
        {
          type: 'paragraph',
          text: '为什么 DROther 之间停在 2-Way 不是故障？广播网络里如果有 N 台路由器，两两建立 Full 需要 N×(N-1)/2 条邻接，LSA 洪泛量会随规模平方级增长。OSPF 让所有 DROther 只与 DR、BDR 建立 Full，彼此保持 2-Way，用「主持人」收敛洪泛范围。判断标准是：与 DR、BDR 是否 Full，而不是邻居总数。',
        },
        {
          type: 'code',
          title: '调整 Hello 与 Dead 定时器',
          lang: 'vrp',
          code: `interface GigabitEthernet0/0/0
 ospf timer hello 10
 ospf timer dead 40
 quit
ospf 1
 area 0.0.0.0
  network 10.0.1.0 0.0.0.255
 quit
 quit`,
        },
        {
          type: 'output',
          title: '邻居卡在 ExStart 时的 display ospf peer',
          text: ` Router ID: 2.2.2.2        Address: 10.0.1.2
   State: ExStart  Mode: Nbr is Slave  Priority: 1
   DR: 10.0.1.1  BDR: 10.0.1.2  MTU: 1500
   Dead timer due in 31 sec
   Retrans Timer interval: 5
   Neighbor is up for 00:00:46
   Authentication Sequence: [ 0 ]`,
        },
        {
          type: 'warning',
          title: 'ExStart 卡死，先比 MTU',
          text: 'DD 报文里会携带接口 MTU。两端 MTU 不一致（例如一端 1500、另一端被改成 1400）时，邻居会反复停在 ExStart 然后回落到 Down，日志里能看到大量 DD 重传。用 display ospf interface 对比两端 MTU；如果链路本身允许差异，可在接口下加 ospf mtu-ignore 临时绕过，但更推荐把 MTU 改一致，因为 MTU 不一致本身就是转发隐患。',
        },
        {
          type: 'tip',
          title: '用 display ospf error 看丢包原因',
          text: '邻居停在 Init，优先怀疑单向 Hello：查 ACL 是否放行 224.0.0.5、两端认证是否一致、是否只有一端宣告了该网段。邻居在 2-Way 与 Full 之间反复跳，查 Hello/Dead 定时器、区域号和网络掩码。display ospf error 会按报文类型给出错误计数，比盲猜快得多。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm03-l03',
      moduleId: 'm03',
      title: 'DR 与 BDR：广播网上的主持人',
      depth: '精通',
      minutes: 30,
      summary: '为什么广播网要选 DR，选举按什么顺序投票，以及为什么它永远不抢占。',
      objectives: [
        '解释 DR/BDR 如何把邻接数量从平方级降到线性级',
        '按优先级、Router-ID 顺序推导选举结果',
        '说明 DR 选举非抢占带来的运维影响',
        '判断哪些网络类型根本不需要 DR',
      ],
      keywords: ['DR', 'BDR', 'DROther', '选举', 'dr-priority', '组播地址'],
      blocks: [
        {
          type: 'paragraph',
          text: '在一个共享广播域里接入十几台路由器时，如果每两台都建立完整邻接，邻接数量是 N×(N-1)/2；任何一条链路变化都要向所有邻接逐个洪泛，LSA 数量和 CPU 开销都会迅速失控。OSPF 的解法是在每个广播网段选出一台 DR（Designated Router，指定路由器）和一台 BDR（Backup Designated Router，备份指定路由器），由 DR 统一收集和分发该网段的 LSA。',
        },
        {
          type: 'analogy',
          title: '圆桌会议的主持人',
          text: '所有人只向主持人汇报，主持人整理后统一发会议纪要，而不是每个人把同一份材料复印给其他所有人。BDR 是坐在旁边的备份主持人，主持人一掉线立刻接替，会议不中断。其他人只是参会者（DROther），彼此之间不需要交换完整材料。',
        },
        {
          type: 'table',
          title: '选举规则（按顺序比较）',
          columns: ['比较项', '规则', '说明'],
          rows: [
            ['接口优先级', '数值大者胜，默认 1，0 表示不参选', '接口下 ospf dr-priority 修改'],
            ['Router-ID', '优先级相同时 Router-ID 大者胜', '手工指定更可控'],
            ['是否抢占', '不抢占，DR/BDR 稳定后新设备不夺权', '新加入的高优先级设备只能当 DROther'],
            ['等待时间', '先等 Dead 定时器（默认 40 秒）再选', '避免网络抖动时反复选举'],
          ],
        },
        {
          type: 'paragraph',
          text: '选举的实际过程是「先补 BDR，再定 DR」：每台路由器先看当前 BDR 是否还在，不在就把自己列入 BDR 候选并比较优先级与 Router-ID，胜者成为 BDR；原 DR 只要还活着就继续担任 DR。这解释了一个常见现象：新接入一台优先级 200 的路由器，它依然只是 DROther，因为 DR 和 BDR 都没失效。',
        },
        {
          type: 'table',
          title: '两个组播地址的分工',
          columns: ['地址', '名称', '谁监听', '用途'],
          rows: [
            ['224.0.0.5', 'AllSPFRouters', '所有运行 OSPF 的接口', 'Hello，以及 DR 向全网段发送的 LSU'],
            ['224.0.0.6', 'AllDRouters', '只有 DR 与 BDR', 'DROther 向 DR/BDR 上报的 LSU'],
          ],
        },
        {
          type: 'code',
          title: '指定 DR 优先级并固定角色',
          lang: 'vrp',
          code: `interface GigabitEthernet0/0/0
 ospf dr-priority 200
 quit
ospf 1
 area 0.0.0.0
  network 10.0.1.0 0.0.0.255
 quit
 quit`,
        },
        {
          type: 'output',
          title: 'display ospf interface 查看角色',
          text: `Area: 0.0.0.0
Interface: GigabitEthernet0/0/0 (10.0.1.1)
 Cost: 1  State: DR  Type: Broadcast  MTU: 1500
 Priority: 200
 Designated Router: 10.0.1.1
 Backup Designated Router: 10.0.1.2
 Timers: Hello 10, Dead 40, Poll 120, Retransmit 5, Transmit Delay 1`,
        },
        {
          type: 'warning',
          title: '改优先级不会立刻换人',
          text: '把接口优先级从 1 调到 200，现有 DR 不会被赶下台，因为 OSPF 的 DR 选举是非抢占的。只有 DR 失效（接口 shutdown、重启 OSPF 进程、reset ospf process）才会重新选举。规划阶段就要定好优先级，不要等业务跑了再改；确实要切换时，选择维护窗口操作，并预期邻居短暂中断。',
        },
        {
          type: 'tip',
          title: 'P2P 与 P2MP 没有 DR',
          text: '网络类型为 Point-to-Point 或 Point-to-Multipoint 时不选举 DR/BDR，邻居可直接到 Full。串口、GRE 隧道通常改成 p2p：接口下执行 ospf network-type p2p，既省掉无意义的选举等待，也避免把掩码不一致当成故障。display ospf interface 的 Type 字段能直接看到当前网络类型。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm03-l04',
      moduleId: 'm03',
      title: '六类 LSA：LSDB 里的六种卡片',
      depth: '精通',
      minutes: 35,
      summary: '每类 LSA 由谁产生、在哪个范围洪泛，读 LSDB 时如何一眼看出路由来源。',
      objectives: [
        '列出 Type 1/2/3/4/5/7 的产生者与作用范围',
        '解释 Type 4 为什么必须存在',
        '读懂 display ospf lsdb 的每一列',
        '区分 Type 5 与 Type 7 的使用场景',
      ],
      keywords: ['LSA', 'Type 1', 'Type 3', 'Type 5', 'Type 7', 'LSDB'],
      blocks: [
        {
          type: 'paragraph',
          text: 'LSDB 不是一张路由表，而是一堆描述拓扑的卡片。不同卡片解决不同范围的问题：有的描述本区域的路由器和网段，有的把别的区域的路由转述过来，有的描述外部引入的路由。OSPF 用 LSA 类型来区分这些卡片，读懂了类型，就基本能反推出「这条路由是谁告诉我的、可信范围到哪里」。',
        },
        {
          type: 'analogy',
          title: '小区公告栏上的不同通知',
          text: 'Type 1 像每家每户贴的「我家门牌和邻居关系」；Type 2 是物业贴的「本栋楼有哪些住户」；Type 3 是片区管理员转述的「隔壁小区有什么路」；Type 4 是告诉你去隔壁小区找哪位负责人；Type 5 是外部商家贴的促销信息；Type 7 则是只在本小区内张贴、由片区管理员再转成正式公告的外部信息。',
        },
        {
          type: 'table',
          title: '六类 LSA 对照表',
          columns: ['类型', '名称', '产生者', '洪泛范围', '主要内容'],
          rows: [
            ['Type 1', 'Router LSA', '每台 OSPF 路由器', '本区域', '本机接口、链路开销、邻居'],
            ['Type 2', 'Network LSA', 'DR', '本区域', '广播网段及接入的路由器'],
            ['Type 3', 'Summary LSA', 'ABR', '其他区域', '把本区域路由转述给别的区域'],
            ['Type 4', 'ASBR Summary LSA', 'ABR', '其他区域', '告诉其他区域 ASBR 的位置'],
            ['Type 5', 'AS External LSA', 'ASBR', '整个 AS（Stub/NSSA 除外）', '引入的外部路由'],
            ['Type 7', 'NSSA External LSA', 'NSSA 内的 ASBR', '仅本 NSSA', 'NSSA 内替代 Type 5，到 ABR 转为 Type 5'],
          ],
        },
        {
          type: 'paragraph',
          text: 'Type 4 常被忽略：其他区域的路由器看到 Type 5 后，只知道外部网段和开销，却不知道产生这条 LSA 的 ASBR 在哪里、怎么走。Type 4 由 ABR 产生，携带 ASBR 的 Router-ID 和到达 ASBR 的开销，接收方先把去 ASBR 的路径算出来，再把 Type 5 的外部开销叠加其上。没有 Type 4，跨区域的 Type 5 路由就无法正确安装。',
        },
        {
          type: 'code',
          title: '让 R3 成为 ASBR 并产生 Type 5',
          lang: 'vrp',
          code: `ip route-static 172.16.0.0 255.255.0.0 10.0.2.2
ospf 1 router-id 3.3.3.3
 import-route static
 area 0.0.0.0
  network 10.0.2.0 0.0.0.255
 quit
 quit`,
        },
        {
          type: 'output',
          title: 'display ospf lsdb 看六类 LSA',
          text: `OSPF Process 1 with Router ID 3.3.3.3
                 Link State Database

                         Area: 0.0.0.0
 Type       LinkState ID   AdvRouter        Age  Len   Sequence   Metric
 Router     1.1.1.1        1.1.1.1          182  48    80000005       1
 Router     2.2.2.2        2.2.2.2          176  48    80000004       1
 Network    10.0.1.2       2.2.2.2          170  32    80000002       0
 Sum-Net    192.168.2.0    2.2.2.2          165  28    80000002       1
 Sum-Asbr   3.3.3.3        2.2.2.2          160  28    80000001       1
 ASExternal 172.16.0.0     3.3.3.3          152  36    80000001       1`,
        },
        {
          type: 'interactive',
          key: 'ospf-flooding',
          caption: '观察一条 LSA 如何从产生者洪泛到区域内所有路由器，以及 ABR 如何把它改写成 Type 3。',
        },
        {
          type: 'warning',
          title: 'Type 3 不是原样转发',
          text: 'ABR 不会把区域 A 的 Type 1、Type 2 搬到区域 B，而是重新生成 Type 3：AdvRouter 变成 ABR 自己，Metric 是 ABR 到目标网段的开销，拓扑细节被抹掉。因此跨区域路由的开销是「本机到 ABR」加「ABR 到目标」两段，且区域内的链路变化不会原样扩散到其他区域。这也是区域划分能隔离故障的根本原因。',
        },
        {
          type: 'tip',
          title: '精确定位某一条 LSA',
          text: 'display ospf lsdb 的输出很长，可以加类型和 LinkState ID 过滤，例如 display ospf lsdb router 2.2.2.2 只看某台路由器的 Type 1，display ospf lsdb network 10.0.1.2 看广播网段。不同 VRP 版本对 Type 5 的显示名可能是 ASExternal 或 External，按类型编号理解更稳妥。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm03-l05',
      moduleId: 'm03',
      title: '区域划分、ABR 与 ASBR',
      depth: '熟悉',
      minutes: 26,
      summary: '为什么要分区，ABR 与 ASBR 各站在哪条边界上，多区域配置怎么落地。',
      objectives: [
        '解释区域划分如何限制 LSDB 规模与 SPF 计算范围',
        '区分 ABR 与 ASBR 的判断标准和职责',
        '完成 ABR 的多区域配置并验证区域间路由',
        '理解非骨干区域必须依赖 Area 0 的原因',
      ],
      keywords: ['区域', 'Area 0', 'ABR', 'ASBR', '多区域', 'Type 3'],
      blocks: [
        {
          type: 'paragraph',
          text: 'OSPF 不做分区时，所有路由器的 LSDB 完全一致，任何一条链路抖动都会让全网重新计算 SPF，网络越大越不稳定。区域（Area）的本质是「独立的 LSDB 和独立的 SPF 计算范围」：区域内部的变化只在区域内洪泛，跨区域的信息由 ABR 汇总成 Type 3 转发，规模与故障域同时被限制住。',
        },
        {
          type: 'analogy',
          title: '公司里的部门与总部',
          text: '每个部门只维护本部门的详细通讯录，部门之间不直接交换全部细节，而是通过总部转接。ABR 就是部门与总部之间的接口人：对内它是普通成员，对外它只汇报「部门里有哪些科室」这种摘要信息。总部的骨干网就是 Area 0，所有跨部门沟通都必须经过它。',
        },
        {
          type: 'table',
          title: '四种路由器角色',
          columns: ['角色', '定义', '典型位置', '产生的关键 LSA'],
          rows: [
            ['内部路由器', '所有接口都在同一个区域', '接入层、普通汇聚', 'Type 1、Type 2'],
            ['ABR', '同时接入两个以上区域，且其中一个必须是 Area 0', '区域边界', 'Type 3、Type 4'],
            ['ASBR', '把 OSPF 之外的路由引入 OSPF', '自治系统边界', 'Type 5 或 Type 7'],
            ['骨干路由器', '接口全部或部分在 Area 0', '核心层', 'Type 1、Type 2'],
          ],
        },
        {
          type: 'paragraph',
          text: 'ABR 的判定不看你叫什么名字，而看接口分布：只有同时连接骨干区域和非骨干区域才算 ABR。仅连接两个非骨干区域的路由器不是 ABR，也不会为它们生成 Type 3。ASBR 与 ABR 是两个独立维度：一台路由器可以同时是 ABR 和 ASBR，也可以只是 ASBR 而完全不在区域边界上。',
        },
        {
          type: 'code',
          title: 'R2 同时作为 ABR 与 ASBR',
          lang: 'vrp',
          code: `ip route-static 0.0.0.0 0.0.0.0 10.0.1.1
ospf 1 router-id 2.2.2.2
 area 0.0.0.0
  network 10.0.1.0 0.0.0.255
 quit
 area 0.0.0.1
  network 10.0.2.0 0.0.0.255
 quit
 import-route static
 quit`,
        },
        {
          type: 'output',
          title: 'display ospf brief 确认区域与角色',
          text: `OSPF Process 1 with Router ID 2.2.2.2
                 OSPF Protocol Information

 Router ID: 2.2.2.2        Graceful Restart: Not Supported
 Route preference: 10
 ASE route preference: 150
 SPF calculation count: 8
 Area Count: 2

                 Area: 0.0.0.0
 Interface Count: 1
                 Area: 0.0.0.1
 Interface Count: 1`,
        },
        {
          type: 'warning',
          title: '非骨干区域必须挂在 Area 0 上',
          text: 'OSPF 要求所有非骨干区域直接或逻辑上连接到 Area 0。两个非骨干区域之间直接连一条链路，双方不会交换 Type 3 路由，看起来邻居 Full、却学不到对方网段。正确做法是把这条链路划入 Area 0，或者用虚连接把区域逻辑上接到骨干。设计时先画区域图，再配地址，能避免大量返工。',
        },
        {
          type: 'tip',
          title: '区域号写法与验证重点',
          text: 'Area 0 可以写成 area 0，也可以写成 area 0.0.0.0，两者等价。验证多区域时重点看三件事：display ospf peer 每个区域的邻居是否 Full；display ospf routing 里是否出现 Inter-area 路由；display ospf lsdb 里 Type 3 的 AdvRouter 是否是 ABR。三者对不上，问题基本都在区域归属或 network 宣告上。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm03-l06',
      moduleId: 'm03',
      title: 'STUB、Totally STUB 与 NSSA',
      depth: '精通',
      minutes: 34,
      summary: '三类特殊区域分别砍掉哪些 LSA，默认路由从哪来，配置如何保持一致。',
      objectives: [
        '对比 STUB、Totally STUB、NSSA 允许的 LSA 类型',
        '在 ABR 与区域内路由器上完成特殊区域配置',
        '解释 NSSA 为什么不会自动下发默认路由',
        '定位 E-bit、N-bit 不一致导致的邻居故障',
      ],
      keywords: ['STUB', 'Totally STUB', 'NSSA', 'Type 7', '默认路由', 'stub no-summary'],
      blocks: [
        {
          type: 'paragraph',
          text: '末梢区域的路由器往往性能有限、出口单一，却要维护整个自治系统的外部路由，既浪费 LSDB 空间，也让外部路由抖动传导进来。特殊区域的作用就是「在区域边界做减法」：把不必要的 LSA 挡在区域外，只给区域内留一条默认路由。减得越多，区域越简单，但灵活性也越低。',
        },
        {
          type: 'analogy',
          title: '小区只留一个总出口',
          text: '小区居民不需要知道城市里每条街道怎么走，只要知道「出小区大门后跟着主路走」就够了。STUB 相当于小区只留一个大门，外来车辆信息不进小区；Totally STUB 连隔壁小区的内部道路也不告诉你，只给一句「出大门往主路」；NSSA 则允许小区里自己开一家对外营业的店，这家店的信息可以在小区内张贴，但由物业统一对外转达。',
        },
        {
          type: 'table',
          title: '三类特殊区域对比',
          columns: ['区域类型', '允许的 LSA', '默认路由来源', '关键配置'],
          rows: [
            ['STUB', 'Type 1、2、3，禁止 Type 4、5', 'ABR 自动下发 Type 3 默认路由', '区域所有路由器：stub'],
            ['Totally STUB', '仅 Type 1、2 和一条 Type 3 默认', 'ABR 下发 Type 3 默认路由', 'ABR：stub no-summary；区域内：stub'],
            ['NSSA', 'Type 1、2、3、7，禁止 Type 4、5', '需 ABR 配置 nssa default-route-advertise', '区域所有路由器：nssa'],
          ],
        },
        {
          type: 'paragraph',
          text: 'STUB 区域不能存在 ASBR，因为外部路由（Type 5）被禁止进入，ASBR 失去了意义。NSSA 正是为「末梢区域里又确实有外部路由要引入」的场景设计的：Type 7 只在本 NSSA 内洪泛，到达 ABR 时由 ABR 转换成 Type 5 再发往其他区域。转换后的 Type 5 的 AdvRouter 是 ABR，而不是原来的 ASBR。',
        },
        {
          type: 'code',
          title: 'ABR：把 Area 1 配成 Totally STUB',
          lang: 'vrp',
          code: `ospf 1
 area 0.0.0.1
  stub no-summary
 quit
 quit`,
        },
        {
          type: 'code',
          title: 'NSSA：ABR 下发默认路由，区域内路由器同步配置',
          lang: 'vrp',
          code: `ospf 1
 area 0.0.0.2
  nssa default-route-advertise
 quit
 quit`,
        },
        {
          type: 'output',
          title: 'Totally STUB 区域内的 LSDB',
          text: `OSPF Process 1 with Router ID 1.1.1.1
                 Link State Database

                         Area: 0.0.0.1
 Type       LinkState ID   AdvRouter        Age  Len   Sequence   Metric
 Router     1.1.1.1        1.1.1.1          210  36    80000004       1
 Sum-Net    0.0.0.0        2.2.2.2          205  28    80000001       1`,
        },
        {
          type: 'warning',
          title: 'NSSA 不会自动送默认路由',
          text: 'STUB 的 ABR 会自动注入 Type 3 默认路由，但 NSSA 不会。NSSA 内路由器如果只看到明细而看不到 0.0.0.0/0，通常是 ABR 上漏了 nssa default-route-advertise，或者区域内的 ASBR 没有引入默认路由。另一个高频错误是只在一端配了 nssa，另一端没配：Hello 里的 N-bit 不一致，邻居会停在 Init 或 2-Way。',
        },
        {
          type: 'tip',
          title: '特殊区域配置必须全区域一致',
          text: 'STUB、NSSA 不是单机特性，而是区域属性：同一区域内所有路由器都必须在 area 视图下配置相同类型。Hello 报文中的 E-bit（是否允许外部路由）和 N-bit（是否 NSSA）会参与邻居协商，任何一端不一致都无法建立 Full。上线前用配置比对工具或巡检脚本确认区域内配置一致，比事后逐台排查省事得多。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm03-l07',
      moduleId: 'm03',
      title: '虚连接：让断裂的区域接回骨干',
      depth: '熟悉',
      minutes: 24,
      summary: '区域没有直连 Area 0 时，如何借道传输区域建立逻辑骨干链路，以及它的代价。',
      objectives: [
        '说清虚连接解决的是拓扑合规问题而非性能问题',
        '在两端 ABR 上正确配置 vlink-peer',
        '判断传输区域不能是 STUB 或 NSSA 的原因',
        '在虚连接与调整物理拓扑之间做出取舍',
      ],
      keywords: ['虚连接', 'vlink-peer', 'Transit Area', 'Area 0', 'ABR'],
      blocks: [
        {
          type: 'paragraph',
          text: 'OSPF 规定所有非骨干区域必须连接到 Area 0。现实中常见一种历史遗留拓扑：某个区域只连到了另一个非骨干区域，物理上无法直接改线。虚连接（Virtual Link）在两条 ABR 之间建立一条逻辑上的骨干链路，让这个区域「看起来」挂在了 Area 0 上，从而恢复 Type 3 的正常传递。',
        },
        {
          type: 'analogy',
          title: '借第三地中转的航班',
          text: '两家分公司之间没有直飞航班，只能买到第三地中转的联程票。第三地必须同时与两端通航，这就是传输区域（Transit Area）：它既不属于起点也不属于终点，但必须能承载两端的 OSPF 报文。中转本身不改变两地的隶属关系，只是让行程在逻辑上连了起来。',
        },
        {
          type: 'steps',
          title: '配置虚连接的前提与顺序',
          items: [
            { title: '确认传输区域', text: '两端 ABR 必须有一个共同的、非 STUB 非 NSSA 的区域作为传输区域。' },
            { title: '确认底层可达', text: '两端 ABR 的 Router-ID 地址必须能通过传输区域内的路由互相到达，虚连接本身不提供底层连通性。' },
            { title: '两端互指', text: '在传输区域的 area 视图下，用 vlink-peer 指向对方的 Router-ID，两端都要配。' },
            { title: '验证状态', text: 'display ospf vlink 看到 Full，且原断裂区域的路由能以 Inter-area 形式出现。' },
          ],
        },
        {
          type: 'code',
          title: '在传输区域 Area 1 中建立虚连接',
          lang: 'vrp',
          code: `ospf 1 router-id 1.1.1.1
 area 0.0.0.1
  vlink-peer 2.2.2.2
 quit
 quit`,
        },
        {
          type: 'output',
          title: 'display ospf vlink 验证虚连接',
          text: `OSPF Process 1 with Router ID 1.1.1.1
                 Virtual Links

 Virtual-link Neighbor-ID  ->  2.2.2.2, Neighbor-State: Full

 Interface: 10.0.1.1 (GigabitEthernet0/0/0)
 Cost: 1  State: P-2-P  Type: Virtual
 Transit Area: 0.0.0.1
 Timers: Hello 10, Dead 40, Retransmit 5, Transmit Delay 1`,
        },
        {
          type: 'table',
          title: '虚连接与 GRE 隧道的取舍',
          columns: ['对比项', '虚连接', 'GRE 隧道'],
          rows: [
            ['本质', 'OSPF 逻辑链路，逻辑上属于 Area 0', '真实隧道接口，需要单独编址'],
            ['配置量', '两端各一条 vlink-peer', '两端隧道接口、地址、路由'],
            ['对传输区域要求', '必须是非 STUB、非 NSSA 的普通区域', '只要求底层 IP 可达'],
            ['故障影响', '传输区域抖动会直接传导到虚连接', '隧道状态独立，但多一层封装开销'],
          ],
        },
        {
          type: 'warning',
          title: '虚连接不是设计首选',
          text: '虚连接依赖传输区域的路由，传输区域一旦抖动，虚连接和它承载的骨干路由会一起抖；它还增加了排错时的逻辑跳数。更重要的是，传输区域不能是 STUB 或 NSSA，因为这些区域会过滤 Type 3，虚连接所需的区域间路由根本传不过去。能用物理链路或重新规划区域解决的，不要用虚连接长期兜底。',
        },
        {
          type: 'tip',
          title: '虚连接排错三看',
          text: '一看 display ospf vlink 是否 Full；二看两端 vlink-peer 是否互指对方 Router-ID，且 Router-ID 在传输区域内确实可达；三看传输区域是否被误配成 stub 或 nssa。如果状态一直 Down，先 ping 对方 Router-ID 地址，再检查区域认证是否在传输区域启用。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm03-l08',
      moduleId: 'm03',
      title: '路由汇总与过滤',
      depth: '精通',
      minutes: 32,
      summary: '在 ABR 汇总 Type 3、在 ASBR 汇总 Type 5，再用过滤控制进出。',
      objectives: [
        '区分 abr-summary 与 asbr-summary 的作用位置和范围',
        '用 not-advertise 隐藏特定网段',
        '说明 filter-policy 与汇总对 LSDB 的不同影响',
        '判断汇总后为何仍能看到本地明细路由',
      ],
      keywords: ['abr-summary', 'asbr-summary', 'filter-policy', '路由过滤', 'not-advertise'],
      blocks: [
        {
          type: 'paragraph',
          text: '一个区域里有几百条连续的 /24 网段时，如果每条都以 Type 3 或 Type 5 泛洪出去，其他区域的 LSDB 和路由表都会被撑大，任何一条明细抖动都可能触发 SPF。汇总（summarization）把连续网段合并成一条更短前缀的通告，既压缩表项，也让明细变化被屏蔽在汇总边界之内。',
        },
        {
          type: 'analogy',
          title: '快递集包',
          text: '同城有几十个网点，发往外地时不会每个网点单独贴一张面单，而是先集包到城市分拨中心，面单只写「发往某市」。收件方只需要知道这个城市怎么走，不需要知道城市里每个网点。代价是包裹的具体来源被隐藏了，所以汇总必须保证地址连续、归属清晰。',
        },
        {
          type: 'table',
          title: '四种控制手段',
          columns: ['手段', '配置位置', '作用范围', '注意事项'],
          rows: [
            ['abr-summary', 'ABR 的 area 视图', '其他区域看到的 Type 3', '只汇总本区域产生的 Type 3，明细被抑制'],
            ['asbr-summary', 'ASBR 的 ospf 视图', '整个 AS 的 Type 5', '要求外部地址连续，否则会引入不可达前缀'],
            ['filter-policy import', 'ospf 视图', '本机路由表', '只影响本机装表，不改变 LSDB'],
            ['filter-policy export', 'ospf 视图', '本机产生的外部路由', '过滤后再以 Type 5 通告出去'],
          ],
        },
        {
          type: 'code',
          title: 'ABR 汇总区域路由，ASBR 汇总外部路由',
          lang: 'vrp',
          code: `ospf 1
 area 0.0.0.1
  abr-summary 10.1.0.0 255.255.0.0
 quit
 asbr-summary 172.16.0.0 255.255.0.0
 quit`,
        },
        {
          type: 'output',
          title: '汇总后其他区域 LSDB 中的 Type 3',
          text: `OSPF Process 1 with Router ID 2.2.2.2
                 Link State Database

                         Area: 0.0.0.0
 Type       LinkState ID   AdvRouter        Age  Len   Sequence   Metric
 Sum-Net    10.1.0.0       2.2.2.2          132  28    80000003       2`,
        },
        {
          type: 'warning',
          title: '汇总不删除本地明细',
          text: 'abr-summary 生效后，ABR 只是不再向其他区域通告明细 Type 3，本区域内的明细路由依然存在，ABR 自己的路由表也仍是明细。看到「ABR 上有明细、邻居只有汇总」属于正常现象，不要误判为汇总失败。真正要确认的是其他区域的 display ospf lsdb 里是否只剩汇总条目。',
        },
        {
          type: 'tip',
          title: '先用 display ospf routing 核对覆盖范围',
          text: '配置汇总前，用 display ospf routing 确认明细网段确实连续且都属于同一区域；用 abr-summary 的 not-advertise 参数可以阻止某段路由外泄，相当于用汇总做路由隐藏。汇总前缀不要覆盖未分配的地址空间，否则其他区域会把流量送到 ABR 再被丢弃。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm03-l09',
      moduleId: 'm03',
      title: '路由引入与默认路由',
      depth: '熟悉',
      minutes: 26,
      summary: '把直连、静态和其他协议的路由翻译成 Type 5/7，并控制类型、开销与防环。',
      objectives: [
        '用 import-route 引入直连、静态和 RIP 路由',
        '区分 Type 1 与 Type 2 外部路由的开销计算方式',
        '正确使用 default-route-advertise 下发默认路由',
        '识别双点双向引入的环路风险',
      ],
      keywords: ['路由引入', 'import-route', 'Type 1', 'Type 2', 'default-route-advertise'],
      blocks: [
        {
          type: 'paragraph',
          text: 'OSPF 只认识自己 LSDB 里的信息，直连、静态、RIP、BGP 的路由对它来说都是外部世界。路由引入（redistribution）就是把这部分路由翻译成 OSPF 的 Type 5 LSA，由 ASBR 负责翻译和通告。翻译时还可以附加开销、类型和 tag，用来影响其他路由器的选路。',
        },
        {
          type: 'analogy',
          title: '会场里的同声传译',
          text: '外部协议说的是另一种语言，OSPF 区域内的路由器听不懂。ASBR 就是翻译官：把外部网段翻译成 OSPF 能理解的 LSA，并且决定「这句话有多重要」（metric）、「算不算直达」（Type 1 或 Type 2）。翻译官不在场，外面再多的信息也传不进来。',
        },
        {
          type: 'table',
          title: '外部路由的两种度量类型',
          columns: ['类型', '开销计算', '适用场景', '配置'],
          rows: [
            ['Type 1', '外部开销 + 本机到 ASBR 的内部开销', '外部与内部开销量级可比，希望选路更精细', 'import-route static type 1'],
            ['Type 2（默认）', '只比较外部开销，内部开销不计入', '外部网段多、希望统一按引入值比较', 'import-route static type 2'],
          ],
        },
        {
          type: 'code',
          title: 'R3 引入外部路由并下发默认路由',
          lang: 'vrp',
          code: `ospf 1 router-id 3.3.3.3
 import-route direct
 import-route static
 import-route rip 1 cost 20 type 2 tag 100
 default-route-advertise always
 area 0.0.0.0
  network 10.0.2.0 0.0.0.255
 quit
 quit`,
        },
        {
          type: 'output',
          title: 'display ospf routing 查看 ASE 路由',
          text: `OSPF Process 1 with Router ID 3.3.3.3
 Routing Tables

 Routing for ASEs
 Destination        Cost      Type       Tag         NextHop         AdvRouter
 172.16.0.0/16      20        Type2      100         10.0.2.2        3.3.3.3

 Total Nets: 1
 Intra Area: 0  Inter Area: 0  ASE: 1  NSSA: 0`,
        },
        {
          type: 'paragraph',
          text: 'default-route-advertise 让 ASBR 向 OSPF 下发一条 0.0.0.0/0 的 Type 5。默认情况下，ASBR 自己的路由表里必须先有一条默认路由（静态或动态），否则命令不生效；加 always 表示无条件下发。always 很有用，但也是最容易把流量引向黑洞的开关，下发前必须确认 ASBR 真的具备出口。',
        },
        {
          type: 'warning',
          title: '双点双向引入容易绕环',
          text: '两台 ASBR 同时把 OSPF 引入 RIP、又把 RIP 引入 OSPF 时，一条外部路由可能在两个协议之间来回翻译，形成次优路径甚至环路。标准做法是用 route-policy 配合 tag 标记来源：从 RIP 引入时打 tag，回程引入时拒绝带该 tag 的路由。只靠调整 metric 不能彻底解决，必须做来源识别。',
        },
        {
          type: 'tip',
          title: '引入前先确认路由确实存在',
          text: 'import-route static 只引入路由表中已存在的静态路由；如果静态路由因为下一跳不可达而没有激活，OSPF 里什么都不会出现。排错顺序是：display ip routing-table 确认源路由存在，再 display ospf lsdb 看 Type 5 是否生成，最后 display ospf routing 看 ASE 是否被计算。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm03-l10',
      moduleId: 'm03',
      title: 'OSPF 常见故障排查实战',
      depth: '精通',
      minutes: 36,
      summary: '按邻居、LSDB、路由、转发的顺序，定位五类高频故障并给出修复动作。',
      objectives: [
        '建立固定的 OSPF 分层排查顺序',
        '根据邻居停留状态反推根因',
        '区分「邻居 Full 但没路由」的多种原因',
        '用 display ospf error 与日志快速取证',
      ],
      keywords: ['排错', '邻居卡住', 'MTU', '区域不匹配', '认证', 'display ospf error'],
      blocks: [
        {
          type: 'paragraph',
          text: 'OSPF 故障的表象往往都是「不通」，但根因可能在第 2 层、Hello 协商、LSDB 同步、SPF 计算或路由过滤中的任何一层。有效的排查不是把命令挨个敲一遍，而是固定顺序、逐层排除：先确认邻居状态，再看 LSDB 是否一致，再看路由是否被计算，最后才怀疑转发与策略。',
        },
        {
          type: 'analogy',
          title: '排错像医院分诊',
          text: '先量体温、血压这些基础指标（邻居和接口），再做针对性检查（LSDB 和错误计数），最后才决定怎么处理（改配置）。一上来就改 MTU 或重启进程，相当于没分诊就开刀，既破坏了现场证据，也可能把小问题扩大成全楼断网。',
        },
        {
          type: 'steps',
          title: '六步排查法',
          items: [
            { title: '看邻居', text: 'display ospf peer，记录每个邻居的状态、区域和 DR 角色。' },
            { title: '看接口', text: 'display ospf interface，确认接口已进入 OSPF、网络类型、MTU、定时器和 DR 角色。' },
            { title: '看错误', text: 'display ospf error，按报文类型看认证、区域、掩码、MTU 的错误计数。' },
            { title: '看 LSDB', text: 'display ospf lsdb，确认预期 LSA 是否存在、AdvRouter 是否正确。' },
            { title: '看路由', text: 'display ospf routing，确认路由是否被计算、是 Intra、Inter 还是 ASE。' },
            { title: '看转发', text: 'display ip routing-table 与 ping、tracert，确认最优路由与真正转发路径。' },
          ],
        },
        {
          type: 'table',
          title: '五类高频故障对照',
          columns: ['现象', '常见原因', '处置动作'],
          rows: [
            ['邻居停在 Init', '单向 Hello：ACL 拦截 224.0.0.5、认证不一致、只有一端宣告网段', '检查 ACL 与 authentication，确认两端 network 覆盖接口'],
            ['卡在 ExStart / Exchange', '接口 MTU 不一致、Router-ID 重复', '对比 display ospf interface 的 MTU，改一致或临时 mtu-ignore'],
            ['只有 2-Way 且学不到路由', 'DROther 之间正常；若与 DR 也 2-Way，多为区域号、掩码、定时器不一致', '核对 area、ip address 掩码、hello/dead'],
            ['邻居 Full 但缺路由', '区域类型不一致、filter-policy、接口被 silent、汇总抑制', '查 stub/nssa 配置、filter-policy、display ospf lsdb'],
            ['外部路由时有时无', '引入源路由抖动、双点双向环路、Type 2 开销不当', '用 tag 与 route-policy 防环，固定引入源'],
          ],
        },
        {
          type: 'code',
          title: '修复 MTU 不一致导致的 ExStart 卡死',
          lang: 'vrp',
          code: `interface GigabitEthernet0/0/0
 ospf mtu-ignore
 quit
ospf 1
 area 0.0.0.0
  network 10.0.1.0 0.0.0.255
 quit
 quit`,
        },
        {
          type: 'output',
          title: 'display ospf error 定位认证与 MTU 问题',
          text: `OSPF Process 1 with Router ID 1.1.1.1
                 OSPF error statistics

 Interface: GigabitEthernet0/0/0 (10.0.1.1)
 -------------------- Packet error --------------------
   Hello packet errors:
     Bad authentication type      : 0
     Bad authentication key       : 27
     Bad area id                  : 0
     Bad net mask                 : 0
     Bad hello interval           : 0
     Bad dead interval            : 0
     Bad option field             : 0
   DD packet errors:
     Bad MTU                      : 18`,
        },
        {
          type: 'warning',
          title: 'mtu-ignore 只是止血',
          text: 'ospf mtu-ignore 能让邻居跳过 MTU 检查并到达 Full，但它不解决 MTU 不一致本身。如果两端真的差 100 字节，大包经过这段链路仍会被丢弃，表现为 ping 小包通、大包不通、TCP 建连卡住。正确顺序是先把两端 MTU 改成一致，再决定是否需要该命令作为过渡。',
        },
        {
          type: 'tip',
          title: '认证与区域号错误也看 Hello',
          text: '区域号不匹配和认证失败都发生在 Hello 阶段，现象几乎一样：邻居停在 Init 或根本看不到邻居。区别在 display ospf error：Bad area id 增长说明区域号不一致，Bad authentication key 增长说明密钥或认证模式不一致。区域认证要在 area 视图配 authentication-mode，接口认证在接口下配，二者不能混用。',
        },
        {
          type: 'checklist',
          title: '故障交接前必须留下的证据',
          items: [
            '故障时间点与受影响网段、方向',
            '两端相关接口的 display ospf interface 输出',
            'display ospf peer 与 display ospf error 输出',
            'display ospf lsdb 与 display ospf routing 关键条目',
            '最近一次变更记录（区域、认证、MTU、策略）',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
