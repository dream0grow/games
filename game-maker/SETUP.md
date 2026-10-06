# AI와 게임 만들기 — 선생님 설정 방법

아이들이 `https://dream0grow.github.io/games/game-maker/` 에 접속해서
게임 아이디어를 적으면 → AI가 질문하고 → 대답을 반영해 게임을 만들어 줍니다.
완성된 게임은 **우리반 게임**(`game-maker/gallery.html`)에 올려 친구들과 함께 놀 수 있어요.

AI 호출은 선생님의 Anthropic API 키로 합니다. 키는 Supabase 서버 함수 안에만 저장되고,
아이들 브라우저에는 절대 보이지 않습니다. 아이들은 로그인 없이 링크만 열면 됩니다.

> 이미 곶자왈 게임 랭킹용으로 쓰고 있는 Supabase 프로젝트를 그대로 씁니다 (`supabase-config.js`).

---

## 1. Anthropic API 키 만들기 (5분)
1. https://console.anthropic.com 에 가입·로그인
2. **Billing** 에서 크레딧 충전 (예: $10). **Limits** 에서 월 사용 한도를 정해 두면 안심이 돼요.
3. **API Keys → Create Key** → `sk-ant-...` 로 시작하는 키를 복사 (한 번만 보여 줘요)

비용 감: 게임 1개 만들기(질문 + 생성)는 대략 50~150원, 고치기 1번도 비슷합니다.
한 반 25명이 한 번씩 만들고 두세 번 고치면 대략 1만~1만5천 원 정도로 예상하세요.

## 2. 게임 저장 테이블 만들기
Supabase 대시보드 → **SQL Editor** → `supabase/ai_games.sql` 내용을 붙여넣고 **Run**.

## 3. 서버 함수 올리기
터미널(이 폴더)에서 차례로 실행합니다. 처음 한 번만 하면 돼요.

```bash
npx supabase login                       # 브라우저가 열리면 로그인
npx supabase secrets set --project-ref lanootakxybeshnsrnyu ANTHROPIC_API_KEY=sk-ant-여기에키
npx supabase secrets set --project-ref lanootakxybeshnsrnyu CLASS_CODE=골든반2026
npx supabase functions deploy game-maker --project-ref lanootakxybeshnsrnyu
```

- `CLASS_CODE` 는 **교실 코드**예요. 아이들이 처음 AI를 쓸 때 한 번 입력합니다(그 기기에 기억됨).
  링크가 밖으로 퍼져도 모르는 사람이 선생님 API 키를 쓰지 못하게 막아 줍니다. 꼭 설정하세요.
  바꾸고 싶으면 같은 명령으로 다시 설정하면 바로 적용돼요.
- (선택) 모델 바꾸기: 기본은 `claude-sonnet-5-5`(빠르고 저렴). 더 정교하게 만들고 싶으면 `GAME_MODEL=claude-opus-5-5` 로 설정하세요.

## 4. 확인
`https://dream0grow.github.io/games/game-maker/` 접속 → 예시 아이디어 하나 눌러서 끝까지 만들어 보세요.

---

## 운영 팁
- **게임 숨기기/지우기**: Supabase → Table Editor → `ai_games` 에서 `hidden` 을 `true` 로 바꾸면 갤러리에서 사라져요. 행을 지워도 됩니다.
- **사용량 보기**: console.anthropic.com → Usage
- **오류가 계속 날 때**: Supabase → Edge Functions → game-maker → Logs
- 음성 입력(🎤)은 크롬·엣지·안드로이드에서 됩니다. 안 되는 브라우저에서는 버튼이 숨겨져요.
- 만들어진 게임은 안전한 상자(sandbox) 안에서 실행돼서 사이트나 다른 게임에 영향을 주지 않아요.

## 파일 구성
| 파일 | 역할 |
|------|------|
| `game-maker/index.html` | 아이들이 게임을 만드는 화면 (생각 적기 → AI 질문 → 만들기 → 놀기·고치기·올리기) |
| `game-maker/gallery.html` | 우리반 게임 목록 |
| `game-maker/play.html?id=N` | 친구 게임 하기 |
| `game-maker/api.js`, `style.css` | 공용 코드·스타일 |
| `supabase/functions/game-maker/index.ts` | AI를 부르는 서버 함수 (API 키는 여기에만) |
| `supabase/ai_games.sql` | 게임 저장 테이블 |
