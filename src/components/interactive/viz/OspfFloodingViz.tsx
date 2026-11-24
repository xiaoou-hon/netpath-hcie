import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useStepper } from '../useStepper';
import { VizControls } from '../VizControls';

export const meta = {
  key: 'ospf-flooding',
  title: 'OSPF LSA 洪泛与区域',
  subtitle: '类型 / 范围 / 产生者',
  order: 15,
};

type LsaType = {
  id: string;
  name: string;
  color: string;
  producer: string;
  scope: string;
  cross: string;
  detail: string;
};

const TYPES: LsaType[] = [
  {
    id: '1',
    name: 'Type-1 Router',
    color: 'var(--accent)',
    producer: '每台路由器各自产生',
    scope: '本区域（Area 内）',
    cross: '不跨区域',
    detail: 'Router LSA：描述本路由器在所属区域内的接口、链路与邻居，只在产生它的区域内洪泛。',
  },
  {
    id: '2',
    name: 'Type-2 Network',
    color: 'var(--accent-2)',
    producer: 'DR 产生',
    scope: '本区域（广播/NBMA 网段）',
    cross: '不跨区域',
    detail: 'Network LSA：由广播网段的 DR 描述该网段及接入的路由器，只在所属区域内洪泛。',
  },
  {
    id: '3',
    name: 'Type-3 Summary',
    color: 'var(--accent-3)',
    producer: 'ABR 产生',
    scope: '跨区域（注入其他区域）',
    cross: '跨区域',
    detail: 'Summary LSA：ABR 把一个区域的网段汇总后通告到其他区域，区域间路由（O IA）依赖它。',
  },
  {
    id: '5',
    name: 'Type-5 External',
    color: 'var(--warn)',
    producer: 'ASBR 产生',
    scope: '整个 OSPF 域',
    cross: '全域泛洪',
    detail: 'External LSA：描述引入的外部路由（静态、其他协议），在整个 OSPF 域泛洪（Stub/NSSA 区域除外）。',
  },
];

const RULES = 'Type-1/2 不跨区域，只在区域内洪泛；Type-3 由 ABR 产生并注入其他区域。';

const ROLES: Record<string, { role: string; desc: string }> = {
  R1: {
    role: 'DR（指定路由器）',
    desc: 'Area 0 广播网段的 DR，负责产生 Type-2 Network LSA，同时产生自己的 Type-1 Router LSA。',
  },
  R2: {
    role: 'ABR（区域边界路由器）',
    desc: '同时连接 Area 0 与 Area 1，把区域内的网段汇总为 Type-3 Summary LSA 注入其他区域。',
  },
  R3: {
    role: 'ASBR（自治系统边界路由器）',
    desc: '引入外部路由时产生 Type-5 External LSA，让它泛洪到整个 OSPF 域（Stub/NSSA 除外）。',
  },
  R4: {
    role: 'Area 1 内部路由器',
    desc: '只能收到 ABR 注入的 Type-3，以及全域名泛洪的 Type-5；看不到 Area 0 内部的 Type-1/2 细节。',
  },
};

type Step = {
  text: string;
  links: string[];
  nodes: string[];
  area: '0' | '1' | null;
  packet?: { x: number; y: number; label: string };
  blocked?: boolean;
};

const LINK_GEOM: Record<string, { x1: number; y1: number; x2: number; y2: number }> = {
  '12': { x1: 122, y1: 110, x2: 208, y2: 110 },
  '23': { x1: 272, y1: 110, x2: 333, y2: 110 },
  '24': { x1: 272, y1: 110, x2: 476, y2: 224 },
};

const NODES: Record<string, { x: number; y: number; name: string; rid: string }> = {
  R1: { x: 90, y: 110, name: 'R1', rid: '1.1.1.1' },
  R2: { x: 240, y: 110, name: 'R2', rid: '2.2.2.2' },
  R3: { x: 365, y: 110, name: 'R3', rid: '3.3.3.3' },
  R4: { x: 508, y: 224, name: 'R4', rid: '4.4.4.4' },
};

function buildSteps(id: string): Step[] {
  if (id === '1' || id === '2') {
    const generator = id === '1' ? 'R1 产生 Type-1 Router LSA' : '广播网段的 DR 产生 Type-2 Network LSA';
    return [
      {
        text: `${generator}，只在 Area 0 内洪泛：R1 → R2 → R3 的链路被高亮。`,
        links: ['12', '23'],
        nodes: ['R1', 'R2', 'R3'],
        area: '0',
        packet: { x: 165, y: 110, label: `Type-${id}` },
      },
      {
        text: `结束：Type-${id} 只在产生它的 Area 0 内有效，ABR（R2）不会把它转发进 Area 1，所以 R4 看不到。`,
        links: [],
        nodes: ['R2'],
        area: '0',
        blocked: true,
      },
    ];
  }
  if (id === '3') {
    return [
      {
        text: 'R2（ABR）把 Area 0 的网段转换为 Type-3 Summary LSA，准备注入其他区域。',
        links: [],
        nodes: ['R2'],
        area: '0',
        packet: { x: 240, y: 58, label: 'Type-3' },
      },
      {
        text: 'Type-3 由 R2 注入 Area 1，并沿 R2 → R4 链路泛洪。Type-1/2 不会跨区域，跨区域信息靠 Type-3。',
        links: ['24'],
        nodes: ['R2', 'R4'],
        area: '1',
        packet: { x: 374, y: 167, label: 'Type-3' },
      },
      {
        text: 'R4 收到 Type-3，计算出 Area 0 的域间路由（O IA），但不知道 Area 0 内部的拓扑细节。',
        links: [],
        nodes: ['R4'],
        area: '1',
      },
    ];
  }
  return [
    {
      text: 'R3（ASBR）引入外部路由，产生 Type-5 External LSA，先在 Area 0 内洪泛（R3 → R2 → R1）。',
      links: ['23', '12'],
      nodes: ['R1', 'R2', 'R3'],
      area: '0',
      packet: { x: 303, y: 110, label: 'Type-5' },
    },
    {
      text: 'R2 作为 ABR 把 Type-5 继续泛洪进 Area 1，R4 同样收到外部路由。',
      links: ['24'],
      nodes: ['R2', 'R4'],
      area: '1',
      packet: { x: 374, y: 167, label: 'Type-5' },
    },
    {
      text: '完成：Type-5 在整个 OSPF 域生效（Stub / NSSA 等特殊区域除外）。',
      links: [],
      nodes: ['R1', 'R2', 'R3', 'R4'],
      area: null,
    },
  ];
}

export default function OspfFloodingViz() {
  const [typeId, setTypeId] = useState('1');
  const [selected, setSelected] = useState<string | null>(null);
  const typeInfo = TYPES.find((t) => t.id === typeId) ?? TYPES[0];
  const steps = buildSteps(typeId);
  const stepper = useStepper(steps.length + 1, { interval: 1600 });

  const step = stepper.index;
  const current = step > 0 ? steps[step - 1] : null;
  const packet = current?.packet ?? null;

  const activeLinks = current?.links ?? [];
  const activeNodes = current?.nodes ?? [];
  const role = selected ? ROLES[selected] : null;

  const switchType = (id: string) => {
    setTypeId(id);
    stepper.reset();
    setSelected(null);
  };

  const onNodeKey = (event: KeyboardEvent<SVGGElement>, key: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelected((cur) => (cur === key ? null : key));
    }
  };

  return (
    <div>
      <div className="hstack" style={{ marginBottom: 10 }}>
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn btn-sm${typeId === t.id ? ' btn-primary' : ''}`}
            onClick={() => switchType(t.id)}
            aria-label={`查看 ${t.name} 的作用范围`}
            aria-pressed={typeId === t.id}
          >
            {t.name}
          </button>
        ))}
      </div>

      <svg
        viewBox="0 0 600 340"
        width="100%"
        style={{ minWidth: 430 }}
        role="img"
        aria-label="OSPF 区域与 LSA 洪泛拓扑"
      >
        {/* 区域 */}
        <rect
          x={20}
          y={34}
          width={390}
          height={170}
          rx={16}
          fill={current?.area === '0' ? typeInfo.color : 'transparent'}
          fillOpacity={current?.area === '0' ? 0.07 : 0}
          stroke={current?.area === '0' ? typeInfo.color : 'var(--border-strong)'}
          strokeWidth={current?.area === '0' ? 1.8 : 1.2}
          strokeDasharray="6 4"
          style={{ transition: 'stroke 240ms ease' }}
        />
        <text x={32} y={53} fontSize={10} fontWeight={700} fill="var(--text-dim)">
          Area 0 · 骨干区域
        </text>

        <rect
          x={436}
          y={140}
          width={144}
          height={168}
          rx={16}
          fill={current?.area === '1' ? typeInfo.color : 'transparent'}
          fillOpacity={current?.area === '1' ? 0.07 : 0}
          stroke={current?.area === '1' ? typeInfo.color : 'var(--border-strong)'}
          strokeWidth={current?.area === '1' ? 1.8 : 1.2}
          strokeDasharray="6 4"
          style={{ transition: 'stroke 240ms ease' }}
        />
        <text x={448} y={160} fontSize={10} fontWeight={700} fill="var(--text-dim)">
          Area 1
        </text>

        {/* 链路 */}
        {Object.entries(LINK_GEOM).map(([key, l]) => {
          const on = activeLinks.includes(key);
          return (
            <line
              key={key}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke={on ? typeInfo.color : 'var(--border-strong)'}
              strokeWidth={on ? 3 : 1.4}
              style={{ transition: 'stroke 240ms ease' }}
            />
          );
        })}

        {/* 跨区域阻断提示 */}
        {current?.blocked ? (
          <g>
            <line x1={272} y1={110} x2={476} y2={224} stroke="var(--danger)" strokeWidth={1.6} strokeDasharray="4 5" />
            <text x={386} y={158} textAnchor="middle" fontSize={9.5} fill="var(--danger)">
              Type-{typeId} 不跨区域
            </text>
          </g>
        ) : null}

        {/* 设备（可点击查看角色） */}
        {Object.entries(NODES).map(([key, n]) => {
          const on = activeNodes.includes(key);
          const picked = selected === key;
          return (
            <g
              key={key}
              role="button"
              tabIndex={0}
              aria-label={`查看 ${key} 的设备角色`}
              onClick={() => setSelected((cur) => (cur === key ? null : key))}
              onKeyDown={(event) => onNodeKey(event, key)}
              style={{ cursor: 'pointer' }}
            >
              {key === 'R2' ? (
                <text x={n.x} y={n.y - 32} textAnchor="middle" fontSize={8.5} fill="var(--accent-2)">
                  ABR
                </text>
              ) : null}
              {key === 'R3' && typeId === '5' ? (
                <text x={n.x} y={n.y - 32} textAnchor="middle" fontSize={8.5} fill="var(--warn)">
                  ASBR
                </text>
              ) : null}
              <rect
                x={n.x - 32}
                y={n.y - 22}
                width={64}
                height={44}
                rx={10}
                fill={on ? 'var(--surface-3)' : 'var(--surface)'}
                stroke={picked ? 'var(--accent-3)' : on ? typeInfo.color : 'var(--border-strong)'}
                strokeWidth={picked ? 2.6 : on ? 2.2 : 1.2}
                style={{ transition: 'stroke 240ms ease, fill 240ms ease' }}
              />
              <text x={n.x} y={n.y - 2} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text)">
                {n.name}
              </text>
              <text x={n.x} y={n.y + 13} textAnchor="middle" fontSize={8} fontFamily="var(--mono)" fill="var(--text-faint)">
                {n.rid}
              </text>
            </g>
          );
        })}

        {/* LSA 标签 */}
        {packet ? (
          <g>
            <rect
              x={packet.x - 26}
              y={packet.y - 10}
              width={52}
              height={20}
              rx={10}
              fill="var(--surface-3)"
              stroke={typeInfo.color}
              strokeWidth={1}
            />
            <text x={packet.x} y={packet.y + 4} textAnchor="middle" fontSize={9} fill={typeInfo.color}>
              {packet.label}
            </text>
          </g>
        ) : null}

        <text x={300} y={330} textAnchor="middle" fontSize={8.5} fill="var(--text-faint)">
          Type-1/2 只在区域内洪泛；Type-3 由 ABR 产生并注入其他区域
        </text>
      </svg>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginTop: 10,
          padding: '10px 12px',
          borderRadius: 10,
          border: `1px solid ${typeInfo.color}`,
          background: 'var(--surface)',
          fontSize: 11.5,
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: typeInfo.color, fontWeight: 700, minWidth: 110 }}>{typeInfo.name}</span>
        <span style={{ color: 'var(--text-dim)' }}>
          产生者：<strong style={{ color: 'var(--text)' }}>{typeInfo.producer}</strong>
        </span>
        <span style={{ color: 'var(--text-dim)' }}>
          范围：<strong style={{ color: 'var(--text)' }}>{typeInfo.scope}</strong>
        </span>
        <span style={{ color: typeInfo.cross === '不跨区域' ? 'var(--warn)' : 'var(--ok)' }}>{typeInfo.cross}</span>
        <div style={{ flexBasis: '100%', color: 'var(--text-faint)' }}>{typeInfo.detail}</div>
      </div>

      <div
        style={{
          marginTop: 8,
          padding: '8px 12px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: role ? 'var(--surface-2)' : 'var(--surface)',
          fontSize: 11.5,
          lineHeight: 1.6,
          color: 'var(--text-dim)',
        }}
      >
        {role && selected ? (
          <>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>
              {selected} · {role.role}
            </span>
            <div style={{ marginTop: 3, color: 'var(--text-faint)' }}>{role.desc}</div>
          </>
        ) : (
          '点击拓扑中的 R1 / R2 / R3 / R4，查看该设备的角色（DR / ABR / ASBR）。'
        )}
      </div>

      <div className="viz-note" style={{ borderLeft: `2px solid ${typeInfo.color}`, paddingLeft: 10 }} aria-live="polite">
        <div>
          {current ? current.text : '点击「播放」或「下一步」发送 LSA，观察它在哪些区域洪泛、由谁产生。'}
        </div>
        <div className="tiny faint" style={{ marginTop: 4 }}>
          {RULES}
        </div>
      </div>

      <VizControls
        stepper={stepper}
        extra={
          <span className="tiny faint" style={{ marginLeft: 4 }}>
            当前：{typeInfo.name}
          </span>
        }
      />

      <div className="viz-legend">
        <span>
          <span className="dot" style={{ background: 'var(--accent)' }} /> 区域内泛洪
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--accent-3)' }} /> 跨区域 Summary
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--warn)' }} /> 外部路由
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--danger)' }} /> 不跨越区域边界
        </span>
      </div>
    </div>
  );
}
