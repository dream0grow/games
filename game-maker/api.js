/* =========================================================
   AI 게임 만들기 공용 헬퍼
   ---------------------------------------------------------
   ../supabase-config.js 가 먼저 로드되어 있어야 합니다.
   서버 함수(game-maker)와 갤러리 테이블(ai_games)에 접근합니다.
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

  var CODE_KEY = "gm_class_code";
  function getCode() { try { return localStorage.getItem(CODE_KEY) || ""; } catch (e) { return ""; } }
  function setCode(c) { try { localStorage.setItem(CODE_KEY, c); } catch (e) {} }

  function ApiError(code) { this.code = code; this.message = code; }

  async function post(action, data) {
    var res;
    try {
      res = await fetch(FN, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(Object.assign({ action: action, classCode: getCode() }, data || {}))
      });
    } catch (e) {
      throw new ApiError("network");
    }
    if (res.status === 401) {
      var j = await res.json().catch(function () { return {}; });
      throw new ApiError(j.error === "wrong_code" ? "wrong_code" : "unauthorized");
    }
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
  async function postStream(action, data, onText) {
    var res = await post(action, data);
    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var text = "";
    while (true) {
      var r = await reader.read();
      if (r.done) break;
      text += decoder.decode(r.value, { stream: true });
      if (onText) onText(text);
    }
    text += decoder.decode();
    if (text.indexOf("<!--AI_REFUSED-->") !== -1) throw new ApiError("refused");
    if (text.indexOf("<!--AI_ERROR-->") !== -1) {
      text = text.replace("<!--AI_ERROR-->", "");
      if (text.trim().length < 200) throw new ApiError("server_error");
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
    if (code === "network") return "인터넷 연결을 확인해 주세요.";
    if (code === "refused") return "AI가 이 게임은 만들기 어렵대요. 조금 더 순한 내용으로 바꿔 볼까요?";
    if (code === "gallery") return "게임 목록을 불러오지 못했어요. 잠시 뒤에 다시 해 보세요.";
    return "앗, 잠깐 문제가 생겼어요. 잠시 뒤에 다시 눌러 주세요.";
  }

  global.GameMaker = {
    getCode: getCode, setCode: setCode,
    postJson: postJson, postStream: postStream,
    cleanHtml: cleanHtml, stripFence: stripFence, isComplete: isComplete,
    listGames: listGames, getGame: getGame,
    friendlyError: friendlyError,
    configured: !!(cfg.url && cfg.anonKey)
  };
})(window);
