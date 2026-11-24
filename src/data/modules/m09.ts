import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm09',
  code: 'M09',
  title: '网络安全架构与设备',
  summary:
    '安全不是买一台防火墙。本模块从纵深防御与等保 2.0 讲起，拆解 ACL 匹配、安全域与策略、NAT、双机热备、IPsec 与 SSL VPN、AAA 与接入认证，再用零信任收束，并给出策略不生效、隧道起不来、NAT 回流的分层排错方法。',
  stage: 'L3',
  order: 9,
  goals: [
    '用纵深防御与等保 2.0 的框架设计园区安全分区',
    '独立完成 ACL、安全策略与 NAT 的配置和命中分析',
    '设计防火墙双机热备并验证会话与配置同步',
    '搭建 IPsec 与 SSL VPN 并排查协商失败',
    '按策略、路由、NAT、会话的顺序定位安全故障',
  ],
  keywords: ['等保 2.0', 'ACL', '安全域', 'NAT', 'VGMP', 'HRP', 'IPsec', 'SSL VPN', 'AAA', '零信任'],
  lessons: [
    {
      id: 'm09-l01',
      moduleId: 'm09',
      title: '安全架构：从边界防御到纵深防御',
      depth: '熟悉',
      minutes: 26,
      summary: '为什么只守边界必然失守，等保 2.0 的三重防护如何落到具体设备与配置。',
      objectives: [
        '解释边界防御失效的三个现实原因',
        '复述等保 2.0「一个中心、三重防护」的组成',
        '划分 Trust、Untrust、DMZ 与 Local 安全区域',
        '完成设备管理面的最小化加固',
      ],
      keywords: ['纵深防御', '等保 2.0', '安全区域', 'DMZ', '最小权限', '管理面加固'],
      blocks: [
        {
          type: 'paragraph',
          text: '早期的安全模型很简单：内网可信、外网不可信，在两者之间放一台防火墙，把所有入方向流量挡住。但今天的攻击路径早已不经过那道门——员工用个人设备接入办公 Wi-Fi、业务系统放在公有云、供应商通过 VPN 直连内网、钓鱼邮件让终端主动外联。一旦某个终端被控，攻击者就在「可信内网」里横向移动，边界防火墙完全看不到。',
        },
        {
          type: 'paragraph',
          text: '纵深防御（Defense in Depth）的思路是承认「某一层一定会被突破」，于是在每一层都设卡：边界做访问控制与入侵防御，内网做区域隔离与微隔离，终端做准入与杀毒，身份做多因素认证，数据做加密与审计。等保 2.0 把这套思想标准化为「一个中心、三重防护」：安全管理中心负责集中审计、集中管控和集中策略下发，三重防护分别是安全通信网络、安全区域边界和安全计算环境。',
        },
        {
          type: 'analogy',
          title: '银行金库不止一道门',
          text: '不会有人把全部现金放在一层玻璃门后面。真实的金库有外围岗亭、大堂闸机、电梯刷卡、金库门、保险柜五道关卡，每一道都假设前一道已经被突破。纵深防御就是网络里的多道门：边界防火墙是岗亭，区域隔离是闸机，终端准入是电梯卡，数据加密是保险柜。任何一道失效，其余仍能拖慢并记录攻击。',
        },
        {
          type: 'table',
          title: '等保 2.0 的框架落点',
          columns: ['层次', '核心要求', '常见落地设备'],
          rows: [
            ['安全通信网络', '网络架构冗余、区域划分、通信加密', '核心交换、IPsec 与 SSL VPN'],
            ['安全区域边界', '边界防护、访问控制、入侵防范、恶意代码', '防火墙、IPS、Anti-DDoS'],
            ['安全计算环境', '身份鉴别、访问控制、入侵防范、数据完整性', '终端 EDR、堡垒机、数据库审计'],
            ['安全管理中心', '集中管控、集中审计、集中策略', '日志审计、态势感知、SOC 平台'],
          ],
        },
        {
          type: 'paragraph',
          text: '落地上最先要做的不是买设备，而是划分安全区域。防火墙用安全域（Security Zone）表达「一组信任等级相同、策略相同的接口集合」。Trust 放内部员工终端，Untrust 对接互联网，DMZ 放对外提供服务的服务器，Local 代表防火墙自身。区域划分清楚后，策略才有明确的「从哪到哪」方向，否则所有接口都塞进一个域，等于没有分区。',
        },
        {
          type: 'code',
          title: '管理面加固：账号、权限与登录源限制',
          lang: 'vrp',
          code: `system-view
sysname FW1
aaa
 local-user admin password irreversible-cipher Admin@12345
 local-user admin privilege level 15
 local-user admin service-type ssh http
 quit
acl number 2000
 rule 5 permit source 10.10.10.0 0.0.0.255
 rule 10 deny
 quit
user-interface vty 0 4
 authentication-mode aaa
 protocol inbound ssh
 acl 2000 inbound
 quit
stelnet server enable
undo telnet server enable
quit`,
        },
        {
          type: 'output',
          title: 'display aaa configuration 与在线管理员',
          text: `<FW1> display aaa configuration
  Local user admin
    Password      : irreversible-cipher
    Privilege     : 15
    Service type  : ssh http
  Authentication scheme : default

<FW1> display users
  UserIndex  UserName  IP Address     Vty    Time
  1          admin     10.10.10.21    0      00:08:12`,
        },
        {
          type: 'warning',
          title: '管理面暴露比业务漏洞更致命',
          text: '很多入侵并不是从业务端口进来的，而是设备管理口暴露在公网、使用默认口令或弱口令，攻击者登录后直接改写安全策略。必须做到三点：管理口只允许运维网段访问，禁用 Telnet 只留 SSH，账号按人分配并定期轮换。用 display users 定期核对在线管理员，发现陌生来源立即处置。',
        },
        {
          type: 'tip',
          title: '默认拒绝，按需放行',
          text: '安全策略的默认动作为 deny，这不是配置缺陷而是设计前提。每一条 permit 都应当能说清业务理由、源、目的和端口，并标注有效期。反过来，如果发现策略里出现 any 到 any 的 permit，说明设计已经失效，应作为整改第一优先级。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm09-l02',
      moduleId: 'm09',
      title: 'ACL：通配符、匹配顺序与两条隐含规则',
      depth: '精通',
      minutes: 30,
      summary: 'ACL 不是列表越全越好，匹配顺序和通配符决定了它实际放行与拒绝什么。',
      objectives: [
        '区分基本 ACL、高级 ACL 与二层 ACL 的匹配字段',
        '正确写出通配符并解释 0 与 1 的含义',
        '按自上而下、命中即停的规则推导最终结果',
        '用命中计数验证 ACL 是否真的生效',
      ],
      keywords: ['ACL', '通配符', 'rule', '匹配顺序', '基本 ACL', '高级 ACL', 'match-counter'],
      blocks: [
        {
          type: 'paragraph',
          text: 'ACL（Access Control List，访问控制列表）是一组按序号排列的匹配规则，每条规则描述「什么样的报文」以及「放行还是拒绝」。设备收到报文后，从序号最小的规则开始逐条比对，第一条匹配的规则决定命运，后面的规则不再看。如果所有规则都不匹配，则执行该 ACL 的默认动作——华为 ACL 默认是 deny。',
        },
        {
          type: 'paragraph',
          text: '按能力不同，ACL 分为几类：基本 ACL（2000 到 2999）只能匹配源 IP；高级 ACL（3000 到 3999）可以匹配源、目的、协议、端口、ICMP 类型甚至 TCP 标志位；二层 ACL（4000 到 4999）匹配源目 MAC、以太网类型和 VLAN。编号范围不是强制的，但它决定了这条 ACL 能写哪些字段，选错类型会在配置时直接被拒绝。',
        },
        {
          type: 'analogy',
          title: '机场分流牌',
          text: '旅客走进航站楼，先看到哪块指示牌，就按哪块走。如果第一块牌子写着「持外交护照请走左侧」，那么符合条件的人立刻被分流，不会再看到后面「所有旅客请走右侧」的牌子。规则顺序错了，结果就完全相反——把 any 的 permit 放在最前面，后面的精细拒绝全部失效。',
        },
        {
          type: 'table',
          title: 'ACL 分类与匹配能力',
          columns: ['类型', '编号范围', '可匹配字段', '典型用途'],
          rows: [
            ['基本 ACL', '2000-2999', '源 IP', '设备登录源限制、NAT 地址池匹配'],
            ['高级 ACL', '3000-3999', '源目 IP、协议、端口、ICMP 类型', '安全策略、NAT、流量过滤'],
            ['二层 ACL', '4000-4999', '源目 MAC、VLAN、以太网类型', '链路层准入控制'],
            ['用户 ACL', '6000-9999', '用户、用户组', '与 AAA 联动的按人授权'],
          ],
        },
        {
          type: 'paragraph',
          text: '通配符（wildcard）是 ACL 最容易写错的地方。它用 0 表示「这一位必须匹配」，用 1 表示「这一位任意」。这和子网掩码的语义正好相反：掩码 255.255.255.0 表示前 24 位是网络位，而通配符 0.0.0.255 表示前 24 位必须一致、最后 8 位任意。写地址时先想清楚「哪些位固定、哪些位可变」，再换算成通配符。',
        },
        {
          type: 'code',
          title: '高级 ACL：只放行研发访问测试服务器的 443',
          lang: 'vrp',
          code: `system-view
acl number 3000
 rule 5 permit tcp source 192.168.10.0 0.0.0.255 destination 172.16.1.10 0 destination-port eq 443
 rule 10 permit icmp source 192.168.10.0 0.0.0.255 destination 172.16.1.0 0.0.0.255 icmp-type echo
 rule 15 deny ip source 192.168.10.0 0.0.0.255 destination 172.16.1.0 0.0.0.255
 rule 20 permit ip
 quit
interface GigabitEthernet1/0/1
 traffic-filter inbound acl 3000
 quit`,
        },
        {
          type: 'output',
          title: 'display acl 3000 查看规则与命中计数',
          text: `<FW1> display acl 3000
Advanced ACL 3000, 4 rules
Acl's step is 5
  rule 5 permit tcp source 192.168.10.0 0.0.0.255 destination 172.16.1.10 0
    destination-port eq 443 (match-counter 1284)
  rule 10 permit icmp source 192.168.10.0 0.0.0.255 destination 172.16.1.0 0.0.0.255 icmp-type echo
    (match-counter 36)
  rule 15 deny ip source 192.168.10.0 0.0.0.255 destination 172.16.1.0 0.0.0.255 (match-counter 412)
  rule 20 permit ip (match-counter 9871)`,
        },
        {
          type: 'warning',
          title: '末尾那条 deny 你写不写它都在',
          text: '华为 ACL 在所有规则之后隐含一条拒绝所有。因此如果只写了 permit 规则而忘了放行必要的回程或其他业务，其余流量会全部被丢弃，现象是「配了 ACL 之后业务大面积中断」。反过来说，如果希望默认放行，必须显式写 rule permit ip 放在最后，而不是删掉 deny。排障时先看命中计数落在哪条规则上。',
        },
        {
          type: 'tip',
          title: '用步长给未来留位置',
          text: 'rule 序号默认步长为 5，写成 5、10、15 而不是 1、2、3，是为了以后插入新规则时不必整体重排。若确实需要插入，可以先用较小步长的 ACL 重建，或使用 rule 的插入参数。生产环境改 ACL 前先导出当前配置并记录命中计数，改完对比计数变化，是判断「是否误伤」的最快方式。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm09-l03',
      moduleId: 'm09',
      title: '安全域与安全策略：五元组、会话与 ASPF',
      depth: '精通',
      minutes: 34,
      summary: '防火墙不是按接口放行，而是按区域之间发通行证，会话表让回程流量自动通过。',
      objectives: [
        '解释安全域优先级与域间方向的含义',
        '写出五元组安全策略并说明默认拒绝的影响',
        '区分状态检测与会话表的作用',
        '用 ASPF 解决 FTP 等多通道协议的端口协商问题',
      ],
      keywords: ['安全域', '安全策略', '五元组', '会话表', '状态检测', 'ASPF', 'Local 域'],
      blocks: [
        {
          type: 'paragraph',
          text: '防火墙的核心抽象是安全域加安全策略。每个接口必须加入一个安全域，策略描述的是「从某个域到某个域、匹配某种流量、执行什么动作」，而不是「某个接口进、某个接口出」。这样即使物理接口更换，只要仍属于同一安全域，策略无需重写。华为设备预定义了 Trust（85）、DMZ（50）、Untrust（5）、Local（100）等域，数值是优先级，用于同域内与未明确配置时的缺省方向判断。',
        },
        {
          type: 'paragraph',
          text: '安全策略匹配的是五元组：源地址、目的地址、协议、源端口、目的端口，再加上源安全域、目的安全域、应用和时间段等扩展条件。首包到达时，防火墙查策略并建立会话；后续同一条流的报文直接命中会话表，不再逐包查策略。这就是状态检测：回程流量不需要单独写策略，因为会话已经记录了它属于哪个已放行的连接。',
        },
        {
          type: 'analogy',
          title: '大厦前台发通行证',
          text: '访客第一次来要出示身份证、说明找谁、去几层，前台核对规定后发一张通行证，并登记在册。之后他每次进出只要刷通行证即可，不需要重新审核。会话表就是那本登记册，通行证就是会话表项。ASPF 则像前台额外帮你预约了内部会议室——有些协议会临时开一个新门，前台必须提前知道并放行。',
        },
        {
          type: 'table',
          title: '安全域与典型用途',
          columns: ['安全域', '默认优先级', '放什么', '策略方向'],
          rows: [
            ['Local', '100', '防火墙自身，如管理、路由协议', '到 Local 的策略要单独放行'],
            ['Trust', '85', '内部员工终端与办公服务器', '主要作为源域'],
            ['DMZ', '50', '对外提供服务的 Web、邮件服务器', 'Untrust 到 DMZ 按端口精确放行'],
            ['Untrust', '5', '互联网或外联专线', '主要作为目的域'],
          ],
        },
        {
          type: 'paragraph',
          text: '为什么默认拒绝是必要的？因为放行是白名单行为，只有明确知道要开放什么，才能保证没有多余入口。但默认拒绝也意味着：新业务上线必须同步提策略工单，否则「网络明明是通的却访问不了」。成熟的运维流程会把策略申请、审批、配置、复核串起来，而不是让工程师临时加一条 any 到 any 图省事。',
        },
        {
          type: 'code',
          title: '接口入域与内网访问互联网的放行策略',
          lang: 'vrp',
          code: `system-view
firewall zone trust
 add interface GigabitEthernet1/0/1
 quit
firewall zone untrust
 add interface GigabitEthernet1/0/2
 quit
firewall zone dmz
 add interface GigabitEthernet1/0/3
 quit
security-policy
 rule name trust-to-untrust-web
  source-zone trust
  destination-zone untrust
  source-address 192.168.10.0 24
  destination-address 200.1.1.0 24
  service http https dns
  action permit
  quit
 rule name untrust-to-dmz-web
  source-zone untrust
  destination-zone dmz
  destination-address 172.16.1.10 32
  service http https
  action permit
  quit
 quit`,
        },
        {
          type: 'code',
          title: 'FTP 主动模式：用 ASPF 放行协商出的数据端口',
          lang: 'vrp',
          code: `system-view
firewall interzone trust untrust
 detect ftp
 quit`,
        },
        {
          type: 'output',
          title: 'display security-policy 与命中统计',
          text: `<FW1> display security-policy rule all
Total: 2
RULE NAME                  FROM     TO       SOURCE             DESTINATION        SERVICE      ACTION  HITS
trust-to-untrust-web       trust    untrust  192.168.10.0/24    200.1.1.0/24       http,https   permit  18422
untrust-to-dmz-web         untrust  dmz       any                172.16.1.10/32     http,https   permit  3120

<FW1> display firewall session table verbose
  HTTP  VPN: public -> public
    Source      : 192.168.10.21:52344
    Destination : 200.1.1.20:80
    Zone        : trust -> untrust
    Policy      : trust-to-untrust-web
    State       : Established`,
        },
        {
          type: 'interactive',
          key: 'fw-policy',
          caption: '调整源域、目的域与服务，观察策略命中与流量放行结果的变化。',
        },
        {
          type: 'warning',
          title: '策略不生效，先看方向和域',
          text: '最常见的错误是把内网访问外网的策略写成了 untrust 到 trust，或者接口忘记加入安全域。接口没有入域时，流量根本不会进入策略匹配流程，表现为「策略配了但计数一直是 0」。排查顺序是：接口是否入域、方向是否与真实流量一致、五元组是否命中、NAT 是否在策略之前改写了地址。',
        },
        {
          type: 'tip',
          title: '会话表是排障的第一现场',
          text: 'display firewall session table verbose 能看到每条流的源目地址、所属域、命中的策略名和状态。如果会话存在但状态异常，问题可能在应用层；如果根本没有会话，说明首包就被丢了，应回到策略与路由。比起反复读配置，先确认有没有会话，能快速把问题二分为「没放行」和「放行了但走不通」。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm09-l04',
      moduleId: 'm09',
      title: 'NAT：源 NAT、NAPT 与 NAT Server',
      depth: '精通',
      minutes: 34,
      summary: '私网地址如何出门、公网用户如何进来，以及 NAT 回流为什么总被漏配。',
      objectives: [
        '区分源 NAT、NAPT、目的 NAT 与 NAT Server 的转换对象',
        '配置 easy-ip 方式的内网出访与端口映射',
        '说明 NAT 与安全策略的执行先后关系',
        '定位内网通过公网地址访问内部服务器的回流问题',
      ],
      keywords: ['NAT', 'NAPT', '源 NAT', 'NAT Server', 'easy-ip', 'NAT 回流', '地址池'],
      blocks: [
        {
          type: 'paragraph',
          text: 'IPv4 公网地址稀缺，内网普遍使用 10.x、172.16.x、192.168.x 私有地址，这些地址不能在互联网上路由。NAT（Network Address Translation）在出口把私有地址改写成公网地址，同时记录映射关系，回程再改回来。最常用的两种形态是源 NAT 与目的 NAT：前者解决「内网怎么出去」，后者解决「外网怎么进来」。',
        },
        {
          type: 'paragraph',
          text: '源 NAT 有三种典型做法：一对一静态映射，把某个内网地址固定映射到一个公网地址，适合需要固定出口 IP 的场景；地址池方式，多个内网地址共享一组公网地址，池子用完就排队；NAPT（Network Address Port Translation，网络地址端口转换）进一步复用端口，让成百上千个内网地址共享一个公网地址，靠源端口区分会话。华为设备上的 easy-ip 就是 NAPT 的简化写法。',
        },
        {
          type: 'analogy',
          title: '公司总机与分机',
          text: '所有员工外呼时，对方看到的都是公司总机号码，总机通过分机号记住是谁打的——这就是 NAPT 用端口区分会话。客户要找人，不能直接拨分机，必须先拨总机再转接——这就是 NAT Server 的端口映射。如果公司内部员工也想通过总机号码找同事，总机必须支持「内部呼入再转回内部」，这就是 NAT 回流。',
        },
        {
          type: 'table',
          title: '四种 NAT 形态',
          columns: ['形态', '转换对象', '典型配置', '使用场景'],
          rows: [
            ['源 NAT（一对一）', '源 IP', 'nat address-group', '需要固定出口 IP 的对接'],
            ['NAPT / easy-ip', '源 IP + 源端口', 'action source-nat easy-ip', '绝大多数上网场景'],
            ['目的 NAT', '目的 IP', 'nat-policy 中 destination-nat', '流量牵引与负载分担'],
            ['NAT Server', '目的 IP + 端口', 'nat server protocol tcp global ... inside ...', '对外发布内部服务器'],
          ],
        },
        {
          type: 'code',
          title: '内网出访用 easy-ip，对外发布 Web 用 NAT Server',
          lang: 'vrp',
          code: `system-view
nat-policy
 rule name snat-internet
  source-zone trust
  destination-zone untrust
  source-address 192.168.10.0 24
  action source-nat easy-ip
  quit
 quit
interface GigabitEthernet1/0/2
 ip address 200.1.1.10 255.255.255.0
 nat server protocol tcp global 200.1.1.20 8080 inside 172.16.1.10 80
 quit
security-policy
 rule name untrust-to-dmz-web
  source-zone untrust
  destination-zone dmz
  destination-address 172.16.1.10 32
  service http
  action permit
  quit
 quit`,
        },
        {
          type: 'output',
          title: 'display nat session all 查看地址与端口映射',
          text: `<FW1> display nat session all
Slot 0: Total sessions: 2
  Protocol  Source              Destination         NAT Source          NAT Destination
  TCP       192.168.10.21:52344  200.1.1.20:80       200.1.1.10:32768    200.1.1.20:80
  TCP       203.0.113.8:41022   200.1.1.20:8080     203.0.113.8:41022   172.16.1.10:80`,
        },
        {
          type: 'paragraph',
          text: '执行顺序常被误解：报文进入防火墙后，先做目的 NAT（把公网地址换成服务器私网地址），再做安全策略匹配，最后做源 NAT。因此安全策略里写的目的地址应当是转换后的私网地址，而不是用户访问的公网地址。如果策略按公网地址写，匹配不到，NAT Server 也就白配了。',
        },
        {
          type: 'warning',
          title: 'NAT 回流不是可选优化',
          text: '内网用户用域名解析到公网地址访问内部服务器时，流量会先到防火墙，再被目的 NAT 转回内网。如果只配了出方向源 NAT，回程报文会从服务器直接回到内网终端，源地址是私网地址而终端期待的是公网地址，连接建立失败。解决方法是让这条流量也做一次源 NAT（hairpin），并放行内网到内网的安全策略。很多「外网能访问、内网打不开」的故障都源于此。',
        },
        {
          type: 'tip',
          title: '先看会话再改 NAT',
          text: 'NAT 不生效时，用 display nat session all 确认到底有没有生成转换表项：没有表项说明流量没命中 nat-policy，检查源域、目的域和源地址范围；有表项但业务不通，检查回程是否被策略拦截或路由是否指回防火墙。NAT 只改地址，不负责转发，路由和策略任何一环缺失都会表现为「NAT 没生效」。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm09-l05',
      moduleId: 'm09',
      title: '双机热备：VGMP 统管、HRP 同步',
      depth: '精通',
      minutes: 34,
      summary: '两台防火墙如何像一个整体工作，主备切换时会话与配置为什么不能丢。',
      objectives: [
        '说明 VRRP、VGMP、HRP 三者的分工',
        '配置 HRP 心跳口、会话同步与主动被动角色',
        '解释 HRP 会覆盖备机配置带来的风险',
        '通过状态与同步统计验证热备是否健康',
      ],
      keywords: ['双机热备', 'VGMP', 'HRP', 'VRRP', '会话同步', '主备切换'],
      blocks: [
        {
          type: 'paragraph',
          text: '单台防火墙是天然的单点。用两台设备做冗余时，只靠 VRRP 让网关漂移是不够的：VRRP 只解决「虚拟 IP 在谁身上」，而防火墙还维护着会话表、NAT 转换表、IPsec SA、ARP 与路由状态。如果备机没有这些状态，主设备一挂，即使虚拟 IP 秒级漂移过去，所有已建立的连接仍会中断。',
        },
        {
          type: 'paragraph',
          text: '华为的解法分两层：VGMP（VRRP Group Management Protocol）把所有 VRRP 实例和接口状态打包成一个组，统一决定主备，避免多个 VRRP 各自选举导致「一半主一半备」的脑裂；HRP（Huawei Redundancy Protocol）负责在心跳链路上同步配置、会话表、NAT 表、IPsec SA 等状态，让备机随时可以接管。',
        },
        {
          type: 'analogy',
          title: '双主刀医生',
          text: '手术室里站着两位医生，不只是「人要在场」，更重要的是病历、用药记录和手术进度必须实时同步给副手。主刀一旦体力不支，副手接过来能立刻继续，而不是从头问一遍病史。VGMP 决定谁站主刀位，HRP 负责同步病历，两者缺一不可。',
        },
        {
          type: 'table',
          title: '三个协议的分工',
          columns: ['协议', '管什么', '不同步的后果'],
          rows: [
            ['VRRP', '虚拟网关 IP 与 MAC 由谁持有', '网关漂移但会话丢失'],
            ['VGMP', '统一管理 VRRP 组与接口状态，决定整机主备', '多个 VRRP 状态不一致，流量路径错乱'],
            ['HRP', '配置、会话、NAT、IPsec SA 等状态同步', '切换后连接全部重建，业务中断'],
          ],
        },
        {
          type: 'code',
          title: '主设备：启用 HRP、同步会话并配置主动角色',
          lang: 'vrp',
          code: `system-view
hrp enable
hrp interface GigabitEthernet1/0/3 remote 10.0.0.2
hrp auto-sync
hrp mirror session enable
vrrp vrid 1 virtual-ip 192.168.10.1 active
vrrp vrid 1 preempt-mode timer delay 20
hrp track interface GigabitEthernet1/0/1
quit`,
        },
        {
          type: 'code',
          title: '备设备：同一心跳网段，角色为 standby',
          lang: 'vrp',
          code: `system-view
hrp enable
hrp interface GigabitEthernet1/0/3 remote 10.0.0.1
hrp auto-sync
hrp mirror session enable
vrrp vrid 1 virtual-ip 192.168.10.1 standby
quit`,
        },
        {
          type: 'output',
          title: 'display hrp state 检查主备与同步状态',
          text: `<FW1> display hrp state
Role: active, peer: standby
Running priority: 45000, peer priority: 40000
Core interface: GigabitEthernet1/0/3
  Remote address: 10.0.0.2, status: up
HRP heartbeat: 1 s, hold time: 3 s
Configuration synchronization: enabled
Session synchronization: enabled
Switchover count: 0`,
        },
        {
          type: 'warning',
          title: 'HRP 会覆盖备机配置',
          text: '开启 hrp auto-sync 后，主设备的配置会周期性地同步到备机，备机上手工改的命令可能被覆盖，甚至引发配置反复回滚。正确做法是把两台设备当作一个整体运维：所有变更都在主设备上做，备机只做只读核对。任何需要在备机执行的临时操作，先关闭自动同步，操作完立即恢复，并记录变更。',
        },
        {
          type: 'tip',
          title: '切换测试必须验证已有连接',
          text: '热备是否可用，不能只看 display hrp state 是否 active/standby。要在一个已建立的长时间连接（例如持续 ping 或大文件下载）上断开主设备上行或直接关机，观察业务是否中断、会话是否在备机延续。切换后立即查看备机的会话表与 IPsec SA 数量是否与切换前主设备相当，才算真正验证通过。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm09-l06',
      moduleId: 'm09',
      title: 'IPsec：IKE 谈判、ESP 封装与两种模式',
      depth: '精通',
      minutes: 36,
      summary: '两条隧道先后建立：IKE 谈好钥匙，ESP 才负责真正加密业务报文。',
      objectives: [
        '说明 AH 与 ESP 的能力差异及选择依据',
        '区分传输模式与隧道模式的封装范围',
        '对比 IKEv1 主模式、野蛮模式与 IKEv2 的报文交互',
        '解释感兴趣流如何触发并决定哪些流量进隧道',
      ],
      keywords: ['IPsec', 'IKE', 'ESP', 'AH', '主模式', '野蛮模式', '感兴趣流', 'SA'],
      blocks: [
        {
          type: 'paragraph',
          text: 'IPsec 不是单个协议，而是一组机制的组合：IKE 负责身份认证与密钥协商，ESP 或 AH 负责报文保护，SA（Security Association，安全联盟）是双方协商出来的参数集合，规定用哪种算法、哪个密钥、保护哪个方向的哪些流量。两台设备要先就 SA 达成一致，才谈得上加密通信。',
        },
        {
          type: 'paragraph',
          text: 'AH 提供完整性校验和源认证，但不加密，且会校验整个 IP 头，遇到 NAT 必然失败；ESP 提供加密、完整性和抗重放，是实际部署的绝对主流。封装模式上，传输模式只保护 IP 载荷，保留原始 IP 头，适合主机到主机；隧道模式把整个原始 IP 包再套一层新 IP 头，适合网关到网关，也是站点间 VPN 的标准做法。',
        },
        {
          type: 'analogy',
          title: '寄一件贵重物品',
          text: 'IKE 是双方先通电话，确认对方身份、约定用什么箱子和什么锁、钥匙怎么交接——这一步只谈规则，不运货。ESP 是真正把物品装进箱子、上锁、贴上防拆封条再发走。AH 相当于只贴封条不装箱，路上谁都能看见里面是什么；传输模式是只包物品不换外箱，隧道模式是连原包装一起再套一个大箱子。',
        },
        {
          type: 'table',
          title: '两种封装协议对比',
          columns: ['对比项', 'AH', 'ESP'],
          rows: [
            ['机密性', '不提供', '提供（加密载荷）'],
            ['完整性', '提供，覆盖整个 IP 头', '提供，覆盖载荷与部分头'],
            ['抗重放', '提供', '提供'],
            ['NAT 穿越', '不支持，NAT 改地址后校验失败', '支持，配合 NAT-T 封装到 UDP 4500'],
            ['典型场景', '极少单独使用', '站点间 VPN、远程接入'],
          ],
        },
        {
          type: 'paragraph',
          text: 'IKEv1 分两个阶段：第一阶段建立 ISAKMP SA，用于保护后续协商；第二阶段用这条安全通道建立 IPsec SA。第一阶段有两种模式——主模式交换 6 个报文，身份信息在加密通道里传输，安全性高但速度慢；野蛮模式只用 3 个报文，身份明文传输，胜在快且支持一端固定 IP、一端动态 IP 的场景。IKEv2 把流程压缩到 4 个报文，并原生支持 NAT 检测与多 SA，是新部署的首选。',
        },
        {
          type: 'steps',
          title: '一次站点间 IPsec 的建立过程',
          items: [
            { title: '触发', text: '私网报文命中 ACL（感兴趣流），设备判断需要走 IPsec。' },
            { title: 'IKE 一阶段', text: '协商加密与认证算法、DH 组，完成身份认证，建立 IKE SA。' },
            { title: 'IKE 二阶段', text: '在 IKE SA 保护下协商 ESP 参数，生成双向 IPsec SA。' },
            { title: '封装转发', text: '原始报文被 ESP 加密后套上新 IP 头，送往对端公网地址。' },
            { title: '保活与重协商', text: '通过 DPD 检测对端存活，SA 到期前重新协商，业务不中断。' },
          ],
        },
        {
          type: 'code',
          title: '总部侧：IKE 提议、对等体、IPsec 提议与策略',
          lang: 'vrp',
          code: `system-view
ike proposal 10
 encryption-algorithm aes-256
 authentication-algorithm sha2-256
 dh group14
 quit
ike peer fw-branch v2
 pre-shared-key cipher Huawei@123
 ike-proposal 10
 remote-address 203.0.113.2
 quit
ipsec proposal prop-esp
 esp encryption-algorithm aes-256
 esp authentication-algorithm sha2-256
 quit
acl number 3000
 rule 5 permit ip source 192.168.10.0 0.0.0.255 destination 192.168.20.0 0.0.0.255
 quit
ipsec policy map1 10 isakmp
 security acl 3000
 ike-peer fw-branch
 proposal prop-esp
 quit
interface GigabitEthernet1/0/2
 ipsec policy map1
 quit`,
        },
        {
          type: 'output',
          title: 'display ike sa 与 display ipsec sa',
          text: `<FW1> display ike sa
Conn-ID  Peer            VPN   Flag(s)  Phase  RemoteType  RemoteID
12       203.0.113.2:500 1     RD|ST    v2:2   IP          203.0.113.2

<FW1> display ipsec sa
IPsec SA Information:
  IPSec policy name: map1   Sequence number: 10
  Mode: ISAKMP
  ACL: 3000 (rule 5)
  ESP: aes-256 / sha2-256
  Inbound SPI : 3486210945,  Outbound SPI : 2177401093
  Remaining lifetime: 2784 s
  Encapsulation mode: tunnel`,
        },
        {
          type: 'warning',
          title: '感兴趣流必须两端镜像',
          text: 'ACL 3000 定义的是「哪些流量需要加密」。总部写 192.168.10.0/24 到 192.168.20.0/24，分支必须写 192.168.20.0/24 到 192.168.10.0/24，方向相反、内容互补。如果只在一端写了单向 ACL，或者两端地址范围不一致，会出现「IKE SA 建立成功、IPsec SA 起不来」，或者单向通、回包被丢弃。',
        },
        {
          type: 'tip',
          title: '预共享密钥与算法列表要完全一致',
          text: 'IKE 协商失败最常见的原因不是算法太弱，而是两端提议列表没有交集：一端只配 aes-256，另一端只配 aes-128，协商就没有共同项。建议两端使用相同的提议模板，并用 display ike sa 的 Flag 字段判断卡在哪一阶段——只有一阶段就说明二阶段参数不匹配，连一阶段都没有则多半是地址、密钥或算法问题。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm09-l07',
      moduleId: 'm09',
      title: 'IPsec 落地：NAT-T、动态对端与隧道排错',
      depth: '精通',
      minutes: 34,
      summary: '当公网中间有 NAT、两端地址不对称时，IPsec 需要额外处理才能建立并稳定。',
      objectives: [
        '说明 NAT-T 将 ESP 封装到 UDP 4500 的原因',
        '配置一端固定地址、一端动态地址的野蛮模式对等体',
        '按三阶段定位 IPsec 隧道起不来的原因',
        '用统计计数判断加密与解密是否真正发生',
      ],
      keywords: ['NAT-T', 'UDP 4500', '野蛮模式', 'DPD', 'IPsec 排错', 'dynamic'],
      blocks: [
        {
          type: 'paragraph',
          text: 'IPsec 的 ESP 是 IP 层协议号 50，不是 TCP 也不是 UDP。一旦路径上存在 NAT，源地址或端口被改写，ESP 的完整性校验就会失败，隧道直接不通。NAT-T（NAT Traversal）的做法是把 ESP 报文再封装进 UDP 4500，让 NAT 设备能像处理普通 UDP 一样维护转换表，接收端收到后再解封装还原成 ESP。IKE 本身则把端口从 500 切到 4500。',
        },
        {
          type: 'paragraph',
          text: '两端地址不对称时（总部固定公网 IP，分支拨号或 4G 动态地址），分支无法预知总部当前地址，只能由分支主动发起。这时总部侧要把对等体配置成动态（remote-address 不指定具体地址），并用野蛮模式或 IKEv2 缩短协商，因为主模式在身份未确认前无法处理动态对端。',
        },
        {
          type: 'analogy',
          title: '给快递套一个标准信封',
          text: 'ESP 像一件形状特殊、无法通过分拣机的包裹，NAT 设备就是那台只认标准信封的分拣机。NAT-T 就是给特殊包裹套一个标准信封（UDP 4500），分拣机正常处理，收件人拆开信封再取里面的原包裹。双方还得提前约好「看到标准信封就拆」，否则收件人不知道里面是什么。',
        },
        {
          type: 'table',
          title: 'IPsec 参数一致性检查表',
          columns: ['参数', '总部示例', '分支示例', '不一致的后果'],
          rows: [
            ['IKE 版本', 'v2', 'v2', '版本不同，第一阶段无法开始'],
            ['认证方式', 'pre-shared-key', 'pre-shared-key', '密钥不一致，认证失败'],
            ['加密算法', 'aes-256', 'aes-256', '无共同提议，协商失败'],
            ['DH 组', 'group14', 'group14', '密钥派生失败'],
            ['感兴趣流', '10.0/24 → 20.0/24', '20.0/24 → 10.0/24', '二阶段起不来或单向通'],
            ['封装模式', 'tunnel', 'tunnel', '模式不一致，报文无法解封装'],
          ],
        },
        {
          type: 'code',
          title: '分支侧：动态对端、野蛮模式与 NAT-T',
          lang: 'vrp',
          code: `system-view
ike proposal 10
 encryption-algorithm aes-256
 authentication-algorithm sha2-256
 dh group14
 quit
ike peer fw-hq v1
 exchange-mode aggressive
 pre-shared-key cipher Huawei@123
 ike-proposal 10
 remote-address 203.0.113.1
 local-id-type ip
 nat traversal enable
 quit
ipsec proposal prop-esp
 esp encryption-algorithm aes-256
 esp authentication-algorithm sha2-256
 quit
acl number 3000
 rule 5 permit ip source 192.168.20.0 0.0.0.255 destination 192.168.10.0 0.0.0.255
 quit
ipsec policy map1 10 isakmp
 security acl 3000
 ike-peer fw-hq
 proposal prop-esp
 quit
interface GigabitEthernet1/0/2
 ipsec policy map1
 quit`,
        },
        {
          type: 'output',
          title: 'display ipsec statistics 验证加解密计数',
          text: `<FW1> display ipsec statistics
  IPSec packet statistics:
    Encapsulated packets   : 1284
    Decapsulated packets   : 1196
    Encapsulation failures : 0
    Decapsulation failures : 12
    Inbound packets dropped: 8
  IPSec SA statistics:
    Established SAs        : 2
    Negotiation failures   : 3
    Rekey times            : 1`,
        },
        {
          type: 'interactive',
          key: 'nat-ipsec',
          caption: '在链路上加入 NAT 并切换是否启用 NAT-T，观察隧道能否建立。',
        },
        {
          type: 'steps',
          title: 'IPsec 起不来的三阶段排查',
          items: [
            { title: '第一阶段', text: 'display ike sa 无任何条目：查公网可达性、UDP 500 是否放行、IKE 版本、预共享密钥与提议。' },
            { title: '第二阶段', text: '有 IKE SA 没有 IPsec SA：查 ACL 是否镜像、ESP 提议是否一致、封装模式是否相同。' },
            { title: '转发阶段', text: 'SA 都存在但业务不通：查路由、安全策略是否放行 ESP 与 UDP 4500、NAT 是否把私网流量提前改写。' },
          ],
        },
        {
          type: 'warning',
          title: 'NAT 与 IPsec 的顺序会互相破坏',
          text: '如果出口同时配了源 NAT 和 IPsec，必须保证进入隧道的流量不被 NAT 改写，否则对端看到的是转换后的地址，与感兴趣流不匹配。常见做法是在 NAT 策略中排除去往对端私网网段的流量，或者让 IPsec 策略在 NAT 之前生效。现象是「分支能访问总部，但总部访问不了分支」或「隧道建立后大量解密失败」。',
        },
        {
          type: 'tip',
          title: 'DPD 让故障切换更快',
          text: '默认情况下，设备只有在有流量时才会发现对端失联。启用 DPD（Dead Peer Detection）后，空闲期也会周期性探测，对端异常时能主动拆除 SA 并重新协商。分支使用拨号链路时尤其重要，否则链路切换后旧 SA 仍挂着，业务会持续黑洞几分钟。DPD 周期不宜过短，避免把正常抖动误判为故障。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm09-l08',
      moduleId: 'm09',
      title: 'SSL VPN：让移动办公安全回到内网',
      depth: '熟悉',
      minutes: 26,
      summary: '基于 443 端口的远程接入，不需要预建隧道，也不必给每台终端装重客户端。',
      objectives: [
        '说明 SSL VPN 与 IPsec VPN 的适用边界',
        '区分 Web 代理、应用代理与网络扩展三种接入方式',
        '配置网关、证书与基于用户的授权策略',
        '识别把 SSL VPN 直接暴露公网的风险',
      ],
      keywords: ['SSL VPN', 'TLS', '443', '移动办公', '网络扩展', '按应用授权'],
      blocks: [
        {
          type: 'paragraph',
          text: 'IPsec VPN 适合两个固定站点之间长期互联，但它假设两端都有相对稳定的网关，且终端侧配置复杂。员工在家、在机场、在客户现场时，更需要一种「打开浏览器或轻客户端就能用」的方式。SSL VPN 基于 TLS 与 HTTPS，复用 443 端口，几乎能穿过所有网络限制，也不需要提前配置对端网关。',
        },
        {
          type: 'paragraph',
          text: 'SSL VPN 有三种典型接入方式：Web 代理把内网应用改写成网页入口，终端只访问网关，安全性最高；应用代理针对 C/S 架构应用做端口转发，终端装轻量组件；网络扩展（隧道模式）在终端装虚拟网卡，按路由把指定网段流量送进隧道，体验最接近在办公室，但终端权限要求最高，风险也最大。',
        },
        {
          type: 'analogy',
          title: '专用隧道与电子工牌',
          text: 'IPsec 像在两栋楼之间挖一条专用隧道，只有这两栋楼的人能走。SSL VPN 像给每位员工发一张电子工牌：不用挖隧道，员工从任何地方刷工牌进大厅，工牌上写着他只能去三楼会议室，不能进机房。前者是「修路」，后者是「发权限」。',
        },
        {
          type: 'table',
          title: 'IPsec 与 SSL VPN 对比',
          columns: ['对比项', 'IPsec VPN', 'SSL VPN'],
          rows: [
            ['典型场景', '站点到站点互联', '个人远程接入'],
            ['协议基础', 'ESP/AH，IP 层', 'TLS/HTTPS，应用层'],
            ['客户端', '网关设备或系统内置', '浏览器或轻量客户端'],
            ['授权粒度', '按网段与 ACL', '可按用户、角色、单个应用'],
            ['穿透能力', '受 NAT 与防火墙限制，需要 NAT-T', '走 443，穿透性最好'],
          ],
        },
        {
          type: 'code',
          title: '启用 SSL VPN 网关并放行到 Local 域',
          lang: 'vrp',
          code: `system-view
v-gateway sslvpn
 interface GigabitEthernet1/0/2
  ssl enable
  quit
 ssl policy ssl-1
  tls1.2 enable
  quit
 quit
security-policy
 rule name allow-sslvpn
  source-zone untrust
  destination-zone local
  destination-address 200.1.1.10 32
  service https
  action permit
  quit
 quit`,
        },
        {
          type: 'output',
          title: 'display v-gateway 查看网关与在线用户',
          text: `<FW1> display v-gateway sslvpn
  Gateway name      : sslvpn
  Bind interface    : GigabitEthernet1/0/2
  SSL state         : enabled
  TLS version       : TLS1.2
  Online users      : 12
  Max users         : 500

<FW1> display access-user
  User name   IP address     Auth method  Role        Online time
  zhangsan    10.20.0.11     local        employee    00:42:18
  lisi        10.20.0.12     radius       visitor     00:08:03`,
        },
        {
          type: 'warning',
          title: 'SSL VPN 是攻击面最大的入口',
          text: '为了远程办公方便，很多项目把 SSL VPN 直接暴露在公网，只配用户名口令。一旦员工口令被撞库或钓鱼获取，攻击者就获得了内网入口。必须叠加多因素认证、登录失败锁定、按用户的最小应用授权，并定期审计在线用户与登录日志。能只授权单个应用，就不要授权整个网段。',
        },
        {
          type: 'tip',
          title: '授权到应用而不是网段',
          text: '网络扩展模式虽然体验好，但终端一旦被控，攻击者就拥有了所授权网段的完整访问能力。优先使用 Web 代理或应用代理，把权限收敛到具体系统与端口；确实需要网络扩展时，配合终端合规检查（是否安装杀毒、是否打补丁），不合规的终端只给只读权限或直接拒绝。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm09-l09',
      moduleId: 'm09',
      title: 'AAA 与接入认证：RADIUS、HWTACACS、802.1X 与 Portal',
      depth: '熟悉',
      minutes: 28,
      summary: '认证、授权、计费三件事如何拆开，RADIUS 与 HWTACACS 又该怎么选。',
      objectives: [
        '说清认证、授权、计费各自解决什么问题',
        '对比 RADIUS 与 HWTACACS 的协议特征',
        '配置 RADIUS 服务器模板与认证域',
        '区分 802.1X 与 Portal 的适用终端',
      ],
      keywords: ['AAA', 'RADIUS', 'HWTACACS', '802.1X', 'Portal', '认证域', 'EAPOL'],
      blocks: [
        {
          type: 'paragraph',
          text: 'AAA 是三个动作的缩写：Authentication 认证「你是谁」，Authorization 授权「你能做什么」，Accounting 计费「你做了什么、用了多久」。三者可以合并在一台服务器上，也可以拆开由不同系统承担。网络设备本身通常只做「转发认证请求」的客户端角色，真正的账号与策略存在服务器里。',
        },
        {
          type: 'paragraph',
          text: 'RADIUS 是最常见的协议，认证与授权合并在一个响应里返回，使用 UDP 1812 认证、1813 计费，实现简单、生态广泛，适合网络接入场景。HWTACACS 使用 TCP 49，把认证、授权、计费完全分离，授权可以细到命令级别，适合对设备管理员做「谁能登录哪台设备、能敲哪些命令」的精细控制，但配置更复杂。',
        },
        {
          type: 'analogy',
          title: '酒店前台与公司审批',
          text: 'RADIUS 像酒店前台：核对身份证、发房卡、记消费，一次办完，效率高。HWTACACS 像公司里三个人分工：HR 确认你是谁，部门经理批你能进哪些系统，财务记你的开销，每一步都能单独留痕。前者适合大量访客快速通行，后者适合少量高权限管理员严格管控。',
        },
        {
          type: 'table',
          title: '两种协议的关键差异',
          columns: ['对比项', 'RADIUS', 'HWTACACS'],
          rows: [
            ['传输层', 'UDP，1812/1813', 'TCP，49'],
            ['认证与授权', '合并返回', '分离，可分别处理'],
            ['命令级授权', '不支持', '支持'],
            ['典型用途', '员工与访客上网认证', '设备管理员登录与命令授权'],
          ],
        },
        {
          type: 'paragraph',
          text: '接入侧有两种主流认证方式。802.1X 工作在二层，终端通过 EAPOL 与交换机交互，交换机把 EAP 报文封装成 RADIUS 转给服务器；端口在认证通过前只放行认证报文，通过后才放行业务。Portal 工作在三层，终端先拿到地址，访问任意网页时被重定向到认证页面，适合不支持 802.1X 的打印机、摄像头与访客手机。',
        },
        {
          type: 'code',
          title: 'RADIUS 模板、认证域与接口 802.1X',
          lang: 'vrp',
          code: `system-view
radius-server template radius-corp
 radius-server shared-key cipher Huawei@123
 radius-server authentication 10.10.20.10 1812
 radius-server accounting 10.10.20.10 1813
 quit
aaa
 authentication-scheme auth-corp
  authentication-mode radius
  quit
 domain corp.com
  authentication-scheme auth-corp
  radius-server radius-corp
  quit
 quit
interface GigabitEthernet1/0/1
 dot1x enable
 quit`,
        },
        {
          type: 'output',
          title: 'display access-user 与认证失败排查',
          text: `<SW1> display access-user
  User name   MAC address       IP address    Auth method  Domain      State
  zhangsan    00e0-fc-aa-bb-01 192.168.10.21 dot1x        corp.com    online
  printer-01  00e0-fc-aa-bb-07 192.168.10.51 portal       corp.com    online

<SW1> display aaa offline-record all
  User name : test01
  MAC       : 00e0-fc-aa-bb-09
  Reason    : radius authentication reject
  Time      : 2026-11-12 09:14:22`,
        },
        {
          type: 'warning',
          title: '共享密钥与 NAS-IP 必须两端一致',
          text: 'RADIUS 认证失败最常见的两个原因：设备与服务器之间的 shared-key 不一致，设备侧发送的 NAS-IP 不是服务器期望的地址。后者在设备有多块网卡或做过 NAT 时尤其容易发生，需要在 radius-server 视图下显式指定 source ip-address。排查先看服务器侧日志，再看设备侧离线记录，通常能直接看到 reject 原因。',
        },
        {
          type: 'tip',
          title: '计费报文是审计的证据链',
          text: '认证只记录「谁进来了」，计费才记录「什么时候来、什么时候走、用了多少流量」。等保要求留存网络访问日志，因此 accounting 不能省。排障时也可以用计费记录反查某个 IP 在某段时间对应哪个用户，这在定位安全事件时比查 DHCP 租约更直接。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm09-l10',
      moduleId: 'm09',
      title: 'IPS、Anti-DDoS、零信任与安全排错',
      depth: '精通',
      minutes: 36,
      summary: '检测与阻断如何配合，零信任改变了什么，以及三类高频故障的取证顺序。',
      objectives: [
        '区分 IDS 旁路检测与 IPS 串联阻断的部署差异',
        '说明 Anti-DDoS 清洗与限速的基本手段',
        '用零信任原则重构内网访问控制',
        '按策略、路由、NAT、会话的顺序定位安全故障',
      ],
      keywords: ['IDS', 'IPS', 'Anti-DDoS', '零信任', '策略不生效', 'NAT 回流', '安全排错'],
      blocks: [
        {
          type: 'paragraph',
          text: '防火墙管的是「能不能通」，IPS 管的是「通的内容有没有问题」。IDS（Intrusion Detection System）以旁路镜像方式部署，只检测告警不阻断，优点是零业务影响，缺点是发现了也来不及拦；IPS（Intrusion Prevention System）串联在路径上，可以实时丢包阻断，但必须承担性能与误判风险。现实中常用「IPS 串联 + 旁路流量回溯」的组合，兼顾阻断与取证。',
        },
        {
          type: 'paragraph',
          text: 'Anti-DDoS 针对的是流量型攻击：SYN Flood 耗尽连接表、UDP Flood 打满带宽、CC 攻击耗尽应用并发。防护手段包括SYN 源认证（代理完成三次握手，真实客户端才放行）、限速与并发连接数限制、清洗中心引流。清洗的本质是把攻击流量引到专用设备过滤，再把干净流量回注，因此引流路由与回注路径必须提前规划。',
        },
        {
          type: 'analogy',
          title: '摄像头、保安与门禁',
          text: 'IDS 是监控摄像头，能看到有人翻墙但只能事后回放；IPS 是门口保安，看到可疑行为当场拦下，但也可能误拦送外卖的；Anti-DDoS 是大楼入口的限流栏杆，防止有人带着一车人同时挤门；零信任则是要求每个人每次进每一道门都重新刷卡，哪怕他五分钟前刚出去。',
        },
        {
          type: 'paragraph',
          text: '零信任（Zero Trust）的核心是「永不信任，始终验证」：不再因为请求来自内网就默认可信，而是每次访问都基于身份、设备状态、访问上下文做动态授权，并遵循最小权限。落地形态包括 SDP（软件定义边界，先认证再暴露服务）、微隔离（东西向流量按业务粒度管控）和持续信任评估。它不替代防火墙，而是把「一次认证、长期通行」改成「持续验证」。',
        },
        {
          type: 'table',
          title: '三类高频故障的取证路径',
          columns: ['故障', '第一步看什么', '常见根因', '修复方向'],
          rows: [
            ['策略不生效', '接口是否入域、策略命中计数', '方向写反、地址被 NAT 改写、路由不通', '纠正域与方向，策略按 NAT 后地址写'],
            ['IPsec 隧道起不来', 'display ike sa 有无一阶段', '提议无交集、密钥不一致、UDP 500 被拦', '统一提议模板，放行 500/4500'],
            ['NAT 回流失败', 'display nat session all 有无表项', '只配出方向 NAT，未做 hairpin', '内网访问公网地址也做源 NAT'],
          ],
        },
        {
          type: 'steps',
          title: '安全故障四步排查',
          items: [
            { title: '确认路径', text: 'display ip routing-table 与接口状态，先排除路由与物理层问题。' },
            { title: '确认域与策略', text: '接口是否加入正确安全域，display security-policy 的命中计数是否增长。' },
            { title: '确认转换', text: 'display nat session all 看地址端口是否符合预期，注意策略匹配的是转换后地址。' },
            { title: '确认会话与统计', text: 'display firewall session table verbose 看状态，用 IPS 与 DDoS 统计确认是否被安全功能误拦。' },
          ],
        },
        {
          type: 'code',
          title: '排错取证常用命令组合',
          lang: 'vrp',
          code: `display firewall session table verbose
display security-policy rule name trust-to-untrust-web
display nat session all
display ike sa
display ipsec statistics
display firewall statistic system
display anti-ddos statistic
display logbuffer | include deny`,
        },
        {
          type: 'output',
          title: '从会话与策略命中反推问题',
          text: `<FW1> display security-policy rule name trust-to-untrust-web
RULE NAME                FROM   TO       SOURCE           DESTINATION      ACTION  HITS
trust-to-untrust-web     trust  untrust  192.168.10.0/24  200.1.1.0/24     permit  0

<FW1> display firewall session table verbose
  TCP  VPN: public -> public
    Source      : 192.168.10.21:51882
    Destination : 200.1.1.20:443
    Zone        : trust -> untrust
    Policy      : -
    State       : Discard`,
        },
        {
          type: 'warning',
          title: '命中计数为 0 就是最直接的证据',
          text: '策略明明配了 permit，业务还是不通，而命中计数一直是 0，说明流量根本没走到这条策略：可能是接口没入域、方向写反、源地址被 NAT 提前改写，或者报文在更早的 ACL 就被丢弃。此时不要继续改策略动作，而应回到「报文从哪进、属于哪个域、地址是什么」这三个问题。计数不会撒谎，配置会。',
        },
        {
          type: 'tip',
          title: '先止血再定位，但别毁掉现场',
          text: '生产故障可以先加临时放行恢复业务，但必须同时保留证据：导出会话表、策略计数、日志与抓包。直接重启设备或清空会话，会让根因永远查不清，同类问题下次还会复发。规范做法是记录变更时间点、临时策略编号与回滚计划，故障恢复后在维护窗口完成根因分析与策略收敛。',
        },
        {
          type: 'checklist',
          title: '安全变更上线前检查',
          items: [
            '策略的源、目的、服务是否有明确业务依据',
            '接口是否已加入正确的安全域',
            'NAT 与策略的先后顺序是否核对过',
            '是否保留了回滚配置与命中计数基线',
            '变更后是否验证了双向流量与会话状态',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
