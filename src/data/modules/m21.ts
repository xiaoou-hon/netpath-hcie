import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm21',
  code: 'M21',
  title: '混合云与多云互联自动化',
  summary:
    '混合云与多云把两张网接成一张：专线、VPN 与 SD-WAN 解决入云，云间路由与统一地址规划解决多云互通，Terraform 与 GitOps 把变更变成可评审的代码，流日志与 Telemetry 让跨云排障和成本可度量。',
  stage: 'L4',
  order: 21,
  track: 'cloud',
  priority: 'P1',
  prerequisites: ['m17', 'm19', 'm09'],
  goals: [
    '对比云专线、IPsec VPN 与 SD-WAN 入云的开通周期、质量与成本取舍',
    '设计多云互联拓扑，正确选择对等连接、企业路由与 Transit Gateway',
    '完成不重叠的跨云地址规划，并处理云间 DNS 解析与路由传递',
    '用 Terraform 管理云网络资源，并以 GitOps 流程完成评审、计划与应用',
    '用流日志、云监控与 Telemetry 定位跨云故障并核对流量成本',
  ],
  keywords: [
    '云专线',
    'IPsec VPN',
    'SD-WAN',
    'CEN',
    'Transit Gateway',
    '对等连接',
    '地址规划',
    'Terraform',
    'GitOps',
    '流日志',
    'Telemetry',
    '多云互联',
  ],
  lessons: [
    {
      id: 'm21-l01',
      moduleId: 'm21',
      title: '混合云组网：专线、VPN 与 SD-WAN 入云',
      depth: '精通',
      minutes: 36,
      summary: '专线求稳、VPN 求快、SD-WAN 求灵活；生产常用双专线加 VPN 备份，靠 BGP 收敛。',
      objectives: [
        '对比专线、IPsec VPN 与 SD-WAN 入云的带宽、时延、开通周期与成本',
        '说明云专线从下单到割接的完整流程与三层配置要点',
        '把传统 MPLS VPN、IPsec VPN 与静态路由经验映射到云上互联',
      ],
      keywords: ['云专线', 'IPsec VPN', 'SD-WAN', '专线网关', 'BGP', 'MTU', '双活'],
      blocks: [
        {
          type: 'paragraph',
          text: '混合云的第一步，是把本地数据中心与云上 VPC 连成一张可路由的网。三条主路各有取舍：物理专线稳定、时延低，但开通以周计、成本高；IPsec VPN 走公网、小时级开通，质量随公网波动；SD-WAN 把多条公网或专线叠加，由控制器做应用级选路与集中编排，适合分支多、扩张快的场景。生产环境常见组合是双专线走不同接入点，再加一条 VPN 作为第三备份。',
        },
        {
          type: 'analogy',
          title: '专用道、拼车与智能物流',
          text: '专线像企业包下的专用道，不堵车但要提前修路；IPsec VPN 像拼车走公共道路，出发快，但堵不堵不由你决定，只能给行李加锁；SD-WAN 像有调度中心的物流车队，同时盯着几条路的路况，哪条快就走哪条。三者可以并存：关键货走专用道，临时件走拼车，调度中心统一决定。',
        },
        {
          type: 'table',
          title: '三种入云方式对比',
          columns: ['维度', '云专线', 'IPsec VPN', 'SD-WAN 入云'],
          rows: [
            ['承载', '运营商物理或逻辑专线', '公网 IPsec 隧道', '多条公网或专线叠加'],
            ['时延与稳定性', '低且稳定，可承诺 SLA', '受公网影响，波动明显', '持续探测，可按质量选路'],
            ['开通周期', '周级，需勘测施工', '小时级', '天级，需部署 CPE 或虚拟网关'],
            ['成本', '高，按端口与带宽计费', '低', '中等，含控制器与链路费用'],
            ['典型用途', '核心生产、数据迁移', '分支接入、备份通道', '多分支、跨境、快速扩张'],
          ],
        },
        {
          type: 'table',
          title: '传统广域技术到云上的映射',
          columns: ['传统技术', '云上对应', '迁移要点'],
          rows: [
            ['MPLS VPN', '云专线加专线网关', '把 VPN 实例的隔离思路换成 VPC 路由与 BGP'],
            ['IPsec VPN', '云 VPN 网关', 'IKE 版本、加密算法与感兴趣流必须两端对齐'],
            ['静态路由', '云路由表', '按子网关联路由表，注意最长匹配与路由优先级'],
            ['BFD 快速检测', 'BGP 加隧道健康检查', '云侧多用健康检查，切换时间要实测而非假设'],
            ['QoS 队列', '带宽包与流量整形', '云上更依赖带宽规格与限速，端到端 QoS 需重新设计'],
          ],
        },
        {
          type: 'code',
          title: '用 Terraform 建立带 BGP 的站点到站点 VPN',
          lang: 'hcl',
          code: `resource "aws_customer_gateway" "idc" {
  bgp_asn    = 65010
  ip_address = "203.0.113.10"
  type       = "ipsec.1"

  tags = {
    Name = "idc-gateway"
  }
}

resource "aws_vpn_gateway" "vgw" {
  vpc_id = aws_vpc.prod.id
}

resource "aws_vpn_connection" "idc" {
  vpn_gateway_id      = aws_vpn_gateway.vgw.id
  customer_gateway_id = aws_customer_gateway.idc.id
  type                = "ipsec.1"
  static_routes_only  = false
}`,
        },
        {
          type: 'steps',
          title: '云专线从下单到割接',
          items: [
            {
              title: '需求与选址',
              text: '确认带宽、冗余等级、云侧地域与接入点，评估是否需要不同城市双接入。',
            },
            {
              title: '云侧准备',
              text: '创建专线网关、VPC 与子网，规划互联地址与私有 ASN，避免与 IDC 或其他云冲突。',
            },
            {
              title: '运营商施工',
              text: '下单、勘测、布线、端口调测，确认光模块类型、链路衰减与倒换测试结果。',
            },
            {
              title: '三层配置',
              text: '配置互联地址与 BGP 邻居，做路由过滤、优先级与最大前缀限制，防止路由震荡。',
            },
            {
              title: '验证与割接',
              text: '双向 ping、路由表核对、流日志确认，按业务分批切换，保留回退路径与回退时限。',
            },
          ],
        },
        {
          type: 'checklist',
          title: '专线割接前检查',
          items: [
            '云侧与 IDC 的私有 ASN 不冲突，互联地址段无重叠',
            '双专线走不同接入点或不同运营商，避免同沟同缆',
            'MTU 已对齐，大包与分片行为经过验证',
            'BGP 邻居、路由过滤与最大前缀限制已配置',
            'VPN 备份通道已完成真实切换演练',
            '回退步骤、联系人与时间窗已确认',
          ],
        },
        {
          type: 'warning',
          title: 'ASN 冲突、地址重叠与 MTU 是三条硬约束',
          text: '云侧、IDC 与其他云各用不同的私有 ASN，否则 BGP 邻居起不来或路由被拒；互联地址段不能与任何 VPC、IDC 网段重叠，重叠后路由表里只会留下一条，表现为部分业务时通时不通；MTU 不一致会让大包被静默丢弃，典型现象是 ping 小包正常、数据库连接或 TLS 握手卡住。再加上单专线单点，任何一条都足以让割接失败。',
        },
        {
          type: 'tip',
          title: '备份通道要「平时可用」',
          text: '只配置不验证的 VPN 备份，在真故障时往往起不来：预共享密钥过期、感兴趣流不匹配、路由未注入，任何一个都会让切换失败。定期做无业务影响的切换演练，记录 BGP 收敛时间、隧道重建时间与业务超时阈值，确认备份真的能兜住。SD-WAN 场景还要验证控制器失联时的本地转发策略。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm21-l02',
      moduleId: 'm21',
      title: '多云互联：云间路由、DNS 与地址规划',
      depth: '精通',
      minutes: 34,
      summary: '对等连接点对点不传递，企业路由与 Transit Gateway 做枢纽；地址不重叠是一切前提。',
      objectives: [
        '对比对等连接、企业路由与 Transit Gateway 的拓扑和传递性',
        '完成跨 Region、跨云的不重叠地址规划与预留',
        '配置云间私有 DNS 解析与路由，避免「能 ping 通却连不上」',
      ],
      keywords: ['对等连接', 'CEN', 'Transit Gateway', '地址规划', '私有 DNS', '路由传递'],
      blocks: [
        {
          type: 'paragraph',
          text: '多云互联有三类做法：VPC 对等连接是点对点，配置简单但不传递；中心枢纽用云企业网或 Transit Gateway，把多个 VPC、多个地域甚至 IDC 挂到同一个路由域，由枢纽统一转发；跨云之间则通过专线或 VPN 把两家云的路由域接起来。规模小的时候对等连接就够，VPC 一多、账号一多，枢纽的路由表分段和运维集中优势就体现出来。无论选哪种，地址不重叠都是前提。',
        },
        {
          type: 'analogy',
          title: '直线电话、交换中心与城市高速',
          text: '对等连接像两家公司拉一条直线电话，只能这两家通话，第三家要另拉一条；Transit Gateway 像城市交换中心，所有线路先接到枢纽再转接，新增一家只需接一根线；云企业网像区域高速网，把多个城市接进同一张路网。交换中心也会分区，生产、测试、共享服务各用不同路由表，避免不该通的也通了。',
        },
        {
          type: 'table',
          title: '云间互联方案对比',
          columns: ['方案', '拓扑', '路由是否传递', '适用规模', '注意事项'],
          rows: [
            ['VPC 对等连接', '点对点', '否', '少量 VPC', '两侧都要配路由，网段不能重叠'],
            ['Transit Gateway', '星型枢纽', '是', '多 VPC、多账号', '路由表要分段，附件与流量按量计费'],
            ['CEN 或云企业网', '枢纽加网状', '是', '多地域、多账号', '关注带宽包、地域策略与路由策略'],
            ['跨云 VPN 或专线', '点对点', '视配置', '多云混合', '双方 ASN、加密算法与 MTU 要对齐'],
            ['SD-WAN Overlay', '逻辑全互联', '是', '多分支多云', '控制器与云网关的兼容性需验证'],
          ],
        },
        {
          type: 'table',
          title: '一份可扩展的地址规划',
          columns: ['用途', '网段', '说明'],
          rows: [
            ['生产 VPC（地域 A）', '10.20.0.0/16', '每个可用区一个 /24 子网，预留扩容'],
            ['生产 VPC（地域 B）', '10.21.0.0/16', '与 A 不重叠，便于后续打通'],
            ['测试与预发', '10.30.0.0/16', '独立路由域，默认不与生产互通'],
            ['共享服务', '10.40.0.0/16', 'DNS、目录服务、镜像仓库、监控'],
            ['并购与新业务预留', '10.50.0.0/16 至 10.99.0.0/16', '提前登记，禁止随手切分'],
          ],
        },
        {
          type: 'code',
          title: '用 Terraform 建立 Transit Gateway 与 VPC 附件',
          lang: 'hcl',
          code: `resource "aws_ec2_transit_gateway" "core" {
  description                     = "multi-vpc-hub"
  default_route_table_association = "disable"
  default_route_table_propagation = "disable"

  tags = {
    Name = "core-tgw"
  }
}

resource "aws_ec2_transit_gateway_vpc_attachment" "prod" {
  subnet_ids         = aws_subnet.prod_private[*].id
  transit_gateway_id = aws_ec2_transit_gateway.core.id
  vpc_id             = aws_vpc.prod.id
}`,
        },
        {
          type: 'steps',
          title: '多云互联设计的五个步骤',
          items: [
            {
              title: '业务与流量矩阵',
              text: '列出哪些系统需要互通、方向、峰值带宽与时延要求，区分生产、测试与共享服务。',
            },
            {
              title: '地址规划',
              text: '按地域与业务分配固定网段，登记到 IPAM，确认与 IDC、其他云、合作方都不重叠。',
            },
            {
              title: '拓扑选型',
              text: '少量 VPC 用对等连接，多账号多地域用枢纽，跨云用专线或 VPN，避免临时叠加。',
            },
            {
              title: '路由与 DNS',
              text: '设计路由表分段与传播范围，配置私有 DNS 区、解析器与跨云转发，验证正反向解析。',
            },
            {
              title: '验证与运维',
              text: '逐段验证连通性与流日志，建立变更评审与容量监控，把新增 VPC 纳入标准流程。',
            },
          ],
        },
        {
          type: 'warning',
          title: '对等连接不传递，地址重叠无解',
          text: 'A 与 B 对等、B 与 C 对等，不代表 A 能访问 C，必须在 A 与 C 之间再建连接，或改用枢纽统一转发。地址重叠时任何路由技巧都救不了：同一目的网段出现两条来源，转发只能二选一，表现为部分业务随机不通，只能做 NAT 转换或重新规划网段。跨云 DNS 也常被忽略，私有域名解析不到会让应用出现「能 ping 通却连不上」的假象。',
        },
        {
          type: 'tip',
          title: '先定地址，再定互联',
          text: '地址规划是一次性成本最低、返工成本最高的事。给每个地域或业务单元分配固定 /16，子网按可用区用 /24 切分，用 IPAM 记录归属与状态，禁止从 10.0.0.0/8 随手切一段。提前预留并购与新区块，比事后做 NAT 便宜得多。互联方案可以随规模演进，地址一旦上线就很难改。',
        },
        {
          type: 'checklist',
          title: '多云互联上线前检查',
          items: [
            '所有 VPC、IDC 与合作方网段已登记且无重叠',
            '对等连接或枢纽的路由表已按环境分段',
            '跨云 DNS 正反向解析与转发链路验证通过',
            '路由传播范围符合最小必要，测试域无法直达生产',
            '关键路径有双链路或备份通道',
            '新增 VPC 的接入流程与命名规范已文档化',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm21-l03',
      moduleId: 'm21',
      title: '云网络自动化：API、Terraform、Ansible 与 GitOps',
      depth: '精通',
      minutes: 38,
      summary: 'API 是原子能力，Terraform 管资源生命周期，Ansible 管配置，GitOps 把变更流程固化。',
      objectives: [
        '说明 API、Terraform、Ansible 与 GitOps 各自解决的问题与边界',
        '读懂并改写包含远程 state、VPC、子网与安全组的 Terraform 片段',
        '按 GitOps 流程完成一次可评审、可回滚的网络变更',
      ],
      keywords: ['OpenAPI', 'Terraform', 'state', 'Ansible', 'GitOps', 'CI/CD', '漂移检测'],
      blocks: [
        {
          type: 'paragraph',
          text: '云网络自动化的价值不在于「会不会写脚本」，而在于变更是否可评审、可复现、可回滚。API 是云厂商暴露的原子能力，适合应急查询与单点操作；Terraform 用声明式配置管理资源生命周期，plan 能提前展示将要发生的变更；Ansible 擅长在多云主机与网络设备上执行幂等任务；GitOps 则把 Git 作为唯一事实源，用分支、评审、流水线和漂移检测把整个流程固化下来。四者层次不同，组合使用而不是互相替代。',
        },
        {
          type: 'analogy',
          title: '建材市场、施工图纸、施工队与监理',
          text: 'API 像建材市场，要什么拿什么，但拿完不留记录；Terraform 像施工图纸，先描述最终房子长什么样，再对比现状算出要改哪几面墙；Ansible 像施工队，按步骤装灯、布线、刷漆；GitOps 像监理流程，图纸先评审，按图施工，每次变更都留痕，发现现场和图纸不一致就报警。',
        },
        {
          type: 'table',
          title: '自动化工具的定位与边界',
          columns: ['工具', '模型', '强项', '弱项'],
          rows: [
            ['云 API 与 CLI', '命令式', '原子操作、应急排查、快速验证', '无状态，难复现，易产生漂移'],
            ['Terraform', '声明式', '资源生命周期、plan 预览、依赖排序', 'state 管理复杂，不适合装软件'],
            ['Ansible', '任务式，幂等', '多云主机与网络设备配置、批量执行', '大规模状态一致性弱，缺少资源图'],
            ['GitOps', '声明式加流程', '评审、审计、自动同步、漂移检测', '依赖 CI/CD 与权限体系'],
          ],
        },
        {
          type: 'code',
          title: '带远程 state 与锁的 Terraform 片段',
          lang: 'hcl',
          code: `terraform {
  required_version = ">= 1.5"

  backend "s3" {
    bucket         = "netpath-tfstate"
    key            = "network/prod/vpc.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "netpath-tf-lock"
    encrypt        = true
  }
}

resource "aws_vpc" "prod" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "prod-vpc"
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.prod.id
  cidr_block        = cidrsubnet(aws_vpc.prod.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
}

resource "aws_security_group" "app" {
  name   = "app-tier"
  vpc_id = aws_vpc.prod.id

  ingress {
    description     = "from internal lb"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.lb.id]
  }
}`,
        },
        {
          type: 'code',
          title: 'GitHub Actions 中的网络变更计划流水线',
          lang: 'yaml',
          code: `name: network-plan

on:
  pull_request:
    paths:
      - "network/**"

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform fmt -check
      - run: terraform init
      - run: terraform validate
      - run: terraform plan -out=tfplan`,
        },
        {
          type: 'steps',
          title: '实践任务：走一遍 GitOps 网络变更',
          items: [
            {
              title: '建仓与分栈',
              text: '按环境与模块拆分目录，state 也按模块拆分，避免一次 apply 影响整张网。',
            },
            {
              title: '提交 PR',
              text: '修改 HCL，写清变更目的、影响范围、回滚方式与验证步骤，不直接推主干。',
            },
            {
              title: 'CI 校验',
              text: '流水线执行 fmt、validate 与 plan，把 plan 结果贴到 PR，让评审看到具体增删改。',
            },
            {
              title: '评审与合并',
              text: '网络与安全双人评审，确认路由、放通范围与成本影响后再合并。',
            },
            {
              title: '应用与验证',
              text: '合并后由 CD 执行 apply，用同一份计划或加人工审批，随后跑连通性与流日志验证。',
            },
            {
              title: '漂移检测',
              text: '定时执行 plan，发现控制台手工改动立即告警，并把改动回补到代码或回滚。',
            },
          ],
        },
        {
          type: 'checklist',
          title: 'Terraform 与 GitOps 自查清单',
          items: [
            'state 存放在远端并启用加密与锁，未提交到 Git',
            '敏感信息通过环境变量或密钥管理注入，代码与 state 中都没有明文凭据',
            '资源按 VPC、互联、安全域分栈，变更影响面可控',
            'plan 结果经过评审，apply 使用同一份计划',
            '已开启定时 plan 做漂移检测',
            '每次变更都有对应的验证步骤与回滚方案',
          ],
        },
        {
          type: 'warning',
          title: 'state 是自动化里最脆弱的部分',
          text: '多人同时 apply 会触发锁冲突，state 放本地会随机器丢失，手工改控制台会产生漂移，而 plan 与 apply 之间资源被改动会让结果与预期不一致。更危险的是把 AK/SK 写进代码或变量文件，一旦推到远端仓库就等于公开泄露。必须使用远程后端加锁、短期凭证与最小权限，并把 state 视为敏感数据单独保护。',
        },
        {
          type: 'tip',
          title: '小步、分栈、可回滚',
          text: '把网络按 VPC、互联、安全域拆成独立 state，每次只改一件事，PR 小到能在十分钟内评审完。保留上一版代码与路由快照，出问题能快速回退。对高风险变更，先在测试账号跑通同一份代码，再提升到生产，而不是在生产上直接调试。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm21-l04',
      moduleId: 'm21',
      title: '云网络可观测性与排障：流日志、Telemetry 与成本',
      depth: '熟悉',
      minutes: 32,
      summary: '流日志看五元组与放行结果，指标看趋势，日志看原因；排障要先定边界，再核对成本。',
      objectives: [
        '说明流日志、云监控指标、防护日志与配置审计各自能回答什么问题',
        '编写流日志查询，定位被拒绝的来源、目的与端口',
        '按五步法排查跨云访问故障，并识别跨可用区、NAT 与专线的成本项',
      ],
      keywords: ['流日志', 'Telemetry', '云监控', '成本', 'NAT', '跨可用区', '排障'],
      blocks: [
        {
          type: 'paragraph',
          text: '云上排障的难点是「看不见」：没有机柜、没有分光口，流量穿过虚拟网关、NAT、负载均衡和安全组多层设备。可用的数据有三类：流日志记录谁和谁在什么时候通信、被允许还是拒绝；指标反映带宽、连接数、NAT 端口使用率与隧道状态；防护与应用日志说明请求命中了哪条规则、在哪一跳变慢。排障之外还要看成本，跨可用区、跨地域、NAT 处理与专线端口都是账单里增长最快的部分。',
        },
        {
          type: 'analogy',
          title: '行车记录仪、仪表盘与 ETC 流水',
          text: '流日志像行车记录仪，能回放某段时间走了哪条路、在哪个路口被拦；指标像仪表盘，告诉你车速、油温和转速的趋势；账单像 ETC 流水，告诉你哪些路段收费最高。车没劲时先看仪表盘，再回放记录仪，最后对账看是不是绕路太多。三者缺一，判断就只能靠猜。',
        },
        {
          type: 'table',
          title: '可观测性数据源对比',
          columns: ['数据源', '粒度', '能回答的问题', '限制'],
          rows: [
            ['VPC 流日志', '连接级五元组', '谁访问谁、ACCEPT 还是 REJECT、字节与包数', '采集与存储有费用，存在分钟级延迟'],
            ['云监控指标', '时间序列', '带宽、连接数、丢包、隧道与专线状态', '默认聚合，细节较少'],
            ['防火墙与 WAF 日志', '请求级', '命中哪条规则、为何被拦截', '日志量大，通常需要采样'],
            ['应用链路追踪', '请求链路', '哪一跳慢、错误码与依赖关系', '需要埋点与上下文传递'],
            ['配置审计', '变更事件', '谁在什么时候改了什么', '非实时，需与故障时间对齐'],
          ],
        },
        {
          type: 'table',
          title: '传统运维手段与云上对应',
          columns: ['传统手段', '云上对应', '迁移要点'],
          rows: [
            ['SNMP 轮询', '云监控指标', '注意 API 限流与聚合周期，秒级需求改用推送'],
            ['NetFlow 或 sFlow', 'VPC 流日志', '字段更少，注意采样率与聚合窗口'],
            ['分光与镜像', '流量镜像', '镜像带宽与费用需单独评估'],
            ['Syslog 集中采集', '日志服务', '采集、索引与保留策略直接影响成本'],
            ['Telemetry 推送', '云监控加事件总线', '用订阅替代轮询，减少采集延迟'],
          ],
        },
        {
          type: 'code',
          title: '为 VPC 开启流日志',
          lang: 'bash',
          code: `aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-0123456789abcdef0 \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /netpath/flowlogs`,
        },
        {
          type: 'code',
          title: '查询被拒绝次数最多的来源与端口',
          lang: 'sql',
          code: `fields @timestamp, srcAddr, dstAddr, dstPort, action
| filter action = "REJECT"
| stats count() as attempts by srcAddr, dstPort
| sort attempts desc
| limit 20`,
        },
        {
          type: 'steps',
          title: '实践任务：五步定位跨云访问故障',
          items: [
            {
              title: '定边界',
              text: '确认源与目的的 IP、端口、协议、时间窗，先判断是同 VPC、跨 VPC 还是跨云。',
            },
            {
              title: '看拒绝',
              text: '在流日志中筛 REJECT，按来源与端口聚合，先区分是安全组还是 NACL 拦截。',
            },
            {
              title: '看路由',
              text: '检查路由表是否有目的网段、下一跳是否可达，对等连接、枢纽与 NAT 是否放通。',
            },
            {
              title: '看端点',
              text: '确认实例监听、负载均衡健康检查、DNS 解析与主机防火墙，避免只盯着网络层。',
            },
            {
              title: '对账与复盘',
              text: '核对变更记录与账单，确认是否因跨可用区或 NAT 产生额外流量，沉淀排查规则。',
            },
          ],
        },
        {
          type: 'checklist',
          title: '可观测性与成本自查',
          items: [
            '关键 VPC 已开启流日志，保留周期符合审计要求',
            '流日志字段包含 action，能区分 ACCEPT 与 REJECT',
            'NAT 网关端口使用率与连接数已设告警',
            '专线与 VPN 隧道状态、时延与丢包已纳入监控',
            '资源标签包含业务与成本中心，可做费用分摊',
            '定期检查跨可用区与跨地域流量，评估是否可收敛',
          ],
        },
        {
          type: 'warning',
          title: '流日志不是抓包，NAT 之后源地址会变',
          text: '流日志不记录载荷，采样与聚合会漏掉短连接，因此不能代替抓包做协议级分析。经过 NAT 后，服务端看到的源地址是 NAT 的私网地址，按真实客户端 IP 过滤会一无所获，必须结合 NAT 日志或负载均衡日志还原。跨可用区流量还有额外费用，排障时看到带宽正常，账单可能已经翻倍。采集本身也收费，全量开启前先估算存储与索引成本。',
        },
        {
          type: 'tip',
          title: '先建基线，再看偏离',
          text: '把正常时段的连接数、带宽、NAT 端口使用率、专线时延记录下来，形成基线。故障时不是问「有没有异常」，而是问「偏离基线多少、从什么时候开始」，这比凭感觉判断快得多。告警阈值也应基于基线设置，否则业务高峰会被反复误报，运维人员很快对告警脱敏。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
