import { useEffect, useMemo, useState } from 'react';
import { useStepper } from '../useStepper';
import { VizControls } from '../VizControls';

export const meta = {
  key: 'protocol-explorer',
  title: '协议逐包探索器',
  subtitle: '14 种协议 · 逐字节拆解',
  order: 26,
};

/* ------------------------------------------------------------------ */
/* 数据模型                                                            */
/* ------------------------------------------------------------------ */

type EndpointKey = 'client' | 'router' | 'resolver' | 'root' | 'tld' | 'auth' | 'server';
type Category = '基础' | '应用' | '安全';

const EP: Record<EndpointKey, { name: string; addr: string; short: string }> = {
  client: { name: '客户端', addr: '192.168.1.10', short: 'PC' },
  router: { name: '路由器', addr: '192.168.1.1', short: 'R' },
  resolver: { name: 'DNS 解析器', addr: '8.8.8.8', short: 'DNS' },
  root: { name: '根服务器', addr: '198.41.0.4', short: 'ROOT' },
  tld: { name: '顶级域服务器', addr: '192.5.6.30', short: 'TLD' },
  auth: { name: '权威服务器', addr: '203.0.113.53', short: 'AUTH' },
  server: { name: 'Web 服务器', addr: '203.0.113.10', short: 'SRV' },
};

const COLOR = {
  eth: '#6b8afd',
  ip: '#2fa8c9',
  tcp: '#f0a15a',
  udp: '#f0a15a',
  app: '#a78bfa',
  dns: '#e0b341',
  tls: '#22b573',
  icmp: '#e05d7a',
};

interface FieldSpec {
  name: string;
  bytes: string;
  value: string;
  note?: string;
}

interface LayerSpec {
  key: string;
  name: string;
  color: string;
  bytes: number;
  fields: FieldSpec[];
}

interface PacketSpec {
  time: string;
  from: EndpointKey;
  to: EndpointKey;
  proto: string;
  info: string;
  size: number;
  stage: number;
  note: string;
  layers: LayerSpec[];
}

interface ProtocolCase {
  key: string;
  name: string;
  cat: Category;
  tagline: string;
  desc: string;
  layer: string;
  port: string;
  transport: string;
  format: string;
  methods: string;
  rfc: string;
  stages: string[];
  packets: PacketSpec[];
}

/* ------------------------------------------------------------------ */
/* 报文字段构造器                                                      */
/* ------------------------------------------------------------------ */

const MAC = {
  client: '3c:52:82:1a:2b:01',
  gateway: '54:89:98:c4:1a:2b',
  server: '00:1e:67:aa:bb:cc',
};

function eth(src: string, dst: string, type = '0x0800（IPv4）'): LayerSpec {
  return {
    key: 'eth',
    name: '以太网帧头',
    color: COLOR.eth,
    bytes: 14,
    fields: [
      { name: '目的 MAC', bytes: '6', value: dst, note: '本链路下一跳的硬件地址，逐跳改写，端到端不变的是 IP。' },
      { name: '源 MAC', bytes: '6', value: src, note: '发送接口的硬件地址，只在当前链路内有效。' },
      { name: '类型', bytes: '2', value: type, note: '0x0800 表示上层承载 IPv4，0x86DD 表示 IPv6。' },
    ],
  };
}

function ip(src: string, dst: string, ttl: number, proto: string, size: number): LayerSpec {
  return {
    key: 'ip',
    name: 'IPv4 头',
    color: COLOR.ip,
    bytes: 20,
    fields: [
      { name: '版本 / 首部长度', bytes: '1', value: '4 / 5（20 字节）' },
      { name: '总长度', bytes: '2', value: `${size} 字节`, note: '包含 IP 头与负载，超过 MTU 时需要分片。' },
      { name: 'TTL', bytes: '1', value: `${ttl}`, note: '每经过一台三层设备减 1，减到 0 丢弃并回 ICMP 超时。' },
      { name: '协议号', bytes: '1', value: proto === 'UDP' ? '17（UDP）' : proto === 'ICMP' ? '1（ICMP）' : '6（TCP）' },
      { name: '源 IP', bytes: '4', value: src, note: '端到端逻辑地址，用于跨网络选路。' },
      { name: '目的 IP', bytes: '4', value: dst },
    ],
  };
}

function tcp(sport: number, dport: number, flags: string, seq = '0', ack = '0'): LayerSpec {
  return {
    key: 'tcp',
    name: 'TCP 头',
    color: COLOR.tcp,
    bytes: 20,
    fields: [
      { name: '源端口', bytes: '2', value: `${sport}`, note: '客户端临时端口，用来区分同一台主机上的不同连接。' },
      { name: '目的端口', bytes: '2', value: `${dport}`, note: '服务端监听端口，决定交给哪个应用进程。' },
      { name: '序号', bytes: '4', value: `Seq=${seq}`, note: '表示本段第一个字节的编号，用于排序与去重。' },
      { name: '确认号', bytes: '4', value: `Ack=${ack}`, note: '期望收到的下一个字节编号，表示此前数据都已收到。' },
      { name: '标志位', bytes: '2', value: flags, note: 'SYN 建连、ACK 确认、FIN 关闭、RST 重置、PSH 尽快上交。' },
      { name: '窗口', bytes: '2', value: '64240', note: '接收窗口，告诉对端还能发多少字节而不必等待确认。' },
    ],
  };
}

function udp(sport: number, dport: number, len: number): LayerSpec {
  return {
    key: 'udp',
    name: 'UDP 头',
    color: COLOR.udp,
    bytes: 8,
    fields: [
      { name: '源端口', bytes: '2', value: `${sport}` },
      { name: '目的端口', bytes: '2', value: `${dport}` },
      { name: '长度', bytes: '2', value: `${len} 字节`, note: '包含 8 字节 UDP 头与负载，UDP 不提供重传与排序。' },
      { name: '校验和', bytes: '2', value: '0x9c3e', note: '可选校验，覆盖伪首部 + UDP 头 + 负载。' },
    ],
  };
}

function payload(name: string, bytes: number, color: string, fields: FieldSpec[]): LayerSpec {
  return { key: 'app', name, color, bytes, fields };
}

function frame(o: {
  time: string;
  from: EndpointKey;
  to: EndpointKey;
  proto: string;
  info: string;
  size: number;
  stage: number;
  note: string;
  l4: LayerSpec;
  app?: LayerSpec;
  srcIp?: string;
  dstIp?: string;
  ttl?: number;
  ipProto?: string;
}): PacketSpec {
  const macOf = (k: EndpointKey) => (k === 'client' ? MAC.client : k === 'router' ? MAC.gateway : MAC.server);
  const ipProto = o.ipProto ?? (o.l4.key === 'udp' ? 'UDP' : 'TCP');
  const layers: LayerSpec[] = [
    eth(macOf(o.from), macOf(o.to)),
    ip(o.srcIp ?? EP[o.from].addr, o.dstIp ?? EP[o.to].addr, o.ttl ?? 64, ipProto, o.size),
    o.l4,
  ];
  if (o.app) layers.push(o.app);
  return {
    time: o.time,
    from: o.from,
    to: o.to,
    proto: o.proto,
    info: o.info,
    size: o.size,
    stage: o.stage,
    note: o.note,
    layers,
  };
}

/* ------------------------------------------------------------------ */
/* 14 个协议的报文流                                                    */
/* ------------------------------------------------------------------ */

const DNS_QUERY = (q: string) =>
  payload('DNS 查询', 33, COLOR.dns, [
    { name: '事务 ID', bytes: '2', value: '0x1a2b', note: '客户端生成，响应必须带回同一个 ID 才能配对。' },
    { name: '标志', bytes: '2', value: 'RD=1（期望递归）' },
    { name: '问题数', bytes: '2', value: '1' },
    { name: '查询名', bytes: '17', value: q, note: '按标签编码的域名，末尾以 0 长度标签结束。' },
    { name: '查询类型 / 类', bytes: '4', value: 'A / IN', note: 'A 查 IPv4，AAAA 查 IPv6，CNAME 查别名。' },
  ]);

const DNS_ANSWER = (value: string, ttl: string) =>
  payload('DNS 响应', 56, COLOR.dns, [
    { name: '事务 ID', bytes: '2', value: '0x1a2b', note: '与查询相同，客户端据此匹配请求。' },
    { name: '标志', bytes: '2', value: 'QR=1, RA=1（响应）' },
    { name: '回答数', bytes: '2', value: '1' },
    { name: '资源记录', bytes: '16', value: `A ${value}`, note: '权威或缓存给出的地址记录。' },
    { name: 'TTL', bytes: '4', value: `${ttl} 秒`, note: '允许缓存的时间，过期后需要重新查询。' },
  ]);

const HTTP_GET = payload('HTTP 请求', 436, COLOR.app, [
  { name: '请求行', bytes: '18', value: 'GET / HTTP/1.1', note: '方法 + 资源路径 + 协议版本。' },
  { name: 'Host', bytes: '21', value: 'www.example.com', note: '同一 IP 承载多个站点时，服务器靠 Host 区分虚拟主机。' },
  { name: 'User-Agent', bytes: '78', value: 'Mozilla/5.0 …' },
  { name: 'Accept', bytes: '60', value: 'text/html,application/xhtml+xml' },
  { name: '空行', bytes: '2', value: 'CRLF CRLF', note: '头部结束标志，之后才是可选正文。' },
]);

const HTTP_200 = payload('HTTP 响应', 12380, COLOR.app, [
  { name: '状态行', bytes: '17', value: 'HTTP/1.1 200 OK', note: '状态码 200 表示请求成功，3xx 跳转，4xx 客户端错，5xx 服务端错。' },
  { name: 'Content-Type', bytes: '24', value: 'text/html; charset=utf-8' },
  { name: 'Content-Length', bytes: '20', value: '12362', note: '正文长度，接收方据此判断什么时候读完。' },
  { name: '正文', bytes: '12319', value: '<!DOCTYPE html> …' },
]);

const PROTOCOLS: ProtocolCase[] = [
  {
    key: 'http',
    name: 'HTTP',
    cat: '应用',
    tagline: '超文本传输',
    desc: '浏览器与 Web 服务器之间的请求 / 响应协议：先解析域名，再建立 TCP，最后交换文本报文。',
    layer: '应用层（第 7 层）',
    port: '80（HTTPS 为 443）',
    transport: 'TCP',
    format: '文本（头部 + 可选正文）',
    methods: 'GET / POST / PUT / DELETE / HEAD',
    rfc: 'RFC 9110、RFC 9112',
    stages: ['DNS 解析', 'TCP 连接', 'HTTP 请求', 'HTTP 响应', '页面渲染'],
    packets: [
      frame({
        time: '0.000s', from: 'client', to: 'resolver', proto: 'DNS', info: 'Standard query A www.example.com',
        size: 75, stage: 0,
        note: '浏览器先问 DNS：www.example.com 的 IP 是多少？此时还没有向 Web 服务器发送任何内容。',
        l4: udp(52444, 53, 41), app: DNS_QUERY('www.example.com'),
      }),
      frame({
        time: '0.012s', from: 'resolver', to: 'client', proto: 'DNS', info: 'Standard query response A 203.0.113.10',
        size: 91, stage: 0,
        note: '解析器返回 A 记录并附带 TTL。浏览器拿到地址后才会发起 TCP 连接。',
        l4: udp(53, 52444, 57), app: DNS_ANSWER('203.0.113.10', '300'),
      }),
      frame({
        time: '0.013s', from: 'client', to: 'server', proto: 'TCP', info: '52444 → 80 [SYN] Seq=0',
        size: 66, stage: 1, note: '第一次握手：客户端请求建立连接，并告知自己的初始序号。',
        l4: tcp(52444, 80, 'SYN', '0', '-'),
      }),
      frame({
        time: '0.024s', from: 'server', to: 'client', proto: 'TCP', info: '80 → 52444 [SYN, ACK] Seq=0 Ack=1',
        size: 66, stage: 1, note: '第二次握手：服务器同意建连，同时确认客户端的 SYN。',
        l4: tcp(80, 52444, 'SYN, ACK', '0', '1'),
      }),
      frame({
        time: '0.025s', from: 'client', to: 'server', proto: 'TCP', info: '52444 → 80 [ACK] Seq=1 Ack=1',
        size: 54, stage: 1, note: '第三次握手：连接建立完成，可以开始传数据。',
        l4: tcp(52444, 80, 'ACK', '1', '1'),
      }),
      frame({
        time: '0.026s', from: 'client', to: 'server', proto: 'HTTP', info: 'GET / HTTP/1.1',
        size: 484, stage: 2, note: 'HTTP 请求被拆成 TCP 段发送，首部字段决定服务器如何响应。',
        l4: tcp(52444, 80, 'PSH, ACK', '1', '1'), app: HTTP_GET,
      }),
      frame({
        time: '0.058s', from: 'server', to: 'client', proto: 'HTTP', info: 'HTTP/1.1 200 OK (text/html)',
        size: 12480, stage: 3, note: '响应体通常远大于请求；大响应会分成多个 TCP 段并逐段确认。',
        l4: tcp(80, 52444, 'PSH, ACK', '1', '437'), app: HTTP_200,
      }),
    ],
  },
  {
    key: 'https',
    name: 'HTTPS',
    cat: '安全',
    tagline: 'HTTP over TLS',
    desc: '在 HTTP 与 TCP 之间插入 TLS：先完成证书校验与密钥协商，之后的 HTTP 内容全部加密。',
    layer: '应用层（第 7 层，TLS 承载）',
    port: '443',
    transport: 'TCP',
    format: 'TLS 记录（二进制）+ HTTP',
    methods: '同 HTTP',
    rfc: 'RFC 8446（TLS 1.3）、RFC 9110',
    stages: ['DNS 解析', 'TCP 连接', 'TLS 握手', '加密传输', '页面渲染'],
    packets: [
      frame({
        time: '0.000s', from: 'client', to: 'resolver', proto: 'DNS', info: 'Standard query A www.example.com',
        size: 75, stage: 0, note: 'HTTPS 与 HTTP 的第一步相同：先解析域名。',
        l4: udp(52444, 53, 41), app: DNS_QUERY('www.example.com'),
      }),
      frame({
        time: '0.014s', from: 'client', to: 'server', proto: 'TCP', info: '52445 → 443 [SYN] Seq=0',
        size: 66, stage: 1, note: 'TLS 跑在 TCP 之上，因此仍然是三次握手先建连。',
        l4: tcp(52445, 443, 'SYN', '0', '-'),
      }),
      frame({
        time: '0.026s', from: 'server', to: 'client', proto: 'TCP', info: '443 → 52445 [SYN, ACK] Seq=0 Ack=1',
        size: 66, stage: 1, note: '服务器确认建连，此时还没有任何加密协商。',
        l4: tcp(443, 52445, 'SYN, ACK', '0', '1'),
      }),
      frame({
        time: '0.027s', from: 'client', to: 'server', proto: 'TLS', info: 'Client Hello (TLS 1.3)',
        size: 517, stage: 2,
        note: '客户端列出支持的版本、密码套件、SNI 与密钥共享参数。SNI 让服务器知道要出示哪张证书。',
        l4: tcp(52445, 443, 'PSH, ACK', '1', '1'),
        app: payload('TLS ClientHello', 453, COLOR.tls, [
          { name: '记录类型', bytes: '1', value: '22（Handshake）' },
          { name: '版本', bytes: '2', value: 'TLS 1.3', note: 'TLS 1.3 把密钥协商压缩到 1-RTT。' },
          { name: 'SNI', bytes: '17', value: 'www.example.com', note: '服务器据此选择证书，也是中间设备识别站点的依据。' },
          { name: '密码套件', bytes: '32', value: 'TLS_AES_128_GCM_SHA256 …' },
          { name: '密钥共享', bytes: '65', value: 'x25519 公钥', note: '客户端公钥，用于派生会话密钥。' },
        ]),
      }),
      frame({
        time: '0.052s', from: 'server', to: 'client', proto: 'TLS', info: 'Server Hello, Certificate, Finished',
        size: 2846, stage: 2,
        note: '服务器选定参数、出示证书链并完成自己的握手消息；客户端校验证书链与域名。',
        l4: tcp(443, 52445, 'PSH, ACK', '1', '454'),
        app: payload('TLS ServerHello + Certificate', 2782, COLOR.tls, [
          { name: '选定套件', bytes: '2', value: 'TLS_AES_128_GCM_SHA256' },
          { name: '证书链', bytes: '2140', value: 'CN=www.example.com', note: '客户端用内置根证书验证签名、有效期与域名是否匹配。' },
          { name: 'Finished', bytes: '36', value: 'HMAC 校验', note: '证明握手过程未被篡改。' },
        ]),
      }),
      frame({
        time: '0.055s', from: 'client', to: 'server', proto: 'TLS', info: 'Finished（客户端）',
        size: 74, stage: 2, note: '双方都验证通过后，握手结束，后续记录全部用会话密钥加密。',
        l4: tcp(52445, 443, 'PSH, ACK', '454', '2837'),
        app: payload('TLS Finished', 10, COLOR.tls, [
          { name: '验证数据', bytes: '10', value: 'HMAC', note: '对握手 transcript 做校验，失败则立即断开。' },
        ]),
      }),
      frame({
        time: '0.056s', from: 'client', to: 'server', proto: 'HTTPS', info: 'Application Data（GET /）',
        size: 530, stage: 3, note: 'HTTP 请求被加密成 TLS 应用数据，中间设备只能看到长度与时间。',
        l4: tcp(52445, 443, 'PSH, ACK', '454', '2837'),
        app: payload('TLS Application Data', 466, COLOR.app, [
          { name: '密文', bytes: '438', value: 'Encrypted(HTTP GET /)' },
          { name: '认证标签', bytes: '16', value: 'AEAD Tag' },
        ]),
      }),
      frame({
        time: '0.089s', from: 'server', to: 'client', proto: 'HTTPS', info: 'Application Data（200 OK）',
        size: 12480, stage: 3, note: '响应同样加密；这就是抓包时 HTTPS 只能看到 TLS 记录、看不到正文的原因。',
        l4: tcp(443, 52445, 'PSH, ACK', '2837', '920'),
        app: payload('TLS Application Data', 12416, COLOR.app, [
          { name: '密文', bytes: '12400', value: 'Encrypted(HTTP 200)' },
          { name: '认证标签', bytes: '16', value: 'AEAD Tag' },
        ]),
      }),
    ],
  },
  {
    key: 'tcp',
    name: 'TCP',
    cat: '基础',
    tagline: '可靠传输',
    desc: '面向连接的字节流协议：序号、确认、重传与窗口共同保证数据按序、可靠地送达。',
    layer: '传输层（第 4 层）',
    port: '任意端口',
    transport: '—',
    format: '字节流（20 字节起的头部）',
    methods: 'SYN / ACK / FIN / RST / PSH',
    rfc: 'RFC 9293',
    stages: ['建立连接', '数据传输', '确认与重传', '释放连接'],
    packets: [
      frame({
        time: '0.000s', from: 'client', to: 'server', proto: 'TCP', info: '[SYN] Seq=0 Win=64240',
        size: 66, stage: 0, note: 'SYN 携带初始序号与窗口，不携带业务数据。',
        l4: tcp(52444, 443, 'SYN', '0', '-'),
      }),
      frame({
        time: '0.021s', from: 'server', to: 'client', proto: 'TCP', info: '[SYN, ACK] Seq=0 Ack=1',
        size: 66, stage: 0, note: '服务端同时确认并发出自己的 SYN。',
        l4: tcp(443, 52444, 'SYN, ACK', '0', '1'),
      }),
      frame({
        time: '0.022s', from: 'client', to: 'server', proto: 'TCP', info: '[ACK] Seq=1 Ack=1',
        size: 54, stage: 0, note: '连接建立。之后每个字节都落在某个序号区间内。',
        l4: tcp(52444, 443, 'ACK', '1', '1'),
      }),
      frame({
        time: '0.023s', from: 'client', to: 'server', proto: 'TCP', info: 'Seq=1 Len=1460 [PSH, ACK]',
        size: 1514, stage: 1, note: '1460 字节正好避开 20+20 字节头部，使整帧不超过 1500 字节 MTU。',
        l4: tcp(52444, 443, 'PSH, ACK', '1', '1'),
      }),
      frame({
        time: '0.045s', from: 'server', to: 'client', proto: 'TCP', info: '[ACK] Seq=1 Ack=1461',
        size: 54, stage: 2, note: '接收方确认收到 1460 字节；超时未收到确认就会重传。',
        l4: tcp(443, 52444, 'ACK', '1', '1461'),
      }),
      frame({
        time: '0.120s', from: 'client', to: 'server', proto: 'TCP', info: '[FIN, ACK] Seq=1461',
        size: 66, stage: 3, note: '数据传输结束，客户端发起第一次挥手。',
        l4: tcp(52444, 443, 'FIN, ACK', '1461', '1'),
      }),
      frame({
        time: '0.142s', from: 'server', to: 'client', proto: 'TCP', info: '[FIN, ACK] Seq=1 Ack=1462',
        size: 66, stage: 3, note: '服务端确认并发出自己的 FIN。',
        l4: tcp(443, 52444, 'FIN, ACK', '1', '1462'),
      }),
      frame({
        time: '0.143s', from: 'client', to: 'server', proto: 'TCP', info: '[ACK] Seq=1462 Ack=2',
        size: 54, stage: 3, note: '连接完全关闭，端口进入 TIME_WAIT 以处理迟到报文。',
        l4: tcp(52444, 443, 'ACK', '1462', '2'),
      }),
    ],
  },
  {
    key: 'udp',
    name: 'UDP',
    cat: '基础',
    tagline: '数据报传输',
    desc: '无连接、不重传的最小传输层协议：只做端口寻址与校验，把可靠性交给上层。',
    layer: '传输层（第 4 层）',
    port: '任意端口',
    transport: '—',
    format: '数据报（8 字节头）',
    methods: '无连接 / 不重传 / 不排序',
    rfc: 'RFC 768',
    stages: ['无连接发送', '响应返回', '持续传输'],
    packets: [
      frame({
        time: '0.000s', from: 'client', to: 'resolver', proto: 'DNS', info: 'Standard query A www.example.com',
        size: 75, stage: 0, note: 'DNS 默认走 UDP：一次问答就能完成，省去建连开销。',
        l4: udp(52444, 53, 41), app: DNS_QUERY('www.example.com'),
      }),
      frame({
        time: '0.011s', from: 'resolver', to: 'client', proto: 'DNS', info: 'Standard query response A 203.0.113.10',
        size: 91, stage: 1, note: '响应超过 512 字节或做区域传送时会改用 TCP。',
        l4: udp(53, 52444, 57), app: DNS_ANSWER('203.0.113.10', '300'),
      }),
      frame({
        time: '0.500s', from: 'client', to: 'server', proto: 'UDP', info: 'RTP 媒体包 Len=1200',
        size: 1228, stage: 2, note: '实时音视频宁可丢包也不等待重传，抖动由播放缓冲吸收。',
        l4: udp(40000, 5004, 1200),
        app: payload('RTP 负载', 1192, COLOR.udp, [
          { name: '序列号', bytes: '2', value: '34712', note: '接收端据此发现丢包与乱序。' },
          { name: '时间戳', bytes: '4', value: '90000 Hz 时钟' },
          { name: '编码负载', bytes: '1186', value: 'H.264 / Opus' },
        ]),
      }),
    ],
  },
  {
    key: 'ip',
    name: 'IP',
    cat: '基础',
    tagline: '网际寻址',
    desc: '无连接的三层转发：每台路由器按目的 IP 查表、改写二层头、递减 TTL，逐跳把包送到终点。',
    layer: '网络层（第 3 层）',
    port: '—',
    transport: '—',
    format: 'IPv4 分组（20–60 字节头）',
    methods: '尽力而为 / 逐跳转发',
    rfc: 'RFC 791',
    stages: ['本地封装', '逐跳转发', '交付与回程'],
    packets: [
      frame({
        time: '0.000s', from: 'client', to: 'server', proto: 'IP', info: 'ICMP Echo Request（TTL 64）',
        size: 98, stage: 0, note: '主机先判断目的地址不在本网段，于是把包交给默认网关。',
        ipProto: 'ICMP', ttl: 64,
        l4: payload('ICMP Echo', 64, COLOR.icmp, [
          { name: '类型 / 代码', bytes: '2', value: '8 / 0（Echo Request）' },
          { name: '标识 / 序号', bytes: '4', value: '0x00a1 / 1' },
          { name: '数据', bytes: '56', value: 'abcd…' },
        ]),
      }),
      frame({
        time: '0.006s', from: 'router', to: 'server', proto: 'IP', info: 'ICMP Echo Request（TTL 63）',
        size: 98, stage: 1, note: '路由器转发时 TTL 减 1、重算校验和、改写源/目的 MAC，但 IP 地址不变。',
        ipProto: 'ICMP', ttl: 63, srcIp: EP.client.addr, dstIp: EP.server.addr,
        l4: payload('ICMP Echo', 64, COLOR.icmp, [
          { name: '类型 / 代码', bytes: '2', value: '8 / 0（Echo Request）' },
          { name: '标识 / 序号', bytes: '4', value: '0x00a1 / 1' },
          { name: '数据', bytes: '56', value: 'abcd…' },
        ]),
      }),
      frame({
        time: '0.031s', from: 'server', to: 'client', proto: 'IP', info: 'ICMP Echo Reply（TTL 64）',
        size: 98, stage: 2, note: '回程按目的地址重新选路，和来程路径不一定对称。',
        ipProto: 'ICMP', ttl: 64,
        l4: payload('ICMP Echo Reply', 64, COLOR.icmp, [
          { name: '类型 / 代码', bytes: '2', value: '0 / 0（Echo Reply）' },
          { name: '标识 / 序号', bytes: '4', value: '0x00a1 / 1' },
          { name: '数据', bytes: '56', value: 'abcd…' },
        ]),
      }),
    ],
  },
  {
    key: 'dns',
    name: 'DNS',
    cat: '基础',
    tagline: '域名解析',
    desc: '把域名翻译成 IP：递归解析器代为逐级询问根、顶级域与权威服务器，并缓存结果。',
    layer: '应用层（第 7 层）',
    port: '53',
    transport: 'UDP（大响应 / 区域传送用 TCP）',
    format: '资源记录 RR',
    methods: 'A / AAAA / CNAME / MX / NS',
    rfc: 'RFC 1035',
    stages: ['递归查询', '根服务器', '顶级域', '权威服务器', '返回结果'],
    packets: [
      frame({
        time: '0.000s', from: 'client', to: 'resolver', proto: 'DNS', info: 'Query A www.example.com',
        size: 75, stage: 0, note: '客户端只发一次递归查询，后续逐级询问由解析器完成。',
        l4: udp(52444, 53, 41), app: DNS_QUERY('www.example.com'),
      }),
      frame({
        time: '0.004s', from: 'resolver', to: 'root', proto: 'DNS', info: 'Query NS com.',
        size: 78, stage: 1, note: '根服务器不直接给答案，只告诉解析器去问谁。',
        l4: udp(33000, 53, 44), app: DNS_QUERY('com.'),
      }),
      frame({
        time: '0.018s', from: 'root', to: 'resolver', proto: 'DNS', info: 'Referral: com. NS a.gtld-servers.net',
        size: 104, stage: 1, note: '根返回 com 顶级域的 NS 与 glue 地址，解析器继续下一跳。',
        l4: udp(53, 33000, 70), app: DNS_ANSWER('a.gtld-servers.net', '172800'),
      }),
      frame({
        time: '0.020s', from: 'resolver', to: 'tld', proto: 'DNS', info: 'Query NS example.com.',
        size: 82, stage: 2, note: '向 com 顶级域询问 example.com 的权威服务器。',
        l4: udp(33001, 53, 48), app: DNS_QUERY('example.com.'),
      }),
      frame({
        time: '0.034s', from: 'tld', to: 'resolver', proto: 'DNS', info: 'Referral: example.com NS ns1.example.com',
        size: 112, stage: 2, note: '顶级域返回权威服务器地址。',
        l4: udp(53, 33001, 78), app: DNS_ANSWER('ns1.example.com', '172800'),
      }),
      frame({
        time: '0.036s', from: 'resolver', to: 'auth', proto: 'DNS', info: 'Query A www.example.com',
        size: 79, stage: 3, note: '权威服务器掌握该域的最终记录。',
        l4: udp(33002, 53, 45), app: DNS_QUERY('www.example.com'),
      }),
      frame({
        time: '0.049s', from: 'auth', to: 'resolver', proto: 'DNS', info: 'Answer A 203.0.113.10 TTL=300',
        size: 95, stage: 3, note: '权威回答带 TTL，解析器按 TTL 缓存以减轻后续查询压力。',
        l4: udp(53, 33002, 61), app: DNS_ANSWER('203.0.113.10', '300'),
      }),
      frame({
        time: '0.050s', from: 'resolver', to: 'client', proto: 'DNS', info: 'Answer A 203.0.113.10 TTL=300',
        size: 91, stage: 4, note: '解析器把结果回给客户端；整轮递归查询结束。',
        l4: udp(53, 52444, 57), app: DNS_ANSWER('203.0.113.10', '300'),
      }),
    ],
  },
  {
    key: 'dhcp',
    name: 'DHCP',
    cat: '基础',
    tagline: '自动分配地址',
    desc: '新终端上线后自动获取 IP、掩码、网关与 DNS：Discover → Offer → Request → ACK 四步完成租约。',
    layer: '应用层（第 7 层）',
    port: '67（服务器）/ 68（客户端）',
    transport: 'UDP',
    format: '选项 TLV',
    methods: 'Discover / Offer / Request / ACK',
    rfc: 'RFC 2131',
    stages: ['发现服务器', '提供地址', '请求确认', '确认租约'],
    packets: [
      frame({
        time: '0.000s', from: 'client', to: 'server', proto: 'DHCP', info: 'DHCP Discover（广播）',
        size: 342, stage: 0,
        note: '客户端还没有 IP，用 0.0.0.0 为源、255.255.255.255 为目的广播寻找服务器。',
        l4: udp(68, 67, 308), ipProto: 'UDP', srcIp: '0.0.0.0', dstIp: '255.255.255.255',
        app: payload('DHCP Discover', 300, COLOR.dns, [
          { name: '消息类型', bytes: '1', value: '1（Discover）' },
          { name: '客户端 MAC', bytes: '6', value: MAC.client },
          { name: '请求参数', bytes: '12', value: '掩码 / 网关 / DNS' },
        ]),
      }),
      frame({
        time: '0.010s', from: 'server', to: 'client', proto: 'DHCP', info: 'DHCP Offer 192.168.1.100',
        size: 342, stage: 1, note: '服务器从地址池挑一个可用地址，连同租期一起提供。',
        l4: udp(67, 68, 308), ipProto: 'UDP', srcIp: '192.168.1.1', dstIp: '255.255.255.255',
        app: payload('DHCP Offer', 300, COLOR.dns, [
          { name: '消息类型', bytes: '1', value: '2（Offer）' },
          { name: '提供地址', bytes: '4', value: '192.168.1.100' },
          { name: '租期', bytes: '4', value: '86400 秒' },
          { name: '网关 / DNS', bytes: '8', value: '192.168.1.1 / 8.8.8.8' },
        ]),
      }),
      frame({
        time: '0.012s', from: 'client', to: 'server', proto: 'DHCP', info: 'DHCP Request 192.168.1.100',
        size: 342, stage: 2, note: '客户端正式请求使用该地址，同时广播告知其他服务器。',
        l4: udp(68, 67, 308), ipProto: 'UDP', srcIp: '0.0.0.0', dstIp: '255.255.255.255',
        app: payload('DHCP Request', 300, COLOR.dns, [
          { name: '消息类型', bytes: '1', value: '3（Request）' },
          { name: '请求地址', bytes: '4', value: '192.168.1.100' },
          { name: '服务器标识', bytes: '4', value: '192.168.1.1' },
        ]),
      }),
      frame({
        time: '0.014s', from: 'server', to: 'client', proto: 'DHCP', info: 'DHCP ACK 租约生效',
        size: 342, stage: 3, note: '收到 ACK 后客户端才正式配置地址；续租在 T1（50% 租期）开始。',
        l4: udp(67, 68, 308), ipProto: 'UDP', srcIp: '192.168.1.1', dstIp: '255.255.255.255',
        app: payload('DHCP ACK', 300, COLOR.dns, [
          { name: '消息类型', bytes: '1', value: '5（ACK）' },
          { name: '确认地址', bytes: '4', value: '192.168.1.100' },
          { name: 'T1 / T2', bytes: '8', value: '43200 / 75600 秒' },
        ]),
      }),
    ],
  },
  {
    key: 'icmp',
    name: 'ICMP',
    cat: '基础',
    tagline: '链路探测与差错',
    desc: 'IP 的辅助协议：ping 用 Echo 探测可达性，traceroute 借 TTL 超时逐跳发现路径。',
    layer: '网络层（第 3 层）',
    port: '—',
    transport: '—',
    format: '类型 + 代码 + 校验和',
    methods: 'Echo / Unreachable / TTL Exceeded',
    rfc: 'RFC 792',
    stages: ['发起探测', '逐跳超时', '返回结果'],
    packets: [
      frame({
        time: '0.000s', from: 'client', to: 'server', proto: 'ICMP', info: 'Echo Request id=1 seq=1',
        size: 98, stage: 0, note: 'ping 发送 Echo Request，序号用于匹配回包与统计丢包。',
        ipProto: 'ICMP', ttl: 64,
        l4: payload('ICMP Echo', 64, COLOR.icmp, [
          { name: '类型 / 代码', bytes: '2', value: '8 / 0' },
          { name: '标识', bytes: '2', value: '0x00a1' },
          { name: '序号', bytes: '2', value: '1' },
          { name: '数据', bytes: '56', value: 'abcd…' },
        ]),
      }),
      frame({
        time: '0.004s', from: 'router', to: 'client', proto: 'ICMP', info: 'Time-to-live exceeded',
        size: 70, stage: 1, note: 'TTL=1 的探测包在第一跳就被丢弃，路由器回 ICMP 超时，traceroute 由此得到第一跳地址。',
        ipProto: 'ICMP', ttl: 64, srcIp: EP.router.addr, dstIp: EP.client.addr,
        l4: payload('ICMP 超时', 36, COLOR.icmp, [
          { name: '类型 / 代码', bytes: '2', value: '11 / 0（TTL Exceeded）' },
          { name: '原始 IP 头', bytes: '20', value: '客户端 → 服务器' },
          { name: '原始前 8 字节', bytes: '8', value: 'ICMP Echo 头' },
        ]),
      }),
      frame({
        time: '0.031s', from: 'server', to: 'client', proto: 'ICMP', info: 'Echo Reply id=1 seq=1',
        size: 98, stage: 2, note: '目的主机回 Echo Reply，说明三层可达且回程正常。',
        ipProto: 'ICMP', ttl: 64,
        l4: payload('ICMP Echo Reply', 64, COLOR.icmp, [
          { name: '类型 / 代码', bytes: '2', value: '0 / 0' },
          { name: '标识', bytes: '2', value: '0x00a1' },
          { name: '序号', bytes: '2', value: '1' },
          { name: '数据', bytes: '56', value: 'abcd…' },
        ]),
      }),
    ],
  },
  {
    key: 'smtp',
    name: 'SMTP',
    cat: '应用',
    tagline: '邮件投递',
    desc: '发件方把邮件推给邮件服务器：文本命令 + 三位响应码，按 EHLO、MAIL、RCPT、DATA 顺序投递。',
    layer: '应用层（第 7 层）',
    port: '25（提交常用 587）',
    transport: 'TCP',
    format: '文本命令 + 响应码',
    methods: 'EHLO / MAIL FROM / RCPT TO / DATA',
    rfc: 'RFC 5321',
    stages: ['建立连接', '身份问候', '声明收发件人', '投递正文'],
    packets: [
      frame({
        time: '0.000s', from: 'client', to: 'server', proto: 'TCP', info: '[SYN] 52500 → 25',
        size: 66, stage: 0, note: 'SMTP 依赖 TCP，先建连再谈邮件。',
        l4: tcp(52500, 25, 'SYN', '0', '-'),
      }),
      frame({
        time: '0.012s', from: 'server', to: 'client', proto: 'SMTP', info: '220 mail.example.com ESMTP',
        size: 78, stage: 0, note: '220 表示服务就绪；三位数字是 SMTP 的响应码。',
        l4: tcp(25, 52500, 'PSH, ACK', '0', '1'),
        app: payload('SMTP 220', 24, COLOR.app, [
          { name: '响应码', bytes: '3', value: '220', note: '2xx 成功、3xx 需要更多输入、4xx 临时失败、5xx 永久失败。' },
          { name: '问候', bytes: '21', value: 'mail.example.com ESMTP' },
        ]),
      }),
      frame({
        time: '0.013s', from: 'client', to: 'server', proto: 'SMTP', info: 'EHLO client.example.com',
        size: 82, stage: 1, note: 'EHLO 声明客户端并询问服务器支持哪些扩展。',
        l4: tcp(52500, 25, 'PSH, ACK', '1', '25'),
        app: payload('SMTP EHLO', 26, COLOR.app, [
          { name: '命令', bytes: '4', value: 'EHLO' },
          { name: '域名', bytes: '22', value: 'client.example.com' },
        ]),
      }),
      frame({
        time: '0.025s', from: 'client', to: 'server', proto: 'SMTP', info: 'MAIL FROM:<alice@example.com>',
        size: 96, stage: 2, note: '信封发件人可与正文 From 不同，退信按信封地址处理。',
        l4: tcp(52500, 25, 'PSH, ACK', '27', '42'),
        app: payload('SMTP MAIL', 40, COLOR.app, [
          { name: '命令', bytes: '4', value: 'MAIL FROM' },
          { name: '地址', bytes: '21', value: '<alice@example.com>' },
        ]),
      }),
      frame({
        time: '0.027s', from: 'client', to: 'server', proto: 'SMTP', info: 'RCPT TO:<bob@example.com>',
        size: 92, stage: 2, note: '每个收件人一条 RCPT，服务器可逐条接受或拒绝。',
        l4: tcp(52500, 25, 'PSH, ACK', '67', '48'),
        app: payload('SMTP RCPT', 36, COLOR.app, [
          { name: '命令', bytes: '4', value: 'RCPT TO' },
          { name: '地址', bytes: '19', value: '<bob@example.com>' },
        ]),
      }),
      frame({
        time: '0.029s', from: 'client', to: 'server', proto: 'SMTP', info: 'DATA（正文 4.2 KB）',
        size: 4300, stage: 3, note: 'DATA 之后发送头部与正文，以单独一行 "." 结束。',
        l4: tcp(52500, 25, 'PSH, ACK', '103', '54'),
        app: payload('邮件正文', 4244, COLOR.app, [
          { name: '头部', bytes: '240', value: 'From / To / Subject / Date' },
          { name: '正文', bytes: '4000', value: 'text/plain; charset=utf-8' },
          { name: '结束符', bytes: '4', value: 'CRLF . CRLF' },
        ]),
      }),
      frame({
        time: '0.041s', from: 'server', to: 'client', proto: 'SMTP', info: '250 2.0.0 Ok: queued as 4F2A',
        size: 88, stage: 3, note: '250 表示服务器已接收并排队；并不代表对方已读。',
        l4: tcp(25, 52500, 'PSH, ACK', '54', '4347'),
        app: payload('SMTP 250', 32, COLOR.app, [
          { name: '响应码', bytes: '3', value: '250' },
          { name: '队列 ID', bytes: '16', value: 'queued as 4F2A' },
        ]),
      }),
    ],
  },
  {
    key: 'pop3',
    name: 'POP3',
    cat: '应用',
    tagline: '邮件收取',
    desc: '把邮件从服务器下载到本地：认证后用 STAT / LIST / RETR 取信，默认下载后可删除。',
    layer: '应用层（第 7 层）',
    port: '110（995 为 TLS）',
    transport: 'TCP',
    format: '文本命令 + 响应',
    methods: 'USER / PASS / STAT / RETR / QUIT',
    rfc: 'RFC 1939',
    stages: ['建立连接', '认证', '查看信箱', '下载邮件'],
    packets: [
      frame({
        time: '0.000s', from: 'client', to: 'server', proto: 'TCP', info: '[SYN] 52502 → 110',
        size: 66, stage: 0, note: 'POP3 同样先建立 TCP 连接。',
        l4: tcp(52502, 110, 'SYN', '0', '-'),
      }),
      frame({
        time: '0.011s', from: 'server', to: 'client', proto: 'POP3', info: '+OK POP3 server ready',
        size: 72, stage: 0, note: '+OK 成功，-ERR 失败，是 POP3 的响应约定。',
        l4: tcp(110, 52502, 'PSH, ACK', '0', '1'),
        app: payload('POP3 +OK', 18, COLOR.app, [
          { name: '状态', bytes: '3', value: '+OK' },
          { name: '说明', bytes: '15', value: 'POP3 server ready' },
        ]),
      }),
      frame({
        time: '0.012s', from: 'client', to: 'server', proto: 'POP3', info: 'USER alice / PASS ******',
        size: 90, stage: 1, note: 'POP3 认证是明文命令，公网必须套 TLS（995）。',
        l4: tcp(52502, 110, 'PSH, ACK', '1', '19'),
        app: payload('POP3 认证', 34, COLOR.app, [
          { name: 'USER', bytes: '14', value: 'alice' },
          { name: 'PASS', bytes: '20', value: '******' },
        ]),
      }),
      frame({
        time: '0.024s', from: 'client', to: 'server', proto: 'POP3', info: 'STAT（2 封 / 8.4 KB）',
        size: 60, stage: 2, note: 'STAT 返回邮件数量与总字节数。',
        l4: tcp(52502, 110, 'PSH, ACK', '35', '37'),
        app: payload('POP3 STAT', 4, COLOR.app, [{ name: '命令', bytes: '4', value: 'STAT' }]),
      }),
      frame({
        time: '0.025s', from: 'client', to: 'server', proto: 'POP3', info: 'RETR 1（下载第 1 封）',
        size: 62, stage: 3, note: 'RETR 把整封邮件拉到本地，适合单设备收信。',
        l4: tcp(52502, 110, 'PSH, ACK', '39', '48'),
        app: payload('POP3 RETR', 6, COLOR.app, [{ name: '命令', bytes: '6', value: 'RETR 1' }]),
      }),
      frame({
        time: '0.038s', from: 'server', to: 'client', proto: 'POP3', info: '+OK 4200 octets',
        size: 4260, stage: 3, note: '邮件正文随后传输；若客户端配置“下载后删除”，服务器端副本会被清除。',
        l4: tcp(110, 52502, 'PSH, ACK', '48', '45'),
        app: payload('邮件正文', 4196, COLOR.app, [
          { name: '状态行', bytes: '18', value: '+OK 4200 octets' },
          { name: '邮件内容', bytes: '4178', value: 'Headers + Body' },
        ]),
      }),
    ],
  },
  {
    key: 'imap',
    name: 'IMAP',
    cat: '应用',
    tagline: '邮件同步',
    desc: '邮件的“远程信箱”模型：邮件保留在服务器，多个设备通过 SELECT / FETCH 同步状态与文件夹。',
    layer: '应用层（第 7 层）',
    port: '143（993 为 TLS）',
    transport: 'TCP',
    format: '文本命令 + 标签',
    methods: 'LOGIN / SELECT / FETCH / LOGOUT',
    rfc: 'RFC 9051',
    stages: ['建立连接', '登录', '选择信箱', '同步邮件'],
    packets: [
      frame({
        time: '0.000s', from: 'client', to: 'server', proto: 'TCP', info: '[SYN] 52504 → 143',
        size: 66, stage: 0, note: 'IMAP 建连后服务器先发问候。',
        l4: tcp(52504, 143, 'SYN', '0', '-'),
      }),
      frame({
        time: '0.012s', from: 'server', to: 'client', proto: 'IMAP', info: '* OK IMAP4rev1 ready',
        size: 74, stage: 0, note: '服务器以 * OK 表示非请求响应，客户端命令带唯一标签。',
        l4: tcp(143, 52504, 'PSH, ACK', '0', '1'),
        app: payload('IMAP 问候', 20, COLOR.app, [
          { name: '状态', bytes: '5', value: '* OK' },
          { name: '能力', bytes: '15', value: 'IMAP4rev1' },
        ]),
      }),
      frame({
        time: '0.013s', from: 'client', to: 'server', proto: 'IMAP', info: 'a1 LOGIN alice ******',
        size: 88, stage: 1, note: '命令前缀 a1 是该请求的标签，响应用同样的标签配对。',
        l4: tcp(52504, 143, 'PSH, ACK', '1', '21'),
        app: payload('IMAP LOGIN', 32, COLOR.app, [
          { name: '标签', bytes: '2', value: 'a1' },
          { name: '命令', bytes: '5', value: 'LOGIN' },
          { name: '凭据', bytes: '25', value: 'alice / ******' },
        ]),
      }),
      frame({
        time: '0.025s', from: 'client', to: 'server', proto: 'IMAP', info: 'a2 SELECT INBOX',
        size: 68, stage: 2, note: 'SELECT 只读打开；EXAMINE 打开为只读模式。',
        l4: tcp(52504, 143, 'PSH, ACK', '33', '35'),
        app: payload('IMAP SELECT', 12, COLOR.app, [
          { name: '标签', bytes: '2', value: 'a2' },
          { name: '命令', bytes: '10', value: 'SELECT INBOX' },
        ]),
      }),
      frame({
        time: '0.027s', from: 'client', to: 'server', proto: 'IMAP', info: 'a3 FETCH 12 (BODY[])',
        size: 76, stage: 3, note: 'FETCH 可按需拉取单封正文、头部或标记，避免整箱下载。',
        l4: tcp(52504, 143, 'PSH, ACK', '45', '40'),
        app: payload('IMAP FETCH', 20, COLOR.app, [
          { name: '标签', bytes: '2', value: 'a3' },
          { name: '邮件序号', bytes: '2', value: '12' },
          { name: '取回内容', bytes: '16', value: 'BODY[]' },
        ]),
      }),
      frame({
        time: '0.039s', from: 'server', to: 'client', proto: 'IMAP', info: '* 12 FETCH (BODY[] {4180}',
        size: 4260, stage: 3, note: '邮件仍保留在服务器，其他设备登录后能看到同样的已读/未读状态。',
        l4: tcp(143, 52504, 'PSH, ACK', '40', '65'),
        app: payload('IMAP 邮件数据', 4196, COLOR.app, [
          { name: '序号', bytes: '2', value: '12' },
          { name: '字面量长度', bytes: '6', value: '{4180}' },
          { name: '邮件内容', bytes: '4188', value: 'Headers + Body' },
        ]),
      }),
    ],
  },
  {
    key: 'ftp',
    name: 'FTP',
    cat: '应用',
    tagline: '文件传输',
    desc: '控制连接与数据连接分离：21 端口发命令，PASV 协商后另开数据连接传输文件。',
    layer: '应用层（第 7 层）',
    port: '21（控制）/ 20 或随机端口（数据）',
    transport: 'TCP',
    format: '文本命令 + 响应码',
    methods: 'USER / PASS / PASV / RETR',
    rfc: 'RFC 959',
    stages: ['控制连接', '登录认证', '被动模式协商', '数据传输'],
    packets: [
      frame({
        time: '0.000s', from: 'client', to: 'server', proto: 'TCP', info: '[SYN] 52506 → 21',
        size: 66, stage: 0, note: '先建立控制连接，所有命令都走这条连接。',
        l4: tcp(52506, 21, 'SYN', '0', '-'),
      }),
      frame({
        time: '0.012s', from: 'server', to: 'client', proto: 'FTP', info: '220 FTP server ready',
        size: 72, stage: 0, note: '220 表示 FTP 服务就绪。',
        l4: tcp(21, 52506, 'PSH, ACK', '0', '1'),
        app: payload('FTP 220', 20, COLOR.app, [
          { name: '响应码', bytes: '3', value: '220' },
          { name: '说明', bytes: '17', value: 'FTP server ready' },
        ]),
      }),
      frame({
        time: '0.013s', from: 'client', to: 'server', proto: 'FTP', info: 'USER anonymous / PASS',
        size: 88, stage: 1, note: 'FTP 凭据明文传输，公网应使用 FTPS / SFTP。',
        l4: tcp(52506, 21, 'PSH, ACK', '1', '21'),
        app: payload('FTP 登录', 36, COLOR.app, [
          { name: 'USER', bytes: '16', value: 'anonymous' },
          { name: 'PASS', bytes: '20', value: '******' },
        ]),
      }),
      frame({
        time: '0.025s', from: 'client', to: 'server', proto: 'FTP', info: 'PASV',
        size: 58, stage: 2, note: 'PASV 让服务器开放一个随机端口等客户端来连，规避客户端防火墙。',
        l4: tcp(52506, 21, 'PSH, ACK', '37', '42'),
        app: payload('FTP PASV', 4, COLOR.app, [{ name: '命令', bytes: '4', value: 'PASV' }]),
      }),
      frame({
        time: '0.027s', from: 'server', to: 'client', proto: 'FTP', info: '227 Entering Passive Mode (203,0,113,10,195,80)',
        size: 96, stage: 2, note: '227 返回数据连接的地址与端口：195×256+80 = 50000。',
        l4: tcp(21, 52506, 'PSH, ACK', '42', '41'),
        app: payload('FTP 227', 48, COLOR.app, [
          { name: '响应码', bytes: '3', value: '227' },
          { name: '数据端口', bytes: '12', value: '203.0.113.10:50000' },
        ]),
      }),
      frame({
        time: '0.028s', from: 'client', to: 'server', proto: 'TCP', info: '[SYN] 52507 → 50000（数据连接）',
        size: 66, stage: 3, note: '第二条 TCP 连接专门传文件，控制连接继续可用。',
        l4: tcp(52507, 50000, 'SYN', '0', '-'),
      }),
      frame({
        time: '0.030s', from: 'client', to: 'server', proto: 'FTP', info: 'RETR report.pdf（1.2 MB）',
        size: 1300, stage: 3, note: '文件按块传输，结束后数据连接关闭，控制连接回 226。',
        l4: tcp(52506, 21, 'PSH, ACK', '43', '94'),
        app: payload('FTP RETR', 18, COLOR.app, [
          { name: '命令', bytes: '4', value: 'RETR' },
          { name: '文件名', bytes: '14', value: 'report.pdf' },
        ]),
      }),
    ],
  },
  {
    key: 'ssh',
    name: 'SSH',
    cat: '安全',
    tagline: '安全远程登录',
    desc: '先明文交换版本号，再协商密钥、验证身份，之后所有会话内容加密并带完整性校验。',
    layer: '应用层（第 7 层，安全外壳）',
    port: '22',
    transport: 'TCP',
    format: '二进制协议（协商后加密）',
    methods: 'KEX / AUTH / CHANNEL',
    rfc: 'RFC 4251',
    stages: ['TCP 连接', '版本交换', '密钥协商', '身份认证', '加密会话'],
    packets: [
      frame({
        time: '0.000s', from: 'client', to: 'server', proto: 'TCP', info: '[SYN] 52508 → 22',
        size: 66, stage: 0, note: 'SSH 先建立 TCP 连接。',
        l4: tcp(52508, 22, 'SYN', '0', '-'),
      }),
      frame({
        time: '0.012s', from: 'client', to: 'server', proto: 'SSH', info: 'SSH-2.0-OpenSSH_9.6',
        size: 78, stage: 1, note: '版本号是明文交换的，双方据此选择兼容的协议版本与算法集。',
        l4: tcp(52508, 22, 'PSH, ACK', '1', '1'),
        app: payload('SSH 版本', 26, COLOR.tls, [
          { name: '协议版本', bytes: '4', value: 'SSH-2.0' },
          { name: '软件版本', bytes: '14', value: 'OpenSSH_9.6' },
        ]),
      }),
      frame({
        time: '0.014s', from: 'client', to: 'server', proto: 'SSH', info: 'KEXINIT（算法列表）',
        size: 1100, stage: 2, note: '双方各发一份 KEXINIT，按客户端优先顺序选出共同的密钥交换与加密算法。',
        l4: tcp(52508, 22, 'PSH, ACK', '27', '20'),
        app: payload('SSH KEXINIT', 1048, COLOR.tls, [
          { name: 'KEX 算法', bytes: '180', value: 'curve25519-sha256 …' },
          { name: '主机密钥', bytes: '160', value: 'ssh-ed25519 …' },
          { name: '加密 / MAC', bytes: '700', value: 'aes256-gcm@openssh.com' },
        ]),
      }),
      frame({
        time: '0.028s', from: 'server', to: 'client', proto: 'SSH', info: 'KEX_ECDH_REPLY + 主机签名',
        size: 720, stage: 2, note: '服务器回公钥参数并签名，客户端用 known_hosts 校验主机身份，防中间人。',
        l4: tcp(22, 52508, 'PSH, ACK', '20', '1075'),
        app: payload('SSH KEX Reply', 668, COLOR.tls, [
          { name: '主机公钥', bytes: '96', value: 'ssh-ed25519 AAAA…' },
          { name: '交换哈希签名', bytes: '64', value: 'ED25519 Signature' },
          { name: '会话 ID', bytes: '32', value: 'SHA-256' },
        ]),
      }),
      frame({
        time: '0.041s', from: 'client', to: 'server', proto: 'SSH', info: '公钥认证成功',
        size: 210, stage: 3, note: '客户端用私钥签名挑战值，服务器按 authorized_keys 验证，无需传密码。',
        l4: tcp(52508, 22, 'PSH, ACK', '1075', '688'),
        app: payload('SSH 认证', 158, COLOR.tls, [
          { name: '认证方法', bytes: '12', value: 'publickey' },
          { name: '签名', bytes: '64', value: 'ED25519' },
          { name: '结果', bytes: '6', value: 'success' },
        ]),
      }),
      frame({
        time: '0.043s', from: 'client', to: 'server', proto: 'SSH', info: '加密会话：pty-req / shell',
        size: 148, stage: 4, note: '之后每条记录都加密并带 MAC，抓包只能看到长度与方向。',
        l4: tcp(52508, 22, 'PSH, ACK', '1233', '846'),
        app: payload('SSH 加密记录', 96, COLOR.app, [
          { name: '包长度', bytes: '4', value: '96（加密）' },
          { name: 'MAC', bytes: '16', value: 'HMAC-SHA2-256' },
          { name: '会话数据', bytes: '76', value: 'Encrypted(pty-req)' },
        ]),
      }),
    ],
  },
  {
    key: 'tls',
    name: 'TLS',
    cat: '安全',
    tagline: '加密通道',
    desc: '为任意 TCP 应用提供机密性、完整性与身份认证：握手协商密钥，记录层加密后续数据。',
    layer: '表示层 / 传输安全层',
    port: '443 等（由上层应用决定）',
    transport: 'TCP',
    format: '记录层 + 握手消息',
    methods: 'ClientHello / ServerHello / Finished',
    rfc: 'RFC 8446（TLS 1.3）',
    stages: ['客户端问候', '服务端响应', '证书校验', '密钥确认', '加密传输'],
    packets: [
      frame({
        time: '0.000s', from: 'client', to: 'server', proto: 'TLS', info: 'Client Hello（TLS 1.3）',
        size: 517, stage: 0, note: '客户端提供版本、套件、SNI 与密钥共享。',
        l4: tcp(52510, 443, 'PSH, ACK', '1', '1'),
        app: payload('TLS ClientHello', 453, COLOR.tls, [
          { name: '版本', bytes: '2', value: 'TLS 1.3' },
          { name: '随机数', bytes: '32', value: 'Client Random' },
          { name: 'SNI', bytes: '17', value: 'www.example.com' },
          { name: '密钥共享', bytes: '65', value: 'x25519 公钥' },
        ]),
      }),
      frame({
        time: '0.024s', from: 'server', to: 'client', proto: 'TLS', info: 'Server Hello（选定套件）',
        size: 210, stage: 1, note: '服务器选定套件并回自己的密钥共享，双方即可算出同一会话密钥。',
        l4: tcp(443, 52510, 'PSH, ACK', '1', '454'),
        app: payload('TLS ServerHello', 146, COLOR.tls, [
          { name: '选定套件', bytes: '2', value: 'TLS_AES_128_GCM_SHA256' },
          { name: '随机数', bytes: '32', value: 'Server Random' },
          { name: '密钥共享', bytes: '65', value: 'x25519 公钥' },
        ]),
      }),
      frame({
        time: '0.025s', from: 'server', to: 'client', proto: 'TLS', info: 'Certificate + CertificateVerify',
        size: 2600, stage: 2, note: '证书链证明服务器身份；CertificateVerify 用私钥签名握手摘要。',
        l4: tcp(443, 52510, 'PSH, ACK', '147', '454'),
        app: payload('TLS Certificate', 2536, COLOR.tls, [
          { name: '证书链', bytes: '2140', value: 'CN=www.example.com' },
          { name: '签名算法', bytes: '2', value: 'rsa_pss_rsae_sha256' },
          { name: '校验结果', bytes: '6', value: 'valid' },
        ]),
      }),
      frame({
        time: '0.027s', from: 'client', to: 'server', proto: 'TLS', info: 'Finished + ChangeCipherSpec',
        size: 90, stage: 3, note: '双方用会话密钥校验握手 transcript，一致后才切换到加密记录。',
        l4: tcp(52510, 443, 'PSH, ACK', '454', '2737'),
        app: payload('TLS Finished', 26, COLOR.tls, [
          { name: '验证数据', bytes: '10', value: 'HMAC' },
          { name: '切换密码规格', bytes: '6', value: 'ChangeCipherSpec' },
        ]),
      }),
      frame({
        time: '0.028s', from: 'client', to: 'server', proto: 'TLS', info: 'Application Data',
        size: 540, stage: 4, note: '应用数据被 AEAD 加密，抓包看不到 HTTP 明文。',
        l4: tcp(52510, 443, 'PSH, ACK', '480', '2747'),
        app: payload('TLS Application Data', 476, COLOR.app, [
          { name: '密文', bytes: '460', value: 'Encrypted(HTTP GET)' },
          { name: '认证标签', bytes: '16', value: 'AEAD Tag' },
        ]),
      }),
      frame({
        time: '0.055s', from: 'server', to: 'client', proto: 'TLS', info: 'Application Data（NewSessionTicket）',
        size: 640, stage: 4, note: '服务端下发会话票据，后续可用 0-RTT 或更快的恢复握手。',
        l4: tcp(443, 52510, 'PSH, ACK', '2747', '956'),
        app: payload('TLS 会话票据', 576, COLOR.app, [
          { name: '票据', bytes: '192', value: 'NewSessionTicket' },
          { name: '有效期', bytes: '4', value: '7200 秒' },
          { name: '密文', bytes: '380', value: 'Encrypted(HTTP 200)' },
        ]),
      }),
    ],
  },
];

/* ------------------------------------------------------------------ */
/* 视图                                                                */
/* ------------------------------------------------------------------ */

const FILTERS = ['全部', '基础', '应用', '安全'] as const;
type Filter = (typeof FILTERS)[number];

const LANE_ORDER: EndpointKey[] = ['client', 'router', 'resolver', 'root', 'tld', 'auth', 'server'];
const NODE_OF: Record<EndpointKey, 'client' | 'router' | 'resolver' | 'server'> = {
  client: 'client',
  router: 'router',
  resolver: 'resolver',
  root: 'resolver',
  tld: 'resolver',
  auth: 'resolver',
  server: 'server',
};

const TOPO = {
  client: { x: 64, y: 162 },
  router: { x: 194, y: 162 },
  resolver: { x: 323, y: 56 },
  server: { x: 458, y: 162 },
};

function protoColor(proto: string): string {
  const p = proto.toUpperCase();
  if (p.includes('DNS')) return COLOR.dns;
  if (p.includes('TLS') || p.includes('SSH')) return COLOR.tls;
  if (p.includes('ICMP')) return COLOR.icmp;
  if (p === 'TCP') return COLOR.tcp;
  if (p === 'UDP') return COLOR.udp;
  return COLOR.app;
}

function Topology({ from, to, proto, size }: { from: EndpointKey; to: EndpointKey; proto: string; size: number }) {
  const a = TOPO[NODE_OF[from]];
  const b = TOPO[NODE_OF[to]];
  const activeNodes = new Set<string>([NODE_OF[from], NODE_OF[to]]);
  const color = protoColor(proto);

  const edges: [keyof typeof TOPO, keyof typeof TOPO][] = [
    ['client', 'router'],
    ['router', 'resolver'],
    ['router', 'server'],
    ['resolver', 'server'],
  ];

  return (
    <svg viewBox="0 0 522 218" role="img" aria-label={`${EP[from].name} 到 ${EP[to].name} 的报文路径`}>
      <defs>
        <marker id="pe-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill={color} />
        </marker>
      </defs>

      {edges.map(([x, y]) => (
        <line
          key={`${x}-${y}`}
          x1={TOPO[x].x}
          y1={TOPO[x].y}
          x2={TOPO[y].x}
          y2={TOPO[y].y}
          stroke="var(--border-strong)"
          strokeWidth="1.2"
          strokeDasharray="4 5"
        />
      ))}

      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={color}
        strokeWidth="2.2"
        strokeDasharray="7 6"
        markerEnd="url(#pe-arrow)"
        opacity="0.95"
      >
        <animate attributeName="stroke-dashoffset" from="26" to="0" dur="0.9s" repeatCount="indefinite" />
      </line>

      {(
        [
          ['client', '客户端', EP.client.addr],
          ['router', '路由器', EP.router.addr],
          ['server', 'Web 服务器', EP.server.addr],
          ['resolver', 'DNS 解析器', EP.resolver.addr],
        ] as const
      ).map(([key, label, addr]) => {
        const node = TOPO[key];
        const active = activeNodes.has(key);
        return (
          <g key={key}>
            <rect
              x={node.x - 46}
              y={node.y - 22}
              width={92}
              height={44}
              rx={9}
              fill={active ? 'var(--accent-soft)' : 'var(--surface-2)'}
              stroke={active ? 'var(--accent)' : 'var(--border-strong)'}
              strokeWidth={active ? 1.8 : 1}
            />
            <text x={node.x} y={node.y - 5} textAnchor="middle" fontSize="10.5" fill={active ? 'var(--accent)' : 'var(--text)'} fontWeight="600">
              {label}
            </text>
            <text x={node.x} y={node.y + 11} textAnchor="middle" fontSize="9" fill="var(--text-faint)" fontFamily="var(--mono)">
              {addr}
            </text>
          </g>
        );
      })}

      <g>
        <rect x={222} y={186} width={140} height={22} rx={11} fill="var(--surface-2)" stroke="var(--border)" />
        <text x={292} y={201} textAnchor="middle" fontSize="10" fill={color} fontWeight="600">
          {proto} · {size} B
        </text>
      </g>
    </svg>
  );
}

function Sequence({ packets, index, onPick }: { packets: PacketSpec[]; index: number; onPick: (i: number) => void }) {
  const lanes = useMemo(() => {
    const set = new Set<EndpointKey>();
    packets.forEach((p) => {
      set.add(p.from);
      set.add(p.to);
    });
    return LANE_ORDER.filter((k) => set.has(k));
  }, [packets]);

  const width = 560;
  const left = 74;
  const right = width - 32;
  const gap = lanes.length > 1 ? (right - left) / (lanes.length - 1) : 0;
  const laneX = (k: EndpointKey) => left + lanes.indexOf(k) * gap;
  const top = 34;
  const rowH = 26;
  const height = top + packets.length * rowH + 18;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="协议报文时序图">
      <defs>
        <marker id="pe-seq-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill="currentColor" />
        </marker>
      </defs>
      {lanes.map((k) => (
        <g key={k}>
          <text x={laneX(k)} y={16} textAnchor="middle" fontSize="10" fill="var(--text-dim)" fontWeight="600">
            {EP[k].name}
          </text>
          <line x1={laneX(k)} y1={top - 8} x2={laneX(k)} y2={height - 6} stroke="var(--border)" strokeDasharray="3 5" />
        </g>
      ))}
      {packets.map((p, i) => {
        const y = top + i * rowH + 8;
        const x1 = laneX(p.from);
        const x2 = laneX(p.to);
        const active = i === index;
        const color = protoColor(p.proto);
        return (
          <g
            key={`${p.time}-${i}`}
            opacity={active ? 1 : i < index ? 0.5 : 0.28}
            style={{ cursor: 'pointer' }}
            onClick={() => onPick(i)}
          >
            <line
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke={active ? color : 'var(--border-strong)'}
              strokeWidth={active ? 2.2 : 1.2}
              markerEnd="url(#pe-seq-arrow)"
              color={active ? color : 'var(--text-faint)'}
            />
            <text x={(x1 + x2) / 2} y={y - 4} textAnchor="middle" fontSize="8.5" fill={active ? color : 'var(--text-faint)'}>
              {p.proto} · {p.size} B
            </text>
            <text x={8} y={y + 3} fontSize="8" fill="var(--text-faint)" fontFamily="var(--mono)">
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ProtocolExplorerViz() {
  const [filter, setFilter] = useState<Filter>('全部');
  const [caseKey, setCaseKey] = useState('http');
  const [view, setView] = useState<'graph' | 'sequence'>('graph');
  const [fieldKey, setFieldKey] = useState<string | null>(null);
  const [visited, setVisited] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem('netpath:v1:protocol-explorer');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const active = PROTOCOLS.find((p) => p.key === caseKey) ?? PROTOCOLS[0];
  const stepper = useStepper(active.packets.length, { interval: 1600 });
  const { reset } = stepper;

  useEffect(() => {
    reset();
    setFieldKey(null);
  }, [caseKey, reset]);

  useEffect(() => {
    setVisited((prev) => (prev.includes(caseKey) ? prev : [...prev, caseKey]));
  }, [caseKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem('netpath:v1:protocol-explorer', JSON.stringify(visited));
    } catch {
      /* 本地存储不可用时仅保留本次会话进度 */
    }
  }, [visited]);

  const index = Math.min(stepper.index, active.packets.length - 1);
  const packet = active.packets[index];
  const list = filter === '全部' ? PROTOCOLS : PROTOCOLS.filter((p) => p.cat === filter);
  const totalBytes = packet.layers.reduce((sum, layer) => sum + layer.bytes, 0);

  const selectedField = useMemo(() => {
    if (!fieldKey) return null;
    for (const layer of packet.layers) {
      for (const field of layer.fields) {
        if (`${layer.key}:${field.name}` === fieldKey) return { layer: layer.name, color: layer.color, field };
      }
    }
    return null;
  }, [fieldKey, packet]);

  const onFilter = (next: Filter) => {
    setFilter(next);
    if (next !== '全部' && active.cat !== next) {
      const first = PROTOCOLS.find((p) => p.cat === next);
      if (first) setCaseKey(first.key);
    }
  };

  const stageStart = (stage: number) => {
    const next = active.packets.findIndex((p) => p.stage === stage);
    return next < 0 ? 0 : next;
  };

  return (
    <div className="pe">
      <aside className="pe-rail" aria-label="协议列表">
        <div className="pe-rail-head">
          <span>互联网协议</span>
          <span className="pe-count" title="已探索协议数">
            {visited.filter((key) => PROTOCOLS.some((p) => p.key === key)).length} / {PROTOCOLS.length}
          </span>
        </div>
        <div className="pe-chips" role="group" aria-label="协议分类筛选">
          {FILTERS.map((item) => {
            const count = item === '全部' ? PROTOCOLS.length : PROTOCOLS.filter((p) => p.cat === item).length;
            return (
              <button
                key={item}
                type="button"
                className={`pe-chip${filter === item ? ' active' : ''}`}
                aria-pressed={filter === item}
                onClick={() => onFilter(item)}
              >
                {item} <em>{count}</em>
              </button>
            );
          })}
        </div>
        <div className="pe-list">
          {list.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`pe-item${item.key === active.key ? ' active' : ''}`}
              aria-pressed={item.key === active.key}
              onClick={() => setCaseKey(item.key)}
            >
              <span className="pe-item-main">
                <span className="pe-item-name">{item.name}</span>
                <span className="pe-item-tag">{item.tagline}</span>
              </span>
              <span className="pe-item-meta">
                {visited.includes(item.key) ? <span className="pe-visited" aria-label="已探索">✓</span> : null}
                {item.packets.length} 包
                <span className="pe-item-dot" style={{ background: protoColor(item.key.toUpperCase()) }} />
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="pe-main" aria-label="协议详解">
        <header className="pe-head">
          <div style={{ minWidth: 200 }}>
            <div className="hstack" style={{ gap: 8 }}>
              <h4 className="pe-title">{active.name}</h4>
              <span className="badge accent">{active.tagline}</span>
              <span className="badge">{active.cat}</span>
            </div>
            <p className="pe-desc">{active.desc}</p>
          </div>
          <span className="spacer" />
          <div className="pe-tabs" role="tablist" aria-label="视图切换">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'graph'}
              className={`pe-tab${view === 'graph' ? ' active' : ''}`}
              onClick={() => setView('graph')}
            >
              架构图
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'sequence'}
              className={`pe-tab${view === 'sequence' ? ' active' : ''}`}
              onClick={() => setView('sequence')}
            >
              时序
            </button>
          </div>
        </header>

        <div className="pe-stages" role="group" aria-label="学习阶段">
          {active.stages.map((stage, i) => {
            const currentStage = packet.stage;
            const cls = i === currentStage ? ' active' : i < currentStage ? ' done' : '';
            return (
              <button
                key={stage}
                type="button"
                className={`pe-stage${cls}`}
                onClick={() => stepper.goTo(stageStart(i))}
                aria-current={i === currentStage ? 'step' : undefined}
              >
                <span className="pe-stage-num">{i + 1}</span>
                {stage}
              </button>
            );
          })}
        </div>

        <div className="pe-stage-view">
          {view === 'graph' ? (
            <Topology from={packet.from} to={packet.to} proto={packet.proto} size={packet.size} />
          ) : (
            <Sequence packets={active.packets} index={index} onPick={(i) => stepper.goTo(i)} />
          )}
        </div>

        <div className="pe-facts">
          {[
            ['层', active.layer],
            ['默认端口', active.port],
            ['传输层', active.transport],
            ['数据格式', active.format],
            ['常用方法', active.methods],
            ['定义于', active.rfc],
          ].map(([label, value]) => (
            <div key={label} className="pe-fact">
              <span className="pe-fact-l">{label}</span>
              <span className="pe-fact-v">{value}</span>
            </div>
          ))}
        </div>

        <div className="pe-card">
          <div className="pe-card-head">
            <span>数据包流</span>
            <span className="tiny faint">点击任意行跳到该报文</span>
          </div>
          <div className="pe-tablewrap">
            <table className="pe-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>时间</th>
                  <th>源地址</th>
                  <th>目的地址</th>
                  <th>协议</th>
                  <th>信息</th>
                  <th>大小</th>
                </tr>
              </thead>
              <tbody>
                {active.packets.map((p, i) => (
                  <tr
                    key={`${p.time}-${i}`}
                    className={i === index ? 'active' : ''}
                    onClick={() => stepper.goTo(i)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        stepper.goTo(i);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-pressed={i === index}
                  >
                    <td className="mono">{i + 1}</td>
                    <td className="mono">{p.time}</td>
                    <td className="mono">{EP[p.from].addr}</td>
                    <td className="mono">{EP[p.to].addr}</td>
                    <td>
                      <span className="pe-proto" style={{ color: protoColor(p.proto) }}>
                        {p.proto}
                      </span>
                    </td>
                    <td>{p.info}</td>
                    <td className="mono">{p.size.toLocaleString()} B</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pe-decode">
          <div className="pe-card">
            <div className="pe-card-head">
              <span>逐字节解码</span>
              <span className="tiny faint">{totalBytes.toLocaleString()} 字节 · 点击字段看解释</span>
            </div>
            <div className="pe-bytes" role="group" aria-label="报文分层字节占比">
              {packet.layers.map((layer) => (
                <button
                  key={layer.key}
                  type="button"
                  className="pe-byte"
                  style={{ flexGrow: layer.bytes, background: `${layer.color}33`, color: layer.color, borderColor: `${layer.color}66` }}
                  title={`${layer.name} · ${layer.bytes} 字节`}
                  onClick={() => setFieldKey(`${layer.key}:${layer.fields[0]?.name ?? ''}`)}
                >
                  <span>{layer.name}</span>
                  <em>{layer.bytes} B</em>
                </button>
              ))}
            </div>
            <div className="pe-fields">
              {packet.layers.map((layer) => (
                <div key={layer.key} className="pe-layer">
                  <div className="pe-layer-head">
                    <span className="pe-dot" style={{ background: layer.color }} />
                    <span>{layer.name}</span>
                    <span className="tiny faint">{layer.bytes} 字节</span>
                  </div>
                  {layer.fields.map((field) => {
                    const id = `${layer.key}:${field.name}`;
                    const isActive = fieldKey === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`pe-field${isActive ? ' active' : ''}`}
                        aria-pressed={isActive}
                        onClick={() => setFieldKey(isActive ? null : id)}
                      >
                        <span className="pe-field-name">{field.name}</span>
                        <span className="pe-field-bytes">{field.bytes}B</span>
                        <span className="pe-field-value mono">{field.value}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="pe-card pe-detail">
            <div className="pe-card-head">
              <span>当前报文</span>
              <span className="badge" style={{ color: protoColor(packet.proto) }}>{packet.proto}</span>
            </div>
            <div className="pe-detail-src">
              <span className="mono">{EP[packet.from].addr}</span>
              <span className="pe-arrow">→</span>
              <span className="mono">{EP[packet.to].addr}</span>
            </div>
            <p className="pe-note">{packet.note}</p>
            {selectedField ? (
              <div className="pe-selected" style={{ borderColor: `${selectedField.color}66` }}>
                <div className="pe-selected-head" style={{ color: selectedField.color }}>
                  {selectedField.layer} · {selectedField.field.name}
                  <span className="tiny faint">{selectedField.field.bytes} 字节</span>
                </div>
                <div className="mono small">{selectedField.field.value}</div>
                <p>{selectedField.field.note ?? '该字段参与本层封装与解析，点击其他字段对比含义。'}</p>
              </div>
            ) : (
              <div className="pe-selected pe-selected-empty">
                点击左侧任意字段，查看它在报文中的位置、取值与作用。
              </div>
            )}
          </div>
        </div>

        <VizControls
          stepper={stepper}
          ariaLabel={`${active.name} 报文播放控制`}
          extra={<span className="tiny faint">第 {index + 1} 包 / 共 {active.packets.length} 包</span>}
        />
      </section>
    </div>
  );
}
