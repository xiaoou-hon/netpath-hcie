import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useStepper } from '../useStepper';
import type { Stepper } from '../useStepper';
import { VizControls } from '../VizControls';

export const meta = {
  key: 'fw-policy',
  title: '防火墙安全域与策略匹配',
  subtitle: '五元组命中演示',
  order: 22,
};

type Zone = 'Trust' | 'Untrust';
type Service = 'HTTP' | 'HTTPS' | 'DNS' | 'SSH' | 'Any';
type Action = 'permit' | 'deny';
type Proto = 'TCP' | 'UDP';

type Policy = {
  id: number;
  srcZone: Zone;
  dstZone: Zone;
  srcAddr: string;
  dstAddr: string;
  service: Service;
  action: Action;
  note: string;
  custom?: boolean;
};

type Draft = { srcZone: Zone; dstZone: Zone; service: Service; action: Action };

type Traffic = {
  id: string;
  label: string;
  srcIp: string;
  dstIp: string;
  proto: Proto;
  port: number;
};

type FieldCheck = { label: string; ok: boolean; detail: string };

type RowState = 'hit' | 'checking' | 'missed' | 'skipped' | 'pending';

const BASE_POLICIES: Policy[] = [
  {
    id: 1,
    srcZone: 'Trust',
    dstZone: 'Untrust',
    srcAddr: '192.168.1.0/24',
    dstAddr: 'any',
    service: 'HTTPS',
    action: 'permit',
    note: '内网用户访问 Web',
  },
  {
    id: 2,
    srcZone: 'Trust',
    dstZone: 'Untrust',
    srcAddr: 'any',
    dstAddr: 'any',
    service: 'DNS',
    action: 'permit',
    note: '内网 DNS 查询',
  },
  {
    id: 3,
    srcZone: 'Untrust',
    dstZone: 'Trust',
    srcAddr: 'any',
    dstAddr: '192.168.1.10',
    service: 'SSH',
    action: 'permit',
    note: '外网运维服务器',
  },
  {
    id: 4,
    srcZone: 'Trust',
    dstZone: 'Untrust',
    srcAddr: 'any',
    dstAddr: '203.0.113.0/24',
    service: 'Any',
    action: 'deny',
    note: '黑名单网段',
  },
  {
    id: 5,
    srcZone: 'Untrust',
    dstZone: 'Trust',
    srcAddr: 'any',
    dstAddr: 'any',
    service: 'Any',
    action: 'deny',
    note: '禁止外网主动访问内网',
  },
];

const SERVICE_PORT: Record<Exclude<Service, 'Any'>, { proto: Proto; port: number }> = {
  HTTP: { proto: 'TCP', port: 80 },
  HTTPS: { proto: 'TCP', port: 443 },
  DNS: { proto: 'UDP', port: 53 },
  SSH: { proto: 'TCP', port: 22 },
};

const TRAFFICS: Traffic[] = [
  { id: 't1', label: '内网 → 官网 HTTPS', srcIp: '192.168.1.10', dstIp: '202.100.1.1', proto: 'TCP', port: 443 },
  { id: 't2', label: '内网 → DNS 查询', srcIp: '192.168.1.10', dstIp: '8.8.8.8', proto: 'UDP', port: 53 },
  { id: 't3', label: '内网 → 黑名单网段', srcIp: '192.168.1.10', dstIp: '203.0.113.9', proto: 'TCP', port: 80 },
  { id: 't4', label: '外网 → 内网 SSH', srcIp: '202.100.1.9', dstIp: '192.168.1.10', proto: 'TCP', port: 22 },
  { id: 't5', label: '内网 → 公网 TCP/8443', srcIp: '192.168.1.10', dstIp: '202.100.1.1', proto: 'TCP', port: 8443 },
];

const GRID_COLS = '26px 1.05fr 1.05fr 1.05fr 0.7fr 0.58fr 0.9fr 64px';

const headerCell: CSSProperties = {
  padding: '6px 8px',
  fontSize: 10.5,
  color: 'var(--text-faint)',
  background: 'var(--surface-2)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
};

const rowCell: CSSProperties = {
  padding: '6px 8px',
  fontSize: 10.5,
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  gap: 3,
  minWidth: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const selectStyle: CSSProperties = {
  background: 'var(--surface-2)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '4px 6px',
  fontSize: 11.5,
};

function zoneOf(ip: string): Zone {
  return ip.startsWith('192.168.1.') ? 'Trust' : 'Untrust';
}

function matchAddr(rule: string, ip: string): boolean {
  if (rule === 'any') return true;
  if (rule.endsWith('/24')) {
    const prefix = rule.split('/')[0].split('.').slice(0, 3).join('.');
    return ip.startsWith(`${prefix}.`);
  }
  return rule === ip;
}

function protoMatches(service: Service, traffic: Traffic): boolean {
  return service === 'Any' || SERVICE_PORT[service].proto === traffic.proto;
}

function portMatches(service: Service, traffic: Traffic): boolean {
  return service === 'Any' || SERVICE_PORT[service].port === traffic.port;
}

function checkPolicy(policy: Policy, traffic: Traffic): { hit: boolean; fields: FieldCheck[] } {
  const fields: FieldCheck[] = [
    { label: '源域', ok: zoneOf(traffic.srcIp) === policy.srcZone, detail: `${zoneOf(traffic.srcIp)} → ${policy.srcZone}` },
    { label: '目的域', ok: zoneOf(traffic.dstIp) === policy.dstZone, detail: `${zoneOf(traffic.dstIp)} → ${policy.dstZone}` },
    { label: '源 IP', ok: matchAddr(policy.srcAddr, traffic.srcIp), detail: policy.srcAddr },
    { label: '目的 IP', ok: matchAddr(policy.dstAddr, traffic.dstIp), detail: policy.dstAddr },
    {
      label: '协议',
      ok: protoMatches(policy.service, traffic),
      detail: policy.service === 'Any' ? '任意协议' : SERVICE_PORT[policy.service].proto,
    },
    {
      label: '端口',
      ok: portMatches(policy.service, traffic),
      detail: policy.service === 'Any' ? '任意端口' : String(SERVICE_PORT[policy.service].port),
    },
  ];
  return { hit: fields.every((field) => field.ok), fields };
}

function actionText(action: Action): string {
  return action === 'permit' ? '允许' : '拒绝';
}

function summarize(list: Policy[], traffic: Traffic): string {
  const index = list.findIndex((policy) => checkPolicy(policy, traffic).hit);
  if (index < 0) return '未命中 · 默认拒绝';
  return `命中第 ${index + 1} 条 · ${actionText(list[index].action)}`;
}

export default function FwPolicyViz() {
  const [trafficId, setTrafficId] = useState('t1');
  const [policies, setPolicies] = useState<Policy[]>(() => BASE_POLICIES.map((policy) => ({ ...policy })));
  const [draft, setDraft] = useState<Draft>({
    srcZone: 'Trust',
    dstZone: 'Untrust',
    service: 'Any',
    action: 'deny',
  });
  const [customSeq, setCustomSeq] = useState(0);
  const [orderMsg, setOrderMsg] = useState<string | null>(null);

  const traffic = TRAFFICS.find((item) => item.id === trafficId) ?? TRAFFICS[0];

  const checks = policies.map((policy) => checkPolicy(policy, traffic));
  const hitIndex = checks.findIndex((item) => item.hit);
  const evaluatedCount = hitIndex >= 0 ? hitIndex + 1 : policies.length;

  // 前 evaluatedCount 步逐条比较策略，最后一步给出最终动作
  const stepper = useStepper(evaluatedCount + 1, { interval: 1400 });
  const atFinal = stepper.index >= evaluatedCount;
  const activeIndex = atFinal ? -1 : stepper.index;

  const hitPolicy = hitIndex >= 0 ? policies[hitIndex] : null;
  const finalAction: Action = hitPolicy ? hitPolicy.action : 'deny';
  const resultColor = finalAction === 'permit' ? 'var(--ok)' : 'var(--danger)';
  const srcZone = zoneOf(traffic.srcIp);
  const dstZone = zoneOf(traffic.dstIp);

  const controls: Stepper = {
    ...stepper,
    reset: () => {
      stepper.reset();
      setPolicies(BASE_POLICIES.map((policy) => ({ ...policy })));
      setCustomSeq(0);
      setOrderMsg(null);
    },
  };

  const selectTraffic = (id: string) => {
    setTrafficId(id);
    setOrderMsg(null);
    stepper.goTo(0);
  };

  const applyCustom = () => {
    const id = -1 - customSeq;
    setPolicies((prev) => [
      {
        id,
        custom: true,
        srcAddr: 'any',
        dstAddr: 'any',
        note: '用户自定义',
        ...draft,
      },
      ...prev,
    ]);
    setCustomSeq((value) => value + 1);
    setOrderMsg(null);
    stepper.goTo(0);
  };

  const removeCustom = () => {
    setPolicies((prev) => prev.filter((policy) => !policy.custom));
    setOrderMsg(null);
    stepper.goTo(0);
  };

  const movePolicy = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= policies.length) return;
    const next = policies.slice();
    const moving = next[index];
    next[index] = next[target];
    next[target] = moving;
    const before = summarize(policies, traffic);
    const after = summarize(next, traffic);
    setPolicies(next);
    setOrderMsg(
      before === after ? `顺序已调整：${after}（结果未变化）` : `顺序调整导致结果变化：${before} → ${after}`,
    );
    stepper.goTo(0);
  };

  const rowState = (index: number): RowState => {
    if (atFinal) {
      if (hitIndex < 0) return 'missed';
      if (index === hitIndex) return 'hit';
      return index < hitIndex ? 'missed' : 'skipped';
    }
    if (index < stepper.index) return 'missed';
    if (index === stepper.index) return checks[index].hit ? 'hit' : 'checking';
    return 'pending';
  };

  const activeCheck = activeIndex >= 0 ? checks[activeIndex] : null;
  const currentFail = activeCheck ? activeCheck.fields.find((field) => !field.ok) ?? null : null;

  const pathD =
    srcZone === 'Trust'
      ? 'M 231 100 L 250 128 L 280 128 L 310 128 L 352 100'
      : 'M 352 100 L 310 128 L 280 128 L 250 128 L 231 100';
  const markerKey = atFinal ? (finalAction === 'permit' ? 'ok' : 'deny') : 'idle';

  return (
    <div>
      <div className="hstack" style={{ gap: 6 }}>
        <span className="tiny faint">测试流量</span>
        {TRAFFICS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`btn btn-sm${item.id === traffic.id ? ' btn-primary' : ''}`}
            style={{ fontSize: 10.5, padding: '4px 8px' }}
            onClick={() => selectTraffic(item.id)}
            aria-pressed={item.id === traffic.id}
            aria-label={`选择测试流量：${item.label}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="tiny mono faint" style={{ marginTop: 6 }}>
        {traffic.srcIp} → {traffic.dstIp}:{traffic.port} · {traffic.proto} · {srcZone} → {dstZone}
      </div>

      <svg
        viewBox="0 0 560 210"
        width="100%"
        role="img"
        aria-label="防火墙安全域拓扑：Trust 与 Untrust 之间的策略匹配"
        style={{ marginTop: 8 }}
      >
        <defs>
          <marker id="fw-arr-idle" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
          </marker>
          <marker id="fw-arr-ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ok)" />
          </marker>
          <marker id="fw-arr-deny" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--danger)" />
          </marker>
        </defs>

        <rect x={16} y={18} width={215} height={82} rx={12} fill="var(--accent-2-soft)" stroke="rgba(124, 156, 255, 0.4)" strokeWidth={1.3} />
        <text x={34} y={38} fontSize={11} fontWeight={700} fill="var(--accent-2)">
          Trust
        </text>
        <text x={34} y={54} fontSize={8.5} fontFamily="var(--mono)" fill="var(--text-dim)">
          192.168.1.0/24
        </text>
        <text x={34} y={76} fontSize={8.5} fill="var(--text-faint)">
          内网 PC / 服务器
        </text>

        <rect x={329} y={18} width={215} height={82} rx={12} fill="var(--warn-soft)" stroke="rgba(251, 191, 36, 0.35)" strokeWidth={1.3} />
        <text x={347} y={38} fontSize={11} fontWeight={700} fill="var(--warn)">
          Untrust
        </text>
        <text x={347} y={54} fontSize={8.5} fontFamily="var(--mono)" fill="var(--text-dim)">
          0.0.0.0/0
        </text>
        <text x={347} y={76} fontSize={8.5} fill="var(--text-faint)">
          Internet / 公网服务器
        </text>

        <path
          d={pathD}
          fill="none"
          stroke={atFinal ? resultColor : 'var(--accent)'}
          strokeWidth={2.4}
          strokeDasharray="7 5"
          opacity={0.9}
          markerEnd={`url(#fw-arr-${markerKey})`}
          style={{ transition: 'stroke 240ms ease' }}
        />

        <rect x={210} y={128} width={140} height={62} rx={12} fill="var(--surface)" stroke="var(--border-strong)" strokeWidth={1.5} />
        <text x={280} y={152} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="var(--text)">
          USG 防火墙
        </text>
        <text x={280} y={168} textAnchor="middle" fontSize={8.5} fill="var(--text-faint)">
          安全策略 · 会话表
        </text>
        <text x={280} y={202} textAnchor="middle" fontSize={8} fill="var(--text-faint)">
          报文进入防火墙后，按策略序号自上而下匹配，命中即停
        </text>
      </svg>

      <div style={{ marginTop: 10, border: '1px solid var(--border)', borderRadius: 10, overflowX: 'auto' }}>
        <div style={{ minWidth: 530 }}>
          <div style={{ display: 'grid', gridTemplateColumns: GRID_COLS }}>
            {['#', '源域 → 目的域', '源地址', '目的地址', '服务', '动作', '判定', '顺序'].map((title) => (
              <div key={title} style={headerCell}>
                {title}
              </div>
            ))}
          </div>

          {policies.map((policy, index) => {
            const check = checks[index];
            const firstFail = check.fields.find((field) => !field.ok);
            const state = rowState(index);
            const isHit = state === 'hit';
            const isChecking = state === 'checking';
            const rowColor = isHit
              ? policy.action === 'permit'
                ? 'var(--ok)'
                : 'var(--danger)'
              : isChecking
                ? 'var(--accent)'
                : 'transparent';
            const rowBg = isHit
              ? policy.action === 'permit'
                ? 'var(--ok-soft)'
                : 'var(--danger-soft)'
              : isChecking
                ? 'var(--accent-soft)'
                : 'transparent';
            const verdict =
              state === 'hit'
                ? '命中'
                : state === 'checking'
                  ? '比较中…'
                  : state === 'missed'
                    ? `✗ ${firstFail ? firstFail.label : ''}`
                    : state === 'skipped'
                      ? '已命中，跳过'
                      : '待比较';
            return (
              <div
                key={policy.id}
                title={firstFail ? `未命中：${firstFail.label}不匹配（规则 ${firstFail.detail}）` : '全部字段匹配'}
                style={{
                  display: 'grid',
                  gridTemplateColumns: GRID_COLS,
                  borderLeft: `2px solid ${rowColor}`,
                  background: rowBg,
                  opacity: state === 'skipped' || state === 'pending' ? 0.55 : 1,
                  transition: 'background 200ms ease, opacity 200ms ease',
                }}
              >
                <div style={{ ...rowCell, fontFamily: 'var(--mono)', color: policy.custom ? 'var(--accent-3)' : 'var(--text-faint)' }}>
                  {policy.custom ? '★' : index + 1}
                </div>
                <div style={{ ...rowCell, color: 'var(--text)' }}>
                  {policy.srcZone} → {policy.dstZone}
                </div>
                <div style={{ ...rowCell, fontFamily: 'var(--mono)' }}>{policy.srcAddr}</div>
                <div style={{ ...rowCell, fontFamily: 'var(--mono)' }}>{policy.dstAddr}</div>
                <div style={rowCell}>{policy.service}</div>
                <div style={rowCell}>
                  <span
                    className="badge"
                    style={{
                      fontSize: 9.5,
                      padding: '1px 6px',
                      color: policy.action === 'permit' ? 'var(--ok)' : 'var(--danger)',
                      background: policy.action === 'permit' ? 'var(--ok-soft)' : 'var(--danger-soft)',
                      borderColor: policy.action === 'permit' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)',
                    }}
                  >
                    {actionText(policy.action)}
                  </span>
                </div>
                <div style={{ ...rowCell, color: isHit ? rowColor : isChecking ? 'var(--accent)' : 'var(--text-faint)' }}>
                  {verdict}
                </div>
                <div style={{ ...rowCell, gap: 2 }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ fontSize: 10, padding: '0 5px', lineHeight: 1.6 }}
                    onClick={() => movePolicy(index, -1)}
                    disabled={index === 0}
                    aria-label={`上移第 ${index + 1} 条策略`}
                    title="上移，提前参与匹配"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ fontSize: 10, padding: '0 5px', lineHeight: 1.6 }}
                    onClick={() => movePolicy(index, 1)}
                    disabled={index === policies.length - 1}
                    aria-label={`下移第 ${index + 1} 条策略`}
                    title="下移，延后参与匹配"
                  >
                    ↓
                  </button>
                </div>
              </div>
            );
          })}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: GRID_COLS,
              borderLeft: `2px solid ${atFinal && hitIndex < 0 ? 'var(--danger)' : 'transparent'}`,
              background: atFinal && hitIndex < 0 ? 'var(--danger-soft)' : 'transparent',
            }}
          >
            <div style={{ ...rowCell, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>—</div>
            <div style={{ ...rowCell, color: 'var(--text-dim)' }}>默认策略</div>
            <div style={rowCell}>any</div>
            <div style={rowCell}>any</div>
            <div style={rowCell}>Any</div>
            <div style={rowCell}>
              <span
                className="badge"
                style={{
                  fontSize: 9.5,
                  padding: '1px 6px',
                  color: 'var(--danger)',
                  background: 'var(--danger-soft)',
                  borderColor: 'rgba(248, 113, 113, 0.3)',
                }}
              >
                拒绝
              </span>
            </div>
            <div style={{ ...rowCell, color: atFinal && hitIndex < 0 ? 'var(--danger)' : 'var(--text-faint)' }}>
              {atFinal && hitIndex < 0 ? '命中（默认）' : '默认拒绝'}
            </div>
            <div style={rowCell} />
          </div>
        </div>
      </div>

      {orderMsg ? (
        <div className="hstack" style={{ gap: 6, marginTop: 8 }} aria-live="polite">
          <span className={`badge${orderMsg.includes('未变化') ? '' : ' accent'}`} style={{ fontSize: 10.5 }}>
            顺序
          </span>
          <span className="tiny" style={{ color: 'var(--text-dim)' }}>
            {orderMsg}
          </span>
        </div>
      ) : null}

      {activeCheck && activeIndex >= 0 ? (
        <div
          style={{
            marginTop: 10,
            padding: '9px 11px',
            borderRadius: 10,
            border: `1px solid ${activeCheck.hit ? 'var(--ok)' : 'var(--accent)'}`,
            background: activeCheck.hit ? 'var(--ok-soft)' : 'var(--surface)',
          }}
          aria-live="polite"
        >
          <div className="hstack" style={{ gap: 8 }}>
            <strong style={{ fontSize: 12.5, color: activeCheck.hit ? 'var(--ok)' : 'var(--text)' }}>
              第 {activeIndex + 1} 条策略
              {activeCheck.hit ? '：全部字段匹配' : '：逐字段比较'}
            </strong>
            {currentFail ? (
              <span className="badge warn" style={{ fontSize: 10 }}>
                未命中：{currentFail.label}不匹配
              </span>
            ) : (
              <span className="badge ok" style={{ fontSize: 10 }}>
                五元组全部命中
              </span>
            )}
            <span className="tiny faint" style={{ marginLeft: 'auto' }}>
              使用控制条 ← → 可回看上一条未命中的原因
            </span>
          </div>
          <div className="hstack" style={{ gap: 5, marginTop: 7 }}>
            {activeCheck.fields.map((field) => (
              <span
                key={field.label}
                className="badge"
                title={`${field.label}：${field.detail}`}
                style={{
                  fontSize: 10,
                  padding: '1px 7px',
                  color: field.ok ? 'var(--ok)' : 'var(--danger)',
                  background: field.ok ? 'var(--ok-soft)' : 'var(--danger-soft)',
                  borderColor: field.ok ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)',
                }}
              >
                {field.label} {field.ok ? '✓' : '✗'} <span className="mono">{field.detail}</span>
              </span>
            ))}
          </div>
          <div className="tiny mono" style={{ marginTop: 6, color: 'var(--text-dim)' }}>
            报文：{traffic.srcIp} → {traffic.dstIp}:{traffic.port}（{traffic.proto}）
          </div>
        </div>
      ) : null}

      <VizControls
        stepper={controls}
        ariaLabel="防火墙策略匹配步骤控制"
        extra={
          <span className="tiny faint">
            {atFinal ? (hitIndex >= 0 ? `命中第 ${hitIndex + 1} 条` : '默认拒绝') : `比较第 ${activeIndex + 1} 条`}
          </span>
        }
      />

      {atFinal ? (
        <div
          style={{
            marginTop: 10,
            padding: '10px 12px',
            borderRadius: 10,
            border: `1px solid ${resultColor}`,
            background: finalAction === 'permit' ? 'var(--ok-soft)' : 'var(--danger-soft)',
          }}
          aria-live="polite"
        >
          <div className="hstack" style={{ gap: 8 }}>
            <strong style={{ color: resultColor, fontSize: 12.5 }}>
              {hitIndex >= 0 ? `命中策略 #${hitIndex + 1}` : '未命中任何策略'}
            </strong>
            <span
              className="badge"
              style={{
                color: resultColor,
                background: 'transparent',
                borderColor: resultColor,
              }}
            >
              最终动作：{actionText(finalAction)}
            </span>
            <span className="tiny faint" style={{ marginLeft: 'auto' }}>
              {hitPolicy ? hitPolicy.note : '默认策略：拒绝'}
            </span>
          </div>
          <div className="tiny mono" style={{ marginTop: 6, color: 'var(--text-dim)' }}>
            {traffic.srcIp} → {traffic.dstIp}:{traffic.port}（{traffic.proto}）
          </div>
          <div className="hstack" style={{ gap: 5, marginTop: 7 }}>
            {hitPolicy ? (
              checkPolicy(hitPolicy, traffic).fields.map((field) => (
                <span
                  key={field.label}
                  className="badge"
                  title={`${field.label}：${field.detail}`}
                  style={{
                    fontSize: 10,
                    padding: '1px 7px',
                    color: 'var(--ok)',
                    background: 'var(--ok-soft)',
                    borderColor: 'rgba(74, 222, 128, 0.3)',
                  }}
                >
                  {field.label} ✓
                </span>
              ))
            ) : (
              <span className="badge warn" style={{ fontSize: 10 }}>
                默认策略：拒绝
              </span>
            )}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 12, padding: '10px 12px', border: '1px dashed var(--border-strong)', borderRadius: 10 }}>
        <div className="hstack" style={{ gap: 6, marginBottom: 7 }}>
          <span className="tiny" style={{ fontWeight: 650, color: 'var(--text-dim)' }}>
            新增自定义策略（插入到策略表最前，可用 ↑ ↓ 调整顺序）
          </span>
          {policies.some((policy) => policy.custom) ? <span className="badge accent">已插入</span> : null}
        </div>
        <div className="hstack" style={{ gap: 6 }}>
          <select
            value={draft.srcZone}
            onChange={(event) => setDraft((prev) => ({ ...prev, srcZone: event.target.value as Zone }))}
            style={selectStyle}
            aria-label="自定义策略源安全域"
          >
            <option value="Trust">Trust</option>
            <option value="Untrust">Untrust</option>
          </select>
          <span className="tiny faint">→</span>
          <select
            value={draft.dstZone}
            onChange={(event) => setDraft((prev) => ({ ...prev, dstZone: event.target.value as Zone }))}
            style={selectStyle}
            aria-label="自定义策略目的安全域"
          >
            <option value="Trust">Trust</option>
            <option value="Untrust">Untrust</option>
          </select>
          <select
            value={draft.service}
            onChange={(event) => setDraft((prev) => ({ ...prev, service: event.target.value as Service }))}
            style={selectStyle}
            aria-label="自定义策略服务"
          >
            <option value="Any">任意服务</option>
            <option value="HTTP">HTTP</option>
            <option value="HTTPS">HTTPS</option>
            <option value="DNS">DNS</option>
            <option value="SSH">SSH</option>
          </select>
          <select
            value={draft.action}
            onChange={(event) => setDraft((prev) => ({ ...prev, action: event.target.value as Action }))}
            style={selectStyle}
            aria-label="自定义策略动作"
          >
            <option value="permit">允许</option>
            <option value="deny">拒绝</option>
          </select>
          <button type="button" className="btn btn-sm btn-primary" onClick={applyCustom} aria-label="将自定义策略插入到策略表最前">
            插入最前
          </button>
          {policies.some((policy) => policy.custom) ? (
            <button type="button" className="btn btn-sm btn-danger" onClick={removeCustom} aria-label="移除全部自定义策略">
              移除自定义
            </button>
          ) : null}
        </div>
        <div className="tiny faint" style={{ marginTop: 6 }}>
          插入「Trust → Untrust / 任意服务 / 拒绝」后再用 ↑ ↓ 把它移到 HTTPS 允许策略之后，观察匹配结果从「拒绝」变为「允许」。
        </div>
      </div>

      <div className="viz-legend">
        <span>
          <span className="dot" style={{ background: 'var(--ok)' }} /> 允许
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--danger)' }} /> 拒绝
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--accent-3)' }} /> ★ 自定义策略
        </span>
      </div>

      <div className="viz-note" style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 10 }} aria-live="polite">
        当前测试流量：{traffic.srcIp} → {traffic.dstIp}:{traffic.port}（{traffic.proto}），域间 {srcZone} → {dstZone}。
        {atFinal
          ? hitIndex >= 0
            ? `按序号自上而下匹配，第 ${hitIndex + 1} 条${policies[hitIndex].custom ? '（自定义）' : ''}策略命中，动作：${actionText(finalAction)}，后续策略不再检查。`
            : '所有策略均未命中，执行默认策略：拒绝（default deny）。'
          : activeIndex >= 0
            ? `正在比较第 ${activeIndex + 1} 条策略${currentFail ? `：${currentFail.label}不匹配（规则 ${currentFail.detail}）` : '：全部字段匹配'}。可用「上一步」回看前一条为什么没命中。`
            : '等待匹配。'}
      </div>
    </div>
  );
}
