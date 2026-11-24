import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm10',
  code: 'M10',
  title: '网络自动化与数据中心',
  summary:
    '从 SDN 三层架构与 iMaster NCE 讲起，掌握 NETCONF、YANG、OpenConfig 与 Telemetry 的自动化手段，再深入 VXLAN、BGP EVPN 与 Spine-Leaf 组网，最后眺望云网一体与 SRv6。',
  stage: 'L3',
  order: 10,
  goals: [
    '能画出 SDN 管理面、控制面、转发面的分工，并说明 iMaster NCE 的南向与北向职责',
    '能用 NETCONF 与 YANG 模型完成一次设备配置下发，并用回读结果校验',
    '能配置 Telemetry 订阅，读懂 gRPC 推送的 JSON 数据并定位接口异常',
    '能解释 VXLAN 封装、BGP EVPN Type-2 与 Type-3 路由以及分布式网关的工作机制',
    '能描述 Spine-Leaf 组网原则与 SRv6 在云网一体化中的位置',
  ],
  keywords: [
    'SDN',
    'iMaster NCE',
    'NETCONF',
    'YANG',
    'OpenConfig',
    'RESTful',
    'Telemetry',
    'VXLAN',
    'BGP EVPN',
    'Spine-Leaf',
  ],
  lessons: [
    {
      id: 'm10-l01',
      moduleId: 'm10',
      title: 'SDN 与 iMaster NCE：管理、控制、转发三层',
      depth: '熟悉',
      minutes: 26,
      summary: '理解 SDN 的三层架构与 iMaster NCE 的定位，完成设备纳管前的基础配置。',
      objectives: [
        '说清管理面、控制面、转发面各自的职责与典型组件',
        '区分传统分布式控制与 SDN 集中式控制的差异',
        '在华为设备上开启 NETCONF 与 SSH 管理通道并验证监听状态',
      ],
      keywords: ['SDN', 'iMaster NCE', '管理面', '控制面', '转发面', 'NETCONF'],
      blocks: [
        {
          type: 'paragraph',
          text: 'SDN（Software Defined Networking，软件定义网络）不是某一种协议，而是一种把网络「想」和「做」拆开的设计思想。传统设备每台都自己算路由、自己维护邻居，设备之间只交换结果；SDN 把决策权收拢到控制器，设备退化为高效的执行者。落到架构上就是三个平面：管理面负责业务意图与编排，控制面负责计算路径与生成配置，转发面负责按表转发。三者之间靠标准化接口衔接，这正是自动化的前提。',
        },
        {
          type: 'heading',
          text: '三个平面各自在做什么',
          level: 3,
        },
        {
          type: 'paragraph',
          text: '管理面是人与网络的翻译层，iMaster NCE 就属于这一层，它把「给研发部开一个隔离的虚拟网络」翻译成一组设备配置，再通过南向接口下发。控制面在部分场景由控制器承担，例如数据中心里由 NCE 计算 EVPN 的隧道与网关策略；在另一些场景仍由设备上的 BGP、OSPF 分布式计算，控制器只做编排。转发面则是交换芯片与转发表，追求的是线速与低时延，不参与复杂决策。',
        },
        {
          type: 'analogy',
          title: '从各自为政的路口到统一指挥的交通中心',
          text: '传统网络像每个路口都站着一位交警，各自根据眼前车流决定放行方向，局部最优但全局可能拥堵。SDN 像把所有路口的信号灯接入指挥中心：中心看得到全城车流，统一计算配时，再把指令下发到每个路口。路口本身不需要理解全城路况，只要可靠执行信号即可。指挥中心与路口之间的那条通信线路，就是南向接口。',
        },
        {
          type: 'table',
          title: 'SDN 三层架构对照',
          columns: ['平面', '核心职责', '典型组件', '常见接口'],
          rows: [
            ['管理面', '业务意图、租户与策略编排、可视化运维', 'iMaster NCE、云平台', '北向 RESTful、GUI'],
            ['控制面', '拓扑计算、路径与隧道决策、配置生成', 'NCE 控制器、设备 BGP/OSPF 进程', '南向 NETCONF、Telemetry'],
            ['转发面', '查表转发、ACL 与 QoS 执行、计数采集', '交换机、路由器、VTEP', '芯片表项、OpenFlow 流表'],
          ],
        },
        {
          type: 'steps',
          items: [
            {
              title: '第一步：规划管理网络',
              text: '为设备管理口或管理 VLAN 分配独立网段，保证控制器到设备三层可达，且管理流量与业务流量隔离。',
            },
            {
              title: '第二步：打通管理通道',
              text: '开启 SSH 与 NETCONF 服务，创建具备足够权限的本地用户，并在 VTY 上只允许 SSH 接入。',
            },
            {
              title: '第三步：统一时间与证书',
              text: '配置 NTP 同步，保证控制器与设备时间一致；正式环境启用证书认证，避免明文口令。',
            },
            {
              title: '第四步：控制器纳管',
              text: '在 iMaster NCE 中添加设备地址、协议与凭据，纳管成功后用 Telemetry 或 SNMP 校验收集状态。',
            },
          ],
        },
        {
          type: 'code',
          title: '交换机：开启 NETCONF 与 SSH 管理通道',
          lang: 'vrp',
          code: `system-view
sysname DC-Leaf1
#
interface Vlanif 100
 ip address 10.10.100.2 255.255.255.0
#
snetconf server enable
#
aaa
 local-user netadmin password irreversible-cipher Netpath@2026
 local-user netadmin privilege level 15
 local-user netadmin service-type ssh
#
user-interface vty 0 4
 authentication-mode aaa
 protocol inbound ssh
#
stelnet server enable`,
        },
        {
          type: 'output',
          title: '验证：display tcp status',
          text: `[DC-Leaf1] display tcp status
Cid        Local Addr:port        Foreign Addr:port     State
0          0.0.0.0:830            0.0.0.0:0             LISTEN
7          10.10.100.2:830        10.10.100.10:51234    ESTABLISHED
9          0.0.0.0:22             0.0.0.0:0             LISTEN`,
        },
        {
          type: 'list',
          title: '从回显里读出三件事',
          items: [
            '830 端口处于 LISTEN，说明 NETCONF over SSH 已在监听，控制器可以发起连接',
            '存在 ESTABLISHED 会话，说明控制器已实际连上设备，纳管链路是通的',
            '22 端口用于人工 SSH 运维，与 830 分开管理，排障时不要混为一谈',
          ],
        },
        {
          type: 'warning',
          title: '管理面不要和业务面混在一起',
          text: '把管理地址配在业务 VLAN 里、或让管理网段可被公网访问，是自动化项目最常见的安全隐患。管理网络应独立组网并限制源地址，控制器只开放必要的南向端口。另外，本地用户权限给到 15 级相当于把设备完全交出去，生产环境应使用控制器下发的动态凭据并定期轮换。',
        },
        {
          type: 'tip',
          title: '纳管前先做三件事',
          text: '时间同步、地址可达、凭据可用。这三项没确认就反复点「重新纳管」，只会在控制器日志里堆满超时记录。先用 ping 与 display tcp status 从设备侧确认，再看 NCE 侧的设备连接状态，定位会快很多。',
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm10-l02',
      moduleId: 'm10',
      title: 'NETCONF、YANG 与 OpenConfig：自动化的语言',
      depth: '熟悉',
      minutes: 30,
      summary: '掌握 NETCONF 四层模型与 YANG 建模，能用 XML 与 JSON 完成配置下发。',
      objectives: [
        '说出 NETCONF 的传输、消息、操作、内容四层分别解决什么问题',
        '解释 YANG 与 OpenConfig 的关系，区分厂商原生模型与标准模型',
        '用 edit-config 下发一个接口配置，并用 get-config 回读校验',
      ],
      keywords: ['NETCONF', 'YANG', 'OpenConfig', 'edit-config', 'get-config', 'RPC'],
      blocks: [
        {
          type: 'paragraph',
          text: 'NETCONF 是 IETF 定义的网络配置协议，目标是取代「登录设备敲命令」这种不可编程的方式。它跑在 SSH 之上，用 XML 表达请求与应答，把配置动作抽象成一组标准 RPC：get、get-config、edit-config、copy-config、delete-config、lock、unlock、commit。设备不再关心你从哪里登录，只关心收到的 RPC 是否合法、是否符合模型。',
        },
        {
          type: 'heading',
          text: '四层结构：从连线到内容',
          level: 3,
        },
        {
          type: 'paragraph',
          text: '传输层用 SSH 提供加密与认证，默认端口 830，与人工运维的 22 端口分开。消息层定义 RPC 与 rpc-reply 的信封格式，并支持分块传输大配置。操作层是前面那组标准动作，决定「要做什么」。内容层则由 YANG 模型约束，决定「数据长什么样、哪些字段必填、取值范围是多少」。四层缺一不可：只懂操作不懂模型，写出来的 XML 会被设备直接拒绝。',
        },
        {
          type: 'analogy',
          title: 'NETCONF 是快递柜，YANG 是面单格式',
          text: 'NETCONF 像一排标准快递柜：存件、取件、加锁、解锁都有固定按钮，不管你是哪家快递公司都能用。YANG 则是面单的填写规范，规定收件人、电话、重量分别写在哪一格、能不能为空。OpenConfig 更像一份跨公司通用的面单模板，让 A 厂和 B 厂的柜子都能识别同一张单子。',
        },
        {
          type: 'table',
          title: 'NETCONF 四层与 YANG 的分工',
          columns: ['层次', '作用', '典型内容'],
          rows: [
            ['传输层', '加密传输与会话管理', 'SSH，端口 830'],
            ['消息层', '封装 RPC 与应答', 'rpc、rpc-reply、message-id'],
            ['操作层', '定义配置动作', 'edit-config、get-config、commit'],
            ['内容层', '约束数据结构', 'YANG 模型、命名空间、叶子节点'],
          ],
        },
        {
          type: 'paragraph',
          text: 'YANG 是一种数据建模语言，用 module、container、list、leaf 描述设备的配置与状态树。厂商会发布大量原生模型，例如华为的 huawei-ifm；OpenConfig 则是由运营商与厂商共同推动的厂商中立模型，路径通常以 openconfig- 开头。同一份业务意图，用 OpenConfig 写可以在多厂商设备间复用，但能力覆盖往往不如原生模型完整，实际项目常是两者混用。',
        },
        {
          type: 'code',
          title: 'NETCONF edit-config：用标准模型配置 LoopBack0',
          lang: 'json',
          code: `<rpc message-id="101"
     xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">
  <edit-config>
    <target><candidate/></target>
    <config>
      <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
        <interface>
          <name>LoopBack0</name>
          <type xmlns:ianaift="urn:ietf:params:xml:ns:yang:iana-if-type">ianaift:softwareLoopback</type>
          <enabled>true</enabled>
          <ipv4 xmlns="urn:ietf:params:xml:ns:yang:ietf-ip">
            <address>
              <ip>1.1.1.1</ip>
              <prefix-length>32</prefix-length>
            </address>
          </ipv4>
        </interface>
      </interfaces>
    </config>
  </edit-config>
</rpc>`,
        },
        {
          type: 'code',
          title: 'RESTCONF 等价写法：OpenConfig JSON',
          lang: 'json',
          code: `{
  "openconfig-interfaces:interfaces": {
    "interface": [
      {
        "name": "LoopBack0",
        "config": {
          "name": "LoopBack0",
          "enabled": true,
          "description": "managed-by-nce"
        }
      }
    ]
  }
}`,
        },
        {
          type: 'output',
          title: '验证：NETCONF hello 能力协商',
          text: `<?xml version="1.0" encoding="UTF-8"?>
<hello xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">
  <capabilities>
    <capability>urn:ietf:params:netconf:base:1.0</capability>
    <capability>urn:ietf:params:netconf:capability:candidate:1.0</capability>
    <capability>urn:ietf:params:netconf:capability:validate:1.0</capability>
    <capability>http://openconfig.net/yang/interfaces?module=openconfig-interfaces&amp;revision=2021-06-24</capability>
  </capabilities>
  <session-id>1025</session-id>
</hello>`,
        },
        {
          type: 'list',
          title: 'hello 报文透露出什么',
          items: [
            'candidate 能力表示设备支持候选配置库，可以先改后 commit，适合两阶段下发',
            'validate 能力表示 commit 前可以校验语法与业务约束，能提前拦住错误配置',
            'OpenConfig 能力说明该设备已加载标准模型，可以按通用路径下发',
            'session-id 是本次会话的唯一标识，排查并发会话冲突时要用',
          ],
        },
        {
          type: 'warning',
          title: '不 commit 等于没配',
          text: '使用 candidate 数据存储时，edit-config 只是修改了候选库，必须再发一次 commit 才会生效；忘记 commit 是最常见的「配置下发成功但业务没变」。另外多个控制器同时编辑同一设备会争抢 lock，拿不到锁时应退避重试，而不是反复强推覆盖别人的改动。',
        },
        {
          type: 'tip',
          title: '先读后写，按模型猜不如按模型查',
          text: '下发前先用 get-config 把目标对象的现状读出来，确认字段名、命名空间与取值范围，再构造 edit-config。绝大多数下发失败都是命名空间写错或叶子节点拼错，设备返回的 rpc-error 里会给出具体路径，照着改比盲试快得多。',
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm10-l03',
      moduleId: 'm10',
      title: 'RESTful API 与 Telemetry：从轮询到推送',
      depth: '精通',
      minutes: 32,
      summary: '理解推模式遥测的价值，配置 gRPC 订阅并读懂 JSON 采样数据。',
      objectives: [
        '区分 RESTCONF 与 NCE 北向 RESTful 接口的定位与典型用法',
        '说明 SNMP 轮询与 Telemetry 推送在时效性、开销上的差异',
        '配置 Telemetry 静态订阅并验证数据按周期上报',
      ],
      keywords: ['RESTful', 'RESTCONF', 'Telemetry', 'gRPC', '订阅', 'JSON'],
      blocks: [
        {
          type: 'paragraph',
          text: '自动化运维有两类数据通道：拉和推。拉模式由管理系统主动查询，RESTful 与 SNMP 都属于这一类；推模式由设备按订阅主动上报，Telemetry 是代表。RESTful 接口通常用于配置下发与按需查询，例如 NCE 北向提供资源、拓扑、告警的 REST 接口；Telemetry 则用于高频、持续的性能与状态采集，把「秒级甚至毫秒级的变化」送到分析平台。',
        },
        {
          type: 'analogy',
          title: '打电话问诊与手环持续上报',
          text: 'SNMP 轮询像医生每隔五分钟打一次电话问病人「现在心跳多少」，两次电话之间的异常完全看不到，问得越勤医生越累。Telemetry 像给病人戴上智能手环，心率、血氧按固定频率自动上传，异常瞬间会被记录。前者是拉，后者是推，差别不只在频率，更在于是否漏掉区间内的变化。',
        },
        {
          type: 'table',
          title: 'SNMP 与 Telemetry 的对比',
          columns: ['维度', 'SNMP 轮询', 'Telemetry 推送'],
          rows: [
            ['数据方向', '管理站主动拉取', '设备主动推送'],
            ['时效性', '受轮询周期限制，秒到分钟级', '可到毫秒级，变化不遗漏'],
            ['协议与编码', 'UDP 161，BER 编码', 'gRPC over TCP，JSON 或 GPB 编码'],
            ['设备开销', '每次查询都要解析 OID 树', '一次订阅持续采样，开销可控'],
            ['典型用途', '告警与基础性能', '流量分析、拥塞与微突发定位'],
          ],
        },
        {
          type: 'paragraph',
          text: 'Telemetry 的核心概念是订阅：指定采集哪个 sensor-path、多久采一次、发到哪个目的地址。sensor-path 来自 YANG 模型路径，必须与设备实际支持的模型一致。传输常用 gRPC，编码可选 JSON 便于调试，也可选 GPB 压缩体积。采样周期不是越短越好，周期减半意味着数据量与设备 CPU 开销翻倍，通常核心链路用秒级、普通接入用分钟级即可。',
        },
        {
          type: 'code',
          title: '交换机：配置 gRPC 静态订阅',
          lang: 'vrp',
          code: `system-view
sysname DC-Leaf1
#
telemetry
 #
 sensor-group S-IF
  sensor-path huawei-ifm:ifm/interfaces/interface
 #
 destination-group D-NCE
  ipv4-address 10.10.100.10 port 57500 protocol grpc no-tls
 #
 subscription SUB-IF
  sensor-group S-IF sample-interval 5000
  destination-group D-NCE`,
        },
        {
          type: 'output',
          title: '验证：display telemetry subscription',
          text: `[DC-Leaf1] display telemetry subscription
Subscriptions:
  Name: SUB-IF                      State: Active
  Sensor group: S-IF
    Path: huawei-ifm:ifm/interfaces/interface
    Sample interval: 5000 ms
  Destination group: D-NCE
    10.10.100.10:57500              Protocol: gRPC   TLS: Disabled
  Last report time: 2026-11-12 10:20:31
  Report count: 1842`,
        },
        {
          type: 'code',
          title: 'Python：用 RESTCONF 按需读取接口状态',
          lang: 'python',
          code: `import os
import requests

url = "https://10.10.100.2/restconf/data/ietf-interfaces:interfaces/interface=LoopBack0"
headers = {
    "Content-Type": "application/yang-data+json",
    "Accept": "application/yang-data+json",
}
auth = ("netadmin", os.environ["NETCONF_PASSWORD"])

resp = requests.get(url, headers=headers, auth=auth, verify=False, timeout=5)
print(resp.status_code)
print(resp.json()["ietf-interfaces:interface"]["config"])`,
        },
        {
          type: 'output',
          title: '验证：Telemetry 上报的 JSON 样本',
          text: `{
  "source": "DC-Leaf1",
  "subscription": "SUB-IF",
  "sample_interval_ms": 5000,
  "timestamp": "2026-11-12T10:20:31.512+08:00",
  "interfaces": [
    {
      "name": "GE1/0/1",
      "admin_status": "UP",
      "oper_status": "UP",
      "in_octets": 84213310,
      "out_octets": 55120877,
      "in_errors": 0
    }
  ]
}`,
        },
        {
          type: 'warning',
          title: '周期与编码选错，会把监控做成负担',
          text: '把全量接口路径配成 100 毫秒采样，一台设备每分钟就能产生数十兆数据，控制器磁盘与设备 CPU 都会被拖垮。正确做法是按业务重要性分级订阅：核心链路关注错包与队列，采样周期短；接入端口只关注 up/down，周期可以放长。另外 gRPC 目的端口若被防火墙拦截，订阅会显示 Active 但收不到数据，必须双向核对。',
        },
        {
          type: 'tip',
          title: '先用 get 校验路径，再建订阅',
          text: '不确定 sensor-path 是否正确时，先用 RESTCONF 的 GET 请求访问同一路径，能返回数据说明模型与路径可用。建好订阅后看 Last report time 是否持续刷新，比只看 State 为 Active 更可靠。',
        },
        {
          type: 'checklist',
          title: 'Telemetry 上线检查',
          items: [
            'sensor-path 与设备实际加载的 YANG 模型一致',
            '采样周期与数据量经过估算，未超过平台承载能力',
            '目的地址、端口、协议与编码在两侧配置一致',
            '防火墙与 ACL 已放行 gRPC 端口',
            '订阅状态为 Active 且 Last report time 持续刷新',
            '证书或 TLS 配置与平台要求匹配',
          ],
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm10-l04',
      moduleId: 'm10',
      title: 'VXLAN 与 BGP EVPN：把二层搬到三层之上',
      depth: '精通',
      minutes: 36,
      summary: '掌握 VXLAN 封装与 BGP EVPN 分布式网关，打通跨 Leaf 的二层域。',
      objectives: [
        '解释 VXLAN 的封装结构、VNI 与 VTEP 的作用',
        '说明 BGP EVPN Type-2 与 Type-3 路由分别解决什么问题',
        '配置分布式网关并验证跨 Leaf 的 MAC 与 IP 可达',
      ],
      keywords: ['VXLAN', 'VTEP', 'VNI', 'BGP EVPN', 'Type-2', '分布式网关'],
      blocks: [
        {
          type: 'paragraph',
          text: '数据中心里虚拟机随时迁移，传统 VLAN 只有 4094 个且依赖二层连通，跨机房几乎无法扩展。VXLAN 的思路是把原始二层帧整个封装进 UDP 报文，在外层 IP 网络中传输，相当于让二层帧坐上了三层快递。承担封装与解封的设备叫 VTEP，每个 VNI 标识一个隔离的二层域，24 位 VNI 可提供约 1600 万个租户网络。',
        },
        {
          type: 'table',
          title: 'VXLAN 封装开销',
          columns: ['字段', '长度', '说明'],
          rows: [
            ['外层以太头', '14 字节', 'Underlay 的源目 MAC'],
            ['外层 IP 头', '20 字节', 'VTEP 地址之间的路由'],
            ['UDP 头', '8 字节', '目的端口 4789'],
            ['VXLAN 头', '8 字节', '含 24 位 VNI 与保留位'],
            ['合计开销', '50 字节', '规划 MTU 时必须预留'],
          ],
        },
        {
          type: 'analogy',
          title: 'VXLAN 是给二层帧套上标准快递箱',
          text: '原始以太帧像一件没有外包装的家具，只能在同一个仓库里搬。VXLAN 把它装进标准快递箱，箱子上写着「目的仓库」（VTEP 地址）和「属于哪个客户」（VNI），然后交给三层物流网络运输。到了目的仓库拆箱，取出的还是原来那件家具，中间经过多少个路口都不影响。',
        },
        {
          type: 'paragraph',
          text: '光有数据面还不够，难点在「地址簿」：某个 MAC 或 IP 到底挂在哪个 VTEP 后面。BGP EVPN 用 MP-BGP 承载这份地址簿，主要有三类路由。Type-2 是 MAC/IP 通告，告诉全网「这个 MAC 与 IP 在我这里」，是实现主机路由与 ARP 抑制的关键；Type-3 是 Inclusive Multicast 路由，用于建立 BUM 流量（广播、未知单播、组播）的隧道；Type-5 是 IP 前缀路由，用于跨子网的三层互通。',
        },
        {
          type: 'interactive',
          key: 'vxlan-evpn',
          caption: '观察一台主机上线后，本地 VTEP 如何生成 Type-2 路由并反射给其他 Leaf，以及分布式网关如何让每台 Leaf 都成为本地网关。',
        },
        {
          type: 'table',
          title: 'EVPN 常见路由类型',
          columns: ['类型', '名称', '主要作用'],
          rows: [
            ['Type-2', 'MAC/IP Advertisement', '通告 MAC 与主机 IP，支持 ARP 抑制与主机路由'],
            ['Type-3', 'Inclusive Multicast', '建立 BUM 流量隧道，自动发现 VTEP'],
            ['Type-5', 'IP Prefix', '通告网段路由，实现跨 VXLAN 的三层互通'],
            ['Type-1', 'Ethernet Auto-Discovery', '多归接入与快速收敛'],
            ['Type-4', 'Ethernet Segment', '指定转发者选举，配合多归场景'],
          ],
        },
        {
          type: 'paragraph',
          text: '分布式网关是 EVPN 数据中心的标配。传统集中式网关把所有三层流量都引到一对核心设备，路径绕行且扩展性差。分布式网关让每台 Leaf 都配置同一个 Vbdif 网关地址与相同的虚拟 MAC，虚拟机在本地 Leaf 就能完成三层转发，只有跨子网且目的不在本 Leaf 时才走 VXLAN 隧道。这样既缩短了路径，也天然实现了网关冗余。',
        },
        {
          type: 'code',
          title: 'Leaf：BD、VNI、NVE 与 EVPN 邻居',
          lang: 'vrp',
          code: `system-view
sysname DC-Leaf1
#
bridge-domain 100
 vxlan vni 5010
#
interface Vbdif 100
 ip address 192.168.100.1 255.255.255.0
 mac-address 0000-5e00-0101
#
interface Nve1
 source 1.1.1.1
 vni 5010 head-end peer-list protocol bgp
#
bgp 65001
 router-id 1.1.1.1
 peer 2.2.2.2 as-number 65001
 #
 l2vpn-family evpn
  peer 2.2.2.2 enable
  peer 2.2.2.2 advertise irb`,
        },
        {
          type: 'output',
          title: '验证：EVPN 路由与 VXLAN 隧道',
          text: `[DC-Leaf1] display bgp evpn all routing-table
BGP local router ID : 1.1.1.1
Local AS number : 65001

Route Distinguisher: 1.1.1.1:100
 EVPN route count: 2
  [2][0][48][00e0-fc12-3456][32][192.168.100.10]/136
     NextHop : 2.2.2.2        LocPrf : 100
     Label : 5010              Path/Ogn : i
  [3][0][32][2.2.2.2]/80
     NextHop : 2.2.2.2        LocPrf : 100
     Path/Ogn : i

[DC-Leaf1] display vxlan tunnel
Tunnel ID      Source          Destination     State   Type
4026531841     1.1.1.1         2.2.2.2         up      dynamic`,
        },
        {
          type: 'list',
          title: '回显关键点',
          items: [
            'Type-2 路由携带 MAC、主机 IP 与 VNI 标签，说明对端主机已被学习到',
            'Type-3 路由用于建立 BUM 隧道，缺少它会导致广播与未知单播不通',
            'NextHop 是远端 VTEP 地址，必须由 Underlay 路由保证可达',
            '隧道 State 为 up，说明封装路径已建立，可以承载业务流量',
          ],
        },
        {
          type: 'warning',
          title: 'MTU 不够，表现为「能 ping 通但大包丢」',
          text: 'VXLAN 额外增加 50 字节开销，Underlay 链路 MTU 若仍是 1500，大包会被丢弃或分片，典型现象是小包 ping 正常、文件传输卡死、SSH 登录后无响应。数据中心 Underlay 通常统一规划为 1600 或 9000，并在规划阶段就把这一项写进基线。',
        },
        {
          type: 'tip',
          title: '按顺序部署，逐层验证',
          text: '先打通 Underlay 的 OSPF 或 IS-IS，确认 VTEP 地址两两可达；再建 BGP EVPN 邻居，确认能收到 Type-3；然后配置 BD 与 VNI 映射、NVE 隧道；最后配分布式网关并验证跨 Leaf 互通。每步都用 display 验证，比一次性堆完配置再排错快得多。',
        },
        {
          type: 'checklist',
          title: 'VXLAN 业务不通排查',
          items: [
            'Underlay 是否可达，VTEP 环回口是否互通',
            'BGP EVPN 邻居是否 Established，是否收到 Type-2 与 Type-3',
            'BD 与 VNI 映射是否一致，NVE 是否引用正确',
            '远端 VTEP 是否在 head-end peer-list 中',
            'Vbdif 网关地址与虚拟 MAC 是否全网一致',
            'Underlay MTU 是否预留了 50 字节开销',
          ],
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
    {
      id: 'm10-l05',
      moduleId: 'm10',
      title: 'Spine-Leaf、云网一体与 SRv6 概览',
      depth: '熟悉',
      minutes: 30,
      summary: '理解 Spine-Leaf 的组网逻辑与云网一体演进，建立 SRv6 的整体认知。',
      objectives: [
        '说明 Spine-Leaf 全互联结构的收敛比、扩展方式与 ECMP 价值',
        '描述多租户场景下 VXLAN 与 EVPN 如何实现隔离',
        '说出 SRv6 的段路由思想与典型应用场景',
      ],
      keywords: ['Spine-Leaf', 'ECMP', '云网一体', '多租户', 'SRv6', 'Segment Routing'],
      blocks: [
        {
          type: 'paragraph',
          text: '传统数据中心多用三层树形结构，核心、汇聚、接入逐级收敛，越往上带宽越紧张，横向扩展还要成对增加设备。Spine-Leaf 改成两层全互联：每台 Leaf 都连接到所有 Spine，Leaf 之间不直连。任意两台 Leaf 之间的流量固定走「Leaf 到 Spine 再到 Leaf」三跳，跳数可预期，时延稳定，加一台 Spine 就能线性提升全网带宽。',
        },
        {
          type: 'analogy',
          title: 'Spine-Leaf 像只飞枢纽的航线网络',
          text: 'Spine 是枢纽机场，Leaf 是城市机场。任何两个城市之间不直飞，都到枢纽转一次，航线数量从城市数的平方降到城市数乘以枢纽数。虽然多了一次中转，但每条航段都满负荷运转，调度简单，加一个枢纽就能承接更多城市。传统三层树则像逐级汇集的公路网，越往上越堵。',
        },
        {
          type: 'table',
          title: '传统三层与 Spine-Leaf 对比',
          columns: ['维度', '传统三层树', 'Spine-Leaf'],
          rows: [
            ['连接方式', '核心、汇聚、接入逐级收敛', 'Leaf 全连 Spine，Leaf 之间不直连'],
            ['东西向流量', '需绕行核心，时延大', '固定三跳，路径可预期'],
            ['扩展方式', '成对扩容，受收敛比限制', '增加 Spine 或 Leaf 即可线性扩展'],
            ['带宽利用', '靠堆叠与链路聚合', '依靠 ECMP 多路径负载分担'],
            ['运维复杂度', '层级多，策略分散', '两层结构，策略集中在 Leaf'],
          ],
        },
        {
          type: 'paragraph',
          text: 'Spine-Leaf 的带宽优势依赖 ECMP：Leaf 到目的网段通常有多条等价路径，逐包或逐流哈希分担到不同 Spine。Underlay 一般用 OSPF 或 IS-IS 承载，只负责 VTEP 地址可达；Overlay 用 BGP EVPN 承载租户网络。两者解耦后，Underlay 变化不会直接影响租户路由，这也是云网一体架构能规模化运维的原因。',
        },
        {
          type: 'paragraph',
          text: '云网一体强调网络资源像云资源一样按需交付。多租户场景下，每个租户分配独立的 VNI 与 Route Target，EVPN 通过 RT 控制路由只在租户内部传播，实现真正的三层隔离。上层的 iMaster NCE 负责编排：租户在 portal 上申请一个虚拟网络，控制器自动完成 VNI 分配、BD 创建、EVPN 配置下发与连通性校验，网络交付从数天缩短到分钟级。',
        },
        {
          type: 'paragraph',
          text: 'SRv6 是 Segment Routing 在 IPv6 上的实现，思路是把路径编码进报文头。源节点在 SRH 中压入一串 Segment 列表，每个 Segment 是一个 128 位 IPv6 地址，中间节点按列表逐跳执行指令，例如 End.DT4 表示解封装后查 IPv4 表转发。相比 MPLS L3VPN，SRv6 不依赖标签分发协议，能与现有 IPv6 网络天然融合，并支持端到端流量工程与业务链。',
        },
        {
          type: 'code',
          title: 'Underlay：OSPF 等价多路径与 SRv6 Locator',
          lang: 'vrp',
          code: `system-view
sysname DC-Spine1
#
ospf 1 router-id 1.1.1.1
 area 0.0.0.0
  network 10.0.0.0 0.0.0.255
  network 1.1.1.1 0.0.0.0
  maximum load-balancing 8
#
segment-routing ipv6
 locator LOC1 ipv6-prefix 2001:db8:1:: 64 static 32
#
isis 1
 ipv6 enable topology ipv6
 segment-routing ipv6 locator LOC1`,
        },
        {
          type: 'output',
          title: '验证：display ip routing-table 10.20.1.0',
          text: `[DC-Leaf1] display ip routing-table 10.20.1.0
Route Flags: R - relay, D - download to fib

Destination/Mask    Proto   Pre  Cost      Flags NextHop         Interface

       10.20.1.0/24  OSPF    10   3         D     10.0.12.2       Vlanif12
                                                 10.0.13.2       Vlanif13
                                                 10.0.14.2       Vlanif14
                                                 10.0.15.2       Vlanif15

# 四条等价下一跳分别指向不同 Spine，实现横向扩容与负载分担`,
        },
        {
          type: 'warning',
          title: '不要跨层乱连，也不要忽略 Underlay 稳定性',
          text: '在 Spine-Leaf 中让 Leaf 之间直连，会破坏「三跳可预期」的模型，容易产生非对称路径与环路，排错难度陡增。另一个误区是把 Overlay 当成万能：VXLAN 与 EVPN 全部依赖 Underlay 的 VTEP 可达，Underlay 一抖，成百上千个租户网络同时受影响，因此 Underlay 的收敛与 BFD 检测必须做扎实。',
        },
        {
          type: 'tip',
          title: '先规划地址与 AS 号，再动配置',
          text: 'Spine-Leaf 的 Underlay 常用每对设备独立 AS 的 EBGP，或统一 AS 的 IBGP 加路由反射器，两种方式各有适用场景。无论选哪种，都要先规划好 VTEP 环回口地址、互联地址段与 AS 号，并留出扩展余量。SRv6 场景还要提前规划 Locator 前缀，避免与业务地址冲突。',
        },
        {
          type: 'checklist',
          title: '数据中心方案自检',
          items: [
            'Spine 与 Leaf 的收敛比是否满足东西向流量模型',
            'Underlay 是否启用 ECMP，等价路径数量是否足够',
            'VTEP 地址是否全部由 Underlay 路由可达',
            '多租户 VNI 与 RT 规划是否唯一且可扩展',
            'MTU 是否统一规划并验证过大包',
            'SRv6 Locator 是否与现有地址规划无冲突',
          ],
        },
        {
          type: 'quiz',
          title: '本课自测',
        },
      ],
    },
  ],
};

export default mod;
