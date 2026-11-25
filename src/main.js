// 진입점: 맵 → 놀이 → 반복 소품 → 캐릭터 → 네트워크 순서로 준비하고 메인 루프를 돌린다.
import { updateAlt } from './ui/alt.js';
import { onFrame, start, shadowRange, canvas, renderer, scene, camera } from './core/engine.js';
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
import { initPerf } from './ui/perf.js';
const FAR = {snowDrift:110, grassTuft:90, reedClump:150, tactileStrip:90, wheelStop:90, laneDelineator:120, noParkingSign:100, foodWasteBin:100, shrubBall:150, shrubCluster:150,
  planterIsland:150, hedgeRow:180, parkLamp:220, roadFence:200, railFence:160, bench:150, bikeShelter:170, barricade:160, carSedan:220, carSUV:220, carMini:220, truck1t:220, deliveryVan:220,
  bareTree:330, pineTree:330, signFascia:160, signVertical:160};
Object.entries(FAR).forEach(([n, f]) => { const d = getProp(n); if (d) d.far = f; });
import { finalizeBatches, spotLabels } from './world/builders.js';
import { batchStatic } from './world/batch.js';
import { tagPrims } from './core/gfx.js';
import { QUALITY } from './core/quality.js';
import { buildMap } from './map/index.js';
import { SPAWN } from './map/layout.js';
import { ACTS, current, findAction, stopActivity } from './activities/index.js';
import { me, dressMe, movePlayer, wave, nameOf } from './entities/player.js';
import { placeChar, emote, SIT } from './entities/character.js';
import { initFootprints, trackPrints, agePrints } from './entities/footprints.js';
import { applyPeers, updateRemotes } from './entities/remotes.js';
import { setupVehicles, updateVehicles } from './entities/vehicles.js';
import { connect, netTick, net } from './net/index.js';
import { hud } from './ui/hud.js';
import { drawMiniBase, drawMini, miniEvery, toggleBigMap, bigOpen } from './ui/minimap.js';
import { initMenu, openMenu, closeMenu, menuOpen, menuTab } from './ui/menu.js';
import { initSnow, updateSnow } from './world/snowfall.js';

const $ = id => document.getElementById(id);

function updateCount(){
  $('count').textContent = S.remotes.size + 1;
  $('net').textContent = net.online ? (S.remotes.size ? '동네 서버에 연결됨 · 함께 걷는 중' : '동네 서버에 연결됨') : '연결 안 됨 · 혼자 걷는 중';
  $('net-dot').classList.toggle('on', !!net.online);
  $('srv-addr').textContent = net.kind === 'room' ? '아티팩트 공유 방' : net.kind === 'websocket' ? NET.url : '찾는 중…';
  if (menuOpen() && menuTab() === 'server') fillRoster();   // (2026-11-24) 접속자 · 점수표는 메뉴의 서버 탭에
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
  if (S.mode !== 'intro') return;
  // (2026-11-20 2차) 학교 정문 앞에서 시작: 방학식이 막 끝나 교문을 나선 순간. 종이 울리고, 서쪽(동네)을 본다
  setMode('walk'); me.x = SPAWN.x + (Math.random() - .5) * 1.2; me.z = SPAWN.z + (Math.random() - .5) * SPAWN.w; me.r = SPAWN.r; S.cam.yaw = SPAWN.r + PI; S.cam.pitch = .32; me.char.visible = true;
  [[659, 0], [523, .45], [587, .9], [392, 1.35], [392, 2.1], [587, 2.55], [659, 3.0], [523, 3.45]].forEach(([f, t]) => after(t * 1000, () => sfx(f, f * .998, .5, 'sine', .06)));   // 딩동댕동 · 댕동딩동
  after(600, () => flash('겨울방학 시작! 동네로 놀러 가자'));
  shadowRange(75);
  $('intro').hidden = true; ['top','mini','dock'].forEach(id => $(id).hidden = false); canvas.focus();
  if (coarse) after(3400, () => flash('왼쪽을 끌어 이동'));
}
function doWave(){ if (wave()) { emote(me.char, 1); sfx(620, 760, .1); } }
function bindUi(){
  $('enter').onclick = enter;
  $('reroll').onclick = () => { me.a = rnd(ADJ.length); me.n = rnd(NOUN.length); me.ci = (me.ci + 1 + rnd(COLORS.length - 1)) % COLORS.length; dressMe(); };
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
  if (S.mode !== 'intro') { placeChar(me, me.char, dt, moved, now); if (moved > 0 && !SIT.has(me.st)) trackPrints(me, moved, now); }
  updateRemotes(dt, now);
  for (const x of ACTS) if (x.frame) x.frame(dt, now, moved);
  updateVehicles(dt); W.updateAnimated(dt, now); agePrints(now);
  updateSnow(dt, now, camLook);
  const hide = !!(current() && current().hideLabels);
  spotLabels.forEach(s => { s.visible = !hide; });   // (2026-11-21) 장소 이름표는 위아래로 흔들지 않고 가만히 떠 있다
  const act = findAction(); hud.prompt(act ? act.label : '', act && act.tone); updateAlt();
  updateCamera(dt, now); netTick(now);
  if (S.mode !== 'intro' && ++miniTick % miniEvery() === 0) drawMini();
}

async function boot(){
  try { if (document.fonts && document.fonts.load) await Promise.race([Promise.all(FONTS_TO_LOAD.map(f => document.fonts.load(f, '겨울동화'))), new Promise(r => setTimeout(r, 1800))]); } catch (e) {}
  tagPrims(true); buildMap(); tagPrims(false);
  ACTS.forEach(a => a.setup && a.setup());
  setupVehicles();
  finalizeBatches();
  W.lodScale = QUALITY.lod; W.farScale = QUALITY.far;
  { const t = performance.now(), r = batchStatic(); W.batchInfo = {...r, ms:Math.round(performance.now() - t)}; }   // (2026-11-24) 같은 소품 묶기 · 같은 재질 합치기 (world/batch.js)
  initFootprints(); initSnow();
  dressMe(); drawMiniBase(); bindUi();
  onFrame(frame);
  onFrame(() => W.cull(camera.position), 95);   // 거리 숨김 (카메라가 자리 잡은 뒤)
  onFrame(initPerf(), 99);   // 성능 창 (P 키)
  // (2026-11-24) 셰이더 미리 짓기: 거리 숨김 · LOD로 가려진 칸까지 잠깐 보이게 하고 한 번에 컴파일한다 → 처음 가는 곳에서 끊기지 않게
  try { W.cullers.forEach(c => { c.o.visible = true; if (c.lo) c.lo.visible = true; }); renderer.compile(scene, camera); } catch (e) {}
  start();
  if (location.search.includes('debug')) window.__town = {S, me, W, findAction, renderer, scene, usedProps, propNames};   // 개발용: 콘솔에서 상태를 들여다본다
  window.__townReady = true;
  connect({onPeers:list => { applyPeers(list); updateCount(); }, onStatus:updateCount});
}
boot();
