// 플라워빌리지 이야기(퀘스트). 가게에 들어가면 조건이 맞는 장면이 나옴. 이야기 장면은 하루 2번까지.
// 대사: [누가('k'=사장님, 'me'=주인공), 표정('n' 보통 · 's' 웃음), 글]. {me}=주인공 이름, {call}=부르는 말
'use strict';
const STORY_HERO = { me: '달해', call: '아가씨' };
const KEEPER = { seed: '윤하', flower: '정숙 이모', general: '만석 아저씨', furniture: '도윤' };
const FNAME = { tulip: '튤립', daisy: '데이지', sunflower: '해바라기', lavender: '라벤더', rose: '장미', hydrangea: '수국' };

const CHAT = {
  seed: ['오늘 들어온 씨앗이에요. 냄새부터 다르죠?', "꽃말 하나 알려 드릴까요? 데이지는 '희망'이래요.", '할머니는 씨앗을 손바닥에 올려 보고 좋은 걸 고르셨대요. 저는 아직 멀었어요.', '비 오는 날엔 가게가 조용해서 좋아요.', '{me} 씨 밭은 요즘 어때요?'],
  flower: ['아이고, 우리 {me} 왔네! 밥은 먹고 다니지?', '꽃은 아침에 따야 제일 싱싱해. 이건 비밀이다?', '박람회 때 되면 이 동네 꽃이 다 수도로 올라가.', '요즘 젊은 사람들은 손이 야무져서 좋아.', '꽃값이 좀 올랐어. 팔 거 있으면 가져와.'],
  general: ['어서 와요! 오늘 들어온 물건이… 아, 어제 거랑 같구나. 허허.', '이 주전자 말이에요, 50년 된 거예요. 아마도요.', '소식 하나 들었어요? …아, 아직 아무도 말 안 해 줬구나.', '우리 아들 녀석이 공부를 꽤 해요. 누구 닮았는지 몰라.', '물건 구경은 공짜예요. 마음껏 봐요.'],
  furniture: ['…어서 오세요.', '(대패질을 멈추지 않는다)', '나무는 거짓말을 안 해요.', '…그 화분대, 흔들리면 가져와요.', '박람회 아치요? …아직 생각 중이에요.'],
};

// 장면 목록. req: after(먼저 끝난 장면) · visits(이 가게 방문 수) · nextDay(after 장면이 끝난 다음 날부터) · prog(박람회 진행도) · any2(이 중 2개 이상 끝남)
// need: 꽃 {id:수} · any(아무 꽃 n송이) · best(가장 많은 꽃 n송이) · mini(미니게임 n초 버티기)
const SCENES = [
  // ── 1장 · 도착 ──
  { id: 'c1_seed', shop: 'seed', req: {}, lines: [
    ['k', 's', '어? 처음 뵙는 분이네요. 혹시 저 언덕 위 정원에 새로 오신 분이세요?'],
    ['me', 's', '네, {me}예요. 공기 좋은 데서 좀 쉬려고 왔어요.'],
    ['k', 't', '잘 오셨어요. 여긴 꽃 키우는 사람들 마을이라, 쉬기엔 딱이에요.'],
    ['k', 'n', '저도 도시에서 일하다 할머니 가게를 이어받았거든요. 처음엔 다 낯설었어요.'],
    ['k', 't', '아, 그리고 가을엔 수도에서 큰 꽃 박람회가 열려요. 우리 마을 꽃이 거기 다 올라가요.'],
    ['k', 's', '이건 환영 선물이에요. 튤립은 금방 자라서 시작하기 좋아요.']],
    reward: { seeds: { tulip: 5 } } },
  { id: 'c1_flower', shop: 'flower', req: {}, lines: [
    ['k', 't', '아이고, 새로 온 {call}가 이 {call}구나! 윤하가 벌써 소문 다 냈어.'],
    ['k', 's', '나는 정숙이. 다들 이모라고 불러. {call}도 그렇게 불러.'],
    ['k', 'n', '그래서 말인데… 솜씨 좀 볼까? 튤립 셋, 데이지 셋만 가져와 봐.']],
    need: { tulip: 3, daisy: 3 },
    done: [['k', 's', '어머, 색이 곱다! 이 정도면 우리 가게에 내놔도 되겠네.'], ['k', 't', '자, 첫 거래니까 넉넉히 쳐줄게. 자주 와!']],
    reward: { coins: 120 } },
  { id: 'c1_general', shop: 'general', req: {}, lines: [
    ['k', 't', '어서 와요! 아, 그 정원 새 주인! 다 들었어요. 이 마을엔 비밀이 없거든요.'],
    ['k', 's', '내가 만석이에요. 잡화점 하면서 마을 소식은 다 내 귀로 들어와요.'],
    ['k', 't', '윤하는 씨앗은 척척인데 장부 앞에선 울상이고, 정숙이 누님은 목소리로 마을을 깨우고…'],
    ['k', 'n', '도윤이는… 말을 안 해요. 그래도 손은 최고예요.'],
    ['k', 's', '자, 이건 이사 선물! 반짝이는 건 다 좋아하잖아요.']],
    reward: { gems: 1 } },
  { id: 'c1_furn_a', shop: 'furniture', req: {}, lines: [
    ['k', 'n', '…'], ['me', 't', '안녕하세요, 새로 온 {me}예요.'], ['k', 'n', '…네. (고개를 꾸벅 숙이고 다시 대패질을 한다)']] },
  { id: 'c1_furn_b', shop: 'furniture', req: { after: ['c1_furn_a'], nextDay: 'c1_furn_a' }, lines: [
    ['k', 'n', '…저번에 정원 지나가다 봤어요. 화분대가 기울었던데.'],
    ['k', 't', '남는 나무로 하나 만들었어요. 가져가요.'],
    ['me', 's', '와, 정말요? 고마워요!'], ['k', 's', '…(귀가 살짝 빨개진다)']],
    reward: { prop: 'n16' } },

  // ── 2장 · 박람회 준비 ──
  { id: 'c2_fair', shop: 'flower', req: { after: ['c1_seed', 'c1_flower', 'c1_general', 'c1_furn_b'] }, lines: [
    ['k', 't', '{me}야, 큰일이다! 아니, 좋은 일이다!'],
    ['k', 's', '올해 박람회 꽃 납품을 우리 마을이 다 맡게 됐어!'],
    ['k', 'n', '근데 일손이 모자라. …{me} 너도 같이 해 줄래?'],
    ['me', 's', '저도요? 좋아요, 해 볼게요!'],
    ['k', 's', '그래, 그 말 기다렸다! 게시판에 준비 상황 붙여 둘 테니 같이 채워 가자.']],
    reward: { flag: 'fair' } },
  { id: 'c2_sample', shop: 'flower', req: { after: ['c2_fair'], nextDay: 'c2_fair' }, lines: [
    ['k', 'n', '수도에서 견본을 먼저 보내 달래. 노랑이랑 보라로 꾸며 보자.'],
    ['k', 't', '해바라기 넷, 라벤더 셋. 할 수 있지?']],
    need: { sunflower: 4, lavender: 3 },
    done: [['k', 's', '이야, 이건 수도 사람들도 반하겠다!'], ['k', 't', '견본은 이모가 잘 싸서 보낼게. 수고했어, 우리 {me}.']],
    reward: { coins: 250, prog: 1 } },
  { id: 'c2_ledger', shop: 'seed', req: { after: ['c2_fair'], visits: 3 }, lines: [
    ['k', 'n', '아… {me} 씨, 잠깐만요. 이게 왜 안 맞지…'],
    ['k', 'n', '장부요. 숫자만 보면 머리가 하얘져요. 씨앗 이름은 백 개도 외우는데.']],
    choice: [
      { label: '같이 봐 줄게요', lines: [['k', 's', '정말요? …아, 여기 한 줄을 두 번 적었네요! 고마워요, {me} 씨.']] },
      { label: '천천히 해요, 내일 또 올게요', lines: [['k', 's', '네, 내일은 꼭 맞춰 둘게요. …그래도 와 줘서 고마워요.']] }],
    after: [['k', 't', '이건 고마움의 표시예요. 다음에 우리 가게에서 물건 살 때 써요. (10% 할인권)']],
    reward: { coupon: 1 } },

  // ── 3장 · 문제들 ──
  { id: 'c3_bug', shop: 'flower', req: { after: ['c2_sample'] }, lines: [
    ['k', 'n', '{me}야… 이모 좀 살려 줘.'],
    ['k', 'n', '박람회에 낼 꽃밭에 벌레가 새까맣게 붙었어. 밤새 잎을 다 갉아 먹는다니까.'],
    ['me', 't', '벌레요? 제가 한번 쫓아 볼게요!'],
    ['k', 't', '정말? 방에 있는 그 게임기 같은 걸로 연습한다며? 1분만 버텨 주면 내가 믿고 맡길게.']],
    need: { mini: 60 },
    done: [['k', 's', '세상에, 벌레가 싹 사라졌어! 우리 {me} 아니었으면 박람회 망칠 뻔했다.'], ['k', 't', '이건 이모 마음이야. 사양하지 마.']],
    reward: { coins: 300, gems: 1 } },
  { id: 'c3_loan', shop: 'general', req: { after: ['c2_sample'], visits: 5 }, lines: [
    ['k', 'n', '{me} 씨… 오늘은 내가 소식이 아니라 부탁이 있어요.'],
    ['k', 's', '우리 아들 녀석이 수도 대학에 붙었어요! 허허, 누굴 닮았는지.'],
    ['k', 'n', '그런데… 등록금이 1000골드 모자라요. 가게 물건을 다 팔아도 안 되네요.'],
    ['k', 'n', '염치없지만… 조금만 빌려줄 수 있을까요? 꼭 갚을게요.']],
    choice: [
      { label: '1000골드 빌려 드릴게요', coins: 1000, lines: [['k', 's', '정말요…? 이 은혜는 꼭 갚을게요. 아들한테도 꼭 말해 둘게요.']], set: 'loan',
        short: [['k', 's', '허허, 마음만으로도 고마워요. 지금은 {me} 씨도 넉넉하지 않잖아요. 어떻게든 해 볼게요.']] },
      { label: '지금은 어려워요', lines: [['k', 's', '아니에요, 괜찮아요. 말 꺼낸 내가 미안하지. 어떻게든 방법이 있을 거예요.']] }] },
  { id: 'c3_repay', shop: 'general', req: { loanDue: 6 }, lines: [
    ['k', 's', '{me} 씨! 드디어 왔네요. 기다렸어요.'],
    ['k', 't', '아들이 장학금을 받았대요! 덕분에 빌린 돈을 갚을 수 있게 됐어요.'],
    ['k', 's', '1200골드예요. 이자라고 생각하지 말고, 고마운 마음이라고 생각해요.'],
    ['k', 't', '그리고 이건… 우리 할머니 때부터 내려오는 장미 키우는 비법 쪽지예요. {me} 씨한테 주고 싶어요.']],
    reward: { coins: 1200, seeds: { rose: 5 }, gems: 2 } },
  { id: 'c3_fight_a', shop: 'seed', req: { after: ['c2_sample'], visits: 6 }, lines: [
    ['k', 'n', '……'],
    ['me', 't', '윤하 씨, 무슨 일 있어요?'],
    ['k', 'n', '아니요, 그냥… 도윤이랑 좀 다퉜어요. 할머니 씨앗 상자를 고쳐 달라고 맡겼는데, 완전히 새로 만들어 버렸지 뭐예요.'],
    ['k', 'n', '그 상자, 할머니가 쓰시던 거였는데…']] },
  { id: 'c3_fight_b', shop: 'furniture', req: { after: ['c3_fight_a'] }, lines: [
    ['k', 'n', '…윤하 얘기 들었죠.'],
    ['k', 'n', '그 상자… 바닥이 다 썩어 있었어요. 고치면 씨앗이 다 상해요.'],
    ['k', 't', '그래서 할머니 상자 뚜껑은 떼어서… 새 상자 안쪽에 붙여 뒀어요. 말을 못 했어요.'],
    ['me', 's', '그 말, 윤하 씨한테 꼭 해 줘요. 제가 같이 갈게요.']] },
  { id: 'c3_fight_c', shop: 'seed', req: { after: ['c3_fight_b'] }, lines: [
    ['me', 't', '윤하 씨, 도윤 씨가 할 말이 있대요. 그 전에… 꽃다발 하나 같이 만들어요.'],
    ['k', 'n', '꽃다발요? …좋아요. 장미랑 수국이면 좋겠어요.']],
    need: { rose: 3, hydrangea: 2 },
    done: [['k', 'n', '(도윤의 이야기를 듣는다)'], ['k', 's', '…바보. 그럼 처음부터 말하지.'], ['k', 's', '{me} 씨, 고마워요. 이 꽃다발은 상자 옆에 둘게요.']],
    reward: { gems: 2, flag: 'peace' } },

  // ── 4장 · 함께 만들기 ──
  { id: 'c4_arch', shop: 'furniture', req: { after: ['c3_fight_c'] }, lines: [
    ['k', 's', '…윤하가 아치에 꽃을 같이 엮재요.'],
    ['k', 't', '수국 넷, 장미 둘이면 돼요. 부탁해도 될까요.']],
    need: { hydrangea: 4, rose: 2 },
    done: [['k', 's', '…예쁘네요. 정말로.'], ['k', 't', '하나 더 만들었어요. {me} 씨 정원에도 두세요.']],
    reward: { prop: 'h9', prog: 1 } },
  { id: 'c4_wagon', shop: 'flower', req: { after: ['c3_bug'] }, lines: [
    ['k', 's', '벌레도 쫓았겠다, 이제 꽃마차를 꾸며 보자!'],
    ['k', 't', '종류는 상관없어. 꽃 열두 송이만 모아 줘. 알록달록할수록 좋아.']],
    need: { any: 12 },
    done: [['k', 's', '봐라, 이게 우리 마을 꽃마차다! 수도 사람들 눈 휘둥그레지겠어.']],
    reward: { coins: 500, prog: 1 } },
  { id: 'c4_town', shop: 'general', req: { any2: ['c3_bug', 'c3_fight_c', 'c3_loan'] }, lines: [
    ['k', 's', '{me} 씨, 마을 한 바퀴 돌아봤어요? 온 동네가 꽃 천지예요!'],
    ['k', 't', '이 마을이 이렇게 북적인 게 얼마 만인지… 다 {me} 씨가 오고 나서예요.'],
    ['k', 's', '이건 마을 사람들이 조금씩 모은 거예요. 받아 줘요.']],
    reward: { gems: 2, prog: 1 } },

  // ── 5장 · 박람회 ──
  { id: 'c5_expo', shop: 'flower', req: { prog: 4 }, lines: [
    ['k', 't', '{me}야, 드디어 내일이 박람회다!'],
    ['k', 's', '마지막으로 하나만. 네가 제일 아끼는 꽃, 다섯 송이만 내 보자. 네 이름 걸고.']],
    need: { best: 5 },
    done: [['k', 's', '…세상에. 이 꽃 보고 수도 사람들이 줄을 섰단다!'], ['k', 't', '심사위원이 이 꽃 키운 사람이 누구냐고 묻더라. 우리 {me}지, 누구겠어!'], ['k', 's', '상금이랑 리본은 네 거야. 정말 고생 많았다.']],
    reward: { coins: 500, gems: 3, flag: 'expo' } },
  { id: 'c5_after', shop: 'seed', req: { after: ['c5_expo'], nextDay: 'c5_expo' }, lines: [
    ['k', 's', '{me} 씨, 어제 박람회 이야기 마을에 다 퍼졌어요!'],
    ['k', 't', '처음 왔을 때가 엊그제 같은데… 이젠 {me} 씨 없는 마을은 상상이 안 돼요.'],
    ['k', 's', '내년에도 같이 준비해요. 그때는 저 불 꺼진 가게들에도 새 이웃이 올지 몰라요.']],
    reward: { gems: 1 } },

  // ── 마을 일손 돕기 (덧붙인 부탁들): 끝내면 연구 힌트를 줌. req.beds = 밭이 이만큼 열린 뒤에 ──
  // 윤하
  { id: 'v_y1', shop: 'seed', req: { after: ['c1_seed'], visits: 2 }, lines: [
    ['k', 'n', '{me} 씨, 이것 좀 봐 주실래요? 할머니 서랍에서 낡은 연구 수첩이 나왔어요.'],
    ['k', 'n', '글씨가 번져서 잘 안 읽히는데… 꽃을 옆에 놓고 보면 신기하게 읽혀요. 꽃 향으로 잉크를 만드셨나 봐요.'],
    ['k', 't', '튤립 넷, 데이지 둘만 가져다주실래요?']],
    need: { tulip: 4, daisy: 2 },
    done: [['k', 's', '와, 읽혀요! 여기… 어떤 꽃씨를 만들 때 쓰는 재료가 적혀 있어요.'], ['k', 's', '{me} 씨가 먼저 알아야 할 것 같아서 적어 드릴게요.']],
    reward: { hint: 1, coins: 100 } },
  { id: 'v_y2', shop: 'seed', req: { after: ['v_y1'], nextDay: 'v_y1', visits: 4 }, lines: [
    ['k', 'n', '어제 읽은 수첩 뒤쪽에 또 있었어요. 비 오는 날 씨앗 말리는 법이랑… 이상한 메모요.'],
    ['k', 't', '해바라기 셋이랑 라벤더 셋이 있으면 나머지 글씨도 읽을 수 있을 것 같아요.']],
    need: { sunflower: 3, lavender: 3 },
    done: [['k', 's', '…찾았어요! 이 메모는 꼭 {me} 씨한테 필요할 것 같아요.']],
    reward: { hint: 1, coins: 150 } },
  { id: 'v_y3', shop: 'seed', req: { after: ['v_y2'], nextDay: 'v_y2', visits: 6 }, lines: [
    ['k', 'n', '수첩 마지막 장이에요. 여기부터는 할머니 글씨가 아닌 것 같아요. 누가 덧붙였나 봐요.'],
    ['k', 'n', '장미 둘, 수국 둘로 이름표를 만들어 두면 순서대로 정리돼서 읽기 쉬울 것 같아요.']],
    need: { rose: 2, hydrangea: 2 },
    done: [['k', 's', '이름표를 달아 두니 한눈에 보여요! 이 줄은 {me} 씨 몫이에요.']],
    reward: { hint: 2, coins: 200 } },
  { id: 'v_y4', shop: 'seed', req: { after: ['v_y3'], nextDay: 'v_y3', beds: 5 }, lines: [
    ['k', 's', '{me} 씨, 밭을 다 여셨다면서요? 소문이 벌써 났어요.'],
    ['k', 'n', '수첩 표지 안쪽에 접힌 쪽지가 하나 더 있어요. 백합 둘이랑 동백 둘로 눌러 펴야 열려요. 할머니다운 방법이죠.']],
    need: { lily: 2, camellia: 2 },
    done: [['k', 's', '…열렸어요! 할머니, 끝까지 숙제를 남기셨네요.']],
    reward: { hint: 2, gems: 1 } },
  // 정숙 이모
  { id: 'v_f1', shop: 'flower', req: { after: ['c1_flower'], visits: 2 }, lines: [
    ['k', 't', '{me}야, 마침 잘 왔다! 읍내 아줌마가 꽃다발 주문을 넣었는데 손이 모자라네.'],
    ['k', 'n', '데이지 넷, 해바라기 둘이면 돼. 해 줄 수 있지?']],
    need: { daisy: 4, sunflower: 2 },
    done: [['k', 's', '이야, 솜씨 좋네! 아줌마가 또 시키겠다.'], ['k', 't', '옛날에 이 마을에서 특별한 꽃씨를 만들던 할머니가 있었대. 그 얘기 한 조각 들려줄게.']],
    reward: { hint: 1, coins: 100 } },
  { id: 'v_f2', shop: 'flower', req: { after: ['v_f1'], nextDay: 'v_f1', visits: 4 }, lines: [
    ['k', 't', '이번엔 혼례 꽃이다! 장미 셋, 라벤더 둘. 향 좋게 부탁한다.']],
    need: { rose: 3, lavender: 2 },
    done: [['k', 's', '신부가 울었대, 꽃이 너무 예뻐서! 다 네 덕분이야.']],
    reward: { hint: 1, coins: 150 } },
  { id: 'v_f3', shop: 'flower', req: { after: ['v_f2'], nextDay: 'v_f2', visits: 6, beds: 2 }, lines: [
    ['k', 'n', '가을엔 새로 들어온 꽃도 팔아야지. 코스모스 셋, 프리지아 셋만 줘 봐.']],
    need: { cosmos: 3, freesia: 3 },
    done: [['k', 's', '색이 이렇게 섞이니 가게가 다 환하다!']],
    reward: { hint: 2, coins: 250 } },
  { id: 'v_f4', shop: 'flower', req: { after: ['v_f3'], nextDay: 'v_f3', beds: 5 }, lines: [
    ['k', 't', '{me}야, 밭 다 열었다며? 이모는 다 안다!'],
    ['k', 'n', '귀한 손님이 백합과 동백으로 큰 꽃바구니를 맞췄어. 백합 셋, 동백 셋만 가져와 줘.']],
    need: { lily: 3, camellia: 3 },
    done: [['k', 's', '이 바구니 하나로 가게 한 달은 먹고살겠다. 하하!']],
    reward: { hint: 2, coins: 400 } },
  // 만석 아저씨
  { id: 'v_g1', shop: 'general', req: { after: ['c1_general'], visits: 2 }, lines: [
    ['k', 't', '{me} 씨, 손 좀 빌려요. 포장 리본에 향을 입히려는데 라벤더랑 데이지가 필요해요.'],
    ['k', 'n', '라벤더 둘, 데이지 둘이면 돼요. 이 향이 잘 팔린다는 소문이에요.']],
    need: { lavender: 2, daisy: 2 },
    done: [['k', 's', '허허, 향이 은은하니 좋네요! 그리고 이건 소문으로 들은 건데…']],
    reward: { hint: 1, coins: 100 } },
  { id: 'v_g2', shop: 'general', req: { after: ['v_g1'], nextDay: 'v_g1', visits: 4, beds: 2 }, lines: [
    ['k', 's', '손님 중에 노래하듯 주문하는 분이 있어요. 프리지아 셋, 튤립 셋을 노래로 불러서 웃었지 뭐예요.']],
    need: { freesia: 3, tulip: 3 },
    done: [['k', 's', '허허, 그 손님 입이 귀에 걸렸어요!']],
    reward: { hint: 1, coins: 150 } },
  { id: 'v_g3', shop: 'general', req: { after: ['v_g2'], nextDay: 'v_g2', visits: 6, beds: 3 }, lines: [
    ['k', 'n', '우리 아들이 방학이라 내려온대요! 방에 카네이션을 꽂아 주고 싶어서요. 카네이션 셋, 해바라기 둘만요.']],
    need: { carnation: 3, sunflower: 2 },
    done: [['k', 's', '아들 녀석 방이 환해졌어요. 고마워요, {me} 씨!']],
    reward: { hint: 2, coins: 200 } },
  // 도윤
  { id: 'v_d1', shop: 'furniture', req: { after: ['c1_furn_b'], visits: 3 }, lines: [
    ['k', 'n', '…'],
    ['k', 'n', '…씨앗 상자 손잡이에 해바라기를 새기고 싶어요. 실물을 보고요.'],
    ['k', 'n', '…두 송이만.']],
    need: { sunflower: 2 },
    done: [['k', 's', '…고마워요. (한참 꽃을 들여다보며 조각칼을 든다)'], ['k', 'n', '…새기다 나온 메모예요. 읽어 봐요.']],
    reward: { hint: 1, coins: 100 } },
  { id: 'v_d2', shop: 'furniture', req: { after: ['v_d1'], nextDay: 'v_d1', visits: 5 }, lines: [
    ['k', 'n', '…나무 향이 너무 진해요. 라벤더가 있으면 가려질 것 같아서.'],
    ['k', 'n', '…네 송이만.']],
    need: { lavender: 4 },
    done: [['k', 's', '…좋은 냄새. 이제 일이 잘돼요.']],
    reward: { hint: 1, coins: 150 } },
  { id: 'v_d3', shop: 'furniture', req: { after: ['v_d2'], nextDay: 'v_d2', visits: 7, beds: 4 }, lines: [
    ['k', 'n', '…작약. 이 마을 사람들은 작약을 걸어 두면 일이 잘 풀린다고 믿어요.'],
    ['k', 'n', '…두 송이만 부탁해요.']],
    need: { peony: 2 },
    done: [['k', 's', '…고마워요. 이건… 제 마음이에요.']],
    reward: { hint: 2, coins: 250 } },
];

const Story = (() => {
  const fill = t => t.replace(/\{me\}/g, STORY_HERO.me).replace(/\{call\}/g, STORY_HERO.call);
  function S() {
    const s = G.S.story = G.S.story || {};
    s.done = s.done || {}; s.doneDay = s.doneDay || {}; s.active = s.active || {}; s.v = s.v || {}; s.vt = s.vt || {}; s.prog = s.prog || 0;
    s.flags = s.flags || {}; if (s.day !== todayKey()) { s.day = todayKey(); s.cnt = 0; } return s;
  }
  const reqOk = (sc, s) => {
    const r = sc.req || {};
    if (r.after && !r.after.every(id => s.done[id])) return false;
    if (r.nextDay && s.doneDay[r.nextDay] === todayKey()) return false;
    if (r.visits && (s.v[sc.shop] || 0) < r.visits) return false;
    if (r.prog && s.prog < r.prog) return false;
    if (r.beds && G.S.beds.length < r.beds) return false;
    if (r.any2 && r.any2.filter(id => s.done[id]).length < 2) return false;
    if (r.loanDue && !(s.loan && s.loan.days >= r.loanDue)) return false;
    if (sc.need && sc.need.mini && !G.S.owned.p_console) return false;   // 문플로: 게임기를 산 뒤에
    return true;
  };
  const needText = n => {
    if (n.mini) return `미니게임에서 ${n.mini}초 버티기 (방 게임기)`;
    if (n.any) return `아무 꽃 ${n.any}송이`;
    if (n.best) return `가장 많이 가진 꽃 ${n.best}송이`;
    return Object.keys(n).map(id => `${FNAME[id] || FLOWER[id].name} ${Math.min(G.S.flowers[id] || 0, n[id])}/${n[id]}`).join(' · ');
  };
  const total = () => Object.values(G.S.flowers).reduce((a, b) => a + (b || 0), 0);
  const bestId = () => Object.keys(G.S.flowers).sort((a, b) => (G.S.flowers[b] || 0) - (G.S.flowers[a] || 0))[0];
  function canGive(n, s) {
    if (n.mini) return (s.mini || 0) >= n.mini;
    if (n.any) return total() >= n.any;
    if (n.best) return (G.S.flowers[bestId()] || 0) >= n.best;
    return Object.keys(n).every(id => (G.S.flowers[id] || 0) >= n[id]);
  }
  function take(n) {
    if (n.mini) return;
    if (n.best) { G.S.flowers[bestId()] -= n.best; return; }
    if (n.any) { let k = n.any; while (k > 0) { const id = bestId(); if (!G.S.flowers[id]) break; G.S.flowers[id]--; k--; } return; }
    for (const id in n) G.S.flowers[id] -= n[id];
  }
  function give(r, s) {
    if (!r) return; const got = [];
    if (r.coins) { G.S.coins += r.coins; got.push(`돈 +${r.coins}`); }
    if (r.gems) { G.S.gems += r.gems; got.push(`다이아 +${r.gems}`); }
    if (r.seeds) for (const id in r.seeds) { G.S.seeds[id] = (G.S.seeds[id] || 0) + r.seeds[id]; got.push(`${FNAME[id] || id} 씨앗 +${r.seeds[id]}`); }
    if (r.prop) { G.S.owned['p_' + r.prop] = true; got.push(`소품 「${PROP[r.prop].name}」`); }
    if (r.prog) { s.prog += r.prog; got.push('박람회 준비 +1'); }
    if (r.coupon) { s.coupon = 1; got.push('씨앗 가게 할인권'); }
    if (r.flag) s.flags[r.flag] = 1;
    let hm = ''; for (let i = 0; i < (r.hint || 0); i++) hm += giveHint();   // 연구 힌트 (알려 줄 게 없으면 빈 글)
    if (got.length || hm) toast(got.join(' · ') + hm, hm ? 5200 : 3200);
  }
  // 가게에 들어올 때: 진행 중 의뢰 → 새 장면(하루 2번) → 일상 대사
  let cur = null;
  function enter(shop) {
    const s = S(), now = Date.now();
    if (now - (s.vt[shop] || 0) > 10 * 60000) { s.v[shop] = (s.v[shop] || 0) + 1; s.vt[shop] = now; }
    if (shop === 'general' && s.loan && s.loan.last !== todayKey()) { s.loan.last = todayKey(); s.loan.days++; }
    const act = SCENES.find(sc => sc.shop === shop && s.active[sc.id]);
    const ASK = { seed: '부탁드린 건 어떻게 됐어요?', flower: '부탁한 건 어떻게 됐어?', general: '부탁한 거, 어떻게 돼 가요?', furniture: '…부탁한 거요.' };
    if (act) cur = { sc: act, lines: [['k', 'n', ASK[shop]]], i: 0, phase: 'lines', then: 'need' };
    else {
      const sc = s.cnt < 2 && SCENES.find(x => x.shop === shop && !s.done[x.id] && !s.active[x.id] && reqOk(x, s));
      if (sc) { s.cnt++; cur = { sc, lines: sc.lines.slice(), i: 0, phase: 'lines', then: sc.choice ? 'choice' : sc.need ? 'need' : 'end' }; }
      else { const c = CHAT[shop]; cur = { lines: [['k', 's', c[Math.floor(Math.random() * c.length)]]], i: 0, phase: 'lines', then: 'idle' }; }
    }
    save(); return cur;
  }
  function finish(sc, s) {
    if (sc.after) { cur.lines = sc.after.slice(); cur.i = 0; cur.phase = 'lines'; cur.then = 'reward'; return; }
    reward(sc, s);
  }
  function reward(sc, s) { delete s.active[sc.id]; s.done[sc.id] = 1; s.doneDay[sc.id] = todayKey(); give(sc.reward, s); cur.phase = 'idle'; save(); }
  // 화면 한 번 누름
  function next() {
    if (!cur || cur.phase !== 'lines') return;
    if (cur.i < cur.lines.length - 1) { cur.i++; return; }
    const s = S(), sc = cur.sc;
    if (cur.then === 'choice') { cur.phase = 'choice'; return; }
    if (cur.then === 'need') { if (!s.active[sc.id] && sc.need.mini) s.mini = 0; s.active[sc.id] = 1; cur.phase = 'need'; save(); return; }
    if (cur.then === 'end') { finish(sc, s); return; }
    if (cur.then === 'reward') { reward(sc, s); return; }
    if (cur.then === 'done') { finish(sc, s); return; }
    cur.phase = 'idle';
  }
  function choose(k) {
    const s = S(), sc = cur.sc, o = sc.choice[k];
    if (o.coins && G.S.coins < o.coins) { cur.lines = o.short; cur.i = 0; cur.phase = 'lines'; cur.then = 'end'; return; }
    if (o.coins) G.S.coins -= o.coins;
    if (o.set === 'loan') s.loan = { days: 0, last: todayKey() };
    cur.lines = o.lines.slice(); cur.i = 0; cur.phase = 'lines'; cur.then = 'end'; save();
  }
  function deliver() {
    const s = S(), sc = cur.sc; if (!canGive(sc.need, s)) return;
    take(sc.need); cur.lines = (sc.done || [['k', 's', '고마워요!']]).slice(); cur.i = 0; cur.phase = 'lines'; cur.then = 'done'; save();
  }
  function later() { cur.lines = [['k', 's', '천천히 해도 괜찮아요. 기다릴게요.']]; cur.i = 0; cur.phase = 'lines'; cur.then = 'idle'; }
  const line = () => cur && cur.lines[cur.i] ? cur.lines[cur.i] : null;
  return {
    hasQuest: shop => { const s = S(); return SCENES.some(x => x.shop === shop && s.active[x.id]) || (s.cnt < 2 && SCENES.some(x => x.shop === shop && !s.done[x.id] && !s.active[x.id] && reqOk(x, s))); },   // 마을 지도 느낌표용: 받을 부탁이나 진행 중인 부탁이 있나
    enter, next, choose, deliver, later, fill, needText, canGive: () => cur && cur.sc && canGive(cur.sc.need, S()),
    get cur() { return cur; }, line, coupon: () => G.S.story && G.S.story.coupon, useCoupon: () => { if (G.S.story) G.S.story.coupon = 0; },
    prog: () => (G.S.story && G.S.story.flags && G.S.story.flags.fair) ? G.S.story.prog || 0 : -1,
    mini: sec => { const s = S(); s.mini = Math.max(s.mini || 0, sec || 0); save(); },
  };
})();
