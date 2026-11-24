import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm14',
  code: 'M14',
  title: 'QoS 与组播',
  summary:
    '网络不只是通，还要好用：QoS 用分类、标记、队列与令牌桶给语音和视频让路；组播用 IGMP 与 PIM 让一份流量同时到达多个接收者，避免视频被复制成多份占用带宽。',
  stage: 'L3',
  order: 14,
  goals: [
    '说明 QoS 三个平面的分工与 DiffServ 模型，区分简单流分类与复杂流分类',
    '完成 DSCP 与 802.1p 的优先级映射，并用 PQ、WFQ、DRR 配置队列调度',
    '用 CAR 监管与 GTS 整形控制流量速率，说明 WRED 解决什么问题',
    '解释组播地址、组播 MAC 映射与 IGMP 各版本的差异',
    '配置 PIM-DM 与 PIM-SM，并基于 RPF 检查定位组播不通',
  ],
  keywords: [
    'QoS',
    'DiffServ',
    'DSCP',
    '802.1p',
    '队列调度',
    'WRED',
    '令牌桶',
    'IGMP Snooping',
    'PIM-SM',
    'RPF',
  ],
  lessons: [
    {
      id: 'm14-l01',
      moduleId: 'm14',
      title: 'QoS 基础：流量分类、标记与优先级',
      depth: '了解',
      minutes: 20,
      summary: 'QoS 先分类标记再调度，讲清三个平面、DiffServ 模型与优先级映射。',
      objectives: [
        '说出 QoS 管理平面、控制平面与数据平面各自的职责',
        '区分简单流分类与复杂流分类的适用位置',
        '完成 DSCP 与 802.1p 的优先级映射并在接口上信任',
      ],
      keywords: ['QoS', 'DiffServ', 'DSCP', '802.1p', '流分类', '优先级映射'],
      blocks: [
        {
          type: 'paragraph',
          text: '带宽不会因为业务重要就自动多分一点。当拥塞发生，报文在接口队列里排队，谁先出队完全取决于设备怎么调度；如果什么都不配，所有报文一视同仁，语音和视频就会和下载流量一起被丢弃。QoS 要解决的就是这件事：先给流量分类并打上标记，再在拥塞点按标记决定谁先走、谁可以被丢。业界主流做法是 DiffServ，把复杂策略推到网络边缘，核心只做简单的逐跳行为 PHB。',
        },
        {
          type: 'analogy',
          title: '机场的头等舱与快速通道',
          text: '机场不会给每位旅客配一条专属跑道，而是先在值机时按舱位和会员等级分流，发一张带等级的登机牌，安检、登机各环节只看这张牌子。分类就是值机判断，标记就是登机牌上的等级，调度就是优先通道。把判断放在入口做一次，后面所有环节都省事，这正是 DiffServ 的思路。',
        },
        {
          type: 'table',
          title: 'QoS 三个平面的分工',
          columns: ['平面', '职责', '典型实现'],
          rows: [
            ['管理平面', '配置策略、采集统计、下发与审计', '命令行、iMaster NCE、SNMP'],
            ['控制平面', '建立转发路径、向数据面下发资源预留', '路由协议、RSVP、PIM'],
            ['数据平面', '逐包分类标记、排队调度、拥塞管理与丢弃', 'ACL、队列、WRED、令牌桶'],
          ],
        },
        {
          type: 'table',
          title: '两个最常用的标记字段',
          columns: ['字段', '位置', '长度与范围', '常见取值'],
          rows: [
            ['DSCP', 'IPv4 ToS 字段前 6 位', '6 位，0 到 63', 'EF 为 46，AF41 为 34，CS6 为 48'],
            ['802.1p', 'VLAN Tag 中的 PCP', '3 位，0 到 7', '语音常用 5 或 6，普通数据为 0'],
          ],
        },
        {
          type: 'code',
          title: '定义优先级映射并在接入接口信任',
          lang: 'vrp',
          code: `diffserv domain DS_OFFICE
 ip-dscp-in 46 map phb ef
 ip-dscp-in 34 map phb af4
 ip-dscp-in 0 map phb be
quit
interface GigabitEthernet0/0/1
 trust upstream DS_OFFICE
 trust 8021p
quit`,
        },
        {
          type: 'code',
          title: '用 ACL 做复杂流分类并重标记',
          lang: 'vrp',
          code: `acl number 3000
 rule 5 permit tcp source 10.1.10.0 0.0.0.255 destination-port eq 3389
 rule 10 permit udp source 10.1.10.0 0.0.0.255 destination-port eq 5060
quit
traffic classifier VOICE operator or
 if-match acl 3000
quit
traffic behavior VOICE
 remark dscp ef
quit
traffic policy OFFICE
 classifier VOICE behavior VOICE
quit
interface GigabitEthernet0/0/1
 traffic-policy OFFICE inbound
quit`,
        },
        {
          type: 'output',
          title: '查看已下发的流策略',
          text: `<SW1> display traffic policy user-defined OFFICE
  User Defined Traffic Policy Information:
  Policy: OFFICE
  Classifier: VOICE
   Operator: OR
    Behavior: VOICE
     Marking:
      Remark DSCP ef
  Classifier: default-class
   Behavior: default-behavior`,
        },
        {
          type: 'warning',
          title: '标记只在信任边界做一次',
          text: '如果每台设备都重新标记，终端的恶意标记会被一路带到核心；如果谁都不标记，核心又无从区分。正确做法是把信任边界放在接入层：接入交换机识别终端，或对不可信终端强制重标记，汇聚与核心一律 trust 上游，不再改写。配置了 traffic-policy 又开了 trust，实际生效顺序要先确认，否则标记会被后执行的动作覆盖。',
        },
        {
          type: 'tip',
          title: '标记不等于队列',
          text: 'DSCP 只是报文头里的一个数字，它本身不会让报文变快。真正决定转发顺序的是出接口的队列调度，标记只是给调度器提供依据。常见误区是配完 remark dscp ef 就认为语音一定有保障，实际上还需要在拥塞接口上把对应队列设为 PQ 或给足带宽。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm14-l02',
      moduleId: 'm14',
      title: '队列调度、拥塞避免与流量整形/监管',
      depth: '熟悉',
      minutes: 26,
      summary: '拥塞时靠队列调度决定谁先走，靠 WRED 提前丢包，靠令牌桶把速率压到承诺值。',
      objectives: [
        '对比 PQ、WFQ 与 DRR 的调度特点与适用场景',
        '说明尾丢弃的危害以及 WRED 如何缓解全局同步',
        '用 CAR 与 GTS 分别实现入口监管和出口整形',
      ],
      keywords: ['PQ', 'WFQ', 'DRR', 'WRED', 'CAR', 'GTS'],
      blocks: [
        {
          type: 'paragraph',
          text: '接口的出队能力是固定的，入队速度一旦超过出队速度，缓存迟早被填满。设备把缓存切成多个队列，调度器决定这一刻从哪个队列取包，这就是拥塞管理；缓存快满时决定丢谁，这是拥塞避免。两者常常一起出现，但解决的问题不同：调度影响时延与带宽分配，丢弃影响吞吐与重传。',
        },
        {
          type: 'analogy',
          title: '银行窗口与排队规则',
          text: '银行只有三个窗口，客户却源源不断。PQ 像给 VIP 单开一个窗口，VIP 不断来，普通客户就一直等；WFQ 像按取号顺序并参考业务耗时分配窗口，人人都能轮到一点；DRR 像每个队列发固定数量的号，轮询一遍再发下一轮。缓存满了还硬往里塞，就是尾丢弃；看到队伍快满了先劝走一部分人，就是 WRED。',
        },
        {
          type: 'table',
          title: '三种队列调度方式',
          columns: ['方式', '调度规则', '优点', '风险'],
          rows: [
            ['PQ', '严格按优先级，高优先级队列空才服务低优先级', '时延最小，适合语音信令', '低优先级可能被饿死'],
            ['WFQ', '按权重分配带宽，权重越大获得越多', '公平，自动适应流数量', '权重规划不当会挤压关键业务'],
            ['DRR', '轮询各队列，每轮发送与权重成比例的字节数', '实现简单，无明显饿死', '大包队列会略占便宜'],
          ],
        },
        {
          type: 'table',
          title: '尾丢弃与 WRED',
          columns: ['对比项', '尾丢弃', 'WRED'],
          rows: [
            ['触发条件', '队列完全满才丢', '队列达到低限就开始按概率丢'],
            ['丢谁', '后到的全丢', '优先丢低优先级、非 TCP 友好流量'],
            ['典型问题', 'TCP 全局同步、吞吐骤降', '平滑拥塞，避免同时退避'],
            ['代价', '实现简单但不区分业务', '参数需要调优，配置更复杂'],
          ],
        },
        {
          type: 'steps',
          title: '令牌桶怎么限制速率',
          items: [
            {
              title: '桶里放令牌',
              text: '系统按 CIR 速率往桶里放令牌，桶的容量是 CBS，桶满后新令牌被丢弃。',
            },
            {
              title: '报文买票通过',
              text: '报文到达时按字节数取令牌，取得到就转发，取不到就进入下一步处理。',
            },
            {
              title: '监管是丢弃或重标记',
              text: 'CAR 在入口执行，超出承诺速率的报文直接丢弃，或降级重标记后继续转发。',
            },
            {
              title: '整形是缓存等待',
              text: 'GTS 在出口执行，超速报文先放进缓存，等令牌够了再发，代价是增加时延与抖动。',
            },
          ],
        },
        {
          type: 'code',
          title: '配置队列调度与 WRED',
          lang: 'vrp',
          code: `interface GigabitEthernet0/0/1
 qos queue 4 pq
 qos queue 0 wfq weight 10
 qos queue 1 wfq weight 20
 qos queue 2 wfq weight 30
 qos wred queue 0 low-limit 60 high-limit 80 discard-probability 20
quit`,
        },
        {
          type: 'code',
          title: '入口 CAR 监管与出口 GTS 整形',
          lang: 'vrp',
          code: `interface GigabitEthernet0/0/2
 qos car inbound cir 10240 cbs 256000
quit
interface GigabitEthernet0/0/3
 qos gts cir 2048 cbs 51200
quit`,
        },
        {
          type: 'output',
          title: '查看队列统计与丢弃',
          text: `<SW1> display qos queue statistics interface GigabitEthernet0/0/1
Queue   Passed      Discarded   Current-length
------------------------------------------------
0       1283742     2310        0
1       983421      120         0
2       421877      0           0
4       76210       0           0`,
        },
        {
          type: 'warning',
          title: '尾丢弃会引发 TCP 全局同步',
          text: '缓存满后连续丢包，所有 TCP 流几乎同时检测到丢包，同时把拥塞窗口减半，然后同时恢复，链路利用率像心电图一样上下震荡。更糟的是队头阻塞：一个低速流占住队列，后面的关键报文一起被拖慢。WRED 用随机提前丢弃打散这种同步，但它只对 TCP 有效，UDP 视频流仍需靠队列与带宽保障。',
        },
        {
          type: 'tip',
          title: '监管放在入口，整形放在出口',
          text: '监管的语义是「超过承诺就惩罚」，适合运营商或企业边缘限制用户超额使用，动作要快、要能立刻生效；整形的语义是「先攒着慢慢发」，适合出口向运营商线路整形，避免上游设备直接丢包。整形一定增加时延，语音链路不要把 CIR 压得太低。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm14-l03',
      moduleId: 'm14',
      title: '组播基础：组播地址、IGMP 与组播组管理',
      depth: '熟悉',
      minutes: 24,
      summary: '组播用 D 类地址标识一组接收者，IGMP 管理加入，Snooping 抑制二层泛洪。',
      objectives: [
        '说明 224.0.0.0/4 的地址划分与永久组地址的用途',
        '解释组播 IP 到 01:00:5e 开头的组播 MAC 的映射规则',
        '对比 IGMPv1、v2、v3 的差异并配置 IGMP Snooping',
      ],
      keywords: ['组播地址', '224.0.0.0/4', 'IGMP', 'IGMP Snooping', '组播 MAC'],
      blocks: [
        {
          type: 'paragraph',
          text: '单播是一对一，一份内容要发给一千个用户就得复制一千份；广播是一对全城，没需求的人也被打扰。组播是一对多：源只发一份，网络在分叉点按需复制，只有真正加入组的接收者才收到。IPv4 用 D 类地址标识组播组，范围是 224.0.0.0/4，即 224.0.0.0 到 239.255.255.255。地址只标识「一组人」，不标识某一台主机。',
        },
        {
          type: 'analogy',
          title: '电视直播与挨个打电话',
          text: '单播像给每位观众单独打一通电话念新闻，人越多越忙；广播像拿大喇叭对整栋楼喊，不需要的人也被迫听；组播像电视台发射信号，只有把频道调到这个台的家庭才看到画面。IGMP 就是观众打电话到电视台说「我要看这个台」或「我不看了」，电视台据此决定把信号送到哪些小区。',
        },
        {
          type: 'table',
          title: '必须记住的组播地址',
          columns: ['地址', '含义', '说明'],
          rows: [
            ['224.0.0.1', '所有主机', '本网段所有支持组播的主机与路由器都监听'],
            ['224.0.0.2', '所有路由器', '本网段所有组播路由器监听'],
            ['224.0.0.5 / 6', 'OSPF', '分别对应 OSPF 的 AllSPFRouters 与 AllDRouters'],
            ['224.0.0.13', 'PIM', '所有 PIM 路由器监听，用于建立邻居'],
            ['239.0.0.0/8', '私网组播', '类似私网地址，可在企业内部自由规划'],
          ],
        },
        {
          type: 'table',
          title: '组播 MAC 的映射规则',
          columns: ['步骤', '做法', '示例'],
          rows: [
            ['固定前缀', '前 24 位固定为 01:00:5e', '01:00:5e'],
            ['取 IP 低 23 位', '组播 IP 的后 23 位直接填入', '224.1.1.1 取 1.1.1'],
            ['得到 MAC', '前缀加低 23 位', '01:00:5e:01:01:01'],
            ['地址冲突', '32 个组播 IP 映射到同一 MAC', '224.1.1.1 与 225.1.1.1 相同'],
          ],
        },
        {
          type: 'steps',
          title: 'IGMP 三个版本的演进',
          items: [
            {
              title: 'IGMPv1',
              text: '只有查询与报告，主机加入后路由器靠查询周期确认，离开只能等超时，收敛慢。',
            },
            {
              title: 'IGMPv2',
              text: '增加 Leave 报文与特定组查询，离开时可以立即确认是否还有成员，收敛从分钟级降到秒级。',
            },
            {
              title: 'IGMPv3',
              text: '支持指定源过滤，主机可以声明只接收某些源的流量，为 SSM 提供基础，安全性更好。',
            },
          ],
        },
        {
          type: 'code',
          title: '配置 IGMP 与二层 IGMP Snooping',
          lang: 'vrp',
          code: `multicast routing-enable
interface GigabitEthernet0/0/0
 igmp enable
 igmp version 3
quit
igmp-snooping enable
vlan 10
 igmp-snooping enable
 igmp-snooping version 3
quit`,
        },
        {
          type: 'output',
          title: '查看组播组与 Snooping 表项',
          text: `<SW1> display igmp group
IGMP group total 2
Group Address   Interface         UpTime    Expires  Last Reporter
239.1.1.1       GE0/0/0           00:12:31  00:02:09 10.1.10.20
239.1.1.2       GE0/0/0           00:03:08  00:01:52 10.1.10.31

<SW1> display igmp-snooping group vlan 10
VLAN 10, 2 groups
Group Address   MAC Address        Host Port
239.1.1.1       01:00:5e:01:01:01  GE0/0/2
239.1.1.2       01:00:5e:01:01:02  GE0/0/3`,
        },
        {
          type: 'warning',
          title: '组播 MAC 不唯一，二层只能靠泛洪兜底',
          text: '组播 MAC 只用了 IP 后 23 位，32 个 IP 共用同一个 MAC，交换机无法仅凭 MAC 区分是哪个组。如果没开 IGMP Snooping，组播报文会在 VLAN 内泛洪，等于把组播用成了广播，接入带宽被迅速占满。开了 Snooping 还要确认查询器存在，否则表项会老化后重新泛洪。',
        },
        {
          type: 'tip',
          title: '业务组播不要用 224.0.0.0/24',
          text: '224.0.0.0/24 是链路本地范围，TTL 为 1，路由器不会转发，适合协议自身使用。企业 IPTV、视频会议应规划在 239.0.0.0/8 私网范围，并与单播地址一样写进地址规范，避免与协议地址或其它业务冲突。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm14-l04',
      moduleId: 'm14',
      title: 'PIM-DM、PIM-SM 与 RPF 检查',
      depth: '精通',
      minutes: 28,
      summary: 'PIM-DM 先扩散再剪枝，PIM-SM 先登记 RP 再按需建树，都依赖 RPF。',
      objectives: [
        '说明 PIM-DM 的扩散与剪枝过程以及它的适用规模',
        '描述 PIM-SM 的 RPT、SPT 切换与 RP 的作用',
        '用 display pim neighbor 与 display pim routing-table 定位 RPF 失败',
      ],
      keywords: ['PIM-DM', 'PIM-SM', 'RP', 'RPT', 'SPT', 'RPF'],
      blocks: [
        {
          type: 'paragraph',
          text: 'IGMP 只解决主机与本地路由器之间的加入关系，跨网段还要有组播路由协议。PIM 独立于单播路由协议，但它不看自己的拓扑表，而是借用单播路由表判断「去往组播源的方向是哪条路」，这个判断就是 RPF。报文只有从 RPF 接口进入才被接受，否则丢弃，这样组播转发天然无环。PIM 有两个常用模式：DM 先扩散再剪枝，SM 先登记再按需加入。',
        },
        {
          type: 'analogy',
          title: '发传单与物业登记',
          text: 'PIM-DM 像往整栋楼每户都塞一张传单，塞完再逐层回访：没人要的楼层下次不发了。人少时很直接，人多时前期浪费严重。PIM-SM 像先在物业登记一个意向表，只有报名的住户才会收到，物业就是 RP：源把内容送到物业，接收者向物业报名，物业再通知源把内容送过来。',
        },
        {
          type: 'table',
          title: 'PIM-DM 与 PIM-SM 对比',
          columns: ['维度', 'PIM-DM', 'PIM-SM'],
          rows: [
            ['建树方式', '推模式，先扩散后剪枝', '拉模式，接收者加入才建分支'],
            ['转发路径', '源到接收者的最短路径树 SPT', '默认共享树 RPT，可切换到 SPT'],
            ['关键角色', '不需要 RP', '需要 RP 作为共享树的根'],
            ['适用场景', '成员密集、网络规模小', '成员稀疏、大规模网络'],
            ['前期开销', '全网络泛洪，浪费带宽', '注册与加入报文，开销可控'],
          ],
        },
        {
          type: 'steps',
          title: 'PIM-SM 建树的四个阶段',
          items: [
            {
              title: '接收者加入 RPT',
              text: '最后一跳路由器收到 IGMP 报告，向 RP 发送 (*,G) 加入，沿途形成共享树 RPT。',
            },
            {
              title: '源向 RP 注册',
              text: '源开始发送后，DR 把组播报文封装成 Register 单播发给 RP，RP 由此知道源在哪里。',
            },
            {
              title: 'RP 向源建分支',
              text: 'RP 向源发送 (S,G) 加入，形成源到 RP 的 SPT 分支，随后数据沿 RPT 下发。',
            },
            {
              title: '切换最短路径树',
              text: '最后一跳路由器发现源地址更近，发送 (S,G) 加入并在收到数据后剪掉 RPT 分支，完成 SPT 切换。',
            },
          ],
        },
        {
          type: 'kv',
          items: [
            { label: 'RP', value: '共享树的根，负责汇聚源与接收者，必须全网一致' },
            { label: 'BSR', value: '动态收集 RP 信息并泛洪，C-BSR 优先级高者当选' },
            { label: '静态 RP', value: '手工指定，简单可靠，适合小型或边界清晰的网络' },
            { label: 'DR', value: '共享网段中负责发起注册与加入的路由器，优先级高或地址大者当选' },
          ],
        },
        {
          type: 'code',
          title: '配置 PIM-SM 与静态 RP',
          lang: 'vrp',
          code: `multicast routing-enable
pim
 static-rp 10.1.1.1
quit
interface GigabitEthernet0/0/0
 pim sm
quit
interface GigabitEthernet0/0/1
 pim sm
quit`,
        },
        {
          type: 'output',
          title: '查看 PIM 邻居',
          text: `<R1> display pim neighbor
Total Number of Neighbors = 2
Neighbor        Interface       Uptime   Expires  Dr-Priority  Mode
10.1.2.2        GE0/0/1         02:14:33 00:01:22 1            S
10.1.3.2        GE0/0/2         01:48:10 00:01:30 1            S`,
        },
        {
          type: 'output',
          title: '查看组播路由表与 RPF 信息',
          text: `<R1> display pim routing-table
Total 1 (*, G) entry, 1 (S, G) entry

(*, G) (239.1.1.1, 0.0.0.0)
     RP: 10.1.1.1
     Upstream interface: GE0/0/1
     Downstream interface: GE0/0/2
(S, G) (239.1.1.1, 10.10.10.10)
     Upstream interface: GE0/0/0
     RPF neighbor: 10.1.2.2
     Downstream interface: GE0/0/2`,
        },
        {
          type: 'warning',
          title: 'RPF 失败是组播不通的头号原因',
          text: '组播报文从非 RPF 接口进入会被直接丢弃，现象是「IGMP 有成员、组播路由表也有条目，但接收者收不到」。常见原因有三类：去往源的单播路由走了另一条链路；上游接口被 ACL 或策略路由改向；双出口环境下回程不一致。修复手段是让单播路由一致，或用 ip rpf-route-static 显式指定 RPF 邻居，而不是盲目放开检查。',
        },
        {
          type: 'tip',
          title: '先查 RPF，再查组播表',
          text: '遇到组播不通，先执行 display multicast rpf-info 源地址，确认设备认为的上游接口与邻居是谁，再和实际入包接口对比。两者一致才有资格谈后续。PIM 邻居状态也要看，邻居不通则组播路由表根本不会建立，此时查 (*,G) 是浪费时间。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm14-l05',
      moduleId: 'm14',
      title: '组播典型应用与排错',
      depth: '精通',
      minutes: 26,
      summary: 'IPTV 与视频会议靠组播省带宽，复制点越靠下越省，但排错要按四步逐层验证。',
      objectives: [
        '说明 IPTV 与视频会议中组播复制点的选择原则',
        '按接收者、二层、RPF、边界四步定位组播故障',
        '用组播转发表与 Snooping 统计判断丢包位置',
      ],
      keywords: ['IPTV', '视频会议', '复制点', 'RPF 失败', 'TTL', 'Snooping'],
      blocks: [
        {
          type: 'paragraph',
          text: '组播最典型的两个场景是 IPTV 与视频会议。IPTV 的直播频道用组播承载，一百个用户看同一个频道，骨干上只有一份流量；视频会议则常用组播把同一路画面分发给多个分会场。真正决定带宽成本的是复制点位置：复制点越靠近接入，骨干与汇聚承载的流量越少，但越靠下的设备要处理的组与成员越多，对设备表项与转发能力要求越高。',
        },
        {
          type: 'analogy',
          title: '自来水厂的二次加压',
          text: '水厂只把水送到小区总表，一次管网只需承担一份流量；进了小区再分到各栋楼，最后在楼下分到每户。分水点越靠下，主管越省，但楼下的管道与阀门必须够粗。组播复制点就是分水点：放到核心，核心链路要扛多份；放到接入，接入设备要能扛住所有频道与用户。',
        },
        {
          type: 'table',
          title: '典型应用的关键点',
          columns: ['应用', '承载方式', '关键要求'],
          rows: [
            ['IPTV 直播', '组播，常用 239.0.0.0/8', '频道切换快，丢包要低，组播复制点合理'],
            ['IPTV 点播', '单播，配合 CDN', '带宽与并发按用户数扩容'],
            ['视频会议', '组播或单播混合', '时延与抖动敏感，需要 QoS 配合'],
            ['软件分发', '组播或组播加文件校验', '可靠性靠应用层重传补齐'],
          ],
        },
        {
          type: 'table',
          title: '复制点位置的取舍',
          columns: ['复制点', '骨干带宽', '设备压力', '适用场景'],
          rows: [
            ['核心层', '最大，每个汇聚一份', '核心压力小', '小型网络或频道很少'],
            ['汇聚层', '中等，每个接入一份', '汇聚需支持组播', '园区常见选择'],
            ['接入层', '最小，每台接入一份', '接入设备表项压力大', '大型 IPTV，频道与用户多'],
          ],
        },
        {
          type: 'steps',
          title: '组播排错的四步',
          items: [
            {
              title: '确认接收者已加入',
              text: '在最后一跳路由器执行 display igmp group，看是否出现该组与成员接口；没有就查终端与 IGMP 版本。',
            },
            {
              title: '确认二层没有泛洪或丢表',
              text: '在接入交换机执行 display igmp-snooping group，确认组播组对应正确的用户端口，查询器存在且表项未老化。',
            },
            {
              title: '确认 RPF 与组播路由',
              text: 'display pim routing-table 与 display multicast rpf-info，确认上游接口与入包接口一致，组播路由已建立。',
            },
            {
              title: '确认边界与策略',
              text: '检查 TTL 阈值、组播边界与 ACL 是否把组或源过滤掉，跨域时确认 MSDP 或 SSM 映射配置。',
            },
          ],
        },
        {
          type: 'code',
          title: '配置 Snooping 查询器与静态 RPF 路由',
          lang: 'vrp',
          code: `vlan 100
 igmp-snooping enable
 igmp-snooping querier enable
quit
ip rpf-route-static 10.10.10.10 255.255.255.255 10.1.2.2`,
        },
        {
          type: 'output',
          title: '查看组播转发表',
          text: `<R1> display multicast forwarding-table
Total 1 entries
(10.10.10.10, 239.1.1.1)
     MID: 0, Flags: ACT
     Uptime: 00:12:44, Timeout in: 00:03:06
     Incoming interface: GE0/0/0
     List of outgoing interfaces:
       GE0/0/2, Forwarding
     Matched packets: 128374, Matched bytes: 164221952`,
        },
        {
          type: 'warning',
          title: 'TTL 阈值与组播边界会静默丢包',
          text: '在边界接口上限制组播范围时，超范围的报文被丢弃但不产生 ICMP 差错，抓包只看到报文消失。另一个常见坑是 IPTV 单播点播正常、直播黑屏：说明单播路径与 DNS 都没问题，问题几乎一定在 IGMP 加入、Snooping 或 RPF 这三处，按四步法查比重新抓包有效得多。',
        },
        {
          type: 'tip',
          title: '用组播测试工具先验证网络',
          text: '在源侧用组播测试工具按固定速率发流，在接收侧同时观察 display multicast forwarding-table 的包计数与抓包结果，可以快速区分「网络没转发」与「应用没接收」。计数器只增不减说明转发正常，问题在终端或应用；计数器不动则回到 RPF 与 IGMP 继续查。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
