-- Time Tracker schema for Supabase
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run

-- ─────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  client      text default '',
  rate        numeric(10,2) not null default 0,
  color       text default '#1a1a1a',
  created_at  timestamptz not null default now()
);

create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid not null references public.projects(id) on delete cascade,
  start_at    timestamptz not null,
  end_at      timestamptz,
  note        text default '',
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
create index if not exists projects_user_idx on public.projects(user_id);
create index if not exists entries_user_idx  on public.entries(user_id);
create index if not exists entries_start_idx on public.entries(user_id, start_at desc);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Each user can only see/modify their own rows.
-- ─────────────────────────────────────────────
alter table public.projects enable row level security;
alter table public.entries  enable row level security;

drop policy if exists "own projects" on public.projects;
create policy "own projects" on public.projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own entries" on public.entries;
create policy "own entries" on public.entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
