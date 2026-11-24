import net from 'node:net';
import { detectView, findLastPrompt, deviceNameFromPrompt } from './telnet.mjs';

const cache = new Map();

export function clearScanCache() {
  cache.clear();
}

function classify(port, text) {
  const promptMatch = findLastPrompt(text);
  if (promptMatch) {
    return {
      state: 'shell',
      probeState: 'ready',
      name: deviceNameFromPrompt(promptMatch.prompt) || '',
      prompt: promptMatch.prompt,
      view: detectView(promptMatch.prompt),
    };
  }
  if (/Username:|Password:|Login:|login:/i.test(text)) {
    return { state: 'login', probeState: 'auth-pending', name: '' };
  }
  const meaningful = text.replace(/[\s\x00-\x1f]+/g, '');
  if (!meaningful || /boot|start(?:ing|up)?|initializ|loading|please wait|press ctrl/i.test(text)) {
    return { state: 'open', probeState: 'starting', name: '' };
  }
  return { state: 'open', probeState: 'error', reason: 'non_vrp', name: '' };
}

/**
 * Probe a single TCP port. Never authenticates, so device state is untouched.
 */
export function probePort(port, options = {}) {
  const connectTimeoutMs = options.connectTimeoutMs ?? 300;
  const readMs = options.readMs ?? 1500;

  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    let settled = false;
    let connected = false;
    let buffer = '';
    let connectTimer = null;
    let readTimer = null;
    let finishTimer = null;

    const cleanup = () => {
      clearTimeout(connectTimer);
      clearTimeout(readTimer);
      clearTimeout(finishTimer);
      socket.removeAllListeners();
      socket.destroy();
    };

    const finish = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const finishWithBuffer = (errorReason) => {
      const result = classify(port, buffer);
      if (errorReason && result.probeState === 'starting') {
        result.probeState = 'error';
        result.reason = errorReason;
      }
      finish({ port, ...result });
    };

    connectTimer = setTimeout(() => {
      finish({ port, failure: true, reason: 'timeout' });
    }, connectTimeoutMs);

    socket.once('connect', () => {
      connected = true;
      clearTimeout(connectTimer);
      // eNSP console 需回车才会输出提示符。
      socket.write('\r\n');
      readTimer = setTimeout(() => {
        if (buffer.length === 0) socket.write('\r\n');
      }, 600);
      finishTimer = setTimeout(() => {
        if (!settled) finishWithBuffer();
      }, readMs);
    });

    socket.on('data', (chunk) => {
      if (!connected || settled) return;
      buffer += chunk.toString('utf8');
      const result = classify(port, buffer);
      if (result.probeState !== 'starting') {
        finish({ port, ...result });
      }
    });

    socket.once('error', (error) => {
      if (!connected) {
        finish({ port, failure: true, reason: error.code || 'socket_error' });
      } else {
        finishWithBuffer(error.code || 'socket_error');
      }
    });

    socket.once('close', () => {
      if (!connected) {
        finish({ port, failure: true, reason: 'closed' });
      } else {
        finishWithBuffer('closed');
      }
    });
  });
}

async function runPool(ports, worker, concurrency = 32) {
  const results = [];
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, ports.length) }, async () => {
    for (;;) {
      const current = index;
      index += 1;
      if (current >= ports.length) return;
      results.push(await worker(ports[current]));
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Scan a port range / explicit port list for VRP consoles.
 * Results are cached for 5 seconds keyed by the requested range and ports.
 */
export async function scanPorts(options = {}) {
  const from = Number(options.from ?? 2000);
  const to = Number(options.to ?? 2050);
  const explicit = Array.isArray(options.ports)
    ? options.ports.map(Number)
    : String(options.ports || '')
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value));

  const ports = new Set();
  for (const port of explicit) {
    if (Number.isInteger(port) && port > 0 && port <= 65535) ports.add(port);
  }
  if (Number.isInteger(from) && Number.isInteger(to) && from > 0 && to >= from) {
    for (let port = from; port <= to; port += 1) ports.add(port);
  }
  const portList = [...ports].sort((a, b) => a - b);

  if (portList.length === 0) {
    return { devices: [], scanned: 0, cached: false, failures: [] };
  }

  const key = `${from}-${to}|${explicit.join(',')}`;
  const now = Date.now();
  const cachedEntry = cache.get(key);
  if (!options.force && cachedEntry && now - cachedEntry.at < (options.cacheTtlMs ?? 5000)) {
    return { ...cachedEntry.data, cached: true };
  }

  const results = await runPool(
    portList,
    (port) =>
      probePort(port, {
        connectTimeoutMs: options.connectTimeoutMs ?? 300,
        readMs: options.readMs ?? 1500,
      }),
    options.concurrency ?? 32,
  );

  const devices = [];
  const failures = [];
  for (const result of results) {
    if (result.failure) {
      failures.push({ port: result.port, reason: result.reason });
      continue;
    }
    devices.push(result);
  }
  devices.sort((a, b) => a.port - b.port);
  failures.sort((a, b) => a.port - b.port);

  const data = { devices, scanned: portList.length, cached: false, failures };
  if (!options.noCache) cache.set(key, { at: Date.now(), data });
  return data;
}

function isValidPort(port) {
  return Number.isInteger(port) && port > 0 && port <= 65535;
}

/**
 * Probe only the consoles declared by a static topology. Runtime results are
 * returned separately so a refresh cannot rewrite devices, links or coordinates.
 */
export async function probeTopology(topology, options = {}) {
  const devices = Array.isArray(topology?.devices) ? topology.devices : [];
  const mappings = options.mappings && typeof options.mappings === 'object' ? options.mappings : {};
  const plans = devices.map((device) => {
    const declaredPort = Number(device.comPort);
    const unavailableReason = /^(?:PC|Server|Cloud)$/i.test(device.model)
      ? 'non_vrp'
      : !isValidPort(declaredPort)
        ? 'no_console'
        : device.vrpCapable === false
          ? 'not_vrp_capable'
          : null;
    const manualPort = Number(mappings[device.id]);
    const manual = unavailableReason === null && isValidPort(manualPort);
    return {
      device,
      port: manual ? manualPort : declaredPort,
      mappingSource: manual ? 'manual' : isValidPort(declaredPort) ? 'topology' : 'none',
      unavailableReason,
    };
  });

  const portList = [...new Set(
    plans.filter((plan) => plan.unavailableReason === null).map((plan) => plan.port),
  )].sort((a, b) => a - b);
  const probe = options.probe || probePort;
  const probeOptions = {
    connectTimeoutMs: options.connectTimeoutMs ?? 300,
    readMs: options.readMs ?? 1500,
  };
  const probed = await runPool(
    portList,
    (port) => probe(port, probeOptions),
    options.concurrency ?? 32,
  );
  const resultsByPort = new Map(probed.map((result) => [result.port, result]));
  const failures = probed
    .filter((result) => result.failure)
    .map((result) => ({ port: result.port, reason: result.reason }))
    .sort((a, b) => a.port - b.port);

  const runtimeDevices = plans.map(({ device, port, mappingSource, unavailableReason }) => {
    const base = {
      deviceId: device.id,
      expectedName: device.name,
      port: isValidPort(port) ? port : 0,
      mappingSource,
    };
    if (unavailableReason) {
      return { ...base, state: 'unavailable', connectable: false, reason: unavailableReason };
    }
    const result = resultsByPort.get(port);
    if (!result || result.failure) {
      return {
        ...base,
        state: 'offline',
        connectable: false,
        reason: result?.reason || 'not_probed',
      };
    }
    let state = result.probeState
      || (result.state === 'shell' ? 'ready' : result.state === 'login' ? 'auth-pending' : 'starting');
    if (state === 'ready' && result.name && result.name !== device.name) state = 'name-mismatch';
    const reason = state === 'name-mismatch' ? 'hostname_mismatch' : result.reason;
    return {
      ...base,
      state,
      connectable: state === 'ready' || state === 'auth-pending',
      name: result.name || '',
      ...(result.prompt ? { prompt: result.prompt } : {}),
      ...(result.view ? { view: result.view } : {}),
      ...(reason ? { reason } : {}),
    };
  });

  return { devices: runtimeDevices, scanned: portList.length, failures };
}

export default scanPorts;
