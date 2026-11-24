// 정적 묶음 (2026-11-24 최적화). 맵 · 놀이 · 차량을 다 놓은 뒤(main.js boot) 한 번 돈다. 첫 그리기 전이라 GPU에 올라간 것은 아직 없다.
//   ① 같은 소품을 같은 옵션으로 W.place한 것들 → 칸(96m, LOD 소품은 32m)마다 InstancedMesh로 묶는다.
//      소품 안의 InstancedMesh(벤치 각재 등)는 놓은 수 × 안쪽 수만큼 펼친다. 정의에 lod: {near, opts}가 있으면 먼 칸은 단순 모델,
//      정의의 far(또는 small이면 120)보다 먼 칸은 숨긴다 (placeMany와 같은 규칙).
//   ② 혼자 놓인 소품과 맵 도우미 도형(gfx.js box · flat · mesh, buildMap 동안만 표시)은 같은 재질끼리 칸(96m)마다 한 메쉬로 합친다.
//      따로 만든 재질이라도 값 · 텍스처가 모두 같으면 같은 재질로 본다(matKey).
//   ③ userData.split = {cell, far}이 붙은 큰 메쉬(침목 인스턴스 · 바닥 얼룩)는 칸으로 잘라 화면 밖 · 먼 칸을 뺀다.
//   묶지 않는 것: 움직이는 소품(정의의 update · dynamic), 카메라 가림(W.blockers), 투명 · 셰이더 재질, 여러 재질 메쉬, userData.dynamic.
//   놀이가 W.place로 돌려받은 소품을 움직이면 그 소품 정의에 dynamic: true를 단다 (seesaw · springRider · merryGoRound).
import * as THREE from '../lib/three.js';
import { root } from '../core/engine.js';
import { W } from './world.js';
import { getProp, buildProp } from '../props/registry.js';

const SKIP = new Set(['x', 'y', 'z', 'rot', 's', 'parent', 'collide', 'far', 'lod']);
const sigOf = (name, o) => name + '|' + JSON.stringify(Object.keys(o).filter(k => !SKIP.has(k)).sort().map(k => [k, o[k]]));
const m4 = new THREE.Matrix4(), col = new THREE.Color(), v3 = new THREE.Vector3(), nm = new THREE.Matrix3();
const RENDERABLE = o => o.isMesh || o.isSprite || o.isLine || o.isPoints || o.isLight;
const visibleUpTo = (m, top) => { for (let x = m; x && x !== top; x = x.parent) if (!x.visible) return false; return true; };
const plainBeforeRender = THREE.Mesh.prototype.onBeforeRender;

// 소품 하나의 메쉬 목록과, 소품 기준 상대 행렬
function slotsOf(obj){
  obj.updateWorldMatrix(true, true); const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert(), out = [];
  obj.traverse(m => { if (m.isMesh && visibleUpTo(m, obj.parent)) out.push({m, rel:new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)}); });
  return out;
}
// 재질 지문: 따로 만든 재질이라도 종류 · 값 · 텍스처가 모두 같으면 같은 재질로 본다 (합칠 때 첫 재질을 쓴다)
const FP = new WeakMap(), SKIPM = new Set(['uuid', 'id', 'name', 'version', 'userData', '_listeners', 'uniformsGroups']);
function matKey(m){
  if (Array.isArray(m)) return m.map(matKey).join('+');
  if (FP.has(m)) return FP.get(m);
  const parts = [m.type];
  for (const k of Object.keys(m).sort()) { if (SKIPM.has(k)) continue; const v = m[k];
    if (v === null || v === undefined || typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') parts.push(k + '=' + v);
    else if (v.isColor) parts.push(k + '=c' + v.getHexString());
    else if (v.isTexture) parts.push(k + '=t' + v.uuid);
    else if (v.isVector2 || v.isVector3 || v.isEuler) parts.push(k + '=' + v.toArray().join(','));
    else if (typeof v === 'function') parts.push(k + '=f' + v.toString().length + ':' + v.toString().slice(0, 80));
    else if (typeof v === 'object') { try { parts.push(k + '=' + JSON.stringify(v)); } catch (e) { parts.push(k + '=?' + Math.random()); } } }
  parts.push('pk=' + (m.customProgramCacheKey ? m.customProgramCacheKey() : ''));
  const key = parts.join('|'); FP.set(m, key); return key;
}
const sameMat = (a, b) => a === b || matKey(a) === matKey(b);
const geoSize = g => g.attributes.position.count * 7 + (g.index ? g.index.count : 0);
// 메쉬를 떼어 내고, 남은 그릴 것이 없으면 소품을 통째로 뺀다 (높이 · 충돌은 놓을 때 이미 등록돼 있다)
function strip(obj, meshes){ meshes.forEach(m => m.removeFromParent()); let any = false; obj.traverse(o => { if (o !== obj && RENDERABLE(o)) any = true; }); if (!any) obj.removeFromParent(); }

// slots(상대 행렬 붙은 메쉬)를 놓을 자리 행렬 목록(mats)만큼 인스턴스로 그린다
function instanceSlots(slots, mats, parent){
  const part = new THREE.Group();
  for (const {m, rel} of slots) {
    const inner = m.isInstancedMesh ? m.count : 1, im = new THREE.InstancedMesh(m.geometry, m.material, mats.length * inner), base = new THREE.Matrix4(); let k = 0;
    for (const M of mats) { base.multiplyMatrices(M, rel);
      if (!m.isInstancedMesh) { im.setMatrixAt(k++, base); continue; }
      for (let j = 0; j < inner; j++) { m.getMatrixAt(j, m4); im.setMatrixAt(k, m4.premultiply(base)); if (m.instanceColor) { m.getColorAt(j, col); im.setColorAt(k, col); } k++; } }
    im.castShadow = m.castShadow; im.receiveShadow = m.receiveShadow; im.renderOrder = m.renderOrder; im.frustumCulled = m.frustumCulled;
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); part.add(im);
  }
  parent.add(part); return part;
}

// ① 같은 소품끼리 인스턴스로
function instanceRepeats(blocked, singles, out){
  const groups = new Map();
  for (const p of W.placed) {
    const def = getProp(p.name);
    if (p.obj.parent !== root || def.update || def.blocksCamera || def.dynamic || blocked.has(p.obj)) continue;
    const k = sigOf(p.name, p.opts); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p);
  }
  for (const list of groups.values()) {
    const def = getProp(list[0].name), lod = def.lod;
    if (list.length < 4 && !lod) { singles.push(...list); continue; }   // 2~3개는 인스턴스보다 ② 합치기가 낫다 (다른 소품과도 재질이 같으면 한 메쉬)
    list.forEach(p => { p.slots = slotsOf(p.obj); });
    const S0 = list[0].slots, same = list.every(p => p.slots.length === S0.length && p.slots.every((s, i) => geoSize(s.m.geometry) === geoSize(S0[i].m.geometry) && sameMat(s.m.material, S0[i].m.material) && s.m.isInstancedMesh === S0[i].m.isInstancedMesh && (s.m.count || 1) === (S0[i].m.count || 1)));
    if (!same || !S0.length) { singles.push(...list); continue; }
    const far = def.far ?? (def.small ? 120 : 0), CELL = lod ? 32 : 96, cells = new Map();
    let low = null; if (lod) { const o = {}; for (const k in list[0].opts) if (!SKIP.has(k)) o[k] = list[0].opts[k]; low = slotsOf(buildProp(list[0].name, {...o, ...lod.opts})); }
    list.forEach(p => { const key = Math.floor(p.obj.position.x / CELL) + ':' + Math.floor(p.obj.position.z / CELL); if (!cells.has(key)) cells.set(key, []); cells.get(key).push(p); });
    for (const ps of cells.values()) {
      const mats = ps.map(p => p.obj.matrixWorld.clone()), part = instanceSlots(S0, mats, root), lo = low && instanceSlots(low, mats, root);
      part.userData.prop = list[0].name; if (lo) lo.userData.prop = list[0].name + '(LOD)';
      if (far || lo) { let cx = 0, cz = 0, r = 0; ps.forEach(p => { cx += p.obj.position.x; cz += p.obj.position.z; }); cx /= ps.length; cz /= ps.length;
        ps.forEach(p => { r = Math.max(r, Math.hypot(p.obj.position.x - cx, p.obj.position.z - cz)); }); W.cullers.push({o:part, lo, near:lod && lod.near, x:cx, z:cz, r:r + 2, far}); }
      out.cells++;
    }
    list.forEach(p => strip(p.obj, p.slots.map(s => s.m))); out.props += list.length;
  }
}

// 지오메트리 여러 개(+ 자리 행렬)를 월드 좌표 한 덩어리로 합친다. items: [{g, M, color?}] (color: 인스턴스 색을 정점 색에 곱한다)
function mergeWorld(items){
  const g0 = items[0].g, keys = Object.keys(g0.attributes); let nv = 0, ni = 0;
  for (const it of items) { const c = it.g.attributes.position.count; nv += c; ni += it.g.index ? it.g.index.count : c; }
  const arrs = {}; keys.forEach(k => { const a = g0.attributes[k]; arrs[k] = new a.array.constructor(nv * a.itemSize); });
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni); let vo = 0, io = 0;
  for (const {g, M, color} of items) {
    const cnt = g.attributes.position.count, flip = M.determinant() < 0; nm.getNormalMatrix(M);
    for (const k of keys) { const a = g.attributes[k], d = arrs[k], s = a.itemSize;
      if (k === 'position') for (let i = 0; i < cnt; i++) { v3.fromBufferAttribute(a, i).applyMatrix4(M); d[(vo + i) * 3] = v3.x; d[(vo + i) * 3 + 1] = v3.y; d[(vo + i) * 3 + 2] = v3.z; }
      else if (k === 'normal') for (let i = 0; i < cnt; i++) { v3.fromBufferAttribute(a, i).applyMatrix3(nm).normalize(); d[(vo + i) * 3] = v3.x; d[(vo + i) * 3 + 1] = v3.y; d[(vo + i) * 3 + 2] = v3.z; }
      else if (k === 'tangent') for (let i = 0; i < cnt; i++) { v3.set(a.getX(i), a.getY(i), a.getZ(i)).transformDirection(M); d[(vo + i) * 4] = v3.x; d[(vo + i) * 4 + 1] = v3.y; d[(vo + i) * 4 + 2] = v3.z; d[(vo + i) * 4 + 3] = a.getW(i) * (flip ? -1 : 1); }
      else { d.set(a.array.subarray(0, cnt * s), vo * s); if (k === 'color' && color) for (let i = 0; i < cnt; i++) { const o = (vo + i) * s; d[o] *= color.r; d[o + 1] *= color.g; d[o + 2] *= color.b; } }
    }
    const src = g.index ? g.index.array : null, n = src ? src.length : cnt;
    for (let i = 0; i < n; i += 3) { const a = src ? src[i] : i, b = src ? src[i + 1] : i + 1, c = src ? src[i + 2] : i + 2;
      idx[io++] = a + vo; idx[io++] = (flip ? c : b) + vo; idx[io++] = (flip ? b : c) + vo; }
    vo += cnt;
  }
  const out = new THREE.BufferGeometry(); keys.forEach(k => out.setAttribute(k, new THREE.BufferAttribute(arrs[k], g0.attributes[k].itemSize, g0.attributes[k].normalized)));
  out.setIndex(new THREE.BufferAttribute(idx, 1)); out.computeBoundingSphere(); return out;
}
const attrSig = g => Object.keys(g.attributes).sort().map(k => { const a = g.attributes[k]; return k + a.itemSize + (a.isInterleavedBufferAttribute ? 'I' : a.array.constructor.name) + (a.normalized ? 'n' : ''); }).join(',');
function mergeable(m){
  const g = m.geometry, mat = m.material;
  if (Array.isArray(mat) || mat.isShaderMaterial || mat.transparent || m.isSkinnedMesh || m.userData.dynamic || m.frustumCulled === false || m.onBeforeRender !== plainBeforeRender) return false;
  if (Object.keys(g.morphAttributes).length || g.drawRange.start !== 0 || g.drawRange.count !== Infinity || Object.values(g.attributes).some(a => a.isInterleavedBufferAttribute)) return false;
  if (m.isInstancedMesh && (m.count > 64 || (m.instanceColor && !(mat.vertexColors && g.attributes.color)))) return false;
  return !!g.attributes.position;
}

// ② 같은 재질끼리 칸마다 합치기
function mergeStatics(cands, out){
  const CELL = 96, groups = new Map(), sphere = new THREE.Sphere();
  for (const c of cands) { const m = c.m; m.updateWorldMatrix(true, false);
    if (!mergeable(m)) continue;
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    sphere.copy(m.geometry.boundingSphere).applyMatrix4(m.matrixWorld); if (m.isInstancedMesh) { if (!m.boundingSphere) m.computeBoundingSphere(); sphere.copy(m.boundingSphere).applyMatrix4(m.matrixWorld); }
    if (sphere.radius > 60) continue;   // 넓은 바닥판 같은 큰 메쉬는 그대로 (화면 밖 빼기를 살린다)
    const key = [matKey(m.material), attrSig(m.geometry), m.castShadow, m.receiveShadow, m.renderOrder, Math.floor(sphere.center.x / CELL), Math.floor(sphere.center.z / CELL)].join('|');
    if (!groups.has(key)) groups.set(key, []); groups.get(key).push(c);
  }
  const host = new THREE.Group(); host.name = 'static'; root.add(host);
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const items = [];
    for (const {m} of list) {
      if (!m.isInstancedMesh) { items.push({g:m.geometry, M:m.matrixWorld}); continue; }
      for (let j = 0; j < m.count; j++) { m.getMatrixAt(j, m4); const it = {g:m.geometry, M:new THREE.Matrix4().multiplyMatrices(m.matrixWorld, m4)}; if (m.instanceColor) it.color = m.getColorAt(j, new THREE.Color()); items.push(it); }
    }
    const m0 = list[0].m, mm = new THREE.Mesh(mergeWorld(items), m0.material);
    mm.castShadow = m0.castShadow; mm.receiveShadow = m0.receiveShadow; mm.renderOrder = m0.renderOrder; mm.userData.prop = '합침:' + (m0.material.name || m0.material.type); host.add(mm);
    list.forEach(c => { c.done = true; }); out.merged += list.length; out.meshes++;
  }
  // 떼어 낸 메쉬 정리: 소품은 남은 게 없으면 통째로 뺀다
  const byObj = new Map();
  for (const c of cands) if (c.done) { if (c.obj) { if (!byObj.has(c.obj)) byObj.set(c.obj, []); byObj.get(c.obj).push(c.m); } else c.m.removeFromParent(); }
  byObj.forEach((ms, obj) => strip(obj, ms));
}

// ③ 큰 메쉬를 칸으로 자르기
function splitFlagged(out){
  const todo = []; root.traverse(o => { if (o.isMesh && o.userData.split) todo.push(o); });
  for (const m of todo) {
    const {cell = 50, far = 0} = m.userData.split; m.updateWorldMatrix(true, false); const cells = new Map(), add = (k, v, x, z) => { if (!cells.has(k)) cells.set(k, {ids:[], x0:x, x1:x, z0:z, z1:z}); const c = cells.get(k); c.ids.push(v); c.x0 = Math.min(c.x0, x); c.x1 = Math.max(c.x1, x); c.z0 = Math.min(c.z0, z); c.z1 = Math.max(c.z1, z); };
    if (m.isInstancedMesh) {
      for (let j = 0; j < m.count; j++) { m.getMatrixAt(j, m4); v3.setFromMatrixPosition(m4.premultiply(m.matrixWorld)); add(Math.floor(v3.x / cell) + ':' + Math.floor(v3.z / cell), j, v3.x, v3.z); }
      for (const c of cells.values()) { const im = new THREE.InstancedMesh(m.geometry, m.material, c.ids.length);
        c.ids.forEach((j, n) => { m.getMatrixAt(j, m4); im.setMatrixAt(n, m4.premultiply(m.matrixWorld)); if (m.instanceColor) { m.getColorAt(j, col); im.setColorAt(n, col); } });
        im.castShadow = m.castShadow; im.receiveShadow = m.receiveShadow; im.renderOrder = m.renderOrder; im.computeBoundingSphere(); im.userData.prop = '자름:' + (m.material.name || 'inst'); root.add(im); cull(im, c, far); }
    } else {
      const g = m.geometry, P = g.attributes.position, I = g.index, n = I ? I.count : P.count, tri = [0, 0, 0];
      for (let t = 0; t < n; t += 3) { let x = 0, z = 0; for (let k = 0; k < 3; k++) { tri[k] = I ? I.getX(t + k) : t + k; v3.fromBufferAttribute(P, tri[k]).applyMatrix4(m.matrixWorld); x += v3.x / 3; z += v3.z / 3; }
        add(Math.floor(x / cell) + ':' + Math.floor(z / cell), t, x, z); }
      for (const c of cells.values()) { const remap = new Map(), keys = Object.keys(g.attributes), idx = [];
        c.ids.forEach(t => { for (let k = 0; k < 3; k++) { const v = I ? I.getX(t + k) : t + k; if (!remap.has(v)) remap.set(v, remap.size); idx.push(remap.get(v)); } });
        const sub = new THREE.BufferGeometry(), order = [...remap.keys()];
        keys.forEach(k => { const a = g.attributes[k], s = a.itemSize, d = new a.array.constructor(order.length * s); order.forEach((v, i) => { for (let q = 0; q < s; q++) d[i * s + q] = a.array[v * s + q]; }); sub.setAttribute(k, new THREE.BufferAttribute(d, s, a.normalized)); });
        sub.setIndex(idx); sub.applyMatrix4(m.matrixWorld);
        const mm = new THREE.Mesh(sub, m.material); mm.castShadow = m.castShadow; mm.receiveShadow = m.receiveShadow; mm.renderOrder = m.renderOrder; mm.userData.prop = '자름:' + (m.material.name || 'mesh'); root.add(mm); cull(mm, c, far); }
    }
    m.removeFromParent(); out.split++;
  }
  function cull(o, c, far){ if (far) W.cullers.push({o, x:(c.x0 + c.x1) / 2, z:(c.z0 + c.z1) / 2, r:Math.hypot(c.x1 - c.x0, c.z1 - c.z0) / 2 + 2, far}); }
}

export function batchStatic(){
  const out = {props:0, cells:0, merged:0, meshes:0, split:0}, blocked = new Set(), singles = [];
  W.blockers.forEach(b => b.traverse(o => blocked.add(o)));
  // 카메라 가림 상자: 묶기 전에 따로 놓인 소품마다 상자를 잰다 (움직이는 소품 · 카메라 가림 건물은 빼고)
  const bx = new THREE.Box3();
  for (const p of W.placed) { const def = getProp(p.name); if (p.obj.parent !== root || def.dynamic || def.update || def.blocksCamera || blocked.has(p.obj)) continue; p.obj.updateWorldMatrix(true, true); W.camBox(p.name, bx.setFromObject(p.obj)); }
  W.buildCamGrid(); out.camBoxes = W.camBoxes.length;
  instanceRepeats(blocked, singles, out);
  const cands = [];
  for (const p of singles) if (p.obj.parent === root) { const def = getProp(p.name); if (def.update || def.blocksCamera || def.dynamic || blocked.has(p.obj)) continue;
    (p.slots || slotsOf(p.obj)).forEach(s => cands.push({m:s.m, obj:p.obj})); }
  const inProp = o => { for (let x = o.parent; x && x !== root; x = x.parent) if (x.userData.prop) return true; return false; };
  root.traverse(o => { if (o.isMesh && o.userData.prim && !blocked.has(o) && !inProp(o) && visibleUpTo(o, root)) cands.push({m:o, obj:null}); });
  const seen = new Set(); mergeStatics(cands.filter(c => !seen.has(c.m) && seen.add(c.m)), out);
  splitFlagged(out);
  return out;
}
