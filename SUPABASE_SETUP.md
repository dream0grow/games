# 온라인 랭킹 설정 방법 (Supabase)

곶자왈 게임 4종(speed · tower · lava · butterfly)의 점수를 **여러 기기가 함께 보는 온라인 랭킹**으로 저장합니다.
설정 전에는 자동으로 '이 기기에만 저장(로컬)' 모드로 동작하니, 키만 넣으면 바로 온라인으로 바뀝니다.

## 1. Supabase 프로젝트 만들기
1. https://supabase.com 가입 후 **New project** 생성 (무료 플랜으로 충분)
2. 비밀번호·지역 정해서 생성 (1~2분 소요)

## 2. 점수 테이블 만들기
왼쪽 메뉴 **SQL Editor** → 아래 SQL 붙여넣고 **Run**:

```sql
create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  game        text        not null,
  name        text        not null,
  score       integer     not null,
  extra       jsonb,
  created_at  timestamptz not null default now()
);

-- 게임별 점수 조회를 빠르게
create index if not exists scores_game_score_idx
  on public.scores (game, score desc, created_at asc);

-- 행 수준 보안 켜기
alter table public.scores enable row level security;

-- 누구나 랭킹을 읽을 수 있게
create policy "public read scores"
  on public.scores for select
  using (true);

-- 누구나 점수를 등록할 수 있게 (수정/삭제는 불가)
create policy "public insert scores"
  on public.scores for insert
  with check (true);
```

## 3. 키 두 개를 복사해 붙여넣기
1. 왼쪽 메뉴 **⚙ Project Settings → API**
2. 다음 두 값을 복사:
   - **Project URL** (예: `https://abcd1234.supabase.co`)
   - **Project API keys → `anon` `public`** 키
3. 같은 폴더의 **`supabase-config.js`** 를 열어 두 값을 넣고 저장:

```js
window.SUPABASE_CONFIG = {
  url: "https://abcd1234.supabase.co",
  anonKey: "여기에-anon-public-키"
};
```

저장하고 게임을 새로고침하면 끝! 결과 화면에 **🌐 온라인 랭킹**이 표시됩니다.

## 게임별 점수 의미 (online `game` 값 / `extra`)
| 게임 | game 값 | score (정렬 기준) | extra |
|------|---------|------------------|-------|
| 스피드 퀴즈 | `speed-1` ~ `speed-3` (단계별) | 완주=빠를수록↑, 미완주=많이 맞힐수록↑ | `{cleared, correct, time}` |
| 곤충 타워 | `tower` | 점수 그대로 | `{m, insects}` |
| 용암 건너기 | `lava` | 점수 그대로 | `{won}` |
| 나비 피하기 | `butterfly` | 점수 그대로 | `{birds, won}` |

## 점수 확인·관리 (선생님용)
- Supabase 대시보드 **Table Editor → scores** 에서 전체 점수를 볼 수 있어요.
- 장난 점수나 이상한 이름은 그 화면에서 직접 삭제할 수 있어요.
- 특정 게임만 보려면 SQL Editor에서:
  ```sql
  select name, score, extra, created_at
  from public.scores
  where game = 'tower'
  order by score desc
  limit 20;
  ```
