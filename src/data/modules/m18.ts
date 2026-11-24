import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm18',
  code: 'M18',
  title: '云原生网络与容器网络',
  summary:
    '容器网络把 Linux 的命名空间、veth 与网桥装进编排系统：CNI 负责给 Pod 发地址，Service 与 Ingress 负责暴露，NetworkPolicy 与服务网格负责东西向治理。',
  stage: 'L4',
  order: 18,
  track: 'cloud',
  priority: 'P1',
  prerequisites: ['m16', 'm10'],
  goals: [
    '说明容器网络在命名空间、veth 与网桥层面的实现，理解 CNI 的职责边界',
    '解释 Kubernetes「每个 Pod 一个 IP、Pod 间直通」模型与 Service 的转发链路',
    '对比 Calico、Cilium eBPF 与 VPC-CNI 的转发路径、性能特征与适用场景',
    '编写 NetworkPolicy 实现默认拒绝、DNS 放通与按标签的精确放行',
    '说明 NetworkPolicy 与服务网格 mTLS 的分工，完成一次东西向治理实践',
  ],
  keywords: [
    '容器网络',
    'Namespace',
    'veth',
    'Linux bridge',
    'CNI',
    'Pod',
    'Service',
    'Ingress',
    'Calico',
    'Cilium',
    'NetworkPolicy',
  ],
  lessons: [
    {
      id: 'm18-l01',
      moduleId: 'm18',
      title: '容器网络基础：namespace、veth、bridge 与 CNI',
      depth: '熟悉',
      minutes: 30,
      summary: '容器看到的网卡来自网络命名空间，veth 把命名空间接到网桥，CNI 负责把这一套动作标准化。',
      objectives: [
        '说明网络命名空间如何隔离协议栈与网卡',
        '解释 veth pair、Linux bridge 与路由在容器转发中的作用',
        '手工搭建一对容器网络并定位跨命名空间不通的问题',
      ],
      keywords: ['Network Namespace', 'veth pair', 'Linux bridge', 'CNI', '容器网络'],
      blocks: [
        {
          type: 'paragraph',
          text: '容器不是虚拟机，它没有独立的虚拟网卡硬件，而是共享宿主机的内核。所谓「容器有自己的网卡」，本质是内核为它创建了一个独立的网络命名空间（network namespace），里面有一套独立的网卡、路由表、ARP 表、iptables 规则与端口空间。宿主机用一条 veth pair 把容器命名空间和主机命名空间连起来，一端插在容器里当 eth0，另一端挂在网桥上或留在主机侧做路由。CNI 插件做的事情就是把这套手工动作自动化，并按照约定把地址、网关、路由写进容器。',
        },
        {
          type: 'analogy',
          title: '一间独立办公室与一根穿墙网线',
          text: '网络命名空间像一间独立办公室，里面有自己的一台电话（网卡）、自己的通讯录（ARP 表）和自己的分机规则（iptables）。veth pair 像一根穿墙的网线：一头插在办公室墙上，另一头插在走廊的交换机上，两头必须成对存在，拔掉一头另一头也就废了。网桥就是走廊里的那台交换机，负责把同一楼层不同房间的网线接在一起。CNI 则是装修公司，按图纸把墙、线、分机一次性装好。',
        },
        {
          type: 'table',
          title: '容器网络的四件基础设施',
          columns: ['组件', '作用', '常用查看命令'],
          rows: [
            ['Network Namespace', '隔离网卡、路由、ARP、iptables 与端口空间', 'ip netns list'],
            ['veth pair', '成对虚拟网卡，连接两个命名空间', 'ip link show type veth'],
            ['Linux bridge', '二层转发，把多个 veth 接到同一广播域', 'bridge link、brctl show'],
            ['路由与 NAT', '跨网段转发、访问外网时做源地址转换', 'ip route、iptables -t nat -L'],
          ],
        },
        {
          type: 'steps',
          title: '一个容器报文离开容器的路径',
          items: [
            {
              title: '容器内查路由',
              text: '进程发出报文，命中的是命名空间内的默认路由，下一跳通常是网桥地址。',
            },
            {
              title: '进入 veth 对端',
              text: '报文从容器 eth0 发出，立刻从宿主机侧同名 veth 的另一端出现。',
            },
            {
              title: '网桥查表转发',
              text: '网桥根据目的 MAC 查 FDB，决定从哪个端口送出，或交给主机三层处理。',
            },
            {
              title: '主机路由或 NAT',
              text: '跨主机流量走主机路由与隧道；出公网时由 iptables 做 MASQUERADE 改写源地址。',
            },
          ],
        },
        {
          type: 'code',
          title: '手工用命名空间、veth 与网桥模拟容器网络',
          lang: 'bash',
          code: `ip netns add ns1
ip link add veth1 type veth peer name veth1-peer
ip link set veth1 netns ns1
ip link add br0 type bridge
ip link set br0 up
ip link set veth1-peer master br0
ip link set veth1-peer up
ip netns exec ns1 ip link set lo up
ip netns exec ns1 ip link set veth1 up
ip netns exec ns1 ip addr add 172.20.0.2/24 dev veth1
ip netns exec ns1 ip route add default via 172.20.0.1
ip addr add 172.20.0.1/24 dev br0
ip netns exec ns1 ping -c 2 172.20.0.1`,
        },
        {
          type: 'output',
          title: '验证命名空间内的地址与连通性',
          text: `$ ip netns exec ns1 ip addr show veth1
3: veth1@if4: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
    inet 172.20.0.2/24 scope global veth1
       valid_lft forever preferred_lft forever

$ ip netns exec ns1 ping -c 2 172.20.0.1
64 bytes from 172.20.0.1: icmp_seq=1 ttl=64 time=0.061 ms
64 bytes from 172.20.0.1: icmp_seq=2 ttl=64 time=0.064 ms
2 packets transmitted, 2 received, 0% packet loss`,
        },
        {
          type: 'paragraph',
          text: '手工搭完这套链路，就能理解 CNI 的输入输出：它拿到容器运行时传来的网络命名空间路径、容器 ID 与网卡名，按配置创建 veth、分配地址、写路由，最后把结果以 JSON 返回给运行时。不同插件的差别只在于「地址从哪里来、跨主机怎么通」：有的用网桥加路由，有的用 Overlay 隧道，有的直接挂到云上弹性网卡。CNI 本身不规定转发实现，只规定调用契约。',
        },
        {
          type: 'code',
          title: '查看 CNI 配置与已分配地址',
          lang: 'bash',
          code: `ls /etc/cni/net.d/
cat /etc/cni/net.d/10-calico.conflist
ip -n <netns> addr
kubectl get pods -A -o wide
kubectl get ipamblocks.crd.projectcalico.org`,
        },
        {
          type: 'warning',
          title: '容器不通，先分清是「没网卡」还是「不通路」',
          text: '如果容器里连 eth0 都没有，问题在 CNI 调用阶段：插件二进制缺失、配置 JSON 语法错误、IPAM 地址池耗尽，都会让 Pod 卡在 ContainerCreating。如果有地址但 ping 不通网关，问题在 veth、网桥或路由：veth 一端没 up、网桥没接上、容器路由写错、宿主机开了反向路径过滤。再往外不通，才轮到跨主机隧道、安全组或 NetworkPolicy。分层看现象，比一上来就抓包快得多。',
        },
        {
          type: 'tip',
          title: '用「同 Pod、同节点、跨节点」三跳定位',
          text: '同一 Pod 内两个容器通过 localhost 互通，验证的是共享命名空间；同一节点两个 Pod 互通，验证的是网桥与本地路由；跨节点 Pod 互通，验证的是隧道、Underlay 路由与 MTU。三跳逐一确认，能迅速把故障压缩到一个确定层面，避免在 Kubernetes 与 Linux 网络之间来回猜。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm18-l02',
      moduleId: 'm18',
      title: 'Kubernetes 网络模型：Pod、Service、Ingress 与 CoreDNS',
      depth: '熟悉',
      minutes: 34,
      summary: '每个 Pod 一个 IP 且可直通，Service 用虚拟 IP 做负载均衡，Ingress 把七层流量收进集群。',
      objectives: [
        '说明 Kubernetes 网络模型的三条基本约定',
        '解释 ClusterIP、NodePort、LoadBalancer 与 Ingress 的适用边界',
        '用 YAML 部署应用并通过 Service、Ingress 与 CoreDNS 完成访问验证',
      ],
      keywords: ['Pod', 'Service', 'ClusterIP', 'Ingress', 'CoreDNS', 'Endpoint'],
      blocks: [
        {
          type: 'paragraph',
          text: 'Kubernetes 的网络模型只有三条约定：每个 Pod 拥有集群内唯一的 IP；所有 Pod 之间可以直接通信，不需要 NAT；节点上的代理（kubelet、容器运行时）能与该节点所有 Pod 通信。满足这三条，应用就可以像在同一个二层网络里一样互相访问。但 Pod IP 会随重建变化，于是有了 Service：它用一组虚拟 IP 与端口提供稳定入口，由 kube-proxy 或 eBPF 把流量负载到后端 Endpoint。再往外，Ingress 用域名与路径把七层请求分发到不同 Service。',
        },
        {
          type: 'analogy',
          title: '工位、总机与前台',
          text: 'Pod 像一个个工位，工位号（Pod IP）会随着人员调整而变化；Service 像公司总机号码，打总机永远能找到当前在岗的人，至于转到哪个分机由总机决定；Ingress 像一楼前台，先看访客要找哪个部门、走哪个门，再把请求带到对应的总机。CoreDNS 则是公司通讯录，把「财务部」这个名字翻译成总机号码。',
        },
        {
          type: 'table',
          title: '四种暴露方式的边界',
          columns: ['类型', '工作层次', '访问来源', '典型用途'],
          rows: [
            ['ClusterIP', '四层，虚拟 IP', '集群内部', '服务间调用，默认类型'],
            ['NodePort', '四层，节点端口', '集群外部经节点 IP', '临时调试、无负载均衡器时'],
            ['LoadBalancer', '四层，云负载均衡', '公网或内网', '生产入口，依赖云厂商实现'],
            ['Ingress', '七层，HTTP/HTTPS', '集群外部', '按域名与路径分发，统一证书'],
          ],
        },
        {
          type: 'table',
          title: 'Service 转发链路中的关键对象',
          columns: ['对象', '作用', '排障关注点'],
          rows: [
            ['Service', '定义虚拟 IP、端口与选择器', 'selector 是否匹配 Pod 标签'],
            ['EndpointSlice', '记录就绪后端地址与端口', '是否为空、端口是否写错'],
            ['kube-proxy 或 eBPF', '实现虚拟 IP 到后端的转发', '规则是否下发、模式是否一致'],
            ['CoreDNS', '集群内域名解析', 'Pod 的 resolv.conf 与 DNS 服务是否可达'],
          ],
        },
        {
          type: 'code',
          title: '部署应用并创建 Service 与 Ingress',
          lang: 'yaml',
          code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: demo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: nginx:1.25
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: web-svc
  namespace: demo
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ing
  namespace: demo
spec:
  ingressClassName: nginx
  rules:
    - host: web.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-svc
                port:
                  number: 80`,
        },
        {
          type: 'code',
          title: '逐层验证访问链路',
          lang: 'bash',
          code: `kubectl -n demo get deploy,po,svc,ingress
kubectl -n demo get endpointslices
kubectl -n demo run tmp --rm -it --image=busybox:1.36 -- sh
# 容器内执行
nslookup web-svc.demo.svc.cluster.local
wget -qO- http://web-svc.demo/
wget -qO- http://web.example.com/ --header="Host: web.example.com"`,
        },
        {
          type: 'output',
          title: '查看 Service 与后端端点',
          text: `$ kubectl -n demo get svc web-svc
NAME      TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
web-svc   ClusterIP   10.96.18.204   <none>        80/TCP    6m

$ kubectl -n demo get endpointslices
NAME            ADDRESSTYPE   PORTS   ENDPOINTS                     AGE
web-svc-abc12   IPv4          80      10.244.1.7,10.244.2.5         6m`,
        },
        {
          type: 'warning',
          title: 'Endpoints 为空，先查标签而不是查网络',
          text: 'Service 访问不通时，第一步看 EndpointSlice 是否为空。为空几乎只有三类原因：selector 与 Pod 标签不一致、Pod 未就绪（探针失败或镜像拉取失败）、端口名或 targetPort 写错。端点存在但仍不通，再检查 NetworkPolicy、kube-proxy 规则与节点转发。另一个高频问题是 CoreDNS：Pod 的 /etc/resolv.conf 指向的集群 DNS 不可达，表现为「IP 能通、域名不通」，此时要先确认 DNS Service 的端点与 NetworkPolicy 是否放通 UDP 53。',
        },
        {
          type: 'tip',
          title: 'Ingress 只是规则，控制器才是入口',
          text: '创建 Ingress 资源不会自动生成入口，必须有 Ingress Controller 在跑，并且 ingressClassName 要对得上。控制器通常以 LoadBalancer 或 NodePort 的 Service 暴露，云上还会绑定负载均衡实例。排障顺序是：控制器 Pod 是否就绪、Ingress 是否被控制器接管、后端 Service 端点是否正常、证书与域名是否匹配，最后才看外部 DNS 与安全组。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm18-l03',
      moduleId: 'm18',
      title: 'CNI 实现对比：Calico、Cilium eBPF 与 VPC-CNI',
      depth: '精通',
      minutes: 36,
      summary: '三种 CNI 代表三条路：路由加策略、eBPF 加身份、直接挂云网卡，转发路径决定性能与排障方式。',
      objectives: [
        '比较 Calico、Cilium 与 VPC-CNI 的数据面实现与地址管理方式',
        '根据规模、性能与云环境选择合适的 CNI 方案',
        '用命令行确认集群正在使用的 CNI 及其运行状态',
      ],
      keywords: ['Calico', 'Cilium', 'eBPF', 'VPC-CNI', 'IPAM', 'Overlay'],
      blocks: [
        {
          type: 'paragraph',
          text: 'CNI 只规定「怎么给 Pod 配网」，具体怎么转发由插件决定，这也造成了排障方式的巨大差异。Calico 默认用 BGP 在节点间宣告 Pod 网段，走原生三层路由，跨节点不加封装；也可以开 IP-in-IP 或 VXLAN 适应不支持 BGP 的底层网络。Cilium 把转发、负载均衡与策略编译成 eBPF 程序挂在内核钩子上，绕开 iptables 长链，Service 与 NetworkPolicy 都在内核态完成。VPC-CNI 则让 Pod 直接使用云上弹性网卡或辅助 IP，报文走云网络本身，不需要 Overlay。',
        },
        {
          type: 'analogy',
          title: '自建小路、智能红绿灯与市政道路',
          text: 'Calico 像在小区之间自建小路，并互相告知「我家住哪」，路线直接但需要自己维护路况；Cilium 像在路口装了可编程红绿灯，所有车流按实时规则放行，效率高但规则本身要有人会写；VPC-CNI 像直接接入市政道路，不用自己修路，但能拿到多少车道由云平台配额决定。三种方式都能到家，成本、可控性与上限完全不同。',
        },
        {
          type: 'table',
          title: '三种 CNI 的实现对比',
          columns: ['维度', 'Calico', 'Cilium', 'VPC-CNI'],
          rows: [
            ['数据面', 'Linux 路由、BGP，可选 IP-in-IP/VXLAN', 'eBPF 程序，可选隧道或原生路由', '云上弹性网卡或辅助 IP，走 VPC 网络'],
            ['地址管理', '自建 IPAM，按节点分配地址块', '自建或云 IPAM，按节点分配', '由云平台网卡与子网分配'],
            ['跨节点封装', '默认可不封装，也可开隧道', '可配置，支持原生路由模式', '无 Overlay 封装'],
            ['策略能力', 'NetworkPolicy 与全局策略', 'NetworkPolicy、七层策略与身份识别', '依赖云安全组与 CNI 策略能力'],
            ['主要约束', '底层需允许 BGP 或封装', '内核版本与 eBPF 特性要求高', '网卡与 IP 配额、子网容量'],
          ],
        },
        {
          type: 'paragraph',
          text: '选择的关键不是「哪个更先进」，而是底层网络能给什么。自建 IDC 且网络可控，Calico 的纯三层方案简单直接；规模大、Service 数量多、对时延与策略粒度要求高，Cilium 的 eBPF 能显著减少 iptables 规则膨胀；公有云上希望 Pod 与 VPC 内其他资源同网段互通、并能复用安全组，VPC-CNI 更自然，但要提前算清子网与网卡配额。',
        },
        {
          type: 'code',
          title: '确认集群的 CNI 与运行状态',
          lang: 'bash',
          code: `kubectl get pods -n kube-system -o wide
kubectl get daemonset -n kube-system
kubectl get pods -n kube-system -l k8s-app=calico-node
kubectl get pods -n kube-system -l k8s-app=cilium
cilium status --wait
cilium endpoint list
calicoctl node status`,
        },
        {
          type: 'output',
          title: 'Cilium 与 Calico 的状态输出示例',
          text: `$ cilium status
    /¯¯\\
 /¯¯\\__/¯¯\\    Cilium:         OK
 \\__/¯¯\\__/    Operator:       OK
    \\__/       Hubble:         OK
KubeProxyReplacement:   True
Routing:                Native

$ calicoctl node status
Calico process is running.
IPv4 BGP status
+--------------+-------------------+-------+----------+-------------+
| PEER ADDRESS |     PEER TYPE     | STATE |  SINCE   |    INFO     |
+--------------+-------------------+-------+----------+-------------+
| 10.10.1.2    | node-to-node mesh | up    | 09:12:41 | Established |
+--------------+-------------------+-------+----------+-------------+`,
        },
        {
          type: 'warning',
          title: '换 CNI 不是换个镜像那么简单',
          text: 'CNI 决定 Pod 地址段、转发方式与策略语义，切换意味着重建集群网络：已运行的 Pod 地址会变，NodePort 与 Service 规则要重算，NetworkPolicy 的语义也可能不同。生产环境不要在同一集群里混装两套 CNI，否则路由与策略互相覆盖，故障极难定位。升级前必须确认内核版本、云平台网卡配额与子网剩余地址，并准备回滚方案。',
        },
        {
          type: 'tip',
          title: '先看封装开销，再谈性能数字',
          text: 'Overlay 会在每个报文外再加几十字节，MTU 没相应调小就会出现「小包通、大包丢」。Calico 的 IP-in-IP、VXLAN 与 Cilium 的隧道模式都有这个问题；原生路由与 VPC-CNI 没有封装开销，但依赖底层网络的可达性。评估性能时，先确认转发模式与 MTU，再比较吞吐与时延，否则测出来的差异可能只是配置不同。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm18-l04',
      moduleId: 'm18',
      title: 'NetworkPolicy 与服务网格：东西向流量治理',
      depth: '精通',
      minutes: 34,
      summary: 'NetworkPolicy 管四层可达性，服务网格管身份、加密与七层治理，两者互补而不替代。',
      objectives: [
        '编写默认拒绝、DNS 放通与按标签放行的 NetworkPolicy',
        '说明 NetworkPolicy 的叠加逻辑与常见失效原因',
        '区分 NetworkPolicy 与服务网格在东西向治理中的职责',
      ],
      keywords: ['NetworkPolicy', '服务网格', 'mTLS', '东西向流量', 'Sidecar'],
      blocks: [
        {
          type: 'paragraph',
          text: '东西向流量是集群内部服务之间的调用，数量大、变化快，靠手工开防火墙不现实。Kubernetes 提供 NetworkPolicy：以 Pod 标签选择器描述「谁可以访问谁、走哪个端口」，由 CNI 插件翻译成底层规则。它工作在三四层，只回答「能不能通」，不关心 HTTP 方法、路径或调用身份。服务网格则把代理（Sidecar 或节点代理）放进调用链，提供双向 TLS、身份认证、七层路由、重试与熔断，回答「以什么身份、按什么规则通」。',
        },
        {
          type: 'analogy',
          title: '门禁与访客登记',
          text: 'NetworkPolicy 像楼宇门禁：只允许工牌属于某部门的人进某层，规则简单、执行在门口。服务网格像访客登记加全程陪同：不仅看你是谁，还要验证证件真伪、记录你去了哪、能待多久，必要时按事由改道。门禁挡不住内部人刷卡后乱走，登记也替代不了门禁，两者叠起来才是完整的访问控制。',
        },
        {
          type: 'table',
          title: '三层治理手段的分工',
          columns: ['手段', '作用层次', '能回答的问题', '不能解决的问题'],
          rows: [
            ['云安全组', '三层四层，实例或网卡级', '哪些地址与端口能进出', 'Pod 标签变化、服务身份'],
            ['NetworkPolicy', '三层四层，Pod 标签级', '哪些 Pod 能访问哪些 Pod 与端口', '七层路径、加密与调用身份'],
            ['服务网格', '四层到七层，代理级', '谁在调用、是否加密、如何分流与重试', '底层网络可达性与节点级隔离'],
          ],
        },
        {
          type: 'code',
          title: '默认双向拒绝，再按标签放通前端到后端与 DNS',
          lang: 'yaml',
          code: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: demo
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-web-from-front
  namespace: demo
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: front
      ports:
        - protocol: TCP
          port: 80
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-front-egress-web
  namespace: demo
spec:
  podSelector:
    matchLabels:
      app: front
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: web
      ports:
        - protocol: TCP
          port: 80
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: demo
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53`,
        },
        {
          type: 'code',
          title: '应用并查看策略',
          lang: 'bash',
          code: `kubectl apply -f netpol.yaml
kubectl -n demo get networkpolicy
kubectl -n demo describe networkpolicy allow-web-from-front
kubectl -n demo exec deploy/front -- wget -qO- --timeout=2 http://web-svc.demo/
kubectl -n demo exec deploy/other -- wget -qO- --timeout=2 http://web-svc.demo/`,
        },
        {
          type: 'output',
          title: '验证放通与拒绝的对照结果',
          text: `$ kubectl -n demo exec deploy/front -- wget -qO- --timeout=2 http://web-svc.demo/
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>

$ kubectl -n demo exec deploy/other -- wget -qO- --timeout=2 http://web-svc.demo/
wget: download timed out`,
        },
        {
          type: 'warning',
          title: '策略写了不生效，先确认 CNI 是否支持',
          text: 'NetworkPolicy 只是 API 对象，必须由 CNI 实现。使用不支持策略的插件时，对象能创建成功但没有任何效果，这是最隐蔽的坑。其次检查命名空间与 podSelector：空选择器表示本命名空间全部 Pod，不是全部命名空间；from 中 podSelector 与 namespaceSelector 写在同一项是「且」，写成两个列表项才是「或」。最后别忘了默认拒绝后要放通 DNS，否则应用表现为启动超时而不是连接被拒。',
        },
        {
          type: 'tip',
          title: '先默认拒绝，再逐条放通，最后看审计',
          text: '生产集群建议先对关键命名空间开启入向默认拒绝，再按调用关系逐条放通，每加一条就用真实请求验证。策略稳定后开启流量审计或服务网格的可视化，观察是否还有未预期的调用。直接照搬一份「全能放通」策略，看起来省事，实际等于把风险留到下一次故障。',
        },
        {
          type: 'steps',
          title: '实践任务：在测试集群完成一次东西向治理',
          items: [
            {
              title: '准备环境',
              text: '用 kind 或 minikube 建一个测试集群，确认 CNI 支持 NetworkPolicy，创建 demo 命名空间并部署 front、web、other 三个工作负载。',
            },
            {
              title: '建立基线',
              text: '在未加策略时分别从 front 与 other 访问 web-svc，记录两者都能成功的基线结果。',
            },
            {
              title: '默认拒绝',
              text: '应用 default-deny-all 与 allow-dns-egress，观察 front 与 other 的访问同时变为超时，确认双向策略都已生效。',
            },
            {
              title: '精确放通',
              text: '应用 allow-web-from-front 与 allow-front-egress-web，只允许带 app=front 标签的 Pod 与 web 的 80 端口双向通信，再次对照验证。',
            },
            {
              title: '叠加与回滚',
              text: '修改 front 的标签使其不再匹配，观察访问被拒绝；恢复标签后重新放通，最后删除策略回到基线。',
            },
          ],
        },
        {
          type: 'checklist',
          title: '验证清单',
          items: [
            'kubectl get networkpolicy 能看到四条策略，且命名空间与选择器正确',
            'front 访问 web-svc 返回 200，other 访问超时，二者形成对照',
            '删除 allow-dns-egress 后 front 域名解析失败，按 IP 访问仍通，恢复后域名访问成功',
            '确认集群 CNI 支持 NetworkPolicy，describe 中策略选择器与预期一致',
            '服务网格未启用时，策略只做四层控制，不承担加密与身份认证',
          ],
        },
        {
          type: 'paragraph',
          text: '最后要把边界说清楚：NetworkPolicy 不是加密手段，也不是身份认证；服务网格不负责底层可达性，Sidecar 注入失败或端口未纳管时策略会「看起来生效其实绕过」。传统网络里的 ACL 与防火墙经验可以迁移，但对象从 IP 与端口变成了标签与身份，验证方式也从看配置变成看真实请求结果。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
