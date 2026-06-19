/* =========================================================
   곶자왈 게임 공용 온라인 랭킹 헬퍼 (Supabase REST)
   ---------------------------------------------------------
   supabase-config.js 가 먼저 로드되어 있어야 합니다.
   설정이 비어 있으면 online=false 가 되어, 각 게임은
   기존의 로컬(localStorage) 랭킹으로 자동 대체됩니다.

   사용법:
     await Leaderboard.submitScore("tower", "지호", 1200, {m:34});
     const rows = await Leaderboard.topScores("tower", 8);
       // rows = [{name, score, extra, created_at}, ...] (점수 내림차순)
   ========================================================= */
(function (global) {
  var cfg = global.SUPABASE_CONFIG || {};
  var configured =
    !!cfg.url && !!cfg.anonKey &&
    cfg.url.indexOf("YOUR-PROJECT") === -1 &&
    cfg.anonKey.indexOf("YOUR-ANON") === -1;

  var endpoint = configured ? cfg.url.replace(/\/+$/, "") + "/rest/v1/scores" : null;
  var headers = configured ? {
    "apikey": cfg.anonKey,
    "Authorization": "Bearer " + cfg.anonKey,
    "Content-Type": "application/json"
  } : null;

  // 점수 1건 저장. 성공하면 true, 실패(오프라인/미설정)면 false.
  async function submitScore(game, name, score, extra) {
    if (!configured) return false;
    try {
      var res = await fetch(endpoint, {
        method: "POST",
        headers: Object.assign({ "Prefer": "return=minimal" }, headers),
        body: JSON.stringify({
          game: String(game),
          name: String(name == null ? "익명" : name).slice(0, 12),
          score: Math.round(Number(score) || 0),
          extra: extra || null
        })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // 상위 점수 목록. 실패하면 null 반환(→ 게임은 로컬 랭킹으로 대체).
  async function topScores(game, limit) {
    if (!configured) return null;
    try {
      var url = endpoint +
        "?game=eq." + encodeURIComponent(game) +
        "&select=name,score,extra,created_at" +
        "&order=score.desc,created_at.asc" +
        "&limit=" + (limit || 10);
      var res = await fetch(url, { headers: headers });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  global.Leaderboard = {
    submitScore: submitScore,
    topScores: topScores,
    online: configured
  };
})(window);
