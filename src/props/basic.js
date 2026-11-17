// 눈사람 (눈사람 만들기 놀이에서 쓴다).
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { M, mesh } from '../core/gfx.js';
import { PI } from '../core/util.js';
import { COLORS } from '../config.js';

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
