import type { QuizQuestion } from '@/types';

const list: QuizQuestion[] = [
  {
    id: 'q-m06-01',
    moduleId: 'm06',
    lessonId: 'm06-l01',
    type: 'single',
    depth: '熟悉',
    question: 'Access 端口收到一个不带 VLAN 标签的帧时，会如何处理？',
    options: [
      '打上该端口 PVID 对应的 VLAN 标签后进入交换机',
      '直接丢弃该帧',
      '保持无标签状态转发到所有端口',
      '打上 VLAN 1 标签后转发到 Trunk 口',
    ],
    answer: [0],
    explanation:
      'Access 端口只属于一个 VLAN，收到无标签帧时会打上该端口 PVID 对应的 VLAN ID 再送入交换机内部。向 Access 端口发送时会把标签剥离，因此终端无需感知 VLAN。若收到带标签帧，默认行为取决于端口的标签处理配置。',
  },
  {
    id: 'q-m06-02',
    moduleId: 'm06',
    lessonId: 'm06-l02',
    type: 'multiple',
    depth: '精通',
    question: '关于 Trunk 与 Hybrid 端口，下列说法正确的有哪些？',
    options: [
      'Trunk 端口通常只允许 PVID 对应 VLAN 的帧不带标签发送',
      'Hybrid 端口可以按 VLAN 分别配置 tagged 或 untagged',
      'Access 端口只能属于一个 VLAN',
      'Trunk 端口只能属于一个 VLAN',
    ],
    answer: [0, 1, 2],
    explanation:
      'Trunk 端口通过 PVID 决定哪个 VLAN 的帧以 untagged 方式发出，其他允许的 VLAN 带标签发送；Hybrid 更灵活，可以针对每个 VLAN 设置 tagged 或 untagged。Access 只能属于一个 VLAN，而 Trunk 可以承载多个 VLAN，因此第四项错误。',
  },
  {
    id: 'q-m06-03',
    moduleId: 'm06',
    lessonId: 'm06-l03',
    type: 'single',
    depth: '熟悉',
    question: 'STP 选举根桥时，比较顺序是什么？',
    options: [
      '先比较桥优先级，优先级相同再比较桥 MAC，越小越优',
      '先比较桥 MAC，MAC 相同再比较优先级，越大越优',
      '先比较端口开销，开销小者当选',
      '先比较端口号，端口号大者当选',
    ],
    answer: [0],
    explanation:
      '根桥选举先比较桥优先级，数值越小越优先；优先级相同时比较桥 MAC 地址，数值越小越优先。根桥是整个生成树的逻辑中心，通常把核心交换机优先级调低使其稳定成为根桥，避免接入层设备意外抢占。',
  },
  {
    id: 'q-m06-04',
    moduleId: 'm06',
    lessonId: 'm06-l03',
    type: 'single',
    depth: '精通',
    question: '非根桥选举根端口时，首先比较什么？',
    options: [
      '到根桥的路径开销，开销最小者当选',
      '对端设备的桥优先级，优先级最高者当选',
      '本端端口的 MAC 地址，地址最大者当选',
      '端口的 VLAN ID，数值最小者当选',
    ],
    answer: [0],
    explanation:
      '根端口选择先比较到根桥的根路径开销，开销最小者胜出；若相同再比较对端桥 ID、对端端口 ID，最后比较本端端口 ID。路径开销与链路带宽相关，因此高速链路通常成为根端口，低速链路被阻塞。',
  },
  {
    id: 'q-m06-05',
    moduleId: 'm06',
    lessonId: 'm06-l03',
    type: 'multiple',
    depth: '熟悉',
    question: '传统 STP 的端口状态包括哪些？',
    options: ['Blocking', 'Listening', 'Learning', 'Forwarding'],
    answer: [0, 1, 2, 3],
    explanation:
      '传统 STP 有 Blocking、Listening、Learning、Forwarding 四种状态，另有 Disabled 表示端口被关闭。Listening 和 Learning 是过渡状态，合计约 30 秒的收敛时间。RSTP 对此做了简化，加快了故障收敛速度。',
  },
  {
    id: 'q-m06-06',
    moduleId: 'm06',
    lessonId: 'm06-l04',
    type: 'single',
    depth: '熟悉',
    question: 'RSTP 边缘端口收到 BPDU 时，说明可能发生了什么？',
    options: [
      '有交换机或设备接入，存在环路风险',
      '链路带宽不足',
      'VLAN 配置丢失',
      'IP 地址冲突',
    ],
    answer: [0],
    explanation:
      '边缘端口用于连接终端，正常情况下不应收到 BPDU。若收到 BPDU，说明有交换机接入或存在恶意报文，可能引发环路。启用 BPDU 保护后，端口会自动进入 Err-Down 状态，需要管理员确认并恢复，以避免广播风暴扩散。',
  },
  {
    id: 'q-m06-07',
    moduleId: 'm06',
    lessonId: 'm06-l04',
    type: 'single',
    depth: '精通',
    question: 'MSTP 与 STP 相比，最主要的改进是什么？',
    options: [
      '支持多实例，不同 VLAN 可以走不同生成树实现负载分担',
      '取消了根桥选举',
      '把所有 VLAN 合并成一个广播域',
      '不再需要 BPDU 报文',
    ],
    answer: [0],
    explanation:
      'MSTP 把 VLAN 映射到多个实例，每个实例独立计算生成树，从而让不同 VLAN 的流量走不同链路，实现负载分担。它仍然需要 BPDU 和根桥选举，只是通过实例化提高了链路利用率，配置时要保证实例与 VLAN 映射一致。',
  },
  {
    id: 'q-m06-08',
    moduleId: 'm06',
    lessonId: 'm06-l05',
    type: 'boolean',
    depth: '熟悉',
    question: '使用手工模式配置 Eth-Trunk 时，链路两端都需要配置链路聚合。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      'Eth-Trunk 需要两端都把物理接口加入聚合组，并且成员口的速率、双工和 VLAN 配置保持一致，否则可能出现成员口无法加入或流量异常。LACP 模式还会协商系统优先级和活动链路，手工模式则要求两端严格匹配。',
  },
  {
    id: 'q-m06-09',
    moduleId: 'm06',
    lessonId: 'm06-l05',
    type: 'multiple',
    depth: '精通',
    question: '堆叠系统配置 MAD 双主检测的作用是什么？',
    options: [
      '检测堆叠分裂后出现的双主情况',
      '避免分裂后两个主设备同时转发造成地址冲突和环路',
      '在分裂后自动恢复所有业务',
      '替代 Eth-Trunk 的负载分担功能',
    ],
    answer: [0, 1],
    explanation:
      '堆叠线缆故障可能导致系统分裂为两个独立的主设备，MAD 通过直连检测链路或代理检测识别双主状态，并让其中一侧进入恢复状态，避免 IP 和 MAC 冲突、广播风暴。MAD 只能抑制故障影响，不能替代链路聚合。',
  },
  {
    id: 'q-m06-10',
    moduleId: 'm06',
    lessonId: 'm06-l06',
    type: 'single',
    depth: '熟悉',
    question: 'DHCP Snooping 主要通过什么方式防止私接 DHCP 服务器？',
    options: [
      '把连接合法 DHCP 服务器的端口设为信任端口，非信任端口丢弃 DHCP Offer',
      '关闭所有 DHCP 功能',
      '把所有端口都设为信任端口',
      '只允许静态 IP 地址接入',
    ],
    answer: [0],
    explanation:
      'DHCP Snooping 建立 IP 与 MAC 的绑定表，并区分信任端口和非信任端口。非信任端口收到的 DHCP Offer 等服务器响应会被丢弃，只有连接合法服务器的信任端口可以下发地址，从而避免用户被私接服务器分配到错误网关。',
  },
  {
    id: 'q-m06-11',
    moduleId: 'm06',
    lessonId: 'm06-l06',
    type: 'multiple',
    depth: '熟悉',
    question: '端口安全功能可以实现哪些效果？',
    options: [
      '限制端口学习的 MAC 地址数量',
      '绑定特定 MAC 地址只允许该终端接入',
      '违规时丢弃报文或关闭端口',
      '自动为终端分配 IP 地址',
    ],
    answer: [0, 1, 2],
    explanation:
      '端口安全可以限制最大学习 MAC 数、配置静态绑定，并在违规时采取保护、限制或关闭等动作，防止非法终端接入和 MAC 泛洪。自动分配 IP 地址是 DHCP 的职责，端口安全不负责地址分配，两者常配合使用。',
  },
];

export default list;
