// 연결 방식 선택과 내 상태 보내기. config.NET.kind로 고른다.
import { NET } from '../config.js';
import { S } from '../core/state.js';
import { encode } from './protocol.js';
import { connectClaudeRoom } from './claudeRoom.js';
import { connectWebSocket } from './websocket.js';

export const net = {link:null, online:false, last:'', at:0};
export async function connect(handlers){
  const h = {onPeers:handlers.onPeers, onStatus:c => { net.online = c; if (c) net.last = ''; handlers.onStatus(c); }};
  try { net.link = NET.kind === 'websocket' ? await connectWebSocket(NET.url, h) : await connectClaudeRoom(h); } catch (e) { net.link = null; }
}
export function netTick(now){
  if (!net.link || S.mode === 'intro' || now - net.at < 85) return;
  const p = encode(S.me), s = JSON.stringify(p); if (s === net.last) return;
  net.last = s; net.at = now; net.link.send(p);
}
