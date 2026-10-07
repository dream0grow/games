/* =========================================================
   인물 퀴즈 문제 고치기 화면
   ---------------------------------------------------------
   people.js 의 기본 문제 은행을 아이들이 고르고 · 고치고 · 더 넣는 화면.
   퀴즈 데이터 모양: { selected: ["sejong", ...], people: [ {id, name, emoji, facts:[], questions:[{q,c,a,e,src,note}]} ] }
   ========================================================= */
(function (global) {
  var BASE = global.PERSON_QUIZ || [];
  var TAGS = { ppt: "📘 친구 PPT", fix: "🔧 PPT 고침", add: "➕ 보충", kid: "✏️ 내가 만든 문제" };
  var MAX_Q = 15;

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function basePerson(id) { return BASE.filter(function (p) { return p.id === id; })[0]; }

  function defaults() {
    return { selected: BASE.map(function (p) { return p.id; }), people: clone(BASE) };
  }

  // 예전에 저장한 퀴즈에 빠진 인물이 있으면 기본값으로 채움
  function normalize(quiz) {
    if (!quiz || !Array.isArray(quiz.people)) return defaults();
    var out = { selected: Array.isArray(quiz.selected) ? quiz.selected.slice() : [], people: [] };
    BASE.forEach(function (b) {
      var p = quiz.people.filter(function (x) { return x && x.id === b.id; })[0];
      // 고친 인물만 저장된 문제를 쓰고, 안 고친 인물은 언제나 최신 기본 문제
      p = p && p.edited ? Object.assign(clone(b), p) : clone(b);
      p.facts = Array.isArray(p.facts) ? p.facts : [];
      p.questions = Array.isArray(p.questions) ? p.questions : [];
      out.people.push(p);
    });
    out.selected = out.selected.filter(function (id) { return !!basePerson(id); });
    return out;
  }

  function filled(s) { return String(s || "").trim() !== ""; }

  // 고칠 게 있으면 아이에게 보여줄 문장, 없으면 ""
  function validate(quiz) {
    if (!quiz.selected.length) return "🧑‍🏫 퀴즈에 넣을 인물을 한 명 이상 골라 줘!";
    for (var i = 0; i < quiz.people.length; i++) {
      var p = quiz.people[i];
      if (quiz.selected.indexOf(p.id) === -1) continue;
      var qs = p.questions.filter(function (q) { return filled(q.q); });
      if (!qs.length) return p.emoji + " " + p.name + " 문제가 하나도 없어요. 문제를 넣거나 인물을 빼 줘!";
      for (var j = 0; j < p.questions.length; j++) {
        var q = p.questions[j];
        if (!filled(q.q)) continue;
        var ok = q.c.filter(filled).length;
        if (ok < 2) return p.emoji + " " + p.name + " " + (j + 1) + "번 문제에 보기를 2개 이상 적어 줘!";
        if (!filled(q.c[q.a])) return p.emoji + " " + p.name + " " + (j + 1) + "번 문제의 정답(⭕)을 골라 줘!";
      }
    }
    return "";
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // opts: { get(): quiz, onChange() }
  function mount(root, opts) {
    var openId = null;

    function quiz() { return opts.get(); }
    // p 를 주면 그 인물을 '고침'으로 표시
    function changed(p) {
      if (p) p.edited = true;
      opts.onChange && opts.onChange();
    }

    function render() {
      var Q = quiz();
      root.innerHTML = "";

      // 인물 고르기
      var pick = el("div", "qzpick");
      Q.people.forEach(function (p) {
        var on = Q.selected.indexOf(p.id) !== -1;
        var b = el("button", "qzchip" + (on ? " on" : ""), p.emoji + " " + p.name);
        b.type = "button";
        b.setAttribute("aria-pressed", on ? "true" : "false");
        b.onclick = function () {
          var i = Q.selected.indexOf(p.id);
          if (i === -1) Q.selected.push(p.id); else Q.selected.splice(i, 1);
          // 순서는 기본 순서대로
          Q.selected = Q.people.map(function (x) { return x.id; }).filter(function (id) { return Q.selected.indexOf(id) !== -1; });
          changed(); render();
        };
        pick.appendChild(b);
      });
      root.appendChild(pick);
      var all = el("div", "btns");
      all.style.marginTop = "8px";
      var bAll = el("button", "btn small", "✅ 모두 고르기");
      bAll.type = "button";
      bAll.onclick = function () { Q.selected = Q.people.map(function (p) { return p.id; }); changed(); render(); };
      var bNone = el("button", "btn small", "⬜ 모두 빼기");
      bNone.type = "button";
      bNone.onclick = function () { Q.selected = []; changed(); render(); };
      var count = 0;
      Q.people.forEach(function (p) {
        if (Q.selected.indexOf(p.id) !== -1) count += p.questions.filter(function (q) { return filled(q.q); }).length;
      });
      all.appendChild(bAll); all.appendChild(bNone);
      all.appendChild(el("span", "hint qzcount", "고른 인물 " + Q.selected.length + "명 · 문제 " + count + "개"));
      root.appendChild(all);

      // 고른 인물마다 문제 고치기
      Q.people.forEach(function (p) {
        if (Q.selected.indexOf(p.id) === -1) return;
        root.appendChild(personBox(p));
      });
    }

    function personBox(p) {
      var d = el("details", "qzp");
      if (openId === p.id) d.open = true;
      d.addEventListener("toggle", function () {
        if (d.open) {
          openId = p.id;
          root.querySelectorAll("details.qzp").forEach(function (x) { if (x !== d) x.open = false; });
        } else if (openId === p.id) openId = null;
      });
      var s = el("summary");
      s.appendChild(el("span", "qzname", p.emoji + " " + p.name));
      s.appendChild(el("span", "qzsub", (p.intro || "") + " · 문제 " + p.questions.filter(function (q) { return filled(q.q); }).length + "개" +
        (p.by ? (p.ppt ? " · 📘 " + p.by + " PPT" : " · " + p.by) : "") + (p.edited ? " · ✏️ 고침" : "")));
      d.appendChild(s);

      var body = el("div", "qzbody");

      // 알아본 내용
      var fl = el("label", "qzlabel", "📘 알아본 내용 ");
      fl.appendChild(el("span", "sub", "(한 줄에 하나씩 · 게임 속 설명에 쓰여요)"));
      var fa = el("textarea", "qzfacts");
      fa.value = p.facts.join("\n");
      fa.maxLength = 1500;
      fa.oninput = function () {
        p.facts = fa.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
        changed(p);
      };
      body.appendChild(fl); body.appendChild(fa);

      // 문제들
      body.appendChild(el("div", "qzlabel", "❓ 문제"));
      p.questions.forEach(function (q, qi) { body.appendChild(questionBox(p, q, qi)); });

      var btns = el("div", "btns");
      var addC = el("button", "btn small", "➕ 고르기 문제");
      addC.type = "button";
      addC.onclick = function () { addQuestion(p, { q: "", c: ["", "", ""], a: 0, e: "", src: "kid" }); };
      var addOX = el("button", "btn small", "➕ O/X 문제");
      addOX.type = "button";
      addOX.onclick = function () { addQuestion(p, { q: "", c: ["O", "X"], a: 0, e: "", src: "kid" }); };
      var reset = el("button", "btn small", "↺ 처음 문제로");
      reset.type = "button";
      reset.onclick = function () {
        if (reset.dataset.sure !== "1") { reset.dataset.sure = "1"; reset.textContent = "정말 되돌릴까? 한 번 더 눌러 줘"; return; }
        var b = clone(basePerson(p.id));
        p.facts = b.facts; p.questions = b.questions; p.edited = false;
        changed(); render();
      };
      btns.appendChild(addC); btns.appendChild(addOX); btns.appendChild(reset);
      body.appendChild(btns);

      d.appendChild(body);
      return d;
    }

    function addQuestion(p, q) {
      if (p.questions.length >= MAX_Q) { alertIn(p, "문제는 " + MAX_Q + "개까지 넣을 수 있어요."); return; }
      p.questions.push(q);
      openId = p.id;
      changed(p); render();
      var boxes = root.querySelectorAll("details.qzp[open] .qzq");
      var last = boxes[boxes.length - 1];
      if (last) { last.scrollIntoView({ behavior: "smooth", block: "center" }); last.querySelector("input").focus(); }
    }
    function alertIn(p, msg) {
      var box = root.querySelector("details.qzp[open] .btns");
      if (!box) return;
      var m = el("span", "hint", " " + msg);
      box.appendChild(m);
      setTimeout(function () { m.remove(); }, 3000);
    }

    function questionBox(p, q, qi) {
      var box = el("div", "qzq");
      var head = el("div", "qzhead");
      head.appendChild(el("b", "", (qi + 1) + "번"));
      var tag = TAGS[q.src] || TAGS.kid;
      if (p.by && q.src === "ppt") tag = "📘 " + p.by + " PPT";
      if (p.by && q.src === "fix") tag = "🔧 " + p.by + " PPT 고침";
      head.appendChild(el("span", "qztag qztag-" + (q.src || "kid"), tag));
      var del = el("button", "qzdel", "🗑️");
      del.type = "button";
      del.setAttribute("aria-label", "문제 지우기");
      del.onclick = function () { p.questions.splice(qi, 1); changed(p); render(); };
      head.appendChild(del);
      box.appendChild(head);
      if (q.note) box.appendChild(el("div", "qznote", "✔ " + q.note));

      var qi1 = el("input");
      qi1.type = "text"; qi1.maxLength = 150; qi1.value = q.q; qi1.placeholder = "문제를 적어 줘";
      qi1.oninput = function () { q.q = qi1.value; changed(p); };
      box.appendChild(qi1);

      var isOX = q.c.length === 2 && q.c[0] === "O" && q.c[1] === "X";
      var cs = el("div", "qzchoices");
      var name = "qz_" + p.id + "_" + qi + "_" + Math.random().toString(36).slice(2, 7);
      q.c.forEach(function (c, ci) {
        var row = el("label", "qzc" + (q.a === ci ? " right" : ""));
        var r = el("input"); r.type = "radio"; r.name = name; r.checked = q.a === ci;
        r.setAttribute("aria-label", "정답으로 고르기");
        r.onchange = function () {
          q.a = ci; changed(p);
          cs.querySelectorAll(".qzc").forEach(function (x, i) { x.classList.toggle("right", i === ci); });
        };
        row.appendChild(r);
        if (isOX) {
          row.appendChild(el("span", "qzox", c));
        } else {
          var t = el("input"); t.type = "text"; t.maxLength = 60; t.value = c; t.placeholder = "보기 " + (ci + 1);
          t.oninput = function () { q.c[ci] = t.value; changed(p); };
          row.appendChild(t);
          if (q.c.length > 2) {
            var x = el("button", "qzx", "✕"); x.type = "button"; x.setAttribute("aria-label", "보기 빼기");
            x.onclick = function (ev) {
              ev.preventDefault();
              q.c.splice(ci, 1);
              if (q.a === ci) q.a = 0; else if (q.a > ci) q.a--;
              changed(p); render();
            };
            row.appendChild(x);
          }
        }
        cs.appendChild(row);
      });
      box.appendChild(cs);
      var foot = el("div", "qzfoot");
      foot.appendChild(el("span", "hint", "⭕ 동그라미를 눌러 정답을 골라요"));
      if (!isOX && q.c.length < 4) {
        var add = el("button", "btn small", "➕ 보기");
        add.type = "button";
        add.onclick = function () { q.c.push(""); changed(p); render(); };
        foot.appendChild(add);
      }
      box.appendChild(foot);

      var ex = el("input");
      ex.type = "text"; ex.maxLength = 150; ex.value = q.e || ""; ex.placeholder = "💡 맞히거나 틀린 뒤 보여 줄 설명 (안 적어도 돼요)";
      ex.className = "qzex";
      ex.oninput = function () { q.e = ex.value; changed(p); };
      box.appendChild(ex);
      return box;
    }

    render();
    return { render: render };
  }

  global.PersonQuizEditor = { defaults: defaults, normalize: normalize, validate: validate, mount: mount };
})(window);
