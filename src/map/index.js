// 맵 조립. 구역을 늘릴 때는 zones 폴더에 파일을 만들고 ZONES 배열에 넣는다.
import { buildTerrain } from './terrain.js';
import { buildScenery } from './scenery.js';
import { buildRailway, buildStreets, buildRiverside } from './base.js';
import apartments from './zones/apartments.js';
import park from './zones/park.js';
import school from './zones/school.js';

export const ZONES = [apartments, park, school];

export function buildMap(){
  buildTerrain();
  buildScenery();
  buildRailway();
  buildStreets();
  buildRiverside();
  ZONES.forEach(z => z.build());
}
