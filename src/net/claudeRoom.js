// Claude 아티팩트의 실시간 공유(room)로 연결. 아티팩트를 공유받은 로그인 사용자끼리만 보인다.
// 다른 페이지 안(iframe)에 떠 있는지. 알 수 없으면(막힘) 안에 있다고 본다
export const framed = () => { try { return window.self !== window.top; } catch (e) { return true; } };
export async function connectClaudeRoom({onPeers, onStatus}){
  // (2026-11-28) 아티팩트는 다른 페이지 안(iframe)에 뜬다. 맨 위 창(배포 사이트)이면 6초(20번) 대신 0.6초만 보고 바로 서버로 간다 (채널 칸이 늦게 뜨던 까닭)
  const tries = framed() ? 20 : 2;
  for (let i = 0; i < tries &&!(window.claude && typeof window.claude.use === 'function'); i++) await new Promise(r => setTimeout(r, 300));
  if (!window.claude || typeof window.claude.use !== 'function') return null;
  const room = await window.claude.use('room'); if (!room) return null;
  const dead = () => { onStatus(false); onPeers([]); };
  room.onPeers(ch => onPeers(ch.peers.filter(p => !(p.isMe && p.sameTab) && (!p.kind || p.kind === 'viewer')).map(p => ({id:p.peer, presence:p.presence}))), dead);
  room.onConnection(c => onStatus(!!c), dead);
  return {send:p => room.presence(p).catch(() => {})};
}
