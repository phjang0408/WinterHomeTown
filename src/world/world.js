// 월드 데이터: 충돌, 지면 높이, 미끄러움, 미니맵, 배치된 소품. 맵을 넓히거나 구역을 추가할 때 여기에 등록한다.
import * as THREE from '../lib/three.js';
import { root } from '../core/engine.js';
import { RAD } from '../config.js';
import { buildProp, getProp } from '../props/registry.js';

export const W = {
  rects: [], circles: [], blockers: [], animated: [], cullers: [],
  heights: [], slippery: [], bounds: () => true,
  mm: {shapes: [], labels: []},
  trees: [], pines: [], lamps: [],

  // 지면 높이: 먼저 등록된 함수부터 물어보고, 숫자를 돌려준 첫 함수의 값을 쓴다.
  // prio: 클수록 먼저 묻는다. 보도처럼 넓게 덮는 높이는 prio -1로 맨 뒤에 둬서, 계단 · 테라스 같은 소품 높이가 이긴다.
  addHeight(fn, prio = 0){ fn.prio = prio; this.heights.push(fn); this.heights.sort((a, b) => (b.prio || 0) - (a.prio || 0)); },
  // y(선택): 지금 서 있는 높이. 육교처럼 위아래로 겹친 곳에서 아래로 지나가는지, 위에 서 있는지를 높이 함수가 가린다.
  groundY(x, z, y){ for (const f of this.heights) { const v = f(x, z, y); if (v !== null && v !== undefined) return v; } return 0; },
  addSlippery(fn){ this.slippery.push(fn); },
  isSlippery(x, z){ return this.slippery.some(f => f(x, z)); },

  // y0 · y1(선택): 이 높이 사이에 선 사람만 막는다 (육교 난간은 위에 선 사람만, 육교 기둥 · 다리 밑 울타리는 땅에 선 사람만)
  rect(x0, z0, x1, z1, y0, y1){ this.rects.push(y0 === undefined && y1 === undefined ? [x0, z0, x1, z1] : [x0, z0, x1, z1, y0, y1]); },
  circle(x, z, r){ this.circles.push([x, z, r]); },
  blocked(x, z, y){
    if (!this.bounds(x, z, y)) return true;
    for (const r of this.rects) if (x > r[0] - RAD && x < r[2] + RAD && z > r[1] - RAD && z < r[3] + RAD) {
      if (r.length > 4 && y !== undefined && ((r[4] !== undefined && y < r[4]) || (r[5] !== undefined && y > r[5]))) continue;
      return true; }
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
    const def = getProp(name), obj = buildProp(name, o), x = o.x || 0, z = o.z || 0, rot = o.rot || 0, k = o.s || 1;   // s: 크기 배율 (충돌 · 높이도 같이)
    obj.position.set(x, o.y === undefined ? this.groundY(x, z) : o.y, z); obj.rotation.y = rot; if (k !== 1) obj.scale.setScalar(k); (o.parent || root).add(obj);
    if (o.collide !== false && def.colliders) {
      const c = Math.cos(rot), s = Math.sin(rot), tx = (dx, dz) => [x + (dx * c + dz * s) * k, z + (-dx * s + dz * c) * k];
      for (const q of def.colliders) {
        if (q.c) { const p = tx(q.c[0], q.c[1]); this.circle(p[0], p[1], q.c[2] * k); }
        else if (q.r) { const ps = [tx(q.r[0], q.r[1]), tx(q.r[2], q.r[1]), tx(q.r[0], q.r[3]), tx(q.r[2], q.r[3])];
          this.rect(Math.min(...ps.map(p => p[0])), Math.min(...ps.map(p => p[1])), Math.max(...ps.map(p => p[0])), Math.max(...ps.map(p => p[1])), q.y0, q.y1); }
      }
    }
    if (def.height) { const c = Math.cos(rot), s = Math.sin(rot); this.addHeight((px, pz, py) => { const dx = px - x, dz = pz - z; const h = def.height((dx * c - dz * s) / k, (dx * s + dz * c) / k, py === undefined ? undefined : (py - obj.position.y) / k); return h === null || h === undefined ? h : h * k + obj.position.y; }); }   // 올라설 수 있는 소품 (정자 마루 등)
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
    // 그리기 부담 (2026-11-16): 넓게 흩어진 목록은 CELL 칸으로 나눠 칸마다 인스턴스를 만든다 → 화면 밖 칸은 통째로 빠진다.
    // far(거리 숨김): 소품 정의의 far, 또는 작은 소품(small)은 기본 120 · 그 밖은 0(숨기지 않음). opts.far로 바꿀 수 있다.
    const far = opts.far ?? def.far ?? (def.small ? 120 : 0), cells = new Map(), CELL = 90;
    list.forEach((it, k) => { const key = list.length < 16 ? 0 : Math.floor(it.x / CELL) + ':' + Math.floor(it.z / CELL); if (!cells.has(key)) cells.set(key, []); cells.get(key).push(k); });
    for (const ids of cells.values()) {
      const part = new THREE.Group(); let cx = 0, cz = 0; ids.forEach(k => { cx += list[k].x; cz += list[k].z; }); cx /= ids.length; cz /= ids.length;
      proto.traverse(m => { if (!m.isMesh) return;
        const im = new THREE.InstancedMesh(m.geometry, m.material, ids.length); im.castShadow = m.castShadow && !(far && far <= 150); im.receiveShadow = m.receiveShadow;   // 작은 소품은 그림자를 그리지 않는다
        ids.forEach((k, n) => { const i = list[k]; im.setMatrixAt(n, m4.multiplyMatrices(M[k], m.matrixWorld)); if (tinted && m.userData.tint) im.setColorAt(n, col.set(i.color === undefined ? 0xffffff : i.color)); });
        im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); part.add(im); });
      group.add(part);
      if (far) { let r = 0; ids.forEach(k => { r = Math.max(r, Math.hypot(list[k].x - cx, list[k].z - cz)); }); this.cullers.push({o:part, x:cx, z:cz, r, far}); }
    }
    root.add(group);
    if (def.colliders && opts.collide !== false) for (const i of list) { const x = i.x, z = i.z, c = Math.cos(i.rot || 0), s = Math.sin(i.rot || 0), k = i.s || 1, tx = (dx, dz) => [x + (dx * c + dz * s) * k, z + (-dx * s + dz * c) * k];
      for (const q of def.colliders) { if (q.c) { const p = tx(q.c[0], q.c[1]); this.circle(p[0], p[1], q.c[2] * k); }
        else if (q.r) { const ps = [tx(q.r[0], q.r[1]), tx(q.r[2], q.r[1]), tx(q.r[0], q.r[3]), tx(q.r[2], q.r[3])]; this.rect(Math.min(...ps.map(p => p[0])), Math.min(...ps.map(p => p[1])), Math.max(...ps.map(p => p[0])), Math.max(...ps.map(p => p[1]))); } } }
    return group;
  },
  updateAnimated(dt, now){ for (const a of this.animated) a.update(a.obj, dt, now); },
  // 거리 숨김: 카메라에서 far보다 먼 칸은 그리지 않는다 (그림자도 같이 빠진다)
  cull(cam){ for (const c of this.cullers) c.o.visible = Math.hypot(cam.x - c.x, cam.z - c.z) - c.r < c.far; },
};
