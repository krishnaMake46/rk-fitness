-- Publicly served profile photos; uploads and replacement stay scoped to each auth user.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rk-fitness-avatars',
  'rk-fitness-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read own RK FITNESS avatar objects" on storage.objects;
create policy "Users read own RK FITNESS avatar objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'rk-fitness-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users upload own RK FITNESS avatar objects" on storage.objects;
create policy "Users upload own RK FITNESS avatar objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'rk-fitness-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users update own RK FITNESS avatar objects" on storage.objects;
create policy "Users update own RK FITNESS avatar objects"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'rk-fitness-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'rk-fitness-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users delete own RK FITNESS avatar objects" on storage.objects;
create policy "Users delete own RK FITNESS avatar objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'rk-fitness-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Enable realtime updates so a second device sees account state changes without re-login.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'user_app_state'
     ) then
    alter publication supabase_realtime add table public.user_app_state;
  end if;
end
$$;
