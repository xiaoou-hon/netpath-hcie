import { useState } from 'react';
import { useStepper } from '../useStepper';
import { VizControls } from '../VizControls';

export const meta = {
  key: 'vrrp-failover',
  title: 'VRRP 主备切换',
  subtitle: '断链 · 定时器 · 抢占',
  order: 20,
};

type RouterId = 'r1' | 'r2';

type RouterInfo = {
  id: RouterId;
  name: string;
  priority: number;
  x: number;
  y: number;
};

const ROUTERS: RouterInfo[] = [
  { id: 'r1', name: 'R1', priority: 120, x: 408, y: 88 },
  { id: 'r2', name: 'R2', priority: 100, x: 408, y: 212 },
];

const BOX_W = 116;
const BOX_H = 60;
const ADVERT_INTERVAL = 1;
const VIRTUAL_IP = '192.168.1.254';
const VIRTUAL_MAC = '00-00-5E-00-01-01';
const STEP_COUNT = 6;

/** Master_Down_Interval = 3 × 通告间隔 + Skew_Time，Skew = (256 − 优先级)/256 */
function masterDownFor(priority: number): number {
  return 3 * ADVERT_INTERVAL + (256 - priority) / 256;
}

function getRouter(id: RouterId): RouterInfo {
  return id === 'r1' ? ROUTERS[0] : ROUTERS[1];
}

function buildTrafficPath(router: RouterInfo): string {
  return `M 126 150 L 190 150 L 290 150 L 350 ${router.y} L 466 ${router.y} L 548 ${router.y}`;
}

function buildNote(step: number, preempt: boolean): string {
  const down100 = masterDownFor(100).toFixed(2);
  switch (step) {
    case 0:
      return `正常主备：R1 优先级 120 → Master，每 ${ADVERT_INTERVAL}s 发送一次 VRRP 通告；R2 优先级 100 → Backup，只监听。虚拟 IP ${VIRTUAL_IP} 与虚拟 MAC ${VIRTUAL_MAC} 由 Master 持有并应答 ARP。主机的默认网关指向虚拟 IP，所以无论谁是 Master，网关都保持不变。`;
    case 1:
      return '断链：R1 上行接口故障（接口跟踪生效），R1 已无法正常转发，并停止发送 VRRP 通告。此时 R2 仍在监听、仍为 Backup，主机发出的报文暂时无人转发。';
    case 2:
      return `Backup 等待：R2 必须连续 ${down100}s（Master_Down_Interval = 3 × ${ADVERT_INTERVAL}s 通告间隔 + Skew_Time (256−100)/256）收不到通告，才判定 Master 失效。定时器由 Backup 自己维护，主机不参与。`;
    case 3:
      return `切换 Master：定时器到期，R2 升为 Master，在 Vlanif10 上启用虚拟 IP ${VIRTUAL_IP}、对外使用虚拟 MAC ${VIRTUAL_MAC}，并发送免费 ARP 刷新交换机的 MAC 表。主机网关始终是 ${VIRTUAL_IP}，因为它指向的是虚拟 IP 而非某台物理路由器，切换对主机完全透明。`;
    case 4:
      return preempt
        ? `原 Master 恢复：R1 上行链路恢复，优先级回到 ${ROUTERS[0].priority} 并重新发送通告。由于开启抢占且 ${ROUTERS[0].priority} > ${ROUTERS[1].priority}，R1 立即抢占回 Master（若配置了 Preempt_Delay 则等待延时）。`
        : '原 Master 恢复：R1 链路恢复并重新发送通告，但抢占关闭，R2 继续担任 Master，R1 退回 Backup 状态。';
    default:
      return preempt
        ? `抢占结果：R1 重夺 Master 并持有虚拟 MAC，流量回到主路径；切换瞬间仍会短暂丢包。定时器参数不变，主机网关始终是 ${VIRTUAL_IP}。`
        : `不抢占结果：R2 长期保持 Master，路径稳定但可能是次优路径；R1 只有在 R2 失效后才会接替。主机网关仍为 ${VIRTUAL_IP}，不受影响。`;
  }
}

export default function VrrpFailoverViz() {
  const [preempt, setPreempt] = useState(true);
  const stepper = useStepper(STEP_COUNT);
  const step = stepper.index;

  const masterId: RouterId = step < 3 ? 'r1' : step === 3 ? 'r2' : preempt ? 'r1' : 'r2';
  const failedId: RouterId | null = step >= 1 && step <= 3 ? 'r1' : null;

  const master = getRouter(masterId);
  const failed = failedId ? getRouter(failedId) : null;
  const linkDown = failedId !== null;
  const blackhole = failed !== null && master.id === failed.id;
  const trafficColor = blackhole ? 'var(--danger)' : 'var(--accent)';
  const trafficPath = buildTrafficPath(master);
  const advertPath =
    masterId === 'r1' ? 'M 408 118 Q 300 150 408 182' : 'M 408 182 Q 300 150 408 118';
  const note = buildNote(step, preempt);
  const downR1 = masterDownFor(ROUTERS[0].priority).toFixed(2);
  const downR2 = masterDownFor(ROUTERS[1].priority).toFixed(2);

  const resetAll = () => {
    stepper.reset();
    setPreempt(true);
  };

  return (
    <div>
      <svg
        viewBox="0 0 580 280"
        width="100%"
        role="img"
        aria-label="VRRP 主备拓扑：主机、交换机、Master 与 Backup 路由器"
      >
        {/* 基础链路 */}
        <line x1={122} y1={150} x2={190} y2={150} stroke="var(--border-strong)" strokeWidth={1.6} />
        <line x1={290} y1={150} x2={350} y2={88} stroke="var(--border-strong)" strokeWidth={1.6} />
        <line x1={290} y1={150} x2={350} y2={212} stroke="var(--border-strong)" strokeWidth={1.6} />
        <line x1={466} y1={88} x2={556} y2={88} stroke="var(--border-strong)" strokeWidth={1.6} />
        <line x1={466} y1={212} x2={556} y2={212} stroke="var(--border-strong)" strokeWidth={1.6} />

        {/* 当前转发路径 */}
        <path
          d={trafficPath}
          fill="none"
          stroke={trafficColor}
          strokeWidth={2.6}
          strokeDasharray="8 5"
          opacity={0.85}
          style={{ transition: 'd 260ms ease' }}
        />

        {/* VRRP 通告 */}
        {!linkDown || step >= 4 ? (
          <g>
            <path
              d={advertPath}
              fill="none"
              stroke="var(--accent-2)"
              strokeWidth={1.8}
              strokeDasharray="5 4"
              opacity={0.85}
            />
            <text x={338} y={132} fontSize={8} fill="var(--accent-2)" textAnchor="middle">
              VRRP 通告 / {ADVERT_INTERVAL}s
            </text>
          </g>
        ) : null}

        {blackhole ? (
          <text x={280} y={20} textAnchor="middle" fontSize={9} fill="var(--danger)">
            切换期间流量中断（黑洞）
          </text>
        ) : null}

        {/* 报文动画（被设备框覆盖，形成“穿过设备”的效果） */}
        <circle key={`${masterId}-${step}`} r={4} fill={trafficColor}>
          <animateMotion dur="2.4s" repeatCount="indefinite" path={trafficPath} />
        </circle>

        {/* 主机 */}
        <g>
          <rect x={22} y={126} width={100} height={48} rx={11} fill="var(--surface)" stroke="var(--border-strong)" strokeWidth={1.4} />
          <text x={72} y={147} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="var(--text)">
            主机
          </text>
          <text x={72} y={163} textAnchor="middle" fontSize={7.5} fontFamily="var(--mono)" fill="var(--text-faint)">
            GW {VIRTUAL_IP}
          </text>
        </g>

        {/* 交换机 */}
        <g>
          <rect x={190} y={126} width={100} height={48} rx={11} fill="var(--surface)" stroke="var(--border-strong)" strokeWidth={1.4} />
          <text x={240} y={147} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--text)">
            SW1
          </text>
          <text x={240} y={163} textAnchor="middle" fontSize={7.5} fill="var(--text-faint)">
            二层交换
          </text>
        </g>

        {/* 路由器 */}
        {ROUTERS.map((r) => {
          const isMaster = r.id === masterId;
          return (
            <g key={r.id}>
              {isMaster ? (
                <g>
                  <rect
                    x={r.x - 68}
                    y={r.y - 52}
                    width={150}
                    height={18}
                    rx={9}
                    fill="var(--accent-soft)"
                    stroke="var(--accent)"
                    strokeWidth={1}
                  />
                  <text x={r.x + 7} y={r.y - 39} textAnchor="middle" fontSize={8.5} fill="var(--accent)">
                    VIP {VIRTUAL_IP}
                  </text>
                </g>
              ) : null}
              <rect
                x={r.x - BOX_W / 2}
                y={r.y - BOX_H / 2}
                width={BOX_W}
                height={BOX_H}
                rx={11}
                fill={isMaster ? 'var(--accent-soft)' : 'var(--surface)'}
                stroke={isMaster ? 'var(--accent)' : 'var(--border-strong)'}
                strokeWidth={isMaster ? 2.2 : 1.4}
                style={{ transition: 'stroke 240ms ease, fill 240ms ease' }}
              />
              <text x={r.x} y={r.y - 8} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--text)">
                {r.name}
              </text>
              <text
                x={r.x}
                y={r.y + 8}
                textAnchor="middle"
                fontSize={10.5}
                fontWeight={650}
                fill={isMaster ? 'var(--accent)' : 'var(--text-dim)'}
              >
                {isMaster ? 'Master' : 'Backup'}
              </text>
              <text x={r.x} y={r.y + 23} textAnchor="middle" fontSize={8} fontFamily="var(--mono)" fill="var(--text-faint)">
                优先级 {r.priority}
              </text>
            </g>
          );
        })}

        {/* 公网出口标签 */}
        <text x={556} y={78} textAnchor="end" fontSize={8.5} fill="var(--text-faint)">
          公网 / Internet
        </text>
        <text x={556} y={202} textAnchor="end" fontSize={8.5} fill="var(--text-faint)">
          备用上行
        </text>

        {/* 断开的上行链路 */}
        {failed ? (
          <g>
            <line
              x1={466}
              y1={failed.y}
              x2={524}
              y2={failed.y}
              stroke="var(--danger)"
              strokeWidth={1.8}
              strokeDasharray="4 4"
            />
            <line x1={510} y1={failed.y - 8} x2={522} y2={failed.y + 8} stroke="var(--danger)" strokeWidth={2.4} />
            <line x1={522} y1={failed.y - 8} x2={510} y2={failed.y + 8} stroke="var(--danger)" strokeWidth={2.4} />
            <text x={492} y={failed.y - 14} textAnchor="middle" fontSize={8} fill="var(--danger)">
              上行断开
            </text>
          </g>
        ) : null}
      </svg>

      <div className="block-kv" style={{ marginTop: 10 }}>
        <div className="kv-item">
          <div className="k">VRRP 状态</div>
          <div className="v" style={{ fontSize: 12.5 }}>
            R1 {masterId === 'r1' ? 'Master' : 'Backup'} · R2 {masterId === 'r2' ? 'Master' : 'Backup'}
          </div>
        </div>
        <div className="kv-item">
          <div className="k">优先级</div>
          <div className="v" style={{ fontSize: 12.5 }}>
            R1 {ROUTERS[0].priority} · R2 {ROUTERS[1].priority}（大者优先）
          </div>
        </div>
        <div className="kv-item">
          <div className="k">虚拟 IP / MAC</div>
          <div className="v mono" style={{ fontSize: 12 }}>
            {VIRTUAL_IP} · {VIRTUAL_MAC}
          </div>
        </div>
        <div className="kv-item">
          <div className="k">定时器</div>
          <div className="v" style={{ fontSize: 12 }}>
            通告 {ADVERT_INTERVAL}s · Master_Down：P100 ≈ {downR2}s / P120 ≈ {downR1}s
          </div>
        </div>
        <div className="kv-item">
          <div className="k">主机网关</div>
          <div className="v mono" style={{ fontSize: 12 }}>
            {VIRTUAL_IP}（始终不变）
          </div>
        </div>
      </div>

      <div className="viz-note" style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 10 }} aria-live="polite">
        {note}
      </div>

      <VizControls
        stepper={{ ...stepper, reset: resetAll }}
        ariaLabel="VRRP 主备切换时间线控制"
        extra={
          <button
            type="button"
            className={`btn btn-sm${preempt ? ' btn-primary' : ''}`}
            onClick={() => setPreempt((p) => !p)}
            aria-pressed={preempt}
            aria-label={`抢占模式当前${preempt ? '开启' : '关闭'}，点击切换`}
          >
            抢占：{preempt ? '开' : '关'}
          </button>
        }
      />

      <div className="code-block" style={{ marginTop: 12 }}>
        <div className="code-head">
          <span className="lang">VRP</span>
          在 Master 上查看 VRRP 状态
        </div>
        <pre className="code-body" style={{ fontFamily: 'var(--mono)', fontSize: 11.5 }}>
          {`<R1> display vrrp brief\nVRID  State    Interface    Priority  Virtual IP\n1     ${masterId === 'r1' ? 'Master ' : 'Backup '} Vlanif10     ${ROUTERS[0].priority}       ${VIRTUAL_IP}\n\n<R2> display vrrp brief\n1     ${masterId === 'r2' ? 'Master ' : 'Backup '} Vlanif10     ${ROUTERS[1].priority}       ${VIRTUAL_IP}`}
        </pre>
      </div>

      <div className="viz-legend">
        <span>
          <span className="dot" style={{ background: 'var(--accent)' }} /> Master / 转发路径
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--accent-2)' }} /> VRRP 通告
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--danger)' }} /> 断开的链路
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--text-faint)' }} /> 优先级：数值越大越优先
        </span>
      </div>
    </div>
  );
}
