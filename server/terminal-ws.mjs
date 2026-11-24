import { isIP } from 'node:net';
import { WebSocket, WebSocketServer } from 'ws';

const TERMINAL_PATH = '/api/ensp/terminal';
const MAX_BUFFERED_BYTES = 1024 * 1024;
const RESUME_BUFFERED_BYTES = 256 * 1024;

function rejectUpgrade(socket, status, message) {
  socket.write(
    `HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
  );
  socket.destroy();
}

function isLoopbackRequest(req) {
  const remote = req.socket.remoteAddress || '';
  const address = remote.startsWith('::ffff:') ? remote.slice(7) : remote;
  return address === '::1' || (isIP(address) === 4 && address.startsWith('127.'));
}

export function attachTerminalWebSocket({ server, sessions, isAllowedOrigin }) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

  function handleUpgrade(req, socket, head) {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (url.pathname !== TERMINAL_PATH) {
      rejectUpgrade(socket, 404, 'Not Found');
      return;
    }
    const origin = req.headers.origin;
    if (!isLoopbackRequest(req) || (origin && !isAllowedOrigin(origin))) {
      rejectUpgrade(socket, 403, 'Forbidden');
      return;
    }
    const sessionId = url.searchParams.get('sessionId');
    try {
      if (!sessionId) throw new Error('Missing sessionId');
      sessions.get(sessionId);
    } catch {
      rejectUpgrade(socket, 404, 'Not Found');
      return;
    }
    wss.handleUpgrade(req, socket, head, (webSocket) => {
      wss.emit('connection', webSocket, req, url);
    });
  }

  wss.on('connection', (socket, _req, url) => {
    const sessionId = url.searchParams.get('sessionId');
    let attachment;
    let blocked = false;
    let detached = false;

    const detach = () => {
      if (detached) return;
      detached = true;
      attachment?.detach();
    };

    const send = (message) => {
      if (socket.readyState !== WebSocket.OPEN) return true;
      try {
        socket.send(JSON.stringify(message), () => {
          if (blocked && socket.bufferedAmount <= RESUME_BUFFERED_BYTES) {
            blocked = false;
            attachment?.resume();
          }
        });
      } catch {
        detach();
        return true;
      }
      if (message.type === 'output' && socket.bufferedAmount > MAX_BUFFERED_BYTES) {
        blocked = true;
        return false;
      }
      return true;
    };

    const sendEvent = (event) => {
      const flowing = send(event);
      if (event.type === 'status') {
        send({ ...event, type: 'state' });
        if (event.status === 'closed') socket.close(1000);
      }
      return flowing;
    };

    try {
      attachment = sessions.attach(sessionId, sendEvent);
    } catch (error) {
      send({ type: 'error', code: error.code || 'session_error', message: error.message });
      socket.close(1011);
      return;
    }

    send({ type: 'ready', session: attachment.info });
    if (attachment.replay) send({ type: 'output', data: attachment.replay });
    if (attachment.info.status && attachment.info.status !== 'ready') {
      sendEvent({ type: 'status', status: attachment.info.status, reason: attachment.info.error || undefined });
    }

    socket.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString('utf8'));
        if (message.type === 'input') {
          sessions.write(sessionId, message.data);
        } else if (message.type === 'resize') {
          sessions.resize(sessionId, message.cols, message.rows);
        } else if (message.type === 'close') {
          sessions.remove(sessionId, '终端主动关闭');
        } else {
          throw new Error('Unsupported terminal message');
        }
      } catch (error) {
        send({
          type: 'error',
          code: error.code || 'invalid_message',
          message: error.message || 'Invalid terminal message',
        });
      }
    });
    socket.on('close', detach);
    socket.on('error', detach);
  });

  server.on('upgrade', handleUpgrade);
  return {
    clients: wss.clients,
    close() {
      server.off('upgrade', handleUpgrade);
      for (const socket of wss.clients) socket.terminate();
      return new Promise((resolve) => wss.close(() => resolve()));
    },
  };
}
