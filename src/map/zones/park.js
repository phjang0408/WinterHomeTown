// 구역 2: 공원과 상가
import * as THREE from '../../lib/three.js';
import { M, mesh } from '../../core/gfx.js';
import { W } from '../../world/world.js';
import { zone, building } from '../../world/builders.js';

export default {
  id:'park', name:'공원과 상가',
  build(){
    zone(202,90,438,256,0xecf0e6,'#e6ecdf');
    zone(211,136,429,201,0xdbe6da,'#d2e0d0',.02); W.mmLabel(320, 168, '공원', 22);
    const SHOP = '#ecdcc8';
    [[214,262,'분식집','#c9705f',7],[269,320,'마트','#5f8fa3',7],[326,374,'학원','#7a8fb5',10],[381,426,'빵집','#d09a54',7]]
      .forEach(a => building(a[0], 98, a[1], 114, a[4], {kind:'shop', base:SHOP, label:a[2], awn:a[3], face:'s'}));
    building(214,215,262,231,7,{kind:'shop',base:SHOP,label:'고기집',awn:'#b5594a',face:'n'});
    building(269,215,355,231,7,{kind:'shop',base:'#f5dcb8',label:'카페 · 공원 쪽 창가',awn:'#3f8a97',face:'n'});
    building(362,215,426,231,7,{kind:'shop',base:SHOP,label:'김밥집',awn:'#7fae8a',face:'n'});
    building(388,162,412,180,5.5,{kind:'shop',base:'#f3e2c4',label:'문구점 · 딱지',awn:'#d9695c',face:'w'});
    // 분수대
    mesh(new THREE.CylinderGeometry(6,6.2,.65,44), M(0xcfd8e3), 253, .325, 171).receiveShadow = true;
    mesh(new THREE.CylinderGeometry(5.3,5.3,.1,44), M(0xdfeaf2), 253, .66, 171);
    mesh(new THREE.CylinderGeometry(.7,.95,1.8,16), M(0xcfd8e3), 253, 1.4, 171);
    mesh(new THREE.CylinderGeometry(1.8,1,.5,20), M(0xcfd8e3), 253, 2.5, 171);
    mesh(new THREE.SphereGeometry(.55,16,10), M(0xf8fbfd), 253, 2.95, 171);
    W.circle(253,171,6.2); W.mmCircle(253,171,6.2,'#c9d4df');
    [[220,145],[220,196],[275,145],[275,196],[262,145],[300,140],[345,140],[395,145],[262,196],[300,198],[340,198],[380,196],[410,150],
     [420,145],[420,196],[375,145],[375,196],[230,171],[230,244],[290,244],[350,244],[420,244],[225,121],[410,121]].forEach(p => W.tree(p[0], p[1]));
    [[230,125],[280,125],[340,125],[420,125],[230,212],[300,212],[380,212],[420,212]].forEach(p => W.lamp(p[0], p[1]));
  },
};
