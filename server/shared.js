// 서버 공통 (2026-11-27): 채널 고르기 · 메시지 검사 · 속도 제한 · 익명 통계 · /stats 표.
//   Node 서버(server/server.js: 로컬 테스트 · 다른 호스팅)와 Cloudflare 서버(server-cf/)가 같이 쓴다. 규칙을 바꾸면 둘 다 바뀐다.
export const CAP = 40, CHANNELS = 5;   // 채널당 인원 · 채널 수 (1 ~ CHANNELS)

// ───────── 채널 ─────────
// ?ch= 값 → 1 ~ CHANNELS, 아니면 0(자동)
export const parseCh = v => { const n = +v; return Number.isInteger(n) && n >= 1 && n <= CHANNELS ? n : 0; };
// counts[ch] = 지금 인원. 원하는 채널(want)에 자리가 있으면 그곳, 아니면 자리가 있는 가장 앞 채널(사람끼리 모이게), 다 차면 0
export function pick(counts, want){
  if (want && (counts[want] || 0) < CAP) return want;
  for (let ch = 1; ch <= CHANNELS; ch++) if ((counts[ch] || 0) < CAP) return ch;
  return 0;
}

// ───────── 접속 검사 ─────────
export const allowList = s => (s || '').split(',').map(v => v.trim()).filter(Boolean);
// 허용 목록이 비면 모두 허용(개발용). 있으면 그 주소의 게임만
export const originOk = (origin, allow) => !allow.length || allow.includes(origin);
// /channels 를 다른 주소(게임 화면)에서 읽을 수 있게
export const cors = (origin, allow) => ({'access-control-allow-origin': allow.length ? (allow.includes(origin) ? origin : allow[0]) : '*', vary:'Origin'});
export const presenceOk = m => m.t === 'p' && m.p && typeof m.p === 'object' && typeof m.p.x === 'number' && typeof m.p.z === 'number';
// 사람당 메시지 속도 제한: 1초에 20개씩 차오르는 통(최대 40). 게임은 많아야 1초에 12번 보낸다. 넘친 것은 버리고, 계속 넘치면(drop > 200) 끊는다
export function rateOk(c, now){
  c.tok = Math.min(40, (c.tok ?? 40) + (now - (c.tAt || now)) / 1000 * 20); c.tAt = now;
  if (c.tok < 1) { c.drop = (c.drop || 0) + 1; return false; }
  c.tok--; return true;
}
// 접속 한 명의 상태 (서버 둘 다 이 모양)
export const peer = ws => ({ws, p:null, at:Date.now(), dev:null, hello:false, errs:0, evs:0, evAt:Date.now(), tok:40, tAt:Date.now(), drop:0});
// 받은 메시지 처리: 위치(p)면 c.p에 넣고, 통계(ev)면 t에 더한다. 끊어야 하면 false
export function onMessage(c, data, t){
  if (typeof data !== 'string' || data.length > 4096) return true;
  if (!rateOk(c, Date.now())) return c.drop <= 200;
  let m; try { m = JSON.parse(data); } catch { return true; }
  if (!m || typeof m !== 'object') return true;
  if (presenceOk(m)) c.p = m.p;
  else if (m.t === 'ev' && Array.isArray(m.e)) {   // 익명 통계: 1분에 40개까지
    if (Date.now() - c.evAt > 60000) { c.evAt = Date.now(); c.evs = 0; }
    for (const e of m.e.slice(0, 20)) if (c.evs++ < 40) addEvent(t, c, e);
  }
  return true;
}
// 0.1초마다 채널 안 모두에게 보내는 묶음
export const snapshot = peers => JSON.stringify({t:'s', peers:[...peers].filter(([, v]) => v.p).map(([k, v]) => ({peer:k, presence:v.p}))});

// ───────── 익명 통계 ─────────
// 이름 · IP · 좌표는 저장하지 않는다. 게임(src/net/stats.js)이 보내는 숫자와 접속 수 · 머문 시간만 하루(한국 시간) 단위로 모은다.
export const KST = () => new Date(Date.now() + 9 * 3600e3), dayKey = () => KST().toISOString().slice(0, 10);
export const blank = d => ({day:d, peak:0, sessions:0, mins:[], hours:Array(24).fill(0), dev:{m:0, p:0}, q:{}, saver:0, load:{m:[], p:[]}, wait:[], fps:{m:[], p:[]},
  play:{}, area:{}, link:{}, err:{}});
export const put = (arr, v) => { if (arr.length < 3000) arr.push(v); else arr[Math.floor(Math.random() * arr.length)] = v; };   // 너무 많으면 무작위로 바꿔 넣기 (표본)
const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 : null;
export function joined(t){ t.sessions++; t.hours[KST().getUTCHours()]++; }
export function left(t, c){ const mins = (Date.now() - c.at) / 60000; if (mins > .05) put(t.mins, Math.round(mins * 10) / 10); }
export function summary(t){
  const top = (o, n = 12, f = v => v) => Object.entries(o).sort((a, b) => f(b[1]) - f(a[1])).slice(0, n);
  return {day:t.day, peak:t.peak, sessions:t.sessions, minutes:{median:med(t.mins), avg:avg(t.mins)}, hours:t.hours, dev:t.dev, quality:t.q, saver:t.saver,
    loadSec:{m:med(t.load.m), p:med(t.load.p)}, introSec:med(t.wait), fps:{m:med(t.fps.m), p:med(t.fps.p)},
    play:top(t.play, 20, v => v.n).map(([k, v]) => ({a:k, n:v.n, min:Math.round(v.s / 60)})), areaMin:Object.fromEntries(top(t.area, 10).map(([k, v]) => [k, Math.round(v / 60)])),
    link:t.link, err:top(t.err, 10).map(([m, n]) => ({m, n}))};
}
// 게임이 보내는 통계 한 개를 검사해서 더한다 (모르는 것 · 범위 밖은 버린다)
const num = (v, lo, hi) => typeof v === 'number' && isFinite(v) && v >= lo && v <= hi;
const word = v => typeof v === 'string' && /^[a-z0-9_-]{1,20}$/i.test(v);
const addErr = (t, m, n) => { if (t.err[m] || Object.keys(t.err).length < 200) t.err[m] = (t.err[m] || 0) + n; };
export function addEvent(t, c, e){
  if (!e || typeof e !== 'object') return;
  if (e.k === 'hello' && !c.hello) { c.hello = true; c.dev = e.dev === 'm' ? 'm' : 'p'; t.dev[c.dev]++; if (word(e.q)) t.q[e.q] = (t.q[e.q] || 0) + 1; if (e.saver === 1) t.saver++; if (num(e.load, 0, 600)) put(t.load[c.dev], e.load); }
  else if (e.k === 'enter' && num(e.wait, 0, 86400)) put(t.wait, e.wait);
  else if (e.k === 'play' && word(e.a) && num(e.s, 0, 86400)) { const p = t.play[e.a] || (t.play[e.a] = {n:0, s:0}); p.n++; p.s += e.s; }
  else if (e.k === 'min' && num(e.fps, 0, 300)) { put(t.fps[c.dev || 'p'], e.fps); if (e.area && typeof e.area === 'object') for (const [k, v] of Object.entries(e.area)) if (word(k) && num(v, 0, 120)) t.area[k] = (t.area[k] || 0) + v; }
  else if (e.k === 'err' && typeof e.m === 'string' && c.errs++ < 3) addErr(t, e.m.slice(0, 100), 1);
  else if (e.k === 'link' && ['insta', 'donate'].includes(e.l)) t.link[e.l] = (t.link[e.l] || 0) + 1;
}
// Cloudflare: 채널마다 모은 조각(d)을 하루 통계(t)에 더한다 (peak는 따로)
export function merge(t, d){
  const add = (a, b) => { for (const k in b) a[k] = (a[k] || 0) + b[k]; };
  t.sessions += d.sessions; d.hours.forEach((n, h) => { t.hours[h] += n; }); add(t.dev, d.dev); add(t.q, d.q); t.saver += d.saver; add(t.area, d.area); add(t.link, d.link);
  d.mins.forEach(v => put(t.mins, v)); d.wait.forEach(v => put(t.wait, v));
  for (const k of ['m', 'p']) { d.load[k].forEach(v => put(t.load[k], v)); d.fps[k].forEach(v => put(t.fps[k], v)); }
  for (const [a, v] of Object.entries(d.play)) { const p = t.play[a] || (t.play[a] = {n:0, s:0}); p.n += v.n; p.s += v.s; }
  for (const [m, n] of Object.entries(d.err)) addErr(t, m, n);
}
export const empty = d => !d.sessions && !d.mins.length && !d.dev.m && !d.dev.p && !d.wait.length && !d.fps.m.length && !d.fps.p.length
  && !Object.keys(d.play).length && !Object.keys(d.area).length && !Object.keys(d.link).length && !Object.keys(d.err).length;

// ───────── /stats 표 ─────────
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
// s: summary(today), list: [{ch, n}], history: 지난날 요약
export function page(s, list, history){
  const online = list.reduce((a, c) => a + c.n, 0), row = (k, v) => `<tr><th>${esc(k)}</th><td>${esc(v ?? '-')}</td></tr>`, maxH = Math.max(1, ...s.hours);
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
<h2>지금</h2><table>${row('접속 중', online + '명')}${row('채널별', list.map(c => `${c.ch}채널 ${c.n}명`).join(' · '))}</table>
<h2>오늘</h2><table>${row('들어온 수(접속 · 채널을 바꾸면 한 번 더 셈)', s.sessions)}${row('최고 동시 접속', s.peak)}${row('머문 시간 (가운데 · 평균)', `${s.minutes.median ?? '-'}분 · ${s.minutes.avg ?? '-'}분`)}
${row('기기 (폰 · PC)', `${s.dev.m} · ${s.dev.p}`)}${row('화질', Object.entries(s.quality).map(([k, v]) => k + ' ' + v).join(' · ') || '-')}${row('절전 켠 수', s.saver)}
${row('불러오기 초 (폰 · PC, 가운데)', `${s.loadSec.m ?? '-'} · ${s.loadSec.p ?? '-'}`)}${row('시작 화면에 머문 초', s.introSec)}${row('FPS (폰 · PC, 가운데)', `${s.fps.m ?? '-'} · ${s.fps.p ?? '-'}`)}
${row('링크 누름', Object.entries(s.link).map(([k, v]) => ({insta:'인스타', donate:'후원'}[k] || k) + ' ' + v).join(' · ') || '-')}</table>
<h2>시간대별 접속</h2><div class="h">${hours}</div>
<h2>놀이 (횟수 · 한 시간)</h2><table>${plays}</table>
<h2>구역별 머문 시간</h2><table>${areas}</table>
<h2>오류</h2><table>${s.err.map(e => row(e.m, e.n + '번')).join('') || row('없음', '')}</table>
<h2>지난날</h2><table class="d"><tr><th>날</th><th>접속</th><th>최고</th><th>머문 분</th><th>폰/PC</th><th>FPS 폰/PC</th></tr>${days || '<tr><td colspan="6">아직 없음 (자정에 넘어감)</td></tr>'}</table>`;
}
