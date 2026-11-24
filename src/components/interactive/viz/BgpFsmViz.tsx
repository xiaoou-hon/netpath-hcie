import { useState } from 'react';
import { useStepper } from '../useStepper';
import { VizControls } from '../VizControls';

export const meta = {
  key: 'bgp-fsm',
  title: 'BGP 有限状态机',
  subtitle: '邻居建立 6 状态',
  order: 16,
};

type BgpState = 'Idle' | 'Connect' | 'Active' | 'OpenSent' | 'OpenConfirm' | 'Established';

const STATES: BgpState[] = ['Idle', 'Connect', 'Active', 'OpenSent', 'OpenConfirm', 'Established'];

const POS: Record<BgpState, { x: number; y: number; cn: string }> = {
  Idle: { x: 36, y: 16, cn: '空闲 / 等待启动' },
  Connect: { x: 36, y: 96, cn: 'TCP 连接中' },
  Active: { x: 266, y: 96, cn: '连接失败，重试' },
  OpenSent: { x: 36, y: 176, cn: '已发 Open' },
  OpenConfirm: { x: 36, y: 256, cn: '等待 Keepalive' },
  Established: { x: 36, y: 336, cn: '邻居建立' },
};

const INFO: Record<BgpState, { trigger: string; fault: string }> = {
  Idle: {
    trigger: '手动启动 BGP，或重连定时器到期后重新发起连接。',
    fault: '没有到对端的路由、ACL 拦截 TCP 179、未配置 neighbor。',
  },
  Connect: {
    trigger: '已发出 TCP SYN，等待三次握手完成。',
    fault: '长期停留在 Connect：路由不可达或 SYN 被防火墙丢弃。',
  },
  Active: {
    trigger: 'TCP 连接失败，等待重试定时器再次发起连接。',
    fault: '对端 179 未监听、防火墙拦截、对端未配置 peer、路由不可达。',
  },
  OpenSent: {
    trigger: 'TCP 建立成功，已发送 Open 报文，等待对端 Open。',
    fault: 'AS 号不匹配、BGP 版本不支持、Router ID 冲突（会收到 Notification）。',
  },
  OpenConfirm: {
    trigger: '收到对端 Open 且检查通过，等待 Keepalive。',
    fault: '能力协商失败（地址族、认证、Hold Time 不匹配）导致无法进入 Established。',
  },
  Established: {
    trigger: '收到 Keepalive，邻居建立，开始交换 Update。',
    fault: '收到 Notification 或 Hold Timer 超时 → 回到 Idle。',
  },
};

const STEP_NOTE: Record<BgpState, string> = {
  Idle: '起始：BGP 进程刚启动，尚未发起 TCP 连接。',
  Connect: 'Idle → Connect：已发起 TCP 三次握手，等待对端 179 端口响应。',
  Active: 'Connect → Active（失败分支）：TCP 建连失败，等待重试；正常建立可跳过本步。',
  OpenSent: 'TCP 建立成功 → OpenSent：已发送 Open，等待对端 Open 并校验 AS / Router ID / 版本。',
  OpenConfirm: '对端 Open 校验通过 → OpenConfirm：等待合法 Keepalive。',
  Established: '收到 Keepalive → Established：邻居建立，开始交换 Update 路由。',
};

type FaultKey = 'as-mismatch' | 'acl-179' | 'router-id' | 'capability';

type Fault = {
  key: FaultKey;
  label: string;
  state: BgpState;
  reason: string;
  commands: string[];
};

const FAULTS: Fault[] = [
  {
    key: 'as-mismatch',
    label: 'AS 号不匹配',
    state: 'OpenSent',
    reason:
      '对端 Open 报文中的 My AS 与本端 neighbor 配置的 remote-as 不一致，校验失败后发送 Notification（Bad Peer AS）并断开，邻居反复重建。',
    commands: ['display bgp peer', 'display current-configuration | include bgp'],
  },
  {
    key: 'acl-179',
    label: '179 被 ACL 拦截',
    state: 'Active',
    reason:
      'TCP 179 握手被 ACL 或防火墙丢弃，TCP 建连失败，邻居在 Connect / Active 之间循环，永远到不了 OpenSent。',
    commands: ['display acl 3000', 'ping -a 10.1.1.1 10.1.1.2', 'display bgp peer'],
  },
  {
    key: 'router-id',
    label: 'Router ID 冲突',
    state: 'OpenSent',
    reason:
      '两端 Router ID 相同（多为复制配置导致），Open 报文校验失败并收到 Notification，邻居刚建立就被拆掉。',
    commands: ['display bgp peer', 'display bgp routing-table'],
  },
  {
    key: 'capability',
    label: '版本 / 能力不匹配',
    state: 'OpenConfirm',
    reason:
      'BGP 版本（v3 / v4）或能力协商（地址族、认证、Hold Time）不一致，Open 通过但收不到合法 Keepalive，长期停在 OpenConfirm。',
    commands: ['display bgp peer verbose', 'display bgp peer'],
  },
];

const W = 140;
const H = 46;

type Speed = 'slow' | 'medium' | 'fast';

const SPEED_INTERVAL: Record<Speed, number> = { slow: 2200, medium: 1400, fast: 700 };
const SPEED_LABEL: Record<Speed, string> = { slow: '慢', medium: '中', fast: '快' };
const SPEEDS: Speed[] = ['slow', 'medium', 'fast'];

function stateColor(s: BgpState): string {
  if (s === 'Established') return 'var(--ok)';
  if (s === 'Active') return 'var(--danger)';
  if (s === 'Connect') return 'var(--warn)';
  if (s === 'Idle') return 'var(--text-faint)';
  return 'var(--accent-2)';
}

export default function BgpFsmViz() {
  const [speed, setSpeed] = useState<Speed>('medium');
  const stepper = useStepper(STATES.length, { interval: SPEED_INTERVAL[speed] });
  const [faultKey, setFaultKey] = useState<FaultKey | null>(null);

  const current = STATES[stepper.index];
  const info = INFO[current];
  const fault = FAULTS.find((f) => f.key === faultKey) ?? null;

  const jumpToState = (state: BgpState) => {
    setFaultKey(null);
    stepper.goTo(STATES.indexOf(state));
  };

  /** 步骤导航时退出故障视图，保证讲解与当前状态一致 */
  const clearFault = () => setFaultKey(null);
  const stepperForControls = {
    ...stepper,
    next: () => {
      clearFault();
      stepper.next();
    },
    prev: () => {
      clearFault();
      stepper.prev();
    },
    goTo: (index: number) => {
      clearFault();
      stepper.goTo(index);
    },
    reset: () => {
      clearFault();
      stepper.reset();
    },
    toggle: () => {
      clearFault();
      stepper.toggle();
    },
  };

  return (
    <div>
      <div className="hstack" style={{ gap: 6, marginBottom: 8 }} role="group" aria-label="演示模式">
        <span className="tiny faint">模式</span>
        <button
          type="button"
          className={`btn btn-sm${faultKey === null ? ' btn-primary' : ''}`}
          onClick={() => {
            setFaultKey(null);
            stepper.goTo(0);
          }}
          aria-pressed={faultKey === null}
          aria-label="切换到正常建立模式"
        >
          正常建立
        </button>
        {FAULTS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`btn btn-sm${faultKey === f.key ? ' btn-danger' : ''}`}
            onClick={() => {
              setFaultKey(f.key);
              stepper.goTo(STATES.indexOf(f.state));
            }}
            aria-pressed={faultKey === f.key}
            aria-label={`故障注入：${f.label}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <svg
        viewBox="0 0 520 450"
        width="100%"
        style={{ minWidth: 400 }}
        role="img"
        aria-label="BGP 邻居有限状态机流程图"
      >
        <defs>
          <marker id="bgp-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--text-dim)" />
          </marker>
          <marker id="bgp-arrow-warn" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--warn)" />
          </marker>
          <marker id="bgp-arrow-dim" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--border-strong)" />
          </marker>
        </defs>

        {/* 主路径 */}
        <line x1={106} y1={62} x2={106} y2={94} stroke="var(--border-strong)" strokeWidth={1.4} markerEnd="url(#bgp-arrow)" />
        <line x1={106} y1={142} x2={106} y2={174} stroke="var(--border-strong)" strokeWidth={1.4} markerEnd="url(#bgp-arrow)" />
        <line x1={106} y1={222} x2={106} y2={254} stroke="var(--border-strong)" strokeWidth={1.4} markerEnd="url(#bgp-arrow)" />
        <line x1={106} y1={302} x2={106} y2={334} stroke="var(--border-strong)" strokeWidth={1.4} markerEnd="url(#bgp-arrow)" />

        {/* Connect ↔ Active */}
        <line x1={178} y1={110} x2={264} y2={110} stroke="var(--border-strong)" strokeWidth={1.4} markerEnd="url(#bgp-arrow-warn)" />
        <text x={221} y={103} textAnchor="middle" fontSize={9} fill="var(--warn)">
          TCP 失败
        </text>
        <path d="M266,130 C232,168 202,168 178,132" fill="none" stroke="var(--border-strong)" strokeWidth={1.4} markerEnd="url(#bgp-arrow)" />
        <text x={221} y={170} textAnchor="middle" fontSize={9} fill="var(--text-faint)">
          重试
        </text>

        {/* Established → Idle */}
        <path
          d="M176,359 H486 V39 H180"
          fill="none"
          stroke="var(--border)"
          strokeWidth={1.2}
          strokeDasharray="4 5"
          markerEnd="url(#bgp-arrow-dim)"
        />
        <text x={300} y={30} textAnchor="middle" fontSize={9} fill="var(--text-faint)">
          Notification / Hold Timer 超时 → 回到 Idle
        </text>

        {STATES.map((s, i) => {
          const p = POS[s];
          const on = current === s;
          const color = stateColor(s);
          return (
            <g
              key={s}
              role="button"
              tabIndex={0}
              aria-label={`跳转到 ${s} 状态`}
              aria-pressed={on}
              onClick={() => jumpToState(s)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  jumpToState(s);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={p.x}
                y={p.y}
                width={W}
                height={H}
                rx={10}
                fill={on ? 'var(--surface-3)' : 'var(--surface)'}
                stroke={on ? color : 'var(--border-strong)'}
                strokeWidth={on ? 2.2 : 1.2}
                style={{ transition: 'stroke 220ms ease, fill 220ms ease' }}
              />
              <text x={p.x + W / 2} y={p.y + 20} textAnchor="middle" fontSize={12} fontWeight={700} fill={on ? color : 'var(--text)'}>
                {s}
              </text>
              <text x={p.x + W / 2} y={p.y + 35} textAnchor="middle" fontSize={8.5} fill="var(--text-faint)">
                {p.cn}
              </text>
              <text x={p.x + 8} y={p.y + 12} fontSize={7.5} fontFamily="var(--mono)" fill="var(--text-faint)">
                {i}
              </text>
              {on ? <circle cx={p.x + W - 12} cy={p.y + 12} r={4} fill={color} /> : null}
            </g>
          );
        })}
      </svg>

      <div
        className="viz-note"
        style={{ borderLeft: `2px solid ${fault ? 'var(--danger)' : stateColor(current)}`, paddingLeft: 10, lineHeight: 1.75 }}
        aria-live="polite"
      >
        {fault ? (
          <>
            <div>
              <strong style={{ color: 'var(--danger)' }}>故障注入：{fault.label}</strong> · 邻居停留在{' '}
              <strong>{fault.state}</strong>。原因：{fault.reason}
            </div>
            <div style={{ marginTop: 3 }}>
              验证命令：
              {fault.commands.map((c) => (
                <span
                  key={c}
                  className="mono"
                  style={{ padding: '1px 6px', marginRight: 6, borderRadius: 4, background: 'var(--surface-3)' }}
                >
                  {c}
                </span>
              ))}
            </div>
          </>
        ) : (
          <>
            <div>
              <strong style={{ color: stateColor(current) }}>当前状态：{current}</strong> · {STEP_NOTE[current]}
            </div>
            <div style={{ marginTop: 3 }}>触发事件：{info.trigger}</div>
            <div style={{ marginTop: 3 }}>
              常见故障：<span style={{ color: 'var(--warn)' }}>{info.fault}</span>
            </div>
          </>
        )}
      </div>

      <VizControls
        stepper={stepperForControls}
        ariaLabel="BGP 状态机步骤控制"
        showSpeed={false}
        extra={
          <span className="hstack" style={{ gap: 4 }} role="group" aria-label="自动播放速度">
            <span className="tiny faint">速度</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                className={`btn btn-sm${speed === s ? ' btn-primary' : ''}`}
                style={{ padding: '2px 8px', fontSize: 10.5 }}
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                aria-label={`自动播放速度${SPEED_LABEL[s]}`}
              >
                {SPEED_LABEL[s]}
              </button>
            ))}
          </span>
        }
      />

      <div className="viz-legend">
        <span>
          <span className="dot" style={{ background: 'var(--ok)' }} /> 已建立
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--warn)' }} /> TCP 进行中
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--danger)' }} /> 连接失败 / 重试
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--accent-2)' }} /> 报文协商
        </span>
        <span className="tiny faint">点击状态节点可直接跳转</span>
      </div>
    </div>
  );
}
