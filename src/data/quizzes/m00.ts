import type { QuizQuestion } from '@/types';

const list: QuizQuestion[] = [
  {
    id: 'q-m00-01',
    moduleId: 'm00',
    lessonId: 'm00-l02',
    type: 'single',
    depth: '了解',
    question: '在 TCP/IP 四层模型中，IP 协议工作在哪一层？',
    options: ['应用层', '传输层', '网络层', '网络接口层'],
    answer: [2],
    explanation:
      'IP 负责逻辑寻址和逐跳转发，属于网络层。TCP、UDP 属于传输层，HTTP、DNS 等属于应用层，以太网、PPP 等属于网络接口层，这是分层排错时最基本的定位依据。',
  },
  {
    id: 'q-m00-02',
    moduleId: 'm00',
    lessonId: 'm00-l03',
    type: 'single',
    depth: '熟悉',
    question: '以太网 MTU 为 1500 字节时，TCP 的 MSS 通常是多少？',
    options: ['1500 字节', '1480 字节', '1460 字节', '1472 字节'],
    answer: [2],
    explanation:
      'MSS 是 TCP 载荷的最大长度，需要从 MTU 中扣除 20 字节 IP 头和 20 字节 TCP 头，因此为 1460 字节。1472 是 UDP 或 ICMP 场景下只扣除 IP 头得到的结果，容易被混淆。',
  },
  {
    id: 'q-m00-03',
    moduleId: 'm00',
    lessonId: 'm00-l04',
    type: 'multiple',
    depth: '熟悉',
    question: '交换机收到一个目的 MAC 不在 MAC 地址表中的单播帧时，会做哪些处理？',
    options: [
      '在同一个 VLAN 内除接收端口外的其他端口泛洪',
      '直接丢弃并回复 ICMP 不可达',
      '学习该帧的源 MAC 与入端口对应关系',
      '把该帧从接收端口原路发回',
    ],
    answer: [0, 2],
    explanation:
      '未知单播帧会在同一 VLAN 的其他端口泛洪，同时交换机会根据源 MAC 和入端口刷新 MAC 地址表。泛洪不会回送到接收端口，也不会丢弃该帧或回复 ICMP，因为交换机工作在二层。',
  },
  {
    id: 'q-m00-04',
    moduleId: 'm00',
    lessonId: 'm00-l05',
    type: 'single',
    depth: '了解',
    question: '下列应用层协议中，默认使用 UDP 53 端口的是？',
    options: ['HTTP', 'FTP', 'DNS', 'Telnet'],
    answer: [2],
    explanation:
      'DNS 查询默认使用 UDP 53，响应报文过大或区域传送时会改用 TCP 53。HTTP 使用 TCP 80，FTP 使用 TCP 21，Telnet 使用 TCP 23，它们都依赖面向连接的可靠传输。',
  },
  {
    id: 'q-m00-05',
    moduleId: 'm00',
    lessonId: 'm00-l06',
    type: 'boolean',
    depth: '熟悉',
    question: 'TCP 三次握手的第三次 ACK 除了确认服务端的 SYN，还能避免历史连接请求被误建立。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      '第三次 ACK 让服务端确认客户端确实收到了自己的 SYN+ACK，同时客户端可以通过序列号判断这是否是过期请求。缺少这一步，网络中滞留的旧 SYN 可能让服务端建立无效连接并浪费资源。',
  },
  {
    id: 'q-m00-06',
    moduleId: 'm00',
    lessonId: 'm00-l07',
    type: 'single',
    depth: '了解',
    question: 'ARP 协议的主要作用是什么？',
    options: ['把域名解析为 IP 地址', '由 IP 地址求出对应的 MAC 地址', '由 MAC 地址反查 IP 地址', '在路由器之间交换路由条目'],
    answer: [1],
    explanation:
      'ARP 用于同一广播域内根据目的 IPv4 地址解析出对应的 MAC 地址，以便封装以太网帧。域名解析由 DNS 完成，路由条目交换由路由协议完成，ARP 本身不负责跨网段转发。',
  },
  {
    id: 'q-m00-07',
    moduleId: 'm00',
    lessonId: 'm00-l06',
    type: 'multiple',
    depth: '精通',
    question: 'TCP 主动关闭方进入 TIME_WAIT 状态的原因包括哪些？',
    options: [
      '保证最后一个 ACK 能到达对端，必要时可重传',
      '等待网络中本次连接的迟到报文消散，避免影响新连接',
      '等待应用层进程主动释放端口',
      '让端口可以立即被新的连接复用',
    ],
    answer: [0, 1],
    explanation:
      'TIME_WAIT 持续 2MSL，一是让主动关闭方在最后一个 ACK 丢失时能够重发，二是让链路上残留的旧报文自然消亡。它不会让端口立即复用，反而会短暂占用端口，因此高并发短连接场景要评估端口耗尽风险。',
  },
  {
    id: 'q-m00-08',
    moduleId: 'm00',
    lessonId: 'm00-l08',
    type: 'single',
    depth: '熟悉',
    question: '用户能 ping 通网站的 IP，但浏览器打不开网页，最应该优先怀疑什么？',
    options: ['DNS 解析异常', '网线没有插好', '本机默认网关配置错误', '交换机端口被关闭'],
    answer: [0],
    explanation:
      '能 ping 通 IP 说明物理链路、IP 地址、网关和路由基本正常，问题更可能出在域名解析或应用层端口。应先用 nslookup 检查域名解析结果，再确认 80/443 端口与代理设置，避免盲目更换网线。',
  },
  {
    id: 'q-m00-09',
    moduleId: 'm00',
    lessonId: 'm00-l01',
    type: 'single',
    depth: '熟悉',
    question: '访问网页感觉明显卡顿，但链路带宽利用率很低，最应优先排查什么？',
    options: ['链路带宽是否不足', '时延、抖动和丢包情况', '交换机端口数量是否够用', '服务器硬盘容量是否不足'],
    answer: [1],
    explanation:
      '带宽利用率低说明瓶颈不在容量，而交互式业务对时延、抖动和丢包更敏感。可以用 ping 观察往返时延与丢包率，用 tracert 定位跳点，再结合抓包判断是否存在重传或链路质量问题。',
  },
  {
    id: 'q-m00-10',
    moduleId: 'm00',
    lessonId: 'm00-l02',
    type: 'boolean',
    depth: '熟悉',
    question: 'OSI 参考模型中的会话层和表示层，在 TCP/IP 四层模型中没有独立的对应层。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      'TCP/IP 四层模型把 OSI 的会话层、表示层和应用层合并为应用层，实际协议仍承担会话管理、编码转换等职责。理解这种映射关系有助于把 OSI 的分层思路用于 TCP/IP 网络的定位与排错。',
  },
];

export default list;
