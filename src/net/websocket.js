// 직접 띄운 WebSocket 서버로 연결 (server/server.js 참고). 끊기면 3초 뒤 다시 붙는다.
export async function connectWebSocket(url, {onPeers, onStatus}){
  let ws = null, myId = null, pending = null;
  const open = () => {
    ws = new WebSocket(url);
    ws.onopen = () => { onStatus(true); if (pending) ws.send(JSON.stringify({t:'p', p:pending})); };
    ws.onclose = () => { onStatus(false); onPeers([]); setTimeout(open, 3000); };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.t === 'hello') myId = m.id;
      if (m.t === 's' && Array.isArray(m.peers)) onPeers(m.peers.filter(p => p.peer !== myId).map(p => ({id:String(p.peer), presence:p.presence}))); };
  };
  open();
  return {send:p => { pending = p; if (ws && ws.readyState === 1) ws.send(JSON.stringify({t:'p', p})); }};
}
