const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ── Message queue ──
let queue = [];
let isPlaying = false;
let playTimeout = null;
let autoTimer = null;
const AUTO_INTERVAL = 30000; // 30초 동안 조용하면 자동 메시지

// ── Auto messages ──
const autoMessages = [
  "안녕하세요..?","뭐지?","여기 뭐하는 곳이지?","신기하네??","와 이거 무야","헐",
  "누가 보고 있나??","누가 보구 있음???","이거 진짜임???????","사람 있나요??",
  "이거 되는건가","오 된다","개신깈ㅋㅋ","이거 누가하냐 ㅋㅋㅋㅋㅋ",
  "햄버거vs치킨","아 부장 뭐라카노","신기하다ㅋㅋㅋㅋㅋ","신기한 사이트 발견ㅋㅋ",
  "어쩌다 들어왔는데 이게 맞누?","광고 보고 옴ㅋㅋ","누가 만들었지","이거 재밌네",
  "다들 안녕","처음 와봄","와우","ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ","ㅇㅇ",
  "이거 진짜 되는거임ㄷㄷ","ㄹㅇ?","진짜?","오호","굿","반갑습니다~~",
  "좋은 하루","아 일하기 귀찬누","오마이걸 화이팅!","잘자요",
  "출석","1등","2등","3등","퇴근하고 싶다","집가고 싶다","배고프다",
  "점심 뭐먹지","저녁 뭐먹지","치킨 먹고싶다","피자 먹고싶다","햄버거 먹고싶다",
  "커피 마시는중","아메리카노 최고","졸리다","너무 졸림","살려줘","야근중",
  "퇴근시켜줘","월요일 싫어","금요일 좋다","주말 최고","월급날 언제냐ㅠㅠ",
  "돈 벌기 힘들다ㅠ","통장 잔고 눈물난다ㅠ","로또 사야지","로또 1등 가자",
  "출근하기 싫다","회의중","몰래 씀","수업중","공부하기 싫다","시험 망했다",
  "과제 하기 싫다","발표 떨린다","면접 긴장된다","합격했으면 좋겠다",
  "오늘 운 좋았음","오늘 재수없음","비 온다","날씨 좋네","덥다","춥다",
  "바람 좋다","하늘 예쁘다","산책중","버스 기다리는중","지하철 사람 많다",
  "택시 안잡힘","집가는 길","퇴근길 최고","출근길 최악","운동 가기 귀찮다",
  "헬스장 가는중","런닝중","걷는중","누워있는중","침대 최고","이불 밖은 위험해",
  "방 청소해야지","귀찮다","아무것도 하기 싫다","넷플릭스 보는중","유튜브 보는중",
  "게임중","롤하는중","배그하는중","영화 보는중","드라마 보는중","애니 보는중",
  "책 읽는중","음악 듣는중","노래 추천좀","요즘 뭐 재밌음?","다들 뭐함",
  "심심하다","심심해서 옴","심심한 사람","친구 어디감","외롭다","혼자다",
  "혼밥중","혼술중","인생이란","행복하고 싶다","행복하네","기분 좋다",
  "기분 별로다","우울함","괜찮아질거야","다 잘될거야","화이팅","힘내자",
  "오늘도 버틴다","살아있다","생존신고","아무말","아무말 대잔치","의미없는 글",
  "이거 보이는 사람","읽고 있나요","누군가 보고 있겠지","누가 내 글 읽을까",
  "신기한 경험","인터넷은 넓다","세상은 넓다","우주 어딘가의 누군가",
  "지구인 출석","대한민국 만세","서울 사람","부산 사람","대구 사람",
  "인천 사람","제주 사람","외국인 있나요","영어 못함","한국어 어렵다",
  "오늘 몇일이지","시간 빠르다","벌써 저녁이네","벌써 아침이네","새벽 감성",
  "감성 터진다","별 생각 없음","그냥 적어봄","지나가던 사람","익명의 한마디",
  "익명 최고","익명이라 좋네","이거 재밌다","계속 보게됨","누가 만든거지",
  "운영자 보고있나","운영자 화이팅","서버 안터지길","사람 많아지면 재밌겠다",
  "여기 뜨는구나","내 글 나오는거 맞음?","기다리는중","순서 언제옴",
  "10초 생각보다 길다","재밌네 이거","오 신기해","와 내 글 떴다","실시간인가?",
  "이거 실화냐","이런 사이트 처음봄","누가 아이디어 냈지","광장 컨셉 좋네",
  "익명으로 외치기","마음껏 외쳐본다","오늘 하루도 끝","내일도 화이팅",
  "물 마셔야지","배터리 12퍼","충전기 어디갔지","에어컨 틀까","창문 열까",
  "라면 먹고싶다","떡볶이 먹고싶다","김치찌개 먹고싶다","삼겹살 먹고싶다",
  "야식 참는중","다이어트중","살 빼야지","내일부터 운동","내일부터 공부",
  "내일부터 진짜","이번엔 진짜다","이번엔 진짜임","아마도","그럴수도",
  "모르겠다","알 것 같기도","아닌가","음...","흠","오...","와...","아...","하...",
  "ㅋㅋ 진짜","세상 참","인생 쉽지않네","그래도 살아간다","오늘도 화이팅입니다",
  "좋은 일 생기길","소원 하나 빌어봄","다들 행복하세요","행복은 가까이에",
  "물 한잔 마시세요","눈 좀 쉬세요","스트레칭 하세요","일어나세요","앉으세요",
  "누워계신가요","잠 안온다","새벽인데 안잠","밤샘중","게임하다 옴",
  "유튜브 알고리즘 무섭다","시간 순삭","벌써 한시간?","벌써 새벽?",
  "출근 망했다","지각각","늦잠 잤다","버스 놓침","지하철 놓침","와이파이 최고",
  "데이터 부족","핸드폰 바꾸고 싶다","노트북 사고싶다","카메라 사고싶다",
  "돈이 없다","돈 좀 주세요","통장아 미안","카드값 무섭다","쿠팡 그만",
  "장바구니 가득","충동구매 참는중","오늘은 참는다","못참겠다","결제 완료",
  "후회중","행복함","커피 리필","졸음 퇴치중","눈 감긴다","출석체크",
  "퇴근체크","퇴사하고싶다","사표는 마음속에","오늘도 직장인","학생 출석",
  "백수 출석","프리랜서 출석","사장님 출석","고양이 보고싶다","강아지 보고싶다",
  "냥냥","멍멍","고양이가 최고","강아지도 최고","동물 최고","하늘 본 사람",
  "창밖 보는중","비 냄새 좋다","노을 예쁘다","달이 밝네","별 보인다",
  "여름이다","겨울이다","봄이 좋다","가을이 좋다","벚꽃 보고싶다",
  "단풍 보고싶다","바다 가고싶다","여행 가고싶다","휴가 가고싶다",
  "제주도 가고싶다","일본 가고싶다","유럽 가고싶다","세계여행 하고싶다",
  "지구 한바퀴","랜덤 메시지","이 글을 본 당신","행운 +1","경험치 +1",
  "기분 +1","체력 -1","배고픔 +5","졸림 +10","커피 +1","물 +1",
  "웃음 +1","행복 +1","익명 최고 +1"
];

function getRandomMessage() {
  return autoMessages[Math.floor(Math.random() * autoMessages.length)];
}

function resetAutoTimer() {
  if (autoTimer) clearTimeout(autoTimer);
  autoTimer = setTimeout(() => {
    if (!isPlaying && queue.length === 0) {
      const text = getRandomMessage();
      const id = 'auto_' + Date.now();
      queue.push({ text, id });
      playNext();
    }
    resetAutoTimer();
  }, AUTO_INTERVAL);
}


// Broadcast to all connected clients
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// Play next message in queue
function playNext() {
  if (queue.length === 0) {
    isPlaying = false;
    broadcast({ type: 'idle' });
    resetAutoTimer();
    return;
  }

  isPlaying = true;
  const message = queue.shift();

  // Tell everyone: show this message + update queue positions
  broadcast({ type: 'show', text: message.text });

  // Notify each client of their updated queue position
  notifyQueuePositions();

  // After 5 seconds, move to next
  playTimeout = setTimeout(() => {
    broadcast({ type: 'hide' });
    setTimeout(() => playNext(), 400); // wait for exit animation
  }, 5000);
}

// Notify each client of their position in queue
function notifyQueuePositions() {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.queueId) {
      const position = queue.findIndex(m => m.id === client.queueId);
      if (position >= 0) {
        client.send(JSON.stringify({ 
          type: 'queue_position', 
          position: position + 1 
        }));
      } else {
        client.queueId = null;
        client.send(JSON.stringify({ 
          type: 'queue_position', 
          position: -1 
        }));
      }
    }
  });
}

// ── WebSocket connections ──
wss.on('connection', (ws) => {
  // Send current state to new client
  if (isPlaying) {
    ws.send(JSON.stringify({ type: 'status', playing: true, queueLength: queue.length }));
  } else {
    ws.send(JSON.stringify({ type: 'idle' }));
  }

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.type === 'submit' && msg.text) {
        const text = msg.text.trim().slice(0, 20);
        if (!text) return;

        const id = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        queue.push({ text, id });

        // Track this client's message
        ws.queueId = id;

        // Tell this client their position
        const position = queue.findIndex(m => m.id === id) + 1;
        ws.send(JSON.stringify({ type: 'queue_position', position }));

        // Start playing if not already
        if (!isPlaying) playNext();
        resetAutoTimer();
      }
    } catch (e) {
      // ignore bad messages
    }
  });

  ws.on('close', () => {
    // Remove this client's pending messages from queue
    if (ws.queueId) {
      queue = queue.filter(m => m.id !== ws.queueId);
    }
  });
});

// ── Start server ──
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Holler server running on port ${PORT}`);
  resetAutoTimer();
});
