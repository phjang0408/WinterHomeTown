// 겨울 동네 WebSocket 서버 (선택). 공개 서비스로 열 때 사용한다.
// 실행: cd server && npm install && npm start
// 클라이언트: src/config.js 에서 NET = {kind:'websocket', url:'wss://내-서버-주소'}
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080, CAP = 40;   // 채널당 인원
const wss = new WebSocketServer({port:PORT});
const rooms = new Map();                            // 채널 이름 → Map(id → {ws, p})
let nextId = 1;

function pickRoom(){
  for (const [name, r] of rooms) if (r.size < CAP) return name;
  const name = 'ch' + (rooms.size + 1); rooms.set(name, new Map()); return name;
}
wss.on('connection', ws => {
  const id = nextId++, name = pickRoom(), room = rooms.get(name);
  room.set(id, {ws, p:null});
  ws.send(JSON.stringify({t:'hello', id, room:name}));
  ws.on('message', buf => {
    if (buf.length > 4096) return;
    let m; try { m = JSON.parse(buf); } catch { return; }
    if (m.t === 'p' && m.p && typeof m.p.x === 'number' && typeof m.p.z === 'number') room.get(id).p = m.p;
  });
  ws.on('close', () => { room.delete(id); if (!room.size) rooms.delete(name); });
});
// 0.1초마다 채널별로 모두의 상태를 묶어 보낸다. 받은 쪽(net/protocol.js)이 값 범위를 다시 검사한다.
setInterval(() => {
  for (const room of rooms.values()) {
    const msg = JSON.stringify({t:'s', peers:[...room].filter(([, v]) => v.p).map(([k, v]) => ({peer:k, presence:v.p}))});
    for (const {ws} of room.values()) if (ws.readyState === 1) ws.send(msg);
  }
}, 100);
console.log('winter-town server on :' + PORT);
