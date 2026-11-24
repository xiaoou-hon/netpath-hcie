import type { QuizQuestion } from '@/types';

const list: QuizQuestion[] = [
  {
    id: 'q-m15-01',
    moduleId: 'm15',
    lessonId: 'm15-l01',
    type: 'single',
    depth: '熟悉',
    question: '在"核心-汇聚-接入"三层园区组网中，汇聚层的主要职责是什么？',
    options: [
      '直接连接终端并提供 PoE 供电',
      '作为接入层的汇聚点，承担路由汇总、策略控制与用户网关功能',
      '只负责广域网互联',
      '只负责无线终端的射频管理',
    ],
    answer: [1],
    explanation:
      '接入层负责终端接入与端口安全，汇聚层汇聚多台接入交换机并完成路由汇总、策略控制和用户网关部署，核心层则追求高速转发与高可靠。把网关与策略放在汇聚可缩小故障域、便于分区分权管理；在超大型园区也常把网关下沉到接入或采用 VXLAN 分布式网关，因此需要结合实际架构判断。',
  },
  {
    id: 'q-m15-02',
    moduleId: 'm15',
    lessonId: 'm15-l01',
    type: 'multiple',
    depth: '熟悉',
    question: '园区网提升可靠性的常见技术有哪些？',
    options: [
      '交换机堆叠（CSS/iStack）',
      'M-LAG 跨设备链路聚合',
      'VRRP 网关冗余',
      'STP/RSTP 防环',
      'NAT 地址转换',
    ],
    answer: [0, 1, 2, 3],
    explanation:
      '堆叠把多台设备虚拟成一台，简化管理并支持跨设备 Eth-Trunk；M-LAG 在不堆叠的前提下实现双活接入与链路冗余；VRRP 提供网关冗余，STP 系列消除二层环路并配合收敛优化。NAT 解决私网地址访问公网的转换问题，与可靠性无关，也不能替代上述冗余机制。',
  },
  {
    id: 'q-m15-03',
    moduleId: 'm15',
    lessonId: 'm15-l02',
    type: 'single',
    depth: '熟悉',
    question: '802.1X 认证中，接入交换机承担的角色是什么？',
    options: [
      'Supplicant 客户端',
      'Authenticator 认证者，负责端口控制与 EAP/RADIUS 报文转交',
      'Authentication Server 认证服务器',
      '只做二层转发，不参与认证',
    ],
    answer: [1],
    explanation:
      '802.1X 包含三个角色：终端是 Supplicant，接入设备是 Authenticator，RADIUS 服务器是 Authentication Server。交换机把 EAP 报文封装进 RADIUS 送给服务器，并根据认证结果授权或拒绝端口，认证通过前只放通 EAP、DHCP 等必要报文。因此交换机必须支持 EAP 中继或终结，配置错误会直接导致终端无法上线。',
  },
  {
    id: 'q-m15-04',
    moduleId: 'm15',
    lessonId: 'm15-l02',
    type: 'multiple',
    depth: '精通',
    question: '关于"业务随行"，下列说法正确的有哪些？',
    options: [
      '安全策略与 QoS 策略绑定用户或用户组身份，而不是绑定 IP 地址和端口',
      '用户 IP 变化或更换接入位置后，策略仍然跟随用户生效',
      '需要统一认证（如 802.1X/Portal）与控制器协同下发策略',
      '必须按部门划分固定 VLAN 才能实现',
    ],
    answer: [0, 1, 2],
    explanation:
      '业务随行把策略模型从"以 IP/VLAN 为中心"转为"以身份为中心"：控制器根据认证结果把用户归入安全组，统一下发组间策略，因此地址漂移或漫游不影响策略一致性。它恰恰弱化了对固定 VLAN 和静态 IP 的依赖，最后一项与本意相反。落地前提是认证、控制器与网络设备之间的联动链路可靠。',
  },
  {
    id: 'q-m15-05',
    moduleId: 'm15',
    lessonId: 'm15-l02',
    type: 'boolean',
    depth: '熟悉',
    question:
      'Portal 认证中，终端在认证前通常可访问免认证页面与 DHCP、DNS 等基础资源，认证通过后由接入设备下发授权。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      'Portal 认证通过重定向把未认证终端的 HTTP 请求引导到认证页面，认证前的 ACL 只放通 Portal 服务器、DHCP、DNS 等必要资源，否则终端连地址都拿不到。认证通过后接入设备下发授权 ACL 或安全组策略放通业务。免认证资源列表配置错误，是"打不开认证页面"这类问题最常见的原因。',
  },
  {
    id: 'q-m15-06',
    moduleId: 'm15',
    lessonId: 'm15-l03',
    type: 'single',
    depth: '精通',
    question: '关于 IPsec 的 AH 与 ESP，下列说法正确的是？',
    options: [
      'ESP 提供加密与完整性校验，AH 只提供完整性校验不加密，且 AH 难以穿越 NAT',
      'AH 提供加密，ESP 只做认证',
      '两者都不支持传输模式',
      'ESP 的协议号是 51，AH 的协议号是 50',
    ],
    answer: [0],
    explanation:
      'AH 协议号为 51，对整个 IP 报文做认证但不加密，且校验范围包含 IP 头，经过 NAT 改写地址后会校验失败；ESP 协议号为 50，可加密也可认证，配合 NAT-T 封装进 UDP 4500 可穿越 NAT。因此实际组网几乎都用 ESP，只有在需要保护原 IP 头或不加密的场景才考虑 AH。两者都支持传输与隧道模式。',
  },
  {
    id: 'q-m15-07',
    moduleId: 'm15',
    lessonId: 'm15-l03',
    type: 'multiple',
    depth: '精通',
    question: 'SD-WAN 的典型能力包括哪些？',
    options: [
      '集中控制器统一编排与零配置部署（ZTP）',
      '应用识别与基于链路质量的智能选路',
      '基于 IPsec/GRE 的 Overlay 隧道',
      '依赖逐台手工配置每条隧道',
    ],
    answer: [0, 1, 2],
    explanation:
      'SD-WAN 把控制平面集中到控制器，CPE 通过 ZTP 自动上线，Overlay 用 IPsec/GRE 在任意 WAN 链路上建立隧道；业务侧通过应用识别把关键应用引流到质量更优的链路，实现按需选路。逐台手工配置是传统专线组网的方式，与 SD-WAN 自动化、集中编排的目标相反，也会放大变更风险。',
  },
  {
    id: 'q-m15-08',
    moduleId: 'm15',
    lessonId: 'm15-l03',
    type: 'single',
    depth: '熟悉',
    question: '为什么需要承载组播或动态路由协议的场景常用 GRE over IPsec，而不是纯 IPsec 隧道？',
    options: [
      'GRE 可封装组播和广播报文，IPsec 隧道通常只处理单播，因此先用 GRE 封装再整体加密',
      '因为 GRE 自带加密，不需要 IPsec',
      '因为 IPsec 不支持任何加密算法',
      '因为 GRE 使用 TCP 179 端口',
    ],
    answer: [0],
    explanation:
      'IPsec 隧道一般只对单播流量做保护，无法直接承载 OSPF 组播 Hello 或组播数据；GRE 是通用的三层封装，可承载组播与广播，把 GRE 报文再送入 IPsec 即可同时获得连通性与机密性。GRE 本身不加密，协议号为 47，单独使用会让内层流量在公网上明文暴露，因此必须叠加加密机制。',
  },
  {
    id: 'q-m15-09',
    moduleId: 'm15',
    lessonId: 'm15-l03',
    type: 'boolean',
    depth: '精通',
    question: 'GRE 隧道本身不提供加密，若需要保证数据机密性，应叠加 IPsec 等加密机制。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      'GRE 只负责封装，解决异构网络互通与组播承载问题，报文内容在公网上仍可被还原，因此涉及敏感数据时必须配合 IPsec、MACsec 等技术加密。GRE over IPsec 的配置要点是让 GRE 流量命中 IPsec 感兴趣流，并注意隧道 MTU 与分片处理，否则大包被丢弃会表现为"能通但很慢"。',
  },
  {
    id: 'q-m15-10',
    moduleId: 'm15',
    lessonId: 'm15-l04',
    type: 'single',
    depth: '熟悉',
    question: '相比 SNMP 周期轮询，Telemetry 的主要优势是什么？',
    options: [
      '由设备主动、高频推送数据，采集精度高且对设备轮询压力更可控',
      '完全不需要网络连通即可采集',
      '只能采集告警，不能采集性能指标',
      '使用 UDP 514 上报日志',
    ],
    answer: [0],
    explanation:
      'SNMP 轮询受周期限制，秒级采集难以捕捉微突发，大规模轮询还会加重设备与管理站负担；Telemetry 采用推送模型（如 gRPC），设备按订阅主动上报，可实现亚秒级、批量编码的高精度采集，适合智能运维的实时分析。UDP 514 是 Syslog 日志上报，与 Telemetry 不是同一机制。',
  },
  {
    id: 'q-m15-11',
    moduleId: 'm15',
    lessonId: 'm15-l04',
    type: 'multiple',
    depth: '熟悉',
    question: '智能运维（AIOps）在园区与广域网络中的典型应用有哪些？',
    options: [
      '基于历史数据的故障预测与异常检测',
      '告警关联与根因定位',
      '网络数字孪生与变更前仿真验证',
      '完全取代所有人工操作且无需验证',
    ],
    answer: [0, 1, 2],
    explanation:
      '智能运维通过采集 Telemetry、日志与流量数据，结合关联分析和模型识别异常、定位根因，并可在数字孪生环境中仿真变更，降低割接风险。它提供辅助决策与自动化建议，但仍需人工确认与验证，最后一项夸大了能力。实际落地必须保留审核与回滚机制，否则模型误判会放大风险。',
  },
];

export default list;
