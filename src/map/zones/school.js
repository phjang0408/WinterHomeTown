// 구역 3: 학교단지
import * as THREE from '../../lib/three.js';
import { M, box, mesh, pillSprite } from '../../core/gfx.js';
import { root } from '../../core/engine.js';
import { W } from '../../world/world.js';
import { zone, solid, building, fence } from '../../world/builders.js';
import { TG } from '../layout.js';
import { flat } from '../../core/gfx.js';

export default {
  id:'school', name:'학교단지',
  build(){
    zone(464,93,634,243,0xe2e9f4,'#e0e7f2');
    zone(480,138,586,234,0xedf1e4,'#e8ecdc',.02); W.mmLabel(533, 205, '운동장', 20);
    [[480,138,586,138.25],[480,233.75,586,234],[480,138,480.25,234],[585.75,138,586,234],[480,TG.line - .15,586,TG.line + .15]].forEach(l => flat(l[0], l[1], l[2], l[3], 0xc3ccb9, .03));
    building(480,104,618,118,18,{kind:'apt',base:'#d6e0ea',label:'학교 본관',face:'s'});
    building(604,118,618,234,18,{kind:'apt',base:'#d6e0ea',face:'w'});
    solid(522,124,544,130,1.2,0xc9d3de); box(521.8,123.8,544.2,130.2,.12,M(0xf8fbfd),1.2);
    const F = 0x9fb0c2;
    fence(464, 93, 464, 167.2, 1.5, F, true); fence(464, 176.8, 464, 243, 1.5, F, true);
    fence(464, 93, 634, 93, 1.5, F, true); fence(464, 243, 634, 243, 1.5, F, true); fence(634, 93, 634, 243, 1.5, F, true);
    solid(463.2,166.2,464.8,167.6,2.8,0xc9d3de); solid(463.2,176.4,464.8,177.8,2.8,0xc9d3de);
    const s = pillSprite('교문', 'rgba(255,255,255,.92)', '#2b3f55', 1); s.position.set(464, 3.9, 172); root.add(s);
    [[527,234],[539,234]].forEach(p => { mesh(new THREE.CylinderGeometry(.1,.1,2.4,8), M(0xf8fbfd), p[0], 1.2, p[1]); W.circle(p[0], p[1], .15); });
    box(527,233.9,539,234.1,.2,M(0xf8fbfd),2.3);
    [[470,100],[470,140],[470,210],[505,239],[565,239],[595,128],[595,200],[458,110],[458,150],[458,230]].forEach(p => W.tree(p[0], p[1]));
    [[470,125],[470,230],[455,165],[455,180]].forEach(p => W.lamp(p[0], p[1]));
  },
};
