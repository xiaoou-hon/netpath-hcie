import type { QuizQuestion } from '@/types';

const list: QuizQuestion[] = [
  {
    id: 'q-m08-01',
    moduleId: 'm08',
    type: 'single',
    depth: '熟悉',
    question: '华为 WLAN 中 CAPWAP 控制隧道和数据隧道默认使用的 UDP 端口分别是？',
    options: ['控制 5246，数据 5247', '控制 5247，数据 5246', '控制 179，数据 180', '控制 4789，数据 4790'],
    answer: [0],
    explanation:
      'CAPWAP 控制隧道使用 UDP 5246，承载 AP 与 AC 之间的控制报文；数据隧道使用 UDP 5247，承载隧道转发模式下的业务报文。防火墙放行 WLAN 流量时必须同时放行这两个端口，否则 AP 可能上线但业务不通。',
  },
  {
    id: 'q-m08-02',
    moduleId: 'm08',
    type: 'single',
    depth: '熟悉',
    question: 'AP 首次上线的典型流程中，AP 在获取 IP 地址之后通常会做什么？',
    options: [
      '发现 AC 并建立 CAPWAP 连接',
      '直接向终端广播 SSID',
      '立即下载所有用户配置',
      '先进行 802.1X 认证',
    ],
    answer: [0],
    explanation:
      'AP 上电后先通过 DHCP 获取 IP 地址，再通过 DHCP Option 43、静态配置或广播方式发现 AC，随后建立 CAPWAP 控制隧道并下载配置和版本。只有完成这些步骤后 AP 才会正常上线并发射 SSID，顺序颠倒通常意味着发现 AC 失败。',
  },
  {
    id: 'q-m08-03',
    moduleId: 'm08',
    type: 'multiple',
    depth: '熟悉',
    question: '下列哪些属于 WLAN 常见的组网或转发方式？',
    options: ['直连式组网', '旁挂式组网', '隧道转发', '直接转发'],
    answer: [0, 1, 2, 3],
    explanation:
      '按 AC 与 AP 的连接关系可分为直连式和旁挂式组网，按业务数据路径可分为隧道转发和直接转发。隧道转发业务数据经 AC，便于集中管控；直接转发业务数据在 AP 本地进入业务 VLAN，能减轻 AC 压力，两者各有适用场景。',
  },
  {
    id: 'q-m08-04',
    moduleId: 'm08',
    type: 'single',
    depth: '熟悉',
    question: 'WLAN 中 SSID 与 VAP 的关系是什么？',
    options: [
      '一个 VAP 通常对应一个 SSID 和一组业务配置',
      '一个 SSID 必须对应多个 VAP',
      'VAP 与 SSID 完全没有关系',
      '一个 VAP 只能对应管理 VLAN',
    ],
    answer: [0],
    explanation:
      'VAP 是虚拟接入点，绑定 AP 组、SSID、业务 VLAN 和安全模板等参数，一个 VAP 通常对应一个 SSID 和一套业务配置。终端搜索到的无线网络名称就是 SSID，用户接入后所在的业务 VLAN 由 VAP 配置决定。',
  },
  {
    id: 'q-m08-05',
    moduleId: 'm08',
    type: 'boolean',
    depth: '熟悉',
    question: '在隧道转发模式下，无线终端的业务数据需要经过 AC 转发。',
    options: ['正确', '错误'],
    answer: [0],
    explanation:
      '隧道转发模式下，AP 通过 CAPWAP 数据隧道把业务报文封装后送到 AC，由 AC 解封装并转发到上层网络。这种方式便于统一策略和漫游控制，但 AC 会成为业务流量瓶颈。直接转发模式下业务数据由 AP 本地转发，不经过 AC。',
  },
  {
    id: 'q-m08-06',
    moduleId: 'm08',
    type: 'single',
    depth: '了解',
    question: '2.4GHz 频段中，常用来避免同频干扰的三个非重叠信道是？',
    options: ['1、6、11', '1、2、3', '36、40、44', '149、153、157'],
    answer: [0],
    explanation:
      '2.4GHz 频段每个信道带宽 20MHz，信道间隔只有 5MHz，只有 1、6、11 三个信道互不重叠。36、40、44 和 149、153、157 属于 5GHz 频段。密集部署时要通过信道规划和功率调整降低同频干扰。',
  },
  {
    id: 'q-m08-07',
    moduleId: 'm08',
    type: 'multiple',
    depth: '精通',
    question: 'AP 无法上线时，应该重点检查哪些内容？',
    options: [
      'AP 是否获取到 IP 地址',
      'AP 与 AC 之间是否路由可达',
      'DHCP Option 43 或 AC 地址配置是否正确',
      '终端是否安装了浏览器',
    ],
    answer: [0, 1, 2],
    explanation:
      'AP 上线依赖地址获取、AC 发现和网络可达，因此要检查 DHCP 地址、Option 43、AC 地址配置及中间链路和防火墙放行情况。终端是否安装浏览器与 AP 上线无关，AP 上线失败时应先从 AP 侧和 AC 侧日志定位，而不是从终端排查。',
  },
  {
    id: 'q-m08-08',
    moduleId: 'm08',
    type: 'single',
    depth: '精通',
    question: '同一 AC 下终端在不同 AP 之间漫游时，通常希望保持什么不变？',
    options: ['终端 IP 地址和业务 VLAN 保持不变', '终端 MAC 地址自动改变', 'SSID 自动改变', 'AC 管理地址自动改变'],
    answer: [0],
    explanation:
      '同一 AC 内的漫游通常保持终端 IP 地址和业务 VLAN 不变，避免重新获取地址导致业务中断。三层漫游时需要通过 AC 或隧道把报文送回原网关，实现地址保持。漫游过程中 MAC 地址不会改变，SSID 也不会随 AP 改变。',
  },
  {
    id: 'q-m08-09',
    moduleId: 'm08',
    type: 'boolean',
    depth: '了解',
    question: '5GHz 频段的穿墙能力通常强于 2.4GHz 频段。',
    options: ['正确', '错误'],
    answer: [1],
    explanation:
      '频率越高，波长越短，穿透和绕射能力越弱，因此 5GHz 穿墙能力通常不如 2.4GHz。但 5GHz 频段带宽更大、非重叠信道更多、干扰更少，适合高密度和高速率场景。实际部署要根据覆盖范围和容量需求综合选择频段。',
  },
  {
    id: 'q-m08-10',
    moduleId: 'm08',
    type: 'single',
    depth: '熟悉',
    question: 'WPA2-Enterprise 无线认证通常基于哪种协议实现用户身份认证？',
    options: ['802.1X', 'STP', 'OSPF', 'CAPWAP'],
    answer: [0],
    explanation:
      'WPA2-Enterprise 使用 802.1X 配合 RADIUS 服务器完成用户身份认证，每个用户使用独立账号和凭据，适合企业网络。WPA2-PSK 则使用预共享密钥，所有用户共用同一个密码，安全性和可审计性较弱。',
  },
];

export default list;
