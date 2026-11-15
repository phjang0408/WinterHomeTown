// 소품 목록표: 갤러리가 이 순서와 묶음대로 보여 준다. 맵 배치도를 짤 때도 이 표를 기준으로 쓴다.
// 상태(status)를 적지 않으면 소품 정의를 보고 정한다: unplaced → 'new', 그 밖 → 'placed'.
//   placed   맵에 배치됨          new      만들었지만 아직 맵에 없음
//   idle     예전 방식, 아직 안 씀  replaced 새 소품으로 바뀌어 더는 안 씀 (참고용)
// 항목은 소품 이름(문자열) 또는 {n, status, note}.

export const STATUS = {
  placed:{label:'맵에 배치됨'}, new:{label:'아직 배치 안 함', badge:'새 소품'},
  idle:{label:'예전 방식 · 아직 안 씀', badge:'안 씀'}, replaced:{label:'교체됨 (참고용)', badge:'교체됨'},
};

export const CATALOG = [
  {title:'아파트 단지', open:true, note:'곡선·PBR 재질로 만든 새 방식 소품', cats:[
    ['동·현관', ['aptTower', 'aptTowerL', 'aptEntrance']],
    ['단지 건물', ['communityCenter', 'guardHouse']],
    ['상가', ['shopComplex', 'shopBuilding', 'shopStairs', 'signFascia', 'signVertical', 'signRoof']],
    ['입구·경계', ['aptGate', 'noiseBarrier']],
    ['단지 도로', ['speedBump', 'fireLane', 'parkLamp']],
    ['바깥 도로', ['trafficLight', 'pedSignal', 'laneDelineator']],
    ['안내', ['noticeBoard', 'bannerBoard', 'phoneBooth']],
    ['주차장', ['wheelStop', 'planterIsland', 'disabledBay', 'noParkingSign']],
    ['차량', ['carSedan', 'carSUV', 'carMini', 'truck1t', 'deliveryVan']],
    ['놀이터', ['playSet', 'spiralSlide', 'merryGoRound', 'swingSet', 'swingSeat', 'springRider', 'seesaw']],
    ['쉼터', ['pavilion', {n:'bench', note:'공원·강변 등 맵 13곳에 배치됨'}]],
    ['분리수거', ['recycleStation', 'foodWasteBin']],
    ['조경', ['bareTree', 'pineTree', 'hedgeRow', 'shrubBall', 'shrubCluster']],
  ]},
  {title:'공원 동쪽 줄: 문구점 · 근린상가', open:true, note:'2026-11-15 새로 만든 소품. 근린상가 간판은 기존 간판 소품에 글자 옵션을 준 것', cats:[
    ['문구점', ['stationeryCorner', 'stationeryShop', 'shopAwning', 'gachaRow', 'miniArcade', 'iceFreezer', 'drinkFridge', 'kidStool', 'hulaHoops']],
    ['근린상가 (조립 예시)', ['shopTowerBrickSet', 'shopTowerBeigeSet', 'shopTowerGraySet', 'shopTowerGreenSet']],
    ['근린상가 몸체', ['shopTowerBrick', 'shopTowerBeige', 'shopTowerGray', 'shopTowerGreen']],
    ['근린상가 앞 물건', ['barberPole', 'fruitStand', 'deliveryScooter']],
  ]},
  {title:'간이역 · 도로 · 강변', open:true, note:'2026-11-15 새로 만든 소품 (공원 벤치와 같은 방식)', cats:[
    ['간이역', ['trackModule', 'platformModule', 'stationCanopy', 'railFence', 'stationSign', 'bufferStop', 'footBridge']],
    ['경계', ['brickWall', 'roadFence']],
    ['도로', ['roadHump', 'tactileStrip']],
    ['차량', ['townBus']],
    ['강변', ['reedClump']],
    ['바닥 꾸밈', ['snowDrift', 'grassTuft']],
  ]},
  {title:'다른 구역 소품', note:'예전 방식, 놀이 장소에서 쓰는 중', cats:[
    ['놀이 장소', ['snowman', 'fishStall']],
  ]},
  {title:'예전 방식 장식', note:'15종, 아직 맵에 없음. 쓸 때 새 방식으로 다시 만든다', cats:[
    ['거리', ['busStop', 'vending', 'mailbox', 'hydrant', 'bikeRack', 'schoolZone', {n:'recycle', note:'단지 안은 분리수거장으로 대체'}].map(n => typeof n === 'string' ? {n, status:'idle'} : {...n, status:'idle'})],
    ['겨울', ['xmasTree', 'stringLights', 'yamDrum', 'igloo', 'snowPile'].map(n => ({n, status:'idle'}))],
    ['한국 골목', ['onggi', 'briquettes'].map(n => ({n, status:'idle'}))],
  ]},
  {title:'교체된 소품', note:'새 소품으로 바뀐 예전 것 (비교용)', cats:[
    ['', [{n:'apartment', status:'replaced', note:'→ 아파트 동'}, {n:'benchOld', status:'replaced', note:'→ 공원 벤치'}, {n:'phoneBoothOld', status:'replaced', note:'→ 공중전화 부스'},
      {n:'car', status:'replaced', note:'→ 차량 5종 (달리는 차도 2026-11-15에 교체)'}]],
  ]},
];
