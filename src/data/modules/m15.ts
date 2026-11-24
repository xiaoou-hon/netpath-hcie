import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm15',
  code: 'M15',
  title: '园区与广域架构',
  summary:
    '园区与广域是交付主场：三层架构决定网关与 VLAN 怎么放，准入与业务随行决定谁能用什么；SD-WAN 用 GRE、IPsec 与智能选路连接分支，智能运维把救火变成预判。',
  stage: 'L3',
  order: 15,
  goals: [
    '画出接入、汇聚、核心三层架构，说明堆叠双活与网关部署位置的取舍',
    '完成 VLAN 规划与出口设计，判断南北向流量的关键约束',
    '配置 802.1X、Portal 与 MAC 认证，并说明 RADIUS 与业务随行的配合',
    '配置 GRE 与 IPsec 隧道，解释 SD-WAN 控制器、CPE 与 Overlay 的分工',
    '用 NCE-Campus、CampusInsight 与 NCE-IP 完成管理与体验分析',
  ],
  keywords: [
    '三层架构',
    '堆叠',
    'VLAN 规划',
    '802.1X',
    'Portal',
    'RADIUS',
    '业务随行',
    'SD-WAN',
    'IPsec',
    'Telemetry',
  ],
  lessons: [
    {
      id: 'm15-l01',
      moduleId: 'm15',
      title: '园区网典型组网与三层架构设计',
      depth: '熟悉',
      minutes: 26,
      summary: '接入、汇聚、核心各管一段，堆叠与 Eth-Trunk 做双活，网关位置决定收敛与广播域。',
      objectives: [
        '说明接入、汇聚、核心三层的职责划分与选型依据',
        '解释堆叠双活、Eth-Trunk 与网关部署位置的取舍',
        '完成 VLAN 规划与网关配置并验证链路聚合',
      ],
      keywords: ['三层架构', '堆叠', 'Eth-Trunk', 'VLAN 规划', '网关部署'],
      blocks: [
        {
          type: 'paragraph',
          text: '园区网几万人的规模不是靠一台交换机堆出来的，而是分层。接入层负责终端接入、端口密度与准入，汇聚层负责终结 VLAN、做网关与策略，核心层只做高速转发并连接数据中心与出口。分层的好处是每层的容量与功能可以独立扩展：接入加端口，汇聚加网关与策略，核心加带宽与冗余。中型园区常把汇聚与核心合并成两层，小型园区则直接二层到核心，但职责边界仍然要清楚。',
        },
        {
          type: 'analogy',
          title: '小区道路、主干道与高速',
          text: '楼门口的小路只服务一栋楼，属于接入；片区主干道把若干小区汇到一起，属于汇聚；城市快速路只负责长距离大流量，不设红绿灯，属于核心。不会让外卖车直接上快速路，也不会在快速路上设小区门禁。分层就是让每一级只做自己擅长的事，否则一处拥塞会传导到整张网。',
        },
        {
          type: 'table',
          title: '三层架构的职责与典型设备',
          columns: ['层次', '主要职责', '关键指标', '典型设备'],
          rows: [
            ['接入层', '终端接入、PoE 供电、端口安全与准入', '端口密度、PoE 功率、单端口成本', 'S 系列接入交换机、AP'],
            ['汇聚层', 'VLAN 终结、网关、策略与路由边界', '表项规格、上行带宽、双机性能', 'S 系列盒式或框式交换机'],
            ['核心层', '高速转发、连接数据中心与出口', '交换容量、时延、冗余切换速度', '框式核心交换机、路由器'],
          ],
        },
        {
          type: 'table',
          title: '网关放在哪里',
          columns: ['位置', '优点', '代价', '适用场景'],
          rows: [
            ['核心层', '管理集中，VLAN 可跨汇聚延伸', '核心压力大，故障影响面广', '中小型园区，汇聚功能简单'],
            ['汇聚层', '故障域小，策略靠近用户', '汇聚需承担网关与路由', '大中型园区最常见'],
            ['接入层', '本地转发，汇聚压力小', 'VLAN 蔓延，配置分散难管理', '独立小楼或远端模块'],
          ],
        },
        {
          type: 'interactive',
          key: 'vxlan-evpn',
          caption: '观察大二层如何用 VXLAN 把网关推到边缘，以及分布式网关的转发路径',
        },
        {
          type: 'code',
          title: '配置堆叠双上行、Eth-Trunk 与网关',
          lang: 'vrp',
          code: `vlan batch 10 20 30 100
interface Eth-Trunk1
 mode lacp-static
 port link-type trunk
 port trunk allow-pass vlan 10 20 30
quit
interface GigabitEthernet0/0/1
 eth-trunk 1
quit
interface GigabitEthernet0/0/2
 eth-trunk 1
quit
interface Vlanif10
 ip address 192.168.10.1 255.255.255.0
quit
interface Vlanif20
 ip address 192.168.20.1 255.255.255.0
quit`,
        },
        {
          type: 'output',
          title: '查看链路聚合状态',
          text: `<SW-Core1> display eth-trunk 1
Eth-Trunk1's state information is:
WorkingMode: LACP     Hash arithmetic: According to flow
Least Active-linknumber: 1     Max Active-linknumber: 8
Operate status: up            Number of Up Ports in Trunk: 2

PortName                Status    Weight
GigabitEthernet0/0/1    Up        1
GigabitEthernet0/0/2    Up        1`,
        },
        {
          type: 'warning',
          title: '堆叠带来简化，也带来双主风险',
          text: '堆叠把两台设备合成一台逻辑设备，管理简单、跨设备链路聚合方便，但堆叠线一旦故障而业务口仍连通，就会出现两台设备都认为自己才是主，地址与网关同时存在，网络大面积异常。必须配置 MAD 检测，例如直连 MAD 或 Eth-Trunk 代理检测，并确保检测链路独立于业务链路。另外堆叠升级是整体重启，窗口要提前评估。',
        },
        {
          type: 'tip',
          title: 'VLAN 规划按「谁需要互通」切分',
          text: '不要按部门名字随手编号，而要先画清互通矩阵：同一广播域内的终端才划进同一 VLAN，需要互通但不应泛滥的用三层网关加 ACL。预留连续号段给未来楼层与业务，管理 VLAN、语音 VLAN、AP 管理 VLAN 单独划分。规划阶段多花一天，能省掉后期大量地址冲突与策略返工。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm15-l02',
      moduleId: 'm15',
      title: '网络准入控制与业务随行',
      depth: '熟悉',
      minutes: 24,
      summary: '802.1X、Portal 与 MAC 认证覆盖不同终端，再由 RADIUS 统一授权。',
      objectives: [
        '对比 802.1X、Portal 与 MAC 认证的适用终端与部署位置',
        '配置 RADIUS 模板、AAA 域与接口 802.1X',
        '说明业务随行如何用用户组替代基于 IP 的策略',
      ],
      keywords: ['802.1X', 'Portal', 'MAC 认证', 'RADIUS', '业务随行'],
      blocks: [
        {
          type: 'paragraph',
          text: '园区里既有员工笔记本，也有打印机、摄像头、IP 电话这类哑终端，还有访客。准入控制要回答两个问题：这个终端是谁、它能访问什么。802.1X 在二层用 EAP 做端口级认证，适合装了客户端的办公终端；Portal 在拿到地址后通过网页认证，适合访客与自带设备；MAC 认证把 MAC 地址当凭据，适合无法装客户端的哑终端。认证结果通常由 RADIUS 服务器裁决，再通过授权 VLAN 或 ACL 下发权限。',
        },
        {
          type: 'analogy',
          title: '门禁卡、前台登记与车牌识别',
          text: '员工刷卡进门就是 802.1X，卡里带着身份，闸机直接判断；访客到前台登记换临时卡就是 Portal，先连上网再填信息；月租车不刷卡，摄像头识别车牌自动放行就是 MAC 认证。三种方式的安全强度不同，但目的相同：先确认身份，再决定能进哪扇门、能待多久。',
        },
        {
          type: 'table',
          title: '三种准入方式对比',
          columns: ['方式', '工作层次', '适用终端', '安全强度'],
          rows: [
            ['802.1X', '二层，EAPoL', '装了认证客户端的 PC、手机', '高，支持双向认证与动态授权'],
            ['Portal', '三层，Web 页面', '访客、自带设备、临时用户', '中，依赖账号与页面安全'],
            ['MAC 认证', '二层，以 MAC 为凭据', '打印机、摄像头、IP 电话', '低，MAC 可被伪造，需配合端口安全'],
          ],
        },
        {
          type: 'steps',
          title: '802.1X 的一次完整认证',
          items: [
            {
              title: '终端发起',
              text: '终端接入后发送 EAPoL-Start，交换机作为认证点请求身份信息。',
            },
            {
              title: '交换机转发',
              text: '交换机把 EAP 报文封装进 RADIUS Access-Request，送到认证服务器。',
            },
            {
              title: '服务器裁决',
              text: 'RADIUS 校验账号密码或证书，返回 Accept 与授权属性，例如 VLAN、ACL、带宽。',
            },
            {
              title: '端口放行',
              text: '交换机把端口从授权态打开，按下发属性生效；终端下线或超时后重新回到未授权态。',
            },
          ],
        },
        {
          type: 'code',
          title: '配置 RADIUS、AAA 域与接口 802.1X',
          lang: 'vrp',
          code: `radius-server template RAD
 radius-server shared-key cipher Huawei@123
 radius-server authentication 10.1.100.10 1812
 radius-server accounting 10.1.100.10 1813
quit
aaa
 authentication-scheme SCH
  authentication-mode radius
 quit
 domain default
  authentication-scheme SCH
  radius-server RAD
 quit
quit
dot1x enable
interface GigabitEthernet0/0/1
 dot1x enable
 dot1x port-method port
quit`,
        },
        {
          type: 'output',
          title: '查看在线用户与认证结果',
          text: `<SW-Access> display access-user
-------------------------------------------------------------------------------
UserID  Username   IP address     MAC address      Access-type  State
-------------------------------------------------------------------------------
12      zhang.san  192.168.10.23  00e0-fc12-3456  Dot1x        Authenticated
18      printer01  192.168.10.51  00e0-fc78-9abc  MAC          Authenticated

  Total 2 users`,
        },
        {
          type: 'warning',
          title: 'MAC 认证不是安全认证',
          text: 'MAC 地址在二层明文可见，任何终端都能改成打印机的 MAC 骗取放行。哑终端用 MAC 认证时必须叠加端口安全、IP-MAC 绑定或只允许特定 OUI，并把这些端口放在独立 VLAN。另一个高频问题是终端不支持 802.1X 却被要求认证，结果插上网线完全没有网络，部署前必须先盘点终端类型。',
        },
        {
          type: 'tip',
          title: '业务随行让策略跟着用户组走',
          text: '传统 ACL 绑 IP，员工换会议室、换无线就换了地址，策略立刻失效。业务随行把用户分到用户组，策略以「组到组」的形式定义，由 Agile Controller 或 NCE-Campus 统一下发到接入设备，用户走到哪里，权限就跟到哪里。它不改变认证方式，而是把认证结果与策略解耦，特别适合移动办公与多园区。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm15-l03',
      moduleId: 'm15',
      title: 'SD-WAN 与 GRE、IPsec 广域互联',
      depth: '精通',
      minutes: 28,
      summary: 'SD-WAN 用 Underlay 建 Overlay，GRE、IPsec 封装加密。',
      objectives: [
        '说明 SD-WAN 控制器、CPE、Underlay 与 Overlay 的分工',
        '配置 GRE 隧道与 IPsec 保护，并验证 IKE 与 IPsec 安全联盟',
        '解释应用选路与 SLA 探测的判定逻辑与回切抑制',
      ],
      keywords: ['SD-WAN', 'GRE', 'IPsec', 'IKE', '应用选路', 'SLA 探测'],
      blocks: [
        {
          type: 'paragraph',
          text: '传统广域靠专线，开通慢、贵、分支一多就难管。SD-WAN 把网络分成两层：Underlay 是运营商提供的物理链路，可能是专线、宽带或 4G/5G；Overlay 是在上面用 GRE、IPsec 建起的逻辑隧道。控制器负责统一下发策略、监控链路质量，CPE 负责建隧道与转发，管理员只需描述「哪个应用走哪条链路、达到什么质量」，不必逐台写静态路由。',
        },
        {
          type: 'analogy',
          title: '快递公司的自建线路',
          text: 'Underlay 是城市公路网，谁都能走，但堵不堵不由你决定；Overlay 是快递公司在地图上规划的干线，从分拨中心到网点走哪条路、要不要绕开拥堵，由调度中心统一决定。控制器就是调度中心，CPE 是每个网点的站长。某条路时延升高，调度中心把包裹改走另一条，这就是应用选路。',
        },
        {
          type: 'table',
          title: 'GRE 与 IPsec 的分工',
          columns: ['维度', 'GRE', 'IPsec'],
          rows: [
            ['主要作用', '封装，把任意协议装进 IP 隧道', '加密与完整性保护'],
            ['封装开销', '通常 24 字节左右', 'ESP 头尾加 IV，约 50 到 70 字节'],
            ['能否承载组播', '可以，隧道口可跑组播与路由协议', '原生不支持，需要 GRE over IPsec'],
            ['典型组合', 'GRE over IPsec 同时要封装与加密', '单独使用适合纯 IP 点对点'],
          ],
        },
        {
          type: 'steps',
          title: 'IKE 与 ESP 的建立过程',
          items: [
            {
              title: 'IKE 第一阶段',
              text: '双方协商加密与认证算法、DH 组，建立 IKE SA，此后控制报文都在保护下传输。',
            },
            {
              title: '身份认证',
              text: '用预共享密钥或证书证明身份，确认对端不是冒名者。',
            },
            {
              title: 'IKE 第二阶段',
              text: '协商 IPsec 提议，建立一对单向的 IPsec SA，分别负责发送与接收方向。',
            },
            {
              title: 'ESP 转发',
              text: '数据按 SA 加密并计算完整性校验，封装成 ESP 后走 Underlay 送达对端。',
            },
          ],
        },
        {
          type: 'interactive',
          key: 'nat-ipsec',
          caption: '观察 NAT 设备如何改变源地址，以及 NAT-T 如何把 ESP 封装进 UDP 穿越',
        },
        {
          type: 'code',
          title: '配置 GRE 隧道并用 IPsec 保护',
          lang: 'vrp',
          code: `interface Tunnel0/0/1
 ip address 10.10.10.1 255.255.255.252
 tunnel-protocol gre
 source 202.1.1.1
 destination 203.1.1.1
quit
ike proposal 10
 encryption-algorithm aes-256
 authentication-algorithm sha2-256
 dh group14
quit
ike peer HQ v1
 pre-shared-key cipher Huawei@123
 ike-proposal 10
 remote-address 203.1.1.1
quit
ipsec proposal IPSEC
 esp authentication-algorithm sha2-256
 esp encryption-algorithm aes-256
quit
ipsec profile PROFILE
 ike-peer HQ
 proposal IPSEC
quit
interface Tunnel0/0/1
 ipsec profile PROFILE
quit`,
        },
        {
          type: 'output',
          title: '查看 IKE 与 IPsec 安全联盟',
          text: `<AR-Branch> display ike sa
Conn-ID  Peer            VPN   Flag(s)  Phase  Remote Type  Created Time
-------------------------------------------------------------------------------
8        203.1.1.1       1     RD|ST    v1:2   IP           2026-11-12 09:12:41

<AR-Branch> display ipsec sa
Interface: Tunnel0/0/1
  IPSec profile: PROFILE
  ESP authentication algorithm: SHA2-256
  ESP encryption algorithm: AES-256
  SPI: 3568432156 (inbound), 2147483648 (outbound)
  Remaining lifetime: 2870 s`,
        },
        {
          type: 'warning',
          title: 'MTU、NAT 与回程路由是三大坑',
          text: 'GRE 加 ESP 会让封装开销叠加到七八十字节，1500 的链路上大包必然分片或丢包，表现为「能 ping 通小包、网页打不开」。跨 NAT 时 ESP 没有端口，必须启用 NAT-T 把报文封进 UDP 4500，否则第一阶段成功、第二阶段起不来。多链路场景下还要保证回程路由与去程一致，否则防火墙会丢包。',
        },
        {
          type: 'tip',
          title: '选路要有探测、阈值与回切抑制',
          text: '应用选路不是简单地看链路 up 或 down，而是持续探测时延、丢包与抖动，超过阈值才切换，并在一段时间内保持稳定再切回，避免链路抖动导致路由来回翻。探测间隔过短会消耗设备性能，过长则反应迟钝。生产上先给关键应用定义清楚质量目标，再谈策略，否则只是把问题从「链路不通」变成「选路乱切」。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm15-l04',
      moduleId: 'm15',
      title: '智能运维：iMaster NCE-Campus、CampusInsight 与 NCE-IP',
      depth: '熟悉',
      minutes: 24,
      summary: 'NCE-Campus 管配置，CampusInsight 看体验，智能运维从救火变预判。',
      objectives: [
        '说明 NCE-Campus、CampusInsight 与 NCE-IP 各自的定位',
        '解释 Telemetry 相对 SNMP 轮询在体验分析上的优势',
        '描述 NetMaster 大模型在故障定位与变更中的使用边界',
      ],
      keywords: ['NCE-Campus', 'CampusInsight', 'Telemetry', 'NCE-IP', 'NetMaster'],
      blocks: [
        {
          type: 'paragraph',
          text: '运维的目标不是把设备点亮，而是让业务体验可度量、故障可预测。iMaster NCE-Campus 负责园区设备的纳管、配置模板下发、准入与业务随行策略，解决「配置一致性与批量交付」；CampusInsight 通过 Telemetry 高频采集网络与终端数据，用大数据分析接入成功率、时延、漫游与丢包，解决「体验好不好、问题在哪」；NCE-IP 面向骨干与数据中心，提供 SRv6 等网络的统一管控与数字地图。三者分工不同，但共享同一套数据底座。',
        },
        {
          type: 'analogy',
          title: '体检中心、智能手环与导航',
          text: 'NCE-Campus 像医院的信息系统，负责建档、开单与统一流程；CampusInsight 像智能手环，全天候记录心率与步数，异常时提醒你；NCE-IP 像导航软件，掌握整张路网并实时计算最优路径。三者都不替代医生，但能让医生不必靠猜，而是拿着数据做判断。',
        },
        {
          type: 'table',
          title: '三个平台的定位',
          columns: ['平台', '管理对象', '核心能力'],
          rows: [
            ['NCE-Campus', '园区交换机、AP、防火墙、终端准入', '设备纳管、模板配置、准入与策略随行'],
            ['CampusInsight', '园区网络与终端体验', 'Telemetry 采集、体验评分、根因建议'],
            ['NCE-IP', '骨干、数据中心与 SRv6 网络', '统一管控、路径可视、网络数字地图'],
          ],
        },
        {
          type: 'table',
          title: 'SNMP 轮询与 Telemetry 推送',
          columns: ['对比项', 'SNMP 轮询', 'Telemetry'],
          rows: [
            ['数据方向', '网管主动拉取', '设备主动推送'],
            ['采集周期', '分钟级，受设备性能限制', '秒级甚至亚秒级'],
            ['数据形态', 'MIB 标量，结构化程度低', 'YANG 模型编码，便于分析'],
            ['适用场景', '状态巡检与告警', '体验分析、趋势预测与快速定位'],
          ],
        },
        {
          type: 'steps',
          title: '一次体验类故障的闭环',
          items: [
            {
              title: '发现异常',
              text: 'CampusInsight 显示某楼层接入时延与丢包在 09:20 后持续升高，体验评分下降。',
            },
            {
              title: '关联定位',
              text: '按 AP、SSID、终端类型下钻，发现集中在同一台 AP，且该 AP 信道利用率接近饱和。',
            },
            {
              title: '验证原因',
              text: '对比同时段配置变更记录与射频邻居，确认是新增 AP 造成同频干扰与功率竞争。',
            },
            {
              title: '修复与复盘',
              text: '调整信道与功率，观察指标回落；把该场景沉淀为规则，下次自动告警而不是人工发现。',
            },
          ],
        },
        {
          type: 'code',
          title: '配置 Telemetry 订阅',
          lang: 'vrp',
          code: `telemetry
 sensor-group SENSOR1
  sensor-path huawei-diagnostic-tools:diagnostic-tools
 quit
 destination-group DEST1
  ipv4-address 10.1.100.10 port 10001 protocol grpc no-tls
 quit
 subscription SUB1
  sensor-group SENSOR1 sample-interval 10000
  destination-group DEST1
 quit
quit`,
        },
        {
          type: 'output',
          title: '查看 Telemetry 订阅状态',
          text: `<SW-Core1> display telemetry subscription
Subscription Name : SUB1
  Sensor Group    : SENSOR1
  Sample Interval : 10000 ms
  Destination     : DEST1
  State           : Active
  Last Report Time: 2026-11-12 10:21:35`,
        },
        {
          type: 'warning',
          title: '数据越多，越要先解决时钟与基线',
          text: '秒级采集意味着数据量成倍增长，采样路径与保留周期必须提前规划，否则分析平台先被存储压垮。所有设备必须用同一 NTP 源，否则跨设备数据无法按时间对齐，根因分析会把两个无关事件强行关联。大模型给出的建议只能作为线索，涉及业务变更的结论必须由人确认后再执行。',
        },
        {
          type: 'tip',
          title: '先有基线，才谈异常',
          text: 'CampusInsight 的体验评分只有在有历史基线时才有意义。新上线网络先稳定运行一到两周，让平台建立正常工作日的流量与体验曲线，再开启告警。否则每一次业务高峰都会被误判为故障，运维人员很快会对告警脱敏，工具就失去了价值。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
