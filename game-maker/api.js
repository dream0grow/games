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
    (images || []).forEach(function (im, i) {
      html = html.split("__IMG" + (i + 1) + "__").join(im.dataUrl);
    });
    return html;
  }
  // HTML 속 data:image 주소를 꺼내 자리표시로 바꿈 (불러온 게임을 AI에게 다시 보낼 때)
  function extractImages(html, images) {
    images = (images || []).slice();
    images.forEach(function (im, i) { html = html.split(im.dataUrl).join("__IMG" + (i + 1) + "__"); });
    html = html.replace(/data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]{2000,}/g, function (url) {
      var n = images.findIndex(function (im) { return im.dataUrl === url; });
      if (n === -1) {
        if (images.length >= 3) return url; // 3장 넘으면 그대로 둠
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

  function packProject(project) {
    // project: {idea:{author,title,concept,rules}, images:[{dataUrl,note}], questions, answers, summary, rawHtml, mode}
    var playable = project.rawHtml ? fillImages(project.rawHtml, project.images) : IDEA_ONLY;
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
      mode: project.mode || "basic",
      rawHtml: ex.html
    };
  }

  // ---------- 갤러리 ----------
  async function listGames() {
    var res = await fetch(REST + "?select=id,title,author,concept,created_at&order=created_at.desc&limit=200", { headers: headers });
    if (!res.ok) throw new ApiError("gallery");
    return res.json();
  }
  async function getGame(id) {
    var res = await fetch(REST + "?id=eq." + encodeURIComponent(id) + "&select=id,title,author,concept,rules,html,created_at", { headers: headers });
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
    if (code === "bad_file") return "이 파일은 불러올 수 없어요. 여기서 저장한 .html 파일을 골라 주세요.";
    return "앗, 잠깐 문제가 생겼어요. 잠시 뒤에 다시 눌러 주세요.";
  }

  global.GameMaker = {
    setMode: setMode,
    getCode: getCode, setCode: setCode,
    postJson: postJson, postStream: postStream,
    cleanHtml: cleanHtml, stripFence: stripFence, isComplete: isComplete,
    applyPatch: applyPatch,
    fillImages: fillImages, extractImages: extractImages, imagesForApi: imagesForApi,
    packProject: packProject, unpackProject: unpackProject,
    listGames: listGames, getGame: getGame,
    friendlyError: friendlyError,
    configured: !!(cfg.url && cfg.anonKey)
  };
})(window);
