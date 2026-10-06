-- AI 게임 만들기: 아이들이 만든 게임 저장 테이블
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run

create table if not exists public.ai_games (
  id          bigint generated always as identity primary key,
  title       text        not null,
  author      text        not null,
  concept     text,
  rules       text,
  html        text        not null,
  hidden      boolean     not null default false,  -- 선생님이 true로 바꾸면 갤러리에서 숨김
  created_at  timestamptz not null default now()
);

create index if not exists ai_games_created_idx on public.ai_games (created_at desc);

alter table public.ai_games enable row level security;

-- 누구나 (숨기지 않은) 게임을 볼 수 있게
drop policy if exists "public read ai_games" on public.ai_games;
create policy "public read ai_games"
  on public.ai_games for select
  using (hidden = false);

-- 저장은 서버 함수(game-maker)만 합니다. 브라우저에서 직접 넣거나 지우는 정책은 만들지 않습니다.
