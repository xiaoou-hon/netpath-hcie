import { useState } from 'react';
import { toast } from '@/components/ui';
import { copyToClipboard } from './utils';

export interface SetupGuideProps {
  open: boolean;
  onToggle: () => void;
}

function CommandLine({ command }: { command: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');

  const copy = async () => {
    const ok = await copyToClipboard(command);
    setState(ok ? 'ok' : 'fail');
    toast(ok ? '已复制到剪贴板' : '复制失败，请手动选择命令复制');
    window.setTimeout(() => setState('idle'), 1600);
  };

  return (
    <div className="ensp-cmd-line">
      <code>{command}</code>
      <span className="spacer" />
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        onClick={copy}
        aria-label={`复制命令 ${command}`}
      >
        {state === 'ok' ? '已复制' : state === 'fail' ? '复制失败' : '复制'}
      </button>
    </div>
  );
}

const steps: { title: string; text: string; commands?: string[] }[] = [
  {
    title: '启动本地桥接',
    text: '在项目根目录运行桥接程序；也可以一并启动前端开发服务器。',
    commands: ['npm run bridge', 'npm run dev:all'],
  },
  {
    title: '在 eNSP 打开或新建拓扑并启动设备',
    text: '确认设备已开机，且串口（Console）已被 eNSP 分配。两台设备之间请按场景要求连线。',
  },
  {
    title: '返回本页点击「重新扫描」',
    text: '扫描 2000–2050 端口，找到 eNSP 分配给设备的本地端口。',
  },
  {
    title: '连接设备并开始实验',
    text: '把端口映射到场景中的角色（如 R1），点击连接后即可在终端里执行命令。',
  },
];

export function SetupGuide({ open, onToggle }: SetupGuideProps) {
  return (
    <section className="card ensp-guide" aria-label="eNSP 接入引导">
      <button
        type="button"
        className="ensp-guide-head"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? '收起接入引导' : '展开接入引导'}
      >
        <span className="card-title">接入引导（4 步）</span>
        <span className="tiny faint">{open ? '收起' : '展开'}</span>
      </button>

      {open ? (
        <ol className="ensp-guide-steps">
          {steps.map((step, index) => (
            <li className="ensp-guide-step" key={step.title}>
              <span className="ensp-guide-num" aria-hidden="true">
                {index + 1}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="ensp-guide-title">{step.title}</div>
                <div className="small muted">{step.text}</div>
                {step.commands?.map((command) => (
                  <CommandLine key={command} command={command} />
                ))}
              </div>
            </li>
          ))}
          <li className="ensp-guide-step">
            <span className="ensp-guide-num" aria-hidden="true">
              选
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="ensp-guide-title">可选：安装 MCP 自动生成拓扑</div>
              <div className="small muted">
                仅用于按场景规格自动生成 eNSP 拓扑，不安装也不影响手工连线和实验。
              </div>
              <CommandLine command="git clone https://github.com/Heaxu/ensp-mcp.git && cd ensp-mcp && python -m pip install -e ." />
              <a
                className="tiny"
                href="https://github.com/Heaxu/ensp-mcp"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent)', display: 'inline-block', marginTop: 6 }}
              >
                打开 ensp-mcp 仓库
              </a>
            </div>
          </li>
        </ol>
      ) : null}
    </section>
  );
}
