/* =========================================================
   인물 퀴즈 데이터를 게임에 넣어 주기
   ---------------------------------------------------------
   인물 퀴즈 게임은 문제를 코드에 직접 적지 않고 window.PERSON_QUIZ_DATA 를 읽어서 씁니다.
   게임을 보여 줄 때마다(만들기 화면, 우리반 게임) 지금 문제를 <head> 맨 앞에 넣어 주므로,
   문제를 고치면 AI로 다시 만들지 않아도 게임에 바로 반영돼요.

   window.PERSON_QUIZ_DATA = {
     people: [{ id, name, emoji, era, by, intro, facts: ["..."],
                questions: [{ q: "문제", c: ["보기1", "보기2", ...], a: 정답번호(0부터), e: "설명" }] }]
   }

   아이가 고치지 않은 인물(edited 가 아닌 인물)은 언제나 people.js 의 최신 문제를 씁니다.
   그래서 선생님이 people.js 를 고치면 이미 올린 게임에도 자동으로 반영돼요.
   ========================================================= */
(function (global) {
  var ID = "person-quiz-data";
  var RE = new RegExp('<script id="' + ID + '">[\\s\\S]*?</script>\\n?', "g");

  function filled(s) { return String(s || "").trim() !== ""; }

  function basePerson(id) {
    return (global.PERSON_QUIZ || []).filter(function (p) { return p.id === id; })[0];
  }

  // 퀴즈 상태 {selected, people} → 게임에 넣을 데이터
  function build(quiz) {
    if (!quiz) return null;
    var selected = Array.isArray(quiz.selected) ? quiz.selected : [];
    var saved = Array.isArray(quiz.people) ? quiz.people : [];
    var people = [];
    selected.forEach(function (id) {
      var mine = saved.filter(function (p) { return p && p.id === id; })[0];
      var base = basePerson(id);
      var p = mine && mine.edited ? Object.assign({}, base || {}, mine) : (base || mine);
      if (!p) return;
      var questions = (p.questions || []).map(function (q) {
        if (!q || !filled(q.q)) return null;
        var keep = [], a = -1;
        (q.c || []).forEach(function (c, i) {
          if (!filled(c)) return;
          if (i === q.a) a = keep.length;
          keep.push(String(c).trim());
        });
        if (keep.length < 2 || a === -1) return null;
        return { q: String(q.q).trim(), c: keep, a: a, e: String(q.e || "").trim() };
      }).filter(Boolean);
      if (!questions.length) return;
      people.push({
        id: p.id, name: p.name, emoji: p.emoji || "", era: p.era || "", by: p.by || "", intro: p.intro || "",
        facts: (p.facts || []).filter(filled), questions: questions
      });
    });
    return people.length ? { people: people } : null;
  }

  function strip(html) { return String(html || "").replace(RE, ""); }

  function inject(html, data) {
    html = strip(html);
    if (!data) return html;
    var tag = '<script id="' + ID + '">window.PERSON_QUIZ_DATA=' + JSON.stringify(data).replace(/</g, "\\u003c") + ";</script>\n";
    var m = /<head[^>]*>/i.exec(html);
    if (m) return html.slice(0, m.index + m[0].length) + "\n" + tag + html.slice(m.index + m[0].length);
    m = /<html[^>]*>/i.exec(html);
    if (m) return html.slice(0, m.index + m[0].length) + "\n" + tag + html.slice(m.index + m[0].length);
    return tag + html;
  }

  global.PersonQuizData = { build: build, inject: inject, strip: strip };
})(window);
