import net from 'node:net';
import { pathToFileURL } from 'node:url';

const DEFAULT_USER = process.env.MOCK_USER || 'admin';
const DEFAULT_PASS = process.env.MOCK_PASS || 'admin';

function maskFromLength(length) {
  const value = Number(length);
  if (!Number.isInteger(value) || value <= 0 || value > 32) return '255.255.255.0';
  const mask = value === 0 ? 0 : (0xffffffff << (32 - value)) >>> 0;
  return [24, 16, 8, 0].map((shift) => (mask >>> shift) & 0xff).join('.');
}

function currentPrompt(ctx) {
  if (!ctx.authed) return '';
  if (ctx.view === 'interface' && ctx.currentIf) {
    return `[${ctx.hostname}-${ctx.currentIf}]`;
  }
  if (ctx.view === 'system') return `[${ctx.hostname}]`;
  return `<${ctx.hostname}>`;
}

function reply(ctx, text = '') {
  let payload = '\r\n';
  if (text) {
    payload += text;
    if (!text.endsWith('\n')) payload += '\r\n';
  }
  payload += currentPrompt(ctx);
  ctx.socket.write(payload);
}

function interfaceRows(ctx) {
  const rows = ['Interface                         PHY   Protocol  IP Address'];
  for (const [name, config] of ctx.interfaces) {
    const protocol = config.up ? 'up' : 'down';
    const address = config.ip ? `${config.ip}/${config.maskLength}` : 'unassigned';
    rows.push(
      `${name.padEnd(33)} ${'up'.padEnd(5)} ${protocol.padEnd(9)} ${address}`,
    );
  }
  return rows.join('\r\n');
}

function currentConfiguration(ctx) {
  const lines = ['#', ` sysname ${ctx.hostname}`, '#'];
  for (const [name, config] of ctx.interfaces) {
    lines.push(`interface ${name}`);
    if (config.ip) lines.push(` ip address ${config.ip} ${maskFromLength(config.maskLength)}`);
    if (config.up) lines.push(' undo shutdown');
    lines.push('#');
  }
  lines.push('return');
  return lines.join('\r\n');
}

function pingOutput(target) {
  return [
    `Pinging ${target} with 32 bytes of data:`,
    `Reply from ${target}: bytes=32 time=1ms TTL=255`,
    `Reply from ${target}: bytes=32 time=1ms TTL=255`,
    '',
    `--- ${target} ping statistics ---`,
    '2 packet(s) transmitted',
    '2 packet(s) received',
    '0.00% packet loss',
  ].join('\r\n');
}

const TAB_COMMANDS = [
  'display', 'current-configuration', 'saved-configuration', 'ip', 'interface',
  'brief', 'routing-table', 'version', 'clock', 'arp', 'this',
  'system-view', 'sysname', 'vlan', 'ospf', 'bgp', 'acl', 'route-policy',
  'ip route-static', 'ip address', 'undo', 'shutdown', 'description',
  'quit', 'return', 'save', 'reboot', 'ping', 'tracert',
  'port', 'default', 'trunk', 'allow-pass', 'link-type', 'access', 'hybrid',
  'network', 'area', 'peer', 'router-id',
];

/** 模拟 VRP 对 Tab 的响应：唯一补全追加到当前行，多个则列出候选后重印行 */
function handleTabCompletion(ctx, partial) {
  const p = partial.toLowerCase().trim();
  const matches = TAB_COMMANDS.filter((c) => c.startsWith(p));
  if (matches.length === 0) {
    ctx.socket.write(`\r\n${currentPrompt(ctx)}${partial}`);
    return;
  }
  if (matches.length === 1) {
    ctx.socket.write(matches[0].slice(p.length));
    return;
  }
  ctx.socket.write(`\r\n${matches.join('   ')}\r\n`);
  ctx.socket.write(`${currentPrompt(ctx)}${partial}`);
}

function handleShellCommand(ctx, line) {
  const trimmed = line.trim();
  if (!trimmed) {
    reply(ctx, '');
    return;
  }

  const tokens = trimmed.split(/\s+/);
  const head = tokens[0].toLowerCase();

  if (trimmed.toLowerCase() === 'screen-length 0 temporary') {
    reply(ctx, ctx.screenLengthError ? 'Error: The type of the included user interface must be VTY.' : '');
    return;
  }

  if (trimmed.toLowerCase() === 'hang') {
    return; // Simulates an unresponsive device for timeout tests.
  }

  if (head === 'system-view') {
    ctx.view = 'system';
    ctx.currentIf = null;
    reply(ctx, 'Enter system view, return user view with Ctrl+Z.');
    return;
  }

  if (head === 'sysname' && tokens[1]) {
    ctx.hostname = tokens[1];
    reply(ctx, '');
    return;
  }

  if (head === 'interface' && tokens[1]) {
    if (ctx.view === 'user') {
      reply(ctx, 'Error: Unrecognized command found at \'^\' position.');
      return;
    }
    ctx.currentIf = tokens[1];
    if (!ctx.interfaces.has(tokens[1])) {
      ctx.interfaces.set(tokens[1], { ip: null, maskLength: 24, up: false });
    }
    ctx.view = 'interface';
    reply(ctx, '');
    return;
  }

  if (head === 'ip' && tokens[1] === 'address' && tokens[2]) {
    if (ctx.view !== 'interface' || !ctx.currentIf) {
      reply(ctx, 'Error: Unrecognized command found at \'^\' position.');
      return;
    }
    const config = ctx.interfaces.get(ctx.currentIf);
    config.ip = tokens[2];
    config.maskLength = Number(tokens[3]) || 24;
    reply(ctx, '');
    return;
  }

  if (head === 'undo' && tokens[1] === 'shutdown') {
    if (ctx.view === 'interface' && ctx.currentIf) {
      ctx.interfaces.get(ctx.currentIf).up = true;
    }
    reply(ctx, '');
    return;
  }

  if (head === 'quit') {
    if (ctx.view === 'interface') {
      ctx.view = 'system';
      ctx.currentIf = null;
    } else if (ctx.view === 'system') {
      ctx.view = 'user';
    }
    reply(ctx, '');
    return;
  }

  if (head === 'return') {
    ctx.view = 'user';
    ctx.currentIf = null;
    reply(ctx, '');
    return;
  }

  if (head === 'display' && tokens.slice(1).join(' ').toLowerCase() === 'ip interface brief') {
    reply(ctx, interfaceRows(ctx));
    return;
  }

  if (head === 'display' && tokens.slice(1).join(' ').toLowerCase() === 'current-configuration') {
    reply(ctx, currentConfiguration(ctx));
    return;
  }

  if (head === 'display' && tokens.slice(1).join(' ').toLowerCase() === 'version') {
    reply(
      ctx,
      [
        'Huawei Versatile Routing Platform Software',
        'VRP (R) software, Version 8.180 (AR2220 V200R019C10SPC500)',
        `Copyright (C) 2012-2024 Huawei Technologies Co., Ltd.`,
        `HUAWEI ${ctx.hostname} uptime is 0 days, 0 hours, 1 minute`,
      ].join('\r\n'),
    );
    return;
  }

  if (head === 'display' && tokens.slice(1).join(' ').toLowerCase() === 'clock') {
    reply(
      ctx,
      [
        '2026-01-01 00:00:00',
        'Thursday',
        `Time Zone(${ctx.hostname}) : UTC+08:00`,
      ].join('\r\n'),
    );
    return;
  }

  if (head === 'ping' && tokens[1]) {
    reply(ctx, pingOutput(tokens[1]));
    return;
  }

  reply(ctx, "Error: Unrecognized command found at '^' position.");
}

function handleLine(ctx, line) {
  if (!ctx.authed) {
    if (ctx.stage === 'username') {
      if (line.trim() === ctx.username) {
        ctx.stage = 'password';
        ctx.socket.write('\r\nPassword:');
      } else {
        ctx.socket.write('\r\nError: Login failed.\r\n\r\nUsername:');
      }
      return;
    }
    if (ctx.stage === 'password') {
      if (line.trim() === ctx.password) {
        ctx.authed = true;
        ctx.stage = 'shell';
        ctx.view = 'user';
        ctx.socket.write(`\r\n<${ctx.hostname}>`);
      } else {
        ctx.stage = 'username';
        ctx.socket.write('\r\nError: Login failed.\r\n\r\nUsername:');
      }
      return;
    }
  }
  handleShellCommand(ctx, line);
}

/**
 * Start a fake Huawei VRP console. Test/development fixture only.
 *
 * @param {{port?: number, host?: string, username?: string, password?: string,
 *          autoLogin?: boolean, hostname?: string}} options
 * @returns {Promise<{port: number, close: () => Promise<void>}>}
 */
export async function createMockDevice(options = {}) {
  const host = options.host || '127.0.0.1';
  const username = options.username || DEFAULT_USER;
  const password = options.password || DEFAULT_PASS;
  const hostname = options.hostname || process.env.MOCK_HOSTNAME || 'R1';
  const autoLogin = Boolean(options.autoLogin);
  const screenLengthError = Boolean(options.screenLengthError);
  const sockets = new Set();

  const server = net.createServer((socket) => {
    sockets.add(socket);
    const ctx = {
      socket,
      username,
      password,
      authed: autoLogin,
      stage: autoLogin ? 'shell' : 'username',
      view: 'user',
      hostname,
      currentIf: null,
      screenLengthError,
      interfaces: new Map(),
      input: '',
    };

    socket.setNoDelay(true);
    socket.on('error', () => {
      sockets.delete(socket);
    });
    socket.on('close', () => sockets.delete(socket));

    if (autoLogin) {
      socket.write(`\r\n<${hostname}>`);
    } else {
      socket.write('Username:');
    }

    socket.on('data', (chunk) => {
      ctx.input += chunk.toString('utf8');

      // 记录删除键实际到达的字节，用于验证客户端 DEL 到 VRP BS 的转换。
      if (ctx.authed) {
        if (chunk.includes(0x08)) ctx.socket.write('\r\nKEY:BS\r\n');
        if (chunk.includes(0x7f)) ctx.socket.write('\r\nKEY:DEL\r\n');
      }

      // Ctrl+C（\x03）取消当前输入行，重印提示符——用于设备端补全后复位。
      let ctrlC;
      while ((ctrlC = ctx.input.indexOf('\x03')) >= 0) {
        ctx.input = ctx.input.slice(ctrlC + 1);
        if (ctx.authed) ctx.socket.write(`\r\n${currentPrompt(ctx)}`);
      }

      // Tab（\t）触发行内补全，不产生换行。
      let tabIndex;
      while ((tabIndex = ctx.input.indexOf('\t')) >= 0) {
        const partial = ctx.input.slice(0, tabIndex).replace(/[\r\n]/g, '');
        ctx.input = ctx.input.slice(tabIndex + 1);
        if (ctx.authed) handleTabCompletion(ctx, partial);
      }

      let newlineMatch;
      while ((newlineMatch = /[\r\n]/.exec(ctx.input)) !== null) {
        const newlineIndex = newlineMatch.index;
        const line = ctx.input.slice(0, newlineIndex);
        const separatorLength = ctx.input[newlineIndex] === '\r' && ctx.input[newlineIndex + 1] === '\n' ? 2 : 1;
        ctx.input = ctx.input.slice(newlineIndex + separatorLength);
        // 真实 VRP console 会回显输入行；桥接以命令回显判定命令结束。
        if (ctx.authed) socket.write(`\r\n${line}`);
        handleLine(ctx, line);
      }
    });
  });

  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.removeListener('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.removeListener('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(options.port ?? 0, host);
  });

  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : options.port;

  const close = () =>
    new Promise((resolve) => {
      for (const socket of sockets) {
        try {
          socket.destroy();
        } catch {
          // ignore
        }
      }
      sockets.clear();
      server.close(() => resolve());
    });

  return { port: actualPort, close, server };
}

const isMain = (() => {
  try {
    return process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
  } catch {
    return false;
  }
})();

if (isMain) {
  const port = Number(process.env.MOCK_PORT || 2001);
  createMockDevice({ port })
    .then((handle) => {
      console.log(`[mock-device] VRP fixture listening on 127.0.0.1:${handle.port}`);
      const stop = () => {
        handle.close().then(() => process.exit(0));
      };
      process.on('SIGINT', stop);
      process.on('SIGTERM', stop);
    })
    .catch((error) => {
      console.error(`[mock-device] failed to start: ${error.message}`);
      process.exit(1);
    });
}

export default createMockDevice;
