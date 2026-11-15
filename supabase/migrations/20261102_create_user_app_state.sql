-- RK FITNESS account-scoped application state.
-- Stores user profile, workout categories, custom workouts and aggregate history.
-- No service-role key is required by the browser; RLS keeps every row private.
create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_app_state enable row level security;

drop policy if exists "Users read their RK FITNESS state" on public.user_app_state;
create policy "Users read their RK FITNESS state"
  on public.user_app_state for select
  using (auth.uid() = user_id);

drop policy if exists "Users create their RK FITNESS state" on public.user_app_state;
create policy "Users create their RK FITNESS state"
  on public.user_app_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update their RK FITNESS state" on public.user_app_state;
create policy "Users update their RK FITNESS state"
  on public.user_app_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
