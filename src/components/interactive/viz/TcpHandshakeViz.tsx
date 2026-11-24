import { useState } from 'react';
import { useStepper } from '../useStepper';
import { VizControls } from '../VizControls';

export const meta = {
  key: 'tcp-handshake',
  title: 'TCP 三次握手与四次挥手',
  subtitle: '单步播放',
  order: 11,
};

type ScenarioKey = 'hs' | 'td';

type Message = {
  label: string;
  seq: string;
  from: 'c' | 's';
  y: number;
};

type ScenarioData = {
  messages: Message[];
  states: { c: string; s: string }[];
  notes: string[];
  caption: string;
};

const SCENARIOS: Record<ScenarioKey, ScenarioData> = {
  hs: {
    messages: [
      { label: 'SYN', seq: 'seq=x', from: 'c', y: 142 },
      { label: 'SYN + ACK', seq: 'seq=y, ack=x+1', from: 's', y: 184 },
      { label: 'ACK', seq: 'ack=y+1', from: 'c', y: 226 },
    ],
    states: [
      { c: 'CLOSED', s: 'LISTEN' },
      { c: 'SYN_SENT', s: 'SYN_RCVD' },
      { c: 'SYN_SENT', s: 'SYN_RCVD' },
      { c: 'ESTABLISHED', s: 'ESTABLISHED' },
    ],
    notes: [
      '初始：客户端处于 CLOSED；服务端在 80 端口 LISTEN，等待连接请求。',
      '第 1 次握手：客户端发送 SYN（seq=x），进入 SYN_SENT。报文不含应用数据，只同步初始序号。',
      '第 2 次握手：服务端回复 SYN+ACK（seq=y, ack=x+1），既确认客户端 SYN，也同步自己的序号，进入 SYN_RCVD。',
      '第 3 次握手：客户端发送 ACK（ack=y+1），双方进入 ESTABLISHED，连接建立，可以开始传输数据。',
    ],
    caption: '连接已建立，进入数据传输阶段（此处省略）',
  },
  td: {
    messages: [
      { label: 'FIN', seq: 'seq=u', from: 'c', y: 142 },
      { label: 'ACK', seq: 'ack=u+1', from: 's', y: 184 },
      { label: 'FIN', seq: 'seq=v', from: 's', y: 226 },
      { label: 'ACK', seq: 'ack=v+1', from: 'c', y: 268 },
    ],
    states: [
      { c: 'ESTABLISHED', s: 'ESTABLISHED' },
      { c: 'FIN_WAIT_1', s: 'ESTABLISHED' },
      { c: 'FIN_WAIT_2', s: 'CLOSE_WAIT' },
      { c: 'TIME_WAIT', s: 'LAST_ACK' },
      { c: 'TIME_WAIT', s: 'CLOSED' },
    ],
    notes: [
      '初始：连接已建立，双方都处于 ESTABLISHED，数据传输结束，准备断开连接。',
      '第 1 次挥手：客户端发送 FIN（seq=u），表示「我没有数据要发了」，进入 FIN_WAIT_1。',
      '第 2 次挥手：服务端回复 ACK（ack=u+1），进入 CLOSE_WAIT；客户端进入 FIN_WAIT_2。此时客户端→服务端方向已关闭（半关闭）。',
      '第 3 次挥手：服务端把剩余数据发完后发送 FIN（seq=v），进入 LAST_ACK；客户端收到 FIN 并回 ACK 后进入 TIME_WAIT。',
      '第 4 次挥手：客户端发送最后一个 ACK（ack=v+1），服务端进入 CLOSED；客户端等待 2MSL 后回到 CLOSED，四次挥手完成。',
    ],
    caption: '四次挥手完成，双方连接完全关闭',
  },
};

const COLOR_HS = 'var(--accent)';
const COLOR_TD = 'var(--warn)';

function stateColor(s: string): string {
  if (s === 'ESTABLISHED') return 'var(--ok)';
  if (s === 'CLOSED' || s === 'LISTEN') return 'var(--text-faint)';
  if (s === 'TIME_WAIT') return 'var(--accent-3)';
  return 'var(--warn)';
}

export default function TcpHandshakeViz() {
  const [scenario, setScenario] = useState<ScenarioKey>('hs');
  const [loss, setLoss] = useState(false);
  const data = SCENARIOS[scenario];
  const stepper = useStepper(data.states.length, { interval: 1600 });

  const step = stepper.index;
  const st = data.states[step];
  const accent = scenario === 'hs' ? COLOR_HS : COLOR_TD;
  const lost = loss && scenario === 'hs' && step === 2;

  const note = lost
    ? `${data.notes[step]} 丢包重传：SYN+ACK 在链路上丢失，客户端在 RTO 超时（Linux 初始约 1s，之后 2s、4s 指数退避）后重发 SYN；服务端收到重复 SYN 会重传 SYN+ACK（tcp_synack_retries 默认 5）。`
    : data.notes[step];

  const switchScenario = (next: ScenarioKey) => {
    setScenario(next);
    stepper.reset();
  };

  const toggleLoss = () => {
    if (!loss && scenario === 'hs') stepper.goTo(2);
    setLoss((v) => !v);
  };

  return (
    <div>
      <svg
        viewBox="0 0 560 330"
        width="100%"
        style={{ minWidth: 420 }}
        role="img"
        aria-label={scenario === 'hs' ? 'TCP 三次握手时序图' : 'TCP 四次挥手的时序图'}
      >
        <defs>
          <marker id="tcp-hs-arrow-a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={COLOR_HS} />
          </marker>
          <marker id="tcp-hs-arrow-w" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={COLOR_TD} />
          </marker>
          <marker id="tcp-hs-arrow-d" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--border-strong)" />
          </marker>
          <marker id="tcp-hs-arrow-r" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--danger)" />
          </marker>
        </defs>

        {/* 端点 */}
        <g>
          <rect x={40} y={16} width={150} height={50} rx={10} fill="var(--surface-2)" stroke="var(--accent)" strokeWidth={1.4} />
          <text x={115} y={38} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--text)">
            客户端 Client
          </text>
          <text x={115} y={54} textAnchor="middle" fontSize={9} fill="var(--text-faint)">
            IP: 10.0.0.10
          </text>
          <rect x={370} y={16} width={150} height={50} rx={10} fill="var(--surface-2)" stroke="var(--accent-2)" strokeWidth={1.4} />
          <text x={445} y={38} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--text)">
            服务端 Server
          </text>
          <text x={445} y={54} textAnchor="middle" fontSize={9} fill="var(--text-faint)">
            IP: 10.0.0.80 : 80
          </text>
        </g>

        {/* 状态 */}
        {([
          { x: 40, s: st.c },
          { x: 370, s: st.s },
        ]).map((item) => (
          <g key={item.x}>
            <rect
              x={item.x}
              y={76}
              width={150}
              height={26}
              rx={7}
              fill="var(--surface)"
              stroke={stateColor(item.s)}
              strokeWidth={1.3}
            />
            <text
              x={item.x + 75}
              y={93}
              textAnchor="middle"
              fontSize={10.5}
              fontFamily="var(--mono)"
              fill={stateColor(item.s)}
            >
              {item.s}
            </text>
          </g>
        ))}

        {/* 时间轴 */}
        <line x1={115} y1={112} x2={115} y2={306} stroke="var(--border-strong)" strokeDasharray="3 4" />
        <line x1={445} y1={112} x2={445} y2={306} stroke="var(--border-strong)" strokeDasharray="3 4" />

        {/* 报文 */}
        {data.messages.map((m, i) => {
          const active = step === i + 1;
          const past = step > i + 1;
          const isLost = lost && i === 1;
          const color = scenario === 'hs' ? COLOR_HS : COLOR_TD;
          const stroke = isLost ? 'var(--danger)' : active ? color : past ? 'var(--border-strong)' : 'var(--border)';
          const opacity = active ? 1 : past ? 0.75 : 0.38;
          const marker = isLost
            ? 'url(#tcp-hs-arrow-r)'
            : active
              ? scenario === 'hs'
                ? 'url(#tcp-hs-arrow-a)'
                : 'url(#tcp-hs-arrow-w)'
              : 'url(#tcp-hs-arrow-d)';
          const forward = m.from === 'c';
          const x1 = forward ? 198 : 362;
          const x2 = forward ? 362 : 198;
          return (
            <g key={`${m.label}-${i}`} opacity={opacity}>
              <line
                x1={x1}
                y1={m.y}
                x2={x2}
                y2={m.y}
                stroke={stroke}
                strokeWidth={active ? 2.2 : 1.4}
                markerEnd={marker}
                style={{ transition: 'stroke 220ms ease, opacity 220ms ease' }}
              />
              <text
                x={280}
                y={m.y - 7}
                textAnchor="middle"
                fontSize={active ? 11.5 : 10.5}
                fontWeight={active ? 700 : 500}
                fill={isLost ? 'var(--danger)' : active ? color : 'var(--text-dim)'}
              >
                {m.label}
                {isLost ? '  ✕ 丢失' : active ? '  ◀ 当前' : ''}
              </text>
              <text x={280} y={m.y + 13} textAnchor="middle" fontSize={8.5} fontFamily="var(--mono)" fill="var(--text-faint)">
                {m.seq}
              </text>
            </g>
          );
        })}

        {/* 丢包重传：客户端超时重发 SYN */}
        {lost ? (
          <g>
            <line
              x1={198}
              y1={296}
              x2={362}
              y2={296}
              stroke="var(--danger)"
              strokeWidth={1.8}
              strokeDasharray="5 4"
              markerEnd="url(#tcp-hs-arrow-r)"
            />
            <text x={280} y={289} textAnchor="middle" fontSize={9.5} fill="var(--danger)">
              SYN（超时重传）
            </text>
          </g>
        ) : null}

        <text x={280} y={318} textAnchor="middle" fontSize={9} fill={lost ? 'var(--danger)' : 'var(--text-faint)'}>
          {lost
            ? 'SYN+ACK 丢失 → 客户端超时重传 SYN，服务端再回 SYN+ACK'
            : stepper.isLast
              ? data.caption
              : scenario === 'hs'
                ? '三次握手：SYN → SYN+ACK → ACK'
                : '四次挥手：FIN → ACK → FIN → ACK'}
        </text>
      </svg>

      <div
        className="viz-note"
        style={{
          borderLeft: `2px solid ${lost ? 'var(--danger)' : accent}`,
          paddingLeft: 10,
        }}
        aria-live="polite"
      >
        {note}
      </div>

      <VizControls
        stepper={stepper}
        extra={
          <>
            <button
              type="button"
              className={`btn btn-sm${scenario === 'hs' ? ' btn-primary' : ''}`}
              onClick={() => switchScenario('hs')}
              aria-pressed={scenario === 'hs'}
              aria-label="切换到三次握手场景"
            >
              三次握手
            </button>
            <button
              type="button"
              className={`btn btn-sm${scenario === 'td' ? ' btn-primary' : ''}`}
              onClick={() => switchScenario('td')}
              aria-pressed={scenario === 'td'}
              aria-label="切换到四次挥手场景"
            >
              四次挥手
            </button>
            <button
              type="button"
              className={`btn btn-sm ${loss ? 'btn-danger' : 'btn-ghost'}`}
              onClick={toggleLoss}
              aria-pressed={loss}
              aria-label="开关丢包重传演示"
            >
              丢包重传：{loss ? '开' : '关'}
            </button>
          </>
        }
      />

      <div className="viz-legend">
        <span>
          <span className="dot" style={{ background: COLOR_HS }} /> 三次握手
        </span>
        <span>
          <span className="dot" style={{ background: COLOR_TD }} /> 四次挥手
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--border-strong)' }} /> 已发生 / 待发送
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--danger)' }} /> 丢失 / 重传
        </span>
      </div>
    </div>
  );
}
