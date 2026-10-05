import { supabase as sb } from './supabase';
const p2 = (n) => String(n).padStart(2, '0');
const hm = (d) => p2(d.getHours()) + ':' + p2(d.getMinutes());
const ymd = (d) => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
const range = (d, s, e) => { const a = new Date(`${d}T${s}:00`); const b = new Date(`${d}T${e === '24:00' ? '00:00' : e}:00`); if (e === '24:00' || b <= a) b.setDate(b.getDate() + 1); return [a.toISOString(), b.toISOString()]; };
const slotOut = (r) => { const a = new Date(r.starts_at), b = new Date(r.ends_at); return { id: r.id, city: r.city, date: ymd(a), start: hm(a), end: hm(b), active: r.active }; };
const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const msg = (r, uid) => ({ id: r.id, me: r.sender === uid, text: r.body, t: hm(new Date(r.created_at)) });
const uidOf = async () => { const { data } = await sb.auth.getSession(); if (!data.session) throw new Error('Nicht eingeloggt'); return data.session.user.id; };

export async function session() { const { data } = await sb.auth.getSession(); return data.session ? data.session.user.id : null; }
export async function signUp(email, password, name, birth) {
  return ok(await sb.auth.signUp({ email, password, options: { data: { display_name: name, birth_date: birth } } }));
}
export async function signIn(email, password) { return ok(await sb.auth.signInWithPassword({ email, password })); }
export const signOut = () => sb.auth.signOut();

export async function loadSlots() { return ok(await sb.from('availability_slots').select('*').order('starts_at')).filter((r) => new Date(r.ends_at) > new Date() || true).map(slotOut); }
export async function saveSlot(s, isNew) {
  const uid = await uidOf(); const [a, b] = range(s.date, s.start, s.end);
  const row = { user_id: uid, city: s.city, starts_at: a, ends_at: b, active: s.active };
  const q = isNew ? sb.from('availability_slots').insert(row).select().single() : sb.from('availability_slots').update(row).eq('id', s.id).select().single();
  return slotOut(ok(await q));
}
export async function deleteSlot(id) { ok(await sb.from('availability_slots').delete().eq('id', id)); }

export async function discover(maxKm = 25) {
  return (ok(await sb.rpc('discover', { max_km: maxKm })) || []).map((r) => {
    const a = new Date(r.starts_at), b = new Date(r.ends_at);
    return { id: r.user_id, name: r.display_name, age: r.age, bio: '', city: r.city, dist: 0, date: ymd(a), start: hm(a), end: hm(b), vibes: r.vibes || [], single: true, verified: r.verified, ov: r.overlap_minutes, slot: r.slot_id };
  });
}
export async function like(target, slot) { return ok(await sb.rpc('like_user', { target, slot })); }

export async function loadMatches() {
  const uid = await uidOf();
  const ms = ok(await sb.from('matches').select('id,user_a,user_b').order('created_at'));
  const ids = ms.map((m) => (m.user_a === uid ? m.user_b : m.user_a));
  const ps = ids.length ? ok(await sb.from('profiles').select('id,display_name,birth_date,bio,vibes,verified').in('id', ids)) : [];
  const people = {};
  ps.forEach((p) => { people[p.id] = { id: p.id, name: p.display_name, age: new Date().getFullYear() - +p.birth_date.slice(0, 4), city: '', dist: 0, start: '', end: '', vibes: p.vibes || [], bio: p.bio || '', verified: p.verified, single: true }; });
  return { ids, people };
}
export async function loadMessages(personId) {
  const uid = await uidOf(); const [x, y] = [uid, personId].sort();
  const m = ok(await sb.from('matches').select('id').eq('user_a', x).eq('user_b', y).maybeSingle());
  if (!m) throw new Error('Match nicht gefunden');
  const c = ok(await sb.from('conversations').select('id').eq('match_id', m.id).maybeSingle());
  if (!c) throw new Error('Chat nicht gefunden');
  const rows = ok(await sb.from('messages').select('*').eq('conversation_id', c.id).order('created_at'));
  return { cid: c.id, uid, msgs: rows.map((r) => msg(r, uid)) };
}
export async function sendMessage(cid, uid, body) { ok(await sb.from('messages').insert({ conversation_id: cid, sender: uid, body })); }
export function subscribe(cid, uid, cb) {
  const ch = sb.channel('c-' + cid).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${cid}` }, (e) => cb(msg(e.new, uid))).subscribe();
  return () => sb.removeChannel(ch);
}
