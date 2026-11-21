// 공중전화 콜렉트콜 (2026-11-20): 부스에 들어가 엄마에게 수신자 부담 전화를 건다.
//   수화기 들기 → 발신음 → 번호 누르기 → 뚜루루루(연결음) → 안내 음성 → "엄마, 나야!" → 엄마 한마디 → 끊기.
//   소리는 Web Audio로 만든다 (연결음은 440 · 480Hz를 빠르게 끊어 '뚜루루루'). 다른 사람에게는 부스 안 사람 머리 위에 '통화 중'이 보인다.
//   안내 음성 · 대사는 지어낸 것이다 (실제 서비스 번호 · 문구를 쓰지 않는다).
import { ST, UNIT } from '../config.js';
import { audio, sfx } from '../core/fx.js';
import { pillSprite } from '../core/gfx.js';
import { me } from '../entities/player.js';
import { hud } from '../ui/hud.js';
import { S } from '../core/state.js';
import { defineActivity, begin, stopActivity, seatTaken } from './registry.js';
import { PHONES } from '../map/layout.js';

// 부스 기준 좌표(미터) → 세계. 열린 쪽이 +z
const at = (b, lx, lz) => { const c = Math.cos(b.rot), s = Math.sin(b.rot); return {x:b.x + (lx * c + lz * s) * UNIT, z:b.z + (-lx * s + lz * c) * UNIT}; };
const inside = b => at(b, 0, -.08), front = b => at(b, 0, .95);

// ── 소리 ──
let ctx = null;
const ac = () => { if (!audio.on) return null; try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); return ctx; } catch (e) { return null; } };
// 두 음을 섞어 dur초 울린다. trill이면 그 빠르기(Hz)로 소리를 끊었다 이었다 한다
function tone(fs, dur, {trill = 0, vol = .05} = {}){
  const a = ac(); if (!a) return;
  const t = a.currentTime, g = a.createGain(); g.gain.setValueAtTime(0, t); g.connect(a.destination);
  if (trill) { const n = Math.floor(dur * trill); for (let i = 0; i < n; i++) { const t0 = t + i / trill; g.gain.setValueAtTime(vol, t0); g.gain.setValueAtTime(0, t0 + .55 / trill); } }
  else { g.gain.linearRampToValueAtTime(vol, t + .02); g.gain.setValueAtTime(vol, t + dur - .03); g.gain.linearRampToValueAtTime(0, t + dur); }
  fs.forEach(f => { const o = a.createOscillator(); o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + dur + .05); });
}
const DTMF = [[697, 1209], [697, 1336], [770, 1209], [770, 1477], [852, 1336], [941, 1336], [697, 1477], [852, 1209]];
const click = () => sfx(1400, 500, .05, 'square', .05);

// ── 대사 (엄마 한마디 → 내 대답) ──
const TALKS = [
  ['어디니? 밥은 먹었고?', '응, 친구들이랑 놀다가 금방 갈게!'],
  ['눈 오는데 장갑은 꼈니?', '응, 끼고 있어. 하나도 안 추워!'],
  ['저녁 다 됐다, 얼른 들어와라.', '알았어, 지금 바로 갈게!'],
  ['또 동전 없어서 수신자 부담으로 걸었지?', '헤헤… 미안, 엄마!'],
  ['오는 길에 두부 한 모만 사 올래?', '응! 슈퍼 들렀다 갈게.'],
  ['썰매 타다 옷 다 젖은 거 아니지?', '아니야~ 조금만 젖었어!'],
];
const BYES = ['그래, 조심히 와~', '길 미끄러우니까 뛰지 말고!', '늦지 마라~'];

// 대본: [시각(초), 할 일]. say(누가, 말)는 아래 자막 칸에 보인다
function script(talk, bye){
  return [
    [0, g => { click(); say(g, '', '수화기를 들었어요'); }],
    [.4, g => { tone([350, 440], 1.0); say(g, '', '뚜---'); }],
    ...[0, 1, 2, 3, 4, 5, 6].map(i => [1.6 + i * .16, g => { tone(DTMF[(i * 3 + g.seed) % DTMF.length], .1, {vol:.04}); if (!i) say(g, '', '삑 삑 삑…  집 번호를 눌러요'); }]),
    [2.9, g => { tone([440, 480], 1.0, {trill:16}); say(g, '', '뚜루루루…'); }],
    [4.9, g => { tone([440, 480], 1.0, {trill:16}); say(g, '', '뚜루루루… 뚜루루루…'); }],
    [6.8, g => say(g, '안내', '수신자 부담 전화입니다. 삐 소리가 나면 이름을 말씀해 주세요.')],
    [9.4, g => tone([1000], .35, {vol:.05})],
    [9.9, g => say(g, '나', '엄마, 나야!')],
    [11.6, g => say(g, '안내', '상대방이 받을 때까지 잠시만 기다려 주세요.')],
    [13.4, g => { tone([440, 480], .8, {trill:16}); }],
    [14.5, g => { click(); say(g, '엄마', talk[0]); }],
    [17.3, g => say(g, '나', talk[1])],
    [19.8, g => say(g, '엄마', bye)],
    [22.0, g => { click(); tone([480, 620], .25, {vol:.04}); say(g, '', '뚝. 통화가 끝났어요'); }],
    [23.4, () => stopActivity()],
  ];
}
function say(g, who, text){ hud.gauge(who ? who + ': ' + text : text, false); if (who) hud.stat(who === '나' ? '내가 말하는 중' : who === '엄마' ? '엄마와 통화 중' : '안내 음성'); }

const phone = defineActivity({
  id:'phone', st:ST.PHONE,
  offer(offer){
    PHONES.forEach((b, i) => { const f = front(b), d = Math.hypot(me.x - f.x, me.z - f.z), p = inside(b);
      if (d < 1.8 && !seatTaken(p.x, p.z, ST.PHONE)) offer(d, 1.8, '공중전화 걸기', () => phone.start(i)); });
  },
  start(i){
    const b = PHONES[i], p = inside(b), t = TALKS[Math.floor(Math.random() * TALKS.length)], seed = Math.floor(Math.random() * 8);
    begin(phone, {i, t0:performance.now(), k:0, seed, steps:script(t, BYES[seed % BYES.length])});
    me.x = p.x; me.z = p.z; me.r = b.rot + Math.PI; me.y = undefined;
    hud.showGame('공중전화 · 엄마에게 콜렉트콜'); hud.zone(0, 0); hud.progress(0);
  },
  update(){ const b = PHONES[S.game.i], p = inside(b); me.x = p.x; me.z = p.z; me.r = b.rot + Math.PI; return 0; },
  prompt(){ return {label:'끊기', run:() => { click(); stopActivity(); }}; },
  quit(){ const b = PHONES[S.game.i], f = front(b); me.x = f.x; me.z = f.z; me.r = b.rot; me.y = undefined; },
  frame(){
    const g = S.game;
    if (S.mode === 'phone' && g) {
      const e = (performance.now() - g.t0) / 1000, steps = g.steps;
      while (g.k < steps.length && steps[g.k][0] <= e) { steps[g.k][1](g); if (S.mode !== 'phone') return; g.k++; }
      hud.progress(e / 23.4);
      ear(me.char);
    }
  },
  remoteFrame(R){
    if (!R.char) return;
    const on = R.st === ST.PHONE;
    if (on && (!R.callTag || R.callTag.parent !== R.char)) { R.callTag = pillSprite('통화 중…', 'rgba(255,255,255,.9)', '#2b3f55', .45); R.callTag.position.y = 3.2; R.char.add(R.callTag); }
    if (R.callTag) R.callTag.visible = on;
    if (on) ear(R.char);
  },
});
// 수화기를 귀에 댄 오른팔
function ear(ch){ if (!ch) return; const u = ch.userData; u.armR.rotation.x = -2.4; u.armR.rotation.z = .75; }
