import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity as T, ScrollView, TextInput, SafeAreaView, FlatList, Switch, Share, Alert, Image, ImageBackground, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons as I } from '@expo/vector-icons';
import { C } from './src/theme';
import { PEOPLE, overlap, expired, iso } from './src/mock';
import { DEMO } from './src/supabase';
import * as api from './src/api';
import { LinearGradient } from 'expo-linear-gradient';

const INTENTS = [['Now', 'Heute, sofort', 'flash'], ['Tonight', 'Später heute', 'time'], ['Weekend', 'Dieses Wochenende', 'moon'], ['Plan Ahead', 'Zukünftiges Datum', 'calendar'], ['Travel', 'In anderer Stadt', 'airplane']];
const hue = (s) => ['#C96F5F', '#B8836A', '#A5736B', '#C98F7A', '#9C6E66'][s.charCodeAt(0) % 5];

const Btn = ({ t, onPress, kind = 'main', style }) => (
  <T onPress={onPress} style={[{ paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 10 }, kind === 'main' && { backgroundColor: C.salmon }, kind === 'ghost' && { borderWidth: 1, borderColor: C.line }, kind === 'light' && { backgroundColor: C.text }, style]}>
    <Text style={{ fontWeight: '700', fontSize: 16, color: kind === 'main' || kind === 'light' ? C.onSalmon : C.text }}>{t}</Text>
  </T>
);
const Chip = ({ t, on, onPress }) => (
  <T onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginTop: 8, borderWidth: 1.5, borderColor: on ? C.strong : C.line, backgroundColor: on ? C.salmon : 'transparent' }}>
    <Text style={{ color: on ? C.onSalmon : C.text, fontWeight: '600' }}>{t}</Text>
  </T>
);
const Avatar = ({ name, img, size = 48 }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: hue(name), alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.light, overflow: 'hidden' }}>
    {img ? <Image source={img} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ color: C.onSalmon, fontWeight: '800', fontSize: size / 2.4 }}>{name[0]}</Text>}
  </View>
);
const H = ({ children }) => <Text style={{ color: C.text, fontSize: 28, fontWeight: '800', marginBottom: 6 }}>{children}</Text>;
const P = ({ children, style }) => <Text style={[{ color: C.dim, fontSize: 14 }, style]}>{children}</Text>;
const Top = ({ title, back, right }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
    {back && <T onPress={back}><I name="chevron-back" size={26} color={C.text} /></T>}
    <Text style={{ flex: 1, color: C.text, fontSize: 20, fontWeight: '700', marginLeft: back ? 6 : 0 }}>{title}</Text>{right}
  </View>
);

const Ctx = React.createContext(null);
const Nav = () => {
  const { s, set } = React.useContext(Ctx);
  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: C.line, paddingVertical: 10, backgroundColor: C.bg }}>
      {[['discover', 'flame', 'Discover'], ['matches', 'heart', 'Matches'], ['chats', 'chatbubble', 'Chats'], ['profile', 'person', 'Profile']].map(([k, ic, l]) => (
        <T key={k} style={{ flex: 1, alignItems: 'center' }} onPress={() => set({ tab: k, screen: 'main' })}>
          <I name={ic} size={22} color={s.tab === k ? C.salmon : C.dim} /><Text style={{ fontSize: 11, color: s.tab === k ? C.salmon : C.dim, marginTop: 2 }}>{l}</Text>
        </T>))}
    </View>
  );
};
const Wrap = ({ children, nav }) => (
  <SafeAreaView style={{ flex: 1, backgroundColor: '#070708' }}><StatusBar style="light" />
    <View style={{ flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: C.bg, borderLeftWidth: Platform.OS === 'web' ? 1 : 0, borderRightWidth: Platform.OS === 'web' ? 1 : 0, borderColor: C.line, boxShadow: Platform.OS === 'web' ? '0 0 70px rgba(0,0,0,.55)' : undefined }}>
      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: Platform.OS === 'web' ? 18 : 10 }}>{children}</View>
      {nav && <Nav />}
    </View>
  </SafeAreaView>);

export default function App() {
  const [s, setS] = useState({ screen: 'auth', tab: 'discover', intents: ['Now'], slots: [], premium: false, credits: 5, matches: [], seen: [], chats: {}, peer: null, edit: null, incognito: false, fav: [], mTab: 'All', f: { dist: 25, amin: 18, amax: 50, looking: 'Single', vibe: [] } });
  const set = (p) => setS((o) => ({ ...o, ...p }));
  return <Ctx.Provider value={{ s, set }}><Inner /></Ctx.Provider>;
}

function Inner() {
  const { s, set } = React.useContext(Ctx);
  const go = (screen) => set({ screen });
  const active = s.slots.filter((x) => x.active && !expired(x));
  const limit = s.premium ? 5 : 1;
  const afterLogin = async () => {
    try {
      const [slots, m] = await Promise.all([api.loadSlots(), api.loadMatches()]);
      set({ authed: true, slots, matches: m.ids, people: m.people, chats: Object.fromEntries(m.ids.map((i) => [i, []])), screen: slots.length ? 'main' : 'intent', tab: 'discover' });
    } catch (e) { Alert.alert('Fehler', e.message); }
  };
  useEffect(() => { if (!DEMO) api.session().then((x) => x && afterLogin()); }, []);
  useEffect(() => { if (!DEMO && s.authed) api.discover(s.f.dist).then((r) => set({ remote: r })).catch(() => {}); }, [s.slots, s.authed, s.f.dist]);

  const mockDeck = useMemo(() => PEOPLE.map((p) => ({ ...p, ov: Math.max(0, ...active.map((a) => overlap(a, p))) }))
    .filter((p) => p.ov > 0 && !s.seen.includes(p.id) && p.dist <= s.f.dist && p.age >= s.f.amin && p.age <= s.f.amax && (s.f.looking === 'Single' ? p.single : !p.single))
    .sort((a, b) => b.ov - a.ov || a.dist - b.dist), [s.slots, s.seen, s.f]);
  const deck = DEMO ? mockDeck : (s.remote || []).filter((p) => !s.seen.includes(p.id));

  const swipe = async (like, p) => {
    const seen = [...s.seen, p.id];
    if (!DEMO) {
      if (!like) return set({ seen });
      try {
        const mid = await api.like(p.id, p.slot);
        if (mid) set({ seen, matches: [...s.matches, p.id], chats: { ...s.chats, [p.id]: [] }, people: { ...s.people, [p.id]: p }, peer: p, screen: 'match' });
        else set({ seen });
      } catch (e) { Alert.alert('Fehler', e.message); }
      return;
    }
    if (like && p.likesYou) { // Demo: serverseitig würde like_user() das Match atomar erzeugen
      set({ seen, matches: [...s.matches, p.id], chats: { ...s.chats, [p.id]: [{ me: false, text: 'Hey 😊 Bist du noch frei?', t: '20:14' }] }, peer: p, screen: 'match' });
    } else set({ seen });
  };
  const saveSlot = async (sl) => {
    const isNew = !s.slots.find((x) => x.id === sl.id);
    if (isNew && sl.active && active.length >= limit) return Alert.alert('Slot-Limit', s.premium ? 'Maximal 5 aktive Slots.' : 'Free: 1 aktiver Slot. Mit NOW+ bis zu 5.', [{ text: 'NOW+ ansehen', onPress: () => go('premium') }, { text: 'OK' }]);
    if (!DEMO) { try { sl = await api.saveSlot(sl, isNew); } catch (e) { return Alert.alert('Slot', e.message.includes('slot_limit') ? 'Slot-Limit erreicht.' : e.message); } }
    set({ slots: isNew ? [...s.slots, sl] : s.slots.map((x) => (x.id === sl.id ? sl : x)), screen: s.slots.length || !isNew ? 'slots' : 'main', tab: 'discover' });
  };
  const person = (id) => PEOPLE.find((p) => p.id === id) || (s.people || {})[id] || { name: '?', age: '' };
  const sc = s.screen;

  if (sc === 'auth') return <AuthForm onDone={afterLogin} onDemo={() => go('intent')} />;

  // 2 INTENT
  if (sc === 'intent') return (
    <Wrap><H>Was suchst du?</H><P>Wähle eine oder mehrere Absichten.</P>
      <ScrollView style={{ marginTop: 14 }}>{INTENTS.map(([k, sub, ic]) => { const on = s.intents.includes(k); return (
        <T key={k} onPress={() => set({ intents: on ? s.intents.filter((x) => x !== k) : [...s.intents, k] })} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, marginBottom: 10, backgroundColor: on ? '#3A211D' : C.card, borderWidth: 1.5, borderColor: on ? C.salmon : C.card }}>
          <I name={on ? 'checkmark-circle' : ic} size={24} color={on ? C.salmon : C.dim} />
          <View style={{ marginLeft: 14 }}><Text style={{ color: C.text, fontWeight: '700', fontSize: 16 }}>{k}</Text><P>{sub}</P></View></T>); })}</ScrollView>
      <Btn t="Weiter" onPress={() => set({ screen: 'editSlot', edit: { id: 'n' + Date.now(), city: 'Zürich', date: iso(0), start: '20:00', end: '24:00', active: true } })} />
    </Wrap>);

  // 3 / 9 SLOT EDITOR
  if (sc === 'editSlot') { const e = s.edit; const up = (k, v) => set({ edit: { ...e, [k]: v } }); return (
    <Wrap><Top title="Wann bist du frei?" back={() => go(s.slots.length ? 'slots' : 'intent')} />
      <P>Lege mindestens einen echten Slot an, sonst bleibt Discovery gesperrt.</P>
      {[['Ort', 'city'], ['Datum (JJJJ-MM-TT)', 'date'], ['Start (HH:MM)', 'start'], ['Ende (HH:MM)', 'end']].map(([l, k]) => (
        <View key={k}><P style={{ marginTop: 14 }}>{l}</P><TextInput value={e[k]} onChangeText={(v) => up(k, v)} style={inp} placeholderTextColor={C.dim} /></View>))}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}><Text style={{ flex: 1, color: C.text }}>Aktiv</Text><Switch value={e.active} onValueChange={(v) => up('active', v)} trackColor={{ true: C.salmon }} /></View>
      <P style={{ marginTop: 12 }}>Dein Slot bleibt aktiv, bis er abläuft oder du ihn änderst. Zukünftige Orte (z. B. Barcelona) legst du einfach als normalen Slot an.</P>
      <Btn t="Save availability" onPress={() => saveSlot(e)} />
    </Wrap>); }

  // 7 / 9 MY SLOTS
  if (sc === 'slots') return (
    <Wrap><Top title="My Availability" back={() => set({ screen: 'main', tab: 'discover' })} /><P>{active.length}/{limit} aktive Slots {s.premium ? '(NOW+)' : '(Free)'}</P>
      <ScrollView>{s.slots.map((x) => (
        <View key={x.id} style={{ backgroundColor: C.card, borderRadius: 14, padding: 14, marginTop: 12, opacity: expired(x) ? 0.5 : 1 }}>
          <Text style={{ color: C.text, fontWeight: '700' }}>{x.date} · {x.start}–{x.end}</Text><P>{x.city} · {expired(x) ? 'abgelaufen' : x.active ? 'aktiv' : 'pausiert'}</P>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <Chip t="Edit" onPress={() => set({ edit: x, screen: 'editSlot' })} />
            <Chip t={x.active ? 'Pause' : 'Resume'} onPress={() => saveSlot({ ...x, active: !x.active })} />
            <Chip t="Löschen" onPress={() => { if (!DEMO) api.deleteSlot(x.id); set({ slots: s.slots.filter((y) => y.id !== x.id) }); }} /></View>
        </View>))}</ScrollView>
      <Btn t="+ Add another slot" kind="ghost" onPress={() => set({ screen: 'editSlot', edit: { id: 'n' + Date.now(), city: 'Zürich', date: iso(1), start: '20:00', end: '24:00', active: true } })} />
    </Wrap>);

  // 5 MATCH
  if (sc === 'match') return (
    <Wrap><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: C.text, fontSize: 36, fontWeight: '900' }}>It's a Match!</Text>
      <P style={{ textAlign: 'center', marginVertical: 12, color: C.text }}>Du und {s.peer.name} seid beide frei – {s.peer.date === iso(0) ? 'heute' : s.peer.date} {s.peer.start}–{s.peer.end} in {s.peer.city}.</P>
      <View style={{ flexDirection: 'row' }}><Avatar name="Du" size={100} /><View style={{ width: 16 }} /><Avatar name={s.peer.name} img={s.peer.img} size={100} /></View></View>
      <Btn t="Open Chat" onPress={() => set({ screen: 'chat' })} /><Btn t="Keep Swiping" kind="ghost" onPress={() => set({ screen: 'main', tab: 'discover' })} />
    </Wrap>);

  // 6 CHAT
  if (sc === 'chat') { const msgs = s.chats[s.peer.id] || []; return <ChatView s={s} set={set} msgs={msgs} Wrap={Wrap} />; }

  // 10 PREMIUM
  if (sc === 'premium') return (
    <Wrap><Top title="Get more out of NOW" back={() => set({ screen: 'main' })} />
      <ScrollView>
        <Text style={{ color: C.salmon, fontWeight: '800', fontSize: 18 }}>NOW+ · CHF 7.90 / Monat</Text>
        {['Bis zu 5 aktive Slots', 'Advanced Filters', 'Who liked me', 'Incognito Mode', 'Read Receipts', 'Rewind inklusive', 'Priority Support'].map((x) => <P key={x} style={{ color: C.text, marginTop: 8 }}>✓ {x}</P>)}
        <Btn t={s.premium ? 'NOW+ aktiv' : 'Upgrade to NOW+'} onPress={() => set({ premium: true })} />
        <Text style={{ color: C.salmon, fontWeight: '800', fontSize: 18, marginTop: 24 }}>Credits (einmalig) – Saldo: {s.credits}</Text>
        {[[5, '4.90'], [25, '19.90'], [50, '34.90']].map(([n, p]) => <Btn key={n} kind="ghost" t={`${n} Credits · CHF ${p}`} onPress={() => set({ credits: s.credits + n })} />)}
        <P style={{ marginTop: 14 }}>Slot Spotlight · Last-Minute Boost · Rewind · Extra visibility{'\n'}Demo: Käufe laufen lokal. Echte Käufe via Apple/Google IAP + Ledger (siehe README).</P>
      </ScrollView></Wrap>);

  // 11 FILTERS
  if (sc === 'filters') { const f = s.f; const sf = (p) => set({ f: { ...f, ...p } }); return (
    <Wrap><Top title="Filters" back={() => set({ screen: 'main' })} />
      <P>Distanz: {f.dist} km</P><View style={{ flexDirection: 'row' }}><Chip t="−5" onPress={() => sf({ dist: Math.max(5, f.dist - 5) })} /><Chip t="+5" onPress={() => sf({ dist: Math.min(100, f.dist + 5) })} /></View>
      <P style={{ marginTop: 18 }}>Alter: {f.amin}–{f.amax}</P><View style={{ flexDirection: 'row' }}><Chip t="Min −" onPress={() => sf({ amin: Math.max(18, f.amin - 1) })} /><Chip t="Min +" onPress={() => sf({ amin: Math.min(f.amax, f.amin + 1) })} /><Chip t="Max −" onPress={() => sf({ amax: Math.max(f.amin, f.amax - 1) })} /><Chip t="Max +" onPress={() => sf({ amax: f.amax + 1 })} /></View>
      <P style={{ marginTop: 18 }}>Looking for</P><View style={{ flexDirection: 'row' }}>{['Single', 'Couple'].map((x) => <Chip key={x} t={x} on={f.looking === x} onPress={() => sf({ looking: x })} />)}</View>
      <P style={{ marginTop: 18 }}>Vibe {s.premium ? '' : '(Advanced · NOW+)'}</P><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{['Casual', 'Fun', 'Kinky', 'Open-minded', 'Discrete'].map((x) => <Chip key={x} t={x} on={f.vibe.includes(x)} onPress={() => (s.premium ? sf({ vibe: f.vibe.includes(x) ? f.vibe.filter((y) => y !== x) : [...f.vibe, x] }) : go('premium'))} />)}</View>
      <Btn t="Done" onPress={() => set({ screen: 'main' })} /></Wrap>); }

  // 12 SETTINGS
  if (sc === 'settings') return (
    <Wrap><Top title="Settings" back={() => set({ screen: 'main' })} />
      {['Account', 'Profile', 'Privacy & Security', 'Notifications', 'Blocked Users', 'Help & Support'].map((x) => <View key={x} style={{ paddingVertical: 15, borderBottomWidth: 1, borderColor: C.line }}><Text style={{ color: C.text, fontSize: 16 }}>{x}</Text></View>)}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }}><Text style={{ flex: 1, color: C.text, fontSize: 16 }}>Incognito Mode (NOW+)</Text><Switch value={s.incognito} trackColor={{ true: C.salmon }} onValueChange={(v) => (s.premium ? set({ incognito: v }) : go('premium'))} /></View>
      <Btn t="Referral-Link teilen" kind="ghost" onPress={() => Share.share({ message: 'Komm zu NOW: https://now.app/invite/ABCD1234' })} />
      <Btn t="Log out" kind="ghost" onPress={async () => { if (!DEMO) await api.signOut(); set({ screen: 'auth', authed: false, slots: [], matches: [], chats: {}, seen: [] }); }} /></Wrap>);

  // PROFIL-DETAIL
  if (sc === 'detail') { const p = s.peer; return (
    <Wrap><Top title={`${p.name}, ${p.age}`} back={() => set({ screen: 'main' })} />
      <ImageBackground source={p.img} style={{ height: 360, marginHorizontal: -18, justifyContent: 'flex-end' }} resizeMode="cover"><LinearGradient colors={['transparent','rgba(13,13,15,.94)']} style={{ position:'absolute',left:0,right:0,top:0,bottom:0 }}/><View style={{ padding:18 }}><Text style={{ color:'#fff',fontSize:30,fontWeight:'900' }}>{p.name}, {p.age}</Text><Text style={{ color:'#F3ECEA',marginTop:4 }}>{p.city} · {p.dist} km</Text></View></ImageBackground>
      <View style={{ marginTop:18, backgroundColor:C.card, borderRadius:18, padding:16 }}><Text style={{ color:C.text,fontWeight:'800',fontSize:16 }}>About</Text><P style={{ marginTop:8, color: C.text }}>{p.bio}</P></View>
      <View style={{ marginTop:12, backgroundColor:C.card, borderRadius:18, padding:16 }}><Text style={{ color:C.text,fontWeight:'800',fontSize:16 }}>Availability</Text><P style={{ marginTop:8, color:C.salmon }}>Frei {p.start}–{p.end}</P></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{p.vibes.map((v) => <Chip key={v} t={v} />)}</View></Wrap>); }

  // MAIN TABS
  const gate = active.length === 0;
  return (
    <Wrap nav>
      {s.tab === 'discover' && (<>
        <Top title="Discover" right={<View style={{ flexDirection: 'row' }}><T onPress={() => go('slots')}><I name="calendar" size={24} color={C.salmon} style={{ marginRight: 16 }} /></T><T onPress={() => go('filters')}><I name="options" size={24} color={C.text} /></T></View>} />
        <View style={{ flexDirection: 'row' }}>{s.intents.map((x) => <Chip key={x} t={x} on />)}</View>
        {gate ? (<View style={{ flex: 1, justifyContent: 'center' }}>
          <I name="lock-closed" size={44} color={C.salmon} style={{ alignSelf: 'center' }} />
          <H>Erst Verfügbarkeit.</H><P>Ohne aktiven Slot gibt es keine Profile, kein Swipen und keine neuen Matches. Deine Chats bleiben offen.</P>
          <Btn t="Add availability" onPress={() => set({ screen: 'editSlot', edit: { id: 'n' + Date.now(), city: 'Zürich', date: iso(0), start: '20:00', end: '24:00', active: true } })} /></View>
        ) : deck.length === 0 ? (<View style={{ flex: 1, justifyContent: 'center' }}><H>Für diesen Slot gerade keine neuen Profile.</H><P>Du hast das Demo-Deck durchgesehen. Setze es zurück oder ändere Zeitfenster und Filter.</P><Btn t="Demo-Profile erneut anzeigen" onPress={() => set({ seen: [] })} /><Btn t="Availability ändern" kind="ghost" onPress={() => go('slots')} /></View>
        ) : (() => { const p = deck[0]; return (<View style={{ flex: 1 }}>
          <T activeOpacity={0.9} onPress={() => set({ peer: p, screen: 'detail' })} style={{ flex: 1, borderRadius: 28, overflow: 'hidden', marginTop: 10, minHeight: 470, borderWidth: 1, borderColor: C.line }}>
            <ImageBackground source={p.img} style={{ flex: 1, justifyContent: 'flex-end' }} resizeMode="cover">
              <LinearGradient colors={['transparent', 'rgba(13,13,15,0.18)', 'rgba(13,13,15,0.96)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
              <View style={{ position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ backgroundColor: 'rgba(20,20,22,.72)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>● Online now</Text></View>
                <View style={{ backgroundColor: 'rgba(20,20,22,.72)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>⌖ {p.dist} km</Text></View>
              </View>
              <View style={{ padding: 20 }}>
                <Text style={{ color: '#fff', fontSize: 31, fontWeight: '900' }}>{p.name}, {p.age} {p.verified && '✓'}</Text>
                <Text style={{ color: '#F3ECEA', marginTop: 4 }}>{p.city} · {p.single ? 'Single' : 'Paar'}</Text>
                <View style={{ alignSelf: 'flex-start', backgroundColor: C.salmon, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, marginTop: 10 }}><Text style={{ color: C.onSalmon, fontWeight: '900' }}>◷ Frei {p.date === iso(0) ? 'heute' : p.date} {p.start}–{p.end}</Text></View>
                <Text style={{ color: '#fff', marginTop: 10, fontSize: 14 }}>{p.vibes.join(' · ')}</Text>
              </View>
            </ImageBackground>
          </T>
          <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', paddingVertical: 14 }}>
            <Round ic="close" onPress={() => swipe(false, p)} /><Round ic="star" onPress={() => set({ fav: [...s.fav, p.id] }) || swipe(true, p)} /><Round ic="heart" big onPress={() => swipe(true, p)} /></View></View>); })()}
      </>)}
      {s.tab === 'matches' && (<><Top title="Matches" /><View style={{ flexDirection: 'row' }}>{['All', 'Favorites'].map((x) => <Chip key={x} t={x} on={s.mTab === x} onPress={() => set({ mTab: x })} />)}</View>
        <FlatList data={s.matches.filter((id) => s.mTab === 'All' || s.fav.includes(id))} keyExtractor={(x) => x} ListEmptyComponent={<P style={{ marginTop: 20 }}>Noch keine Matches. Swipe im Discover-Tab.</P>}
          renderItem={({ item }) => { const p = person(item); return <Row p={p} sub={p.start ? `Frei ${p.start}–${p.end} · ${p.city}` : 'Match'} star={s.fav.includes(p.id)} onPress={() => set({ peer: p, screen: 'chat' })} />; }} /></>)}
      {s.tab === 'chats' && (<><Top title="Chats" /><P style={{ marginBottom: 8 }}>Chat-History bleibt immer verfügbar – auch ohne aktiven Slot.</P>
        <FlatList data={Object.keys(s.chats)} keyExtractor={(x) => x} ListEmptyComponent={<P>Noch keine Chats.</P>}
          renderItem={({ item }) => { const p = person(item); const m = s.chats[item]; return <Row p={p} sub={(m[m.length - 1] || { text: 'Neuer Match – sag Hallo!' }).text} onPress={() => set({ peer: p, screen: 'chat' })} />; }} /></>)}
      {s.tab === 'profile' && (<ScrollView><Top title="Profile" right={<T onPress={() => go('settings')}><I name="settings" size={24} color={C.text} /></T>} />
        <View style={{ alignItems: 'center' }}><Avatar name="Du" size={110} /><Text style={{ color: C.text, fontSize: 24, fontWeight: '800', marginTop: 10 }}>Dein Profil</Text></View>
        <P style={{ marginVertical: 14 }}>Guthaben: {s.credits} Credits · {s.premium ? 'NOW+ aktiv' : 'Free'}</P>
        <Btn t="My Availability" onPress={() => go('slots')} /><Btn t="NOW+ / Credits" kind="ghost" onPress={() => go('premium')} /><Btn t="Freunde einladen" kind="ghost" onPress={() => Share.share({ message: 'Komm zu NOW: https://now.app/invite/ABCD1234' })} /></ScrollView>)}
    </Wrap>);
}

const inp = { backgroundColor: C.card, color: C.text, borderRadius: 12, padding: 14, marginTop: 8, fontSize: 16 };
const Round = ({ ic, onPress, big }) => (<T onPress={onPress} style={{ width: big ? 72 : 58, height: big ? 72 : 58, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: big ? C.salmon : C.card2, borderWidth: 1.5, borderColor: C.strong }}><I name={ic} size={28} color={big ? C.onSalmon : C.salmon} /></T>);
const Row = ({ p, sub, onPress, star }) => (<T onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}><Avatar name={p.name} img={p.img} /><View style={{ marginLeft: 12, flex: 1 }}><Text style={{ color: C.text, fontWeight: '700' }}>{p.name}, {p.age}</Text><P numberOfLines={1}>{sub}</P></View>{star && <I name="star" size={20} color={C.salmon} />}</T>);

function ChatView({ s, set, msgs, Wrap }) {
  const [t, setT] = useState(''); const [rm, setRm] = useState([]); const [cx, setCx] = useState(null); const id = s.peer.id;
  useEffect(() => {
    if (DEMO) return; let off;
    api.loadMessages(id).then(({ cid, uid, msgs: m }) => { setCx({ cid, uid }); setRm(m); off = api.subscribe(cid, uid, (n) => setRm((o) => (o.some((x) => x.id === n.id) ? o : [...o, n]))); }).catch((e) => Alert.alert('Chat', e.message));
    return () => off && off();
  }, [id]);
  const list = DEMO ? msgs : rm;
  const send = async () => {
    if (!t.trim()) return;
    if (DEMO) set({ chats: { ...s.chats, [id]: [...msgs, { me: true, text: t, t: new Date().toTimeString().slice(0, 5) }] } });
    else if (cx) try { await api.sendMessage(cx.cid, cx.uid, t); } catch (e) { return Alert.alert('Senden fehlgeschlagen', e.message); }
    setT('');
  };
  return (<Wrap><Top title={s.peer.name} back={() => set({ screen: 'main', tab: 'chats' })} />
    <ScrollView style={{ flex: 1 }}>{list.map((m, i) => (<View key={m.id || i} style={{ alignSelf: m.me ? 'flex-end' : 'flex-start', backgroundColor: m.me ? C.salmon : C.card, padding: 12, borderRadius: 18, marginBottom: 8, maxWidth: '80%' }}>
      <Text style={{ color: m.me ? C.onSalmon : C.text }}>{m.text}</Text><Text style={{ fontSize: 10, color: m.me ? C.onSalmon : C.dim, marginTop: 3 }}>{m.t}{m.me && s.premium ? ' · gelesen' : ''}</Text></View>))}</ScrollView>
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 14 }}><TextInput value={t} onChangeText={setT} placeholder="Type a message…" placeholderTextColor={C.dim} style={[inp, { flex: 1 }]} /><T onPress={send} style={{ marginLeft: 8 }}><I name="send" size={26} color={C.salmon} /></T></View></Wrap>);
}

function AuthForm({ onDone, onDemo }) {
  const [up, setUp] = useState(false); const [email, setE] = useState(''); const [pw, setPw] = useState(''); const [name, setN] = useState(''); const [bd, setB] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (DEMO) return onDemo(); setBusy(true);
    try {
      if (up) { const r = await api.signUp(email, pw, name, bd); if (!r.session) { Alert.alert('Fast geschafft', 'Bestätige deine E-Mail und logge dich dann ein.'); setUp(false); setBusy(false); return; } }
      else await api.signIn(email, pw);
      await onDone();
    } catch (e) { Alert.alert('Fehler', e.message); }
    setBusy(false);
  };
  const oauth = () => (DEMO ? onDemo() : Alert.alert('Apple/Google', 'Benötigt Developer-Konto und native Konfiguration – siehe README.'));
  return (<Wrap>
    <View style={{ flex: 1, justifyContent: 'center' }}><Text style={{ fontSize: 76, fontWeight: '900', color: C.salmon, letterSpacing: -2 }}>NOW</Text><P style={{ fontSize: 16, color: C.text }}>Real people. Real time. No endless browsing.</P></View>
    {up && <><TextInput value={name} onChangeText={setN} placeholder="Anzeigename" placeholderTextColor={C.dim} style={inp} /><TextInput value={bd} onChangeText={setB} placeholder="Geburtsdatum JJJJ-MM-TT (18+)" placeholderTextColor={C.dim} style={inp} /></>}
    <TextInput value={email} onChangeText={setE} placeholder="E-Mail" placeholderTextColor={C.dim} style={inp} autoCapitalize="none" keyboardType="email-address" />
    <TextInput value={pw} onChangeText={setPw} placeholder="Passwort" placeholderTextColor={C.dim} style={inp} secureTextEntry />
    <Btn t={busy ? '…' : up ? 'Create account' : 'Login'} onPress={submit} />
    <Btn t={up ? 'Ich habe schon einen Account' : 'Neu hier? Create account'} kind="ghost" onPress={() => setUp(!up)} />
    <Btn t="Continue with Apple" kind="light" onPress={oauth} /><Btn t="Continue with Google" kind="ghost" onPress={oauth} />
    <P style={{ textAlign: 'center', marginVertical: 14 }}>18+ only. Discreet. Safe. Real.{DEMO ? '  (Demo-Modus)' : ''}</P>
  </Wrap>);
}
