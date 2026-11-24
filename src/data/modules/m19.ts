import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm19',
  code: 'M19',
  title: 'SDN/NFV、Overlay 与 SRv6',
  summary:
    '云网的地基是控制与转发分离：SDN 控制器统一下发意图，VXLAN/EVPN 承载多租户大二层，NFV 把网元变成可编排的软件，SRv6 用 IPv6 地址即路径，把云骨干与跨域调度连成一张可编程网络。',
  stage: 'L4',
  order: 19,
  track: 'cloud',
  priority: 'P0',
  prerequisites: ['m16', 'm07', 'm10'],
  goals: [
    '说明 SDN 管理、控制、转发三层架构与控制器在云网中的职责',
    '解释 VXLAN 封装、VTEP、BGP EVPN 路由类型与分布式网关的转发过程',
    '对比 NFV 云化网元与传统硬件网元，说明服务链的引流方式与部署约束',
    '解释 SRv6 的 SRH、Locator、End 行为与 BE 转发，能与 MPLS L3VPN 逐项对照',
    '说明 SRv6 TE Policy 在云骨干跨域场景的落地方式与运维观测手段',
  ],
  keywords: [
    'SDN',
    'OpenFlow',
    'VXLAN',
    'EVPN',
    'VTEP',
    'NFV',
    '服务链',
    'SRv6',
    'SRH',
    'Locator',
    'TE Policy',
  ],
  lessons: [
    {
      id: 'm19-l01',
      moduleId: 'm19',
      title: 'SDN 架构与控制器：控制面与转发面分离',
      depth: '熟悉',
      minutes: 30,
      summary: 'SDN 把「怎么走」从每台设备抽到控制器，设备只负责按表转发，北向接口承接业务意图。',
      objectives: [
        '说明管理面、控制面、转发面的职责与 SDN 的分离方式',
        '解释北向 REST、南向 NETCONF/OpenFlow 的分工',
        '描述控制器纳管、配置下发与故障回退的基本流程',
      ],
      keywords: ['SDN', '控制器', 'OpenFlow', 'NETCONF', '控制面', '转发面'],
      blocks: [
        {
          type: 'paragraph',
          text: '传统网络里每台设备自己跑路由协议、自己算路、自己生成转发表，这叫控制面与转发面合一。SDN 的核心是把控制面抽出来集中到控制器：控制器掌握全局拓扑与策略，计算好路径后通过南向协议把转发表或配置下发给设备，设备只负责高速转发。这样做的好处是全网视角、变更一致、业务意图可以直接翻译成网络策略；代价是控制器成为关键依赖，南向协议的兼容性与下发可靠性直接决定网络可用性。',
        },
        {
          type: 'analogy',
          title: '路口各自判断与城市交通指挥中心',
          text: '传统网络像每个路口都有经验丰富的老交警，自己看车流决定放行方向，局部很灵活，但整座城市堵起来没人统管。SDN 像把交警撤到指挥中心，靠摄像头与地图统一调度，路口只剩红绿灯执行。指挥中心能看到全城，也能为救护车开绿波带；但一旦通信中断，路口必须有一套本地兜底规则，否则全城瘫痪。',
        },
        {
          type: 'table',
          title: '传统分布式网络与 SDN 的对比',
          columns: ['维度', '传统分布式', 'SDN 集中控制'],
          rows: [
            ['路径计算', '每台设备独立运行路由协议', '控制器基于全局拓扑统一计算'],
            ['配置方式', '逐台命令行或脚本', '模板、意图或 API 批量下发'],
            ['故障收敛', '依赖协议收敛，秒级到分钟级', '控制器重算并下发，可做预计算'],
            ['主要风险', '配置不一致、变更靠人', '控制器单点、南向链路与版本兼容'],
          ],
        },
        {
          type: 'table',
          title: '三个平面与两类接口',
          columns: ['层次', '职责', '典型技术'],
          rows: [
            ['管理面', '业务编排、策略定义、监控与审计', '北向 REST API、编排器、网管平台'],
            ['控制面', '拓扑收集、路径计算、转发表生成', '控制器集群、BGP-LS、PCEP'],
            ['转发面', '按表转发、计数、丢包与告警', '交换机、路由器、虚拟网元'],
            ['南向接口', '控制器与设备之间的配置与表项通道', 'NETCONF/YANG、OpenFlow、gRPC'],
          ],
        },
        {
          type: 'code',
          title: '用 NETCONF 下发一段接口配置',
          lang: 'xml',
          code: `<rpc message-id="101"
     xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">
  <edit-config>
    <target>
      <running/>
    </target>
    <config>
      <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
        <interface>
          <name>GigabitEthernet0/0/1</name>
          <description>to-core</description>
          <enabled>true</enabled>
        </interface>
      </interfaces>
    </config>
  </edit-config>
</rpc>`,
        },
        {
          type: 'steps',
          title: '控制器纳管一台设备的标准流程',
          items: [
            {
              title: '打通管理通道',
              text: '规划带外或管理 VPN，确保控制器到设备的管理地址可达，放通 NETCONF 或 gRPC 端口。',
            },
            {
              title: '准备身份与证书',
              text: '创建纳管账号或证书，统一时间源，避免因时钟偏差导致证书校验失败。',
            },
            {
              title: '只读纳管',
              text: '先以只读方式采集设备型号、版本、接口与现有配置，建立基线，不急于下发。',
            },
            {
              title: '灰度下发',
              text: '选择一台非关键设备做配置模板验证，确认回显与业务无异常后再扩大范围。',
            },
            {
              title: '校验与回退',
              text: '下发后比对期望状态与实际状态，保留变更前配置与回退脚本，异常时一键恢复。',
            },
          ],
        },
        {
          type: 'warning',
          title: '控制器不是「配置生成器」',
          text: '把 SDN 当成批量下发命令的工具，会保留传统网络的全部问题，只是把手工操作换成了脚本。真正的价值在于全局路径计算、状态感知与闭环校验：控制器要知道设备实际转发状态，而不只是「命令下发成功」。如果南向只写不读，配置漂移、部分失败与设备重启丢失配置都无法发现，最终仍然要靠人登录设备排查。',
        },
        {
          type: 'warning',
          title: '南向链路与控制器集群必须做冗余',
          text: '控制器集群要避免单点，南向管理网络要与业务网络隔离，链路中断时设备应保留最后一次有效转发表并支持本地逃生。升级控制器或变更南向协议版本前，必须确认设备侧兼容矩阵；不同厂商、不同版本的 YANG 模型差异很大，同一条配置在两台设备上可能一台成功一台报错。',
        },
        {
          type: 'tip',
          title: '从「读」开始，再谈「写」',
          text: '云网运维最稳妥的自动化路径是先做数据采集与一致性校验，再做只读巡检，最后才开放写操作。把「当前状态是否符合预期」做成可重复执行的检查，比一次性下发几百条配置更有价值。每次写操作都要有幂等设计、变更窗口与回退方案，否则自动化只会把错误扩散得更快。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm19-l02',
      moduleId: 'm19',
      title: 'VXLAN/EVPN 多租户数据中心：VTEP、BGP EVPN 与分布式网关',
      depth: '精通',
      minutes: 38,
      summary: 'VXLAN 用 UDP 封装把二层装进三层网络，EVPN 用 BGP 分发 MAC 与 IP 可达性，网关下沉到每台 Leaf。',
      objectives: [
        '解释 VXLAN 的封装格式、VNI 与 VTEP 的作用',
        '说明 EVPN 二类、三类、五类路由分别解决什么问题',
        '配置 VXLAN 与 BGP EVPN，并验证 VNI、邻居与转发表',
      ],
      keywords: ['VXLAN', 'VTEP', 'VNI', 'EVPN', '分布式网关', '多租户'],
      blocks: [
        {
          type: 'paragraph',
          text: '多租户数据中心要求每个租户有独立的二层域，又要能跨机架、跨楼层扩展，传统 VLAN 只有 12 位、最多四千个，且依赖生成树，规模一大就收敛慢、链路利用率低。VXLAN 用 24 位 VNI 把二层帧封装进 UDP，外层走三层 IP 网络，VTEP 负责封装与解封装，中间网络只当普通 IP 转发。这样二层域可以跨越三层边界，租户数量也从四千扩展到千万级。',
        },
        {
          type: 'analogy',
          title: '把信封套进快递袋',
          text: '原始以太网帧像一封信，VXLAN 把它装进一个标准快递袋，袋子上写清发件 VTEP、收件 VTEP 与租户编号（VNI）。中间经过的快递分拣中心只看袋子上的地址，不拆开看信，因此不需要认识每个租户的 MAC。到了收件 VTEP 才拆袋，把信交给对应的租户网络。EVPN 则是各站点之间互发的「收货清单」，提前告诉对方某个 MAC 或网段在哪个 VTEP 后面，避免逢人就广播询问。',
        },
        {
          type: 'table',
          title: 'VLAN 与 VXLAN 的对照',
          columns: ['维度', 'VLAN', 'VXLAN'],
          rows: [
            ['标识长度', '12 位，约 4094 个可用', '24 位 VNI，规模可达千万级'],
            ['封装', '802.1Q 标签，二层内生效', 'UDP 外层加 VXLAN 头，跨三层'],
            ['转发范围', '受生成树约束，链路利用率低', '等价多路径，无生成树阻塞'],
            ['典型边界', '单个园区或机架内', '跨机架、跨机房的数据中心'],
            ['学习方式', '泛洪加源 MAC 学习', '控制面 EVPN 分发，减少泛洪'],
          ],
        },
        {
          type: 'table',
          title: 'EVPN 常用路由类型',
          columns: ['类型', '名称', '携带内容', '解决的问题'],
          rows: [
            ['Type 2', 'MAC/IP 通告', 'MAC、IP、VNI、下一跳 VTEP', '主机 MAC 与 ARP 可达性，支持 ARP 抑制'],
            ['Type 3', '包含组播路由', 'VTEP 地址与 VNI', '自动发现同 VNI 的其他 VTEP，指导泛洪'],
            ['Type 5', 'IP 前缀路由', 'IP 前缀、下一跳 VTEP', '跨子网三层互通，替代集中式网关'],
          ],
        },
        {
          type: 'paragraph',
          text: '分布式网关是 VXLAN 数据中心的关键设计：每台 Leaf 都配置同一个网关 IP 与虚拟 MAC，但只对本机下挂的主机响应 ARP。主机跨子网访问时，首包由本 Leaf 直接路由并封装到目的 VTEP，不再绕行一对集中式网关。这样东西向流量路径最短，网关也不再是带宽瓶颈。代价是每台 Leaf 都要维护租户的 VRF、VNI 与网关配置，地址与 VNI 规划必须严格统一。',
        },
        {
          type: 'code',
          title: '配置 VXLAN 隧道、分布式网关与 BGP EVPN 邻居',
          lang: 'vrp',
          code: `bridge-domain 100
 vxlan vni 50100
quit
interface Nve1
 source 10.10.1.1
 vni 50100 head-end peer-list protocol bgp
quit
interface Vbdif100
 ip address 192.168.100.1 255.255.255.0
 mac-address 0000-5e00-0101
quit
bgp 65001
 router-id 10.10.1.1
 peer 10.10.1.2 as-number 65001
 peer 10.10.1.2 connect-interface LoopBack0
 ipv4-family unicast
  peer 10.10.1.2 enable
 l2vpn-family evpn
  policy vpn-target
  peer 10.10.1.2 enable
 quit
quit`,
        },
        {
          type: 'code',
          title: '验证 VNI、EVPN 邻居与 MAC 表',
          lang: 'bash',
          code: `display vxlan vni
display bgp evpn peer
display bgp evpn route-type mac-ip
display bridge mac-address
display vxlan tunnel`,
        },
        {
          type: 'output',
          title: '查看 VNI 与 EVPN 邻居状态',
          text: `<DC-Leaf1> display vxlan vni
VNI      BD-ID  State  Source          Destination
50100    100    up     10.10.1.1       10.10.1.2

<DC-Leaf1> display bgp evpn peer
BGP local router ID : 10.10.1.1
Peer            V    AS     MsgRcvd  MsgSent  Up/Down   State
10.10.1.2       4    65001  128      130      01:12:33  Established`,
        },
        {
          type: 'steps',
          title: '一次跨 Leaf 的主机通信',
          items: [
            {
              title: '本机 ARP 代理',
              text: '源主机查询网关 MAC，Leaf 用统一的虚拟 MAC 直接应答，避免 ARP 在 VXLAN 内泛洪。',
            },
            {
              title: '本机路由',
              text: 'Leaf 查 VRF 路由表，确定目的网段在另一台 Leaf 的 Vbdif 上，下一跳为对端 VTEP。',
            },
            {
              title: 'VXLAN 封装',
              text: '原始帧加上 VXLAN 头、UDP 头与外层 IP 头，外层目的地址是目的 VTEP 的 Loopback。',
            },
            {
              title: '对端解封装',
              text: '目的 VTEP 校验 VNI 后解封装，按目的 MAC 送到主机，回程走对称路径。',
            },
          ],
        },
        {
          type: 'warning',
          title: 'VXLAN 不通，先查 Underlay 与 VNI 映射',
          text: 'VXLAN 的所有问题都可以分成三层看：外层 Underlay 的 Loopback 是否互通、VTEP 之间是否能转发大包；VNI 与 bridge-domain 的映射是否两端一致、VNI 是否冲突；EVPN 邻居是否 Established、路由目标是否匹配。常见现象是「同子网能通、跨子网不通」，多半是 Vbdif 没配、VRF 没绑定或 Type 5 路由没生成。MTU 不足则表现为 ping 通、大文件传输卡死。',
        },
        {
          type: 'tip',
          title: 'VNI 与地址要像 IP 规划一样严肃',
          text: '建议按「租户 + 业务 + 地域」分层规划 VNI，并预留连续号段，避免后期扩容时冲突。VTEP 地址使用独立的 Loopback 网段，Underlay 只跑 IGP 与 BGP，不承载租户流量。分布式网关的虚拟 MAC 全网统一，网关 IP 按租户 VRF 规划，任何一台 Leaf 的配置偏差都会造成部分主机「有时通、有时不通」。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm19-l03',
      moduleId: 'm19',
      title: 'NFV 与云化网元：vFW、vLB、vRouter 与服务链',
      depth: '熟悉',
      minutes: 32,
      summary: 'NFV 把防火墙、负载均衡与路由器做成虚拟机或容器，服务链决定流量按什么顺序穿过它们。',
      objectives: [
        '说明 NFV 的软硬件解耦与云化网元的部署形态',
        '解释策略路由、VLAN 与 SRv6 等引流方式的服务链实现',
        '识别非对称路径、会话保持与引流环路三类典型问题',
      ],
      keywords: ['NFV', 'vFW', 'vLB', 'vRouter', '服务链', '策略路由'],
      blocks: [
        {
          type: 'paragraph',
          text: 'NFV 把传统专用硬件网元的功能做成软件，运行在通用服务器、虚拟机或容器里。好处是扩容不再等硬件到货，网元可以随业务编排自动部署、灵活迁移；代价是转发性能受服务器与虚拟化开销限制，需要 SR-IOV、DPDK 或智能网卡加速。常见云化网元包括虚拟防火墙 vFW、虚拟负载均衡 vLB、虚拟路由器 vRouter，它们通常不单独存在，而是按业务要求串成一条服务链：流量先过防火墙，再过负载均衡，最后到应用。',
        },
        {
          type: 'analogy',
          title: '机场安检、值机与登机口',
          text: '服务链像旅客乘机流程：先过安检（vFW），再办值机与托运（vLB），最后到登机口（应用）。每个环节都只做自己的事，但顺序不能乱，也不能让旅客跳过安检直接登机。如果安检与登机口分别看到旅客的不同队伍，就会出现「进来查过、出去没记录」的非对称问题，所以服务链必须保证去程与回程走同一组网元。',
        },
        {
          type: 'table',
          title: '硬件网元与云化网元的对比',
          columns: ['维度', '传统硬件网元', 'NFV 云化网元'],
          rows: [
            ['部署周期', '采购、上架、布线，周级到月级', '镜像拉起，分钟级'],
            ['性能', '专用芯片，转发能力强', '通用服务器，需加速技术补足'],
            ['弹性', '受硬件容量限制', '按需扩缩容，支持多实例'],
            ['可靠性', '硬件冗余、双机热备', '多实例加负载均衡，依赖编排'],
            ['运维', '逐台登录，版本升级麻烦', '模板化、可编排、可灰度'],
          ],
        },
        {
          type: 'table',
          title: '常见的服务链引流方式',
          columns: ['方式', '实现位置', '优点', '约束'],
          rows: [
            ['策略路由', '入口路由器或 Leaf', '不改变报文封装，配置直观', '需要维护 ACL 与下一跳，回程要对称'],
            ['VLAN 引流', '接入或汇聚交换机', '实现简单，兼容性好', '占用 VLAN，跨域扩展麻烦'],
            ['SRv6 服务链', 'SRv6 域边界', '可编排、支持跨域与显式路径', '设备需支持 SRv6 与对应行为'],
          ],
        },
        {
          type: 'code',
          title: '用策略路由把租户流量引到 vFW',
          lang: 'vrp',
          code: `acl number 3000
 rule 5 permit ip source 192.168.10.0 0.0.0.255 destination 192.168.20.0 0.0.0.255
quit
traffic classifier CLS-FW operator or
 if-match acl 3000
quit
traffic behavior BEH-FW
 redirect ip-nexthop 10.0.0.10
quit
traffic policy POL-FW
 classifier CLS-FW behavior BEH-FW
quit
interface Vlanif10
 traffic-policy POL-FW inbound
quit`,
        },
        {
          type: 'output',
          title: '查看策略路由命中计数',
          text: `<DC-GW> display traffic policy statistics interface Vlanif10 inbound
Traffic policy: POL-FW
  Classifier: CLS-FW
    Passed packets     : 0
    Dropped packets    : 0
    Redirected packets : 18426`,
        },
        {
          type: 'warning',
          title: '非对称路径会让有状态网元失效',
          text: '防火墙与负载均衡都是有状态设备，去程经过实例 A、回程经过实例 B，会话表对不上，表现为连接建立后立刻断开或大流量随机失败。服务链设计必须保证双向流量经过同一组网元，常用做法是让 vFW 同时承担进出两个方向，或在回程路径上显式引流。多实例场景还要考虑会话同步与一致性哈希，否则扩容时既有连接会被打断。',
        },
        {
          type: 'warning',
          title: '引流配置写错会形成环路',
          text: '策略路由的下一跳如果又指回原接口，或者 vFW 的回程路由指回入口设备而入口设备再次引流，报文就会在两个设备之间循环，直到 TTL 耗尽。上线前用 tracert 确认路径只经过一次服务链，并在入口与出口都配置防环检查。ACL 匹配范围也要收窄，避免把管理流量、路由协议报文一起引走。',
        },
        {
          type: 'tip',
          title: '先画流量路径，再写配置',
          text: '服务链的配置量不大，难的是把「谁访问谁、经过哪些网元、回程怎么走」画清楚。建议为每条业务画一张单向路径图，标注入口、网元实例、出口与回程，再逐跳写引流规则。上线后先看命中计数是否增长，再看会话表是否成对出现，最后才压测性能。跳过路径设计直接堆配置，几乎一定会遇到非对称与环路。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm19-l04',
      moduleId: 'm19',
      title: 'SRv6 原理：SRH、Locator、BE 与流量工程',
      depth: '精通',
      minutes: 40,
      summary: 'SRv6 把路径编进 IPv6 地址：Locator 保证可达，SRH 携带段列表，End 行为完成逐跳处理。',
      objectives: [
        '解释 SRv6 SID 的构成与 Locator 在路由中的作用',
        '说明 SRH 的字段与段列表的转发过程',
        '区分 SRv6 BE 与 TE Policy，并与 MPLS L3VPN 逐项对比',
      ],
      keywords: ['SRv6', 'SRH', 'Locator', 'End.DT4', 'BE', 'TE Policy'],
      blocks: [
        {
          type: 'paragraph',
          text: 'SRv6 是 Segment Routing 在 IPv6 上的实现：不再使用 MPLS 标签，而是用一个 128 位 IPv6 地址表示一个「段」，这个地址既是转发目的，也是要执行的动作。地址的高位是 Locator，由 IGP 在域内通告，保证报文能被路由到执行节点；低位是 Function 与可选参数，指明该节点要做什么，例如解封装后查 IPv4 表、转发到某个邻居。路径由一组 SID 组成的有序列表表达，存放在段路由头 SRH 中。',
        },
        {
          type: 'analogy',
          title: '一列写满站点的行程单',
          text: '传统逐跳转发像每到一个路口问一次路，路径由沿途设备各自决定；SRv6 像出发时就把要经过的城市写在行程单上，每个城市只负责「送我到下一站」。行程单就是 SRH，城市名就是 SID，而每个城市内的具体门牌由 Locator 决定。行程单可以只写终点（BE），也可以写清楚每一站（TE Policy），区别只是路径的确定性。',
        },
        {
          type: 'table',
          title: 'SRv6 与 MPLS L3VPN 的对比',
          columns: ['维度', 'MPLS L3VPN', 'SRv6 L3VPN'],
          rows: [
            ['数据面标识', '20 位标签，标签栈', '128 位 SID，IPv6 头加 SRH'],
            ['路径表达', '标签栈，依赖 LDP、RSVP-TE 或 SR-MPLS', 'SID 列表，原生支持源路由'],
            ['控制面', 'MP-BGP 分发 VPNv4/VPNv6 路由', 'MP-BGP 分发 VPN 路由并携带 SID'],
            ['隧道建立', '需要 LSP 或 SR-MPLS 隧道', 'Locator 路由可达即可，无需额外隧道协议'],
            ['运维工具', 'LSP ping、MPLS OAM', 'IPv6 ping/tracert、IFIT、Telemetry'],
            ['主要约束', '标签栈深度与芯片能力', '报文开销更大，对设备与 MTU 要求高'],
          ],
        },
        {
          type: 'table',
          title: '常用 End 行为',
          columns: ['行为', '含义', '典型位置'],
          rows: [
            ['End', '更新外层目的地址为下一个 SID，段剩余数减一', '普通中转节点'],
            ['End.X', '在更新 SID 的同时从指定邻接链路转发', '需要指定出接口的节点'],
            ['End.DT4', '解封装后按 IPv4 路由表转发', 'PE 侧 VPN 实例'],
            ['End.DT6', '解封装后按 IPv6 路由表转发', 'PE 侧 VPN 实例'],
            ['End.B6.Encaps', '按 TE Policy 的段列表重新封装 SRH', 'TE Policy 头端'],
          ],
        },
        {
          type: 'paragraph',
          text: 'SRv6 BE 是最简单的部署形态：控制面通过 BGP 把远端 VPN 前缀与对应的 End.DT4 SID 一起通告，头端 PE 收到普通 IP 报文后，直接以外层 IPv6 目的地址等于该 SID 进行封装，中间节点只按 Locator 路由转发，最后一跳执行 End.DT4 解封装并查表。整条路径没有显式段列表，走的是 IGP 最短路径，因此部署简单，但无法指定绕行或带宽约束。',
        },
        {
          type: 'code',
          title: '配置 Locator、End.DT4 与 IGP 通告',
          lang: 'vrp',
          code: `segment-routing ipv6
 encapsulation source-address 2001:db8::1
 locator LOC1 ipv6-prefix 2001:db8:100:: 64 static 32
  opcode ::1 end-dt4
  opcode ::2 end-dt6
 quit
quit
isis 1
 is-level level-2
 network-entity 49.0001.0000.0000.0001.00
 ipv6 enable
 segment-routing ipv6 locator LOC1
quit`,
        },
        {
          type: 'code',
          title: '查看 Locator 与本地 SID',
          lang: 'bash',
          code: `display segment-routing ipv6 locator
display segment-routing ipv6 local-sid end-dt4
display ipv6 routing-table 2001:db8:100:: 64
ping ipv6 -s 1400 2001:db8:200::1`,
        },
        {
          type: 'output',
          title: 'Locator 与 End.DT4 SID 的回显',
          text: `<PE1> display segment-routing ipv6 locator
Locator Name : LOC1
  Prefix     : 2001:DB8:100::/64
  Static Len : 32
  Status     : Up

<PE1> display segment-routing ipv6 local-sid end-dt4
SID               Endpoint Behavior  Locator  Status
2001:DB8:100::1   End.DT4            LOC1     Active`,
        },
        {
          type: 'paragraph',
          text: '当业务需要指定路径、避开拥塞或做跨域调度时，就要用 SRv6 TE Policy。头端维护候选路径与段列表，为策略分配 Binding SID；报文进入策略后，头端按段列表封装 SRH，中间节点逐个执行 SID，直到到达目的。候选路径可以配置优先级与亲和属性，配合控制器实现全局算路。它与 MPLS 的 RSVP-TE 目标相似，但不需要为每条隧道维护信令状态，路径信息直接编码在报文里。',
        },
        {
          type: 'warning',
          title: 'Locator 不通，后面全是空谈',
          text: 'SRv6 的可达性完全依赖 Locator 路由。如果 IGP 没有携带 Locator、Locator 与 Loopback 地址冲突，或者跨域没有对 Locator 做汇总与放通，报文在中间就会因为目的地址不可达被丢弃。排障顺序是：本机 Locator 是否为 Up、邻居能否学到对端 Locator、端到端 ping 外层地址是否通、最后才看 VPN 路由与 SID 是否匹配。',
        },
        {
          type: 'warning',
          title: 'SRH 让报文变大，MTU 必须提前规划',
          text: 'SRv6 在 IPv6 头之外还可能带 SRH，TE Policy 的段列表越长开销越大。底层链路 MTU 仍是 1500 时，建议把 SRv6 域内 MTU 规划到 1400 或更低，并确保 ICMPv6 Packet Too Big 不被过滤，否则表现为小包通、大包丢。跨域场景还要统一各域的 MTU 与分片策略，不能只在头端调大接口 MTU。',
        },
        {
          type: 'tip',
          title: 'Locator 规划要留出聚合空间',
          text: 'Locator 不是随便挑一个 IPv6 前缀，它要像公网地址一样规划：按地域与角色分配连续前缀，保证域内可聚合、跨域可汇总，Static Len 与 Opcode 长度提前算好。给每个设备预留足够 Opcode 空间，避免后期新增 End.DT4、End.X 时地址不够。规划混乱的 Locator 会让 SRv6 的优势变成运维负担。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm19-l05',
      moduleId: 'm19',
      title: 'SRv6 云网落地：云骨干、跨域 Policy 与运维观测',
      depth: '精通',
      minutes: 38,
      summary: '云骨干用 SRv6 打通 DC 与专线，跨域靠 Binding SID 拼接段列表，运维靠 Telemetry 与 IFIT 看清每一跳。',
      objectives: [
        '说明 SRv6 在云骨干与云专线场景中的典型位置',
        '解释跨域 TE Policy 的拼接方式与 Binding SID 的作用',
        '用 ping、tracert、Telemetry 与 IFIT 完成 SRv6 路径验证',
      ],
      keywords: ['SRv6', '云骨干', '跨域', 'Binding SID', 'IFIT', 'Telemetry'],
      blocks: [
        {
          type: 'paragraph',
          text: '云骨干是连接多个数据中心、多个地域与专线入口的一层网络，要求路径可编排、故障可快速收敛、租户之间严格隔离。SRv6 在这里的价值是把「租户标识、VPN 语义与路径」统一进 IPv6 地址：DC 出口的 Leaf 与骨干 PE 之间只需要交换 Locator 与 VPN 路由，不必为每个租户维护一套标签或隧道。跨域时，各域独立规划 Locator，通过 Binding SID 把一段段路径拼接成端到端策略，入口只需指定一个 SID。',
        },
        {
          type: 'analogy',
          title: '一张联程机票',
          text: '跨域 SRv6 像联程机票：旅客只买一张票（Binding SID），背后的航段由航空公司拼接，第一段从本地到枢纽，第二段从枢纽到目的城市。旅客不需要关心中间怎么转，但每一段都必须有可用的航班与座位。Binding SID 就是那张联程票号，域内段列表是具体航段，任何一个域没有可达的 Locator，联程就会断在中间。',
        },
        {
          type: 'table',
          title: 'SRv6 BE 与 SRv6 TE Policy 的选择',
          columns: ['维度', 'SRv6 BE', 'SRv6 TE Policy'],
          rows: [
            ['路径', '跟随 IGP 最短路径', '按段列表显式指定'],
            ['控制面', 'BGP 携带 SID 即可', '需策略配置或控制器算路'],
            ['适用场景', '一般业务互通、快速上线', '跨域调度、带宽保障、绕行'],
            ['运维复杂度', '低，接近普通 IPv6 路由', '高，需维护候选路径与 Binding SID'],
            ['故障行为', '随 IGP 收敛自动切换', '按候选路径切换，可配置回切'],
          ],
        },
        {
          type: 'table',
          title: 'SRv6 域的观测手段',
          columns: ['手段', '观测内容', '适用问题'],
          rows: [
            ['ping ipv6', '端到端可达性与时延', 'Locator 是否可达、MTU 是否足够'],
            ['tracert ipv6', '逐跳路径与外层地址', '实际路径与预期是否一致'],
            ['IFIT', '按流统计丢包与时延', '某条业务流在哪一跳劣化'],
            ['Telemetry', '秒级接口与队列指标', '拥塞、微突发与趋势分析'],
            ['BGP EVPN/VPN 路由表', 'SID 与 VPN 前缀的对应关系', '路由存在但业务不通'],
          ],
        },
        {
          type: 'code',
          title: '配置一条跨域 SRv6 TE Policy（结构示意）',
          lang: 'vrp',
          code: `segment-routing ipv6
 srv6-te-policy
  policy CLOUD-P1
   binding-sid 2001:db8:900::1
   candidate-path preference 100
    segment-list SL-PRIMARY
     index 1 sid 2001:db8:100::10
     index 2 sid 2001:db8:200::10
     index 3 sid 2001:db8:300::10
    quit
   quit
  quit
 quit
quit`,
        },
        {
          type: 'paragraph',
          text: '这条策略的含义是：进入 Binding SID 的流量，按 SL-PRIMARY 的段列表依次经过三个域的 SID，最终到达目的 PE。候选路径可以配置多条，主路径故障时切换到备用段列表。实际命令与字段随设备版本有差异，配置前必须以当前版本的命令手册为准；但无论命令怎么变，核心要素只有三个：Binding SID 用于引流、段列表描述路径、候选路径决定优先级与切换。',
        },
        {
          type: 'code',
          title: '验证跨域路径与业务连通性',
          lang: 'bash',
          code: `display segment-routing ipv6 locator
display segment-routing ipv6 local-sid end-dt4
display bgp vpnv4 all routing-table
tracert ipv6 -a 2001:db8:100::1 2001:db8:300::1
ping ipv6 -a 2001:db8:100::1 -s 1400 2001:db8:300::1`,
        },
        {
          type: 'output',
          title: '逐跳确认 SRv6 路径',
          text: `<PE1> tracert ipv6 2001:DB8:300::1
traceroute to 2001:DB8:300::1, 64 hops max
 1  2001:DB8:12::2      1 ms    1 ms    1 ms
 2  2001:DB8:23::2      2 ms    2 ms    2 ms
 3  2001:DB8:300::1     3 ms    3 ms    3 ms

<PE1> ping ipv6 -s 1400 2001:DB8:300::1
Reply from 2001:DB8:300::1: bytes=1400 time=3 ms
Packets: Sent = 5, Received = 5, Loss = 0%`,
        },
        {
          type: 'warning',
          title: '跨域不是把两段配置拼起来',
          text: '跨域 SRv6 最容易出问题的地方在边界：两个域的 Locator 没有互相放通、Binding SID 在边界设备上没有生效、段列表里的 SID 属于未通告的前缀、MTU 在某一域被调小。表现通常是「域内通、跨域不通」或「小包通、大包断」。上线前要在每个域分别验证 Locator 可达，再验证 Binding SID 引流，最后做端到端大包测试，不能只看 BGP 邻居是否 Established。',
        },
        {
          type: 'warning',
          title: 'Telemetry 数据要能对齐时间与路径',
          text: 'SRv6 路径可能经过多厂商设备，Telemetry 的采样周期、时间戳与字段定义不一致时，跨设备关联会得出错误结论。全网统一 NTP，明确采样间隔与保留周期，并在分析前先确认数据是否来自同一条业务流。IFIT 可以按流测量，但需要在头尾同时开启，否则只有单向数据。',
        },
        {
          type: 'steps',
          title: '实践任务：用两台路由器打通 SRv6 BE 站点',
          items: [
            {
              title: '规划地址',
              text: '为 PE1、PE2 各规划一个 Loopback 与一个 Locator 前缀，规划 PE 之间的互联 IPv6 地址与两个站点的 IPv4 私网网段。',
            },
            {
              title: '打通 Underlay',
              text: '配置接口 IPv6 地址与 IS-IS，确认两端 Loopback 与 Locator 都能互相学习到，先用 ping ipv6 验证。',
            },
            {
              title: '配置 SRv6 与 VPN 实例',
              text: '在两端配置 segment-routing ipv6、Locator 与 End.DT4，绑定 VPN 实例，并通过 BGP 交换 VPN 路由与 SID。',
            },
            {
              title: '验证业务',
              text: '从站点 A 的主机 ping 站点 B 的主机，确认通；用 tracert ipv6 观察外层路径，确认经过对端 Locator。',
            },
            {
              title: '制造故障并恢复',
              text: '关闭主链路，观察 IGP 收敛与业务恢复时间；再恢复链路，记录路径回切过程与丢包情况。',
            },
          ],
        },
        {
          type: 'checklist',
          title: '验证清单',
          items: [
            'display segment-routing ipv6 locator 显示本端 Locator 为 Up',
            '两端均能学到对端 Locator，且 ping ipv6 对端 Locator 成功',
            'display segment-routing ipv6 local-sid end-dt4 能看到 End.DT4 处于 Active',
            'BGP VPN 路由携带的 SID 与对端 Locator 前缀一致',
            'tracert ipv6 显示路径符合预期，ping 1400 字节无丢包',
            '断链后业务在可接受时间内恢复，且无持续环路或黑洞',
          ],
        },
        {
          type: 'tip',
          title: '先用 BE 跑通，再上 TE Policy',
          text: 'BE 的依赖最少，能把 Locator、VPN 路由与 MTU 三类基础问题暴露干净。BE 稳定后再引入 TE Policy，逐条验证 Binding SID 引流、候选路径切换与回切抑制。不要一上来就配复杂策略，否则一旦不通，很难判断是基础可达性问题还是策略编排问题。把每一步的验证命令与预期结果写进变更方案，比事后抓包高效得多。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
