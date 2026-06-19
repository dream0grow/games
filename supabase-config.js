/* =========================================================
   Supabase 온라인 랭킹 설정 파일
   ---------------------------------------------------------
   ▶ 아래 두 값만 본인 프로젝트 값으로 바꾸면 온라인 랭킹이 켜집니다.
     1) url      : Supabase 프로젝트 URL   (예: https://abcd1234.supabase.co)
     2) anonKey  : Supabase anon public key

   ▶ 값 찾는 곳:
     Supabase 대시보드 → 프로젝트 선택 → 왼쪽 메뉴 ⚙ Project Settings
     → "API" 탭 → Project URL / Project API keys 의 'anon public'

   ▶ 값을 바꾸기 전에는 자동으로 '이 기기에만 저장(로컬)' 모드로 동작합니다.
   ========================================================= */
window.SUPABASE_CONFIG = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR-ANON-PUBLIC-KEY"
};
