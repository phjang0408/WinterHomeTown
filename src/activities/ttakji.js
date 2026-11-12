// 문구점 앞 딱지치기: 게이지 타이밍 맞추기 7번.
import * as THREE from '../lib/three.js';
import { M, canvasTex } from '../core/gfx.js';
import { root } from '../core/engine.js';
import { S } from '../core/state.js';
import { PI, clamp } from '../core/util.js';
import { sfx, flash, after } from '../core/fx.js';
import { ST } from '../config.js';
import { spotLabel } from '../world/builders.js';
import { me } from '../entities/player.js';
import { emote } from '../entities/character.js';
import { hud } from '../ui/hud.js';
import { defineActivity, begin, finish } from './registry.js';
import { TK } from '../map/layout.js';

let tk, thrown;
const flip = k => { tk.userData.anim = {k, t:0}; };
const stat = () => hud.stat('남은 딱지 ' + S.game.tries + ' · 넘긴 딱지 ' + S.game.flips);
function round(){ const g = S.game; g.zw = Math.max(.09, .24 - .025 * g.round); g.zc = clamp(.45 + Math.random() * .45, g.zw / 2, 1 - g.zw / 2); g.speed = 1.2 + .2 * g.round; g.busy = false;
  hud.zone(g.zc - g.zw / 2, g.zw); hud.gauge('바늘이 색칠된 칸에 올 때 내려치세요', true); stat(); }

const ttakji = defineActivity({
  id:'ttakji', st:ST.TTAKJI, score:{index:1, label:'딱지', unit:'장'}, hideLabels:true,
  setup(){
    const mat = new THREE.Mesh(new THREE.CircleGeometry(1.8, 28), M(0xe6d2b0)); mat.rotation.x = -PI / 2; mat.position.set(TK.x - .4, .045, TK.z); mat.receiveShadow = true; root.add(mat);
    const tex = col => new THREE.MeshLambertMaterial({map:canvasTex(64, 64, g => { g.fillStyle = col; g.fillRect(0,0,64,64); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(0,0); g.lineTo(64,64); g.moveTo(64,0); g.lineTo(0,64); g.stroke(); g.strokeRect(2,2,60,60); })});
    const sd = M(0x8a7a66);
    tk = new THREE.Mesh(new THREE.BoxGeometry(.8,.09,.8), [sd,sd,tex('#d9695c'),tex('#3f6fa8'),sd,sd]); tk.position.set(TK.x, .1, TK.z); tk.castShadow = true; tk.userData = {base:0, anim:null}; root.add(tk);
    thrown = new THREE.Mesh(new THREE.BoxGeometry(.7,.08,.7), [sd,sd,tex('#3f8a97'),tex('#e2a84b'),sd,sd]); thrown.visible = false; root.add(thrown);
    spotLabel('딱지치기', TK.x - .4, 3.2, TK.z);
  },
  offer(offer){ offer(Math.hypot(me.x - (TK.x - .4), me.z - TK.z), 2.8, '딱지치기', ttakji.start); },
  start(){ begin(ttakji, {tries:7, flips:0, round:0, g:0, dir:1, busy:false}); me.x = TK.x - 1.8; me.z = TK.z; me.r = PI / 2; hud.showGame('딱지치기'); round(); },
  camera(want, look){ want.set(TK.x - 5.5, 6.4, TK.z + 6); look.set(TK.x - .6, .4, TK.z); return true; },
  onAction(){
    const g = S.game; if (!g || g.busy || g.tries <= 0) return;
    g.busy = true; g.tries--; const d = Math.abs(g.g - g.zc), ok = d <= g.zw / 2, near = d <= g.zw * 1.1;
    me.em = [me.em[0] + 1, ok ? 4 : 2]; emote(me.char, 2); thrown.userData.t0 = performance.now(); thrown.visible = true;
    after(260, () => {
      if (ok) { g.flips++; flip(1); flash('넘어갔다!'); sfx(220, 660, .22, 'triangle'); } else { flip(near ? 2 : 3); flash(near ? '아깝다' : '꿈쩍도 안 함'); sfx(160, 90, .16, 'square', .05); }
      stat();
      after(900, () => { thrown.visible = false; if (g.tries <= 0) finish(ttakji, '딱지치기 끝', g.flips, ttakji.start); else { g.round++; round(); } });
    });
  },
  quit(){ thrown.visible = false; },
  frame(dt, now){
    const g = S.game;
    if (S.mode === 'ttakji' && g && !g.busy) { g.g += g.dir * g.speed * dt; if (g.g > 1) { g.g = 1; g.dir = -1; } if (g.g < 0) { g.g = 0; g.dir = 1; } hud.needle(g.g); }
    const u = tk.userData, an = u.anim;
    if (an) { an.t += dt; const q = Math.min(1, an.t / .6), s = Math.sin(q * PI);
      if (an.k === 1) { tk.position.y = .1 + s * 1.2; tk.rotation.z = u.base + PI * q; } else if (an.k === 2) { tk.position.y = .1 + s * .35; tk.rotation.z = u.base + s * .9; } else tk.position.y = .1 + s * .06;
      if (q >= 1) { if (an.k === 1) u.base += PI; tk.rotation.z = u.base; tk.position.y = .1; u.anim = null; } }
    if (thrown.visible) { const e = (now - thrown.userData.t0) / 1000, q = clamp((e - .14) / .12, 0, 1), sl = e > .26 ? Math.min(.5, (e - .26) * 2) : 0;
      thrown.position.set(TK.x - 1.3 + q - sl * 1.2, e > .26 ? .1 : 1.7 - q * 1.5, TK.z + sl * 1.4); thrown.rotation.y = e < .26 ? e * 6 : 0; }
  },
  remoteEmote(R, k){ if (k === 4) flip(1); },
});
