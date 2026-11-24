// 소품 등록소. defineProp으로 등록하면 W.place(이름, {x, z, rot})로 맵 어디에든 놓을 수 있다.
//
// def = {
//   label: '버스 정류장',          // 갤러리·문서용 이름
//   category: '거리',
//   build(opts) → THREE.Object3D   // 원점은 바닥 중심, 정면은 +z
//   colliders: [{c:[dx,dz,r]}, {r:[x0,z0,x1,z1]}]  // 로컬 좌표 충돌 영역 (선택)
//   minimap: '#색'                  // 미니맵 표시 색 (선택)
//   update(obj, dt, now)            // 매 프레임 애니메이션 (선택)
//   far: 150                        // 이 거리보다 먼 칸은 숨긴다 (선택, main.js FAR 표)
//   lod: {near: 40, opts: {...}}    // near보다 먼 칸은 opts로 지은 단순 모델 (선택, 2026-11-24)
//   dynamic: true                   // 놀이가 W.place로 돌려받아 움직이면 단다 → world/batch.js가 묶지 않는다 (2026-11-24)
// }
// 맵을 다 지으면 world/batch.js가 같은 소품끼리 인스턴스로 묶고, 혼자 놓인 소품은 같은 재질끼리 합친다.
// 그래서 W.place가 돌려준 소품을 나중에 움직이거나 자식을 붙이려면 그 정의에 dynamic: true가 있어야 한다.
const defs = new Map();
export function defineProp(name, def){ defs.set(name, def); }
export const getProp = name => defs.get(name);
export const propNames = () => [...defs.keys()];
export const usedProps = new Set();   // 이번 실행에서 실제로 만든 소품 이름 (안 쓰는 소품 찾기용)
export function buildProp(name, opts = {}){
  const d = defs.get(name); if (!d) throw new Error('등록되지 않은 소품: ' + name);
  usedProps.add(name); const obj = d.build(opts); obj.userData.prop = name; return obj;
}
