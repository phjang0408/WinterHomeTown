// 화면 색과 조명 기준값. 게임(engine.js)과 소품 갤러리가 같은 값을 쓴다.
// three r160 기준: 색 관리(sRGB)가 켜져 있고 조명 세기는 물리 단위라서, 예전(r128) 값에 π를 곱해 옮겼다.
import * as THREE from '../lib/three.js';

export const LOOK = {
  toneMapping: THREE.NoToneMapping,   // 눈밭이 회색으로 죽지 않도록 톤 매핑은 아직 끈다
  exposure: 1,
  hemi: {sky:0xbdd9ff, ground:0xf6f8fa, i:0.46 * Math.PI},
  amb:  {c:0xe6efff, i:0.06 * Math.PI},
  sun:  {c:0xfff5e6, i:1.45 * Math.PI},
  envIntensity: 0.35,                 // PBR 재질(MeshStandardMaterial)이 받는 하늘 반사광 세기
};

export function setupRenderer(renderer){
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = LOOK.toneMapping;
  renderer.toneMappingExposure = LOOK.exposure;
}

export function makeLights(){
  return {
    hemi: new THREE.HemisphereLight(LOOK.hemi.sky, LOOK.hemi.ground, LOOK.hemi.i),
    amb:  new THREE.AmbientLight(LOOK.amb.c, LOOK.amb.i),       // 눈밭에 반사돼 그늘까지 들어오는 빛
    sun:  new THREE.DirectionalLight(LOOK.sun.c, LOOK.sun.i),
  };
}

// PBR 재질용 환경맵: 위는 파란 하늘, 아래는 햇빛 받은 눈밭, 해 쪽은 밝게. 한 번 만들어 scene.environment에 넣는다.
export function makeEnvironment(renderer, sunDir){
  const env = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {uZen:{value:new THREE.Color(0x3f86d6)}, uHor:{value:new THREE.Color(0xd8ebf8)}, uGnd:{value:new THREE.Color(0xeef3f8)}, uSun:{value:sunDir.clone().normalize()}},
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uZen, uHor, uGnd, uSun; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir);
        vec3 c = d.y > 0. ? mix(uHor, uZen, smoothstep(0., .6, d.y)) : mix(uHor, uGnd, smoothstep(0., .15, -d.y));
        c += vec3(1., .93, .8) * pow(max(dot(d, uSun), 0.), 60.) * 6.;
        gl_FragColor = vec4(c, 1.); }`,
  });
  env.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), mat));
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0, .1, 100).texture;
  pm.dispose(); mat.dispose();
  return tex;
}
