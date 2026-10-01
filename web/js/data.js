// 문선농장 — 게임 데이터 (숫자만 바꿔서 조절)
'use strict';
const MIN = 60 * 1000;

// 꽃: 단계별 자라는 시간(분) = 씨앗→싹, 싹→꽃. 물을 줘야 시간이 흐름.
const FLOWERS = [
  { id: 'tulip',     name: '튤립',     grow: [0.5, 0.5],   color: '#e8505b' },
  { id: 'daisy',     name: '데이지',   grow: [1, 1],   color: '#f3efe2' },
  { id: 'sunflower', name: '해바라기', grow: [1.5, 1.5],   color: '#f5b82e' },
  { id: 'lavender',  name: '라벤더',   grow: [2, 2],   color: '#8f6bd6' },
  { id: 'rose',      name: '장미',     grow: [3, 3], color: '#ea6f93' },
  { id: 'hydrangea', name: '수국',     grow: [5, 5], color: '#6f93e8' },
  { id: 'cosmos',    name: '코스모스', grow: [8, 8], color: '#f26aa8' },
  { id: 'freesia',   name: '프리지아', grow: [12, 12], color: '#f7d33a' },
  { id: 'carnation', name: '카네이션', grow: [18, 18], color: '#e0355a' },
  { id: 'peony',     name: '작약',     grow: [25, 25], color: '#f58fb8' },
  { id: 'lily',      name: '백합',     grow: [35, 35], color: '#f4efe6' },
  { id: 'camellia',  name: '동백',     grow: [50, 50], color: '#d8262f' },
];
const FLOWER = Object.fromEntries(FLOWERS.map(f => [f.id, f]));

const RULES = {
  startBeds: 1,            // 처음 화단 수 (나머지는 우체통 편지로 구매)
  maxBeds: 5,              // 최대 화단 수
  seedCost: 20,            // 씨앗 1개 = 같은 꽃 칩 포인트 20
  comboMax: 4,             // 연속 터짐(콤보) 점수 배수 상한: 2콤보 x2, 3콤보 x3, 4콤보 이상 x4
  harvestYield: 1,         // 꽃 1송이 수확
  gloveBonusChance: 0.2,   // 수확 장갑 4칸이면 이 확률로 한 송이 더
  specialResearch: 3,      // 특수블록 1번 쓸 때 연구포인트
  ordersPerDay: 40,        // 하루 의뢰 최대
  orderGapMin: [6, 5, 4, 3.5, 3],      // 새 의뢰가 오는 간격(분): 화단 1~5개일 때
  orderSlots: 6,           // 게시판 동시 의뢰 수 (비운 동안 쌓여서 이만큼까지 차 있음)
  bigOrderChance: 0.12, bigOrderMult: 1.3,      // 큰 주문: 한 가지 꽃 6~8송이, 값 1.3배
  mixOrderChance: 0.13, mixOrderMult: 1.25,     // 모둠 주문: 두 가지 꽃 각 4~5송이, 값 1.25배
  fairyEveryMin: 20,       // 시간의 요정 등장 간격(분, 실제로는 ±40% 무작위)
  fairyStaySec: 40,        // 하늘을 날아다니다 가 버리기까지(초)
  fairySkipMin: 2,         // 요정이 당겨 주는 시간(분)
  // 다이아는 건강 기록으로만 얻음 (하루 횟수 제한). 배변 기록은 보상 없음(스트레스 방지).
  diaRewards: { med: { perDay: 3, dia: 1, label: '약 챙기기' }, bp: { perDay: 1, dia: 1, label: '혈압 재기' }, exercise: { perDay: 1, dia: 1, label: '운동' } },
  // 다이아 얻는 길 (임시 숫자): 출석 · 오늘의 미션 · 시간의 요정
  attendGems: 2, attendStreakEvery: 7, attendStreakBonus: 5,   // 하루 첫 접속 +2, 7일 연속마다 +5 더
  missionOrders: 3, missionGems: 3,                            // 오늘의 미션: 의뢰 3건 납품하면 다이아 +3
  fairyGemChance: .2,                                          // 요정을 눌렀을 때 다이아 1개가 나올 확률
  // '쓸어서 한 번에'는 도구를 사야 열림: 물주기=물조리개(2칸), 수확=수확 장갑(2칸), 땅 갈기·심기=둘 다 샀을 때
  idleYawnMin: 4,                // 이만큼(분) 손대지 않으면 큰 달해가 하품하러 나옴
  startSeeds: { tulip: 4, daisy: 4, sunflower: 2 },
};

// 화면 배치 (기기 픽셀 기준). pad = 가로 2000×1200, phone = 세로 1220×2712
const LAYOUT = {
  pad: {
    W: 2000, H: 1200,
    clockPlate: [60, 35, 580, 230],
    clock: { x: 95, y: 30, big: 130, small: 40, lineY: 195 },
    gems: [1420, 50, 380, 90],
    save: [1800, 160, 170, 50],
    garden: { x0: 300, y: 440, bedW: 549, gap: 60, mode: 'free', fadeFrom: 200, fadeTo: 300 },
    board: [790, 120, 390, 290], mailbox: [1240, 200, 200, 250],
    bottom: { y: 1015, h: 150 },
    buttons: i => [800 + 168 * i, 1015, 150, 150],
    fairy: [610, 1015, 150, 150],
    gh: { board: [1000, 75, 902, 902], gauges: [110, 320, 760, 500], makeAll: [110, 838, 760, 100] },
    toastY: 960,
  },
  phone: {
    W: 1220, H: 2712,
    clockPlate: [40, 50, 680, 260],
    clock: { x: 80, y: 55, big: 140, small: 44, lineY: 225 },
    gems: [720, 70, 460, 90],
    save: [960, 170, 220, 50],
    garden: { x0: 70, y: 900, bedW: 1080, gap: 140, mode: 'page' },
    board: [330, 310, 380, 270], mailbox: [760, 390, 170, 230],
    bottom: { y: 2028, h: 360 },
    buttons: i => i < 4 ? [40 + 287 * i, 2028, 265, 170] : [40 + 386 * (i - 4), 2218, 367, 170],
    fairy: [1010, 1800, 170, 170],
    gh: { board: [70, 860, 1080, 1080], gauges: [60, 330, 1100, 410], makeAll: [60, 758, 1100, 92] },
    toastY: 1960,
  },
};

// 화단 그림 안의 칸 좌표 (bed_base 709×701 기준)
const BED = { w: 709, h: 701, x0: 90, y0: 125, cw: 119, ch: 106, px: 128.3, py: 114 };

// 화면별 아래 버튼 (앞 4개 = 기능, 뒤 3개 = 이동)
const BUTTONS = {
  garden:     ['orders', 'shop', 'inventory', 'seed', 'room', 'garden', 'greenhouse'],
  greenhouse: ['orders', 'shop', 'craft', 'hint', 'room', 'garden', 'greenhouse'],
  room:       ['voice', 'today', 'calendar', 'shop', 'room', 'garden', 'greenhouse'],
};
BUTTONS.shop = [];
BUTTONS.lab = [];
const BTN_LABEL = {
  orders: '의뢰', mail: '우체통', shop: '상점', inventory: '인벤토리', seed: '지금 씨앗',
  room: '방', garden: '정원', greenhouse: '온실',
  craft: '씨앗 제작', hint: '힌트',
  voice: '말로 쓰기', today: '오늘 기록', calendar: '달력',
};

// 쇼핑 편지: 돈이 trigger 이상 모이면 우체통에 도착. 편지 안에서 cost만큼 내고 구매. (숫자는 임시)
const SHOP_MAILS = [
  { id: 'bed2', trigger: 250, cost: 250, from: '정원 가꾸기 모임', requires: null,
    body: '정원 한쪽에 빈 땅이 생겼어요.\n화단을 하나 더 만들어 볼까요?\n꽃을 더 많이 키울 수 있어요.',
    item: { kind: 'bed', name: '화단 (2번째)' } },
  { id: 'bed3', trigger: 600, cost: 600, from: '정원 가꾸기 모임', requires: 'bed2',
    body: '정원이 잘 가꿔지고 있네요.\n옆에 화단을 하나 더 만들 수 있어요.',
    item: { kind: 'bed', name: '화단 (3번째)' } },
  { id: 'bed4', trigger: 1500, cost: 1500, from: '정원 가꾸기 모임', requires: 'bed3',
    body: '꽃이 이렇게 많아지다니 대단해요.\n넉넉한 땅을 한 자리 더 드릴게요.',
    item: { kind: 'bed', name: '화단 (4번째)' } },
  { id: 'bed5', trigger: 3000, cost: 3000, from: '정원 가꾸기 모임', requires: 'bed4',
    body: '이제 정원이 꽃밭이 다 되었네요.\n마지막으로 화단 하나를 더 만들어 드릴게요.',
    item: { kind: 'bed', name: '화단 (5번째)' } },
  { id: 'can2', trigger: 150, cost: 150, from: '원예용품점', requires: null,
    body: '안녕하세요, 원예용품점이에요.\n한 번에 두 칸에 물을 주는 조리개가 새로 들어왔어요.\n이걸 쓰면 손가락으로 쓸어서 여러 칸에 물을 줄 수도 있어요.',
    item: { kind: 'can', v: 2, name: '물조리개 (2칸)' } },
  { id: 'outfit1', trigger: 250, cost: 250, from: '옷가게', requires: null,
    body: '정원에서 입기 좋은 새 옷이 도착했어요.\n달해에게 잘 어울릴 것 같아요.',
    item: { kind: 'outfit', name: '정원 앞치마' } },
  { id: 'glove2', trigger: 200, cost: 200, from: '원예용품점', requires: null,
    body: '수확할 때 두 송이를 한 번에 거두는 장갑이에요.\n이걸 끼면 손가락으로 쓸어서 여러 송이를 거둘 수도 있어요.',
    item: { kind: 'glove', v: 2, name: '수확 장갑 (2칸)' } },
  { id: 'can4', trigger: 1000, cost: 1000, from: '원예용품점', requires: 'can2',
    body: '이번엔 네 칸에 한꺼번에 물을 주는 큰 조리개예요.\n화단 하나가 금방 촉촉해져요.',
    item: { kind: 'can', v: 4, name: '물조리개 (4칸)' } },
  { id: 'glove4', trigger: 1750, cost: 1750, from: '원예용품점', requires: 'glove2',
    body: '이번엔 네 송이를 한꺼번에 거두는 큰 장갑이에요.',
    item: { kind: 'glove', v: 4, name: '수확 장갑 (4칸)' } },
  { id: 'outfit2', trigger: 2000, cost: 2000, from: '옷가게', requires: 'outfit1',
    body: '봄꽃 무늬 원피스가 나왔어요.\n꽃 정원에 딱 어울려요.',
    item: { kind: 'outfit', name: '꽃무늬 원피스' } },
];

// 꾸미기 소품 (상점에서 돈으로 구매, 가격은 임시). place: garden 정원 / room 방 / gh 온실, wall: 벽에 거는 물건
const PROPS = [
  { id: 'g1', place: 'garden', name: '분수', cost: 4380 }, { id: 'g2', place: 'garden', name: '나무 벤치', cost: 720 },
  { id: 'g3', place: 'garden', name: '튤립 화분', cost: 200 }, { id: 'g4', place: 'garden', name: '튤립 나무통', cost: 280 },
  { id: 'g5', place: 'garden', name: '물조리개 화분', cost: 220 }, { id: 'g6', place: 'garden', name: '꽃등 가로등', cost: 600 },
  { id: 'g7', place: 'garden', name: '풍차', cost: 3000, sc: 1.7 }, { id: 'g8', place: 'garden', name: '새집', cost: 380 },
  { id: 'g10', place: 'garden', name: '나비 조각', cost: 1320 },
  { id: 'g11', place: 'garden', name: '토끼 조각', cost: 1000 }, { id: 'g12', place: 'garden', name: '나무 울타리', cost: 480 },
  { id: 'r1', place: 'room', name: '꽃무늬 러그', cost: 850 }, { id: 'r2', place: 'room', name: '스탠드', cost: 600 },
  { id: 'r3', place: 'room', name: '책장', cost: 1880 }, { id: 'r4', place: 'room', name: '쿠션', cost: 280 },
  { id: 'r5', place: 'room', name: '토끼 인형', cost: 720 }, { id: 'r6', place: 'room', name: '꽃 화병', cost: 220 },
  { id: 'r7', place: 'room', name: '리본 물조리개', cost: 380 }, { id: 'r8', place: 'room', name: '꽃 액자', cost: 480, wall: true },
  { id: 'r9', place: 'room', name: '티 트레이', cost: 320 }, { id: 'r10', place: 'room', name: '벽시계', cost: 1320, wall: true },
  { id: 'r11', place: 'room', name: '고양이 방석', cost: 1000 }, { id: 'r12', place: 'room', name: '바구니 화분', cost: 280 },
  { id: 'h1', place: 'gh', name: '걸이 화분', cost: 280 }, { id: 'h2', place: 'gh', name: '사다리 선반', cost: 1320 },
  { id: 'h3', place: 'gh', name: '물조리개 탁자', cost: 600 }, { id: 'h4', place: 'gh', name: '유리 온실 상자', cost: 1880 },
  { id: 'h5', place: 'gh', name: '나비 장식', cost: 720 }, { id: 'h6', place: 'gh', name: '전구 줄', cost: 480 },
  { id: 'h7', place: 'gh', name: '새장', cost: 1000 }, { id: 'h8', place: 'gh', name: '꽃 벤치', cost: 850 },
  { id: 'h9', place: 'gh', name: '꽃 아치', cost: 3000 }, { id: 'h11', place: 'gh', name: '나무 물통', cost: 320 },
  { id: 'h12', place: 'gh', name: '돌 화분', cost: 380 },
];
const PROP = Object.fromEntries(PROPS.map(p => [p.id, p]));
// 자리: 곳마다 자리 수는 같고(산 소품이 그 자리에 놓임), 기기별로 좌표만 다름. a 'b' = 바닥(발 기준), 'c' = 가운데(벽·매달림)
const DECOR_COUNT = { garden: 3, room: 6, gh: 3 };      // room: 앞 4개 바닥, 뒤 2개 벽
const DECOR_SLOTS = {
  pad: {
    garden: [{ x: 600, y: 455, w: 150, h: 150, a: 'b' }, { x: 1560, y: 455, w: 200, h: 170, a: 'b' }, { x: 1800, y: 455, w: 170, h: 150, a: 'b' }],
    room: [{ x: 210, y: 1005, w: 380, h: 300, a: 'b' }, { x: 470, y: 1005, w: 260, h: 300, a: 'b' }, { x: 1420, y: 1005, w: 260, h: 300, a: 'b' }, { x: 1700, y: 1005, w: 260, h: 300, a: 'b' },
           { x: 915, y: 300, w: 190, h: 300, a: 'c' }, { x: 1115, y: 300, w: 190, h: 300, a: 'c' }],
    gh: [{ x: 700, y: 190, w: 110, h: 170, a: 'c' }, { x: 815, y: 190, w: 110, h: 170, a: 'c' }, { x: 930, y: 190, w: 110, h: 170, a: 'c' }],
  },
  phone: {
    garden: [{ x: 120, y: 890, w: 220, h: 220, a: 'b' }, { x: 720, y: 890, w: 200, h: 200, a: 'b' }, { x: 1100, y: 890, w: 220, h: 220, a: 'b' }],
    room: [{ x: 240, y: 2000, w: 360, h: 320, a: 'b' }, { x: 560, y: 2000, w: 290, h: 320, a: 'b' }, { x: 850, y: 2000, w: 290, h: 320, a: 'b' }, { x: 1080, y: 2000, w: 290, h: 320, a: 'b' },
           { x: 150, y: 800, w: 210, h: 300, a: 'c' }, { x: 1000, y: 1150, w: 210, h: 300, a: 'c' }],
    gh: [{ x: 800, y: 255, w: 150, h: 170, a: 'c' }, { x: 960, y: 255, w: 150, h: 170, a: 'c' }, { x: 1110, y: 255, w: 150, h: 170, a: 'c' }],
  },
};
// 특수꽃 (도감 초안 기준). ing = 재료 3개 (seed:꽃씨 · bloom:수확한 꽃 · sp:특수 꽃씨), grade = 내부 등급(화면에 안 보임), hue = 후광 색
const SPECIAL_COST = [0, 1, 2, 4, 7, 12];   // 등급별 연구 포인트
const SPECIALS = [
  { id: 'sp01', name: '유혹하는 튤립', grade: 1, ing: ['seed:tulip', 'seed:tulip', 'seed:tulip'], hue: 0 },
  { id: 'sp02', name: '수줍은 데이지', grade: 1, ing: ['seed:daisy', 'seed:tulip', 'seed:daisy'], hue: 9 },
  { id: 'sp03', name: '졸린 데이지', grade: 1, ing: ['seed:daisy', 'seed:daisy', 'seed:daisy'], hue: 18 },
  { id: 'sp04', name: '만병통치 해바라기', grade: 1, ing: ['seed:sunflower', 'seed:daisy', 'seed:tulip'], hue: 27 },
  { id: 'sp05', name: '고개 숙인 해바라기', grade: 1, ing: ['seed:sunflower', 'seed:tulip', 'seed:sunflower'], hue: 36 },
  { id: 'sp06', name: '줄무늬 튤립', grade: 1, ing: ['seed:tulip', 'seed:sunflower', 'seed:tulip'], hue: 45 },
  { id: 'sp07', name: '색이 바뀌는 라벤더', grade: 2, ing: ['seed:lavender', 'seed:daisy', 'seed:sunflower'], hue: 54 },
  { id: 'sp08', name: '잠꾸러기 라벤더', grade: 2, ing: ['seed:lavender', 'seed:tulip', 'seed:lavender'], hue: 63 },
  { id: 'sp09', name: '밤에만 피는 장미', grade: 2, ing: ['seed:rose', 'seed:lavender', 'seed:tulip'], hue: 72 },
  { id: 'sp10', name: '가시 없는 장미', grade: 2, ing: ['seed:rose', 'seed:daisy', 'seed:tulip'], hue: 81 },
  { id: 'sp11', name: '수다쟁이 장미', grade: 2, ing: ['seed:rose', 'seed:sunflower', 'seed:tulip'], hue: 90 },
  { id: 'sp12', name: '꿀 해바라기', grade: 2, ing: ['seed:lavender', 'seed:sunflower', 'seed:lavender'], hue: 99 },
  { id: 'sp13', name: '튤립장미', grade: 2, ing: ['seed:rose', 'seed:tulip', 'seed:tulip'], hue: 108 },
  { id: 'sp14', name: '잠시 춤추는 라벤더', grade: 2, ing: ['seed:lavender', 'seed:lavender', 'seed:daisy'], hue: 117 },
  { id: 'sp15', name: '울보 수국', grade: 3, ing: ['seed:hydrangea', 'seed:daisy', 'bloom:rose'], hue: 126 },
  { id: 'sp16', name: '변덕쟁이 수국', grade: 3, ing: ['seed:hydrangea', 'seed:lavender', 'bloom:lavender'], hue: 135 },
  { id: 'sp17', name: '무지개 수국', grade: 3, ing: ['seed:hydrangea', 'seed:rose', 'bloom:sunflower'], hue: 144 },
  { id: 'sp18', name: '바람난 코스모스', grade: 3, ing: ['seed:cosmos', 'seed:tulip', 'bloom:daisy'], hue: 153 },
  { id: 'sp19', name: '소문난 코스모스', grade: 3, ing: ['seed:cosmos', 'seed:sunflower', 'bloom:cosmos'], hue: 162 },
  { id: 'sp20', name: '첫사랑 프리지아', grade: 3, ing: ['seed:freesia', 'seed:rose', 'bloom:freesia'], hue: 171 },
  { id: 'sp21', name: '봄이 온 프리지아', grade: 3, ing: ['seed:freesia', 'seed:tulip', 'bloom:rose'], hue: 180 },
  { id: 'sp22', name: '안개 속 코스모스', grade: 3, ing: ['seed:cosmos', 'seed:hydrangea', 'bloom:tulip'], hue: 189 },
  { id: 'sp23', name: '고마운 카네이션', grade: 4, ing: ['seed:carnation', 'seed:daisy', 'sp:sp13'], hue: 198 },
  { id: 'sp24', name: '효도 카네이션', grade: 4, ing: ['seed:carnation', 'seed:rose', 'sp:sp14'], hue: 207 },
  { id: 'sp25', name: '웃는 작약', grade: 4, ing: ['seed:peony', 'seed:sunflower', 'sp:sp07'], hue: 216 },
  { id: 'sp26', name: '함박 작약', grade: 4, ing: ['seed:peony', 'seed:hydrangea', 'sp:sp08'], hue: 225 },
  { id: 'sp27', name: '부끄러운 작약', grade: 4, ing: ['seed:peony', 'seed:tulip', 'sp:sp09'], hue: 234 },
  { id: 'sp28', name: '달콤한 카네이션', grade: 4, ing: ['seed:carnation', 'seed:freesia', 'sp:sp10'], hue: 243 },
  { id: 'sp29', name: '보름달 작약', grade: 4, ing: ['seed:peony', 'seed:cosmos', 'sp:sp11'], hue: 252 },
  { id: 'sp30', name: '약속의 카네이션', grade: 4, ing: ['seed:carnation', 'seed:peony', 'sp:sp12'], hue: 261 },
  { id: 'sp31', name: '꿈꾸는 작약', grade: 4, ing: ['seed:peony', 'seed:lavender', 'sp:sp13'], hue: 270 },
  { id: 'sp32', name: '달빛 백합', grade: 5, ing: ['seed:lily', 'bloom:rose', 'sp:sp22'], hue: 279 },
  { id: 'sp33', name: '새하얀 백합', grade: 5, ing: ['seed:lily', 'bloom:daisy', 'sp:sp15'], hue: 288 },
  { id: 'sp34', name: '눈 속의 동백', grade: 5, ing: ['seed:camellia', 'bloom:hydrangea', 'sp:sp16'], hue: 297 },
  { id: 'sp35', name: '겨울잠 동백', grade: 5, ing: ['seed:camellia', 'bloom:lavender', 'sp:sp17'], hue: 306 },
  { id: 'sp36', name: '붉은 눈물 동백', grade: 5, ing: ['seed:camellia', 'bloom:rose', 'sp:sp18'], hue: 315 },
  { id: 'sp37', name: '별 백합', grade: 5, ing: ['seed:lily', 'bloom:cosmos', 'sp:sp19'], hue: 324 },
  { id: 'sp38', name: '천사의 백합', grade: 5, ing: ['seed:lily', 'bloom:carnation', 'sp:sp20'], hue: 333 },
  { id: 'sp39', name: '영원한 동백', grade: 5, ing: ['seed:camellia', 'bloom:peony', 'sp:sp21'], hue: 342 },
  { id: 'sp40', name: '문선화', grade: 5, ing: ['seed:lily', 'bloom:camellia', 'sp:sp22'], hue: 351 },
];
const SPECIAL = Object.fromEntries(SPECIALS.map(s => [s.id, s]));

// 특수 의뢰 사연 (의뢰인, 본문) — 메일로 옴
const SPECIAL_STORY = {
  sp01: ['동네 카페 사장', '손님들이 자꾸 그냥 지나가요. 입구에 두면 발이 저절로 멈추는 튤립이 있을까요?'],
  sp02: ['고백을 앞둔 대학생', '내일 고백하는데, 저보다 더 수줍은 꽃이랑 같이 편지를 주고 싶어요.'],
  sp03: ['야간 편의점 알바생', '밤샘 근무라 낮에 잠이 안 와요. 저 대신 졸아 줄 꽃이 있으면 위로가 될 것 같아요.'],
  sp04: ['동네 약국 할머니', '요즘 손님들이 약보다 꽃을 더 찾아요. 보기만 해도 낫는 해바라기 있을까요?'],
  sp05: ['사과하러 가는 회사원', '내일 부장님께 사과드리러 가요. 저랑 같이 고개 숙여 줄 해바라기가 필요해요.'],
  sp06: ['야구팀 응원단장', '우리 팀 유니폼처럼 줄무늬가 있는 튤립을 응원석에 놓고 싶어요.'],
  sp07: ['촬영장 메이크업 아티스트', '배우 기분에 따라 색이 바뀌는 꽃이면 분위기 읽기가 쉬울 것 같아요.'],
  sp08: ['마감 앞둔 웹툰 작가', '저는 잠을 못 자는데, 대신 자 줄 꽃이 있으면 좋겠어요. 곁에 두고 싶어요.'],
  sp09: ['밤 무대 피아니스트', '낮의 장미는 본 적이 없어요. 제 밤 공연에 올릴 밤에만 피는 장미를 찾고 있어요.'],
  sp10: ['유치원 원장', '아이들이 만져도 안전한 장미를 교실에 두고 싶어요.'],
  sp11: ['라디오 DJ', '방송 중에 저보다 말이 많은 꽃이 있으면 청취율이 오를 것 같아요.'],
  sp12: ['양봉 농가 주인', '우리 벌들이 줄을 서는 꽃을 밭 앞에 심고 싶어요.'],
  sp13: ['원예 동호회 회장', '튤립파와 장미파의 다툼을 끝낼 꽃이 필요해요. 한 줄기에 둘 다 피는 꽃이요.'],
  sp14: ['댄스학원 원장', '수강생 앞에서 같이 흔들려 줄 꽃이 있으면 좋겠어요.'],
  sp15: ['동네 극장 사장', '슬픈 영화 상영일마다 로비에 둘 울보 꽃을 찾고 있어요.'],
  sp16: ['결혼을 앞둔 예비 신부', '마음이 자꾸 바뀌는 저를 닮은 꽃으로 부케를 만들고 싶어요.'],
  sp17: ['초등학교 선생님', '그림 수업 교탁에 일곱 가지 색이 한 송이에 핀 꽃을 두고 싶어요.'],
  sp18: ['축제 기획자', '바람이 불 때마다 흔들리는 포토존용 꽃이 필요해요.'],
  sp19: ['시장 반찬가게 사장', '소문난 집이 되고 싶어요. 소문을 몰고 다니는 꽃이 있다면 부탁드려요.'],
  sp20: ['동창회 총무', '동창회 테이블에 첫사랑이 떠오르는 꽃을 올려 두고 싶어요.'],
  sp21: ['입학식 담당 교사', '입학식 교문에 놓을 환한 꽃이 필요해요. 봄이 온 것 같은 꽃이요.'],
  sp22: ['새벽 등산 안내원', '안개 낀 산길 이정표 옆에 둘 꽃을 찾고 있어요.'],
  sp23: ['졸업하는 제자', '선생님께 드릴 고맙다는 말이 저절로 나오는 꽃이 있을까요?'],
  sp24: ['군대에 있는 아들', '어머니께 전화 대신 보낼 꽃이에요. 마음을 대신 말해 줄 꽃이면 좋겠어요.'],
  sp25: ['무명 개그맨', '무대 뒤에서 제 개그에 웃어 줄 꽃이 필요해요. 한 송이라도 웃어 주면 힘이 나요.'],
  sp26: ['경양식집 사장', '함박스테이크집 입구에 두면 함박웃음이 나는 꽃이 있다고 들었어요.'],
  sp27: ['신인 배우', '첫 시사회에 들고 갈 꽃이에요. 저처럼 금방 붉어지는 꽃으로요.'],
  sp28: ['동네 제과점 사장', '빵 냄새와 어울리는 달콤한 향의 꽃을 진열대 옆에 두고 싶어요.'],
  sp29: ['한과 가게 주인', '둥근 한과 옆에 둘 보름달 같은 꽃을 부탁드려요.'],
  sp30: ['결혼 10주년 부부', '10년 전 약속을 기억하는 꽃을 서로에게 선물하고 싶어요.'],
  sp31: ['침구 가게 사장', '베개 옆에 두면 좋은 꿈을 꾸게 하는 꽃이 있다면 좋겠어요.'],
  sp32: ['야외 음악회 기획자', '달이 뜨면 빛나는 꽃으로 무대를 꾸미고 싶어요.'],
  sp33: ['동네 세탁소 사장', '얼룩 하나 없이 새하얀 꽃을 가게에 두고 싶어요. 저희 자랑이거든요.'],
  sp34: ['스키장 매점 사장', '눈밭에서 붉게 피는 꽃을 간판 옆에 두고 싶어요.'],
  sp35: ['동물원 사육사', '곰 우리 옆에 같이 겨울잠을 자는 꽃을 두고 싶어요.'],
  sp36: ['드라마 작가', '마지막 회 장면에 쓸 통째로 떨어지는 꽃이 필요해요.'],
  sp37: ['천문대 관장', '별을 보는 밤에 같이 빛나 줄 꽃이 있으면 좋겠어요.'],
  sp38: ['아기용품 가게 주인', '새로 태어난 아기에게 줄 선물용 꽃을 부탁드려요.'],
  sp39: ['백 년 된 국밥집 사장', '우리 가게처럼 시들지 않는 꽃을 찾고 있어요.'],
  sp40: ['케인', '달해 씨, 이건 제가 직접 드리는 부탁이에요. 문선농장의 이름을 딴 꽃 한 송이가 필요해요.'],
};
// 일반 꽃 6종 추가 예정 분 (그림이 나오면 FLOWERS에 옮김) — 재배시간만 미리 정함
/* 밭 수에 따라 열리는 꽃 종류: 1밭 6종 → 2밭 8종 → 3밭 9종 → 4밭 10종 → 5밭(마지막) 12종 */
const OPEN_BY_BEDS = [6, 8, 9, 10, 12];
const openKinds = () => Math.min(FLOWERS.length, OPEN_BY_BEDS[Math.min(G.S.beds.length, OPEN_BY_BEDS.length) - 1]);
const FUTURE_GROW = { cosmos: [8, 8], freesia: [12, 12], carnation: [18, 18], peony: [25, 25], lily: [35, 35], camellia: [50, 50] };
Object.assign(RULES, {
  mailUrl: 'https://script.google.com/macros/s/AKfycbwH0L7DihvS7wDojN2m4e2HcA_7zfCuRnvgXTZpZmeueK_G5b3C--L-ZKfXXginzIc4/exec',              // 구글 시트 편지함 주소 (Apps Script 웹 앱 주소)
  mailFrom: '달해',         // 답장에 적히는 보낸 사람
  matchKinds: 6,            // 온실 맞추기 판에 한 번에 나오는 꽃 종류 수 (판이 새로 만들어질 때마다 바뀜)
  specialFromBeds: 2,       // 밭이 이만큼 이상 되면 특수 의뢰가 오기 시작
  specialPerDay: 2,         // 하루에 오는 특수 의뢰 수
  specialGapMin: 120,       // 특수 의뢰가 오는 간격(분)
  specialOpen: 2,           // 동시에 열려 있는 특수 의뢰 수
  specialMult: [0, 2, 2, 3, 4, 5],     // 등급별 돈 배수
  specialGems: [0, 0, 1, 2, 3, 5],     // 등급별 다이아
});
