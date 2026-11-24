import type { ModuleMeta } from '@/types';

const mod: ModuleMeta = {
  id: 'm16',
  code: 'M16',
  title: '云网络基础与架构思维',
  summary:
    '云网络把网络资源池化并按租户编排：Region 与可用区定物理边界，VPC 与子网定逻辑边界，ELB、NAT、EIP、DNS、专线与云连接补齐边界与互联；Underlay 保证可达，Overlay 与 SDN 控制器负责租户隔离与自动化。',
  stage: 'L4',
  order: 16,
  track: 'cloud',
  priority: 'P0',
  prerequisites: ['m00', 'm01', 'm06'],
  goals: [
    '说明资源池化与网络虚拟化如何改变网络交付方式，以及哪些传统约束依然存在',
    '区分 Region、可用区、VPC、子网与安全组的边界，说清责任共担下客户要负责什么',
    '画出云网络产品全景，说明 VPC、ELB、NAT、EIP、DNS、专线与云连接的分工',
    '解释 Underlay 与 Overlay 的分层、VXLAN 与 EVPN 的作用以及 SDN 控制器的编排流程',
    '把 VLAN、VRF、ACL、OSPF 等传统概念逐条映射到云上对应能力，建立迁移思路',
  ],
  keywords: [
    '资源池化',
    '网络虚拟化',
    'Region',
    '可用区',
    'VPC',
    '子网',
    '责任共担',
    'Underlay',
    'Overlay',
    'VXLAN',
    'SDN',
  ],
  lessons: [
    {
      id: 'm16-l01',
      moduleId: 'm16',
      title: '从传统网络到云网络：资源池化与网络虚拟化',
      depth: '了解',
      minutes: 22,
      summary: '资源池化改变交付方式，网络虚拟化在物理网络之上叠加独立的租户网络。',
      objectives: [
        '说明计算、存储、网络资源池化各自的含义与相互关系',
        '解释网络虚拟化如何用封装与集中控制实现多租户隔离',
        '列出云网络相比传统网络仍然存在的硬约束',
      ],
      keywords: ['资源池化', '网络虚拟化', '多租户', 'VPC', 'Overlay'],
      blocks: [
        {
          type: 'paragraph',
          text: '传统网络交付的是一台台设备：采购、上架、布线、逐台敲命令，一个 VLAN 变更要跨越多个部门。云网络交付的是一段可编程的虚拟网络：计算、存储、网络资源先被池化，再按租户切分，用户在控制台或通过 API 申请，几分钟内就得到独立地址空间、路由表和安全边界。变化的不只是速度，还有责任边界——物理链路与虚拟化层由云厂商保证，地址、路由、策略和访问控制仍由使用者负责。',
        },
        {
          type: 'analogy',
          title: '自建别墅与酒店长租',
          text: '自建别墅的水电、门禁、宽带都要自己设计施工，想改承重墙得请人评估；酒店长租的房间格局由酒店统一规划，你只负责房间里的家具、门锁密码和访客规则。云网络就是后者：楼体结构（物理网络与虚拟化）由厂商维护，房内怎么布置（VPC、子网、路由、安全组）由你决定，但你不能拆掉楼板，也不能把两间房随便打通。',
        },
        {
          type: 'table',
          title: '传统网络与云网络的差异',
          columns: ['维度', '传统网络', '云网络'],
          rows: [
            ['交付形态', '采购设备、上架布线、逐台配置', '控制台或 API 申请，分钟级生成'],
            ['隔离手段', 'VLAN、VRF、ACL', 'VPC、子网、安全组、账号与项目'],
            ['变更方式', '手工命令行，记录靠文档', '基础设施即代码，可版本化与回滚'],
            ['扩展方式', '加板卡、加设备、扩链路', '改规格、加子网、加带宽，受配额约束'],
            ['故障边界', '自己的设备自己排查', '厂商负责物理与虚拟化，用户负责配置'],
            ['成本模型', '一次性采购加维保', '按量或包周期，跨可用区与流量单独计费'],
          ],
        },
        {
          type: 'paragraph',
          text: '资源池化分三层：计算虚拟化把 CPU 与内存切成实例，存储虚拟化把磁盘切成云盘，网络虚拟化把端口、地址、路由和安全策略切成租户网络。网络虚拟化的关键在于把「转发在哪里发生」与「策略由谁决定」分开：实例所在主机的虚拟交换机或智能网卡负责封装与转发，集中控制器负责计算路径并下发流表。新增一个租户不需要动物理交换机，只需在控制器里创建一套虚拟网络模型。',
        },
        {
          type: 'table',
          title: '常见的隔离与切分手段',
          columns: ['手段', '隔离粒度', '典型位置', '说明'],
          rows: [
            ['VLAN', '二层广播域，约 4094 个', '接入与汇聚', '传统数据中心常用，云内更多出现在专线交接'],
            ['VXLAN', '24 位 VNI，约 1600 万个', '主机与虚拟网关', '云 Overlay 主流封装，可跨三层网络延伸'],
            ['VRF 与多 VPC', '独立路由表', '路由器或虚拟网关', '本质都是把路由实例分开，互不泄漏'],
            ['安全组', '实例或虚拟网卡', '虚拟网卡边界', '有状态过滤，默认拒绝入向'],
            ['网络 ACL', '子网', '子网边界', '无状态过滤，必须显式放通双向流量'],
            ['账号与项目', '管理面', '控制台与 API', '防误操作与权限隔离，但不等于网络隔离'],
          ],
        },
        {
          type: 'code',
          title: '用 Terraform 声明一个 VPC 与子网（示例，不实际执行）',
          lang: 'hcl',
          code: `terraform {
  required_providers {
    huaweicloud = {
      source  = "huaweicloud/huaweicloud"
      version = "~> 1.60"
    }
  }
}

provider "huaweicloud" {
  region = "cn-north-4"
}

resource "huaweicloud_vpc" "prod" {
  name = "vpc-prod"
  cidr = "10.10.0.0/16"
}

resource "huaweicloud_vpc_subnet" "web" {
  name              = "subnet-web-az1"
  vpc_id            = huaweicloud_vpc.prod.id
  cidr              = "10.10.1.0/24"
  gateway_ip        = "10.10.1.1"
  availability_zone = "cn-north-4a"
}`,
        },
        {
          type: 'output',
          title: '用只读命令核对已有 VPC',
          text: `$ aws ec2 describe-vpcs --query "Vpcs[].{VpcId:VpcId,Cidr:CidrBlock,Default:IsDefault}" --output table
--------------------------------------------------------
|                     DescribeVpcs                     |
+----------------+---------------+---------------------+
|      Cidr      |    Default    |        VpcId        |
+----------------+---------------+---------------------+
|  10.10.0.0/16  |  False        |  vpc-0a1b2c3d4e5f   |
|  172.31.0.0/16 |  True         |  vpc-0f6e5d4c3b2a   |
+----------------+---------------+---------------------+`,
        },
        {
          type: 'warning',
          title: '云上弹性，但不是没有边界',
          text: 'VPC 网段创建后基本不能随意修改，后续只能追加辅助网段，迁移成本很高；跨 Region 的 VPC 默认完全不通，必须通过云连接、专线或对等方案打通；每个账号的 VPC、EIP、NAT、对等连接都有配额，扩容要走工单；删除 VPC 前必须先清空子网、实例、路由和网关。把这些当成物理约束来规划，才不会在业务上线后被动返工。',
        },
        {
          type: 'tip',
          title: '用三个问题把传统知识迁移过来',
          text: '每遇到一个云网络概念，先问三件事：它替代了传统网络里的什么，控制权从设备转移到了谁手里，我用哪条只读命令或哪个控制台页面能看见它。比如 VPC 对应 VRF，子网对应网段加广播域，安全组对应有状态的实例防火墙。带着映射去学，比从零记产品名快得多。',
        },
        {
          type: 'checklist',
          title: '本课自检',
          items: [
            '能用自己的话说明资源池化与网络虚拟化分别解决什么问题',
            '能说出至少三种租户隔离手段及其作用范围',
            '知道云上地址、配额与跨地域连通性仍然是硬约束',
            '能解释为什么新增租户不需要改动物理交换机',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm16-l02',
      moduleId: 'm16',
      title: '云网络坐标：Region、AZ、VPC、子网与责任共担',
      depth: '熟悉',
      minutes: 28,
      summary: 'Region 定地理、AZ 定机房、VPC 定租户网络、子网定可用区网段，责任按层切分。',
      objectives: [
        '说明 Region、可用区、VPC 与子网的层级关系与约束',
        '解释子网为什么必须绑定单个可用区，以及高可用的正确做法',
        '按责任共担模型划分云厂商与客户各自的安全职责',
      ],
      keywords: ['Region', '可用区', 'VPC', '子网', '责任共担'],
      blocks: [
        {
          type: 'paragraph',
          text: '理解云网络先要建立坐标：Region 是地理区域，拥有独立的管控面和资源池，跨 Region 默认不互通；可用区是同一 Region 内供电、制冷和网络相互独立的机房集群，彼此通过低时延链路连接；VPC 是租户级的逻辑网络，拥有独立地址空间、路由表和安全边界；子网是 VPC 内的网段，绑定某一个可用区，实例、负载均衡后端和数据库都落在子网里。四层坐标确定了，资源的容灾级别和连通范围也就确定了。',
        },
        {
          type: 'analogy',
          title: '城市、园区、楼层与房间',
          text: 'Region 像一座城市，城市之间没有内部通道，来往要走高速或专线；可用区像城市里的几个园区，各自有独立的供电和消防，但距离很近；VPC 像你租下的一层楼，门禁和走廊归你管；子网像楼层里的房间，每间房只能属于一个园区。把两台服务器放进同一园区的两个房间，延迟很低；放进两个城市，就必须显式修路。',
        },
        {
          type: 'table',
          title: '三家厂商的云网络坐标命名',
          columns: ['概念', '华为云', '阿里云', 'AWS'],
          rows: [
            ['地理区域', 'Region', '地域 Region', 'Region'],
            ['可用区', '可用区 AZ', '可用区 Zone', 'Availability Zone'],
            ['虚拟网络', '虚拟私有云 VPC', '专有网络 VPC', 'VPC'],
            ['子网', '子网 Subnet', '交换机 vSwitch', 'Subnet'],
            ['路由表', '路由表', '路由表', 'Route Table'],
            ['安全组', '安全组', '安全组', 'Security Group'],
          ],
        },
        {
          type: 'table',
          title: '四层坐标的约束与影响',
          columns: ['层级', '作用范围', '关键约束', '设计影响'],
          rows: [
            ['Region', '地理区域', '跨 Region 默认不通，管控面独立', '决定数据驻留、容灾距离与跨域方案'],
            ['可用区', '同 Region 内独立机房', 'AZ 间低时延但会产生跨 AZ 流量', '高可用至少跨两个 AZ'],
            ['VPC', '租户逻辑网络', '地址空间独立，跨 VPC 默认隔离', '决定地址规划与互联方式'],
            ['子网', '单个可用区内的网段', '不能跨 AZ，网关地址被平台占用', '每个 AZ、每类用途单独建子网'],
          ],
        },
        {
          type: 'code',
          title: '只读查看可用区与子网分布',
          lang: 'bash',
          code: `# 查看指定地域的可用区
aws ec2 describe-availability-zones \\
  --region cn-north-1 \\
  --query "AvailabilityZones[].{Zone:ZoneName,State:State,ZoneId:ZoneId}" \\
  --output table

# 查看某个 VPC 下的子网及其可用区
aws ec2 describe-subnets \\
  --filters "Name=vpc-id,Values=vpc-0a1b2c3d4e5f" \\
  --query "Subnets[].{Subnet:SubnetId,Cidr:CidrBlock,AZ:AvailabilityZone,Free:AvailableIpAddressCount}" \\
  --output table`,
        },
        {
          type: 'output',
          title: '子网清单应该长什么样',
          text: `------------------------------------------------------------
|                      DescribeSubnets                     |
+---------------+----------------+------------+------------+
|      AZ       |      Cidr      |   Free     |  Subnet    |
+---------------+----------------+------------+------------+
|  cn-north-1a  |  10.10.1.0/24  |  243       | subnet-0a1 |
|  cn-north-1b  |  10.10.2.0/24  |  251       | subnet-0b2 |
|  cn-north-1a  |  10.10.11.0/24 |  250       | subnet-0c3 |
+---------------+----------------+------------+------------+`,
        },
        {
          type: 'steps',
          title: '从 Region 到子网，读一份资源清单',
          items: [
            {
              title: '确认地域',
              text: '先看业务的数据驻留要求与用户位置，确定主 Region 和灾备 Region，避免后期跨域迁移。',
            },
            {
              title: '确认可用区',
              text: '列出该 Region 提供的可用区，选择至少两个，并检查目标实例规格在这些 AZ 是否都有货。',
            },
            {
              title: '确认 VPC',
              text: '核对 VPC 的 CIDR 是否与本地 IDC、其他 VPC 重叠，记录该 VPC 的所属账号与用途。',
            },
            {
              title: '确认子网',
              text: '逐个确认子网的 AZ、CIDR、剩余地址数与关联路由表，判断是否满足当前业务与扩容。',
            },
          ],
        },
        {
          type: 'warning',
          title: '子网不跨可用区，AZ 名称也不是物理位置',
          text: '把子网理解成「某个机房里的一个网段」，它天然只属于一个可用区，因此跨 AZ 高可用必须每个 AZ 各建子网，而不是把一个子网拉大。另一个常见误区是认为不同账号里同名的可用区一定是同一栋楼：部分云厂商的 AZ 名称是按账号随机映射的，多账号部署要用可用区 ID 对齐，否则主备实例可能落在同一个物理机房。',
        },
        {
          type: 'tip',
          title: '责任共担要落到配置项上',
          text: '云厂商负责物理机房、服务器、虚拟化层、骨干网络和托管服务的基础设施；客户负责账号与权限、地址与路由设计、安全组与网络 ACL、数据分类与加密、实例补丁和访问密钥。责任共担不是一句口号，而是每次评审时逐项确认：这条规则谁配、谁审计、出问题谁负责。把边界写进设计文档，才能避免安全事件时互相推诿。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm16-l03',
      moduleId: 'm16',
      title: '云网络产品全景：VPC、ELB、NAT、EIP、DNS、专线、CEN',
      depth: '熟悉',
      minutes: 30,
      summary: 'VPC 与子网是底座，EIP、NAT、ELB 管边界，DNS 管名字，专线与云连接管跨域互联。',
      objectives: [
        '按底座、边界、服务、互联四层归类云网络产品',
        '说明 EIP、NAT 网关与 ELB 在入向和出向流量中的分工',
        '对照华为云、阿里云与 AWS 的产品命名，避免选型时张冠李戴',
      ],
      keywords: ['VPC', 'ELB', 'NAT 网关', 'EIP', '私网 DNS', '云专线', 'CEN'],
      blocks: [
        {
          type: 'paragraph',
          text: '云网络产品看似很多，按职责可以分成四层：底座是 VPC、子网、路由表和安全组，决定网络长什么样；边界是 EIP、NAT 网关、ELB、VPN 和专线网关，决定流量怎么进出；服务层是私网 DNS、流日志、云防火墙和网络监控，决定网络好不好用、好不好查；互联层是云连接、企业路由器与 Transit Gateway，决定多个 VPC、多个地域和本地 IDC 怎么连成一张网。选型时先定底座，再定边界，最后才谈加速和可观测。',
        },
        {
          type: 'analogy',
          title: '一栋写字楼里的网络设施',
          text: 'VPC 是你租下的楼层，子网是房间，路由表是走廊里的指示牌；ELB 是大堂前台，把访客分派到具体房间；NAT 网关是统一收发室，楼里的人寄快递都从这一个口出去；EIP 是挂在楼门口的门牌号，外人可以直接找到；DNS 是通讯录，把名字翻译成房间号；专线是直通总部的地下车道；云连接是把几栋楼连起来的空中连廊。',
        },
        {
          type: 'table',
          title: '云网络产品全景与三家命名对照',
          columns: ['能力', '华为云', '阿里云', 'AWS'],
          rows: [
            ['虚拟私有网络', '虚拟私有云 VPC', '专有网络 VPC', 'VPC'],
            ['子网', '子网 Subnet', '交换机 vSwitch', 'Subnet'],
            ['路由表', '路由表', '路由表', 'Route Table'],
            ['负载均衡', '弹性负载均衡 ELB', '负载均衡 SLB、ALB、NLB', 'Elastic Load Balancing'],
            ['出向地址转换', 'NAT 网关', 'NAT 网关', 'NAT Gateway'],
            ['弹性公网地址', '弹性公网 IP EIP', '弹性公网 IP EIP', 'Elastic IP'],
            ['私网域名解析', '云解析服务内网域名', '云解析 PrivateZone', 'Route 53 私有托管区'],
            ['物理专线', '云专线 DC', '高速通道 Express Connect', 'Direct Connect'],
            ['多 VPC 与跨域互联', '企业路由器 ER、云连接 CEN', '转发路由器 TR、云企业网 CEN', 'Transit Gateway'],
            ['安全组与网络 ACL', '安全组、网络 ACL', '安全组、网络 ACL', 'Security Group、Network ACL'],
            ['流量日志', 'VPC 流日志', 'VPC 流日志', 'VPC Flow Logs'],
          ],
        },
        {
          type: 'table',
          title: '三个方向的流量该用谁',
          columns: ['方向', '典型需求', '推荐组件', '注意'],
          rows: [
            ['入向', '公网用户访问网站或接口', 'ELB 加 EIP，或 ELB 直接绑定公网', '后端实例无需公网地址'],
            ['出向', '私有子网实例下载补丁、调用外部接口', 'NAT 网关加 EIP', 'NAT 只做源地址转换，不接受入向连接'],
            ['东西向', 'VPC 内服务互访、跨 VPC 调用', '安全组、对等连接、企业路由器', '跨 VPC 需要显式路由与放行'],
            ['混合云', '访问本地 IDC 数据库或老系统', '云专线加 VPN 备份', '地址不能重叠，路由要双向'],
          ],
        },
        {
          type: 'code',
          title: '用 Terraform 组合 EIP 与 NAT 网关（示例，只做 plan）',
          lang: 'hcl',
          code: `resource "alicloud_vpc" "prod" {
  vpc_name   = "vpc-prod"
  cidr_block = "10.20.0.0/16"
}

resource "alicloud_vswitch" "nat" {
  vpc_id       = alicloud_vpc.prod.id
  cidr_block   = "10.20.250.0/24"
  zone_id      = "cn-hangzhou-h"
  vswitch_name = "vsw-nat-h"
}

resource "alicloud_eip_address" "nat" {
  address_name = "eip-nat-prod"
}

resource "alicloud_nat_gateway" "prod" {
  vpc_id           = alicloud_vpc.prod.id
  nat_gateway_name = "nat-prod"
  nat_type         = "Enhanced"
  vswitch_id       = alicloud_vswitch.nat.id
}

resource "alicloud_eip_association" "nat" {
  allocation_id = alicloud_eip_address.nat.id
  instance_id   = alicloud_nat_gateway.prod.id
}`,
        },
        {
          type: 'output',
          title: '只读核对 NAT 网关与 EIP 绑定关系',
          text: `$ aws ec2 describe-nat-gateways --output table
------------------------------------------------------------------
|                     DescribeNatGateways                        |
+----------------+------------------+---------------+------------+
|  NatGatewayId  |  SubnetId        |    State      | PublicIp   |
+----------------+------------------+---------------+------------+
|  nat-0a1b2c3d  |  subnet-0a1b2c3d |   available   | 203.0.113.8|
+----------------+------------------+---------------+------------+`,
        },
        {
          type: 'warning',
          title: '四个高频误解',
          text: '第一，ELB 不是安全设备，它只做流量分发和健康检查，访问控制仍要靠安全组、WAF 与网络 ACL。第二，NAT 网关只支持出向连接，公网无法主动通过 NAT 访问内部实例。第三，EIP 有配额和带宽费用，把 EIP 直接绑在每台实例上会让架构失去弹性。第四，私网 DNS 不会自动为所有实例注册域名，需要显式创建解析记录并关联 VPC。',
        },
        {
          type: 'tip',
          title: '先画流量方向，再选产品',
          text: '选型时不要从产品名出发，而要从流量方向出发：谁发起、去哪里、要不要被公网访问、是否需要固定地址、是否跨地域。把这些问题答完，产品组合自然浮现。反过来先买了一堆组件再拼架构，很容易出现 NAT 与 EIP 重复、ELB 后端跨 AZ 却只配了一个子网这类结构性问题。',
        },
        {
          type: 'checklist',
          title: '本课自检',
          items: [
            '能把 VPC、ELB、NAT、EIP、DNS、专线、云连接分别归入四层',
            '能说清 NAT 网关与 EIP 在入向能力上的差别',
            '能写出三家厂商对子网、负载均衡、私网 DNS 的不同叫法',
            '知道 ELB 不承担安全过滤职责',
          ],
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
    {
      id: 'm16-l04',
      moduleId: 'm16',
      title: 'Underlay 与 Overlay：SDN 控制器如何编排云网络',
      depth: '熟悉',
      minutes: 32,
      summary: 'Underlay 用 CLOS 与 BGP 保证可达，Overlay 用 VXLAN 与 EVPN 切租户，控制器负责统一下发。',
      objectives: [
        '说明 Underlay 的典型组网与 Overlay 的封装、控制面分工',
        '解释 SDN 控制器在租户创建、流表下发与故障收敛中的角色',
        '用分层思路定位 Overlay 网络的常见故障',
      ],
      keywords: ['Underlay', 'Overlay', 'VXLAN', 'EVPN', 'SDN 控制器', 'Spine-Leaf'],
      blocks: [
        {
          type: 'paragraph',
          text: '云网络能同时服务成千上万个租户，靠的是两层网络。Underlay 是物理网络，通常采用 Spine-Leaf 的 CLOS 架构，所有链路跑三层、用 BGP 与 ECMP 做多路径转发，不再依赖 STP 阻塞端口；Overlay 是叠加在 Underlay 之上的虚拟网络，用 VXLAN 或 Geneve 把租户报文封装进物理 IP 报文，用 EVPN 作为控制面分发 MAC 与 IP 可达信息。租户看到的 VPC、子网、路由都是 Overlay 里的逻辑对象，物理设备只负责把封装包送到对端主机或虚拟网关。',
        },
        {
          type: 'analogy',
          title: '城市道路与快递网络',
          text: 'Underlay 是城市道路网，路口怎么走由红绿灯和路牌决定，所有车辆共享；Overlay 是快递公司在地图上规划的干线，包裹从网点到分拨中心走哪条路由调度中心统一决定，路上实际经过哪些街道司机并不关心。道路临时管制时，调度中心改一条干线即可，不需要重建整座城市。控制器就是那个调度中心。',
        },
        {
          type: 'table',
          title: 'Underlay 与 Overlay 的分工',
          columns: ['维度', 'Underlay', 'Overlay'],
          rows: [
            ['目标', '提供物理 IP 可达与高带宽多路径', '提供租户隔离、灵活编址与跨机房延伸'],
            ['典型技术', 'Spine-Leaf、BGP、ECMP、EVPN 底层', 'VXLAN、Geneve、EVPN、分布式网关'],
            ['地址含义', '设备互联地址与 Loopback', '租户 VPC 私网地址与虚拟 MAC'],
            ['故障影响', '物理链路或设备故障，影响多个租户', '单租户配置错误，通常只影响该租户'],
            ['运维入口', '设备命令行、光模块与链路监控', '控制器、流表、隧道与租户视图'],
          ],
        },
        {
          type: 'table',
          title: '传统手段与云上编排的对应关系',
          columns: ['传统手段', '云上对应', '差异'],
          rows: [
            ['VLAN 划分广播域', 'VPC 与子网', 'VPC 由平台托管，规模远超 4094'],
            ['VRF 隔离路由', '多 VPC 或独立路由表', '隔离默认开启，无需逐台配置'],
            ['STP 防环', 'BGP 与 ECMP 多路径', '不再阻塞链路，靠三层转发'],
            ['手工配置 ACL', '安全组与网络 ACL', '策略随实例或子网自动生效'],
            ['逐台命令行变更', '控制器或 IaC 统一下发', '变更可编排、可回滚、可审计'],
          ],
        },
        {
          type: 'interactive',
          key: 'vxlan-evpn',
          caption: '观察 VXLAN 封装如何在三层网络上延伸二层域，以及 EVPN 如何分发租户可达信息',
        },
        {
          type: 'code',
          title: 'VXLAN 与 EVPN 的关键配置片段（VRP 示例）',
          lang: 'vrp',
          code: `bridge-domain 100
 vxlan vni 50100
quit
interface Nve1
 source 10.0.0.1
 vni 50100 head-end peer-list 10.0.0.2
quit
bgp 65000
 peer 10.0.0.2 as-number 65000
 ipv4-family evpn
  peer 10.0.0.2 enable
 quit
quit`,
        },
        {
          type: 'code',
          title: '从云侧只读观察虚拟网卡与子网（示例）',
          lang: 'bash',
          code: `aws ec2 describe-network-interfaces \\
  --filters "Name=vpc-id,Values=vpc-0a1b2c3d" \\
  --query "NetworkInterfaces[].{Id:NetworkInterfaceId,Subnet:SubnetId,PrivateIp:PrivateIpAddress,Status:Status}" \\
  --output table`,
        },
        {
          type: 'output',
          title: '查看 VXLAN 隧道与 EVPN 邻居',
          text: `<Leaf-1> display vxlan vni
VNI      BD-ID   State   Source          Destination
50100    100     up      10.0.0.1        10.0.0.2

<Leaf-1> display bgp evpn peer
BGP local router ID : 10.0.0.1
Peer            AS      State   Type
10.0.0.2        65000   Established  EVPN`,
        },
        {
          type: 'warning',
          title: 'Overlay 排障失败，多半是跳过了 Underlay',
          text: 'VXLAN 会增加约 50 字节封装开销，物理链路 MTU 必须相应放大，否则大包被丢弃，表现为能 ping 通小包、传输大文件卡死。控制器显示租户网络正常，不代表数据面一定通：控制器只保证配置下发成功，物理链路拥塞、BGP 邻居震荡、ECMP 哈希不均都会让实际转发异常。排障顺序永远是先 Underlay 的可达性与 MTU，再 Overlay 的隧道与租户流表。',
        },
        {
          type: 'tip',
          title: '大二层不是目标，隔离和自动化才是',
          text: '很多人把云网络等同于「把二层拉大」，其实 VXLAN 只是手段，真正要解决的是租户数量、跨机房迁移和策略自动化。设计时优先考虑三层到边缘、路由可汇总、故障域可控；只有在需要保持 IP 不变迁移虚拟机或容器时，才让 Overlay 延伸二层。把目标想清楚，就不会为了炫技引入难以运维的大二层。',
        },
        { type: 'quiz', title: '本课自测' },
      ],
    },
  ],
};

export default mod;
