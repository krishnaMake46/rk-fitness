-- RK FITNESS authenticated, global, text-only community chat.
-- Users can read and append messages. Updates and deletes are intentionally unavailable.
create table if not exists public.global_chat_messages (
  id uuid primary key default gen_random_uuid(),
  client_nonce uuid not null default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint global_chat_body_length check (char_length(body) between 1 and 500)
);

alter table public.global_chat_messages
  add column if not exists client_nonce uuid not null default gen_random_uuid();

alter table public.global_chat_messages enable row level security;
revoke all on public.global_chat_messages from anon;
revoke update, delete on public.global_chat_messages from authenticated;
grant select, insert on public.global_chat_messages to authenticated;

drop policy if exists "Signed-in members can read global chat" on public.global_chat_messages;
create policy "Signed-in members can read global chat"
  on public.global_chat_messages for select to authenticated using (true);

drop policy if exists "Signed-in members can send their own chat messages" on public.global_chat_messages;
create policy "Signed-in members can send their own chat messages"
  on public.global_chat_messages for insert to authenticated
  with check (auth.uid() = sender_id);

create or replace function public.prepare_rk_global_chat_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  auth_display_name text;
  normalized_body text;
begin
  normalized_body := btrim(new.body);
  if normalized_body = '' or char_length(normalized_body) > 500 then
    raise exception 'Messages must contain 1 to 500 characters.' using errcode = '22023';
  end if;

  if normalized_body ~* '(https?://|www\.)|([[:alnum:]_-]+\.)+[[:alpha:]]{2,63}([/ :?#)]|$)|[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,63}' then
    raise exception 'Links are not allowed in Global Chat.' using errcode = '22023';
  end if;
  if normalized_body ~ '([+]?[0-9][0-9 ().-]{5,}[0-9])' then
    raise exception 'Phone numbers are not allowed in Global Chat.' using errcode = '22023';
  end if;

  if (select count(*) from public.global_chat_messages as prior
      where prior.sender_id = new.sender_id
        and prior.created_at > now() - interval '5 seconds') >= 8 then
    raise exception 'Please wait a moment before sending more messages.' using errcode = '22023';
  end if;

  -- Curated common abuse terms in English, Tamil (script and transliteration),
  -- Hindi, Spanish, French, German and Polish. The client uses a matching starter list.
  if normalized_body ~* '(^|[^[:alnum:]_])(fuck|fucker|fucking|motherfucker|shit|shitty|bullshit|bitch|bitches|bastard|asshole|dickhead|cunt|slut|whore|nigger|nigga|retard|punda|pundai|thevdiya|thevidiya|otha|ommala|omala|mayiru|mayeeru|baadu|koothi|poolu|soothu|sunni|madarchod|behenchod|bhenchod|chutiya|gaand|randi|harami|lund|bhosdi|puta|puto|mierda|coño|joder|cabron|putain|merde|connard|arschloch|scheisse|kurwa|chuj|blyat)([^[:alnum:]_]|$)'
     or normalized_body ~* '(piss[[:space:]]+off|otha[[:space:]]+dei|baadu[[:space:]]+paiya|otha[[:space:]]+punda)'
     or normalized_body like '%புண்டை%'
     or normalized_body like '%தேவடியா%'
     or normalized_body like '%ஒத்தா%'
     or normalized_body like '%மயிரு%'
     or normalized_body like '%கூதி%'
     or normalized_body like '%பூலு%' then
    raise exception 'Please keep the chat respectful. This message contains language that is not allowed.' using errcode = '22023';
  end if;

  select nullif(btrim(u.raw_user_meta_data ->> 'full_name'), '')
    into auth_display_name
    from auth.users as u
    where u.id = new.sender_id;

  auth_display_name := coalesce(auth_display_name, 'RK Athlete');
  auth_display_name := split_part(auth_display_name, '@', 1);
  auth_display_name := regexp_replace(auth_display_name, '[+]?[0-9][0-9 ().-]{5,}[0-9]', '', 'g');
  auth_display_name := btrim(regexp_replace(auth_display_name, '[[:space:]]+', ' ', 'g'));
  new.display_name := left(coalesce(nullif(auth_display_name, ''), 'RK Athlete'), 60);
  new.body := normalized_body;
  return new;
end;
$$;

drop trigger if exists prepare_rk_global_chat_message on public.global_chat_messages;
create trigger prepare_rk_global_chat_message
  before insert on public.global_chat_messages
  for each row execute function public.prepare_rk_global_chat_message();

-- Keep realtime subscription enabled on Supabase projects where it is not already present.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'global_chat_messages'
     ) then
    alter publication supabase_realtime add table public.global_chat_messages;
  end if;
end;
$$;
