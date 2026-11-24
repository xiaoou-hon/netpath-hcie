import { useState } from 'react';
import { useStepper } from '../useStepper';
import { VizControls } from '../VizControls';

export const meta = {
  key: 'wlan-onboarding',
  title: 'WLAN AP 上线与终端关联',
  subtitle: 'CAPWAP 上线 + 终端入网',
  order: 21,
};

type Track = 'capwap' | 'client';
type LinkKey = 'dhcp' | 'capwap' | 'wireless';

type Stage = {
  id: string;
  track: Track;
  title: string;
  packets: string[];
  faults: string[];
  link: LinkKey;
};

const STAGES: Stage[] = [
  {
    id: 'ap-discover',
    track: 'capwap',
    title: 'AP 上电，寻找 AC',
    packets: ['DHCP Discover（可带 Option 43）', 'DNS 查询 AC 域名（可选）', 'CAPWAP Discovery Request（广播/单播 UDP 5246）'],
    faults: ['AP 未拿到管理 IP：接入 VLAN、端口放行、DHCP 地址池耗尽', 'Option 43 未配置或格式错误，AP 不知道 AC 地址'],
    link: 'dhcp',
  },
  {
    id: 'ap-ip',
    track: 'capwap',
    title: 'AP 获取管理 IP',
    packets: ['DHCP Offer / Request / ACK', 'AP 获得管理 IP、掩码、网关'],
    faults: ['AP 与 AC 跨网段却缺少路由，AC 地址不可达', '管理 VLAN 被 ACL 拦截，CAPWAP 端口不通'],
    link: 'dhcp',
  },
  {
    id: 'ac-find',
    track: 'capwap',
    title: '建立 CAPWAP 发现连接',
    packets: ['Discovery Request（UDP 5246）', 'Discovery Response（携带 AC 优先级 / 可用性）'],
    faults: ['AC 未指定源地址（capwap source interface）', 'AC 与 AP 版本差异过大，发现报文被丢弃'],
    link: 'capwap',
  },
  {
    id: 'dtls',
    track: 'capwap',
    title: 'DTLS 建链与控制隧道',
    packets: ['Join Request', 'DTLS 握手（证书校验、密钥协商）', 'Join Response'],
    faults: ['证书不受信任或已过期 → DTLS 握手失败', '设备时间不同步导致证书校验失败', 'AC 未开启 CAPWAP 服务'],
    link: 'capwap',
  },
  {
    id: 'config',
    track: 'capwap',
    title: '配置下发',
    packets: ['Configuration Update Request', 'WLAN / AP 组 / 射频 / 信道功率配置', 'Configuration Update Response'],
    faults: ['AP 版本与 AC 不匹配，镜像升级失败或反复重启', 'AP 组绑定错误，SSID 未下发到该 AP'],
    link: 'capwap',
  },
  {
    id: 'ap-online',
    track: 'capwap',
    title: 'AP 上线（normal）',
    packets: ['CAPWAP 控制隧道保持（Echo 心跳）', '数据隧道建立（集中转发时）'],
    faults: ['AP 频繁掉线：心跳超时、链路质量差、供电不足', 'License 不足，AP 无法上线'],
    link: 'capwap',
  },
  {
    id: 'beacon',
    track: 'client',
    title: 'Beacon 帧发现网络',
    packets: ['Beacon（SSID / BSSID / 信道 / 安全能力）', '默认约 100ms 一帧'],
    faults: ['隐藏 SSID 导致终端搜不到', '信道干扰严重、发射功率过低'],
    link: 'wireless',
  },
  {
    id: 'probe',
    track: 'client',
    title: 'Probe 请求 / 响应',
    packets: ['Probe Request（终端主动扫描）', 'Probe Response（AP 回应能力集）'],
    faults: ['终端只扫描 5GHz，而 AP 仅开 2.4GHz', '射频被关闭或 AP 处于信道调优状态'],
    link: 'wireless',
  },
  {
    id: 'auth',
    track: 'client',
    title: '802.11 认证',
    packets: ['Authentication Request', 'Authentication Response（开放系统 / 共享密钥）'],
    faults: ['认证算法不一致（开放 vs 共享密钥）', '终端安全配置与 SSID 不匹配'],
    link: 'wireless',
  },
  {
    id: 'assoc',
    track: 'client',
    title: '关联',
    packets: ['Association Request（能力集、支持的速率）', 'Association Response（AID 分配）'],
    faults: ['关联被拒：最大接入数已满、MAC 黑名单', '安全模板不匹配，关联后立即被踢下线'],
    link: 'wireless',
  },
  {
    id: 'handshake',
    track: 'client',
    title: '四次握手与加密',
    packets: ['EAPOL-Key 1/4（ANonce）', 'EAPOL-Key 2/4（SNonce + MIC）', 'EAPOL-Key 3/4（GTK 加密下发）', 'EAPOL-Key 4/4（确认）'],
    faults: ['密码错误 → 四次握手失败，终端反复重连', 'RADIUS / 认证服务器不可达（企业级认证）'],
    link: 'wireless',
  },
  {
    id: 'client-dhcp',
    track: 'client',
    title: '终端获取业务地址',
    packets: ['DHCP Discover / Offer / Request / ACK', '获取业务 VLAN 的 IP 与网关、DNS'],
    faults: ['业务 VLAN 未放行到 AP 上行口', 'DHCP 地址池耗尽或中继配置错误'],
    link: 'capwap',
  },
  {
    id: 'online',
    track: 'client',
    title: '上网（业务转发）',
    packets: ['业务数据（本地转发 / 隧道转发至 AC）', 'ACL / 安全策略 / NAT 生效'],
    faults: ['能连上但不能上网：网关、路由、NAT 或策略问题', '隧道转发时 AC 带宽或 License 不足'],
    link: 'capwap',
  },
];

const CAPWAP_STAGES = STAGES.filter((s) => s.track === 'capwap');
const CLIENT_STAGES = STAGES.filter((s) => s.track === 'client');

const TAB_LABEL: Record<Track, string> = {
  capwap: 'CAPWAP 上线',
  client: '终端接入',
};

const LINK_COLORS: Record<LinkKey, string> = {
  dhcp: 'var(--ok)',
  capwap: 'var(--accent-2)',
  wireless: 'var(--accent-3)',
};

function isLinkActive(stage: Stage, key: LinkKey): boolean {
  if (stage.link === key) return true;
  return stage.id === 'online';
}

export default function WlanOnboardingViz() {
  const [tab, setTab] = useState<Track>('capwap');
  const capwapStepper = useStepper(CAPWAP_STAGES.length);
  const clientStepper = useStepper(CLIENT_STAGES.length);

  const stepper = tab === 'capwap' ? capwapStepper : clientStepper;
  const stages = tab === 'capwap' ? CAPWAP_STAGES : CLIENT_STAGES;
  const stage = stages[stepper.index];
  const tabName = TAB_LABEL[tab];

  const switchTab = (next: Track) => {
    if (next === tab) return;
    capwapStepper.reset();
    clientStepper.reset();
    setTab(next);
  };

  return (
    <div>
      <div className="hstack" role="tablist" aria-label="WLAN 演示主题" style={{ gap: 6 }}>
        {(['capwap', 'client'] as Track[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`btn btn-sm${tab === id ? ' btn-primary' : ''}`}
            onClick={() => switchTab(id)}
          >
            {TAB_LABEL[id]}
          </button>
        ))}
        <span className="tiny faint" style={{ marginLeft: 'auto' }}>
          切换 Tab 会重置步骤
        </span>
      </div>

      <svg
        viewBox="0 0 560 160"
        width="100%"
        role="img"
        aria-label="WLAN 拓扑：终端、AP、AC 与 DHCP 服务器"
        style={{ marginTop: 8 }}
      >
        {/* AP 与 DHCP */}
        <line
          x1={215}
          y1={73}
          x2={500}
          y2={59}
          stroke={isLinkActive(stage, 'dhcp') ? LINK_COLORS.dhcp : 'var(--border)'}
          strokeWidth={isLinkActive(stage, 'dhcp') ? 2.6 : 1.2}
          strokeDasharray="6 4"
          style={{ transition: 'stroke 220ms ease' }}
        />
        <text x={330} y={48} fontSize={8} fill="var(--text-faint)">
          DHCP（管理地址）
        </text>

        {/* AP 与 AC */}
        <line
          x1={260}
          y1={95}
          x2={335}
          y2={95}
          stroke={isLinkActive(stage, 'capwap') ? LINK_COLORS.capwap : 'var(--border)'}
          strokeWidth={isLinkActive(stage, 'capwap') ? 2.6 : 1.2}
          style={{ transition: 'stroke 220ms ease' }}
        />
        <text x={297} y={86} textAnchor="middle" fontSize={8} fill="var(--text-faint)">
          CAPWAP / DTLS
        </text>

        {/* 终端与 AP */}
        <line
          x1={115}
          y1={95}
          x2={170}
          y2={95}
          stroke={isLinkActive(stage, 'wireless') ? LINK_COLORS.wireless : 'var(--border)'}
          strokeWidth={isLinkActive(stage, 'wireless') ? 2.6 : 1.2}
          strokeDasharray="4 3"
          style={{ transition: 'stroke 220ms ease' }}
        />
        <text x={142} y={86} textAnchor="middle" fontSize={8} fill="var(--text-faint)">
          无线
        </text>

        {/* 节点 */}
        <g>
          <rect
            x={25}
            y={73}
            width={90}
            height={44}
            rx={10}
            fill={stage.track === 'client' ? 'var(--accent-soft)' : 'var(--surface)'}
            stroke={stage.track === 'client' ? 'var(--accent-3)' : 'var(--border-strong)'}
            strokeWidth={1.3}
          />
          <text x={70} y={92} textAnchor="middle" fontSize={11.5} fontWeight={650} fill="var(--text)">
            终端 STA
          </text>
          <text x={70} y={106} textAnchor="middle" fontSize={7.5} fill="var(--text-faint)">
            802.11
          </text>
        </g>
        <g>
          <rect
            x={170}
            y={73}
            width={90}
            height={44}
            rx={10}
            fill={stage.track === 'capwap' ? 'var(--accent-soft)' : 'var(--surface)'}
            stroke={stage.track === 'capwap' ? 'var(--accent)' : 'var(--border-strong)'}
            strokeWidth={1.5}
          />
          <text x={215} y={92} textAnchor="middle" fontSize={11.5} fontWeight={650} fill="var(--text)">
            AP
          </text>
          <text x={215} y={106} textAnchor="middle" fontSize={7.5} fill="var(--text-faint)">
            Fit AP
          </text>
        </g>
        <g>
          <rect
            x={335}
            y={73}
            width={90}
            height={44}
            rx={10}
            fill={stage.track === 'capwap' ? 'var(--accent-2-soft)' : 'var(--surface)'}
            stroke={stage.track === 'capwap' ? 'var(--accent-2)' : 'var(--border-strong)'}
            strokeWidth={1.5}
          />
          <text x={380} y={92} textAnchor="middle" fontSize={11.5} fontWeight={650} fill="var(--text)">
            AC
          </text>
          <text x={380} y={106} textAnchor="middle" fontSize={7.5} fill="var(--text-faint)">
            WLC
          </text>
        </g>
        <g>
          <rect
            x={455}
            y={21}
            width={90}
            height={38}
            rx={10}
            fill={isLinkActive(stage, 'dhcp') ? 'var(--ok-soft)' : 'var(--surface)'}
            stroke={isLinkActive(stage, 'dhcp') ? 'var(--ok)' : 'var(--border-strong)'}
            strokeWidth={1.3}
          />
          <text x={500} y={37} textAnchor="middle" fontSize={10} fontWeight={650} fill="var(--text)">
            DHCP / DNS
          </text>
          <text x={500} y={50} textAnchor="middle" fontSize={7} fill="var(--text-faint)">
            地址与 AC 发现
          </text>
        </g>

        <text x={280} y={146} textAnchor="middle" fontSize={8} fill="var(--text-faint)">
          高亮链路表示当前阶段使用的通道
        </text>
      </svg>

      <div
        role="tabpanel"
        aria-label={`${tabName} 步骤`}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
          marginTop: 12,
          alignItems: 'start',
        }}
      >
        <div className="vstack" style={{ gap: 4 }}>
          {stages.map((item, index) => {
            const active = index === stepper.index;
            const done = index < stepper.index;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => stepper.goTo(index)}
                aria-label={`跳转到第 ${index + 1} 阶段：${item.title}`}
                aria-pressed={active}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '5px 8px',
                  borderRadius: 8,
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  background: active ? 'var(--accent-soft)' : 'var(--surface)',
                  color: active ? 'var(--text)' : done ? 'var(--text-dim)' : 'var(--text-faint)',
                  textAlign: 'left',
                  transition: 'background 200ms ease, border-color 200ms ease',
                  cursor: 'pointer',
                }}
              >
                <span
                  className="mono tiny"
                  style={{ width: 18, flex: 'none', color: active ? 'var(--accent)' : 'inherit' }}
                >
                  {index + 1}
                </span>
                <span style={{ fontSize: 11.5 }}>{item.title}</span>
                {done ? (
                  <span className="tiny" style={{ marginLeft: 'auto', color: 'var(--ok)' }}>
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 12,
            background: 'var(--surface)',
            padding: 12,
          }}
        >
          <div className="hstack" style={{ gap: 6 }}>
            <span className={`badge ${stage.track === 'capwap' ? 'accent' : ''}`}>
              {stage.track === 'capwap' ? 'CAPWAP' : '终端'}
            </span>
            <span style={{ fontSize: 13, fontWeight: 650 }}>{stage.title}</span>
          </div>
          <div className="tiny faint" style={{ marginTop: 3 }}>
            {tabName} · 第 {stepper.index + 1} / {stages.length} 阶段
          </div>

          <div style={{ marginTop: 10 }}>
            <div className="tiny" style={{ color: 'var(--accent-2)', fontWeight: 650 }}>
              关键报文
            </div>
            <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.7 }}>
              {stage.packets.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>

          <div
            style={{
              marginTop: 10,
              padding: '8px 10px',
              borderRadius: 8,
              background: 'var(--warn-soft)',
              border: '1px solid rgba(251, 191, 36, 0.25)',
            }}
          >
            <div className="tiny" style={{ color: 'var(--warn)', fontWeight: 650 }}>
              常见故障
            </div>
            <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.7 }}>
              {stage.faults.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="viz-note" style={{ borderLeft: '2px solid var(--accent-2)', paddingLeft: 10 }} aria-live="polite">
        当前第 {stepper.index + 1} 阶段「{stage.title}」（{tabName}）：关键报文为 {stage.packets[0]}；若卡在此阶段，优先排查「
        {stage.faults[0]}」。
      </div>

      <VizControls
        stepper={stepper}
        ariaLabel={`${tabName} 阶段控制`}
        extra={
          <span className="tiny faint">
            {tabName} · {stepper.index + 1} / {stages.length}
          </span>
        }
      />
    </div>
  );
}
