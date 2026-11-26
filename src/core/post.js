// 필름 효과 (2026-11-25): 장면을 렌더 타깃에 그린 뒤 전체 화면 사각형 한 장으로 색을 고친다.
//   - 밝은 곳은 노랗게, 그늘은 푸르게 (스플릿 토닝). 푸른 하늘은 덜 물들여 파란색을 지킨다.
//   - 가장자리를 살짝 어둡게(비네팅), 아주 옅은 그레인, 검정을 살짝 들어 필름 느낌.
//   - (2026-11-26) 세기는 '약' 하나로 고정한다 (설정 메뉴에서 바꾸지 않는다). 거의 티 나지 않을 만큼 옅게.
//   - FILM.on = false면 렌더 타깃을 거치지 않고 예전처럼 화면에 바로 그린다 (비용 0). 지금은 늘 켜 둔다.
import * as THREE from '../lib/three.js';
import { renderer, setRenderHook } from './engine.js';

export const FILM = {on:true, warm:.18, vig:.07, grain:.01, fade:.006, keep:.85};

const size = new THREE.Vector2();
let rt = null;
const mat = new THREE.ShaderMaterial({
  uniforms:{tDiffuse:{value:null}, uTime:{value:0}, uWarm:{value:0}, uVig:{value:0}, uGrain:{value:0}, uFade:{value:0}, uKeep:{value:0}},
  vertexShader:'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader:`
    uniform sampler2D tDiffuse; uniform float uTime, uWarm, uVig, uGrain, uFade, uKeep; varying vec2 vUv;
    vec3 toSRGB(vec3 c){ c = clamp(c, 0., 1.); return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec3 c = toSRGB(texture2D(tDiffuse, vUv).rgb);          // 렌더 타깃은 linear: 화면 색으로 바꾼 뒤 보정
      float l = dot(c, vec3(.299, .587, .114));
      vec3 tint = mix(vec3(.90, .95, 1.04), vec3(1., .95, .83), smoothstep(.2, .8, l));   // 그늘 파랑, 밝은 곳 노랑
      float keepWhite = smoothstep(.88, 1., l) * .6;           // 햇빛 받은 눈은 덜 물들게
      float blue = smoothstep(0., .25, c.b - c.r);             // 하늘처럼 푸른 곳은 덜 물들게
      c = mix(c, c * tint, uWarm * (1. - keepWhite) * (1. - uKeep * blue));
      float l2 = dot(c, vec3(.299, .587, .114)); c = mix(vec3(l2), c, 1. + .12 * uKeep);   // 채도 살짝 올림
      c = c * (1. - 2. * uFade) + uFade;                       // 검정 들기
      c *= mix(1. - uVig, 1., smoothstep(.85, .3, length(vUv - .5)));
      c += (hash(gl_FragCoord.xy + uTime) - .5) * uGrain;
      gl_FragColor = vec4(c, 1.);
    }`,
  depthTest:false, depthWrite:false,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
const postScene = new THREE.Scene(); postScene.add(quad);
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

function render(scene, camera){
  if (!FILM.on) { if (rt) { rt.dispose(); rt = null; } return renderer.render(scene, camera); }
  renderer.getDrawingBufferSize(size);
  if (!rt) { rt = new THREE.WebGLRenderTarget(size.x, size.y, {samples:4, type:THREE.HalfFloatType}); mat.uniforms.tDiffuse.value = rt.texture; }
  else if (rt.width !== size.x || rt.height !== size.y) rt.setSize(size.x, size.y);
  renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null);
  mat.uniforms.uTime.value = performance.now() % 1000;
  renderer.render(postScene, postCam);
}

{ const u = mat.uniforms; u.uWarm.value = FILM.warm; u.uVig.value = FILM.vig; u.uGrain.value = FILM.grain; u.uFade.value = FILM.fade; u.uKeep.value = FILM.keep; }
setRenderHook(render);
