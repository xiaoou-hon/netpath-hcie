import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useStepper } from '../useStepper';
import type { Stepper } from '../useStepper';
import { VizControls } from '../VizControls';

export const meta = {
  key: 'ospf-fsm',
  title: 'OSPF 邻居状态机',
  subtitle: '7 状态 · 单步推进',
  order: 14,
};

const STATES = [
  { name: 'Down', cn: '未收到 Hello' },
  { name: 'Init', cn: '收到 Hello' },
  { name: '2-Way', cn: '双向确认' },
  { name: 'ExStart', cn: '主从协商' },
  { name: 'Exchange', cn: '交换 DD' },
  { name: 'Loading', cn: '请求 LSA' },
  { name: 'Full', cn: '完全邻接' },
];

const STATE_DESC = [
  'Down：还没有收到对端的 Hello 报文，邻居关系尚未开始。',
  'Init：已收到对端 Hello，但对方的 Hello 里还没有我，只证明「我能听到你」。',
  '2-Way：双方 Hello 中都出现了彼此的 Router ID，双向可达；广播网络中非 DR/BDR 之间会停在这里。',
  'ExStart：开始主从协商，用 DD 报文确定谁的 Router ID 更大、由谁主导 DD 序号。',
  'Exchange：互相发送 DD 摘要（LSA 头部列表），了解对方有哪些 LSA。',
  'Loading：对比 DD 摘要，发现自己缺少的 LSA，用 LSR 请求、LSU 接收完整内容。',
  'Full：双方 LSDB 完全同步，邻接关系建立，可以参与 SPF 计算。',
];

const EVENTS = [
  {
    label: '收到 Hello',
    desc: '事件：收到对端 Hello（Down → Init）。此时只知道对方存在，还不能确认对方能收到我的 Hello。',
  },
  {
    label: '双向通信建立',
    desc: '事件：双方 Hello 中都列出了彼此的 Router ID（Init → 2-Way），双向可达确认。',
  },
  {
    label: '选举 DR/BDR',
    desc: '事件：广播网络中完成 DR/BDR 选举（2-Way → ExStart）。只有 DR/BDR 与其余路由器进入后续状态，DROther 之间保持 2-Way。',
  },
  {
    label: '交换 DD',
    desc: '事件：主从协商完成并交换 DD 摘要（ExStart → Exchange），双方都知道对方 LSDB 里有哪些 LSA。',
  },
  {
    label: '请求 LSR',
    desc: '事件：根据 DD 摘要发送 LSR 请求缺失的 LSA（Exchange → Loading）。',
  },
  {
    label: '收到 LSU',
    desc: '事件：收到 LSU 并把完整 LSA 写入 LSDB（Loading → Full），邻居达到完全邻接。',
  },
];

const ANOMALY: Record<
  'twoway' | 'exstart',
  { title: string; state: number; reason: string; commands: string[] }
> = {
  twoway: {
    title: '异常：邻居卡在 2-Way',
    state: 2,
    reason:
      '广播型网络中，两台非 DR/BDR 的路由器之间只建立 2-Way 邻接，这是正常的；如果本应进入 Full 却没有，检查接口 OSPF 优先级（为 0 表示不参与选举）、DR/BDR 是否被抢占，以及是否误把网络类型当作点对点。',
    commands: [
      'display ospf peer',
      'display ospf interface GigabitEthernet0/0/0',
      'display ospf brief',
    ],
  },
  exstart: {
    title: '异常：邻居卡在 ExStart',
    state: 3,
    reason:
      '主从协商无法完成，最常见原因是两端接口 MTU 不一致（DD 报文大小不同），其次是 Router ID 冲突、单播不可达或被 ACL 拦截；确认两端 MTU、网络类型一致，并检查是否有 ACL 丢弃 OSPF 报文。',
    commands: [
      'display ospf interface GigabitEthernet0/0/0',
      'display ospf peer',
      'display ospf error',
    ],
  },
};

export default function OspfFsmViz() {
  const stepper = useStepper(STATES.length, { interval: 1500 });
  const [anomaly, setAnomaly] = useState<'twoway' | 'exstart' | null>(null);
  const step = stepper.index;

  // 用户主动导航时清除异常提示
  const nav: Stepper = {
    ...stepper,
    next: () => {
      setAnomaly(null);
      stepper.next();
    },
    prev: () => {
      setAnomaly(null);
      stepper.prev();
    },
    reset: () => {
      setAnomaly(null);
      stepper.reset();
    },
    toggle: () => {
      setAnomaly(null);
      stepper.toggle();
    },
    goTo: (index: number) => {
      setAnomaly(null);
      stepper.goTo(index);
    },
  };

  const inject = (kind: 'twoway' | 'exstart') => {
    setAnomaly(kind);
    stepper.goTo(ANOMALY[kind].state);
  };

  const onNodeKey = (event: KeyboardEvent<SVGGElement>, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      nav.goTo(index);
    }
  };

  const note = anomaly ? (
    <div>
      <div style={{ fontWeight: 700, color: 'var(--warn)' }}>{ANOMALY[anomaly].title}</div>
      <div style={{ marginTop: 4 }}>{ANOMALY[anomaly].reason}</div>
      <div style={{ marginTop: 6, color: 'var(--text-faint)' }}>排查命令：</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
        {ANOMALY[anomaly].commands.map((cmd) => (
          <code
            key={cmd}
            className="mono tiny"
            style={{ padding: '2px 7px', borderRadius: 4, background: 'var(--surface-3)', color: 'var(--warn)' }}
          >
            {cmd}
          </code>
        ))}
      </div>
    </div>
  ) : step === 0 ? (
    STATE_DESC[0]
  ) : (
    `${EVENTS[step - 1].desc} 当前状态 → ${STATE_DESC[step]}`
  );

  return (
    <div>
      <svg
        viewBox="0 0 600 210"
        width="100%"
        style={{ minWidth: 440 }}
        role="img"
        aria-label="OSPF 邻居状态机七个状态"
      >
        <defs>
          <marker id="ospf-fsm-arrow" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto">
            <path d="M0,0 L5,2.5 L0,5 Z" fill="var(--accent)" />
          </marker>
        </defs>

        {STATES.map((st, i) => {
          const left = 12 + i * 84;
          const cx = left + 36;
          const isCurrent = i === step;
          const done = i < step;
          const stroke = isCurrent ? 'var(--accent)' : done ? 'var(--accent-2)' : 'var(--border-strong)';
          const fill = isCurrent ? 'var(--accent)' : done ? 'var(--accent-soft)' : 'var(--surface)';
          return (
            <g
              key={st.name}
              role="button"
              tabIndex={0}
              aria-label={`跳转到 ${st.name} 状态`}
              onClick={() => nav.goTo(i)}
              onKeyDown={(event) => onNodeKey(event, i)}
              style={{ cursor: 'pointer' }}
            >
              {i > 0 ? (
                <line
                  x1={12 + (i - 1) * 84 + 72}
                  y1={103}
                  x2={left - 3}
                  y2={103}
                  stroke={done || isCurrent ? 'var(--accent)' : 'var(--border)'}
                  strokeWidth={done || isCurrent ? 2 : 1.2}
                  markerEnd={done || isCurrent ? 'url(#ospf-fsm-arrow)' : undefined}
                  style={{ transition: 'stroke 220ms ease' }}
                />
              ) : null}
              <rect
                x={left}
                y={76}
                width={72}
                height={54}
                rx={10}
                fill={fill}
                stroke={stroke}
                strokeWidth={isCurrent ? 2 : 1.2}
                style={{ transition: 'fill 220ms ease, stroke 220ms ease' }}
              />
              <text
                x={cx}
                y={98}
                textAnchor="middle"
                fontSize={10.5}
                fontWeight={700}
                fill={isCurrent ? '#241604' : done ? 'var(--accent-2)' : 'var(--text)'}
              >
                {st.name}
              </text>
              <text
                x={cx}
                y={116}
                textAnchor="middle"
                fontSize={8}
                fill={isCurrent ? '#241604' : 'var(--text-faint)'}
              >
                {st.cn}
              </text>
              <text x={cx} y={66} textAnchor="middle" fontSize={8.5} fontFamily="var(--mono)" fill="var(--text-faint)">
                {i}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        className="viz-note"
        style={{
          borderLeft: `2px solid ${anomaly ? 'var(--warn)' : 'var(--accent)'}`,
          paddingLeft: 10,
          color: anomaly ? 'var(--warn)' : 'var(--text-dim)',
        }}
        aria-live="polite"
      >
        {note}
      </div>

      <VizControls
        stepper={nav}
        extra={
          <span className="tiny faint" style={{ marginLeft: 4 }}>
            事件：{step > 0 ? EVENTS[step - 1].label : '等待 Hello'}
          </span>
        }
      />

      <div className="viz-controls" style={{ marginTop: 8 }}>
        <button
          type="button"
          className="btn btn-sm btn-danger"
          onClick={() => inject('twoway')}
          aria-label="演示异常：邻居卡在 2-Way"
          aria-pressed={anomaly === 'twoway'}
        >
          异常：卡在 2-Way
        </button>
        <button
          type="button"
          className="btn btn-sm btn-danger"
          onClick={() => inject('exstart')}
          aria-label="演示异常：邻居卡在 ExStart"
          aria-pressed={anomaly === 'exstart'}
        >
          异常：卡在 ExStart
        </button>
      </div>

      <div className="viz-legend">
        <span>
          <span className="dot" style={{ background: 'var(--accent)' }} /> 当前状态
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--accent-2)' }} /> 已通过
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--border-strong)' }} /> 尚未到达
        </span>
      </div>
    </div>
  );
}
