// 연결 방식 선택과 내 상태 보내기. config.NET.kind로 고른다.
// (2026-11-27) 채널: net.ch = 지금 들어간 채널(0: 아직 · 공유 방), setChannel(n)로 옮기고, listChannels()로 채널별 인원을 받는다.
import { NET } from '../config.js';
import { S } from '../core/state.js';
import { encode } from './protocol.js';
import { connectClaudeRoom, framed } from './claudeRoom.js';
import { connectWebSocket } from './websocket.js';

// (2026-11-28) want: 가고 싶은 채널. 연결 전(불러오는 중)에 눌러도 기억했다가 그 채널로 붙고, 옮기는 중에도 단추가 바로 그 채널을 가리킨다
export const net = {link:null, online:false, last:'', at:0, kind:'', ch:0, want:0};
export async function connect(handlers){
  const h = {onPeers:handlers.onPeers, onStatus:c => { net.online = c; if (c) net.last = ''; handlers.onStatus(c); },
    onChannel:(ch, asked, full) => { net.ch = ch; if (ch) net.want = ch; else if (full) net.want = 0; if (handlers.onChannel) handlers.onChannel(ch, asked, full); }};
  try {
    if (NET.kind !== 'websocket') { net.link = await connectClaudeRoom(h); if (net.link) net.kind = 'room'; }   // 아티팩트 안: 공유 방
    if (!net.link && NET.kind !== 'claude-room') { net.link = await connectWebSocket(NET.url, h, net.want); net.kind = 'websocket'; }   // 아티팩트 밖: 직접 띄운 서버
  } catch (e) { net.link = null; }
}
export function netTick(now){
  if (!net.link || S.mode === 'intro' || now - net.at < 85) return;
  const p = encode(S.me), s = JSON.stringify(p); if (s === net.last) return;
  net.last = s; net.at = now; net.link.send(p);
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
