// =========================================================
// AI 게임 만들기 서버 함수 (Supabase Edge Function)
// ---------------------------------------------------------
// 아이들 화면(game-maker/, game-maker/pro/)에서 호출합니다.
// Anthropic API 키는 이 서버에만 있고 브라우저에는 절대 내려가지 않습니다.
//
// 필요한 비밀값 (supabase secrets set ... 또는 대시보드 Edge Functions → Secrets):
//   ANTHROPIC_API_KEY  : 선생님의 Anthropic API 키 (필수)
//   CLASS_CODE         : 교실 코드. 설정하면 이 코드를 아는 사람만 사용 가능 (권장)
//   PRO_CODE           : PRO 전용 코드 (선택, 없으면 CLASS_CODE 와 같음)
//   GAME_MODEL         : 기본 모델 (선택, 기본 claude-sonnet-5-5)
//   PRO_MODEL          : PRO 모델 (선택, 기본 claude-opus-5-5)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 는 Supabase가 자동으로 넣어 줍니다.
//
// 요청 (POST JSON, 모두 classCode 포함, mode: "basic" | "pro"):
//   {action:"questions", idea}                 → JSON {summary, questions:[{question, choices}]}
//   {action:"generate", idea, answers}         → HTML 텍스트 스트림
//   {action:"revise", idea, html, request}     → 고칠 부분(FIND/REPLACE 블록) 텍스트 스트림
//   {action:"revise_full", idea, html, request}→ 고친 전체 HTML 텍스트 스트림
//   {action:"continue", idea, partial}         → HTML 텍스트 스트림 (끊긴 뒤 이어지는 부분)
//   {action:"save", idea, html}                → JSON {id}
//   {action:"check"}                           → JSON {ok:true} (교실 코드 확인용)
//
// idea.images: [{data: base64, media_type, note}] (최대 20장). 게임 코드에서는
// "__IMG1__" 같은 자리표시 문자열로 쓰고, 브라우저가 실제 그림으로 바꿔 넣습니다.
// =========================================================
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const BASIC_MODEL = Deno.env.get("GAME_MODEL") || "claude-sonnet-5-5";
const PRO_MODEL = Deno.env.get("PRO_MODEL") || "claude-opus-5-5";
const CLASS_CODE = (Deno.env.get("CLASS_CODE") || "").trim();
const PRO_CODE = (Deno.env.get("PRO_CODE") || "").trim() || CLASS_CODE;

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

// ---------- 모드별 설정 ----------
type Mode = "basic" | "pro";
const CONF = {
  basic: { model: BASIC_MODEL, effort: "medium", maxTokens: 32000 },
  pro: { model: PRO_MODEL, effort: "low", maxTokens: 64000 },
} as const;

// ---------- 아이들 입력 정리 ----------
type Img = { data: string; media_type: string; note?: string };
type Idea = { title?: string; author?: string; concept?: string; rules?: string; images?: Img[] };
type Answer = { question: string; answer: string };

const clip = (s: unknown, n: number) => String(s ?? "").slice(0, n).trim();
const IMG_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function cleanImages(idea: Idea): Img[] {
  if (!Array.isArray(idea.images)) return [];
  return idea.images
    .filter((im) => im && IMG_TYPES.includes(im.media_type) && typeof im.data === "string" && im.data.length < 1_500_000)
    .slice(0, 20)
    .map((im) => ({ data: im.data, media_type: im.media_type, note: clip(im.note, 80) }));
}

function ideaText(idea: Idea, answers: Answer[] = [], images: Img[] = []) {
  const lines = [
    `게임 이름: ${clip(idea.title, 60) || "(아직 없음)"}`,
    `만든 친구: ${clip(idea.author, 30) || "(익명)"}`,
    `게임 컨셉(아이가 생각한 이야기와 모습):\n${clip(idea.concept, 1500)}`,
    `게임 규칙(아이가 정한 규칙):\n${clip(idea.rules, 1500)}`,
  ];
  if (images.length) {
    lines.push(
      "아이가 넣은 그림 (위에 첨부한 순서대로):\n" +
        images.map((im, i) => `- 그림 ${i + 1} → 코드에서 "__IMG${i + 1}__" : ${im.note || "(설명 없음)"}`).join("\n"),
    );
  }
  if (answers.length) {
    lines.push(
      "AI 질문에 대한 아이의 대답:\n" +
        answers.slice(0, 8).map((a, i) => `${i + 1}. ${clip(a.question, 200)} → ${clip(a.answer, 300)}`).join("\n"),
    );
  }
  return lines.join("\n\n");
}

// 그림은 앞에, 글은 뒤에
function userContent(images: Img[], text: string) {
  const blocks: unknown[] = images.map((im) => ({
    type: "image",
    source: { type: "base64", media_type: im.media_type, data: im.data },
  }));
  blocks.push({ type: "text", text });
  return blocks;
}

// ---------- 프롬프트 ----------
const SAFETY = `
사용자는 한국 초등학교 2학년 어린이(8~9살)입니다. 선생님이 수업 시간에 함께 사용합니다.
- 내용은 항상 어린이에게 알맞게 만듭니다. 피, 잔인함, 무서운 장면, 무기로 사람을 해치는 장면, 욕설, 차별은 넣지 않습니다.
  아이가 그런 것을 원하면 "물풍선 맞히기", "몬스터를 잠재우기"처럼 귀엽고 순한 방식으로 바꿔서 의도는 살립니다.
- 실제 사람의 이름·얼굴·개인정보는 쓰지 않습니다. 아이 이름은 '만든 친구' 표시에만 씁니다.
- 아이의 생각을 존중합니다. 아이가 정한 규칙과 컨셉을 최대한 그대로 살리고, 빠진 부분만 채웁니다.`;

const QUESTION_SYSTEM = {
  basic: `당신은 초등학생과 함께 게임을 기획하는 다정한 게임 선생님입니다.
${SAFETY}

아이가 적은 게임 컨셉과 규칙(그리고 그림이 있다면 그림)을 보고, 실제로 플레이 가능한 웹 게임으로 만들기 위해 꼭 알아야 하는데 아직 정해지지 않은 것을 질문합니다.
- 질문은 3~4개. 가장 중요한 것부터 (예: 주인공/조작 방법, 이기는 방법, 지는 방법, 점수, 난이도, 배경).
- 이미 아이가 정한 것은 다시 묻지 않습니다. 그림이 있으면 그림을 어디에 쓸지(주인공? 적? 아이템?)가 불분명할 때 물어봅니다.
- 2학년이 읽을 수 있게 짧고 쉬운 말로, 친구에게 말하듯 다정하게 씁니다. 질문마다 어울리는 이모지 1개를 앞에 붙입니다.
- 각 질문에는 아이가 바로 고를 수 있는 보기 3개를 줍니다. 보기는 짧게(15자 이내), 이모지를 앞에 붙입니다. 아이는 보기 대신 직접 적을 수도 있습니다.
- summary에는 아이의 게임을 한두 문장으로 칭찬하며 요약합니다. 그림이 있으면 그림도 칭찬합니다.`,
  pro: `당신은 초등학생과 함께 "진짜 게임 회사처럼" 큰 게임을 기획하는 다정한 게임 디자이너입니다.
${SAFETY}

아이가 적은 게임 컨셉과 규칙(그리고 그림이 있다면 그림)을 보고, 여러 단계가 있는 멋진 게임을 만들기 위해 정해야 할 것을 질문합니다.
- 질문은 4~5개. 아직 정해지지 않은 것 중에서 게임을 가장 재미있게 만들 것을 고릅니다:
  조작 방법, 단계(레벨)마다 무엇이 달라지는지, 마지막 보스나 큰 도전, 특별 아이템/파워업, 점수와 별 모으기, 캐릭터 고르기, 배경 음악 분위기 등.
- 이미 아이가 정한 것은 다시 묻지 않습니다. 그림이 있으면 그림을 어디에 쓸지 불분명할 때 물어봅니다.
- 2학년이 읽을 수 있게 짧고 쉬운 말로, 친구에게 말하듯 다정하게 씁니다. 질문마다 어울리는 이모지 1개를 앞에 붙입니다.
- 각 질문에는 보기 3개(15자 이내, 이모지 앞에)를 줍니다. 아이는 직접 적을 수도 있습니다.
- summary에는 아이의 게임을 한두 문장으로 신나게 칭찬하며 요약합니다.`,
};

const COMMON_RULES = `
[출력 형식]
- 오직 완성된 HTML 문서만 출력합니다. 설명, 마크다운, \`\`\` 코드 블록 표시 없이 <!DOCTYPE html> 로 시작해서 </html> 로 끝냅니다.
- CSS와 JavaScript는 모두 파일 안에 넣습니다. 외부 파일, CDN, 웹 폰트, 이미지 주소, fetch/네트워크 요청은 절대 쓰지 않습니다.
- localStorage/sessionStorage/쿠키는 쓰지 않습니다(샌드박스에서 막혀 있음). 최고 점수는 변수에만 기억합니다.
- alert/confirm/prompt 창은 쓰지 않고 화면 안에 메시지를 그립니다.
- 반드시 끝까지 완성해서 </html> 로 닫습니다.

[아이가 넣은 그림]
- 그림이 있으면 꼭 게임에 씁니다. 그림 주소는 그림 번호에 맞는 문자열 "__IMG1__", "__IMG2__", "__IMG3__" … 를 그대로 씁니다
  (예: const hero = new Image(); hero.src = "__IMG1__";  또는 <img src="__IMG1__">). 이 문자열은 나중에 실제 그림으로 바뀝니다.
- 그림은 아이가 종이에 그린 그림을 찍은 사진일 수 있습니다. 비율을 지키며 알맞은 크기로 그리고, 움직일 때 살짝 기울이거나 통통 튀게 해서 살아 있는 느낌을 줍니다.
- 그림이 다 불러와지기 전에도 게임이 멈추지 않게 합니다(onload 전에는 이모지나 도형으로 대신 그림).

[게임 화면]
- 모든 글자는 한국어, 2학년이 읽을 수 있는 쉬운 말. 글자는 크게(최소 18px), 버튼은 크고 둥글게.
- 시작 화면: 게임 이름, "만든 친구: OOO", 노는 방법 2~3줄, 큰 "시작!" 버튼.
- 끝 화면: 이겼을 때/졌을 때 응원 메시지, 점수, "다시 하기" 버튼.
- 화면 크기에 맞게 늘어나고 줄어들게(태블릿·크롬북·휴대폰, 가로·세로 모두). 가로 스크롤이 생기지 않게. 고해상도 화면에서 흐리지 않게 devicePixelRatio 를 반영합니다.
- 조작: 터치(탭/드래그)와 마우스를 꼭 지원하고, 키보드(방향키/스페이스)도 지원합니다. 터치용 화면 버튼이 필요하면 크게 넣습니다.
- 퀴즈가 들어가면 문제는 2학년 수준으로 정확한 내용만 씁니다.`;

const GAME_SYSTEM = {
  basic: `당신은 어린이를 위한 웹 게임을 만드는 실력 있는 게임 개발자입니다.
${SAFETY}

아이가 기획한 게임을 HTML 파일 하나로, 아이가 "우와!" 할 만큼 예쁘고 신나게 완성합니다.
${COMMON_RULES}

[재미와 완성도]
- <canvas> 와 requestAnimationFrame 게임 루프(시간 간격 dt 반영)로 부드럽게 움직이게 만듭니다.
- 캐릭터와 배경은 이모지만 늘어놓지 말고 canvas 도형·그라데이션·그림자로 정성껏 그립니다(그림이 있으면 그림 사용). 배경은 천천히 움직이는 구름·나무 같은 층을 둡니다.
- 맞히거나 성공하면 반짝이 파티클, 점수가 떠오르는 효과, 화면 살짝 흔들림 같은 손맛을 넣습니다.
- Web Audio API로 짧은 효과음(점프, 획득, 실패, 승리)을 만듭니다(첫 터치 후 시작, 소리 끄기 버튼).
- 3단계로 나누어 단계마다 조금씩 어려워지고 배경색이나 장애물이 바뀌게 합니다. 2학년이 1~3분 안에 깰 수 있게 처음은 쉽게.
- 코드는 깔끔하게 400~700줄 정도.`,
  pro: `당신은 세계 최고 수준의 HTML5 게임 개발자이자 아트 디렉터입니다. 어린이가 기획한 게임을 상업용 모바일 게임처럼 완성도 높게 만듭니다.
${SAFETY}

아이가 기획한 게임을 HTML 파일 하나로 완성합니다. 아이와 친구들이 여러 번 다시 하고 싶을 만큼 깊이 있고 아름답게 만듭니다.
${COMMON_RULES}

[설계]
- 먼저 머릿속으로 게임 구조를 설계한 뒤 작성합니다: 게임 상태(타이틀/튜토리얼/플레이/일시정지/단계 클리어/게임오버/엔딩), 엔티티 클래스, 입력 처리, 충돌, 단계 데이터.
- <canvas> 와 requestAnimationFrame, 고정 시간 간격(dt) 업데이트로 어떤 기기에서도 같은 속도로 움직이게 합니다.

[콘텐츠]
- 최소 4~5개 단계(레벨). 단계마다 배경 테마, 적/장애물 패턴, 새로운 요소가 달라집니다. 마지막에는 보스나 큰 도전이 있습니다.
- 파워업/특별 아이템 2가지 이상, 콤보 또는 별(★1~3) 평가, 단계 선택 화면, 최고 점수(메모리).
- 처음 30초는 따라 하기 쉬운 튜토리얼 안내(화살표·말풍선)를 화면 안에 보여 줍니다.

[아트와 손맛]
- 캐릭터·적·아이템은 canvas 경로·그라데이션·외곽선으로 정성껏 그리고, 걷기/날기 같은 2~4프레임 애니메이션이나 눈 깜빡임, 숨쉬기 같은 생동감을 줍니다(아이 그림이 있으면 그 그림을 주인공 등으로 사용).
- 여러 겹의 패럴랙스 배경, 파티클(반짝이·먼지·꽃잎), 트윈 애니메이션, 화면 흔들림, 타격 멈춤(hit stop), 점수 팝업, 단계 전환 연출.
- Web Audio API로 효과음과 간단한 배경 음악(반복되는 멜로디 시퀀서)을 만듭니다. 소리 켜기/끄기, 일시정지 버튼.

[품질]
- 성능을 위해 객체를 재사용하고, 화면 밖 객체는 정리합니다. 오류 없이 처음부터 끝까지 플레이 가능해야 합니다.
- 난이도는 2학년이 끝까지 깰 수 있게 하되, 뒤 단계는 도전적으로. 목숨이 다 떨어져도 그 단계부터 다시 할 수 있게.
- 코드는 잘 정리해서 800~1300줄 정도. 설계는 짧게 끝내고 바로 코드를 쓰기 시작합니다.`,
};

const PATCH_RULES = `
고쳐야 할 부분만 아래 형식의 블록으로 출력하세요. 다른 설명은 쓰지 마세요.

<<<<<<< FIND
(지금 코드에서 그대로 복사한, 바꿀 부분. 공백과 줄바꿈까지 정확히 같고, 코드 안에서 딱 한 번만 나오는 부분)
=======
(바뀐 새 코드)
>>>>>>> REPLACE

- 필요한 만큼 블록을 여러 개 쓸 수 있습니다. FIND는 짧지만 유일하게(보통 3~15줄).
- 새 코드를 추가할 때는 그 위치 근처의 기존 줄을 FIND로 잡고, REPLACE에 기존 줄 + 새 코드를 씁니다.
- 그림 자리표시 "__IMG1__" 등은 그대로 둡니다.`;

// ---------- 스트리밍 응답 (텍스트) ----------
function streamText(mode: Mode, system: string, content: unknown, maxTokens?: number) {
  const conf = CONF[mode];
  const encoder = new TextEncoder();
  let keepAlive: number | undefined;
  const body = new ReadableStream({
    async start(controller) {
      let gotText = false;
      // AI가 생각하는 동안 연결이 끊기지 않게 공백을 조금씩 보냄 (브라우저에서 무시됨)
      keepAlive = setInterval(() => {
        if (!gotText) controller.enqueue(encoder.encode(" "));
      }, 8000);
      try {
        const stream = anthropic.beta.messages.stream({
          model: conf.model,
          max_tokens: maxTokens || conf.maxTokens,
          system,
          output_config: { effort: conf.effort },
          betas: ["server-side-fallback-2026-07-01"],
          // @ts-ignore: SDK 타입이 아직 "default" 문자열을 모를 수 있음
          fallbacks: "default",
          // @ts-ignore: 그림 블록 포함
          messages: [{ role: "user", content }],
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            gotText = true;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n<!--AI_REFUSED-->"));
        }
      } catch (err) {
        console.error("stream error", err);
        controller.enqueue(encoder.encode("\n<!--AI_ERROR-->"));
      } finally {
        clearInterval(keepAlive);
        controller.close();
      }
    },
    cancel() {
      clearInterval(keepAlive);
    },
  });
  return new Response(body, {
    headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}

// ---------- 질문 만들기 (JSON) ----------
const QUESTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "questions"],
  properties: {
    summary: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "choices"],
        properties: {
          question: { type: "string" },
          choices: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

async function makeQuestions(mode: Mode, idea: Idea, images: Img[]) {
  const msg = await anthropic.beta.messages.create({
    model: CONF[mode].model,
    max_tokens: 6000,
    system: QUESTION_SYSTEM[mode],
    output_config: { effort: "low", format: { type: "json_schema", schema: QUESTION_SCHEMA } },
    betas: ["server-side-fallback-2026-07-01"],
    // @ts-ignore: SDK 타입이 아직 "default" 문자열을 모를 수 있음
    fallbacks: "default",
    // @ts-ignore: 그림 블록 포함
    messages: [{ role: "user", content: userContent(images, ideaText(idea, [], images)) }],
  });
  if (msg.stop_reason === "refusal") throw new Error("refused");
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const data = JSON.parse(text);
  data.questions = (data.questions || []).slice(0, mode === "pro" ? 5 : 4).map((q: { question: string; choices: string[] }) => ({
    question: q.question,
    choices: (q.choices || []).slice(0, 3),
  }));
  return data;
}

// ---------- 메인 ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  const mode: Mode = body.mode === "pro" ? "pro" : "basic";
  const code = clip(body.classCode, 50);
  const needed = mode === "pro" ? PRO_CODE : CLASS_CODE;
  if (needed && code !== needed) return json({ error: "wrong_code" }, 401);

  const idea = (body.idea || {}) as Idea;
  const images = cleanImages(idea);
  const action = String(body.action || "");
  const system = GAME_SYSTEM[mode];

  try {
    switch (action) {
      case "check":
        return json({ ok: true });

      case "questions":
        return json(await makeQuestions(mode, idea, images));

      case "generate": {
        const answers = Array.isArray(body.answers) ? (body.answers as Answer[]) : [];
        return streamText(mode, system, userContent(images, `아래 기획대로 게임을 만들어 주세요.\n\n${ideaText(idea, answers, images)}`));
      }

      case "revise":
      case "revise_full": {
        const html = clip(body.html, 250000);
        const request = clip(body.request, 800);
        const head =
          `아이가 만든 게임을 고쳐 주세요. 원래 기획:\n${ideaText(idea, [], images)}\n\n` +
          `아이의 고쳐 달라는 말:\n"${request}"\n\n지금 게임 코드:\n${html}\n\n` +
          `요청한 부분만 바꾸고 나머지는 그대로 두세요.`;
        if (action === "revise") {
          return streamText(mode, system, userContent(images, head + "\n" + PATCH_RULES), 24000);
        }
        return streamText(mode, system, userContent(images, head + " 고친 HTML 문서 전체를 처음부터 끝까지 출력하세요."));
      }

      case "continue": {
        const partial = clip(body.partial, 250000);
        return streamText(
          mode,
          system,
          `아래 기획의 게임 HTML을 만들다가 중간에 끊겼습니다.\n\n${ideaText(idea, [], images)}\n\n` +
            `지금까지 만든 부분:\n${partial}\n\n` +
            `위 내용 바로 다음 글자부터 이어서 </html> 까지 남은 부분만 출력하세요. 앞부분을 반복하지 마세요.`,
        );
      }

      case "save": {
        const html = String(body.html || "");
        if (!/<html/i.test(html) || html.length > 4_000_000) return json({ error: "bad_html" }, 400);
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data, error } = await supabase
          .from("ai_games")
          .insert({
            title: clip(idea.title, 60) || "이름 없는 게임",
            author: clip(idea.author, 30) || "익명",
            concept: clip(idea.concept, 1500),
            rules: clip(idea.rules, 1500),
            html,
          })
          .select("id")
          .single();
        if (error) throw error;
        return json({ id: data.id });
      }

      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (err) {
    console.error(action, err);
    return json({ error: "server_error" }, 500);
  }
});
