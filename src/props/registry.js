// 소품 등록소. defineProp으로 등록하면 W.place(이름, {x, z, rot})로 맵 어디에든 놓을 수 있다.
//
// def = {
//   label: '버스 정류장',          // 갤러리·문서용 이름
//   category: '거리',
//   build(opts) → THREE.Object3D   // 원점은 바닥 중심, 정면은 +z
//   colliders: [{c:[dx,dz,r]}, {r:[x0,z0,x1,z1]}]  // 로컬 좌표 충돌 영역 (선택)
//   minimap: '#색'                  // 미니맵 표시 색 (선택)
//   update(obj, dt, now)            // 매 프레임 애니메이션 (선택)
// }
const defs = new Map();
export function defineProp(name, def){ defs.set(name, def); }
export const getProp = name => defs.get(name);
export const propNames = () => [...defs.keys()];
export function buildProp(name, opts = {}){
  const d = defs.get(name); if (!d) throw new Error('등록되지 않은 소품: ' + name);
  const obj = d.build(opts); obj.userData.prop = name; return obj;
}
