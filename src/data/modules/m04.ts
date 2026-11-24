import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm04',
  code: 'M04',
  title: 'IS-IS 路由协议',
  summary:
    'IS-IS 是运营商与大型数据中心骨干的主力 IGP。本模块用 NET、System ID、DIS 建立术语体系，讲清 L1/L2 分层、ATT 位与默认路由、与 OSPF 的取舍，并完成华为 VRP 的配置验证。',
  stage: 'L2',
  order: 4,
  goals: [
    '解释 NET、System ID、SEL 与 DIS 的含义和规划方法',
    '规划 L1/L2 层次并说清 ATT 位与默认路由的来源',
    '从封装、区域模型、扩展性等维度对比 IS-IS 与 OSPF',
    '完成华为 VRP 的 IS-IS 配置、验证与基础排错',
  ],
  keywords: ['IS-IS', 'NET', 'System ID', 'DIS', 'Level-1', 'Level-2', 'ATT 位', 'LSP', 'TLV'],
  lessons: [
    {
      id: 'm04-l01',
      moduleId: 'm04',
      title: 'IS-IS 的世界观：NET、System ID 与 DIS',
      depth: '精通',
      minutes: 30,
      summary: '用三个核心术语建立 IS-IS 的模型，并完成两台路由器的邻居建立。',
      objectives: [
        '解释 NET 的三段结构以及 SEL 为 00 的含义',
        '说明 System ID 与 OSPF Router-ID 的异同',
        '说出 DIS 与 OSPF DR 的关键差异',
        '完成 IS-IS 进程与接口配置并验证邻居',
      ],
      keywords: ['NET', 'System ID', 'SEL', 'DIS', 'IIH', 'LSP'],
      blocks: [
        {
          type: 'paragraph',
          text: 'IS-IS（Intermediate System to Intermediate System，中间系统到中间系统）最初为 OSI 网络设计，后来通过扩展 TLV 支持 IP。它直接封装在二层之上，不依赖 IP 转发自身报文，这让它在运营商和大型数据中心里具备更强的扩展性和稳定性。学 IS-IS 的第一道门槛不是配置，而是术语：NET、System ID、DIS 这三个词必须先立住。',
        },
        {
          type: 'analogy',
          title: '像写一个完整的邮政地址',
          text: 'NET 就像「国家、城市、街道、门牌号、收件部门」组成的一串地址：前面的区域号确定你在哪座城市，中间的 System ID 是唯一的门牌号，最后一位 SEL 是收件部门。SEL 为 00 表示这个地址属于路由器本身，而不是某台主机上的某个进程。地址写错，邮件就永远送不到。',
        },
        {
          type: 'table',
          title: 'IS-IS 核心术语',
          columns: ['术语', '含义', '关键点'],
          rows: [
            ['NET', 'Network Entity Title，网络实体标题，形如 49.0001.0000.0000.0001.00', 'AFI 用 49 表示私有地址；一台设备一个 NET'],
            ['System ID', 'NET 中间的 6 字节，唯一标识路由器', '作用类似 OSPF Router-ID，全网必须唯一'],
            ['SEL', 'NET 最后 1 字节，00 表示路由器本身', '非 00 表示主机上的其他实体'],
            ['DIS', 'Designated Intermediate System，广播网上的指定中间系统', '有优先级、可抢占、没有备份'],
            ['IIH', 'IS-IS Hello，Level-1 与 Level-2 各自独立', '建立并维持邻接'],
            ['LSP', 'Link State PDU，链路状态报文', '作用类似 OSPF 的 LSA'],
            ['CSNP/PSNP', '完整序列号 PDU、部分序列号 PDU', '用于 LSDB 同步与确认'],
          ],
        },
        {
          type: 'paragraph',
          text: 'IS-IS 分两个层次：Level-1（区域内）维护本区域 LSDB，Level-2（骨干）维护骨干 LSDB。同时参与两层的路由器叫 Level-1-2，它是区域与骨干之间的桥梁，也是默认路由的关键角色。与 OSPF 不同的是，IS-IS 的 Level-2 不按区域划分，整个骨干共用一个 LSDB，因此没有 Area 0 这种明确的编号约束。',
        },
        {
          type: 'code',
          title: 'R1 启用 IS-IS（Level-2）',
          lang: 'vrp',
          code: `system-view
sysname R1
isis 1
 is-level level-2
 network-entity 49.0001.0000.0000.0001.00
 cost-style wide
 quit
interface GigabitEthernet0/0/0
 ip address 10.0.1.1 255.255.255.0
 isis enable 1
 quit`,
        },
        {
          type: 'output',
          title: 'display isis peer 验证邻居',
          text: `                        Peer information for ISIS(1)

  System Id     Interface          Circuit Id       State HoldTime Type     PRI
-----------------------------------------------------------------------------------
0000.0000.0002  GE0/0/0            0000.0000.0002   Up    27s      L2       64`,
        },
        {
          type: 'warning',
          title: 'NET 规划的三个坑',
          text: '第一，同一 Level-1 区域内的设备必须共享相同的区域地址（AFI 加区域号部分），否则永远建不了 L1 邻居。第二，System ID 必须全网唯一，重复会导致 LSP 互相覆盖、路由震荡。第三，修改 NET 等于重建邻居，现网变更前要评估影响。建议按「区域号 + 设备编号」一次性规划好，不要边配边想。',
        },
        {
          type: 'tip',
          title: '先看进程再看接口',
          text: '邻居起不来时，先 display isis brief 确认进程已启用、NET 正确、is-level 符合预期；再 display isis interface 确认接口 State 为 Up 且 DID 正常。接口上少敲一句 isis enable 1，是最常见也最容易被忽略的原因。',
        },
        {
          type: 'checklist',
          title: '本课自检',
          items: [
            '能把 49.0001.0000.0000.0001.00 拆成 AFI、区域、System ID、SEL 四段',
            '能说出 System ID 与 Router-ID 的异同',
            '能解释 DIS 为什么没有备份',
            '能独立完成进程与接口的 IS-IS 配置',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm04-l02',
      moduleId: 'm04',
      title: 'Level-1、Level-2 与 ATT 位默认路由',
      depth: '熟悉',
      minutes: 26,
      summary: 'L1 路由器如何找到出口：ATT 位怎么置位、默认路由怎么安装、路由泄漏怎么用。',
      objectives: [
        '区分 L1、L2、L1-2 路由器的职责',
        '解释 ATT 位由谁置位、L1 路由器如何据此安装默认路由',
        '用路由泄漏让 L1 访问其他区域明细',
        '验证 L1 路由表中的默认路由来源',
      ],
      keywords: ['Level-1', 'Level-2', 'Level-1-2', 'ATT 位', '默认路由', '路由泄漏'],
      blocks: [
        {
          type: 'paragraph',
          text: 'IS-IS 的层次化要解决一个问题：区域内路由器不需要知道整个骨干的明细，但必须知道怎么走出去。L1 路由器只维护本区域 LSDB，出口依赖一条指向最近 L1/L2 路由器的默认路由；这条默认路由不是人工配置的，而是由 L1/L2 路由器通过 ATT 位「暗示」出来的。',
        },
        {
          type: 'analogy',
          title: '市内公交与城际高铁',
          text: 'L1 像市内公交网，只覆盖本城市，站点密集但范围有限；L2 像城际高铁网，连接各个城市。L1/L2 路由器就是综合交通枢纽：它同时知道市内公交和城际线路。市内乘客不需要背下全国铁路图，只要看到「本站可换乘高铁」的标识（ATT 位），就默认「去外地先到枢纽」即可。',
        },
        {
          type: 'table',
          title: '三种路由器角色',
          columns: ['角色', '维护的 LSDB', '邻居类型', '典型位置'],
          rows: [
            ['Level-1', '仅本区域 L1 LSDB', '只建 L1 邻接', '园区接入、末梢区域'],
            ['Level-2', '骨干 L2 LSDB', '只建 L2 邻接', '核心骨干'],
            ['Level-1-2（默认）', '同时维护 L1 与 L2 两份 LSDB', '可同时建 L1 与 L2 邻接', '区域边界、汇聚层'],
          ],
        },
        {
          type: 'paragraph',
          text: 'ATT（Attachment）位位于 L1 LSP 中。当一台 L1/L2 路由器通过 L2 能够到达其他区域时，它会在自己产生的 L1 LSP 中把 ATT 置 1，告诉本区域的 L1 路由器「我这里可以出区域」。L1 路由器收到 ATT 置位的 LSP 后，安装一条指向该 L1/L2 路由器的默认路由 0.0.0.0/0。如果有多台 L1/L2，L1 会选择最近的一台。',
        },
        {
          type: 'code',
          title: 'L1/L2 边界路由器与路由泄漏',
          lang: 'vrp',
          code: `isis 1
 is-level level-1-2
 network-entity 49.0001.0000.0000.0002.00
 import-route isis level-2 into level-1
 quit
interface GigabitEthernet0/0/0
 isis enable 1
 quit
interface GigabitEthernet0/0/1
 isis enable 1
 isis circuit-type p2p
 quit`,
        },
        {
          type: 'output',
          title: 'display isis lsdb 中的 ATT 标志',
          text: `                        Database information for ISIS(1)
                        -----------------------------
                          Level-1 Link State Database

LSPID                 Seq Num      Checksum      Holdtime        Length  ATT/P/OL
-----------------------------------------------------------------------------------
0000.0000.0002.00-00  00000007     3f2a          1173            96      1/0/0
0000.0000.0001.00-00  00000005     8c14          1180            72      0/0/0`,
        },
        {
          type: 'output',
          title: 'display isis route 中 L1 的默认路由',
          text: `                        Route information for ISIS(1)
                        -----------------------------
                        ISIS(1) Level-1 Forwarding Table
                        -----------------------------
 IPV4 Destination     IntCost    ExtCost ExitInterface   NextHop         Flags
 ---------------------------------------------------------------------------
 0.0.0.0/0            20         NULL    GE0/0/0        10.0.2.2        A/-/-
 10.0.1.0/24          10         NULL    GE0/0/0        10.0.1.1        A/-/-`,
        },
        {
          type: 'warning',
          title: '默认路由只在 L1 表里',
          text: 'ATT 位只会影响 L1 路由表，L2 路由器不会因为 ATT 位安装默认路由。如果 L1 路由器的 display isis route 里没有 0.0.0.0/0，通常说明本区域没有可达的 L1/L2 路由器，或者对端 L2 方向没有可用路由。别在 L1 路由器上手工写静态默认路由掩盖问题，先查 L1/L2 的 L2 邻接和 L2 LSDB。',
        },
        {
          type: 'tip',
          title: '路由泄漏要配过滤策略',
          text: 'import-route isis level-2 into level-1 可以把 L2 明细泄漏到 L1，让 L1 路由器选择更精确的出口，但也会把骨干明细灌进区域，削弱层次化的收益。生产环境通常配合 filter-policy 或 route-policy，只泄漏必要的网段，并注意避免与默认路由形成次优路径。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm04-l03',
      moduleId: 'm04',
      title: 'IS-IS 与 OSPF：怎么选、怎么迁移',
      depth: '熟悉',
      minutes: 26,
      summary: '从封装、区域模型、拓扑描述、收敛与扩展性五个维度做一次可落地的对比。',
      objectives: [
        '说出 IS-IS 与 OSPF 在封装和区域模型上的根本差异',
        '解释为什么大型网络更偏好 IS-IS',
        '在华为设备上完成两种协议共存与迁移的基本配置',
        '判断迁移时需要注意的默认路由与选路问题',
      ],
      keywords: ['OSPF', 'IS-IS', '对比', '迁移', 'TLV', '扩展性'],
      blocks: [
        {
          type: 'paragraph',
          text: 'OSPF 和 IS-IS 都是链路状态协议，都用 SPF 算最短路，都能做层次化。真正的差异集中在三处：报文封装在哪一层、区域模型如何定义、拓扑信息用什么结构描述。理解这三点，选型时就不会停留在「哪个更流行」这种印象层面。',
        },
        {
          type: 'table',
          title: 'OSPF 与 IS-IS 关键对比',
          columns: ['对比项', 'OSPF', 'IS-IS'],
          rows: [
            ['封装', '基于 IP，协议号 89', '直接封装二层，NLPID 0x83'],
            ['区域模型', '必须有 Area 0，所有区域直连或逻辑连接骨干', 'L1 区域内、L2 骨干，无 Area 0 编号，无虚连接'],
            ['拓扑描述', '六类以上 LSA', 'LSP 加 TLV，扩展不需要新增报文类型'],
            ['默认路由', 'STUB 区域由 ABR 下发 Type 3 默认', 'L1/L2 通过 ATT 位置位，L1 自动装默认'],
            ['指定设备', 'DR 与 BDR，非抢占', 'DIS，可抢占，无备份'],
            ['IPv6', 'OSPFv3 独立进程', '同一拓扑可同时承载 IPv4 与 IPv6'],
            ['规模与收敛', '分区清晰，LSA 类型多', 'TLV 扩展性好，PRC 减少重算范围'],
          ],
        },
        {
          type: 'analogy',
          title: '两个城市的交通规划',
          text: 'OSPF 像有强制环路的城市：所有主干道必须汇入环城路（Area 0），规划清晰但改造成本高；IS-IS 像铁路网：分市内线和城际线，城际网自成体系，不要求每个城市都修一条直通某个编号枢纽的铁路，但没有城际连通就真的出不去，也没有「临时借道」的虚连接。',
        },
        {
          type: 'paragraph',
          text: '大型网络偏好 IS-IS 的原因不只是「历史习惯」：它跑在二层，不受 IP 层攻击和地址规划影响；用 TLV 扩展，新增能力（如 SR、IPv6、Flex-Algo）不需要引入新 LSA 类型；LSP 分段与 PRC（Partial Route Calculation，部分路由计算）让拓扑变化时只重算受影响的前缀。代价是术语更陌生、可读性不如 OSPF，且没有虚连接这类补救手段。',
        },
        {
          type: 'code',
          title: '华为设备上 IS-IS 的常用度量配置',
          lang: 'vrp',
          code: `isis 1
 is-level level-2
 network-entity 49.0001.0000.0000.0003.00
 cost-style wide
 quit
interface GigabitEthernet0/0/0
 isis enable 1
 isis cost 100
 quit`,
        },
        {
          type: 'output',
          title: 'display isis interface 查看接口状态',
          text: `Interface information for ISIS(1)
---------------------------------
Interface       Id      IPV4.State          IPV6.State      MTU  Type  DIS
GE0/0/0         001     Up                  Down            1500 L1L2  No/No`,
        },
        {
          type: 'warning',
          title: '迁移不是二选一开关',
          text: 'OSPF 与 IS-IS 双协议共存时，同一前缀可能同时被两个协议学到，最终由路由优先级决定。华为默认 OSPF 内部路由优先级 10、IS-IS 15，OSPF 更优；如果希望以 IS-IS 为主，需要在 cutover 阶段调整优先级或使用路由策略，并逐段验证，避免出现「去程走 OSPF、回程走 IS-IS」的非对称路径。',
        },
        {
          type: 'tip',
          title: '用 display isis route 对比双协议选路',
          text: '迁移期间同时看 display ip routing-table、display ospf routing 和 display isis route，确认同一目的网段在两个协议里的度量与下一跳，再决定优先级调整顺序。先让新协议学到完整路由，再切换优先级，最后撤掉旧协议，比一次性替换安全得多。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm04-l04',
      moduleId: 'm04',
      title: '华为 IS-IS 配置、验证与排错',
      depth: '精通',
      minutes: 34,
      summary: '从 NET 规划到邻居、LSDB、路由验证，走一遍可交付的 IS-IS 实施流程。',
      objectives: [
        '按规划顺序完成 IS-IS 进程与接口配置',
        '用五条 display 命令完成邻居、LSDB、路由的完整验证',
        '定位 level 不匹配、NET 冲突、接口未使能三类故障',
        '输出一份可交接的 IS-IS 验证记录',
      ],
      keywords: ['IS-IS 配置', 'display isis peer', 'display isis lsdb', 'display isis route', '排错'],
      blocks: [
        {
          type: 'paragraph',
          text: 'IS-IS 的配置量不大，难的是规划与验证：NET 怎么编、哪些接口属于 L1、哪些属于 L2、DIS 优先级怎么定。配置只是把规划翻译成命令，验证才是确认规划真的落地。下面按「先规划、再配置、后验证、最后排错」的顺序走一遍。',
        },
        {
          type: 'analogy',
          title: '配置像装修布线',
          text: 'NET 规划是画施工图，进程和接口配置是布线，display 命令是通电验收。图纸错了，线布得再整齐也通不了电；不验收就直接交付，问题只会留给下一个值班的人，而且那时现场已经被后续变更覆盖了。',
        },
        {
          type: 'steps',
          title: '实施流程',
          items: [
            { title: '规划 NET 与层次', text: '按区域分配 NET 前缀，为每台设备分配唯一 System ID，确定 L1、L2 或 L1-2。' },
            { title: '启用进程', text: 'isis 进程下配置 is-level、network-entity，建议开启 cost-style wide。' },
            { title: '接口使能', text: '在参与 IS-IS 的接口下执行 isis enable，按需设置 circuit-type 与 cost。' },
            { title: '验证邻居', text: 'display isis peer 确认状态 Up、Type 与预期层次一致。' },
            { title: '验证数据库与路由', text: 'display isis lsdb 看 LSP 是否齐全，display isis route 看路由与下一跳。' },
            { title: '排错取证', text: '异常时收 display isis interface、display isis error 与日志，再定位配置差异。' },
          ],
        },
        {
          type: 'code',
          title: 'R1 完整配置（L2 骨干）',
          lang: 'vrp',
          code: `system-view
sysname R1
isis 1
 is-level level-2
 network-entity 49.0001.0000.0000.0001.00
 cost-style wide
 quit
interface GigabitEthernet0/0/0
 ip address 10.0.1.1 255.255.255.0
 isis enable 1
 isis cost 10
 quit
interface LoopBack0
 ip address 1.1.1.1 255.255.255.255
 isis enable 1
 quit`,
        },
        {
          type: 'output',
          title: 'display isis peer 确认邻居',
          text: `                        Peer information for ISIS(1)

  System Id     Interface          Circuit Id       State HoldTime Type     PRI
-----------------------------------------------------------------------------------
0000.0000.0002  GE0/0/0            0000.0000.0002   Up    29s      L2       64`,
        },
        {
          type: 'output',
          title: 'display isis lsdb 确认 LSP',
          text: `                        Database information for ISIS(1)
                        -----------------------------
                          Level-2 Link State Database
                          -----------------------------
LSPID                 Seq Num      Checksum      Holdtime        Length  ATT/P/OL
-----------------------------------------------------------------------------------
0000.0000.0001.00-00  0000000A     7b2c          1187            102     0/0/0
0000.0000.0002.00-00  00000008     c41e          1174            88      0/0/0
0000.0000.0001.01-00  00000003     22aa          1190            64      0/0/0`,
        },
        {
          type: 'table',
          title: '五条验证命令的分工',
          columns: ['命令', '看什么', '判断标准'],
          rows: [
            ['display isis peer', '邻居的 System ID、接口、层次、状态', 'State 为 Up，Type 与规划一致'],
            ['display isis lsdb', 'LSPID、序列号、ATT 位', '本区域或骨干 LSP 齐全，无频繁翻新'],
            ['display isis route', 'L1/L2 路由表与下一跳', '目的网段存在且下一跳正确'],
            ['display isis interface', '接口使能、MTU、DIS 角色', 'IPV4.State 为 Up'],
            ['display isis error', '报文错误统计', '错误计数不再增长'],
          ],
        },
        {
          type: 'warning',
          title: '邻居 Up 不了的三类根因',
          text: '一是接口忘了 isis enable，display isis interface 里根本看不到该接口；二是两端 is-level 不匹配，例如一端只启 L1、另一端只启 L2，IIH 里的层次对不上；三是 NET 区域地址或 System ID 配错，L1 要求区域地址一致、System ID 必须唯一。先比对 display isis brief 的 NET 与 level，再比对接口状态，基本能覆盖八成问题。',
        },
        {
          type: 'tip',
          title: 'DIS 与开销的现网注意点',
          text: '广播网段的 DIS 由接口优先级决定，默认 64，数值大者胜，且可抢占；需要固定 DIS 时提前调高规划设备的 isis priority。开销方面，建议统一使用 cost-style wide 并显式设置 isis cost，避免 narrow 模式下链路开销上限过小导致选路不符合预期。修改开销或优先级后，用 display isis interface 复核 DIS 字段。',
        },
        {
          type: 'checklist',
          title: '交付前验证清单',
          items: [
            '每台设备的 NET 与 System ID 已登记且无重复',
            '所有规划接口的 IS-IS 状态为 Up，层次与规划一致',
            'L1 路由器能通过默认路由访问区域外，L2 路由完整',
            'DIS 角色符合规划，优先级已固化',
            'display isis error 无持续增长的错误计数',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
