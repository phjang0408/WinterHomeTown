// 화질 단계 (2026-11-24 최적화): 화면 배율 · 그림자 지도 · 계단 현상 줄이기(AA) · 거리별 단순 모델(LOD) 거리.
// 환경설정 화면이 이 값을 바꾼다. 지금은 localStorage 'wt.quality'(auto · high · medium · low)로 저장하고 시작할 때 읽는다.
//   - dpr: 화면 배율 상한 (레티나 2배 화면에서 1.5면 그릴 픽셀이 약 44% 준다)
//   - shadow: 그림자 지도 한 변 픽셀, soft: 부드러운 그림자(PCFSoft) · 아니면 PCF
//   - aa: 계단 현상 줄이기 (WebGL 문맥을 만들 때 정해서, 바꾸면 다시 불러와야 적용된다)
//   - lod: 단순 모델로 바꾸는 거리 배율, far: 작은 소품을 숨기는 거리 배율
export const PRESETS = {
  high:   {label:'높음', dpr:2,    shadow:4096, soft:true,  aa:true, lod:1,   far:1},
  medium: {label:'보통', dpr:1.5,  shadow:2048, soft:true,  aa:true, lod:.8,  far:.9},
  low:    {label:'낮음', dpr:1.25, shadow:1024, soft:false, aa:true, lod:.55, far:.7},
};
const KEY = 'wt.quality';
const read = () => { try { return localStorage.getItem(KEY) || 'auto'; } catch (e) { return 'auto'; } };
// 자동: 휴대폰 · 작은 화면은 낮음, 레티나(배율 1.5 넘음) 노트북은 보통, 그 밖(데스크톱)은 높음
function autoLevel(){
  const dpr = window.devicePixelRatio || 1, small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  return touch || small ? 'low' : dpr > 1.5 ? 'medium' : 'high';
}
export const QUALITY = {choice:read(), level:'high', ...PRESETS.high};
QUALITY.level = PRESETS[QUALITY.choice] ? QUALITY.choice : autoLevel();
Object.assign(QUALITY, PRESETS[QUALITY.level]);
export function saveQuality(choice){ try { localStorage.setItem(KEY, choice); } catch (e) {} }
