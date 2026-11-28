// 꼬마야 꼬마야 멀티플레이 서버 — Cloudflare판 (Workers + Durable Objects). 공개 배포는 이것을 쓴다.
//   규칙(채널 고르기 · 메시지 검사 · 속도 제한 · 통계)은 Node판과 같은 ../../server/shared.js 를 쓴다.
// 구조
//   입구(이 파일의 fetch): Origin 검사 → 허브에게 채널을 물어보고 → 그 채널 서버로 넘긴다
//   Room (채널마다 하나, 이름 'ch1' ~ 'ch5'): 접속을 받고 0.1초마다 모두의 상태를 보낸다. 아무도 없으면 쉰다
//   Hub  (하나, 이름 'hub'): 채널별 인원 · 하루 통계를 모으고 저장소에 남긴다 (재시작해도 남는다)
// 주소: GET / · GET /channels · GET /stats(.json)?key= · WebSocket ?ch=N  (Node판과 같다)
// 설정: wrangler.jsonc 의 vars.ALLOWED_ORIGINS · 비밀 STATS_KEY (npx wrangler secret put STATS_KEY, 로컬은 .dev.vars)
import { DurableObject } from 'cloudflare:workers';
import { CAP, CHANNELS, parseCh, pick, allowList, originOk, cors, peer, onMessage, snapshot, dayKey, blank, joined, left, summary, merge, empty, page } from '../../server/shared.js';

const hubOf = env => env.HUB.get(env.HUB.idFromName('hub'));
const text = (s, status = 200, h = {}) => new Response(s, {status, headers:{'content-type':'text/plain; charset=utf-8', ...h}});
const json = (o, h = {}) => new Response(JSON.stringify(o), {headers:{'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', ...h}});
// 다 찼을 때: 접속을 받아서 'full'을 알리고 바로 닫는다 (게임이 10초 뒤 다시 시도한다)
function full(){
  const [client, ws] = Object.values(new WebSocketPair()); ws.accept();
  ws.send(JSON.stringify({t:'full'})); ws.close(4001, 'full');
  return new Response(null, {status:101, webSocket:client});
}

export default {
  async fetch(req, env){
    const u = new URL(req.url), allow = allowList(env.ALLOWED_ORIGINS), origin = req.headers.get('Origin') || '';
    if (req.headers.get('Upgrade') === 'websocket') {
      if (!originOk(origin, allow)) return text('forbidden', 403);
      const asked = parseCh(u.searchParams.get('ch')), ch = await hubOf(env).pick(asked);
      if (!ch) return full();
      const room = env.ROOM.get(env.ROOM.idFromName('ch' + ch));
      const re = u.searchParams.get('re') === '1' ? 1 : 0;   // (2026-11-28) 다시 붙기 표시 (통계에서 새 접속으로 세지 않음)
      return room.fetch(new Request(`https://room/?ch=${ch}&asked=${asked}&re=${re}`, req));
    }
    if (u.pathname === '/channels') return json(await hubOf(env).channels(), cors(origin, allow));
    if (u.pathname === '/stats' || u.pathname === '/stats.json') {
      if (env.STATS_KEY && u.searchParams.get('key') !== env.STATS_KEY) return text('열쇠가 필요해요 (?key=)', 403);
      const hub = hubOf(env);
      if (u.pathname === '/stats.json') return json(await hub.statsJson());
      return new Response(await hub.statsPage(), {headers:{'content-type':'text/html; charset=utf-8'}});
    }
    return text('kkoma-server ok');
  },
};

// ───────── 채널 하나 ─────────
export class Room extends DurableObject {
  constructor(ctx, env){
    super(ctx, env);
    this.peers = new Map(); this.next = 1; this.ch = 0; this.timer = 0; this.ticks = 0;
    this.delta = blank(dayKey());   // 허브에 넘기기 전까지 모은 통계 조각
  }
  async fetch(req){
    const u = new URL(req.url);
    this.ch = parseCh(u.searchParams.get('ch')) || this.ch;
    if (this.peers.size >= CAP) return full();   // 허브 숫자가 늦게 반영돼 한꺼번에 몰린 경우
    const [client, ws] = Object.values(new WebSocketPair()); ws.accept();
    const id = this.next++, c = peer(ws);
    this.peers.set(id, c); if (u.searchParams.get('re') !== '1') joined(this.delta);   // (2026-11-28) re=1(다시 붙기)은 '들어온 수'에 세지 않는다
    ws.send(JSON.stringify({t:'hello', id, ch:this.ch, asked:parseCh(u.searchParams.get('asked')), cap:CAP}));
    ws.addEventListener('message', ev => { if (!onMessage(c, ev.data, this.delta)) try { ws.close(1008, 'too fast'); } catch {} });
    const bye = () => this.leave(id);
    ws.addEventListener('close', bye); ws.addEventListener('error', bye);
    this.report();
    if (!this.timer) this.timer = setInterval(() => this.beat(), 100);
    return new Response(null, {status:101, webSocket:client});
  }
  leave(id){
    const c = this.peers.get(id); if (!c) return;
    this.peers.delete(id); left(this.delta, c);
    if (!this.peers.size) { clearInterval(this.timer); this.timer = 0; }
    this.report();
  }
  beat(){
    if (this.peers.size) { const msg = snapshot(this.peers); for (const {ws} of this.peers.values()) try { ws.send(msg); } catch {} }
    if (++this.ticks % 600 === 0) this.report();   // 1분마다 인원 · 통계 조각을 허브에 (허브가 인원을 잊지 않게)
  }
  report(){
    const d = this.delta; this.delta = blank(dayKey());
    hubOf(this.env).report(this.ch, this.peers.size, empty(d) ? null : d).catch(() => {});
  }
}

// ───────── 허브: 채널별 인원 · 하루 통계 ─────────
export class Hub extends DurableObject {
  constructor(ctx, env){
    super(ctx, env);
    this.counts = {};   // ch → {n, at}
    ctx.blockConcurrencyWhile(async () => {
      this.today = (await ctx.storage.get('today')) || blank(dayKey());
      this.history = (await ctx.storage.get('history')) || [];
    });
  }
  // 채널 소식이 2분 반 넘게 없으면 0명으로 본다 (채널 서버가 멈춘 경우)
  n(ch){ const c = this.counts[ch]; return c && Date.now() - c.at < 150e3 ? c.n : 0; }
  arr(){ return Array.from({length:CHANNELS + 1}, (_, ch) => ch ? this.n(ch) : 0); }
  list(){ return this.arr().slice(1).map((n, i) => ({ch:i + 1, n})); }
  pick(asked){
    const ch = pick(this.arr(), asked);
    if (ch) this.counts[ch] = {n:this.n(ch) + 1, at:Date.now()};   // 미리 한 자리 잡아 둔다 (채널 서버가 곧 정확한 숫자를 알려 준다)
    return ch;
  }
  channels(){ return {cap:CAP, list:this.list()}; }
  async report(ch, n, d){
    await this.roll();
    if (ch) this.counts[ch] = {n, at:Date.now()};
    const online = this.arr().reduce((a, b) => a + b, 0);
    let dirty = false;
    if (d) { merge(this.today, d); dirty = true; }
    if (online > this.today.peak) { this.today.peak = online; dirty = true; }
    if (dirty && !(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + 60e3);   // 1분에 한 번만 저장
  }
  async alarm(){ await this.roll(); await this.ctx.storage.put('today', this.today); }
  // 한국 시간 자정이 지나면 오늘 것을 지난날로 넘긴다
  async roll(){
    const d = dayKey(); if (d === this.today.day) return;
    const s = summary(this.today); console.log('[stats-day] ' + JSON.stringify(s));
    this.history.unshift(s); this.history.length = Math.min(this.history.length, 14);
    this.today = blank(d);
    await this.ctx.storage.put({history:this.history, today:this.today});
  }
  async statsJson(){ await this.roll(); return {online:this.arr().reduce((a, b) => a + b, 0), list:this.list(), today:summary(this.today), days:this.history}; }
  async statsPage(){ await this.roll(); return page(summary(this.today), this.list(), this.history); }
}
