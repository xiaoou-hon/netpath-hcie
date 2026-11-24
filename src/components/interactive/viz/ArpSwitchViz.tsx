import { useState } from 'react';
import { useStepper } from '../useStepper';
import { VizControls } from '../VizControls';

export const meta = {
  key: 'arp-switch',
  title: 'ARP 与二层转发',
  subtitle: '广播 → 学习 → 单播',
  order: 13,
};

const NOTES = [
  '初始：交换机 MAC 表为空。主机 A 想 ping 10.0.0.2，但不知道主机 B 的 MAC 地址，先发起 ARP。',
  '第 1 步：A 发出 ARP 请求广播帧，目的 MAC 为 FF:FF:FF:FF:FF:FF，内容「谁是 10.0.0.2？请告诉 10.0.0.1」。',
  '第 2 步：交换机收到广播帧，先学习源 MAC（AA…A 来自 P1），再向除入口外的所有端口泛洪（P2、P3）。',
  '第 3 步：B 收到广播，发现查询的正是自己的 IP，于是以单播回复 ARP 应答：我的 MAC 是 BB…B。',
  '第 4 步：交换机学习 B 的 MAC（BB…B → P2），查表后只从 P1 转发应答给 A，不会发给 C。',
  '第 5 步：A 把 B 的 MAC 写入 ARP 缓存，后续数据帧直接以 BB…B 为目的 MAC，交换机查表从 P2 单播转发，不再泛洪。',
];

const KEYFRAMES = [0, 1, 3, 5];

const HOSTS = [
  { name: '主机 A', ip: '10.0.0.1', mac: 'AA:AA:AA:AA:AA:AA', x: 20, y: 40 },
  { name: '主机 B', ip: '10.0.0.2', mac: 'BB:BB:BB:BB:BB:BB', x: 420, y: 40 },
  { name: '主机 C', ip: '10.0.0.3', mac: 'CC:CC:CC:CC:CC:CC', x: 220, y: 272 },
];

const LINKS: { id: number; x1: number; y1: number; x2: number; y2: number; portX: number; portY: number; port: string }[] = [
  { id: 0, x1: 140, y1: 68, x2: 230, y2: 166, portX: 222, portY: 156, port: 'P1' },
  { id: 1, x1: 420, y1: 68, x2: 330, y2: 166, portX: 338, portY: 156, port: 'P2' },
  { id: 2, x1: 280, y1: 272, x2: 280, y2: 202, portX: 288, portY: 196, port: 'P3' },
];

const ACTIVE_LINKS: Record<number, boolean[]> = {
  0: [false, false, false],
  1: [true, false, false],
  2: [false, true, true],
  3: [false, true, false],
  4: [true, false, false],
  5: [true, true, false],
};

const CHIPS: Record<number, { x: number; y: number; text: string; tone: string }[]> = {
  0: [],
  1: [{ x: 185, y: 112, text: 'ARP 请求（广播）', tone: 'var(--accent)' }],
  2: [
    { x: 355, y: 112, text: '泛洪', tone: 'var(--accent)' },
    { x: 282, y: 240, text: '泛洪', tone: 'var(--accent)' },
  ],
  3: [{ x: 355, y: 112, text: 'ARP 应答（单播）', tone: 'var(--accent-2)' }],
  4: [{ x: 185, y: 112, text: '转发应答', tone: 'var(--accent-2)' }],
  5: [
    { x: 172, y: 116, text: '数据帧', tone: 'var(--ok)' },
    { x: 360, y: 116, text: '查表转发', tone: 'var(--ok)' },
  ],
};

type MacEntry = { port: string; mac: string; host: string; since: number };

const MAC_ENTRIES: MacEntry[] = [
  { port: 'P1', mac: 'AA:AA:AA:AA:AA:AA', host: '主机 A', since: 2 },
  { port: 'P2', mac: 'BB:BB:BB:BB:BB:BB', host: '主机 B', since: 4 },
];

function chipWidth(text: string): number {
  return text.length * 8.4 + 14;
}

export default function ArpSwitchViz() {
  const [keyOnly, setKeyOnly] = useState(false);
  const stepper = useStepper(keyOnly ? KEYFRAMES.length : 6, { interval: 1600 });
  const step = keyOnly ? KEYFRAMES[stepper.index] : stepper.index;
  const active = ACTIVE_LINKS[step] ?? [false, false, false];
  const chips = CHIPS[step] ?? [];
  const entries = MAC_ENTRIES.filter((e) => step >= e.since);
  const latest = entries.length > 0 ? entries[entries.length - 1] : null;

  const toggleKeyOnly = () => {
    setKeyOnly((v) => !v);
    stepper.goTo(0);
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 320px', minWidth: 290, overflowX: 'auto' }}>
          <svg
            viewBox="0 0 560 340"
            width="100%"
            style={{ minWidth: 430 }}
            role="img"
            aria-label="ARP 广播与交换机二层转发拓扑"
          >
            {/* 链路 */}
            {LINKS.map((l) => (
              <g key={l.id}>
                <line
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  stroke="var(--border-strong)"
                  strokeWidth={1.4}
                />
                {active[l.id] ? (
                  <line
                    x1={l.x1}
                    y1={l.y1}
                    x2={l.x2}
                    y2={l.y2}
                    stroke="var(--accent)"
                    strokeWidth={2.4}
                    strokeDasharray={step <= 2 ? '6 4' : undefined}
                    style={{ transition: 'stroke 220ms ease' }}
                  />
                ) : null}
                <circle cx={l.portX} cy={l.portY} r={3} fill="var(--text-faint)" />
                <text x={l.portX + 6} y={l.portY - 4} fontSize={8.5} fontFamily="var(--mono)" fill="var(--text-faint)">
                  {l.port}
                </text>
              </g>
            ))}

            {/* 交换机 */}
            <rect x={230} y={150} width={100} height={52} rx={9} fill="var(--surface-2)" stroke="var(--accent-2)" strokeWidth={1.6} />
            <text x={280} y={172} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--text)">
              交换机 SW
            </text>
            <text x={280} y={188} textAnchor="middle" fontSize={8.5} fill="var(--text-faint)">
              二层转发 / MAC 学习
            </text>

            {/* 主机 */}
            {HOSTS.map((h) => {
              const isTarget = step >= 3 && step <= 5 && h.name === '主机 B';
              return (
                <g key={h.name}>
                  <rect
                    x={h.x}
                    y={h.y}
                    width={120}
                    height={56}
                    rx={9}
                    fill="var(--surface)"
                    stroke={isTarget ? 'var(--ok)' : 'var(--border-strong)'}
                    strokeWidth={isTarget ? 1.8 : 1.2}
                    style={{ transition: 'stroke 220ms ease' }}
                  />
                  <text x={h.x + 60} y={h.y + 18} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text)">
                    {h.name}
                  </text>
                  <text x={h.x + 60} y={h.y + 32} textAnchor="middle" fontSize={8.5} fontFamily="var(--mono)" fill="var(--text-dim)">
                    {h.ip}
                  </text>
                  <text x={h.x + 60} y={h.y + 46} textAnchor="middle" fontSize={7.5} fontFamily="var(--mono)" fill="var(--text-faint)">
                    {h.mac}
                  </text>
                </g>
              );
            })}

            {/* 报文标签 */}
            {chips.map((c) => (
              <g key={`${c.text}-${c.x}`}>
                <rect
                  x={c.x - chipWidth(c.text) / 2}
                  y={c.y - 9}
                  width={chipWidth(c.text)}
                  height={18}
                  rx={9}
                  fill="var(--surface-3)"
                  stroke={c.tone}
                  strokeWidth={1}
                />
                <text x={c.x} y={c.y + 4} textAnchor="middle" fontSize={9} fill={c.tone}>
                  {c.text}
                </text>
              </g>
            ))}

            <text x={280} y={332} textAnchor="middle" fontSize={8.5} fill="var(--text-faint)">
              ARP 广播域：同一 VLAN 内的所有主机都能收到广播，路由器不会转发广播
            </text>
          </svg>
        </div>

        <div style={{ flex: '0 1 200px', minWidth: 170 }}>
          <div className="tiny faint" style={{ marginBottom: 6 }}>
            交换机 MAC 地址表
          </div>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
              fontSize: 10.5,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '30px 1fr 44px',
                gap: 4,
                padding: '6px 8px',
                background: 'var(--surface-2)',
                color: 'var(--text-faint)',
              }}
            >
              <span>端口</span>
              <span>MAC</span>
              <span>主机</span>
            </div>
            {entries.length === 0 ? (
              <div style={{ padding: '10px 8px', color: 'var(--text-faint)' }}>（空）还没学习到任何 MAC</div>
            ) : (
              entries.map((e) => {
                const isLatest = latest !== null && e.mac === latest.mac;
                const isNew = e.since === step;
                return (
                  <div
                    key={e.mac}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '30px 1fr 44px',
                      gap: 4,
                      padding: '6px 8px',
                      borderTop: '1px solid var(--border)',
                      background: isLatest ? 'var(--accent-soft)' : 'transparent',
                      fontFamily: 'var(--mono)',
                      color: e.port === 'P1' ? 'var(--accent)' : 'var(--accent-2)',
                      transition: 'background 260ms ease',
                    }}
                  >
                    <span>{e.port}</span>
                    <span>
                      {e.mac.slice(0, 11)}
                      {isNew ? (
                        <span style={{ marginLeft: 4, color: 'var(--ok)', fontFamily: 'var(--font)' }}>新</span>
                      ) : null}
                    </span>
                    <span style={{ fontFamily: 'var(--font)' }}>{e.host}</span>
                  </div>
                );
              })
            )}
          </div>
          <div className="tiny" style={{ marginTop: 8, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            当前帧处理：
            <strong style={{ color: step <= 2 ? 'var(--accent)' : 'var(--accent-2)' }}>
              {step === 0 ? '等待' : step <= 2 ? '泛洪（Flooding）' : '单播（Unicast）'}
            </strong>
          </div>
        </div>
      </div>

      <div className="viz-note" style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 10 }} aria-live="polite">
        {NOTES[step]}
      </div>

      <VizControls
        stepper={stepper}
        extra={
          <button
            type="button"
            className={`btn btn-sm${keyOnly ? ' btn-primary' : ''}`}
            onClick={toggleKeyOnly}
            aria-pressed={keyOnly}
            aria-label="切换只看关键帧"
          >
            只看关键帧{keyOnly ? '：开' : ''}
          </button>
        }
      />

      <div className="viz-legend">
        <span>
          <span className="dot" style={{ background: 'var(--accent)' }} /> 广播 / 泛洪路径
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--accent-2)' }} /> 已知目的 MAC 的单播
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--ok)' }} /> 数据帧转发
        </span>
      </div>
    </div>
  );
}
