import { supabase, DEMO } from './supabase';

const requireLive = () => {
  if (DEMO || !supabase) throw new Error('Supabase ist nicht konfiguriert. .env anlegen und Development Build neu starten.');
};
const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const sessionUser = async () => {
  requireLive();
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Nicht eingeloggt');
  return data.session.user;
};

export const isLive = !DEMO;

export async function currentSession() {
  if (DEMO || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

export async function signInEmail(email, password) {
  requireLive();
  return ok(await supabase.auth.signInWithPassword({ email, password }));
}

export async function signUpEmail({ email, password, displayName, birthDate, referralCode }) {
  requireLive();
  const res = ok(await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName, birth_date: birthDate, referral_code: referralCode || null } }
  }));
  return res;
}

export async function signInOAuth(provider) {
  requireLive();
  return ok(await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: 'now://auth/callback' } }));
}

export async function requestPhoneOtp(phone) {
  requireLive();
  return ok(await supabase.auth.signInWithOtp({ phone }));
}

export async function verifyPhoneOtp(phone, token) {
  requireLive();
  return ok(await supabase.auth.verifyOtp({ phone, token, type: 'sms' }));
}

export async function signOut() {
  if (DEMO || !supabase) return;
  return ok(await supabase.auth.signOut());
}

export async function loadBootstrap() {
  requireLive();
  const user = await sessionUser();
  const [profile, slots, wallet, sub, referrals] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('availability_slots').select('*').order('starts_at'),
    supabase.from('credit_wallets').select('balance').eq('user_id', user.id).maybeSingle(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('referrals').select('*').eq('inviter', user.id).order('created_at', { ascending: false })
  ]);
  const liveSub = sub.data && sub.data.status === 'active' && (!sub.data.current_period_end || new Date(sub.data.current_period_end) > new Date());
  return {
    user,
    profile: profile.data,
    slots: (slots.data || []).map(slotFromDb),
    credits: wallet.data?.balance || 0,
    premium: !!liveSub,
    subscription: sub.data || null,
    referrals: referrals.data || []
  };
}

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const slotFromDb = (r) => {
  const a = new Date(r.starts_at), b = new Date(r.ends_at);
  return { id:r.id, city:r.city, date:ymd(a), start:hm(a), end:hm(b), active:r.active, startsAt:r.starts_at, endsAt:r.ends_at };
};
const range = (s) => {
  const date = s.dateISO || s.date;
  const start = s.start || '20:00';
  const end = s.end || '24:00';
  const a = new Date(`${date}T${start}:00`);
  const normalizedEnd = end === '24:00' ? '00:00' : end;
  const b = new Date(`${date}T${normalizedEnd}:00`);
  if (end === '24:00' || b <= a) b.setDate(b.getDate()+1);
  return [a.toISOString(), b.toISOString()];
};

export async function saveAvailability(slot) {
  requireLive();
  const user = await sessionUser();
  const [starts_at, ends_at] = range(slot);
  const row = { user_id:user.id, city:slot.city, starts_at, ends_at, active:slot.active !== false };
  const q = slot.id
    ? supabase.from('availability_slots').update(row).eq('id', slot.id).select().single()
    : supabase.from('availability_slots').insert(row).select().single();
  return slotFromDb(ok(await q));
}

export async function setSlotActive(id, active) {
  requireLive();
  return slotFromDb(ok(await supabase.from('availability_slots').update({ active }).eq('id', id).select().single()));
}

export async function deleteAvailability(id) {
  requireLive();
  ok(await supabase.from('availability_slots').delete().eq('id', id));
}

export async function saveIntents(intents=[]) {
  requireLive();
  const user = await sessionUser();
  ok(await supabase.from('intents').delete().eq('user_id', user.id));
  if (intents.length) ok(await supabase.from('intents').insert(intents.map(intent => ({ user_id:user.id, intent }))));
}

export async function discover(maxKm=25) {
  requireLive();
  const rows = ok(await supabase.rpc('discover', { max_km:maxKm, limit_n:40 })) || [];
  return rows.map(r => {
    const url = r.photo_url ? supabase.storage.from('profile-photos').getPublicUrl(r.photo_url).data.publicUrl : null;
    return {
      id:r.user_id, name:r.display_name, age:r.age, city:r.city, dist:Number(r.distance_km || 0),
      slotId:r.slot_id, start:r.starts_at, end:r.ends_at, overlapMinutes:r.overlap_minutes,
      vibes:r.vibes || [], verified:!!r.verified, photoUrl:url, img:url ? { uri:url } : null, bio:r.bio || '',
      intentMatch:r.intent_match || null, likesYou:false
    };
  });
}


export async function recordSkip(targetId) {
  requireLive();
  return ok(await supabase.rpc('record_skip', { target:targetId }));
}
export async function likeUser(targetId, slotId=null) {
  requireLive();
  return ok(await supabase.rpc('like_user', { target:targetId, slot:slotId }));
}

export async function rewindLastLike() {
  requireLive();
  return ok(await supabase.rpc('rewind_last_swipe'));
}

export async function loadMatches() {
  requireLive();
  return ok(await supabase.rpc('my_matches')) || [];
}

export async function setFavorite(matchId, value=true) {
  requireLive();
  const user = await sessionUser();
  if (value) ok(await supabase.from('favorites').upsert({ user_id:user.id, match_id:matchId }));
  else ok(await supabase.from('favorites').delete().eq('user_id', user.id).eq('match_id', matchId));
}

export async function loadConversation(matchId) {
  requireLive();
  const c = ok(await supabase.from('conversations').select('id').eq('match_id', matchId).single());
  const rows = ok(await supabase.from('messages').select('*').eq('conversation_id', c.id).order('created_at')) || [];
  const user = await sessionUser();
  return { conversationId:c.id, messages:rows.map(r => ({ id:r.id, me:r.sender===user.id, text:r.body, time:r.created_at, readAt:r.read_at })) };
}

export async function sendMessage(conversationId, text) {
  requireLive();
  const user = await sessionUser();
  return ok(await supabase.from('messages').insert({ conversation_id:conversationId, sender:user.id, body:text }).select().single());
}

export function subscribeMessages(conversationId, onMessage) {
  if (DEMO || !supabase) return () => {};
  const ch = supabase.channel(`conversation-${conversationId}`)
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`conversation_id=eq.${conversationId}` }, payload => onMessage(payload.new))
    .subscribe();
  return () => supabase.removeChannel(ch);
}

export async function markConversationRead(conversationId) {
  requireLive();
  const user = await sessionUser();
  ok(await supabase.from('messages').update({ read_at:new Date().toISOString() }).eq('conversation_id', conversationId).neq('sender', user.id).is('read_at', null));
}

export async function blockUser(targetId) {
  requireLive();
  const user = await sessionUser();
  ok(await supabase.from('reports_blocks').insert({ reporter:user.id, target:targetId, kind:'block' }));
}

export async function reportUser(targetId, reason) {
  requireLive();
  const user = await sessionUser();
  ok(await supabase.from('reports_blocks').insert({ reporter:user.id, target:targetId, kind:'report', reason }));
}

export async function createReferralCode() {
  requireLive();
  return ok(await supabase.rpc('get_or_create_referral_code'));
}

export async function redeemReferral(code) {
  requireLive();
  return ok(await supabase.rpc('redeem_referral', { invite_code:code }));
}

export async function spendCredits(reason, amount, ref=null) {
  requireLive();
  return ok(await supabase.rpc('spend_credits', { why:reason, amount, r:ref }));
}

export async function uploadProfilePhoto(uri, position=0) {
  requireLive();
  const user = await sessionUser();
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = (uri.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
  const path = `${user.id}/${Date.now()}-${position}.${ext}`;
  ok(await supabase.storage.from('profile-photos').upload(path, blob, { contentType:blob.type || 'image/jpeg', upsert:false }));
  const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
  ok(await supabase.from('profile_photos').insert({ user_id:user.id, path, position, moderation:'pending' }));
  return { path, url:data.publicUrl };
}

export async function deleteAccount() {
  requireLive();
  return ok(await supabase.rpc('request_account_deletion'));
}
