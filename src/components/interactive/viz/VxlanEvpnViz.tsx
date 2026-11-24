import { useState } from 'react';
import { useStepper } from '../useStepper';
import { VizControls } from '../VizControls';

export const meta = {
  key: 'vxlan-evpn',
  title: 'VXLAN/EVPN 报文与转发',
  subtitle: '同 VTEP 与跨 VTEP 对比',
  order: 24,
};

type Mode = 'same' | 'cross';
type VtepId = 'leaf1' | 'leaf2' | 'leaf3';

type Vtep = {
  id: VtepId;
  name: string;
  ip: string;
  x: number;
  y: number;
};

type Host = {
  id: string;
  name: string;
  ip: string;
  x: number;
  y: number;
  leaf: VtepId;
};

type Stage = {
  title: string;
  desc: string;
  path?: string;
  dot?: { x: number; y: number };
};

const LEAF_W = 108;
const LEAF_H = 44;

const VTEP_LIST: Vtep[] = [
  { id: 'leaf1', name: 'Leaf1', ip: '10.0.0.1', x: 110, y: 170 },
  { id: 'leaf2', name: 'Leaf2', ip: '10.0.0.2', x: 300, y: 170 },
  { id: 'leaf3', name: 'Leaf3', ip: '10.0.0.3', x: 470, y: 170 },
];

const HOSTS: Host[] = [
  { id: 'a', name: '主机 A', ip: '10.0.1.10', x: 70, y: 290, leaf: 'leaf1' },
  { id: 'c', name: '主机 C', ip: '10.0.1.30', x: 165, y: 290, leaf: 'leaf1' },
  { id: 'b', name: '主机 B', ip: '10.0.1.20', x: 300, y: 290, leaf: 'leaf2' },
];

const CROSS_STEPS: Stage[] = [
  {
    title: '① 内层帧：主机 A 发出原始以太网帧',
    desc: 'SMAC=A、DMAC=B（10.0.1.20）、VLAN 10。A 与 B 同属 10.0.1.0/24，A 认为 B 就在本地，直接发出二层帧。',
    path: 'M 70 272 L 70 192',
  },
  {
    title: '② 加 VXLAN 头：分配 VNI 5000',
    desc: 'Leaf1 查 EVPN Type-2 路由得知 B 在 VTEP 10.0.0.2、VNI 5000，于是给内层帧加上 8 字节 VXLAN 头，用 VNI 标识该二层域。',
    dot: { x: 110, y: 170 },
  },
  {
    title: '③ 加 UDP 头：目的端口 4789',
    desc: 'VXLAN 用 UDP 4789 承载；源端口由内层帧哈希生成，便于底层网络做 ECMP 负载分担。',
    dot: { x: 110, y: 170 },
  },
  {
    title: '④ 加外层 IP 头：VTEP 到 VTEP',
    desc: '外层源 IP 10.0.0.1（Leaf1），目的 IP 10.0.0.2（Leaf2）。底层网络只需看到这对 VTEP 地址，不感知内层 MAC/IP。',
    dot: { x: 110, y: 170 },
  },
  {
    title: '⑤ 加外层以太网头并经 Spine 转发',
    desc: '外层以太网的下一跳改写为 Spine 的 MAC；Spine 只做普通转发，把封装后的报文送到 Leaf2。',
    path: 'M 110 148 L 300 92 L 300 148',
  },
  {
    title: '⑥ Leaf2 解封装并按内层 DMAC 转发',
    desc: 'Leaf2 收到 UDP 4789 报文，校验 VNI 5000，剥掉外层以太网 / IP / UDP / VXLAN 头，按内层 DMAC B 查本地 MAC 表，从接入端口交给主机 B。',
    path: 'M 300 192 L 300 272',
  },
  {
    title: '⑦ EVPN Type-2 路由学习（控制面）',
    desc: 'Leaf2 通过 BGP EVPN 把「B 的 MAC/IP ↔ VNI 5000 ↔ VTEP 10.0.0.2」以 Type-2 路由通告给 Leaf1；Leaf1 学到后才知道外层目的地址，避免未知单播泛洪。',
    dot: { x: 300, y: 170 },
  },
];

const SAME_STEPS: Stage[] = [
  {
    title: '① 内层帧：主机 A 发往同子网的 C',
    desc: 'SMAC=A、DMAC=C（10.0.1.30）、VLAN 10。A 与 C 都接在 Leaf1，属于同一个 VTEP。',
    path: 'M 70 272 L 70 192',
  },
  {
    title: '② Leaf1 查本地 MAC 表',
    desc: '命中 MAC 00:11:22:33:44:66 → VLAN 10 / 端口 GE0/0/2，不需要查询 EVPN Type-2 路由。',
    dot: { x: 110, y: 170 },
  },
  {
    title: '③ 命中出端口，直接二层转发',
    desc: '报文从 GE0/0/2 发出，不离开 Leaf1，不生成 VXLAN 头、UDP 4789 或外层 IP 头。',
    dot: { x: 110, y: 170 },
  },
  {
    title: '④ 主机 C 收到原始以太网帧',
    desc: 'C 收到的就是 A 发出的原始帧，中间没有增加任何隧道封装，转发路径最短。',
    path: 'M 165 192 L 165 272',
  },
  {
    title: '⑤ 对比：同 VTEP 无需 VXLAN 与 EVPN',
    desc: '只有跨 VTEP 时才需要 VNI、UDP 4789、外层 IP 以及 EVPN Type-2 路由；同 VTEP 只是普通的二层转发。',
    dot: { x: 165, y: 290 },
  },
];

const LAYERS = [
  { label: '内层以太网', value: 'SMAC A → DMAC B · VLAN 10', at: 0 },
  { label: 'VXLAN 头', value: 'VNI 5000 · 8 字节', at: 1 },
  { label: 'UDP', value: '源端口随机 / 目的 4789', at: 2 },
  { label: '外层 IP', value: '10.0.0.1 → 10.0.0.2 · Proto 17', at: 3 },
  { label: '外层以太网', value: 'Leaf1 → Spine → Leaf2', at: 4 },
];

const PATH_SAME = 'M 70 272 L 70 192 L 70 170 L 165 170 L 165 192 L 165 272';
const PATH_CROSS = 'M 70 272 L 70 192 L 110 148 L 300 92 L 300 148 L 300 272';

export default function VxlanEvpnViz() {
  const [mode, setMode] = useState<Mode>('cross');
  const [showEncap, setShowEncap] = useState(true);

  const isCross = mode === 'cross';
  const steps = isCross ? CROSS_STEPS : SAME_STEPS;
  const stepper = useStepper(steps.length, { interval: 2000 });
  const index = Math.min(stepper.index, steps.length - 1);
  const stage = steps[index];

  const path = isCross ? PATH_CROSS : PATH_SAME;
  const pathColor = isCross ? 'var(--accent)' : 'var(--accent-3)';

  const selectMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    stepper.reset();
  };

  const leafActive = (id: VtepId): boolean => {
    if (!isCross) return id === 'leaf1';
    if (index <= 3) return id === 'leaf1';
    if (index === 4) return id === 'leaf1' || id === 'leaf2';
    return id === 'leaf2';
  };

  const hostActive = (host: Host): boolean => {
    if (host.id === 'a') return true;
    if (isCross) return host.id === 'b' && index >= 5;
    return host.id === 'c' && index >= 3;
  };

  const spineActive = isCross && index >= 4;

  const layers = showEncap ? LAYERS.filter((layer) => index >= layer.at) : LAYERS.slice(0, 1);

  const note = isCross
    ? '跨 VTEP：Leaf1 查 EVPN Type-2 路由得到主机 B 的 VTEP 10.0.0.2 与 VNI 5000，依次加上 VXLAN / UDP / 外层 IP / 外层以太网头，经 Spine 送到 Leaf2；Leaf2 解封装后按内层目的 MAC 交给主机 B。'
    : '同 VTEP：主机 A 与 C 都接在 Leaf1。Leaf1 直接查本地 MAC 表命中出端口，二层转发即可，不需要 VXLAN 封装，也不需要查询 EVPN Type-2 路由。';

  return (
    <div>
      <div className="hstack" style={{ gap: 6 }}>
        <button
          type="button"
          className={`btn btn-sm${mode === 'same' ? ' btn-primary' : ''}`}
          onClick={() => selectMode('same')}
          aria-pressed={mode === 'same'}
          aria-label="切换到同 VTEP 内转发"
        >
          同 VTEP 内转发
        </button>
        <button
          type="button"
          className={`btn btn-sm${mode === 'cross' ? ' btn-primary' : ''}`}
          onClick={() => selectMode('cross')}
          aria-pressed={mode === 'cross'}
          aria-label="切换到跨 VTEP 转发"
        >
          跨 VTEP 转发
        </button>
        <button
          type="button"
          className={`btn btn-sm${showEncap ? ' btn-primary' : ''}`}
          onClick={() => setShowEncap((value) => !value)}
          aria-pressed={showEncap}
          aria-label={!isCross ? '同 VTEP 转发不产生封装层' : showEncap ? '隐藏封装层，仅显示原始帧' : '显示封装层，对比封装后报文'}
          disabled={!isCross}
          title={isCross ? '对比原始帧与封装后报文' : '同 VTEP 转发不产生封装'}
        >
          {!isCross ? '同 VTEP 无封装' : showEncap ? '隐藏封装层' : '显示封装层'}
        </button>
        <span className="tiny faint" style={{ marginLeft: 'auto' }}>
          VNI 5000 · {isCross ? 'A → B' : 'A → C'}
        </span>
      </div>

      <svg
        viewBox="0 0 560 350"
        width="100%"
        role="img"
        aria-label="VXLAN/EVPN 拓扑：Spine 与三台 Leaf，主机 A、B、C 同子网"
        style={{ marginTop: 8 }}
      >
        {/* Spine 与 Leaf 之间的链路 */}
        {VTEP_LIST.map((leaf) => {
          const onPath = spineActive && (leaf.id === 'leaf1' || leaf.id === 'leaf2');
          return (
            <line
              key={`spine-${leaf.id}`}
              x1={leaf.x}
              y1={148}
              x2={300}
              y2={92}
              stroke={onPath ? 'var(--accent)' : 'var(--border-strong)'}
              strokeWidth={onPath ? 2 : 1.5}
              style={{ transition: 'stroke 220ms ease' }}
            />
          );
        })}

        {/* 主机接入链路 */}
        {HOSTS.map((host) => (
          <line
            key={`link-${host.id}`}
            x1={host.x}
            y1={272}
            x2={host.x}
            y2={192}
            stroke="var(--border-strong)"
            strokeWidth={1.5}
          />
        ))}

        {/* 当前转发路径 */}
        <path d={path} fill="none" stroke={pathColor} strokeWidth={2.6} strokeDasharray="8 5" opacity={0.9} />
        {stage.path ? (
          <circle key={`${mode}-${index}`} r={4.5} fill={pathColor}>
            <animateMotion dur="1.8s" repeatCount="indefinite" path={stage.path} />
          </circle>
        ) : stage.dot ? (
          <circle key={`${mode}-${index}-dot`} cx={stage.dot.x} cy={stage.dot.y} r={4.5} fill={pathColor} />
        ) : null}

        {/* Spine */}
        <g>
          <rect
            x={245}
            y={48}
            width={110}
            height={44}
            rx={10}
            fill={spineActive ? 'var(--accent-soft)' : 'var(--surface)'}
            stroke={spineActive ? 'var(--accent)' : 'var(--border-strong)'}
            strokeWidth={spineActive ? 1.8 : 1.5}
            style={{ transition: 'stroke 220ms ease, fill 220ms ease' }}
          />
          <text x={300} y={68} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="var(--text)">
            Spine
          </text>
          <text x={300} y={82} textAnchor="middle" fontSize={7.5} fill="var(--text-faint)">
            BGP EVPN 反射
          </text>
        </g>

        {/* Leaf */}
        {VTEP_LIST.map((leaf) => {
          const active = leafActive(leaf.id);
          return (
            <g key={leaf.id}>
              <rect
                x={leaf.x - LEAF_W / 2}
                y={leaf.y - LEAF_H / 2}
                width={LEAF_W}
                height={LEAF_H}
                rx={10}
                fill={active ? 'var(--accent-soft)' : 'var(--surface)'}
                stroke={active ? 'var(--accent)' : 'var(--border-strong)'}
                strokeWidth={active ? 1.8 : 1.3}
                style={{ transition: 'stroke 220ms ease, fill 220ms ease' }}
              />
              <text x={leaf.x} y={leaf.y - 2} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text)">
                {leaf.name}
              </text>
              <text x={leaf.x} y={leaf.y + 12} textAnchor="middle" fontSize={7} fontFamily="var(--mono)" fill="var(--text-faint)">
                VTEP {leaf.ip}
              </text>
            </g>
          );
        })}

        {/* 主机 */}
        {HOSTS.map((host) => {
          const active = hostActive(host);
          return (
            <g key={host.id}>
              <rect
                x={host.x - 38}
                y={272}
                width={76}
                height={36}
                rx={8}
                fill={active ? 'var(--accent-2-soft)' : 'var(--surface)'}
                stroke={active ? 'var(--accent-2)' : 'var(--border)'}
                strokeWidth={1.3}
                style={{ transition: 'stroke 220ms ease' }}
              />
              <text x={host.x} y={288} textAnchor="middle" fontSize={9.5} fontWeight={650} fill="var(--text)">
                {host.name}
              </text>
              <text x={host.x} y={300} textAnchor="middle" fontSize={6.8} fontFamily="var(--mono)" fill="var(--text-faint)">
                {host.ip}
              </text>
            </g>
          );
        })}

        <text x={185} y={334} textAnchor="middle" fontSize={7.5} fill="var(--text-faint)">
          A、B、C 同属 10.0.1.0/24；A/C 在 Leaf1，B 在 Leaf2
        </text>
      </svg>

      <div
        style={{
          marginTop: 10,
          padding: '9px 11px',
          borderRadius: 9,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
        aria-live="polite"
      >
        <div className="hstack" style={{ gap: 8 }}>
          <span className="badge accent">
            步骤 {index + 1} / {steps.length}
          </span>
          <strong style={{ fontSize: 12.5 }}>{stage.title}</strong>
        </div>
        <div className="tiny" style={{ marginTop: 5, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          {stage.desc}
        </div>
      </div>

      {isCross ? (
        <div style={{ marginTop: 10 }}>
          <div className="hstack" style={{ gap: 6, marginBottom: 5 }}>
            <span className="tiny" style={{ color: 'var(--text-dim)', fontWeight: 650 }}>
              VXLAN 封装（由内到外）
            </span>
            {showEncap ? null : (
              <span className="badge" style={{ fontSize: 10 }}>
                仅显示原始帧
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
            {layers.map((layer, i) => (
              <div key={layer.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div
                  style={{
                    padding: '4px 7px',
                    borderRadius: 7,
                    border: `1px solid ${index === layer.at ? 'var(--accent)' : 'var(--border-strong)'}`,
                    background: index === layer.at ? 'var(--accent-soft)' : 'var(--surface-2)',
                    minWidth: 0,
                    transition: 'border-color 200ms ease, background 200ms ease',
                  }}
                >
                  <div style={{ fontSize: 9.5, fontWeight: 650, color: 'var(--text)' }}>{layer.label}</div>
                  <div className="mono" style={{ fontSize: 8.5, color: 'var(--text-faint)' }}>
                    {layer.value}
                  </div>
                </div>
                {i < layers.length - 1 ? (
                  <span className="tiny faint" aria-hidden="true">
                    +
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          <div className="code-block" style={{ marginTop: 10, opacity: index >= 6 ? 1 : 0.45, transition: 'opacity 240ms ease' }}>
            <div className="code-head">
              <span className="lang">EVPN</span>
              Leaf2 通告的 Type-2 路由（MAC/IP Advertisement）
            </div>
            <pre className="code-body" style={{ fontFamily: 'var(--mono)', fontSize: 10.5 }}>
              {`RD 65000:1    ESI 0\nMAC 00:11:22:33:44:55    IP 10.0.1.20/32\nVNI 5000      Next-Hop(VTEP) 10.0.0.2\nAS-Path 65000    Local-Pref 100`}
            </pre>
          </div>
          <div className="tiny" style={{ marginTop: 6, color: 'var(--text-dim)', lineHeight: 1.7 }}>
            {index >= 6
              ? 'Leaf2 通过 BGP EVPN 把「主机 B 的 MAC/IP ↔ VNI 5000 ↔ VTEP 10.0.0.2」的映射通告给 Leaf1，Leaf1 学到后才知道外层封装的目的地址。'
              : '第 7 步将展示 EVPN Type-2 路由如何把主机 B 的 MAC/IP 与 VTEP 地址、VNI 绑定并通告给 Leaf1。'}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          <div className="code-block" style={{ opacity: index >= 1 ? 1 : 0.45, transition: 'opacity 240ms ease' }}>
            <div className="code-head">
              <span className="lang">L2</span>
              Leaf1 本地 MAC 表
            </div>
            <pre className="code-body" style={{ fontFamily: 'var(--mono)', fontSize: 10.5 }}>
              {`MAC 00:11:22:33:44:66    VLAN 10    Port GE0/0/2\nMAC 00:11:22:33:44:55    VLAN 10    Port GE0/0/1`}
            </pre>
          </div>
          <div className="tiny" style={{ marginTop: 6, color: 'var(--text-dim)', lineHeight: 1.7 }}>
            同 VTEP 内转发只需查本地 MAC 表：命中后直接从对应端口二层转发，报文不会离开 Leaf1，也不会生成 VXLAN 封装或 EVPN 路由。
          </div>
        </div>
      )}

      <VizControls
        stepper={stepper}
        ariaLabel="VXLAN 封装与转发步骤控制"
        extra={<span className="tiny faint">{isCross ? '跨 VTEP · VNI 5000' : '同 VTEP · 本地二层'}</span>}
      />

      <div className="viz-legend">
        <span>
          <span className="dot" style={{ background: 'var(--accent)' }} /> 跨 VTEP 转发路径
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--accent-3)' }} /> 同 VTEP 本地转发
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--accent-2)' }} /> 主机 / VTEP
        </span>
      </div>

      <div className="viz-note" style={{ borderLeft: `2px solid ${pathColor}`, paddingLeft: 10 }} aria-live="polite">
        {note}
      </div>
    </div>
  );
}
