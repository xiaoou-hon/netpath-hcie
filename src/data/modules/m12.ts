import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm12',
  code: 'M12',
  title: 'IPv6 与网络服务',
  summary:
    'IPv6 是现网演进的必然方向。本模块从 128 位地址结构与 ICMPv6、NDP 讲起，覆盖地址配置、DHCPv6、OSPFv3 与过渡技术，并补齐 DHCP、DNS、NTP、SSH、SNMP 和日志等基础服务。',
  stage: 'L2',
  order: 12,
  goals: [
    '读懂 IPv6 地址结构，独立完成地址规划与接口配置',
    '用 ICMPv6、NDP 与 DHCPv6 完成地址分配与终端接入',
    '配置 IPv6 静态路由与 OSPFv3，并验证邻居与选路结果',
    '根据现网条件选择双栈、隧道或 NAT64 过渡方案',
    '部署 DHCP、DNS、NTP、SSH、SNMP 与日志等可运维基础服务',
  ],
  keywords: [
    'IPv6',
    'ICMPv6',
    'NDP',
    'DHCPv6',
    'OSPFv3',
    '双栈',
    'NAT64',
    'SNMP',
  ],
  lessons: [
    {
      id: 'm12-l01',
      moduleId: 'm12',
      title: 'IPv6 地址结构与地址类型',
      depth: '了解',
      minutes: 18,
      summary: '从 128 位地址、前缀与接口标识讲起，理清单播、组播、任播与常见地址段的使用边界。',
      objectives: [
        '说出 IPv6 地址 128 位与前缀长度的含义',
        '区分 GUA、ULA、链路本地与组播地址的使用范围',
        '按简写规则正确书写一个 IPv6 地址',
      ],
      keywords: ['128 位', '前缀', 'GUA', 'ULA', '链路本地', 'EUI-64'],
      blocks: [
        {
          type: 'paragraph',
          text: 'IPv4 用 32 位表示地址，理论空间约 43 亿个，还要被分类地址、私网地址和保留段切走一部分。IPv6 把地址长度扩展到 128 位，写成 8 组、每组 4 位十六进制数，用冒号分隔，例如 2001:db8:12::1。地址空间大到可以为几乎每一台设备分配一个全球可路由地址，NAT 也就从必需品变回可选的过渡手段。',
        },
        {
          type: 'paragraph',
          text: '一个 IPv6 地址由前缀和接口标识两部分组成。前缀相当于 IPv4 的网络号，决定设备在哪个子网；接口标识（Interface ID）标识子网内的具体接口。现网普遍规划为 /64：前 64 位是前缀，后 64 位留给接口。这个固定划分不是习惯，而是无状态自动配置能工作的前提，路由器只通告 /64 前缀，主机自己补齐后 64 位。',
        },
        {
          type: 'analogy',
          title: '完整地址与前台转接',
          text: 'IPv6 地址像一行写全的快递地址：前半段是省市区，沿途路由器只看这一段决定往哪送；后半段是门牌号，交给最后一跳去敲门。IPv4 更像只写了几位数字的简写，经常要靠 NAT 这位前台帮忙转接，外面永远看不到里面的真实门牌。',
        },
        {
          type: 'table',
          title: '常见地址类型与前缀',
          columns: ['类型', '前缀或示例', '作用', '可否全球路由'],
          rows: [
            ['全球单播 GUA', '2000::/3，如 2001:db8:12::1', '公网可路由的单播地址，由运营商或注册机构分配', '是'],
            ['唯一本地 ULA', 'fc00::/7，常用 fd00::/8', '类似 IPv4 私网，仅限组织内部使用', '否'],
            ['链路本地', 'fe80::/10', '同一链路上的自动地址，协议报文与下一跳常用', '否，路由器不转发'],
            ['组播', 'ff00::/8，如 ff02::1', '一对多通信，替代 IPv4 广播', '按 scope 而定'],
            ['环回与未指定', '::1 与 ::', '本机回环；地址未配置时的源地址', '否'],
          ],
        },
        {
          type: 'list',
          title: '地址简写的三条规则',
          items: [
            '每组开头的 0 可以省略，但组内至少要留一位，例如 0db8 写成 db8',
            '连续的全 0 组可以用一次双冒号压缩，例如 2001:0db8:0000:0000:0000:0000:0000:0001 写成 2001:db8::1',
            '同一地址中双冒号只能出现一次，否则无法还原每组 0 的数量',
            '前缀用斜杠加长度表示，例如 /64、/128，不要写成 255.255.255.0 这种点分掩码',
          ],
        },
        {
          type: 'code',
          title: '启用 IPv6 并配置全球单播地址',
          lang: 'vrp',
          code: `system-view
sysname R1
ipv6
interface GigabitEthernet0/0/0
 ipv6 enable
 ipv6 address 2001:db8:12::1/64
 quit
interface LoopBack0
 ipv6 enable
 ipv6 address 2001:db8:1::1/128
 quit`,
        },
        {
          type: 'output',
          title: 'display ipv6 interface 查看地址与组播组',
          text: `[R1]display ipv6 interface GigabitEthernet0/0/0
GigabitEthernet0/0/0 current state : UP
IPv6 protocol current state : UP
IPv6 is enabled, link-local address is FE80::2E0:FCFF:FE12:3401
  Global unicast address(es):
    2001:DB8:12::1, subnet is 2001:DB8:12::/64
  Joined group address(es):
    FF02::1
    FF02::2
    FF02::1:FF00:1
  MTU is 1500 bytes
  ND reachable time is 30000 milliseconds
  ND retransmit interval is 1000 milliseconds`,
        },
        {
          type: 'warning',
          title: '链路本地地址不能当业务地址用',
          text: 'fe80::/10 只在本地链路有效，路由器不会转发以它为源或目的的报文。用 ping 测试链路本地地址时必须指定出接口，例如 ping ipv6 fe80::2e0:fcff:fe12:3402 -i GigabitEthernet0/0/0，否则设备不知道从哪条链路发出去。规划业务地址时一律使用 GUA 或 ULA，链路本地只用于协议交互与下一跳。',
        },
        {
          type: 'tip',
          title: 'EUI-64 如何从 MAC 算出来',
          text: '取 48 位 MAC，在中间插入 fffe，再把第一个字节的 U/L 位取反。例如 MAC 00e0-fc12-3401 先变成 00e0:fcff:fe12:3401，第一位 00 取反后为 02，最终得到 02e0:fcff:fe12:3401。接口下用 ipv6 address 2001:db8:12::/64 eui-64 即可让设备按此规则自动生成后 64 位。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm12-l02',
      moduleId: 'm12',
      title: 'ICMPv6 与 NDP：地址解析与无状态自动配置',
      depth: '熟悉',
      minutes: 24,
      summary: 'NDP 用 ICMPv6 的 RS、RA、NS、NA 完成地址解析、无状态配置与重复地址检测。',
      objectives: [
        '说出 RS、RA、NS、NA 的发送者、目的地址与作用',
        '解释 NDP 如何替代 ARP 完成地址解析',
        '用命令查看邻居缓存与 RA 参数',
        '判断重复地址检测失败的典型现象',
      ],
      keywords: ['ICMPv6', 'NDP', 'RS', 'RA', 'DAD', '邻居缓存'],
      blocks: [
        {
          type: 'paragraph',
          text: 'IPv6 里没有 ARP，也没有广播。地址解析、路由器发现、地址自动配置和重复地址检测，全部由 ICMPv6 承载的一组报文完成，这组机制统称 NDP（Neighbor Discovery Protocol，邻居发现协议）。ICMPv6 不只是报错工具，它承担了 IPv4 中 ARP、ICMP 重定向和部分 DHCP 职能。',
        },
        {
          type: 'table',
          title: 'NDP 的四类核心报文',
          columns: ['报文', '类型号', '作用', '目的地址'],
          rows: [
            ['RS', '133', '主机启动或地址变化时询问本链路的路由器', 'ff02::2，所有路由器'],
            ['RA', '134', '通告前缀、标志位、默认网关与定时器', 'ff02::1，或单播回应主机'],
            ['NS', '135', '请求目标地址的链路层地址；DAD 也用它', '目标地址对应的请求节点组播'],
            ['NA', '136', '回应 NS，携带链路层地址与标志位', '请求者单播或请求节点组播'],
          ],
        },
        {
          type: 'analogy',
          title: '从楼道喊话到按门牌呼叫',
          text: 'ARP 像在楼道里大喊「谁是 192.168.1.1」，所有人都得听一耳朵；NDP 更像按门牌号定向呼叫，只有被叫到的那一户需要应答。请求节点组播地址 ff02::1:ffXX:XXXX 就是由目标地址后 24 位算出来的门牌，把打扰范围压到最小。',
        },
        {
          type: 'paragraph',
          text: '重复地址检测（DAD，Duplicate Address Detection）是地址启用前的必经一步。主机先从 :: 作为源地址，向该地址对应的请求节点组播发一个 NS；如果约 1 秒内没有收到声明该地址的 NA，就认为地址唯一并正式启用。若收到 NA，说明链路上已有人使用，地址被标记为冲突不可用，手工配置的地址会一直停在冲突状态，必须人工更换。',
        },
        {
          type: 'interactive',
          key: 'arp-switch',
          caption: '把 ARP 的广播请求换成 NS 的组播请求对照看：NDP 用组播收敛了泛洪范围，并顺带完成了地址唯一性检查。',
        },
        {
          type: 'code',
          title: '让接口发送 RA 并通告 /64 前缀',
          lang: 'vrp',
          code: `interface GigabitEthernet0/0/0
 ipv6 enable
 ipv6 address 2001:db8:12::1/64
 undo ipv6 nd ra halt
 ipv6 nd ra prefix 2001:db8:12::/64 2592000 604800
 quit`,
        },
        {
          type: 'output',
          title: 'display ipv6 neighbors 查看邻居缓存',
          text: `[R1]display ipv6 neighbors
IPv6 Address : 2001:DB8:12::2
Link-layer   : 00e0-fc12-3402  State : REACH  Age : 3
Interface    : GE0/0/0         VPN   : -

IPv6 Address : FE80::2E0:FCFF:FE12:3402
Link-layer   : 00e0-fc12-3402  State : STALE  Age : 21
Interface    : GE0/0/0         VPN   : -`,
        },
        {
          type: 'warning',
          title: 'RA 默认是关闭的',
          text: '华为设备接口下默认存在 ipv6 nd ra halt，接口不会主动发送 RA，主机自然学不到前缀。必须执行 undo ipv6 nd ra halt 才生效。另一个高频问题是前缀长度不是 /64：RA 中非 /64 的前缀会被主机忽略，SLAAC 直接失败，现象是主机只有链路本地地址。',
        },
        {
          type: 'tip',
          title: 'M 位与 O 位决定主机找谁要参数',
          text: 'RA 里的 M（Managed）置 1 表示地址通过 DHCPv6 获取，O（Other）置 1 表示 DNS 等其他参数通过 DHCPv6 获取。两位全 0 才是纯 SLAAC。很多「终端拿不到 DNS」的问题，根因就是只开了 RA 却没置 O 位，主机不知道还要去问 DHCPv6。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm12-l03',
      moduleId: 'm12',
      title: 'IPv6 地址配置与 DHCPv6',
      depth: '熟悉',
      minutes: 22,
      summary: '手工、EUI-64 与 DHCPv6 三种地址配置方式，以及有状态与无状态的分工。',
      objectives: [
        '用 eui-64 与手工方式配置全球单播地址',
        '区分 DHCPv6 有状态与无状态的适用场景',
        '完成 DHCPv6 服务器与地址池配置并验证',
      ],
      keywords: ['EUI-64', 'DHCPv6', '有状态', '无状态', 'RA 标志'],
      blocks: [
        {
          type: 'paragraph',
          text: 'IPv6 地址的来源比 IPv4 多：可以手工写死，可以让接口按 EUI-64 自动生成，也可以由路由器通过 RA 通告前缀、主机自己拼接（SLAAC），还可以由 DHCPv6 服务器统一分配。选择哪种方式，取决于这个地址是否需要长期稳定、是否需要集中审计，以及终端是否支持。',
        },
        {
          type: 'table',
          title: '五种地址获取方式对比',
          columns: ['方式', '后 64 位由谁生成', '需要服务器', '典型场景'],
          rows: [
            ['手工配置', '管理员指定完整地址', '否', '路由器互联、服务器、管理地址'],
            ['EUI-64', '接口按 MAC 自动生成', '否', '设备互联、临时调试'],
            ['SLAAC', '主机用 RA 前缀加随机数或 EUI-64', '只需路由器发 RA', '办公终端、物联网终端'],
            ['DHCPv6 有状态', 'DHCPv6 服务器分配地址与参数', '是', '需要统一管理和审计的终端'],
            ['DHCPv6 无状态', '地址仍由 SLAAC 生成，只取参数', '是，仅下发参数', '已有 SLAAC、只想统一下发 DNS'],
          ],
        },
        {
          type: 'analogy',
          title: '自取快递与送货上门',
          text: 'SLAAC 像物业在公告栏贴出小区门牌规则，住户自己按规则编门牌，不需要登记；DHCPv6 有状态像前台统一分配房间并登记入住，谁住哪间一查便知；无状态 DHCPv6 则是房间自己编，但前台负责告诉你餐厅和洗衣房在哪。',
        },
        {
          type: 'steps',
          title: 'DHCPv6 的四步交互',
          items: [
            { title: 'Solicit', text: '客户端向 ff02::1:2 组播，询问有哪些服务器可以提供服务。' },
            { title: 'Advertise', text: '服务器回应自己可提供的地址、租期与参数，客户端可能收到多份。' },
            { title: 'Request', text: '客户端选定一个服务器，请求确认使用对应的地址与参数。' },
            { title: 'Reply', text: '服务器确认分配，客户端拿到地址、租期与 DNS 等 Option 后开始使用。' },
          ],
        },
        {
          type: 'code',
          title: 'R1 作为 DHCPv6 服务器，同时下发地址与 DNS',
          lang: 'vrp',
          code: `dhcp enable
dhcpv6 pool P1
 address prefix 2001:db8:12::/64
 excluded-address 2001:db8:12::1
 dns-server 2001:db8:1::53
 quit
interface GigabitEthernet0/0/1
 ipv6 enable
 ipv6 address 2001:db8:12::1/64
 undo ipv6 nd ra halt
 ipv6 nd autoconfig managed-address-flag
 ipv6 nd autoconfig other-flag
 dhcpv6 server P1
 quit`,
        },
        {
          type: 'output',
          title: 'display ipv6 interface 确认 RA 标志与前缀',
          text: `[R1]display ipv6 interface GigabitEthernet0/0/1
GigabitEthernet0/0/1 current state : UP
IPv6 protocol current state : UP
IPv6 is enabled, link-local address is FE80::2E0:FCFF:FE12:3402
  Global unicast address(es):
    2001:DB8:12::1, subnet is 2001:DB8:12::/64
  Joined group address(es):
    FF02::1
    FF02::2
    FF02::1:2
    FF02::1:FF00:1
  ND router advertisement is enabled
  ND RA interval is 600 seconds, minimum interval is 200 seconds
  ND RA lifetime is 1800 seconds
  ND RA flags: managed-address-flag is set, other-flag is set
  ND RA prefix: 2001:DB8:12::/64, valid lifetime 2592000, preferred lifetime 604800`,
        },
        {
          type: 'warning',
          title: 'DHCPv6 不分配默认网关',
          text: 'IPv6 的默认网关只能来自 RA 中路由器的链路本地地址，DHCPv6 没有网关选项。因此即使地址由 DHCPv6 下发，接口上也必须 undo ipv6 nd ra halt，否则终端有地址却没有出口。同理，DHCPv6 有状态要求 RA 的 M 位置 1，只配地址池不发正确 RA，终端不会主动发起 Solicit。',
        },
        {
          type: 'tip',
          title: '用两条命令核对分配结果',
          text: 'display dhcpv6 pool 看地址池前缀、排除地址与已用数量；display dhcpv6 server 看服务器是否使能。终端侧在 Windows 用 ipconfig，在 Linux 用 ip -6 addr，重点确认地址是否过期、是否只有 fe80 开头。地址池前缀与接口所在网段不一致是最常见的配置错误。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm12-l04',
      moduleId: 'm12',
      title: 'IPv6 路由：静态路由与 OSPFv3',
      depth: '熟悉',
      minutes: 24,
      summary: 'IPv6 静态路由与 OSPFv3 的配置骨架、邻居验证与路由表检查方法。',
      objectives: [
        '配置 IPv6 静态路由并判断下一跳的写法',
        '在接口与区域中正确启用 OSPFv3',
        '用两条 display 命令确认邻居与路由',
        '说明 OSPFv3 与 OSPFv2 的主要差异',
      ],
      keywords: ['ipv6 route-static', 'OSPFv3', 'router-id', 'area 0', '链路本地'],
      blocks: [
        {
          type: 'paragraph',
          text: 'IPv6 的转发逻辑与 IPv4 一致：先看最长前缀匹配，再看管理距离与开销。区别在命令和协议细节。小规模或出口场景用静态路由最直接；需要动态收敛时用 OSPFv3，它把 OSPFv2 的链路状态机制搬到了 IPv6 上，但配置方式从「在进程里宣告网段」改成了「在接口上使能」。',
        },
        {
          type: 'analogy',
          title: '同一套交通规则，换了一种语言',
          text: 'OSPFv3 和 OSPFv2 是同一个交警体系：照样选 DR、照样洪泛 LSA、照样跑 SPF，只是工作语言从 IPv4 换成了 IPv6。所以会 OSPFv2 的人学 OSPFv3，重点不是重新理解协议，而是记住哪几条命令换了位置。',
        },
        {
          type: 'table',
          title: 'OSPFv2 与 OSPFv3 的关键差异',
          columns: ['对比项', 'OSPFv2', 'OSPFv3'],
          rows: [
            ['承载网络', 'IPv4', 'IPv6'],
            ['宣告方式', 'ospf 视图下 network 网段 反掩码', '接口下 ospfv3 1 area 0.0.0.0'],
            ['Router-ID', '32 位点分十进制', '仍是 32 位点分十进制，不是 IPv6 地址'],
            ['组播地址', '224.0.0.5 与 224.0.0.6', 'FF02::5 与 FF02::6'],
            ['地址解析', '依赖 ARP', '依赖 NDP'],
            ['认证', '报文头部自带认证字段', '依赖 IPv6 的 IPsec AH 与 ESP'],
          ],
        },
        {
          type: 'code',
          title: '配置 IPv6 静态路由',
          lang: 'vrp',
          code: `ipv6 route-static 2001:db8:2:: 64 2001:db8:12::2
ipv6 route-static 2001:db8:3:: 64 GigabitEthernet0/0/0 fe80::2e0:fcff:fe12:3402`,
        },
        {
          type: 'code',
          title: '在接口上启用 OSPFv3 并指定 Router-ID',
          lang: 'vrp',
          code: `ipv6
ospfv3 1
 router-id 1.1.1.1
 quit
interface GigabitEthernet0/0/0
 ipv6 enable
 ipv6 address 2001:db8:12::1/64
 ospfv3 1 area 0.0.0.0
 quit`,
        },
        {
          type: 'output',
          title: 'display ospfv3 peer 验证邻居',
          text: `[R1]display ospfv3 peer
OSPFv3 Process 1 with Router ID 1.1.1.1
 Neighbors

 Area 0.0.0.0 interface GigabitEthernet0/0/0's neighbors
 Router ID: 2.2.2.2        Pri: 1
   State: Full  Mode: Nbr is Master  Flag: -
   DR: 2001:DB8:12::1  BDR: 2001:DB8:12::2  MTU: 0
   Dead timer due in 35 sec
   Retrans Timer interval: 5
   Neighbor is up for 00:01:12`,
        },
        {
          type: 'output',
          title: 'display ipv6 routing-table 查看学习结果',
          text: `[R1]display ipv6 routing-table
Destination : 2001:DB8:2::/64
NextHop     : 2001:DB8:12::2
Preference  : 10
Cost        : 2
Protocol    : OSPFv3
RelayNextHop: ::              TunnelID : 0x0
Interface   : GigabitEthernet0/0/0

Destination : 2001:DB8:12::/64
NextHop     : ::
Preference  : 0
Cost        : 1
Protocol    : Direct
Interface   : GigabitEthernet0/0/0`,
        },
        {
          type: 'warning',
          title: 'OSPFv3 的 Router-ID 不是 IPv6 地址',
          text: 'OSPFv3 虽然只跑 IPv6，Router-ID 仍然是 32 位点分十进制，例如 1.1.1.1。直接写 router-id 2001:db8::1 会被设备拒绝。如果没手工指定，设备会尝试取一个 IPv4 接口地址；纯 IPv6 环境里可能根本没有 IPv4 地址，进程就无法正常建立邻居，所以纯 v6 组网必须手工指定 Router-ID。',
        },
        {
          type: 'tip',
          title: '链路本地下一跳必须带出接口',
          text: '静态路由的下一跳如果写成 fe80:: 开头的链路本地地址，必须同时指定出接口，因为链路本地地址在每台设备的每条链路上都可能重复，设备无法只凭地址判断往哪发。用 GUA 作下一跳时只需写地址，但设备仍会做一次 NDP 解析。验证时先 ping 下一跳，再看 display ipv6 routing-table protocol static。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm12-l05',
      moduleId: 'm12',
      title: 'IPv6 过渡技术：双栈、隧道与 NAT64',
      depth: '熟悉',
      minutes: 22,
      summary: '双栈、6in4 与 GRE 隧道、NAT64 与 DNS64 的适用场景和取舍。',
      objectives: [
        '对比双栈、隧道与协议翻译三类过渡技术',
        '完成 VRP 双栈与 GRE IPv6 隧道配置',
        '说明 NAT64 为什么需要 DNS64 配合',
      ],
      keywords: ['双栈', '6in4', 'GRE', 'NAT64', 'DNS64'],
      blocks: [
        {
          type: 'paragraph',
          text: 'IPv4 和 IPv6 不能直接互通，过渡技术解决的就是共存期的问题。常见路线有三条：双栈让设备同时说两种语言，隧道把 IPv6 报文封装进 IPv4 里运过去，翻译则在两种协议之间做转换。三者不是替代关系，而是按网络位置和业务需求组合使用。',
        },
        {
          type: 'analogy',
          title: '双语、套箱与翻译',
          text: '双栈像一个人同时会中英文，见谁说谁的话，最自然但要求两端都会；隧道像把中文信装进英文信封寄出国，拆开后还是中文，两端都得支持同一套封装；NAT64 像现场同声传译，两边各说各的语言，中间人负责实时转换，但语气和细节难免丢失。',
        },
        {
          type: 'table',
          title: '三类过渡技术对比',
          columns: ['技术', '原理', '适用场景', '主要代价'],
          rows: [
            ['双栈', '接口同时配置 IPv4 与 IPv6 地址', '新建网络、核心与数据中心', '地址规划与运维复杂度翻倍'],
            ['6in4 与 GRE 隧道', 'IPv6 报文封装在 IPv4 报文中传输', '跨越不支持 IPv6 的骨干', 'MTU 变小、封装开销、隧道端点需固定地址'],
            ['NAT64 与 DNS64', 'IPv6 侧访问 IPv4 资源时做地址与协议转换', 'IPv6 单栈网络访问存量 IPv4 服务', '破坏端到端、应用层地址无法转换'],
          ],
        },
        {
          type: 'list',
          title: '按现网条件选型的判断顺序',
          items: [
            '两端设备与链路都支持 IPv6 时优先双栈，改动最小、路径最优',
            '中间骨干不支持 IPv6、两端支持时用隧道，注意隧道端点必须 IPv4 可达',
            '只有 IPv6 单栈终端、却必须访问 IPv4 存量服务时用 NAT64，并同步部署 DNS64',
            '同一网络可以组合使用，例如核心双栈、边缘 NAT64，但排错链路会明显变长',
          ],
        },
        {
          type: 'code',
          title: '接口双栈：同时配置 IPv4 与 IPv6',
          lang: 'vrp',
          code: `ipv6
interface GigabitEthernet0/0/0
 ip address 203.0.113.1 255.255.255.0
 ipv6 enable
 ipv6 address 2001:db8:12::1/64
 quit`,
        },
        {
          type: 'code',
          title: 'GRE 隧道承载 IPv6',
          lang: 'vrp',
          code: `interface Tunnel0
 tunnel-protocol gre
 source 203.0.113.1
 destination 203.0.113.2
 ipv6 enable
 ipv6 address 2001:db8:100::1/64
 ospfv3 1 area 0.0.0.0
 quit`,
        },
        {
          type: 'output',
          title: 'display ipv6 interface Tunnel0 查看隧道地址',
          text: `[R1]display ipv6 interface Tunnel0
Tunnel0 current state : UP
IPv6 protocol current state : UP
IPv6 is enabled, link-local address is FE80::200:5EFF:FE10:1
  Global unicast address(es):
    2001:DB8:100::1, subnet is 2001:DB8:100::/64
  Joined group address(es):
    FF02::1
    FF02::2
    FF02::1:FF00:1
  MTU is 1472 bytes
  ND reachable time is 30000 milliseconds`,
        },
        {
          type: 'warning',
          title: 'NAT64 不是万能翻译',
          text: 'NAT64 只在网络层转换地址与协议，报文里如果嵌了 IPv4 地址（例如 FTP 的 PORT 命令、SIP 的 SDP），应用层并不知情，业务会失败。同时 IPv6 终端拿到的合成地址来自 DNS64，若终端直接用 IP 访问而不经过域名解析，也没有可用的转换结果。部署前必须梳理应用的地址敏感性。',
        },
        {
          type: 'tip',
          title: '隧道要提前处理 MTU',
          text: 'IPv4 外层头 20 字节，GRE 再占 4 字节，隧道接口的 MTU 通常要降到 1472 甚至更低。如果链路中途丢弃 ICMPv6 的 Packet Too Big，端到端路径 MTU 发现就会失效，表现为小包通、大包卡住。建议在隧道接口上调整 tcp mss，并在防火墙上放行 ICMPv6 类型 2。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm12-l06',
      moduleId: 'm12',
      title: 'DHCP 原理、配置与中继',
      depth: '熟悉',
      minutes: 22,
      summary: 'DORA 四步交互、地址池与租期、Option 参数，以及跨网段的中继配置。',
      objectives: [
        '复述 DORA 四步与各报文的发送方向',
        '配置全局地址池并绑定到接口',
        '完成 DHCP 中继并验证分配结果',
      ],
      keywords: ['DHCP', 'DORA', '地址池', '租期', 'Option', '中继'],
      blocks: [
        {
          type: 'paragraph',
          text: 'DHCP 负责把地址、网关、DNS 等参数自动发给终端，避免逐台手工配置。它基于 UDP：客户端用 68 端口，服务器用 67 端口。地址不是永久拥有，而是带租期（lease）的借用关系，到期前客户端要续租，这样地址才能被回收再利用。',
        },
        {
          type: 'analogy',
          title: '酒店前台与长租公寓',
          text: '地址池就是前台的房态表，租期是房卡有效期，续租相当于到期前打个电话延长住宿。Option 是随房卡一起给的生活指南：餐厅在哪、WiFi 叫什么。中继则像分店前台，客人不在总店，也能通过分店把入住申请转给总店处理。',
        },
        {
          type: 'steps',
          title: 'DORA 四步交互',
          items: [
            { title: 'Discover', text: '客户端源地址 0.0.0.0，目的 255.255.255.255，广播寻找可用服务器。' },
            { title: 'Offer', text: '服务器从地址池挑一个未占用地址，连同网关、DNS、租期一起回应。' },
            { title: 'Request', text: '客户端广播确认选择该地址，同时让其他服务器回收各自的 Offer。' },
            { title: 'Ack', text: '服务器确认分配，客户端开始使用；租期过半时进入续租流程。' },
          ],
        },
        {
          type: 'table',
          title: '常用 DHCP Option',
          columns: ['Option', '含义', '说明'],
          rows: [
            ['3', '默认网关', '终端访问其他网段的出口'],
            ['6', 'DNS 服务器', '可下发多个，按顺序使用'],
            ['51', '地址租期', '单位秒，续租与回收的依据'],
            ['53', '报文类型', '标识 Discover、Offer、Request、Ack 等'],
            ['54', '服务器标识', '客户端据此判断回应来自哪台服务器'],
            ['82', '中继代理信息', '携带中继设备的端口与电路信息，用于定位'],
          ],
        },
        {
          type: 'code',
          title: 'R1 作为 DHCP 服务器并绑定接口',
          lang: 'vrp',
          code: `dhcp enable
ip pool P1
 network 192.168.10.0 mask 255.255.255.0
 gateway-list 192.168.10.1
 dns-list 114.114.114.114
 lease day 1
 excluded-ip-address 192.168.10.1 192.168.10.10
 quit
interface GigabitEthernet0/0/0
 ip address 192.168.10.1 255.255.255.0
 dhcp select global
 quit`,
        },
        {
          type: 'code',
          title: 'R2 配置 DHCP 中继',
          lang: 'vrp',
          code: `dhcp enable
interface GigabitEthernet0/0/1
 ip address 192.168.20.1 255.255.255.0
 dhcp select relay
 dhcp relay server-ip 192.168.10.10
 quit`,
        },
        {
          type: 'output',
          title: 'display ip pool 查看地址池使用情况',
          text: `[R1]display ip pool
  Pool-name      : P1
  Pool-No        : 0
  Position       : Local
  Status         : Unlocked
  Gateway-0      : 192.168.10.1
  Mask           : 255.255.255.0
  VPN instance   : --
  Address Statistic: Total       :253    Used        :2
                     Idle        :251    Expired     :0
                     Conflict    :0      Disabled    :0`,
        },
        {
          type: 'warning',
          title: '中继不生效的三个高频原因',
          text: '第一，服务器上没有与客户端网段匹配的地址池，中继转发过去的请求没有地址可分配；第二，中继接口漏了 dhcp select relay 或 server-ip 写错；第三，服务器到客户端网段没有回程路由，Offer 发不回去。dhcp select relay 与 dhcp select global 在同一接口上互斥，后配的会覆盖前一个。',
        },
        {
          type: 'tip',
          title: '从租约和统计两端取证',
          text: 'display ip pool 看空闲与冲突数量，display dhcp server ip-in-use 看具体租约，display dhcp server statistics 看收到多少 Discover、发出多少 Offer。若 Offer 有发出但客户端仍拿不到地址，多数是二层广播被隔离或中间设备开了 DHCP Snooping 却未放行信任端口。客户端出现 169.254 开头地址，说明一个 DHCP 报文都没收到。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm12-l07',
      moduleId: 'm12',
      title: 'DNS、NTP 与网络设备管理：SSH、SNMP、日志',
      depth: '精通',
      minutes: 28,
      summary: 'DNS、NTP 时间同步，加上 SSH、SNMP 与日志，构成设备可运维的基础。',
      objectives: [
        '配置 DNS 解析与 NTP 时间同步',
        '用 AAA 完成 SSH 登录并关闭不安全入口',
        '配置 SNMP 采集并说明 v2c 与 v3 的区别',
        '规划日志输出与配置备份策略',
      ],
      keywords: ['DNS', 'NTP', 'SSH', 'SNMP', 'info-center', '配置备份'],
      blocks: [
        {
          type: 'paragraph',
          text: '网络能不能长期稳定，很大程度上取决于这些不直接转发业务的支撑服务。DNS 解决「名字到地址」，NTP 让所有设备的时间一致，SSH 提供加密的远程管理，SNMP 把设备状态送到监控平台，日志则留下事后追溯的证据。它们单独看都很小，缺一个就会让排障变成猜谜。',
        },
        {
          type: 'table',
          title: '五类基础服务与关键命令',
          columns: ['服务', '默认端口', '作用', '关键配置'],
          rows: [
            ['DNS', '53/TCP 与 UDP', '域名解析', 'dns resolve、dns server'],
            ['NTP', '123/UDP', '时间同步，为日志与证书提供一致基准', 'ntp-service unicast-server'],
            ['SSH', '22/TCP', '加密远程登录，替代明文 Telnet', 'stelnet server enable'],
            ['SNMP', '161/UDP 查询，162/UDP Trap', '性能采集与告警上报', 'snmp-agent'],
            ['日志', '514/UDP', '集中留存与审计', 'info-center loghost'],
          ],
        },
        {
          type: 'analogy',
          title: '一栋楼的物业系统',
          text: 'DNS 是楼里的指路牌，NTP 是全楼统一校准的时钟，SSH 是刷卡的员工通道，SNMP 是每层楼的水电表，日志是门岗的出入登记本。任何一个缺失，平时看不出问题；一旦出事，你会发现既找不到人、也对不上时间、还查不到记录。',
        },
        {
          type: 'code',
          title: '配置 SSH 登录与 NTP 同步',
          lang: 'vrp',
          code: `stelnet server enable
rsa local-key-pair create
aaa
 local-user admin password irreversible-cipher Admin@12345
 local-user admin privilege level 15
 local-user admin service-type ssh
 quit
user-interface vty 0 4
 authentication-mode aaa
 protocol inbound ssh
 quit
ssh user admin authentication-type password
ssh user admin service-type stelnet
ntp-service unicast-server 10.1.1.100`,
        },
        {
          type: 'code',
          title: '配置 SNMPv3、DNS 与日志主机',
          lang: 'vrp',
          code: `dns resolve
dns server 223.5.5.5
snmp-agent
snmp-agent sys-info version v3
snmp-agent sys-info contact netops@example.com
snmp-agent sys-info location IDC-A-3F
snmp-agent group v3 monitor privacy
snmp-agent usm-user v3 monitor monitor authentication-mode sha2-256 cipher Admin@12345 privacy-mode aes128 cipher Admin@12345
info-center enable
info-center loghost 10.1.1.50
info-center source default channel loghost log level informational`,
        },
        {
          type: 'output',
          title: 'display ssh server status 确认服务状态',
          text: `[R1]display ssh server status
SSH server version             : 2.0
SSH authentication timeout     : 60 seconds
SSH authentication retries     : 3 times
SSH server key generating interval : 0 hours
SSH server port                : 22
SSH server enable              : Enabled
Stelnet server enable          : Enabled
SFTP server enable             : Disabled
SCP server enable              : Disabled`,
        },
        {
          type: 'output',
          title: 'display ntp-service status 确认同步结果',
          text: `[R1]display ntp-service status
 clock status: synchronized
 clock stratum: 3
 reference clock ID: 10.1.1.100
 nominal frequency: 100.0000 Hz
 actual frequency: 100.0000 Hz
 clock precision: 2^18
 clock offset: 0.1234 ms
 root delay: 1.83 ms
 root dispersion: 0.03 ms
 peer dispersion: 0.00 ms
 reference time: 2026-11-12 09:12:33.456 (UTC+08:00)`,
        },
        {
          type: 'warning',
          title: 'SNMPv2c 的团体名是明文',
          text: 'SNMPv2c 用团体名（community）做认证，报文里明文传输，被抓包就等于泄露，且默认的 public、private 几乎等于没有防护。生产环境应使用 SNMPv3 的认证加加密模式，并用 ACL 限制只允许网管平台地址访问 161 端口。升级前先确认监控模板支持 v3，否则会丢掉采集数据。',
        },
        {
          type: 'tip',
          title: '日志级别与配置备份习惯',
          text: 'info-center 的日志级别从 0 到 7，数字越小越严重：0 表示紧急，4 表示警告，6 表示信息，7 表示调试。日常建议输出到 informational，排障时临时开到 debugging，结束后立刻改回，避免日志刷屏拖慢设备。变更后执行 save 保存，并定期用 tftp 或 SFTP 把 vrpcfg.zip 备份到外部，同时保留 display current-configuration 的文本，便于版本比对和回滚。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
