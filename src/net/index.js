// 연결 방식 선택과 내 상태 보내기. config.NET.kind로 고른다.
// (2026-11-27) 채널: net.ch = 지금 들어간 채널(0: 아직 · 공유 방), setChannel(n)로 옮기고, listChannels()로 채널별 인원을 받는다.
import { NET, ST } from '../config.js';
import { S } from '../core/state.js';
import { encode } from './protocol.js';
import { connectClaudeRoom, framed } from './claudeRoom.js';
import { connectWebSocket } from './websocket.js';

// (2026-11-28) want: 가고 싶은 채널. 연결 전(불러오는 중)에 눌러도 기억했다가 그 채널로 붙고, 옮기는 중에도 단추가 바로 그 채널을 가리킨다
export const net = {link:null, online:false, last:'', at:0, kind:'', ch:0, want:0, away:false};   // away: 자리 비움으로 연결을 닫아 둠 (아래 initAway)
export async function connect(handlers){
  const h = {onPeers:handlers.onPeers, onStatus:c => { net.online = c; if (c) net.last = ''; handlers.onStatus(c); },
    onChannel:(ch, asked, full) => { net.ch = ch; if (ch) net.want = ch; else if (full) net.want = 0; if (handlers.onChannel) handlers.onChannel(ch, asked, full); }};
  try {
    if (NET.kind !== 'websocket') { net.link = await connectClaudeRoom(h); if (net.link) net.kind = 'room'; }   // 아티팩트 안: 공유 방
    if (!net.link && NET.kind !== 'claude-room') { net.link = await connectWebSocket(NET.url, h, net.want); net.kind = 'websocket'; }   // 아티팩트 밖: 직접 띄운 서버
  } catch (e) { net.link = null; }
}
// 내 상태 보내기 (바뀌었을 때만). (2026-11-28) 서버 요청 아끼기: 걷기만 할 때(위치 · 방향만 바뀜)는 0.2초마다,
//   놀이 · 손 흔들기 등 다른 값이 바뀌거나 걷기가 아닌 상태(썰매 · 시소 등)면 0.1초마다. 서버는 0.1초마다 모아 보내므로 그보다 자주 보낼 필요는 없다.
//   받는 쪽은 entities/remotes.js가 띄엄띄엄 온 위치 사이를 이어 그린다
const SEND = {act:95, walk:195};
let lastRest = '';
export function netTick(now){
  if (!net.link || S.mode === 'intro' || now - net.at < SEND.act) return;
  const p = encode(S.me), s = JSON.stringify(p); if (s === net.last) return;
  const {x, z, r, ...rest} = p, rs = JSON.stringify(rest);
  if (rs === lastRest && p.st === ST.WALK && now - net.at < SEND.walk) return;   // 걷기만: 조금 더 기다렸다 보낸다 (멈춘 자리도 이 다음에 꼭 간다)
  lastRest = rs; net.last = s; net.at = now;
  p.tm = Math.round(performance.now()) % TM;   // (2026-11-28) 보낸 시각(ms). 받는 쪽이 위치 사이 간격을 정확히 안다 (서버가 0.1초 단위로 모아 보내 받는 간격이 들쭉날쭉하므로). 비교(net.last)가 끝난 뒤에 붙인다
  net.link.send(p);
}
export const TM = 1048576;   // 보낸 시각을 이 값으로 돌려 쓴다 (약 17분)

// (2026-11-28) 자리 비움: 탭을 1분 넘게 가려 두었거나, 10분 동안 아무 입력이 없으면 서버 연결을 잠시 닫는다.
//   서버(채널)는 한 명이라도 붙어 있으면 계속 돌아서 무료 실행 시간을 쓴다 → 켜 두고 잊은 탭 하나가 하루 한도를 다 쓰지 않게.
//   다시 탭을 보거나 아무 키 · 화면을 누르면 같은 채널로 바로 다시 붙는다. 아티팩트 공유 방(room)은 그대로 둔다
export const AWAY = {hidden:60e3, idle:10 * 60e3};
let lastInput = performance.now(), hiddenAt = 0, awayCb = null;
export function initAway(cb){
  awayCb = cb;
  ['keydown', 'pointerdown', 'pointermove', 'wheel', 'touchstart'].forEach(ev => addEventListener(ev, back, {capture:true, passive:true}));
  document.addEventListener('visibilitychange', () => { if (document.hidden) hiddenAt = performance.now(); else back(); });
  setInterval(() => {
    if (net.away || net.kind !== 'websocket' || !net.link || !net.link.pause) return;
    const now = performance.now(), why = document.hidden && now - hiddenAt > AWAY.hidden ? 'hidden' : now - lastInput > AWAY.idle ? 'idle' : '';
    if (why) { net.away = true; net.link.pause(); if (awayCb) awayCb(true, why); }
  }, 5000);
}
function back(){
  lastInput = performance.now();
  if (!net.away || document.hidden) return;
  net.away = false; if (net.link && net.link.resume) net.link.resume(); if (awayCb) awayCb(false);
}
// 채널 (WebSocket 서버일 때만). (2026-11-28) 연결 전에도 아티팩트 밖이면 서버로 갈 것을 알므로 바로 채널 칸을 보인다
export const hasChannels = () => net.kind ? net.kind === 'websocket' : NET.kind === 'websocket' || (NET.kind === 'auto' && !framed());
export function setChannel(n){ if (!hasChannels()) return; net.want = n; if (net.link && net.link.setChannel) net.link.setChannel(n); }
// 서버의 /channels → {cap, list:[{ch, n}]}. 못 받으면 null
export async function listChannels(){
  if (!hasChannels()) return null;
  try {
    const base = NET.url.replace(/^ws/, 'http').replace(/[?#].*$/, '').replace(/\/+$/, '');
    const r = await fetch(base + '/channels', {cache:'no-store'});
    const o = await r.json(); return o && Array.isArray(o.list) ? o : null;
  } catch (e) { return null; }
}
