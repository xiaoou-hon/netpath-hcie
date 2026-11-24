import type { QuizQuestion } from '@/types';

const list: QuizQuestion[] = [
  {
    id: 'q-m12-01',
    moduleId: 'm12',
    lessonId: 'm12-l01',
    type: 'single',
    depth: '了解',
    question: 'IPv6 地址由多少位二进制组成，通常采用什么书写方式？',
    options: [
      '32 位，点分十进制表示',
      '64 位，8 组十六进制表示',
      '128 位，8 组 16 位十六进制、用冒号分隔',
      '128 位，点分十进制表示',
    ],
    answer: [2],
    explanation:
      'IPv6 地址长度为 128 位，写成 8 组、每组 4 位十六进制的形式，组间用冒号分隔；连续的 0 组可以用一对冒号压缩，但整个地址中只能出现一次，每组的前导 0 也可省略。地址空间远大于 IPv4 的 32 位，因此不再依赖 NAT 缓解地址短缺，但规划时仍要关注前缀长度与地址层次。',
  },
  {
    id: 'q-m12-02',
    moduleId: 'm12',
    lessonId: 'm12-l01',
    type: 'multiple',
    depth: '熟悉',
    question: '关于 IPv6 的地址类型，下列说法正确的有哪些？',
    options: [
      '单播地址唯一标识一个接口',
      '组播地址标识一组接口，报文会发送给该组的所有成员',
      '任播地址被分配给多个接口，报文送给其中按路由度量最近的一个',
      'IPv6 保留了广播地址，用于向本网段所有设备泛洪',
    ],
    answer: [0, 1, 2],
    explanation:
      'IPv6 定义了单播、组播、任播三类地址，取消了广播。原广播的功能由组播承担，例如 ff02::1 表示本链路所有节点，因此不存在广播地址。任播从单播地址空间中分配，同一地址配置在多台设备上，由路由协议选出最近的一台响应，常用于 DNS 根与 CDN 场景。',
  },
  {
    id: 'q-m12-03',
    moduleId: 'm12',
    lessonId: 'm12-l02',
    type: 'multiple',
    depth: '熟悉',
    question: '下列哪些属于 ICMPv6 邻居发现（NDP）使用的报文？',
    options: ['路由器请求 RS', '路由器通告 RA', '邻居请求 NS', '邻居通告 NA', 'ARP 请求'],
    answer: [0, 1, 2, 3],
    explanation:
      'NDP 由 RS/RA 完成路由器与地址前缀发现，由 NS/NA 完成地址解析与重复地址检测，另有重定向报文优化转发路径。IPv6 取消了 ARP，二层地址解析统一用 ICMPv6 的 NS/NA 实现，因此链路上不会出现 ARP 请求。NDP 封装在 ICMPv6 中，协议号为 58。',
  },
  {
    id: 'q-m12-04',
    moduleId: 'm12',
    lessonId: 'm12-l02',
    type: 'single',
    depth: '精通',
    question: 'IPv6 接口配置地址后执行重复地址检测（DAD），使用的是什么报文？',
    options: [
      '以 :: 为源、发往被检测地址对应 Solicited-Node 组播的 NS',
      '目的地址为 ff02::1 的 RA',
      '广播 ARP 请求',
      '发往 DHCPv6 服务器的 Request',
    ],
    answer: [0],
    explanation:
      'DAD 发送源地址为未指定地址 :: 的 NS，目的是被检测地址对应的 Solicited-Node 组播地址，因为此时该地址尚未通过检测不能作为源地址使用。若在超时前收到针对该地址的 NA，说明已被占用，地址置为冲突状态不可用。检测期间地址处于 tentative 状态，不能正常收发业务。',
  },
  {
    id: 'q-m12-05',
    moduleId: 'm12',
    lessonId: 'm12-l03',
    type: 'single',
    depth: '熟悉',
    question: 'RA 报文中的 M 标志位置 1 表示什么含义？',
    options: [
      '主机通过 DHCPv6 获取地址',
      '主机只能使用链路本地地址通信',
      '该链路不支持 IPv6 转发',
      '路由器停止发送 RA 报文',
    ],
    answer: [0],
    explanation:
      'M 即 Managed 标志，置 1 表示地址由 DHCPv6 有状态分配；O 即 Other 标志，置 1 表示 DNS、域名等参数从 DHCPv6 获取。实际部署中常见 M=0、O=1，即主机用 SLAAC 依据 RA 前缀生成地址，只向 DHCPv6 要 DNS。理解两个标志的组合才能正确判断终端地址来源。',
  },
  {
    id: 'q-m12-06',
    moduleId: 'm12',
    lessonId: 'm12-l03',
    type: 'single',
    depth: '精通',
    question: '无状态 DHCPv6（Stateless DHCPv6）的主要作用是什么？',
    options: [
      '分配 IPv6 前缀给下游路由器',
      '只下发 DNS 等配置参数，地址由 SLAAC 生成',
      '为终端分配 IPv4 地址',
      '替代 NDP 完成地址解析',
    ],
    answer: [1],
    explanation:
      '无状态 DHCPv6 不维护地址绑定表，也不分配地址，只把 DNS、域名等参数下发给已经通过 SLAAC 获得地址的终端，因此称为"无状态"。有状态 DHCPv6 才记录地址租约并负责回收。两者可以共存：前缀由 RA 下发保证路由可达，参数由 DHCPv6 集中管理便于统一变更。',
  },
  {
    id: 'q-m12-07',
    moduleId: 'm12',
    lessonId: 'm12-l04',
    type: 'single',
    depth: '精通',
    question: '与 OSPFv2 相比，OSPFv3 的主要变化是什么？',
    options: [
      '基于链路运行、用链路本地地址作为报文源，但 Router ID 仍需 32 位',
      '改用 TCP 建立邻居关系',
      '不再需要 Router ID',
      '只能运行在 IPv4 网络上',
    ],
    answer: [0],
    explanation:
      'OSPFv3 以链路为单位运行，邻居通过接口链路本地地址建立，同一链路上不同实例互不干扰；Router ID 仍是 32 位点分十进制格式，通常手工指定 Loopback 地址以保证稳定。它仍直接封装在 IP 中、协议号 89，新增 LSA 类型 8/9 承载 IPv6 地址与前缀，认证改由 IPsec 实现而非报文内字段。',
  },
  {
    id: 'q-m12-08',
    moduleId: 'm12',
    lessonId: 'm12-l05',
    type: 'multiple',
    depth: '熟悉',
    question: '下列哪些属于 IPv6 过渡技术？',
    options: ['双栈', '6to4 隧道', 'ISATAP', 'NAT64/DNS64', '把 IPv6 报文封装成 VLAN Tag'],
    answer: [0, 1, 2, 3],
    explanation:
      '过渡技术大致分三类：双栈让设备同时运行两套协议；隧道（6to4、ISATAP、GRE）把 IPv6 封装进 IPv4 穿越 IPv4 域；翻译（NAT64/DNS64）实现纯 IPv6 与纯 IPv4 节点互访。VLAN Tag 是二层帧标记，用于隔离广播域，与协议版本过渡无关，不能解决 v4/v6 共存问题。',
  },
  {
    id: 'q-m12-09',
    moduleId: 'm12',
    lessonId: 'm12-l06',
    type: 'single',
    depth: '熟悉',
    question: '跨网段部署 DHCP 时，DHCP 中继设备的关键作用是什么？',
    options: [
      '把客户端广播报文转为单播发给服务器，并填入 giaddr 供服务器选择地址池',
      '为客户端加密 DHCP 报文',
      '把 DHCP 报文转换为 PPPoE 报文',
      '直接代替服务器为客户端分配地址',
    ],
    answer: [0],
    explanation:
      'DHCP Discover 是广播报文，无法跨路由器传播。中继收到后改为单播发往配置的服务器，并把收到报文的接口地址填入 giaddr 字段，服务器据此判断客户端所属网段并选择对应地址池。中继本身不分配地址，只做报文转发与字段填充，因此服务器上必须有到达该网段的回程路由。',
  },
  {
    id: 'q-m12-10',
    moduleId: 'm12',
    lessonId: 'm12-l07',
    type: 'single',
    depth: '了解',
    question: '相比 SNMPv2c，SNMPv3 最核心的增强是什么？',
    options: [
      '仍然使用 Community 明文认证，但速度更快',
      '提供基于 USM 的认证与加密，并支持基于视图的访问控制',
      '把传输层改为 TCP 179',
      '取消了 Trap 主动上报能力',
    ],
    answer: [1],
    explanation:
      'SNMPv2c 依靠 Community 字符串做明文认证，容易被嗅探和伪造；SNMPv3 引入 USM 用户安全模型，可配置认证（如 SHA）与加密（如 AES），并通过 VACM 按视图限制可读写范围，实现身份鉴别、完整性与机密性。Trap 依然使用 UDP 162 由设备主动上报，v3 还支持需要确认的 Inform。',
  },
  {
    id: 'q-m12-11',
    moduleId: 'm12',
    lessonId: 'm12-l07',
    type: 'multiple',
    depth: '熟悉',
    question: '关于常见网络服务协议，下列说法正确的有哪些？',
    options: [
      'NTP 的 stratum 值越小，表示越接近参考时钟源',
      'SNMP Trap 由设备主动上报，默认目的端口为 162',
      'Syslog 默认使用 UDP 514 端口',
      'SSH 默认使用 UDP 22 端口',
    ],
    answer: [0, 1, 2],
    explanation:
      'SSH 基于 TCP 22，依靠三次握手提供可靠连接并在此基础上加密，因此"UDP 22"错误。NTP 的 stratum 1 表示直接同步参考时钟，每经过一级加一，达到 16 视为不可用；Trap 是异步告警，与网管轮询的 Get 操作互补；Syslog 默认 UDP 514，不保证送达，关键日志建议同时落盘或改走可靠传输。',
  },
  {
    id: 'q-m12-12',
    moduleId: 'm12',
    lessonId: 'm12-l07',
    type: 'boolean',
    depth: '熟悉',
    question: 'SSH 基于 TCP 22 端口，通过加密通道替代 Telnet，避免用户名和口令在链路上明文传输。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      'Telnet 使用 TCP 23，所有交互内容包括口令都以明文传输，抓包即可还原，因此生产环境应禁用。SSH 在 TCP 22 上先完成密钥交换与服务器身份验证，再建立加密会话，同时支持端口转发与文件传输。部署时应关闭 Telnet、限制源地址并定期更换密钥，防止暴力破解。',
  },
];

export default list;
