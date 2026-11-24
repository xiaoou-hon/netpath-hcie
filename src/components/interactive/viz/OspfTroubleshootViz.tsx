import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icon } from '@/components/ui';
import { useStepper } from '../useStepper';
import { VizControls } from '../VizControls';

export const meta = {
  key: 'ospf-troubleshoot',
  title: 'OSPF 邻居排障决策树',
  subtitle: '按卡住的状态定位原因',
  order: 19,
};

interface Cause {
  id: string;
  cause: string;
  check: string;
}

interface StageInfo {
  key: string;
  node: string;
  state: string;
  symptom: string;
  /** 最可能原因的 id（Top1） */
  topCause: string;
  causes: Cause[];
  /** 一键复制用的验证命令清单 */
  commands: string[];
  actions: string[];
}

interface FaultCombo {
  key: string;
  label: string;
  stageKey: string;
  causeIds: string[];
  hint: string;
}

const stages: StageInfo[] = [
  {
    key: 'down',
    node: 'Down',
    state: 'Down：一台 Hello 都收不到',
    symptom:
      'display ospf peer 没有任何邻居，或邻居列表为空。说明本端根本没有收到对端合法的 Hello 报文。',
    topCause: 'down-phy',
    causes: [
      { id: 'down-phy', cause: '接口物理/协议状态不是 Up', check: 'display ip interface brief' },
      { id: 'down-network', cause: '接口未使能 OSPF 或 network 网段没覆盖该接口', check: 'display ospf interface' },
      { id: 'down-subnet', cause: '两端接口 IP 不在同一网段，或掩码不一致', check: 'display ip interface brief' },
      { id: 'down-acl', cause: '链路被 ACL / 防火墙策略拦截了 OSPF 协议号 89', check: 'display acl all' },
      { id: 'down-timer', cause: '两端 Hello/Dead 定时器不一致', check: 'display ospf interface GigabitEthernet0/0/0' },
      { id: 'down-shutdown', cause: '接口被 shutdown，或 VLANIF 对应 VLAN 未放通', check: 'display current-configuration interface' },
    ],
    commands: [
      'display ospf peer',
      'display ip interface brief',
      'display ospf interface',
      'display current-configuration interface GigabitEthernet0/0/0',
      'display acl all',
    ],
    actions: [
      '先 ping 直连对端地址，确认三层可达；不通就先解决链路与地址问题。',
      '确认两端接口都已 network 宣告到同一个 OSPF 进程和区域。',
      '核对掩码、Hello/Dead 定时器、网络类型（broadcast / p2p）是否一致。',
      '检查中间设备是否放行 IP 协议号 89（OSPF 不走 TCP/UDP 端口）。',
    ],
  },
  {
    key: 'init',
    node: 'Init',
    state: 'Init：收到 Hello，但看不到自己的 Router ID',
    symptom:
      '邻居状态停在 Init。本端收到了对端 Hello，但对端 Hello 的邻居列表里没有本端 Router ID，说明是单向通信。',
    topCause: 'init-single',
    causes: [
      { id: 'init-single', cause: '链路单向故障（收发光纤接反、单向光模块）', check: 'display interface brief / 光功率' },
      { id: 'init-auth', cause: '一端配置了认证，另一端没有', check: 'display current-configuration interface' },
      { id: 'init-area', cause: '区域 ID（Area ID）不一致', check: 'display ospf brief' },
      { id: 'init-routerid', cause: '两端 Router ID 冲突', check: 'display ospf brief' },
      { id: 'init-mcast', cause: '中间设备过滤了部分组播 Hello', check: 'display ospf error' },
    ],
    commands: [
      'display ospf peer',
      'display ospf brief',
      'display ospf error',
      'display current-configuration interface GigabitEthernet0/0/0',
    ],
    actions: [
      '在两端分别 display ospf peer，判断哪一侧单向收不到。',
      '统一区域 ID 与认证方式（简单认证 / MD5 / HMAC-SHA256）。',
      '检查 Router ID 是否重复，重复时手工指定 router-id 并重启 OSPF 进程。',
      '用 display ospf error 查看 Hello 丢弃原因计数。',
    ],
  },
  {
    key: 'twoway',
    node: '2-Way',
    state: '2-Way：双向通信已建立',
    symptom:
      '邻居状态停在 2-Way。注意：广播网络中两台 DROther 之间保持 2-Way 是正常现象，不需要建立 Full。',
    topCause: 'twoway-normal',
    causes: [
      { id: 'twoway-normal', cause: '正常现象：DROther 之间只维持 2-Way', check: 'display ospf peer（看 DR/BDR 字段）' },
      { id: 'twoway-priority', cause: '所有接口优先级为 0，导致没有 DR/BDR 选举', check: 'display ospf interface' },
      { id: 'twoway-dr', cause: 'DR 选举结果异常，或设备不支持该网络类型', check: 'display ospf interface' },
    ],
    commands: [
      'display ospf peer',
      'display ospf interface',
      'display ospf interface GigabitEthernet0/0/0',
    ],
    actions: [
      '先确认对端角色：如果双方都是 DROther，2-Way 属于正常状态，不必处理。',
      '若需要建立 Full（如点到点链路），把网络类型改为 p2p。',
      '检查接口 ospf dr-priority 是否为 0；为 0 表示不参与 DR/BDR 选举。',
    ],
  },
  {
    key: 'exstart',
    node: 'ExStart',
    state: 'ExStart：DD 报文交互失败（最高频故障）',
    symptom:
      '邻居卡在 ExStart，双方不断重发 DD 报文，主从关系（Master/Slave）选不出来。',
    topCause: 'exstart-mtu',
    causes: [
      { id: 'exstart-mtu', cause: '两端接口 MTU 不一致（最常见）', check: 'display interface GigabitEthernet0/0/0 | include MTU' },
      { id: 'exstart-routerid', cause: 'Router ID 冲突，主从选举无法收敛', check: 'display ospf brief' },
      { id: 'exstart-mtucheck', cause: 'MTU 检测未关闭且中间链路做了分片/封装', check: 'display current-configuration interface' },
      { id: 'exstart-acl', cause: 'DD 报文被 ACL 或 IPS 丢弃', check: 'display acl all / 抓包' },
    ],
    commands: [
      'display interface GigabitEthernet0/0/0 | include MTU',
      'display ospf brief',
      'display current-configuration interface GigabitEthernet0/0/0',
      'display ospf error',
    ],
    actions: [
      '优先核对两端 MTU，必须一致（常见 1500，隧道/VXLAN 场景要注意减 50~100）。',
      '临时验证：在接口下 ospf mtu-ignore，若状态立刻变 Full，则确认是 MTU 问题，再统一 MTU 后去掉该命令。',
      '确认 Router ID 全局唯一（display ospf brief）。',
      '若链路经过隧道或安全设备，检查分片与协议放行。',
    ],
  },
  {
    key: 'exchange',
    node: 'Exchange',
    state: 'Exchange：DD 摘要交换异常',
    symptom: '邻居进入 Exchange 后长时间不进入 Loading，DD 报文反复重传。',
    topCause: 'exchange-loss',
    causes: [
      { id: 'exchange-loss', cause: '链路质量差、丢包严重', check: 'ping -s 1400 -c 100 对端地址' },
      { id: 'exchange-cpu', cause: '设备 CPU 过高，协议报文处理不及时', check: 'display cpu-usage' },
      { id: 'exchange-mtu', cause: 'MTU 偏小导致大 DD 报文被丢弃', check: 'display interface brief' },
      { id: 'exchange-frag', cause: '中间设备做了分片重组或限速', check: '分段 ping 测试' },
    ],
    commands: [
      'ping -s 1400 -c 100 <对端地址>',
      'display interface brief',
      'display cpu-usage',
      'display ospf error',
    ],
    actions: [
      '用不同大小的 ping（-s 1400、-s 1472）判断链路 MTU 与丢包。',
      '查看 CPU 与接口错误计数（CRC、丢包、巨帧）。',
      '更换端口/光纤，排除物理层间歇性故障。',
      '统一两端 MTU 并避免中间设备对 OSPF 报文限速。',
    ],
  },
  {
    key: 'loading',
    node: 'Loading',
    state: 'Loading：LSR/LSU 请求应答不完整',
    symptom:
      '邻居卡在 Loading，本端在请求缺失的 LSA，但对端没有正确回应。',
    topCause: 'loading-lsa',
    causes: [
      { id: 'loading-lsa', cause: 'LSA 请求的链路中断或丢包', check: 'display ospf lsdb / display ospf error' },
      { id: 'loading-lsdb', cause: '对端 LSDB 异常或 LSA 老化', check: 'display ospf lsdb' },
      { id: 'loading-mtu', cause: 'MTU 不一致导致大 LSU 丢包', check: 'display interface brief' },
      { id: 'loading-resource', cause: '设备资源不足（内存/CPU）', check: 'display memory-usage' },
    ],
    commands: [
      'display ospf lsdb',
      'display ospf error',
      'display interface brief',
      'display memory-usage',
    ],
    actions: [
      '查看 display ospf error 中 LSR/LSU 相关计数，判断是请求未发出还是应答丢失。',
      '检查链路丢包与 MTU；必要时调整 MTU 或改进链路质量。',
      '确认对端 LSDB 完整，可尝试 reset ospf process（务必评估影响）。',
      '若长期反复 Loading，先重启 OSPF 进程并观察是否稳定。',
    ],
  },
  {
    key: 'full',
    node: 'Full',
    state: 'Full：邻居正常但路由不通',
    symptom:
      '邻居已是 Full，但路由表里没有预期路由，或路由存在却不优、不通。问题已不在邻居建立，而在 LSA 计算与路由发布。',
    topCause: 'full-filter',
    causes: [
      { id: 'full-area', cause: '区域类型（STUB/NSSA）导致 LSA 被过滤', check: 'display ospf brief / display ospf lsdb' },
      { id: 'full-filter', cause: '路由汇总或 filter-policy 过滤了路由', check: 'display current-configuration | include filter' },
      { id: 'full-lsa', cause: 'ABR/ASBR 未正确产生 Type-3/Type-5 LSA', check: 'display ospf lsdb' },
      { id: 'full-cost', cause: '开销（cost）导致选路不符合预期', check: 'display ospf routing' },
      { id: 'full-import', cause: '外部路由引入未配置或引入策略拒绝', check: 'display current-configuration | include import-route' },
    ],
    commands: [
      'display ospf brief',
      'display ospf lsdb',
      'display ospf routing',
      'display current-configuration | include filter',
      'display current-configuration | include import-route',
    ],
    actions: [
      '先看 LSDB 是否有对应 LSA，再看 display ospf routing 是否算出路由。',
      '确认区域类型与特殊区域配置一致，STUB 区域必须有 ABR 下发的默认路由。',
      '检查 filter-policy、route-policy、汇总命令是否过滤过宽。',
      '核对接口 cost 与带宽参考值，确认最优路径符合设计。',
      '跨区域不通时逐跳检查 ABR 的 Type-3 LSA 与路由表。',
    ],
  },
];

const combos: FaultCombo[] = [
  {
    key: 'single-auth',
    label: '单向链路 + 认证不一致',
    stageKey: 'init',
    causeIds: ['init-single', 'init-auth'],
    hint: '跳到 Init：先确认收发光是否单向，再核对两端认证方式与密钥。',
  },
  {
    key: 'mtu',
    label: 'MTU 不一致',
    stageKey: 'exstart',
    causeIds: ['exstart-mtu', 'exstart-mtucheck'],
    hint: '跳到 ExStart：两端 MTU 必须一致，可先用 ospf mtu-ignore 快速验证。',
  },
  {
    key: 'area',
    label: '区域 ID 不一致',
    stageKey: 'init',
    causeIds: ['init-area'],
    hint: '跳到 Init：两端 Area ID 必须完全一致（注意点分与十进制写法）。',
  },
];

const selectStyle: CSSProperties = {
  padding: '5px 9px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: 12,
  outline: 'none',
};

/* ------------------------------- 复制能力 ------------------------------- */

function fallbackCopy(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } finally {
    document.body.removeChild(area);
  }
  return ok;
}

function CopyAction({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  const markCopied = () => {
    setCopied(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  const onCopy = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(markCopied).catch(() => {
        if (fallbackCopy(text)) markCopied();
      });
    } else if (fallbackCopy(text)) {
      markCopied();
    }
  };

  return (
    <button type="button" className="btn btn-sm btn-ghost" onClick={onCopy} aria-label={label}>
      <Icon name={copied ? 'check' : 'copy'} size={12} />
      {copied ? '已复制' : label}
    </button>
  );
}

/* ------------------------------- 组件主体 ------------------------------- */

export default function OspfTroubleshootViz() {
  const stepper = useStepper(stages.length);
  const [comboKey, setComboKey] = useState('');
  const stage = stages[stepper.index];
  const top = stage.causes.find((c) => c.id === stage.topCause) ?? stage.causes[0];
  const combo = combos.find((c) => c.key === comboKey);
  const relatedIds = combo && combo.stageKey === stage.key ? combo.causeIds : [];

  const commandText = [`# OSPF 邻居状态：${stage.state}`, ...stage.commands].join('\n');

  const onComboChange = (value: string) => {
    setComboKey(value);
    const target = combos.find((c) => c.key === value);
    if (!target) return;
    const targetIndex = stages.findIndex((s) => s.key === target.stageKey);
    if (targetIndex >= 0) stepper.goTo(targetIndex);
  };

  return (
    <div>
      <svg viewBox="0 0 700 128" width="100%" role="img" aria-label="OSPF 邻居状态排障决策链">
        <defs>
          <linearGradient id="ospfTsGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        {stages.map((s, i) => {
          const x = 40 + i * 100;
          const active = i === stepper.index;
          return (
            <g
              key={s.key}
              onClick={() => stepper.goTo(i)}
              style={{ cursor: 'pointer' }}
              role="button"
              aria-label={`查看 ${s.node} 状态`}
            >
              {i < stages.length - 1 ? (
                <line x1={x + 16} y1={44} x2={x + 84} y2={44} stroke="var(--border-strong)" strokeWidth={2} />
              ) : null}
              <circle
                cx={x + 16}
                cy={44}
                r={active ? 18 : 15}
                fill={active ? 'url(#ospfTsGrad)' : 'var(--surface-2)'}
                stroke={active ? 'var(--accent)' : 'var(--border-strong)'}
                strokeWidth={2}
              />
              <text
                x={x + 16}
                y={49}
                textAnchor="middle"
                fontSize={active ? 10 : 9}
                fontWeight={700}
                fill={active ? '#241604' : 'var(--text-dim)'}
              >
                {i + 1}
              </text>
              <text x={x + 16} y={82} textAnchor="middle" fontSize={10.5} fill={active ? 'var(--accent)' : 'var(--text-dim)'}>
                {s.node}
              </text>
            </g>
          );
        })}
        <text x={40} y={112} fontSize={10} fill="var(--text-faint)">
          点击任一状态查看：现象 → 可能原因 → 验证命令 → 处理动作
        </text>
      </svg>

      <VizControls
        stepper={stepper}
        ariaLabel="OSPF 邻居状态步骤控制"
        extra={<span className="badge accent">当前：{stage.node}</span>}
      />

      <div className="hstack" style={{ marginTop: 10, gap: 8 }}>
        <label className="tiny faint" htmlFor="ospf-combo">
          故障组合预设
        </label>
        <select
          id="ospf-combo"
          value={comboKey}
          onChange={(e) => onComboChange(e.target.value)}
          style={selectStyle}
          aria-label="选择故障组合预设"
        >
          <option value="">自定义（不套用预设）</option>
          {combos.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        {combo ? (
          <span className="tiny" style={{ color: 'var(--warn)' }}>
            {combo.hint}
          </span>
        ) : null}
      </div>

      <div className="card" style={{ marginTop: 14, background: 'var(--surface)' }}>
        <div className="hstack" style={{ marginBottom: 6 }}>
          <span className="badge" data-depth={stage.key === 'twoway' ? '熟悉' : '精通'}>
            {stage.key === 'twoway' ? '先判断是否正常' : '重点排查'}
          </span>
          <strong style={{ fontSize: 14.5 }}>{stage.state}</strong>
          <span className="spacer" />
          <CopyAction text={commandText} label="复制本状态验证命令" />
        </div>
        <p className="small muted" style={{ lineHeight: 1.8 }}>{stage.symptom}</p>

        <div
          style={{
            marginTop: 10,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(251, 191, 36, 0.32)',
            background: 'var(--warn-soft)',
          }}
        >
          <div className="hstack" style={{ gap: 8 }}>
            <span className="badge warn">Top1 最可能</span>
            <strong style={{ fontSize: 13 }}>{top.cause}</strong>
          </div>
          <div className="tiny" style={{ color: 'var(--text-dim)', marginTop: 5 }}>
            最快验证：
            <span className="mono" style={{ color: 'var(--warn)' }}>{top.check}</span>
          </div>
        </div>

        <div className="block-table" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '45%' }}>可能原因</th>
                <th>验证方式</th>
              </tr>
            </thead>
            <tbody>
              {stage.causes.map((c) => {
                const related = relatedIds.includes(c.id);
                return (
                  <tr key={c.id} style={related ? { background: 'var(--warn-soft)' } : undefined}>
                    <td>
                      {related ? (
                        <span className="badge warn" style={{ marginRight: 6 }}>
                          相关
                        </span>
                      ) : null}
                      {c.cause}
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{c.check}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="block-label" style={{ marginTop: 14, color: 'var(--accent)' }}>
          处理动作（按顺序）
        </div>
        <div className="block-steps">
          {stage.actions.map((a, i) => (
            <div className="step-item" key={a} style={{ padding: '10px 12px' }}>
              <span className="num">{i + 1}</span>
              <div className="d" style={{ fontSize: 13 }}>{a}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="viz-note">
        通用排障闭环：<span className="mono">确认现象 → 定位状态 → 列出假设 → 逐条验证（display / ping / 抓包）→ 最小改动修复 → 回归验证</span>。
        改动前先备份配置（<span className="mono">display current-configuration</span>），并记录变更点，便于回滚。
      </div>
    </div>
  );
}
