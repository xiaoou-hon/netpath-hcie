import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm00',
  code: 'M00',
  title: '网络入门与 TCP/IP',
  summary:
    '从零建立网络直觉：设备为什么要联网、数据怎样被逐层封装、交换机如何按 MAC 转发、ARP 怎么找到下一跳，以及 TCP 与 UDP 各自解决什么问题。最后串起一次网页访问的完整过程，每课配华为 VRP 命令与回显。',
  stage: 'L1',
  order: 0,
  goals: [
    '用分层与封装解释一次网页访问的完整过程',
    '说清 MAC 地址、IP 地址、端口号三类地址各自的作用范围',
    '读懂以太网帧、IPv4 头部与 TCP 标志位的含义',
    '在华为设备上查看接口、MAC 表、ARP 表与 TCP 连接状态',
    '建立先分层定位、再逐层验证的排错习惯',
  ],
  keywords: ['OSI 七层', 'TCP/IP', '封装', '以太网', 'MAC 地址', 'ARP', 'TCP 三次握手', 'UDP', 'DNS'],
  lessons: [
    {
      id: 'm00-l01',
      moduleId: 'm00',
      title: '网络是什么：从设备互联到互联网',
      depth: '了解',
      minutes: 12,
      summary: '用生活语言说清网络、局域网、广域网和协议分别是什么，建立第一层直觉。',
      objectives: [
        '说出网络能够成立的三个基本条件',
        '区分局域网、城域网与广域网的使用场景',
        '用 ping 判断两台设备是否连通',
      ],
      keywords: ['网络', '局域网', '广域网', '协议', 'ping'],
      blocks: [
        {
          type: 'paragraph',
          text: '两台电脑用一根网线连起来，就能互相传文件，这叫最简单的网络。把越来越多的设备连在一起，让它们能互相找到、互相发送数据，就形成了局域网；再把不同城市的局域网连起来，就成了广域网和互联网。学网络的第一步，不是背命令，而是搞清楚“谁在和谁说话、通过什么规则说话”。',
        },
        {
          type: 'heading',
          text: '一个网络必须凑齐三样东西',
          level: 3,
        },
        {
          type: 'list',
          title: '网络成立的三要素',
          items: [
            '设备：电脑、手机、打印机、服务器，以及交换机和路由器这类转发设备。',
            '链路：网线、光纤、无线信号，负责把数据从一头送到另一头。',
            '规则：双方约定好的通信规则，也就是协议，否则发出去的数据对方看不懂。',
          ],
        },
        {
          type: 'analogy',
          title: '把网络想成一张快递网',
          text: '设备是寄件人和收件人，链路是公路和航线，协议是快递单的填写规范。只把包裹扔到路上没有意义，必须写清收件地址、按标准打包、由分拣中心中转，包裹才能送达。网络里的数据包也是同样的道理。',
        },
        {
          type: 'table',
          title: '三种常见的网络范围',
          columns: ['类型', '覆盖范围', '典型设备', '生活中的例子'],
          rows: [
            ['局域网 LAN', '一间办公室、一层楼、一个园区', '交换机、无线 AP', '家里的 Wi-Fi、公司的内网'],
            ['城域网 MAN', '一座城市', '运营商汇聚设备', '同一城市两个分公司的互联'],
            ['广域网 WAN', '跨城市、跨国家', '路由器、运营商骨干网', '访问网站、跨省专线'],
          ],
        },
        {
          type: 'output',
          title: '验证两台设备是否连通',
          text: `<Huawei>ping 192.168.1.1
  PING 192.168.1.1: 56 data bytes, press CTRL_C to break
    Reply from 192.168.1.1: bytes=56 Sequence=1 ttl=64 time=1 ms
    Reply from 192.168.1.1: bytes=56 Sequence=2 ttl=64 time=1 ms
    Reply from 192.168.1.1: bytes=56 Sequence=3 ttl=64 time=2 ms

  --- 192.168.1.1 ping statistics ---
    3 packet(s) transmitted
    3 packet(s) received
    0.00% packet loss
    round-trip min/avg/max = 1/1/2 ms`,
        },
        {
          type: 'warning',
          title: '带宽大不等于上网快',
          text: '带宽只决定单位时间最多能传多少数据，真正影响体验的还有延迟、抖动和丢包。一条千兆链路如果时延很高或频繁丢包，看视频照样会卡。排错时不要只盯着带宽。',
        },
        {
          type: 'tip',
          title: '初学阶段的正确姿势',
          text: '每学一个概念，都问自己三个问题：它是解决什么问题的、它在哪一层工作、我用什么命令能看到它。把这三问答顺，比死记命令有效得多。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm00-l02',
      moduleId: 'm00',
      title: '分层思维：OSI 七层与 TCP/IP 四层',
      depth: '熟悉',
      minutes: 18,
      summary: '用 OSI 七层和 TCP/IP 四层两把尺子，把复杂的网络问题拆成可以分别排查的小块。',
      objectives: [
        '画出 OSI 七层与 TCP/IP 四层的对应关系',
        '说出每一层最核心的职责',
        '按分层思路判断一个故障大概出在哪一层',
      ],
      keywords: ['OSI', 'TCP/IP', '应用层', '传输层', '网络层', '数据链路层', '物理层'],
      blocks: [
        {
          type: 'paragraph',
          text: '网络问题往往同时涉及浏览器、操作系统、网卡、网线、交换机和路由器。如果不分层，一次网页打不开就要把所有设备查一遍，效率极低。分层模型的价值就在于此：它把一件事拆成上下衔接的若干层，每层只关心自己的职责，排错时也能一层一层往下验证。',
        },
        {
          type: 'analogy',
          title: '寄一份跨省快递',
          text: '你负责写清收件人和物品，快递员负责打包贴单，分拣中心负责按城市分流，司机负责把车开上高速。每一层都用上一层交给它的东西，再加上自己的信息。没有哪一层需要知道司机的发动机怎么工作，这就是分层的意义。',
        },
        {
          type: 'table',
          title: 'OSI 七层与 TCP/IP 四层对照',
          columns: ['OSI 七层', 'TCP/IP 四层', '这一层关心什么', '典型协议或设备'],
          rows: [
            ['应用层、表示层、会话层', '应用层', '业务数据怎么被使用和呈现', 'HTTP、DNS、FTP'],
            ['传输层', '传输层', '端到端可靠或快速地送达', 'TCP、UDP'],
            ['网络层', '网络层', '跨多个网络的寻址与转发', 'IP、ICMP、路由器'],
            ['数据链路层', '网络接口层', '同一段链路上的帧传输', '以太网、交换机'],
            ['物理层', '网络接口层', '电信号、光信号、接口形态', '网线、光纤、光模块'],
          ],
        },
        {
          type: 'list',
          title: '每层一句话职责',
          ordered: true,
          items: [
            '物理层：把 0 和 1 变成能在线缆上传输的电或光信号。',
            '数据链路层：在同一段链路内，用 MAC 地址把帧交给正确的邻居。',
            '网络层：用 IP 地址规划路径，让数据跨越多个网络到达目的地。',
            '传输层：用端口号区分应用，并决定要不要重传、要不要控速。',
            '应用层：浏览器、邮件、域名解析等具体业务规则。',
          ],
        },
        {
          type: 'heading',
          text: '分层排错：从下往上还是从上往下',
          level: 3,
        },
        {
          type: 'output',
          title: '先确认最底层的物理与链路状态',
          text: `<Huawei>display interface GigabitEthernet0/0/0
GigabitEthernet0/0/0 current state : UP
Line protocol current state : UP
Description : to-switch
Route Port,The Maximum Transmit Unit is 1500
Internet Address is 192.168.1.1/24
IP Sending Frames' Format is PKTFMT_ETHNT_2, Hardware address is 5489-98c4-1a2b
Bandwidth 1000000 kbps`,
        },
        {
          type: 'tip',
          title: '记住四层就够用',
          text: '日常排错按“物理与链路、IP 与路由、TCP 与端口、应用与域名”四段走。接口 down 就不要去查 DNS，方向错了再努力也没用。',
        },
        {
          type: 'warning',
          title: '不要把协议和层一一对应死',
          text: 'ARP 常被说成二层协议，但它的报文又封装在以太网帧里传；BGP 跑在 TCP 之上，却属于应用层协议。分层是理解工具，不是死板的分类表，判断时看它解决的问题更可靠。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm00-l03',
      moduleId: 'm00',
      title: '封装与解封装：数据从应用到网线',
      depth: '熟悉',
      minutes: 20,
      summary: '跟着一份数据走完从应用到网线的逐层打包过程，理解每层头部的真正用途。',
      objectives: [
        '说出封装与解封装的先后顺序',
        '识别各层数据单元的名称与关键标识',
        '用 MTU 解释为什么大包会被分片',
      ],
      keywords: ['封装', '解封装', 'PDU', 'MTU', '分片', '帧'],
      blocks: [
        {
          type: 'paragraph',
          text: '你在浏览器里点一下发送，数据并不会原样飞出去。它会先在传输层被加上端口号，再在网络层被加上源和目的 IP，然后在数据链路层被加上源和目的 MAC，最后变成比特流送到网线上。每加一层头部，就多解决一类“送到哪里”的问题，这个过程叫封装；收方从下往上逐层拆掉头部，叫解封装。',
        },
        {
          type: 'analogy',
          title: '大箱套小箱',
          text: '把数据想成一件衣服：先用防水袋装好并贴上“内件是衣服”，再装进纸箱写上“寄往杭州”，最后贴上快递面单写上“某小区某栋”。每层包装只服务于对应的一段运输，收件人拆到最里面才看到衣服。头部就是每层包装上的标签。',
        },
        {
          type: 'interactive',
          key: 'encapsulation',
          caption: '拖动查看数据在每一层被加上的头部与拆解过程',
        },
        {
          type: 'interactive',
          key: 'protocol-explorer',
          caption: '选一个协议，逐步播放它的报文流，并点开每个字段看字节含义',
        },
        {
          type: 'steps',
          title: '封装五步',
          items: [
            { title: '应用层生成数据', text: '浏览器把 HTTP 请求组织成文本，此时只有业务内容。' },
            { title: '传输层加 TCP 头', text: '写入源端口和目的端口，让对方的操作系统知道交给哪个程序。' },
            { title: '网络层加 IP 头', text: '写入源 IP 和目的 IP，并设置 TTL，负责跨网络寻址。' },
            { title: '链路层加帧头帧尾', text: '写入源 MAC 和目的 MAC，并追加 FCS 校验，负责本段链路交付。' },
            { title: '物理层转为比特', text: '把整帧编码成电信号或光信号，从接口发送出去。' },
          ],
        },
        {
          type: 'table',
          title: '各层的数据单元与关键标识',
          columns: ['层次', '数据单元名称', '关键标识', '主要作用'],
          rows: [
            ['应用层', '数据 Data', '无固定标识', '承载具体业务内容'],
            ['传输层', '段 Segment', '端口号', '区分不同应用进程'],
            ['网络层', '包 Packet', 'IP 地址', '端到端寻址与选路'],
            ['数据链路层', '帧 Frame', 'MAC 地址', '同一链路内交付'],
            ['物理层', '比特 Bit', '无', '信号传输'],
          ],
        },
        {
          type: 'output',
          title: 'MTU 与封装开销：1472 字节是怎么来的',
          text: `<Huawei>display interface GigabitEthernet0/0/0
GigabitEthernet0/0/0 current state : UP
Route Port,The Maximum Transmit Unit is 1500

<Huawei>ping -s 1472 192.168.1.2
  PING 192.168.1.2: 1472 data bytes, press CTRL_C to break
    Reply from 192.168.1.2: bytes=1472 Sequence=1 ttl=64 time=3 ms

  --- 192.168.1.2 ping statistics ---
    1 packet(s) transmitted
    1 packet(s) received
    0.00% packet loss`,
        },
        {
          type: 'warning',
          title: '分片会明显拖慢性能',
          text: '以太网 MTU 通常是 1500 字节，其中 20 字节给 IP 头、8 字节给 ICMP 头，所以 ping 最多带 1472 字节数据。超过这个长度就要分片，任何一片丢失都要重传整包，延迟会成倍上升，能避免就避免。',
        },
        {
          type: 'tip',
          title: '排错时先怀疑封装在哪一层断了',
          text: '能 ping 通 IP 但打不开网页，说明网络层往下是通的，问题多半在传输层端口或应用层；连网关都 ping 不通，就不要再查 DNS 了。封装顺序就是排错顺序的倒影。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm00-l04',
      moduleId: 'm00',
      title: '以太网与 MAC 地址：交换机怎样转发',
      depth: '了解',
      minutes: 20,
      summary: '看懂以太网帧的结构，理解交换机学习 MAC 地址并转发帧的三个动作。',
      objectives: [
        '说出以太网帧中目的 MAC、源 MAC 与 FCS 的作用',
        '解释交换机学习、查表、泛洪的转发过程',
        '在交换机上查看 MAC 地址表定位设备',
      ],
      keywords: ['以太网', 'MAC 地址', '交换机', '广播', 'MAC 地址表'],
      blocks: [
        {
          type: 'paragraph',
          text: '在一个局域网里，真正把数据从一台机器送到另一台机器的，是交换机。交换机不认识 IP 地址，它只看以太网帧里的 MAC 地址。MAC 地址是网卡出厂时烧录的物理地址，共 48 位，写成 5489-98c4-1a2b 这样的形式，理论上全球唯一。',
        },
        {
          type: 'analogy',
          title: '交换机就是快递分拣中心',
          text: '每个包裹上写着收件人的身份证号，也就是目的 MAC。分拣中心第一次看到某个身份证从 3 号口进来，就记下“这个人在 3 号口”；下次再寄给他，直接从对应口送出去。如果没见过这个收件人，就向所有出口喊一遍，这就是泛洪。',
        },
        {
          type: 'heading',
          text: '以太网帧长什么样',
          level: 3,
        },
        {
          type: 'table',
          title: '以太网 II 帧的主要字段',
          columns: ['字段', '长度', '作用'],
          rows: [
            ['目的 MAC', '6 字节', '这一帧最终交给哪块网卡'],
            ['源 MAC', '6 字节', '这一帧由哪块网卡发出'],
            ['类型', '2 字节', '上层是什么协议，0x0800 表示 IPv4'],
            ['数据', '46 至 1500 字节', '承载上层数据，不足 46 字节要填充'],
            ['FCS', '4 字节', '帧校验序列，出错则整帧丢弃'],
          ],
        },
        {
          type: 'output',
          title: '查看交换机的 MAC 地址表',
          text: `<Huawei>display mac-address
MAC Address    VLAN/VSI/BD   Learned-For   Interface                Type
5489-98c4-1a2b  1             -             GigabitEthernet0/0/1     dynamic
5489-98a1-2b3c  1             -             GigabitEthernet0/0/2     dynamic
5489-98d3-4e5f  1             -             GigabitEthernet0/0/3     dynamic

Total items: 3`,
        },
        {
          type: 'steps',
          title: '交换机处理一帧的三个动作',
          items: [
            { title: '学习', text: '收到帧后，把源 MAC 和收到该帧的接口写入 MAC 地址表。' },
            { title: '查表', text: '用目的 MAC 查表，命中则只从对应接口转发，称为单播转发。' },
            { title: '泛洪', text: '查不到目的 MAC 时，向同一 VLAN 内除入接口外的所有接口复制发送。' },
          ],
        },
        {
          type: 'warning',
          title: '广播过多会拖垮整个局域网',
          text: '目的 MAC 为全 F 的帧是广播帧，交换机会向所有接口转发。广播帧过多会占满链路和 CPU，形成广播风暴。划分 VLAN、开启风暴抑制是常见的治理手段。',
        },
        {
          type: 'tip',
          title: '定位某台电脑接在哪个口',
          text: '先在电脑上查到网卡 MAC，再用 display mac-address 加过滤条件查看对应的 Interface。MAC 表项有老化时间，长期无流量的表项会消失，查之前最好让该设备先发一次数据。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm00-l05',
      moduleId: 'm00',
      title: 'TCP 与 UDP：可靠传输要付出什么代价',
      depth: '熟悉',
      minutes: 18,
      summary: '对比 TCP 与 UDP 的能力差异，学会根据业务特点选择合适的传输协议。',
      objectives: [
        '说出 TCP 与 UDP 在可靠性、开销、时延上的差别',
        '列举常见应用使用的传输层协议与端口',
        '在设备上查看当前的 TCP 连接状态',
      ],
      keywords: ['TCP', 'UDP', '端口号', '可靠传输', '面向连接'],
      blocks: [
        {
          type: 'paragraph',
          text: 'IP 只负责把包尽力送到目的主机，不保证顺序，也不保证不丢。真正决定“丢了要不要重发、乱了要不要排序”的，是传输层的两种协议：TCP 和 UDP。TCP 面向连接、确认重传、流量控制，代价是额外的握手和头部开销；UDP 不建连接、不确认，换来的是低时延和小开销。',
        },
        {
          type: 'analogy',
          title: '挂号信和明信片',
          text: 'TCP 像挂号信：寄之前确认地址，寄出后要回执，丢了就重寄，收件人按编号排序。UDP 像明信片：写完就投，快、便宜，但丢了没人负责，也不保证先寄先到。选哪种，取决于你能不能承受丢件。',
        },
        {
          type: 'table',
          title: 'TCP 与 UDP 关键差异',
          columns: ['对比项', 'TCP', 'UDP'],
          rows: [
            ['连接方式', '面向连接，先握手再传数据', '无连接，直接发'],
            ['可靠性', '确认、重传、排序', '不保证送达与顺序'],
            ['头部开销', '20 字节起', '8 字节'],
            ['传输方式', '字节流', '数据报，保留报文边界'],
            ['典型应用', '网页、文件传输、远程登录', '视频、语音、DNS 查询、游戏'],
          ],
        },
        {
          type: 'list',
          title: '必须记住的常用端口',
          items: [
            'HTTP 使用 TCP 80，HTTPS 使用 TCP 443。',
            'SSH 使用 TCP 22，Telnet 使用 TCP 23。',
            'FTP 控制使用 TCP 21，数据使用 TCP 20。',
            'DNS 查询通常使用 UDP 53，区域传送使用 TCP 53。',
            'DHCP 使用 UDP 67 和 68。',
          ],
        },
        {
          type: 'output',
          title: '查看设备上的 TCP 连接',
          text: `<Huawei>display tcp status
TCPCB    Tid/Soid Local Add:port        Foreign Add:port      State
180a2c40 1/1    192.168.1.1:23          192.168.1.10:49152    ESTABLISHED
180a3b10 2/2    192.168.1.1:22          192.168.1.11:49153    ESTABLISHED
180a4d20 3/3    192.168.1.1:179         192.168.1.2:52344     ESTABLISHED`,
        },
        {
          type: 'tip',
          title: '端口号就是应用的门牌',
          text: 'IP 地址定位到主机，端口号定位到主机上的某个程序。排错时如果 ping 通但服务连不上，优先检查服务是否监听、防火墙是否放行该端口，而不是继续查路由。',
        },
        {
          type: 'warning',
          title: 'UDP 不是不会丢包',
          text: 'UDP 只是不负责重传，不代表链路不会丢包。语音和视频业务依靠编码冗余与应用层策略来容忍丢包，一旦丢包率过高，仍然会出现花屏和断续，不要误以为换成 UDP 就万事大吉。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm00-l06',
      moduleId: 'm00',
      title: 'TCP 连接管理：三次握手与四次挥手',
      depth: '熟悉',
      minutes: 22,
      summary: '逐步拆解 TCP 建立与释放连接的过程，理解每个标志位和状态变化的意义。',
      objectives: [
        '复述三次握手与四次挥手的报文顺序',
        '解释 SYN、ACK、FIN、RST 标志位的含义',
        '从连接状态判断是服务未启动还是链路不通',
      ],
      keywords: ['三次握手', '四次挥手', 'SYN', 'ACK', 'FIN', '连接状态'],
      blocks: [
        {
          type: 'paragraph',
          text: 'TCP 在传数据之前必须先建立连接。双方要确认三件事：你在线吗、我也在线、我们都能收到对方的消息。这需要三次报文交换，少一次都不够。连接用完还要释放，因为 TCP 是全双工的，两个方向要分别关闭，所以正常释放需要四次挥手。',
        },
        {
          type: 'analogy',
          title: '打电话前的确认',
          text: '你问“能听到吗”，对方答“能听到，你能听到我吗”，你再说“能”。这三句之后双方才确认彼此的听筒和话筒都正常。挂电话时也要各说一次“我这边说完了”，再说“好，挂了”，这就是两个方向的分别关闭。',
        },
        {
          type: 'interactive',
          key: 'tcp-handshake',
          caption: '单步播放三次握手与四次挥手，观察序号和状态的变化',
        },
        {
          type: 'steps',
          title: '三次握手',
          items: [
            { title: '第一次：客户端发 SYN', text: '客户端随机选一个初始序号 seq=x，置 SYN 为 1，表示我想建立连接。' },
            { title: '第二次：服务端回 SYN 加 ACK', text: '服务端回 seq=y、ack=x+1，同时置 SYN 和 ACK，表示我收到了，也想建立连接。' },
            { title: '第三次：客户端回 ACK', text: '客户端发 ack=y+1，置 ACK。双方进入 ESTABLISHED，可以开始传数据。' },
          ],
        },
        {
          type: 'table',
          title: '常见标志位速查',
          columns: ['标志位', '含义', '典型场景'],
          rows: [
            ['SYN', '同步序号，请求建立连接', '握手第一步和第二步'],
            ['ACK', '确认号有效，表示已收到对方数据', '握手第二步之后的所有报文'],
            ['FIN', '发送方没有数据要发了，请求关闭', '挥手第一步和第三步'],
            ['RST', '重置连接，表示拒绝或异常终止', '端口未监听、连接异常'],
          ],
        },
        {
          type: 'steps',
          title: '四次挥手',
          items: [
            { title: '第一次：主动方发 FIN', text: '主动关闭方发 FIN，表示自己没有数据要发了，进入 FIN_WAIT_1。' },
            { title: '第二次：被动方回 ACK', text: '被动方确认收到，进入 CLOSE_WAIT，此时它可能还有数据要发。' },
            { title: '第三次：被动方发 FIN', text: '被动方数据发完，发 FIN 请求关闭自己这个方向。' },
            { title: '第四次：主动方回 ACK', text: '主动方确认后进入 TIME_WAIT，等待 2 倍报文最大生存时间后彻底关闭。' },
          ],
        },
        {
          type: 'output',
          title: '从状态判断连接是否建立成功',
          text: `<Huawei>display tcp status
TCPCB    Tid/Soid Local Add:port        Foreign Add:port      State
180a2c40 1/1    192.168.1.1:80          192.168.1.10:49152    ESTABLISHED
180a3b10 2/2    192.168.1.1:80          192.168.1.11:49153    SYN_RCVD
180a4d20 3/3    192.168.1.1:23          192.168.1.12:49154    TIME_WAIT`,
        },
        {
          type: 'warning',
          title: '大量半连接可能是攻击',
          text: '如果设备上出现大量 SYN_RCVD 状态，说明连接只完成了前两步，可能是网络质量差导致最后的 ACK 丢失，也可能是 SYN Flood 攻击。不要只当性能问题处理，要同时检查链路和防护策略。',
        },
        {
          type: 'tip',
          title: 'TIME_WAIT 不是故障',
          text: '主动关闭方会进入 TIME_WAIT 并等待一段时间，这是为了确保最后的 ACK 能到达，并让旧连接的残留报文在网络中消失。短时间看到较多 TIME_WAIT 属于正常现象。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm00-l07',
      moduleId: 'm00',
      title: 'ARP 与 IPv4 头部：同一网段通信的两把钥匙',
      depth: '熟悉',
      minutes: 20,
      summary: '理解 IP 地址与 MAC 地址如何配合完成同网段交付，读懂 IPv4 头部的关键字段。',
      objectives: [
        '解释 ARP 请求与应答的完整过程',
        '说出 IPv4 头部中 TTL、协议、源目地址的作用',
        '查看并清理设备上的 ARP 表项',
      ],
      keywords: ['ARP', 'IPv4 头部', 'TTL', '广播', 'ARP 表'],
      blocks: [
        {
          type: 'paragraph',
          text: '数据要发出去，必须同时知道对方的 IP 地址和 MAC 地址。IP 地址告诉你“目的地在哪”，MAC 地址告诉交换机“这一帧交给哪块网卡”。如果只知道 IP 不知道 MAC，就要用 ARP 协议去问。ARP 的请求是广播，应答是单播，问到的结果会缓存到 ARP 表里。',
        },
        {
          type: 'analogy',
          title: '在小区里喊名字',
          text: '你知道对方住在 3 号楼 201，但不知道他长什么样。于是站在小区广场喊一声“3 号楼 201 的住户在吗”，所有人都听到了，只有真正的住户回应你并告诉你他的样貌。之后你就记住了，下次直接找这张脸，不必再喊。ARP 表和这个记忆就是同一回事。',
        },
        {
          type: 'steps',
          title: 'ARP 工作过程',
          items: [
            { title: '查本地 ARP 表', text: '主机先看缓存里有没有目的 IP 对应的 MAC，有就直接封装帧。' },
            { title: '发 ARP 请求', text: '没有则发送广播帧，目的 MAC 为全 F，询问某个 IP 是谁。' },
            { title: '目标主机单播应答', text: '只有 IP 匹配的主机回应，把自己的 MAC 告知请求方。' },
            { title: '写入 ARP 表', text: '请求方缓存该映射，后续通信直接使用，表项会定期老化。' },
          ],
        },
        {
          type: 'table',
          title: 'IPv4 头部必须认识的字段',
          columns: ['字段', '作用', '排错时的意义'],
          rows: [
            ['版本', '值为 4，表示 IPv4', '区分 IPv4 与 IPv6'],
            ['总长度', '整个 IP 包的长度', '结合 MTU 判断是否分片'],
            ['标识、标志、片偏移', '支持分片与重组', '分片过多会影响性能'],
            ['TTL', '每经过一台路由器减 1，减到 0 丢弃', '防止环路，也能推测跳数'],
            ['协议', '6 表示 TCP，17 表示 UDP，1 表示 ICMP', '判断上层是什么协议'],
            ['源 IP、目的 IP', '标识通信双方', '路由与策略匹配的依据'],
          ],
        },
        {
          type: 'output',
          title: '查看与清理 ARP 表',
          text: `<Huawei>display arp all
IP ADDRESS      MAC ADDRESS     EXPIRE(M) TYPE        INTERFACE
192.168.1.1     5489-98c4-1a2b            I -         GigabitEthernet0/0/0
192.168.1.2     5489-98a1-2b3c  20        D-0         GigabitEthernet0/0/0
192.168.1.3     5489-98d3-4e5f  18        D-0         GigabitEthernet0/0/0

Total: 3     Dynamic: 2     Static: 0`,
        },
        {
          type: 'code',
          title: '绑定静态 ARP，防止地址被冒充',
          lang: 'vrp',
          code: `system-view
sysname R1
arp static 192.168.1.2 5489-98a1-2b3c
quit
display arp static`,
        },
        {
          type: 'warning',
          title: 'ARP 欺骗是内网常见风险',
          text: 'ARP 没有身份验证，任何主机都可以声称某个 IP 对应自己的 MAC。攻击者借此把流量引到自己身上，造成断网或窃听。常见防护包括静态 ARP 绑定、DHCP Snooping 和动态 ARP 检测。',
        },
        {
          type: 'tip',
          title: '同网段不通先看 ARP',
          text: '如果两台同网段主机互相 ping 不通，先看 ARP 表里有没有对方表项。没有表项说明二层就没通，问题在 VLAN、接口或链路，而不是路由。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm00-l08',
      moduleId: 'm00',
      title: 'DNS 与 HTTP：一次网页访问的完整旅程',
      depth: '了解',
      minutes: 25,
      summary: '把前面学的所有知识串起来，完整还原从输入网址到页面显示的全过程。',
      objectives: [
        '按顺序说出一次网页访问经过的各个协议',
        '区分域名解析失败与网络不通两种现象',
        '用 ping 和 tracert 做初步定位',
      ],
      keywords: ['DNS', 'HTTP', 'HTTPS', '域名解析', 'tracert'],
      blocks: [
        {
          type: 'paragraph',
          text: '在浏览器里输入网址并按下回车，看似一瞬间，背后其实发生了域名解析、路由寻址、ARP 找下一跳、TCP 握手、HTTP 请求与响应、页面渲染等多件事。把这条链路走通一遍，你之前学的分层、封装、IP、TCP 就全部串起来了。',
        },
        {
          type: 'analogy',
          title: '去陌生城市找一个人',
          text: '先查通讯录把姓名换成住址，这一步是 DNS；再看地图规划路线，这一步是路由；到小区门口问保安怎么走，这一步是 ARP；敲门确认对方在家，这一步是 TCP 握手；见面交谈，这一步是 HTTP。任何一步断了，你都见不到人。',
        },
        {
          type: 'steps',
          title: '一次网页访问的六个阶段',
          items: [
            { title: '解析域名', text: '浏览器先查本地缓存，再向 DNS 服务器查询 www.example.com 对应的 IP 地址。' },
            { title: '查路由', text: '主机判断目的 IP 是否同网段，不同则把包交给默认网关。' },
            { title: 'ARP 找网关 MAC', text: '若不知道网关 MAC，先发 ARP 请求，拿到后封装以太网帧。' },
            { title: 'TCP 握手', text: '与服务器 443 端口完成三次握手，建立可靠连接。' },
            { title: '发起 HTTPS 请求', text: '在连接上发送请求报文，服务器返回状态码和网页内容。' },
            { title: '浏览器渲染', text: '解析 HTML、加载图片和脚本，最终把页面画出来。' },
          ],
        },
        {
          type: 'table',
          title: '这条链路上的关键协议',
          columns: ['阶段', '协议', '默认端口', '失败时的典型现象'],
          rows: [
            ['域名解析', 'DNS', 'UDP 53', '提示找不到服务器或域名无法解析'],
            ['建立连接', 'TCP', '443', '页面一直转圈，最终连接超时'],
            ['传输网页', 'HTTPS', '443', '证书告警或连接被重置'],
            ['网络层定位', 'ICMP', '无端口', 'ping 不通，请求超时'],
          ],
        },
        {
          type: 'output',
          title: '先 IP 后域名：两步定位法',
          text: `<Huawei>ping www.example.com
  PING www.example.com (203.0.113.10): 56 data bytes
    Reply from 203.0.113.10: bytes=56 Sequence=1 ttl=54 time=28 ms

<Huawei>tracert 203.0.113.10
traceroute to 203.0.113.10, max hops: 30, packet length: 40
 1  192.168.1.1      1 ms   1 ms   1 ms
 2  10.0.0.2         3 ms   2 ms   3 ms
 3  203.0.113.10     28 ms  27 ms  28 ms`,
        },
        {
          type: 'warning',
          title: '能 ping 通 IP 却打不开网页',
          text: '如果直接 ping 公网 IP 正常，但域名打不开，问题在 DNS；如果域名能解析但页面打不开，问题多在 TCP 端口、防火墙策略或应用服务本身。不要把这两种现象混为一谈。',
        },
        {
          type: 'tip',
          title: '排错顺序：域名、IP、端口、应用',
          text: '先用 ping 域名确认解析和连通性，再用 ping 公网 IP 剥离 DNS 因素，接着用端口探测确认服务是否监听，最后才看应用日志。每一步都把问题范围缩小一半。',
        },
        {
          type: 'checklist',
          title: '网页打不开时的自查清单',
          items: [
            '本机 IP、掩码、默认网关是否配置正确',
            'ping 网关是否通，确认二层和三层可达',
            'ping 公网 IP 是否通，区分 DNS 与转发问题',
            'DNS 服务器地址是否可达，解析结果是否正确',
            '目标端口是否被防火墙或安全策略拦截',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
