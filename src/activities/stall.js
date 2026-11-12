// 상가 앞 붕어빵 노점
import { sfx, flash } from '../core/fx.js';
import { W } from '../world/world.js';
import { spotLabel } from '../world/builders.js';
import { me } from '../entities/player.js';
import { emote } from '../entities/character.js';
import { defineActivity } from './registry.js';
import { STALL } from '../map/layout.js';

let bought = 0;
defineActivity({
  id:'stall',
  setup(){ W.place('fishStall', {x:STALL.x, z:STALL.z}); spotLabel('붕어빵', STALL.x, 5.1, STALL.z); },
  offer(offer){ offer(Math.hypot(me.x - STALL.x, me.z - STALL.z), 4.2, '붕어빵 사기', () => {
    bought++; me.em = [me.em[0] + 1, 3]; emote(me.char, 3); flash(bought > 1 ? '붕어빵 ' + bought + '개째' : '따끈한 붕어빵'); sfx(660, 880, .15, 'triangle'); }); },
});
