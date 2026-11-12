// 메쉬 도구: 상자를 쌓는 대신 윤곽선·단면·곡선으로 형태를 만든다.
// 모든 함수는 미터 단위로 쓰고, 소품에서 UNIT을 곱해 게임 단위로 바꾼다.
import * as THREE from '../lib/three.js';

const V2 = (x, y) => new THREE.Vector2(x, y);

// (z, y) 점들을 지나는 매끄러운 곡선. 점 사이가 들쭉날쭉해도 고르게 휘도록 centripetal을 쓴다.
export function curveZY(points, x = 0){
  return new THREE.CatmullRomCurve3(points.map(([z, y]) => new THREE.Vector3(x, y, z)), false, 'centripetal', .5);
}

// 모서리가 둥근 직사각형 단면 (가로 w, 세로 h, 반지름 r). 반시계 방향 점 목록.
export function roundedRect(w, h, r, seg = 3){
  const pts = [], hw = w / 2 - r, hh = h / 2 - r;
  [[hw, hh, 0], [-hw, hh, Math.PI / 2], [-hw, -hh, Math.PI], [hw, -hh, Math.PI * 1.5]].forEach(([cx, cy, a0]) => {
    for (let i = 0; i <= seg; i++) { const a = a0 + i / seg * Math.PI / 2; pts.push(V2(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); }
  });
  return pts;
}
// 아래는 평평하고 위는 둥근 단면 (눈 쌓인 모양)
export function mound(w, h, seg = 10){
  const pts = [V2(w / 2, 0)];
  for (let i = 1; i < seg; i++) { const a = i / seg * Math.PI; pts.push(V2(Math.cos(a) * w / 2, Math.sin(a) * h * (.85 + .15 * Math.sin(a)))); }
  pts.push(V2(-w / 2, 0)); return pts;
}

// 단면을 곡선을 따라 쓸어 만든다. 단면의 x는 곡선의 법선, y는 종법선 방향.
// up을 주면 법선 대신 그 방향을 기준으로 단면을 세운다 (곧은 선분용).
export function sweep(curve, section, {segments = 32, caps = true, up = null} = {}){
  const n = section.length, pos = [], uv = [], idx = [];
  const fr = up ? null : curve.computeFrenetFrames(segments, false);
  const len = curve.getLength(), per = [0];
  for (let j = 1; j <= n; j++) per.push(per[j - 1] + section[j % n].distanceTo(section[j - 1]));
  const P = new THREE.Vector3(), T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3();
  const frame = i => {
    curve.getPointAt(i / segments, P);
    if (up) { curve.getTangentAt(i / segments, T); B.crossVectors(T, up).normalize(); N.crossVectors(B, T).normalize(); }
    else { N.copy(fr.normals[i]); B.copy(fr.binormals[i]); }
  };
  for (let i = 0; i <= segments; i++) {
    frame(i);
    for (let j = 0; j < n; j++) { const s = section[j]; pos.push(P.x + N.x * s.x + B.x * s.y, P.y + N.y * s.x + B.y * s.y, P.z + N.z * s.x + B.z * s.y); uv.push(i / segments * len, per[j]); }
  }
  for (let i = 0; i < segments; i++) for (let j = 0; j < n; j++) {
    const a = i * n + j, b = i * n + (j + 1) % n, c = a + n, d = b + n; idx.push(a, c, b, b, c, d);
  }
  // 단면 방향(시계/반시계)에 따라 면이 안쪽을 볼 수 있으므로, 첫 고리에서 바깥을 보는지 확인하고 뒤집는다.
  const ring0 = new THREE.Vector3(); for (let j = 0; j < n; j++) ring0.add(new THREE.Vector3(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2])); ring0.divideScalar(n);
  const v = j => new THREE.Vector3(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
  const fn = new THREE.Vector3().crossVectors(v(n).sub(v(0)), v(1).sub(v(0)));
  if (fn.dot(v(0).sub(ring0).add(v(1)).sub(ring0)) < 0) for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
  const body = new THREE.BufferGeometry();
  body.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); body.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); body.setIndex(idx);
  body.computeVertexNormals();
  if (!caps) return body;
  // 양 끝 마개: 모서리가 또렷하도록 정점을 따로 두고, 법선은 곡선 진행 방향으로 둔다.
  const tri = THREE.ShapeUtils.triangulateShape(section, []), parts = [body];
  for (const end of [0, segments]) {
    frame(end); curve.getTangentAt(end / segments, T); if (end === 0) T.negate();
    const p = [], nn = [], u = [], ix = [];
    for (let j = 0; j < n; j++) { const s = section[j]; p.push(P.x + N.x * s.x + B.x * s.y, P.y + N.y * s.x + B.y * s.y, P.z + N.z * s.x + B.z * s.y); nn.push(T.x, T.y, T.z); u.push(s.x, s.y); }
    const q = k => new THREE.Vector3(p[k * 3], p[k * 3 + 1], p[k * 3 + 2]);
    for (const t of tri) { const f = new THREE.Vector3().crossVectors(q(t[1]).sub(q(t[0])), q(t[2]).sub(q(t[0]))); f.dot(T) >= 0 ? ix.push(t[0], t[1], t[2]) : ix.push(t[0], t[2], t[1]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2)); g.setIndex(ix); parts.push(g);
  }
  return merge(parts);
}

// 옆모습 윤곽(THREE.Shape, 구멍 포함)에 두께를 주고 모서리를 둥글게 깎는다. 결과는 x축 방향으로 두께가 난다.
export function extrudeProfile(shape, depth, {bevel = .004, bevelSegments = 3, curveSegments = 16} = {}){
  const g = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled:bevel > 0, bevelThickness:bevel, bevelSize:bevel, bevelSegments, curveSegments});
  g.rotateY(-Math.PI / 2); g.translate(depth / 2, 0, 0);
  return g;
}

// 여러 지오메트리를 하나로 합친다 (그리기 횟수 줄이기). position·normal·uv·color만 남긴다.
export function merge(list){
  const pos = [], nor = [], uv = [], col = [], idx = []; let base = 0;
  const hasColor = list.some(g => g.getAttribute('color'));
  for (const g of list) {
    const p = g.getAttribute('position'), n = g.getAttribute('normal'), t = g.getAttribute('uv'), c = g.getAttribute('color');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i));
      uv.push(t ? t.getX(i) : 0, t ? t.getY(i) : 0);
      if (hasColor) col.push(c ? c.getX(i) : 1, c ? c.getY(i) : 1, c ? c.getZ(i) : 1);
    }
    const ix = g.getIndex(); if (ix) for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + base); else for (let i = 0; i < p.count; i++) idx.push(i + base);
    base += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); if (hasColor) out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.setIndex(idx); return out;
}

// 가짜 AO: 정점마다 밝기를 곱해 정점 색으로 굽는다. fn(위치, 법선) → 0~1.
// 재질에 vertexColors: true 를 켜야 보인다.
export function bakeAO(g, fn){
  const p = g.getAttribute('position'), n = g.getAttribute('normal'), old = g.getAttribute('color'), c = new Float32Array(p.count * 3);
  const P = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    P.fromBufferAttribute(p, i); N.fromBufferAttribute(n, i); const k = Math.max(0, Math.min(1, fn(P, N)));
    for (let a = 0; a < 3; a++) c[i * 3 + a] = (old ? old.getComponent(i, a) : 1) * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}
// 자주 쓰는 AO 규칙: 바닥에 가까울수록, 아래를 향한 면일수록 어둡게.
export const groundAO = (fade = .25, floor = .62) => (P, N) => (floor + (1 - floor) * Math.min(1, Math.max(0, P.y / fade))) * (.82 + .18 * (N.y * .5 + .5));

export function triCount(obj){ let t = 0; obj.traverse(m => { if (m.isMesh) { const g = m.geometry, n = g.index ? g.index.count / 3 : g.getAttribute('position').count / 3; t += n * (m.isInstancedMesh ? m.count : 1); } }); return Math.round(t); }

// ───────── 추가 도구 (단지 소품용) ─────────
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// 면 방향이 법선과 반대로 감겨 있으면 전체를 뒤집는다.
export function fixWinding(g){
  const p = g.getAttribute('position'), n = g.getAttribute('normal'), ix = g.getIndex(); if (!ix || !n) return g;
  const a = V3(), b = V3(), c = V3(), f = V3(), m = V3(), t = V3(); let s = 0;
  for (let k = 0; k < ix.count; k += 3) { const i0 = ix.getX(k), i1 = ix.getX(k + 1), i2 = ix.getX(k + 2);
    a.fromBufferAttribute(p, i0); b.fromBufferAttribute(p, i1); c.fromBufferAttribute(p, i2); f.crossVectors(b.sub(a), c.sub(a));
    m.fromBufferAttribute(n, i0).add(t.fromBufferAttribute(n, i1)).add(t.fromBufferAttribute(n, i2)); s += f.dot(m); }
  if (s < 0) { const arr = ix.array; for (let k = 0; k < arr.length; k += 3) { const q = arr[k + 1]; arr[k + 1] = arr[k + 2]; arr[k + 2] = q; } ix.needsUpdate = true; }
  return g;
}

// 고리(점 목록)들을 차례로 이어 껍질을 만든다 (자동차 몸통, 휘는 벽, 통 등). 모든 고리의 점 수가 같아야 한다.
//   closed: 고리가 닫힌 단면인지.  caps: 양 끝을 막을지.  facing: 열린 띠일 때 면이 향할 대략의 방향.
export function loft(rings, {closed = true, caps = true, facing = null} = {}){
  const m = rings.length, n0 = rings[0].length, n = closed ? n0 + 1 : n0, pos = [], uv = [], idx = [];
  let acc = 0;
  for (let i = 0; i < m; i++) {
    if (i) { let d = 0; for (let j = 0; j < n0; j++) d += rings[i][j].distanceTo(rings[i - 1][j]); acc += d / n0; }
    let per = 0;
    for (let j = 0; j < n; j++) { const p = rings[i][j % n0]; if (j) per += p.distanceTo(rings[i][j - 1]); pos.push(p.x, p.y, p.z); uv.push(acc, per); }
  }
  for (let i = 0; i < m - 1; i++) for (let j = 0; j < n - 1; j++) { const a = i * n + j, b = a + 1, c = a + n, d = c + 1; idx.push(a, c, b, b, c, d); }
  // 바깥을 보도록 방향 맞추기
  const P = k => V3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]); let s = 0;
  for (let i = 0; i < m - 1; i++) { const cen = V3(); if (!facing) { for (let j = 0; j < n0; j++) cen.add(rings[i][j]).add(rings[i + 1][j]); cen.divideScalar(n0 * 2); }
    for (let j = 0; j < n - 1; j++) { const a = P(i * n + j), b = P(i * n + j + 1), c = P((i + 1) * n + j), f = V3().crossVectors(c.clone().sub(a), b.clone().sub(a));
      s += facing ? f.dot(facing) : f.dot(a.add(b).add(c).divideScalar(3).sub(cen)); } }
  if (s < 0) for (let k = 0; k < idx.length; k += 3) { const q = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = q; }
  const body = new THREE.BufferGeometry();
  body.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); body.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); body.setIndex(idx);
  body.computeVertexNormals();
  if (closed) { const nr = body.getAttribute('normal'); for (let i = 0; i < m; i++) { const a = i * n, b = a + n - 1, x = nr.getX(a) + nr.getX(b), y = nr.getY(a) + nr.getY(b), z = nr.getZ(a) + nr.getZ(b), l = Math.hypot(x, y, z) || 1;
    nr.setXYZ(a, x / l, y / l, z / l); nr.setXYZ(b, x / l, y / l, z / l); } }
  if (!closed || !caps) return body;
  const parts = [body];
  for (const [ring, other] of [[rings[0], rings[1]], [rings[m - 1], rings[m - 2]]]) {
    const cen = V3(), oc = V3(), nrm = V3(); ring.forEach(p => cen.add(p)); cen.divideScalar(n0); other.forEach(p => oc.add(p)); oc.divideScalar(n0);
    for (let j = 0; j < n0; j++) { const a = ring[j], b = ring[(j + 1) % n0]; nrm.x += (a.y - b.y) * (a.z + b.z); nrm.y += (a.z - b.z) * (a.x + b.x); nrm.z += (a.x - b.x) * (a.y + b.y); }
    if (nrm.lengthSq() < 1e-12) continue; nrm.normalize(); if (nrm.dot(cen.clone().sub(oc)) < 0) nrm.negate();
    const ux = V3().crossVectors(Math.abs(nrm.y) < .9 ? V3(0, 1, 0) : V3(1, 0, 0), nrm).normalize(), uy = V3().crossVectors(nrm, ux);
    const flat = ring.map(p => new THREE.Vector2(p.clone().sub(cen).dot(ux), p.clone().sub(cen).dot(uy))), tri = THREE.ShapeUtils.triangulateShape(flat.slice(), []);
    const cp = [], cn = [], cu = [], ci = []; ring.forEach((p, j) => { cp.push(p.x, p.y, p.z); cn.push(nrm.x, nrm.y, nrm.z); cu.push(flat[j].x, flat[j].y); });
    for (const t of tri) { const f = V3().crossVectors(ring[t[1]].clone().sub(ring[t[0]]), ring[t[2]].clone().sub(ring[t[0]])); f.dot(nrm) >= 0 ? ci.push(t[0], t[1], t[2]) : ci.push(t[0], t[2], t[1]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(cn, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(cu, 2)); g.setIndex(ci); parts.push(g);
  }
  return merge(parts);
}

// 굵기가 변할 수 있는 둥근 관. path는 곡선(THREE.Curve) 또는 점 목록, radius는 숫자 또는 t(0~1) → 반지름 함수.
export function tube(path, radius, {radial = 8, segments = 8, caps = true} = {}){
  const pts = Array.isArray(path) ? path : path.getSpacedPoints(segments), m = pts.length, rf = typeof radius === 'function' ? radius : () => radius;
  const T = i => pts[Math.min(m - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
  let t0 = T(0), N = V3().crossVectors(t0, Math.abs(t0.y) < .9 ? V3(0, 1, 0) : V3(1, 0, 0)).normalize();
  const rings = [];
  for (let i = 0; i < m; i++) { const t = T(i); N.sub(t.clone().multiplyScalar(N.dot(t))).normalize(); const B = V3().crossVectors(t, N), r = rf(i / (m - 1)), ring = [];
    for (let j = 0; j < radial; j++) { const a = j / radial * Math.PI * 2; ring.push(pts[i].clone().addScaledVector(N, Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r)); } rings.push(ring); }
  return loft(rings, {closed:true, caps});
}

// 프로필([반지름, 높이] 목록, 아래에서 위로)을 y축으로 돌려 만든 회전체.
export function lathe(profile, seg = 20){
  return fixWinding(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), seg));
}

// 모든 모서리가 둥근 상자. 중심이 원점.
export function roundedBox(w, h, d, r = .02, seg = 2){
  r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  const sh = new THREE.Shape(), a = w / 2 - r, b = h / 2 - r; sh.moveTo(-a, -b); sh.lineTo(a, -b); sh.lineTo(a, b); sh.lineTo(-a, b); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, {depth:d - 2 * r, bevelEnabled:true, bevelThickness:r, bevelSize:r, bevelSegments:seg, curveSegments:seg > 1 ? 4 : 1});
  g.translate(0, 0, -(d - 2 * r) / 2); return g;
}
// 위를 보는 평면. uv는 미터 단위 (x, z).
export function flatXZ(x0, z0, x1, z1, y = 0){
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([x0,y,z0, x0,y,z1, x1,y,z1, x1,y,z0], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([0,1,0, 0,1,0, 0,1,0, 0,1,0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([x0,z0, x0,z1, x1,z1, x1,z0], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); return g;
}

// 지오메트리 전체에 색을 입힌다 (정점 색). 이미 색이 있으면 곱한다.
const tc = new THREE.Color();
export function tint(g, hex){
  tc.setHex(hex); const p = g.getAttribute('position'), old = g.getAttribute('color'), c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { c[i * 3] = tc.r * (old ? old.getX(i) : 1); c[i * 3 + 1] = tc.g * (old ? old.getY(i) : 1); c[i * 3 + 2] = tc.b * (old ? old.getZ(i) : 1); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}
// 옮기고 돌리기 (돌린 다음 옮긴다). 각도는 라디안.
export function xf(g, {x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1} = {}){
  if (s !== 1) g.scale(s, s, s); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); g.translate(x, y, z); return g;
}
// 좌우(x)를 뒤집은 복사본. flipU면 글자가 뒤집히지 않게 uv도 뒤집는다.
export function mirrorX(g, flipU = false){
  const o = g.clone(), p = o.getAttribute('position'), n = o.getAttribute('normal'), u = o.getAttribute('uv');
  for (let i = 0; i < p.count; i++) { p.setX(i, -p.getX(i)); if (n) n.setX(i, -n.getX(i)); if (flipU && u) u.setX(i, 1 - u.getX(i)); }
  let ix = o.getIndex(); if (!ix) { o.setIndex([...Array(p.count).keys()]); ix = o.getIndex(); }
  const a = ix.array; for (let k = 0; k < a.length; k += 3) { const q = a[k + 1]; a[k + 1] = a[k + 2]; a[k + 2] = q; }
  return o;
}

// uv를 미터 단위로 다시 편다 (면이 보는 방향에 따라 x·y·z 중 두 축을 고른다). 상자류에 타일 무늬가 고르게 입혀진다.
export function uvMeters(g){
  const p = g.getAttribute('position'), n = g.getAttribute('normal'), uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) { uv[i * 2] = p.getX(i); uv[i * 2 + 1] = p.getZ(i); } else if (ax >= az) { uv[i * 2] = p.getZ(i); uv[i * 2 + 1] = p.getY(i); } else { uv[i * 2] = p.getX(i); uv[i * 2 + 1] = p.getY(i); } }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
// 두 구석 좌표로 만드는 상자. r > 0 이면 모서리를 둥글게 깎는다. uv는 미터 단위.
export function box(x0, y0, z0, x1, y1, z1, r = 0){
  const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), d = Math.abs(z1 - z0), g = r > 0 ? roundedBox(w, h, d, r, r < .03 ? 1 : 2) : new THREE.BoxGeometry(w, h, d);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return uvMeters(g);
}
// 꺾인 선의 모서리를 둥글게 굴린 점 목록 (난간·파이프용).
export function fillet(pts, r = .05, seg = 4){
  const out = [pts[0].clone()];
  for (let i = 1; i < pts.length - 1; i++) { const a = pts[i - 1], b = pts[i], c = pts[i + 1], d0 = b.distanceTo(a), d1 = b.distanceTo(c), d = Math.min(r, d0 * .49, d1 * .49);
    if (d < 1e-4) { out.push(b.clone()); continue; }
    const p0 = b.clone().lerp(a, d / d0), p1 = b.clone().lerp(c, d / d1);
    for (let k = 0; k <= seg; k++) { const t = k / seg, u = 1 - t; out.push(V3(u * u * p0.x + 2 * u * t * b.x + t * t * p1.x, u * u * p0.y + 2 * u * t * b.y + t * t * p1.y, u * u * p0.z + 2 * u * t * b.z + t * t * p1.z)); } }
  out.push(pts[pts.length - 1].clone()); return out;
}
// 점들을 따라 쌓인 눈 이랑 (아래는 평평, 위는 둥글다). 양 끝은 가늘어진다.
export function ridge(pts, w, h, seg = 6){
  const m = pts.length, rings = pts.map((p, i) => { const t = pts[Math.min(m - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]), lat = V3(t.z, 0, -t.x).normalize(), k = i === 0 || i === m - 1 ? .4 : 1, ring = [];
    for (let j = 0; j <= seg; j++) { const a = j / seg * Math.PI; ring.push(p.clone().addScaledVector(lat, Math.cos(a) * w / 2 * (.6 + .4 * k)).add(V3(0, Math.sin(a) * h * k, 0))); } return ring; });
  return loft(rings, {closed:true, caps:true});
}
// 재질별로 지오메트리를 모았다가 한 번에 합치는 통.
export class Parts {
  constructor(){ this.m = {}; }
  add(key, g, hex){ if (hex !== undefined) tint(g, hex); (this.m[key] || (this.m[key] = [])).push(g); return g; }
  has(key){ return !!(this.m[key] && this.m[key].length); }
  geo(key){ const g = merge(this.m[key]); if (!g.getAttribute('color')) tint(g, 0xffffff); return g; }
  mesh(key, mat, {cast = true, receive = true} = {}){ const m = new THREE.Mesh(this.geo(key), mat); m.castShadow = cast; m.receiveShadow = receive; m.name = key; return m; }
}
// 반구 모양 눈더미·둥근 관목 (아래가 평평한 타원 돔).
export function dome(rx, h, rz = rx, seg = 14){
  const g = new THREE.SphereGeometry(1, seg, Math.max(4, Math.round(seg / 2)), 0, Math.PI * 2, 0, Math.PI / 2); g.scale(rx, h, rz); return g;
}
// 울퉁불퉁한 둥근 덩어리 (관목·눈더미·자루). 아래가 평평한 돔을 시드에 따라 살짝 일그러뜨린다.
export function blob(rx, h, rz = rx, {seed = 1, bump = .12, seg = 16} = {}){
  const g = new THREE.SphereGeometry(1, seg, Math.max(5, Math.round(seg * .55)), 0, Math.PI * 2, 0, Math.PI * .56), p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + bump * (Math.sin(x * 5.1 + seed * 1.7) * Math.cos(z * 4.3 + seed * 2.3) + .6 * Math.sin(y * 7 + x * 3 + seed)) * (y > .98 ? 0 : 1);
    p.setXYZ(i, x * k * rx, Math.max(0, (y + .19) / 1.19) * h * (.92 + .08 * k), z * k * rz); }
  g.computeVertexNormals(); return g;
}
