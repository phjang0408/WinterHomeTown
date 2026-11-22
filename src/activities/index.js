// 놀이 목록. 새 놀이 파일을 만들면 여기에서 import만 하면 된다.
import './seats.js';
import './ttakji.js';
import './snowman.js';
import './sled.js';
import './slide.js';
import './playground.js';
import './phone.js';
import './kite.js';
import './goguma.js';
import './bus.js';
import './arcade.js';   // (2026-11-22) 문방구 앞 오락기 · 가위바위보
export { ACTS, current, findAction, doAction, stopActivity } from './registry.js';
