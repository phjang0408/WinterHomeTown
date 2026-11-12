// 소품 파일들이 같이 쓰는 조립 도우미.
import * as THREE from '../lib/three.js';
import { triCount } from '../core/meshkit.js';
import { UNIT } from '../config.js';

// 재질별로 모은 부품(Parts)을 메쉬로 만들어 UNIT 배율 그룹에 담는다. order: [[키, 재질, 그림자를 드리울지], ...]
export function assemble(P, order, size, extra = []){
  const g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(UNIT); g.add(inner);
  for (const [key, mat, cast] of order) if (P.has(key)) { const m = new THREE.Mesh(P.geo(key), mat); m.name = key; m.castShadow = cast !== false; m.receiveShadow = true; inner.add(m); }
  extra.forEach(m => { m.receiveShadow = true; inner.add(m); });
  g.userData.info = {tris:triCount(g), draws:inner.children.length, materials:inner.children.length, sizeMeters:size};
  return g;
}
// 그림을 붙일 판. 네 꼭짓점(왼아래→오른아래→오른위→왼위)과 uv 범위를 준다.
export function quad(a, b, c, d, uv = [0, 0, 1, 1]){
  const g = new THREE.BufferGeometry(), n = new THREE.Vector3().crossVectors(new THREE.Vector3(...b).sub(new THREE.Vector3(...a)), new THREE.Vector3(...d).sub(new THREE.Vector3(...a))).normalize();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); return g;
}
// +z를 보는 세운 판 (x0~x1, y0~y1, z). back이면 -z를 본다.
export const quadZ = (x0, y0, x1, y1, z, uv, back) => back ? quad([x1, y0, z], [x0, y0, z], [x0, y1, z], [x1, y1, z], uv) : quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], uv);
// 바닥에 눕힌 판. 그림의 위쪽이 -z를 향한다.
export const quadY = (x0, z0, x1, z1, y, uv) => quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], uv);
// 나뭇결 방향 맞추기: 결(u)이 x·y·z 축을 따라가게 uv를 다시 편다.
export function grain(g, axis){
  const p = g.getAttribute('position'), uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); uv[i * 2] = axis === 'x' ? x : axis === 'y' ? y : z; uv[i * 2 + 1] = axis === 'x' ? y + z : axis === 'y' ? x + z : x + y; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
export function mulberry(seed){ let t = seed >>> 0; return () => { t = (t + 0x6D2B79F5) >>> 0; let r = Math.imul(t ^ (t >>> 15), t | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
