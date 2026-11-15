// 지형: 땅, 강변 경사, 둔치, 강물, 강 건너편. 높이와 걸을 수 있는 범위를 월드에 등록한다.
import * as THREE from '../lib/three.js';
import { root } from '../core/engine.js';
import { M, G, flat, box } from '../core/gfx.js';
import { sr, PI } from '../core/util.js';
import { W } from '../world/world.js';
import { UNIT as U } from '../config.js';
import { BANK, PLAT, DOCK, HILL, WALK, NROAD, BRIDGE, RAILS, SIDING } from './layout.js';
import { PLATFORM, TRACK } from '../props/railway.js';

export function hillY(x, z){ if (!HILL.h) return 0; const d = Math.hypot(x - HILL.x, z - HILL.z) / HILL.r; if (d >= 1) return 0; const t = 1 - d; return HILL.h * t * t * (3 - 2 * t); }
// 승강장 · 화물 홈 윗면 높이 (양 끝 경사로). 소품(platformModule)과 같은 치수.
function deckY(r, h, ramp){ return (x, z) => { if (x < r.x0 || x > r.x1 || z < r.z0 || z > r.z1) return null;
  const hl = (r.x1 - r.x0) / 2 - ramp * U, d = Math.abs(x - (r.x0 + r.x1) / 2) - hl; return d <= 0 ? h * U : Math.max(0, h * U * (1 - d / (ramp * U))); }; }

export function buildTerrain(){
  // 높이: 승강장 → 화물 홈 → 선로 도상 → 둔치 → 경사 → 평지 (육교 · 상가 테라스 등 소품 높이는 소품이 등록한다)
  W.addHeight(deckY(PLAT, PLATFORM.h, PLATFORM.ramp));
  W.addHeight(deckY(DOCK, 1, 2));
  const bal = TRACK.bTop * U, by = TRACK.bH * U;
  W.addHeight((x, z) => z < 70 && (RAILS.some(c => Math.abs(z - c) < bal) || (x > SIDING.x0 && x < SIDING.x1 && Math.abs(z - SIDING.z) < bal)) ? by : null);
  W.addHeight((x, z) => z >= 282 ? BANK + hillY(x, z) : null);
  W.addHeight((x, z) => z > 275 ? BANK * (z - 275) / 7 : null);
  W.bounds = (x, z) => {
    if (x < WALK.x0 || x > WALK.x1 || z < WALK.z0 || z > WALK.zRiver) return false;
    if (z > NROAD.z0 - .4 && z < NROAD.z1 + .4 && Math.abs(x - BRIDGE.x) > 1.6) return false;   // 북쪽 도로: 육교 위로만 지나간다 (도로와 단지 쪽 길 끝은 투명벽)
    if (z > NROAD.z1 && z < 256 && x < 15.6) return false;                                    // 아파트단지 서쪽 방음벽 바깥
    if (z > NROAD.z1 && z < 95.7 && x < 186) return false;                                    // 아파트단지 북쪽 방음벽 바깥
    return true;
  };

  flat(-800,-800,1400,275,G(0xf4f7fa),0);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-800,0,275, 1400,0,275, -800,BANK,282, 1400,BANK,282], 3));
  g.setIndex([0,2,1, 1,2,3]); g.computeVertexNormals();
  const slope = new THREE.Mesh(g, M(0xeef2f1)); slope.receiveShadow = true; root.add(slope);
  flat(-800,282,1400,342.5,G(0xeef3ef),BANK);
  box(-800,342,1400,342.5,.8,M(0xd2dbe2),BANK - .8);
  const water = flat(-800,342.5,1400,452,0xbcd4e1,BANK - .45);
  water.material = new THREE.MeshPhongMaterial({color:0x86b6d8, specular:0xfff4dc, shininess:70});   // 하늘이 비친 강물, 해 쪽으로 윤슬이 생긴다
  box(-800,451.5,1400,452,1,M(0xd2dbe2),BANK - 1.1);
  flat(-800,452,1400,1400,G(0xf2f6f9),BANK + .1);
  W.mmRect(0,275,640,342,'#e1e9e3'); W.mmRect(0,342,640,380,'#c2d8e4');

  // 떠다니는 얼음 조각
  const floes = [];
  for (let i = 0; i < 22; i++) { const x = sr(-60, 700), z = sr(348, 445);
    const f = new THREE.Mesh(new THREE.CircleGeometry(1, 7), M(0xf4f8fb)); f.rotation.x = -PI / 2; f.scale.set(sr(1.5, 4.5), sr(1.2, 3), 1);
    f.position.set(x, BANK - .42, z); f.userData.v = sr(.25, .7); f.receiveShadow = true; root.add(f); floes.push(f); }
  W.animated.push({obj:null, update:dt => floes.forEach(f => { f.position.x += f.userData.v * dt; if (f.position.x > 700) f.position.x = -60; })});
}
