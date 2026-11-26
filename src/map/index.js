// 맵 조립. 구역을 늘릴 때는 zones 폴더에 파일을 만들고 ZONES 배열에 넣는다.
import { buildTerrain } from './terrain.js';
import { buildScenery } from './scenery.js';
import { buildRailway, buildStreets, buildRiverside, finishBase } from './base.js';
import apartments from './zones/apartments.js';
import park from './zones/park.js';
import school from './zones/school.js';

export const ZONES = [apartments, park, school];

// (2026-11-26) 단계마다 step(진행 0~1, 글)을 기다린다: 시작 화면의 불러오기 막대가 그 사이에 그려진다.
const ZONE_NAMES = ['아파트 단지', '공원 · 상가', '학교'];
export async function buildMap(step = () => {}){
  const steps = [
    ['땅 · 하늘', () => { buildTerrain(); buildScenery(); }],
    ['간이역', buildRailway],
    ['도로', buildStreets],
    ['강변', buildRiverside],
    ...ZONES.map((z, i) => [ZONE_NAMES[i] || '구역', () => z.build()]),
    ['가로수 · 가로등', finishBase],   // 바닥판 · 가로수 · 가로등을 재질별로 한 번에 그린다
  ];
  for (let i = 0; i < steps.length; i++) { await step(i / steps.length, steps[i][0] + ' 짓는 중'); steps[i][1](); }
}
