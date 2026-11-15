-- RK FITNESS: one row per completed exercise in a workout session.
-- Run this migration in Supabase SQL Editor (or with the Supabase CLI).
create table if not exists public.exercise_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid not null,
  exercise_id text not null,
  exercise_name text not null,
  workout_name text not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  sets integer not null check (sets >= 0),
  reps integer not null check (reps >= 0),
  weight_kg numeric(8,2) not null default 0 check (weight_kg >= 0),
  created_at timestamptz not null default now()
);

create index if not exists exercise_records_user_exercise_finished_idx
  on public.exercise_records (user_id, exercise_id, finished_at desc);

alter table public.exercise_records enable row level security;

drop policy if exists "Users read own exercise records" on public.exercise_records;
create policy "Users read own exercise records"
  on public.exercise_records for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own exercise records" on public.exercise_records;
create policy "Users insert own exercise records"
  on public.exercise_records for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own exercise records" on public.exercise_records;
create policy "Users delete own exercise records"
  on public.exercise_records for delete to authenticated
  using (auth.uid() = user_id);
