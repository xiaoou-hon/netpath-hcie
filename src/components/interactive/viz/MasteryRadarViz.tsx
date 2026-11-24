import { useState } from 'react';
import { Link } from 'react-router-dom';
import { moduleMastery, useLearning } from '@/store/learningStore';
import { modules } from '@/data/curriculum';

export const meta = {
  key: 'mastery-radar',
  title: 'HCIE 能力雷达',
  subtitle: '能力分层对标基线',
  order: 25,
};

const SIZE = 440;
const CX = 220;
const CY = 212;
const R = 122;
const RINGS = [0.25, 0.5, 0.75, 1];

type Tier = '基础能力' | '进阶能力' | '专家能力';
type TierFilter = '全部' | Tier;

interface Capability {
  key: string;
  label: string;
  lines: [string, string];
  tier: Tier;
  /** 组成该能力的模块 id */
  moduleIds: string[];
  /** HCIE-Datacom 建议基线 */
  target: number;
  desc: string;
}

/**
 * 能力维度 = 模块的加权聚合（按课时数加权）。
 * 每个层级至少 4 条轴，保证按层级筛选后雷达仍可读。
 */
const CAPABILITIES: Capability[] = [
  {
    key: 'net-basics',
    label: '网络基础',
    lines: ['网络', '基础'],
    tier: '基础能力',
    moduleIds: ['m00'],
    target: 0.9,
    desc: '分层模型、封装、以太网、ARP 与 TCP/UDP',
  },
  {
    key: 'addressing',
    label: 'IP 编址与 IPv6',
    lines: ['IP 编址', '与 IPv6'],
    tier: '基础能力',
    moduleIds: ['m01', 'm12'],
    target: 0.9,
    desc: '子网划分、VLSM/CIDR、IPv6 与 DHCP/DNS 服务',
  },
  {
    key: 'routing-basics',
    label: '路由基础',
    lines: ['路由', '基础'],
    tier: '基础能力',
    moduleIds: ['m02'],
    target: 0.9,
    desc: '路由表、直连/静态/默认路由与最长匹配',
  },
  {
    key: 'switching',
    label: '二层交换',
    lines: ['二层', '交换'],
    tier: '基础能力',
    moduleIds: ['m06'],
    target: 0.85,
    desc: 'VLAN、Trunk、STP/RSTP/MSTP、链路聚合与堆叠',
  },
  {
    key: 'igp',
    label: 'IGP 路由',
    lines: ['IGP', '路由'],
    tier: '进阶能力',
    moduleIds: ['m03', 'm04'],
    target: 0.9,
    desc: 'OSPF / IS-IS 邻居、LSA、区域与路由计算',
  },
  {
    key: 'bgp',
    label: 'BGP 与选路',
    lines: ['BGP', '与选路'],
    tier: '进阶能力',
    moduleIds: ['m05'],
    target: 0.9,
    desc: 'BGP 状态机、属性、选路、反射器与路由策略',
  },
  {
    key: 'wlan',
    label: 'WLAN 规划',
    lines: ['WLAN', '无线'],
    tier: '进阶能力',
    moduleIds: ['m08'],
    target: 0.8,
    desc: 'CAPWAP 上线、漫游、射频调优与 WLAN 安全',
  },
  {
    key: 'security',
    label: '网络安全',
    lines: ['网络', '安全'],
    tier: '进阶能力',
    moduleIds: ['m09'],
    target: 0.85,
    desc: '安全架构、防火墙策略、NAT、IPsec 与准入认证',
  },
  {
    key: 'wan',
    label: '高可用与广域',
    lines: ['高可用', '广域'],
    tier: '专家能力',
    moduleIds: ['m07', 'm15'],
    target: 0.8,
    desc: 'VRRP/BFD/MPLS、SD-WAN、园区与广域架构设计',
  },
  {
    key: 'automation',
    label: '自动化与数据中心',
    lines: ['自动化', '数据中心'],
    tier: '专家能力',
    moduleIds: ['m10'],
    target: 0.75,
    desc: 'SDN、NETCONF/YANG、Telemetry、VXLAN/EVPN',
  },
  {
    key: 'qos',
    label: 'QoS 与组播',
    lines: ['QoS', '组播'],
    tier: '专家能力',
    moduleIds: ['m14'],
    target: 0.75,
    desc: '流量分类、队列与整形、IGMP/PIM 与 RPF',
  },
  {
    key: 'ops',
    label: '运维与排障',
    lines: ['运维', '排障'],
    tier: '专家能力',
    moduleIds: ['m11', 'm13'],
    target: 0.85,
    desc: '运维体系、故障定位、变更割接与复盘',
  },
];

const TIERS: Tier[] = ['基础能力', '进阶能力', '专家能力'];

const FILTERS: { value: TierFilter; label: string }[] = [
  { value: '全部', label: '全部' },
  { value: '基础能力', label: '基础' },
  { value: '进阶能力', label: '进阶' },
  { value: '专家能力', label: '专家' },
];

function angleAt(index: number, total: number): number {
  return -Math.PI / 2 + (index * 2 * Math.PI) / total;
}

function polar(index: number, total: number, ratio: number): { x: number; y: number } {
  const angle = angleAt(index, total);
  return { x: CX + Math.cos(angle) * R * ratio, y: CY + Math.sin(angle) * R * ratio };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function levelOf(value: number): { label: string; color: string } {
  if (value >= 0.85) return { label: 'HCIE 级', color: 'var(--ok)' };
  if (value >= 0.65) return { label: '精通', color: 'var(--accent)' };
  if (value >= 0.45) return { label: '熟悉', color: 'var(--accent-2)' };
  if (value >= 0.2) return { label: '了解', color: 'var(--warn)' };
  return { label: '未入门', color: 'var(--text-faint)' };
}

function capabilityMastery(cap: Capability): number {
  let weightSum = 0;
  let valueSum = 0;
  for (const id of cap.moduleIds) {
    const mod = modules.find((m) => m.id === id);
    if (!mod || mod.lessons.length === 0) continue;
    const weight = mod.lessons.length;
    weightSum += weight;
    valueSum += moduleMastery(id) * weight;
  }
  return weightSum > 0 ? valueSum / weightSum : 0;
}

export default function MasteryRadarViz() {
  useLearning();
  const [hover, setHover] = useState<number | null>(null);
  const [tierFilter, setTierFilter] = useState<TierFilter>('全部');
  const [showBaseline, setShowBaseline] = useState(true);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);

  const allAxes = CAPABILITIES.map((cap) => ({
    ...cap,
    mastery: capabilityMastery(cap),
  }));
  const axes = tierFilter === '全部' ? allAxes : allAxes.filter((a) => a.tier === tierFilter);
  const total = axes.length;
  const average = total ? axes.reduce((acc, a) => acc + a.mastery, 0) / total : 0;
  const empty = axes.length > 0 && axes.every((a) => a.mastery === 0);

  const pinned = pinnedKey ? (axes.find((a) => a.key === pinnedKey) ?? null) : null;
  const pinnedModules = pinned
    ? pinned.moduleIds.flatMap((id) => {
        const mod = modules.find((m) => m.id === id);
        return mod ? [mod] : [];
      })
    : [];
  const weakestModule =
    pinnedModules.length > 0
      ? pinnedModules.reduce((min, m) => (moduleMastery(m.id) < moduleMastery(min.id) ? m : min))
      : null;

  const filterLabel = tierFilter === '全部' ? '全部能力' : tierFilter;
  const overallAverage = allAxes.length
    ? allAxes.reduce((acc, a) => acc + a.mastery, 0) / allAxes.length
    : 0;
  const expert = allAxes.filter((a) => a.tier === '专家能力');
  const expertBelow = expert.filter((a) => a.mastery < a.target);
  const reachedTarget = allAxes.filter((a) => a.mastery >= a.target).length;
  const lowest = [...allAxes].sort((a, b) => a.mastery - b.mastery)[0];

  const polygonAt = (ratio: number): string =>
    axes
      .map((_, index) => {
        const point = polar(index, total, ratio);
        return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
      })
      .join(' ');

  const dataPoints = axes
    .map((item, index) => {
      const point = polar(index, total, item.mastery);
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    })
    .join(' ');

  const targetPoints = axes
    .map((item, index) => {
      const point = polar(index, total, item.target);
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    })
    .join(' ');

  const hovered = hover !== null && hover < total ? axes[hover] : null;
  const hoverPoint = hover !== null && hovered ? polar(hover, total, hovered.mastery) : null;
  const tooltipWidth = 176;
  const tooltipHeight = 52;
  const tooltipX = hoverPoint ? clamp(hoverPoint.x + 12, 6, SIZE - tooltipWidth - 6) : 0;
  const tooltipY = hoverPoint ? clamp(hoverPoint.y - tooltipHeight - 10, 6, SIZE - tooltipHeight - 6) : 0;

  const onFilter = (value: TierFilter) => {
    setTierFilter(value);
    setHover(null);
    if (value !== '全部' && pinnedKey) {
      const cap = CAPABILITIES.find((c) => c.key === pinnedKey);
      if (!cap || cap.tier !== value) setPinnedKey(null);
    }
  };

  const togglePin = (key: string) => {
    setPinnedKey((prev) => (prev === key ? null : key));
  };

  const note = allAxes.every((a) => a.mastery === 0)
    ? '当前没有学习记录：所有能力为 0%，多边形收敛在圆心。完成课时或模块小测后，雷达会按能力维度自动展开。'
    : `能力值按模块课时数加权聚合，共 ${modules.length} 个模块、${allAxes.length} 项能力。当前平均 ${percent(overallAverage)}，达标 ${reachedTarget}/${allAxes.length} 项；专家能力中还有 ${expertBelow.length} 项低于 HCIE 基线；最需补强「${lowest.label}」${percent(lowest.mastery)}（基线 ${percent(lowest.target)}）。以上统计始终按全部能力计算，不受层级筛选影响。`;

  return (
    <div>
      <div className="tiny" style={{ marginBottom: 6, color: 'var(--text-dim)' }}>
        当前筛选：
        <strong style={{ color: 'var(--accent)', margin: '0 4px' }}>{filterLabel}</strong>
        <span className="faint">
          · 雷达显示 {total} 轴 · 平均 {percent(average)}
          {pinned ? ` · 已固定「${pinned.label}」` : ''}
        </span>
      </div>

      <div className="hstack" style={{ gap: 6 }}>
        <span className="tiny faint">能力层级</span>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`chip${tierFilter === f.value ? ' active' : ''}`}
            onClick={() => onFilter(f.value)}
            aria-pressed={tierFilter === f.value}
            aria-label={`筛选${f.label}能力`}
          >
            {f.label}
          </button>
        ))}
        <span className="spacer" />
        <button
          type="button"
          className={`chip${showBaseline ? ' active' : ''}`}
          onClick={() => setShowBaseline((v) => !v)}
          aria-pressed={showBaseline}
          aria-label="显示或隐藏 HCIE 基线"
        >
          <span className="dot" style={{ background: 'var(--warn)' }} /> HCIE 基线{showBaseline ? '显示' : '隐藏'}
        </button>
      </div>

      <div className="hstack" style={{ marginTop: 8, marginBottom: 4, gap: 12 }}>
        <span className="tiny faint">
          {showBaseline ? '虚线 = HCIE-Datacom 建议能力基线' : 'HCIE 基线已隐藏'}
        </span>
        <span className="tiny" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--accent)' }}>
          <span className="dot" style={{ background: 'var(--accent)' }} /> 我的能力
        </span>
        {showBaseline ? (
          <span className="tiny" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--warn)' }}>
            <span className="dot" style={{ background: 'var(--warn)' }} /> HCIE 基线
          </span>
        ) : null}
      </div>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width="100%"
        role="img"
        aria-label={`HCIE 能力雷达图，当前显示 ${filterLabel} 共 ${total} 项能力，包含我的能力与基线对比`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <radialGradient id="radarFill" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(233,180,86,0.42)" />
            <stop offset="100%" stopColor="rgba(124,156,255,0.14)" />
          </radialGradient>
        </defs>

        {RINGS.map((ratio) => (
          <polygon
            key={ratio}
            points={polygonAt(ratio)}
            fill="none"
            stroke="var(--border)"
            strokeWidth={ratio === 1 ? 1.4 : 1}
          />
        ))}

        {[0.25, 0.5, 0.75].map((ratio) => (
          <text
            key={`tick-${ratio}`}
            x={CX + 4}
            y={CY - R * ratio + 3}
            fontSize={8}
            fill="var(--text-faint)"
            fontFamily="var(--mono)"
          >
            {Math.round(ratio * 100)}
          </text>
        ))}

        {axes.map((item, index) => {
          const outer = polar(index, total, 1);
          return (
            <line
              key={`axis-${item.key}`}
              x1={CX}
              y1={CY}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--border)"
              strokeWidth={1}
            />
          );
        })}

        {/* HCIE 基线 */}
        {showBaseline ? (
          <polygon
            points={targetPoints}
            fill="rgba(251, 191, 36, 0.06)"
            stroke="var(--warn)"
            strokeWidth={1.4}
            strokeDasharray="5 4"
            strokeLinejoin="round"
          />
        ) : null}

        {/* 我的能力 */}
        <polygon
          points={dataPoints}
          fill="url(#radarFill)"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {empty ? <circle cx={CX} cy={CY} r={3} fill="var(--accent)" opacity={0.7} /> : null}

        <text x={CX} y={CY - 8} textAnchor="middle" fontSize={10} fill="var(--text-faint)">
          平均 {percent(average)}
        </text>
        {empty ? (
          <text x={CX} y={CY + 12} textAnchor="middle" fontSize={8.5} fill="var(--text-faint)">
            暂无学习数据
          </text>
        ) : null}

        {axes.map((item, index) => {
          const point = polar(index, total, item.mastery);
          const isHover = hover === index;
          const isPinned = pinnedKey === item.key;
          return (
            <g
              key={`dot-${item.key}`}
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
              onClick={() => togglePin(item.key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  togglePin(item.key);
                }
              }}
              tabIndex={0}
              role="button"
              aria-pressed={isPinned}
              aria-label={`固定 ${item.label}，掌握度 ${percent(item.mastery)}`}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={point.x} cy={point.y} r={11} fill="transparent" />
              {isPinned ? (
                <circle cx={point.x} cy={point.y} r={9} fill="none" stroke="var(--accent-3)" strokeWidth={1.4} />
              ) : null}
              <circle
                cx={point.x}
                cy={point.y}
                r={isPinned ? 6 : isHover ? 5.5 : 3.2}
                fill={isPinned ? 'var(--accent-3)' : isHover ? 'var(--accent-3)' : 'var(--accent)'}
                stroke="var(--surface)"
                strokeWidth={1.3}
                style={{ transition: 'r 160ms ease, fill 160ms ease' }}
              />
            </g>
          );
        })}

        {axes.map((item, index) => {
          const angle = angleAt(index, total);
          const point = polar(index, total, 1.2);
          const anchor = Math.cos(angle) > 0.3 ? 'start' : Math.cos(angle) < -0.3 ? 'end' : 'middle';
          const dy = Math.sin(angle) < -0.3 ? -3 : 9;
          const isPinned = pinnedKey === item.key;
          return (
            <g
              key={`label-${item.key}`}
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
              onClick={() => togglePin(item.key)}
              role="button"
              aria-pressed={isPinned}
              aria-label={`固定 ${item.label}，掌握度 ${percent(item.mastery)}`}
              style={{ cursor: 'pointer' }}
            >
              <text
                x={point.x}
                y={point.y + dy}
                textAnchor={anchor}
                fontSize={9.5}
                fontWeight={isPinned ? 750 : hover === index ? 750 : 600}
                fill={isPinned ? 'var(--accent-3)' : hover === index ? 'var(--accent)' : 'var(--text-dim)'}
              >
                <tspan x={point.x} dy={0}>{item.lines[0]}</tspan>
                <tspan x={point.x} dy={11}>{item.lines[1]}</tspan>
              </text>
            </g>
          );
        })}

        {hovered && hoverPoint ? (
          <g pointerEvents="none">
            <rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipWidth}
              height={tooltipHeight}
              rx={7}
              fill="var(--surface-3)"
              stroke="var(--border-strong)"
              strokeWidth={1}
            />
            <text x={tooltipX + 8} y={tooltipY + 15} fontSize={9.5} fill="var(--text)">
              {hovered.label} · {levelOf(hovered.mastery).label}
            </text>
            <text x={tooltipX + 8} y={tooltipY + 30} fontSize={9} fill="var(--accent)">
              我的 {percent(hovered.mastery)}
            </text>
            <text x={tooltipX + 78} y={tooltipY + 30} fontSize={9} fill="var(--warn)">
              基线 {percent(hovered.target)}
            </text>
            <text x={tooltipX + 8} y={tooltipY + 44} fontSize={8.5} fill="var(--text-faint)">
              含模块 {hovered.moduleIds.map((id) => id.toUpperCase()).join(' / ')}
            </text>
          </g>
        ) : null}
      </svg>

      {pinned ? (
        <div
          style={{
            marginTop: 10,
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
          }}
          aria-live="polite"
        >
          <div className="hstack" style={{ gap: 8 }}>
            <strong style={{ fontSize: 14 }}>{pinned.label}</strong>
            <span className="badge accent">已固定</span>
            <span className="spacer" />
            <span className="tiny mono" style={{ color: levelOf(pinned.mastery).color }}>
              掌握度 {percent(pinned.mastery)} · {levelOf(pinned.mastery).label}
            </span>
            <span className="tiny faint">基线 {percent(pinned.target)}</span>
          </div>
          <div className="tiny faint" style={{ marginTop: 4 }}>
            {pinned.desc}
          </div>
          <div className="hstack" style={{ marginTop: 8, gap: 6 }}>
            <span className="tiny faint">组成模块</span>
            {pinnedModules.map((mod) => (
              <Link key={mod.id} to={`/module/${mod.id}`} className="chip" style={{ fontSize: 11 }}>
                {mod.code} {mod.title} · {percent(moduleMastery(mod.id))}
              </Link>
            ))}
            {weakestModule ? (
              <Link
                to={`/module/${weakestModule.id}`}
                className="btn btn-sm btn-ghost"
                style={{ marginLeft: 'auto' }}
                aria-label={`去补课：${weakestModule.title}`}
              >
                去补课
              </Link>
            ) : null}
          </div>
          <div className="tiny faint" style={{ marginTop: 6 }}>
            再次点击该能力的顶点或标签即可取消固定。
          </div>
        </div>
      ) : (
        <div className="tiny faint" style={{ marginTop: 8 }}>
          点击任一能力顶点或标签可固定选中，下方显示组成模块与补课入口。
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(228px, 1fr))', gap: 10, marginTop: 12 }}>
        {TIERS.map((tier) => {
          const items = allAxes.filter((a) => a.tier === tier);
          return (
            <div
              key={tier}
              style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px', background: 'var(--surface)' }}
            >
              <div className="hstack" style={{ marginBottom: 8 }}>
                <span className="tiny" style={{ fontWeight: 700 }}>{tier}</span>
                <span className="spacer" />
                <span className="tiny faint">
                  {items.filter((i) => i.mastery >= i.target).length}/{items.length} 达标
                </span>
              </div>
              <div className="vstack" style={{ gap: 7 }}>
                {items.map((item) => {
                  const level = levelOf(item.mastery);
                  const met = item.mastery >= item.target;
                  return (
                    <div key={item.key}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="tiny" style={{ flex: 1, minWidth: 0, color: 'var(--text-dim)' }}>
                          {item.label}
                        </span>
                        <span className="tiny mono" style={{ color: level.color }}>{percent(item.mastery)}</span>
                        <span className={`badge ${met ? 'ok' : ''}`} style={{ padding: '0 6px', fontSize: 10 }}>
                          {level.label}
                        </span>
                      </div>
                      <div className="progress thin" style={{ marginTop: 4, position: 'relative' }}>
                        <div
                          className="progress-bar"
                          style={{
                            width: `${Math.round(item.mastery * 100)}%`,
                            background: met ? 'linear-gradient(90deg,#e9b456,#4ade80)' : undefined,
                          }}
                        />
                        <span
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            top: -2,
                            bottom: -2,
                            left: `${Math.round(item.target * 100)}%`,
                            width: 1.5,
                            background: 'var(--warn)',
                            opacity: 0.9,
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span className="tiny faint" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.desc}
                        </span>
                        <Link
                          to={`/module/${item.moduleIds[0]}`}
                          className="tiny"
                          style={{ color: met ? 'var(--text-faint)' : 'var(--accent)', flex: 'none' }}
                        >
                          {met ? '已达标' : '去补课'}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="viz-note" style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 10 }} aria-live="polite">
        {note}
      </div>
    </div>
  );
}
