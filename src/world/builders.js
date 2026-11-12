// 구역 파일에서 쓰는 건물·울타리·바닥 도우미와, 반복 소품 일괄 그리기.
import * as THREE from '../lib/three.js';
import { root } from '../core/engine.js';
import { M, G, glow, flat, box, facadeTex, pillSprite } from '../core/gfx.js';
import { W } from './world.js';
import { buildProp } from '../props/registry.js';

export const zone = (x0, z0, x1, z1, c, mmc, y) => { flat(x0, z0, x1, z1, G(c), y); if (mmc) W.mmRect(x0, z0, x1, z1, mmc); };
export const path = (x0, z0, x1, z1) => { flat(x0, z0, x1, z1, 0xcfdfe3, .035); W.mmRect(x0, z0, x1, z1, '#b9d2d8'); };
export function solid(x0, z0, x1, z1, h, c, y0){ const m = box(x0, z0, x1, z1, h, M(c), y0); W.rect(x0, z0, x1, z1); return m; }

// 건물: kind 'shop'(간판·차양) 또는 'apt'(창문 격자). face는 간판 방향 's'|'n'|'e'|'w'.
export function building(x0, z0, x1, z1, h, o){
  const fi = {e:0, w:1, s:4, n:5}[o.face || 's'], roof = M(0xf8fbfd), side = new THREE.MeshLambertMaterial({color:o.base}), mats = [];
  for (let i = 0; i < 6; i++) {
    if (i === 2) { mats.push(roof); continue; }
    if (i === 3) { mats.push(side); continue; }
    const fw = i < 2 ? z1 - z0 : x1 - x0;
    mats.push(new THREE.MeshLambertMaterial({map:facadeTex(fw, h, o, i === fi ? o.label : null)}));
  }
  const m = box(x0, z0, x1, z1, h, mats); W.blockers.push(m);
  box(x0 - .2, z0 - .2, x1 + .2, z1 + .2, .3, roof, h);
  W.rect(x0, z0, x1, z1); W.mmRect(x0, z0, x1, z1, o.kind === 'shop' ? '#e3cfb2' : '#bfcddb');
  if (o.label && o.mm !== false) W.mmLabel((x0 + x1) / 2, (z0 + z1) / 2, o.label.split(' ')[0], 13);
  return m;
}

// 아파트 동: props/buildings.js의 입체 아파트를 세우고 충돌·미니맵을 등록한다. face는 베란다(남향 면)가 보는 방향.
export function apartment(x0, z0, x1, z1, h, o){
  const ew = o.face === 'e' || o.face === 'w', rot = {s:0, e:Math.PI / 2, n:Math.PI, w:-Math.PI / 2}[o.face || 's'];
  const obj = buildProp('apartment', {w:ew ? z1 - z0 : x1 - x0, d:ew ? x1 - x0 : z1 - z0, h, label:o.label, accent:o.accent});
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, c = Math.cos(rot), s = Math.sin(rot), tx = (dx, dz) => [cx + dx * c + dz * s, cz - dx * s + dz * c];
  obj.position.set(cx, 0, cz); obj.rotation.y = rot; root.add(obj);
  W.blockers.push(obj.userData.body); W.rect(x0, z0, x1, z1);
  for (const r of obj.userData.colliders) { const a = tx(r[0], r[1]), b = tx(r[2], r[3]); W.rect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])); }
  W.mmRect(x0, z0, x1, z1, '#d9cdb8'); if (o.label) W.mmLabel(cx, cz, o.label, 13);
  return obj;
}

// 판상형 아파트 동(props/aptTower.js)을 (cx, cz)에 rot만큼 돌려 세우고 충돌·미니맵·카메라 가림을 등록한다.
export function tower(cx, cz, rot, o){
  const obj = buildProp(o.shape === 'L' ? 'aptTowerL' : 'aptTower', o);
  obj.position.set(cx, 0, cz); obj.rotation.y = rot; root.add(obj); W.blockers.push(obj);
  const c = Math.cos(rot), s = Math.sin(rot), tx = (dx, dz) => [cx + dx * c + dz * s, cz - dx * s + dz * c];
  const rect = r => { const ps = [tx(r[0], r[1]), tx(r[2], r[1]), tx(r[0], r[3]), tx(r[2], r[3])];
    return [Math.min(...ps.map(p => p[0])), Math.min(...ps.map(p => p[1])), Math.max(...ps.map(p => p[0])), Math.max(...ps.map(p => p[1]))]; };
  obj.userData.colliders.forEach(r => { const q = rect(r); W.rect(q[0], q[1], q[2], q[3]); });
  (obj.userData.circles || []).forEach(k => { const q = tx(k[0], k[1]); W.circle(q[0], q[1], k[2]); });
  if (obj.userData.heightAt) W.addHeight((x, z) => { const dx = x - cx, dz = z - cz; return obj.userData.heightAt(dx * c - dz * s, dx * s + dz * c); });   // 현관 계단·경사로
  obj.userData.footprints.forEach(r => { const q = rect(r); W.mmRect(q[0], q[1], q[2], q[3], '#a9b4c0'); });
  if (o.label) W.mmLabel(cx, cz, o.label, 13);
  obj.userData.rects = obj.userData.colliders.map(rect);
  return obj;
}

export function fence(x0, z0, x1, z1, h, c, collide){
  const len = Math.hypot(x1 - x0, z1 - z0), along = Math.abs(x1 - x0) > Math.abs(z1 - z0), gy = W.groundY(x0, z0);
  if (along) { box(Math.min(x0,x1), z0 - .06, Math.max(x0,x1), z0 + .06, .12, M(c), gy + h - .25); box(Math.min(x0,x1), z0 - .06, Math.max(x0,x1), z0 + .06, .1, M(c), gy + h * .45); }
  else { box(x0 - .06, Math.min(z0,z1), x0 + .06, Math.max(z0,z1), .12, M(c), gy + h - .25); box(x0 - .06, Math.min(z0,z1), x0 + .06, Math.max(z0,z1), .1, M(c), gy + h * .45); }
  const n = Math.max(1, Math.round(len / 3));
  for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; box(x - .08, z - .08, x + .08, z + .08, h, M(c), W.groundY(x, z)); }
  if (collide) along ? W.rect(Math.min(x0,x1), z0 - .4, Math.max(x0,x1), z0 + .4) : W.rect(x0 - .4, Math.min(z0,z1), x0 + .4, Math.max(z0,z1));
}

function instanced(geo, mat, list, place, shadows){
  const m = new THREE.InstancedMesh(geo, mat, list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  list.forEach((t, i) => { place(t, p, s); m.setMatrixAt(i, m4.compose(p, q, s)); });
  m.castShadow = shadows !== false; m.receiveShadow = true; m.frustumCulled = false; root.add(m); return m;
}
// 나무·전나무·가로등을 인스턴스로 그린다. 모든 구역을 지은 뒤 한 번만 호출.
export function finalizeBatches(){
  const T = W.trees, P = W.pines, L = W.lamps;
  instanced(new THREE.CylinderGeometry(.22,.3,1.7,7), M(0x9a8372), T, (t, p, s) => { p.set(t[0], t[2] + .85, t[1]); s.set(1, 1, 1); });
  instanced(new THREE.SphereGeometry(1.5,12,9), M(0xcfe0d6), T, (t, p, s) => { p.set(t[0], t[2] + 2.6 * t[3], t[1]); s.setScalar(t[3]); });
  instanced(new THREE.SphereGeometry(1.3,12,7), M(0xf8fbfd), T, (t, p, s) => { p.set(t[0], t[2] + 3.15 * t[3], t[1]); s.set(t[3], t[3] * .6, t[3]); });
  instanced(new THREE.CylinderGeometry(.18,.24,1.4,6), M(0x8a6f5a), P, (t, p, s) => { p.set(t[0], t[2] + .7 * t[3], t[1]); s.setScalar(t[3]); });
  [[1.9,2.6,0xb9cfc4,2.3],[1.4,2.3,0xc9dbd2,3.6],[.9,1.8,0xf8fbfd,4.8]].forEach(c =>
    instanced(new THREE.ConeGeometry(c[0], c[1], 8), M(c[2]), P, (t, p, s) => { p.set(t[0], t[2] + c[3] * t[3], t[1]); s.setScalar(t[3]); }));
  instanced(new THREE.CylinderGeometry(.07,.1,3.6,7), M(0x6b7684), L, (t, p, s) => { p.set(t[0], W.groundY(t[0], t[1]) + 1.8, t[1]); s.set(1, 1, 1); });
  instanced(new THREE.SphereGeometry(.28,10,8), glow(0xffe9b0), L, (t, p, s) => { p.set(t[0], W.groundY(t[0], t[1]) + 3.7, t[1]); s.set(1, 1, 1); }, false);
}

// 놀이 장소 위에 떠 있는 안내 표지
export const spotLabels = [];
export function spotLabel(text, x, y, z){ const s = pillSprite(text, 'rgba(47,127,140,.92)', '#fff', 1.25); s.position.set(x, y, z); s.userData.y = y; root.add(s); spotLabels.push(s); return s; }
