import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useStepper } from '../useStepper';
import { VizControls } from '../VizControls';

export const meta = {
  key: 'bgp-bestpath',
  title: 'BGP 选路决策',
  subtitle: '逐项比较 · 可改属性',
  order: 17,
};

type Origin = 'IGP' | 'EGP' | 'Incomplete';
type Peer = 'EBGP' | 'IBGP';

type Route = {
  id: string;
  name: string;
  nextHop: string;
  localPref: number;
  localOrigin: boolean;
  asPathLen: number;
  origin: Origin;
  med: number;
  peer: Peer;
  igpMetric: number;
};

const ORIGIN_RANK: Record<Origin, number> = { IGP: 0, EGP: 1, Incomplete: 2 };

const ORIGINS: Origin[] = ['IGP', 'EGP', 'Incomplete'];
const PEERS: Peer[] = ['EBGP', 'IBGP'];

const DEFAULT_ROUTES: Route[] = [
  {
    id: 'A',
    name: '路由 A',
    nextHop: '10.1.1.1',
    localPref: 100,
    localOrigin: false,
    asPathLen: 2,
    origin: 'IGP',
    med: 50,
    peer: 'EBGP',
    igpMetric: 10,
  },
  {
    id: 'B',
    name: '路由 B',
    nextHop: '10.2.2.2',
    localPref: 100,
    localOrigin: false,
    asPathLen: 4,
    origin: 'Incomplete',
    med: 50,
    peer: 'EBGP',
    igpMetric: 5,
  },
  {
    id: 'C',
    name: '路由 C',
    nextHop: '10.3.3.3',
    localPref: 100,
    localOrigin: false,
    asPathLen: 2,
    origin: 'IGP',
    med: 50,
    peer: 'IBGP',
    igpMetric: 5,
  },
];

type Criterion = {
  label: string;
  value: (r: Route) => number;
  format: (r: Route) => string;
  mode: 'max' | 'min';
  hint: string;
  mnemonic: string;
};

const CRITERIA: Criterion[] = [
  {
    label: '最高 LocalPref',
    value: (r) => r.localPref,
    format: (r) => `LP ${r.localPref}`,
    mode: 'max',
    hint: '越大越优（Cisco 默认 100，只在本 AS 内传递）',
    mnemonic: '先看 LocalPref，值大者优',
  },
  {
    label: '本地始发优先',
    value: (r) => (r.localOrigin ? 1 : 0),
    format: (r) => (r.localOrigin ? '本地始发' : '非本地'),
    mode: 'max',
    hint: 'network 命令或 redistribute 产生的本地路由优先',
    mnemonic: '本地始发优先于学来的路由',
  },
  {
    label: '最短 AS_Path',
    value: (r) => r.asPathLen,
    format: (r) => `AS 长度 ${r.asPathLen}`,
    mode: 'min',
    hint: '经过的 AS 越少越优',
    mnemonic: 'AS 路径短者优',
  },
  {
    label: '最低 Origin',
    value: (r) => ORIGIN_RANK[r.origin],
    format: (r) => r.origin,
    mode: 'min',
    hint: 'IGP < EGP < Incomplete',
    mnemonic: 'Origin 低者优（IGP < EGP < Incomplete）',
  },
  {
    label: '最低 MED',
    value: (r) => r.med,
    format: (r) => `MED ${r.med}`,
    mode: 'min',
    hint: '越小越优，默认只在同一邻居 AS 之间比较',
    mnemonic: 'MED 小者优，且默认只比同一邻居 AS',
  },
  {
    label: 'EBGP 优于 IBGP',
    value: (r) => (r.peer === 'EBGP' ? 0 : 1),
    format: (r) => r.peer,
    mode: 'min',
    hint: '同等条件下优先选择 EBGP 邻居',
    mnemonic: 'EBGP 优于 IBGP',
  },
  {
    label: '最低 IGP 度量',
    value: (r) => r.igpMetric,
    format: (r) => `IGP ${r.igpMetric}`,
    mode: 'min',
    hint: '到下一跳的 IGP 开销越小越优',
    mnemonic: 'IGP 度量小者优，最后才比 Router ID',
  },
];

const FULL_MNEMONIC = 'LocalPref 大 → 本地始发 → AS 短 → Origin 低 → MED 小 → EBGP 先 → IGP 近';

type Round = { label: string; text: string; alive: string[] };

function computeRounds(routes: Route[]): Round[] {
  const rounds: Round[] = [
    {
      label: '候选路由',
      text: `共 ${routes.length} 条候选路由，按标准顺序逐项比较，胜者进入下一轮。`,
      alive: routes.map((r) => r.id),
    },
  ];
  let alive = routes.map((r) => r.id);
  for (const c of CRITERIA) {
    const cands = routes.filter((r) => alive.includes(r.id));
    if (alive.length <= 1) {
      rounds.push({
        label: c.label,
        text: '已唯一，无需继续比较。',
        alive,
      });
      continue;
    }
    const values = cands.map((r) => c.value(r));
    const best = c.mode === 'max' ? Math.max(...values) : Math.min(...values);
    const winners = cands.filter((r) => c.value(r) === best).map((r) => r.id);
    const detail = cands.map((r) => `${r.name}（${c.format(r)}）`).join('、');
    let text: string;
    if (winners.length === cands.length) {
      text = `${c.label}：${detail} → 全部相同，继续下一项。`;
    } else if (winners.length === 1) {
      const w = routes.find((r) => r.id === winners[0]);
      text = `${c.label}：${detail} → ${w ? w.name : winners[0]} 胜出，其余淘汰。`;
    } else {
      const names = winners.map((id) => routes.find((r) => r.id === id)?.name ?? id).join('、');
      text = `${c.label}：${detail} → ${names} 并列最优，继续下一项。`;
    }
    alive = winners;
    rounds.push({ label: c.label, text, alive });
  }
  return rounds;
}

function nextNumber(list: number[], value: number): number {
  const i = list.indexOf(value);
  return list[(i + 1) % list.length];
}

function nextOrigin(value: Origin): Origin {
  return ORIGINS[(ORIGINS.indexOf(value) + 1) % ORIGINS.length];
}

function nextPeer(value: Peer): Peer {
  return value === 'EBGP' ? 'IBGP' : 'EBGP';
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function randomRoute(route: Route): Route {
  return {
    ...route,
    localPref: pick([100, 150, 200]),
    localOrigin: Math.random() < 0.15,
    asPathLen: pick([0, 1, 2, 3, 4, 5]),
    origin: pick(ORIGINS),
    med: pick([0, 50, 100, 200]),
    peer: pick(PEERS),
    igpMetric: pick([5, 10, 20, 30]),
  };
}

const chipStyle: CSSProperties = {
  padding: '3px 8px',
  fontSize: 10.5,
  fontWeight: 500,
  borderRadius: 6,
  fontFamily: 'var(--mono)',
};

export default function BgpBestPathViz() {
  const [routes, setRoutes] = useState<Route[]>(DEFAULT_ROUTES);
  const rounds = computeRounds(routes);
  const stepper = useStepper(rounds.length);

  const step = stepper.index;
  const lastStep = rounds.length - 1;
  const current = rounds[step];
  const aliveNow = current.alive;
  const winnerId = rounds[lastStep].alive.length === 1 ? rounds[lastStep].alive[0] : null;
  const winner = winnerId ? routes.find((r) => r.id === winnerId) ?? null : null;
  const decidedIndex = rounds.findIndex((r, i) => i > 0 && r.alive.length === 1);
  const decidedCriterion = decidedIndex > 0 ? CRITERIA[decidedIndex - 1] : null;

  const update = (id: string, patch: Partial<Route>) => {
    setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    stepper.reset();
  };

  const resetAll = () => {
    setRoutes(DEFAULT_ROUTES);
    stepper.reset();
  };

  const randomize = () => {
    setRoutes(DEFAULT_ROUTES.map(randomRoute));
    stepper.reset();
  };

  return (
    <div>
      <div className="hstack" style={{ gap: 6, marginBottom: 8 }}>
        <button type="button" className="btn btn-sm btn-primary" onClick={randomize} aria-label="随机生成三条候选路由的属性">
          随机生成
        </button>
        <span className="tiny faint">
          点击属性按钮可手动切换；比较顺序：LocalPref → 本地始发 → AS_Path → Origin → MED → EBGP/IBGP → IGP 度量
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 8 }}>
        {routes.map((r) => {
          const alive = aliveNow.includes(r.id);
          const isWinner = stepper.isLast && winner?.id === r.id;
          return (
            <div
              key={r.id}
              style={{
                padding: '9px 10px',
                borderRadius: 10,
                border: `1px solid ${isWinner ? 'var(--ok)' : alive ? 'var(--accent-2)' : 'var(--border)'}`,
                background: isWinner ? 'var(--ok-soft)' : 'var(--surface)',
                opacity: alive ? 1 : 0.5,
                transition: 'border-color 220ms ease, opacity 220ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: isWinner ? 'var(--ok)' : 'var(--text)' }}>
                  {r.name}
                </span>
                <span className="tiny faint mono" style={{ marginLeft: 'auto' }}>
                  {r.nextHop}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 7 }}>
                <button
                  type="button"
                  className="btn"
                  style={chipStyle}
                  onClick={() => update(r.id, { localPref: nextNumber([50, 100, 150, 200], r.localPref) })}
                  aria-label={`${r.name} LocalPref 当前 ${r.localPref}，点击切换`}
                >
                  LP {r.localPref}
                </button>
                <button
                  type="button"
                  className="btn"
                  style={chipStyle}
                  onClick={() => update(r.id, { localOrigin: !r.localOrigin })}
                  aria-label={`${r.name} 是否本地始发，点击切换`}
                >
                  {r.localOrigin ? '本地始发' : '非本地'}
                </button>
                <button
                  type="button"
                  className="btn"
                  style={chipStyle}
                  onClick={() => update(r.id, { asPathLen: nextNumber([0, 1, 2, 3, 4, 5], r.asPathLen) })}
                  aria-label={`${r.name} AS_Path 长度 ${r.asPathLen}，点击切换`}
                >
                  AS {r.asPathLen}
                </button>
                <button
                  type="button"
                  className="btn"
                  style={chipStyle}
                  onClick={() => update(r.id, { origin: nextOrigin(r.origin) })}
                  aria-label={`${r.name} Origin ${r.origin}，点击切换`}
                >
                  {r.origin}
                </button>
                <button
                  type="button"
                  className="btn"
                  style={chipStyle}
                  onClick={() => update(r.id, { med: nextNumber([0, 50, 100, 200], r.med) })}
                  aria-label={`${r.name} MED ${r.med}，点击切换`}
                >
                  MED {r.med}
                </button>
                <button
                  type="button"
                  className="btn"
                  style={chipStyle}
                  onClick={() => update(r.id, { peer: nextPeer(r.peer) })}
                  aria-label={`${r.name} 邻居类型 ${r.peer}，点击切换`}
                >
                  {r.peer}
                </button>
                <button
                  type="button"
                  className="btn"
                  style={chipStyle}
                  onClick={() => update(r.id, { igpMetric: nextNumber([5, 10, 20, 30], r.igpMetric) })}
                  aria-label={`${r.name} IGP 度量 ${r.igpMetric}，点击切换`}
                >
                  IGP {r.igpMetric}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rounds.map((round, i) => {
          const isCurrent = i === step;
          const passed = i < step;
          const criterion = i > 0 ? CRITERIA[i - 1] : null;
          return (
            <button
              key={`${round.label}-${i}`}
              type="button"
              onClick={() => stepper.goTo(i)}
              aria-pressed={isCurrent}
              aria-label={`跳到第 ${i} 轮：${round.label}`}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                padding: '5px 8px',
                borderRadius: 7,
                background: isCurrent ? 'var(--accent-soft)' : 'transparent',
                border: 'none',
                borderLeft: `2px solid ${isCurrent ? 'var(--accent)' : 'transparent'}`,
                opacity: passed ? 0.62 : 1,
                transition: 'background 200ms ease',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                color: 'inherit',
                font: 'inherit',
              }}
            >
              <span
                className="mono tiny"
                style={{
                  width: 16,
                  flex: 'none',
                  color: isCurrent ? 'var(--accent)' : 'var(--text-faint)',
                  paddingTop: 1,
                }}
              >
                {i}
              </span>
              <span style={{ minWidth: 0, display: 'block' }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 11.5,
                    fontWeight: isCurrent ? 650 : 550,
                    color: isCurrent ? 'var(--text)' : 'var(--text-dim)',
                  }}
                >
                  {round.label}
                  {criterion ? ` · ${criterion.hint}` : '（初始）'}
                </span>
                <span className="tiny" style={{ display: 'block', color: 'var(--text-faint)', lineHeight: 1.6, marginTop: 1 }}>
                  {i <= step ? round.text : '待比较…'}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {stepper.isLast ? (
        <div
          style={{
            marginTop: 10,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--ok)',
            background: 'var(--ok-soft)',
            fontSize: 12.5,
            lineHeight: 1.7,
          }}
        >
          <div>
            <strong style={{ color: 'var(--ok)' }}>最优路由：</strong>
            {winner
              ? `${winner.name}（下一跳 ${winner.nextHop}）`
              : `多条完全等价，按 Router ID 最大者打破平局（示例取 ${routes[0].name}）`}
          </div>
          <div style={{ marginTop: 4, color: 'var(--text-dim)' }}>
            {winner && decidedCriterion
              ? `决胜步骤：第 ${decidedIndex} 轮「${rounds[decidedIndex].label}」—— ${rounds[decidedIndex].text}`
              : '所有属性完全相同，未能在标准属性上决出胜负，只能依靠 Router ID 等最后手段。'}
          </div>
          <div style={{ marginTop: 4 }} className="tiny">
            选路口诀：{decidedCriterion ? decidedCriterion.mnemonic : '全部等价 → 比 Router ID 大者'}；完整顺序：{FULL_MNEMONIC}
          </div>
        </div>
      ) : null}

      <div className="viz-note" style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 10 }} aria-live="polite">
        {current.text}
      </div>

      <VizControls
        stepper={{ ...stepper, reset: resetAll }}
        ariaLabel="BGP 选路比较步骤控制"
        extra={
          <span className="tiny faint">
            第 {step} 轮 / {lastStep} · {current.label}
          </span>
        }
      />
    </div>
  );
}
