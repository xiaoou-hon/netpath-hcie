export interface GlossaryEntry {
  /** 展示与匹配用的写法 */
  term: string;
  /** 全称 */
  full?: string;
  /** 一句话解释：xxx 是什么 */
  desc: string;
  category: '基础' | '二层' | '路由' | 'WLAN' | '安全' | 'IPv6' | '组播' | 'QoS' | '运维' | '自动化' | '云网络';
}

/**
 * 术语表：内容渲染时自动识别英文缩写并在悬停时给出「xxx 是什么」。
 * 新增术语只需在这里追加，无需改动组件。
 */
export const glossary: GlossaryEntry[] = [
  // 基础
  { term: 'OSI', full: 'Open Systems Interconnection', desc: '开放系统互联参考模型，把网络通信分为七层，用于教学与分层排障。', category: '基础' },
  { term: 'TCP/IP', full: 'Transmission Control Protocol / Internet Protocol', desc: '互联网事实标准协议栈，分为网络接口、网际、传输、应用四层。', category: '基础' },
  { term: 'TCP', full: 'Transmission Control Protocol', desc: '面向连接、可靠传输的传输层协议，通过三次握手、序列号与重传保证不丢不乱。', category: '基础' },
  { term: 'UDP', full: 'User Datagram Protocol', desc: '无连接的传输层协议，开销小、不保证可靠，适合语音、视频和 DNS 查询。', category: '基础' },
  { term: 'IP', full: 'Internet Protocol', desc: '网络层协议，负责编址与尽力而为的分组转发，是互联网的基础。', category: '基础' },
  { term: 'ICMP', full: 'Internet Control Message Protocol', desc: '网络层控制协议，ping 与 tracert 就依赖它传递连通性探测与差错信息。', category: '基础' },
  { term: 'ARP', full: 'Address Resolution Protocol', desc: '把 IP 地址解析为 MAC 地址的协议，IPv4 同网段通信前必须先做 ARP。', category: '基础' },
  { term: 'DHCP', full: 'Dynamic Host Configuration Protocol', desc: '动态主机配置协议，自动给终端下发 IP、掩码、网关和 DNS。', category: '基础' },
  { term: 'DNS', full: 'Domain Name System', desc: '域名系统，把 www.example.com 这类域名翻译成 IP 地址。', category: '基础' },
  { term: 'HTTP', full: 'Hypertext Transfer Protocol', desc: '超文本传输协议，浏览器访问网页使用的应用层协议，默认端口 80。', category: '基础' },
  { term: 'HTTPS', full: 'Hypertext Transfer Protocol Secure', desc: '基于 TLS 加密的 HTTP，默认端口 443，防止内容被窃听或篡改。', category: '基础' },
  { term: 'FTP', full: 'File Transfer Protocol', desc: '文件传输协议，使用 20/21 端口，明文传输，现多被 SFTP 替代。', category: '基础' },
  { term: 'TFTP', full: 'Trivial File Transfer Protocol', desc: '简单文件传输协议，基于 UDP 69，常用于设备升级与配置备份。', category: '基础' },
  { term: 'SSH', full: 'Secure Shell', desc: '安全的远程登录协议，默认 22 端口，生产环境应替代 Telnet 管理设备。', category: '基础' },
  { term: 'Telnet', full: 'Telecommunication Network', desc: '明文远程登录协议，默认 23 端口，抓包即可看到密码，不建议生产使用。', category: '基础' },
  { term: 'SNMP', full: 'Simple Network Management Protocol', desc: '简单网络管理协议，监控设备接口流量、CPU、告警等运行指标。', category: '基础' },
  { term: 'NTP', full: 'Network Time Protocol', desc: '网络时间协议，用 123 端口同步设备时钟，日志与证书校验都依赖它。', category: '基础' },
  { term: 'Syslog', full: 'System Log', desc: '系统日志协议，把设备日志集中发送到日志服务器，便于审计与排障。', category: '基础' },
  { term: 'MTU', full: 'Maximum Transmission Unit', desc: '最大传输单元，接口一次能发送的最大帧载荷，以太网默认 1500 字节。', category: '基础' },
  { term: 'MSS', full: 'Maximum Segment Size', desc: 'TCP 单段最大数据量，通常等于 MTU 减去 IP 头与 TCP 头。', category: '基础' },
  { term: 'TTL', full: 'Time To Live', desc: 'IP 报文的生存时间，每经过一台路由器减 1，减到 0 丢弃，用于防止环路。', category: '基础' },
  { term: 'CIDR', full: 'Classless Inter-Domain Routing', desc: '无类域间路由，用前缀长度（如 /24）表示掩码，支持路由聚合。', category: '基础' },
  { term: 'VLSM', full: 'Variable Length Subnet Mask', desc: '变长子网掩码，同一网络内按需使用不同长度的掩码，减少地址浪费。', category: '基础' },
  { term: 'MAC', full: 'Media Access Control', desc: '介质访问控制地址，48 位硬件地址，交换机靠它转发二层帧。', category: '基础' },
  { term: 'LAN', full: 'Local Area Network', desc: '局域网，通常指一个园区或机房内部的高速网络。', category: '基础' },
  { term: 'WAN', full: 'Wide Area Network', desc: '广域网，连接不同地域站点的网络，常用 MPLS、SD-WAN、专线。', category: '基础' },
  { term: 'PDU', full: 'Protocol Data Unit', desc: '协议数据单元，指每层封装后的数据单位，如帧、包、段。', category: '基础' },
  { term: 'VRP', full: 'Versatile Routing Platform', desc: '华为通用路由平台，华为交换机、路由器的命令行操作系统。', category: '基础' },
  { term: 'RIB', full: 'Routing Information Base', desc: '路由信息库，即路由表，存放协议计算出的路由及优先级、开销。', category: '基础' },
  { term: 'FIB', full: 'Forwarding Information Base', desc: '转发信息库，由 RIB 优选后下发，硬件按它逐包快速转发。', category: '基础' },

  // 二层
  { term: 'VLAN', full: 'Virtual Local Area Network', desc: '虚拟局域网，把一个物理交换机划分成多个广播域，隔离广播与故障。', category: '二层' },
  { term: 'Trunk', desc: '干道链路，一条链路承载多个 VLAN，通过 802.1Q 标签区分。', category: '二层' },
  { term: 'STP', full: 'Spanning Tree Protocol', desc: '生成树协议，通过阻塞冗余端口消除二层环路，防止广播风暴。', category: '二层' },
  { term: 'RSTP', full: 'Rapid Spanning Tree Protocol', desc: '快速生成树协议，把收敛时间从数十秒降到秒级。', category: '二层' },
  { term: 'MSTP', full: 'Multiple Spanning Tree Protocol', desc: '多实例生成树，不同 VLAN 组走不同拓扑，实现负载分担。', category: '二层' },
  { term: 'BPDU', full: 'Bridge Protocol Data Unit', desc: '生成树协议报文，交换机靠它交换桥 ID、开销与端口角色信息。', category: '二层' },
  { term: 'Eth-Trunk', desc: '华为链路聚合技术，把多条物理链路捆绑成一条逻辑链路，提升带宽与可靠性。', category: '二层' },
  { term: 'LACP', full: 'Link Aggregation Control Protocol', desc: '链路聚合控制协议，自动协商聚合成员与状态，避免手工配置错配。', category: '二层' },
  { term: 'PoE', full: 'Power over Ethernet', desc: '以太网供电，网线同时传数据和电，常用于 AP、摄像头、IP 电话。', category: '二层' },
  { term: 'VXLAN', full: 'Virtual Extensible LAN', desc: '虚拟可扩展局域网，用 VNI 在 IP 网络上构建大二层，突破 4094 个 VLAN 限制。', category: '二层' },
  { term: 'VTEP', full: 'VXLAN Tunnel End Point', desc: 'VXLAN 隧道端点，负责原始帧的封装与解封装，通常是 Leaf 交换机。', category: '二层' },
  { term: 'VNI', full: 'VXLAN Network Identifier', desc: 'VXLAN 网络标识，24 位，最多约 1600 万个虚拟网络。', category: '二层' },
  { term: 'EVPN', full: 'Ethernet VPN', desc: '以太网 VPN，用 BGP 传递 MAC/IP 可达性，是 VXLAN 的控制平面。', category: '二层' },

  // 路由
  { term: 'IGP', full: 'Interior Gateway Protocol', desc: '内部网关协议，在同一个自治域内计算路由，如 OSPF、IS-IS。', category: '路由' },
  { term: 'EGP', full: 'Exterior Gateway Protocol', desc: '外部网关协议，在自治域之间交换路由，典型代表是 BGP。', category: '路由' },
  { term: 'OSPF', full: 'Open Shortest Path First', desc: '开放最短路径优先，基于链路状态、用 SPF 算法计算最短路径的 IGP。', category: '路由' },
  { term: 'OSPFv3', full: 'OSPF version 3', desc: 'OSPF 的 IPv6 版本，原理相同，但用链路本地地址与 Link-LSA 承载信息。', category: '路由' },
  { term: 'IS-IS', full: 'Intermediate System to Intermediate System', desc: '中间系统到中间系统，基于链路状态的 IGP，常用于大型运营商网络。', category: '路由' },
  { term: 'BGP', full: 'Border Gateway Protocol', desc: '边界网关协议，自治域之间交换路由，靠属性做选路与策略控制。', category: '路由' },
  { term: 'AS', full: 'Autonomous System', desc: '自治系统，由同一机构管理、使用统一路由策略的网络集合。', category: '路由' },
  { term: 'LSA', full: 'Link State Advertisement', desc: '链路状态通告，OSPF 描述拓扑与路由的基本信息单元，分 1~7 类。', category: '路由' },
  { term: 'LSDB', full: 'Link State Database', desc: '链路状态数据库，保存区域内所有 LSA，是 SPF 计算的输入。', category: '路由' },
  { term: 'DR', full: 'Designated Router', desc: '指定路由器，广播网络中负责集中与所有邻居同步 LSA，减少邻接数量。', category: '路由' },
  { term: 'BDR', full: 'Backup Designated Router', desc: '备份指定路由器，DR 故障时接替，避免重新选举造成震荡。', category: '路由' },
  { term: 'ABR', full: 'Area Border Router', desc: '区域边界路由器，连接多个 OSPF 区域并产生 Type-3 汇总 LSA。', category: '路由' },
  { term: 'ASBR', full: 'Autonomous System Boundary Router', desc: '自治系统边界路由器，把外部路由引入 OSPF，产生 Type-5 LSA。', category: '路由' },
  { term: 'SPF', full: 'Shortest Path First', desc: '最短路径优先算法，OSPF/IS-IS 用它计算无环的最短路径树。', category: '路由' },
  { term: 'AS_Path', full: 'AS Path', desc: 'BGP 属性，记录路由经过的 AS 号序列，既防环又用于选路。', category: '路由' },
  { term: 'MED', full: 'Multi-Exit Discriminator', desc: 'BGP 多出口区分属性，告诉邻居从哪个入口进入本 AS 更优。', category: '路由' },
  { term: 'Local Preference', desc: 'BGP 本地优先级，数值越大越优，只在 IBGP 内传递，用于控制出 AS 选路。', category: '路由' },
  { term: 'Community', full: 'BGP Community', desc: 'BGP 团体属性，给路由打标签，便于批量做路由策略与过滤。', category: '路由' },
  { term: 'RR', full: 'Route Reflector', desc: '路由反射器，允许把 IBGP 路由反射给其他 IBGP 邻居，打破全连接要求。', category: '路由' },
  { term: 'ACL', full: 'Access Control List', desc: '访问控制列表，按五元组匹配流量，用于过滤、NAT 与策略路由。', category: '路由' },
  { term: 'PBR', full: 'Policy Based Routing', desc: '策略路由，按源地址、端口等条件指定下一跳，优先于普通路由表。', category: '路由' },
  { term: 'BFD', full: 'Bidirectional Forwarding Detection', desc: '双向转发检测，毫秒级探测链路故障，可联动 VRRP、OSPF、BGP 快速切换。', category: '路由' },
  { term: 'VRRP', full: 'Virtual Router Redundancy Protocol', desc: '虚拟路由冗余协议，多台路由器共享一个虚拟网关 IP，实现网关高可用。', category: '路由' },
  { term: 'MPLS', full: 'Multiprotocol Label Switching', desc: '多协议标签交换，用短标签代替逐跳查路由表，支撑 VPN 与流量工程。', category: '路由' },
  { term: 'LDP', full: 'Label Distribution Protocol', desc: '标签分发协议，为路由分配并分发 MPLS 标签，建立 LSP。', category: '路由' },
  { term: 'VRF', full: 'Virtual Routing and Forwarding', desc: '虚拟路由转发，一台设备上隔离出多张独立路由表，实现 VPN 实例。', category: '路由' },
  { term: 'RD', full: 'Route Distinguisher', desc: '路由区分符，给 VPN 路由加前缀，保证不同 VRF 的相同网段不冲突。', category: '路由' },
  { term: 'RT', full: 'Route Target', desc: '路由目标，控制 VPN 路由在哪些 VRF 之间导入导出。', category: '路由' },
  { term: 'SRv6', full: 'Segment Routing over IPv6', desc: '基于 IPv6 的分段路由，用地址列表编程转发路径，是新一代承载技术。', category: '路由' },

  // WLAN
  { term: 'WLAN', full: 'Wireless Local Area Network', desc: '无线局域网，用无线电波替代网线接入，常见标准为 802.11 系列。', category: 'WLAN' },
  { term: 'AP', full: 'Access Point', desc: '无线接入点，把无线终端接入有线网络，负责射频收发与加密。', category: 'WLAN' },
  { term: 'AC', full: 'Access Controller', desc: '无线接入控制器，集中管理 AP 的配置、射频、漫游与安全策略。', category: 'WLAN' },
  { term: 'SSID', full: 'Service Set Identifier', desc: '服务集标识，就是手机 Wi-Fi 列表里看到的网络名称。', category: 'WLAN' },
  { term: 'CAPWAP', full: 'Control and Provisioning of Wireless Access Points', desc: 'AP 与 AC 之间的隧道协议，控制隧道 5246、数据隧道 5247。', category: 'WLAN' },
  { term: 'DTLS', full: 'Datagram Transport Layer Security', desc: '数据报 TLS，为 CAPWAP 控制隧道提供加密与证书校验。', category: 'WLAN' },
  { term: 'WPA2', full: 'Wi-Fi Protected Access 2', desc: '第二代 Wi-Fi 安全标准，使用 AES-CCMP 加密，目前仍广泛使用。', category: 'WLAN' },
  { term: 'WPA3', full: 'Wi-Fi Protected Access 3', desc: '第三代 Wi-Fi 安全标准，增强弱口令防护与前向保密。', category: 'WLAN' },
  { term: 'PSK', full: 'Pre-Shared Key', desc: '预共享密钥，WPA2/WPA3 个人版用同一个密码接入，适合家庭与小办公。', category: 'WLAN' },
  { term: '802.1X', full: 'IEEE 802.1X', desc: '基于端口的接入认证标准，终端需通过认证才能上网，常用于企业有线与无线。', category: 'WLAN' },
  { term: 'Portal', desc: 'Portal 认证，终端先连上网络，再通过网页输入账号认证，常见于访客 Wi-Fi。', category: 'WLAN' },
  { term: 'RADIUS', full: 'Remote Authentication Dial-In User Service', desc: '远程认证拨号用户服务，集中完成认证、授权与计费（AAA）。', category: 'WLAN' },
  { term: 'TACACS+', full: 'Terminal Access Controller Access-Control System Plus', desc: '思科体系的 AAA 协议，华为设备也支持，偏重设备管理授权。', category: 'WLAN' },
  { term: 'Beacon', desc: '信标帧，AP 周期性广播 SSID 与能力信息，终端靠它发现网络。', category: 'WLAN' },
  { term: 'CSMA/CA', full: 'Carrier Sense Multiple Access with Collision Avoidance', desc: '载波侦听多路访问/冲突避免，Wi-Fi 的介质竞争机制。', category: 'WLAN' },
  { term: 'OFDMA', full: 'Orthogonal Frequency Division Multiple Access', desc: '正交频分多址，Wi-Fi 6 的关键技术，把信道分给多个终端并行传输。', category: 'WLAN' },
  { term: 'MIMO', full: 'Multiple-Input Multiple-Output', desc: '多输入多输出，多天线同时收发，提升速率与覆盖。', category: 'WLAN' },

  // 安全
  { term: 'IPsec', full: 'Internet Protocol Security', desc: 'IP 层安全框架，通过 ESP/AH 与 IKE 协商，为站点间提供加密隧道。', category: '安全' },
  { term: 'IKE', full: 'Internet Key Exchange', desc: 'IPsec 的密钥协商协议，分阶段一（管理隧道）与阶段二（数据隧道）。', category: '安全' },
  { term: 'ESP', full: 'Encapsulating Security Payload', desc: 'IPsec 封装安全载荷，提供加密与完整性校验，是 VPN 的主力协议。', category: '安全' },
  { term: 'AH', full: 'Authentication Header', desc: 'IPsec 认证头，提供完整性校验但不加密，且不能穿越 NAT。', category: '安全' },
  { term: 'SA', full: 'Security Association', desc: '安全联盟，IPsec 通信双方协商出的一组算法、密钥与 SPI 参数。', category: '安全' },
  { term: 'SPI', full: 'Security Parameter Index', desc: '安全参数索引，标识一条 IPsec SA，随报文一起传输。', category: '安全' },
  { term: 'NAT', full: 'Network Address Translation', desc: '网络地址转换，私网地址与公网地址互转，缓解 IPv4 地址短缺。', category: '安全' },
  { term: 'NAPT', full: 'Network Address Port Translation', desc: '网络地址端口转换，多个私网主机共用一个公网 IP，用端口区分会话。', category: '安全' },
  { term: 'NAT64', desc: 'IPv6 与 IPv4 互通的转换技术，把 IPv6 报文转换为 IPv4 访问旧网络。', category: '安全' },
  { term: 'SSL', full: 'Secure Sockets Layer', desc: '安全套接层，现由 TLS 取代，SSL VPN 指基于浏览器的加密远程接入。', category: '安全' },
  { term: 'VPN', full: 'Virtual Private Network', desc: '虚拟专用网络，在公网上建立加密隧道，让远端像在总部内网一样访问。', category: '安全' },
  { term: 'IDS', full: 'Intrusion Detection System', desc: '入侵检测系统，旁路监听流量，发现攻击只告警不阻断。', category: '安全' },
  { term: 'IPS', full: 'Intrusion Prevention System', desc: '入侵防御系统，串接在链路中，识别攻击并实时阻断。', category: '安全' },
  { term: 'DDoS', full: 'Distributed Denial of Service', desc: '分布式拒绝服务攻击，用大量流量或请求耗尽目标资源。', category: '安全' },
  { term: 'AAA', full: 'Authentication, Authorization, Accounting', desc: '认证、授权、计费，统一管理谁能登录、能做什么、做了什么。', category: '安全' },
  { term: 'ZTNA', full: 'Zero Trust Network Access', desc: '零信任网络访问，默认不信任任何访问，逐次验证身份与设备。', category: '安全' },

  // IPv6
  { term: 'IPv6', full: 'Internet Protocol version 6', desc: '第六版 IP，128 位地址，解决 IPv4 地址枯竭并内置自动配置。', category: 'IPv6' },
  { term: 'ICMPv6', full: 'Internet Control Message Protocol for IPv6', desc: 'IPv6 的控制协议，承担差错、邻接发现与地址自动配置。', category: 'IPv6' },
  { term: 'NDP', full: 'Neighbor Discovery Protocol', desc: '邻居发现协议，用 NS/NA 完成地址解析，替代 IPv4 的 ARP。', category: 'IPv6' },
  { term: 'SLAAC', full: 'Stateless Address Autoconfiguration', desc: '无状态地址自动配置，终端根据 RA 前缀自行生成 IPv6 地址。', category: 'IPv6' },
  { term: 'DAD', full: 'Duplicate Address Detection', desc: '重复地址检测，地址启用前先探测是否被占用，避免冲突。', category: 'IPv6' },
  { term: 'DHCPv6', full: 'Dynamic Host Configuration Protocol for IPv6', desc: 'IPv6 动态地址配置协议，可下发地址、DNS 与其他选项。', category: 'IPv6' },
  { term: 'RA', full: 'Router Advertisement', desc: '路由器通告，路由器周期发送前缀与默认网关信息。', category: 'IPv6' },
  { term: 'RS', full: 'Router Solicitation', desc: '路由器请求，终端主动请求 RA，加快地址配置。', category: 'IPv6' },

  // 组播
  { term: 'IGMP', full: 'Internet Group Management Protocol', desc: '互联网组管理协议，主机与路由器之间加组、退组，维护组播成员。', category: '组播' },
  { term: 'PIM', full: 'Protocol Independent Multicast', desc: '协议无关组播，构建组播分发树，分为 PIM-DM 与 PIM-SM。', category: '组播' },
  { term: 'RPF', full: 'Reverse Path Forwarding', desc: '反向路径转发检查，组播必须从正确上游接口进来，否则丢弃，防环关键。', category: '组播' },
  { term: 'RP', full: 'Rendezvous Point', desc: '共享树汇聚点，PIM-SM 中所有组播源与接收者先向 RP 汇合。', category: '组播' },
  { term: 'SPT', full: 'Shortest Path Tree', desc: '最短路径树，以组播源为根的最优分发树。', category: '组播' },
  { term: 'RPT', full: 'Rendezvous Point Tree', desc: '共享树，以 RP 为根的分发树，适合接收者稀疏分布。', category: '组播' },

  // QoS
  { term: 'QoS', full: 'Quality of Service', desc: '服务质量，通过分类、标记、队列与限速，保证关键业务的带宽与时延。', category: 'QoS' },
  { term: 'DSCP', full: 'Differentiated Services Code Point', desc: '差分服务代码点，IP 头里的 6 位优先级标记，决定队列与丢弃策略。', category: 'QoS' },
  { term: 'CoS', full: 'Class of Service', desc: '服务等级，VLAN 标签里的 3 位优先级，范围 0~7。', category: 'QoS' },
  { term: 'PQ', full: 'Priority Queuing', desc: '优先队列，高优先级队列永远先调度，可能饿死低优先级业务。', category: 'QoS' },
  { term: 'WFQ', full: 'Weighted Fair Queuing', desc: '加权公平队列，按权重分配带宽，兼顾公平与优先级。', category: 'QoS' },
  { term: 'DRR', full: 'Deficit Round Robin', desc: '差额轮询，按权重轮流调度队列，华为设备常用。', category: 'QoS' },
  { term: 'WRED', full: 'Weighted Random Early Detection', desc: '加权随机早期检测，拥塞前按优先级提前丢包，避免尾丢弃引发全局同步。', category: 'QoS' },
  { term: 'CAR', full: 'Committed Access Rate', desc: '承诺访问速率，用令牌桶对流量限速，超出部分丢弃或降级。', category: 'QoS' },
  { term: 'GTS', full: 'Generic Traffic Shaping', desc: '通用流量整形，把超速流量缓存后平滑发送，减少突发。', category: 'QoS' },

  // 运维 / 自动化
  { term: 'SDN', full: 'Software Defined Networking', desc: '软件定义网络，控制平面与转发平面分离，由控制器集中下发策略。', category: '自动化' },
  { term: 'SD-WAN', full: 'Software Defined Wide Area Network', desc: '软件定义广域网，用 Overlay 与集中控制器按应用质量动态选路。', category: '自动化' },
  { term: 'GRE', full: 'Generic Routing Encapsulation', desc: '通用路由封装，把一种协议报文封装进另一种协议，常用于隧道与 VPN。', category: '自动化' },
  { term: 'NETCONF', full: 'Network Configuration Protocol', desc: '网络配置协议，基于 XML 的标准化设备配置接口，替代人工敲命令。', category: '自动化' },
  { term: 'YANG', full: 'Yet Another Next Generation', desc: 'YANG 数据建模语言，定义设备配置与状态的数据结构，供 NETCONF 使用。', category: '自动化' },
  { term: 'Telemetry', desc: '遥测，设备主动、高频推送运行数据，比 SNMP 轮询更实时，用于体验分析。', category: '自动化' },
  { term: 'gRPC', full: 'Google Remote Procedure Call', desc: '高性能远程调用框架，Telemetry 常用 gRPC 推送数据。', category: '自动化' },
  { term: 'NCE', full: 'Network Cloud Engine', desc: '华为网络云化引擎，iMaster NCE 系列负责园区、数据中心与广域的统一管控。', category: '自动化' },
  { term: 'API', full: 'Application Programming Interface', desc: '应用程序接口，系统之间按约定交换数据，自动化运维的基础。', category: '自动化' },
  { term: 'SLA', full: 'Service Level Agreement', desc: '服务等级协议，约定时延、丢包、可用率等指标，SD-WAN 据此选路。', category: '运维' },
  { term: 'HCIE', full: 'Huawei Certified ICT Expert', desc: '华为认证 ICT 专家，最高级别认证，强调架构设计与复杂排障能力。', category: '运维' },
  { term: 'HCIP', full: 'Huawei Certified ICT Professional', desc: '华为认证 ICT 高级工程师，覆盖主流技术的配置与故障处理。', category: '运维' },
  { term: 'HCIA', full: 'Huawei Certified ICT Associate', desc: '华为认证 ICT 工程师，入门级，覆盖网络基础与设备基础配置。', category: '运维' },

  // 云网络
  { term: 'VPC', full: 'Virtual Private Cloud', desc: '虚拟私有云是公有云上逻辑隔离的专属网络，地址范围、子网与路由全部由用户自定义。', category: '云网络' },
  { term: '子网', full: 'Subnet', desc: '子网是 VPC 内按可用区划分的 IP 地址段，云主机与云服务都必须落在某个子网中。', category: '云网络' },
  { term: '安全组', full: 'Security Group', desc: '安全组是绑定在实例上的有状态虚拟防火墙，按规则控制进出实例的流量。', category: '云网络' },
  { term: '网络 ACL', full: 'Network ACL', desc: '网络 ACL 是作用在子网边界的无状态访问控制列表，作为安全组的补充手段。', category: '云网络' },
  { term: 'NACL', full: 'Network Access Control List', desc: 'NACL 是子网级的无状态访问控制列表，进出方向规则需分别配置并按序号匹配。', category: '云网络' },
  { term: 'CEN', full: 'Cloud Enterprise Network', desc: '云企业网是企业级云上骨干互联服务，把多地域 VPC 与专线接入点纳入一张网络。', category: '云网络' },
  { term: 'Transit Gateway', full: 'Transit Gateway', desc: '中转网关是区域级的云上路由枢纽，集中连接多个 VPC、VPN 与专线，避免全互联。', category: '云网络' },
  { term: 'ELB', full: 'Elastic Load Balance', desc: '弹性负载均衡把访问流量按策略分发到多台后端服务器，并通过健康检查摘除故障实例。', category: '云网络' },
  { term: 'NAT 网关', full: 'NAT Gateway', desc: 'NAT 网关为子网内没有公网 IP 的实例提供出方向访问互联网与端口转换能力。', category: '云网络' },
  { term: 'EIP', full: 'Elastic IP', desc: '弹性公网 IP 是可独立申请并随时绑定到云资源的公网地址，解绑后可以复用。', category: '云网络' },
  { term: 'Direct Connect', full: 'Direct Connect', desc: '云专线是用户机房到云接入点的专用物理链路，绕过公网提供稳定低时延的混合云连接。', category: '云网络' },
  { term: 'CNI', full: 'Container Network Interface', desc: '容器网络接口是 Kubernetes 的插件规范，负责为 Pod 分配地址并打通跨节点通信。', category: '云网络' },
  { term: 'Service', full: 'Kubernetes Service', desc: 'Service 是 Kubernetes 中为一组 Pod 提供稳定虚拟 IP 与负载均衡的抽象对象。', category: '云网络' },
  { term: 'Ingress', desc: 'Ingress 是 Kubernetes 的七层入口规则，用域名与路径把外部请求转发到集群内的 Service。', category: '云网络' },
  { term: 'CoreDNS', desc: 'CoreDNS 是 Kubernetes 的默认集群 DNS，为 Service 与 Pod 提供域名解析和服务发现。', category: '云网络' },
  { term: 'NetworkPolicy', desc: 'NetworkPolicy 是 Kubernetes 的 Pod 级访问控制规则，用标签选择器限定东西向流量。', category: '云网络' },
  { term: 'eBPF', full: 'extended Berkeley Packet Filter', desc: 'eBPF 是内核中安全执行可编程字节码的机制，常用于高性能数据面、可观测性与安全策略。', category: '云网络' },
  { term: 'Cilium', desc: 'Cilium 是基于 eBPF 的容器网络与安全方案，用内核钩子实现 Service 转发与策略执行。', category: '云网络' },
  { term: 'Calico', desc: 'Calico 是主流的 Kubernetes 网络插件，用 BGP 或 IPIP 分发 Pod 路由并提供 NetworkPolicy。', category: '云网络' },
  { term: 'NFV', full: 'Network Functions Virtualization', desc: '网络功能虚拟化把防火墙、负载均衡等专用设备以软件形式运行在通用服务器上。', category: '云网络' },
  { term: 'SRH', full: 'Segment Routing Header', desc: 'SRH 是 SRv6 的 IPv6 扩展头，用段列表记录报文要依次经过的 SID 路径。', category: '云网络' },
  { term: 'Locator', full: 'SRv6 Locator', desc: 'Locator 是 SRv6 地址中标识节点与网段的前缀，用于路由通告和 SID 分配。', category: '云网络' },
  { term: 'BE', full: 'Best Effort', desc: 'SRv6 BE 是尽力而为的 SRv6 转发方式，只按 Locator 查表转发，不指定显式路径。', category: '云网络' },
  { term: 'TE Policy', full: 'Traffic Engineering Policy', desc: 'SRv6 TE Policy 是用段列表描述端到端显式路径的隧道策略，可按业务指定转发路径。', category: '云网络' },
  { term: 'IaC', full: 'Infrastructure as Code', desc: '基础设施即代码把网络与资源用配置文件描述，实现可版本化、可复现的部署。', category: '云网络' },
  { term: 'Terraform', desc: 'Terraform 是主流的 IaC 工具，用 HCL 声明资源并通过 provider 调用云 API 完成部署。', category: '云网络' },
  { term: 'Ansible', desc: 'Ansible 是基于 SSH 的无代理自动化工具，用 YAML playbook 批量下发配置与执行巡检。', category: '云网络' },
  { term: 'GitOps', desc: 'GitOps 以 Git 仓库作为期望状态的唯一来源，通过持续同步把变更自动应用到环境。', category: '云网络' },
  { term: '流日志', full: 'Flow Log', desc: '流日志记录云上弹性网卡或子网的连接五元组与流量统计，是云网排障的关键数据。', category: '云网络' },
  { term: '云防火墙', full: 'Cloud Firewall', desc: '云防火墙是云上南北向与东西向流量的统一防护服务，提供边界策略、入侵防御与日志审计。', category: '云网络' },
  { term: 'WAF', full: 'Web Application Firewall', desc: 'WAF 是 Web 应用防火墙，按 HTTP 特征拦截 SQL 注入、XSS 等应用层攻击。', category: '云网络' },
  { term: '微分段', full: 'Micro-segmentation', desc: '微分段把数据中心划分为细粒度安全区域，按工作负载逐个放通流量以限制横向移动。', category: '云网络' },
  { term: '零信任', full: 'Zero Trust', desc: '零信任是默认不信任任何访问的安全模型，每次访问都要验证身份、设备与访问上下文。', category: '云网络' },
  { term: '多可用区', full: 'Multi-AZ', desc: '多可用区是在同一地域内把资源分布到多个独立机房，实现故障隔离与业务高可用。', category: '云网络' },
  { term: '对等连接', full: 'VPC Peering', desc: '对等连接是两个 VPC 之间的私网直连通道，路由可达即可互通且流量不经过公网。', category: '云网络' },
  { term: 'Underlay', full: 'Underlay Network', desc: 'Underlay 是承载 Overlay 的物理网络，负责底层 IP 可达、带宽供给与故障收敛。', category: '云网络' },
  { term: 'Overlay', full: 'Overlay Network', desc: 'Overlay 是在物理网络之上用隧道构建的虚拟网络，屏蔽底层差异并提供多租户隔离。', category: '云网络' },
  { term: 'VPC-CNI', full: 'VPC CNI', desc: 'VPC-CNI 是直接为 Pod 分配 VPC 内网地址的容器网络模式，容器与云主机同网段互通。', category: '云网络' },
  { term: '私网 DNS', full: 'Private DNS', desc: '私网 DNS 是只在 VPC 内生效的域名解析服务，用于内部服务发现与自定义域名。', category: '云网络' },
  { term: '云堡垒机', full: 'Bastion Host', desc: '云堡垒机是集中运维入口，统一代理登录、记录操作审计并管控高危命令。', category: '云网络' },
  { term: '混合云', full: 'Hybrid Cloud', desc: '混合云是本地数据中心与公有云通过专线或 VPN 打通并统一管理的部署形态。', category: '云网络' },
  { term: '多云互联', full: 'Multi-Cloud Interconnect', desc: '多云互联把不同云厂商的 VPC 与自有网络连接起来，统一地址规划与路由策略。', category: '云网络' },
  { term: 'Region', desc: 'Region 是云服务的地理区域，区域内网络时延低，跨 Region 访问需要显式互联并单独计费。', category: '云网络' },
  { term: 'AZ', full: 'Availability Zone', desc: 'AZ 是地域内电力与网络相互独立的可用区，同一 Region 的 AZ 之间通过低时延链路互联。', category: '云网络' },
  { term: '租户', full: 'Tenant', desc: '租户是云上资源与网络的隔离单位，不同租户的地址空间与安全策略互不可见。', category: '云网络' },
  { term: '服务链', full: 'Service Function Chain', desc: '服务链按顺序把流量依次牵引经过防火墙、负载均衡等网元，实现安全与增值服务编排。', category: '云网络' },
  { term: '弹性网卡', full: 'Elastic Network Interface', desc: '弹性网卡是绑定在云主机上的虚拟网卡，可独立配置 IP 与安全组并在实例之间迁移。', category: '云网络' },
  { term: '云监控', full: 'Cloud Monitor', desc: '云监控是采集云资源指标、日志与告警的观测服务，用于容量分析与故障定位。', category: '云网络' },
];

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 长词优先，避免 IP 抢先匹配 IPv6、IPsec 等 */
const sortedTerms = [...glossary]
  .map((entry) => entry.term)
  .sort((a, b) => b.length - a.length || a.localeCompare(b));

export const glossaryPattern = new RegExp(
  `(?<![A-Za-z0-9_-])(${sortedTerms.map(escapeRegExp).join('|')})(?![A-Za-z0-9_-])`,
  'gi',
);

export const glossaryMap = new Map(glossary.map((entry) => [entry.term.toLowerCase(), entry]));

export function lookupGlossary(term: string): GlossaryEntry | undefined {
  return glossaryMap.get(term.toLowerCase());
}
