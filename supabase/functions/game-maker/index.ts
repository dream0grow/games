// =========================================================
// AI 게임 만들기 서버 함수 (Supabase Edge Function)
// ---------------------------------------------------------
// 아이들 화면(game-maker/)에서 호출합니다. Anthropic API 키는
// 이 서버에만 있고 브라우저에는 절대 내려가지 않습니다.
//
// 필요한 비밀값 (supabase secrets set ...):
//   ANTHROPIC_API_KEY  : 선생님의 Anthropic API 키 (필수)
//   CLASS_CODE         : 교실 코드. 설정하면 이 코드를 아는 사람만 사용 가능 (권장)
//   GAME_MODEL         : 사용할 모델 (선택, 기본 claude-sonnet-5-5)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 는 Supabase가 자동으로 넣어 줍니다.
//
// 요청 (POST JSON, 모두 classCode 포함):
//   {action:"questions", idea}                 → JSON {summary, questions:[{question, choices}]}
//   {action:"generate", idea, answers}         → HTML 텍스트 스트림
//   {action:"revise", idea, html, request}     → HTML 텍스트 스트림 (고친 전체 HTML)
//   {action:"continue", idea, partial}         → HTML 텍스트 스트림 (끊긴 뒤 이어지는 부분)
//   {action:"save", idea, html}                → JSON {id}
//   {action:"check"}                           → JSON {ok:true} (교실 코드 확인용)
// =========================================================
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = Deno.env.get("GAME_MODEL") || "claude-sonnet-5-5";
const CLASS_CODE = (Deno.env.get("CLASS_CODE") || "").trim();

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

// ---------- 아이들 입력 정리 ----------
type Idea = { title?: string; author?: string; concept?: string; rules?: string; theme?: string };
type Answer = { question: string; answer: string };

const clip = (s: unknown, n: number) => String(s ?? "").slice(0, n).trim();

function ideaText(idea: Idea, answers: Answer[] = []) {
  const lines = [
    `게임 이름: ${clip(idea.title, 60) || "(아직 없음)"}`,
    `만든 친구: ${clip(idea.author, 30) || "(익명)"}`,
    idea.theme ? `주제(수업 내용): ${clip(idea.theme, 200)}` : "",
    `게임 컨셉(아이가 생각한 이야기와 모습):\n${clip(idea.concept, 1500)}`,
    `게임 규칙(아이가 정한 규칙):\n${clip(idea.rules, 1500)}`,
  ].filter(Boolean);
  if (answers.length) {
    lines.push(
      "AI 질문에 대한 아이의 대답:\n" +
        answers.slice(0, 8).map((a, i) => `${i + 1}. ${clip(a.question, 200)} → ${clip(a.answer, 300)}`).join("\n"),
    );
  }
  return lines.join("\n\n");
}

// ---------- 프롬프트 ----------
const SAFETY = `
사용자는 한국 초등학교 2학년 어린이(8~9살)입니다. 선생님이 수업 시간에 함께 사용합니다.
- 내용은 항상 어린이에게 알맞게 만듭니다. 피, 잔인함, 무서운 장면, 무기로 사람을 해치는 장면, 욕설, 차별은 넣지 않습니다.
  아이가 그런 것을 원하면 "물풍선 맞히기", "몬스터를 잠재우기"처럼 귀엽고 순한 방식으로 바꿔서 의도는 살립니다.
- 실제 사람의 이름·얼굴·개인정보는 쓰지 않습니다. 아이 이름은 '만든 친구' 표시에만 씁니다.
- 아이의 생각을 존중합니다. 아이가 정한 규칙과 컨셉을 최대한 그대로 살리고, 빠진 부분만 채웁니다.`;

const QUESTION_SYSTEM = `당신은 초등학생과 함께 게임을 기획하는 다정한 게임 선생님입니다.
${SAFETY}

아이가 적은 게임 컨셉과 규칙을 읽고, 실제로 플레이 가능한 웹 게임으로 만들기 위해 꼭 알아야 하는데 아직 정해지지 않은 것을 질문합니다.
- 질문은 3~4개. 가장 중요한 것부터 (예: 주인공/조작 방법, 이기는 방법, 지는 방법, 점수, 난이도, 배경).
- 이미 아이가 정한 것은 다시 묻지 않습니다.
- 2학년이 읽을 수 있게 짧고 쉬운 말로, 존댓말 대신 친구에게 말하듯 다정하게 씁니다. 질문마다 어울리는 이모지 1개를 앞에 붙입니다.
- 각 질문에는 아이가 바로 고를 수 있는 보기 3개를 줍니다. 보기는 짧게(15자 이내), 이모지를 앞에 붙입니다. 아이는 보기 대신 직접 적을 수도 있습니다.
- summary에는 아이의 게임을 한두 문장으로 칭찬하며 요약합니다.`;

const GAME_SYSTEM = `당신은 어린이를 위한 웹 게임을 만드는 최고의 게임 개발자입니다.
${SAFETY}

아이가 기획한 게임을 HTML 파일 하나로 완성합니다.

[출력 형식]
- 오직 완성된 HTML 문서만 출력합니다. 설명, 마크다운, \`\`\` 코드 블록 표시 없이 <!DOCTYPE html> 로 시작해서 </html> 로 끝냅니다.
- CSS와 JavaScript는 모두 파일 안에 넣습니다. 외부 파일, CDN, 웹 폰트, 이미지 주소, fetch/네트워크 요청은 절대 쓰지 않습니다.
- 그림은 이모지, CSS 도형, <canvas> 그리기, 인라인 SVG로 표현합니다. 소리가 필요하면 Web Audio API로 짧은 효과음만 만듭니다(첫 터치 후에 시작).
- localStorage/sessionStorage/쿠키는 쓰지 않습니다(샌드박스에서 막혀 있음). 최고 점수는 변수에만 기억합니다.
- alert/confirm/prompt 창은 쓰지 않고 화면 안에 메시지를 그립니다.
- 코드는 짧고 깔끔하게(대략 250~450줄). 반드시 끝까지 완성해서 </html> 로 닫습니다.

[게임 화면]
- 모든 글자는 한국어, 2학년이 읽을 수 있는 쉬운 말. 글자는 크게(최소 18px), 버튼은 크고 둥글게.
- 시작 화면: 게임 이름, "만든 친구: OOO", 노는 방법 2~3줄, 큰 "시작!" 버튼.
- 끝 화면: 이겼을 때/졌을 때 응원 메시지, 점수, "다시 하기" 버튼.
- 화면 크기에 맞게 늘어나고 줄어들게(태블릿·크롬북·휴대폰). 가로 스크롤이 생기지 않게.
- 조작: 터치(탭/드래그)와 마우스를 꼭 지원하고, 키보드(방향키/스페이스)도 지원합니다. 터치용 화면 버튼이 필요하면 크게 넣습니다.
- 밝고 예쁜 색, 부드러운 움직임, 맞히거나 성공하면 반짝이는 효과로 신나게.
- 난이도는 2학년이 1~3분 안에 깰 수 있을 만큼 쉽게 시작해서 조금씩 어려워지게.
- 퀴즈가 들어가면 문제는 2학년 수준으로 정확한 내용만 씁니다.`;

// ---------- 스트리밍 응답 (HTML 텍스트) ----------
function streamText(system: string, userContent: string, maxTokens = 32000) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.beta.messages.stream({
          model: MODEL,
          max_tokens: maxTokens,
          system,
          output_config: { effort: "low" },
          betas: ["server-side-fallback-2026-07-01"],
          // @ts-ignore: SDK 타입이 아직 "default" 문자열을 모를 수 있음
          fallbacks: "default",
          messages: [{ role: "user", content: userContent }],
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
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
        controller.close();
      }
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

async function makeQuestions(idea: Idea) {
  const msg = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: QUESTION_SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema: QUESTION_SCHEMA } },
    betas: ["server-side-fallback-2026-07-01"],
    // @ts-ignore: SDK 타입이 아직 "default" 문자열을 모를 수 있음
    fallbacks: "default",
    messages: [{ role: "user", content: ideaText(idea) }],
  });
  if (msg.stop_reason === "refusal") throw new Error("refused");
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const data = JSON.parse(text);
  data.questions = (data.questions || []).slice(0, 4).map((q: { question: string; choices: string[] }) => ({
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

  if (CLASS_CODE && clip(body.classCode, 50) !== CLASS_CODE) {
    return json({ error: "wrong_code" }, 401);
  }

  const idea = (body.idea || {}) as Idea;
  const action = String(body.action || "");

  try {
    switch (action) {
      case "check":
        return json({ ok: true });

      case "questions":
        return json(await makeQuestions(idea));

      case "generate": {
        const answers = Array.isArray(body.answers) ? (body.answers as Answer[]) : [];
        return streamText(GAME_SYSTEM, `아래 기획대로 게임을 만들어 주세요.\n\n${ideaText(idea, answers)}`);
      }

      case "revise": {
        const html = clip(body.html, 120000);
        const request = clip(body.request, 800);
        return streamText(
          GAME_SYSTEM,
          `아이가 만든 게임을 고쳐 주세요. 원래 기획:\n${ideaText(idea)}\n\n` +
            `아이의 고쳐 달라는 말:\n"${request}"\n\n` +
            `지금 게임 코드:\n${html}\n\n` +
            `요청한 부분만 바꾸고 나머지는 그대로 두세요. 고친 HTML 문서 전체를 처음부터 끝까지 출력하세요.`,
        );
      }

      case "continue": {
        const partial = clip(body.partial, 120000);
        return streamText(
          GAME_SYSTEM,
          `아래 기획의 게임 HTML을 만들다가 중간에 끊겼습니다.\n\n${ideaText(idea)}\n\n` +
            `지금까지 만든 부분:\n${partial}\n\n` +
            `위 내용 바로 다음 글자부터 이어서 </html> 까지 남은 부분만 출력하세요. 앞부분을 반복하지 마세요.`,
          24000,
        );
      }

      case "save": {
        const html = String(body.html || "");
        if (!html.includes("<html") || html.length > 300000) return json({ error: "bad_html" }, 400);
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
