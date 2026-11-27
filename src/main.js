// 진입점: 맵 → 놀이 → 반복 소품 → 캐릭터 → 네트워크 순서로 준비하고 메인 루프를 돌린다.
import { updateAlt } from './ui/alt.js';
import { onFrame, start, shadowRange, canvas, renderer, scene, camera } from './core/engine.js';
import { introPlace } from './core/camera.js';
import { getProp, usedProps, propNames } from './props/registry.js';
import { S, setMode } from './core/state.js';
import { PI, rnd } from './core/util.js';
import { audio, sfx, flash, updateFx, after } from './core/fx.js';
import { updateCamera, camLook } from './core/camera.js';
import { initInput, turnCamera, freeMove } from './core/input.js';
import { coarse, reduceMotion, COLORS, ADJ, NOUN, FONTS_TO_LOAD, NET } from './config.js';
import './props/basic.js';
import './props/parkBench.js';
import './props/snowmanCoop.js';
import './props/kite.js';
import './props/parkFountain.js';
import './props/goguma.js';
import './props/twinbar.js';
import './props/aptTower.js';
import './props/cars.js';
import './props/aptSite.js';
import './props/aptYard.js';
import './props/aptCenter.js';
import './props/shops.js';
import './props/bus.js';
import './props/railway.js';
import './props/street.js';
import './props/stationery.js';
import './props/shopTowers.js';
import './props/bigShops.js';
import './props/smallGoods.js';
import './props/aptBike.js';
import './props/utilityPole.js';
import './props/aptStreet.js';
import { W } from './world/world.js';
const FAR = {snowDrift:110, grassTuft:90, reedClump:150, tactileStrip:90, wheelStop:90, laneDelineator:120, noParkingSign:100, foodWasteBin:100, shrubBall:150, shrubCluster:150,
  planterIsland:150, hedgeRow:180, parkLamp:220, roadFence:200, railFence:160, bench:150, bikeShelter:170, barricade:160, carSedan:220, carSUV:220, carMini:220, truck1t:220, deliveryVan:220,
  bareTree:330, pineTree:330, signFascia:160, signVertical:160};
Object.entries(FAR).forEach(([n, f]) => { const d = getProp(n); if (d) d.far = f; });
import { finalizeBatches, spotLabels } from './world/builders.js';
import { batchStatic } from './world/batch.js';
import { texCacheDone } from './core/texkit.js';
import { tagPrims } from './core/gfx.js';
import { QUALITY } from './core/quality.js';
import { buildMap } from './map/index.js';
import { SPAWN } from './map/layout.js';
import { ACTS, current, findAction, stopActivity } from './activities/index.js';
import { me, dressMe, nameMe, movePlayer, wave, nameOf } from './entities/player.js';
import { rerollAnim, finishRoll } from './ui/intro.js';
import { placeChar, emote, SIT } from './entities/character.js';
import { initFootprints, trackPrints, agePrints } from './entities/footprints.js';
import { applyPeers, updateRemotes } from './entities/remotes.js';
import { setupVehicles, updateVehicles } from './entities/vehicles.js';
import { connect, netTick, net } from './net/index.js';
import { statsFrame, statHello, statReady, statEnter } from './net/stats.js';   // (2026-11-27) 익명 운영 통계
import { hud } from './ui/hud.js';
import { drawMiniBase, drawMini, miniEvery, toggleBigMap, bigOpen } from './ui/minimap.js';
import { initMenu, openMenu, closeMenu, menuOpen, menuTab } from './ui/menu.js';
import { initSnow, updateSnow } from './world/snowfall.js';
import { saverFrame } from './core/saver.js';
import { startMusic, playIntroMusic } from './core/music.js';
import { initLinks } from './ui/links.js';

const $ = id => document.getElementById(id);

function updateCount(){
  $('count').textContent = S.remotes.size + 1;
  $('net').textContent = net.online ? (S.remotes.size ? '동네 서버에 연결됨 · 함께 걷는 중' : '동네 서버에 연결됨') : '연결 안 됨 · 혼자 걷는 중';
  $('net-dot').classList.toggle('on', !!net.online);
  $('srv-addr').textContent = net.kind === 'room' ? '아티팩트 공유 방' : net.kind === 'websocket' ? NET.url : '찾는 중…';
  if (menuOpen() && menuTab() === 'server') fillRoster();   // (2026-11-24) 접속자 · 점수표는 메뉴의 서버 탭에
  // (2026-11-26) 시작 화면: 지금 동네에 몇 명 있는지 (연결됐을 때만)
  const on = $('intro-online'); on.hidden = !net.online || S.mode !== 'intro';
  if (!on.hidden) on.innerHTML = '<i></i>' + (S.remotes.size ? '지금 ' + S.remotes.size + '명이 동네에서 놀고 있어요' : '지금 동네는 조용해요');
}
function fillRoster(){
  const scored = ACTS.filter(a => a.score).sort((a, b) => a.score.index - b.score.index);
  $('roster-head').innerHTML = '<th>이름</th>' + scored.map(a => '<th>' + a.score.label + '</th>').join('');
  const rows = [{name:nameOf(me.a, me.n) + ' (나)', c:COLORS[me.ci].css, sc:me.sc}];
  S.remotes.forEach(R => rows.push({name:nameOf(R.a, R.n), c:COLORS[Math.max(0, R.ci)].css, sc:R.sc}));
  const tb = $('roster-body'); tb.textContent = '';
  rows.forEach(r => { const tr = document.createElement('tr'), td = document.createElement('td'), dot = document.createElement('i');
    dot.style.background = r.c; td.append(dot, r.name); tr.append(td);
    scored.forEach(a => { const v = r.sc[a.score.index], c = document.createElement('td'); c.textContent = v ? v + a.score.unit : '-'; tr.append(c); });
    tb.append(tr); });
}
function enter(){
  if (S.mode !== 'intro' || !ready) return;   // (2026-11-26) 첫 화면이 그려지기 전 Enter는 받지 않는다
  finishRoll();   // 이름이 도는 중이면 바로 멈춘다
  statEnter();
  // (2026-11-20 2차) 학교 정문 앞에서 시작: 방학식이 막 끝나 교문을 나선 순간. 종이 울리고, 서쪽(동네)을 본다
  // (2026-11-26) 자리는 시작 화면에서 이미 잡았다(boot). 카메라는 캐릭터 앞에서 둥글게 돌아 등 뒤로 간다 (camera.js arc)
  setMode('walk'); me.r = SPAWN.r; S.cam.yaw = SPAWN.r + PI; S.cam.pitch = .32; S.cam.arc = performance.now();
  startMusic(4300);   // (2026-11-26) 배경음악 (core/music.js): 종소리(약 4초)가 끝나면 시작
  [[659, 0], [523, .45], [587, .9], [392, 1.35], [392, 2.1], [587, 2.55], [659, 3.0], [523, 3.45]].forEach(([f, t]) => after(t * 1000, () => sfx(f, f * .998, .5, 'sine', .06)));   // 딩동댕동 · 댕동딩동
  after(600, () => flash('이야~ 방학이야~~'));   // (2026-11-26) 시작 메시지 (예전 '겨울방학 시작! / 동네로 놀러 가자' → '얘들아~ 놀자~!'). 종소리는 그대로
  shadowRange(75);
  $('intro').hidden = true; $('veil').hidden = true; ['top','mini','dock'].forEach(id => $(id).hidden = false); canvas.focus();
  if (coarse) after(3400, () => flash('왼쪽을 끌어 이동'));
}
function doWave(){ if (wave()) { emote(me.char, 1); sfx(620, 760, .1); } }
// (2026-11-27) 시작 화면 음악: 처음 누르는 순간 튼다. 휴대폰은 손을 뗄 때(pointerup · touchend)여야 소리가 열린다
const GESTURE = ['pointerdown', 'pointerup', 'touchend', 'keydown'];
function introMusic(){ if (S.mode === 'intro') playIntroMusic(); else GESTURE.forEach(ev => removeEventListener(ev, introMusic, true)); }
function bindUi(){
  $('enter').onclick = enter;
  GESTURE.forEach(ev => addEventListener(ev, introMusic, true));
  initMenu({onOpen:t => { if (t === 'server') { updateCount(); fillRoster(); } }});   // (2026-11-24) 메뉴: 서버 · 설정 · 조작법 (ui/menu.js)
  $('res-close').onclick = () => { $('result').hidden = true; };
  $('res-again').onclick = () => { $('result').hidden = true; if (S.mode === 'walk' && hud.again) hud.again(); };
  $('game-quit').onclick = stopActivity; hud.onTopQuit = stopActivity; $('slam').onclick = () => current() && current().onAction && current().onAction();
  $('prompt').onclick = () => { const a = findAction(); if (a) a.run(); };
  $('wave').onclick = doWave;
  // Esc 순서: 큰 지도 · 메뉴 닫기 → 결과 창 닫기 → 놀이 그만하기(input.js) → 메뉴 열기
  initInput({onEnter:enter, onWave:doWave, onMap:() => toggleBigMap(), onEscape:() => {
    if (bigOpen()) { toggleBigMap(false); return true; }
    if (menuOpen()) { closeMenu(); return true; }
    if (!$('result').hidden) { $('result').hidden = true; return true; }
    if (S.game) return false;
    openMenu(); return true; }});
}

let miniTick = 0;
function frame(dt, now){
  updateFx(dt, now);
  turnCamera(dt);
  const a = current();
  let moved = 0;
  if (a && a.update) moved = a.update(dt, now);
  else if (S.mode !== 'intro' && freeMove()) moved = movePlayer(dt, (a && a.speedMul) || 1);
  placeChar(me, me.char, dt, moved, now); if (S.mode !== 'intro' && moved > 0 && !SIT.has(me.st)) trackPrints(me, moved, now);   // (2026-11-26) 시작 화면에서도 서 있다
  updateRemotes(dt, now);
  for (const x of ACTS) if (x.frame) x.frame(dt, now, moved);
  updateVehicles(dt); W.updateAnimated(dt, now); agePrints(now);
  updateSnow(dt, now, camLook);
  const hide = !!(current() && current().hideLabels);
  spotLabels.forEach(s => { s.visible = !hide; });   // (2026-11-21) 장소 이름표는 위아래로 흔들지 않고 가만히 떠 있다
  const act = findAction(); hud.prompt(act ? act.label : '', act && act.tone); updateAlt();
  updateCamera(dt, now); netTick(now); saverFrame(now, moved);   // (2026-11-26) 절전: 가만히 있으면 더 아낀다
  if (S.mode !== 'intro' && ++miniTick % miniEvery() === 0) drawMini();
}

// (2026-11-26) 불러오기: 단계마다 index.html의 막대(__wtLoad)를 올리고 한 번 쉬어 그 사이에 화면이 그려지게 한다.
//   rAF만 기다리면 뒤에 숨은 탭에서 멈추므로 60ms 타이머와 먼저 오는 쪽을 쓴다.
const LOAD = window.__wtLoad || {set(){}, ready(){}, fail(){}};
const breathe = () => new Promise(r => { let d = false; const go = () => { if (!d) { d = true; setTimeout(r, 0); } }; requestAnimationFrame(go); setTimeout(go, 60); });
const step = async (p, text) => { LOAD.set(p, text); await breathe(); };
let ready = false;

async function boot(){
  // 이름은 바로 보이고, '다시 뽑기'도 불러오는 동안 된다 (옷은 캐릭터를 만든 뒤 바뀐다)
  nameMe(); initLinks();   // (2026-11-26) 의견 보내기 · 후원 링크 (config.js LINKS)
  $('reroll').onclick = () => rerollAnim(() => ready);   // 슬롯처럼 돌다 멈추는 연출 (ui/intro.js)
  await step(.36, '글꼴 준비 중');
  try { if (document.fonts && document.fonts.load) await Promise.race([Promise.all(FONTS_TO_LOAD.map(f => document.fonts.load(f, '겨울동화'))), new Promise(r => setTimeout(r, 1800))]); } catch (e) {}
  tagPrims(true); await buildMap((p, t) => step(.38 + p * .38, t)); tagPrims(false);
  await step(.77, '놀이 준비 중');
  ACTS.forEach(a => a.setup && a.setup());
  await step(.81, '차 · 버스 준비 중');
  setupVehicles();
  finalizeBatches();
  W.lodScale = QUALITY.lod; W.farScale = QUALITY.far;
  await step(.84, '소품 정리 중');
  { const t = performance.now(), r = batchStatic(); W.batchInfo = {...r, ms:Math.round(performance.now() - t)}; }
  W.shadowLods = W.lodShadows();   // (2026-11-27 최적화) LOD 소품 그림자는 단순 모델로 (world.js)   // (2026-11-24) 같은 소품 묶기 · 같은 재질 합치기 (world/batch.js)
  await step(.92, '눈 · 지도 준비 중');
  initFootprints(); initSnow();
  // (2026-11-26) 시작 화면: 학교 정문 앞(방학식 끝나고 나온 자리)에 내 캐릭터를 세우고 카메라가 앞에서 본다
  me.x = SPAWN.x + (Math.random() - .5) * 1.2; me.z = SPAWN.z + (Math.random() - .5) * SPAWN.w; me.r = SPAWN.r;
  dressMe(); drawMiniBase(); bindUi();
  shadowRange(75); introPlace();
  onFrame(frame);
  onFrame(() => W.cull(camera.position), 95);   // 거리 숨김 (카메라가 자리 잡은 뒤)
  // (2026-11-27) 성능 창(P)은 다 재서 빼기로 함 (사용자): 일반 화면에서는 아예 불러오지 않고, 주소에 ?debug가 있을 때만 (개발 · tools 측정용)
  if (location.search.includes('debug')) { const { initPerf } = await import('./ui/perf.js'); onFrame(initPerf(), 99); }
  onFrame(statsFrame, 97);   // (2026-11-27) 익명 통계: 놀이 시간 · 1분마다 FPS · 구역 (서버가 있을 때만 보냄)
  await step(.95, '그림 준비 중');
  // (2026-11-24) 셰이더 미리 짓기: 거리 숨김 · LOD로 가려진 칸까지 잠깐 보이게 하고 한 번에 컴파일한다 → 처음 가는 곳에서 끊기지 않게
  //   (2026-11-26) compileAsync: 브라우저가 셰이더를 나눠 지을 수 있으면(KHR_parallel_shader_compile) 그동안 화면이 굳지 않는다. 8초면 그냥 넘어간다
  try { W.cullers.forEach(c => { c.o.visible = true; if (c.lo) c.lo.visible = true; });
    if (renderer.compileAsync) await Promise.race([renderer.compileAsync(scene, camera), new Promise(r => setTimeout(r, 8000))]); else renderer.compile(scene, camera); } catch (e) {}
  // (2026-11-27 최적화) 텍스처 미리 올리기: 텍스처는 처음 보이는 순간 그래픽 메모리로 올라가서, 들어가며 카메라가 돌 때 멈칫했다 → 불러오는 중에 24장씩 나눠 올린다
  try { if (renderer.initTexture) { const set = new Set(); scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach(m => { for (const k in m) { const v = m[k]; if (v && v.isTexture) set.add(v); } }); });
    let i = 0; for (const t of set) { renderer.initTexture(t); if (++i % 24 === 0) await breathe(); } } } catch (e) {}
  start();
  if (location.search.includes('debug')) window.__town = {S, me, W, findAction, renderer, scene, camera, usedProps, propNames};   // 개발용: 콘솔에서 상태를 들여다본다
  // 첫 화면이 두 번 그려진 뒤 하늘 바탕(veil)을 걷고 단추를 연다
  await breathe(); await breathe();
  ready = true; window.__townReady = true; LOAD.set(1, ''); LOAD.ready(); after(2500, texCacheDone); statReady(); statHello(performance.now() / 1000);   // (2026-11-27) 배포판: 만든 텍스처를 브라우저에 보관 (core/texkit.js) $('veil').classList.add('gone'); after(1100, () => { $('veil').hidden = true; });
  after(500, () => emote(me.char, 1));   // 반갑게 손 흔들기
  connect({onPeers:list => { applyPeers(list); updateCount(); }, onStatus:updateCount});
}
boot().catch(e => { console.error(e); LOAD.fail('동네를 짓다가 문제가 생겼어요. 새로고침해 주세요.'); });
