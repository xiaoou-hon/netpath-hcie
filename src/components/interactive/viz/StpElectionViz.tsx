import { useState } from 'react';
import { useStepper } from '../useStepper';
import { VizControls } from '../VizControls';

export const meta = {
  key: 'stp-election',
  title: 'STP 根桥选举与端口角色',
  subtitle: '可改优先级重新推演',
  order: 18,
};

type SwId = 's1' | 's2' | 's3';
type PortRole = 'root' | 'designated' | 'blocked';

type SwitchInfo = { id: SwId; name: string; mac: string; x: number; y: number };

const SWITCHES: SwitchInfo[] = [
  { id: 's1', name: 'SW1', mac: '00:00:00:00:00:01', x: 260, y: 80 },
  { id: 's2', name: 'SW2', mac: '00:00:00:00:00:02', x: 110, y: 300 },
  { id: 's3', name: 'SW3', mac: '00:00:00:00:00:03', x: 410, y: 300 },
];

const LINKS: { a: SwId; b: SwId }[] = [
  { a: 's1', b: 's2' },
  { a: 's1', b: 's3' },
  { a: 's2', b: 's3' },
];

const BROKEN_LINK: { a: SwId; b: SwId } = { a: 's1', b: 's3' };

const PRIORITY_OPTIONS = [4096, 8192, 32768];

const DEFAULT_PRIORITY: Record<SwId, number> = { s1: 32768, s2: 32768, s3: 32768 };

const BOX_W = 120;
const BOX_H = 56;

function swName(id: SwId): string {
  return SWITCHES.find((s) => s.id === id)?.name ?? id;
}

function sameLink(l: { a: SwId; b: SwId }, target: { a: SwId; b: SwId }): boolean {
  return (l.a === target.a && l.b === target.b) || (l.a === target.b && l.b === target.a);
}

function compareBridge(a: SwId, b: SwId, priority: Record<SwId, number>): number {
  const pa = priority[a];
  const pb = priority[b];
  if (pa !== pb) return pa - pb;
  const ma = SWITCHES.find((s) => s.id === a)?.mac ?? '';
  const mb = SWITCHES.find((s) => s.id === b)?.mac ?? '';
  return ma.localeCompare(mb);
}

function computeRoles(priority: Record<SwId, number>): {
  root: SwId;
  roles: Record<string, PortRole>;
} {
  const root = SWITCHES.reduce<SwId>((best, s) => (compareBridge(s.id, best, priority) < 0 ? s.id : best), 's1');
  const roles: Record<string, PortRole> = {};

  LINKS.forEach((l) => {
    const costA = l.a === root ? 0 : 19;
    const costB = l.b === root ? 0 : 19;
    let winner: SwId;
    if (costA !== costB) winner = costA < costB ? l.a : l.b;
    else winner = compareBridge(l.a, l.b, priority) < 0 ? l.a : l.b;
    const loser = winner === l.a ? l.b : l.a;
    roles[`${winner}>${loser}`] = 'designated';

    const loserRootLink = LINKS.find(
      (x) => (x.a === loser && x.b === root) || (x.b === loser && x.a === root),
    );
    roles[`${loser}>${winner}`] = loserRootLink === l ? 'root' : 'blocked';
  });

  return { root, roles };
}

function roleColor(role: PortRole): string {
  if (role === 'root') return 'var(--accent)';
  if (role === 'designated') return 'var(--accent-2)';
  return 'var(--danger)';
}

function roleChar(role: PortRole): string {
  if (role === 'root') return '根';
  if (role === 'designated') return '指';
  return '阻';
}

/** 第 0 步选根桥，第 1 步根端口，第 2 步指定端口，第 3 步阻塞端口 */
function roleVisible(role: PortRole, step: number): boolean {
  if (role === 'root') return step >= 1;
  if (role === 'designated') return step >= 2;
  return step >= 3;
}

export default function StpElectionViz() {
  const [priority, setPriority] = useState<Record<SwId, number>>(DEFAULT_PRIORITY);
  const [broken, setBroken] = useState(false);
  const stepper = useStepper(4);
  const step = stepper.index;

  const { root, roles } = computeRoles(priority);
  const rootSw = SWITCHES.find((s) => s.id === root) ?? SWITCHES[0];
  const nonRootNames = SWITCHES.filter((s) => s.id !== root)
    .map((s) => s.name)
    .join('、');

  const blockedDesc = LINKS.flatMap((l) => {
    const list: string[] = [];
    if (roles[`${l.a}>${l.b}`] === 'blocked') list.push(`${swName(l.a)} 上连 ${swName(l.b)} 的端口`);
    if (roles[`${l.b}>${l.a}`] === 'blocked') list.push(`${swName(l.b)} 上连 ${swName(l.a)} 的端口`);
    return list;
  });

  const notes = [
    `比较桥 ID：三台交换机优先级 ${priority.s1}/${priority.s2}/${priority.s3}，桥 ID = 优先级 + MAC，先比优先级再比 MAC，最小者当选根桥 → ${rootSw.name}（${priority[root]}.${rootSw.mac}）。`,
    `选根端口：每台非根交换机选出「到根桥路径开销最小」的端口。${nonRootNames} 都直连 ${rootSw.name}（开销 19），根端口都指向 ${rootSw.name}。`,
    '选指定端口：每条链路比较两端到根桥的路径开销，小者胜；若相同则比较桥 ID。每条链路恰好有一个指定端口，根桥一侧通常都是指定端口。',
    `阻塞剩余端口：${blockedDesc.join('、') || '无'} 被阻塞（Alternate），用来打破二层环路。最终角色 = 根端口 / 指定端口 / 阻塞端口。`,
  ];

  const resetAll = () => {
    stepper.reset();
    setPriority(DEFAULT_PRIORITY);
    setBroken(false);
  };

  return (
    <div>
      <svg
        viewBox="0 0 520 420"
        width="100%"
        style={{ minWidth: 400 }}
        role="img"
        aria-label="STP 三交换机三角拓扑与端口角色"
      >
        {/* 链路半段着色 */}
        {LINKS.map((l) => {
          const a = SWITCHES.find((s) => s.id === l.a) ?? SWITCHES[0];
          const b = SWITCHES.find((s) => s.id === l.b) ?? SWITCHES[0];
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          const linkBroken = broken && sameLink(l, BROKEN_LINK);
          const sides = [
            { sw: l.a, other: l.b, x: a.x, y: a.y },
            { sw: l.b, other: l.a, x: b.x, y: b.y },
          ];
          return (
            <g key={`${l.a}-${l.b}`}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={linkBroken ? 'var(--danger)' : 'var(--border-strong)'}
                strokeWidth={1.5}
                strokeDasharray={linkBroken ? '5 5' : undefined}
                style={{ transition: 'stroke 240ms ease' }}
              />
              {linkBroken ? (
                <g>
                  <line x1={midX - 7} y1={midY - 7} x2={midX + 7} y2={midY + 7} stroke="var(--danger)" strokeWidth={2.2} />
                  <line x1={midX + 7} y1={midY - 7} x2={midX - 7} y2={midY + 7} stroke="var(--danger)" strokeWidth={2.2} />
                  <text x={midX + 12} y={midY - 10} fontSize={8.5} fill="var(--danger)">
                    链路断开
                  </text>
                </g>
              ) : null}
              {sides.map((side) => {
                const role = roles[`${side.sw}>${side.other}`];
                const show = !linkBroken && role ? roleVisible(role, step) : false;
                const cx = side.x + (midX - side.x) * 0.62;
                const cy = side.y + (midY - side.y) * 0.62;
                return (
                  <g key={`${side.sw}-${side.other}`}>
                    <line
                      x1={side.x}
                      y1={side.y}
                      x2={midX}
                      y2={midY}
                      stroke={show ? roleColor(role) : 'var(--border)'}
                      strokeWidth={show ? 3.2 : 1.2}
                      opacity={linkBroken ? 0.25 : 1}
                      style={{ transition: 'stroke 240ms ease' }}
                    />
                    {show ? (
                      <g>
                        <circle cx={cx} cy={cy} r={7} fill={roleColor(role)} stroke="var(--surface)" strokeWidth={1.5} />
                        <text
                          x={cx}
                          y={cy + 3}
                          textAnchor="middle"
                          fontSize={7.5}
                          fontWeight={700}
                          fill="#241604"
                        >
                          {roleChar(role)}
                        </text>
                      </g>
                    ) : null}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* 交换机 */}
        {SWITCHES.map((s) => {
          const isRoot = s.id === root;
          return (
            <g key={s.id}>
              {isRoot ? (
                <text x={s.x} y={s.y - BOX_H / 2 - 10} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="var(--accent-3)">
                  根桥
                </text>
              ) : null}
              <rect
                x={s.x - BOX_W / 2}
                y={s.y - BOX_H / 2}
                width={BOX_W}
                height={BOX_H}
                rx={11}
                fill={isRoot ? 'rgba(192, 132, 252, 0.12)' : 'var(--surface)'}
                stroke={isRoot ? 'var(--accent-3)' : 'var(--border-strong)'}
                strokeWidth={isRoot ? 2.4 : 1.3}
                style={{ transition: 'stroke 240ms ease' }}
              />
              <text x={s.x} y={s.y - 4} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--text)">
                {s.name}
              </text>
              <text
                x={s.x}
                y={s.y + 12}
                textAnchor="middle"
                fontSize={7.5}
                fontFamily="var(--mono)"
                fill={isRoot ? 'var(--accent-3)' : 'var(--text-faint)'}
              >
                {priority[s.id]}.{s.mac.slice(9)}
              </text>
            </g>
          );
        })}

        <text x={260} y={412} textAnchor="middle" fontSize={8.5} fill="var(--text-faint)">
          链路开销均为 19（100M）；圆点颜色表示该端口的角色
        </text>
      </svg>

      <div className="hstack" style={{ marginTop: 10, alignItems: 'flex-start' }}>
        {SWITCHES.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="tiny" style={{ color: s.id === root ? 'var(--accent-3)' : 'var(--text-dim)' }}>
              {s.name}
            </span>
            {PRIORITY_OPTIONS.map((p) => (
              <button
                key={p}
                type="button"
                className={`btn btn-sm${priority[s.id] === p ? ' btn-primary' : ''}`}
                style={{ padding: '3px 8px', fontSize: 10.5 }}
                onClick={() => {
                  setPriority((prev) => ({ ...prev, [s.id]: p }));
                  stepper.reset();
                }}
                aria-label={`设置 ${s.name} 优先级为 ${p}`}
                aria-pressed={priority[s.id] === p}
              >
                {p}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="viz-note" style={{ borderLeft: '2px solid var(--accent-3)', paddingLeft: 10 }} aria-live="polite">
        <div>{notes[step]}</div>
        {broken ? (
          <div style={{ marginTop: 4, color: 'var(--warn)' }}>
            拓扑变化：SW1–SW3 链路断开后，SW3 的根端口失效，重新收敛为经 SW2 的路径（开销 19 + 19 = 38），SW2 上连 SW3
            的端口转为指定端口；原先被阻塞的端口不再阻塞。收敛期间会出现短暂中断，之后网络恢复为无环的单路径。
          </div>
        ) : null}
      </div>

      <VizControls
        stepper={{ ...stepper, reset: resetAll }}
        ariaLabel="STP 选举步骤控制"
        extra={
          <button
            type="button"
            className={`btn btn-sm${broken ? ' btn-danger' : ''}`}
            onClick={() => setBroken((v) => !v)}
            aria-pressed={broken}
            aria-label={broken ? '恢复 SW1 与 SW3 之间的链路' : '断开 SW1 与 SW3 之间的链路'}
          >
            {broken ? '恢复 SW1–SW3' : '断开 SW1–SW3'}
          </button>
        }
      />

      <div className="viz-legend">
        <span>
          <span className="dot" style={{ background: 'var(--accent-3)' }} /> 根桥
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--accent)' }} /> 根端口（Root Port）
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--accent-2)' }} /> 指定端口（Designated）
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--danger)' }} /> 阻塞端口（Alternate）
        </span>
      </div>
    </div>
  );
}
