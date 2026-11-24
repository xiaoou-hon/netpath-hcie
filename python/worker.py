"""NetPath Python sidecar — netmiko 设备执行器 + ntc-templates 结构化解析。

纯标准库 HTTP 服务（http.server），仅依赖 netmiko / ntc-templates / textfsm。
监听 127.0.0.1，默认端口 7710（可由 --port / WORKER_PORT 覆盖）。

路由：
  GET  /health        健康检查 + 会话数
  POST /connect       建立 netmiko 会话（telnet 到 eNSP 设备）
  POST /exec          执行单条命令（含配置命令，直接下发，无需确认）
  POST /disconnect    关闭会话
  POST /parse         纯解析：{command, output} -> 结构化 JSON（ntc-templates）

安全：
  - 仅监听 127.0.0.1，不对外暴露
  - 所有命令（show/display 只读与 system-view/interface 等配置命令）均直接下发；
    命令合法性由前端 / AI 决策层把控，sidecar 不做人工确认拦截。
"""
from __future__ import annotations

import json
import os
import re
import signal
import sys
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import netmiko
from netmiko import ConnectHandler
from netmiko.utilities import get_structured_data

# --- 定位 ntc-templates 模板目录，供 netmiko 自动解析使用 ---------------------
try:
    import ntc_templates as _ntc

    _TPL_DIR = os.path.join(os.path.dirname(_ntc.__file__), "templates")
except Exception:  # pragma: no cover - 仅在依赖异常时触发
    _TPL_DIR = ""

if _TPL_DIR and os.path.isdir(_TPL_DIR):
    os.environ.setdefault("NET_TEXTFSM", _TPL_DIR)

NETMIKO_VERSION = getattr(netmiko, "__version__", "unknown")

# netmiko 支持的设备类型；eNSP 通过 telnet 暴露 console，默认 huawei_telnet
SUPPORTED_DEVICE_TYPES = {
    "huawei_telnet",
    "huawei",
    "huawei_vrpv8",
    "huawei_olt",
    "huawei_smartax",
}

# 会话表：sessionId -> {"conn": netmiko 连接, "created": ts, "last": ts, "host": ...}
_SESSIONS: dict[str, dict] = {}
_SESSIONS_LOCK = threading.Lock()

# 空闲超时：30 分钟未活跃的会话自动回收
SESSION_IDLE_TIMEOUT = 30 * 60


# ---------------------------------------------------------------------------
# 辅助函数
# ---------------------------------------------------------------------------
def _detect_view(prompt: str, hostname: str | None) -> str:
    if not prompt:
        return "user"
    if hostname:
        h = re.escape(hostname)
        if re.search(rf"\[{h}-", prompt):
            return "interface"
        if re.search(rf"\[{h}[^-\]]", prompt) or re.search(rf"\[{h}\]", prompt):
            return "system"
    if ">" in prompt:
        return "user"
    return "system"


def _hostname_from_prompt(prompt: str) -> str | None:
    m = re.search(r"[<\[]([^\]>-]+)", prompt or "")
    return m.group(1) if m else None


def _reap_idle_sessions() -> None:
    """回收空闲超时的会话。"""
    now = time.time()
    with _SESSIONS_LOCK:
        stale = [
            sid
            for sid, meta in _SESSIONS.items()
            if now - meta.get("last", now) > SESSION_IDLE_TIMEOUT
        ]
        for sid in stale:
            meta = _SESSIONS.pop(sid, None)
            if meta:
                try:
                    meta["conn"].disconnect()
                except Exception:
                    pass


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(body)


def _read_body(handler: BaseHTTPRequestHandler) -> bytes:
    length = int(handler.headers.get("Content-Length") or 0)
    if length <= 0:
        return b""
    return handler.rfile.read(length)


def _strip_echo(command: str, output: str) -> str:
    """清理 netmiko 回显：去掉首尾空白与开头的命令回显行。

    netmiko 的 send_command_timing 在部分设备（含 eNSP/mock）上不会干净地
    strip 命令回显，output 可能以 '\\n<command>\\n' 开头；这会导致
    ntc-templates 的首行正则匹配失败（模板期望首行是真实回显）。
    这里手动清理，保证解析与前端展示都拿到干净回显。
    """
    text = (output or "").strip("\r\n")
    lines = text.splitlines()
    cmd = (command or "").strip()
    while lines and lines[0].strip() == cmd:
        lines.pop(0)
    return "\n".join(lines).strip("\r\n")


# 命令输出末尾的提示符，例如 `<R1>` / `[R1-GigabitEthernet0/0/0]`。
_PROMPT_TAIL_RE = re.compile(r"[<\[][^<>\[\]]{1,64}[>\]]\s*$")

# ping/tracert 需要等待探测结果，其余命令输出很短，可快速返回。
_LONG_OUTPUT_HEADS = {"ping", "tracert", "traceroute"}
_READ_ONLY_HEADS = {"display", "show"}


def _last_read_for(command: str) -> float:
    """按命令类型选择回显静默窗口，避免每条命令都固定等 2.5 秒。

    send_command_timing 只有在「连续 last_read 秒没有新数据」时才返回，
    所以配置命令的固定 2.5 秒会叠加成明显的操作延迟（10 条命令 25 秒）。
    """
    head = (command or "").strip().split()[0].lower() if (command or "").strip() else ""
    if head in _LONG_OUTPUT_HEADS:
        return 2.5
    if head in _READ_ONLY_HEADS:
        return 0.6
    return 0.3


def _parse_output(command: str, output: str, platform: str = "huawei_vrp"):
    """尝试用 ntc-templates 解析回显；失败返回 None（不抛异常，不影响主流程）。"""
    if not output or not command.strip():
        return None
    try:
        result = get_structured_data(output, platform=platform, command=command.strip())
        if isinstance(result, str):
            # netmiko 找不到匹配模板时会原样返回字符串
            return None
        return result
    except Exception:
        return None


# ---------------------------------------------------------------------------
# 路由处理
# ---------------------------------------------------------------------------
def _handle_connect(body: dict) -> tuple[int, dict]:
    host = (body.get("host") or "").strip()
    try:
        port = int(body.get("port") or 23)
    except (TypeError, ValueError):
        port = 23
    device_type = (body.get("deviceType") or "huawei_telnet").strip()
    if device_type not in SUPPORTED_DEVICE_TYPES:
        device_type = "huawei_telnet"
    username = body.get("username") or ""
    password = body.get("password") or ""

    if not host:
        return 400, {"ok": False, "error": "host is required"}

    device_params = {
        "device_type": device_type,
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "timeout": 15,
        "global_delay_factor": 1,
    }

    try:
        conn = ConnectHandler(**device_params)
        prompt = conn.find_prompt()
    except Exception as e:  # noqa: BLE001
        return 502, {
            "ok": False,
            "error": f"connect failed: {type(e).__name__}: {e}",
            "host": host,
            "port": port,
        }

    hostname = _hostname_from_prompt(prompt) or conn.base_prompt or host
    session_id = uuid.uuid4().hex[:16]
    now = time.time()
    with _SESSIONS_LOCK:
        _SESSIONS[session_id] = {
            "conn": conn,
            "host": host,
            "port": port,
            "deviceType": device_type,
            "hostname": hostname,
            "created": now,
            "last": now,
        }

    return 200, {
        "ok": True,
        "sessionId": session_id,
        "prompt": prompt,
        "hostname": hostname,
        "view": _detect_view(prompt, hostname),
        "deviceType": device_type,
    }


def _handle_exec(body: dict) -> tuple[int, dict]:
    session_id = (body.get("sessionId") or "").strip()
    command = body.get("command") or ""
    want_parse = bool(body.get("parse"))

    with _SESSIONS_LOCK:
        meta = _SESSIONS.get(session_id)

    if not meta:
        return 404, {"ok": False, "error": "session not found"}

    # 所有命令（含配置命令）直接下发，不做人工确认拦截。
    conn = meta["conn"]
    try:
        # send_command_timing 不依赖提示符正则匹配，对视图切换命令
        # （system-view / interface / quit）和简化 mock 设备更鲁棒。
        # strip_prompt=False：直接从回显末尾取提示符，省掉一次 find_prompt 往返。
        raw_output = conn.send_command_timing(
            command,
            strip_prompt=False,
            strip_command=True,
            last_read=_last_read_for(command),
            read_timeout=30,
        )
        text = (raw_output or "").strip("\r\n")
        lines = text.splitlines()
        if lines and _PROMPT_TAIL_RE.search(lines[-1].strip()):
            prompt = lines[-1].strip()
            text = "\n".join(lines[:-1])
        else:
            prompt = conn.find_prompt()
        output = _strip_echo(command, text)
    except Exception as e:  # noqa: BLE001
        return 502, {"ok": False, "error": f"exec failed: {type(e).__name__}: {e}"}

    meta["last"] = time.time()
    hostname = meta.get("hostname") or _hostname_from_prompt(prompt)

    result: dict = {
        "ok": True,
        "output": output,
        "prompt": prompt,
        "hostname": hostname,
        "view": _detect_view(prompt, hostname),
    }
    if want_parse:
        parsed = _parse_output(command, output)
        if parsed is not None:
            result["structured"] = parsed
        else:
            result["structured"] = None
            result["parseNote"] = "no matching template or parse failed; raw output retained"
    return 200, result


def _handle_disconnect(body: dict) -> tuple[int, dict]:
    session_id = (body.get("sessionId") or "").strip()
    with _SESSIONS_LOCK:
        meta = _SESSIONS.pop(session_id, None)
    if not meta:
        return 404, {"ok": False, "error": "session not found"}
    try:
        meta["conn"].disconnect()
    except Exception:
        pass
    return 200, {"ok": True, "sessionId": session_id}


def _handle_parse(body: dict) -> tuple[int, dict]:
    command = body.get("command") or ""
    output = body.get("output") or ""
    platform = (body.get("platform") or "huawei_vrp").strip()
    # 前端可能传入带命令回显的终端文本，先清理再解析。
    cleaned = _strip_echo(command, output)
    parsed = _parse_output(command, cleaned, platform)
    if parsed is None:
        return 200, {
            "ok": True,
            "structured": None,
            "parseNote": "no matching ntc-templates entry or parse failed; raw output retained",
        }
    return 200, {"ok": True, "structured": parsed}


def _handle_health() -> tuple[int, dict]:
    _reap_idle_sessions()
    with _SESSIONS_LOCK:
        count = len(_SESSIONS)
    return 200, {
        "ok": True,
        "service": "netpath-worker",
        "netmiko": NETMIKO_VERSION,
        "templatesDir": _TPL_DIR or None,
        "templatesReady": bool(_TPL_DIR and os.path.isdir(_TPL_DIR)),
        "sessions": count,
    }


# ---------------------------------------------------------------------------
# HTTP 服务器
# ---------------------------------------------------------------------------
_ROUTES = {
    ("GET", "/health"): lambda h, b: _handle_health(),
    ("POST", "/connect"): lambda h, b: _handle_connect(b),
    ("POST", "/exec"): lambda h, b: _handle_exec(b),
    ("POST", "/disconnect"): lambda h, b: _handle_disconnect(b),
    ("POST", "/parse"): lambda h, b: _handle_parse(b),
}


class _Handler(BaseHTTPRequestHandler):
    server_version = "NetPathWorker/1.0"

    def log_message(self, fmt, *args):  # noqa: D401 - 精简日志到 stdout
        sys.stderr.write("[worker] %s - %s\n" % (self.address_string(), fmt % args))

    def _dispatch(self):
        key = (self.command, self.path.split("?", 1)[0])
        route = _ROUTES.get(key)
        if route is None:
            _json_response(self, 404, {"ok": False, "error": "not found", "path": self.path})
            return
        try:
            raw = _read_body(self)
            body = json.loads(raw.decode("utf-8")) if raw else {}
        except (json.JSONDecodeError, UnicodeDecodeError):
            _json_response(self, 400, {"ok": False, "error": "invalid json body"})
            return
        try:
            status, payload = route(self, body)
        except Exception as e:  # noqa: BLE001
            status, payload = 500, {
                "ok": False,
                "error": f"internal: {type(e).__name__}: {e}",
            }
        _json_response(self, status, payload)

    def do_GET(self):  # noqa: N802 - http.server 约定
        self._dispatch()

    def do_POST(self):  # noqa: N802
        self._dispatch()

    def do_OPTIONS(self):  # noqa: N802 - 本地回环也放行预检
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


def _parse_port() -> int:
    for i, arg in enumerate(sys.argv):
        if arg == "--port" and i + 1 < len(sys.argv):
            try:
                return int(sys.argv[i + 1])
            except ValueError:
                break
    return int(os.environ.get("WORKER_PORT") or 7710)


def _shutdown(signum, frame):  # noqa: ARG001
    with _SESSIONS_LOCK:
        for meta in list(_SESSIONS.values()):
            try:
                meta["conn"].disconnect()
            except Exception:
                pass
        _SESSIONS.clear()
    os._exit(0)


def main() -> None:
    port = _parse_port()
    signal.signal(signal.SIGINT, _shutdown)
    try:
        signal.signal(signal.SIGTERM, _shutdown)
    except (AttributeError, ValueError):
        pass

    server = ThreadingHTTPServer(("127.0.0.1", port), _Handler)
    sys.stderr.write(
        f"[worker] netmiko={NETMIKO_VERSION} templatesReady="
        f"{bool(_TPL_DIR and os.path.isdir(_TPL_DIR))} listening on 127.0.0.1:{port}\n"
    )
    sys.stderr.flush()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        with _SESSIONS_LOCK:
            for meta in list(_SESSIONS.values()):
                try:
                    meta["conn"].disconnect()
                except Exception:
                    pass
        server.server_close()


if __name__ == "__main__":
    main()
