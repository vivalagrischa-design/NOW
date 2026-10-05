-- Profil automatisch beim Signup anlegen (Name + Geburtsdatum aus user_metadata; unter 18 => Signup scheitert)
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, birth_date)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'NOW User'), (new.raw_user_meta_data->>'birth_date')::date);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Discovery mit Alter und Zeitfenster (für die App-Karten)
drop function if exists discover(int, int);
create or replace function discover(max_km int default 25, limit_n int default 20)
returns table (user_id uuid, display_name text, age int, overlap_minutes int, city text, slot_id uuid, starts_at timestamptz, ends_at timestamptz, vibes text[], verified boolean)
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if active_slot_count(me) = 0 then return; end if;
  return query
  select p.id, p.display_name, extract(year from age(p.birth_date))::int,
         (extract(epoch from (least(s2.ends_at, s1.ends_at) - greatest(s2.starts_at, s1.starts_at))) / 60)::int as ov,
         s2.city, s2.id, s2.starts_at, s2.ends_at, p.vibes, p.verified
  from availability_slots s1
  join availability_slots s2 on s2.user_id <> me and s2.active and s2.ends_at > now()
       and tstzrange(s1.starts_at, s1.ends_at) && tstzrange(s2.starts_at, s2.ends_at) and lower(s1.city) = lower(s2.city)
  join profiles p on p.id = s2.user_id
  where s1.user_id = me and s1.active and s1.ends_at > now() and not p.incognito
    and not exists (select 1 from likes l where l.liker = me and l.liked = p.id)
    and not exists (select 1 from reports_blocks b where (b.reporter = me and b.target = p.id) or (b.reporter = p.id and b.target = me))
  order by ov desc limit limit_n;
end $$;
-- Discovery darf nur eingeloggte Nutzer bedienen; Match-Profile sind per RLS lesbar
revoke execute on function discover from anon;
