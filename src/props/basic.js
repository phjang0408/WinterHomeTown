// 게임에서 이미 쓰는 기본 소품.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { M, box, mesh, canvasTex } from '../core/gfx.js';
import { PI } from '../core/util.js';
import { COLORS } from '../config.js';

// 이전 방식 벤치 (상자 조합). 새 벤치와 비교용으로 남겨 둔다. 게임에서는 props/parkBench.js의 'bench'를 쓴다.
defineProp('benchOld', {
  label:'벤치 (이전 방식)', category:'쉼터',
  colliders:[{r:[-1.35,-.5,1.35,.5]}],
  build(){ const g = new THREE.Group(), w = M(0xb79d82);
    box(-1.3,-.35,1.3,.4,.12,w,.42,g); box(-1.3,-.45,1.3,-.33,.75,w,.5,g);
    [-1.1,1.1].forEach(dx => box(dx - .07,-.3,dx + .07,.35,.42,M(0x6b7684),0,g));
    box(-1.3,-.47,1.3,-.31,.08,M(0xf8fbfd),1.25,g); return g; },
});

export function makeCar(col){
  const g = new THREE.Group();
  box(-1,-2.1,1,2.1,.8,M(col),.35,g); box(-.9,-1.1,.9,1.2,.65,M(0xdfe7ee),1.15,g); box(-.92,-1.15,.92,1.25,.14,M(0xf8fbfd),1.8,g);
  [[-1,-1.3],[1,-1.3],[-1,1.3],[1,1.3]].forEach(p => mesh(new THREE.CylinderGeometry(.36,.36,.3,10).rotateZ(PI / 2), M(0x3c4654), p[0], .36, p[1], g));
  return g;
}
defineProp('car', {label:'주차된 차', category:'거리', colliders:[{r:[-1.05,-2.15,1.05,2.15]}], build:o => makeCar(o.color || 0xb8c4d2)});

// 눈사람: rb 몸통 반지름, rh 머리 반지름, ci 모자 색 번호. 같은 그룹에 다시 그리면 크기가 바뀐다.
export function snowmanInto(g, rb, rh, ci){
  while (g.children.length) g.remove(g.children[0]);
  if (rb <= 0) return g;
  const w = M(0xfbfdfe), col = COLORS[ci % COLORS.length];
  const b = mesh(new THREE.SphereGeometry(rb, 18, 14), w, 0, rb * .88, 0, g); b.scale.y = .92;
  if (rh <= 0) return g;
  const hy = rb * 1.68 + rh * .8;
  mesh(new THREE.SphereGeometry(rh, 16, 12), w, 0, hy, 0, g);
  [-.35,.35].forEach(dx => mesh(new THREE.SphereGeometry(rh * .11, 6, 6), M(0x3c4654), dx * rh, hy + rh * .2, rh * .9, g));
  mesh(new THREE.ConeGeometry(rh * .14, rh * .7, 8).rotateX(PI / 2), M(0xe58a3c), 0, hy, rh * 1.2, g);
  mesh(new THREE.CylinderGeometry(rh * .62, rh * .7, rh * .7, 14), M(col.j), 0, hy + rh * 1.05, 0, g);
  mesh(new THREE.CylinderGeometry(rh * .95, rh * .95, rh * .1, 14), M(col.j), 0, hy + rh * .72, 0, g);
  mesh(new THREE.TorusGeometry(rh * .8, rh * .2, 8, 16).rotateX(PI / 2), M(col.h), 0, hy - rh * .72, 0, g);
  [-1,1].forEach(s => { const a = mesh(new THREE.CylinderGeometry(.04,.04,rb * 1.1,5), M(0x8a6f5a), s * rb * 1.15, rb * 1.2, 0, g); a.rotation.z = -s; });
  return g;
}
defineProp('snowman', {label:'눈사람', category:'겨울', colliders:[{c:[0,0,1.2]}],
  build:o => snowmanInto(new THREE.Group(), o.rb || 1.2, o.rh || .75, o.ci || 0)});

// 김이 오르는 소품이 같이 쓰는 연기 입자. 그룹 안에서만 움직여서 어디에 놓아도 따라간다.
const smokeMat = new THREE.MeshBasicMaterial({color:0xf3f6f8, transparent:true, opacity:.45, depthWrite:false});
const smokeGeo = new THREE.SphereGeometry(.12, 6, 5);
export function smokeUpdate(obj, dt, now, at){
  const u = obj.userData; u.smoke = u.smoke || []; u.smokeT = (u.smokeT || 0) + dt;
  if (u.smokeT > .45) { u.smokeT = 0; const m = new THREE.Mesh(smokeGeo, smokeMat); m.position.set(at[0] + (Math.random() - .5) * .3, at[1], at[2]); obj.add(m); u.smoke.push({m, life:3.2}); }
  for (let i = u.smoke.length - 1; i >= 0; i--) { const k = u.smoke[i]; k.life -= dt; k.m.position.y += dt * .9; k.m.position.x += dt * .3; k.m.scale.setScalar(2 + (3.2 - k.life) * 2.2);
    if (k.life <= 0) { obj.remove(k.m); u.smoke.splice(i, 1); } }
}

defineProp('fishStall', {
  label:'붕어빵 노점', category:'거리', colliders:[{r:[-2,-1.2,2,1.2]}], minimap:'#d9695c', mmSize:2.2,
  build(){ const st = new THREE.Group();
    box(-1.8,-1,1.8,1,1.1,M(0xb5594a),0,st); box(-1.9,-1.1,1.9,1.1,.12,M(0x8a6f5a),1.1,st); box(-1.2,-.7,1.2,.7,.25,M(0x3c4654),1.22,st);
    [[-1.8,-1],[1.8,-1],[-1.8,1],[1.8,1]].forEach(k => mesh(new THREE.CylinderGeometry(.05,.05,2.4,6), M(0x6b7684), k[0], 2.4, k[1], st));
    const tex = canvasTex(128, 32, g => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fbf4e6' : '#d9695c'; g.fillRect(i * 16, 0, 16, 32); } });
    box(-2.1,-1.3,2.1,1.3,.15,new THREE.MeshLambertMaterial({map:tex}),3.6,st); return st; },
  update:(obj, dt, now) => smokeUpdate(obj, dt, now, [0, 1.6, 0]),
});
