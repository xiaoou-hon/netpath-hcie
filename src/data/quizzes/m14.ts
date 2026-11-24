import type { QuizQuestion } from '@/types';

const list: QuizQuestion[] = [
  {
    id: 'q-m14-01',
    moduleId: 'm14',
    lessonId: 'm14-l01',
    type: 'single',
    depth: '了解',
    question: '目前园区网与运营商网络中最主流的 QoS 模型是哪一个？',
    options: ['Best-Effort 尽力而为模型', 'IntServ 综合服务模型', 'DiffServ 区分服务模型', 'FIFO 单队列模型'],
    answer: [2],
    explanation:
      'DiffServ 在网络边缘对报文分类并标记 DSCP，核心设备只按逐跳行为 PHB 处理，不必为每条流预留资源，因此扩展性好、部署简单，成为主流方案。IntServ 依靠 RSVP 逐流预留，设备需维护大量状态，难以在大网扩展；Best-Effort 与 FIFO 不提供任何区分服务，无法保障关键业务。',
  },
  {
    id: 'q-m14-02',
    moduleId: 'm14',
    lessonId: 'm14-l01',
    type: 'multiple',
    depth: '熟悉',
    question: '关于 QoS 的分类与标记，下列说法正确的有哪些？',
    options: [
      '简单流分类可基于 DSCP、802.1p 优先级等报文头字段',
      '复杂流分类可基于五元组、ACL 等组合条件',
      'DSCP 位于 IPv4 报文的 ToS 字段中，占 6 bit',
      '标记的作用是让下游设备无需重复深度分析即可识别业务优先级',
    ],
    answer: [0, 1, 2, 3],
    explanation:
      '简单流分类只检查报文头固定字段，速度快、开销小，适合部署在核心；复杂流分类用 ACL 匹配五元组甚至应用特征，通常放在网络边缘做一次识别。DSCP 取 ToS 字段前 6 bit，可表达 64 个等级，如 EF、AF、BE。标记把分类结果携带到下游，避免逐跳重复识别，这正是 DiffServ 可扩展的基础。',
  },
  {
    id: 'q-m14-03',
    moduleId: 'm14',
    lessonId: 'm14-l02',
    type: 'single',
    depth: '精通',
    question: '拥塞管理与拥塞避免的核心区别是什么？',
    options: [
      '拥塞管理通过队列调度决定先发谁，拥塞避免在队列满之前主动丢弃部分报文',
      '拥塞管理负责丢弃报文，拥塞避免负责调度队列',
      '两者都只在接口入方向生效',
      '两者完全等价，只是名称不同',
    ],
    answer: [0],
    explanation:
      '拥塞管理发生在出方向的排队调度环节，PQ、WFQ、LLQ 等决定拥塞时哪个队列先发送；拥塞避免是 WRED 等机制，在队列接近满时按概率随机丢弃，避免尾丢弃造成 TCP 全局同步。二者配合使用：先分类入队，再用调度保证关键业务时延，用随机丢弃控制队列深度和抖动。',
  },
  {
    id: 'q-m14-04',
    moduleId: 'm14',
    lessonId: 'm14-l02',
    type: 'single',
    depth: '精通',
    question: '流量监管（Policing）与流量整形（Shaping）的关键差异是什么？',
    options: [
      '监管对超额流量直接丢弃或重标记、不缓存；整形把超额流量缓存后延迟发送，会增加时延',
      '监管会缓存超额流量，整形直接丢弃超额流量',
      '整形只能用于入方向，监管只能用于出方向',
      '两者都不会改变报文的时延与顺序',
    ],
    answer: [0],
    explanation:
      '监管用令牌桶测量速率，超额报文立即丢弃或降级标记，实现简单、不引入额外时延，常用于运营商边缘做带宽约束；整形同样使用令牌桶，但把超额报文放入缓存排队，等令牌充足再发送，因此能减少丢弃却会增加时延和抖动。语音等时延敏感业务要慎用整形，或配合 LLQ 保障。',
  },
  {
    id: 'q-m14-05',
    moduleId: 'm14',
    lessonId: 'm14-l02',
    type: 'boolean',
    depth: '熟悉',
    question:
      'PQ 采用绝对优先调度，若高优先级流量持续占满带宽，低优先级队列可能长期得不到发送机会。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      'PQ 严格按优先级从高到低发送，只有高优先级队列为空时才处理低优先级队列，因此能有效保护时延，但存在饿死风险。工程上常用 LLQ 为语音等关键业务设定带宽上限，其余队列用 WFQ 或 CBQ 按权重分配，既保证关键业务时延，又避免低优先级业务被长期压制。',
  },
  {
    id: 'q-m14-06',
    moduleId: 'm14',
    lessonId: 'm14-l03',
    type: 'single',
    depth: '熟悉',
    question: 'IGMPv3 相比 IGMPv2 最重要的增强是什么？',
    options: [
      '支持指定源过滤，报告中可携带源地址列表，用于 SSM 模型',
      '取消了查询报文',
      '把组播地址改为单播地址',
      '改用 TCP 传输以保证可靠',
    ],
    answer: [0],
    explanation:
      'IGMPv3 的报告可以携带 Include/Exclude 源列表，主机能声明"只接收来自某些源的组播"，这是 SSM 特定源组播的基础，可省去 RP 与共享树。IGMPv2 只有查询、报告和离开三类报文，无法表达源信息。IGMP 始终封装在 IP 中，没有 TCP 传输形式，也不存在把组播地址改为单播的做法。',
  },
  {
    id: 'q-m14-07',
    moduleId: 'm14',
    lessonId: 'm14-l03',
    type: 'multiple',
    depth: '熟悉',
    question: '关于 IGMP 各版本与组播地址，下列说法正确的有哪些？',
    options: [
      'IGMPv1 没有专门的离开报文，依靠查询超时感知成员离开',
      'IGMPv2 增加了离开报文和特定组查询',
      '组播地址范围是 224.0.0.0/4，239.0.0.0/8 为本地管理范围',
      '224.0.0.1 表示所有路由器',
    ],
    answer: [0, 1, 2],
    explanation:
      '224.0.0.1 是"所有主机"组，所有路由器对应 224.0.0.2，因此最后一项错误。v1 靠成员超时老化，收敛慢；v2 增加 Leave 与特定组查询以加快离开过程；v3 再引入源过滤。组播地址只能作为目的地址使用，写成源地址或用于建立 TCP 连接都是错误配置。',
  },
  {
    id: 'q-m14-08',
    moduleId: 'm14',
    lessonId: 'm14-l03',
    type: 'boolean',
    depth: '熟悉',
    question:
      'IGMP Snooping 运行在二层交换机上，通过监听 IGMP 报文建立组播转发表，避免组播报文在 VLAN 内泛洪。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      '二层交换机默认把未知组播帧当作广播在 VLAN 内泛洪，IGMP Snooping 监听主机与路由器之间的 IGMP 报文，记录端口与组播组的对应关系，只向有成员的端口转发。它不参与三层组播路由，需与 PIM、IGMP 配合。开启后还要关注路由器端口老化与查询器选举，否则可能误删表项造成断流。',
  },
  {
    id: 'q-m14-09',
    moduleId: 'm14',
    lessonId: 'm14-l04',
    type: 'single',
    depth: '精通',
    question: 'PIM-SM 中，最后一跳 DR 在什么情况下会从共享树 RPT 切换到最短路径树 SPT？',
    options: [
      '收到第一个组播数据报文后，向源方向发起 (S,G) Join，达到切换条件后剪掉共享树分支',
      '只要配置了 RP 就立即切换，无需数据触发',
      '只有组播源主动请求时才切换',
      'PIM-SM 中不存在 SPT 切换过程',
    ],
    answer: [0],
    explanation:
      'PIM-SM 先用 (*,G) 共享树把流量从 RP 拉到接收者，最后一跳 DR 收到数据后可向源发起 (S,G) Join 建立源树，当源树数据到达并满足切换条件时剪掉 RPT 分支，从而减少 RP 处的汇聚时延和路径绕行。切换由数据驱动，切换阈值可调，也可关闭以始终保持共享树结构。',
  },
  {
    id: 'q-m14-10',
    moduleId: 'm14',
    lessonId: 'm14-l04',
    type: 'single',
    depth: '精通',
    question: '组播转发中 RPF 检查失败，最可能的原因是什么？',
    options: [
      '到组播源或 RP 的单播路由与组播报文实际入接口不一致，如路由不对称',
      'IGMP 版本不一致',
      '交换机未开启 STP',
      '组播地址使用了 239 网段',
    ],
    answer: [0],
    explanation:
      'RPF 要求组播报文的入接口必须是单播路由表中到达源（SPT）或 RP（RPT）的出接口，否则直接丢弃以防环路。单播路由不对称、策略路由、隧道或链路切换导致选路变化，都会使组播从"错误"接口到达而检查失败。可用 display multicast rpf-info 查看期望接口，再与实际入接口比对。',
  },
  {
    id: 'q-m14-11',
    moduleId: 'm14',
    lessonId: 'm14-l04',
    type: 'boolean',
    depth: '精通',
    question:
      'PIM-SM 中若组播报文从非 RPF 接口到达，设备会丢弃该报文，不会为其建立转发项。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      'RPF 是组播防环的核心机制：只有从"通往源或 RP 的正确接口"到达的报文才被接受，其余一律丢弃，因此组播转发项只沿单播路由反向路径建立。排错时如果看到流量已到达接口却没有转发项，应优先核对 RPF 接口与单播路由，而不是怀疑 IGMP 成员关系或组播地址配置。',
  },
  {
    id: 'q-m14-12',
    moduleId: 'm14',
    lessonId: 'm14-l05',
    type: 'multiple',
    depth: '熟悉',
    question: '组播业务不通时，下列排查动作合理的有哪些？',
    options: [
      '检查是否存在 (*,G) 或 (S,G) 组播路由表项',
      '检查 RPF 接口与到源或 RP 的单播路由是否一致',
      '检查接收端是否已通过 IGMP 加入该组，以及二层 IGMP Snooping 表项',
      '检查 PIM 邻居是否正常、RP 是否可达',
      '直接重启所有路由器以恢复业务',
    ],
    answer: [0, 1, 2, 3],
    explanation:
      '组播排错可按"成员加入→二层转发表→PIM 邻居与 RP→组播路由表→RPF 与单播路由"的顺序逐段确认流量是否被正确复制和转发，每一步都有明确命令可查。重启设备会清空表项、丢失现场信息，可能短暂恢复却无法定位根因，是排障中最不推荐的做法。',
  },
];

export default list;
