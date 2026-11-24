import { useEffect, useState } from 'react';
import { useStepper } from '../useStepper';
import type { Stepper } from '../useStepper';
import { VizControls } from '../VizControls';

export const meta = {
  key: 'nat-ipsec',
  title: 'NAT 与 IPsec 协商',
  subtitle: '地址转换 + IKE/ESP',
  order: 23,
};

type Tab = 'nat' | 'ipsec';
type NatDir = 'src' | 'dst';
type IpsecFail = 'none' | 'proposal' | 'selector' | 'natt';

type NatStep = {
  title: string;
  desc: string;
  src: string;
  dst: string;
  path: string;
  table: string;
};

type NatScenario = {
  id: NatDir;
  label: string;
  left: { name: string; ip: string; port: string };
  right: { name: string; ip: string; port: string };
  fwLabel: string;
  steps: NatStep[];
};

type IpsecStep = {
  title: string;
  desc: string;
  chips: string[];
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'nat', label: 'NAT 地址转换' },
  { id: 'ipsec', label: 'IPsec 协商' },
];

const NAT_SCENARIOS: Record<NatDir, NatScenario> = {
  src: {
    id: 'src',
    label: '源 NAT',
    left: { name: 'PC', ip: '192.168.1.10', port: ':34567' },
    right: { name: 'Server', ip: '202.100.1.1', port: ':443' },
    fwLabel: '源 NAT（NAPT）',
    steps: [
      {
        title: '① 私网主机发起连接',
        desc: 'PC 用私网地址 192.168.1.10:34567 访问公网服务器 202.100.1.1:443，报文先到达防火墙 Trust 域。',
        src: '192.168.1.10:34567',
        dst: '202.100.1.1:443',
        path: 'M 80 102 L 215 102',
        table: '尚未创建',
      },
      {
        title: '② 出方向源 NAT（NAPT）',
        desc: '防火墙把源地址转换为公网口地址并分配唯一端口 40001，生成 NAT 会话表项后转发到 Untrust。',
        src: '200.1.1.1:40001',
        dst: '202.100.1.1:443',
        path: 'M 215 102 L 480 102',
        table: '192.168.1.10:34567 ↔ 200.1.1.1:40001',
      },
      {
        title: '③ 回程报文按 NAT 表转换回来',
        desc: '服务器回包的目的地址是 200.1.1.1:40001；防火墙查 NAT 表把目的还原为 192.168.1.10:34567，再交给内网 PC。表项老化前该映射才能持续复用。',
        src: '202.100.1.1:443',
        dst: '192.168.1.10:34567',
        path: 'M 480 102 L 215 102 L 80 102',
        table: '命中表项，目的 200.1.1.1:40001 → 192.168.1.10:34567',
      },
    ],
  },
  dst: {
    id: 'dst',
    label: '目的 NAT',
    left: { name: 'Server', ip: '192.168.1.10', port: ':8080' },
    right: { name: 'PC', ip: '202.100.1.9', port: ':51820' },
    fwLabel: '目的 NAT（NAT Server）',
    steps: [
      {
        title: '① 外网主机访问公网地址',
        desc: '外网 PC 访问防火墙公网地址 200.1.1.1:80，报文进入 Untrust 域，此时目的地址仍是公网地址。',
        src: '202.100.1.9:51820',
        dst: '200.1.1.1:80',
        path: 'M 480 102 L 345 102',
        table: '尚未创建',
      },
      {
        title: '② 入方向目的 NAT',
        desc: '命中 NAT Server 映射，防火墙把目的地址转换为内网服务器 192.168.1.10:8080，记录会话表项后转发到 Trust。',
        src: '202.100.1.9:51820',
        dst: '192.168.1.10:8080',
        path: 'M 345 102 L 215 102 L 80 102',
        table: '202.100.1.9:51820 ↔ 192.168.1.10:8080（公网 200.1.1.1:80 → 私网）',
      },
      {
        title: '③ 回程报文按 NAT 表还原源地址',
        desc: '服务器回包源地址是 192.168.1.10:8080，防火墙按会话表把源地址还原为公网地址 200.1.1.1:80，外网 PC 才认为回包来自原先访问的地址。',
        src: '200.1.1.1:80',
        dst: '202.100.1.9:51820',
        path: 'M 80 102 L 215 102 L 345 102 L 480 102',
        table: '命中表项，源 192.168.1.10:8080 → 200.1.1.1:80',
      },
    ],
  },
};

const IPSEC_STEPS: IpsecStep[] = [
  {
    title: '阶段一：协商 IKE SA',
    desc: '双方用 IKE 提议协商保护 IKE 本身的 SA：加密算法、哈希算法、DH 组与认证方式。主模式共 6 个报文，野蛮模式 3 个报文。',
    chips: ['加密 AES-256', '哈希 SHA-256', 'DH Group 14', '认证 预共享密钥'],
  },
  {
    title: '阶段一完成：IKE SA 建立',
    desc: '密钥交换与身份认证完成，双方生成 IKE SA（含 IKE SPI 与密钥）。后续 IPsec SA 的协商报文都在该隧道内加密传输。',
    chips: ['IKE SA 已建立', '双向 SPI', '身份已认证'],
  },
  {
    title: '阶段二：协商 IPsec SA（快速模式）',
    desc: '在 IKE SA 保护下协商 ESP SA：加密与认证算法、入/出方向 SPI、生存周期。协商完成后即可用 ESP 封装业务数据。',
    chips: ['ESP', 'AES-256 + SHA-256', '入/出 SPI', 'SA 生存周期'],
  },
  {
    title: '数据面：ESP 封装与转发',
    desc: '原始 IP 包被 ESP 加密并计算完整性校验值（ICV），对端收到后先校验再解密，还原出内层原始报文。',
    chips: ['ESP 头', '加密载荷', 'ESP 尾', '认证数据'],
  },
];

const FAIL_STAGE: Record<Exclude<IpsecFail, 'none'>, number> = {
  proposal: 0,
  selector: 2,
  natt: 3,
};

const FAIL_INFO: Record<
  Exclude<IpsecFail, 'none'>,
  { label: string; stage: string; symptom: string; conclusion: string }
> = {
  proposal: {
    label: 'IKE 提议不匹配',
    stage: '停在阶段一：IKE SA 协商',
    symptom:
      '发起方发送 SA 提议，响应方没有任何可接受的提议，回 NO_PROPOSAL_CHOSEN；IKE SA 未能建立，阶段二无法开始。',
    conclusion:
      '排查：两端 ike proposal 的加密 / 哈希 / DH / 认证方式必须至少有一组完全一致；确认 ike peer 引用了匹配的 proposal 与预共享密钥。',
  },
  selector: {
    label: '感兴趣流不匹配',
    stage: '停在阶段二：IPsec SA 协商',
    symptom:
      'IKE SA 已建立，但快速模式中两端流量选择器（ACL）不镜像，对端回 TS_UNACCEPTABLE，IPsec SA 协商失败。',
    conclusion:
      '排查：两端 ACL 的源 / 目的网段、协议、端口需互为镜像；经过 NAT 时要匹配 NAT 后的地址，并确认两端 ACL 的 permit 规则一致。',
  },
  natt: {
    label: 'NAT-T 未启用',
    stage: '停在数据面：ESP 封装与转发',
    symptom:
      '阶段一、阶段二都成功，但设备位于 NAT 之后且未启用 NAT-T：ESP 没有端口，NAPT 无法区分多条会话，报文被丢弃或只通一条。',
    conclusion:
      '排查：两端开启 NAT-T 并放行 UDP 4500；确认 IKE 的 NAT-D 载荷检测到地址变化，ESP 改用 UDP 4500 封装穿越 NAT。',
  },
};

const IKE_MSGS: { from: 'init' | 'resp'; label: string; minStep: number }[] = [
  { from: 'init', label: 'SA 提议：AES-256 / SHA-256 / DH14', minStep: 0 },
  { from: 'resp', label: '选择提议', minStep: 0 },
  { from: 'init', label: 'KE + Nonce', minStep: 0 },
  { from: 'resp', label: 'KE + Nonce', minStep: 0 },
  { from: 'init', label: 'ID + HASH（身份认证）', minStep: 0 },
  { from: 'resp', label: 'ID + HASH（身份认证）', minStep: 0 },
  { from: 'init', label: 'IPsec SA 提议 + Nonce', minStep: 2 },
  { from: 'resp', label: '确认 SA / 双向 SPI', minStep: 2 },
];

const ESP_FIELDS = [
  { label: '原 IP 头', sub: '源 / 目的 IP', w: 95, fill: 'var(--accent-2-soft)', stroke: 'var(--accent-2)' },
  { label: 'ESP 头', sub: 'SPI + 序号', w: 78, fill: 'var(--accent-soft)', stroke: 'var(--accent)' },
  { label: '加密载荷', sub: '原 IP + TCP + 数据', w: 165, fill: 'rgba(192, 132, 252, 0.16)', stroke: 'var(--accent-3)' },
  { label: 'ESP 尾', sub: '填充 + Next Header', w: 92, fill: 'var(--accent-soft)', stroke: 'var(--accent)' },
  { label: 'ESP 认证', sub: 'ICV 完整性校验', w: 86, fill: 'var(--ok-soft)', stroke: 'var(--ok)' },
];

const ESP_BOXES = (() => {
  let cursor = 22;
  return ESP_FIELDS.map((field) => {
    const box = { ...field, x: cursor };
    cursor += field.w;
    return box;
  });
})();

const cardStyle = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  minWidth: 0,
};

export default function NatIpsecViz() {
  const [tab, setTab] = useState<Tab>('nat');
  const [natDir, setNatDir] = useState<NatDir>('src');
  const [fail, setFail] = useState<IpsecFail>('none');

  const scenario = NAT_SCENARIOS[natDir];
  const natStepper = useStepper(scenario.steps.length);
  const natStep = Math.min(natStepper.index, scenario.steps.length - 1);
  const nat = scenario.steps[natStep];

  const ipsecStepper = useStepper(IPSEC_STEPS.length);
  const failLimit = fail === 'none' ? IPSEC_STEPS.length - 1 : FAIL_STAGE[fail];
  const ipsecStep = Math.min(ipsecStepper.index, failLimit);
  const ipsec = IPSEC_STEPS[ipsecStep];

  useEffect(() => {
    if (ipsecStepper.index > failLimit) {
      ipsecStepper.goTo(failLimit);
    } else if (ipsecStepper.playing && ipsecStepper.index >= failLimit) {
      ipsecStepper.pause();
    }
  }, [ipsecStepper.index, ipsecStepper.playing, ipsecStepper.goTo, ipsecStepper.pause, failLimit]);

  const ipsecControl: Stepper = {
    ...ipsecStepper,
    index: ipsecStep,
    count: failLimit + 1,
    isFirst: ipsecStep === 0,
    isLast: ipsecStep >= failLimit,
    next: () => {
      if (ipsecStep < failLimit) ipsecStepper.next();
    },
    toggle: () => {
      if (ipsecStep >= failLimit) ipsecStepper.goTo(0);
      ipsecStepper.toggle();
    },
    goTo: (target: number) => ipsecStepper.goTo(Math.min(target, failLimit)),
  };

  const selectTab = (next: Tab) => {
    if (next === tab) return;
    setTab(next);
    natStepper.pause();
    ipsecStepper.pause();
  };

  const selectNatDir = (dir: NatDir) => {
    setNatDir(dir);
    natStepper.goTo(0);
  };

  const selectFail = (value: IpsecFail) => {
    setFail(value);
    if (value === 'none') {
      ipsecStepper.pause();
    } else {
      ipsecStepper.goTo(FAIL_STAGE[value]);
    }
  };

  const natTableText = nat.table;

  const ikeStatus = fail === 'proposal' ? '协商失败' : ipsecStep >= 1 ? '已建立' : '协商中';
  const saStatus = fail === 'selector' ? '协商失败' : ipsecStep >= 2 ? '已建立' : '未开始';
  const statusColor = (status: string) =>
    status === '已建立' ? 'var(--ok)' : status === '协商失败' ? 'var(--danger)' : 'var(--text-faint)';
  const statusBg = (status: string) =>
    status === '已建立' ? 'var(--ok-soft)' : status === '协商失败' ? 'var(--danger-soft)' : 'var(--surface-2)';

  return (
    <div>
      <div className="tabs" role="tablist" aria-label="NAT 与 IPsec 子视图">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`tab${tab === item.id ? ' active' : ''}`}
            onClick={() => selectTab(item.id)}
            aria-label={`切换到${item.label}子视图`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'nat' ? (
        <div style={{ marginTop: 12 }}>
          <div className="hstack" style={{ gap: 6, marginBottom: 8 }}>
            <span className="tiny faint">NAT 方向</span>
            <button
              type="button"
              className={`btn btn-sm${natDir === 'src' ? ' btn-primary' : ''}`}
              onClick={() => selectNatDir('src')}
              aria-pressed={natDir === 'src'}
              aria-label="切换到源 NAT 演示"
            >
              源 NAT（SNAT）
            </button>
            <button
              type="button"
              className={`btn btn-sm${natDir === 'dst' ? ' btn-primary' : ''}`}
              onClick={() => selectNatDir('dst')}
              aria-pressed={natDir === 'dst'}
              aria-label="切换到目的 NAT 演示"
            >
              目的 NAT（DNAT）
            </button>
            <span className="tiny faint" style={{ marginLeft: 'auto' }}>
              {scenario.fwLabel}
            </span>
          </div>

          <svg
            viewBox="0 0 560 210"
            width="100%"
            role="img"
            aria-label={`${scenario.label}拓扑：主机与公网服务器之间的地址转换路径`}
          >
            <line x1={140} y1={102} x2={215} y2={102} stroke="var(--border-strong)" strokeWidth={1.6} />
            <line x1={345} y1={102} x2={420} y2={102} stroke="var(--border-strong)" strokeWidth={1.6} />

            <circle key={`nat-${natDir}-${natStep}`} r={4.5} fill="var(--accent)">
              <animateMotion dur="1.9s" repeatCount="indefinite" path={nat.path} />
            </circle>

            <g>
              <rect x={20} y={70} width={120} height={64} rx={11} fill="var(--surface)" stroke="var(--accent-2)" strokeWidth={1.4} />
              <text x={80} y={94} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--text)">
                {scenario.left.name}
              </text>
              <text x={80} y={110} textAnchor="middle" fontSize={7.5} fontFamily="var(--mono)" fill="var(--text-faint)">
                {scenario.left.ip}
              </text>
              <text x={80} y={122} textAnchor="middle" fontSize={7.5} fontFamily="var(--mono)" fill="var(--text-faint)">
                {scenario.left.port}
              </text>
            </g>

            <g>
              <rect
                x={215}
                y={45}
                width={130}
                height={110}
                rx={12}
                fill="var(--surface)"
                stroke={natStep >= 1 ? 'var(--accent)' : 'var(--border-strong)'}
                strokeWidth={natStep >= 1 ? 2 : 1.5}
                style={{ transition: 'stroke 240ms ease' }}
              />
              <text x={280} y={88} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="var(--text)">
                USG 防火墙
              </text>
              <text x={280} y={106} textAnchor="middle" fontSize={8.5} fill="var(--text-faint)">
                {scenario.fwLabel}
              </text>
              <text
                x={280}
                y={124}
                textAnchor="middle"
                fontSize={7.5}
                fontFamily="var(--mono)"
                fill={natStep >= 1 ? 'var(--accent)' : 'var(--text-faint)'}
              >
                {natStep >= 1 ? 'NAT 表项已创建' : 'NAT 表：空'}
              </text>
            </g>

            <g>
              <rect x={420} y={70} width={120} height={64} rx={11} fill="var(--surface)" stroke="var(--warn)" strokeWidth={1.4} />
              <text x={480} y={94} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--text)">
                {scenario.right.name}
              </text>
              <text x={480} y={110} textAnchor="middle" fontSize={7.5} fontFamily="var(--mono)" fill="var(--text-faint)">
                {scenario.right.ip}
              </text>
              <text x={480} y={122} textAnchor="middle" fontSize={7.5} fontFamily="var(--mono)" fill="var(--text-faint)">
                {scenario.right.port}
              </text>
            </g>

            <text x={177} y={158} textAnchor="middle" fontSize={7.5} fill="var(--text-faint)">
              Trust
            </text>
            <text x={382} y={158} textAnchor="middle" fontSize={7.5} fill="var(--text-faint)">
              Untrust
            </text>
            <text x={280} y={196} textAnchor="middle" fontSize={8} fill="var(--text-faint)">
              圆点表示当前报文位置，方向随步骤变化
            </text>
          </svg>

          <div className="block-kv" style={{ marginTop: 10 }}>
            <div className="kv-item">
              <div className="k">源 IP : 端口</div>
              <div className="v mono" style={{ fontSize: 12 }}>
                {nat.src}
              </div>
            </div>
            <div className="kv-item">
              <div className="k">目的 IP : 端口</div>
              <div className="v mono" style={{ fontSize: 12 }}>
                {nat.dst}
              </div>
            </div>
            <div className="kv-item">
              <div className="k">NAT 会话表项</div>
              <div className="v mono" style={{ fontSize: 11 }}>
                {natTableText}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 10,
              padding: '9px 11px',
              borderRadius: 9,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: 12,
              lineHeight: 1.7,
              color: 'var(--text-dim)',
            }}
          >
            <strong style={{ color: 'var(--text)' }}>{nat.title}</strong> —— {nat.desc}
          </div>

          <VizControls
            stepper={natStepper}
            ariaLabel="NAT 地址转换步骤控制"
            extra={<span className="tiny faint">{nat.title}</span>}
          />

          <div className="viz-note" style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 10 }} aria-live="polite">
            {natDir === 'src'
              ? '源 NAT：去程改写源地址并创建表项，回程必须按同一表项把目的地址还原，否则内网主机收不到回包。'
              : '目的 NAT：入方向改写目的地址并创建表项，回程必须按表项把源地址还原为公网地址，否则外网主机会丢弃回包。'}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <div className="hstack" style={{ gap: 6, marginBottom: 8 }}>
            <span className="tiny faint">故障注入</span>
            {(
              [
                { id: 'none', label: '正常协商' },
                { id: 'proposal', label: '提议不匹配' },
                { id: 'selector', label: '感兴趣流不匹配' },
                { id: 'natt', label: 'NAT-T 未启用' },
              ] as { id: IpsecFail; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`btn btn-sm${fail === item.id ? ' btn-primary' : ''}`}
                style={{ fontSize: 10.5, padding: '4px 8px' }}
                onClick={() => selectFail(item.id)}
                aria-pressed={fail === item.id}
                aria-label={`切换故障场景：${item.label}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="hstack" style={{ gap: 5, marginBottom: 8 }}>
            <span className="badge">本端 IKE 提议</span>
            {IPSEC_STEPS[0].chips.map((chip) => (
              <span key={chip} className="badge" style={{ fontSize: 10 }}>
                {chip}
              </span>
            ))}
            {fail === 'proposal' ? (
              <span className="badge" style={{ fontSize: 10, color: 'var(--danger)', background: 'var(--danger-soft)' }}>
                对端：AES-128 / SHA-1 / DH2 · 无交集
              </span>
            ) : null}
          </div>

          <svg viewBox="0 0 560 300" width="100%" role="img" aria-label="IKE 阶段一与阶段二协商报文时序">
            <defs>
              <marker id="ike-arr-init" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-2)" />
              </marker>
              <marker id="ike-arr-resp" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
              </marker>
            </defs>

            <line x1={120} y1={38} x2={120} y2={268} stroke="var(--border-strong)" strokeWidth={1.5} strokeDasharray="5 4" />
            <line x1={450} y1={38} x2={450} y2={268} stroke="var(--border-strong)" strokeWidth={1.5} strokeDasharray="5 4" />
            <text x={120} y={28} textAnchor="middle" fontSize={10} fontWeight={650} fill="var(--accent-2)">
              发起方
            </text>
            <text x={450} y={28} textAnchor="middle" fontSize={10} fontWeight={650} fill="var(--accent)">
              响应方
            </text>

            {IKE_MSGS.map((message, index) => {
              const y = 52 + index * 28;
              const visible = ipsecStep >= message.minStep;
              const fromInit = message.from === 'init';
              const color = fromInit ? 'var(--accent-2)' : 'var(--accent)';
              return (
                <g key={`${message.from}-${index}`} opacity={visible ? 1 : 0.2} style={{ transition: 'opacity 220ms ease' }}>
                  <line
                    x1={fromInit ? 121 : 449}
                    y1={y}
                    x2={fromInit ? 449 : 121}
                    y2={y}
                    stroke={color}
                    strokeWidth={1.5}
                    markerEnd={`url(#ike-arr-${message.from})`}
                  />
                  <text x={285} y={y - 4} textAnchor="middle" fontSize={8} fill="var(--text-dim)">
                    {message.label}
                  </text>
                </g>
              );
            })}

            <text x={285} y={291} textAnchor="middle" fontSize={8} fill="var(--text-faint)">
              1–6 为阶段一 IKE SA（主模式）；7–8 为阶段二快速模式（IPsec SA）
            </text>
          </svg>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <div style={cardStyle}>
              <div className="hstack" style={{ gap: 6 }}>
                <strong style={{ fontSize: 12 }}>阶段一 IKE SA</strong>
                <span
                  className="badge"
                  style={{ fontSize: 9.5, color: statusColor(ikeStatus), background: statusBg(ikeStatus), borderColor: 'transparent' }}
                >
                  {ikeStatus}
                </span>
              </div>
              <div className="tiny mono" style={{ marginTop: 6, color: 'var(--text-dim)' }}>
                AES-256 · SHA-256 · DH14 · PSK
              </div>
              <div className="tiny mono" style={{ marginTop: 3, color: 'var(--text-faint)' }}>
                SPI 0x8f2a… ↔ 0x6d1c… · 86400s
              </div>
            </div>
            <div style={cardStyle}>
              <div className="hstack" style={{ gap: 6 }}>
                <strong style={{ fontSize: 12 }}>阶段二 IPsec SA</strong>
                <span
                  className="badge"
                  style={{ fontSize: 9.5, color: statusColor(saStatus), background: statusBg(saStatus), borderColor: 'transparent' }}
                >
                  {saStatus}
                </span>
              </div>
              <div className="tiny mono" style={{ marginTop: 6, color: 'var(--text-dim)' }}>
                ESP · AES-256 · SHA-256
              </div>
              <div className="tiny mono" style={{ marginTop: 3, color: 'var(--text-faint)' }}>
                SPI 入 0x1a2b… / 出 0x3c4d… · 3600s
              </div>
            </div>
          </div>

          {fail !== 'none' ? (
            <div
              style={{
                marginTop: 10,
                padding: '9px 11px',
                borderRadius: 9,
                border: '1px solid var(--danger)',
                background: 'var(--danger-soft)',
              }}
              aria-live="polite"
            >
              <div className="hstack" style={{ gap: 8 }}>
                <strong style={{ fontSize: 12.5, color: 'var(--danger)' }}>✗ {FAIL_INFO[fail].label}</strong>
                <span className="badge" style={{ fontSize: 9.5, color: 'var(--danger)', background: 'transparent' }}>
                  {FAIL_INFO[fail].stage}
                </span>
              </div>
              <div className="tiny" style={{ marginTop: 5, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                {FAIL_INFO[fail].symptom}
              </div>
              <div className="tiny" style={{ marginTop: 4, color: 'var(--text)', lineHeight: 1.7 }}>
                排查结论：{FAIL_INFO[fail].conclusion}
              </div>
            </div>
          ) : null}

          <div
            style={{
              marginTop: 10,
              padding: '9px 11px',
              borderRadius: 9,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            <div className="hstack" style={{ gap: 8 }}>
              <span className="badge accent">
                步骤 {ipsecStep + 1} / {IPSEC_STEPS.length}
              </span>
              <strong style={{ fontSize: 12.5 }}>{ipsec.title}</strong>
            </div>
            <div className="tiny" style={{ marginTop: 5, color: 'var(--text-dim)', lineHeight: 1.7 }}>
              {ipsec.desc}
            </div>
            <div className="hstack" style={{ gap: 5, marginTop: 7 }}>
              {ipsec.chips.map((chip) => (
                <span key={chip} className="badge" style={{ fontSize: 10 }}>
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="tiny" style={{ color: 'var(--text-dim)', fontWeight: 650, marginBottom: 4 }}>
              ESP 封装格式（传输模式）
            </div>
            <svg viewBox="0 0 560 110" width="100%" role="img" aria-label="ESP 封装字段：原 IP 头、ESP 头、加密载荷、ESP 尾、认证数据">
              <g opacity={ipsecStep >= 3 ? 1 : 0.42} style={{ transition: 'opacity 240ms ease' }}>
                {ESP_BOXES.map((box) => (
                  <g key={box.label}>
                    <rect x={box.x} y={30} width={box.w} height={44} rx={5} fill={box.fill} stroke={box.stroke} strokeWidth={1.3} />
                    <text x={box.x + box.w / 2} y={50} textAnchor="middle" fontSize={8.5} fontWeight={650} fill="var(--text)">
                      {box.label}
                    </text>
                    <text x={box.x + box.w / 2} y={63} textAnchor="middle" fontSize={6.8} fill="var(--text-dim)">
                      {box.sub}
                    </text>
                  </g>
                ))}
              </g>
              <text
                x={280}
                y={18}
                textAnchor="middle"
                fontSize={8}
                fill={fail === 'natt' ? 'var(--danger)' : 'var(--text-faint)'}
              >
                {fail === 'natt'
                  ? 'NAT-T 未启用：ESP 外没有 UDP 4500，经 NAT 时被丢弃'
                  : '加密 + 认证；NAT-T 场景下整个 ESP 之外再套一层 UDP:4500'}
              </text>
            </svg>
          </div>

          <VizControls
            stepper={ipsecControl}
            ariaLabel="IPsec 协商步骤控制"
            extra={<span className="tiny faint">{fail === 'none' ? '正常协商' : FAIL_INFO[fail].label}</span>}
          />

          <div className="viz-note" style={{ borderLeft: '2px solid var(--accent-3)', paddingLeft: 10 }} aria-live="polite">
            当前步骤 {ipsecStep + 1}「{ipsec.title}」。为什么需要 NAT-T：ESP 加密后没有 TCP/UDP 端口，传统 NAPT
            无法为多台内网主机的 IPsec 会话做端口复用，部分设备还会直接丢弃 ESP。 NAT-T 用 UDP 4500 封装 ESP，并通过
            IKE 中的 NAT-D 载荷检测 NAT 的存在与地址变化，让 IPsec 能穿过 NAT。
          </div>
        </div>
      )}
    </div>
  );
}
