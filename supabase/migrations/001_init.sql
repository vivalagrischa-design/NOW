-- NOW – Schema, RLS und Serverlogik (Supabase / Postgres)
create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null, birth_date date not null check (birth_date <= current_date - interval '18 years'),
  gender text, looking_for text default 'single', is_couple boolean default false,
  bio text, vibes text[] default '{}', verified boolean default false,
  incognito boolean default false, home_city text, created_at timestamptz default now()
);
create table profile_photos (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles on delete cascade,
  path text not null, position int default 0, moderation text default 'pending'
);
create table intents (user_id uuid references profiles on delete cascade, intent text not null, primary key (user_id, intent));
create table availability_slots (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade,
  city text not null, lat double precision, lng double precision,
  starts_at timestamptz not null, ends_at timestamptz not null check (ends_at > starts_at),
  active boolean not null default true, created_at timestamptz default now()
);
create index on availability_slots using gist (tstzrange(starts_at, ends_at));
create table likes (liker uuid references profiles on delete cascade, liked uuid references profiles on delete cascade,
  slot_id uuid references availability_slots on delete set null, created_at timestamptz default now(), primary key (liker, liked));
create table matches (id uuid primary key default gen_random_uuid(), user_a uuid not null references profiles, user_b uuid not null references profiles,
  created_at timestamptz default now(), unique (user_a, user_b), check (user_a < user_b));
create table favorites (user_id uuid references profiles on delete cascade, match_id uuid references matches on delete cascade, primary key (user_id, match_id));
create table conversations (id uuid primary key default gen_random_uuid(), match_id uuid unique references matches on delete cascade, created_at timestamptz default now());
create table messages (id uuid primary key default gen_random_uuid(), conversation_id uuid references conversations on delete cascade,
  sender uuid references profiles, body text not null, created_at timestamptz default now(), read_at timestamptz);
create table subscriptions (user_id uuid primary key references profiles on delete cascade, plan text default 'now_plus', provider text, status text, current_period_end timestamptz);
create table credit_wallets (user_id uuid primary key references profiles on delete cascade, balance int not null default 0 check (balance >= 0));
create table credit_ledger (id bigserial primary key, user_id uuid references profiles, delta int not null, reason text not null, ref text, created_at timestamptz default now());
create table referrals (id uuid primary key default gen_random_uuid(), inviter uuid references profiles, code text unique not null,
  invitee uuid unique references profiles, status text default 'open', rewarded_at timestamptz, created_at timestamptz default now());
create table reports_blocks (id bigserial primary key, reporter uuid references profiles, target uuid references profiles, kind text check (kind in ('report','block')), reason text, created_at timestamptz default now());
create table notifications (id bigserial primary key, user_id uuid references profiles, kind text, payload jsonb, sent_at timestamptz, created_at timestamptz default now());

-- Hilfsfunktionen -----------------------------------------------------------
create or replace function is_premium(u uuid) returns boolean language sql stable as $$
  select exists (select 1 from subscriptions where user_id = u and status = 'active' and current_period_end > now()) $$;

create or replace function active_slot_count(u uuid) returns int language sql stable as $$
  select count(*)::int from availability_slots where user_id = u and active and ends_at > now() $$;

-- Slot-Limit: Free = 1, NOW+ = 5 (serverseitig erzwungen)
create or replace function enforce_slot_limit() returns trigger language plpgsql as $$
begin
  if new.active and new.ends_at > now() and
     (select count(*) from availability_slots where user_id = new.user_id and active and ends_at > now() and id <> new.id)
       >= case when is_premium(new.user_id) then 5 else 1 end
  then raise exception 'slot_limit_reached'; end if;
  return new;
end $$;
create trigger trg_slot_limit before insert or update on availability_slots for each row execute function enforce_slot_limit();

-- Discovery: Availability Gate + Zeitüberschneidung + Distanz + Blocks --------
create or replace function discover(max_km int default 25, limit_n int default 20)
returns table (user_id uuid, display_name text, overlap_minutes int, city text, slot_id uuid, vibes text[], verified boolean)
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if active_slot_count(me) = 0 then return; end if;          -- GATE: ohne aktiven Slot keine Profile
  return query
  select p.id, p.display_name,
         (extract(epoch from (least(s2.ends_at, s1.ends_at) - greatest(s2.starts_at, s1.starts_at))) / 60)::int as ov,
         s2.city, s2.id, p.vibes, p.verified
  from availability_slots s1
  join availability_slots s2 on s2.user_id <> me and s2.active and s2.ends_at > now()
       and tstzrange(s1.starts_at, s1.ends_at) && tstzrange(s2.starts_at, s2.ends_at)
       and lower(s1.city) = lower(s2.city)
  join profiles p on p.id = s2.user_id
  where s1.user_id = me and s1.active and s1.ends_at > now()
    and not p.incognito
    and not exists (select 1 from likes l where l.liker = me and l.liked = p.id)
    and not exists (select 1 from reports_blocks b where (b.reporter = me and b.target = p.id) or (b.reporter = p.id and b.target = me))
  order by ov desc limit limit_n;
end $$;

-- Like -> atomares Match + Conversation --------------------------------------
create or replace function like_user(target uuid, slot uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); mid uuid; cid uuid;
begin
  if active_slot_count(me) = 0 then raise exception 'availability_gate'; end if;
  insert into likes(liker, liked, slot_id) values (me, target, slot) on conflict do nothing;
  if exists (select 1 from likes where liker = target and liked = me) then
    insert into matches(user_a, user_b) values (least(me, target), greatest(me, target)) on conflict do nothing returning id into mid;
    if mid is null then select id into mid from matches where user_a = least(me, target) and user_b = greatest(me, target); end if;
    insert into conversations(match_id) values (mid) on conflict do nothing;
    return mid;
  end if;
  return null;
end $$;

-- Credits: nur über Ledger, nur serverseitig ---------------------------------
create or replace function add_credits(u uuid, amount int, why text, r text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into credit_ledger(user_id, delta, reason, ref) values (u, amount, why, r);
  insert into credit_wallets(user_id, balance) values (u, amount)
    on conflict (user_id) do update set balance = credit_wallets.balance + amount;
end $$;
revoke execute on function add_credits from public, anon, authenticated;

-- Referral: Reward erst nach echter Registrierung, einmalig pro neuer Person ---
create or replace function redeem_referral(invite_code text) returns void
language plpgsql security definer set search_path = public as $$
declare r referrals; me uuid := auth.uid();
begin
  select * into r from referrals where code = invite_code and invitee is null for update;
  if not found or r.inviter = me then raise exception 'invalid_referral'; end if;
  update referrals set invitee = me, status = 'rewarded', rewarded_at = now() where id = r.id;
  perform add_credits(r.inviter, 3, 'referral_inviter', r.id::text);
  perform add_credits(me, 3, 'referral_invitee', r.id::text);
end $$;

-- RLS --------------------------------------------------------------------------
alter table profiles enable row level security; alter table profile_photos enable row level security;
alter table intents enable row level security; alter table availability_slots enable row level security;
alter table likes enable row level security; alter table matches enable row level security;
alter table favorites enable row level security; alter table conversations enable row level security;
alter table messages enable row level security; alter table subscriptions enable row level security;
alter table credit_wallets enable row level security; alter table credit_ledger enable row level security;
alter table referrals enable row level security; alter table reports_blocks enable row level security;
alter table notifications enable row level security;

create policy "own profile rw" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "matched profiles read" on profiles for select using (exists (select 1 from matches m where auth.uid() in (m.user_a, m.user_b) and profiles.id in (m.user_a, m.user_b)));
create policy "own photos" on profile_photos for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own intents" on intents for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own slots" on availability_slots for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own likes read" on likes for select using (liker = auth.uid());   -- Schreiben nur via like_user()
create policy "own matches" on matches for select using (auth.uid() in (user_a, user_b));
create policy "own favorites" on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own conversations" on conversations for select using (exists (select 1 from matches m where m.id = match_id and auth.uid() in (m.user_a, m.user_b)));
create policy "read messages" on messages for select using (exists (select 1 from conversations c join matches m on m.id = c.match_id where c.id = conversation_id and auth.uid() in (m.user_a, m.user_b)));
create policy "send messages" on messages for insert with check (sender = auth.uid() and exists (select 1 from conversations c join matches m on m.id = c.match_id where c.id = conversation_id and auth.uid() in (m.user_a, m.user_b)));
create policy "own sub read" on subscriptions for select using (user_id = auth.uid());
create policy "own wallet read" on credit_wallets for select using (user_id = auth.uid());
create policy "own ledger read" on credit_ledger for select using (user_id = auth.uid());
create policy "own referrals read" on referrals for select using (inviter = auth.uid() or invitee = auth.uid());
create policy "report/block" on reports_blocks for insert with check (reporter = auth.uid());
create policy "own notifications" on notifications for select using (user_id = auth.uid());

alter publication supabase_realtime add table messages;
