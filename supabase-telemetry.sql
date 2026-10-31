-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Per-level playtest telemetry. Separate from game_scores so your existing tables stay untouched.
create table if not exists public.game_events (
  id          bigint generated always as identity primary key,
  player_id   uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  game_id     text        not null check (game_id in ('coding-via-gaming','pipeline-quest')),
  session_id  text        not null check (char_length(session_id) <= 16),
  event       text        not null check (event in ('level_start','level_clear')),
  level       int         not null check (level between 1 and 20),
  mistakes    int         check (mistakes between 0 and 10000),
  duration_ms int         check (duration_ms between 0 and 86400000),
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists game_events_game_level_idx on public.game_events (game_id, level, created_at desc);

alter table public.game_events enable row level security;
-- Players may only insert their own rows and read their own rows. No update/delete from the browser.
create policy "insert own events" on public.game_events for insert to authenticated with check (player_id = auth.uid());
create policy "read own events"   on public.game_events for select to authenticated using (player_id = auth.uid());

-- ===== Analysis queries for your report (run as project owner in the SQL Editor; owner bypasses RLS) =====
-- 1) Per-level difficulty: first-try clear rate, mean mistakes, mean time
-- select level, count(*) as clears,
--        round(100.0*count(*) filter (where mistakes=0)/count(*),0) as first_try_pct,
--        round(avg(mistakes),1) as avg_mistakes, round(avg(duration_ms)/1000.0,0) as avg_sec
-- from public.game_events where event='level_clear' and game_id='pipeline-quest'
-- group by level order by level;
-- 2) Funnel: how many sessions started vs cleared each level
-- select level, count(distinct session_id) filter (where event='level_start') as started,
--                count(distinct session_id) filter (where event='level_clear') as cleared
-- from public.game_events where game_id='pipeline-quest' group by level order by level;
