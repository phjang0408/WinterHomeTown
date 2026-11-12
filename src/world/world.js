// 월드 데이터: 충돌, 지면 높이, 미끄러움, 미니맵, 배치된 소품. 맵을 넓히거나 구역을 추가할 때 여기에 등록한다.
import * as THREE from '../lib/three.js';
import { root } from '../core/engine.js';
import { RAD } from '../config.js';
import { buildProp, getProp } from '../props/registry.js';

export const W = {
  rects: [], circles: [], blockers: [], animated: [],
  heights: [], slippery: [], bounds: () => true,
  mm: {shapes: [], labels: []},
  trees: [], pines: [], lamps: [],

  // 지면 높이: 먼저 등록된 함수부터 물어보고, 숫자를 돌려준 첫 함수의 값을 쓴다.
  addHeight(fn){ this.heights.push(fn); },
  groundY(x, z){ for (const f of this.heights) { const v = f(x, z); if (v !== null && v !== undefined) return v; } return 0; },
  addSlippery(fn){ this.slippery.push(fn); },
  isSlippery(x, z){ return this.slippery.some(f => f(x, z)); },

  rect(x0, z0, x1, z1){ this.rects.push([x0, z0, x1, z1]); },
  circle(x, z, r){ this.circles.push([x, z, r]); },
  blocked(x, z){
    if (!this.bounds(x, z)) return true;
    for (const r of this.rects) if (x > r[0] - RAD && x < r[2] + RAD && z > r[1] - RAD && z < r[3] + RAD) return true;
    for (const c of this.circles) { const dx = x - c[0], dz = z - c[1], rr = c[2] + RAD; if (dx * dx + dz * dz < rr * rr) return true; }
    return false;
  },

  mmRect(x0, z0, x1, z1, c){ this.mm.shapes.push([x0, z0, x1, z1, c]); },
  mmCircle(x, z, r, c){ this.mm.shapes.push(['c', x, z, r, c]); },
  mmLabel(x, z, text, size){ this.mm.labels.push([x, z, text, size || 16]); },

  // 반복 소품은 마지막에 인스턴스로 한 번에 그린다 (world/builders.js의 finalizeBatches).
  tree(x, z, o = {}){ this.trees.push([x, z, o.y === undefined ? this.groundY(x, z) : o.y, o.s || 0.8 + Math.random() * 0.45]); if (o.collide !== false) this.circle(x, z, .55); },
  pine(x, z, o = {}){ this.pines.push([x, z, o.y === undefined ? this.groundY(x, z) : o.y, o.s || 0.8 + Math.random() * 0.5]); if (o.collide !== false) this.circle(x, z, .5); },
  lamp(x, z){ this.lamps.push([x, z]); this.circle(x, z, .15); },

  // 등록된 소품 하나를 놓는다. rot은 y축 회전(라디안).
  place(name, o = {}){
    const def = getProp(name), obj = buildProp(name, o), x = o.x || 0, z = o.z || 0, rot = o.rot || 0;
    obj.position.set(x, o.y === undefined ? this.groundY(x, z) : o.y, z); obj.rotation.y = rot; (o.parent || root).add(obj);
    if (o.collide !== false && def.colliders) {
      const c = Math.cos(rot), s = Math.sin(rot), tx = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c];
      for (const k of def.colliders) {
        if (k.c) { const p = tx(k.c[0], k.c[1]); this.circle(p[0], p[1], k.c[2]); }
        else if (k.r) { const ps = [tx(k.r[0], k.r[1]), tx(k.r[2], k.r[1]), tx(k.r[0], k.r[3]), tx(k.r[2], k.r[3])];
          this.rect(Math.min(...ps.map(p => p[0])), Math.min(...ps.map(p => p[1])), Math.max(...ps.map(p => p[0])), Math.max(...ps.map(p => p[1]))); }
      }
    }
    if (def.height) { const c = Math.cos(rot), s = Math.sin(rot); this.addHeight((px, pz) => { const dx = px - x, dz = pz - z; return def.height(dx * c - dz * s, dx * s + dz * c); }); }   // 올라설 수 있는 소품 (정자 마루 등)
    if (def.minimap) this.mmCircle(x, z, def.mmSize || 1.6, def.minimap);
    if (def.update) this.animated.push({obj, update:def.update});
    if (def.blocksCamera) this.blockers.push(obj);
    return obj;
  },
  // 같은 소품을 여러 곳에 놓는다. 소품을 한 번만 만들고 메쉬마다 인스턴스로 그려서, 몇 개를 놓아도 그리기 횟수가 늘지 않는다.
  // list: [{x, z, rot, s(배율), color(차체 색: userData.tint가 붙은 메쉬에만 곱해진다)}], opts는 소품 build 옵션.
  placeMany(name, list, opts = {}){
    if (!list.length) return null;
    const def = getProp(name), tinted = list.some(i => i.color !== undefined), proto = buildProp(name, tinted ? {...opts, color:0xffffff} : opts), group = new THREE.Group();
    const M = list.map(i => new THREE.Matrix4().compose(new THREE.Vector3(i.x, i.y === undefined ? this.groundY(i.x, i.z) : i.y, i.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i.rot || 0), new THREE.Vector3(1, 1, 1).multiplyScalar(i.s || 1)));
    const m4 = new THREE.Matrix4(), col = new THREE.Color(); proto.updateMatrixWorld(true);
    proto.traverse(m => { if (!m.isMesh) return;
      const im = new THREE.InstancedMesh(m.geometry, m.material, list.length); im.castShadow = m.castShadow; im.receiveShadow = m.receiveShadow;
      list.forEach((i, k) => { im.setMatrixAt(k, m4.multiplyMatrices(M[k], m.matrixWorld)); if (tinted && m.userData.tint) im.setColorAt(k, col.set(i.color === undefined ? 0xffffff : i.color)); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); group.add(im); });
    root.add(group);
    if (def.colliders && opts.collide !== false) for (const i of list) { const x = i.x, z = i.z, c = Math.cos(i.rot || 0), s = Math.sin(i.rot || 0), k = i.s || 1, tx = (dx, dz) => [x + (dx * c + dz * s) * k, z + (-dx * s + dz * c) * k];
      for (const q of def.colliders) { if (q.c) { const p = tx(q.c[0], q.c[1]); this.circle(p[0], p[1], q.c[2] * k); }
        else if (q.r) { const ps = [tx(q.r[0], q.r[1]), tx(q.r[2], q.r[1]), tx(q.r[0], q.r[3]), tx(q.r[2], q.r[3])]; this.rect(Math.min(...ps.map(p => p[0])), Math.min(...ps.map(p => p[1])), Math.max(...ps.map(p => p[0])), Math.max(...ps.map(p => p[1]))); } } }
    return group;
  },
  updateAnimated(dt, now){ for (const a of this.animated) a.update(a.obj, dt, now); },
};
