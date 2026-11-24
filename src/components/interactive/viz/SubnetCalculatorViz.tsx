import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icon } from '@/components/ui';

export const meta = {
  key: 'subnet-calculator',
  title: '子网划分计算器',
  subtitle: 'IPv4 位运算',
  order: 12,
};

/* ------------------------- IPv4 位运算（自行实现） ------------------------- */

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

const MIN_PREFIX = 8;
const MAX_PREFIX = 32;
/** /8 网段可提供的最多可用主机数 */
const MAX_HOSTS = 2 ** (32 - MIN_PREFIX) - 2;

function parseIp(input: string): number | null {
  const m = IPV4_RE.exec(input.trim());
  if (!m) return null;
  const parts = [m[1], m[2], m[3], m[4]].map((p) => Number(p));
  if (parts.some((p) => p < 0 || p > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function ipToString(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

function prefixToMask(prefix: number): number {
  if (prefix <= 0) return 0;
  return (0xffffffff << (32 - prefix)) >>> 0;
}

/** 接受「27」「/27」或点分掩码，返回前缀与掩码整数 */
function parseMask(input: string): { prefix: number; mask: number } | null {
  const s = input.trim();
  if (/^\/?\d{1,2}$/.test(s)) {
    const p = Number(s.replace('/', ''));
    if (p < 0 || p > 32) return null;
    return { prefix: p, mask: prefixToMask(p) };
  }
  const m = parseIp(s);
  if (m === null) return null;
  const wildcard = (~m) >>> 0;
  if (((wildcard + 1) & wildcard) !== 0) return null;
  return { prefix: 32 - Math.log2(wildcard + 1), mask: m };
}

/** 该前缀下可用的主机数（含 /31 点对点与 /32 特例） */
function usableHosts(prefix: number): number {
  if (prefix >= 32) return 1;
  if (prefix === 31) return 2;
  return 2 ** (32 - prefix) - 2;
}

/** 反推：满足 hostCount 台主机的最小可用前缀（块尽可能小） */
function recommendPrefix(hostCount: number): number | null {
  for (let p = MAX_PREFIX; p >= MIN_PREFIX; p -= 1) {
    if (usableHosts(p) >= hostCount) return p;
  }
  return null;
}

type Range = { first: string; last: string; hosts: number };

function hostRange(net: number, prefix: number): Range {
  const size = 2 ** (32 - prefix);
  const bcast = (net + size - 1) >>> 0;
  if (prefix === 32) return { first: ipToString(net), last: ipToString(net), hosts: 1 };
  if (prefix === 31) return { first: ipToString(net), last: ipToString(bcast), hosts: 2 };
  return {
    first: ipToString((net + 1) >>> 0),
    last: ipToString((bcast - 1) >>> 0),
    hosts: size - 2,
  };
}

type SubnetRow = {
  index: number;
  cidr: string;
  first: string;
  last: string;
  bcast: string;
  hosts: number;
};

const inputStyle: CSSProperties = {
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontFamily: 'var(--mono)',
  fontSize: 13,
  outline: 'none',
};

const labelStyle: CSSProperties = {
  fontSize: 11.5,
  color: 'var(--text-faint)',
  marginBottom: 4,
  display: 'block',
};

const panelStyle: CSSProperties = {
  marginTop: 12,
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
};

/* ------------------------------- 复制能力 ------------------------------- */

function fallbackCopy(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } finally {
    document.body.removeChild(area);
  }
  return ok;
}

function CopyAction({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  const markCopied = () => {
    setCopied(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  const onCopy = () => {
    const done = () => markCopied();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => {
        if (fallbackCopy(text)) done();
      });
    } else if (fallbackCopy(text)) {
      done();
    }
  };

  return (
    <button type="button" className="btn btn-sm btn-ghost" onClick={onCopy} aria-label={label}>
      <Icon name={copied ? 'check' : 'copy'} size={12} />
      {copied ? '已复制' : label}
    </button>
  );
}

/* ------------------------------- 组件主体 ------------------------------- */

export default function SubnetCalculatorViz() {
  const [ipText, setIpText] = useState('192.168.10.34');
  const [maskText, setMaskText] = useState('255.255.255.224');
  const [prefixText, setPrefixText] = useState('27');
  const [maskWarn, setMaskWarn] = useState(false);
  const [split, setSplit] = useState<2 | 4 | 8>(4);
  const [hostText, setHostText] = useState('50');

  const ipNum = parseIp(ipText);
  const prefixNum = /^\d{1,2}$/.test(prefixText.trim()) ? Number(prefixText.trim()) : NaN;
  const prefixOk = Number.isInteger(prefixNum) && prefixNum >= MIN_PREFIX && prefixNum <= MAX_PREFIX;
  const valid = ipNum !== null && prefixOk;

  const maskNum = prefixOk ? prefixToMask(prefixNum) : 0;
  const netNum = ipNum !== null && prefixOk ? (ipNum & maskNum) >>> 0 : 0;
  const wildNum = (~maskNum) >>> 0;
  const bcastNum = (netNum | wildNum) >>> 0;
  const blockSize = prefixOk ? 2 ** (32 - prefixNum) : 0;
  const range = prefixOk ? hostRange(netNum, prefixNum) : { first: '', last: '', hosts: 0 };

  const sliderValue = prefixOk ? prefixNum : 24;

  /* 按主机数反推掩码 */
  const hostTrim = hostText.trim();
  const hostNum = /^\d+$/.test(hostTrim) ? Number(hostTrim) : NaN;
  const hostOk = Number.isInteger(hostNum) && hostNum >= 1 && hostNum <= MAX_HOSTS;
  const recPrefix = hostOk ? recommendPrefix(hostNum) : null;
  const recUsable = recPrefix !== null ? usableHosts(recPrefix) : 0;
  const recBlock = recPrefix !== null ? 2 ** (32 - recPrefix) : 0;
  const recSlack = hostOk ? recUsable - hostNum : 0;
  const recommendation =
    hostOk && recPrefix !== null
      ? {
          prefix: recPrefix,
          mask: ipToString(prefixToMask(recPrefix)),
          usable: recUsable,
          block: recBlock,
          slack: recSlack,
        }
      : null;

  const subBits = Math.log2(split);
  const childPrefix = prefixOk ? prefixNum + subBits : 0;
  const subnets: SubnetRow[] = [];
  let subnetError = '';
  if (valid) {
    if (childPrefix > 32) {
      subnetError = `/${prefixNum} 再借 ${subBits} 位会超过 /32，无法平均分成 ${split} 个子网。`;
    } else {
      const childSize = 2 ** (32 - childPrefix);
      for (let i = 0; i < split; i += 1) {
        const childNet = (netNum + i * childSize) >>> 0;
        const childRange = hostRange(childNet, childPrefix);
        subnets.push({
          index: i + 1,
          cidr: `${ipToString(childNet)}/${childPrefix}`,
          first: childRange.first,
          last: childRange.last,
          bcast: ipToString((childNet + childSize - 1) >>> 0),
          hosts: childRange.hosts,
        });
      }
    }
  }

  const ipBits = valid && ipNum !== null ? ipNum.toString(2).padStart(32, '0') : '';
  const maskBits = prefixOk ? maskNum.toString(2).padStart(32, '0') : '';

  const applyPrefix = (p: number) => {
    setPrefixText(String(p));
    setMaskText(ipToString(prefixToMask(p)));
    setMaskWarn(false);
  };

  const onMaskChange = (value: string) => {
    setMaskText(value);
    const parsed = parseMask(value);
    if (parsed) {
      setPrefixText(String(parsed.prefix));
      setMaskWarn(false);
    } else {
      setMaskWarn(value.trim().length > 0);
    }
  };

  const onMaskBlur = () => {
    const parsed = parseMask(maskText);
    if (parsed) {
      setMaskText(ipToString(parsed.mask));
      setPrefixText(String(parsed.prefix));
      setMaskWarn(false);
    } else if (prefixOk) {
      setMaskText(ipToString(prefixToMask(prefixNum)));
      setMaskWarn(false);
    }
  };

  const onPrefixChange = (value: string) => {
    setPrefixText(value);
    if (/^\d{1,2}$/.test(value.trim())) {
      const p = Number(value.trim());
      if (p >= MIN_PREFIX && p <= MAX_PREFIX) {
        setMaskText(ipToString(prefixToMask(p)));
        setMaskWarn(false);
      }
    }
  };

  const resultText =
    valid && ipNum !== null
      ? [
          `IP：${ipText.trim()}/${prefixNum}`,
          `网络地址：${ipToString(netNum)}/${prefixNum}`,
          `广播地址：${ipToString(bcastNum)}`,
          `可用范围：${range.first} – ${range.last}`,
          `可用主机数：${range.hosts} 台`,
          `通配符掩码：${ipToString(wildNum)}`,
        ].join('\n')
      : '';

  return (
    <div>
      <div className="hstack" style={{ alignItems: 'flex-end', gap: 12 }}>
        <div>
          <label style={labelStyle} htmlFor="subnet-ip">
            IP 地址
          </label>
          <input
            id="subnet-ip"
            type="text"
            inputMode="numeric"
            value={ipText}
            onChange={(e) => setIpText(e.target.value)}
            style={{ ...inputStyle, width: 156 }}
            aria-label="IPv4 地址"
            spellCheck={false}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="subnet-mask">
            子网掩码
          </label>
          <input
            id="subnet-mask"
            type="text"
            value={maskText}
            onChange={(e) => onMaskChange(e.target.value)}
            onBlur={onMaskBlur}
            style={{ ...inputStyle, width: 156 }}
            aria-label="子网掩码，可输入点分掩码或前缀"
            spellCheck={false}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="subnet-prefix">
            前缀 /
          </label>
          <input
            id="subnet-prefix"
            type="number"
            min={MIN_PREFIX}
            max={MAX_PREFIX}
            step={1}
            value={prefixText}
            onChange={(e) => onPrefixChange(e.target.value)}
            style={{ ...inputStyle, width: 64, textAlign: 'center' }}
            aria-label="前缀长度，8 到 32"
          />
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="hstack" style={{ gap: 8 }}>
          <label className="tiny faint" htmlFor="subnet-prefix-slider">
            前缀长度滑块
          </label>
          <span className="tiny mono" style={{ color: prefixOk ? 'var(--accent)' : 'var(--warn)' }}>
            {prefixOk ? `/${prefixNum}` : '非法'}
          </span>
          <span className="spacer" />
        </div>
        <input
          id="subnet-prefix-slider"
          type="range"
          min={MIN_PREFIX}
          max={MAX_PREFIX}
          step={1}
          value={sliderValue}
          onChange={(e) => applyPrefix(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent)', margin: '6px 0 0' }}
          aria-label={`前缀长度滑块，${MIN_PREFIX} 到 ${MAX_PREFIX}`}
        />
        <div className="hstack" style={{ justifyContent: 'space-between', marginTop: 2 }}>
          <span className="tiny faint">/{MIN_PREFIX}</span>
          <span className="tiny faint">/{MAX_PREFIX}</span>
        </div>
      </div>

      <div className="hstack" style={{ marginTop: 8, gap: 6 }}>
        <span className="tiny faint">快捷预设</span>
        {[24, 25, 26, 27, 28, 30].map((p) => (
          <button
            key={p}
            type="button"
            className={`btn btn-sm${prefixOk && prefixNum === p ? ' btn-primary' : ''}`}
            onClick={() => applyPrefix(p)}
            aria-pressed={prefixOk && prefixNum === p}
            aria-label={`使用 /${p} 掩码`}
          >
            /{p}
          </button>
        ))}
      </div>

      <div style={panelStyle}>
        <div className="hstack" style={{ gap: 8 }}>
          <strong style={{ fontSize: 13 }}>按主机数反推掩码</strong>
          <span className="tiny faint">需要容纳多少台主机？</span>
        </div>
        <div className="hstack" style={{ gap: 10, marginTop: 8, alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle} htmlFor="subnet-hosts">
              所需主机数
            </label>
            <input
              id="subnet-hosts"
              type="number"
              min={1}
              max={MAX_HOSTS}
              step={1}
              value={hostText}
              onChange={(e) => setHostText(e.target.value)}
              style={{ ...inputStyle, width: 120 }}
              aria-label="需要的主机数"
            />
          </div>
          {recommendation ? (
            <>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="tiny muted">
                  推荐{' '}
                  <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                    /{recommendation.prefix}
                  </span>{' '}
                  <span className="mono faint">({recommendation.mask})</span>，可用 {recommendation.usable} 台主机
                </div>
                <div className="tiny faint" style={{ marginTop: 3, lineHeight: 1.6 }}>
                  {recommendation.prefix <= 30
                    ? `整块 ${recommendation.block} 个地址：${hostNum} 台需求 + 2 个网络/广播 + ${recommendation.slack} 个预留，共浪费 ${recommendation.block - hostNum} 个。`
                    : recommendation.prefix === 31
                      ? '/31 点对点链路：整块 2 个地址全部可用，无网络/广播浪费。'
                      : '/32 主机路由：仅 1 个地址，无额外浪费。'}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => applyPrefix(recommendation.prefix)}
                aria-label={`套用推荐前缀 /${recommendation.prefix}`}
              >
                套用 /{recommendation.prefix}
              </button>
            </>
          ) : null}
        </div>
        {!hostOk ? (
          <div className="tiny" style={{ color: 'var(--warn)', marginTop: 6 }} role="status">
            {!hostTrim
              ? `输入 1 – ${MAX_HOSTS} 之间的整数，自动推荐最小可用掩码。`
              : hostNum > MAX_HOSTS
                ? `超出范围：/8 最多可用 ${MAX_HOSTS} 台主机。`
                : '主机数必须是 1 以上的整数。'}
          </div>
        ) : null}
      </div>

      {maskWarn ? (
        <div className="tiny" style={{ color: 'var(--warn)', marginTop: 6 }}>
          掩码格式无效：请输入连续的点分掩码（如 255.255.255.224）或 /{MIN_PREFIX}–/{MAX_PREFIX} 的前缀。
        </div>
      ) : null}

      {!valid ? (
        <div
          style={{
            marginTop: 12,
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid rgba(251, 191, 36, 0.32)',
            background: 'var(--warn-soft)',
            color: 'var(--warn)',
            fontSize: 12.5,
          }}
          role="alert"
        >
          {ipNum === null ? 'IP 地址不合法：请按点分十进制输入 4 段 0–255 的数字。' : null}
          {!prefixOk ? ` 前缀需在 /${MIN_PREFIX} – /${MAX_PREFIX} 之间（滑块范围），请输入整数。` : null}
        </div>
      ) : null}

      {valid && ipNum !== null ? (
        <>
          <div className="hstack" style={{ marginTop: 14, gap: 8 }}>
            <span className="badge accent">计算结果</span>
            <span className="tiny faint">
              {ipText.trim()}/{prefixNum}
            </span>
            <span className="spacer" />
            <CopyAction text={resultText} label="复制结果" />
          </div>

          <div className="block-kv" style={{ marginTop: 8 }}>
            <div className="kv-item">
              <div className="k">网络地址（网段）</div>
              <div className="v mono" style={{ color: 'var(--accent)' }}>
                {ipToString(netNum)}/{prefixNum}
              </div>
            </div>
            <div className="kv-item">
              <div className="k">广播地址</div>
              <div className="v mono" style={{ color: 'var(--accent-3)' }}>
                {ipToString(bcastNum)}
              </div>
            </div>
            <div className="kv-item">
              <div className="k">可用主机范围</div>
              <div className="v mono">
                {range.first} – {range.last}
              </div>
            </div>
            <div className="kv-item">
              <div className="k">可用主机数</div>
              <div className="v" style={{ color: 'var(--ok)' }}>
                {range.hosts} 台
                {prefixNum >= 31 ? <span className="tiny faint">（/31 点对点特例）</span> : null}
              </div>
            </div>
            <div className="kv-item">
              <div className="k">通配符掩码（反掩码）</div>
              <div className="v mono">{ipToString(wildNum)}</div>
            </div>
            <div className="kv-item">
              <div className="k">掩码 / 网段大小</div>
              <div className="v mono">
                {ipToString(maskNum)} · {blockSize} 个地址
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            <div className="tiny faint" style={{ marginBottom: 8 }}>
              二进制对照：前 {prefixNum} 位是网络位（青色），后 {32 - prefixNum} 位是主机位（蓝色）
            </div>
            {[ipBits, maskBits].map((bits, rowIndex) => (
              <div
                key={rowIndex}
                style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginTop: rowIndex === 0 ? 0 : 6,
                  fontFamily: 'var(--mono)',
                  fontSize: 11.5,
                  alignItems: 'baseline',
                }}
              >
                <span style={{ width: 28, flex: 'none', color: 'var(--text-faint)', fontSize: 10 }}>
                  {rowIndex === 0 ? 'IP' : '掩码'}
                </span>
                {[0, 1, 2, 3].map((octet) => (
                  <span key={octet} style={{ display: 'inline-flex', letterSpacing: 0.5 }}>
                    {bits
                      .slice(octet * 8, octet * 8 + 8)
                      .split('')
                      .map((bit, bi) => {
                        const idx = octet * 8 + bi;
                        const isNet = idx < prefixNum;
                        return (
                          <span
                            key={bi}
                            style={{
                              color: isNet ? (rowIndex === 0 ? 'var(--accent)' : 'var(--accent-2)') : 'var(--accent-3)',
                              opacity: isNet ? 1 : rowIndex === 0 ? 0.9 : 0.55,
                            }}
                          >
                            {bit}
                          </span>
                        );
                      })}
                  </span>
                ))}
              </div>
            ))}
            <div className="viz-legend" style={{ marginTop: 8 }}>
              <span>
                <span className="dot" style={{ background: 'var(--accent)' }} /> 网络位
              </span>
              <span>
                <span className="dot" style={{ background: 'var(--accent-3)' }} /> 主机位
              </span>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="hstack" style={{ marginBottom: 8 }}>
              <span className="tiny faint">平均划分为</span>
              {([2, 4, 8] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`btn btn-sm${split === n ? ' btn-primary' : ''}`}
                  onClick={() => setSplit(n)}
                  aria-label={`平均划分为 ${n} 个子网`}
                  aria-pressed={split === n}
                >
                  {n} 个子网
                </button>
              ))}
              <span className="tiny faint" style={{ marginLeft: 'auto' }}>
                新前缀 /{childPrefix > 32 ? '—' : childPrefix}，每个子网 {childPrefix > 32 ? '—' : 2 ** (32 - childPrefix)} 个地址
              </span>
            </div>

            {subnetError ? (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'var(--danger-soft)',
                  border: '1px solid rgba(248, 113, 113, 0.3)',
                  color: 'var(--danger)',
                  fontSize: 12,
                }}
              >
                {subnetError}
              </div>
            ) : (
              <div className="block-table">
                <table style={{ fontSize: 12, minWidth: 430 }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>网络地址</th>
                      <th>可用范围</th>
                      <th>广播地址</th>
                      <th>主机数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subnets.map((s) => (
                      <tr key={s.index}>
                        <td className="mono">{s.index}</td>
                        <td className="mono" style={{ color: 'var(--accent)' }}>
                          {s.cidr}
                        </td>
                        <td className="mono">
                          {s.first === s.last ? s.first : `${s.first} – ${s.last}`}
                        </td>
                        <td className="mono">{s.bcast}</td>
                        <td>{s.hosts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="viz-note" style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 10 }}>
            {ipText.trim()}/{prefixNum}：网络地址 = IP AND 掩码 = {ipToString(netNum)}；广播地址 = 网络地址 OR
            通配符 = {ipToString(bcastNum)}；可用 {range.first} – {range.last}，共 {range.hosts} 台主机。
            {split} 个子网即向主机位借 {subBits} 位，新前缀 /{childPrefix}。
          </div>
        </>
      ) : null}

      <div className="viz-controls">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            setIpText('192.168.10.34');
            setMaskText('255.255.255.224');
            setPrefixText('27');
            setMaskWarn(false);
            setSplit(4);
            setHostText('50');
          }}
          aria-label="恢复示例输入 192.168.10.34/27"
        >
          恢复示例
        </button>
        <span className="tiny faint" style={{ marginLeft: 'auto' }}>
          示例：192.168.10.34/27 → 网络 .32、广播 .63、可用 .33–.62、30 台主机
        </span>
      </div>
    </div>
  );
}
