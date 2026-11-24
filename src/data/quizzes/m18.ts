import type { QuizQuestion } from '@/types';

const list: QuizQuestion[] = [
  {
    id: 'q-m18-01',
    moduleId: 'm18',
    lessonId: 'm18-l01',
    type: 'single',
    depth: '熟悉',
    question: '容器内的网卡、路由表与 iptables 规则之所以能与宿主机隔离，主要依靠什么机制？',
    options: [
      '每台容器分配一块独立的物理网卡',
      'Linux 网络命名空间为容器提供独立的协议栈视图',
      '容器运行时为每个容器启动一台虚拟机',
      '通过 VLAN 标签在二层隔离容器',
    ],
    answer: [1],
    explanation:
      '网络命名空间是内核提供的隔离机制，每个命名空间拥有独立的网卡、路由表、ARP 表、iptables 规则与端口空间，因此容器看起来像拥有一台独立主机。容器与宿主机之间通过 veth pair 连接，必要时再接入网桥或做路由转发。VLAN 只能做二层广播域隔离，无法隔离路由表与端口空间，也不是容器的默认实现方式。',
  },
  {
    id: 'q-m18-02',
    moduleId: 'm18',
    lessonId: 'm18-l01',
    type: 'multiple',
    depth: '熟悉',
    question: '关于 CNI（容器网络接口），下列说法正确的有哪些？',
    options: [
      'CNI 规定容器运行时如何调用网络插件，并接收地址、路由等结果',
      'CNI 只规定调用契约，不规定底层用网桥、路由还是 Overlay 转发',
      'CNI 插件负责创建 veth、分配 IP 并写入容器路由',
      'CNI 负责为 Service 分配虚拟 IP 并实现负载均衡',
    ],
    answer: [0, 1, 2],
    explanation:
      'CNI 是一套插件规范：运行时把容器网络命名空间、容器 ID 与网卡名传给插件，插件完成建链路、配地址、写路由并把结果以 JSON 返回。规范只约束输入输出，不限定转发实现，所以不同插件可以走网桥、BGP 路由或云上网卡。Service 的虚拟 IP 与负载均衡由 kube-proxy、eBPF 或云负载均衡实现，不属于 CNI 的职责。',
  },
  {
    id: 'q-m18-03',
    moduleId: 'm18',
    lessonId: 'm18-l02',
    type: 'single',
    depth: '熟悉',
    question: 'Kubernetes 网络模型对 Pod 间通信的基本约定是什么？',
    options: [
      'Pod 之间必须经过 NAT 才能互通',
      '每个 Pod 有集群内唯一 IP，Pod 之间可直接通信且不需要 NAT',
      '只有同一节点上的 Pod 才能直接通信',
      'Pod 必须使用宿主机的网络命名空间',
    ],
    answer: [1],
    explanation:
      'Kubernetes 模型要求每个 Pod 拥有集群内唯一 IP，任意两个 Pod 之间可以直接通信，且不经过 NAT；节点上的代理也能访问本节点所有 Pod。满足这三条，应用才能像在同一张二层网络里一样互相访问。跨节点实现由 CNI 负责，可以是路由、Overlay 或云上网卡，但对外表现必须一致，否则 Service 与探针都会出现难以解释的异常。',
  },
  {
    id: 'q-m18-04',
    moduleId: 'm18',
    lessonId: 'm18-l02',
    type: 'single',
    depth: '精通',
    question: '某个 ClusterIP Service 访问不通，查看 EndpointSlice 为空，最应该先检查什么？',
    options: [
      '节点的物理网卡是否 down',
      'Service 的 selector 是否与 Pod 标签匹配、Pod 是否就绪、targetPort 是否正确',
      'CoreDNS 的版本号',
      'Ingress 控制器是否安装',
    ],
    answer: [1],
    explanation:
      'EndpointSlice 为空说明 Service 没有找到可用后端，常见原因只有三类：selector 与 Pod 标签不一致、Pod 未就绪导致被排除、端口名或 targetPort 配置错误。此时查物理网卡或 DNS 都没有意义，因为流量根本没有可转发的目标。端点存在但仍不通，才需要继续检查 NetworkPolicy、kube-proxy 规则与跨节点转发路径。',
  },
  {
    id: 'q-m18-05',
    moduleId: 'm18',
    lessonId: 'm18-l02',
    type: 'multiple',
    depth: '熟悉',
    question: '以下哪些属于 Kubernetes 中把服务暴露给调用方的方式？',
    options: [
      'ClusterIP',
      'NodePort',
      'LoadBalancer',
      'Ingress',
      'NetworkPolicy',
    ],
    answer: [0, 1, 2, 3],
    explanation:
      'ClusterIP 提供集群内虚拟 IP，NodePort 在每个节点开放端口，LoadBalancer 借助云负载均衡暴露四层入口，Ingress 则用域名与路径做七层分发。四者可以叠加使用，例如 Ingress 控制器本身通过 LoadBalancer 暴露。NetworkPolicy 是访问控制对象，只决定流量能否通过，不提供服务入口，也不能替代 Service 或 Ingress。',
  },
  {
    id: 'q-m18-06',
    moduleId: 'm18',
    lessonId: 'm18-l02',
    type: 'single',
    depth: '熟悉',
    question: 'Ingress 资源创建成功但外部仍访问不到，最可能的原因是什么？',
    options: [
      '集群没有运行对应的 Ingress Controller，或 ingressClassName 不匹配',
      'Pod 没有配置 Hostname',
      'Service 必须是 NodePort 类型',
      'Ingress 只能转发 UDP 流量',
    ],
    answer: [0],
    explanation:
      'Ingress 只是路由规则，必须由 Ingress Controller 监听并翻译成实际代理配置；没有控制器或 ingressClassName 对不上时，规则不会生效。控制器自身通常通过 LoadBalancer 或 NodePort 的 Service 暴露，还需要外部 DNS、安全组与证书配合。Ingress 主要处理 HTTP/HTTPS 七层流量，与 Service 是否 NodePort 没有必然关系。',
  },
  {
    id: 'q-m18-07',
    moduleId: 'm18',
    lessonId: 'm18-l03',
    type: 'single',
    depth: '精通',
    question: 'Calico 默认的数据面转发方式是什么？',
    options: [
      '通过 BGP 在节点间宣告 Pod 网段，按原生三层路由转发，跨节点默认不封装',
      '所有 Pod 流量统一走 VXLAN 封装',
      'Pod 直接使用云上弹性网卡地址',
      '通过 OpenFlow 把流表下发到交换机',
    ],
    answer: [0],
    explanation:
      'Calico 默认用 BGP 在节点之间交换 Pod 网段，节点按普通 IP 路由转发，跨节点不额外封装，因此没有 Overlay 开销，但要求底层网络允许 BGP 或节点间三层可达。它也可以按需开启 IP-in-IP 或 VXLAN 以适配不支持 BGP 的网络。直接使用云上网卡的是 VPC-CNI，用 eBPF 做转发与策略的是 Cilium，与 Calico 的默认模式不同。',
  },
  {
    id: 'q-m18-08',
    moduleId: 'm18',
    lessonId: 'm18-l03',
    type: 'multiple',
    depth: '精通',
    question: '关于 Calico、Cilium 与 VPC-CNI 的差异，下列说法正确的有哪些？',
    options: [
      'Cilium 用 eBPF 实现转发与策略，可减少 iptables 规则膨胀',
      'VPC-CNI 让 Pod 使用云上网卡或辅助 IP，报文不经过 Overlay 封装',
      'Calico 可选用 BGP 原生路由，也可开启 IP-in-IP 或 VXLAN',
      'VPC-CNI 不受云平台网卡与子网配额限制',
    ],
    answer: [0, 1, 2],
    explanation:
      'Cilium 把 Service、策略与部分转发逻辑编译成 eBPF 程序，绕开大规模 iptables 链，适合 Service 数量多的集群。VPC-CNI 让 Pod 直接持有云上网卡或辅助 IP，流量走 VPC 原生网络，无 Overlay 开销。Calico 以 BGP 原生路由为主，也可按底层网络能力切换隧道模式。VPC-CNI 的 Pod 密度受网卡数量、辅助 IP 配额与子网容量限制，最后一项错误。',
  },
  {
    id: 'q-m18-09',
    moduleId: 'm18',
    lessonId: 'm18-l04',
    type: 'single',
    depth: '精通',
    question: 'NetworkPolicy 中 podSelector 为空对象（{}）表示什么？',
    options: [
      '不匹配任何 Pod',
      '匹配本命名空间内的所有 Pod',
      '匹配所有命名空间的所有 Pod',
      '匹配带有任意标签的 Pod，但不含无标签 Pod',
    ],
    answer: [1],
    explanation:
      'NetworkPolicy 是命名空间级对象，空 podSelector 表示选中该命名空间内的全部 Pod，常用于配置默认拒绝。它不会跨命名空间生效，若要选中其他命名空间的 Pod，需要在 ingress 或 egress 的 from/to 中使用 namespaceSelector。空选择器与「不匹配任何 Pod」正好相反，配置前必须确认作用范围，否则可能一次性切断整个命名空间的流量。',
  },
  {
    id: 'q-m18-10',
    moduleId: 'm18',
    lessonId: 'm18-l04',
    type: 'multiple',
    depth: '精通',
    question: '关于 NetworkPolicy 与服务网格的分工，下列说法正确的有哪些？',
    options: [
      'NetworkPolicy 主要做三四层可达性控制，无法识别 HTTP 路径与方法',
      '服务网格可提供双向 TLS、身份认证与七层路由、重试、熔断',
      '两者可以叠加使用，形成从网络层到应用层的纵深控制',
      '启用服务网格后，NetworkPolicy 会自动失效',
    ],
    answer: [0, 1, 2],
    explanation:
      'NetworkPolicy 由 CNI 实现，基于标签与端口控制哪些 Pod 能互通，属于三四层能力，不解析 HTTP。服务网格通过代理提供 mTLS、身份认证、七层路由与流量治理，解决「以什么身份、按什么规则通信」。两者职责不同，可以叠加形成纵深防御。启用网格不会让 NetworkPolicy 失效，但若 Sidecar 未注入或端口未纳管，部分流量可能绕过代理，因此仍需策略兜底。',
  },
];

export default list;
