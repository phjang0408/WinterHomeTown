// 새 장식 소품. 전부 Three.js 기본 도형과 캔버스 텍스처로만 만든다 (외부 모델·이미지 없음).
// 원점은 바닥 중심, 정면은 +z. 맵에 놓을 때: W.place('busStop', {x, z, rot})
import * as THREE from '../lib/three.js';
import { defineProp } from './registry.js';
import { smokeUpdate } from './basic.js';
import { M, glow, box, mesh, canvasTex, prismGeo } from '../core/gfx.js';
import { PI, TAU, rr } from '../core/util.js';
import { FONT_D } from '../config.js';

const SNOW = 0xf8fbfd;
const lam = map => new THREE.MeshLambertMaterial({map});
const label = (w, h, bg, fg, text, size) => canvasTex(w, h, (g, W, H) => {
  g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = fg; g.font = (size || H * .55) + 'px ' + FONT_D;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 2);
});
const snowCap = (geo, y, parent, x = 0, z = 0) => mesh(geo, M(SNOW), x, y, z, parent);

// 1. 버스 정류장
defineProp('busStop', {
  label:'버스 정류장', category:'거리', minimap:'#7f9bb3', mmSize:2.4, blocksCamera:true,
  colliders:[{r:[-2.6,-.9,2.6,-.5]},{r:[-2.6,-.9,-2.3,.6]},{r:[2.3,-.9,2.6,.6]},{c:[3.4,.6,.15]}],
  build(){
    const g = new THREE.Group(), frame = M(0x55657a), glass = new THREE.MeshLambertMaterial({color:0xcfe3ee, transparent:true, opacity:.45});
    [[-2.45,-.75],[2.45,-.75],[-2.45,.55],[2.45,.55]].forEach(p => mesh(new THREE.CylinderGeometry(.06,.06,2.6,8), frame, p[0], 1.3, p[1], g));
    const roof = box(-2.7,-1.05,2.7,.85,.14,M(0x3f8a97),2.6,g); roof.rotation.x = -.06;
    box(-2.75,-1.1,2.75,.9,.12,M(SNOW),2.78,g).rotation.x = -.06;
    box(-2.4,-.8,2.4,-.72,2.1,glass,.35,g);
    box(-2.45,-.75,-2.37,.5,2.1,glass,.35,g); box(2.37,-.75,2.45,.5,2.1,glass,.35,g);
    // 노선도 패널
    box(-.9,-.71,.9,-.69,1.3,lam(canvasTex(180, 130, (c, W, H) => {
      c.fillStyle = '#f6f8fa'; c.fillRect(0, 0, W, H); c.fillStyle = '#3f8a97'; c.fillRect(0, 0, W, 26);
      c.fillStyle = '#fff'; c.font = '17px ' + FONT_D; c.textAlign = 'center'; c.fillText('마을버스 노선', W / 2, 19);
      c.strokeStyle = '#b5594a'; c.lineWidth = 5; c.beginPath(); c.moveTo(20, 60); c.lineTo(160, 60); c.lineTo(160, 108); c.lineTo(20, 108); c.closePath(); c.stroke();
      ['폐역','상가','학교','강변'].forEach((t, i) => { const x = [20,160,160,20][i], y = [60,60,108,108][i];
        c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 7, 0, TAU); c.fill(); c.strokeStyle = '#34465c'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#34465c'; c.font = '13px ' + FONT_D; c.fillText(t, x + (i === 1 || i === 2 ? -22 : 22), y + 4); });
    })),.75,g);
    // 의자
    box(-1.8,-.6,1.8,-.15,.1,M(0xb79d82),.48,g); [-1.5,1.5].forEach(x => box(x - .05,-.5,x + .05,-.25,.48,M(0x6b7684),0,g));
    // 정류장 표지
    mesh(new THREE.CylinderGeometry(.06,.06,3.2,8), M(0x6b7684), 3.4, 1.6, .6, g);
    const sign = new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,.06,24).rotateX(PI / 2), [M(0x3f8a97), lam(label(128, 128, '#3f8a97', '#fff', '정류장', 34)), M(0x3f8a97)]);
    sign.position.set(3.4, 3.1, .6); sign.castShadow = true; g.add(sign);
    snowCap(new THREE.SphereGeometry(.2, 8, 6, 0, TAU, 0, PI / 2), 3.55, g, 3.4, .6);
    return g;
  },
});

// 2. 자판기 (버튼이 천천히 깜빡인다)
defineProp('vending', {
  label:'자판기', category:'거리', colliders:[{r:[-.62,-.42,.62,.42]}], minimap:'#d9695c', mmSize:1,
  build(){
    const g = new THREE.Group(), body = M(0xd9695c);
    const front = lam(canvasTex(120, 190, (c, W, H) => {
      c.fillStyle = '#d9695c'; c.fillRect(0, 0, W, H); c.fillStyle = '#eef3f6'; rr(c, 10, 10, 70, 110, 6); c.fill();
      const cans = ['#3f6fa8','#e2a84b','#7fae8a','#c48bb0','#d9695c','#5a6b7d'];
      for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) { c.fillStyle = cans[(r * 4 + q) % 6]; rr(c, 15 + q * 16, 18 + r * 34, 11, 24, 3); c.fill(); }
      c.fillStyle = '#34465c'; c.fillRect(10, 140, 70, 26); c.fillStyle = '#f7e2a6'; c.font = '16px ' + FONT_D; c.textAlign = 'center'; c.fillText('따뜻한 음료', 45, 158);
      c.fillStyle = '#2b3f55'; c.fillRect(88, 30, 22, 30); c.fillRect(88, 150, 22, 14);
    }));
    box(-.6,-.4,.6,.4,1.95,[body,body,body,body,front,body],0,g);
    box(-.64,-.44,.64,.44,.12,M(SNOW),1.95,g);
    const btns = new THREE.Group(); g.add(btns);
    for (let i = 0; i < 4; i++) { const b = mesh(new THREE.BoxGeometry(.1,.05,.03), new THREE.MeshBasicMaterial({color:0x8fe08f}), -.33 + i * .16, 1.07, .415, btns); b.castShadow = false; }
    g.userData.btns = btns; return g;
  },
  update(obj, dt, now){ obj.userData.btns.children.forEach((b, i) => b.material.color.setHex(Math.sin(now / 400 + i * 1.3) > .2 ? 0x8fe08f : 0x4a6a4a)); },
});

// 3. 빨간 우체통
defineProp('mailbox', {
  label:'우체통', category:'거리', colliders:[{c:[0,0,.4]}], minimap:'#d9695c', mmSize:.8,
  build(){
    const g = new THREE.Group(), red = M(0xc8453a);
    mesh(new THREE.CylinderGeometry(.36,.38,1.1,20), red, 0, .55, 0, g);
    mesh(new THREE.SphereGeometry(.36,20,10,0,TAU,0,PI / 2), red, 0, 1.1, 0, g);
    snowCap(new THREE.SphereGeometry(.34,16,8,0,TAU,0,PI / 3), 1.14, g);
    box(-.2,.3,.2,.4,.05,M(0x2b2f36),.85,g);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(.36,.22), lam(label(96, 60, '#fafafa', '#c8453a', '우편', 32)));
    plate.position.set(0, .55, .385); g.add(plate);
    box(-.4,-.4,.4,.4,.08,M(0x6b7684),0,g);
    return g;
  },
});

// 4. 공중전화 부스
defineProp('phoneBooth', {
  label:'공중전화', category:'거리', colliders:[{r:[-.65,-.65,.65,.65]}], minimap:'#3f6fa8', mmSize:1, blocksCamera:true,
  build(){
    const g = new THREE.Group(), frame = M(0x3f6fa8), glass = new THREE.MeshLambertMaterial({color:0xd5e6ef, transparent:true, opacity:.5});
    [[-.6,-.6],[.6,-.6],[-.6,.6],[.6,.6]].forEach(p => box(p[0] - .05, p[1] - .05, p[0] + .05, p[1] + .05, 2.3, frame, 0, g));
    box(-.55,-.6,.55,-.55,2.1,frame,.1,g); box(-.6,-.55,-.55,.55,2.1,glass,.1,g); box(.55,-.55,.6,.55,2.1,glass,.1,g);
    const door = box(-.5,.56,.5,.6,1.9,glass,.2,g);
    box(-.68,-.68,.68,.68,.16,frame,2.3,g); box(-.7,-.7,.7,.7,.14,M(SNOW),2.46,g);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.1,.22), lam(label(220, 44, '#3f6fa8', '#fff', '공중전화', 30))); s.position.set(0, 2.1, .61); g.add(s);
    box(-.22,-.55,.22,-.4,.55,M(0x9aa6b4),1.1,g); mesh(new THREE.BoxGeometry(.08,.3,.08), M(0x2b2f36), .14, 1.5, -.33, g);
    return g;
  },
});

// 5. 소화전
defineProp('hydrant', {
  label:'소화전', category:'거리', colliders:[{c:[0,0,.3]}], minimap:'#c8453a', mmSize:.6,
  build(){
    const g = new THREE.Group(), red = M(0xc8453a);
    mesh(new THREE.CylinderGeometry(.22,.26,.8,16), red, 0, .4, 0, g);
    mesh(new THREE.CylinderGeometry(.27,.27,.08,16), red, 0, .78, 0, g);
    mesh(new THREE.SphereGeometry(.2,16,8,0,TAU,0,PI / 2), red, 0, .82, 0, g);
    [-1,1].forEach(s => mesh(new THREE.CylinderGeometry(.08,.08,.18,10).rotateZ(PI / 2), M(0xe8e0d0), s * .3, .52, 0, g));
    mesh(new THREE.CylinderGeometry(.1,.1,.16,10).rotateX(PI / 2), M(0xe8e0d0), 0, .45, .28, g);
    snowCap(new THREE.SphereGeometry(.19,12,6,0,TAU,0,PI / 3), .86, g);
    return g;
  },
});

// 6. 자전거 거치대와 눈 덮인 자전거
defineProp('bikeRack', {
  label:'자전거 거치대', category:'거리', colliders:[{r:[-2.2,-.6,2.2,.6]}], minimap:'#8f9cab', mmSize:1.4,
  build(){
    const g = new THREE.Group(), steel = M(0x8f9cab);
    for (let i = 0; i < 4; i++) { const u = mesh(new THREE.TorusGeometry(.4,.04,6,16,PI), steel, -1.5 + i, .05, 0, g); }
    box(-2.1,-.05,2.1,.05,.04,steel,.02,g);
    const bike = new THREE.Group(); bike.position.set(-.5, 0, .05); g.add(bike);
    [-.55,.55].forEach(x => { mesh(new THREE.TorusGeometry(.34,.035,6,20), M(0x2b2f36), x, .36, 0, bike); });
    const tube = (x0, y0, x1, y1) => { const l = Math.hypot(x1 - x0, y1 - y0), m = mesh(new THREE.CylinderGeometry(.03,.03,l,6), M(0x3f8a97), (x0 + x1) / 2, (y0 + y1) / 2, 0, bike); m.rotation.z = Math.atan2(x0 - x1, y1 - y0); };
    tube(-.55,.36,0,.4); tube(0,.4,.35,.85); tube(-.55,.36,-.2,.8); tube(-.2,.8,.35,.8); tube(.55,.36,.4,.95); tube(0,.4,-.2,.8);
    box(-.32,-.07,-.08,.07,.06,M(0x2b2f36),.82,bike); box(-.33,-.08,-.07,.08,.06,M(SNOW),.88,bike);
    box(.3,-.25,.36,.25,.04,M(0x2b2f36),.97,bike);
    return g;
  },
});

// 7. 분리수거함
defineProp('recycle', {
  label:'분리수거함', category:'거리', colliders:[{r:[-1.9,-.5,1.9,.5]}], minimap:'#7fae8a', mmSize:1.4,
  build(){
    const g = new THREE.Group();
    [['캔·병','#3f6fa8',0x3f6fa8],['플라스틱','#e2a84b',0xe2a84b],['종이','#7fae8a',0x7fae8a]].forEach((b, i) => {
      const x = -1.2 + i * 1.2, body = M(b[2]), face = lam(label(110, 120, b[1], '#fff', b[0], 22));
      box(x - .55, -.45, x + .55, .45, 1.1, [body,body,body,body,face,body], 0, g);
      box(x - .58, -.48, x + .58, .48, .1, M(0x4b5866), 1.1, g); box(x - .3, .05, x + .3, .2, .02, M(0x2b2f36), 1.2, g);
      box(x - .56, -.46, x + .56, .1, .1, M(SNOW), 1.21, g);
    });
    return g;
  },
});

// 8. 크리스마스 트리 (전구가 반짝인다)
defineProp('xmasTree', {
  label:'크리스마스 트리', category:'겨울', colliders:[{c:[0,0,1.9]}], minimap:'#4f7a5a', mmSize:2, blocksCamera:true,
  build(){
    const g = new THREE.Group();
    box(-.7,-.7,.7,.7,.5,M(0xa8674f),0,g); mesh(new THREE.CylinderGeometry(.25,.3,1,8), M(0x8a6f5a), 0, .9, 0, g);
    [[2.2,2.4,1.9],[1.75,2.1,3.2],[1.25,1.8,4.4],[.75,1.4,5.4]].forEach(c => { mesh(new THREE.ConeGeometry(c[0], c[1], 10), M(0x4f7a5a), 0, c[2], 0, g);
      mesh(new THREE.ConeGeometry(c[0] * .55, c[1] * .3, 10), M(SNOW), 0, c[2] + c[1] * .38, 0, g); });
    const star = mesh(new THREE.OctahedronGeometry(.38), glow(0xffd56a), 0, 6.45, 0, g); star.castShadow = false;
    const bulbs = new THREE.Group(); g.add(bulbs); const cols = [0xff6b5a, 0xffd56a, 0x7fd0ff, 0xb6f09a];
    for (let i = 0; i < 46; i++) { const t = i / 46, y = 1.3 + t * 4.4, r = 2.05 * (1 - t) + .15, a = i * 2.39;
      const b = mesh(new THREE.SphereGeometry(.09, 6, 5), new THREE.MeshBasicMaterial({color:cols[i % 4]}), Math.cos(a) * r, y, Math.sin(a) * r, bulbs); b.castShadow = false; b.userData.c = cols[i % 4]; }
    for (let i = 0; i < 10; i++) { const a = i * 1.7, y = 1.6 + (i % 5) * .8, r = 1.7 - (i % 5) * .3; mesh(new THREE.SphereGeometry(.16,10,8), M([0xc8453a,0xe2a84b,0x3f6fa8][i % 3]), Math.cos(a) * r, y, Math.sin(a) * r, g); }
    for (let i = 0; i < 3; i++) box(-1.6 + i * .9, .6 + (i % 2) * .4, -1.0 + i * .9, 1.2 + (i % 2) * .4, .5, M([0xd9695c,0x6f86b8,0xe2a84b][i]), 0, g);
    g.userData.bulbs = bulbs; g.userData.star = star; return g;
  },
  update(obj, dt, now){
    obj.userData.bulbs.children.forEach((b, i) => b.material.color.setHex(Math.sin(now / 300 + i * 2.1) > -.2 ? b.userData.c : 0x8a8270));
    obj.userData.star.rotation.y += dt;
  },
});

// 9. 꼬마전구 줄조명 (두 기둥 사이, 늘어진 전선)
defineProp('stringLights', {
  label:'꼬마전구 줄조명', category:'겨울', colliders:[{c:[-4,0,.15]},{c:[4,0,.15]}], minimap:'#e9c56a', mmSize:.8,
  build(o){
    const g = new THREE.Group(), span = o.span || 8, a = -span / 2, b = span / 2, top = 3.6;
    [a, b].forEach(x => { mesh(new THREE.CylinderGeometry(.07,.09,top,8), M(0x6b6760), x, top / 2, 0, g); snowCap(new THREE.SphereGeometry(.1,8,4,0,TAU,0,PI / 2), top, g, x, 0); });
    const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(new THREE.Vector3(a + span * u, top - .1 - Math.sin(u * PI) * .9, 0)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color:0x3c4654})));
    const bulbs = new THREE.Group(); g.add(bulbs); const cols = [0xffd56a, 0xff8f6b, 0xfff2c6];
    for (let i = 1; i < 24; i++) { const b2 = mesh(new THREE.SphereGeometry(.09,6,5), new THREE.MeshBasicMaterial({color:cols[i % 3]}), pts[i].x, pts[i].y - .14, 0, bulbs); b2.castShadow = false; b2.userData.c = cols[i % 3]; }
    g.userData.bulbs = bulbs; return g;
  },
  update(obj, dt, now){ obj.userData.bulbs.children.forEach((b, i) => b.material.color.setHex(((now / 500 | 0) + i) % 3 ? b.userData.c : 0x7a6a4a)); },
});

// 10. 군고구마 드럼통 (연기가 오른다)
defineProp('yamDrum', {
  label:'군고구마 드럼통', category:'겨울', colliders:[{c:[0,0,.75]}], minimap:'#3c4654', mmSize:.9,
  build(){
    const g = new THREE.Group(), black = M(0x2f353d);
    mesh(new THREE.CylinderGeometry(.6,.6,1.3,18).rotateZ(PI / 2), black, 0, 1.0, 0, g);
    [-.45,.45].forEach(x => { box(x - .05,-.5,x + .05,.5,.4,M(0x6b7684),0,g); });
    box(-.35,.38,.35,.62,.4,M(0x1f2328),.75,g); const fire = box(-.28,.6,.28,.63,.2,glow(0xff8a4a),.8,g); fire.castShadow = false;
    mesh(new THREE.CylinderGeometry(.09,.09,1.2,10), black, .45, 2.1, -.2, g);
    for (let i = 0; i < 5; i++) { const s = mesh(new THREE.SphereGeometry(.1,10,8), M(0x8a4a5a), -.35 + i * .16, 1.64, .05 * (i % 2), g); s.scale.set(.8, 1.9, .8); s.rotation.z = PI / 2 + (i % 2 ? .25 : -.2); }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(.9,.32), lam(label(180, 64, '#f6efe1', '#b5594a', '군고구마', 36))); sign.position.set(0, .6, .62); g.add(sign);
    return g;
  },
  update:(obj, dt, now) => smokeUpdate(obj, dt, now, [.45, 2.75, -.2]),
});

// 11. 장독대
const onggiGeo = (() => { const p = [[0,0],[.28,0],[.42,.15],[.5,.42],[.46,.66],[.3,.8],[.27,.86],[0,.86]].map(v => new THREE.Vector2(v[0], v[1])); return new THREE.LatheGeometry(p, 20); })();
defineProp('onggi', {
  label:'장독대', category:'한국 골목', colliders:[{r:[-2,-1.2,2,1.2]}], minimap:'#7a5546', mmSize:1.6,
  build(){
    const g = new THREE.Group(), glaze = new THREE.MeshPhongMaterial({color:0x5a3a2c, shininess:50, specular:0x332620});
    box(-2,-1.2,2,1.2,.35,M(0xb3bdc8),0,g);
    [[-1.3,-.5,1.3],[0,-.5,1.5],[1.3,-.5,1.2],[-.65,.55,1],[.65,.55,.9]].forEach(j => {
      const jar = new THREE.Mesh(onggiGeo, glaze); jar.position.set(j[0], .35, j[1]); jar.scale.setScalar(j[2]); jar.castShadow = jar.receiveShadow = true; g.add(jar);
      mesh(new THREE.CylinderGeometry(.33 * j[2], .3 * j[2], .08, 18), glaze, j[0], .35 + .9 * j[2], j[1], g);
      snowCap(new THREE.SphereGeometry(.3 * j[2], 14, 6, 0, TAU, 0, PI / 2.6), .35 + .92 * j[2], g, j[0], j[1]);
    });
    return g;
  },
});

// 12. 연탄 더미
const briqTop = canvasTex(64, 64, (c, W) => { c.fillStyle = '#2a2d31'; c.fillRect(0, 0, W, W); c.fillStyle = '#121416';
  for (let i = 0; i < 19; i++) { const a = i < 1 ? 0 : i < 7 ? (i - 1) / 6 * TAU : (i - 7) / 12 * TAU, r = i < 1 ? 0 : i < 7 ? 11 : 22; c.beginPath(); c.arc(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 3.4, 0, TAU); c.fill(); } });
const briqGeo = new THREE.CylinderGeometry(.16, .16, .15, 16);
defineProp('briquettes', {
  label:'연탄 더미', category:'한국 골목', colliders:[{r:[-.85,-.6,.85,.6]}], minimap:'#2f353d', mmSize:.8,
  build(){
    const g = new THREE.Group(), side = M(0x2a2d31), top = lam(briqTop), ash = M(0xd8d2c8);
    box(-.8,-.55,.8,.55,.12,M(0xa8875f),0,g);
    for (let l = 0; l < 4; l++) for (let r = 0; r < 4 - l; r++) for (let q = 0; q < 3; q++) {
      const b = new THREE.Mesh(briqGeo, [side, top, top]); b.position.set(-.48 + r * .33 + l * .165, .195 + l * .15, -.33 + q * .33); b.castShadow = true; g.add(b); }
    for (let i = 0; i < 3; i++) mesh(briqGeo, ash, 1.05 + (i % 2) * .1, .075 + i * .15, .3, g);
    box(-.75,-.5,.75,.5,.06,M(SNOW),.8,g);
    return g;
  },
});

// 13. 이글루
defineProp('igloo', {
  label:'이글루', category:'겨울', colliders:[{c:[0,0,2.5]}], minimap:'#eef3f6', mmSize:2.6, blocksCamera:true,
  build(){
    const g = new THREE.Group(), tex = canvasTex(256, 128, (c, W, H) => { c.fillStyle = '#f6fafc'; c.fillRect(0, 0, W, H); c.strokeStyle = '#cfdde7'; c.lineWidth = 2;
      for (let r = 0; r < 8; r++) { const y = r * 16; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); for (let q = 0; q < 12; q++) { const x = q * 21.3 + (r % 2) * 10.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 16); c.stroke(); } } });
    const ice = lam(tex);
    const dome = mesh(new THREE.SphereGeometry(2.4, 28, 14, 0, TAU, 0, PI / 2), ice, 0, 0, 0, g); dome.receiveShadow = true;
    const tunnel = mesh(new THREE.CylinderGeometry(.95, .95, 1.6, 18, 1, false, 0, PI).rotateZ(PI / 2).rotateY(PI / 2), ice, 0, 0, 2.5, g);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(.75, 18, 0, PI), M(0x5b6f86)); hole.position.set(0, 0, 3.31); g.add(hole);
    return g;
  },
});

// 14. 어린이 보호구역 표지판
defineProp('schoolZone', {
  label:'어린이 보호구역 표지판', category:'거리', colliders:[{c:[0,0,.15]}], minimap:'#e2a84b', mmSize:.6,
  build(){
    const g = new THREE.Group();
    mesh(new THREE.CylinderGeometry(.05,.05,3.4,8), M(0x9aa6b4), 0, 1.7, 0, g);
    const tri = canvasTex(128, 112, (c) => { c.fillStyle = '#c8453a'; c.beginPath(); c.moveTo(64, 2); c.lineTo(126, 110); c.lineTo(2, 110); c.closePath(); c.fill();
      c.fillStyle = '#ffd34a'; c.beginPath(); c.moveTo(64, 18); c.lineTo(112, 102); c.lineTo(16, 102); c.closePath(); c.fill();
      c.fillStyle = '#2b2f36'; c.beginPath(); c.arc(52, 52, 7, 0, TAU); c.arc(78, 56, 6, 0, TAU); c.fill(); c.fillRect(46, 60, 12, 26); c.fillRect(73, 63, 10, 22); });
    const t = new THREE.Mesh(new THREE.PlaneGeometry(1.0, .88), new THREE.MeshLambertMaterial({map:tri, transparent:true, side:THREE.DoubleSide})); t.position.set(0, 3.0, .07); g.add(t);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .5), lam(label(260, 100, '#ffd34a', '#2b2f36', '어린이 보호구역', 30))); s.position.set(0, 2.25, .07); g.add(s);
    box(-.55,.02,.55,.08,.08,M(SNOW),3.42,g);
    return g;
  },
});

// 15. 눈더미와 넉가래
defineProp('snowPile', {
  label:'눈더미와 넉가래', category:'겨울', colliders:[{c:[0,0,1.1]}], minimap:'#f4f7f9', mmSize:1.2,
  build(){
    const g = new THREE.Group();
    [[0,0,1.1,.55],[.7,.3,.7,.4],[-.6,.4,.6,.35],[.2,-.5,.6,.3]].forEach(p => { const m = mesh(new THREE.SphereGeometry(p[2], 16, 10), M(0xf6f9fb), p[0], 0, p[1], g); m.scale.y = p[3] / p[2] * 1.4; m.receiveShadow = true; });
    const sh = new THREE.Group(); sh.position.set(1.15, 0, .55); sh.rotation.set(-.35, .4, .1); g.add(sh);
    mesh(new THREE.CylinderGeometry(.035,.035,1.6,6), M(0xa8875f), 0, .95, 0, sh);
    box(-.4,-.03,.4,.03,.5,M(0xd9695c),0,sh);
    return g;
  },
});
