// 함께 만드는 눈사람 (2026-11-19). 공원 눈밭에서 여러 사람이 굴린 눈덩이를 모아 몸통 → 머리 순서로 키운다.
// 미터 단위, 원점은 바닥 중심, 정면 +z. 놀이(activities/snowman.js)는 snowmanRig()로 단계 · 녹음을 바꾸고,
// 갤러리는 defineProp('snowmanCoop')으로 본다.
//
// 사양
//   치수: 완성 시 폭 약 1.4m(팔 포함 약 2.1m) × 높이 약 1.85m. 몸통 반지름 0.62m, 머리 0.40m.
//   부품: 몸통(울퉁불퉁한 구, 바닥 평평) · 머리 · 얼굴(숯 눈 2, 숯 입 5, 당근 코) · 나뭇가지 팔 2
//   재질 2개(눈 AO, 무광 정점색) · 그리기 4회(몸통, 머리, 얼굴, 팔) · 삼각형 약 3,500
//   크기: 눈덩이를 하나 보탤 때마다 부피가 늘어난다 (반지름 = 최대 × 세제곱근(비율))
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { lathe, tube, bakeAO, Parts } from '../core/meshkit.js';
import { snowAOMaterial, matteMaterial } from '../core/texkit.js';
import { mulberry } from './kit.js';
import { UNIT } from '../config.js';

export const SNOWMAN = {RB:.62, RH:.40, BALL:.36};   // 몸통 · 머리 최대 반지름, 다 굴린 눈덩이 반지름 (미터)
const FLAT_B = -.8, FLAT_H = -.86;                     // 단위 구의 바닥을 이 높이에서 평평하게 자른다 (놓인 면 · 몸통과 맞닿는 면)

// 울퉁불퉁한 단위 구. flat이 있으면 그 아래를 평평하게 눌러 바닥에 앉게 한다.
function lumpy(seed, flat, seg = 28){
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * .7)), p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + .035 * Math.sin(x * 6.1 + seed) * Math.cos(z * 5.3 + seed * 1.9) + .025 * Math.sin(y * 9 + x * 4 + seed * .7);
    x *= k; y *= k; z *= k;
    if (flat !== undefined && y < flat) { const s = Math.sqrt(Math.max(0, 1 - flat * flat)) / Math.max(1e-3, Math.hypot(x, z)) * .98; if (s < 1) { x *= s; z *= s; } y = flat; }
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals(); return g;
}
// 몸통 · 머리 AO: 바닥(또는 맞닿는 아랫면)에 가까울수록, 아래를 볼수록 어둡다. 몸통 윗면(머리가 앉는 곳)도 살짝.
const bodyAO = (P, N) => (.66 + .34 * Math.min(1, (P.y - FLAT_B) / .55)) * (.84 + .16 * (N.y * .5 + .5)) * (P.y > .82 ? .9 : 1);
const headAO = (P, N) => (.74 + .26 * Math.min(1, (P.y - FLAT_H) / .45)) * (.86 + .14 * (N.y * .5 + .5));

const shared = {};
function geos(){
  if (shared.body) return shared;
  shared.body = bakeAO(lumpy(3, FLAT_B), bodyAO);
  shared.head = bakeAO(lumpy(7, FLAT_H, 24), headAO);
  shared.ball = bakeAO(lumpy(11, undefined, 18), () => 1);
  // 얼굴 (머리 단위 좌표: 머리 반지름 1 기준). 숯은 조금 납작한 돌, 코는 마디진 당근.
  const P = new Parts(), R = mulberry(19), coal = 0x2a2d31;
  const onHead = (yaw, pitch, out = .98) => new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(out);
  const stone = (r, at) => { const g = new THREE.IcosahedronGeometry(r, 1); g.scale(1, .85 + R() * .2, .7); g.lookAt(at); g.translate(at.x, at.y, at.z); return g; };
  [-1, 1].forEach(s => P.add('face', stone(.115, onHead(s * .36, .26)), coal));
  for (let i = 0; i < 5; i++) { const t = (i - 2) / 2; P.add('face', stone(.075, onHead(t * .45, -.2 - .12 * (1 - t * t), .97)), coal); }
  const nose = lathe([[.13, 0], [.12, .08], [.105, .1], [.09, .2], [.075, .22], [.055, .33], [.04, .35], [.012, .48], [0, .5]], 10);
  nose.scale(1.2, 1.25, 1.2); nose.rotateX(Math.PI / 2); nose.translate(0, .02, .84); P.add('face', nose, 0xdc7330);
  shared.face = P.geo('face');
  // 나뭇가지 팔 (몸통 단위 좌표). 오른팔을 만들고 x를 뒤집어 왼팔.
  const A = new Parts(), twig = 0x4f3a2b;
  const arm = (s) => {
    const main = [[.5, .1, 0], [1.05, .4, .06], [1.5, .7, .02], [1.85, .95, -.04]].map(([x, y, z]) => new THREE.Vector3(x * s, y, z));
    A.add('arms', tube(new THREE.CatmullRomCurve3(main), t => .055 * (1 - t * .65), {radial:6, segments:10}), twig);
    const f1 = [main[1].clone().lerp(main[2], .5), new THREE.Vector3(1.42 * s, .98, .12), new THREE.Vector3(1.55 * s, 1.18, .14)];
    A.add('arms', tube(new THREE.CatmullRomCurve3(f1), t => .03 * (1 - t * .6), {radial:5, segments:5}), twig);
    const f2 = [main[2].clone().lerp(main[3], .55), new THREE.Vector3(1.95 * s, .74, .1), new THREE.Vector3(2.1 * s, .7, .12)];
    A.add('arms', tube(new THREE.CatmullRomCurve3(f2), t => .022 * (1 - t * .6), {radial:5, segments:4}), twig);
  };
  arm(1); arm(-1);
  shared.arms = A.geo('arms');
  return shared;
}

// 단계와 녹음을 바꿀 수 있는 눈사람. 지오메트리는 한 번만 만들고 크기 · 위치만 바꾼다.
//   set(b, h, deco, melt): b · h = 몸통 · 머리 부피 비율(0~1), deco = 얼굴 · 팔 보이기, melt = 녹은 정도(0~1)
export function snowmanRig(){
  const G = geos(), snow = snowAOMaterial(), matte = matteMaterial({rough:.8});
  const obj = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(UNIT); obj.add(inner);
  const mk = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; inner.add(m); return m; };
  const body = mk(G.body, snow), head = mk(G.head, snow), face = mk(G.face, matte), arms = mk(G.arms, matte);
  face.castShadow = false;
  const rig = {obj, body, head, face, arms};
  rig.set = (b, h, deco, melt = 0) => {
    const m = Math.min(1, Math.max(0, melt));
    const rb = SNOWMAN.RB * Math.cbrt(Math.min(1, b)), sy = 1 - .62 * m, sx = 1 + .24 * m;
    body.visible = b > 0 && m < .999;
    body.scale.set(rb * sx, rb * sy, rb * sx); body.position.y = -FLAT_B * rb * sy - .015;
    const top = body.position.y + rb * sy * .97;
    const hm = Math.min(1, m * 1.5), rh = SNOWMAN.RH * Math.cbrt(Math.min(1, h)) * (1 - .75 * hm);
    head.visible = face.visible = b >= 1 && h > 0 && hm < .999;
    head.scale.set(rh * (1 + .2 * hm), rh * (1 - .25 * hm), rh * (1 + .2 * hm)); head.position.set(.06 * hm * rb, top - FLAT_H * rh * (1 - .25 * hm) - .02, 0);
    head.rotation.z = -.35 * hm;
    face.visible = face.visible && deco; face.position.copy(head.position); face.scale.copy(head.scale); face.rotation.copy(head.rotation);
    // 팔: 몸통 반지름 기준으로 꽂고, 녹으면 아래로 처지며 땅에 떨어진다
    arms.visible = b >= 1 && deco;
    arms.scale.set(rb * sx, rb * (1 - .95 * m), rb); arms.position.y = body.position.y + .12 * rb * sy - m * .2; arms.rotation.x = .2 * m;
  };
  rig.set(1, 1, true, 0);
  return rig;
}
export const ballGeo = () => geos().ball;

defineProp('snowmanCoop', {
  label:'함께 만드는 눈사람', category:'겨울', isNewStyle:true,
  colliders:[{c:[0, 0, SNOWMAN.RB * UNIT]}],
  usage:"놀이(activities/snowman.js)가 공원 눈밭 가운데에 직접 놓는다.",
  variants:[{label:'완성', opts:{}}, {label:'몸통 3/5', opts:{b:.6, h:0, deco:false}}, {label:'머리 1/3', opts:{b:1, h:1 / 3, deco:false}}, {label:'녹는 중', opts:{melt:.55}}],
  build(o = {}){
    const r = snowmanRig(); r.set(o.b ?? 1, o.h ?? 1, o.deco ?? true, o.melt || 0);
    let tris = 0; r.obj.traverse(m => { if (m.isMesh && m.visible) tris += m.geometry.index.count / 3; });
    r.obj.userData.info = {tris, draws:4, materials:2, sizeMeters:[1.4, 1.85, 1.24]};
    return r.obj;
  },
});
