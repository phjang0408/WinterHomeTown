// 나눠바 (2026-11-25, 지어낸 이름 · 사용자가 '나눠바'로 정함). 미터 단위.
// 나눠바 반쪽 (twinbarHalf): 초콜릿 막대 반쪽(폭 4.8cm · 높이 12.5cm · 두께 2.4cm, 4칸, 위 모서리가 둥글다) + 나무 막대.
//   원점은 막대와 몸통이 만나는 곳(쥐는 곳 바로 위). 놀이(activities/twinbar.js)가 두 개를 맞붙여 한 개로 보이게 하고, 나눈 뒤에는 손에 들린다.
// 아이스박스 (twinbarCooler): 0.56m × 0.38m × 0.36m. 흰 몸통, 파란 뚜껑 · 손잡이, 앞 파란 띠. 재질 2개.
import { defineProp } from './registry.js';
import { box, Parts } from '../core/meshkit.js';
import { matteMaterial, plasticMaterial } from '../core/texkit.js';
import { assemble } from './kit.js';

// (2026-11-25 2차) 조각 모양: opts.cells = 내 줄 칸 수(아래부터, 4 · 3 · 2), opts.blade = 옆 줄 위쪽에서 같이 떨어져 온 칸 수(0 · 1 · 2, +x 쪽).
//   4+0 '1자', 4+1 'ㄱ자 도끼', 4+2 '날 큰 도끼', 3+0 · 2+0 은 위가 떨어져 나간 짧은 조각. 한 칸 = 높이 3.1cm.
export const TB = {w:.048, h:.125, rows:4};
defineProp('twinbarHalf', {label:'나눠바 반쪽', category:'거리', isNewStyle:true, small:true,
  usage:"buildProp('twinbarHalf', {cells: 4, blade: 0});  // 원점이 막대 위 끝. 두 개를 x로 맞붙이면 한 개", build(o = {}){
    const P = new Parts(), C = 0x5e3420, L = 0x7a4a2c, n = o.cells || 4, bl = o.blade || 0, ch = TB.h / TB.rows, hw = TB.w / 2;
    const top = n * ch, whole = n === TB.rows;
    P.add('choc', box(-hw, 0, -.012, hw, whole ? top - .007 : top, .012, whole ? .006 : .003), C);
    if (whole) P.add('choc', box(-hw + .003, top - .025, -.0125, hw - .003, top, .0125, .008), L);                // 둥근 위 끝
    if (bl) { const y0 = TB.h - bl * ch; P.add('choc', box(hw - .002, y0, -.012, hw + TB.w, TB.h - .007, .012, .004), C); P.add('choc', box(hw + .001, TB.h - .025, -.0125, hw + TB.w - .003, TB.h, .0125, .008), L); }
    for (let r = 1; r < TB.rows; r++) { const y = r * ch; if (y < top - .004) P.add('choc', box(-hw + .003, y - .002, .0115, hw - .003, y + .002, .0135, .001), L);
      if (bl && y > TB.h - bl * ch + .004) P.add('choc', box(hw + .003, y - .002, .0115, hw + TB.w - .003, y + .002, .0135, .001), L); }   // 칸 사이 줄
    P.add('stick', box(-.006, -.065, -.0022, .006, .004, .0022, .002), 0xd9b98a);
    return assemble(P, [['choc', matteMaterial({rough:.45})], ['stick', matteMaterial({rough:.9})]], [bl ? .1 : .05, .19, .025]); }});

defineProp('twinbarCooler', {label:'아이스박스', category:'거리', isNewStyle:true, small:true, colliders:[{r:[-.3 * 1.18, -.2 * 1.18, .3 * 1.18, .2 * 1.18]}],
  usage:"W.place('twinbarCooler', {x, z, rot});", build(){
    const P = new Parts(), B = 0x2f6fb8;
    P.add('body', box(-.28, 0, -.19, .28, .3, .19, .03), 0xf4f6f7);
    P.add('blue', box(-.29, .29, -.2, .29, .36, .2, .03), B);
    P.add('blue', box(-.281, .1, .186, .281, .16, .193, .004), B);
    P.add('blue', box(-.16, .36, -.025, -.13, .41, .025, .008), B); P.add('blue', box(.13, .36, -.025, .16, .41, .025, .008), B); P.add('blue', box(-.16, .405, -.025, .16, .43, .025, .01), B);
    return assemble(P, [['body', plasticMaterial()], ['blue', matteMaterial({rough:.5})]], [.58, .43, .4]); }});
