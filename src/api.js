import { supabase } from './supabase';
const pad = (n) => String(n).padStart(2, '0');
const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const ts = (date, t, add = 0) => { const d = new Date(date + 'T00:00:00'); d.setMinutes(mins(t) + add * 1440); return d.toISOString(); };
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const slotFromRow = (r) => ({ id: r.id, city: r.city, date: ymd(new Date(r.starts_at)), start: hm(new Date(r.starts_at)), end: hm(new Date(r.ends_at)), active: r.active });
const me = async () => (await supabase.auth.getUser()).data.user;
const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

export const session = async () => (await supabase.auth.getSession()).data.session;
export const signIn = async (email, password) => ok(await supabase.auth.signInWithPassword({ email, password }));
export const signUp = async (email, password, name, birth) =>
  ok(await supabase.auth.signUp({ email, password, options: { data: { display_name: name, birth_date: birth } } }));
export const signOut = () => supabase.auth.signOut();

export const loadSlots = async () => ok(await supabase.from('availability_slots').select('*').order('starts_at')).map(slotFromRow);
export const saveSlot = async (sl, isNew) => {
  const u = await me();
  const row = { city: sl.city, starts_at: ts(sl.date, sl.start), ends_at: ts(sl.date, sl.end, mins(sl.end) <= mins(sl.start) ? 1 : 0), active: sl.active };
  const q = isNew ? supabase.from('availability_slots').insert({ ...row, user_id: u.id }) : supabase.from('availability_slots').update(row).eq('id', sl.id);
  return slotFromRow(ok(await q.select().single()));
};
export const deleteSlot = async (id) => ok(await supabase.from('availability_slots').delete().eq('id', id));

export const discover = async (km) =>
  ok(await supabase.rpc('discover', { max_km: km, limit_n: 20 })).map((r) => {
    const s = new Date(r.starts_at), e = new Date(r.ends_at);
    return { id: r.user_id, name: r.display_name, age: r.age, city: r.city, dist: null, date: ymd(s), start: hm(s), end: hm(e), ov: r.overlap_minutes, vibes: r.vibes || [], verified: r.verified, single: true, bio: '', slot: r.slot_id };
  });
export const like = async (target, slot) => ok(await supabase.rpc('like_user', { target, slot }));

export const loadMatches = async () => {
  const u = await me();
  const ms = ok(await supabase.from('matches').select('user_a,user_b'));
  const ids = ms.map((m) => (m.user_a === u.id ? m.user_b : m.user_a));
  const people = {};
  if (ids.length) ok(await supabase.from('profiles').select('id,display_name,bio,vibes,verified').in('id', ids))
    .forEach((p) => (people[p.id] = { id: p.id, name: p.display_name, age: '', bio: p.bio || '', vibes: p.vibes || [], verified: p.verified, city: '', dist: null, start: '', end: '', single: true }));
  return { ids, people };
};
const conv = async (peer) => {
  const u = await me(); const [a, b] = [u.id, peer].sort();
  const m = ok(await supabase.from('matches').select('id').eq('user_a', a).eq('user_b', b).single());
  const c = ok(await supabase.from('conversations').select('id').eq('match_id', m.id).single());
  return { cid: c.id, uid: u.id };
};
const msgOut = (m, uid) => ({ id: m.id, me: m.sender === uid, text: m.body, t: new Date(m.created_at).toTimeString().slice(0, 5) });
export const loadMessages = async (peer) => {
  const { cid, uid } = await conv(peer);
  const rows = ok(await supabase.from('messages').select('*').eq('conversation_id', cid).order('created_at'));
  return { cid, uid, msgs: rows.map((m) => msgOut(m, uid)) };
};
export const sendMessage = async (cid, uid, body) => ok(await supabase.from('messages').insert({ conversation_id: cid, sender: uid, body }));
export const subscribe = (cid, uid, cb) => {
  const ch = supabase.channel('chat-' + cid).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${cid}` }, (p) => cb(msgOut(p.new, uid))).subscribe();
  return () => supabase.removeChannel(ch);
};
