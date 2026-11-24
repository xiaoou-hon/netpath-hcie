import type { QuizQuestion } from '@/types';

const list: QuizQuestion[] = [
  {
    id: 'q-m02-01',
    moduleId: 'm02',
    lessonId: 'm02-l05',
    type: 'single',
    depth: '熟悉',
    question: '路由表中同时存在 10.1.0.0/16 和 10.1.2.0/24，目的地址为 10.1.2.5 的报文会选择哪条路由？',
    options: ['10.1.0.0/16', '10.1.2.0/24', '两条等价负载分担', '默认路由'],
    answer: [1],
    explanation:
      '路由器进行最长匹配，10.1.2.5 同时匹配 /16 和 /24，但 /24 的前缀更长、覆盖范围更精确，因此优选 10.1.2.0/24。只有在掩码长度相同且优先级、度量值都相同时，才可能形成等价路由。',
  },
  {
    id: 'q-m02-02',
    moduleId: 'm02',
    lessonId: 'm02-l03',
    type: 'single',
    depth: '了解',
    question: '命令 ip route-static 192.168.2.0 255.255.255.0 10.0.0.2 中，10.0.0.2 表示什么？',
    options: ['目的网段', '子网掩码', '下一跳地址', '出接口名称'],
    answer: [2],
    explanation:
      '该命令依次是目的网络、子网掩码和下一跳地址，10.0.0.2 是报文交给邻居路由器的下一跳。配置前要确认下一跳与本机直连且可达，否则静态路由虽然能写入路由表，实际转发仍会失败。',
  },
  {
    id: 'q-m02-03',
    moduleId: 'm02',
    lessonId: 'm02-l01',
    type: 'multiple',
    depth: '了解',
    question: '一条路由表条目通常包含哪些关键信息？',
    options: ['目的网络与掩码', '出接口', '下一跳地址', '对端主机的 MAC 地址'],
    answer: [0, 1, 2],
    explanation:
      '路由表的核心字段包括目的网络、掩码、出接口、下一跳、优先级和度量值，用于指导报文转发。MAC 地址由 ARP 在二层解析得到，不写入路由表，因此不能把路由表和 ARP 表混为一谈。',
  },
  {
    id: 'q-m02-04',
    moduleId: 'm02',
    lessonId: 'm02-l01',
    type: 'boolean',
    depth: '熟悉',
    question: '路由表中存在到达目的网段的路由，报文就一定能成功到达目的地。',
    options: ['正确', '错误'],
    answer: [1],
    explanation:
      '路由只说明转发方向，链路状态、下一跳可达性、ACL、NAT、对端是否有回程路由都会影响最终连通性。排错时要同时检查双向路由和策略，否则容易把单向可达误判为配置正确。',
  },
  {
    id: 'q-m02-05',
    moduleId: 'm02',
    lessonId: 'm02-l04',
    type: 'single',
    depth: '熟悉',
    question: '华为设备上静态路由的默认优先级是多少？',
    options: ['10', '15', '60', '100'],
    answer: [2],
    explanation:
      '华为 VRP 中静态路由默认优先级为 60，数值越小越优先。OSPF 默认 10，IS-IS 默认 15，RIP 默认 100，BGP 默认 255。做浮动静态路由时，把备份路由的优先级调大即可让它只在主路由失效时生效。',
  },
  {
    id: 'q-m02-06',
    moduleId: 'm02',
    lessonId: 'm02-l04',
    type: 'single',
    depth: '熟悉',
    question: '默认路由 0.0.0.0/0 的含义是什么？',
    options: ['匹配所有目的地址，作为最后的选择', '只匹配 0.0.0.0 这一个主机', '只匹配本网段地址', '禁止所有流量通过'],
    answer: [0],
    explanation:
      '0.0.0.0/0 前缀长度为 0，可以匹配任意目的地址，但只有在没有更精确路由时才会被选中。它常用于出口路由器指向运营商，配置错误或双向缺失时会形成环路、黑洞或单向可达等问题。',
  },
  {
    id: 'q-m02-07',
    moduleId: 'm02',
    lessonId: 'm02-l02',
    type: 'multiple',
    depth: '熟悉',
    question: '直连路由自动生成通常需要满足哪些条件？',
    options: ['接口物理状态为 up', '接口协议状态为 up', '接口配置了 IP 地址', '必须手工配置静态路由'],
    answer: [0, 1, 2],
    explanation:
      '接口在物理层和协议层都处于 up 状态，并且配置了有效 IP 地址和掩码，设备才会生成对应的直连路由。直连路由无需手工配置，若接口被 shutdown 或地址被删除，直连路由会立即从路由表中消失。',
  },
  {
    id: 'q-m02-08',
    moduleId: 'm02',
    lessonId: 'm02-l05',
    type: 'single',
    depth: '精通',
    question: '关于 RIB 与 FIB，下列说法正确的是？',
    options: [
      'RIB 保存路由协议计算出的路由，FIB 是下发给转发平面的转发表',
      'FIB 保存所有路由协议报文，RIB 只保存直连路由',
      'RIB 与 FIB 完全无关，各自独立选路',
      'FIB 只存在于交换机，路由器没有 FIB',
    ],
    answer: [0],
    explanation:
      'RIB 是控制平面维护的路由信息库，汇总各协议路由并完成选路；优选结果下发到 FIB，供转发平面高速查表。RIB 变化后 FIB 会同步更新，二者职责不同但存在明确的联动关系。',
  },
  {
    id: 'q-m02-09',
    moduleId: 'm02',
    lessonId: 'm02-l03',
    type: 'boolean',
    depth: '熟悉',
    question: '两台路由器互联时，只在一个方向配置静态路由，双向通信仍然可以正常工作。',
    options: ['正确', '错误'],
    answer: [1],
    explanation:
      '数据通信需要往返两个方向都有路由，只配单向静态路由时，去程报文能到达，回程报文会因缺少路由而被丢弃。实际排错中常见现象是能 ping 通对端接口但业务不通，应检查两端是否都配置了回程路由。',
  },
  {
    id: 'q-m02-10',
    moduleId: 'm02',
    lessonId: 'm02-l05',
    type: 'single',
    depth: '熟悉',
    question: '在华为设备上查看目的地址 10.1.2.5 实际匹配哪条路由，应使用哪条命令？',
    options: [
      'display ip routing-table 10.1.2.5',
      'display arp 10.1.2.5',
      'display interface 10.1.2.5',
      'display ip pool 10.1.2.5',
    ],
    answer: [0],
    explanation:
      'display ip routing-table 加上目的地址，可以查看该地址最终匹配的路由及下一跳，是验证最长匹配结果的最直接方式。display arp 查看地址解析，display interface 查看接口状态，都不能用于路由匹配查询。',
  },
];

export default list;
