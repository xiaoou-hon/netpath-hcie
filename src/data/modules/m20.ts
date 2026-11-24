import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm20',
  code: 'M20',
  title: '云网络安全与零信任',
  summary:
    '云上安全边界从机房围墙搬到身份与策略：先厘清责任共担，再用安全组与网络 ACL 做默认拒绝的分层过滤，叠加云防火墙、WAF、DDoS 清洗与入侵检测，最后以零信任和加密接入收敛信任范围。',
  stage: 'L4',
  order: 20,
  track: 'cloud',
  priority: 'P0',
  prerequisites: ['m16', 'm17', 'm09'],
  goals: [
    '按 IaaS、PaaS、SaaS 划分云商与客户的安全责任，并识别五类安全边界',
    '区分安全组与网络 ACL 的状态、粒度与匹配方式，写出默认拒绝的分层规则',
    '用云防火墙、WAF、DDoS 清洗与入侵检测组成南北向与东西向的纵深防护',
    '解释零信任的身份、设备与上下文授权模型，并设计加密接入方案',
    '把传统防火墙安全域与 ACL 经验迁移为云上安全组、NACL 与身份策略',
  ],
  keywords: [
    '责任共担',
    '安全组',
    '网络 ACL',
    '微分段',
    '云防火墙',
    'WAF',
    'DDoS 清洗',
    '入侵检测',
    '零信任',
    '加密接入',
    '身份策略',
    'VPN',
  ],
  lessons: [
    {
      id: 'm20-l01',
      moduleId: 'm20',
      title: '云安全责任共担与边界模型',
      depth: '熟悉',
      minutes: 28,
      summary: '云商管机房与虚拟化，客户管系统、数据与配置；边界从物理围墙变成五层控制点。',
      objectives: [
        '按服务模型说明云商与客户各自承担的安全责任',
        '画出物理、网络、身份、数据与应用五类安全边界',
        '用只读 CLI 盘点 VPC、子网、安全组与流日志等边界资产',
      ],
      keywords: ['责任共担', '安全边界', 'IaaS', 'PaaS', 'SaaS', '资产盘点'],
      blocks: [
        {
          type: 'paragraph',
          text: '上云之后，机房的围墙没有了，但安全责任没有消失，只是被切开。云商负责物理机房、宿主机、虚拟化层与骨干网络的安全，客户负责自己放到云上的操作系统、应用、数据、身份与网络配置。这条分界线由服务模型决定：IaaS 切在虚拟化层之上，PaaS 切在运行时之上，SaaS 则几乎把应用本身交给云商。理解这条线，才知道哪些告警必须自己处理，哪些可以提交工单。',
        },
        {
          type: 'analogy',
          title: '合租公寓的水电与门锁',
          text: '房东负责楼体、总电箱、消防通道与门禁系统，租户负责自己房间的门锁、贵重物品与访客管理。房东不会替你锁门，你也不能私自改总电箱。责任共担模型就是这份租赁合同：分清谁维护哪一部分，出了事才知道该找谁，也才知道哪些事根本不能等别人。',
        },
        {
          type: 'table',
          title: '不同服务模型下的责任划分',
          columns: ['服务模型', '云商负责', '客户负责', '典型例子'],
          rows: [
            [
              'IaaS',
              '机房、物理服务器、虚拟化、骨干网络',
              'Guest OS 补丁、应用、数据、IAM、安全组与 ACL、加密',
              '云主机、VPC、块存储',
            ],
            [
              'PaaS',
              '运行时、中间件、数据库引擎、平台补丁',
              '应用代码、数据、账号权限、网络访问策略',
              '托管数据库、容器平台',
            ],
            [
              'SaaS',
              '应用本身、平台运维与可用性',
              '账号与权限、数据分类、共享设置、审计',
              '企业邮箱、在线文档',
            ],
          ],
        },
        {
          type: 'table',
          title: '五类安全边界与控制点',
          columns: ['边界', '主要载体', '典型控制', '常见疏漏'],
          rows: [
            ['物理边界', '机房、可用区、专线接入点', '门禁、监控、双路供电、专线冗余', '忽略单接入点风险'],
            ['网络边界', 'VPC、子网、网关、对等连接', '安全组、网络 ACL、云防火墙、路由', '默认放通、管理端口暴露'],
            ['身份边界', 'IAM/RAM 用户、角色、策略', 'MFA、最小权限、临时凭证、SSO', '长期 AK/SK、权限过大'],
            ['数据边界', '对象存储、数据库、密钥管理', '加密、生命周期、跨域复制、审计', '公开桶、未加密备份'],
            ['应用边界', 'WAF、API 网关、负载均衡', '规则调优、限速、Bot 管理', '源站暴露、规则未灰度'],
          ],
        },
        {
          type: 'code',
          title: '用只读 CLI 盘点云上网络边界（以 AWS CLI 为例）',
          lang: 'bash',
          code: `aws ec2 describe-vpcs --query "Vpcs[].{VpcId:VpcId,Cidr:CidrBlock}" --output table
aws ec2 describe-subnets --query "Subnets[].{Subnet:SubnetId,Cidr:CidrBlock,AZ:AvailabilityZone}" --output table
aws ec2 describe-security-groups --query "SecurityGroups[].{Name:GroupName,Rules:length(IpPermissions)}" --output table
aws ec2 describe-flow-logs --query "FlowLogs[].{Id:FlowLogId,Status:FlowLogStatus}" --output table`,
        },
        {
          type: 'steps',
          title: '一次边界梳理的四个动作',
          items: [
            {
              title: '列资产',
              text: '把 VPC、子网、网关、负载均衡、对象存储、IAM 角色按账号与地域列全，标注负责人。',
            },
            {
              title: '画数据流',
              text: '从用户到负载均衡、应用、数据库，标出每一次跨 VPC、跨子网、跨账号的跳转。',
            },
            {
              title: '定信任域',
              text: '把可信程度相同的资源放进同一域，域与域之间才是需要策略的地方。',
            },
            {
              title: '设控制点',
              text: '每一条跨域路径指定唯一主控制点，避免安全组、NACL、防火墙层层叠加却没人说得清谁在生效。',
            },
          ],
        },
        {
          type: 'warning',
          title: '「云商负责安全」不等于「云上自动安全」',
          text: '绝大多数云安全事件来自客户侧配置：公网开放的管理端口、过宽的 IAM 权限、未加密的对象存储。责任共担只划分谁负责哪一层，不转移配置责任。云商负责的是平台本身不被攻破，不会替你审查安全组规则是否放通了 0.0.0.0/0。上线前把边界资产清单固化成例行检查项，比事后补救有效得多。',
        },
        {
          type: 'tip',
          title: '先画数据流，再定边界',
          text: '不要一上来就照着传统防火墙的接口列表配规则，而要先画出业务数据流。只有跨信任域的流量才需要策略；同一子网内部如果也敏感，应该用微分段或工作负载策略，而不是再加一层 NAT 把问题藏起来。数据流图还能直接变成后续流日志的验证依据。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm20-l02',
      moduleId: 'm20',
      title: '安全组、网络 ACL 与微分段',
      depth: '熟悉',
      minutes: 32,
      summary: '安全组有状态、实例级、只允许；NACL 无状态、子网级、有序匹配，两者互补而非替代。',
      objectives: [
        '说明安全组与网络 ACL 在状态、粒度、动作与匹配顺序上的差异',
        '写出带默认拒绝与临时端口回程的 NACL 规则，并避免常见误配置',
        '把一条传统 ACL 等价改写为安全组加 NACL 的组合策略',
      ],
      keywords: ['安全组', '网络 ACL', '有状态', '无状态', '默认拒绝', '微分段', '临时端口'],
      blocks: [
        {
          type: 'paragraph',
          text: '云上最常用的两道门是安全组与网络 ACL。安全组挂在实例或网卡上，是有状态的白名单：只写允许，不写拒绝，入站连接被放行后返回流量自动通过，规则之间没有先后，所有规则一起评估。网络 ACL 挂在子网上，是无状态的有序列表：允许与拒绝都能写，按规则号从小到大匹配，命中即停，末尾隐含拒绝，因此去的方向和回的方向都必须单独放行。传统网络里 ACL 加防火墙安全域的组合，迁移到云上大致就是 NACL 加安全组。',
        },
        {
          type: 'analogy',
          title: '房间门锁与楼层闸机',
          text: '安全组像房间门锁，只登记谁能进这个房间，人进去之后出来不需要再刷卡，因为门锁记得这次进出。网络 ACL 像楼层闸机，进和出是两个方向，各刷各的卡，而且闸机按名单顺序判断，第一条匹配上就结束。只给进不给出的名单，人进去就被困住了，这正是只配单向 NACL 的典型后果。',
        },
        {
          type: 'table',
          title: '安全组与网络 ACL 的核心差异',
          columns: ['维度', '安全组', '网络 ACL'],
          rows: [
            ['作用对象', '实例或网卡级', '子网级'],
            ['状态', '有状态，自动放行返回流量', '无状态，去程与回程都要写规则'],
            ['规则动作', '只支持允许', '允许与拒绝都支持'],
            ['匹配方式', '全部规则评估，无优先级', '按规则号从小到大，命中即停'],
            ['默认策略', '默认拒绝入站，需显式放行', '各厂商默认值不同，常见默认全通，需显式加拒绝'],
            ['典型用途', '应用分层与东西向微分段', '子网级粗粒度隔离与兜底'],
          ],
        },
        {
          type: 'code',
          title: '用 Terraform 同时声明安全组与子网 NACL',
          lang: 'hcl',
          code: `resource "aws_security_group" "app" {
  name        = "app-tier"
  description = "只接受来自负载均衡的 8080"
  vpc_id      = var.vpc_id

  ingress {
    description     = "from alb"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "to db subnet"
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = ["10.20.30.0/24"]
  }
}

resource "aws_network_acl" "dmz" {
  vpc_id     = var.vpc_id
  subnet_ids = [aws_subnet.dmz.id]

  ingress {
    rule_no    = 100
    action     = "allow"
    protocol   = "tcp"
    from_port  = 443
    to_port    = 443
    cidr_block = "10.20.10.0/24"
  }

  ingress {
    rule_no    = 200
    action     = "allow"
    protocol   = "tcp"
    from_port  = 1024
    to_port    = 65535
    cidr_block = "0.0.0.0/0"
  }

  egress {
    rule_no    = 100
    action     = "allow"
    protocol   = "tcp"
    from_port  = 443
    to_port    = 443
    cidr_block = "10.20.10.0/24"
  }

  egress {
    rule_no    = 200
    action     = "allow"
    protocol   = "tcp"
    from_port  = 1024
    to_port    = 65535
    cidr_block = "0.0.0.0/0"
  }
}`,
        },
        {
          type: 'table',
          title: '常见误配置与纠正方式',
          columns: ['误配置', '现象', '纠正'],
          rows: [
            ['0.0.0.0/0 开放 22 或 3389', '公网爆破日志暴涨、账号被撞库', '收敛到堡垒机或会话管理，只放行管理网段'],
            ['NACL 只写入站规则', '请求到达但响应回不去，表现为超时', '补出站规则，并放行 1024 到 65535 临时端口'],
            ['在安全组里写拒绝规则', '规则不生效或创建失败', '安全组只支持允许，拒绝交给 NACL 或云防火墙'],
            ['NACL 的拒绝规则编号小于允许规则', '该放行的流量被误杀', '调整规则号，让更具体的允许规则排在前面'],
            ['用安全组隔离子网', '同子网内实例仍可互访', '子网隔离用 NACL，东西向用微分段或 NetworkPolicy'],
            ['跨 VPC 直接引用安全组', '引用失败或规则不生效', '先建对等连接或企业路由，再按支持的引用方式配置'],
          ],
        },
        {
          type: 'steps',
          title: '实践任务：把一条传统 ACL 改写成安全组与 NACL',
          items: [
            {
              title: '选一条现网 ACL',
              text: '例如 permit tcp source 10.20.10.0/24 destination 10.20.20.10 eq 443，先确认它保护的是哪台主机、哪个业务。',
            },
            {
              title: '判断方向与状态',
              text: '传统 ACL 无状态，回程要单独放行；安全组有状态，只需写入站，返回流量自动通过。',
            },
            {
              title: '改写安全组',
              text: '安全组的源优先用安全组 ID 而不是 CIDR，目的端口写 443；出站从默认全通收紧到只允许数据库网段。',
            },
            {
              title: '改写 NACL',
              text: '入站 100 允许 10.20.10.0/24 到 10.20.20.0/24 的 443，出站 100 允许反向，再用 200 放行临时端口回程。',
            },
            {
              title: '验证',
              text: '开启流日志，观察 ACCEPT 与 REJECT 记录，对比改写前后的命中计数，确认没有误杀也没有多余放通。',
            },
          ],
        },
        {
          type: 'checklist',
          title: '改写后的自查清单',
          items: [
            '源与目的方向没有写反，回程流量有对应规则',
            '没有对公网开放 22、3389、3306 等管理或数据端口',
            '安全组出站已从全通收紧到必要网段',
            'NACL 规则号留有间隔，便于后续插入',
            '用流日志确认 ACCEPT/REJECT 与预期一致',
            '变更记录里写明业务、负责人与回滚方式',
          ],
        },
        {
          type: 'warning',
          title: '注意 NACL 的默认全通与连接跟踪超时',
          text: '很多云厂商新建网络 ACL 时默认允许所有流量，业务看起来完全正常，其实没有任何隔离，必须显式添加拒绝规则并放在末尾。另一个坑是安全组虽然有状态，但连接跟踪有超时时间，长连接空闲过久后状态被回收，返回包可能被丢弃，表现为连接偶尔卡死，需要应用层保活或调整超时。排障时先确认流量到底命中了哪一层，不要同时改安全组和 NACL。',
        },
        {
          type: 'tip',
          title: '给每条规则写清业务与负责人',
          text: '半年后没人记得 100 号规则为什么存在，也没人敢删。规则描述里写清业务系统、负责人和工单号，配合 IaC 评审与定期清理，能把「临时放通」变成可追溯的变更。微分段也是同理：先按应用分层画清依赖，再用安全组引用安全组表达调用关系，比按 IP 段堆规则更易维护。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm20-l03',
      moduleId: 'm20',
      title: '云防火墙、WAF、DDoS 与入侵检测',
      depth: '精通',
      minutes: 34,
      summary: '云防火墙管边界策略，WAF 看七层，DDoS 清洗在上游，入侵检测靠镜像与探针补盲区。',
      objectives: [
        '说明云防火墙、WAF、DDoS 清洗与入侵检测各自拦截什么、部署在哪里',
        '配置带托管规则组与限速的 WAF，并解释规则灰度与误杀控制',
        '设计一次 DDoS 攻击的应急响应流程与验证清单',
      ],
      keywords: ['云防火墙', 'WAF', 'DDoS 清洗', '入侵检测', 'IPS', '限速', '流量镜像'],
      blocks: [
        {
          type: 'paragraph',
          text: '安全组和 NACL 是门，云防火墙、WAF、DDoS 清洗与入侵检测是保安、安检机和监控。云防火墙在 VPC 边界做集中的南北向策略与入侵防御，能按域名、应用和威胁情报放行；WAF 只看 HTTP 与 HTTPS，负责 SQL 注入、跨站脚本、CC 攻击与恶意 Bot；DDoS 清洗在流量到达源站之前把攻击流量牵引到清洗中心；入侵检测通过流量镜像或虚拟探针发现横向移动与恶意载荷。它们不是互相替代，而是各看一段。',
        },
        {
          type: 'analogy',
          title: '大楼的五道安保',
          text: '门口防冲撞柱挡的是失控车辆，相当于 DDoS 清洗；前台核验证件相当于云防火墙策略；安检机查危险品相当于入侵防御；贵重物品柜台的防弹玻璃相当于 WAF 保护应用；监控录像相当于流量镜像与日志。只装其中一道，攻击者换个入口就能绕过去。',
        },
        {
          type: 'table',
          title: '分层防护能力对照',
          columns: ['层次', '代表能力', '主要拦截对象', '部署位置'],
          rows: [
            ['L3/L4 边界', '云防火墙、安全组、NACL', '非法端口、扫描、暴力破解', 'VPC 边界、子网、实例'],
            ['流量清洗', 'DDoS 高防或清洗中心', 'SYN Flood、UDP Flood、反射放大', '公网入口上游'],
            ['L7 应用', 'WAF', 'SQL 注入、XSS、CC 攻击、恶意 Bot', '负载均衡或网关之前'],
            ['内网检测', 'IDS/IPS、流量镜像', '横向移动、恶意载荷、异常连接', '核心交换或虚拟探针旁路'],
            ['配置审计', 'CSPM、配置基线', '公开存储桶、过宽权限、未加密', '全账号只读扫描'],
          ],
        },
        {
          type: 'table',
          title: '传统安全设备与云上能力的对应',
          columns: ['传统设备或能力', '云上对应', '迁移要点'],
          rows: [
            ['防火墙安全域与策略', '云防火墙加安全组', '安全域变成 VPC、子网与安全组，策略按标签和身份维护'],
            ['IPS 特征库', '云防火墙 IPS 或虚拟探针', '加密流量增多，需在 TLS 终止点检测'],
            ['WAF 设备', '云 WAF', '托管规则与自定义规则都要灰度，先观察再拦截'],
            ['流量清洗设备', 'DDoS 高防或清洗中心', '关注清洗阈值、回源地址与源站隐藏'],
            ['分光与镜像', '流量镜像到虚拟探针', '注意镜像带宽、采样率与费用'],
          ],
        },
        {
          type: 'code',
          title: '配置托管规则组与基于 IP 的限速（AWS WAFv2）',
          lang: 'hcl',
          code: `resource "aws_wafv2_web_acl" "edge" {
  name  = "edge-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "common-rules"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "common-rules"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "rate-limit"
    priority = 20

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "rate-limit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "edge-waf"
    sampled_requests_enabled   = true
  }
}`,
        },
        {
          type: 'steps',
          title: 'DDoS 攻击的应急响应',
          items: [
            {
              title: '确认类型',
              text: '看流量曲线是带宽突增还是请求数暴涨，区分流量型攻击与应用层 CC，两者处置手段不同。',
            },
            {
              title: '启动清洗',
              text: '切换到高防 IP 或开启清洗，调整清洗阈值，同时确认源站地址没有暴露。',
            },
            {
              title: '限速与封禁',
              text: '在 WAF 或防火墙上限速、封禁异常 IP 段，注意白名单与误伤，优先保住核心交易。',
            },
            {
              title: '扩容与降级',
              text: '弹性扩容后端，静态页面降级，必要时暂时关闭非核心功能，把带宽留给关键业务。',
            },
            {
              title: '复盘与预案',
              text: '记录攻击特征、清洗峰值、业务影响与处置时长，更新阈值和联系人，下次按预案执行。',
            },
          ],
        },
        {
          type: 'warning',
          title: 'WAF 不是网络层防护，源站暴露会绕过一切',
          text: 'WAF 只解析 HTTP 与 HTTPS，对 SYN Flood、UDP 反射放大这类流量型攻击无能为力；反过来 DDoS 清洗也不理解业务语义，挡不住慢速 SQL 注入。更常见的问题是源站 IP 泄露，攻击者直接连源站，WAF 形同虚设。必须用高防回源、源站白名单或私网源站，并定期检查 DNS 历史记录与证书透明度日志是否泄露了真实地址。',
        },
        {
          type: 'tip',
          title: '新规则先观察再拦截',
          text: '托管规则组也会误杀正常业务，尤其是文件上传、富文本编辑和 API 的 JSON 请求。新规则先在 count 模式跑一段时间，看命中的请求是不是真的恶意，再切换为 block。对秒杀、大促这类高峰，提前准备白名单和放行策略，否则安全设备本身会成为故障源。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm20-l04',
      moduleId: 'm20',
      title: '零信任与加密接入：VPN、专线加密与身份策略',
      depth: '精通',
      minutes: 34,
      summary: '零信任不默认信任任何位置，用身份、设备与上下文动态授权；加密只解决通道，不解决权限。',
      objectives: [
        '对比传统边界防护与零信任在信任假设、控制点和授权粒度上的差异',
        '区分 IPsec VPN、SSL VPN、专线加密与零信任代理的适用场景',
        '编写带 MFA 与来源限制的身份策略，并规划零信任落地步骤',
      ],
      keywords: ['零信任', '身份策略', 'MFA', 'IPsec VPN', 'SSL VPN', 'MACsec', '最小权限'],
      blocks: [
        {
          type: 'paragraph',
          text: '零信任的核心是「永不默认信任，每次都验证」。它不再假设内网可信，而是把每个访问请求都当作来自不可信网络，基于身份、设备状态与访问上下文做动态授权。落地抓手是统一身份与多因素认证、设备合规检查、最小权限策略、传输加密与持续审计。VPN 解决的是通道加密，零信任解决的是谁能在什么条件下访问什么，两者可以叠加，但不能互相替代。',
        },
        {
          type: 'analogy',
          title: '万能钥匙与动态房卡',
          text: '传统 VPN 像一把能进整层楼的钥匙，丢了或被人复制，整层都不安全。零信任像动态房卡，只能开预授权的房间，有时效，挂失立即失效，进电梯还要再验一次身份。即使卡被捡到，换一台不合规的设备也刷不开门。',
        },
        {
          type: 'table',
          title: '传统边界防护与零信任的差异',
          columns: ['维度', '传统边界防护', '零信任'],
          rows: [
            ['信任假设', '内网可信，外网不可信', '任何位置都不默认可信'],
            ['控制点', '防火墙与 VPN 网关', '身份代理、策略引擎、微分段'],
            ['授权粒度', 'IP 或网段', '身份、设备、应用与上下文'],
            ['凭证', '长期账号与静态密钥', '短期令牌、MFA、证书'],
            ['审计', '边界日志', '全量访问日志与持续评估'],
          ],
        },
        {
          type: 'table',
          title: '常见加密接入方式',
          columns: ['方式', '加密范围', '适用场景', '注意事项'],
          rows: [
            ['IPsec VPN', '站点到站点', '分支或数据中心到云', '关注感兴趣流、MTU 与 BGP'],
            ['SSL VPN', '客户端到网关', '远程办公', '网关暴露面大，必须 MFA 与及时打补丁'],
            ['专线加加密', '链路层或网络层', '高价值业务与合规场景', '专线本身不加密，需 MACsec 或 IPsec over 专线'],
            ['零信任代理', '应用层', '混合办公与第三方协作', '需接入身份源与设备姿态'],
          ],
        },
        {
          type: 'code',
          title: '用 Terraform 建立站点到站点 VPN',
          lang: 'hcl',
          code: `resource "aws_customer_gateway" "dc" {
  bgp_asn    = 65001
  ip_address = "203.0.113.10"
  type       = "ipsec.1"
}

resource "aws_vpn_gateway" "vgw" {
  vpc_id = aws_vpc.prod.id
}

resource "aws_vpn_connection" "dc" {
  vpn_gateway_id      = aws_vpn_gateway.vgw.id
  customer_gateway_id = aws_customer_gateway.dc.id
  type                = "ipsec.1"
  static_routes_only  = false
}`,
        },
        {
          type: 'code',
          title: '带 MFA 与来源网段限制的身份策略',
          lang: 'json',
          code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FinanceReportReadOnly",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::finance-report/*",
      "Condition": {
        "Bool": {
          "aws:MultiFactorAuthPresent": "true"
        },
        "IpAddress": {
          "aws:SourceIp": "10.20.0.0/16"
        }
      }
    }
  ]
}`,
        },
        {
          type: 'steps',
          title: '零信任落地的四个阶段',
          items: [
            {
              title: '盘点资产与访问路径',
              text: '列出高价值系统、访问者身份类型与现有通道，优先处理管理面、数据库和对象存储。',
            },
            {
              title: '统一身份',
              text: '接入企业身份源，强制 MFA，收敛本地账号，用角色与临时凭证替代长期密钥。',
            },
            {
              title: '策略最小化',
              text: '按「谁、什么设备、访问什么、在什么条件下」定义策略，先只读后读写，先小范围后全量。',
            },
            {
              title: '持续验证与审计',
              text: '采集访问日志，定期复核权限与设备合规状态，发现异常立即收回权限并复盘。',
            },
          ],
        },
        {
          type: 'checklist',
          title: '零信任自查清单',
          items: [
            '高价值资产没有直接暴露公网，管理面经过堡垒机或身份代理',
            '所有远程访问强制 MFA，长期 AK/SK 已清理或轮换',
            '身份策略带来源网段、时间和 MFA 等条件',
            '专线承载敏感数据时已启用 MACsec 或 IPsec',
            'VPN 网关补丁与加密算法符合基线，弱算法已禁用',
            '访问日志集中留存，可按用户与资源追溯',
          ],
        },
        {
          type: 'warning',
          title: '专线不等于加密，VPN 也不等于零信任',
          text: '专线只保证路径独占，不保证数据在链路上不可读，合规场景仍需 MACsec 或 IPsec。另一个误区是认为上了 VPN 就实现了零信任：VPN 只提供通道，一旦网关被攻破或账号被盗，攻击者就能到达整个内网。必须叠加微分段、最小权限与持续验证，把「进得来」和「能访问什么」分开控制。',
        },
        {
          type: 'tip',
          title: '从管理面和高价值数据开始收敛',
          text: '零信任不是一次全量改造。先把堡垒机、数据库、对象存储的访问收敛到身份代理与 MFA，再逐步覆盖一般业务。每收一条路径，先确认日志与告警可用，再关闭旧通道；否则出了故障既看不到也回不去。迁移期间保留双通道，但要设定明确的关停时间点。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
