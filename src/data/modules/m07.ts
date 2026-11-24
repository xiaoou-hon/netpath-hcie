import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm07',
  code: 'M07',
  title: '高可用与 WAN/MPLS',
  summary:
    '业务不能停：VRRP 做主备网关，BFD 把故障检测压到毫秒；骨干侧用 MPLS 标签交换替代逐跳查表，再用 L3VPN 把客户路由彻底隔离；最后看 SRv6 如何用 IPv6 地址承载路径指令。',
  stage: 'L3',
  order: 7,
  goals: [
    '设计 VRRP 与 BFD 联动的主备网关和双机热备方案',
    '说明 MPLS 标签栈、LER/LSR 与 LDP 的分配与转发过程',
    '配置 MPLS L3VPN 的 VRF、RD/RT 与 MP-BGP 邻居',
    '在 PE 上按控制面与转发面分层定位 VPN 故障',
    '解释 SRv6 的 SID 结构以及相对 MPLS 的取舍',
  ],
  keywords: ['VRRP', 'BFD', '双机热备', 'MPLS', 'LDP', 'L3VPN', 'VRF', 'RD/RT', 'MP-BGP', 'SRv6'],
  lessons: [
    {
      id: 'm07-l01',
      moduleId: 'm07',
      title: 'VRRP 主备网关：虚拟 MAC 与抢占',
      depth: '熟悉',
      minutes: 24,
      summary: '多台路由器共享一个虚拟 IP 与虚拟 MAC，优先级最高者成为 Master，故障时秒级切换。',
      objectives: [
        '解释 VRID、虚拟 MAC 与 Master、Backup 的关系',
        '配置优先级、抢占延迟与上行链路跟踪',
        '用 display vrrp 判断主备状态与切换原因',
      ],
      keywords: ['VRRP', 'VRID', '虚拟 MAC', '抢占', 'Master'],
      blocks: [
        {
          type: 'paragraph',
          text: '如果所有终端都把默认网关指向同一台路由器，这台设备一坏，整个网段立刻断网，而终端自己不会自动改网关。VRRP 让多台路由器组成一个虚拟路由器，共享同一个虚拟 IP 和虚拟 MAC，终端只认这个虚拟网关。持有虚拟地址的那台叫 Master，其余是 Backup，Master 故障时 Backup 在数秒内接管。',
        },
        {
          type: 'analogy',
          title: '两个柜台共用一个叫号屏',
          text: '银行开了两个柜台，但对外只挂一个「3 号窗口」的牌子。平时 A 柜员在牌子后面办业务，B 柜员在旁边待命。A 临时离岗，B 立刻走到牌子后面继续叫号，客户完全不用换号。虚拟 IP 就是那块牌子，A 和 B 谁站在牌子后面，谁就是 Master。',
        },
        {
          type: 'kv',
          items: [
            { label: 'VRID', value: '虚拟路由器标识，1 到 255，同一网段内必须唯一' },
            { label: '虚拟 MAC', value: '0000-5e00-01XX，XX 为 VRID 的十六进制，终端 ARP 学到的是它' },
            { label: 'Master', value: '持有虚拟 IP，响应 ARP，周期性发送 VRRP 通告' },
            { label: 'Backup', value: '只监听通告，超过 Master_Down_Interval 未收到就参与选举' },
          ],
        },
        {
          type: 'code',
          title: '主设备配置：优先级 120 并跟踪上行接口',
          lang: 'vrp',
          code: `interface GigabitEthernet0/0/0
 ip address 192.168.1.252 255.255.255.0
 vrrp vrid 1 virtual-ip 192.168.1.254
 vrrp vrid 1 priority 120
 vrrp vrid 1 preempt-mode timer delay 20
 vrrp vrid 1 track interface GigabitEthernet0/0/1 reduced 30
quit`,
        },
        {
          type: 'code',
          title: '备设备配置：保持默认优先级 100',
          lang: 'vrp',
          code: `interface GigabitEthernet0/0/0
 ip address 192.168.1.253 255.255.255.0
 vrrp vrid 1 virtual-ip 192.168.1.254
quit`,
        },
        {
          type: 'table',
          title: 'VRRP 的状态与计时器',
          columns: ['项目', '取值', '说明'],
          rows: [
            ['Initialize', '初始状态', '接口 down 或刚配置完，尚未参与选举'],
            ['Master', '转发状态', '持有虚拟 IP，每 1 秒发一次通告'],
            ['Backup', '监听状态', '收到通告就重置定时器，超时则切换'],
            ['通告间隔', '默认 1 秒', '可调整，过小会增加协议开销'],
            ['Master_Down_Interval', '约 3.6 秒', '3 倍通告间隔加偏移时间，非地址拥有者生效'],
          ],
        },
        {
          type: 'interactive',
          key: 'vrrp-failover',
          caption: '断开主设备上行链路，观察优先级扣减与主备切换过程',
        },
        {
          type: 'output',
          title: '查看 VRRP 主备状态',
          text: `<AR1> display vrrp
GigabitEthernet0/0/0 | Virtual Router 1
    State : Master
    Virtual IP : 192.168.1.254
    Master IP : 192.168.1.252
    PriorityRun : 120
    PriorityConfig : 120
    MasterPriority : 120
    Preempt : YES   Delay Time : 20 s
    TimerRun : 1 s
    TimerConfig : 1 s
    Virtual MAC : 0000-5e00-0101
    Check TTL : YES
    Config type : normal-vrrp
    Track interface : GE0/0/1  State : UP  Priority reduced : 30`,
        },
        {
          type: 'warning',
          title: '抢占延迟不是可选项',
          text: '如果 Master 恢复后立刻抢回虚拟 IP，而上行 OSPF 还没收敛，就会出现几秒钟「网关在、但流量出不去」的黑洞。配置 20 到 60 秒的抢占延迟，或者直接用 track 联动上行接口，等链路真正可用再切回。优先级相同时比较接口 IP，大的成为 Master，这一点在规划时也要避免意外。',
        },
        {
          type: 'tip',
          title: 'reduced 值要大于优先级差',
          text: 'track interface 触发后会扣减优先级，扣减值必须让 Master 低于 Backup 才会切换。主 120、备 100 时，reduced 至少 21。如果配成 10，接口断了但优先级仍是 110，备机不会接管，故障看起来像「切换失效」。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm07-l02',
      moduleId: 'm07',
      title: 'BFD 联动与双机热备',
      depth: '精通',
      minutes: 30,
      summary: 'BFD 用毫秒级探测替代协议自带的慢检测，配合 VRRP 与路由联动实现快速切换。',
      objectives: [
        '说明 BFD 会话的建立方式与控制报文机制',
        '配置静态 BFD 会话并与 VRRP 联动',
        '列出双机热备方案的四个关键要素',
      ],
      keywords: ['BFD', '快速检测', 'VRRP 联动', '双机热备', '会话同步'],
      blocks: [
        {
          type: 'paragraph',
          text: 'OSPF 默认 Hello 10 秒、死亡 40 秒，BGP 的 Hold Time 通常 90 秒。对核心业务来说，等四十秒才知道邻居没了，切换早就超时了。BFD 是一个独立的轻量检测协议，不关心上层跑的是什么，只负责用毫秒级间隔双向发包，一旦连续丢失就通知上层协议。它把「检测」和「收敛」解耦，让各种协议共用一套快速故障发现机制。',
        },
        {
          type: 'analogy',
          title: '心电监护与护士查房',
          text: '路由协议自带的检测像护士每五分钟查一次房，病人中途出问题要等下一轮才发现。BFD 像床旁心电监护仪，每秒都在看波形，异常立刻报警。监护仪不负责治疗，它只负责「喊人」，真正处理故障的还是 VRRP、OSPF 这些上层协议。',
        },
        {
          type: 'table',
          title: 'BFD 的三个关键参数',
          columns: ['参数', '含义', '常用取值'],
          rows: [
            ['min-tx-interval', '本端发送 BFD 控制报文的最小间隔', '100 到 300 毫秒'],
            ['min-rx-interval', '本端期望收到报文的最小间隔', '100 到 300 毫秒'],
            ['detect-multiplier', '连续丢失多少个报文判定故障', '3 到 5'],
          ],
        },
        {
          type: 'code',
          title: '配置静态 BFD 会话',
          lang: 'vrp',
          code: `bfd
 quit
bfd to_peer bind peer-ip 10.0.0.2 source-ip 10.0.0.1
 discriminator local 1
 discriminator remote 2
 min-tx-interval 100
 min-rx-interval 100
 detect-multiplier 3
 commit
quit`,
        },
        {
          type: 'code',
          title: 'VRRP 跟踪 BFD 会话',
          lang: 'vrp',
          code: `interface GigabitEthernet0/0/0
 vrrp vrid 1 track bfd-session session-name to_peer reduced 40
quit`,
        },
        {
          type: 'output',
          title: '查看 BFD 会话状态',
          text: `<AR1> display bfd session all
Local Remote     PeerIpAddr      State     Type        InterfaceName
--------------------------------------------------------------------------------
1     2          10.0.0.2        Up        Static-IP   GigabitEthernet0/0/1

     Total UP/DOWN Session Number : 1/0`,
        },
        {
          type: 'warning',
          title: '检测间隔不是越小越好',
          text: '把间隔压到 10 毫秒、倍数设为 2，链路只要抖动一下就切主备，业务反而更不稳。BFD 的检测时间要小于上层协议的收敛时间，但要大于链路的正常抖动范围。跨运营商长距离链路通常用 300 毫秒乘 3，园区内可以到 100 毫秒乘 3。上线前用真实流量压测，不要照抄模板。',
        },
        {
          type: 'steps',
          items: [
            {
              title: '网关冗余',
              text: '用 VRRP 提供虚拟网关，主备设备接口地址与虚拟地址在同一网段，终端只配置虚拟地址。',
            },
            {
              title: '快速检测',
              text: '在主备之间的直连或管理链路建立 BFD 会话，把检测时间压到百毫秒级，替代 VRRP 默认的秒级超时。',
            },
            {
              title: '状态与会话同步',
              text: '防火墙做双机热备时，除了 VRRP 还要同步会话表与配置，否则切换后已建立的连接会全部重建。',
            },
            {
              title: '上下行联动',
              text: '用 track 同时跟踪上行接口与 BFD 会话，任一方向失效都触发切换，避免「下行通、上行断」的假可用。',
            },
          ],
        },
        {
          type: 'tip',
          title: 'BFD 也可以联动路由协议',
          text: 'BFD 不只服务 VRRP。OSPF 与 BGP 都能绑定 BFD，邻居故障时不必等 Hello 超时，路由表立刻撤销。配置顺序是先建 BFD 会话，再在协议进程里开启 bfd all-interfaces enable 或按邻居开启。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm07-l03',
      moduleId: 'm07',
      title: 'MPLS 标签转发：LER、LSR 与标签栈',
      depth: '精通',
      minutes: 32,
      summary: 'MPLS 在入口压入标签，中间设备只交换标签不再查路由表，出口前弹栈恢复 IP 转发。',
      objectives: [
        '说明 FEC、LER、LSR、LSP 与标签栈的关系',
        '配置 mpls lsr-id 与 LDP，并验证会话与标签绑定',
        '解释标签转发相对于逐跳查表的优势与代价',
      ],
      keywords: ['MPLS', '标签栈', 'LER', 'LSR', 'LDP', 'LSP'],
      blocks: [
        {
          type: 'paragraph',
          text: '传统 IP 转发每经过一跳都要做最长匹配查表，骨干设备必须维护全量路由，报文每到一台设备就重新决策一次。MPLS 换了个思路：在入口一次性决定路径，给报文贴一个定长标签，中间设备只看标签转发，不再关心里面装的是什么 IP。定长精确匹配比最长匹配快，更重要的是标签可以承载路由之外的策略，例如流量工程与 VPN。',
        },
        {
          type: 'analogy',
          title: '集包袋上的编号',
          text: '快递中转场不会让每个员工记住全国每个门牌号。发件时把同一目的地的包裹装进集包袋，写上集包编号；中转场只看袋号决定下一站，到了目的地附近再拆袋按门牌派送。标签就是集包编号，LER 是发件网点，LSR 是中转场，倒数第二跳拆袋（PHP）后，末跳只需按 IP 派送。',
        },
        {
          type: 'heading',
          text: '标签长什么样',
          level: 3,
        },
        {
          type: 'table',
          title: '一个 MPLS 标签的 4 个字节',
          columns: ['字段', '位数', '作用'],
          rows: [
            ['Label', '20 位', '标签值，0 到 1048575，决定转发行为'],
            ['EXP', '3 位', '实验位，现多用于承载优先级或流量类别'],
            ['S', '1 位', '栈底标志，1 表示这是最内层标签'],
            ['TTL', '8 位', '防环与 traceroute 使用，每跳减一'],
          ],
        },
        {
          type: 'kv',
          items: [
            { label: 'FEC', value: '转发等价类，标签分配的最小单位，通常对应一条路由' },
            { label: 'LER', value: '标签边缘路由器，负责压栈与弹栈，连接 IP 域与 MPLS 域' },
            { label: 'LSR', value: '标签交换路由器，只用入标签查表换出标签，不查 IP 路由' },
            { label: 'LSP', value: '标签交换路径，单向，由一串入标签与出标签的映射组成' },
            { label: 'LIB / LFIB', value: '标签信息库记录所有分配，转发信息库只保留真正用于转发的条目' },
          ],
        },
        {
          type: 'steps',
          items: [
            {
              title: 'Push 压栈',
              text: '入口 LER 根据目的地址找到 FEC，压入对应的标签，可以压一层也可以压多层。',
            },
            {
              title: 'Swap 交换',
              text: '每台 LSR 拿入标签查 LFIB，换成出标签并从对应接口发出，全过程不看目的 IP。',
            },
            {
              title: 'Pop 弹栈',
              text: '倒数第二跳执行 PHP 弹出标签，出口 LER 收到纯 IP 包后按普通路由转发给客户网络。',
            },
          ],
        },
        {
          type: 'code',
          title: '配置 MPLS 与 LDP',
          lang: 'vrp',
          code: `mpls lsr-id 1.1.1.1
mpls
mpls ldp
quit
interface GigabitEthernet0/0/1
 ip address 10.0.0.1 255.255.255.252
 mpls
 mpls ldp
quit`,
        },
        {
          type: 'output',
          title: '查看 LDP 会话',
          text: `<LSR1> display mpls ldp session
 LDP Session(s) in Public Network
 Codes: LAM(Label Advertisement Mode), SsnAge Unit: DDD:HH:MM
 A '*' before a session means the session is being deleted.

 PeerID             Status      LAM  SsnRole  SsnAge      KASent/Rcv
--------------------------------------------------------------------------------
 2.2.2.2:0          Operational DU   Passive  0000:00:12  48/48`,
        },
        {
          type: 'output',
          title: '查看标签交换路径',
          text: `<LSR1> display mpls lsp
-------------------------------------------------------------------------------
LSP Information: LDP LSP
-------------------------------------------------------------------------------
FEC                In/Out Label    In/Out IF                      Vrf Name
10.0.0.4/32        3/NULL          GE0/0/1/-
2.2.2.2/32         NULL/3          -/GE0/0/1`,
        },
        {
          type: 'warning',
          title: '标签会占 MTU，PHP 也会让抓包看起来 abnormal',
          text: '每层标签占 4 字节，MTU 1500 的链路上大包可能因加标签而分片，规划时要确认接口 MTU 或开启大包处理。另外 PHP 由倒数第二跳执行，末跳只收到纯 IP 包，抓包时会看到「标签突然消失」，这是正常行为而不是配置错误。',
        },
        {
          type: 'tip',
          title: '为什么用标签而不是查路由表',
          text: '标签是定长字段，硬件可以用精确匹配一次查到出接口，避免最长匹配的多级查找；标签栈还能一次性表达多层意图，例如外层负责到达对端 PE、内层负责区分客户 VPN。换句话说，标签不只是「更快的路由」，它把转发决策从目的地址解耦出来，才有了流量工程和 L3VPN。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm07-l04',
      moduleId: 'm07',
      title: 'MPLS L3VPN：VRF、RD/RT 与 MP-BGP',
      depth: '精通',
      minutes: 34,
      summary: 'PE 用 VRF 隔离客户路由表，RD 让重叠前缀变唯一，RT 决定路由导入导出。',
      objectives: [
        '说明 VRF、RD、RT 各自解决什么问题',
        '配置 VPN 实例、接口绑定与 MP-BGP VPNv4 邻居',
        '用 display ip vpn-instance 与 display bgp vpnv4 all peer 验证',
      ],
      keywords: ['L3VPN', 'VRF', 'RD', 'RT', 'MP-BGP', 'VPNv4'],
      blocks: [
        {
          type: 'paragraph',
          text: '两个客户都把内网规划成 192.168.1.0/24，这是最常见的私网地址复用。如果直接跑 MP-BGP，BGP 会认为是同一条前缀而互相覆盖。L3VPN 的解法是三层隔离：VRF 把每个客户的路由表和接口分开，RD 在传递时给前缀加上唯一前缀，RT 则像分发规则，告诉 PE 这条路由该进入哪些客户的 VRF。',
        },
        {
          type: 'analogy',
          title: '同一栋楼里的两个 101',
          text: '写字楼里 A 公司和 B 公司都有 101 室。快递只写 101 一定送错，所以面单上必须写「A 公司 101」，这就是 RD。前台墙上贴着收件规则：A 公司的件只放 A 公司货架，这就是 RT。楼是同一栋，路由由同一张骨干网传递，但两家的货架完全分开，谁也看不到谁。',
        },
        {
          type: 'table',
          title: '三个概念的分工',
          columns: ['概念', '作用', '是否参与选路'],
          rows: [
            ['VRF', '每个客户一张独立路由表与一组接口', '不参与，只做隔离'],
            ['RD', '8 字节，拼在前缀前让重叠地址全局唯一', '不参与，只做区分'],
            ['RT', 'BGP 扩展团体属性，控制路由导入与导出', '决定路由去向'],
          ],
        },
        {
          type: 'steps',
          items: [
            {
              title: '控制面：PE 之间传 VPNv4',
              text: '入口 PE 从 VRF 学到客户 IPv4 路由，加上 RD 变成 VPNv4 前缀，通过 MP-BGP 传给对端 PE，同时携带 RT 作为扩展团体属性。',
            },
            {
              title: '控制面：对端按 RT 导入',
              text: '对端 PE 收到 VPNv4 路由后，拿 RT 与各 VRF 的 import vpn-target 匹配，匹配成功就导入该 VRF 并去掉 RD。',
            },
            {
              title: '转发面：两层标签',
              text: '入口 PE 查 VRF 表得到内层标签，再用 LDP 分配的外层标签到达对端 PE。外层负责在骨干上转发，内层负责在对端 PE 上区分客户。',
            },
            {
              title: '转发面：出口交付',
              text: '出口 PE 弹掉外层标签，按内层标签或直接查 VRF 表找到出接口，把报文交给 CE。',
            },
          ],
        },
        {
          type: 'code',
          title: '创建 VPN 实例并绑定接口',
          lang: 'vrp',
          code: `ip vpn-instance CUST_A
 ipv4-family
  route-distinguisher 100:1
  vpn-target 100:1 both
 quit
quit
interface GigabitEthernet0/0/2
 ip binding vpn-instance CUST_A
 ip address 192.168.1.1 255.255.255.0
quit`,
        },
        {
          type: 'code',
          title: '配置 MP-BGP VPNv4 邻居与 PE-CE 邻居',
          lang: 'vrp',
          code: `bgp 100
 router-id 1.1.1.1
 peer 3.3.3.3 as-number 100
 peer 3.3.3.3 connect-interface LoopBack0
 ipv4-family vpnv4
  peer 3.3.3.3 enable
 quit
 ipv4-family vpn-instance CUST_A
  peer 192.168.1.2 as-number 65001
 quit
quit`,
        },
        {
          type: 'output',
          title: '查看 VPN 实例',
          text: `<PE1> display ip vpn-instance CUST_A
  VPN-Instance Name and ID : CUST_A, 1
  Route Distinguisher : 100:1
  Description :
  Export VPN Targets :
    100:1
  Import VPN Targets :
    100:1
  Interface : GigabitEthernet0/0/2`,
        },
        {
          type: 'output',
          title: '查看 VPNv4 邻居',
          text: `<PE1> display bgp vpnv4 all peer

 BGP local router ID : 1.1.1.1
 Local AS number : 100
 Total number of peers : 2

  Peer            V    AS  MsgRcvd  MsgSent  OutQ  Up/Down       State  PrefRcv
  3.3.3.3         4   100       42       44     0 00:21:08 Established    1`,
        },
        {
          type: 'warning',
          title: 'RD 写错和 RT 写错，现象完全不同',
          text: 'RD 只负责让前缀唯一，写错 RD 通常不会导致不通，只会产生重复前缀或对端出现意外条目；RT 才决定导入导出，RT 不匹配的典型现象是「邻居 Established、VPNv4 路由也收到了，但对端 VRF 里就是没有路由」。排查时先看 RT，再怀疑 RD。',
        },
        {
          type: 'tip',
          title: '分两层看，不要一锅查',
          text: '先在 PE 上 display bgp vpnv4 all routing-table 看控制面是否收到前缀，再 display ip routing-table vpn-instance 看是否导入 VRF。前者有、后者无，八成是 RT 或 import 策略问题；两者都有但 ping 不通，问题就转到标签转发或 PE-CE 链路上。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm07-l05',
      moduleId: 'm07',
      title: 'PE-CE 路由交互与 VPN 排错',
      depth: '熟悉',
      minutes: 26,
      summary: 'PE-CE 之间可用静态、OSPF 或 BGP，不同选择影响路由规模与故障域，双 PE 还要防环。',
      objectives: [
        '根据客户网络规模选择合适的 PE-CE 路由方案',
        '在 VRF 内配置 OSPF 与静态路由并验证',
        '按控制面与转发面四步定位 VPN 不通',
      ],
      keywords: ['PE-CE', 'VRF 路由', 'OSPF 防环', 'DN 位', 'sham-link'],
      blocks: [
        {
          type: 'paragraph',
          text: 'L3VPN 只负责在 PE 之间传递客户路由，PE 与 CE 之间怎么交换路由，是另一件事。客户可能只有几条静态网段，也可能是一个完整的 OSPF 域，还可能通过 BGP 多归属接入。选错方案不会立刻不通，但会在网络扩张时带来路由数量爆炸或防环困难。',
        },
        {
          type: 'analogy',
          title: '分店与总部的三种记账方式',
          text: '静态路由像分店每天手工报一个固定数字，简单但改一次要通知所有人；OSPF 像片区内的分店互相对账，谁家有变化自动传开；BGP 像集团与加盟商签合同，条款可控但流程复杂。业务规模决定了该用哪种账本，而不是哪种技术更高级。',
        },
        {
          type: 'table',
          title: '三种 PE-CE 方案对比',
          columns: ['方案', '适用场景', '优点与代价'],
          rows: [
            ['静态路由', '客户网段少、拓扑稳定', '配置简单、无协议交互，扩展性差'],
            ['OSPF', '客户已有 OSPF 域且规模中等', '动态收敛，需处理双 PE 防环'],
            ['BGP', '客户多归属、需要路由策略', '可控性强，配置与排障复杂度高'],
          ],
        },
        {
          type: 'code',
          title: '在 VRF 内运行 OSPF',
          lang: 'vrp',
          code: `ospf 1 vpn-instance CUST_A router-id 192.168.1.1
 area 0
  network 192.168.1.0 0.0.0.255
  network 10.10.0.0 0.0.255.255
 quit
quit`,
        },
        {
          type: 'code',
          title: 'VRF 内配置静态路由并引入 BGP',
          lang: 'vrp',
          code: `ip route-static vpn-instance CUST_A 10.10.0.0 255.255.0.0 192.168.1.2
quit
bgp 100
 ipv4-family vpn-instance CUST_A
  import-route static
 quit
quit`,
        },
        {
          type: 'output',
          title: '查看 VRF 路由表',
          text: `<PE1> display ip routing-table vpn-instance CUST_A
Route Flags: R - relay, D - download to fib
------------------------------------------------------------------------------
Routing Tables: CUST_A
         Destinations : 3        Routes : 3

Destination/Mask    Proto   Pre  Cost      Flags NextHop         Interface

       10.10.0.0/16  OSPF    150  1           D   192.168.1.2     GE0/0/2
      192.168.1.0/24 Direct  0    0           D   192.168.1.1     GE0/0/2
    192.168.1.1/32   Direct  0    0           D   127.0.0.1       GE0/0/2`,
        },
        {
          type: 'warning',
          title: '双 PE 接同一客户 OSPF 会形成环路',
          text: '一条路由可能从 PE1 进入 MPLS，再从 PE2 以 OSPF 形式回到客户网络，客户设备又把它传回 PE1，形成三层环路。华为用 DN 位标记从 MP-BGP 学来的 OSPF 路由，PE 不再把它发布回客户域；跨域或特殊场景则用 sham-link 解决。只配通不防环，故障会在业务高峰期才暴露。',
        },
        {
          type: 'steps',
          items: [
            {
              title: '查 VRF 与接口绑定',
              text: 'display ip vpn-instance 确认实例存在，接口已 ip binding vpn-instance 且有地址。接口没绑定是最高频的低级错误。',
            },
            {
              title: '查 PE-CE 邻居',
              text: 'OSPF 用 display ospf peer，BGP 用 display bgp vpn-instance CUST_A peer，确认状态为 Full 或 Established。',
            },
            {
              title: '查 VPNv4 控制面',
              text: 'display bgp vpnv4 all routing-table 确认对端 PE 是否收到目标前缀，以及 RT 是否正确携带。',
            },
            {
              title: '查 VRF 导入与转发',
              text: 'display ip routing-table vpn-instance 确认路由进入 VRF，再用 ping -vpn-instance 与 tracert -vpn-instance 验证端到端。',
            },
          ],
        },
        {
          type: 'tip',
          title: 'ping 一定要带实例',
          text: '在 PE 上直接 ping 客户地址，走的是公网路由表，结果必然不通，容易误判。正确命令是 ping -vpn-instance CUST_A 10.10.0.1。同理，tracert 与 display fib 也要指定实例，否则看到的是另一张表。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm07-l06',
      moduleId: 'm07',
      title: 'SRv6 概览：用 IPv6 地址当指令',
      depth: '熟悉',
      minutes: 22,
      summary: 'SRv6 把路径编码进 IPv6 扩展头，每个 SID 就是一个可编程指令，简化协议栈与跨域。',
      objectives: [
        '说明 SID 的 Locator、Function、Arguments 结构',
        '对比 SR-MPLS 与 SRv6 的封装与运维差异',
        '说出 SRv6 在现网落地的主要限制',
      ],
      keywords: ['SRv6', 'SID', 'Segment List', 'SRH', 'Locator'],
      blocks: [
        {
          type: 'paragraph',
          text: 'MPLS 只有 20 位标签，标签空间有限，跨域要重新分配，而且标签本身没有语义，只能靠约定。SRv6 换成 128 位 IPv6 地址作为 SID，把整条路径写进报文的 Segment List，每经过一个节点就执行该 SID 对应的函数，例如 End、End.X、End.DT4。地址即指令，网络因此变得可编程，也更容易与控制器配合。',
        },
        {
          type: 'analogy',
          title: '出发前写好行程单',
          text: '以前的出差方式是每到一个城市再问下一站怎么走，像逐跳查路由表。SRv6 像出发前就把「北京、郑州、武汉、广州」写在行程单上，每到一个城市划掉一行，不必再问路。行程单就是 Segment List，每个城市就是一个 SID，划掉一行的动作就是更新 Segment Left。',
        },
        {
          type: 'table',
          title: 'SR-MPLS 与 SRv6 的对比',
          columns: ['维度', 'SR-MPLS', 'SRv6'],
          rows: [
            ['封装', '4 字节标签栈', 'IPv6 头加 SRH 扩展头'],
            ['标识长度', '20 位标签', '128 位 IPv6 地址'],
            ['跨域', '需要标签分配与域间协商', '地址全局唯一，天然可跨域'],
            ['可编程性', '有限，依赖标签语义约定', 'SID 即函数，扩展性强'],
            ['硬件要求', '成熟，普遍支持', '需要芯片支持 SRv6 与部分 SID 行为'],
          ],
        },
        {
          type: 'kv',
          items: [
            { label: 'Locator', value: '可路由的 IPv6 前缀，用于把流量引到该节点' },
            { label: 'Function', value: '节点上执行的指令，如 End、End.X、End.DT4' },
            { label: 'Arguments', value: '可选参数，例如 VPN 实例标识或出接口信息' },
            { label: 'Segment List', value: '有序 SID 列表，存放在 SRH 中，决定报文经过的路径' },
          ],
        },
        {
          type: 'code',
          title: '配置 SRv6 Locator 与 Opcode',
          lang: 'vrp',
          code: `segment-routing ipv6
 locator LOC1 ipv6-prefix 2001:DB8:1:: 64 static 32
  opcode ::1 end
  opcode ::2 end.x
 quit
quit
isis 1
 ipv6 enable topology ipv6
 segment-routing ipv6 locator LOC1
quit`,
        },
        {
          type: 'output',
          title: '查看 SRv6 Locator',
          text: `<PE1> display segment-routing ipv6 locator
Locator Name   : LOC1
Locator Prefix : 2001:DB8:1::/64
Static Length  : 32
Opcode         : ::1   End
Opcode         : ::2   End.X`,
        },
        {
          type: 'warning',
          title: 'SRH 有开销，芯片能力要逐块确认',
          text: 'SRH 大约带来 40 字节的额外开销，路径越长、SID 越多开销越大，MTU 与分片必须提前评估。更关键的是硬件：部分老单板只支持少数 SID 行为，或者命中 SRv6 时走软件转发导致性能骤降。采购与上线前要看具体单板的能力矩阵，不要只看宣传页上的「支持 SRv6」。',
        },
        {
          type: 'tip',
          title: '先把 MPLS 学透，再看 SRv6',
          text: 'SRv6 与 SR-MPLS 的思维模型高度相似：都是源路由，都在入口决定路径，都在中间节点按标识转发。区别只是标识从标签换成了地址。理解标签栈的压、换、弹，再理解 Segment List 的逐段处理，会轻松很多。现网中两者往往长期共存，边界做映射即可。',
        },
        {
          type: 'checklist',
          title: '评估 SRv6 落地时问自己',
          items: [
            '现网设备与单板是否支持所需的 SID 行为，转发是硬件还是软件',
            'Locator 规划是否与现有 IGP 路由和地址规划冲突',
            'MTU 与分片策略是否覆盖 SRH 开销',
            '运维工具能否解析 SRH，故障定位手段是否齐全',
            '是否有明确的业务场景，而不是为了技术而技术',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
