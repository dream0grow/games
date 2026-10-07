/* =========================================================
   AI 게임 만들기 공용 헬퍼
   ---------------------------------------------------------
   supabase-config.js 가 먼저 로드되어 있어야 합니다.
   서버 함수(game-maker)와 갤러리 테이블(ai_games)에 접근하고,
   게임 파일 저장/불러오기, 그림 자리표시 처리, 고치기 패치 적용을 맡습니다.
   ========================================================= */
(function (global) {
  var cfg = global.SUPABASE_CONFIG || {};
  var base = (cfg.url || "").replace(/\/+$/, "");
  var FN = base + "/functions/v1/game-maker";
  var REST = base + "/rest/v1/ai_games";
  var headers = {
    "apikey": cfg.anonKey,
    "Authorization": "Bearer " + cfg.anonKey,
    "Content-Type": "application/json"
  };

  var mode = "basic";
  function setMode(m) { mode = m === "pro" ? "pro" : "basic"; }

  // 교실 코드 (모드별로 따로 기억)
  function codeKey() { return mode === "pro" ? "gm_pro_code" : "gm_class_code"; }
  function getCode() { try { return localStorage.getItem(codeKey()) || ""; } catch (e) { return ""; } }
  function setCode(c) { try { localStorage.setItem(codeKey(), c); } catch (e) {} }

  function ApiError(code) { this.code = code; this.message = code; }

  async function post(action, data) {
    var res;
    try {
      res = await fetch(FN, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(Object.assign({ action: action, mode: mode, classCode: getCode() }, data || {}))
      });
    } catch (e) {
      throw new ApiError("network");
    }
    if (res.status === 401) {
      var j = await res.json().catch(function () { return {}; });
      throw new ApiError(j.error === "wrong_code" ? "wrong_code" : "unauthorized");
    }
    if (res.status === 413) throw new ApiError("too_big");
    if (!res.ok) {
      var k = await res.json().catch(function () { return {}; });
      throw new ApiError(k.error || "server_error");
    }
    return res;
  }

  async function postJson(action, data) {
    var res = await post(action, data);
    return res.json();
  }

  // 텍스트 스트림을 받으면서 onText(지금까지 받은 전체 글자)를 계속 부릅니다.
  // 중간에 연결이 끊겨도 받은 만큼은 돌려줍니다(이어서 만들기에 씀).
  async function postStream(action, data, onText) {
    var res = await post(action, data);
    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var text = "";
    try {
      while (true) {
        var r = await reader.read();
        if (r.done) break;
        text += decoder.decode(r.value, { stream: true });
        if (onText) onText(text);
      }
      text += decoder.decode();
    } catch (e) {
      if (text.trim().length < 300) throw new ApiError("network");
    }
    if (text.indexOf("<!--AI_REFUSED-->") !== -1) throw new ApiError("refused");
    if (text.indexOf("<!--AI_ERROR-->") !== -1) {
      text = text.replace("<!--AI_ERROR-->", "");
      if (text.trim().length < 300) throw new ApiError("server_error");
    }
    return text;
  }

  // AI가 붙인 ``` 표시나 앞뒤 설명을 떼어내고 HTML 부분만 남깁니다.
  function cleanHtml(t) {
    t = String(t || "");
    var start = t.search(/<!DOCTYPE html|<html/i);
    if (start > 0) t = t.slice(start);
    t = t.replace(/```\s*$/g, "");
    var end = t.toLowerCase().lastIndexOf("</html>");
    if (end !== -1) t = t.slice(0, end + 7);
    return t.trim();
  }
  function stripFence(t) {
    return String(t || "").replace(/^\s*```[a-z]*\s*/i, "").replace(/```\s*$/g, "");
  }
  function isComplete(html) { return /<\/html>\s*$/i.test(html); }

  // ---------- 고치기 패치 (FIND/REPLACE 블록) ----------
  // 성공하면 새 HTML, 하나라도 못 찾으면 null
  function applyPatch(html, patchText) {
    var re = /<<<<<<< FIND\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n?>>>>>>> REPLACE/g;
    var m, count = 0, out = html;
    while ((m = re.exec(patchText))) {
      var find = m[1], repl = m[2];
      var idx = out.indexOf(find);
      if (idx === -1) {
        // 줄 끝 공백 차이 정도는 봐줌
        var norm = function (s) { return s.replace(/[ \t]+$/gm, ""); };
        var o2 = norm(out), f2 = norm(find);
        idx = o2.indexOf(f2);
        if (idx === -1) return null;
        out = o2.slice(0, idx) + repl + o2.slice(idx + f2.length);
      } else {
        out = out.slice(0, idx) + repl + out.slice(idx + find.length);
      }
      count++;
    }
    return count ? out : null;
  }

  // ---------- 그림 자리표시 ----------
  // 그림 [{dataUrl, note}] → "__IMG1__" 을 실제 그림 주소로
  function fillImages(html, images) {
    return html.replace(/__IMG(\d+)__/g, function (all, n) {
      var im = (images || [])[n - 1];
      return im ? im.dataUrl : all;
    });
  }
  // HTML 속 data:image 주소를 꺼내 자리표시로 바꿈 (불러온 게임을 AI에게 다시 보낼 때)
  function extractImages(html, images) {
    images = (images || []).slice();
    images.forEach(function (im, i) { html = html.split(im.dataUrl).join("__IMG" + (i + 1) + "__"); });
    html = html.replace(/data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]{2000,}/g, function (url) {
      var n = images.findIndex(function (im) { return im.dataUrl === url; });
      if (n === -1) {
        if (images.length >= 20) return url; // 20장 넘으면 그대로 둠
        images.push({ dataUrl: url, note: "게임 속 그림" });
        n = images.length - 1;
      }
      return "__IMG" + (n + 1) + "__";
    });
    return { html: html, images: images };
  }
  // 서버로 보낼 그림 형식
  function imagesForApi(images) {
    return (images || []).map(function (im) {
      var m = /^data:([^;]+);base64,(.*)$/.exec(im.dataUrl) || [];
      return { media_type: m[1], data: m[2], note: im.note || "" };
    }).filter(function (x) { return x.data; });
  }

  // ---------- 저장 파일 (게임 + 프로젝트 정보) ----------
  // 저장한 .html 파일은 그대로 열면 게임이 되고, 만들기 화면에서 불러오면 이어서 고칠 수 있어요.
  var PROJECT_ID = "ai-game-maker-project";
  var IDEA_ONLY = '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>아직 만드는 중인 게임</title></head>' +
    '<body style="font-family:sans-serif;text-align:center;padding:40px;background:#fff7e6">' +
    '<h1>🛠️ 아직 만드는 중인 게임이에요</h1><p>AI와 게임 만들기 화면에서 <b>📂 불러오기</b>로 이 파일을 열면 이어서 만들 수 있어요.</p></body></html>';

  // ---------- 게임 화면 준비 (인물 퀴즈 데이터 + 휴대폰 맞춤) ----------
  var QUIZ_RE = /<script id="person-quiz-data">[\s\S]*?<\/script>\n?/g;
  var SHIM_ID = "gm-mobile-shim";
  var SHIM_RE = new RegExp('<style id="' + SHIM_ID + '">[\\s\\S]*?</style>\\n?', "g");
  var SHIM_CSS =
    "html,body{overscroll-behavior:none;-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:transparent}" +
    "body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}" +
    "input,textarea{-webkit-user-select:text;user-select:text}" +
    "canvas{touch-action:none}button,[role=button],a{touch-action:manipulation}";

  // 휴대폰에서 확대·끌림·길게 누르기 메뉴 없이 자연스럽게 놀 수 있게
  function mobileShim(html) {
    html = String(html || "").replace(SHIM_RE, "");
    var head = "";
    if (!/<meta[^>]+name=["']?viewport/i.test(html)) {
      head += '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">\n';
    }
    head += '<style id="' + SHIM_ID + '">' + SHIM_CSS + "</style>\n";
    var m = /<head[^>]*>/i.exec(html);
    if (m) return html.slice(0, m.index + m[0].length) + "\n" + head + html.slice(m.index + m[0].length);
    return head + html;
  }
  function stripQuiz(html) { return String(html || "").replace(QUIZ_RE, ""); }
  // 인물 퀴즈 게임이면 지금 문제를 넣어 줌 (quiz/data.js 가 있을 때)
  function withQuiz(html, quiz) {
    var Q = global.PersonQuizData;
    if (!quiz || !Q) return html;
    return Q.inject(html, Q.build(quiz));
  }
  // 아이들에게 보여줄 최종 게임
  function prepareGame(html, quiz) { return mobileShim(withQuiz(html, quiz)); }

  function packProject(project) {
    // project: {idea:{author,title,concept,rules,quiz?}, images:[{dataUrl,note}], questions, answers, summary, rawHtml, mode}
    var playable = project.rawHtml ? prepareGame(fillImages(project.rawHtml, project.images), project.idea && project.idea.quiz) : IDEA_ONLY;
    var data = Object.assign({}, project, { rawHtml: undefined, v: 1 });
    var json = JSON.stringify(data).replace(/</g, "\\u003c");
    var tag = '<script type="application/json" id="' + PROJECT_ID + '">' + json + "</script>";
    var at = playable.toLowerCase().lastIndexOf("</body>");
    if (at === -1) at = playable.toLowerCase().lastIndexOf("</html>");
    return at === -1 ? playable + tag : playable.slice(0, at) + tag + "\n" + playable.slice(at);
  }

  function unpackProject(text) {
    text = String(text || "");
    var re = new RegExp('<script type="application/json" id="' + PROJECT_ID + '">([\\s\\S]*?)</script>\\n?');
    var m = re.exec(text);
    var project = {};
    var html = text;
    if (m) {
      try { project = JSON.parse(m[1]); } catch (e) { project = {}; }
      html = text.replace(m[0], "");
    }
    // 저장할 때 넣은 퀴즈 데이터·휴대폰 맞춤은 빼고 원래 게임만
    html = stripQuiz(html).replace(SHIM_RE, "");
    var idea = project.idea || {};
    if (!idea.title) {
      var t = /<title>([\s\S]*?)<\/title>/i.exec(html);
      idea.title = t ? t[1].trim() : "";
    }
    var isGame = /<html/i.test(html) && html.indexOf("아직 만드는 중인 게임이에요") === -1;
    var ex = isGame ? extractImages(html, project.images || []) : { html: "", images: project.images || [] };
    return {
      idea: idea,
      images: ex.images,
      questions: project.questions || [],
      answers: project.answers || [],
      summary: project.summary || "",
      checks: project.checks || [],
      mode: project.mode || "basic",
      rawHtml: ex.html
    };
  }

  // ---------- 썸네일: 게임을 몰래 띄워서 실제 화면을 찍음 ----------
  var H2C = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
  // 처음 화면을 한 장 찍고, '시작'을 눌러 본 뒤 게임 중 화면을 한 장 더 찍어서 둘 다 보냄
  var THUMB_SCRIPT = "<script id=\"gm-thumb\">(function(){" +
    "var done=false;function send(d){if(done)return;done=true;parent.postMessage({gmThumb:d},'*');}" +
    "function vis(e){var r=e.getBoundingClientRect();return r.width>0&&r.height>0;}" +
    "function poke(){var bs=[].slice.call(document.querySelectorAll('button,[role=button],.btn,a,div,span'));" +
    "var b=bs.filter(function(x){return vis(x)&&x.children.length<3&&/(시작|start|놀기|플레이|play)/i.test((x.textContent||'').trim().slice(0,20));})[0];" +
    "if(b){b.click();return;}" +
    "var t=document.querySelector('canvas')||document.body,r=t.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;" +
    "['pointerdown','mousedown','pointerup','mouseup','click'].forEach(function(n){try{var E=n.indexOf('pointer')===0&&window.PointerEvent?PointerEvent:MouseEvent;t.dispatchEvent(new E(n,{bubbles:true,clientX:x,clientY:y,pointerId:1,isPrimary:true}));}catch(e){}});" +
    "['keydown','keyup'].forEach(function(n){try{var k=new KeyboardEvent(n,{key:' ',code:'Space',keyCode:32,which:32,bubbles:true});window.dispatchEvent(k);document.dispatchEvent(k);}catch(e){}});}" +
    "function canvasShot(){var cs=[].slice.call(document.querySelectorAll('canvas')).filter(vis).sort(function(a,b){return b.width*b.height-a.width*a.height;});" +
    "try{return cs[0]?cs[0].toDataURL('image/jpeg',0.8):null;}catch(e){return null;}}" +
    "var h2c=new Promise(function(ok){var s=document.createElement('script');s.src='" + H2C + "';s.onload=function(){ok(true);};s.onerror=function(){ok(false);};(document.head||document.documentElement).appendChild(s);});" +
    "function snap(){return h2c.then(function(has){if(!has)return canvasShot();" +
    "return html2canvas(document.body,{backgroundColor:null,logging:false,scale:Math.min(1,480/innerWidth),width:innerWidth,height:innerHeight,windowWidth:innerWidth,windowHeight:innerHeight,x:scrollX,y:scrollY})" +
    ".then(function(c){return c.toDataURL('image/jpeg',0.8);},canvasShot);});}" +
    "function wait(ms){return new Promise(function(ok){setTimeout(ok,ms);});}" +
    "var a=null;wait(1500).then(snap).then(function(x){a=x;poke();return wait(2200);}).then(snap).then(function(b){send([a,b]);},function(){send([a,null]);});" +
    "setTimeout(function(){send([a,null]);},15000);" +
    "})();<\/script>";

  // data URL → 480×360 캔버스와 '볼거리 점수' (한 가지 색만 가득하면 0)
  function thumbScore(d) {
    return new Promise(function (resolve) {
      if (!d) return resolve(null);
      var img = new Image();
      img.onload = function () {
        var c = document.createElement("canvas"); c.width = 480; c.height = 360;
        var ctx = c.getContext("2d");
        var s = Math.max(480 / img.width, 360 / img.height);
        var w = img.width * s, h = img.height * s;
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 480, 360);
        ctx.drawImage(img, (480 - w) / 2, (360 - h) / 2, w, h);
        var px = ctx.getImageData(0, 0, 480, 360).data, count = {}, kinds = 0, n = 0, top = 0;
        for (var i = 0; i < px.length; i += 4 * 37) {
          var k = (px[i] >> 4) + "," + (px[i + 1] >> 4) + "," + (px[i + 2] >> 4);
          if (!count[k]) { count[k] = 0; kinds++; }
          count[k]++; n++;
          if (count[k] > top) top = count[k];
        }
        var dominant = top / n;
        var score = kinds < 8 || dominant > 0.88 ? 0 : kinds * (1 - dominant);
        resolve({ score: score, url: c.toDataURL("image/jpeg", 0.72) });
      };
      img.onerror = function () { resolve(null); };
      img.src = d;
    });
  }

  // 게임 HTML → JPEG data URL (480×360) 또는 null
  function captureThumb(html) {
    return new Promise(function (resolve) {
      var f = document.createElement("iframe");
      f.setAttribute("sandbox", "allow-scripts");
      f.setAttribute("aria-hidden", "true");
      f.tabIndex = -1;
      // 화면 밖에 두면 브라우저가 게임을 멈추므로, 화면 안에 거의 투명하게 둠
      f.style.cssText = "position:fixed;left:0;top:0;width:640px;height:480px;border:0;opacity:0.01;pointer-events:none;z-index:-1";
      var finished = false;
      async function finish(shots) {
        if (finished) return;
        finished = true;
        window.removeEventListener("message", onMsg);
        f.remove();
        shots = Array.isArray(shots) ? shots : [];
        var title = await thumbScore(shots[0]), play = await thumbScore(shots[1]);
        // 게임 중 화면이 볼거리가 있으면 그걸, 아니면 처음 화면
        var best = play && play.score > 0 && (!title || play.score >= title.score * 0.5) ? play : (title && title.score > 0 ? title : null);
        resolve(best ? best.url : null);
      }
      function onMsg(e) {
        if (e.source === f.contentWindow && e.data && "gmThumb" in e.data) finish(e.data.gmThumb);
      }
      window.addEventListener("message", onMsg);
      setTimeout(function () { finish(null); }, 18000);
      var h = String(html || "");
      var at = h.toLowerCase().lastIndexOf("</body>");
      f.srcdoc = at === -1 ? h + THUMB_SCRIPT : h.slice(0, at) + THUMB_SCRIPT + h.slice(at);
      document.body.appendChild(f);
    });
  }

  // ---------- 별점·소감 ----------
  var REVIEWS = base + "/rest/v1/ai_game_reviews";
  async function listReviews(gameId) {
    var res = await fetch(REVIEWS + "?game_id=eq." + encodeURIComponent(gameId) + "&select=id,stars,name,comment,created_at&order=created_at.desc&limit=200", { headers: headers });
    if (!res.ok) throw new ApiError("no_reviews");
    return res.json();
  }
  // {게임번호: {sum, count}}
  async function ratingSummary() {
    var res = await fetch(REVIEWS + "?select=game_id,stars&limit=5000", { headers: headers });
    if (!res.ok) return {};
    var rows = await res.json(), out = {};
    rows.forEach(function (r) {
      var o = out[r.game_id] || (out[r.game_id] = { sum: 0, count: 0 });
      o.sum += r.stars; o.count++;
    });
    return out;
  }

  // ---------- 갤러리 ----------
  async function listGames() {
    var q = "&order=created_at.desc&limit=200";
    var res = await fetch(REST + "?select=id,title,author,concept,created_at,thumb" + q, { headers: headers });
    // thumb 칸을 아직 안 만들었으면 없이 다시
    if (!res.ok) res = await fetch(REST + "?select=id,title,author,concept,created_at" + q, { headers: headers });
    if (!res.ok) throw new ApiError("gallery");
    return res.json();
  }
  async function getGame(id) {
    var res = await fetch(REST + "?id=eq." + encodeURIComponent(id) + "&select=*", { headers: headers });
    if (!res.ok) throw new ApiError("gallery");
    var rows = await res.json();
    return rows[0] || null;
  }

  // 아이들에게 보여줄 오류 문장
  function friendlyError(e) {
    var code = e && e.code;
    if (code === "wrong_code") return "교실 코드가 맞지 않아요. 선생님께 코드를 물어보세요.";
    if (code === "network") return "인터넷 연결이 끊겼어요. 잠시 뒤에 다시 해 보세요.";
    if (code === "refused") return "AI가 이 게임은 만들기 어렵대요. 조금 더 순한 내용으로 바꿔 볼까요?";
    if (code === "gallery") return "게임 목록을 불러오지 못했어요. 잠시 뒤에 다시 해 보세요.";
    if (code === "too_big") return "그림이나 게임이 너무 커요. 그림을 하나 빼고 다시 해 보세요.";
    if (code === "no_gemini") return "선생님: AI 그림 만들기를 쓰려면 Supabase 비밀값에 GEMINI_API_KEY를 넣어 주세요.";
    if (code === "no_image" || code === "gemini_failed") return "AI가 이 그림은 그리기 어렵대요. 다르게 설명해 볼까요?";
    if (code === "bad_file") return "이 파일은 불러올 수 없어요. 여기서 저장한 .html 파일을 골라 주세요.";
    if (code === "no_reviews") return "선생님: 별점을 쓰려면 Supabase에서 supabase/ai_game_reviews.sql 을 먼저 실행해 주세요.";
    if (code === "bad_review") return "별을 고르고, 이름과 소감을 적어 줘!";
    return "앗, 잠깐 문제가 생겼어요. 잠시 뒤에 다시 눌러 주세요.";
  }

  // 교실 코드 확인 (저장된 코드가 맞으면 바로 통과, 아니면 입력 창)
  function requireCode() {
    return postJson("check").then(function () { return true; }, function (e) {
      if (e.code !== "wrong_code") throw e;
      return new Promise(function (resolve) {
        var bg = document.createElement("div");
        bg.className = "modal-bg";
        bg.innerHTML = '<div class="modal"><h2>🔑 교실 코드</h2><p class="hint">선생님이 알려준 코드를 적어 주세요.</p>' +
          '<input type="text" style="margin-top:14px;text-align:center" autocomplete="off" />' +
          '<div class="err hidden"></div><div class="btns center"><button class="btn">취소</button><button class="btn primary">확인</button></div></div>';
        document.body.appendChild(bg);
        var input = bg.querySelector("input"), err = bg.querySelector(".err"), btns = bg.querySelectorAll("button");
        input.focus();
        btns[0].onclick = function () { bg.remove(); resolve(false); };
        btns[1].onclick = function () {
          setCode(input.value.trim());
          postJson("check").then(function () { bg.remove(); resolve(true); }, function (e2) {
            err.textContent = friendlyError(e2); err.classList.remove("hidden");
          });
        };
        input.addEventListener("keydown", function (ev) { if (ev.key === "Enter") btns[1].click(); });
      });
    });
  }
  async function hideGame(id) {
    if (!(await requireCode())) return false;
    await postJson("hide", { id: id });
    return true;
  }

  global.GameMaker = {
    requireCode: requireCode, hideGame: hideGame,
    setMode: setMode,
    getCode: getCode, setCode: setCode,
    postJson: postJson, postStream: postStream,
    cleanHtml: cleanHtml, stripFence: stripFence, isComplete: isComplete,
    applyPatch: applyPatch,
    fillImages: fillImages, extractImages: extractImages, imagesForApi: imagesForApi,
    packProject: packProject, unpackProject: unpackProject,
    prepareGame: prepareGame, mobileShim: mobileShim, stripQuiz: stripQuiz,
    captureThumb: captureThumb,
    listReviews: listReviews, ratingSummary: ratingSummary,
    listGames: listGames, getGame: getGame,
    friendlyError: friendlyError,
    configured: !!(cfg.url && cfg.anonKey)
  };
})(window);
