// 배경음악 (2026-11-26): 8비트풍, 코드로 작곡 · 합성한다 (음원 파일 없음, 몇 KB).
//   곡 둘 (2026-11-27) — main: 시작 화면 + 동네(공원 · 아파트 · 상가 · 학교 앞). 새로 지은 '갈대피리의 춤' 느낌, 세모파 한 줄 + 퉁기는 베이스.
//            station: 역 · 강가 (둘 다 쉬는 곳이라 같은 곡). 파헬벨 캐논(저작권 없음) — 한 줄로 시작해 돌림노래로 세 겹 쌓였다가 다시 한 줄.
//   곡마다 악기 소리를 다르게 한다(사용자). 예전 town · calm · 비발디 · 작은별은 뺐다 (후보는 dev/의 *-samples.js · main-compose.js).
//   있는 곳(z)으로 곡을 고른다: 북쪽 도로(NROAD) 위 · 강변도로(ROAD) 아래는 station, 그 사이는 main. 2초 넘게 머물면 3초에 걸쳐 바꿔 튼다.
//   시작 화면에서는 main을 처음 누르는 순간 튼다(브라우저는 누르기 전에는 소리를 막는다). '동네로 들어가기'를 누르면 줄이고 종소리 뒤 다시 처음부터.
//   크기는 메뉴 설정 '배경음'(wt.bgm). 곡은 모두 이 파일에서 지은 것.
//
// 악보: 8분음표 한 칸, 한 마디 8칸 (곡의 div가 16이면 16분음표 한 칸, 한 마디 16칸). 'E5' 음, '.' 쉼, '-' 앞 음 늘이기. 화음은 마디마다 (반 마디씩이면 'Dm G').
import { audioCtx } from './fx.js';
import { S } from './state.js';
import { NROAD, ROAD } from '../map/layout.js';

// 캐논 선율 조각 (원곡 파헬벨, 저작권 없음): 역 곡이 이어 붙여 쓴다. _ 는 쉼 4마디
const CANON = {
  A:'E5 - - - D5 - - - | C5 - - - B4 - - - | A4 - - - G4 - - - | A4 - - - B4 - - -',
  R:'C5 - - - G4 - - - | A4 - - - E4 - - - | F4 - - - C4 - - - | F4 - - - G4 - - -',
  B:'C5 - - - B4 - - - | A4 - - - G4 - - - | F4 - - - E4 - - - | F4 - - - D4 - - -',
  C:'C5 - E5 - G5 - F5 - | E5 - C5 - E5 - D5 - | C5 - A4 - C5 - G4 - | F4 - A4 - G4 - F4 -',
  _:'. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . .',
};
const seq = k => k.split('').map(c => CANON[c]).join(' | ');
const SONGS = {
  // (2026-11-27) 메인: 시작 화면 + 동네(공원 · 아파트 · 상가 · 학교 앞). 새로 지은 곡 — '갈대피리의 춤' 같은 느낌(라장조, 톡톡 끊는 피리 + 4분음표 퉁기는 베이스),
  //   멜로디는 새로 지음. 놀이에 신경 쓰이지 않게 음역 A4~A5, 큰 도약 · 클라이맥스 없음, 8마디마다 쉼. 세모파 한 줄, 60bpm, 16마디 64초.
  //   사용자가 후보 둘 중 2번('더 조용히')을 골랐다. 다른 곡보다 2dB쯤 작게(vol). 후보 · 3도 화음판은 dev/main-compose.js
  //   (예전 동네 곡 town과 시작 화면 비발디 '겨울' 2악장은 뺐다. 예전 동네 곡 멜로디는 dev/main-samples.js에 남아 있다)
  main: {
    bpm:60, div:16, vol:1.5,
    lead:{wave:'triangle', gain:.075, att:.01, sus:.45, dec:.18, rel:.16},
    arp:{gain:.04, oct:3, tones:[0, 2], every:4, att:.003, sus:.08, dec:.12, rel:.1},   // 퉁기는 베이스: 4분음표마다 밑음 · 5도
    echo:{time:.4, fb:.18, wet:.15},
    chords:'D | A7 D | G D | A | D | A7 D | G A | D | G | D | Em A | D | G | D Bm | Em A7 | D',
    melody:`A4 . D5 . F#5 . E5 D5 E5 . F#5 . D5 - . . | C#5 . E5 . G5 . F#5 E5 F#5 . E5 . D5 - . . | B4 . D5 . G5 . F#5 E5 F#5 . A5 . F#5 - . . | E5 . C#5 . A4 . B4 C#5 E5 - - - . . . . |
             A4 . D5 . F#5 . E5 D5 E5 . F#5 . A5 - . . | G5 . E5 . C#5 . D5 E5 F#5 . E5 . D5 - . . | B4 . D5 . G5 . F#5 E5 E5 . C#5 . A4 . C#5 . | D5 - - - . . . . . . . . . . . . |
             B4 - - - D5 - - - G5 - - - F#5 - E5 - | F#5 - - - A4 - - - D5 - - - . . . . | G5 - - - E5 - B4 - C#5 - - - E5 - - - | D5 - - - F#5 - - - A5 - - - . . . . |
             G5 . D5 . B4 . D5 . G5 . F#5 . E5 . D5 . | F#5 . D5 . A4 . D5 . F#5 . D5 . B4 . D5 . | G5 . E5 . B4 . E5 . E5 . C#5 . A4 . G5 . | F#5 - - - D5 - - - . . . . . . . . |`,
  },
  // (2026-11-27) 역: calm 후보 11번(6번 + 9번)으로 확정 (사용자). 다장조 캐논 진행 24마디 93초 — 한 줄(원곡 첫 선율 → 화음 밑음 선율)
  //   → 둘째 · 셋째 목소리가 한 바퀴씩 늦게 들어와 세 겹 → 끝 4마디 다시 한 줄. 소리: 톡 퉁기는 세모파(실로폰 느낌). 후보 전체는 dev/canon-samples.js
  station: {
    bpm:62, vol:1.29, lead:{wave:'triangle', gain:.075, att:.005, sus:.15, dec:.35, rel:.35},
    voices:[{gain:.55, melody:seq('__ABC_')}, {gain:.4, melody:seq('___AB_')}],
    bass:{gain:.06, oct:2, pat:'whole', att:.04, sus:.55, dec:.9, rel:.5}, arp:{gain:.016, oct:3, tones:[0, 2], every:4, att:.05, sus:.5, dec:1, rel:.6}, echo:{time:.45, fb:.22, wet:.22},
    chords:Array(6).fill('C G | Am Em | F C | F G').join(' | '), melody:seq('ARBCAB'),
  },
};

const PC = {C:0, D:2, E:4, F:5, G:7, A:9, B:11};
const midi = n => { const m = /^([A-G])([#b]?)(\d)$/.exec(n); return PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12; };
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
// 악보 → [{t:칸, d:길이(칸), m:음}]
function parse(str){
  const out = []; let last = null;
  str.replace(/\|/g, ' ').trim().split(/\s+/).forEach((tok, i) => {
    if (tok === '-') { if (last) last.d++; }
    else if (tok === '.') last = null;
    else { last = {t:i, d:1, m:midi(tok)}; out.push(last); }
  });
  return out;
}
// 화음 → 마디마다 [{t, d, root(음 높이 0~11), minor}]
// (2026-11-27) 화음 이름 확장: 종류(m · 7 · maj7 · m7 · add9 · sus4 · sus2 · dim)와 자리바꿈 베이스('G/B')
const QUAL = {'':[0, 4, 7], m:[0, 3, 7], '7':[0, 4, 7, 10], maj7:[0, 4, 7, 11], m7:[0, 3, 7, 10], add9:[0, 4, 7, 14], sus4:[0, 5, 7], sus2:[0, 2, 7], dim:[0, 3, 6]};
const pcOf = (L, a) => PC[L] + (a === '#' ? 1 : a === 'b' ? -1 : 0);
function chordList(str, D = 8){
  const out = []; if (!str) return out;
  str.split('|').forEach((bar, b) => { const cs = bar.trim().split(/\s+/), d = D / cs.length;
    cs.forEach((c, i) => { const m = /^([A-G])([#b]?)([^/]*)(?:\/([A-G])([#b]?))?$/.exec(c), root = pcOf(m[1], m[2]), iv = QUAL[m[3]] || QUAL[''];
      out.push({t:b * D + i * d, d, root, bass:m[4] ? pcOf(m[4], m[5]) : root, iv, minor:iv[1] === 3}); }); });
  return out;
}
// 곡을 칸별 사건 목록으로 미리 펼친다
function build(song){
  const D = song.div || 8, lead = parse(song.melody), ch = chordList(song.chords, D), parts = (song.parts || []).map(p => parse(p.notes));   // (2026-11-27) div: 한 마디 칸 수 (16이면 16분음표 한 칸)
  const len = s => s.replace(/\|/g, ' ').trim().split(/\s+/).length, steps = ch.length ? ch[ch.length - 1].t + ch[ch.length - 1].d : len(song.melody), ev = Array.from({length:steps}, () => []);
  lead.forEach(n => ev[n.t].push({k:'lead', m:n.m, d:n.d}));
  // 돌림노래(rounds): 멜로디를 몇 마디 늦게, 작게(gain), 옥타브(oct) 바꿔 한 번 더 — 캐논처럼 겹친다
  (song.rounds || []).forEach(r => lead.forEach(n => ev[(n.t + r.delay * D) % steps].push({k:'round', m:n.m + 12 * (r.oct || 0), d:n.d, g:r.gain})));
  // (2026-11-27) 따로 적은 목소리(voices): 멜로디와 같은 길이의 악보를 작게 더 — 쉬다가 들어오는 돌림노래처럼 겹침을 마음대로 짠다
  (song.voices || []).forEach(v => parse(v.melody).forEach(n => ev[n.t].push({k:'round', m:n.m, d:n.d, g:v.gain})));
  // (2026-11-27) parts: 자기 소리(tone)를 가진 줄 — 원곡 파트(반주 · 베이스)를 그대로 옮길 때. gate: 음 길이 중 소리 내는 몫
  parts.forEach((p, i) => p.forEach(n => ev[n.t].push({k:'part', m:n.m, d:n.d, p:i})));
  let prevBass = null;
  if (song.bass) ch.forEach(c => {
    let base = 12 * (song.bass.oct + 1) + (song.bass.near ? c.bass : c.root);
    if (song.bass.near && prevBass !== null) while (Math.abs(base - 12 - prevBass) < Math.abs(base - prevBass)) base -= 12;   // near: 앞 베이스와 가까운 옥타브로 (내려가는 베이스 줄)
    if (song.bass.near && prevBass !== null) while (Math.abs(base + 12 - prevBass) < Math.abs(base - prevBass)) base += 12;
    prevBass = base;
    if (song.bass.pat === 'whole') ev[c.t].push({k:'bass', m:base, d:c.d});
    else { const h = c.d / 2; ev[c.t].push({k:'bass', m:base, d:h}); ev[c.t + h].push({k:'bass', m:base + 7, d:h}); }   // 반 마디씩 밑음 → 5도
    if (song.arp && song.arp.tones) { const r = 12 * (song.arp.oct + 1) + c.root, n = c.iv.length, ev2 = song.arp.every || 1;   // tones: 화음 구성음 번호(0 밑음, 1, 2, 3 …, n 넘으면 한 옥타브 위)
      for (let i = 0; i < c.d; i += ev2) { const k = song.arp.tones[(i / ev2) % song.arp.tones.length]; ev[c.t + i].push({k:'arp', m:r + c.iv[k % n] + 12 * Math.floor(k / n), d:ev2}); } }
    else if (song.arp) { const T = c.minor ? 3 : 4, deg = {1:0, 3:T, 5:7, 8:12, 10:12 + T, 12:19}, pat = (song.arp.pat || [1, 5, 8, 5, 10, 5, 8, 5]).map(d => deg[d]), r = 12 * (song.arp.oct + 1) + c.root;
      const ev2 = song.arp.every || 1; for (let i = 0; i < c.d; i += ev2) ev[c.t + i].push({k:'arp', m:r + pat[(i / ev2) % pat.length], d:ev2}); }   // every: 몇 칸마다 (2 = 4분음표)   // 펼친 화음: 1 밑음 · 3 3도 · 5 5도 · 8 옥타브 · 10 위 3도
  });
  if (song.hat) for (let t = D / 4; t < steps; t += D / 2) ev[t].push({k:'hat'});   // 2 · 4박에 아주 작게
  return {song, ev, steps, sd:60 / song.bpm * 4 / D};
}
const BUILT = Object.fromEntries(Object.entries(SONGS).map(([k, s]) => [k, build(s)]));

// ── 소리 만들기 ──
const waves = new WeakMap(), noises = new WeakMap();
function pulse(ctx, duty){   // 펄스파 (8비트 네모파의 폭): 푸리에 급수로 만든다
  let m = waves.get(ctx); if (!m) waves.set(ctx, m = {});
  if (!m[duty]) { const N = 24, re = new Float32Array(N + 1), im = new Float32Array(N + 1);
    for (let n = 1; n <= N; n++) { re[n] = Math.sin(2 * Math.PI * n * duty) / (n * Math.PI); im[n] = (1 - Math.cos(2 * Math.PI * n * duty)) / (n * Math.PI); }
    m[duty] = ctx.createPeriodicWave(re, im); }
  return m[duty];
}
function noise(ctx){ let b = noises.get(ctx); if (!b) { b = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noises.set(ctx, b); } return b; }
// 소리 모양: 빠르게 올라가 sus(꼭대기 대비)까지 dec초에 걸쳐 내려가고, 음이 끝나면 rel초 꼬리. town은 기본값(유지형), calm은 퉁기는 모양
function tone(ctx, out, {wave, gain, cut, att = .01, sus = .62, dec = 0, rel = .09, bell, vib}, f, t, dur){
  const o = ctx.createOscillator(), g = ctx.createGain();
  if (typeof wave === 'number') o.setPeriodicWave(pulse(ctx, wave)); else o.type = wave;
  o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + att); g.gain.setTargetAtTime(gain * sus, t + att, dec || Math.max(.05, dur * .35)); g.gain.setTargetAtTime(0, t + dur, rel / 3);
  let n = o; if (cut) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cut; o.connect(fl); n = fl; }
  n.connect(g); g.connect(out); o.start(t); o.stop(t + dur + rel * 2);
  if (vib && dur > vib.delay + .1) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = vib.rate;   // 떨림(비브라토): 긴 음만, 조금 있다가 서서히
    lg.gain.setValueAtTime(0, t + vib.delay); lg.gain.linearRampToValueAtTime(f * vib.depth, t + vib.delay + .25); l.connect(lg); lg.connect(o.frequency); l.start(t + vib.delay); l.stop(t + dur + rel * 2); }
  if (bell) { const o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.type = 'sine'; o2.frequency.setValueAtTime(f * bell.ratio, t);   // 오르골 · 종: 높은 배음이 먼저 사라진다
    g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(gain * bell.amt, t + .005); g2.gain.setTargetAtTime(0, t + .005, bell.dec); o2.connect(g2); g2.connect(out); o2.start(t); o2.stop(t + .005 + bell.dec * 7); }
}
function hat(ctx, out, gain, t){
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise(ctx); f.type = 'highpass'; f.frequency.value = 7000;
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0001, t + .045); s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * .4); s.stop(t + .06);
}
// 곡 하나를 트는 것: 자기 소리 크기(바꿔 틀 때 오르내림)와 메아리를 가진다
function player(ctx, out, name){
  const B = typeof name === 'string' ? BUILT[name] : name, s = B.song, g = ctx.createGain(); g.gain.value = 0; g.connect(out);
  let dry = g;
  if (s.echo) { const d = ctx.createDelay(2), fb = ctx.createGain(), wet = ctx.createGain(); d.delayTime.value = s.echo.time; fb.gain.value = s.echo.fb; wet.gain.value = s.echo.wet;
    const bus = ctx.createGain(); bus.connect(g); bus.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(g); dry = bus; }
  const P = {name, g, step:0, next:0, on:false, lvl:s.vol || 1};   // lvl: 곡마다 평균 크기를 맞추는 배율 (song.vol)
  P.start = t => { P.step = 0; P.next = t; P.on = true; };
  P.schedule = until => {
    while (P.on && P.next < until) {
      for (const e of B.ev[P.step]) {
        if (e.k === 'hat') hat(ctx, dry, s.hat, P.next);
        else if (e.k === 'part') { const p = s.parts[e.p]; tone(ctx, dry, p.tone, hz(e.m), P.next, e.d * B.sd * (p.gate || .92)); }
        else { const v = e.k === 'lead' ? s.lead : e.k === 'round' ? {...s.lead, gain:s.lead.gain * e.g} : {wave:'triangle', ...(e.k === 'arp' ? s.arp : s.bass)};
          tone(ctx, dry, v, hz(e.m), P.next, e.d * B.sd * (e.k === 'lead' || e.k === 'round' ? .92 : .96)); }
      }
      P.step = (P.step + 1) % B.steps; P.next += B.sd;
    }
  };
  return P;
}

// ── 게임에서 트는 것 ──
export const BGM = {vol:.5};   // 메뉴 설정 '배경음' (0~1)
const zoneOf = z => z < NROAD.z0 || z > ROAD.z1 ? 'station' : 'main';   // 역(북쪽 도로 위) · 강(강변도로 아래)은 같은 곡(사용자 2026-11-27: 둘 다 쉬는 곳), 그 사이 동네
let ctx = null, master = null, players = {}, cur = null, want = null, wantAt = 0, timer = 0, mode = 'off';   // mode: off → intro(시작 화면 곡) → enter(종소리) → game(동네 곡)
// 곡들의 평균 크기는 같다(-28dB, 오프라인 녹음으로 재서 song.vol로 맞춤). 1.4배로 올리고, 순간 튀는 소리는 압축기로 눌러 효과음보다 크게 튀지 않게 한다
function setMaster(){ if (master) master.gain.setTargetAtTime(BGM.vol * 1.4, ctx.currentTime, .08); }
export function setBgmVolume(v){ BGM.vol = v; setMaster(); }
function swap(name){
  const t = ctx.currentTime + .05;
  if (cur) { const old = players[cur]; old.g.gain.cancelScheduledValues(t); old.g.gain.setValueAtTime(old.g.gain.value, t); old.g.gain.linearRampToValueAtTime(0, t + 3);
    setTimeout(() => { if (cur !== old.name) old.on = false; }, 3300); }
  const p = players[name]; if (!p.on) p.start(t);
  p.g.gain.cancelScheduledValues(t); p.g.gain.setValueAtTime(p.g.gain.value, t); p.g.gain.linearRampToValueAtTime(p.lvl, t + (cur ? 3 : 1.5)); cur = name;
}
// 곡 하나를 sec초에 걸쳐 끈다 (시작 화면 곡 → 종소리)
function fadeOut(sec){
  if (!cur) return; const t = ctx.currentTime + .05, old = players[cur]; cur = null;
  old.g.gain.cancelScheduledValues(t); old.g.gain.setValueAtTime(old.g.gain.value, t); old.g.gain.linearRampToValueAtTime(0, t + sec);
  setTimeout(() => { if (cur !== old.name) old.on = false; }, sec * 1000 + 300);
}
function tick(){
  if (!ctx || ctx.state !== 'running') return;
  if (mode === 'game') { const me = S.me, z = zoneOf(me ? me.z : 150), now = performance.now();
    if (z !== cur) { if (want !== z) { want = z; wantAt = now; } else if (now - wantAt > 2000) swap(z); } else want = null; }
  for (const k in players) players[k].schedule(ctx.currentTime + .3);
}
// 소리판 준비: 처음 한 번 (브라우저는 사용자가 누르기 전에는 소리를 막으므로, 누르는 순간에 부른다)
function ensure(){
  if (ctx) { try { if (ctx.state === 'suspended' && !document.hidden) ctx.resume(); } catch (e) {} return true; }
  ctx = audioCtx(); if (!ctx) return false;
  try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) {}
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = .005; comp.release.value = .2; comp.connect(ctx.destination);
  master = ctx.createGain(); master.gain.value = 0; master.connect(comp); setMaster();
  players = Object.fromEntries(Object.keys(SONGS).map(k => [k, player(ctx, master, k)]));
  timer = setInterval(tick, 60);
  document.addEventListener('visibilitychange', () => { try { if (document.hidden) ctx.suspend(); else ctx.resume(); } catch (e) {} });
  return true;
}
// (2026-11-27) 시작 화면: 처음 누르는 순간(다시 뽑기 · 화면 · 키) 메인 곡을 튼다 (main.js가 부른다)
export function playIntroMusic(){ if (!ensure() || mode !== 'off') return; mode = 'intro'; swap('main'); tick(); }
// '동네로 들어가기'에서 부른다: 시작 화면 곡은 1.5초에 걸쳐 끄고(종소리), 동네 곡은 delay 뒤에
export function startMusic(delay = 0){
  if (mode === 'enter' || mode === 'game' || !ensure()) return;
  mode = 'enter'; fadeOut(1.5);
  setTimeout(() => { mode = 'game'; swap(zoneOf(S.me ? S.me.z : 150)); tick(); }, delay);
}
export const musicState = () => ({cur, want, mode, running:!!ctx && ctx.state === 'running'});   // 개발용 (확인 스크립트)
// 개발용: 곡을 오프라인으로 녹음한다 (미리 듣기 파일 만들기). 실제 게임에서는 쓰지 않는다
export async function renderSong(name, seconds, rate = 44100){
  const oc = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate), out = oc.createGain(); out.gain.value = .9; out.connect(oc.destination);
  const p = player(oc, out, typeof name === 'string' ? name : build(name)); p.g.gain.value = p.lvl; p.start(0); p.schedule(seconds); return oc.startRendering();
}
// 개발용: 곡 정의(SONGS와 같은 모양)를 바로 녹음 (dev/canon-samples.js 같은 후보 비교). 한 바퀴 길이(초)도 돌려준다
export const SONG_DEFS = SONGS;   // 개발용: 파트별로 따로 녹음해 크기를 비교할 때
export const loopSeconds = def => { const B = build(def); return B.steps * B.sd; };
