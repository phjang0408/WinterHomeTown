// 소품 목록표: 갤러리가 이 순서와 묶음대로 보여 준다. 맵 배치도를 짤 때도 이 표를 기준으로 쓴다.
// 상태(status)를 적지 않으면 소품 정의를 보고 정한다: unplaced → 'new', 그 밖 → 'placed'.
//   placed   맵에 배치됨          new      만들었지만 아직 맵에 없음
// 항목은 소품 이름(문자열) 또는 {n, status, note}.

export const STATUS = {
  placed:{label:'맵에 배치됨'}, new:{label:'아직 배치 안 함', badge:'새 소품'},
  idle:{label:'예전 방식 · 아직 안 씀', badge:'안 씀'}, replaced:{label:'교체됨 (참고용)', badge:'교체됨'},
};

// 2026-11-17: 맵에서 쓰지 않는 예전 방식 소품(거리 · 겨울 장식 14종, 예전 벤치 · 차 · 아파트 · 공중전화, 붕어빵 노점)을 지우고
//   큰 묶음을 구역별(아파트 단지 · 공원 · 학교 · 간이역 · 기타)로 다시 나눔. 묶음 안의 '조립 예시'는 맵에 놓인 부품을 한 번에 보여 주는 갤러리용이다.
export const CATALOG = [
  {title:'아파트 단지', open:true, note:'단지 안 · 단지 앞 상가', cats:[
    ['동 · 현관', ['aptTower', 'aptTowerL', {n:'aptEntrance', note:'아파트 동에 붙어 있는 현관 부품'}]],
    ['단지 건물', ['communityCenter', 'guardHouse']],
    ['입구 · 경계', ['aptGate', 'aptNameWall', 'noiseBarrier']],
    ['단지 도로 · 주차', ['speedBump', 'fireLane', 'wheelStop', 'planterIsland', 'disabledBay', 'noParkingSign']],
    ['안내', ['noticeBoard', 'bannerBoard', 'phoneBooth']],
    ['군고구마', [{n:'gogumaCart', status:'placed', note:'학교 정문 북쪽 보도 (2026-11-20 2차)'}, {n:'goguma', status:'placed', note:'사면 손에 들린다'}, {n:'hotteokStall', status:'placed', note:'윗길 북쪽 보도 화단 사이 (2026-11-20 4차)'}, {n:'hotteok', status:'placed', note:'사면 손에 들린다'}]],
    ['놀이터', ['playSet', 'spiralSlide', 'merryGoRound', 'swingSet', 'swingSeat', 'springRider', 'seesaw']],
    ['쉼터 · 자전거', ['pavilion', 'bikeShelter']],
    ['분리수거', ['recycleStation', 'foodWasteBin']],
    ['조경', ['hedgeRow', 'shrubBall', 'shrubCluster']],
    ['단지 상가', [{n:'shopComplex', note:'상가 부품을 맞춘 조립 예시'}, 'shopBuilding', 'shopStairs', 'signFascia', 'signVertical', 'signRoof']],
  ]},
  {title:'공원', open:true, note:'낮춘 공원 · 둘레 순환 도로 · 공원 아래 큰 가게', cats:[
    ['공원 안', ['parkStair', 'bench', 'parkLamp', {n:'parkFountain', status:'placed', note:'공원 가운데 분수 광장 (2026-11-20 2차)'}, {n:'snowmanCoop', status:'placed', note:'놀이가 공원 눈밭 가운데에 놓는다 (단계 · 녹음 변형)'}, {n:'snowFieldFence', status:'placed', note:'눈사람 눈밭 둘레 (2026-11-20)'}, {n:'snowman', status:'replaced', note:'함께 만드는 눈사람으로 교체 (2026-11-19)'}]],
    ['순환 도로', ['roadHump', 'tactileStrip', 'townBus']],
    ['큰 가게 (공원 아래)', ['meatHouseSet', 'martBuildingSet', 'meatHouse', 'martBuilding', 'shoppingCart', 'cartCorral', 'parkingSign']],
    ['목욕탕 (남쪽 줄 가운데)', ['bathhouseSet', 'bathhouse', 'woodenPlatform', 'bananaMilk']],
  ]},
  {title:'학교', open:true, note:'학교는 닫음 (방학 중). 학교 앞 동쪽 줄의 문구점 · 근린상가', cats:[
    ['학교 앞 문구점', [{n:'stationeryCorner', note:'문구점 부품을 맞춘 조립 예시'}, 'stationeryShop', 'shopAwning', 'gachaRow', 'miniArcade', 'iceFreezer', 'drinkFridge', 'kidStool', 'hulaHoops']],
    ['근린상가 (조립 예시)', ['shopTowerBrickSet', 'shopTowerBeigeSet', 'shopTowerGraySet', 'shopTowerGreenSet']],
    ['근린상가 몸체', ['shopTowerBrick', 'shopTowerBeige', 'shopTowerGray', 'shopTowerGreen']],
    ['근린상가 앞 물건', ['barberPole', 'fruitStand', 'deliveryScooter']],
  ]},
  {title:'간이역', open:true, note:'선로 · 승강장 · 대합 지붕 · 육교 (역 쪽 도로 포함)', cats:[
    ['선로', [{n:'trackModule', note:'선로를 깔 때 쓰는 한 토막'}, 'bufferStop']],
    ['승강장', ['platformModule', 'stationCanopy', 'railFence', 'stationSign']],
    ['육교', ['footBridge']],
  ]},
  {title:'기타', open:true, note:'도로 · 강변 · 차량 · 나무처럼 맵 전체에 쓰는 것', cats:[
    ['도로', ['trafficLight', 'pedSignal', 'laneDelineator', 'utilityPole', 'barricade']],
    ['경계', ['brickWall', 'roadFence', 'schoolWall']],
    ['차량', ['carSedan', 'carSUV', 'carMini', 'truck1t', 'deliveryVan']],
    ['나무', ['bareTree', 'pineTree']],
    ['강변', ['reedClump', {n:'kiteStall', status:'placed', note:'썰매장 서쪽 연 가게 (2026-11-20)'}, {n:'bangpaeKite', status:'placed', note:'연날리기 놀이가 띄운다'}]],
    ['바닥 꾸밈', ['snowDrift', 'grassTuft']],
  ]},
];
