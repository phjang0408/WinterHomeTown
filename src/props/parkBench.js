// 공원 벤치 (새 방식 예시)
// 길이 1.8m · 좌판 높이 0.44m · 깊이 0.62m. 원점은 바닥 중심, 앉은 사람은 +z를 본다.
// 만드는 순서:
//   1) 좌판·등받이 곡선 하나(SEAT)를 정한다.
//   2) 각재 9개는 그 곡선 위 호 길이 위치에 법선 방향으로 놓고, 받침 레일은 같은 곡선을 안쪽으로 밀어서 만든다.
//      → 각재와 레일이 항상 맞물린다.
//   3) 틀은 둥근 사각 단면을 곡선을 따라 쓸어(sweep) 만들고, 발판은 윤곽을 둥글게 압출한다.
//   4) 정점 색으로 가짜 AO를 굽고, 각재마다 색조를 조금씩 바꾼다.
//   5) 틀 2개·각재 9개는 인스턴스로 묶어 그리기 3회, 재질 3개(도장 철·나무·눈).
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { curveZY, roundedRect, mound, sweep, extrudeProfile, merge, bakeAO, groundAO, triCount } from '../core/meshkit.js';
import { woodMaterial, paintMaterial, snowMaterial } from '../core/texkit.js';
import { UNIT } from '../config.js';

const LEN = 1.8, FRAME_X = .72;            // 각재 길이, 틀 위치(중심에서)
const SLAT_T = .022, SLAT_W = .072;        // 각재 두께·폭
const RAIL_W = .04, RAIL_H = .046;         // 틀 단면
// 좌판 앞끝 → 등받이 위끝. (z, y) 미터. 각재 아랫면이 이 선에 닿는다.
const SEAT = [[.31, .40], [.22, .415], [.08, .42], [-.06, .425], [-.15, .45], [-.205, .52], [-.235, .62], [-.265, .74], [-.29, .86]];
const ARM = [[.27, 0], [.268, .18], [.271, .38], [.275, .5], [.27, .6], [.235, .652], [.12, .664], [0, .66], [-.12, .655], [-.225, .64]];
const REAR = [[-.30, 0], [-.272, .2], [-.228, .37], [-.19, .43]];

const DETAIL = {
  low:      {seg:2, k:.6, tex:.5},
  standard: {seg:3, k:1,  tex:1},
};

// 곡선 위 s(미터) 지점의 위치·접선·법선 (법선은 앉는 쪽: 좌판은 위, 등받이는 앞)
function frameAt(curve, len, s){
  const t = Math.min(1, Math.max(0, s / len)), p = curve.getPointAt(t), d = curve.getTangentAt(t);
  return {z:p.z, y:p.y, tz:d.z, ty:d.y, nz:d.y, ny:-d.z};
}
// 곡선을 법선 반대쪽으로 d만큼 민 새 곡선 (받침 레일)
function offsetCurve(curve, len, d, n = 24){
  const pts = []; for (let i = 0; i <= n; i++) { const f = frameAt(curve, len, i / n * len); pts.push([f.z - f.nz * d, f.y - f.ny * d]); }
  return curveZY(pts);
}

function buildBench(o = {}){
  const D = DETAIL[o.detail] || DETAIL.standard, seed = o.seed || 1;
  const seat = curveZY(SEAT), seatLen = seat.getLength(), X = new THREE.Vector3(1, 0, 0);
  const sec = roundedRect(RAIL_W, RAIL_H, .013, D.seg), segs = n => Math.max(6, Math.round(n * D.k));

  // 틀 (한쪽): 받침 레일 + 앞다리·팔걸이 + 뒷다리 + 발판 → 하나로 합침
  const rail = sweep(offsetCurve(seat, seatLen, RAIL_H / 2 + .002), sec, {segments:segs(28), up:X});
  const arm = sweep(curveZY(ARM), sec, {segments:segs(36), up:X});
  const rear = sweep(curveZY(REAR), sec, {segments:segs(14), up:X});
  const foot = s => { const sh = new THREE.Shape(); sh.moveTo(-.06, 0); sh.lineTo(.06, 0); sh.quadraticCurveTo(.05, .03, .02, .032); sh.lineTo(-.02, .032); sh.quadraticCurveTo(-.05, .03, -.06, 0);
    const g = extrudeProfile(sh, .058, {bevel:.004, bevelSegments:2, curveSegments:8}); g.translate(0, 0, s); return g; };
  const frameGeo = merge([rail, arm, rear, foot(.27), foot(-.30)]);
  bakeAO(frameGeo, groundAO(.3, .55));

  // 각재: 둥근 단면을 x축으로 쓸고 가운데를 1.5mm 처지게 한다.
  const slatPath = new THREE.CatmullRomCurve3([new THREE.Vector3(-LEN / 2, 0, 0), new THREE.Vector3(0, -.0015, 0), new THREE.Vector3(LEN / 2, 0, 0)]);
  const slatGeo = sweep(slatPath, roundedRect(SLAT_T, SLAT_W, .006, D.seg), {segments:segs(8), up:new THREE.Vector3(0, 1, 0)});
  bakeAO(slatGeo, (P, N) => (.84 + .16 * (N.y * .5 + .5)) * (Math.abs(Math.abs(P.x) - FRAME_X) < .05 ? .86 : 1));   // 아랫면·틀에 닿는 곳을 어둡게

  // 각재 위치: 좌판 5개(앞에서부터), 등받이 4개(위에서부터)
  const at = []; for (let i = 0; i < 5; i++) at.push(.036 + i * .079);
  for (let i = 0; i < 4; i++) at.push(seatLen - .04 - i * .088);

  const paint = paintMaterial(o.frameColor || 0x2f3b36, {seed:seed + 20}), wood = woodMaterial({seed:seed + 10, scale:D.tex}), snow = snowMaterial({seed:seed + 30});
  const g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(UNIT); g.add(inner);

  const frames = new THREE.InstancedMesh(frameGeo, paint, 2), m4 = new THREE.Matrix4();
  frames.setMatrixAt(0, m4.makeTranslation(-FRAME_X, 0, 0)); frames.setMatrixAt(1, m4.makeTranslation(FRAME_X, 0, 0));
  const slats = new THREE.InstancedMesh(slatGeo, wood, at.length), c = new THREE.Color(), rnd = mulberry(seed);
  const Yl = new THREE.Vector3(), Zl = new THREE.Vector3(), P = new THREE.Vector3();
  at.forEach((s, i) => { const f = frameAt(seat, seatLen, s);
    Yl.set(0, f.ny, f.nz); Zl.set(0, -f.ty, -f.tz); P.set(0, f.y + f.ny * SLAT_T / 2, f.z + f.nz * SLAT_T / 2);
    m4.makeBasis(X, Yl, Zl).setPosition(P); slats.setMatrixAt(i, m4);
    const k = .88 + rnd() * .2; slats.setColorAt(i, c.setRGB(k, k * (.97 + rnd() * .05), k * (.95 + rnd() * .06))); });

  // 눈: 팔걸이 윗면 두 줄 + 등받이 맨 윗 각재 윗변
  const armTop = curveZY(ARM.slice(4).map(([z, y]) => [z, y + RAIL_H / 2 - .002]));
  const pile = mound(.05, .03, 8), snowParts = [];
  [-FRAME_X, FRAME_X].forEach(x => { const s = sweep(armTop, pile, {segments:segs(20), up:new THREE.Vector3(-1, 0, 0)}); s.translate(x, 0, 0); snowParts.push(s); });
  const top = frameAt(seat, seatLen, at[5]), up = new THREE.Vector3(0, top.ty, top.tz);
  const edge = new THREE.Vector3(0, top.y + top.ny * SLAT_T / 2 + top.ty * SLAT_W / 2 - .003, top.z + top.nz * SLAT_T / 2 + top.tz * SLAT_W / 2 - .003);
  const ridge = new THREE.LineCurve3(new THREE.Vector3(-LEN / 2 + .05, 0, 0).add(edge), new THREE.Vector3(LEN / 2 - .05, 0, 0).add(edge));
  snowParts.push(sweep(ridge, mound(.03, .022, 8).map(p => new THREE.Vector2(p.y, p.x)), {segments:8, up}));
  const snowMesh = new THREE.Mesh(merge(snowParts), snow);

  for (const m of [frames, slats, snowMesh]) { m.castShadow = m.receiveShadow = true; inner.add(m); }
  if (o.snow === false) snowMesh.visible = false;
  g.userData.info = {tris:triCount(g), draws:3, materials:3, sizeMeters:[LEN, .86, .62]};
  return g;
}
function mulberry(seed){ let t = seed >>> 0; return () => { t = (t + 0x6D2B79F5) >>> 0; let r = Math.imul(t ^ (t >>> 15), t | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

defineProp('bench', {
  label:'공원 벤치', category:'쉼터', isNewStyle:true,
  colliders:[{r:[-.92 * UNIT, -.34 * UNIT, .92 * UNIT, .33 * UNIT]}],
  build:buildBench,
});
