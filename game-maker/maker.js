/* =========================================================
   AI 게임 만들기 화면 (기본 / PRO 공용)
   ---------------------------------------------------------
   <body data-mode="basic|pro"> 에 따라 동작이 달라집니다.
   화면 구조도 여기서 만들어서 두 페이지가 같은 코드를 씁니다.
   ========================================================= */
(function () {
  var MODE = document.body.dataset.mode === "pro" ? "pro" : "basic";
  var PRO = MODE === "pro";
  // <body data-kind="quiz"> : 인물 퀴즈 전용 화면 (항상 인물 퀴즈 게임만 만듦)
  var QUIZ = document.body.dataset.kind === "quiz" && !!window.PersonQuizEditor;
  var ROOT = PRO || QUIZ ? "../" : "";    // game-maker/ 기준 경로
  var GM = window.GameMaker;
  GM.setMode(MODE);

  // ---------------- 화면 만들기 ----------------
  document.getElementById("app").innerHTML =
    '<div class="topbar">' +
      '<a class="brand" href="./">' + (PRO ? "🚀 AI 게임 만들기 PRO" : QUIZ ? "🧑‍🏫 인물 퀴즈 만들기" : "🤖 AI와 게임 만들기") + "</a>" +
      '<nav class="nav">' +
        '<a href="' + ROOT + './"' + (PRO || QUIZ ? "" : ' class="on"') + ">✏️ 만들기</a>" +
        '<a href="' + ROOT + 'quiz/"' + (QUIZ ? ' class="on"' : "") + ">🧑‍🏫 인물 퀴즈</a>" +
        '<a href="' + ROOT + 'pro/"' + (PRO ? ' class="on"' : "") + ">🚀 PRO</a>" +
        '<a href="' + ROOT + 'gallery.html">🎮 우리반 게임</a>' +
        '<a href="' + ROOT + '../">🌱 곶자왈 게임</a>' +
      "</nav>" +
    "</div>" +
    (QUIZ ? '<div class="pro-banner quiz-banner">🧑‍🏫 여기서는 꼭 <b>인물 퀴즈 게임</b>을 만들어요! 우리반 친구들이 PPT로 조사한 내용으로 만든 문제가 들어 있어요. 문제를 고치거나 더 넣어서 나만의 퀴즈 게임을 만들어 봐요.</div>' : "") +
    (PRO ? '<div class="pro-banner">🚀 PRO는 더 똑똑한 AI(Opus)가 여러 단계·보스·아이템·배경 음악이 있는 큰 게임을 만들어요. 만드는 데 3~6분 걸려요.</div>' : "") +
    '<div class="steps">' +
      '<div class="s on" data-step="1">① 생각 적기</div>' +
      '<div class="s" data-step="2">② AI 질문</div>' +
      '<div class="s" data-step="3">③ 만들기</div>' +
      '<div class="s" data-step="4">④ 놀기</div>' +
    "</div>" +
    '<div class="filebar">' +
      '<button class="btn small" id="loadBtn">📂 불러오기</button>' +
      '<button class="btn small" id="saveFileBtn">💾 내 컴퓨터에 저장</button>' +
      '<input type="file" id="loadFile" accept=".html,.htm,text/html" hidden />' +
      '<span class="hint" id="fileMsg"></span>' +
    "</div>" +

    // ① 아이디어
    '<section id="step1"><div class="card">' +
      '<h2>💡 내 게임 아이디어를 적어 볼까?</h2>' +
      '<p class="hint">🎤 버튼을 누르고 말해도 글자로 바뀌어요.</p>' +
      field("author", "🙋 내 이름", "", '<input type="text" id="author" maxlength="20" placeholder="예: 김지호" autocomplete="off" />', false) +
      field("title", "🏷️ 게임 이름", "", '<input type="text" id="title" maxlength="40" placeholder="' + (QUIZ ? "예: 역사 인물 퀴즈 탐험" : "예: 곶자왈 나비 구하기") + '" autocomplete="off" />', true) +
      (QUIZ
        ? '<div class="field"><label>🧑‍🏫 퀴즈에 넣을 인물과 문제 <span class="sub">(인물을 고르고, 이름을 눌러 문제를 고쳐요)</span></label><div id="quizEditor"></div></div>' +
          field("concept", "🌈 어떤 퀴즈 게임이야?", "(주인공, 장소, 이야기)", '<textarea id="concept" maxlength="1200" placeholder="예: 내가 시간 여행자가 되어 옛날 인물들을 만나러 가요. 인물마다 문을 열려면 퀴즈를 맞혀야 해요."></textarea>', true) +
          field("rules", "📏 퀴즈 규칙", "(맞히면? 틀리면? 언제 이겨?)", '<textarea id="rules" maxlength="1200" placeholder="예: 맞히면 별 1개! 틀리면 하트가 줄고 설명을 보여 줘요. 별 10개를 모으면 이겨요."></textarea>', true)
        : field("concept", "🌈 어떤 게임이야?", "(주인공, 장소, 이야기)", '<textarea id="concept" maxlength="1200" placeholder="예: 곶자왈 숲에서 나비가 길을 잃었어요. 내가 나비가 되어 꽃을 찾아 날아가요."></textarea>', true) +
          field("rules", "📏 게임 규칙", "(어떻게 하면 이기고, 어떻게 하면 져?)", '<textarea id="rules" maxlength="1200" placeholder="예: 꽃에 닿으면 1점! 새한테 닿으면 하트가 줄어요. 꽃 10개를 모으면 이겨요."></textarea>', true)) +
      '<div class="field"><label>🖼️ 그림 넣기 <span class="sub">(여러 장 넣을 수 있어요 · 종이 그림을 찍거나, 끌어다 놓거나, Ctrl+V로 붙여넣어도 돼요)</span></label>' +
        '<div class="imgs" id="imgs"></div>' +
        '<div class="genrow">' +
          '<input type="text" id="genPrompt" maxlength="200" placeholder="🎨 AI에게 그려 달라고 하기 (예: 귀여운 주황색 나비)" autocomplete="off" />' +
          '<button class="mic" data-for="genPrompt" aria-label="말로 적기">🎤</button>' +
          '<button class="btn small blue" id="genImg">🎨 AI로 그림 만들기</button>' +
        "</div>" +
        '<button class="btn small" id="addImg">📷 내 그림 추가</button>' +
        '<input type="file" id="imgFile" accept="image/*" multiple hidden />' +
      "</div>" +
      '<p class="hint" style="margin-top:14px">어떻게 적을지 모르겠으면 눌러 봐요 👇</p>' +
      '<div class="chips" id="examples"></div>' +
      '<div id="err1" class="err hidden"></div>' +
      '<div class="btns center"><button class="btn primary big" id="toQuestions">🤖 AI에게 보여주기</button></div>' +
    "</div></section>" +

    // ② AI 질문
    '<section id="step2" class="hidden">' +
      '<div class="card" id="qLoading"><div class="making"><span class="emoji">🤔</span>' +
        '<div class="msg">AI가 네 게임을 읽고 있어요…</div><p class="hint">궁금한 걸 물어볼 거예요</p></div></div>' +
      '<div class="card hidden" id="qBox">' +
        '<div class="summary"><span class="bot">🤖</span><div id="summary"></div></div>' +
        '<div id="checks" class="checks hidden"></div>' +
        '<p class="hint">더 멋진 게임을 만들려고 AI가 궁금한 게 있대요. 골라 주거나 직접 적어 줘!</p>' +
        '<div id="questions"></div>' +
        '<div id="err2" class="err hidden"></div>' +
        '<div class="btns"><button class="btn" id="back1">⬅️ 다시 적기</button>' +
        '<button class="btn primary big" id="toMake" style="margin-left:auto">✨ 게임 만들기!</button></div>' +
      "</div>" +
    "</section>" +

    // ③ 만드는 중
    '<section id="step3" class="hidden"><div class="card">' +
      '<div class="making"><span class="emoji" id="makeEmoji">🛠️</span>' +
        '<div class="msg" id="makeMsg">AI가 게임을 만들고 있어요!</div>' +
        '<div class="bar"><i id="makeBar"></i></div>' +
        '<p class="hint" id="makeHint"></p></div>' +
      '<div id="err3" class="err hidden"></div>' +
      '<div class="btns center hidden" id="retryBox">' +
        '<button class="btn" id="back2">⬅️ 돌아가기</button>' +
        '<button class="btn primary" id="retry">🔄 다시 만들기</button></div>' +
    "</div></section>" +

    // ④ 놀기
    '<section id="step4" class="hidden">' +
      '<div class="card">' +
        '<h2 id="playTitle">🎮 완성!</h2>' +
        '<p class="hint">게임 화면을 한 번 누르고 시작해요.</p>' +
        '<div class="stage" style="margin-top:12px"><iframe id="frame" sandbox="allow-scripts" allow="fullscreen; autoplay" allowfullscreen title="만든 게임"></iframe></div>' +
        '<div class="btns"><button class="btn" id="fullscreen">⛶ 크게 보기</button>' +
        '<button class="btn" id="replay">🔁 처음부터</button>' +
        '<button class="btn hidden" id="undo">↩️ 전으로 되돌리기</button>' +
        '<button class="btn" id="editIdea">✏️ 아이디어·그림 바꾸기</button></div>' +
      "</div>" +
      '<div class="card">' +
        '<h2>🔧 고치고 싶은 게 있어?</h2>' +
        '<p class="hint">예: "나비가 더 빨리 움직이게 해 줘", "배경을 밤으로 바꿔 줘", "보스를 더 크게 해 줘"</p>' +
        '<div class="inrow" style="margin-top:10px">' +
          '<textarea id="fixText" maxlength="600" style="min-height:80px" placeholder="여기에 적거나 🎤로 말해요"></textarea>' +
          '<button class="mic" data-for="fixText" aria-label="말로 적기">🎤</button></div>' +
        '<div class="refrow">' +
          '<span class="hint">🖼️ 다른 게임 참고하기 <span class="sub">(그래픽이 더 좋은 게임을 고르면 그 모습을 가져와요)</span></span>' +
          '<div class="btns" style="margin-top:6px">' +
            '<button class="btn small" id="refGallery">🎮 우리반 게임에서 고르기</button>' +
            '<button class="btn small" id="refFileBtn">📂 파일에서 고르기</button>' +
            '<input type="file" id="refFile" accept=".html,.htm,text/html" hidden />' +
          "</div>" +
          '<div id="refChosen" class="refchosen hidden"></div>' +
        "</div>" +
        '<div class="btns"><button class="btn purple" id="fix">🪄 AI에게 고쳐 달라고 하기</button></div>' +
      "</div>" +
      '<div class="card">' +
        '<h2>💾 다 만들었어?</h2>' +
        '<div class="btns">' +
          '<button class="btn green big" id="save">🌟 우리반 게임에 올리기</button>' +
          '<button class="btn hidden" id="saveNew">➕ 새 게임으로 올리기</button>' +
          '<button class="btn" id="download">💾 내 컴퓨터에 저장</button>' +
          '<button class="btn" id="newGame">🆕 새 게임 만들기</button></div>' +
        '<div id="saveMsg" class="hidden"></div>' +
      "</div>" +
    "</section>" +
    '<footer>© 무릉초 2학년 · 행복한 골든반</footer>';

  document.getElementById("modals").innerHTML =
    '<div class="modal-bg hidden" id="codeModal"><div class="modal">' +
      "<h2>🔑 " + (PRO ? "PRO 코드" : "교실 코드") + "</h2>" +
      '<p class="hint">선생님이 알려준 코드를 적어 주세요.</p>' +
      '<input type="text" id="codeInput" style="margin-top:14px;text-align:center" autocomplete="off" />' +
      '<div id="codeErr" class="err hidden"></div>' +
      '<div class="btns center"><button class="btn primary" id="codeOk">확인</button></div>' +
    "</div></div>" +
    '<div class="modal-bg hidden" id="refModal"><div class="modal wide">' +
      "<h2>🎮 참고할 게임 고르기</h2>" +
      '<p class="hint">그래픽을 참고하고 싶은 게임을 눌러 주세요.</p>' +
      '<div id="refList" class="reflist">불러오는 중… ⏳</div>' +
      '<div class="btns center"><button class="btn" id="refClose">닫기</button></div>' +
    "</div></div>";

  function field(id, label, sub, input, mic) {
    return '<div class="field"><label for="' + id + '">' + label + (sub ? ' <span class="sub">' + sub + "</span>" : "") + "</label>" +
      '<div class="inrow">' + input + (mic ? '<button class="mic" data-for="' + id + '" aria-label="말로 적기">🎤</button>' : "") + "</div></div>";
  }

  var $ = function (id) { return document.getElementById(id); };

  // ---------------- 상태 ----------------
  function emptyState() {
    return {
      idea: {},          // {author, title, concept, rules}
      images: [],        // [{dataUrl, orig, note, removeBg}]
      summary: "",
      questions: [],     // [{question, choices}]
      answers: [],       // ["...", ...]
      raw: "",           // 지금 게임 (그림은 "__IMG1__" 자리표시)
      history: [],       // 고치기 전 버전들
      galleryId: 0,      // 우리반 게임에 올린 번호 (있으면 '업데이트'로 같은 게임을 덮어씀)
      reference: null,   // 참고할 게임 {title, raw}
      quiz: QUIZ ? PersonQuizEditor.defaults() : null,  // 인물 퀴즈 문제 (인물 퀴즈 화면에서만)
      checks: []         // AI가 문제를 살펴보고 알려준 것 [{where, note}]
    };
  }
  var state = emptyState();
  var DRAFT_KEY = "gm_draft_" + (QUIZ ? "quiz" : MODE);

  // ---------------- 단계 이동 ----------------
  var current = 1;
  function go(n) {
    current = n;
    [1, 2, 3, 4].forEach(function (i) { $("step" + i).classList.toggle("hidden", i !== n); });
    document.querySelectorAll(".steps .s").forEach(function (el) {
      var s = +el.dataset.step;
      el.classList.toggle("on", s === n);
      el.classList.toggle("done", s < n);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function showErr(id, msg) { var el = $(id); el.textContent = msg; el.classList.toggle("hidden", !msg); }
  function flash(msg) { $("fileMsg").textContent = msg; setTimeout(function () { $("fileMsg").textContent = ""; }, 4000); }

  // ---------------- 예시 아이디어 ----------------
  var EXAMPLES = QUIZ ? [
    { label: "🐸 징검다리 퀴즈", title: "인물 퀴즈 징검다리",
      concept: "개구리가 연못을 건너요. 돌마다 옛날 인물 퀴즈가 있어요.",
      rules: "맞히면 다음 돌로 폴짝! 틀리면 물에 퐁당하고 설명을 본 뒤 다시 해요. 끝까지 건너면 이겨요." },
    { label: "⏳ 시간 여행 퀴즈", title: "시간 여행 인물 퀴즈",
      concept: "타임머신을 타고 옛날로 가서 인물들을 한 명씩 만나요. 인물을 만나면 그 사람에 대한 퀴즈가 나와요.",
      rules: "인물마다 문제를 다 맞히면 그 인물 카드를 모아요. 모든 인물 카드를 모으면 이겨요. 틀리면 하트가 하나 줄어요." },
    { label: "🎁 보물 상자 퀴즈", title: "인물 보물 상자 퀴즈",
      concept: "보물섬에 상자가 잔뜩 있어요. 상자를 열면 인물 퀴즈가 나와요.",
      rules: "맞히면 상자에서 금화가 나와요. 틀리면 상자가 잠겨요. 1분 동안 금화를 많이 모아요." }
  ] : PRO ? [
    { label: "🦋 나비 대모험", title: "곶자왈 나비 대모험",
      concept: "곶자왈 숲의 나비가 사라진 꽃의 씨앗을 찾아 여행해요. 숲, 동굴, 용암 언덕, 하늘을 지나요.",
      rules: "꽃씨를 모으고 거미와 벌을 피해요. 단계마다 새로운 장소가 나오고 마지막엔 커다란 거미 대장을 이겨야 해요." },
    { label: "🐢 거북이 레이스", title: "바다 거북이 레이스",
      concept: "제주 바다의 아기 거북이가 친구들과 바다 속 레이스를 해요.",
      rules: "해파리를 피하고 조개를 먹으면 빨라져요. 1등으로 도착하면 별을 받아요. 5개 코스가 있어요." },
    { label: "🧙 마법 퀴즈 탑", title: "마법사 퀴즈 탑",
      concept: "꼬마 마법사가 퀴즈를 풀며 탑을 올라가요. 층마다 몬스터가 있어요.",
      rules: "문제를 맞히면 마법으로 몬스터를 재워요. 틀리면 하트가 줄어요. 꼭대기에서 용을 깨우면 이겨요." }
  ] : [
    { label: "🦋 나비 꽃 모으기", title: "곶자왈 나비의 꽃 여행",
      concept: "곶자왈 숲에 사는 나비가 주인공이에요. 숲 속을 날아다니며 꽃을 찾아요.",
      rules: "꽃에 닿으면 1점! 거미줄에 걸리면 하트가 하나 줄어요. 꽃 10개를 모으면 이겨요. 하트 3개가 다 없어지면 져요." },
    { label: "🐸 징검다리 퀴즈", title: "개구리 징검다리 퀴즈",
      concept: "개구리가 연못을 건너요. 돌마다 곶자왈 퀴즈가 있어요.",
      rules: "문제를 맞히면 다음 돌로 폴짝! 틀리면 물에 퐁당하고 다시 해요. 끝까지 건너면 이겨요." },
    { label: "🍎 바구니 받기", title: "하늘에서 떨어지는 열매",
      concept: "하늘에서 열매가 떨어져요. 나는 바구니를 들고 있어요.",
      rules: "바구니를 좌우로 움직여서 열매를 받아요. 돌멩이를 받으면 안 돼요. 1분 동안 많이 받으면 좋아요." }
  ];
  EXAMPLES.forEach(function (ex) {
    var b = document.createElement("button");
    b.className = "chip"; b.textContent = ex.label;
    b.onclick = function () {
      $("title").value = ex.title; $("concept").value = ex.concept; $("rules").value = ex.rules; saveDraft();
    };
    $("examples").appendChild(b);
  });

  // ---------------- 입력 ↔ 상태 ----------------
  var FIELDS = ["author", "title", "concept", "rules"];
  function readIdea() {
    var idea = {};
    FIELDS.forEach(function (k) { idea[k] = $(k).value.trim(); });
    if (QUIZ) idea.quiz = state.quiz;
    return idea;
  }
  function writeIdea(idea) {
    FIELDS.forEach(function (k) { $(k).value = (idea && idea[k]) || ""; });
    if (QUIZ) {
      state.quiz = PersonQuizEditor.normalize(idea && idea.quiz);
      if (quizEditor) quizEditor.render();
    }
  }

  // 인물 퀴즈 문제 고치기
  var quizEditor = null;
  if (QUIZ) {
    quizEditor = PersonQuizEditor.mount($("quizEditor"), {
      get: function () { return state.quiz; },
      onChange: function () { saveDraft(); }
    });
  }

  // 새로고침해도 안 사라지게 이 기기에 임시 저장 (그림이 너무 크면 글만)
  function saveDraft() {
    var d = { idea: readIdea(), images: state.images.map(function (im) { return { dataUrl: im.dataUrl, note: im.note, removeBg: im.removeBg }; }) };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); }
    catch (e) { try { d.images = []; localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e2) {} }
  }
  try {
    var d0 = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
    if (d0.idea) writeIdea(d0.idea);
    if (d0.images) state.images = d0.images.map(function (im) { return Object.assign({ orig: im.dataUrl }, im); });
  } catch (e) {}
  FIELDS.forEach(function (k) { $(k).addEventListener("input", saveDraft); });

  // ---------------- 그림 넣기 ----------------
  var MAX_SIDE = 512;
  var MAX_IMAGES = 20;  // 서버도 20장까지 받아요
  $("addImg").onclick = function () {
    if (state.images.length >= MAX_IMAGES) return showErr("err1", "그림은 " + MAX_IMAGES + "장까지 넣을 수 있어요.");
    $("imgFile").click();
  };
  $("imgFile").onchange = function () {
    var files = Array.prototype.slice.call(this.files || []);
    this.value = "";
    addFiles(files);
  };

  // 파일 선택·끌어다 놓기·붙여넣기 모두 여기로
  async function addFiles(files) {
    files = files.filter(function (f) { return f && (/^image\//.test(f.type) || /\.(heic|heif)$/i.test(f.name || "")); });
    if (!files.length) return;
    showErr("err1", "");
    var failed = [];
    for (var i = 0; i < files.length; i++) {
      if (state.images.length >= MAX_IMAGES) { showErr("err1", "그림은 " + MAX_IMAGES + "장까지 넣을 수 있어요."); break; }
      try {
        var orig = await resizeImage(files[i]);
        state.images.push({ orig: orig, dataUrl: orig, note: "", removeBg: false });
      } catch (e) { failed.push(files[i]); }
    }
    renderImages(); saveDraft();
    if (failed.length) {
      var heic = failed.some(function (f) { return /heic|heif/i.test(f.type + " " + f.name); });
      showErr("err1", heic
        ? "아이폰·아이패드 사진(HEIC)은 이 브라우저에서 열 수 없어요. 사진을 화면 캡처해서 넣거나, 카메라 설정에서 '높은 호환성'으로 바꿔 찍어 주세요."
        : "열 수 없는 그림이 " + failed.length + "장 있었어요. 다른 그림을 골라 주세요.");
    }
  }

  // AI(Gemini)로 그림 만들기
  function b64ToBlob(b64, type) {
    var bin = atob(b64), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: type || "image/png" });
  }
  async function genImage() {
    var prompt = $("genPrompt").value.trim();
    if (!prompt) { $("genPrompt").focus(); return; }
    if (state.images.length >= MAX_IMAGES) return showErr("err1", "그림은 " + MAX_IMAGES + "장까지 넣을 수 있어요.");
    showErr("err1", "");
    var btn = $("genImg");
    btn.disabled = true; btn.textContent = "🎨 그리는 중…";
    try {
      var r = await withCode(function () { return GM.postJson("image", { prompt: prompt }); });
      var orig = await resizeImage(b64ToBlob(r.data, r.media_type));
      var isBg = /배경|풍경|하늘|숲 전체|바다 전체/.test(prompt);
      var im = { orig: orig, dataUrl: orig, note: prompt, removeBg: !isBg };
      if (im.removeBg) im.dataUrl = await removeBackground(orig);
      state.images.push(im);
      $("genPrompt").value = "";
      renderImages(); saveDraft();
    } catch (e) {
      showErr("err1", GM.friendlyError(e));
    } finally {
      btn.disabled = false; btn.textContent = "🎨 AI로 그림 만들기";
    }
  }
  $("genImg").onclick = genImage;
  $("genPrompt").addEventListener("keydown", function (e) { if (e.key === "Enter") genImage(); });

  // 끌어다 놓기 (① 단계 카드 어디든)
  var dropZone = $("step1");
  ["dragenter", "dragover"].forEach(function (t) {
    dropZone.addEventListener(t, function (e) {
      if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") !== -1) { e.preventDefault(); dropZone.classList.add("dropping"); }
    });
  });
  ["dragleave", "drop"].forEach(function (t) {
    dropZone.addEventListener(t, function () { dropZone.classList.remove("dropping"); });
  });
  dropZone.addEventListener("drop", function (e) {
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    addFiles(Array.prototype.slice.call(e.dataTransfer.files));
  });
  // 붙여넣기 (Ctrl+V) — ① 단계에서만
  document.addEventListener("paste", function (e) {
    if (current !== 1 || !e.clipboardData) return;
    var files = Array.prototype.slice.call(e.clipboardData.files || []);
    if (files.length) { e.preventDefault(); addFiles(files); }
  });

  function loadImg(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }
  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
  // 긴 쪽이 512px 가 되게 줄이고, 투명한 부분이 있으면 PNG, 아니면 JPEG
  async function resizeImage(file) {
    var img = await loadImg(await fileToDataUrl(file));
    var s = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    var w = Math.max(1, Math.round(img.width * s)), h = Math.max(1, Math.round(img.height * s));
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    var px = ctx.getImageData(0, 0, w, h).data, alpha = false;
    for (var i = 3; i < px.length; i += 16) if (px[i] < 250) { alpha = true; break; }
    return alpha ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.88);
  }

  // 종이 배경 지우기: 가장자리에서 이어진 '배경색과 비슷한' 픽셀만 투명하게 하고, 그림 크기에 맞게 자름
  async function removeBackground(src) {
    var img = await loadImg(src);
    var w = img.width, h = img.height;
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    var id = ctx.getImageData(0, 0, w, h), p = id.data;
    // 가장자리 픽셀들의 평균을 배경색으로
    var br = 0, bg = 0, bb = 0, n = 0;
    function addEdge(x, y) { var k = (y * w + x) * 4; br += p[k]; bg += p[k + 1]; bb += p[k + 2]; n++; }
    for (var x = 0; x < w; x += 2) { addEdge(x, 0); addEdge(x, h - 1); }
    for (var y = 0; y < h; y += 2) { addEdge(0, y); addEdge(w - 1, y); }
    br /= n; bg /= n; bb /= n;
    var TH = 70 * 70;
    function near(k) { var dr = p[k] - br, dg = p[k + 1] - bg, db = p[k + 2] - bb; return dr * dr + dg * dg + db * db < TH; }
    var seen = new Uint8Array(w * h), stack = [];
    function push(x, y) { var i = y * w + x; if (!seen[i] && near(i * 4)) { seen[i] = 1; stack.push(i); } }
    for (x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (stack.length) {
      var i = stack.pop(), px = i % w, py = (i / w) | 0;
      p[i * 4 + 3] = 0;
      if (px > 0) push(px - 1, py);
      if (px < w - 1) push(px + 1, py);
      if (py > 0) push(px, py - 1);
      if (py < h - 1) push(px, py + 1);
    }
    // 남은 그림 영역으로 자르기
    var minX = w, minY = h, maxX = -1, maxY = -1;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (p[(y * w + x) * 4 + 3] > 0) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    ctx.putImageData(id, 0, 0);
    if (maxX < 0) return src; // 다 지워지면 원래대로
    var cw = maxX - minX + 1, ch = maxY - minY + 1;
    var c2 = document.createElement("canvas"); c2.width = cw; c2.height = ch;
    c2.getContext("2d").drawImage(c, minX, minY, cw, ch, 0, 0, cw, ch);
    return c2.toDataURL("image/png");
  }

  function renderImages() {
    var box = $("imgs"); box.innerHTML = "";
    state.images.forEach(function (im, i) {
      var card = document.createElement("div"); card.className = "imgcard";
      var th = document.createElement("div"); th.className = "imgthumb";
      var img = document.createElement("img"); img.src = im.dataUrl; img.alt = "그림 " + (i + 1);
      th.appendChild(img);
      var num = document.createElement("span"); num.className = "imgnum"; num.textContent = i + 1;
      th.appendChild(num);
      var x = document.createElement("button"); x.className = "imgx"; x.textContent = "✕"; x.setAttribute("aria-label", "그림 빼기");
      x.onclick = function () { state.images.splice(i, 1); renderImages(); saveDraft(); };
      th.appendChild(x);
      var note = document.createElement("input");
      note.type = "text"; note.maxLength = 60; note.placeholder = "이 그림은? 예: 주인공 나비"; note.value = im.note || "";
      note.oninput = function () { im.note = note.value.trim(); saveDraft(); };
      var lab = document.createElement("label"); lab.className = "bgopt";
      var cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!im.removeBg;
      cb.onchange = async function () {
        im.removeBg = cb.checked;
        im.dataUrl = cb.checked ? await removeBackground(im.orig || im.dataUrl) : (im.orig || im.dataUrl);
        img.src = im.dataUrl; saveDraft();
      };
      lab.appendChild(cb); lab.appendChild(document.createTextNode(" 흰 배경 지우기"));
      card.appendChild(th); card.appendChild(note); card.appendChild(lab);
      box.appendChild(card);
    });
    $("addImg").classList.toggle("hidden", state.images.length >= MAX_IMAGES);
  }
  renderImages();

  // ---------------- 말로 적기 (음성 인식) ----------------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var listening = null;
  document.querySelectorAll(".mic").forEach(function (btn) {
    if (!SR) { btn.classList.add("hidden"); return; }
    btn.onclick = function () {
      if (listening) { listening.stop(); return; }
      var target = $(btn.dataset.for);
      var rec = new SR();
      rec.lang = "ko-KR"; rec.interimResults = true; rec.continuous = false;
      var before = target.value ? target.value.replace(/\s*$/, " ") : "";
      rec.onresult = function (ev) {
        var t = "";
        for (var i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
        target.value = before + t;
        target.dispatchEvent(new Event("input"));
      };
      rec.onend = function () { btn.classList.remove("listening"); listening = null; };
      rec.onerror = rec.onend;
      listening = rec; btn.classList.add("listening");
      try { rec.start(); } catch (e) { rec.onend(); }
    };
  });

  // ---------------- 교실 코드 ----------------
  function askCode() {
    return new Promise(function (resolve) {
      $("codeModal").classList.remove("hidden");
      $("codeInput").value = GM.getCode();
      $("codeInput").focus();
      showErr("codeErr", "");
      $("codeOk").onclick = async function () {
        var c = $("codeInput").value.trim();
        if (!c) return;
        GM.setCode(c);
        $("codeOk").disabled = true;
        try {
          await GM.postJson("check");
          $("codeModal").classList.add("hidden");
          resolve(true);
        } catch (e) {
          showErr("codeErr", GM.friendlyError(e));
        } finally { $("codeOk").disabled = false; }
      };
    });
  }
  $("codeInput").addEventListener("keydown", function (e) { if (e.key === "Enter") $("codeOk").click(); });

  async function withCode(fn) {
    try { return await fn(); }
    catch (e) {
      if (e.code !== "wrong_code") throw e;
      await askCode();
      return await fn();
    }
  }

  function apiIdea() {
    return Object.assign({}, state.idea, { images: GM.imagesForApi(state.images) });
  }

  // ---------------- ① → ② 질문 받기 ----------------
  $("toQuestions").onclick = async function () {
    var idea = readIdea();
    if (!idea.author) return showErr("err1", "🙋 내 이름을 적어 줘!");
    if (QUIZ) {
      var qErr = PersonQuizEditor.validate(state.quiz);
      if (qErr) return showErr("err1", qErr);
    } else if (!idea.concept && !idea.rules) return showErr("err1", "🌈 어떤 게임인지 조금만 적어 줘!");
    showErr("err1", "");
    state.idea = idea;
    go(2);
    $("qLoading").classList.remove("hidden"); $("qBox").classList.add("hidden");
    try {
      var data = await withCode(function () { return GM.postJson("questions", { idea: apiIdea() }); });
      state.summary = data.summary || "";
      state.questions = data.questions || [];
      state.checks = data.checks || [];
      state.answers = state.questions.map(function () { return ""; });
      renderQuestions();
    } catch (e) {
      go(1);
      showErr("err1", GM.friendlyError(e));
    }
  };

  function renderQuestions() {
    $("summary").textContent = state.summary;
    renderChecks();
    var box = $("questions"); box.innerHTML = "";
    state.questions.forEach(function (q, qi) {
      var wrap = document.createElement("div"); wrap.className = "q";
      var t = document.createElement("div"); t.className = "qt"; t.textContent = q.question;
      var ch = document.createElement("div"); ch.className = "choices";
      var input = document.createElement("input");
      input.type = "text"; input.placeholder = "✍️ 직접 적기"; input.maxLength = 200;
      var cur = state.answers[qi] || "";
      var matched = false;
      q.choices.forEach(function (c) {
        var b = document.createElement("button"); b.className = "choice"; b.textContent = c;
        if (cur && cur === c) { b.classList.add("on"); matched = true; }
        b.onclick = function () {
          ch.querySelectorAll(".choice").forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on"); input.value = ""; state.answers[qi] = c;
        };
        ch.appendChild(b);
      });
      if (cur && !matched) input.value = cur;
      input.oninput = function () {
        ch.querySelectorAll(".choice").forEach(function (x) { x.classList.remove("on"); });
        state.answers[qi] = input.value.trim();
      };
      wrap.appendChild(t); wrap.appendChild(ch); wrap.appendChild(input);
      box.appendChild(wrap);
    });
    $("qLoading").classList.add("hidden"); $("qBox").classList.remove("hidden");
  }

  // 인물 퀴즈: AI가 문제를 살펴보고 사실과 다르거나 헷갈리는 곳을 알려줌
  function renderChecks() {
    var box = $("checks");
    var list = (state.checks || []).filter(function (c) { return c && c.note; });
    box.classList.toggle("hidden", !list.length);
    box.innerHTML = "";
    if (!list.length) return;
    var t = document.createElement("b");
    t.textContent = "🔎 AI가 문제를 살펴봤어요";
    box.appendChild(t);
    var ul = document.createElement("ul");
    list.forEach(function (c) {
      var li = document.createElement("li");
      li.textContent = (c.where ? c.where + " — " : "") + c.note;
      ul.appendChild(li);
    });
    box.appendChild(ul);
    var p = document.createElement("p");
    p.className = "hint";
    p.textContent = "⬅️ '다시 적기'를 눌러 직접 고쳐도 되고, 그냥 만들면 AI가 바르게 고쳐서 넣어요.";
    box.appendChild(p);
  }

  $("back1").onclick = function () { go(1); };

  // ---------------- ② → ③ 게임 만들기 ----------------
  var MAKE_MSGS = [
    ["🛠️", "AI가 게임을 만들고 있어요!"], ["🎨", "예쁜 색을 칠하는 중…"], ["🦋", "주인공을 그리는 중…"],
    ["📏", "네가 정한 규칙을 넣는 중…"], ["✨", "반짝이 효과를 넣는 중…"], ["🎵", "소리를 넣는 중…"], ["🧪", "잘 되는지 확인하는 중…"]
  ];
  var EXPECTED = PRO ? 70000 : QUIZ ? 34000 : 26000;   // 대략적인 게임 코드 길이 (진행 막대용)
  var expected = EXPECTED;

  function setProgress(len, base) {
    if (len === 0 && !base) {
      $("makeEmoji").textContent = "🧠"; $("makeMsg").textContent = "AI가 게임을 설계하는 중…";
      $("makeBar").style.width = "3%";
      return;
    }
    var p = Math.min(97, 3 + (base || 0) + (len / expected) * 94);
    $("makeBar").style.width = p + "%";
    var m = MAKE_MSGS[Math.min(MAKE_MSGS.length - 1, Math.floor(p / (100 / MAKE_MSGS.length)))];
    $("makeEmoji").textContent = m[0]; $("makeMsg").textContent = m[1];
  }
  function trimmedLen(t) { return t.replace(/^\s+/, "").length; }

  // 스트림으로 HTML을 받고, 중간에 끊기면 이어서 받기
  async function streamGame(action, payload) {
    var raw = await withCode(function () {
      return GM.postStream(action, payload, function (t) { setProgress(trimmedLen(t)); });
    });
    var html = GM.cleanHtml(raw);
    for (var i = 0; i < (PRO ? 4 : 2) && !GM.isComplete(html); i++) {
      if (!/<html/i.test(html)) break;
      $("makeHint").textContent = "거의 다 됐어요! 마무리하는 중…";
      var start = html.length;
      var more = await GM.postStream("continue", { idea: apiIdea(), partial: html }, function (t) { setProgress(start + trimmedLen(t)); });
      html = GM.cleanHtml(html + GM.stripFence(more).replace(/^\s+/, ""));
    }
    if (!/<html/i.test(html)) throw { code: "server_error" };
    return html;
  }

  function makingHint(kind) {
    if (kind === "fix") return PRO ? "고치는 중이에요. 1~3분만 기다려 줘!" : "고치는 중이에요. 1분쯤 기다려 줘!";
    return PRO ? "큰 게임이라 3~6분쯤 걸려요. 화면을 닫지 말고 기다려 줘!" : "1~2분쯤 걸려요. 조금만 기다려 줘!";
  }

  async function make() {
    go(3);
    $("retryBox").classList.add("hidden"); showErr("err3", "");
    $("makeHint").textContent = makingHint("make");
    expected = EXPECTED;
    setProgress(0);
    var answers = state.questions.map(function (q, i) {
      return { question: q.question, answer: state.answers[i] || "AI가 알아서 정해 줘" };
    });
    try {
      var html = await streamGame("generate", { idea: apiIdea(), answers: answers });
      state.history = [];
      showGame(html);
    } catch (e) {
      showErr("err3", GM.friendlyError(e));
      $("retryBox").classList.remove("hidden");
      $("retry").classList.remove("hidden");
    }
  }
  $("toMake").onclick = make;
  $("retry").onclick = make;
  $("back2").onclick = function () { go(state.raw ? 4 : 2); };

  // ---------------- ④ 놀기 ----------------
  function playable() { return GM.fillImages(state.raw, state.images); }
  function showGame(raw) {
    state.raw = raw;
    $("playTitle").textContent = (PRO ? "🚀 " : "🎮 ") + (state.idea.title || "내 게임");
    $("frame").srcdoc = playable();
    $("undo").classList.toggle("hidden", state.history.length === 0);
    $("saveMsg").className = "hidden";
    $("save").disabled = false;
    updateSaveButtons();
    renderReference();
    go(4);
  }
  function updateSaveButtons() {
    $("save").textContent = state.galleryId ? "🌟 우리반 게임 업데이트하기" : "🌟 우리반 게임에 올리기";
    $("saveNew").classList.toggle("hidden", !state.galleryId);
  }
  $("replay").onclick = function () { $("frame").srcdoc = playable(); };
  $("fullscreen").onclick = function () {
    var f = $("frame");
    (f.requestFullscreen || f.webkitRequestFullscreen || function () {}).call(f);
  };
  $("undo").onclick = function () {
    if (!state.history.length) return;
    state.raw = state.history.pop();
    $("frame").srcdoc = playable();
    $("undo").classList.toggle("hidden", state.history.length === 0);
  };
  // 아이디어나 그림을 바꾼 뒤 다시 만들 수 있게 ①로
  $("editIdea").onclick = function () { writeIdea(state.idea); renderImages(); go(1); };

  // ---------------- 참고할 게임 ----------------
  function setReference(title, html) {
    // 참고 게임 속 그림도 쓸 수 있게 지금 그림 목록 뒤에 붙임
    var p = GM.unpackProject(html);
    if (!p.rawHtml) { flash(GM.friendlyError({ code: "bad_file" })); return; }
    var ex = GM.extractImages(GM.fillImages(p.rawHtml, p.images), state.images.map(function (im) { return { dataUrl: im.dataUrl, note: im.note }; }));
    ex.images.slice(state.images.length).forEach(function (im) {
      state.images.push({ dataUrl: im.dataUrl, orig: im.dataUrl, note: "참고 게임 그림", removeBg: false });
    });
    state.reference = { title: title || p.idea.title || "참고 게임", raw: ex.html };
    renderReference();
    if (!$("fixText").value.trim()) $("fixText").value = "참고한 게임처럼 그래픽을 예쁘게 바꿔 줘";
  }
  function renderReference() {
    var el = $("refChosen");
    if (!state.reference) { el.classList.add("hidden"); el.innerHTML = ""; return; }
    el.classList.remove("hidden"); el.innerHTML = "";
    el.appendChild(document.createTextNode("✅ 참고: " + state.reference.title + " "));
    var x = document.createElement("button"); x.className = "btn small"; x.textContent = "✕ 빼기";
    x.onclick = function () { state.reference = null; renderReference(); };
    el.appendChild(x);
  }
  $("refFileBtn").onclick = function () { $("refFile").click(); };
  $("refFile").onchange = function () {
    var f = this.files && this.files[0];
    this.value = "";
    if (!f) return;
    var r = new FileReader();
    r.onload = function () { setReference(f.name.replace(/\.html?$/i, ""), String(r.result || "")); };
    r.readAsText(f);
  };
  $("refClose").onclick = function () { $("refModal").classList.add("hidden"); };
  $("refGallery").onclick = async function () {
    $("refModal").classList.remove("hidden");
    var list = $("refList");
    list.textContent = "불러오는 중… ⏳";
    try {
      var games = await GM.listGames();
      list.innerHTML = "";
      if (!games.length) { list.textContent = "아직 올라온 게임이 없어요."; return; }
      games.forEach(function (g) {
        if (state.galleryId && g.id === state.galleryId) return; // 지금 고치는 게임은 빼기
        var b = document.createElement("button");
        b.className = "refitem";
        b.textContent = g.title + " · " + g.author + " · " + new Date(g.created_at).toLocaleDateString("ko-KR");
        b.onclick = async function () {
          list.textContent = "불러오는 중… ⏳";
          try {
            var full = await GM.getGame(g.id);
            setReference(full.title, full.html);
            $("refModal").classList.add("hidden");
          } catch (e) { list.textContent = GM.friendlyError(e); }
        };
        list.appendChild(b);
      });
    } catch (e) { list.textContent = GM.friendlyError(e); }
  };

  $("fix").onclick = async function () {
    var request = $("fixText").value.trim();
    if (!request && state.reference) request = "참고한 게임처럼 그래픽을 예쁘게 바꿔 줘";
    if (!request) { $("fixText").focus(); return; }
    var before = state.raw;
    go(3);
    $("retryBox").classList.add("hidden"); showErr("err3", "");
    $("makeHint").textContent = makingHint("fix");
    expected = 5000;
    setProgress(0);
    try {
      var payload = { idea: apiIdea(), html: before, request: request };
      var html = null;
      if (state.reference) {
        // 참고 게임이 있으면 그래픽을 크게 바꾸므로 전체를 다시 받기
        payload.reference = state.reference.raw;
        payload.referenceTitle = state.reference.title;
        $("makeHint").textContent = "참고한 게임의 그래픽을 가져오는 중이에요. " + makingHint("make");
        expected = Math.max(EXPECTED, before.length);
        html = await withCode(function () { return streamGame("revise_full", payload); });
      } else {
        // 1) 바뀔 부분만 받아서 적용 (빠르고 저렴)
        var patch = await withCode(function () {
          return GM.postStream("revise", payload, function (t) { setProgress(trimmedLen(t)); });
        });
        html = GM.applyPatch(before, patch);
      }
      // 2) 잘 안 맞으면 전체를 다시 받기
      if (!html) {
        $("makeHint").textContent = "조금 더 꼼꼼하게 고치는 중이에요…";
        expected = Math.max(EXPECTED, before.length);
        setProgress(0);
        html = await streamGame("revise_full", payload);
      }
      state.history.push(before);
      $("fixText").value = "";
      state.reference = null;
      showGame(html);
    } catch (e) {
      showErr("err3", GM.friendlyError(e));
      $("retryBox").classList.remove("hidden");
      $("retry").classList.add("hidden"); // 고치기 실패 → '돌아가기'로 원래 게임에 돌아감
    }
  };

  // ---------------- 저장 / 불러오기 ----------------
  function project() {
    var idea = current === 1 ? readIdea() : state.idea;
    return {
      mode: MODE, idea: idea,
      images: state.images.map(function (im) { return { dataUrl: im.dataUrl, note: im.note, removeBg: im.removeBg }; }),
      summary: state.summary, questions: state.questions, answers: state.answers, checks: state.checks,
      rawHtml: state.raw,
      galleryId: state.galleryId || 0
    };
  }
  function fileName(p) {
    var t = (p.idea.title || "내 게임").replace(/[\\/:*?"<>|]/g, "").trim() || "내 게임";
    return t + (p.idea.author ? " - " + p.idea.author.replace(/[\\/:*?"<>|]/g, "") : "") + ".html";
  }
  function downloadProject() {
    var p = project();
    if (!p.rawHtml && !p.idea.concept && !p.idea.rules && !p.idea.title) { flash("아직 저장할 내용이 없어요."); return; }
    var blob = new Blob([GM.packProject(p)], { type: "text/html" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName(p);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    flash(p.rawHtml ? "💾 저장했어요! 파일을 열면 바로 게임을 할 수 있어요." : "💾 아이디어를 저장했어요!");
  }
  $("saveFileBtn").onclick = downloadProject;
  $("download").onclick = downloadProject;

  // 인물 퀴즈 게임은 인물 퀴즈 화면에서, 다른 게임은 일반 화면에서 열기
  var PENDING_KEY = "gm_pending_project";
  function wrongPage(p) { return !!(p.idea && p.idea.quiz) !== QUIZ; }
  function otherPage() { return QUIZ ? "../" : ROOT + "quiz/"; }

  function restore(p) {
    if (wrongPage(p)) {
      try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(p)); } catch (e) {}
      location.href = otherPage();
      return;
    }
    state = emptyState();
    state.idea = p.idea || {};
    state.images = (p.images || []).map(function (im) { return { dataUrl: im.dataUrl, orig: im.dataUrl, note: im.note || "", removeBg: !!im.removeBg }; });
    state.summary = p.summary || "";
    state.questions = p.questions || [];
    state.answers = p.answers || [];
    state.checks = p.checks || [];
    state.galleryId = Number(p.galleryId) || 0;
    writeIdea(state.idea); renderImages(); saveDraft();
    if (p.rawHtml) { showGame(p.rawHtml); return; }
    if (state.questions.length) { go(2); renderQuestions(); return; }
    go(1);
  }

  $("loadBtn").onclick = function () { $("loadFile").click(); };
  $("loadFile").onchange = function () {
    var f = this.files && this.files[0];
    this.value = "";
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      var p = GM.unpackProject(String(r.result || ""));
      if (!p.rawHtml && !p.idea.concept && !p.idea.rules) { flash(GM.friendlyError({ code: "bad_file" })); return; }
      restore(p);
      flash("📂 불러왔어요! 이어서 고칠 수 있어요.");
    };
    r.readAsText(f);
  };

  async function saveToGallery(asNew) {
    $("save").disabled = true; $("saveNew").disabled = true;
    try {
      var id = asNew ? 0 : state.galleryId;
      var p = project(); p.galleryId = id;
      var r = await withCode(function () { return GM.postJson("save", { idea: state.idea, html: GM.packProject(p), id: id }); });
      state.galleryId = r.id;   // 다음부터는 같은 게임을 업데이트
      updateSaveButtons();
      var el = $("saveMsg");
      el.className = "ok";
      el.innerHTML = "";
      el.appendChild(document.createTextNode(r.updated ? "🎉 우리반 게임을 업데이트했어요! (예전 버전은 선생님이 되살릴 수 있게 보관돼요) " : "🎉 우리반 게임에 올렸어요! "));
      var a = document.createElement("a");
      a.href = ROOT + "play.html?id=" + encodeURIComponent(r.id); a.textContent = "친구들이 볼 수 있는 링크 열기";
      el.appendChild(a);
    } catch (e) {
      $("saveMsg").className = "err"; $("saveMsg").textContent = GM.friendlyError(e);
    } finally {
      $("save").disabled = false; $("saveNew").disabled = false;
    }
  }
  $("save").onclick = function () { saveToGallery(false); };
  $("saveNew").onclick = function () { saveToGallery(true); };

  $("newGame").onclick = function () {
    state = emptyState();
    writeIdea({ author: $("author").value });
    renderImages(); saveDraft();
    go(1);
  };

  // ---------------- 갤러리 게임 불러오기 ----------------
  // ?edit=번호  : 그 게임을 수정해서 같은 자리에 업데이트 (교실 코드 필요)
  // ?remix=번호 : 그 게임을 복사해서 내 새 게임으로
  var qs = new URLSearchParams(location.search);
  var editId = qs.get("edit"), remixId = qs.get("remix");
  var pending = null;
  try { pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null"); sessionStorage.removeItem(PENDING_KEY); } catch (e) {}
  if (pending && !editId && !remixId) {
    restore(pending);
    flash(QUIZ ? "🧑‍🏫 인물 퀴즈 게임이라 인물 퀴즈 화면에서 열었어요." : "📂 일반 게임이라 만들기 화면에서 열었어요.");
  }
  if (editId || remixId) {
    flash("게임을 불러오는 중… ⏳");
    GM.getGame(editId || remixId).then(function (g) {
      if (!g) { flash("게임을 찾을 수 없어요."); return; }
      var p = GM.unpackProject(g.html);
      p.idea = Object.assign({ title: g.title, author: g.author, concept: g.concept, rules: g.rules }, p.idea || {});
      p.galleryId = editId ? g.id : 0;
      if (wrongPage(p)) { location.replace(otherPage() + location.search); return; }
      restore(p);
      flash(editId
        ? "✏️ '" + g.title + "' 을(를) 수정하고 있어요. 다 고치면 '업데이트하기'를 눌러요."
        : "📂 '" + g.title + "' 을(를) 불러왔어요. 고쳐서 내 게임으로 올려 봐요!");
      if (editId && !GM.getCode()) askCode();
    }).catch(function (e) { flash(GM.friendlyError(e)); });
  }

  if (!GM.configured) showErr("err1", "선생님: supabase-config.js 설정이 필요해요.");
})();
