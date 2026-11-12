// 차량: 승용차(세단), SUV, 1톤 트럭, 택배 탑차.
// 몸통은 앞뒤로 늘어선 단면 고리(둥근 모서리)를 이어 만든다(loft). 바퀴 자리는 고리 아랫변을 반원으로 들어 올려 실제로 파낸다.
// 그리기 5회: 도장(차체) · 광택(유리·등·휠) · 무광(타이어·그릴·고무) · 눈 · 번호판 그림. 미터 단위, 앞이 +z.
// 색은 o.color. 여러 대를 한꺼번에 놓을 때(W.placeMany)는 차체 메쉬(userData.tint)에 인스턴스 색이 곱해진다.
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { canvasTex } from '../core/gfx.js';
import { box, loft, tube, lathe, fillet, xf, bakeAO, triCount, Parts, blob } from '../core/meshkit.js';
import { carPaintMaterial, glassMaterial, matteMaterial, snowMaterial, decalMaterial } from '../core/texkit.js';
import { UNIT, FONT_D } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), K = 3;
const C = {glass:0x1d2730, tire:0x1d1f22, dark:0x14171a, trim:0x2b2f34, rim:0xc3c9ce, head:0xeef3f6, tail:0xb5261f, amber:0xe59a2b, plate:0xf3f3ef, chrome:0xd9dee2};

// [z, 값] 점들을 지나는 매끄러운 옆모습 곡선 → z로 값을 찾는 함수
function prof(points){
  const pts = new THREE.CatmullRomCurve3(points.map(([z, v]) => V(0, v, z)), false, 'centripetal').getPoints(200);
  return z => { if (z <= pts[0].z) return pts[0].y; for (let i = 1; i < pts.length; i++) if (z <= pts[i].z) { const a = pts[i - 1], b = pts[i]; return a.y + (b.y - a.y) * (z - a.z) / Math.max(1e-6, b.z - a.z); } return pts[pts.length - 1].y; };
}
// 아래 몸통 단면: 위 모서리 rt, 아래 모서리 rb, 윗면은 가운데가 crown만큼 볼록. 점 20개 (윗면: 7~11번)
function ring(z, hw, yb, yt, rt, rb, crown){
  const pts = [], arc = (cx, cy, r, a0) => { for (let i = 0; i <= K; i++) { const a = a0 + i / K * Math.PI / 2; pts.push(V(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z)); } };
  rt = Math.min(rt, (yt - yb) * .45, hw * .45); rb = Math.min(rb, (yt - yb) * .45);
  arc(hw - rb, yb + rb, rb, -Math.PI / 2); arc(hw - rt, yt - rt, rt, 0);
  pts.push(V(hw * .45, yt + crown * .8, z), V(0, yt + crown, z), V(-hw * .45, yt + crown * .8, z));
  arc(-hw + rt, yt - rt, rt, Math.PI / 2); arc(-hw + rb, yb + rb, rb, Math.PI); pts.push(V(0, yb, z)); return pts;
}
// 유리 온실 단면: 아래 폭 hb, 위로 갈수록 inset만큼 좁아진다. 점 11개 (지붕: 3~7번, 모서리: 2·8번)
function ghRing(z, hb, y0, yr, inset, rc, crown){
  const ht = hb - inset, pts = [V(hb, y0, z)]; rc = Math.min(rc, (yr - y0) * .5, ht * .5);
  for (let i = 0; i <= K; i++) { const a = i / K * Math.PI / 2; pts.push(V(ht - rc + Math.cos(a) * rc, yr - rc + Math.sin(a) * rc, z)); }
  pts.push(V(0, yr + crown, z));
  for (let i = 0; i <= K; i++) { const a = Math.PI / 2 + i / K * Math.PI / 2; pts.push(V(-ht + rc + Math.cos(a) * rc, yr - rc + Math.sin(a) * rc, z)); }
  pts.push(V(-hb, y0, z)); return pts;
}
const steps = (a, b, d) => { const n = Math.max(1, Math.round((b - a) / d)); return Array.from({length:n + 1}, (_, i) => a + (b - a) * i / n); };
// 두 점을 잇는 납작한 기둥 (창 사이 기둥)
function strut(a, b, w, t){ const g = new THREE.BoxGeometry(t, a.distanceTo(b), w); g.rotateZ(Math.atan2(-(b.x - a.x), b.y - a.y)); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); return g; }

// 바퀴 하나 (바깥면이 +x). 타이어는 무광, 휠은 광택.
function wheel(P, x, y, z, R, w, sideSign){
  const place = g => { g.rotateZ(-Math.PI / 2); if (sideSign < 0) g.rotateY(Math.PI); g.translate(x, y, z); return g; };
  P.add('mat', place(lathe([[R - .085, -w / 2], [R - .02, -w / 2], [R, -w / 2 + .028], [R, w / 2 - .028], [R - .02, w / 2], [R - .085, w / 2], [R - .095, w / 2 - .03]], 16)), C.tire);
  P.add('gls', place(lathe([[0, w / 2 - .012], [.05, w / 2 - .012], [.07, w / 2 - .03], [R - .13, w / 2 - .05], [R - .1, w / 2 - .028], [R - .09, w / 2 - .01]], 14)), C.rim);
  for (let i = 0; i < 5; i++) { const g = new THREE.RingGeometry(.085, R - .135, 3, 1, i * Math.PI * .4 + .12, Math.PI * .4 - .34); g.rotateX(-Math.PI / 2); g.translate(0, w / 2 - .034, 0); P.add('mat', place(g), C.dark); }
}
// 번호판 그림 (앞뒤 같은 번호)
const plates = new Map();
function plateMat(text, yellow, extra){
  const key = text + yellow + (extra ? extra.key : ''); if (plates.has(key)) return plates.get(key);
  const t = canvasTex(1024, 512, (g, W, H) => {
    g.clearRect(0, 0, W, H); g.fillStyle = yellow ? '#f1c02e' : '#f6f6f2'; g.fillRect(0, 0, 512, 110); g.strokeStyle = '#1b1d20'; g.lineWidth = 6; g.strokeRect(5, 5, 502, 100);
    g.fillStyle = '#16181b'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 78px ' + FONT_D; g.fillText(text, 256, 60);
    if (extra) extra.draw(g, W, H);
  });
  const m = decalMaterial(t, {rough:.55, alpha:true}); plates.set(key, m); return m;
}
function plateQuads(D, zf, zr, y, hw = .26){
  const q = (z, back) => { const g = new THREE.BufferGeometry(), s = back ? -1 : 1;
    g.setAttribute('position', new THREE.Float32BufferAttribute([-hw * s, y, z, hw * s, y, z, hw * s, y + .112, z, -hw * s, y + .112, z], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([0,0,s, 0,0,s, 0,0,s, 0,0,s], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1 - 110 / 512, .5, 1 - 110 / 512, .5, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); return g; };
  D.add('d', q(zf, false)); D.add('d', q(zr, true));
}
// 조립: 재질별로 합치고, 정보·크기를 붙인다
function finish(P, D, decal, o, size){
  const g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(UNIT); g.add(inner);
  const paint = P.geo('pnt'); bakeAO(paint, (p, n) => (n.y < -.35 ? .5 : 1) * (.78 + .22 * Math.min(1, p.y / .55)));
  if (o.color !== undefined) { const c = new THREE.Color(o.color), a = paint.getAttribute('color'); for (let i = 0; i < a.count; i++) a.setXYZ(i, a.getX(i) * c.r, a.getY(i) * c.g, a.getZ(i) * c.b); }
  const add = (geo, m, cast, tintable) => { const mesh = new THREE.Mesh(geo, m); mesh.castShadow = cast; mesh.receiveShadow = true; if (tintable) mesh.userData.tint = true; inner.add(mesh); };
  add(paint, carPaintMaterial(), true, true); add(P.geo('gls'), glassMaterial(), true); add(P.geo('mat'), matteMaterial(), false);
  if (P.has('snw') && o.snow !== 0) add(P.geo('snw'), snowMaterial({seed:44}), false);
  add(D.geo('d'), decal, false);
  g.userData.info = {tris:triCount(g), draws:inner.children.length, materials:inner.children.length, sizeMeters:size};
  return g;
}
// 눈 이불: 윗면 점들(가로로 5개)을 따라 도톰하게 덮는다
function blanket(rows, thick, seed){
  const m = rows.length, rings = rows.map((r, i) => { const u = i / (m - 1), k = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), .45) * (.82 + .18 * Math.sin(r[0].z * 9 + seed));
    const low = r.map(p => p.clone().setY(p.y + .004)), up = r.map((p, j) => V(p.x * .96, p.y + .012 + thick * k * (j === 0 || j === r.length - 1 ? .45 : 1), p.z)); return low.concat(up.reverse()); });
  return loft(rings);
}

// ── 승용차 · SUV ──
function passenger(S, o){
  const P = new Parts(), D = new Parts(), hw = prof(S.hw), top = prof(S.top), bot = prof(S.bot), roof = prof(S.roof), z0 = S.hw[0][0], z1 = S.hw[S.hw.length - 1][0], seed = o.v || 0;
  const Ra = S.R + .075, arch = z => { let y = 0; for (const a of S.axles) { const d = Math.abs(z - a); if (d < Ra) y = Math.max(y, S.R + Math.sqrt(Ra * Ra - d * d)); } return y; };
  const body = steps(z0, z1, .07).map(z => ring(z, hw(z), Math.max(bot(z), arch(z)), top(z), S.rt, .045, S.crown));
  P.add('pnt', loft(body), 0xffffff);
  // 유리 온실 + 지붕판 + 모서리 기둥(A필러~지붕 옆선~C필러)
  const g0 = S.roof[0][0], g1 = S.roof[S.roof.length - 1][0], rmax = Math.max(...S.roof.map(p => p[1]));
  const gh = steps(g0, g1, .075).map(z => { const y0 = top(z) - .035, yr = Math.max(roof(z), y0 + .012); return ghRing(z, hw(z) - .045, y0, yr, S.tumble * (yr - y0) / (rmax - y0), S.rc, .015); });
  P.add('gls', loft(gh), C.glass);
  const rz = gh.filter(r => r[0].z >= S.roofRange[0] && r[0].z <= S.roofRange[1]);
  P.add('pnt', loft(rz.map(r => r.slice(3, 8).map(p => p.clone().setY(p.y + .012))), {closed:false, facing:V(0, 1, 0)}), 0xffffff);
  [2, 8].forEach(k => P.add('pnt', tube(gh.filter(r => r[4].y - r[0].y > .05).map(r => r[k].clone().multiplyScalar(1.004)), .03, {radial:6}), 0xffffff));
  const at = z => gh.reduce((a, r) => Math.abs(r[0].z - z) < Math.abs(a[0].z - z) ? r : a);
  S.pillars.forEach(z => { const r = at(z); [[0, 2], [10, 8]].forEach(([a, b]) => P.add('mat', strut(r[a].clone().multiplyScalar(1.006), r[b].clone().multiplyScalar(1.006), .09, .016), C.dark)); });
  // 문 선, 손잡이, 거울, 벨트 몰딩
  const hm = hw(0);
  S.seams.forEach(z => [-1, 1].forEach(s => P.add('mat', box(s * hm - .003, bot(z) + .1, z - .004, s * hm + .003, top(z) - S.rt * .6, z + .004), C.dark)));
  S.handles.forEach(z => [-1, 1].forEach(s => P.add('pnt', box(s * hm - .012, top(z) - .19, z - .07, s * hm + .012, top(z) - .16, z + .07, .008), 0xffffff)));
  const mz = S.mirror; [-1, 1].forEach(s => { P.add('pnt', box(s * (hw(mz) + .02) - .1, top(mz) + .01, mz - .05, s * (hw(mz) + .02) + .1, top(mz) + .13, mz + .04, .03), 0xffffff);
    P.add('gls', box(s * (hw(mz) + .02) - .085, top(mz) + .025, mz - .056, s * (hw(mz) + .02) + .085, top(mz) + .115, mz - .05), 0x6f7d88); });
  [-1, 1].forEach(s => P.add('gls', tube(steps(g0 + .25, g1 - .2, .15).map(z => V(s * (hw(z) - .04), top(z) - .028, z)), .012, {radial:5}), S.suv ? C.dark : C.chrome));
  // 앞: 전조등, 그릴, 아래 흡기구, 안개등 / 뒤: 후미등, 반사판
  const fz = z1, fw = hw(z1 - .12), fy = top(z1 - .03) + .02, ry = top(z0 + .12), rw = hw(z0 + .12);
  [-1, 1].forEach(s => { P.add('gls', box(s * (fw - .22) - .2, fy - .16, fz - .24, s * (fw - .22) + .2, fy - .04, fz + .014, .04), C.head); P.add('gls', box(s * (fw - .06) - .05, fy - .17, fz - .36, s * (fw - .06) + .05, fy - .05, fz - .16, .03), C.amber);
    P.add('gls', box(s * (rw - .19) - .21, ry - .2, z0 + .0, s * (rw - .19) + .21, ry - .05, z0 + .2, .04), C.tail); P.add('gls', box(s * (rw - .3) - .1, bot(z0 + .1) + .05, z0 - .004, s * (rw - .3) + .1, bot(z0 + .1) + .09, z0 + .05), 0x8f1f1a); });
  P.add('mat', box(-fw + .42, fy - .2, fz - .1, fw - .42, fy - .07, fz + .006, .02), C.dark); P.add('gls', box(-fw + .44, fy - .145, fz - .05, fw - .44, fy - .125, fz + .012), C.chrome);
  P.add('mat', box(-fw + .2, bot(fz - .1) + .03, fz - .14, fw - .2, bot(fz - .1) + .16, fz + .004, .03), C.trim);
  P.add('mat', box(-rw + .15, bot(z0 + .1) + .02, z0 - .004, rw - .15, bot(z0 + .1) + .14, z0 + .14, .03), C.trim);
  P.add('gls', box(-.28, fy - .34, fz - .02, .28, fy - .2, fz + .008, .008), C.plate); P.add('gls', box(-.28, ry - .4, z0 - .008, .28, ry - .26, z0 + .02, .008), C.plate);
  plateQuads(D, fz + .0095, z0 - .0095, fy - .326); const rear = D.m.d[1], rp = rear.getAttribute('position'); for (let i = 0; i < 4; i++) rp.setY(i, rp.getY(i) - (fy - .326) + (ry - .386));
  if (S.suv) { [-1, 1].forEach(s => P.add('gls', tube(fillet([V(s * .62, rmax - .01, S.roofRange[0] + .35), V(s * .62, rmax + .045, S.roofRange[0] + .45), V(s * .62, rmax + .045, S.roofRange[1] - .5), V(s * .62, rmax - .01, S.roofRange[1] - .4)], .04, 3), .016, {radial:6}), C.chrome));
    P.add('mat', box(-.5, .62, z0 - .13, .5, .98, z0 + .02, .06), C.trim); }                                    // 지붕 레일, 뒤 범퍼 가드
  else P.add('pnt', xf(lathe([[0, 0], [.035, 0], [.02, .05], [0, .06]], 8), {x:0, y:rmax + .01, z:S.roofRange[0] + .25, rx:-.5}), 0xffffff);   // 지붕 안테나
  // 와이퍼
  const wz = g1 - .16; [[-.62, -.08], [.02, .56]].forEach(([a, b]) => P.add('mat', tube([V(a, roof(wz) + .03, wz), V(b, roof(wz - .05) + .03, wz - .05)], .009, {radial:5}), C.dark));
  // 바퀴와 바닥 (바퀴 자리 너머가 비쳐 보이지 않게 가운데를 막는다)
  S.axles.forEach(z => [-1, 1].forEach(s => wheel(P, s * (hm - S.w / 2 + .012), S.R, z, S.R, S.w, s)));
  P.add('mat', box(-hm + S.w + .05, bot(0) + .015, z0 + .25, hm - S.w - .05, top(0) - .1, z1 - .25), C.dark);
  // 눈: 지붕, 보닛, 트렁크
  if (o.snow !== 0) { const th = o.snow === undefined ? 1 : o.snow;
    P.add('snw', blanket(rz.slice(1, -1).map(r => r.slice(3, 8)), .065 * th, seed));
    P.add('snw', blanket(body.filter(r => r[0].z > g1 + .1 && r[0].z < z1 - .3).map(r => r.slice(7, 12)), .04 * th, seed + 3));
    if (!S.suv) P.add('snw', blanket(body.filter(r => r[0].z > z0 + .12 && r[0].z < g0 - .04).map(r => r.slice(7, 12)), .04 * th, seed + 5)); }
  return finish(P, D, plateMat(S.plates[seed % S.plates.length], false), o, [hm * 2, rmax, z1 - z0]);
}
const SEDAN = {R:.325, w:.215, axles:[-1.34, 1.4], rt:.07, crown:.012, tumble:.16, rc:.09, roofRange:[-1.16, .52], pillars:[-.22], seams:[1.02, -.22, -1.18], handles:[.0, -1.0], mirror:.98,
  hw:[[-2.34, .74], [-2.2, .85], [-1.8, .9], [0, .91], [1.7, .9], [2.15, .86], [2.34, .76]],
  top:[[-2.34, .78], [-2.25, .9], [-1.9, .955], [-1.2, .965], [0, .96], [.95, .955], [1.6, .9], [2.1, .8], [2.3, .72], [2.34, .68]],
  bot:[[-2.34, .36], [-2.15, .26], [-1.8, .21], [1.8, .21], [2.15, .25], [2.34, .33]],
  roof:[[-1.9, .93], [-1.2, 1.385], [-.5, 1.445], [.2, 1.435], [.55, 1.39], [1.3, .93]], plates:['12가 3456', '48나 7102', '305다 2984']};
const SUV = {suv:true, R:.365, w:.235, axles:[-1.32, 1.38], rt:.08, crown:.014, tumble:.15, rc:.1, roofRange:[-2.02, .42], pillars:[-.2, -1.25], seams:[1.0, -.2, -1.25], handles:[.02, -.98], mirror:.96,
  hw:[[-2.31, .8], [-2.2, .9], [-1.8, .935], [0, .94], [1.7, .935], [2.15, .9], [2.31, .8]],
  top:[[-2.31, .95], [-2.25, 1.07], [-1.9, 1.1], [0, 1.09], [1.0, 1.08], [1.6, 1.04], [2.1, .96], [2.28, .86], [2.31, .8]],
  bot:[[-2.31, .42], [-2.1, .3], [-1.8, .25], [1.8, .25], [2.1, .3], [2.31, .4]],
  roof:[[-2.26, 1.08], [-2.1, 1.6], [-1.5, 1.69], [0, 1.7], [.45, 1.66], [1.25, 1.07]], plates:['77라 5120', '163마 8845']};

// ── 1톤 트럭 · 택배 탑차 (운전석이 앞바퀴 위에 있는 캡오버) ──
const CAB = {R:.3, w:.2, z0:.82, z1:2.5, hwv:.86, hw:prof([[.82, .86], [2.2, .86], [2.42, .82], [2.5, .77]]), top:prof([[.82, 1.16], [2.3, 1.15], [2.45, 1.11], [2.5, 1.06]]), bot:prof([[.82, .45], [2.3, .45], [2.5, .5]]),
  roof:prof([[.84, 1.17], [.88, 1.88], [1.3, 1.955], [1.95, 1.93], [2.1, 1.87], [2.47, 1.17]]), axle:1.62, rear:-1.5};
function cabover(o, kind){
  const P = new Parts(), D = new Parts(), S = CAB, Ra = S.R + .07, seed = o.v || 0, hm = S.hwv;
  const arch = z => { const d = Math.abs(z - S.axle); return d < Ra ? S.R + Math.sqrt(Ra * Ra - d * d) : 0; };
  const body = steps(S.z0, S.z1, .055).map(z => ring(z, S.hw(z), Math.max(S.bot(z), arch(z)), S.top(z), .05, .04, .008));
  P.add('pnt', loft(body), 0xffffff);
  const gh = steps(.84, 2.47, .05).map(z => { const y0 = S.top(z) - .03, yr = Math.max(S.roof(z), y0 + .012); return ghRing(z, S.hw(z) - .04, y0, yr, .09 * (yr - y0) / .8, .1, .012); });
  P.add('gls', loft(gh), C.glass);
  const rz = gh.filter(r => r[0].z >= .9 && r[0].z <= 2.06);
  P.add('pnt', loft(rz.map(r => r.slice(3, 8).map(p => p.clone().setY(p.y + .012))), {closed:false, facing:V(0, 1, 0)}), 0xffffff);
  [2, 8].forEach(k => P.add('pnt', tube(gh.filter(r => r[4].y - r[0].y > .05).map(r => r[k].clone().multiplyScalar(1.004)), .032, {radial:6}), 0xffffff));
  P.add('pnt', box(-hm + .05, 1.1, .8, hm - .05, 1.9, .9, .03), 0xffffff); P.add('gls', box(-.42, 1.4, .79, .42, 1.72, .81, .01), C.glass);             // 운전석 뒷벽과 작은 창
  const pr = gh.reduce((a, r) => Math.abs(r[0].z - 1.02) < Math.abs(a[0].z - 1.02) ? r : a); [[0, 2], [10, 8]].forEach(([a, b]) => P.add('pnt', strut(pr[a].clone().multiplyScalar(1.006), pr[b].clone().multiplyScalar(1.006), .2, .02), 0xffffff));
  [1.0, 2.02].forEach(z => [-1, 1].forEach(s => P.add('mat', box(s * hm - .003, .62, z - .004, s * hm + .003, 1.12, z + .004), C.dark)));
  [-1, 1].forEach(s => { P.add('mat', box(s * hm - .012, .98, 1.1, s * hm + .012, 1.01, 1.24, .008), C.dark);
    P.add('mat', tube(fillet([V(s * (hm - .02), 1.25, 2.2), V(s * (hm + .16), 1.3, 2.3), V(s * (hm + .16), 1.5, 2.3)], .04, 3), .012, {radial:5}), C.dark); P.add('mat', box(s * (hm + .16) - .06, 1.36, 2.27, s * (hm + .16) + .06, 1.62, 2.32, .02), C.dark);   // 큰 사이드미러
    P.add('gls', box(s * .6 - .17, .8, 2.4, s * .6 + .17, .95, 2.51, .03), C.head); P.add('gls', box(s * .8 - .05, .82, 2.36, s * .8 + .06, .94, 2.47, .02), C.amber);
    P.add('gls', box(s * .7 - .1, .5, -2.61, s * .7 + .1, .6, -2.57, .01), C.tail); P.add('mat', box(s * .78 - .12, .25, -1.92, s * .78 + .12, .56, -1.9), C.trim); });
  P.add('mat', box(-.4, .8, 2.44, .4, .96, 2.506, .02), C.dark); P.add('mat', box(-hm + .03, .42, 2.3, hm - .03, .62, 2.53, .04), 0x4a4f55); P.add('gls', box(-.28, .46, 2.52, .28, .6, 2.538, .008), C.plate);
  P.add('gls', box(-.28, .44, -2.63, .28, .58, -2.6, .008), C.plate); plateQuads(D, 2.5395, -2.6315, .474); const rp = D.m.d[1].getAttribute('position'); for (let i = 0; i < 4; i++) rp.setY(i, rp.getY(i) - .02);
  const wz = 2.36; [[-.66, -.06], [.04, .64]].forEach(([a, b]) => P.add('mat', tube([V(a, S.roof(wz) + .03, wz), V(b, S.roof(wz - .03) + .03, wz - .03)], .009, {radial:5}), C.dark));
  // 차대, 바퀴 (뒤는 복륜)
  P.add('mat', box(-.42, .4, -2.56, .42, .62, 1.0), C.dark); P.add('mat', box(-hm + .26, .47, .85, hm - .26, 1.1, 2.4), C.dark);
  [-1, 1].forEach(s => { wheel(P, s * (hm - S.w / 2 + .012), S.R, S.axle, S.R, S.w, s); wheel(P, s * (hm - .17 + .012), .27, S.rear, .27, .34, s); });
  P.add('mat', xf(new THREE.CylinderGeometry(.05, .05, 1.5, 8), {rz:Math.PI / 2, y:.27, z:S.rear}), C.dark);
  if (kind === 'truck') {
    // 적재함: 바닥, 문짝 세 장(가로 골), 앞 보호틀, 눈 쌓인 짐
    P.add('pnt', box(-hm, .7, -2.58, hm, .78, .74, .01), 0xffffff);
    [[-hm, -hm + .035], [hm - .035, hm]].forEach(([a, b]) => P.add('pnt', box(a, .78, -2.58, b, 1.15, .74, .01), 0xffffff)); P.add('pnt', box(-hm, .78, -2.6, hm, 1.15, -2.565, .01), 0xffffff); P.add('pnt', box(-hm, .78, .7, hm, 1.3, .74, .01), 0xffffff);
    [.88, 1.03].forEach(y => { [-1, 1].forEach(s => P.add('pnt', box(s * hm - .012, y, -2.5, s * hm + .012, y + .05, .68, .01), 0xffffff)); P.add('pnt', box(-hm + .06, y, -2.612, hm - .06, y + .05, -2.59, .01), 0xffffff); });
    [-1.0, -.1].forEach(z => [-1, 1].forEach(s => P.add('mat', box(s * hm - .02, .8, z - .03, s * hm + .02, 1.14, z + .03), C.trim)));
    P.add('mat', tube(fillet([V(-.8, 1.28, .72), V(-.8, 1.86, .72), V(.8, 1.86, .72), V(.8, 1.28, .72)], .08, 4), .022, {radial:6}), C.trim); P.add('mat', tube([V(-.8, 1.58, .72), V(.8, 1.58, .72)], .016, {radial:6}), C.trim);
    [[-.45, -1.9, 0x3f7a57], [.3, -1.85, 0xd8a03a], [-.42, -1.2, 0xd8a03a]].forEach(([x, z, c]) => { P.add('mat', box(x - .28, .78, z - .2, x + .28, 1.06, z + .2, .015), c); P.add('mat', box(x - .25, 1.0, z - .17, x + .25, 1.065, z + .17), 0x2a2d30); });
    if (o.snow !== 0) { P.add('snw', box(-hm + .05, .76, -2.54, hm - .05, .9, .68, .06)); const b = blob(.5, .32, .7, {seed:seed + 4}); b.translate(.25, .84, -.6); P.add('snw', b); }
  } else {
    // 탑: 흰 상자, 모서리 알루미늄 띠, 뒤 문 두 짝과 잠금 막대, 옆 문, 아래 보호대
    const bx = .9, by0 = .68, by1 = 2.58, bz0 = -2.6, bz1 = .74;
    P.add('pnt', box(-bx, by0, bz0, bx, by1, bz1, .03), 0xffffff);
    [[-bx, by0], [bx, by0], [-bx, by1], [bx, by1]].forEach(([x, y]) => P.add('gls', box(x - .022, y - .022, bz0 - .004, x + .022, y + .022, bz1 + .004), C.chrome));
    [bz0, bz1].forEach(z => { [-bx, bx].forEach(x => P.add('gls', box(x - .022, by0, z - .022, x + .022, by1, z + .022), C.chrome)); [by0, by1].forEach(y => P.add('gls', box(-bx, y - .022, z - .022, bx, y + .022, z + .022), C.chrome)); });
    P.add('mat', box(-.004, by0 + .05, bz0 - .012, .004, by1 - .05, bz0), C.dark);
    [-.45, .45].forEach(x => { P.add('gls', tube([V(x, by0 + .08, bz0 - .02), V(x, by1 - .08, bz0 - .02)], .012, {radial:6}), C.chrome); P.add('gls', box(x - .1, 1.25, bz0 - .035, x + .1, 1.29, bz0 - .01), C.chrome); });
    [-.85, .85].forEach(x => [.95, 1.6, 2.25].forEach(y => P.add('gls', box(x - .03, y - .05, bz0 - .014, x + .03, y + .05, bz0), C.chrome)));
    P.add('mat', box(bx, by0 + .1, -.55, bx + .006, by1 - .25, -.542), C.dark); P.add('mat', box(bx, by0 + .1, .35, bx + .006, by1 - .25, .358), C.dark); P.add('mat', box(bx, by1 - .256, -.55, bx + .006, by1 - .25, .358), C.dark);
    P.add('gls', box(bx, 1.4, -.44, bx + .03, 1.44, -.3), C.chrome);
    [-1, 1].forEach(s => { P.add('mat', tube([V(s * (bx - .03), .5, -1.0), V(s * (bx - .03), .5, .6)], .018, {radial:6}), C.trim); P.add('gls', box(s * (bx - .1) - .04, by1 - .06, bz1 - .01, s * (bx - .1) + .04, by1 - .02, bz1 + .014), C.amber);
      P.add('gls', box(s * .55 - .3, by0 - .0, bz0 - .012, s * .55 + .3, by0 + .05, bz0), s > 0 ? C.tail : 0xe2b93a); });
    P.add('mat', box(-.7, .3, bz0 - .02, .7, .36, bz0 + .04), C.trim); [-.5, .5].forEach(x => P.add('mat', box(x - .02, .36, bz0, x + .02, .68, bz0 + .04), C.trim));
    if (o.snow !== 0) P.add('snw', box(-bx + .04, by1 - .03, bz0 + .05, bx - .04, by1 + .1, bz1 - .05, .06));
    // 옆면 그림 (지어낸 상호 '눈꽃택배')
    const q = s => { const g = new THREE.BufferGeometry(), x = s * (bx + .004), a = s > 0 ? .55 : -2.4, b = s > 0 ? -2.4 : .55;
      g.setAttribute('position', new THREE.Float32BufferAttribute([x, 1.05, a, x, 1.05, b, x, 2.25, b, x, 2.25, a], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([s,0,0, s,0,0, s,0,0, s,0,0], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 400 / 512, 0, 400 / 512], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); return g; };
    D.add('d', q(1)); D.add('d', q(-1));
  }
  [-1, 1].forEach(s => { if (o.snow !== 0) P.add('snw', blanket(rz.slice(1, -1).map(r => r.slice(3, 8)), .06, seed + s)); });
  const truck = kind === 'truck', logo = truck ? null : {key:'logo', draw(g){ g.fillStyle = '#2f8f8a'; g.fillRect(0, 300, 1024, 46); g.fillStyle = '#e9a23b'; g.fillRect(0, 352, 1024, 12);
    g.strokeStyle = '#2f8f8a'; g.lineWidth = 12; g.lineCap = 'round'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(170, 200); g.lineTo(170 + Math.cos(a) * 62, 200 + Math.sin(a) * 62); g.stroke(); }
    g.fillStyle = '#1f5f6b'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = '700 132px ' + FONT_D; g.fillText('눈꽃택배', 270, 204); g.fillStyle = '#5f6b75'; g.font = '700 40px ' + FONT_D; g.fillText('동네 구석구석 · 오늘도 안전하게', 276, 420 - 148 + 148 + 20); }};
  return finish(P, D, plateMat(truck ? '92바 6417' : '서울80 아 2046', !truck, logo), o, [truck ? hm * 2 : 1.8, truck ? 1.97 : 2.68, 5.1]);
}

const car = (S, color) => o => passenger(S, {color, ...o});
defineProp('carSedan', {label:'승용차 (세단)', category:'차량', isNewStyle:true, colliders:[{r:[-.95 * UNIT, -2.38 * UNIT, .95 * UNIT, 2.38 * UNIT]}],
  usage:"W.placeMany('carSedan', [{x: 60, z: 150, rot: 0, color: 0xe8eaec}, ...]);", build:car(SEDAN, 0x8f98a1)});
defineProp('carSUV', {label:'SUV', category:'차량', isNewStyle:true, colliders:[{r:[-.98 * UNIT, -2.35 * UNIT, .98 * UNIT, 2.35 * UNIT]}],
  usage:"W.placeMany('carSUV', [{x: 65, z: 150, rot: 0, color: 0x2b2e33}, ...]);", build:car(SUV, 0x39424d)});
defineProp('truck1t', {label:'1톤 트럭', category:'차량', isNewStyle:true, colliders:[{r:[-.92 * UNIT, -2.65 * UNIT, .92 * UNIT, 2.56 * UNIT]}],
  usage:"W.place('truck1t', {x: 70, z: 150, rot: 0, color: 0x2e5fa3});", build:o => cabover({color:0x2e5fa3, ...o}, 'truck')});
defineProp('deliveryVan', {label:'택배 탑차', category:'차량', isNewStyle:true, colliders:[{r:[-.95 * UNIT, -2.65 * UNIT, .95 * UNIT, 2.56 * UNIT]}],
  usage:"W.place('deliveryVan', {x: 75, z: 150, rot: 0});", build:o => cabover({color:0xeceeee, ...o}, 'van')});
