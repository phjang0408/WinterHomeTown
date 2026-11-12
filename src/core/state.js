// 여러 모듈이 함께 읽고 쓰는 게임 상태.
export const S = {
  mode: 'intro',          // 'intro' | 'walk' | 진행 중인 놀이의 id
  game: null,             // 진행 중인 놀이의 임시 데이터
  me: null,               // 내 캐릭터 (entities/player.js)
  remotes: new Map(),     // 다른 사람들 (entities/remotes.js)
  keys: {},
  joy: null,
  cam: {yaw:0, pitch:.38, dist:8.5, cur:8.5, blend:0},
};
export function setMode(m){ if (m !== S.mode) S.cam.blend = 0; S.mode = m; }
