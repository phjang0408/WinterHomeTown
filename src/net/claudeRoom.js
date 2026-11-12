// Claude 아티팩트의 실시간 공유(room)로 연결. 아티팩트를 공유받은 로그인 사용자끼리만 보인다.
export async function connectClaudeRoom({onPeers, onStatus}){
  for (let i = 0; i < 20 && !(window.claude && typeof window.claude.use === 'function'); i++) await new Promise(r => setTimeout(r, 300));
  if (!window.claude || typeof window.claude.use !== 'function') return null;
  const room = await window.claude.use('room'); if (!room) return null;
  const dead = () => { onStatus(false); onPeers([]); };
  room.onPeers(ch => onPeers(ch.peers.filter(p => !(p.isMe && p.sameTab) && (!p.kind || p.kind === 'viewer')).map(p => ({id:p.peer, presence:p.presence}))), dead);
  room.onConnection(c => onStatus(!!c), dead);
  return {send:p => room.presence(p).catch(() => {})};
}
