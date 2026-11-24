import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm02',
  code: 'M02',
  title: '路由基础与静态路由',
  summary:
    '讲清路由器如何转发：路由表怎么读、直连路由从哪来、静态路由怎么写、默认路由与浮动静态如何做备份，以及最长匹配与 RIB、FIB 的关系。每课都有一台路由器的可复制配置与验证命令。',
  stage: 'L1',
  order: 2,
  goals: [
    '读懂路由表的目的网段、协议、优先级与下一跳',
    '配置路由器接口并理解直连路由的生成条件',
    '独立配置静态路由、默认路由与浮动静态路由',
    '使用最长匹配原则解释实际选路结果',
    '通过 ping、tracert 与路由表完成基础排错',
  ],
  keywords: ['路由表', '直连路由', '静态路由', '默认路由', '浮动静态', '最长匹配', 'RIB', 'FIB'],
  lessons: [
    {
      id: 'm02-l01',
      moduleId: 'm02',
      title: '路由是什么：路由表与逐跳转发',
      depth: '了解',
      minutes: 16,
      summary: '用一张表解释路由器如何决定数据往哪走，以及什么是下一跳。',
      objectives: [
        '说出路由表中目的网段、协议、优先级、下一跳的含义',
        '解释逐跳转发与 TTL 的作用',
        '理解同网段交付与跨网段转发对 MAC 地址的不同处理',
      ],
      keywords: ['路由', '路由表', '下一跳', '逐跳转发', 'TTL'],
      blocks: [
        {
          type: 'paragraph',
          text: '路由器收到一个包，并不会记住整条路径，它只做一件事：拿目的 IP 去路由表里查，找到最合适的一条记录，然后从这个记录指定的接口、发给指定的下一跳。下一跳收到后再查自己的表，一跳一跳接力，直到到达目的网段。这就是逐跳转发。',
        },
        {
          type: 'analogy',
          title: '导航软件与路牌',
          text: '你不需要记住从家到公司的每一个路口，只需要知道“先上高速、在杭州出口下”。导航里的每一段指令就相当于一条路由，下一跳就是下一个要到达的路口。到了路口再看下一块路牌，继续走。',
        },
        {
          type: 'table',
          title: '路由表六个关键字段',
          columns: ['字段', '含义', '举例'],
          rows: [
            ['Destination/Mask', '目的网络与掩码', '192.168.2.0/24'],
            ['Proto', '这条路由从哪来', 'Direct、Static、OSPF、BGP'],
            ['Pre', '优先级，数值越小越优先', '直连 0，静态 60'],
            ['Cost', '同协议内的度量值', '静态通常为 0'],
            ['NextHop', '下一跳地址', '10.0.0.2'],
            ['Interface', '从哪个接口发出去', 'GigabitEthernet0/0/1'],
          ],
        },
        {
          type: 'interactive',
          key: 'arp-switch',
          caption: '观察跨网段访问时，目的 MAC 如何从主机地址变成网关地址',
        },
        {
          type: 'output',
          title: '读一张真实的路由表',
          text: `<Huawei>display ip routing-table
Route Flags: R - relay, D - download to fib
------------------------------------------------------------------------------
Destination/Mask    Proto   Pre  Cost      Flags NextHop         Interface

192.168.1.0/24      Direct  0    0           D   192.168.1.1     GigabitEthernet0/0/0
192.168.2.0/24      Static  60   0          RD   10.0.0.2        GigabitEthernet0/0/1
10.0.0.0/30         Direct  0    0           D   10.0.0.1        GigabitEthernet0/0/1
0.0.0.0/0           Static  60   0          RD   10.0.0.2        GigabitEthernet0/0/1`,
        },
        {
          type: 'tip',
          title: '路由是逐跳的，不是端到端的',
          text: '每台路由器只对自己这一跳负责。上游路由器认为下一跳可达，不代表后面的路径一定通。排错时要一段一段验证，而不是只 ping 最终目的地址。',
        },
        {
          type: 'warning',
          title: '有路由不代表一定能通',
          text: '路由表里有目的网段，只说明本机知道往哪发，不代表对端有回程路由、也不代表中间链路正常。单向路由是初学者最常见的坑：去包能到，回包回不来，现象就是 ping 不通。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm02-l02',
      moduleId: 'm02',
      title: '直连路由与接口配置',
      depth: '熟悉',
      minutes: 20,
      summary: '配置路由器物理接口，理解直连路由自动生成的条件与路由表的变化。',
      objectives: [
        '完成接口地址与状态配置',
        '解释直连路由生成的两个前提',
        '在路由表中识别直连路由及其 32 位主机路由',
      ],
      keywords: ['直连路由', '接口配置', 'undo shutdown', '主机路由', '物理状态'],
      blocks: [
        {
          type: 'paragraph',
          text: '路由器刚上电时路由表是空的。给接口配上 IP 地址并保证物理链路正常，设备会自动生成一条直连路由，告诉路由器“这个网段就在我身上，可以直接送达”。所以直连路由不需要手工写，但必须同时满足两个条件：接口物理状态 up，协议状态 up。',
        },
        {
          type: 'analogy',
          title: '路由器像十字路口',
          text: '每个接口就是通向一个方向的路。接口插好网线、对端也正常，路才算通；在系统里把接口打开，相当于把路障搬走。路通了，路口自然就知道“这条街归我管”，不必再额外贴告示，这就是直连路由。',
        },
        {
          type: 'steps',
          title: '接口配置三步',
          items: [
            { title: '进入接口', text: '在系统视图中执行 interface GigabitEthernet0/0/0 进入指定接口。' },
            { title: '配置地址', text: '使用 ip address 192.168.1.1 24 写入地址与掩码。' },
            { title: '打开接口', text: '执行 undo shutdown 确保接口没有被管理性关闭。' },
          ],
        },
        {
          type: 'code',
          title: '两台路由器对接的基础配置',
          lang: 'vrp',
          code: `system-view
sysname R1
interface GigabitEthernet0/0/0
 ip address 192.168.1.1 24
 undo shutdown
 quit
interface GigabitEthernet0/0/1
 ip address 10.0.0.1 30
 undo shutdown
 quit
display ip interface brief`,
        },
        {
          type: 'output',
          title: '接口状态与自动生成的直连路由',
          text: `<Huawei>display ip interface brief
Interface                    IP Address/Mask      Physical   Protocol
GigabitEthernet0/0/0         192.168.1.1/24       up         up
GigabitEthernet0/0/1         10.0.0.1/30          up         up

<Huawei>display ip routing-table
Destination/Mask    Proto   Pre  Cost      Flags NextHop         Interface

192.168.1.0/24      Direct  0    0           D   192.168.1.1     GigabitEthernet0/0/0
192.168.1.1/32      Direct  0    0           D   127.0.0.1       GigabitEthernet0/0/0
10.0.0.0/30         Direct  0    0           D   10.0.0.1        GigabitEthernet0/0/1
10.0.0.1/32         Direct  0    0           D   127.0.0.1       GigabitEthernet0/0/1`,
        },
        {
          type: 'table',
          title: '直连路由的三个特征',
          columns: ['特征', '说明', '排错提示'],
          rows: [
            ['协议为 Direct', '由接口地址自动生成', '看不到就要查接口状态'],
            ['优先级为 0', '所有协议中最高', '不会被静态或动态路由覆盖'],
            ['附带 32 位主机路由', '指向本机地址，下一跳为 127.0.0.1', '属于正常现象，不必删除'],
          ],
        },
        {
          type: 'warning',
          title: '接口没打开，路由就不会出现',
          text: '配置了地址但忘记 undo shutdown，接口物理状态会是 down，直连路由不会生成。另一种常见情况是对端没开机或网线损坏，此时本端也可能显示 down。先用 display interface 看两层状态。',
        },
        {
          type: 'tip',
          title: '先看 brief 再看明细',
          text: 'display ip interface brief 能一眼看到所有接口的地址和 up 或 down 状态，适合快速定位。确认接口正常后再看 display interface 的详细计数，排查错包和丢包。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm02-l03',
      moduleId: 'm02',
      title: '静态路由：手工告诉路由器怎么走',
      depth: '熟悉',
      minutes: 22,
      summary: '掌握静态路由的配置格式，能完成双路由器互通并验证去程与回程。',
      objectives: [
        '写出目的网段、掩码、下一跳正确的静态路由',
        '理解静态路由默认优先级 60 的含义',
        '用 ping 与路由表验证双向互通',
      ],
      keywords: ['静态路由', 'ip route-static', '下一跳', '回程路由', '优先级'],
      blocks: [
        {
          type: 'paragraph',
          text: '直连路由只能覆盖自己接口所在的网段。要去更远的地方，必须有人告诉路由器“那个网段从哪个方向走”。静态路由就是管理员手工写下的一条指路记录，格式是去往某个目的网段、走某个下一跳。它不消耗计算资源，但网络变化时不会自动调整。',
        },
        {
          type: 'analogy',
          title: '手写的路标',
          text: '在没有导航的年代，路口会立一块木牌，写着“杭州方向往右”。木牌不会自己更新，路断了也不会变。静态路由就是这块木牌：简单、直观、可控，但需要人维护。',
        },
        {
          type: 'code',
          title: '两台路由器互写静态路由',
          lang: 'vrp',
          code: `system-view
sysname R1
ip route-static 192.168.2.0 255.255.255.0 10.0.0.2
quit
display ip routing-table protocol static

system-view
sysname R2
ip route-static 192.168.1.0 255.255.255.0 10.0.0.1
quit
display ip routing-table protocol static`,
        },
        {
          type: 'output',
          title: '静态路由出现在路由表中',
          text: `<Huawei>display ip routing-table protocol static
Public routing table : Static
         Destinations : 1        Routes : 1        Configured Routes : 1

Static routing table status : <Active>
         Destinations : 1        Routes : 1

Destination/Mask    Proto   Pre  Cost      Flags NextHop         Interface

192.168.2.0/24      Static  60   0          RD   10.0.0.2        GigabitEthernet0/0/1`,
        },
        {
          type: 'table',
          title: '静态路由参数含义',
          columns: ['参数', '含义', '示例'],
          rows: [
            ['目的网段', '要到达的网络地址', '192.168.2.0'],
            ['掩码', '目的网段的掩码，也可写成前缀长度', '255.255.255.0 或 24'],
            ['下一跳', '把包交给哪台设备的接口地址', '10.0.0.2'],
            ['preference', '可选，优先级，默认 60', 'preference 70'],
            ['出接口', '可选，指定从哪个接口发出', 'GigabitEthernet0/0/1'],
          ],
        },
        {
          type: 'steps',
          title: '验证静态路由是否真正生效',
          items: [
            { title: '查路由表', text: '确认目的网段存在且状态为 Active，下一跳正确。' },
            { title: 'ping 目的地址', text: '从本端带源地址 ping 对端业务地址，确认去程可达。' },
            { title: '查对端回程', text: '在对端执行 display ip routing-table，确认有回来的路由。' },
            { title: '看路径', text: '用 tracert 确认流量确实经过预期的下一跳。' },
          ],
        },
        {
          type: 'warning',
          title: '只配单向路由等于没配',
          text: '静态路由必须双向配置。R1 有去往 192.168.2.0 的路由，但 R2 没有回 192.168.1.0 的路由，ping 依然不通。初学者最常见的错误就是只在一台设备上敲了命令就以为大功告成。',
        },
        {
          type: 'tip',
          title: '下一跳优先用对端接口地址',
          text: '写下一跳时用对端与自己直连的接口地址，不要写出接口名称代替，除非是点对点链路。写成出接口会让路由器对每个目的地址都发 ARP，既低效又容易出问题。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm02-l04',
      moduleId: 'm02',
      title: '默认路由与浮动静态路由',
      depth: '熟悉',
      minutes: 22,
      summary: '用默认路由简化出口配置，用浮动静态路由实现主备链路自动切换。',
      objectives: [
        '解释默认路由 0.0.0.0/0 的匹配含义',
        '配置主备两条静态路由并设置不同优先级',
        '验证主链路故障后备份路由自动生效',
      ],
      keywords: ['默认路由', '浮动静态路由', 'preference', '主备切换', '0.0.0.0/0'],
      blocks: [
        {
          type: 'paragraph',
          text: '如果一台路由器只有一个出口通往外网，就没必要为每个公网网段写一条静态路由，直接写一条默认路由 0.0.0.0/0 即可，含义是“所有在路由表里找不到更精确匹配的流量，都从这里走”。浮动静态路由则是在主路由之外再写一条同目的、但优先级更差的备份路由，平时不进路由表，主路由失效时才顶上来。',
        },
        {
          type: 'analogy',
          title: '主干道与备用小路',
          text: '每天上班走主干道，导航里还存着一条绕行小路。主干道正常时导航不会提小路，只有主干道封路，小路才被启用。浮动静态路由就是那条优先级更低、平时不显示的备用路线。',
        },
        {
          type: 'code',
          title: '默认路由加浮动静态备份',
          lang: 'vrp',
          code: `system-view
sysname R1
ip route-static 0.0.0.0 0.0.0.0 10.0.0.2
ip route-static 0.0.0.0 0.0.0.0 10.0.0.6 preference 70
quit
display ip routing-table
display ip routing-table protocol static`,
        },
        {
          type: 'table',
          title: '常见路由协议默认优先级',
          columns: ['路由来源', '默认优先级', '说明'],
          rows: [
            ['直连 Direct', '0', '最高，接口存在即生效'],
            ['OSPF', '10', '动态路由，优先于静态'],
            ['IS-IS', '15', '动态路由'],
            ['静态 Static', '60', '手工配置，默认值'],
            ['RIP', '100', '距离矢量协议'],
            ['BGP', '255', '通常只在没有其他路由时使用'],
          ],
        },
        {
          type: 'output',
          title: '主路由生效时，备份路由不出现在路由表',
          text: `<Huawei>display ip routing-table
Destination/Mask    Proto   Pre  Cost      Flags NextHop         Interface

0.0.0.0/0           Static  60   0          RD   10.0.0.2        GigabitEthernet0/0/1
192.168.1.0/24      Direct  0    0           D   192.168.1.1     GigabitEthernet0/0/0

<Huawei>display ip routing-table protocol static
Static routing table status : <Inactive>
Destination/Mask    Proto   Pre  Cost      Flags NextHop         Interface

0.0.0.0/0           Static  70   0           D   10.0.0.6        GigabitEthernet0/0/2`,
        },
        {
          type: 'warning',
          title: '默认路由配错会形成环路或黑洞',
          text: '两台路由器互相把默认路由指向对方，去往未知网段的流量就会在两者之间来回打转，直到 TTL 耗尽。默认路由只应指向真正的出口，不要形成互相指向的闭环。',
        },
        {
          type: 'tip',
          title: '验证主备切换要真的断主链路',
          text: '配置完不要只看显示，应该 shutdown 主链路接口，等几秒再看路由表是否切换到优先级 70 的备份路由，然后恢复接口确认能切回。只配不验，故障时才发现备份没生效。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm02-l05',
      moduleId: 'm02',
      title: '最长匹配与 RIB、FIB：看清选路结果',
      depth: '熟悉',
      minutes: 24,
      summary: '用最长匹配原则解释多条路由并存时到底选哪条，并区分 RIB 与 FIB。',
      objectives: [
        '解释最长匹配为什么优先于优先级',
        '说出 RIB 与 FIB 的差别及各自用途',
        '用路由表与 FIB 反推实际转发路径',
      ],
      keywords: ['最长匹配', '掩码长度', 'RIB', 'FIB', '路由查找'],
      blocks: [
        {
          type: 'paragraph',
          text: '路由表里经常同时存在默认路由、汇总路由和明细路由。路由器选路的第一原则不是优先级，而是最长匹配：在所有能匹配目的地址的路由中，选掩码最长、最精确的那一条。只有掩码长度相同时，才比较优先级和度量值。',
        },
        {
          type: 'analogy',
          title: '地址写得越详细越先送到',
          text: '快递面单上如果只写“浙江省”，只能送到省分拣中心；写了“浙江省杭州市西湖区”，就能送到区；再写到具体街道门牌，才能送到家门口。收件地址越精确，投递路径越具体，最长匹配就是这个道理。',
        },
        {
          type: 'interactive',
          key: 'subnet-calculator',
          caption: '比较 /8、/16、/24 三种前缀对同一个目的地址的匹配范围',
        },
        {
          type: 'table',
          title: '目的地址 10.1.2.5 的候选路由',
          columns: ['候选路由', '能否匹配', '掩码长度', '结果'],
          rows: [
            ['0.0.0.0/0', '能', '0', '最后备选'],
            ['10.0.0.0/8', '能', '8', '不如 /16 精确'],
            ['10.1.0.0/16', '能', '16', '不如 /24 精确'],
            ['10.1.2.0/24', '能', '24', '最终选中'],
          ],
        },
        {
          type: 'steps',
          title: '一次路由查找的四个动作',
          items: [
            { title: '提取目的 IP', text: '从 IP 头部取出目的地址，例如 10.1.2.5。' },
            { title: '逐条匹配', text: '把目的地址与每条路由的掩码相与，比较是否等于该路由的网络号。' },
            { title: '选最长前缀', text: '在全部匹配成功的路由中，选择掩码最长的一条。' },
            { title: '下发转发表', text: '选中结果被下发到 FIB，硬件按 FIB 完成实际转发。' },
          ],
        },
        {
          type: 'output',
          title: '直接查询某个目的地址走哪条路由',
          text: `<Huawei>display ip routing-table 10.1.2.5
Route Flags: R - relay, D - download to fib
------------------------------------------------------------------------------
Destination/Mask    Proto   Pre  Cost      Flags NextHop         Interface

10.1.2.0/24         Static  60   0          RD   10.0.0.2        GigabitEthernet0/0/1

<Huawei>display fib 10.1.2.5
Destination/Mask   Nexthop         Flag  TimeStamp     Interface
10.1.2.0/24        10.0.0.2        SU    2026-11-12    GigabitEthernet0/0/1`,
        },
        {
          type: 'table',
          title: 'RIB 与 FIB 的分工',
          columns: ['对比项', 'RIB 路由表', 'FIB 转发表'],
          rows: [
            ['作用', '收集所有路由并选出最优', '指导实际报文转发'],
            ['内容', '包含 Active 与 Inactive 路由', '只保留最终生效条目'],
            ['查看命令', 'display ip routing-table', 'display fib'],
            ['更新方式', '路由协议计算后更新', '由 RIB 择优后下发'],
          ],
        },
        {
          type: 'warning',
          title: '默认路由会抢走本该明细转发的流量',
          text: '如果明细路由因为接口 down 被撤销，流量会掉到默认路由上，看起来网络没断，实际却绕到了错误的出口。排错时不能只看“有路由”，要确认命中的是不是你期望的那一条。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
