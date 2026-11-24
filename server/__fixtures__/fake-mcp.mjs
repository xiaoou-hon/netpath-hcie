import process from 'node:process';

const crash = process.argv.includes('--crash');

if (crash) {
  // Simulates an MCP server that dies immediately after being spawned.
  process.exit(1);
}

const TOOLS = [
  {
    name: 'echo',
    description: 'Echo the provided arguments',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'generate_topology',
    description: 'Return a fake topology document',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'fail_tool',
    description: 'Always fails',
    inputSchema: { type: 'object', properties: {} },
  },
];

function send(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function result(id, value) {
  send({ jsonrpc: '2.0', id, result: value });
}

function error(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

function handle(message) {
  if (!message || message.jsonrpc !== '2.0') return;
  const { id, method, params } = message;

  if (method === 'initialize') {
    result(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'fake-mcp', version: '9.9.9' },
    });
    return;
  }

  if (method === 'notifications/initialized') return;

  if (method === 'tools/list') {
    result(id, { tools: TOOLS });
    return;
  }

  if (method === 'tools/call') {
    const name = params && params.name;
    const args = (params && params.arguments) || {};
    if (name === 'echo') {
      result(id, {
        content: [{ type: 'text', text: JSON.stringify(args) }],
      });
      return;
    }
    if (name === 'generate_topology') {
      result(id, {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ devices: [{ name: 'R1' }, { name: 'R2' }], links: 1 }),
          },
        ],
      });
      return;
    }
    if (name === 'fail_tool') {
      result(id, {
        isError: true,
        content: [{ type: 'text', text: 'tool exploded' }],
      });
      return;
    }
    error(id, -32602, `Unknown tool: ${name}`);
    return;
  }

  if (id !== undefined) error(id, -32601, `Method not found: ${method}`);
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;
    try {
      handle(JSON.parse(line));
    } catch {
      // Ignore malformed input; a real server would return a parse error.
    }
  }
});

process.stdin.on('end', () => process.exit(0));
process.stdin.on('close', () => process.exit(0));
