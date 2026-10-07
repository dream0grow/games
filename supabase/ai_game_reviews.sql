-- 우리반 게임: 썸네일 + 별점·소감
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (ai_games.sql 을 먼저 실행한 뒤)

-- 1) 갤러리 썸네일 (게임 화면을 찍은 JPEG data URL)
alter table public.ai_games add column if not exists thumb text;

-- 2) 별점(1~5)과 소감
create table if not exists public.ai_game_reviews (
  id          bigint generated always as identity primary key,
  game_id     bigint      not null references public.ai_games (id) on delete cascade,
  stars       smallint    not null check (stars between 1 and 5),
  name        text        not null,          -- 글쓴이 이름 (꼭 필요)
  comment     text        not null,
  hidden      boolean     not null default false,  -- true 로 바꾸면 안 보임
  created_at  timestamptz not null default now()
);

create index if not exists ai_game_reviews_game_idx on public.ai_game_reviews (game_id, created_at desc);

alter table public.ai_game_reviews enable row level security;

-- 누구나 (숨기지 않은) 소감을 볼 수 있게
drop policy if exists "public read ai_game_reviews" on public.ai_game_reviews;
create policy "public read ai_game_reviews"
  on public.ai_game_reviews for select
  using (hidden = false);

-- 쓰기·숨기기는 서버 함수(game-maker)만 합니다 (교실 코드 확인).
