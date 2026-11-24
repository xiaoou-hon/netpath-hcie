import { useState } from 'react';
import { useStepper } from '../useStepper';
import { VizControls } from '../VizControls';

export const meta = {
  key: 'encapsulation',
  title: '数据封装与解封装',
  subtitle: '逐层套娃',
  order: 10,
};

type LayerInfo = {
  name: string;
  short: string;
  fields: string;
  svgNote: string;
  color: string;
};

const LAYERS: LayerInfo[] = [
  {
    name: '应用数据',
    short: 'L7 应用层',
    fields: '浏览器/APP 产生的原始数据，如 HTTP 请求 GET /index.html',
    svgNote: '',
    color: 'var(--accent)',
  },
  {
    name: 'TCP/UDP 段',
    short: 'L4 传输层',
    fields: 'TCP 头：源端口 12345 → 目的端口 80、序号、确认号、校验和',
    svgNote: 'TCP 头：源端口 12345 → 目的端口 80',
    color: 'var(--accent-2)',
  },
  {
    name: 'IP 包',
    short: 'L3 网络层',
    fields: 'IP 头：源 IP 192.168.1.10 → 目的 IP 93.184.216.34、TTL 64、协议号 6',
    svgNote: 'IP 头：源 IP 192.168.1.10 → 目的 IP 93.184.216.34',
    color: 'var(--accent-3)',
  },
  {
    name: '以太网帧',
    short: 'L2 数据链路层',
    fields: '帧头：目的 MAC 00:11:22:33:44:55、源 MAC 66:77:88:99:AA:BB、类型 0x0800；帧尾 FCS',
    svgNote: '目的 MAC · 源 MAC · 类型 0x0800 · FCS',
    color: 'var(--warn)',
  },
  {
    name: '比特流',
    short: 'L1 物理层',
    fields: '把帧转换为 0101… 电信号 / 光信号，在介质上传输',
    svgNote: '0101 1001 0110 1000 … 电/光信号',
    color: 'var(--danger)',
  },
];

const OSI_ROWS: { n: number; name: string; tcp: string; layers: number[] }[] = [
  { n: 7, name: '应用层', tcp: '应用层', layers: [0] },
  { n: 6, name: '表示层', tcp: '应用层', layers: [0] },
  { n: 5, name: '会话层', tcp: '应用层', layers: [0] },
  { n: 4, name: '传输层', tcp: '传输层', layers: [1] },
  { n: 3, name: '网络层', tcp: '网际层', layers: [2] },
  { n: 2, name: '数据链路层', tcp: '网络接口层', layers: [3] },
  { n: 1, name: '物理层', tcp: '网络接口层', layers: [4] },
];

const TCPIP_ROWS: { name: string; osi: string; layers: number[] }[] = [
  { name: '应用层', osi: 'OSI 7/6/5', layers: [0] },
  { name: '传输层', osi: 'OSI 4', layers: [1] },
  { name: '网际层', osi: 'OSI 3', layers: [2] },
  { name: '网络接口层', osi: 'OSI 2/1', layers: [3, 4] },
];

const GEOM = [
  { w: 200, h: 64 },
  { w: 270, h: 112 },
  { w: 340, h: 160 },
  { w: 410, h: 208 },
  { w: 480, h: 256 },
];

const NOTES_ENCAP = [
  '第 0 步：应用层产生原始数据，这时还没有任何首部。',
  '第 1 步：传输层加上 TCP/UDP 头（端口号等），数据变成「段」。',
  '第 2 步：网络层加上 IP 头（源/目的 IP、TTL、协议号），段变成「包」。',
  '第 3 步：数据链路层加上以太网帧头（源/目的 MAC、类型）和帧尾 FCS，包变成「帧」。',
  '第 4 步：物理层把帧转成比特流发到介质上；接收端会从下往上逐层剥掉首部，即「解封装」。',
];

const NOTES_DECAP = [
  '第 0 步：接收端收到完整的以太网帧（外层是比特流与帧），准备自下而上解封装。',
  '第 1 步：物理层把比特流还原成帧，数据链路层校验 FCS、剥掉帧头帧尾，得到 IP 包。',
  '第 2 步：网络层剥掉 IP 头，确认目的 IP 是自己，把数据交给传输层。',
  '第 3 步：传输层剥掉 TCP 头，按目的端口 80 把数据交给对应应用。',
  '第 4 步：解封装完成，应用层拿到的就是原始数据 GET /index.html，首部已被逐层剥离。',
];

const CX = 300;
const CY = 160;

export default function EncapsulationViz() {
  const stepper = useStepper(LAYERS.length, { interval: 1400 });
  const [direction, setDirection] = useState<'encap' | 'decap'>('encap');
  const [view, setView] = useState<'osi' | 'tcpip'>('osi');

  const decap = direction === 'decap';
  const activeLayer = decap ? LAYERS.length - 1 - stepper.index : stepper.index;
  const notes = decap ? NOTES_DECAP : NOTES_ENCAP;

  const switchDirection = (next: 'encap' | 'decap') => {
    setDirection(next);
    stepper.reset();
  };

  const renderRow = (key: string, left: string, name: string, right: string, layers: number[]) => {
    const active = layers.includes(activeLayer);
    return (
      <div
        key={key}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 7px',
          borderRadius: 6,
          fontSize: 11,
          background: active ? 'var(--accent-soft)' : 'transparent',
          border: `1px solid ${active ? 'var(--accent)' : 'transparent'}`,
          color: active ? 'var(--text)' : 'var(--text-faint)',
          transition: 'background 220ms ease, color 220ms ease',
        }}
      >
        <span className="mono tiny" style={{ width: 14, opacity: 0.7 }}>
          {left}
        </span>
        <span style={{ width: 74 }}>{name}</span>
        <span className="tiny" style={{ marginLeft: 'auto', opacity: 0.75 }}>
          {right}
        </span>
      </div>
    );
  };

  return (
    <div>
      <div className="hstack" style={{ marginBottom: 10 }}>
        <button
          type="button"
          className={`btn btn-sm${direction === 'encap' ? ' btn-primary' : ''}`}
          onClick={() => switchDirection('encap')}
          aria-pressed={direction === 'encap'}
        >
          封装（发送端）
        </button>
        <button
          type="button"
          className={`btn btn-sm${direction === 'decap' ? ' btn-primary' : ''}`}
          onClick={() => switchDirection('decap')}
          aria-pressed={direction === 'decap'}
        >
          解封装（接收端）
        </button>
        <span style={{ width: 10 }} />
        <button
          type="button"
          className={`btn btn-sm${view === 'osi' ? ' btn-primary' : ''}`}
          onClick={() => setView('osi')}
          aria-pressed={view === 'osi'}
        >
          OSI 七层
        </button>
        <button
          type="button"
          className={`btn btn-sm${view === 'tcpip' ? ' btn-primary' : ''}`}
          onClick={() => setView('tcpip')}
          aria-pressed={view === 'tcpip'}
        >
          TCP/IP 四层
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 320px', minWidth: 280, overflowX: 'auto' }}>
          <svg
            viewBox="0 0 600 320"
            width="100%"
            style={{ minWidth: 420 }}
            role="img"
            aria-label={decap ? '数据解封装逐层剥离示意' : '数据封装逐层嵌套示意'}
          >
            {[4, 3, 2, 1].map((idx) => {
              if (idx > activeLayer) return null;
              const g = GEOM[idx];
              const x = CX - g.w / 2;
              const y = CY - g.h / 2;
              return (
                <g key={idx}>
                  <rect
                    x={x}
                    y={y}
                    width={g.w}
                    height={g.h}
                    rx={14}
                    fill="var(--surface)"
                    fillOpacity={0.12}
                    stroke={LAYERS[idx].color}
                    strokeWidth={idx === activeLayer ? 2.4 : 1.6}
                    style={{ transition: 'all 300ms ease' }}
                  />
                  <text x={x + 14} y={y + 17} fontSize={10} fontWeight={700} fill={LAYERS[idx].color}>
                    {LAYERS[idx].name}
                  </text>
                  <text
                    x={x + 14}
                    y={y + g.h - 8}
                    fontSize={8.5}
                    fill="var(--text-faint)"
                  >
                    {LAYERS[idx].svgNote}
                  </text>
                </g>
              );
            })}
            <rect
              x={CX - GEOM[0].w / 2}
              y={CY - GEOM[0].h / 2}
              width={GEOM[0].w}
              height={GEOM[0].h}
              rx={10}
              fill="var(--accent-soft)"
              stroke={LAYERS[0].color}
              strokeWidth={1.8}
            />
            <text
              x={CX}
              y={CY - 4}
              textAnchor="middle"
              fontSize={12}
              fontWeight={700}
              fill="var(--text)"
            >
              应用数据
            </text>
            <text x={CX} y={CY + 16} textAnchor="middle" fontSize={9.5} fill="var(--text-dim)">
              GET /index.html
            </text>
            {stepper.index === 0 ? (
              <text x={CX} y={22} textAnchor="middle" fontSize={10} fill="var(--text-faint)">
                {decap ? '点击「播放」或「下一步」：自下而上逐层剥掉首部' : '点击「播放」或「下一步」：自上而下逐层加首部'}
              </text>
            ) : null}
            <text x={16} y={306} fontSize={9} fill="var(--text-faint)">
              发送端：自上而下封装
            </text>
            <text x={584} y={306} textAnchor="end" fontSize={9} fill="var(--text-faint)">
              接收端：自下而上解封装
            </text>
          </svg>
        </div>

        <div style={{ flex: '0 1 210px', minWidth: 180 }}>
          <div className="tiny faint" style={{ marginBottom: 6 }}>
            {view === 'osi' ? 'OSI 七层（右侧为 TCP/IP 对应层）' : 'TCP/IP 四层（右侧为 OSI 对应层）'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {view === 'osi'
              ? OSI_ROWS.map((row) => renderRow(String(row.n), String(row.n), row.name, row.tcp, row.layers))
              : TCPIP_ROWS.map((row) => renderRow(row.name, '', row.name, row.osi, row.layers))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {LAYERS.map((layer, idx) => {
          const done = idx <= activeLayer;
          return (
            <div
              key={layer.name}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'baseline',
                fontSize: 11.5,
                opacity: done ? 1 : 0.4,
                transition: 'opacity 220ms ease',
              }}
            >
              <span
                className="dot"
                style={{ background: layer.color, flex: 'none', transform: 'translateY(-1px)' }}
              />
              <span style={{ width: 96, flex: 'none', color: layer.color, fontWeight: 600 }}>
                {layer.name}
              </span>
              <span style={{ color: 'var(--text-dim)' }}>{layer.fields}</span>
            </div>
          );
        })}
      </div>

      <div
        className="viz-note"
        style={{ borderLeft: `2px solid ${decap ? 'var(--accent-2)' : 'var(--accent)'}`, paddingLeft: 10 }}
        aria-live="polite"
      >
        {notes[stepper.index]}
      </div>

      <VizControls
        stepper={stepper}
        extra={
          <span className="tiny faint" style={{ marginLeft: 4 }}>
            当前：{LAYERS[activeLayer].short} · {decap ? '自下而上解封装' : '自上而下封装'}
          </span>
        }
      />
    </div>
  );
}
