-- NOW 0.7 Beta Candidate hardening
create extension if not exists pgcrypto;

-- Product / moderation / device support
alter table profiles add column if not exists deleted_at timestamptz;
alter table profiles add column if not exists onboarding_complete boolean not null default false;
alter table profiles add column if not exists last_active_at timestamptz default now();

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  token text unique not null,
  platform text not null check (platform in ('ios','android','web')),
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists moderation_cases (
  id uuid primary key default gen_random_uuid(),
  report_id bigint references reports_blocks(id) on delete set null,
  target uuid references profiles on delete cascade,
  status text not null default 'open' check (status in ('open','reviewing','actioned','dismissed')),
  action text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists purchase_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  provider text not null check (provider in ('apple','google')),
  product_id text not null,
  transaction_id text not null unique,
  original_transaction_id text,
  purchase_type text not null check (purchase_type in ('subscription','consumable')),
  status text not null default 'verified',
  raw jsonb,
  created_at timestamptz default now()
);

create table if not exists entitlement_events (
  id bigserial primary key,
  user_id uuid not null references profiles on delete cascade,
  entitlement text not null,
  active boolean not null,
  source text not null,
  source_ref text,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists swipe_history (
  id bigserial primary key,
  actor uuid not null references profiles on delete cascade,
  target uuid not null references profiles on delete cascade,
  direction text not null check (direction in ('like','skip')),
  created_at timestamptz default now()
);

create index if not exists idx_swipe_history_actor_created on swipe_history(actor, created_at desc);
create index if not exists idx_messages_conversation_created on messages(conversation_id, created_at);
create index if not exists idx_slots_user_active on availability_slots(user_id, active, ends_at);

-- Unique block/report de-duplication is intentionally not enforced for reports; repeated abuse may matter.

-- Referral code generator: one active code per inviter.
create unique index if not exists idx_referrals_one_open_code_per_inviter
  on referrals(inviter) where invitee is null;

create or replace function get_or_create_referral_code() returns text
language plpgsql security definer set search_path=public as $$
declare me uuid := auth.uid(); c text;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select code into c from referrals where inviter=me and invitee is null limit 1;
  if c is null then
    c := upper(substr(encode(gen_random_bytes(6),'hex'),1,8));
    insert into referrals(inviter,code) values(me,c);
  end if;
  return c;
end $$;

-- Secure credit spending: wallet + immutable ledger transaction.
create or replace function spend_credits(why text, amount int, r text default null) returns int
language plpgsql security definer set search_path=public as $$
declare me uuid := auth.uid(); bal int;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if amount <= 0 then raise exception 'invalid_amount'; end if;
  insert into credit_wallets(user_id,balance) values(me,0) on conflict(user_id) do nothing;
  select balance into bal from credit_wallets where user_id=me for update;
  if bal < amount then raise exception 'insufficient_credits'; end if;
  update credit_wallets set balance=balance-amount where user_id=me returning balance into bal;
  insert into credit_ledger(user_id,delta,reason,ref) values(me,-amount,why,r);
  return bal;
end $$;

-- Skip is also recorded; likes stay authoritative in likes table.
create or replace function record_skip(target uuid) returns void
language plpgsql security definer set search_path=public as $$
declare me uuid := auth.uid();
begin
  if active_slot_count(me)=0 then raise exception 'availability_gate'; end if;
  insert into swipe_history(actor,target,direction) values(me,target,'skip');
end $$;

-- Rewind last swipe. For mutual match, we do NOT delete a match; only non-matching likes or skips can rewind.
create or replace function rewind_last_swipe() returns uuid
language plpgsql security definer set search_path=public as $$
declare me uuid := auth.uid(); s swipe_history; matched boolean;
begin
  if not is_premium(me) then raise exception 'premium_required'; end if;
  select * into s from swipe_history where actor=me order by created_at desc limit 1 for update;
  if not found then return null; end if;
  if s.direction='like' then
    select exists(select 1 from matches where user_a=least(me,s.target) and user_b=greatest(me,s.target)) into matched;
    if matched then raise exception 'cannot_rewind_match'; end if;
    delete from likes where liker=me and liked=s.target;
  end if;
  delete from swipe_history where id=s.id;
  return s.target;
end $$;

-- Replace like_user to record history and ensure blocked/deleted target cannot be liked.
create or replace function like_user(target uuid, slot uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); mid uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if active_slot_count(me)=0 then raise exception 'availability_gate'; end if;
  if target=me then raise exception 'invalid_target'; end if;
  if exists(select 1 from reports_blocks where kind='block' and ((reporter=me and reports_blocks.target=like_user.target) or (reporter=like_user.target and reports_blocks.target=me))) then
    raise exception 'blocked';
  end if;
  if exists(select 1 from profiles where id=target and deleted_at is not null) then raise exception 'target_unavailable'; end if;

  insert into likes(liker,liked,slot_id) values(me,target,slot) on conflict do nothing;
  insert into swipe_history(actor,target,direction) values(me,target,'like');

  if exists(select 1 from likes where liker=target and liked=me) then
    insert into matches(user_a,user_b) values(least(me,target),greatest(me,target)) on conflict do nothing returning id into mid;
    if mid is null then select id into mid from matches where user_a=least(me,target) and user_b=greatest(me,target); end if;
    insert into conversations(match_id) values(mid) on conflict do nothing;
    return mid;
  end if;
  return null;
end $$;

-- View-like RPC for match list including favorite state and conversation id.
create or replace function my_matches()
returns table(match_id uuid, person_id uuid, display_name text, age int, bio text, vibes text[], verified boolean, favorite boolean, conversation_id uuid, created_at timestamptz)
language sql security definer set search_path=public as $$
  select m.id,
         case when m.user_a=auth.uid() then m.user_b else m.user_a end as person_id,
         p.display_name, extract(year from age(p.birth_date))::int, p.bio, p.vibes, p.verified,
         exists(select 1 from favorites f where f.user_id=auth.uid() and f.match_id=m.id),
         c.id, m.created_at
  from matches m
  join profiles p on p.id=case when m.user_a=auth.uid() then m.user_b else m.user_a end
  left join conversations c on c.match_id=m.id
  where auth.uid() in (m.user_a,m.user_b) and p.deleted_at is null
  order by m.created_at desc
$$;

-- Report also creates moderation case.
create or replace function create_moderation_case() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.kind='report' then
    insert into moderation_cases(report_id,target) values(new.id,new.target);
  end if;
  return new;
end $$;
drop trigger if exists trg_report_moderation on reports_blocks;
create trigger trg_report_moderation after insert on reports_blocks for each row execute function create_moderation_case();

-- Soft-delete account request: hides profile immediately. Actual auth deletion should be done by a service-role Edge Function.
create or replace function request_account_deletion() returns boolean
language plpgsql security definer set search_path=public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_authenticated'; end if;
  update profiles set deleted_at=now(), display_name='Deleted user', bio=null, incognito=true where id=me;
  update availability_slots set active=false where user_id=me;
  delete from push_tokens where user_id=me;
  return true;
end $$;

-- Discovery v0.7: intent + time overlap + photo + bio. Distance remains 0 until geocoding is enabled.
drop function if exists discover(int,int);
create or replace function discover(max_km int default 25, limit_n int default 40)
returns table(user_id uuid, display_name text, age int, overlap_minutes int, city text, slot_id uuid, starts_at timestamptz, ends_at timestamptz, vibes text[], verified boolean, bio text, photo_url text, intent_match text, distance_km numeric)
language plpgsql security definer set search_path=public as $$
declare me uuid := auth.uid();
begin
  if me is null or active_slot_count(me)=0 then return; end if;
  return query
  select p.id, p.display_name, extract(year from age(p.birth_date))::int,
    (extract(epoch from (least(s2.ends_at,s1.ends_at)-greatest(s2.starts_at,s1.starts_at)))/60)::int,
    s2.city, s2.id, s2.starts_at, s2.ends_at, p.vibes, p.verified, coalesce(p.bio,''),
    (select pp.path from profile_photos pp where pp.user_id=p.id and pp.moderation in ('approved','pending') order by pp.position limit 1),
    (select i2.intent from intents i1 join intents i2 on i2.intent=i1.intent where i1.user_id=me and i2.user_id=p.id limit 1),
    0::numeric
  from availability_slots s1
  join availability_slots s2 on s2.user_id<>me and s2.active and s2.ends_at>now()
    and tstzrange(s1.starts_at,s1.ends_at) && tstzrange(s2.starts_at,s2.ends_at)
    and lower(s1.city)=lower(s2.city)
  join profiles p on p.id=s2.user_id and p.deleted_at is null
  where s1.user_id=me and s1.active and s1.ends_at>now()
    and (
      exists(select 1 from intents mine join intents theirs on theirs.intent=mine.intent where mine.user_id=me and theirs.user_id=p.id)
      or not exists(select 1 from intents where user_id=me)
    )
    and (not p.incognito or exists(select 1 from likes where liker=p.id and liked=me))
    and not exists(select 1 from likes l where l.liker=me and l.liked=p.id)
    and not exists(select 1 from swipe_history sh where sh.actor=me and sh.target=p.id and sh.direction='skip' and sh.created_at>now()-interval '7 days')
    and not exists(select 1 from reports_blocks b where b.kind='block' and ((b.reporter=me and b.target=p.id) or (b.reporter=p.id and b.target=me)))
  order by overlap_minutes desc
  limit limit_n;
end $$;

-- RLS for new tables
alter table push_tokens enable row level security;
alter table moderation_cases enable row level security;
alter table purchase_events enable row level security;
alter table entitlement_events enable row level security;
alter table swipe_history enable row level security;

create policy "own push tokens" on push_tokens for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "own purchases read" on purchase_events for select using(user_id=auth.uid());
create policy "own entitlement events read" on entitlement_events for select using(user_id=auth.uid());
create policy "own swipe history read" on swipe_history for select using(actor=auth.uid());
-- No client policy on moderation_cases: service role/admin only.

-- Storage bucket for profile images. Public delivery is convenient for beta; moderation before display remains app-side.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-photos','profile-photos',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

create policy "profile photo upload own folder" on storage.objects for insert to authenticated
with check(bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "profile photo delete own folder" on storage.objects for delete to authenticated
using(bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "profile photos public read" on storage.objects for select using(bucket_id='profile-photos');

-- Restrict security-definer RPCs to authenticated users.
revoke execute on function spend_credits(text,int,text) from public, anon;
revoke execute on function get_or_create_referral_code() from public, anon;
revoke execute on function record_skip(uuid) from public, anon;
revoke execute on function rewind_last_swipe() from public, anon;
revoke execute on function my_matches() from public, anon;
revoke execute on function request_account_deletion() from public, anon;
