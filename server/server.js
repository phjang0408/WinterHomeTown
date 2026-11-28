// 꼬마야 꼬마야(겨울 동네) WebSocket 서버 — Node판. 로컬 테스트 · Cloudflare 말고 다른 호스팅(Render 등)에 올릴 때 쓴다.
//   공개 배포는 Cloudflare판(server-cf/)이 기본이다. 규칙(채널 · 검사 · 통계)은 둘 다 shared.js를 쓴다. 배포 방법은 docs/deploy.md
// 클라이언트: src/config.js 가 내 컴퓨터(localhost · 192.168.x)에서는 ws://<주소>:8080 으로 붙는다
// 환경 변수
//   PORT             호스팅이 정해 줌 (기본 8080)
//   ALLOWED_ORIGINS  쉼표로 여러 개 (예: https://kkoma.town,https://www.kkoma.town) — 그 주소의 게임만 붙을 수 있다. 비우면 모두 허용(개발용)
//   STATS_KEY        정하면 /stats · /stats.json 을 ?key=값 으로만 볼 수 있다 (비우면 누구나)
//   STATS_DIR        정하면 그 폴더의 stats.jsonl 에 하루 요약을 한 줄씩 덧붙인다
// 주소
//   GET /            kkoma-server ok (호스팅 상태 검사)
//   GET /channels    {cap, list:[{ch, n}]} 채널별 인원 (게임의 채널 고르기)
//   GET /stats       익명 운영 통계 표 · /stats.json 숫자
//   WebSocket ?ch=N  N채널로 (1 ~ 5). 없거나 가득이면 자리가 있는 앞 채널. 다 차면 {t:'full'} 보내고 끊는다
// (2026-11-27) 채널을 고를 수 있게 바꿨다 (예전: 들어온 순서대로 자동 배정). 사람당 메시지 속도 제한을 더했다.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';
import { CAP, CHANNELS, parseCh, pick, allowList, originOk, cors, peer, onMessage, snapshot, dayKey, blank, joined, left, summary, page } from './shared.js';

const PORT = process.env.PORT || 8080, ALLOW = allowList(process.env.ALLOWED_ORIGINS);
const KEY = process.env.STATS_KEY || '', DIR = process.env.STATS_DIR || '';

// ───────── 통계 (하루 단위) ─────────
let today = blank(dayKey()); const history = [];   // 지난날 요약 (14일)
const save = s => { if (DIR) try { fs.mkdirSync(DIR, {recursive:true}); fs.appendFileSync(path.join(DIR, 'stats.jsonl'), JSON.stringify(s) + '\n'); } catch (e) { console.log('stats file', e.message); } };
function roll(){
  const d = dayKey(); if (d === today.day) return;
  const s = summary(today); console.log('[stats-day] ' + JSON.stringify(s)); history.unshift(s); history.length = Math.min(history.length, 14);
  save(s); today = blank(d);
}

// ───────── 채널 ─────────
const chans = Array.from({length:CHANNELS + 1}, () => new Map());   // chans[1..5]: id → 접속 (0번은 안 씀)
const counts = () => chans.map(m => m.size);
const list = () => chans.slice(1).map((m, i) => ({ch:i + 1, n:m.size}));
const online = () => list().reduce((a, c) => a + c.n, 0);

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/channels') {
    res.writeHead(200, {'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', ...cors(req.headers.origin || '', ALLOW)});
    return res.end(JSON.stringify({cap:CAP, list:list()}));
  }
  if (u.pathname === '/stats' || u.pathname === '/stats.json') {
    if (KEY && u.searchParams.get('key') !== KEY) { res.writeHead(403, {'content-type':'text/plain; charset=utf-8'}); return res.end('열쇠가 필요해요 (?key=)'); }
    roll();
    if (u.pathname === '/stats.json') { res.writeHead(200, {'content-type':'application/json; charset=utf-8'}); return res.end(JSON.stringify({online:online(), list:list(), today:summary(today), days:history})); }
    res.writeHead(200, {'content-type':'text/html; charset=utf-8'}); return res.end(page(summary(today), list(), history));
  }
  res.writeHead(200, {'content-type':'text/plain; charset=utf-8'}); res.end('kkoma-server ok');
});
const wss = new WebSocketServer({server, maxPayload:8192, verifyClient:({origin}) => originOk(origin, ALLOW)});
server.listen(PORT);
let nextId = 1;

wss.on('connection', (ws, req) => {
  roll();
  const q = new URL(req.url, 'http://x').searchParams, asked = parseCh(q.get('ch')), ch = pick(counts(), asked);
  if (!ch) { ws.send(JSON.stringify({t:'full'})); ws.close(4001, 'full'); return; }
  const id = nextId++, room = chans[ch], c = peer(ws);
  room.set(id, c);
  if (q.get('re') !== '1') joined(today);   // (2026-11-28) re=1: 끊겼다 다시 붙기 · 자리 비움에서 돌아오기 → 새 접속으로 세지 않는다
  today.peak = Math.max(today.peak, online());
  ws.send(JSON.stringify({t:'hello', id, ch, asked, cap:CAP}));
  ws.on('message', buf => { roll(); if (!onMessage(c, buf.toString(), today)) ws.close(1008, 'too fast'); });
  ws.on('close', () => { roll(); left(today, c); room.delete(id); });
});
// 0.1초마다 채널별로 모두의 상태를 묶어 보낸다. 받은 쪽(net/protocol.js)이 값 범위를 다시 검사한다.
setInterval(() => {
  for (const room of chans) if (room.size) { const msg = snapshot(room); for (const {ws} of room.values()) if (ws.readyState === 1) ws.send(msg); }
}, 100);
setInterval(roll, 60000);
// 한 시간마다 오늘 요약을 로그에 (호스팅 로그 화면에서 볼 수 있다)
setInterval(() => console.log('[stats-hour] ' + JSON.stringify({online:online(), ...summary(today)})), 3600e3);
// 끝낼 때(재배포 · 무료 호스팅이 잠들 때) 오늘 것을 로그와 파일에 남긴다
process.on('SIGTERM', () => { const s = {partial:true, ...summary(today)}; console.log('[stats-partial] ' + JSON.stringify(s)); save(s); process.exit(0); });
console.log(`kkoma server on :${PORT} · 채널 ${CHANNELS}개 × ${CAP}명` + (ALLOW.length ? ' · 허용 주소 ' + ALLOW.join(', ') : ' · 모든 주소 허용(개발용)') + (KEY ? ' · /stats 열쇠 있음' : ''));
