// 꼬마야 꼬마야(겨울 동네) WebSocket 서버. 공개 서비스로 열 때 사용한다. 배포 방법은 docs/deploy.md
// 클라이언트: src/config.js 에서 NET = {kind:'auto', url:'wss://내-서버-주소'} (아티팩트 밖에서는 이 주소로 붙는다)
// 환경 변수
//   PORT             호스팅이 정해 줌 (기본 8080)
//   ALLOWED_ORIGINS  쉼표로 여러 개 (예: https://kkoma.town,https://www.kkoma.town) — 그 주소의 게임만 붙을 수 있다. 비우면 모두 허용(개발용)
//   STATS_KEY        정하면 /stats · /stats.json 을 ?key=값 으로만 볼 수 있다 (비우면 누구나)
//   STATS_DIR        정하면 그 폴더의 stats.jsonl 에 하루 요약을 한 줄씩 덧붙인다 (무료 호스팅은 재시작하면 지워질 수 있다. 요약은 로그에도 남긴다)
// (2026-11-27) 호스팅의 상태 검사(HTTP GET /)에 답하도록 http 서버 위에 WebSocket을 얹었다. 익명 운영 통계(/stats)를 더했다:
//   이름 · IP · 좌표는 저장하지 않는다. 게임(src/net/stats.js)이 보내는 숫자와 접속 수 · 머문 시간만 하루(한국 시간) 단위로 모은다.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080, CAP = 40;   // 채널당 인원
const ALLOW = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const KEY = process.env.STATS_KEY || '', DIR = process.env.STATS_DIR || '';

// ───────── 익명 통계 ─────────
const KST = () => new Date(Date.now() + 9 * 3600e3), dayKey = () => KST().toISOString().slice(0, 10);
const blank = d => ({day:d, peak:0, sessions:0, mins:[], hours:Array(24).fill(0), dev:{m:0, p:0}, q:{}, saver:0, load:{m:[], p:[]}, wait:[], fps:{m:[], p:[]},
  play:{}, area:{}, link:{}, err:{}});
let today = blank(dayKey()); const history = [];   // 지난날 요약 (14일)
const put = (arr, v) => { if (arr.length < 3000) arr.push(v); else arr[Math.floor(Math.random() * arr.length)] = v; };   // 너무 많으면 무작위로 바꿔 넣기 (표본)
const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 : null;
function summary(t){
  const top = (o, n = 12, f = v => v) => Object.entries(o).sort((a, b) => f(b[1]) - f(a[1])).slice(0, n);
  return {day:t.day, peak:t.peak, sessions:t.sessions, minutes:{median:med(t.mins), avg:avg(t.mins)}, hours:t.hours, dev:t.dev, quality:t.q, saver:t.saver,
    loadSec:{m:med(t.load.m), p:med(t.load.p)}, introSec:med(t.wait), fps:{m:med(t.fps.m), p:med(t.fps.p)},
    play:top(t.play, 20, v => v.n).map(([k, v]) => ({a:k, n:v.n, min:Math.round(v.s / 60)})), areaMin:Object.fromEntries(top(t.area, 10).map(([k, v]) => [k, Math.round(v / 60)])),
    link:t.link, err:top(t.err, 10).map(([m, n]) => ({m, n}))};
}
function roll(){
  const d = dayKey(); if (d === today.day) return;
  const s = summary(today); console.log('[stats-day] ' + JSON.stringify(s)); history.unshift(s); history.length = Math.min(history.length, 14);
  if (DIR) try { fs.mkdirSync(DIR, {recursive:true}); fs.appendFileSync(path.join(DIR, 'stats.jsonl'), JSON.stringify(s) + '\n'); } catch (e) { console.log('stats file', e.message); }
  today = blank(d);
}
const online = () => { let n = 0; for (const r of rooms.values()) n += r.size; return n; };
// 게임이 보내는 통계 한 개를 검사해서 더한다 (모르는 것 · 범위 밖은 버린다)
const num = (v, lo, hi) => typeof v === 'number' && isFinite(v) && v >= lo && v <= hi;
const word = v => typeof v === 'string' && /^[a-z0-9_-]{1,20}$/i.test(v);
function addEvent(c, e){
  if (!e || typeof e !== 'object') return;
  const t = today;
  if (e.k === 'hello' && !c.hello) { c.hello = true; c.dev = e.dev === 'm' ? 'm' : 'p'; t.dev[c.dev]++; if (word(e.q)) t.q[e.q] = (t.q[e.q] || 0) + 1; if (e.saver === 1) t.saver++; if (num(e.load, 0, 600)) put(t.load[c.dev], e.load); }
  else if (e.k === 'enter' && num(e.wait, 0, 86400)) put(t.wait, e.wait);
  else if (e.k === 'play' && word(e.a) && num(e.s, 0, 86400)) { const p = t.play[e.a] || (t.play[e.a] = {n:0, s:0}); p.n++; p.s += e.s; }
  else if (e.k === 'min' && num(e.fps, 0, 300)) { put(t.fps[c.dev || 'p'], e.fps); if (e.area && typeof e.area === 'object') for (const [k, v] of Object.entries(e.area)) if (word(k) && num(v, 0, 120)) t.area[k] = (t.area[k] || 0) + v; }
  else if (e.k === 'err' && typeof e.m === 'string' && c.errs++ < 3) { const m = e.m.slice(0, 100); if (t.err[m] || Object.keys(t.err).length < 200) t.err[m] = (t.err[m] || 0) + 1; }
  else if (e.k === 'link' && ['insta', 'donate'].includes(e.l)) t.link[e.l] = (t.link[e.l] || 0) + 1;
}

// ───────── /stats 표 ─────────
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
function page(){
  const s = summary(today), row = (k, v) => `<tr><th>${esc(k)}</th><td>${esc(v ?? '-')}</td></tr>`, maxH = Math.max(1, ...s.hours);
  const hours = s.hours.map((n, h) => `<div title="${h}시 ${n}명"><i style="height:${Math.round(n / maxH * 60)}px"></i><span>${h}</span></div>`).join('');
  const PLAY = {snow:'눈사람 만들기', twinbar:'나눠바 나누기', ttakji:'딱지치기', gonggi:'공기놀이', arcade:'오락기', bench:'벤치 · 평상', edge:'걸터앉기', bus:'마을버스', duck:'흔들 오리',
    kite:'연날리기', merry:'뺑뺑이', phone:'공중전화', seesaw:'시소', sled:'얼음 썰매', slide:'미끄럼틀', snowpour:'미끄럼틀 눈 뿌리기', snack:'군고구마 · 호떡', swing:'그네'};
  const plays = s.play.map(p => row(PLAY[p.a] || p.a, `${p.n}번 · ${p.min}분`)).join('') || row('아직 없음', '');
  const areas = Object.entries(s.areaMin).map(([k, v]) => row({apt:'아파트', park:'공원 · 상가', school:'학교 앞', station:'역', river:'강가'}[k] || k, v + '분')).join('') || row('아직 없음', '');
  const days = history.map(d => `<tr><td>${d.day}</td><td>${d.sessions}</td><td>${d.peak}</td><td>${d.minutes.median ?? '-'}</td><td>${d.dev.m}/${d.dev.p}</td><td>${d.fps.m ?? '-'}/${d.fps.p ?? '-'}</td></tr>`).join('');
  return `<!DOCTYPE html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="60"><title>꼬마야 꼬마야 · 통계</title>
<style>body{font:14px/1.5 system-ui,sans-serif;background:#16181c;color:#e8e6e1;margin:0;padding:20px;max-width:760px}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 6px;color:#e8a838}
small{color:#9a9890}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:4px 8px;border-bottom:1px solid #2c2f35}th{color:#9a9890;font-weight:400;width:45%}.d th{width:auto}
.h{display:flex;gap:2px;align-items:flex-end;height:80px}.h div{flex:1;text-align:center;font-size:10px;color:#777}.h i{display:block;background:#e8a838;margin-bottom:2px}</style>
<h1>꼬마야 꼬마야 · 운영 통계</h1><small>${esc(s.day)} (한국 시간) · 1분마다 새로 고침 · 이름 · IP는 모으지 않음</small>
<h2>지금</h2><table>${row('접속 중', online() + '명')}${row('채널', rooms.size + '개')}</table>
<h2>오늘</h2><table>${row('들어온 수(접속)', s.sessions)}${row('최고 동시 접속', s.peak)}${row('머문 시간 (가운데 · 평균)', `${s.minutes.median ?? '-'}분 · ${s.minutes.avg ?? '-'}분`)}
${row('기기 (폰 · PC)', `${s.dev.m} · ${s.dev.p}`)}${row('화질', Object.entries(s.quality).map(([k, v]) => k + ' ' + v).join(' · ') || '-')}${row('절전 켠 수', s.saver)}
${row('불러오기 초 (폰 · PC, 가운데)', `${s.loadSec.m ?? '-'} · ${s.loadSec.p ?? '-'}`)}${row('시작 화면에 머문 초', s.introSec)}${row('FPS (폰 · PC, 가운데)', `${s.fps.m ?? '-'} · ${s.fps.p ?? '-'}`)}
${row('링크 누름', Object.entries(s.link).map(([k, v]) => ({insta:'인스타', donate:'후원'}[k] || k) + ' ' + v).join(' · ') || '-')}</table>
<h2>시간대별 접속</h2><div class="h">${hours}</div>
<h2>놀이 (횟수 · 한 시간)</h2><table>${plays}</table>
<h2>구역별 머문 시간</h2><table>${areas}</table>
<h2>오류</h2><table>${s.err.map(e => row(e.m, e.n + '번')).join('') || row('없음', '')}</table>
<h2>지난날</h2><table class="d"><tr><th>날</th><th>접속</th><th>최고</th><th>머문 분</th><th>폰/PC</th><th>FPS 폰/PC</th></tr>${days || '<tr><td colspan="6">아직 없음 (자정에 넘어감)</td></tr>'}</table>`;
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/stats' || u.pathname === '/stats.json') {
    if (KEY && u.searchParams.get('key') !== KEY) { res.writeHead(403, {'content-type':'text/plain; charset=utf-8'}); return res.end('열쇠가 필요해요 (?key=)'); }
    roll();
    if (u.pathname === '/stats.json') { res.writeHead(200, {'content-type':'application/json; charset=utf-8'}); return res.end(JSON.stringify({online:online(), channels:rooms.size, today:summary(today), days:history})); }
    res.writeHead(200, {'content-type':'text/html; charset=utf-8'}); return res.end(page());
  }
  res.writeHead(200, {'content-type':'text/plain; charset=utf-8'}); res.end('kkoma-server ok');
});
const wss = new WebSocketServer({server, maxPayload:8192, verifyClient:({origin}) => !ALLOW.length || ALLOW.includes(origin)});
server.listen(PORT);
const rooms = new Map();                            // 채널 이름 → Map(id → {ws, p})
let nextId = 1;

function pickRoom(){
  for (const [name, r] of rooms) if (r.size < CAP) return name;
  const name = 'ch' + (rooms.size + 1); rooms.set(name, new Map()); return name;
}
wss.on('connection', ws => {
  roll();
  const id = nextId++, name = pickRoom(), room = rooms.get(name), c = {ws, p:null, at:Date.now(), dev:null, hello:false, errs:0, evs:0, evAt:Date.now()};
  room.set(id, c);
  today.sessions++; today.hours[KST().getUTCHours()]++; today.peak = Math.max(today.peak, online());
  ws.send(JSON.stringify({t:'hello', id, room:name}));
  ws.on('message', buf => {
    if (buf.length > 4096) return;
    let m; try { m = JSON.parse(buf); } catch { return; }
    if (m.t === 'p' && m.p && typeof m.p.x === 'number' && typeof m.p.z === 'number') c.p = m.p;
    else if (m.t === 'ev' && Array.isArray(m.e)) {   // 익명 통계: 1분에 40개까지
      if (Date.now() - c.evAt > 60000) { c.evAt = Date.now(); c.evs = 0; }
      roll(); for (const e of m.e.slice(0, 20)) if (c.evs++ < 40) addEvent(c, e);
    }
  });
  ws.on('close', () => { roll(); const mins = (Date.now() - c.at) / 60000; if (mins > .05) put(today.mins, Math.round(mins * 10) / 10); room.delete(id); if (!room.size) rooms.delete(name); });
});
// 0.1초마다 채널별로 모두의 상태를 묶어 보낸다. 받은 쪽(net/protocol.js)이 값 범위를 다시 검사한다.
setInterval(() => {
  for (const room of rooms.values()) {
    const msg = JSON.stringify({t:'s', peers:[...room].filter(([, v]) => v.p).map(([k, v]) => ({peer:k, presence:v.p}))});
    for (const {ws} of room.values()) if (ws.readyState === 1) ws.send(msg);
  }
}, 100);
setInterval(roll, 60000);
// 한 시간마다 오늘 요약을 로그에 (호스팅 로그 화면에서 볼 수 있다)
setInterval(() => console.log('[stats-hour] ' + JSON.stringify({online:online(), ...summary(today)})), 3600e3);
// 끝낼 때(재배포 등) 오늘 것을 파일에 남긴다
process.on('SIGTERM', () => { if (DIR) try { fs.mkdirSync(DIR, {recursive:true}); fs.appendFileSync(path.join(DIR, 'stats.jsonl'), JSON.stringify({partial:true, ...summary(today)}) + '\n'); } catch (e) {} process.exit(0); });
console.log('kkoma server on :' + PORT + (ALLOW.length ? ' · 허용 주소 ' + ALLOW.join(', ') : ' · 모든 주소 허용(개발용)') + (KEY ? ' · /stats 열쇠 있음' : ''));
