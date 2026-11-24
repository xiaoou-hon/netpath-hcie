import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm17',
  code: 'M17',
  title: '公有云 VPC 与云上路由',
  summary:
    'VPC 是云上网络的骨架：先用不重叠的地址与多可用区子网打底，再用系统路由和自定义路由决定流量走向；对等连接、企业路由与云连接解决 VPC 互联，NAT、EIP、ELB 与私网 DNS 负责出入口，五步排障法把问题定位到具体一层。',
  stage: 'L4',
  order: 17,
  track: 'cloud',
  priority: 'P0',
  prerequisites: ['m16', 'm02', 'm05'],
  goals: [
    '完成不与本地 IDC 及其他 VPC 冲突的地址规划，并按可用区与用途划分子网',
    '读懂云路由表的系统路由、自定义路由与最长匹配，判断一条流量的实际下一跳',
    '对比对等连接、企业路由器、转发路由器与 Transit Gateway，选择合适的 VPC 互联方案',
    '设计云上出向与入向路径，组合使用 NAT 网关、EIP、ELB 与私网 DNS',
    '按连通性、路由、安全组、DNS、流日志五步定位 VPC 故障并给出修复建议',
  ],
  keywords: [
    'VPC',
    '子网',
    '地址规划',
    '路由表',
    '最长匹配',
    '对等连接',
    '企业路由器',
    '云连接',
    'Transit Gateway',
    'NAT 网关',
    'EIP',
    '私网 DNS',
  ],
  lessons: [
    {
      id: 'm17-l01',
      moduleId: 'm17',
      title: 'VPC 地址规划与多可用区子网',
      depth: '熟悉',
      minutes: 30,
      summary: '地址规划是云上最难返工的决策：先保证不重叠，再按可用区与用途切子网。',
      objectives: [
        '按业务规模与增长预期选择 VPC 与子网掩码',
        '为每个可用区、每类用途建立独立子网并统一命名',
        '识别会导致后期无法互联的地址规划错误',
      ],
      keywords: ['地址规划', 'VPC 网段', '子网', '多可用区', 'CIDR'],
      blocks: [
        {
          type: 'paragraph',
          text: '云上几乎所有网络能力都以地址为前提：VPC 对等、专线、VPN、路由汇总、安全组规则，一旦网段重叠，后面要么加 NAT 绕行，要么重建网络。地址规划因此是云上最难返工的决策。正确顺序是先把总部、分支、已有数据中心、容器集群和未来并购的网段摊在一张图上，确认没有交集，再给每个环境分配独立的汇总块；然后在汇总块内按可用区编号、按用途分层切子网，并把结果登记成 IPAM 台账。',
        },
        {
          type: 'analogy',
          title: '城市门牌号要先定规则',
          text: '如果城市一开始就允许各小区自己随便编号，等到要修跨区道路时，就会发现两个小区用了同一段门牌，邮件无法投递。规划得当的城市会先划分行政区，再给每个区预留号段，街道和门牌在其中顺序分配。VPC 的 /16 就是行政区，可用区是街道，子网是门牌段，预留的空号段就是未来扩建的空间。',
        },
        {
          type: 'table',
          title: '地址规划的七个检查项',
          columns: ['维度', '建议做法', '原因'],
          rows: [
            ['VPC 网段', '生产与测试各用独立 /16', '预留增长空间，便于路由汇总'],
            ['子网大小', '常规子网用 /24，特殊场景再放大', '地址充足且便于记忆与排障'],
            ['编号规则', '第三段同时编码用途与可用区，例如 1 与 2 是 Web 的两个 AZ', '看到地址就能判断位置与角色'],
            ['可用区覆盖', '每层业务至少覆盖两个可用区', '单 AZ 故障不影响整体服务'],
            ['地址预留', '至少保留 50% 未分配', '容器、新业务与并购需要空间'],
            ['冲突检查', '与 IDC、其他 VPC、容器网段逐一比对', '重叠后无法对等或走专线'],
            ['特殊网段', '避开 172.17.0.0/16 等常见默认网段', '减少与本地开发环境冲突'],
          ],
        },
        {
          type: 'table',
          title: '传统网络概念与云上网段的对应',
          columns: ['传统概念', '云上对应', '关键差异'],
          rows: [
            ['VLAN', '子网', 'VLAN 是二层广播域，子网是三层网段且绑定可用区'],
            ['VRF', 'VPC', '都是独立路由表，但 VPC 由平台托管且默认隔离'],
            ['VLAN 网关地址', '子网网关地址', '由平台占用，不能分配给实例'],
            ['DHCP 服务器', '平台地址管理', '默认自动分配，也可指定静态地址'],
            ['ACL', '安全组与网络 ACL', '安全组有状态、实例级；网络 ACL 无状态、子网级'],
          ],
        },
        {
          type: 'steps',
          title: '实践任务：为双可用区业务设计地址并写出 Terraform 骨架',
          items: [
            {
              title: '盘点现状',
              text: '列出总部、分支、已有 VPC、容器集群和云下数据中心的私网网段，标记重叠与临近冲突；没有云账号时用表格和公开资料完成。',
            },
            {
              title: '选定汇总块',
              text: '为生产环境选定 10.20.0.0/16，用第三段同时编码用途与可用区：1 至 31 给 Web，33 至 63 给应用，65 至 95 给数据，同一用途内奇数段与偶数段分别对应两个可用区。',
            },
            {
              title: '划分可用区子网',
              text: '每个可用区至少一个 Web 子网和一个应用子网；数据库子网在主备两个可用区各建一个，避免跨可用区写放大。',
            },
            {
              title: '编写 Terraform',
              text: '参照本课示例写出 VPC 与四个子网，zone_id 与 CIDR 一一对应；只执行 terraform validate 与 terraform plan，不执行 apply。',
            },
            {
              title: '建立地址台账',
              text: '用一张表记录 VPC、子网、CIDR、可用区、用途、负责人和创建时间，后续所有互联与安全组方案先查这张表。',
            },
          ],
        },
        {
          type: 'code',
          title: '阿里云多可用区 VPC 与交换机（示例，仅 plan）',
          lang: 'hcl',
          code: `resource "alicloud_vpc" "prod" {
  vpc_name   = "vpc-prod"
  cidr_block = "10.20.0.0/16"
}

resource "alicloud_vswitch" "web_a" {
  vpc_id       = alicloud_vpc.prod.id
  cidr_block   = "10.20.1.0/24"
  zone_id      = "cn-hangzhou-h"
  vswitch_name = "vsw-web-h"
}

resource "alicloud_vswitch" "web_b" {
  vpc_id       = alicloud_vpc.prod.id
  cidr_block   = "10.20.2.0/24"
  zone_id      = "cn-hangzhou-i"
  vswitch_name = "vsw-web-i"
}

resource "alicloud_vswitch" "app_a" {
  vpc_id       = alicloud_vpc.prod.id
  cidr_block   = "10.20.33.0/24"
  zone_id      = "cn-hangzhou-h"
  vswitch_name = "vsw-app-h"
}`,
        },
        {
          type: 'output',
          title: 'plan 阶段的预期输出',
          text: `$ terraform plan
Plan: 4 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + vpc_cidr   = "10.20.0.0/16"
  + subnet_ids = {
      + app_a = (known after apply)
      + web_a = (known after apply)
      + web_b = (known after apply)
    }`,
        },
        {
          type: 'warning',
          title: '三个会让互联彻底失败的规划错误',
          text: '第一，直接把整个 10.0.0.0/8 分配给一个 VPC，未来任何自有网络都无法与它互联。第二，生产与测试共用同一网段，看似方便复制，实则两边永远不能对等。第三，使用 172.17.0.0/16 或 192.168.0.0/16 作为主网段，与 Docker 默认网段、家用路由和分支网络大面积冲突。地址重叠无法靠路由技巧解决，只能重建或加 NAT，代价极高。',
        },
        {
          type: 'tip',
          title: '子网命名比子网大小更重要',
          text: '统一命名成「环境-区域-用途-可用区」，例如 prod-cn20-web-h，可以让控制台列表、监控告警、流日志和工单在同一套语言下沟通。地址段会随业务调整，命名一旦混乱却很难纠正。把命名规则写进 Terraform 变量和代码评审清单，比事后靠记忆认子网可靠得多。',
        },
        {
          type: 'checklist',
          title: '验证清单',
          items: [
            '所有子网 CIDR 都落在 10.20.0.0/16 内且互不重叠',
            '每个子网都能说出所属可用区与用途',
            '与总部、分支、其他 VPC 的网段无交集',
            '每个可用区都有可承载 Web 与应用层的子网',
            '至少预留 50% 地址空间给未来扩展',
            'terraform plan 的资源数量与预期一致且未 apply',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm17-l02',
      moduleId: 'm17',
      title: '云上路由表：系统路由、自定义路由与最长匹配',
      depth: '熟悉',
      minutes: 30,
      summary: '云路由表绑定子网，系统路由保底、自定义路由决定去向，转发按最长匹配命中。',
      objectives: [
        '区分系统路由、自定义路由、动态传播路由与黑洞路由',
        '按最长匹配规则推演一个目的地址的实际下一跳',
        '说明云路由表与 OSPF 路由表在选路与收敛上的差异',
      ],
      keywords: ['路由表', '系统路由', '自定义路由', '最长匹配', '黑洞路由'],
      blocks: [
        {
          type: 'paragraph',
          text: '云上每个子网都要关联一张路由表，路由表决定从这个子网发出的流量走哪里。条目由目的网段和下一跳组成，下一跳可以是本地 VPC、NAT 网关、对等连接、企业路由器、VPN 或专线网关。平台会自动生成一批系统路由，例如 VPC 网段内互通的本地路由，以及访问对象存储等云服务的内置路由；用户添加的是自定义路由。和传统设备不同，云路由表是分布式的，由平台下发到虚拟网卡所在的主机，不依赖某台物理路由器转发。',
        },
        {
          type: 'table',
          title: '路由条目的四种来源',
          columns: ['类型', '来源', '能否删除', '说明'],
          rows: [
            ['本地系统路由', '平台自动生成', '不能', '保证同一 VPC 内子网互通'],
            ['云服务系统路由', '平台自动生成', '通常不能', '访问对象存储、镜像等公共服务'],
            ['自定义静态路由', '用户添加', '可以', '指向 NAT、对等连接、企业路由器或网关'],
            ['动态传播路由', 'VPN 或专线 BGP 学习', '随会话变化', '由网关学习后传播到关联路由表'],
            ['黑洞路由', '用户主动配置或下一跳失效', '可以', '流量被静默丢弃，用于快速止损'],
          ],
        },
        {
          type: 'paragraph',
          text: '云上选路以最长匹配为核心：目的地址同时命中 10.20.1.0/24、10.20.0.0/16 和 0.0.0.0/0 时，选择掩码最长的 /24。与 OSPF 不同，云路由表通常不暴露度量值，也不允许同一前缀存在多条等价路径，因此没有 ECMP 可调；同一前缀只保留一条有效条目。这意味着传统网络中靠 cost 调整主备的做法，在云上要改成「主路由指向专线网关、备路由用更具体的网段或路由优先级实现」，并且必须两端同时配置。',
        },
        {
          type: 'table',
          title: 'OSPF 路由表与云路由表的差异',
          columns: ['对比项', 'OSPF 路由表', '云路由表'],
          rows: [
            ['邻居与协议', '靠 Hello 建立邻居，周期性泛洪', '无邻居，平台直接下发'],
            ['选路依据', '最长匹配，再看管理距离与 cost', '最长匹配为主，同前缀单下一跳'],
            ['多路径', '支持 ECMP', '多数场景不支持等价多路径'],
            ['收敛速度', '受计时器与拓扑规模影响', '秒级生效，不依赖协议计时'],
            ['作用范围', '设备全局或接口', '绑定到具体子网'],
            ['查看入口', 'display ip routing-table', '控制台、API 或 IaC 状态'],
          ],
        },
        {
          type: 'code',
          title: '华为云路由表与默认路由（示例，仅 plan）',
          lang: 'hcl',
          code: `resource "huaweicloud_vpc_route_table" "private" {
  name   = "rtb-private"
  vpc_id = huaweicloud_vpc.prod.id
}

resource "huaweicloud_vpc_route" "default" {
  vpc_id         = huaweicloud_vpc.prod.id
  route_table_id = huaweicloud_vpc_route_table.private.id
  destination    = "0.0.0.0/0"
  type           = "nat"
  nexthop        = huaweicloud_nat_gateway.prod.id
}

resource "huaweicloud_vpc_route" "to_shared" {
  vpc_id         = huaweicloud_vpc.prod.id
  route_table_id = huaweicloud_vpc_route_table.private.id
  destination    = "10.30.0.0/16"
  type           = "peering"
  nexthop        = huaweicloud_vpc_peering_connection.prod_shared.id
}`,
        },
        {
          type: 'output',
          title: '只读导出一张路由表',
          text: `$ aws ec2 describe-route-tables --filters Name=vpc-id,Values=vpc-0a1b2c3d --output table
------------------------------------------------------------------
|                      DescribeRouteTables                       |
+------------------+----------------------------+---------------+
| DestinationCidr  |        Target              |     State     |
+------------------+----------------------------+---------------+
|  10.20.0.0/16    |  local                     |    active     |
|  0.0.0.0/0       |  nat-0a1b2c3d              |    active     |
|  10.30.0.0/16    |  pcx-0f6e5d4c              |    active     |
+------------------+----------------------------+---------------+`,
        },
        {
          type: 'warning',
          title: '改一张路由表，影响的是整组子网',
          text: '路由表与子网是多对一关系，一次修改会同时影响所有关联子网，而不是只影响你正在排障的那台实例。把 0.0.0.0/0 从 NAT 网关改成别处，可能让整个私有子网瞬间失去公网访问。删除 NAT 或对等连接后，指向它的路由会变成黑洞，流量被静默丢弃且不一定有告警。生产变更必须先查关联子网清单，再在变更窗口内操作并准备回滚。',
        },
        {
          type: 'tip',
          title: '路由排障的三步定位',
          text: '第一步确认实例所在子网关联了哪张路由表，很多问题出在「改错了表」。第二步按最长匹配列出命中的条目，注意 /24 可能覆盖你以为生效的 /16。第三步检查下一跳资源是否可用：NAT 是否运行、对等连接是否已接受、VPN 隧道是否 up。三步走完，绝大多数「云上网不通」都能定位到具体条目，而不是停留在猜测。',
        },
        {
          type: 'steps',
          title: '实践任务：读一张路由表并推演流量',
          items: [
            {
              title: '列出全部条目',
              text: '在控制台打开生产 VPC 的路由表，记录本地系统路由、自定义路由与动态传播路由，标注每条的目的网段和下一跳类型。',
            },
            {
              title: '确认子网关联',
              text: '任选一个私有子网，确认它关联的是哪张路由表，并记录该表下所有子网，理解一次变更的影响面。',
            },
            {
              title: '只读导出',
              text: '用只读命令导出路由表，例如 aws ec2 describe-route-tables 加 vpc-id 过滤；没有账号时使用本课示例输出练习判读。',
            },
            {
              title: '推演最长匹配',
              text: '构造 10.20.1.50、10.20.99.10、8.8.8.8 三个目的地址，分别写出命中的前缀与下一跳，并说明删掉 /24 后结果如何变化。',
            },
            {
              title: '画去程与回程',
              text: '在纸上画出去程与回程路径，标出可能产生非对称的下一跳，尤其是同时存在专线与 VPN 的场景。',
            },
          ],
        },
        {
          type: 'checklist',
          title: '验证清单',
          items: [
            '能指出目标子网关联的路由表 ID',
            '能按最长匹配写出三个目的地址的下一跳',
            '知道 VPC 内子网互通依赖本地系统路由',
            '能说明私有子网的默认路由指向哪里',
            '知道修改路由表会影响哪些子网',
            '会用只读命令导出路由表并保存为证据',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm17-l03',
      moduleId: 'm17',
      title: 'VPC 互联：对等连接、企业路由与 Transit Gateway',
      depth: '精通',
      minutes: 38,
      summary: '少量 VPC 用对等连接，多 VPC 用 Hub 汇聚，跨地域用云连接，地址不重叠是前提。',
      objectives: [
        '说明对等连接不具备传递性及其对组网的影响',
        '对比企业路由器、转发路由器、云连接与 Transit Gateway 的定位',
        '为多 VPC、多地域场景选择互联方案并配置双向路由',
      ],
      keywords: ['对等连接', '企业路由器 ER', '转发路由器 TR', '云连接 CEN', 'Transit Gateway'],
      blocks: [
        {
          type: 'paragraph',
          text: 'VPC 默认互相隔离，互联方案按规模分三档。两个 VPC 少量互通，用对等连接最直接，配置少、没有中转费；但它是点对点的，不具备传递性，A 与 B 对等、B 与 C 对等，并不代表 A 能访问 C。VPC 数量一多，两两对等会变成 N 乘 N 减一的连接数，路由和安全策略都难以维护，这时要在中心放一个企业路由器、转发路由器或 Transit Gateway，让所有 VPC 以 Hub-Spoke 方式接入。跨地域则在 Hub 之上再叠加云连接或 TGW Peering，统一管理带宽与路由。',
        },
        {
          type: 'table',
          title: '三家厂商的 VPC 互联产品对照',
          columns: ['能力', '华为云', '阿里云', 'AWS'],
          rows: [
            ['同地域 VPC 点对点', '对等连接', '对等连接', 'VPC Peering'],
            ['多 VPC 汇聚路由', '企业路由器 ER', '转发路由器 TR', 'Transit Gateway'],
            ['跨地域统一互联', '云连接 CEN', '云企业网 CEN', 'Transit Gateway Peering'],
            ['物理专线入云', '云专线 DC', '高速通道 Express Connect', 'Direct Connect'],
            ['公网加密接入', 'VPN 网关', 'VPN 网关', 'Site-to-Site VPN'],
            ['跨 VPC 私网解析', '内网 DNS 与 DNS 关联', 'PrivateZone 关联 VPC', 'Route 53 私有托管区关联'],
          ],
        },
        {
          type: 'table',
          title: '互联方案选型',
          columns: ['场景', '推荐方案', '主要理由'],
          rows: [
            ['两个 VPC 少量互通', '对等连接', '配置简单，无中转实例费用'],
            ['十个以上 VPC 统一互通', '企业路由器或 Transit Gateway', '避免连接数爆炸，路由集中管理'],
            ['需要按部门隔离路由', 'Hub 加多张路由表', '集中控制哪些 VPC 能互相可见'],
            ['跨地域双活', '云连接 CEN 或 TGW Peering', '统一带宽、路由与时延观测'],
            ['与本地 IDC 长期互联', '专线加企业路由器', '稳定带宽与 SLA，可跑 BGP'],
            ['临时验证或灾备', 'VPN 网关', '开通快、成本低，作为专线备份'],
          ],
        },
        {
          type: 'paragraph',
          text: '把传统知识接过来看：VPC 对等类似两条 VRF 之间拉一条静态直连，必须两端都加路由；企业路由器类似一台中心化的 PE，负责在多个 VRF 之间做路由泄漏与策略控制；云连接类似运营商提供的 MPLS VPN 骨干，把不同地域的站点接入同一张私网；专线则对应传统网络中的长途 leased line，只是交接点从机房配线架变成了云侧的专线网关。理解了这层映射，云上互联的配置项就不再陌生。',
        },
        {
          type: 'steps',
          title: '实践任务：为三个 VPC 设计互联方案并写出 Terraform 骨架',
          items: [
            {
              title: '画地址与流量矩阵',
              text: '列出核心业务、共享服务、测试三个 VPC 的 CIDR 与需要互通的子网，先确认三者地址无重叠。',
            },
            {
              title: '方案 A 两两对等',
              text: '画出三条对等连接与六条路由，说明为什么测试 VPC 不能经核心 VPC 中转访问共享服务。',
            },
            {
              title: '方案 B Hub 汇聚',
              text: '用企业路由器、转发路由器或 Transit Gateway 作为 Hub，写出每个 VPC 的附件、路由表关联与路由传播关系。',
            },
            {
              title: '编写 Terraform',
              text: '写出对等连接资源与两端路由，或 TGW 及其附件；只执行 terraform validate 与 terraform plan，不 apply。',
            },
            {
              title: '对比成本与复杂度',
              text: '从连接数、路由条目数、跨可用区与跨地域流量费、故障域四个维度比较两个方案，给出选择理由。',
            },
          ],
        },
        {
          type: 'code',
          title: '华为云对等连接与两端路由（示例，仅 plan）',
          lang: 'hcl',
          code: `resource "huaweicloud_vpc_peering_connection" "prod_shared" {
  name        = "pc-prod-to-shared"
  vpc_id      = huaweicloud_vpc.prod.id
  peer_vpc_id = huaweicloud_vpc.shared.id
}

resource "huaweicloud_vpc_route" "prod_to_shared" {
  vpc_id      = huaweicloud_vpc.prod.id
  destination = "10.30.0.0/16"
  type        = "peering"
  nexthop     = huaweicloud_vpc_peering_connection.prod_shared.id
}

resource "huaweicloud_vpc_route" "shared_to_prod" {
  vpc_id      = huaweicloud_vpc.shared.id
  destination = "10.20.0.0/16"
  type        = "peering"
  nexthop     = huaweicloud_vpc_peering_connection.prod_shared.id
}`,
        },
        {
          type: 'code',
          title: 'AWS Transit Gateway 关键参数（示例，仅 plan）',
          lang: 'hcl',
          code: `resource "aws_ec2_transit_gateway" "core" {
  description                     = "tgw-core"
  default_route_table_association = "disable"
  default_route_table_propagation = "disable"
}

resource "aws_ec2_transit_gateway_vpc_attachment" "prod" {
  subnet_ids         = [aws_subnet.prod_a.id, aws_subnet.prod_b.id]
  transit_gateway_id = aws_ec2_transit_gateway.core.id
  vpc_id             = aws_vpc.prod.id
}`,
        },
        {
          type: 'warning',
          title: '对等连接不传递，地址重叠无解',
          text: '最常见的架构错误是以为 A 与 B、B 与 C 对等之后，A 与 C 自动互通，结果共享服务只能被部分 VPC 访问。对等连接必须在两端分别添加路由，漏掉一侧就只通一个方向。地址重叠时对等连接直接无法建立，专线也无法宣告相同前缀，只能重建网段或在中间加 NAT，而 NAT 会破坏源地址识别与安全组规则。设计初期的一次地址评审，胜过上线后的十次救火。',
        },
        {
          type: 'tip',
          title: 'VPC 多了就不要画网状',
          text: '连接数超过四五个之后，网状对等的路由条目和安全组规则会迅速失控，新增一个 VPC 要改所有对端。改用 Hub 汇聚，并把「哪些 VPC 共享哪张路由表」作为设计对象，能同时解决可达性与隔离性。跨地域流量费用通常高于同地域，把调用频繁的服务放在同一地域，比事后优化路由更省钱。',
        },
        {
          type: 'checklist',
          title: '验证清单',
          items: [
            '三个 VPC 网段无重叠',
            '能说清对等连接不具备传递性',
            '每个方案都写出了双向路由',
            '知道跨地域互联应使用云连接或 TGW Peering',
            '能指出跨地域安全组引用不可用的风险',
            'terraform plan 无报错且未 apply',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm17-l04',
      moduleId: 'm17',
      title: '云上出口：NAT 网关、EIP、ELB 与私网 DNS',
      depth: '熟悉',
      minutes: 32,
      summary: '出向走 NAT 共享地址，入向走 ELB 加 EIP，内部访问靠私网 DNS 解耦地址。',
      objectives: [
        '区分 NAT 网关与 EIP 在出向和入向能力上的差异',
        '设计跨可用区的 NAT 与 ELB 部署，避免单点与额外流量费',
        '为内部服务规划私网域名并说明解析链路',
      ],
      keywords: ['NAT 网关', 'EIP', 'ELB', '私网 DNS', '出向', '入向'],
      blocks: [
        {
          type: 'paragraph',
          text: '云上出口要按方向拆开看。出向是内部实例主动访问公网，典型做法是把私有子网的默认路由指向 NAT 网关，由 NAT 用共享 EIP 做源地址转换，外部看不到内部地址，也无法主动连进来。入向是公网用户访问服务，应该让流量先到 ELB，再由 ELB 转发到后端实例，EIP 绑在 ELB 上而不是逐台实例上。内部服务之间则用私网 DNS 域名互相访问，避免把 IP 写进配置文件，换子网或做蓝绿发布时只需改解析。',
        },
        {
          type: 'analogy',
          title: '公司总机、门牌号与通讯录',
          text: 'NAT 网关像公司总机：所有分机打外线都显示同一个号码，外面回拨只能回到总机，不能直接拨某个分机。EIP 像挂在楼门口的门牌号，外人可以直接找上门。ELB 像前台，访客只跟前台打交道，前台再把人带到具体工位，某个工位没人时前台会自动跳过。私网 DNS 像内部通讯录，找财务部不用记工位号，部门搬了只需更新通讯录。',
        },
        {
          type: 'table',
          title: '三家厂商的出口与解析产品',
          columns: ['能力', '华为云', '阿里云', 'AWS'],
          rows: [
            ['出向地址转换', 'NAT 网关', 'NAT 网关', 'NAT Gateway'],
            ['弹性公网地址', '弹性公网 IP EIP', '弹性公网 IP EIP', 'Elastic IP'],
            ['负载均衡', '弹性负载均衡 ELB', '负载均衡 SLB、ALB、NLB', 'Elastic Load Balancing'],
            ['私网域名解析', '云解析服务内网域名', '云解析 PrivateZone', 'Route 53 私有托管区'],
            ['健康检查', 'ELB 后端健康检查', 'SLB 健康检查', 'Target Group 健康检查'],
            ['流量日志', 'VPC 流日志', 'VPC 流日志', 'VPC Flow Logs'],
          ],
        },
        {
          type: 'table',
          title: '五种出向方式的取舍',
          columns: ['方式', '是否共享地址', '是否支持入向', '适用场景'],
          rows: [
            ['NAT 网关', '是', '否', '大量实例访问公网，统一出口'],
            ['EIP 绑定实例', '否', '是', '少量需要固定公网地址的服务'],
            ['ELB 加 EIP', '是', '是', '对外提供网站或接口服务'],
            ['统一出口 VPC 加防火墙', '是', '视设计', '需要集中审计与安全策略'],
            ['正向代理', '是', '否', '需要应用层审计、缓存与限速'],
          ],
        },
        {
          type: 'steps',
          title: '实践任务：画出出向与入向两条路径',
          items: [
            {
              title: '拆方向',
              text: '画两条路径：私有子网实例访问公网走 NAT 网关加 EIP；公网用户访问服务走 ELB 加 EIP，两条路径不要混在一起。',
            },
            {
              title: '写 Terraform',
              text: '写出 NAT 网关、EIP、SNAT 规则与 0.0.0.0/0 路由，标注每个资源所属的可用区，只执行 terraform plan。',
            },
            {
              title: '检查跨可用区',
              text: '确认每个可用区是否都有 NAT 网关，说明只部署单 AZ NAT 时的跨 AZ 流量费用与故障影响。',
            },
            {
              title: '规划私网域名',
              text: '为内部服务设计域名，例如 api.prod.internal，写出解析记录、关联的 VPC 与 TTL 取值。',
            },
            {
              title: '只读核对 ELB',
              text: '查看现有 ELB 的监听端口、后端组与健康检查状态，记录一个不健康后端的排查路径。',
            },
          ],
        },
        {
          type: 'code',
          title: '阿里云 NAT 网关与 EIP 绑定（示例，仅 plan）',
          lang: 'hcl',
          code: `resource "alicloud_vpc" "prod" {
  vpc_name   = "vpc-prod"
  cidr_block = "10.20.0.0/16"
}

resource "alicloud_vswitch" "pub_a" {
  vpc_id       = alicloud_vpc.prod.id
  cidr_block   = "10.20.250.0/24"
  zone_id      = "cn-hangzhou-h"
  vswitch_name = "vsw-pub-h"
}

resource "alicloud_eip_address" "nat" {
  address_name = "eip-nat-prod"
}

resource "alicloud_nat_gateway" "prod" {
  vpc_id           = alicloud_vpc.prod.id
  nat_gateway_name = "nat-prod"
  nat_type         = "Enhanced"
  vswitch_id       = alicloud_vswitch.pub_a.id
}

resource "alicloud_eip_association" "nat" {
  allocation_id = alicloud_eip_address.nat.id
  instance_id   = alicloud_nat_gateway.prod.id
}`,
        },
        {
          type: 'output',
          title: '只读查看 ELB 后端健康状态',
          text: `$ aws elbv2 describe-target-health \\
    --target-group-arn arn:aws:elasticloadbalancing:cn-north-1:123456789012:targetgroup/tg-api/0a1b2c3d

TARGET HEALTH
  TargetId : i-0a1b2c3d4e5f
  Port     : 8080
  State    : unhealthy
  Reason   : Target.FailedHealthChecks
  Description: Health checks failed with these codes: [403]`,
        },
        {
          type: 'warning',
          title: '出口设计里的四个坑',
          text: '第一，NAT 网关通常按可用区部署，只在一个 AZ 建 NAT，跨 AZ 调用会产生额外流量费，NAT 所在 AZ 故障时其他 AZ 也无法出网，正确做法是每个 AZ 各建一个。第二，把 EIP 直接绑在每台实例上，扩容、替换、迁移都要重新申请地址，还会暴露过多入口。第三，NAT 只支持出向，别指望用它接收公网请求。第四，私网 DNS 记录必须与目标 VPC 关联，未关联的 VPC 解析不到，且修改记录后要等 TTL 过期才全面生效。',
        },
        {
          type: 'tip',
          title: '域名要早于架构落地',
          text: '内部服务一上线就用私网域名互相调用，比先写 IP 再补域名省事得多。命名建议采用「服务.环境.内网域」，例如 order.prod.internal，解析记录由 IaC 管理并与服务一起评审。这样迁移子网、切换蓝绿环境、跨 VPC 调用时都只改解析，不用逐个改配置文件，也避免了把地址硬编码进镜像。',
        },
        {
          type: 'checklist',
          title: '验证清单',
          items: [
            '出向与入向路径在图上完全分开',
            'NAT 网关与 EIP 的可用区标注明确',
            '私有子网路由表中 0.0.0.0/0 指向 NAT',
            '公网入向不经过 NAT，而是经 ELB',
            '私网域名已关联目标 VPC 并设置合理 TTL',
            'ELB 健康检查的路径、端口与预期返回码正确',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm17-l05',
      moduleId: 'm17',
      title: 'VPC 五步排障法：连通性、路由、安全组、DNS、流日志',
      depth: '精通',
      minutes: 36,
      summary: '先确认现象，再查路、再查策略、再查名字，最后用流日志确认丢在哪一跳。',
      objectives: [
        '按五步顺序定位 VPC 内的连通性问题，避免盲目改配置',
        '区分安全组与网络 ACL 的有状态差异及排错要点',
        '用流日志、ELB 日志与解析结果形成可复现的证据链',
      ],
      keywords: ['排障', '连通性', '安全组', '网络 ACL', '流日志', 'DNS'],
      blocks: [
        {
          type: 'paragraph',
          text: '云上排障最大的干扰是「看不见中间设备」：没有物理接口可以抓包，traceroute 往往只显示一跳，到主机的路径被 Overlay 隐藏。因此需要一套固定顺序，避免在错误的方向上改配置。五步法是：先确认现象与方向，再查路由有没有路，再查安全组与网络 ACL 允不允许，再查 DNS 名字对不对，最后用流日志与负载均衡日志确认丢在哪一跳。顺序不能乱，否则很容易在安全组上反复加规则，实际问题却是路由表改错了。',
        },
        {
          type: 'table',
          title: '五步检查表',
          columns: ['步骤', '核心问题', '只读操作', '典型现象'],
          rows: [
            ['连通性', '是超时、拒绝还是解析失败', 'ping、telnet、curl、mtr', '超时多为网络或策略丢弃，拒绝多为端口未监听'],
            ['路由', '子网关联哪张表，最长匹配命中哪条', '控制台查看路由表，CLI 导出', '同 VPC 通、跨 VPC 不通，多为缺路由'],
            ['安全组', '入向与出向规则是否放通源端口', '查看安全组规则与绑定对象', 'ICMP 不放通导致 ping 不通'],
            ['DNS', '域名解析到哪个地址', 'dig、nslookup，查看解析记录', '解析到旧地址或公网地址'],
            ['流日志', '丢包发生在哪一跳', 'VPC 流日志、ELB 访问日志', '出现 REJECT 或 NODATA 记录'],
          ],
        },
        {
          type: 'table',
          title: '安全组与网络 ACL 的差异',
          columns: ['对比项', '安全组', '网络 ACL'],
          rows: [
            ['状态', '有状态，返回流量自动放通', '无状态，双向都要显式放通'],
            ['作用对象', '实例或虚拟网卡', '子网'],
            ['规则类型', '通常只支持允许规则', '支持允许与拒绝，按序号匹配'],
            ['默认策略', '默认拒绝入向、允许出向', '默认规则随厂商不同，需逐条确认'],
            ['典型误配', '只放通 443 忘记放通健康检查端口', '只放通入向，忽略返回的临时端口'],
          ],
        },
        {
          type: 'paragraph',
          text: '传统网络里的 ACL 与防火墙经验仍然有效，但要换一种落点：以前在汇聚交换机上写 ACL 控制网段，现在优先用安全组做实例级、有状态的精细控制，用网络 ACL 做子网级的粗粒度兜底；以前靠防火墙会话表判断回程，现在要记住安全组本身有状态、而网络 ACL 没有。另一个差异是 traceroute：云上中间跳通常不回应 TTL 超时，路径不完整并不代表网络异常，应改用流日志与逐段探测。',
        },
        {
          type: 'steps',
          title: '五步法的执行顺序',
          items: [
            {
              title: '复现与分类',
              text: '记录源、目的、端口、协议与时间，判断是超时、连接被拒绝还是域名解析失败，三者指向完全不同的层。',
            },
            {
              title: '检查路由',
              text: '确认源子网与目的子网各自关联的路由表，按最长匹配写出下一跳，检查是否存在黑洞条目或只配了单向路由。',
            },
            {
              title: '检查策略',
              text: '查看源实例出向、目的实例入向的安全组，再检查两侧子网的网络 ACL，注意无状态设备需要放通返回流量。',
            },
            {
              title: '检查解析',
              text: '用 dig 查域名对应的地址，确认它属于当前环境的 ELB 或实例，排除解析到旧地址、公网地址或缓存未过期。',
            },
            {
              title: '用日志定论',
              text: '开启或查询 VPC 流日志，按五元组过滤，查看 ACCEPT 与 REJECT 记录，再结合 ELB 访问日志确认请求是否到达后端。',
            },
          ],
        },
        {
          type: 'code',
          title: '一组只读排障命令（不修改任何资源）',
          lang: 'bash',
          code: `# 1. 端口连通性：超时与拒绝要区分
curl -v --connect-timeout 3 https://api.example.com/health
telnet 10.20.1.50 8080

# 2. 路由表：确认子网关联与最长匹配
aws ec2 describe-route-tables \\
  --filters Name=vpc-id,Values=vpc-0a1b2c3d \\
  --query "RouteTables[].{Id:RouteTableId,Routes:Routes,Assoc:Associations}" \\
  --output json

# 3. 安全组：查看入向与出向规则
aws ec2 describe-security-groups --group-ids sg-0a1b2c3d --output json

# 4. DNS：确认解析结果
dig +short api.prod.internal

# 5. 流日志：确认是否已开启及投递位置
aws ec2 describe-flow-logs \\
  --filter Name=resource-id,Values=vpc-0a1b2c3d`,
        },
        {
          type: 'output',
          title: '流日志里的一次拒绝',
          text: `version account-id interface-id srcaddr dstaddr srcport dstport protocol packets bytes start end action log-status
2 123456789012 eni-0a1b2c3d 10.20.1.15 10.20.2.20 443 51234 6 12 840 1763700000 1763700060 ACCEPT OK
2 123456789012 eni-0a1b2c3d 10.20.1.15 10.20.2.20 3306 51236 6 1 40 1763700000 1763700060 REJECT OK
2 123456789012 eni-0a1b2c3d 10.20.1.15 10.20.2.21 443 51240 6 0 0 1763700060 1763700120 NODATA OK`,
        },
        {
          type: 'steps',
          title: '实践任务：用五步法复盘一次公网访问失败',
          items: [
            {
              title: '设定现象',
              text: '选一个真实或虚构的故障，例如「公网用户访问 ELB 上的接口返回超时」，先写下源、目的、端口与发生时间。',
            },
            {
              title: '第一步连通性',
              text: '从客户端执行 curl 与 telnet，记录是超时、拒绝还是证书错误；超时优先怀疑网络与策略，拒绝优先怀疑端口未监听。',
            },
            {
              title: '第二、三步路由与策略',
              text: '查 ELB 与后端子网的路由表，再查 ELB 安全组与后端安全组，最后确认子网网络 ACL 是否双向放通。',
            },
            {
              title: '第四步 DNS',
              text: '用 dig 或 nslookup 查域名，确认解析结果指向当前 ELB 的 EIP，而不是旧环境或公网地址。',
            },
            {
              title: '第五步日志',
              text: '查 VPC 流日志中的 REJECT 记录与 ELB 访问日志，确认请求是否到达后端、健康检查是否失败。',
            },
            {
              title: '输出结论',
              text: '把结论写成「哪一层、哪条配置、改成什么」，并给出回归验证方法，避免只写「网络问题已处理」。',
            },
          ],
        },
        {
          type: 'warning',
          title: '五个容易误判的现象',
          text: '安全组不放通 ICMP 时 ping 不通，但业务端口可能是通的；网络 ACL 无状态，只放通入向会导致回程被丢；云上 traceroute 显示不完整是常态，不能据此断定链路中断；DNS 解析成功只说明名字能翻译，不代表路由可达；ELB 健康检查失败可能是安全组没放通健康检查端口，也可能是应用返回了非预期状态码。每一条都要用独立证据验证，不能凭经验下结论。',
        },
        {
          type: 'tip',
          title: '把排障过程变成可复用资产',
          text: '每次排障都记录五步的证据：路由表导出、安全组规则、解析结果、流日志片段、时间线。事后把这些整理成检查脚本或 Runbook，下一次同类问题可以在几分钟内定位。团队里最常见的低效不是不会查，而是每次从零开始猜；把顺序和命令固化下来，排障能力才可复制。',
        },
        {
          type: 'checklist',
          title: '验证清单',
          items: [
            '每一步都有可复现的命令或截图证据',
            '能区分超时、拒绝与解析失败三种现象',
            '能说出安全组有状态、网络 ACL 无状态的差异',
            '结论落到具体配置项而不是「网络问题」',
            '给出修复动作与回归验证方法',
            '排障过程已整理成可复用的检查清单',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
