// 직접 띄운 WebSocket 서버로 연결 (server-cf/ · server/server.js 참고). 끊기면 3초 뒤 다시 붙는다.
// (2026-11-27) 채널: 주소 뒤 ?ch=N 으로 고른 채널에 들어간다. 0이면 서버가 자리가 있는 앞 채널로 보낸다.
//   한 번 들어가면 그 채널을 기억해서 끊겼다 다시 붙을 때도 같은 채널로 간다. 고른 채널이 가득이면 서버가 다른 채널로 보낸다.
//   모든 채널이 가득이면 서버가 {t:'full'}을 보내고 끊는다 → 10초 뒤 다시 시도.
export async function connectWebSocket(url, {onPeers, onStatus, onChannel}, first = 0){   // first: 불러오는 중에 고른 채널 (0이면 서버가 고른다)
  let ws = null, myId = null, pending = null, want = first | 0, cur = 0, wait = 3000;
  const open = () => {
    const s = ws = new WebSocket(url + (want ? (url.includes('?') ? '&' : '?') + 'ch=' + want : ''));
    s.onopen = () => { if (pending) s.send(JSON.stringify({t:'p', p:pending})); };
    s.onclose = () => { if (s !== ws) return; cur = 0; onStatus(false); onPeers([]); onChannel(0); setTimeout(open, wait); wait = 3000; };
    s.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.t === 'hello') { myId = m.id; cur = want = m.ch | 0; onStatus(true); onChannel(cur, m.asked | 0); }
      else if (m.t === 'full') { want = 0; wait = 10000; onChannel(0, 0, true); }
      else if (m.t === 's' && Array.isArray(m.peers)) onPeers(m.peers.filter(p => p.peer !== myId).map(p => ({id:String(p.peer), presence:p.presence}))); };
  };
  open();
  return {send:p => { pending = p; if (ws && ws.readyState === 1) ws.send(JSON.stringify({t:'p', p})); },
    raw:o => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); },   // (2026-11-27) 익명 통계 (net/stats.js)
    channel:() => cur,
    // 다른 채널로 옮기기: 지금 연결을 닫고 바로 새 채널로 붙는다
    setChannel:n => { if (n === cur) return; want = n; const old = ws; ws = null;
      if (old) { old.onclose = old.onmessage = null; try { old.close(); } catch (e) {} }
      cur = 0; onStatus(false); onPeers([]); onChannel(0); open(); }};
}
