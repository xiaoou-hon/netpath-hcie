import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm08',
  code: 'M08',
  title: 'WLAN 无线局域网',
  summary:
    '无线不是把网线换成天线。本模块从 802.11 家族、频段信道讲起，拆解 AP 经 CAPWAP 上线流程，再深入 AC 组网、终端接入、二层与三层漫游、射频调优与 WPA2/WPA3 安全，最后给出从射频到 DHCP 的分层排障方法。',
  stage: 'L2',
  order: 8,
  goals: [
    '说清 802.11a/b/g/n/ac/ax 的演进逻辑与 2.4G/5G/6G 频段的取舍',
    '独立完成 AP 上线、VAP 下发与 AC 旁挂或直连组网配置',
    '解释终端从扫描到关联、再到密钥协商的完整接入过程',
    '设计二层与三层漫游方案并配置射频调优参数',
    '按射频、CAPWAP、关联、认证、DHCP 的顺序定位无线故障',
  ],
  keywords: ['WLAN', '802.11', 'AP', 'AC', 'CAPWAP', 'SSID', 'VAP', '漫游', '射频调优', 'WPA3'],
  lessons: [
    {
      id: 'm08-l01',
      moduleId: 'm08',
      title: '无线是怎么变成以太网的：802.11 家族与频段信道',
      depth: '熟悉',
      minutes: 24,
      summary: '802.11 各代标准解决了什么问题，2.4G、5G、6G 频段与信道为什么决定了网速和稳定性。',
      objectives: [
        '按代际说出 802.11n/ac/ax 的关键技术与速率来源',
        '解释 2.4G 只有三个互不重叠信道的原因',
        '根据场景选择 20MHz、40MHz 或 80MHz 频宽',
        '在 AP 射频视图下完成信道与功率配置并验证',
      ],
      keywords: ['802.11ax', 'Wi-Fi 6', '频段', '信道', 'MIMO', 'OFDMA', '频宽'],
      blocks: [
        {
          type: 'paragraph',
          text: 'WLAN 的本质是把以太网帧（802.3）承载在无线电波（802.11）上：终端与 AP 之间走射频，AP 与交换机之间仍是标准的以太网。所以无线侧的速率、延迟和稳定性由三个因素共同决定——协议标准决定了调制方式和多天线能力，频段决定了能用的频谱宽度，信道规划决定了会不会自己干扰自己。',
        },
        {
          type: 'paragraph',
          text: '802.11 的每一次代际升级都在做同一件事：在同样的频谱里塞进更多有效比特。802.11n 引入 MIMO 与 40MHz 频宽，把速率从 54Mbps 拉到 600Mbps；802.11ac 只工作在 5G，靠更宽频宽、更高阶调制和 MU-MIMO 做到千兆级；802.11ax（Wi-Fi 6）引入 OFDMA 与 1024QAM，重点从「峰值速率」转向「高密并发下的每用户体验」。',
        },
        {
          type: 'analogy',
          title: '从单车道到物流分拣中心',
          text: '802.11n 像把单车道拓成双车道（40MHz），还允许一列车挂多节车厢（MIMO）；802.11ac 继续加宽车道并让多辆车同时出发（MU-MIMO）；802.11ax 干脆改成物流分拣中心，把一车货拆成小包裹按需分配（OFDMA），不再要求每个人都装满一整车才能发车。',
        },
        {
          type: 'table',
          title: '802.11 主要标准对照',
          columns: ['标准', '频段', '理论速率', '关键技术', '典型定位'],
          rows: [
            ['802.11b', '2.4G', '11Mbps', 'DSSS', '已淘汰'],
            ['802.11a', '5G', '54Mbps', 'OFDM', '早期 5G 设备'],
            ['802.11g', '2.4G', '54Mbps', 'OFDM', '与 11b 兼容共存'],
            ['802.11n', '2.4G/5G', '600Mbps', 'MIMO、40MHz、帧聚合', 'Wi-Fi 4，仍在大量使用'],
            ['802.11ac', '5G', '6.9Gbps', '80/160MHz、MU-MIMO、256QAM', 'Wi-Fi 5，主流办公'],
            ['802.11ax', '2.4G/5G/6G', '9.6Gbps', 'OFDMA、1024QAM、BSS Coloring', 'Wi-Fi 6/6E，高密场景'],
          ],
        },
        { type: 'heading', text: '频段与信道：无线最稀缺的资源', level: 2 },
        {
          type: 'paragraph',
          text: '2.4G 频段只有约 83MHz 可用，信道编号从 1 到 13，每个信道名义带宽 20MHz。由于相邻信道频谱重叠，真正能同时使用而不互相干扰的只有 1、6、11 三组。5G 频段可用信道多得多，且中国区常用 36 到 64、149 到 165，天然适合 40MHz 甚至 80MHz 组网。6G 频段（Wi-Fi 6E）频谱更宽，但需要终端支持，穿透也更弱。',
        },
        {
          type: 'table',
          title: '三个频段的取舍',
          columns: ['频段', '覆盖能力', '可用信道', '干扰情况', '建议用途'],
          rows: [
            ['2.4G', '强，穿墙好', '1/6/11 三个非重叠', '微波炉、蓝牙、邻居 AP 严重', '物联网、远距离低速终端'],
            ['5G', '中等', '信道丰富', '相对干净', '办公与家庭主力频段'],
            ['6G', '弱，穿透差', '频谱最宽', '几乎无干扰', '同房间高带宽、VR 与会议室'],
          ],
        },
        {
          type: 'code',
          title: '在 AP 组射频视图固定信道与功率',
          lang: 'vrp',
          code: `system-view
wlan
 ap-group name default
  radio 0
   channel 20mhz 6
   power 17
   quit
  radio 1
   channel 80mhz 36
   power auto
   quit
  quit
 quit`,
        },
        {
          type: 'output',
          title: 'display radio all 查看信道、功率与利用率',
          text: `<AC> display radio all
AP ID  Radio  Type  Channel/Bandwidth  Power(dBm)  Noise(dBm)  Util(%)
1      0      2.4G  6/20MHz            17          -92         23
1      1      5G    36/80MHz           20          -95         31
2      0      2.4G  11/20MHz           17          -93         18
2      1      5G    44/80MHz           20          -95         27`,
        },
        {
          type: 'warning',
          title: '频宽越宽，可用信道越少',
          text: '5G 用 80MHz 时，一段连续的 4 个 20MHz 信道会被绑成一个，原本能规划 8 个 AP 的区域只能规划 2 到 3 个互不重叠的频点，同频干扰反而更严重。高密办公区建议 40MHz，普通办公 80MHz，只有在终端少、带宽要求高的场景才上 160MHz。2.4G 永远只用 20MHz。',
        },
        {
          type: 'tip',
          title: '看干扰别看速率',
          text: '终端显示的协商速率只反映信号质量和 MCS，不能说明空口忙不忙。判断体验问题要看 display radio all 里的 Util 和 Noise：Util 长期高于 60% 说明信道拥挤，需要调信道或加 AP；Noise 高于 -85dBm 说明存在非 Wi-Fi 干扰源。两者都正常，才轮到怀疑上层网络。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm08-l02',
      moduleId: 'm08',
      title: 'AP 怎么被 AC 管起来：CAPWAP 与上线流程',
      depth: '精通',
      minutes: 32,
      summary: '一台空配置 AP 上电后如何找到 AC、建立两条隧道、拿到配置并进入正常工作状态。',
      objectives: [
        '说出 CAPWAP 控制隧道与数据隧道的端口和职责',
        '按顺序复述 AP 上线的六个阶段',
        '配置 AP 认证方式与 DHCP Option 43',
        '用 display ap all 与上线失败记录定位卡点',
      ],
      keywords: ['CAPWAP', '5246', '5247', 'AP 上线', 'Option 43', 'MAC 认证', 'DTLS'],
      blocks: [
        {
          type: 'paragraph',
          text: '瘦 AP 本身不保存业务配置，上电后只有出厂固件和一段引导逻辑。它必须先找到 AC（Access Controller，无线接入控制器），由 AC 下发 SSID、安全模板、射频参数，之后才能真正提供无线服务。AP 与 AC 之间的这套协议就是 CAPWAP（Control And Provisioning of Wireless Access Points）。',
        },
        {
          type: 'paragraph',
          text: 'CAPWAP 建立两条独立的隧道：控制隧道使用 UDP 5246，承载 AP 的加入请求、配置下发、状态上报和心跳；数据隧道使用 UDP 5247，承载终端真正的业务报文。两条隧道分开是刻意设计——控制报文量小但对可靠性敏感，业务报文量大且需要独立转发策略，混在一条隧道里会互相拖累。',
        },
        {
          type: 'analogy',
          title: '新员工入职',
          text: 'AP 像刚入职的员工：先办门禁卡（DHCP 拿地址），再问前台 HR 在哪（发现 AC），提交身份材料（Join 认证），HR 核对花名册（MAC 或 SN 白名单），最后开通邮箱和系统权限（配置下发）。任何一步卡住，人已经坐在工位上，却什么也干不了。',
        },
        {
          type: 'steps',
          title: 'AP 上线的六个阶段',
          items: [
            { title: '上电与获取地址', text: 'AP 通过 DHCP 获得管理 IP；没有 DHCP 时会使用缺省地址尝试。' },
            { title: '发现 AC', text: '通过 DHCP Option 43、AC 域名或广播寻找 AC 的控制地址。' },
            { title: '建立控制隧道', text: '向 AC 的 UDP 5246 发送 Discovery Request，AC 回应可用版本与能力。' },
            { title: 'Join 认证', text: 'AP 提交 MAC 与序列号，AC 按 ap auth-mode 决定是否允许加入。' },
            { title: '配置与版本同步', text: 'AC 下发 VAP、射频、安全模板；版本不一致时先升级 AP 固件。' },
            { title: '进入 Run 状态', text: '数据隧道建立，AP 开始发送 Beacon，终端可以扫描到 SSID。' },
          ],
        },
        {
          type: 'interactive',
          key: 'wlan-onboarding',
          caption: '逐步推进 AP 上线流程，观察每一步失败时 AP 会停在哪个状态。',
        },
        {
          type: 'table',
          title: '控制与数据两条隧道',
          columns: ['隧道', '协议与端口', '承载内容', '断开后的现象'],
          rows: [
            ['控制隧道', 'UDP 5246', 'Join、配置、心跳、告警、射频信息', 'AP 进入 Fault，业务中断'],
            ['数据隧道', 'UDP 5247', '终端业务报文（隧道转发模式）', 'AP 仍在线，但终端无法上网'],
            ['DTLS 加密', 'UDP 5246/5247', '为两条隧道加证书保护', '未启用时管理报文明文传输'],
          ],
        },
        {
          type: 'code',
          title: 'AC 侧：AP 认证与 DHCP Option 43',
          lang: 'vrp',
          code: `system-view
dhcp enable
ip pool ap-pool
 network 10.10.1.0 mask 255.255.255.0
 gateway-list 10.10.1.1
 option 43 sub-option 2 ip-address 10.10.1.1
 quit
wlan
 ap auth-mode mac-auth
 ap-id 1 ap-mac 00e0-fc12-3456
  ap-name ap-1f-01
  ap-group default
  quit
 quit`,
        },
        {
          type: 'output',
          title: 'display ap all 确认 AP 状态',
          text: `<AC> display ap all
Total AP quantity: 2   Normal: 2   Fault: 0
------------------------------------------------------------------
AP ID  AP Name   AP Type   AP MAC           IP Address    State
------------------------------------------------------------------
1      ap-1f-01  AP4050DN  00e0-fc12-3456   10.10.1.11    nor
2      ap-1f-02  AP4050DN  00e0-fc12-3457   10.10.1.12    nor
------------------------------------------------------------------
Note: nor 表示正常，fault 表示隧道异常，cfg 表示配置未完成`,
        },
        {
          type: 'warning',
          title: 'AP 与 AC 之间不能做 NAT',
          text: 'CAPWAP 的控制报文里携带 AP 自己的管理 IP，AC 用它回包并建立隧道。如果中间设备把 AP 的源地址做了 NAT，AC 会把回包发到转换后的地址，隧道建立失败，AP 一直停在 Discovery 或 Join 阶段。分支场景要么保证 AP 管理网段可路由到 AC，要么在 AC 侧使用 NAT 穿透方案，不能随手在出口做源 NAT。',
        },
        {
          type: 'tip',
          title: '上线失败先看失败记录',
          text: 'AP 一直不上线时，先在 AC 上执行 display ap online-fail-record all，它会直接给出失败原因码：认证失败、版本不匹配、隧道建立超时还是配置下发失败。比起抓包，这条命令通常三十秒内就能定位方向。再配合 display capwap configuration 确认 AC 的控制地址与端口是否正确。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm08-l03',
      moduleId: 'm08',
      title: 'AC 组网：旁挂还是直连，二层还是三层',
      depth: '熟悉',
      minutes: 28,
      summary: '四种典型 AC 组网方式如何取舍，隧道转发与直接转发又该在什么场景使用。',
      objectives: [
        '对比旁挂与直连、二层与三层组网的适用场景',
        '解释隧道转发与直接转发的路径差异',
        '完成 VAP 模板、业务 VLAN 与转发模式配置',
        '判断 AC 是否需要在业务 VLAN 上配置地址',
      ],
      keywords: ['旁挂', '直连', '二层组网', '三层组网', '隧道转发', '直接转发', 'VAP'],
      blocks: [
        {
          type: 'paragraph',
          text: 'AC 放在网络哪个位置，直接决定了业务流量的路径和管理流量的可达性。旁挂（off-path）是把 AC 挂在核心交换机旁边，业务流量仍走原有汇聚与核心，AC 只负责管理；直连（inline）是把 AC 串在业务路径上，所有无线流量都经过 AC。再叠加 AC 与 AP 是否在同一网段，就组合出旁挂二层、旁挂三层、直连二层、直连三层四种常见方案。',
        },
        {
          type: 'paragraph',
          text: '与组网方式正交的另一个维度是转发模式。隧道转发把终端报文封装进 CAPWAP 数据隧道送到 AC，由 AC 统一解封装再转发；直接转发让 AP 直接把终端报文打上业务 VLAN 标签送到接入交换机，AC 只留在管理面。前者集中控制、便于审计，后者路径更短、对 AC 压力更小。',
        },
        {
          type: 'analogy',
          title: '物业办公室放在哪里',
          text: '旁挂像物业办公室设在大楼旁边：住户进出走自己的门，物业只管发卡、贴通知；直连像把物业前台直接设在唯一入口，所有人必须经过它。隧道转发相当于所有快递先送到物业再分发，直接转发相当于快递员直接送到住户门口，物业只在系统里登记。',
        },
        {
          type: 'table',
          title: '四种组网方式对比',
          columns: ['方式', 'AP 与 AC 关系', '优点', '典型场景'],
          rows: [
            ['旁挂二层', '同一 VLAN，二层可达', '改造小，业务路径不变', '中小园区新建无线'],
            ['旁挂三层', '跨网段，路由可达', 'AC 位置灵活，可集中管理多园区', '总部统一管理分支 AP'],
            ['直连二层', 'AC 串接在业务路径', '流量集中，便于统一策略与审计', '对合规审计要求高的场景'],
            ['直连三层', 'AC 串接且跨网段', '集中转发 + 集中管理', '大型园区核心层部署'],
          ],
        },
        {
          type: 'table',
          title: '两种转发模式的差别',
          columns: ['对比项', '隧道转发', '直接转发'],
          rows: [
            ['业务路径', 'AP → CAPWAP 隧道 → AC → 网络', 'AP → 接入交换机 → 网络'],
            ['AC 是否需要业务网关', '需要业务 Vlanif 与地址', '不需要，业务网关在汇聚或核心'],
            ['AC 压力', '随终端数量线性增长', '只承担管理'],
            ['故障影响', 'AC 故障导致业务中断', 'AC 故障只影响管理与新上线'],
          ],
        },
        {
          type: 'code',
          title: 'VAP 模板：业务 VLAN、SSID 与安全模板绑定',
          lang: 'vrp',
          code: `system-view
vlan batch 10 100
interface Vlanif 100
 ip address 192.168.100.1 255.255.255.0
 quit
dhcp enable
ip pool corp
 network 192.168.100.0 mask 255.255.255.0
 gateway-list 192.168.100.1
 dns-list 114.114.114.114
 quit
wlan
 security-profile name sec-wpa2
  security wpa2 psk pass-phrase Huawei@123 aes
  quit
 ssid-profile name ssid-corp
  ssid Corp-WiFi
  quit
 vap-profile name vap-corp
  service-vlan vlan-id 100
  ssid-profile ssid-corp
  security-profile sec-wpa2
  forward-mode tunnel
  quit
 ap-group name default
  vap-profile vap-corp wlan 1 radio all
  quit
 quit`,
        },
        {
          type: 'code',
          title: '改为直接转发：AP 侧业务 VLAN 与交换机放行',
          lang: 'vrp',
          code: `wlan
 vap-profile name vap-corp
  forward-mode local
  quit
 quit
interface GigabitEthernet0/0/1
 port link-type trunk
 port trunk allow-pass vlan 10 100
 port trunk pvid vlan 10
 quit`,
        },
        {
          type: 'output',
          title: 'display vap ssid 确认下发结果',
          text: `<AC> display vap ssid Corp-WiFi
WID  AP ID  AP Name   Radio  SSID       Service VLAN  Forward Mode  Security
1    1      ap-1f-01  0      Corp-WiFi  100          tunnel        wpa2-psk
1    1      ap-1f-01  1      Corp-WiFi  100          tunnel        wpa2-psk
2    2      ap-1f-02  0      Corp-WiFi  100          tunnel        wpa2-psk
2    2      ap-1f-02  1      Corp-WiFi  100          tunnel        wpa2-psk`,
        },
        {
          type: 'warning',
          title: '直接转发最容易漏的是业务 VLAN 透传',
          text: '选直接转发后，终端报文从 AP 上联口带 VLAN 100 标签发出。如果接入交换机的 trunk 没有放行 VLAN 100，或者 AP 管理口没有把业务 VLAN 加入允许列表，现象是终端能连上 SSID、也能拿到地址，却 ping 不通网关。隧道转发不存在这个问题，因为报文被封装进 CAPWAP 后才发出，这也是它更适合跨三层部署的原因。',
        },
        {
          type: 'tip',
          title: '管理 VLAN 与业务 VLAN 必须分开',
          text: '让 AP 管理地址和终端业务地址处于同一 VLAN，会把终端广播域直接暴露给 AP，也放大了广播风暴的影响面。规范做法是管理 VLAN 用独立网段，业务 VLAN 按部门划分，AP 上联口配置 pvid 为管理 VLAN、trunk 放行全部业务 VLAN。选型时先定转发模式，再规划 VLAN，能少改一轮配置。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm08-l04',
      moduleId: 'm08',
      title: '一次接入的四个动作：扫描、认证、关联与密钥协商',
      depth: '精通',
      minutes: 30,
      summary: '终端从看到 SSID 到发出第一个数据包，中间到底交换了哪些 802.11 帧。',
      objectives: [
        '区分被动扫描与主动扫描的帧交互过程',
        '说明链路认证、关联、四次握手的先后顺序',
        '读懂 display station all 中判定终端体验的关键字段',
        '根据终端所处阶段判断故障位置',
      ],
      keywords: ['Beacon', 'Probe', '关联', '四次握手', 'RSSI', 'SNR', '802.11 帧'],
      blocks: [
        {
          type: 'paragraph',
          text: '终端连上 Wi-Fi 并不是一个动作，而是一串状态迁移：先发现网络，再通过链路认证获得「可以交谈」的资格，然后关联到某个 AP 并确定能力集，最后在 WPA2 或 WPA3 下完成密钥协商，才允许收发业务数据。这四步中任何一步失败，用户在界面上看到的都是同一句「无法连接」，但根因完全不同。',
        },
        {
          type: 'paragraph',
          text: '发现阶段有两种方式。被动扫描是 AP 每 100ms 左右发一个 Beacon 帧，里面写着 SSID、支持的速率、加密方式和 BSSID，终端只要听就行；主动扫描是终端在每个信道上发 Probe Request，AP 用 Probe Response 回应。主动扫描更快，但会占用空口并暴露终端位置，所以很多终端在休眠唤醒时才主动扫，平时靠 Beacon 缓存。',
        },
        {
          type: 'analogy',
          title: '在商场里找一家店',
          text: 'Beacon 是每家店挂在门口的招牌，路过就能看见；Probe 是你主动问服务台「有没有卖咖啡的」；认证是出示会员卡证明你有资格进店；关联是登记座位号，让服务员知道把菜端到哪；四次握手则是当面核对暗号，确认双方都有正确的钥匙，之后才真正开始上菜。',
        },
        {
          type: 'table',
          title: '接入过程的关键帧',
          columns: ['阶段', '帧类型', '方向', '作用'],
          rows: [
            ['发现', 'Beacon', 'AP → 终端', '周期广播 SSID、BSSID、能力与加密套件'],
            ['发现', 'Probe Request/Response', '终端 ↔ AP', '终端主动询问，AP 定向回应'],
            ['链路认证', 'Authentication', '终端 ↔ AP', '开放系统或共享密钥，现代网络基本用开放认证'],
            ['关联', 'Association Request/Response', '终端 ↔ AP', '协商速率、QoS、HT/VHT/HE 能力，分配 AID'],
            ['密钥协商', 'EAPOL 四次握手', '终端 ↔ AP/AC', '用 PSK 或 802.1X 派生出的主密钥生成会话密钥'],
          ],
        },
        {
          type: 'steps',
          title: 'WPA2-PSK 接入的完整时序',
          items: [
            { title: '扫描', text: '终端收到 Beacon 或主动 Probe，获得 SSID 与加密方式，决定发起连接。' },
            { title: '链路认证', text: '发送 Authentication 请求，AP 回成功，此时双方只是「可以对话」。' },
            { title: '关联', text: 'Association 请求携带能力集，AP 接受后终端正式成为该 BSS 的成员。' },
            { title: '四次握手', text: 'AP 发 ANonce，终端回 SNonce 与 MIC，双方各自算出 PTK，再交换 GTK。' },
            { title: 'DHCP 与网关', text: '终端通过业务 VLAN 获取地址，之后才具备三层通信能力。' },
          ],
        },
        {
          type: 'code',
          title: '查看单个终端的关联与认证详情',
          lang: 'vrp',
          code: `system-view
wlan
 ap-group name default
  radio 0
   channel 20mhz 6
   power auto
   quit
  quit
 quit
display station all`,
        },
        {
          type: 'output',
          title: 'display station all 关键字段',
          text: `<AC> display station all
Total stations: 1
MAC Address        IP Address      SSID       AP Name   Radio  RSSI(dBm)  SNR(dB)  Rate(Mbps)  Online Time
00e0-fc-aa-bb-01   192.168.100.21  Corp-WiFi  ap-1f-01  1      -58        38       866         00:12:31`,
        },
        {
          type: 'table',
          title: '四个阶段失败时的典型现象',
          columns: ['失败阶段', '用户现象', 'AC 上的线索'],
          rows: [
            ['发现', '搜不到 SSID', 'display vap ssid 无该 SSID，或 AP 射频被关闭'],
            ['关联', '搜到但连不上，反复重试', 'display station all 无条目，或频繁上下线'],
            ['密钥协商', '提示密码错误或一直转圈', '有 station 条目但 IP 为空，四次握手失败计数增长'],
            ['DHCP', '已连接但无网络', 'station 显示 IP 为 0.0.0.0 或 169.254 开头'],
          ],
        },
        {
          type: 'warning',
          title: '「已连接，无法访问互联网」多半不是无线问题',
          text: '手机显示已连接但打不开网页时，先看终端是否拿到了业务网段地址。如果 station 表里 IP 正常，问题通常在 DHCP 之外的网关、DNS 或安全策略；如果 IP 为 0.0.0.0，才回到 DHCP 与业务 VLAN 检查。把「关联成功」等同于「网络可用」是最常见的误判，会让排错在无线侧空转。',
        },
        {
          type: 'tip',
          title: 'RSSI 与 SNR 要一起看',
          text: 'RSSI 是接收信号强度，反映离 AP 多远；SNR 是信号与噪声的比值，反映信号有多「干净」。RSSI 负值越小越好，-60dBm 以内体验良好；SNR 低于 20dB 时即使 RSSI 不错，也会因重传导致速率骤降。display station all 中两者都偏低，说明覆盖不足；只有 SNR 低，说明存在干扰源。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm08-l05',
      moduleId: 'm08',
      title: '漫游：二层、三层与 802.11r 快速切换',
      depth: '精通',
      minutes: 32,
      summary: '终端从一台 AP 走到另一台 AP 时，地址、会话和密钥如何保持不断。',
      objectives: [
        '区分二层漫游与三层漫游的判定条件和数据路径',
        '说明 802.11k、802.11v、802.11r 各自解决什么问题',
        '配置 AC 间漫游组与快速漫游开关',
        '判断漫游粘滞与乒乓漫游的成因',
      ],
      keywords: ['漫游', '二层漫游', '三层漫游', '802.11r', '802.11k', '802.11v', 'mobility-group'],
      blocks: [
        {
          type: 'paragraph',
          text: '漫游是终端主动发起的行为：当它发现当前 AP 的信号变弱、邻居 AP 更强时，会断开旧关联并在新 AP 上重新关联。对上层业务来说，最理想的情况是 IP 地址不变、TCP 连接不断、认证状态延续。是否做得到，取决于新旧 AP 是否在同一网段、是否由同一 AC 管理、以及是否启用了快速漫游。',
        },
        {
          type: 'paragraph',
          text: '二层漫游指新旧 AP 属于同一 VLAN，终端 IP 不变，网关也不变，切换只发生在无线侧，业务几乎无感。三层漫游指新旧 AP 分属不同 VLAN 或不同 AC，终端若重新 DHCP 就会换地址，已有连接必然中断；为此需要 AC 间建立漫游隧道，把终端的原地址与流量「引回」原网关，这就是 home AC 与 foreign AC 的概念。',
        },
        {
          type: 'analogy',
          title: '换教室与跨校区',
          text: '二层漫游像在同一栋楼里换教室，学号不变、课表不变，走进去坐下就行。三层漫游像转校区，学籍还在原校区，新校区只是借你一间教室，成绩单和档案仍要回原校区盖章。802.11r 则相当于提前把门禁权限同步到新教室，不用每次重新验证身份。',
        },
        {
          type: 'table',
          title: '三种漫游优化协议',
          columns: ['协议', '全称', '解决的问题', '效果'],
          rows: [
            ['802.11k', 'Radio Resource Measurement', '终端不知道邻居 AP 是谁，只能全信道盲扫', 'AC 下发邻居报告，缩短扫描时间'],
            ['802.11v', 'BSS Transition Management', '终端明明有更好的 AP 却赖着不走', 'AC 建议终端切换到指定 BSS'],
            ['802.11r', 'Fast BSS Transition', '每次重关联都要重新做完整认证', '预先派生密钥，切换时只需一次快速交互'],
          ],
        },
        {
          type: 'code',
          title: 'AC 间漫游组与快速漫游配置',
          lang: 'vrp',
          code: `system-view
wlan
 mobility-group name mg-campus
  member ip-address 10.10.1.1
  member ip-address 10.10.2.1
  quit
 ssid-profile name ssid-corp
  ssid Corp-WiFi
  dot11r enable
  quit
 rrm-profile name rrm-roam
  smart-roam enable
  smart-roam check-rssi
  quit
 ap-group name default
  rrm-profile rrm-roam
  vap-profile vap-corp wlan 1 radio all
  quit
 quit`,
        },
        {
          type: 'output',
          title: 'display station roam-record 查看漫游轨迹',
          text: `<AC> display station roam-record
MAC: 00e0-fc-aa-bb-01
  Online time: 00:42:18   Roam count: 2
  Time                 From AP     To AP     Type      Result
  2026-11-12 09:12:44  ap-1f-01    ap-1f-02  2-layer   success
  2026-11-12 09:26:10  ap-1f-02    ap-2f-01  2-layer   success`,
        },
        {
          type: 'warning',
          title: '三层漫游必须两端 AC 都配置且模板一致',
          text: '三层漫游依赖 AC 之间的隧道与原网关保持，若只在一端配置漫游组，或两端的 SSID、安全模板、业务 VLAN 不一致，终端切过去后会重新 DHCP、地址改变，表现为「走两步微信就断线重连」。跨厂商 AC 通常无法支持这种隧道，选型时要提前确认，不要指望标准 802.11 帧能解决。',
        },
        {
          type: 'tip',
          title: '漫游粘滞与乒乓都调阈值',
          text: '终端赖在弱信号 AP 上不走叫漫游粘滞，通常在 RSSI 低于 -70dBm 时由 AC 主动引导；在两个 AP 之间来回横跳叫乒乓漫游，说明两个 AP 覆盖重叠过多或功率过高。前者调 smart-roam 的触发阈值，后者降功率或调整信道规划。阈值不要设得太激进，否则正常走动也会被频繁切换。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm08-l06',
      moduleId: 'm08',
      title: '射频调优：信道、功率与频宽的三方平衡',
      depth: '精通',
      minutes: 30,
      summary: '覆盖、容量与干扰互相牵制，射频调优就是在这三者之间找到可接受的平衡点。',
      objectives: [
        '解释同频干扰与邻频干扰的成因和区别',
        '根据场景选择频率规划与功率设置策略',
        '配置 RRM 自动调优并执行一次校准',
        '用利用率与噪声数据判断是否需要加 AP',
      ],
      keywords: ['射频调优', '同频干扰', '邻频干扰', 'DCA', 'TPC', 'RRM', '蜂窝式部署'],
      blocks: [
        {
          type: 'paragraph',
          text: '无线空口是共享介质，同一时刻同一信道只能有一个设备在发。如果两个相邻 AP 用了同一个信道，它们会互相退避等待，把对方的通话时间吃掉，这叫同频干扰；如果信道号只差 1 到 4，频谱边缘仍会重叠，能量泄漏进来形成邻频干扰，表现是噪声底抬升、速率下降。射频调优要做的，就是用信道错开、功率收敛和频宽选择把这两类干扰压下去。',
        },
        {
          type: 'paragraph',
          text: '功率与覆盖是一对矛盾：功率越大覆盖越远，但 AP 的「嗓门」大了，会盖住远处 AP 的信号，同时让远端终端虽然听得到 AP、却因自身发射功率小而上行不通，形成「假覆盖」。所以调优的方向不是把功率开到最大，而是让相邻 AP 的覆盖边界清晰、重叠区域适中，通常保持在 -65dBm 到 -70dBm 的交叠带最理想。',
        },
        {
          type: 'analogy',
          title: '调音台与车道',
          text: '功率像麦克风音量，开得太大，隔壁房间的人也能听见你说话，但你自己也被隔壁的歌声盖住；信道像车道，同一条车道上挤两辆车必然互相让行，相邻车道如果没画好线也会蹭到；频宽像把两车道并成一车道，跑得快但可并行的车少了。调优就是在一场永远无法全赢的谈判里找一个能接受的方案。',
        },
        {
          type: 'table',
          title: '典型场景的射频参数建议',
          columns: ['场景', '2.4G 信道', '5G 信道', '5G 频宽', '功率策略'],
          rows: [
            ['普通办公', '1/6/11 蜂窝', '36/44/52 交替', '40MHz', '自动，限制最大 20dBm'],
            ['高密会议室', '仅保留 1/6/11', '36/44/52/60', '40MHz', '手动压低，减少重叠'],
            ['仓储与厂区', '1/6/11，优先 2.4G', '少量', '20/40MHz', '偏大，保证覆盖'],
            ['体育馆看台', '关闭或最小化', '多信道分组', '20MHz', '定向天线 + 低功率'],
          ],
        },
        {
          type: 'paragraph',
          text: '华为 AC 的 RRM（Radio Resource Management）提供两类自动能力：DCA 动态信道分配，周期性扫描各信道干扰并重新分配；TPC 动态功率调整，根据邻居与终端信号调整发射功率。自动调优适合大多数项目，但它需要稳定的基线数据，刚上线或拓扑大改时反而应先手动规划一轮，再交给算法微调。',
        },
        {
          type: 'code',
          title: '启用 RRM 自动调优并绑定到 AP 组',
          lang: 'vrp',
          code: `system-view
wlan
 rrm-profile name rrm-auto
  calibrate auto-channel-select enable
  calibrate auto-tx-power enable
  calibrate interval 1440
  quit
 ap-group name default
  rrm-profile rrm-auto
  radio 0
   channel 20mhz 1
   power auto
   quit
  radio 1
   channel 40mhz 36
   power auto
   quit
  quit
 calibrate enable
 quit`,
        },
        {
          type: 'output',
          title: 'display radio all 评估调优效果',
          text: `<AC> display radio all
AP ID  Radio  Type  Channel/Bandwidth  Power(dBm)  Noise(dBm)  Util(%)
1      0      2.4G  1/20MHz            15          -91         19
1      1      5G    36/40MHz           17          -94         22
2      0      2.4G  6/20MHz            15          -92         21
2      1      5G    44/40MHz           17          -95         20
3      0      2.4G  11/20MHz           15          -93         17
3      1      5G    52/40MHz           17          -95         25`,
        },
        {
          type: 'warning',
          title: '自动调优不是一键无忧',
          text: '自动信道分配在 AP 数量少、邻居干扰源不稳定时容易反复切换，造成终端短暂断流。更隐蔽的问题是：自动功率可能把 AP 功率压得过低，表面利用率下降了，实际边缘覆盖出现空洞。开启自动调优后必须连续观察至少一周的 display radio all，确认信道没有频繁变化、边缘区域 RSSI 仍达标，再用 display station all 抽查终端体验。',
        },
        {
          type: 'tip',
          title: '先算 AP 数，再谈调优',
          text: '调优只能在既定 AP 数量下改善，不能凭空扩容。规划时按每 AP 并发 20 到 30 个终端、每终端 2 到 4Mbps 有效带宽估算，再留 30% 余量。若 display radio all 中多个 AP 的 Util 长期高于 60%，说明容量已经见底，此时再调信道只是把拥堵从一条路挪到另一条路，正确动作是增加 AP 或引导终端上 5G。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm08-l07',
      moduleId: 'm08',
      title: 'WLAN 安全与分层排障',
      depth: '精通',
      minutes: 34,
      summary: 'WPA2、WPA3、802.1X 与 Portal 各守什么场景，以及无线故障的分层排查顺序。',
      objectives: [
        '对比 PSK、802.1X、Portal 三种认证方式的强度与适用场景',
        '配置 WPA2-PSK 与 WPA3-SAE 安全模板并说明升级代价',
        '按射频、CAPWAP、关联、认证、DHCP 五层定位故障',
        '识别改配置导致终端集体掉线的风险点',
      ],
      keywords: ['WPA2', 'WPA3', 'SAE', '802.1X', 'Portal', 'PSK', '排障'],
      blocks: [
        {
          type: 'paragraph',
          text: '无线信号在空气中传播，任何人在覆盖范围内都能收到帧，因此加密不是可选项而是前提。WEP 早已被证明可被轻易破解，必须淘汰；WPA2 使用 AES-CCMP，至今仍是主力；WPA3 引入 SAE 替代 PSK 的四次握手，抵抗离线字典攻击，并支持 192 位安全套件用于高敏感场景。认证方式则决定了「谁有资格拿到密钥」。',
        },
        {
          type: 'paragraph',
          text: 'PSK 是所有人共享一个预共享密钥，部署简单但一人泄露等于全网泄露，且密钥轮换成本高，适合家庭与小型办公。802.1X 让每个用户用自己的账号通过 RADIUS 认证，可实现一人一密、按人授权与审计，是政企办公的标准做法。Portal 认证在终端拿到地址后才弹出页面，适合访客、酒店与打印机等不支持 802.1X 的设备。',
        },
        {
          type: 'analogy',
          title: '三种门禁',
          text: 'PSK 像小区大门的公共密码，谁知道了都能进，改了密码要通知所有人；802.1X 像一人一张门禁卡，丢了只停用那一张，进出都有记录；Portal 像访客登记，先放进大厅，扫码填手机号后才开内部门禁。安全性依次递增，但对终端和运维的要求也依次递增。',
        },
        {
          type: 'table',
          title: '三种认证方式对比',
          columns: ['方式', '凭证', '安全性', '运维成本', '典型场景'],
          rows: [
            ['WPA2-PSK', '共享口令', '中，口令泄露即失守', '低，改密码需全网通知', '家庭、小型门店'],
            ['WPA2/WPA3-802.1X', '每人账号 + 证书', '高，可按人审计与吊销', '高，需 RADIUS 与账号体系', '企业办公、政务'],
            ['Portal', '手机号或账号', '中，依赖页面认证与限时', '中，需 Portal 服务器', '访客、酒店、医院'],
          ],
        },
        {
          type: 'code',
          title: 'WPA2-PSK 与 WPA3-SAE 安全模板',
          lang: 'vrp',
          code: `system-view
wlan
 security-profile name sec-wpa2
  security wpa2 psk pass-phrase Huawei@123 aes
  quit
 security-profile name sec-wpa3
  security wpa3 sae pass-phrase Huawei@123
  quit
 vap-profile name vap-corp
  service-vlan vlan-id 100
  ssid-profile ssid-corp
  security-profile sec-wpa2
  quit
 vap-profile name vap-guest
  service-vlan vlan-id 200
  ssid-profile ssid-guest
  security-profile sec-portal
  quit
 ap-group name default
  vap-profile vap-corp wlan 1 radio all
  vap-profile vap-guest wlan 2 radio all
  quit
 quit`,
        },
        {
          type: 'output',
          title: 'display station all 与失败记录',
          text: `<AC> display station all
MAC Address        IP Address      SSID       AP Name   RSSI(dBm)  Auth  Online Time
00e0-fc-aa-bb-01   192.168.100.21  Corp-WiFi  ap-1f-01  -58        wpa2  00:12:31
00e0-fc-aa-bb-09   192.168.200.33  Guest-WiFi ap-1f-02  -67        portal 00:03:02

<AC> display ap online-fail-record all
AP MAC            AP Name   Fail Reason               Last Time
00e0-fc12-3460    ap-2f-03  Authentication failed      2026-11-12 08:41:22
00e0-fc12-3461    ap-2f-04  Tunnel establishment timeout 2026-11-12 08:44:05`,
        },
        {
          type: 'steps',
          title: '无线故障五层排查法',
          items: [
            { title: '射频层', text: 'display radio all 看信道、功率、噪声与利用率，确认 AP 射频未被关闭。' },
            { title: 'CAPWAP 层', text: 'display ap all 看 AP 是否 nor，异常时查 online-fail-record 与隧道端口。' },
            { title: '关联层', text: 'display station all 是否有条目，没有则问题在扫描、认证或关联。' },
            { title: '认证层', text: '有条目但 IP 为空，查 PSK、802.1X 与 RADIUS 日志。' },
            { title: '网络层', text: '有地址但不通，查业务 VLAN、DHCP、网关与安全策略。' },
          ],
        },
        {
          type: 'table',
          title: '高频故障与处置',
          columns: ['现象', '常见原因', '处置动作'],
          rows: [
            ['AP 不上线', 'Option 43 缺失、AC 不可达、MAC 未加入白名单', '查 DHCP 配置与 display ap online-fail-record'],
            ['搜不到 SSID', 'VAP 未绑定 AP 组、射频被关闭、国家码限制', 'display vap ssid 与 ap-group 绑定关系'],
            ['密码正确却连不上', '安全模板与终端能力不匹配、WPA3 兼容问题', '临时降到 WPA2 验证，再逐步升级'],
            ['连上无地址', '业务 VLAN 未透传、DHCP 中继缺失', '查 trunk 放行与 Vlanif 地址池'],
            ['走动就掉线', '未配漫游组或 RSSI 阈值不合理', '查 roam-record 与 smart-roam 参数'],
          ],
        },
        {
          type: 'warning',
          title: '改安全模板等于让在线终端集体下线',
          text: '修改 security-profile 中的加密方式或口令后，AC 会重新下发配置，已关联的终端需要重新握手，表现是全员同时掉线并自动重连。生产环境必须在维护窗口操作，并提前通知；如果只是新增一个 SSID，正确做法是新建 security-profile 与 vap-profile，而不是改现有模板，避免影响存量业务。',
        },
        {
          type: 'tip',
          title: '先分层再动手，别急着改配置',
          text: '无线排错最忌讳一上来就调功率、换信道或重启 AP。先用 display ap all 和 display station all 把问题钉在某一层，再针对该层取证：射频看 radio，隧道看 capwap，认证看 station 与 RADIUS 日志。固定顺序不仅能快速定位，也能避免为了修一个问题引入三个新问题。',
        },
        {
          type: 'checklist',
          title: '无线故障交接清单',
          items: [
            '故障范围：单终端、单 AP、单楼层还是全园区',
            'AP 状态与上线失败记录',
            '受影响终端的 MAC、SSID、RSSI 与获取到的地址',
            '近期变更：安全模板、VLAN、DHCP、AC 版本',
            '射频数据：信道、功率、噪声与利用率',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
