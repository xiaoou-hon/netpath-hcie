import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const MAX_TOPO_BYTES = 5 * 1024 * 1024;

export class TopologyImportError extends Error {
  constructor(code, message, status = 400, detail) {
    super(message);
    this.name = 'TopologyImportError';
    this.code = code;
    this.status = status;
    if (detail !== undefined) this.detail = detail;
  }
}

function fail(code, message) {
  throw new TopologyImportError(code, message);
}

function asBuffer(value) {
  if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    fail('invalid_body', 'Topology upload must contain raw file bytes');
  }
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (bytes.length === 0) fail('empty_body', 'Topology file is empty');
  if (bytes.length > MAX_TOPO_BYTES) {
    throw new TopologyImportError('payload_too_large', 'Topology file exceeds 5 MiB limit', 413);
  }
  return bytes;
}

export function decodeTopologyXml(input) {
  const bytes = asBuffer(input);
  let encoding = 'utf-8';
  let offset = 0;
  let declared = '';

  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    offset = 3;
  } else if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = 'utf-16le';
    offset = 2;
  } else if (bytes.length >= 4 && bytes[0] === 0x3c && bytes[1] === 0 && bytes[2] === 0x3f && bytes[3] === 0) {
    encoding = 'utf-16le';
  } else {
    const declaration = bytes.subarray(0, Math.min(bytes.length, 256)).toString('latin1');
    const match = declaration.match(/<\?xml[^>]*encoding\s*=\s*["']\s*([A-Za-z0-9._-]+)\s*["']/i);
    if (match) declared = match[1].toLowerCase();
  }

  if (!offset && declared) {
    if (['unicode', 'utf-16', 'utf16', 'utf-16le', 'utf16le'].includes(declared)) {
      // eNSP writes encoding="UNICODE" for files that are actually single-byte; trust the bytes.
      encoding = bytes.includes(0) ? 'utf-16le' : 'utf-8';
    } else if (declared === 'utf8') {
      encoding = 'utf-8';
    } else if (declared === 'gbk' || declared === 'gb2312' || declared === 'gb18030') {
      encoding = 'gb18030';
    } else {
      encoding = declared;
    }
  }

  // Chinese eNSP exports declare UNICODE but may be GB18030; fall back when strict UTF-8 fails.
  if (encoding === 'utf-8' && declared && ['unicode', 'utf-16', 'utf16'].includes(declared)) {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(offset));
      return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    } catch {
      encoding = 'gb18030';
    }
  }
  if (!['utf-8', 'utf-16le', 'gb18030'].includes(encoding)) {
    fail('unsupported_encoding', `Unsupported topology encoding: ${encoding}`);
  }

  try {
    const text = new TextDecoder(encoding, { fatal: true }).decode(bytes.subarray(offset));
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  } catch {
    fail('invalid_encoding', `Topology file is not valid ${encoding}`);
  }
  return '';
}

function decodeEntities(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  let output = '';
  let offset = 0;
  while (offset < value.length) {
    const start = value.indexOf('&', offset);
    if (start < 0) break;
    output += value.slice(offset, start);
    const end = value.indexOf(';', start + 1);
    if (end < 0) fail('invalid_xml', 'XML contains an unterminated entity reference');
    const entity = value.slice(start + 1, end);
    if (Object.hasOwn(named, entity)) {
      output += named[entity];
    } else {
      const numeric = entity.match(/^#(?:x([0-9a-f]+)|([0-9]+))$/i);
      if (!numeric) fail('unsafe_xml', 'XML entity references are not allowed');
      const codePoint = Number.parseInt(numeric[1] || numeric[2], numeric[1] ? 16 : 10);
      if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
        fail('invalid_xml', 'XML contains an invalid character reference');
      }
      output += String.fromCodePoint(codePoint);
    }
    offset = end + 1;
  }
  return output + value.slice(offset);
}

function findTagEnd(xml, start) {
  let quote = '';
  for (let index = start; index < xml.length; index += 1) {
    const char = xml[index];
    if (quote) {
      if (char === quote) quote = '';
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return index;
    }
  }
  fail('invalid_xml', 'XML contains an unterminated tag');
  return -1;
}

function readName(source, state) {
  const match = source.slice(state.index).match(/^[A-Za-z_][A-Za-z0-9_.:-]*/);
  if (!match) fail('invalid_xml', 'XML contains an invalid element or attribute name');
  state.index += match[0].length;
  return match[0];
}

function skipSpace(source, state) {
  while (/\s/.test(source[state.index] || '')) state.index += 1;
}

function parseStartTag(source) {
  const state = { index: 0 };
  const name = readName(source, state);
  const attributes = {};
  let selfClosing = false;

  while (state.index < source.length) {
    const beforeSpace = state.index;
    skipSpace(source, state);
    if (state.index >= source.length) break;
    if (source[state.index] === '/') {
      state.index += 1;
      skipSpace(source, state);
      if (state.index !== source.length) fail('invalid_xml', `Malformed start tag <${name}>`);
      selfClosing = true;
      break;
    }
    if (state.index === beforeSpace) fail('invalid_xml', `Attributes in <${name}> must be separated by whitespace`);
    const attributeName = readName(source, state);
    if (Object.hasOwn(attributes, attributeName)) fail('invalid_xml', `Duplicate attribute ${attributeName}`);
    skipSpace(source, state);
    if (source[state.index] !== '=') fail('invalid_xml', `Attribute ${attributeName} has no value`);
    state.index += 1;
    skipSpace(source, state);
    const quote = source[state.index];
    if (quote !== '"' && quote !== "'") fail('invalid_xml', `Attribute ${attributeName} must be quoted`);
    state.index += 1;
    const end = source.indexOf(quote, state.index);
    if (end < 0) fail('invalid_xml', `Attribute ${attributeName} is unterminated`);
    const value = source.slice(state.index, end);
    if (value.includes('<')) fail('invalid_xml', `Attribute ${attributeName} contains an invalid character`);
    attributes[attributeName] = decodeEntities(value);
    state.index = end + 1;
  }

  return { name, attributes, selfClosing };
}

function parseXml(xml) {
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) {
    fail('unsafe_xml', 'DOCTYPE and ENTITY declarations are not allowed');
  }

  let root = null;
  const stack = [];
  let index = 0;

  const attach = (node) => {
    if (stack.length) {
      stack[stack.length - 1].children.push(node);
    } else if (root) {
      fail('invalid_xml', 'XML must contain exactly one root element');
    } else {
      root = node;
    }
  };

  while (index < xml.length) {
    if (xml[index] !== '<') {
      const end = xml.indexOf('<', index);
      const text = xml.slice(index, end < 0 ? xml.length : end);
      decodeEntities(text);
      if (!stack.length && text.trim()) fail('invalid_xml', 'Text is not allowed outside the root element');
      index = end < 0 ? xml.length : end;
      continue;
    }

    if (xml.startsWith('<!--', index)) {
      const end = xml.indexOf('-->', index + 4);
      if (end < 0) fail('invalid_xml', 'XML contains an unterminated comment');
      index = end + 3;
      continue;
    }
    if (xml.startsWith('<?', index)) {
      const end = xml.indexOf('?>', index + 2);
      if (end < 0) fail('invalid_xml', 'XML contains an unterminated processing instruction');
      index = end + 2;
      continue;
    }
    if (xml.startsWith('<![CDATA[', index)) {
      const end = xml.indexOf(']]>', index + 9);
      if (end < 0 || !stack.length) fail('invalid_xml', 'XML contains an invalid CDATA section');
      index = end + 3;
      continue;
    }
    if (xml.startsWith('<!', index)) fail('unsafe_xml', 'XML declarations are not allowed');

    const end = findTagEnd(xml, index + 1);
    const content = xml.slice(index + 1, end);
    if (content.startsWith('/')) {
      const closingName = content.slice(1).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(closingName) || !stack.length || stack[stack.length - 1].name !== closingName) {
        fail('invalid_xml', `Mismatched closing tag: ${closingName || '(empty)'}`);
      }
      stack.pop();
    } else {
      const parsed = parseStartTag(content);
      const node = { name: parsed.name, attributes: parsed.attributes, children: [] };
      attach(node);
      if (!parsed.selfClosing) stack.push(node);
    }
    index = end + 1;
  }

  if (stack.length) fail('invalid_xml', `Unclosed XML element: ${stack[stack.length - 1].name}`);
  if (!root) fail('invalid_xml', 'XML document has no root element');
  return root;
}

function childElements(node, name) {
  return node.children.filter((child) => child.name === name);
}

function firstChild(node, name) {
  return node.children.find((child) => child.name === name);
}

const ENSP_INTERFACE_PREFIXES = {
  GE: 'GigabitEthernet',
  Ethernet: 'Ethernet',
  XGE: 'XGigabitEthernet',
  '10GE': '10GE',
};

function enspInterfaceNames(slot) {
  const entries = [];
  for (const entry of childElements(slot, 'interface')) {
    const shortName = textField(entry.attributes, ['interfacename', 'interfaceName', 'name']);
    if (!shortName) continue;
    const count = optionalInteger(entry.attributes.count, 1, 'interface count');
    if (count < 1) fail('invalid_topology', 'Interface count must be positive');
    entries.push({ prefix: ENSP_INTERFACE_PREFIXES[shortName] || shortName, count });
  }

  const entryCounts = new Map();
  for (const entry of entries) entryCounts.set(entry.prefix, (entryCounts.get(entry.prefix) || 0) + 1);

  const names = [];
  const state = new Map();
  for (const { prefix, count } of entries) {
    const current = state.get(prefix) || { port: 0, board: 0 };
    const isBoard = entryCounts.get(prefix) > 1 && count >= 8;
    if (isBoard) {
      // 多端口扩展卡独立编板号，避免与主板端口重名。
      current.board += 1;
      for (let port = 0; port < count; port += 1) names.push(`${prefix}0/${current.board}/${port}`);
    } else {
      for (let offset = 0; offset < count; offset += 1) {
        names.push(`${prefix}0/0/${current.port + offset}`);
      }
      current.port += count;
    }
    state.set(prefix, current);
  }
  return names;
}

function xmlToRawTopology(root) {
  if (root.name !== 'topo') fail('invalid_topology', 'Topology XML root element must be <topo>');
  const devicesRoot = firstChild(root, 'devices');
  const linksRoot = firstChild(root, 'lines') || firstChild(root, 'links');
  const deviceNodes = devicesRoot
    ? devicesRoot.children.filter((child) => child.name === 'device' || child.name === 'dev')
    : root.children.filter((child) => child.name === 'device' || child.name === 'dev');
  const linkNodes = linksRoot
    ? linksRoot.children.filter((child) => child.name === 'link' || child.name === 'line')
    : root.children.filter((child) => child.name === 'link' || child.name === 'line');

  const interfaceNamesById = new Map();

  const devices = deviceNodes.map((device) => {
    const attributes = device.attributes;
    const boards = childElements(device, 'board').map((board) => {
      const boardAttributes = board.attributes;
      const interfaces = childElements(board, 'interface').map((item) => ({ ...item.attributes }));
      for (const group of childElements(board, 'interface_group')) {
        const groupAttributes = group.attributes;
        const count = requiredInteger(groupAttributes.count, `Interface group count on device ${attributes.id || '(unknown)'}`);
        if (count < 1) fail('invalid_topology', 'Interface group count must be positive');
        const firstPort = optionalInteger(groupAttributes.first_port, 0, 'first_port');
        const subslot = optionalInteger(groupAttributes.subslot, 0, 'subslot');
        const slot = optionalInteger(groupAttributes.slot ?? boardAttributes.slot, undefined, 'slot');
        if (slot === undefined) fail('invalid_topology', 'Interface group requires a board slot');
        if (!groupAttributes.prefix) fail('invalid_topology', 'Interface group requires a prefix');
        for (let portOffset = 0; portOffset < count; portOffset += 1) {
          const port = firstPort + portOffset;
          interfaces.push({
            name: `${groupAttributes.prefix}${slot}/${subslot}/${port}`,
            slot,
            subslot,
            port,
          });
        }
      }
      return { ...boardAttributes, interfaces };
    });

    const slotInterfaces = [];
    for (const slot of childElements(device, 'slot')) {
      for (const name of enspInterfaceNames(slot)) slotInterfaces.push({ name });
    }

    const directInterfaces = childElements(device, 'interface').map((item) => ({ ...item.attributes }));
    const ownInterfaces = [...directInterfaces, ...boards.flatMap((board) => board.interfaces), ...slotInterfaces];
    if (attributes.id) {
      interfaceNamesById.set(attributes.id, ownInterfaces.map((item) => item.name).filter(Boolean));
    }

    const raw = {
      ...attributes,
      boards,
      interfaces: ownInterfaces,
    };
    if (raw.x === undefined && attributes.cx !== undefined) raw.x = attributes.cx;
    if (raw.y === undefined && attributes.cy !== undefined) raw.y = attributes.cy;
    return raw;
  });

  const links = [];
  linkNodes.forEach((link) => {
    const pairs = childElements(link, 'interfacePair');
    const sourceDeviceId = textField(link.attributes, ['srcDeviceID', 'srcDeviceId', 'sourceDeviceID']);
    const targetDeviceId = textField(link.attributes, ['destDeviceID', 'destDeviceId', 'targetDeviceID']);
    if (pairs.length && sourceDeviceId && targetDeviceId) {
      const sourceNames = interfaceNamesById.get(sourceDeviceId) || [];
      const targetNames = interfaceNamesById.get(targetDeviceId) || [];
      pairs.forEach((pair, index) => {
        const sourceIndex = optionalInteger(pair.attributes.srcIndex, undefined, 'srcIndex');
        const targetIndex = optionalInteger(pair.attributes.tarIndex, undefined, 'tarIndex');
        if (sourceIndex === undefined || targetIndex === undefined) {
          fail('invalid_topology', 'Link interfacePair requires srcIndex and tarIndex');
        }
        // eNSP 的端口索引可能包含未在 <slot> 中展开的子卡；索引超界时用占位名保证拓扑可用。
        const sourceName = sourceNames[sourceIndex] || `port${sourceIndex + 1}`;
        const targetName = targetNames[targetIndex] || `port${targetIndex + 1}`;
        const linkName = textField(pair.attributes, ['lineName']) || `link-${links.length + 1}`;
        links.push({
          id: `link-${links.length + 1}-${index}`,
          name: linkName,
          source: { deviceId: sourceDeviceId, interfaceName: sourceName },
          target: { deviceId: targetDeviceId, interfaceName: targetName },
        });
      });
      return;
    }
    links.push({ ...link.attributes });
  });

  return {
    name: root.attributes.name,
    devices,
    links,
  };
}

function requiredInteger(value, label) {
  const parsed = optionalInteger(value, undefined, label);
  if (parsed === undefined) fail('invalid_topology', `${label} is required and must be an integer`);
  return parsed;
}

function optionalInteger(value, fallback, label) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed)) fail('invalid_topology', `${label} must be an integer`);
  return parsed;
}

function collection(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([id, item]) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) return { id, ...item };
      return { id, name: String(item) };
    });
  }
  return [];
}

function textField(record, names, { required = false, label = names[0] } = {}) {
  for (const name of names) {
    const value = record?.[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  if (required) fail('invalid_topology', `Device field "${label}" is required`);
  return undefined;
}

function numberField(record, names, fallback, label) {
  for (const name of names) {
    if (record?.[name] !== undefined && record?.[name] !== null && record?.[name] !== '') {
      return optionalInteger(record[name], fallback, label);
    }
  }
  return fallback;
}

function normalizeInterface(input, deviceId, board) {
  const record = typeof input === 'string' ? { name: input } : input || {};
  const name = textField(record, ['name', 'interfaceName', 'interface_name', 'id']);
  if (!name) fail('invalid_topology', `Device ${deviceId} has an interface without a name`);
  const match = name.match(/(\d+)\/(\d+)\/(\d+)$/);
  const slot = numberField(record, ['slot'], board?.slot ?? (match ? Number(match[1]) : undefined), 'interface slot');
  const subslot = numberField(record, ['subslot', 'subSlot'], match ? Number(match[2]) : undefined, 'interface subslot');
  const port = numberField(record, ['port', 'portIndex', 'port_index'], match ? Number(match[3]) : undefined, 'interface port');
  const result = { id: `${deviceId}::${name}`, name };
  if (slot !== undefined) result.slot = slot;
  if (subslot !== undefined) result.subslot = subslot;
  if (port !== undefined) result.port = port;
  return result;
}

function normalizeDevice(input) {
  const record = input || {};
  const id = textField(record, ['id', 'deviceId', 'device_id'], { required: true, label: 'id' });
  const name = textField(record, ['name', 'deviceName', 'device_name'], { required: true, label: 'name' });
  const model = textField(record, ['model', 'type', 'deviceType', 'device_type'], { required: true, label: 'model' });
  const comPort = numberField(record, ['comPort', 'com_port', 'consolePort', 'console_port'], 0, `${name} com_port`);
  if (comPort < 0 || comPort > 65535) fail('invalid_topology', `${name} com_port must be between 0 and 65535`);

  const boards = collection(record.boards).map((board, index) => ({
    slot: numberField(board, ['slot', 'slotId', 'slot_id'], index, `${name} board slot`),
    model: textField(board, ['model', 'type', 'name']) || 'unknown',
    interfaces: collection(board.interfaces),
  }));
  const interfaces = [
    ...collection(record.interfaces),
    ...boards.flatMap((board) => board.interfaces),
  ];
  const seenInterfaces = new Set();
  const normalizedInterfaces = [];
  for (const item of interfaces) {
    const normalized = normalizeInterface(item, id);
    if (seenInterfaces.has(normalized.name)) continue;
    seenInterfaces.add(normalized.name);
    normalizedInterfaces.push(normalized);
  }

  const positionRecord = record.position || record.coordinates || {};
  const xValue = record.x ?? positionRecord.x;
  const yValue = record.y ?? positionRecord.y;
  let position;
  if (xValue !== undefined || yValue !== undefined) {
    const x = Number(xValue);
    const y = Number(yValue);
    if (!Number.isFinite(x) || !Number.isFinite(y)) fail('invalid_topology', `${name} coordinates must be finite numbers`);
    position = { x, y };
  }

  const result = {
    id,
    name,
    model,
    comPort,
    vrpCapable: comPort !== 0 && !/^(?:PC|Server|Cloud)$/i.test(model),
    boards: boards.map(({ slot, model: boardModel }) => ({ slot, model: boardModel })),
    interfaces: normalizedInterfaces,
  };
  if (position) result.position = position;
  return result;
}

function normalizeEndpoint(link, key, devices) {
  const nested = link[key] || link[key === 'source' ? 'from' : 'to'] || {};
  const nestedRecord = typeof nested === 'string' ? { deviceId: nested } : nested;
  const deviceId = textField(nestedRecord, ['deviceId', 'device_id', 'device', 'id'])
    || textField(link, [`${key}Device`, `${key}_device`, `${key}DeviceId`, `${key}_device_id`]);
  const interfaceName = textField(nestedRecord, ['interfaceName', 'interface_name', 'interface', 'name'])
    || textField(link, [`${key}Interface`, `${key}_interface`, `${key}InterfaceName`, `${key}_interface_name`]);
  if (!deviceId || !interfaceName) fail('invalid_topology', `Link ${key} endpoint requires device and interface`);
  if (!devices.has(deviceId)) fail('invalid_topology', `Link references unknown device: ${deviceId}`);
  return { deviceId, interfaceName, interfaceId: `${deviceId}::${interfaceName}` };
}

export function normalizeTopology(raw, options = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    fail('invalid_topology', 'Topology parser returned no document');
  }
  const devices = collection(raw.devices ?? raw.nodes).map(normalizeDevice);
  const deviceIds = new Set();
  for (const device of devices) {
    if (deviceIds.has(device.id)) fail('invalid_topology', `Duplicate device id: ${device.id}`);
    deviceIds.add(device.id);
  }
  const links = collection(raw.links).map((link, index) => {
    const id = textField(link, ['id', 'linkId', 'link_id']) || `link-${index + 1}`;
    return {
      id,
      name: textField(link, ['name', 'linkName', 'link_name']) || id,
      source: normalizeEndpoint(link, 'source', deviceIds),
      target: normalizeEndpoint(link, 'target', deviceIds),
    };
  });
  const fileName = typeof options.fileName === 'string'
    ? options.fileName.replace(/^.*[\\/]/, '').replace(/\.topo$/i, '')
    : '';
  const source = options.source || { type: 'fallback-xml' };
  const result = {
    name: textField(raw, ['name', 'topologyName', 'topology_name']) || fileName || 'Imported topology',
    source,
    warnings: Array.isArray(options.warnings) ? options.warnings : [],
    devices,
    links,
  };
  return result;
}

export function parseTopologyBuffer(bytes, options = {}) {
  const xml = decodeTopologyXml(bytes);
  const raw = xmlToRawTopology(parseXml(xml));
  return normalizeTopology(raw, {
    ...options,
    source: options.source || { type: 'fallback-xml' },
  });
}

const TOOL_NAME_PRIORITY = [
  'import_topology',
  'import_topo',
  'parse_topology',
  'parse_topo',
  'load_topology',
  'load_topo',
  'read_topology',
  'open_topology',
];
const PATH_FIELDS = [
  'file_path',
  'filePath',
  'topo_path',
  'topoPath',
  'topo_file',
  'topoFile',
  'path',
  'filename',
  'fileName',
];

function selectImportTool(tools) {
  const candidates = tools.filter((tool) => {
    const name = tool?.name || '';
    if (/generate|create/i.test(name)) return false;
    return /(?:import|parse|load|read|open).*topo|topo.*(?:import|parse|load|read|open)/i.test(name);
  });
  candidates.sort((a, b) => {
    const aRank = TOOL_NAME_PRIORITY.indexOf(a.name);
    const bRank = TOOL_NAME_PRIORITY.indexOf(b.name);
    return (aRank < 0 ? TOOL_NAME_PRIORITY.length : aRank) - (bRank < 0 ? TOOL_NAME_PRIORITY.length : bRank);
  });
  return candidates[0];
}

function toolArguments(tool, temporaryPath) {
  const schema = tool.inputSchema && typeof tool.inputSchema === 'object' ? tool.inputSchema : {};
  const properties = schema.properties && typeof schema.properties === 'object' ? schema.properties : {};
  const keys = Object.keys(properties);
  let field = PATH_FIELDS.find((name) => Object.hasOwn(properties, name));
  if (!field && keys.length === 0) field = 'file_path';
  if (!field) {
    const required = Array.isArray(schema.required) ? schema.required : [];
    field = [...required, ...keys].find((name) => /file|path|topo/i.test(name));
  }
  if (!field) throw new Error(`MCP tool ${tool.name} has no supported topology path argument`);
  return { [field]: temporaryPath };
}

function unwrapMcpPayload(payload) {
  if (typeof payload === 'string') {
    let text = payload.trim();
    const fence = text.match(/^```(?:json|xml)?\s*([\s\S]*?)\s*```$/i);
    if (fence) text = fence[1].trim();
    if (text.startsWith('<')) return xmlToRawTopology(parseXml(text));
    try {
      return unwrapMcpPayload(JSON.parse(text));
    } catch (error) {
      if (error instanceof TopologyImportError) throw error;
      fail('invalid_topology', 'MCP import tool returned neither JSON nor XML');
    }
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    fail('invalid_topology', 'MCP import tool returned an empty document');
  }
  if (payload.devices || payload.nodes) return payload;
  for (const key of ['topology', 'topo', 'document', 'data', 'result']) {
    if (payload[key] && (typeof payload[key] === 'object' || typeof payload[key] === 'string')) {
      return unwrapMcpPayload(payload[key]);
    }
  }
  fail('invalid_topology', 'MCP import tool response has no devices');
  return undefined;
}

function waitWithAbort(promise, signal) {
  if (!signal) return promise;
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    Promise.resolve(promise).then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

async function importWithMcp(mcp, temporaryPath, fileName, signal) {
  if (!mcp || typeof mcp.getTools !== 'function' || typeof mcp.callTool !== 'function') {
    throw new Error('MCP client is unavailable');
  }
  const tools = await waitWithAbort(mcp.getTools(), signal);
  const tool = selectImportTool(Array.isArray(tools) ? tools : []);
  if (!tool) throw new Error('ensp-mcp offered no supported import tool');
  const result = await waitWithAbort(mcp.callTool(tool.name, toolArguments(tool, temporaryPath)), signal);
  const structured = result?.raw?.structuredContent ?? result?.structuredContent;
  const payload = structured !== undefined ? unwrapMcpPayload(structured) : unwrapMcpPayload(result?.text);
  return normalizeTopology(payload, {
    fileName,
    source: { type: 'ensp-mcp', tool: tool.name },
  });
}

function fallbackReason(error, temporaryPath) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.split(temporaryPath).join('<temporary-topo>').replace(/\s+/g, ' ').trim().slice(0, 500);
}

export async function importTopology(input, options = {}) {
  const signal = options.signal;
  signal?.throwIfAborted();
  const bytes = asBuffer(input);
  const tempRoot = options.tempRoot || os.tmpdir();
  const fileName = typeof options.fileName === 'string' ? options.fileName : '';
  let directory;
  let temporaryPath = '';
  try {
    directory = await fs.mkdtemp(path.join(tempRoot, 'netpath-topo-import-'));
    signal?.throwIfAborted();
    temporaryPath = path.join(directory, 'source.topo');
    await fs.writeFile(temporaryPath, bytes, { flag: 'wx', mode: 0o600 });
    signal?.throwIfAborted();

    let mcpError;
    try {
      return await importWithMcp(options.mcp, temporaryPath, fileName, signal);
    } catch (error) {
      if (signal?.aborted) signal.throwIfAborted();
      mcpError = error;
    }

    const reason = fallbackReason(mcpError, temporaryPath);
    return parseTopologyBuffer(bytes, {
      fileName,
      source: { type: 'fallback-xml', fallbackReason: reason },
      warnings: [{ code: 'mcp_fallback', message: reason }],
    });
  } finally {
    if (directory) await fs.rm(directory, { recursive: true, force: true });
  }
}
