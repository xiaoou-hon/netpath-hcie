/**
 * Huawei VRP 命令词典（按视图分层 + 关键字后缀）。
 * ------------------------------------------------------------------
 * 纯数据，不依赖运行时。用于 Web 终端的 Tab 补全与「?」上下文帮助，
 * 让命令行「映射」eNSP 设备使用的 VRP 命令集，便于 AI 助教辅助学习。
 *
 * 说明：
 * - `word` 为补全 token（命令字或参数占位）。缩写由前缀匹配天然支持
 *   （例如输入 `sy` 会命中 `system-view` / `sysname`），与真实 VRP 行为一致。
 * - `placeholder: true` 表示这是参数提示（如 `<ip-address>`），不会被当成
 *   真实命令字直接执行，仅供学习者参考。
 */

export interface VrpCandidate {
  /** 补全目标 token（命令字或参数占位） */
  word: string;
  /** 中文说明 */
  desc: string;
  /** 参数占位提示，非真实命令字 */
  placeholder?: boolean;
}

/**
 * 各视图下可用的「首字命令」。
 * view 取值与桥接返回的 `view` 对齐：user / system / sub，
 * 另外补充可从提示符识别出的具体子视图：interface / ospf / bgp / vlan / acl 等。
 */
export const VRP_COMMANDS: Record<string, VrpCandidate[]> = {
  user: [
    { word: 'display', desc: '查看运行状态与配置信息' },
    { word: 'system-view', desc: '进入系统视图（配置模式）' },
    { word: 'quit', desc: '退出当前视图' },
    { word: 'return', desc: '直接返回用户视图（等价 Ctrl+Z）' },
    { word: 'save', desc: '保存当前配置到启动配置' },
    { word: 'reboot', desc: '重启设备（危险，需确认）' },
    { word: 'reset', desc: '重置计数/会话等' },
    { word: 'ping', desc: '测试 IP 连通性' },
    { word: 'tracert', desc: '跟踪路由路径' },
    { word: 'telnet', desc: 'Telnet 登录到远端设备' },
    { word: 'ssh', desc: 'SSH 登录到远端设备' },
    { word: 'super', desc: '切换用户级别' },
    { word: 'screen-length', desc: '设置终端分屏行数' },
    { word: 'dir', desc: '列出存储介质文件' },
    { word: 'more', desc: '查看文件内容' },
    { word: 'delete', desc: '删除文件' },
    { word: 'undelete', desc: '恢复删除的文件' },
    { word: 'cd', desc: '切换工作目录' },
    { word: 'pwd', desc: '显示当前工作目录' },
    { word: 'language-mode', desc: '切换命令行语言' },
    { word: 'mmi', desc: '人机界面管理' },
  ],
  system: [
    { word: 'sysname', desc: '设置设备名称' },
    { word: 'interface', desc: '进入接口视图' },
    { word: 'vlan', desc: '进入 VLAN 视图 / 创建 VLAN' },
    { word: 'ospf', desc: '进入 OSPF 视图 / 启动 OSPF 进程' },
    { word: 'bgp', desc: '进入 BGP 视图 / 启动 BGP 进程' },
    { word: 'rip', desc: '进入 RIP 视图' },
    { word: 'isis', desc: '进入 IS-IS 视图' },
    { word: 'acl', desc: '创建 / 进入 ACL 规则' },
    { word: 'ip', desc: 'IP 相关配置（路由 / 地址池等）' },
    { word: 'route-policy', desc: '进入路由策略视图' },
    { word: 'ip ip-prefix', desc: '配置地址前缀列表' },
    { word: 'dhcp', desc: 'DHCP 配置' },
    { word: 'stp', desc: '生成树协议配置' },
    { word: 'lacp', desc: 'LACP 链路聚合配置' },
    { word: 'qos', desc: 'QoS 配置' },
    { word: 'firewall', desc: '防火墙策略配置' },
    { word: 'nat', desc: 'NAT 配置' },
    { word: 'local-user', desc: '创建本地用户' },
    { word: 'aaa', desc: '进入 AAA 视图' },
    { word: 'user-interface', desc: '进入用户界面视图（VTY/Console）' },
    { word: 'undo', desc: '取消 / 恢复某配置' },
    { word: 'quit', desc: '返回用户视图' },
    { word: 'return', desc: '直接返回用户视图' },
    { word: 'display', desc: '查看信息（系统视图下同样可用）' },
    { word: 'save', desc: '保存配置' },
    { word: 'commit', desc: '提交配置（部分 NE 设备）' },
  ],
  interface: [
    { word: 'ip', desc: 'IP 相关配置（地址等）' },
    { word: 'undo', desc: '取消配置（如 undo shutdown）' },
    { word: 'shutdown', desc: '关闭接口' },
    { word: 'description', desc: '接口描述' },
    { word: 'speed', desc: '接口速率' },
    { word: 'duplex', desc: '双工模式' },
    { word: 'negotiation', desc: '自动协商（negotiation auto）' },
    { word: 'mtu', desc: '接口 MTU' },
    { word: 'port', desc: '端口相关（链路类型 / VLAN）' },
    { word: 'ospf', desc: '接口启用 OSPF / 设置 OSPF 参数' },
    { word: 'dhcp', desc: '接口 DHCP 配置' },
    { word: 'display', desc: '查看接口信息' },
    { word: 'quit', desc: '返回系统视图' },
    { word: 'return', desc: '返回用户视图' },
  ],
  ospf: [
    { word: 'area', desc: '进入 OSPF 区域视图' },
    { word: 'router-id', desc: '配置 Router ID' },
    { word: 'preference', desc: '配置 OSPF 优先级' },
    { word: 'silent-interface', desc: '配置静默接口' },
    { word: 'display', desc: '查看 OSPF 信息' },
    { word: 'quit', desc: '返回系统视图' },
    { word: 'return', desc: '返回用户视图' },
  ],
  'ospf-area': [
    { word: 'network', desc: '宣告网段（network 反掩码）' },
    { word: 'authentication-mode', desc: '区域认证模式' },
    { word: 'area-id', desc: '区域 ID' },
    { word: 'quit', desc: '返回 OSPF 视图' },
    { word: 'return', desc: '返回用户视图' },
  ],
  bgp: [
    { word: 'router-id', desc: '配置 Router ID' },
    { word: 'peer', desc: '配置 BGP 邻居' },
    { word: 'network', desc: '宣告本机网段' },
    { word: 'import-route', desc: '引入外部路由' },
    { word: 'display', desc: '查看 BGP 信息' },
    { word: 'quit', desc: '返回系统视图' },
    { word: 'return', desc: '返回用户视图' },
  ],
  vlan: [
    { word: 'description', desc: 'VLAN 描述' },
    { word: 'name', desc: 'VLAN 名称' },
    { word: 'display', desc: '查看 VLAN 信息' },
    { word: 'quit', desc: '返回系统视图' },
    { word: 'return', desc: '返回用户视图' },
  ],
  acl: [
    { word: 'rule', desc: '配置 ACL 规则' },
    { word: 'description', desc: 'ACL 描述' },
    { word: 'display', desc: '查看 ACL' },
    { word: 'quit', desc: '返回系统视图' },
    { word: 'return', desc: '返回用户视图' },
  ],
  route_policy: [
    { word: 'if-match', desc: '匹配条件' },
    { word: 'apply', desc: '设置动作' },
    { word: 'node', desc: '节点（node 序号 permit/deny）' },
    { word: 'mode', desc: '匹配模式' },
    { word: 'quit', desc: '返回系统视图' },
    { word: 'return', desc: '返回用户视图' },
  ],
  // 通用子视图兜底（无法从提示符识别具体类型时）
  sub: [
    { word: 'quit', desc: '返回上一级视图' },
    { word: 'return', desc: '返回用户视图' },
    { word: 'display', desc: '查看信息' },
    { word: 'undo', desc: '取消配置' },
  ],
};

/**
 * 关键字 / 参数后缀表：键为「已输入的前缀词」（小写、空格连接），
 * 值为接下来可选的 token。用于多词命令的逐级补全。
 */
export const VRP_SUFFIXES: Record<string, VrpCandidate[]> = {
  // ---- display 的子命令 ----
  display: [
    { word: 'ip', desc: 'IP 相关信息' },
    { word: 'current-configuration', desc: '查看当前配置' },
    { word: 'saved-configuration', desc: '查看已保存配置' },
    { word: 'version', desc: '查看版本信息' },
    { word: 'interface', desc: '查看接口信息' },
    { word: 'ospf', desc: '查看 OSPF 信息' },
    { word: 'bgp', desc: '查看 BGP 信息' },
    { word: 'vlan', desc: '查看 VLAN 信息' },
    { word: 'stp', desc: '查看生成树状态' },
    { word: 'acl', desc: '查看 ACL 配置' },
    { word: 'cpu-usage', desc: '查看 CPU 使用率' },
    { word: 'memory-usage', desc: '查看内存使用率' },
    { word: 'this', desc: '查看当前视图下的配置' },
    { word: 'clock', desc: '查看系统时钟' },
    { word: 'arp', desc: '查看 ARP 表' },
    { word: 'mac-address', desc: '查看 MAC 地址表' },
  ],
  'display ip': [
    { word: 'interface', desc: '查看接口 IP 信息' },
    { word: 'routing-table', desc: '查看 IP 路由表' },
    { word: 'pool', desc: '查看地址池' },
    { word: 'dhcp', desc: '查看 DHCP 信息' },
  ],
  'display ip interface': [
    { word: 'brief', desc: '简要信息' },
  ],
  'display ospf': [
    { word: 'peer', desc: '查看 OSPF 邻居' },
    { word: 'routing', desc: '查看 OSPF 路由' },
    { word: 'interface', desc: '查看 OSPF 接口' },
    { word: 'lsdb', desc: '查看 LSDB' },
    { word: 'brief', desc: 'OSPF 简要信息' },
  ],
  'display bgp': [
    { word: 'peer', desc: '查看 BGP 邻居' },
    { word: 'routing-table', desc: '查看 BGP 路由表' },
  ],
  'display interface': [
    { word: 'brief', desc: '简要信息' },
  ],

  // ---- interface 的参数 ----
  interface: [
    { word: 'GigabitEthernet', desc: '千兆以太网接口（如 GigabitEthernet0/0/0）' },
    { word: 'GigabitEthernet0/0/0', desc: '接口 GE0/0/0' },
    { word: 'GigabitEthernet0/0/1', desc: '接口 GE0/0/1' },
    { word: 'GigabitEthernet0/0/2', desc: '接口 GE0/0/2' },
    { word: 'Serial', desc: '串行接口' },
    { word: 'Vlanif', desc: 'VLAN 逻辑接口（如 Vlanif10）' },
    { word: 'LoopBack', desc: '环回接口' },
    { word: 'NULL', desc: 'Null 接口' },
  ],

  // ---- system 视图下 ip ----
  ip: [
    { word: 'route-static', desc: '配置静态路由' },
    { word: 'pool', desc: '创建地址池' },
    { word: 'ip-prefix', desc: '配置地址前缀列表' },
  ],
  'ip route-static': [
    { word: '<ip-address>', desc: '目标网段，如 192.168.1.0', placeholder: true },
  ],

  // ---- interface 视图下 ip ----
  'ip address': [
    { word: '<ip-address>', desc: '接口 IP 地址，如 192.168.12.1', placeholder: true },
    { word: '<mask>', desc: '子网掩码或掩码长度，如 255.255.255.0 或 24', placeholder: true },
  ],

  // ---- interface 视图下 port ----
  port: [
    { word: 'link-type', desc: '设置端口链路类型' },
    { word: 'default', desc: '设置 Access 端口默认 VLAN' },
    { word: 'trunk', desc: 'Trunk 端口相关配置' },
    { word: 'hybrid', desc: 'Hybrid 端口相关配置' },
  ],
  'port link-type': [
    { word: 'access', desc: 'Access 链路' },
    { word: 'trunk', desc: 'Trunk 链路' },
    { word: 'hybrid', desc: 'Hybrid 链路' },
  ],
  'port default': [
    { word: 'vlan', desc: '指定默认 VLAN' },
  ],
  'port trunk': [
    { word: 'allow-pass', desc: '允许通过的 VLAN' },
    { word: 'pvid', desc: 'Trunk 端口 PVID' },
  ],
  'port trunk allow-pass': [
    { word: 'vlan', desc: 'VLAN 列表' },
  ],

  // ---- undo ----
  undo: [
    { word: 'shutdown', desc: '开启接口（取消关闭）' },
    { word: 'ip address', desc: '删除接口 IP 地址' },
    { word: 'port default vlan', desc: '恢复默认 VLAN' },
    { word: 'port trunk allow-pass vlan', desc: '移除 Trunk 允许的 VLAN' },
  ],

  // ---- ospf 视图下 ----
  'ospf area': [
    { word: '<area-id>', desc: '区域 ID，如 0 或 0.0.0.0', placeholder: true },
  ],
  network: [
    { word: '<ip-address>', desc: '网段地址，如 192.168.12.0', placeholder: true },
    { word: '<wildcard>', desc: '反掩码，如 0.0.0.255', placeholder: true },
  ],
  'ospf network': [
    { word: '<ip-address>', desc: '网段地址', placeholder: true },
  ],

  // ---- ping / tracert 参数 ----
  ping: [
    { word: '<ip-address>', desc: '目标 IP 地址', placeholder: true },
  ],
  tracert: [
    { word: '<ip-address>', desc: '目标 IP 地址', placeholder: true },
  ],

  // ---- system-view 下关键字 ----
  sysname: [
    { word: '<name>', desc: '设备名称，如 R1', placeholder: true },
  ],

  // ---- dhcp ----
  dhcp: [
    { word: 'select', desc: '接口选择 DHCP 模式' },
    { word: 'enable', desc: '全局使能 DHCP' },
    { word: 'server', desc: 'DHCP 服务器配置' },
  ],
  'dhcp select': [
    { word: 'global', desc: '使用全局地址池' },
    { word: 'interface', desc: '使用接口地址池' },
  ],
};
