
import React, { useMemo, useState, useEffect } from 'react';
import {
  SafeAreaView, View, Text, TouchableOpacity, ScrollView, TextInput,
  Image, ImageBackground, Platform, StatusBar, Switch, Share, Alert, StyleSheet, Linking
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as backend from './src/backend';
import { registerPushToken } from './src/push';
import * as iap from './src/iap';
import { pickProfilePhoto } from './src/photoPicker';

const C = {
  bg:'#09090B', panel:'#141214', panel2:'#1D1819', line:'#382A2B',
  text:'#FFF9F7', muted:'#B7AAA8', salmon:'#FF8F7E', salmonStrong:'#FF725F',
  salmonSoft:'#4D2926', salmonPale:'#FFD4CC', green:'#69D6A4',
  gold:'#F2C78A', red:'#FF6658'
};

const IMG = {
  lena: require('./assets/lena.jpg'),
  sophie: require('./assets/sophie.jpg'),
  mia: require('./assets/mia.jpg'),
  nina: require('./assets/nina.jpg'),
  laura: require('./assets/laura.jpg')
};

const PEOPLE = [
  {id:'p1',name:'Lena',age:27,city:'Zürich',dist:3,img:IMG.lena,slot:'Today · 20:00–24:00',intent:'Now',vibes:['Casual','Open-minded'],bio:'Direkt, entspannt und spontan. Erst ein Drink, dann sehen wir weiter.',likesYou:true},
  {id:'p2',name:'Sophie',age:29,city:'Zürich',dist:5,img:IMG.sophie,slot:'Tonight · 19:00–23:00',intent:'Tonight',vibes:['Fun','Tantra'],bio:'Gute Gespräche, echte Chemie und keine endlosen Chats.',likesYou:true},
  {id:'p3',name:'Mia',age:28,city:'Zürich',dist:7,img:IMG.mia,slot:'Friday · 20:00–02:00',intent:'Weekend',vibes:['Casual','Travel'],bio:'Dieses Wochenende frei. Offen, respektvoll und unkompliziert.',likesYou:false},
  {id:'p4',name:'Nina',age:26,city:'Zürich',dist:2,img:IMG.nina,slot:'Today · 18:00–22:00',intent:'Now',vibes:['Casual','Chat'],bio:'Heute spontan Zeit. Wenn es passt, passt es.',likesYou:true},
  {id:'p5',name:'Laura',age:31,city:'Basel',dist:12,img:IMG.laura,slot:'Sunday · 14:00–20:00',intent:'Plan Ahead',vibes:['Open-minded','Kinky'],bio:'Plane lieber konkret als ewig hin und her zu schreiben.',likesYou:true}
];

const START_CHATS = [
  {id:'p1',name:'Lena',img:IMG.lena,last:'Hey 😊 Bist du noch frei?',time:'20:14',unread:2,fav:true},
  {id:'p2',name:'Sophie',img:IMG.sophie,last:'Drink klingt gut.',time:'Yesterday',unread:0,fav:false}
];

const intents = [
  ['Now','Jetzt / nächste Stunden','flash',IMG.lena],
  ['Tonight','Heute Abend','moon',IMG.sophie],
  ['Weekend','Dieses Wochenende','calendar',IMG.mia],
  ['Plan Ahead','Später planen','time',IMG.nina],
  ['Travel','Andere Stadt / Reise','airplane',IMG.laura]
];
const vibes = ['Casual','Tantra','BDSM','Couples','Chat','Open-minded'];

const AppCtx = React.createContext(null);

function Btn({children,onPress,kind='main',disabled=false,style}) {
  const bg = kind==='main' ? C.salmon : kind==='light' ? '#F7F2EF' : 'transparent';
  const color = kind==='main' ? '#2A1210' : kind==='light' ? '#1B1212' : C.text;
  return <TouchableOpacity disabled={disabled} onPress={onPress} style={[
    {minHeight:54,borderRadius:16,alignItems:'center',justifyContent:'center',marginTop:12,
     backgroundColor:bg,borderWidth:kind==='ghost'?1:0,borderColor:C.line,opacity:disabled?.4:1},
    style
  ]}><Text style={{color,fontWeight:'900',fontSize:16}}>{children}</Text></TouchableOpacity>;
}

function Chip({label,on,onPress,locked=false}) {
  return <TouchableOpacity onPress={onPress} style={{
    paddingHorizontal:13,paddingVertical:9,borderRadius:999,marginRight:8,marginBottom:8,
    borderWidth:1,borderColor:on?C.salmon:C.line,backgroundColor:on?C.salmonSoft:C.panel
  }}><Text style={{color:on?C.salmonPale:C.muted,fontWeight:'800'}}>{locked?'♛ ':''}{label}</Text></TouchableOpacity>;
}

function Top({title='NOW',subtitle,right,back}) {
  return <View style={{flexDirection:'row',alignItems:'center',paddingBottom:16}}>
    {back ? <TouchableOpacity onPress={back} style={{width:38}}><Ionicons name="chevron-back" color={C.text} size={28}/></TouchableOpacity> : null}
    <View style={{flex:1}}>
      <Text style={{color:title==='NOW'?C.salmon:C.text,fontSize:title==='NOW'?30:22,fontWeight:'900',letterSpacing:title==='NOW'?1.5:0}}>{title}</Text>
      {subtitle?<Text style={{color:C.muted,fontSize:10,letterSpacing:1.15,marginTop:3}}>{subtitle}</Text>:null}
    </View>
    {right}
  </View>;
}

function Shell({children,tab,setTab,noNav=false}) {
  return <SafeAreaView style={{flex:1,backgroundColor:'#050506',paddingTop:Platform.OS==='android'?StatusBar.currentHeight:0}}>
    <ExpoStatusBar style="light"/>
    <View style={{
      flex:1,width:'100%',maxWidth:470,alignSelf:'center',backgroundColor:C.bg,
      borderLeftWidth:Platform.OS==='web'?1:0,borderRightWidth:Platform.OS==='web'?1:0,borderColor:C.line
    }}>
      <View style={{flex:1}}>{children}</View>
      {!noNav && <BottomNav tab={tab} setTab={setTab}/>}
    </View>
  </SafeAreaView>;
}

function BottomNav({tab,setTab}) {
  const items=[['discover','flame','Discover'],['matches','heart','Matches'],['chats','chatbubble','Chats'],['profile','person','Profile']];
  return <View style={{height:76,borderTopWidth:1,borderColor:C.line,flexDirection:'row',backgroundColor:'#0D0D0F',paddingBottom:8}}>
    {items.map(([k,ic,l])=><TouchableOpacity key={k} style={{flex:1,alignItems:'center',justifyContent:'center'}} onPress={()=>setTab(k)}>
      <Ionicons name={ic} size={22} color={tab===k?C.salmon:C.muted}/>
      <Text style={{fontSize:10,fontWeight:'800',color:tab===k?C.salmon:C.muted,marginTop:2}}>{l}</Text>
    </TouchableOpacity>)}
  </View>;
}

function SectionTitle({children}) {
  return <Text style={{color:C.text,fontSize:19,fontWeight:'900',marginTop:22,marginBottom:12}}>{children}</Text>;
}

function Auth({enter,live,onLogin,onSignup,onOAuth,onPhone,referralCode}) {
  const [mode,setMode]=useState('login');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [name,setName]=useState('');
  const [birth,setBirth]=useState('1990-01-01');
  const [busy,setBusy]=useState(false);
  const [adultConfirmed,setAdultConfirmed]=useState(false);
  const submit=async()=>{
    if(!live){enter();return;}
    try{
      setBusy(true);
      if(mode==='login') await onLogin(email,password);
      else {
        const dob=new Date(`${birth}T12:00:00`);
        const cutoff=new Date(); cutoff.setFullYear(cutoff.getFullYear()-18);
        if(!birth || Number.isNaN(dob.getTime()) || dob>cutoff) throw new Error('NOW is only for adults aged 18 or older.');
        if(!adultConfirmed) throw new Error('Please confirm that you are 18 or older.');
        await onSignup({email,password,displayName:name,birthDate:birth,referralCode});
      }
    }catch(e){Alert.alert('NOW',e.message||String(e));}
    finally{setBusy(false);}
  };
  return <Shell noNav>
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{padding:12,paddingBottom:18,flexGrow:1}}
    >
      <ImageBackground
        source={IMG.lena}
        imageStyle={{borderRadius:24}}
        style={{
          height:Platform.OS==='web'?500:385,
          borderRadius:24,
          overflow:'hidden',
          justifyContent:'flex-end',
          marginBottom:12
        }}
      >
        <LinearGradient colors={['rgba(0,0,0,.02)','rgba(0,0,0,.18)','rgba(9,9,11,.94)']} style={{...StyleSheet.absoluteFillObject}}/>
        <View style={{padding:Platform.OS==='web'?24:18}}>
          <Text style={{color:C.salmon,fontSize:Platform.OS==='web'?52:42,fontWeight:'900',letterSpacing:2}}>NOW</Text>
          <Text style={{color:'#fff',fontSize:Platform.OS==='web'?30:23,fontWeight:'900',lineHeight:Platform.OS==='web'?34:27,marginTop:5}}>
            Meet people who want the same thing, when you're both free.
          </Text>
          <Text style={{color:C.salmonPale,fontSize:Platform.OS==='web'?16:13,fontWeight:'800',lineHeight:Platform.OS==='web'?22:18,marginTop:7}}>
            Other apps match attraction. NOW matches intent + availability.
          </Text>
        </View>
      </ImageBackground>

      {mode==='signup' && <>
        {referralCode ? <View style={{padding:10,borderRadius:12,backgroundColor:C.salmonSoft,borderWidth:1,borderColor:C.salmon,marginBottom:2}}><Text style={{color:C.salmonPale,fontWeight:'800',fontSize:12}}>Friend invite detected · your referral reward will be linked after signup.</Text></View> : null}
        <TextInput value={name} onChangeText={setName} placeholder="Display name" placeholderTextColor={C.muted} style={authInput}/>
        <TextInput value={birth} onChangeText={setBirth} placeholder="Birth date (YYYY-MM-DD)" placeholderTextColor={C.muted} style={authInput}/>
        <TouchableOpacity onPress={()=>setAdultConfirmed(!adultConfirmed)} style={{flexDirection:'row',alignItems:'center',paddingVertical:10}}><Ionicons name={adultConfirmed?'checkbox':'square-outline'} size={22} color={adultConfirmed?C.salmon:C.muted}/><Text style={{color:C.text,marginLeft:9,flex:1,fontSize:12,lineHeight:17}}>I confirm that I am 18 or older and that my date of birth is correct.</Text></TouchableOpacity>
      </>}
      <View style={{flexDirection:'row'}}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="E-Mail"
          placeholderTextColor={C.muted}
          style={[authInput,{flex:1,marginRight:5}]}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          placeholderTextColor={C.muted}
          style={[authInput,{flex:1,marginLeft:5}]}
        />
      </View>

      <Btn style={{minHeight:42,marginTop:8,borderRadius:13}} disabled={busy} onPress={submit}>
        {busy?'Please wait…':mode==='login'?'Login':'Create account'}
      </Btn>

      <TouchableOpacity onPress={()=>setMode(mode==='login'?'signup':'login')} style={{alignItems:'center',paddingVertical:8}}>
        <Text style={{color:C.salmonPale,fontSize:13,fontWeight:'800'}}>
          {mode==='login'?'Neu hier? Create account':'Back to login'}
        </Text>
      </TouchableOpacity>

      <View style={{flexDirection:'row',marginTop:2}}>
        <TouchableOpacity onPress={()=>onOAuth?.('apple')} style={authMiniButton}>
          <Ionicons name="logo-apple" size={18} color={C.text}/>
          <Text style={authMiniText}>Apple</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>onOAuth?.('google')} style={[authMiniButton,{marginHorizontal:7}]}>
          <Ionicons name="logo-google" size={17} color={C.text}/>
          <Text style={authMiniText}>Google</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>onPhone?.()} style={authMiniButton}>
          <Ionicons name="call-outline" size={18} color={C.text}/>
          <Text style={authMiniText}>Phone</Text>
        </TouchableOpacity>
      </View>

      <Text style={{color:C.muted,textAlign:'center',fontSize:9.5,marginTop:9}}>
        18+ only · Discreet · {live?'Beta backend connected':'Local demo mode'}
      </Text>
    </ScrollView>
  </Shell>;
}

function PhoneAuth({back,onDone}) {
  const [phone,setPhone]=useState('+41');
  const [token,setToken]=useState('');
  const [sent,setSent]=useState(false);
  const [busy,setBusy]=useState(false);
  const send=async()=>{try{setBusy(true);await backend.requestPhoneOtp(phone);setSent(true);}catch(e){Alert.alert('Phone login',e.message||String(e));}finally{setBusy(false);}};
  const verify=async()=>{try{setBusy(true);await backend.verifyPhoneOtp(phone,token);await onDone();}catch(e){Alert.alert('Phone login',e.message||String(e));}finally{setBusy(false);}};
  return <Shell noNav><ScrollView contentContainerStyle={{padding:20,paddingBottom:40}}>
    <Top title="Phone login" back={back}/>
    <Text style={{color:C.text,fontSize:28,fontWeight:'900'}}>Sign in with your phone</Text>
    <Text style={{color:C.muted,lineHeight:21,marginTop:6}}>We send a one-time verification code. 18+ still applies to the profile.</Text>
    <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+41…" placeholderTextColor={C.muted} style={input}/>
    {!sent ? <Btn disabled={busy} onPress={send}>{busy?'Sending…':'Send code'}</Btn> : <>
      <TextInput value={token} onChangeText={setToken} keyboardType="number-pad" placeholder="6-digit code" placeholderTextColor={C.muted} style={input}/>
      <Btn disabled={busy} onPress={verify}>{busy?'Checking…':'Verify & continue'}</Btn>
      <Btn kind="ghost" onPress={send}>Send new code</Btn>
    </>}
  </ScrollView></Shell>;
}

function IntentScreen({selected,setSelected,next}) {
  return <Shell noNav>
    <ScrollView contentContainerStyle={{padding:20,paddingBottom:40}}>
      <Top title="What do you want?" subtitle="CHOOSE ONE OR MORE"/>
      <Text style={{color:C.text,fontSize:28,fontWeight:'900'}}>Be direct.</Text>
      <Text style={{color:C.muted,lineHeight:21,marginTop:5}}>NOW starts with intent — not endless profile browsing.</Text>

      <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',marginTop:20}}>
        {intents.map(([k,sub,ic,img],idx)=>{
          const on=selected.includes(k);
          return <TouchableOpacity key={k} onPress={()=>setSelected(on?selected.filter(x=>x!==k):[...selected,k])} style={{width:idx===4?'100%':'48.5%',marginBottom:12}}>
            <ImageBackground source={img} imageStyle={{borderRadius:18}} style={{height:150,borderRadius:18,overflow:'hidden',justifyContent:'flex-end',borderWidth:2,borderColor:on?C.salmon:'transparent'}}>
              <LinearGradient colors={['transparent',on?'rgba(93,43,37,.88)':'rgba(0,0,0,.82)']} style={{...StyleSheet.absoluteFillObject}}/>
              <View style={{padding:14}}>
                <Ionicons name={on?'checkmark-circle':ic} size={22} color={on?C.salmonPale:'#fff'}/>
                <Text style={{color:'#fff',fontSize:18,fontWeight:'900',marginTop:7}}>{k}</Text>
                <Text style={{color:'#E9E0DE',fontSize:12,marginTop:2}}>{sub}</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        })}
      </View>

      <SectionTitle>Vibe <Text style={{fontSize:12,color:C.muted,fontWeight:'600'}}>(optional)</Text></SectionTitle>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>{vibes.map(v=><Chip key={v} label={v}/>)}</View>
      <Btn disabled={!selected.length} onPress={next}>Continue → add availability</Btn>
    </ScrollView>
  </Shell>;
}

function SlotEditor({slot,setSlot,save,cancel}) {
  const choices = {
    city:['Zürich','Chur','Basel','Barcelona'],
    date:['Today','Tomorrow','Friday','Saturday'],
    time:['18:00–22:00','20:00–24:00','20:00–02:00','All evening']
  };
  return <Shell noNav><ScrollView contentContainerStyle={{padding:20,paddingBottom:40}}>
    <Top title={slot.id?'Edit availability':'Add availability'} back={cancel}/>
    <Text style={{color:C.text,fontSize:28,fontWeight:'900'}}>When are you really free?</Text>
    <Text style={{color:C.muted,lineHeight:21,marginTop:6}}>Your slot stays active until it ends, or until you edit, pause or delete it.</Text>

    <SectionTitle>Location</SectionTitle>
    <View style={{flexDirection:'row',flexWrap:'wrap'}}>{choices.city.map(x=><Chip key={x} label={x} on={slot.city===x} onPress={()=>setSlot({...slot,city:x})}/>)}</View>
    <SectionTitle>Date</SectionTitle>
    <View style={{flexDirection:'row',flexWrap:'wrap'}}>{choices.date.map((x,i)=><Chip key={x} label={x} on={slot.date===x} onPress={()=>{const d=new Date();d.setDate(d.getDate()+i);setSlot({...slot,date:x,dateISO:d.toISOString().slice(0,10)})}}/>)}</View>
    <SectionTitle>Time</SectionTitle>
    <View style={{flexDirection:'row',flexWrap:'wrap'}}>{choices.time.map(x=><Chip key={x} label={x} on={slot.time===x} onPress={()=>{const map={'18:00–22:00':['18:00','22:00'],'20:00–24:00':['20:00','24:00'],'20:00–02:00':['20:00','02:00'],'All evening':['18:00','02:00']};const [start,end]=map[x];setSlot({...slot,time:x,start,end})}}/>)}</View>

    <View style={{marginTop:24,padding:16,borderRadius:18,backgroundColor:C.salmonSoft,borderWidth:1,borderColor:C.salmon}}>
      <Text style={{color:C.salmonPale,fontWeight:'900'}}>The NOW rule</Text>
      <Text style={{color:'#F3E6E3',lineHeight:20,marginTop:5}}>If you want to see who is available, show when you are available. No active slot = no profiles, no swiping, no new matches.</Text>
    </View>
    <Btn onPress={save}>Save availability</Btn>
  </ScrollView></Shell>;
}

function Slots({slots,setSlots,premium,add,edit,back}) {
  const max=premium?5:1;
  const toggle=async(s,v)=>{
    try{
      if(backend.isLive) await backend.setSlotActive(s.id,v);
      setSlots(slots.map(x=>x.id===s.id?{...x,active:v}:x));
    }catch(e){Alert.alert('Availability',e.message||String(e));}
  };
  const remove=async(s)=>{
    try{
      if(backend.isLive) await backend.deleteAvailability(s.id);
      setSlots(slots.filter(x=>x.id!==s.id));
    }catch(e){Alert.alert('Availability',e.message||String(e));}
  };
  return <Shell noNav><ScrollView contentContainerStyle={{padding:20,paddingBottom:40}}>
    <Top title="My availability" back={back}/>
    <Text style={{color:C.muted}}>{slots.filter(s=>s.active).length}/{max} active slots {premium?'· NOW+':'· Free'}</Text>
    {slots.map(s=><View key={s.id} style={{marginTop:14,padding:16,borderRadius:18,backgroundColor:C.panel,borderWidth:1,borderColor:C.line}}>
      <View style={{flexDirection:'row',alignItems:'center'}}>
        <View style={{flex:1}}>
          <Text style={{color:C.text,fontSize:17,fontWeight:'900'}}>⌖ {s.city}</Text>
          <Text style={{color:C.muted,marginTop:5}}>{s.date} · {s.time || `${s.start||''}–${s.end||''}`}</Text>
          <Text style={{color:s.active?C.green:C.muted,fontWeight:'800',marginTop:8}}>{s.active?'● Active':'○ Paused'}</Text>
        </View>
        <Switch value={s.active} onValueChange={(v)=>toggle(s,v)} trackColor={{true:C.salmon}}/>
      </View>
      <View style={{flexDirection:'row',marginTop:14}}>
        <Btn kind="ghost" style={{flex:1,marginRight:6,minHeight:44,marginTop:0}} onPress={()=>edit(s)}>Edit</Btn>
        <Btn kind="ghost" style={{flex:1,marginLeft:6,minHeight:44,marginTop:0}} onPress={()=>remove(s)}>Delete</Btn>
      </View>
    </View>)}
    <Btn onPress={add}>＋ Add another slot</Btn>
    {!premium && slots.length>=1 && <View style={{marginTop:16,padding:16,borderRadius:18,backgroundColor:C.panel,borderWidth:1,borderColor:C.salmon}}>
      <Text style={{color:C.salmonPale,fontWeight:'900'}}>♛ NOW+ = up to 5 parallel slots</Text>
      <Text style={{color:C.muted,marginTop:5,lineHeight:20}}>Friday Zürich. Saturday Chur. Barcelona next week. Free has 1 active slot.</Text>
    </View>}
  </ScrollView></Shell>;
}

function Discover({slots,seen,setSeen,favs,setFavs,matches,setMatches,chats,setChats,openProfile,openMatch,filters,setScreen,people,shareProfile}) {
  const active=slots.some(s=>s.active);
  const source=(people&&people.length)?people:PEOPLE;
  const deck=source.filter(p=>!seen.includes(p.id) && (p.dist||0)<=filters.dist);
  if(!active) return <Shell tab="discover" setTab={(t)=>setScreen(t)}>
    <View style={{flex:1,alignItems:'center',justifyContent:'center',padding:28}}>
      <Ionicons name="time-outline" size={54} color={C.salmon}/>
      <Text style={{color:C.text,fontSize:28,fontWeight:'900',textAlign:'center',marginTop:16}}>No slot. No browsing.</Text>
      <Text style={{color:C.muted,textAlign:'center',lineHeight:21,marginTop:9}}>NOW is for meeting, not collecting pictures. Add a real availability slot first.</Text>
      <View style={{width:'100%',marginTop:12}}><Btn onPress={()=>setScreen('slots')}>Add availability</Btn></View>
    </View>
  </Shell>;

  const p=deck[0];
  if(!p) return <Shell tab="discover" setTab={(t)=>setScreen(t)}>
    <View style={{flex:1,alignItems:'center',justifyContent:'center',padding:28}}>
      <Text style={{color:C.text,fontSize:27,fontWeight:'900'}}>That’s everyone for now.</Text>
      <Text style={{color:C.muted,textAlign:'center',marginTop:8,lineHeight:21}}>Invite someone to NOW. More people nearby means more real possibilities for everyone.</Text>
      <View style={{width:'100%'}}><Btn onPress={()=>setScreen('referral')}>Invite & earn credits</Btn><Btn kind="ghost" onPress={()=>setSeen([])}>Reset demo profiles</Btn></View>
    </View>
  </Shell>;

  const like=async()=>{
    setSeen([...seen,p.id]);
    try{
      const matchId=backend.isLive?await backend.likeUser(p.id,p.slotId||null):null;
      if((backend.isLive&&matchId)||(!backend.isLive&&p.likesYou)){
        const person={...p,matchId};
        if(!matches.includes(p.id)) setMatches([...matches,p.id]);
        if(!chats.find(c=>c.id===p.id)) setChats([{id:p.id,name:p.name,img:p.img||IMG.lena,last:'New match — say hi 👋',time:'now',unread:0,fav:false,matchId},...chats]);
        openMatch(person);
      }
    }catch(e){Alert.alert('Like',e.message||String(e));}
  };
  const skip=async()=>{
    setSeen([...seen,p.id]);
    if(backend.isLive) backend.recordSkip(p.id).catch(()=>{});
  };
  return <Shell tab="discover" setTab={(t)=>setScreen(t)}>
    <View style={{padding:16,paddingBottom:8}}>
      <Top title="NOW" subtitle="REAL PLANS. REAL AVAILABILITY." right={<View style={{flexDirection:'row'}}>
        <TouchableOpacity onPress={()=>setScreen('slots')} style={{marginRight:16}}><Ionicons name="calendar-outline" color={C.salmon} size={25}/></TouchableOpacity>
        <TouchableOpacity onPress={()=>setScreen('filters')}><Ionicons name="options-outline" color={C.text} size={25}/></TouchableOpacity>
      </View>}/>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:10}}>
        {['Now','Tonight','Weekend','Plan Ahead'].map(x=><Chip key={x} label={x} on={x==='Now'}/>)}
      </ScrollView>
    </View>

    <ImageBackground source={p.img||IMG.lena} style={{flex:1,marginHorizontal:14,marginBottom:12,borderRadius:26,overflow:'hidden',justifyContent:'flex-end'}}>
      <LinearGradient colors={['rgba(0,0,0,.03)','rgba(0,0,0,.18)','rgba(0,0,0,.92)']} style={{...StyleSheet.absoluteFillObject}}/>
      <View style={{position:'absolute',top:14,left:14,right:14,flexDirection:'row',justifyContent:'space-between'}}>
        <View style={smallBadge}><Text style={smallBadgeText}>● Online now</Text></View>
        <View style={smallBadge}><Text style={smallBadgeText}>⌖ {p.dist} km</Text></View>
      </View>
      <View style={{padding:20}}>
        <Text style={{color:'#fff',fontSize:32,fontWeight:'900'}}>{p.name}, {p.age}</Text>
        <Text style={{color:'#F1E8E6',marginTop:6}}>⌖ {p.city} · {p.vibes.join(' · ')}</Text>
        <View style={{alignSelf:'flex-start',backgroundColor:C.salmon,borderRadius:999,paddingHorizontal:12,paddingVertical:8,marginTop:12}}>
          <Text style={{color:'#2A1210',fontWeight:'900'}}>◷ {p.slot || (p.overlapMinutes ? `${p.overlapMinutes} min overlap` : 'Availability overlaps')}</Text>
        </View>
        <Text style={{color:'#EFE6E4',lineHeight:20,marginTop:12}}>{p.bio}</Text>

        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',marginTop:18}}>
          <TouchableOpacity onPress={skip} style={circleAction}><Ionicons name="close" size={31} color={C.text}/></TouchableOpacity>
          <TouchableOpacity onPress={()=>setFavs(favs.includes(p.id)?favs.filter(x=>x!==p.id):[...favs,p.id])} style={circleAction}><Ionicons name={favs.includes(p.id)?'star':'star-outline'} size={26} color={favs.includes(p.id)?C.gold:C.text}/></TouchableOpacity>
          <TouchableOpacity onPress={like} style={likeAction}><Ionicons name="heart" size={31} color="#2A1210"/></TouchableOpacity>
          <TouchableOpacity onPress={()=>shareProfile(p)} style={circleAction}><Ionicons name="share-social-outline" size={25} color={C.salmonPale}/></TouchableOpacity>
          <TouchableOpacity onPress={()=>openProfile(p)} style={circleAction}><Ionicons name="information" size={26} color={C.text}/></TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  </Shell>;
}

function Profile({person,back,like,shareProfile}) {
  return <Shell noNav>
    <ScrollView>
      <ImageBackground source={person.img||IMG.lena} style={{height:470,justifyContent:'flex-end'}}>
        <LinearGradient colors={['rgba(0,0,0,.05)','rgba(0,0,0,.86)']} style={{...StyleSheet.absoluteFillObject}}/>
        <TouchableOpacity onPress={back} style={{position:'absolute',top:24,left:18,width:42,height:42,borderRadius:21,backgroundColor:'rgba(0,0,0,.55)',alignItems:'center',justifyContent:'center'}}>
          <Ionicons name="chevron-back" color="#fff" size={26}/>
        </TouchableOpacity>
        <View style={{padding:20}}>
          <Text style={{color:'#fff',fontSize:32,fontWeight:'900'}}>{person.name}, {person.age}</Text>
          <Text style={{color:'#F4E8E5',marginTop:5}}>⌖ {person.dist} km · {person.city}</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',marginTop:10}}>{person.vibes.map(v=><Chip key={v} label={v} on/>)}</View>
        </View>
      </ImageBackground>
      <View style={{padding:20}}>
        <SectionTitle>About me</SectionTitle>
        <Text style={{color:C.muted,lineHeight:22}}>{person.bio}</Text>
        <SectionTitle>Available</SectionTitle>
        <View style={{padding:15,borderRadius:16,backgroundColor:C.panel,borderWidth:1,borderColor:C.line}}>
          <Text style={{color:C.text,fontWeight:'900'}}>{person.slot || (person.overlapMinutes ? `${person.overlapMinutes} min overlap` : 'Availability overlaps')}</Text>
          <Text style={{color:C.green,marginTop:6,fontWeight:'800'}}>● Overlaps with your active slot</Text>
        </View>
        <Btn onPress={like}>Like</Btn>
        <Btn kind="ghost" onPress={()=>shareProfile(person)}>↗ Someone for your friend? Share profile</Btn>
        <Text style={{color:C.muted,fontSize:11,textAlign:'center',marginTop:4}}>Sharing is caring. Your friend joins NOW to see the profile.</Text>
        <View style={{flexDirection:'row',marginTop:8}}>
          <Btn kind="ghost" style={{flex:1,marginRight:5}} onPress={async()=>{try{if(backend.isLive)await backend.reportUser(person.id,'user_report');Alert.alert('Report','Thanks. The report has been recorded.');}catch(e){Alert.alert('Report',e.message||String(e));}}}>Report</Btn>
          <Btn kind="ghost" style={{flex:1,marginLeft:5}} onPress={async()=>{try{if(backend.isLive)await backend.blockUser(person.id);Alert.alert('Blocked','This profile will no longer be shown.');back();}catch(e){Alert.alert('Block',e.message||String(e));}}}>Block</Btn>
        </View>
      </View>
    </ScrollView>
  </Shell>;
}

function MatchPopup({person,openChat,close}) {
  return <Shell noNav><View style={{flex:1,justifyContent:'center',padding:28}}>
    <Text style={{color:C.salmon,fontSize:66,textAlign:'center'}}>♥</Text>
    <Text style={{color:C.text,fontSize:36,fontWeight:'900',textAlign:'center'}}>It’s a match!</Text>
    <Text style={{color:C.muted,textAlign:'center',lineHeight:21,marginTop:8}}>You both want to meet — and your availability overlaps.</Text>
    <View style={{flexDirection:'row',justifyContent:'center',marginVertical:30}}>
      <Image source={IMG.laura} style={{width:92,height:92,borderRadius:46,borderWidth:3,borderColor:C.salmon}}/>
      <Image source={person.img} style={{width:92,height:92,borderRadius:46,borderWidth:3,borderColor:C.salmon,marginLeft:-12}}/>
    </View>
    <Btn onPress={openChat}>Open chat</Btn>
    <Btn kind="ghost" onPress={close}>Keep browsing</Btn>
  </View></Shell>;
}

function Matches({matches,favs,setFavs,openProfile,setScreen,matchPeople=[]}) {
  const source=backend.isLive?matchPeople:PEOPLE;
  const list=source.filter(p=>matches.includes(p.id));
  return <Shell tab="matches" setTab={setScreen}><ScrollView contentContainerStyle={{padding:18,paddingBottom:30}}>
    <Top title="Matches"/>
    {list.length===0?<Text style={{color:C.muted}}>No matches yet.</Text>:list.map(p=><TouchableOpacity key={p.id} onPress={()=>openProfile(p)} style={{flexDirection:'row',alignItems:'center',backgroundColor:C.panel,borderRadius:18,borderWidth:1,borderColor:C.line,overflow:'hidden',marginBottom:12}}>
      <Image source={p.img||IMG.lena} style={{width:94,height:108}}/>
      <View style={{flex:1,padding:13}}>
        <Text style={{color:C.text,fontSize:18,fontWeight:'900'}}>{p.name}, {p.age}</Text>
        <Text style={{color:C.muted,marginTop:4}}>{p.slot}</Text>
        <Text style={{color:C.green,fontSize:12,fontWeight:'800',marginTop:5}}>● Matched</Text>
      </View>
      <TouchableOpacity onPress={async()=>{const on=!favs.includes(p.id);setFavs(on?[...favs,p.id]:favs.filter(x=>x!==p.id));if(backend.isLive&&p.matchId)backend.setFavorite(p.matchId,on).catch(()=>{});}} style={{padding:16}}>
        <Ionicons name={favs.includes(p.id)?'star':'star-outline'} color={favs.includes(p.id)?C.gold:C.muted} size={23}/>
      </TouchableOpacity>
    </TouchableOpacity>)}
  </ScrollView></Shell>;
}

function Chats({chats,setScreen,openChat}) {
  return <Shell tab="chats" setTab={setScreen}><ScrollView contentContainerStyle={{padding:18,paddingBottom:30}}>
    <Top title="Chats" subtitle="ALWAYS AVAILABLE"/>
    {chats.map(c=><TouchableOpacity key={c.id} onPress={()=>openChat(PEOPLE.find(p=>p.id===c.id))} style={{flexDirection:'row',alignItems:'center',padding:13,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:18,marginBottom:10}}>
      <Image source={c.img} style={{width:58,height:58,borderRadius:29,marginRight:12}}/>
      <View style={{flex:1}}>
        <Text style={{color:C.text,fontWeight:'900',fontSize:16}}>{c.name}</Text>
        <Text style={{color:C.muted,marginTop:4}} numberOfLines={1}>{c.last}</Text>
      </View>
      <View style={{alignItems:'flex-end'}}>
        <Text style={{color:C.muted,fontSize:10}}>{c.time}</Text>
        {c.unread>0?<View style={{marginTop:8,minWidth:20,height:20,borderRadius:10,backgroundColor:C.salmon,alignItems:'center',justifyContent:'center'}}><Text style={{color:'#2A1210',fontWeight:'900',fontSize:10}}>{c.unread}</Text></View>:null}
      </View>
    </TouchableOpacity>)}
  </ScrollView></Shell>;
}

function Chat({person,back,premium}) {
  const [msgs,setMsgs]=useState(backend.isLive?[]:[
    {me:false,text:'Hey 😊 Bist du noch frei?',time:'20:14'},
    {me:true,text:'Ja. Lust auf einen Drink?',time:'20:16'},
    {me:false,text:'Klingt gut. Wo?',time:'20:17'}
  ]);
  const [txt,setTxt]=useState('');
  const [cid,setCid]=useState(person?.conversationId||null);
  useEffect(()=>{
    let unsub=()=>{};
    if(backend.isLive && person?.matchId){
      backend.loadConversation(person.matchId).then(({conversationId,messages})=>{
        setCid(conversationId); setMsgs(messages.map(m=>({...m,time:new Date(m.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})})));
        backend.markConversationRead(conversationId).catch(()=>{});
        unsub=backend.subscribeMessages(conversationId,(m)=>setMsgs(old=>[...old,{me:false,text:m.body,time:'now'}]));
      }).catch(e=>Alert.alert('Chat',e.message||String(e)));
    }
    return ()=>unsub();
  },[person?.matchId]);
  const send=async()=>{
    if(!txt.trim())return;
    const text=txt.trim(); setTxt(''); setMsgs(old=>[...old,{me:true,text,time:'now'}]);
    if(backend.isLive&&cid){try{await backend.sendMessage(cid,text);}catch(e){Alert.alert('Message',e.message||String(e));}}
  };
  return <Shell noNav><View style={{flex:1}}>
    <View style={{padding:18,paddingBottom:8}}><Top title={person.name} back={back} subtitle="CHAT HISTORY SAVED"/></View>
    <ScrollView contentContainerStyle={{padding:18,flexGrow:1,justifyContent:'flex-end'}}>
      {msgs.map((m,i)=><View key={m.id||i} style={{alignSelf:m.me?'flex-end':'flex-start',maxWidth:'80%',backgroundColor:m.me?C.salmon:'#2B292B',borderRadius:16,padding:12,marginBottom:10}}>
        <Text style={{color:m.me?'#2A1210':C.text,lineHeight:19}}>{m.text}</Text>
        <Text style={{color:m.me?'#6A332E':C.muted,fontSize:9,textAlign:'right',marginTop:4}}>{m.time}{m.me&&premium?' · read':''}</Text>
      </View>)}
    </ScrollView>
    <View style={{flexDirection:'row',alignItems:'center',padding:12,borderTopWidth:1,borderColor:C.line}}>
      <TextInput value={txt} onChangeText={setTxt} placeholder="Message…" placeholderTextColor={C.muted} style={[input,{flex:1,marginTop:0,height:46}]}/>
      <TouchableOpacity onPress={send} style={{width:46,height:46,borderRadius:23,backgroundColor:C.salmon,alignItems:'center',justifyContent:'center',marginLeft:8}}><Ionicons name="send" size={20} color="#2A1210"/></TouchableOpacity>
    </View>
  </View></Shell>;
}

function Filters({filters,setFilters,back,premium}) {
  return <Shell noNav><ScrollView contentContainerStyle={{padding:20,paddingBottom:40}}>
    <Top title="Filters" back={back}/>
    <SectionTitle>Distance</SectionTitle>
    <View style={{flexDirection:'row',flexWrap:'wrap'}}>{[10,25,50,100].map(d=><Chip key={d} label={`${d} km`} on={filters.dist===d} onPress={()=>setFilters({...filters,dist:d})}/>)}</View>
    <SectionTitle>Advanced filters</SectionTitle>
    {['Intent compatibility','Exact age range','Verified only','Vibe compatibility'].map((x,i)=><View key={x} style={{padding:15,borderRadius:15,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,marginBottom:9,flexDirection:'row',alignItems:'center'}}>
      <Text style={{color:C.text,flex:1}}>{x}</Text><Text style={{color:C.salmon,fontWeight:'900'}}>{premium?'ON':'♛ NOW+'}</Text>
    </View>)}
    <Btn onPress={back}>Apply filters</Btn>
  </ScrollView></Shell>;
}

function Premium({premium,setPremium,credits,setCredits,back}) {
  const [busy,setBusy]=useState(false);
  const purchase=async(productId,consumable=false)=>{
    if(!backend.isLive){
      if(consumable) setCredits(credits+(productId===iap.PRODUCT_IDS.credits30?30:10)); else setPremium(true);
      Alert.alert('Demo','Purchase simulated locally.');
      return;
    }
    if(!iap.nativeIapAvailable()){
      Alert.alert('Native build required','Apple In-App Purchase / Google Play Billing needs a development/TestFlight/Play build, not Expo Go.');
      return;
    }
    try{
      setBusy(true);
      const purchaseResult=await iap.buy(productId);
      const verified=await iap.verifyPurchaseOnServer(purchaseResult);
      if(!verified?.ok && !verified?.verified) throw new Error('Purchase verification failed');
      await iap.finishPurchase(purchaseResult,consumable);
      const b=await backend.loadBootstrap(); setPremium(!!b.premium); setCredits(b.credits||0);
    }catch(e){Alert.alert('Purchase',e.message||String(e));}
    finally{setBusy(false);}
  };
  const restore=async()=>{
    try{
      setBusy(true);
      const purchases=await iap.restorePurchases();
      for(const p of purchases||[]) await iap.verifyPurchaseOnServer(p);
      const b=backend.isLive?await backend.loadBootstrap():null;
      if(b){setPremium(!!b.premium);setCredits(b.credits||0);}
      Alert.alert('Restore','Purchases checked.');
    }catch(e){Alert.alert('Restore',e.message||String(e));}
    finally{setBusy(false);}
  };
  return <Shell noNav><ScrollView contentContainerStyle={{padding:20,paddingBottom:40}}>
    <Top title="NOW+" back={back}/>
    <Text style={{color:C.text,fontSize:30,fontWeight:'900'}}>Pay for more freedom, not for basic connection.</Text>
    <Text style={{color:C.muted,lineHeight:21,marginTop:8}}>Matches and chat stay free. Premium unlocks convenience, discretion and more parallel planning.</Text>

    <SectionTitle>NOW+ · subscription</SectionTitle>
    {['Up to 5 active slots','Advanced filters','Who liked me','Incognito','Read receipts','Rewind included'].map(x=><View key={x} style={{flexDirection:'row',paddingVertical:8}}>
      <Ionicons name="checkmark-circle" color={C.salmon} size={20}/><Text style={{color:C.text,marginLeft:9}}>{x}</Text>
    </View>)}
    <Btn disabled={busy} onPress={()=>purchase(iap.PRODUCT_IDS.nowPlusMonthly,false)}>{premium?'NOW+ active':'Get NOW+ · App Store / Google Play'}</Btn>
    <Btn kind="ghost" disabled={busy} onPress={restore}>Restore purchases</Btn>

    <SectionTitle>Credits · one-time extras</SectionTitle>
    <View style={{padding:18,borderRadius:18,backgroundColor:C.panel,borderWidth:1,borderColor:C.line}}>
      <Text style={{color:C.salmon,fontSize:42,fontWeight:'900'}}>{credits}</Text>
      <Text style={{color:C.muted}}>credits available</Text>
    </View>
    <View style={{flexDirection:'row',marginTop:10}}>
      <Btn style={{flex:1,marginRight:5}} onPress={()=>purchase(iap.PRODUCT_IDS.credits10,true)}>10 credits</Btn>
      <Btn style={{flex:1,marginLeft:5}} onPress={()=>purchase(iap.PRODUCT_IDS.credits30,true)}>30 credits</Btn>
    </View>
    {[
      ['Slot Spotlight','Push one active slot higher',3,'slot_spotlight'],
      ['Last-Minute Boost','More visibility shortly before slot starts',2,'last_minute_boost'],
      ['Rewind','Bring back the last skipped profile',1,'rewind']
    ].map(([t,sub,c,reason])=><TouchableOpacity key={t} onPress={async()=>{
      try{
        if(backend.isLive){const bal=await backend.spendCredits(reason,c);setCredits(bal);} else if(credits>=c)setCredits(credits-c); else throw new Error('Not enough credits');
      }catch(e){Alert.alert('Credits',e.message||String(e));}
    }} style={{padding:15,borderRadius:16,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,marginTop:10,flexDirection:'row',alignItems:'center'}}>
      <View style={{flex:1}}><Text style={{color:C.text,fontWeight:'900'}}>{t}</Text><Text style={{color:C.muted,fontSize:12,marginTop:3}}>{sub}</Text></View>
      <Text style={{color:C.salmon,fontWeight:'900'}}>{c} cr</Text>
    </TouchableOpacity>)}
  </ScrollView></Shell>;
}

function Referral({credits,setCredits,back}) {
  const [code,setCode]=useState('DEMO42');
  useEffect(()=>{
    if(backend.isLive) backend.createReferralCode().then(setCode).catch(()=>{});
  },[]);
  const link=`https://now.app/invite/${code}`;
  const share=async()=>{await Share.share({message:`Join me on NOW: ${link}`});}
  return <Shell noNav><ScrollView contentContainerStyle={{padding:20,paddingBottom:40}}>
    <Top title="Invite & earn" back={back}/>
    <Text style={{color:C.text,fontSize:30,fontWeight:'900'}}>Invite. Share. Earn.</Text>
    <Text style={{color:C.muted,lineHeight:21,marginTop:8}}>A share alone gives nothing. The invited person must create a new account through your referral link.</Text>
    <View style={{marginTop:22,padding:17,borderRadius:17,backgroundColor:C.panel,borderWidth:1,borderColor:C.line}}>
      <Text style={{color:C.muted,fontSize:10,letterSpacing:1}}>YOUR REFERRAL LINK</Text>
      <Text style={{color:C.text,fontWeight:'900',marginTop:7}}>{link}</Text>
    </View>
    <Btn onPress={share}>Share NOW · both get +3 credits</Btn>
    <View style={{marginTop:18,padding:16,borderRadius:16,backgroundColor:C.salmonSoft,borderWidth:1,borderColor:C.salmon}}>
      <Text style={{color:C.salmonPale,fontWeight:'900'}}>Anti-abuse</Text>
      <Text style={{color:'#F3E5E1',lineHeight:20,marginTop:5}}>Reward only after a real new registration. One reward per new person; reward handling lives server-side in Supabase.</Text>
    </View>
    {!backend.isLive && <Btn kind="ghost" onPress={()=>setCredits(credits+3)}>Demo successful referral +3 credits</Btn>}
  </ScrollView></Shell>;
}

function LegalScreen({kind,back}) {
  const docs={
    guidelines:{title:'Community guidelines',body:[
      'NOW is for consenting adults 18+ only.',
      'No harassment, threats, hate, coercion, exploitation, commercial sexual services, trafficking, or content involving minors.',
      'Respect consent and boundaries. A match never implies consent to anything offline.',
      'Report suspicious, abusive or unsafe behaviour. Blocking immediately removes the person from your experience.',
      'Profile photos and content may be moderated and removed.'
    ]},
    privacy:{title:'Privacy policy · beta draft',body:[
      'NOW stores account, profile, availability, matching, chat, safety, subscription and credit data needed to operate the service.',
      'Availability is used for matching and should only be shown to eligible users. Exact private addresses should not be requested for public profiles.',
      'Users can request account deletion from Profile. Production launch requires the final controller/contact details and retention periods.',
      'Payment processing is handled by Apple App Store or Google Play. NOW stores verified entitlement and transaction references, not payment card data.'
    ]},
    terms:{title:'Terms of use · beta draft',body:[
      'Use of NOW is limited to adults aged 18 or older.',
      'Users are responsible for truthful profiles, lawful use and respectful offline conduct.',
      'NOW+ subscriptions and credit purchases are digital purchases processed through the applicable app store.',
      'Credits have no cash value and are used only for in-app features.',
      'Production launch requires final jurisdiction, company identity, cancellation language and legal review.'
    ]}
  };
  const d=docs[kind]||docs.guidelines;
  return <Shell noNav><ScrollView contentContainerStyle={{padding:20,paddingBottom:40}}>
    <Top title={d.title} back={back}/>
    {d.body.map((x,i)=><View key={i} style={{padding:16,borderRadius:16,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,marginBottom:10}}><Text style={{color:C.text,lineHeight:21}}>{x}</Text></View>)}
  </ScrollView></Shell>;
}

function Me({premium,credits,slots,setScreen,onSignOut}) {
  const [photo,setPhoto]=useState(null);
  const changePhoto=async()=>{
    try{
      const asset=await pickProfilePhoto(); if(!asset)return;
      setPhoto({uri:asset.uri});
      if(backend.isLive) await backend.uploadProfilePhoto(asset.uri,0);
    }catch(e){Alert.alert('Photo',e.message||String(e));}
  };
  const deleteMe=()=>Alert.alert('Delete account','This immediately hides your profile and availability. Continue?',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{try{if(backend.isLive)await backend.deleteAccount();await onSignOut?.();}catch(e){Alert.alert('Account',e.message||String(e));}}}]);
  return <Shell tab="profile" setTab={setScreen}><ScrollView contentContainerStyle={{padding:20,paddingBottom:30}}>
    <Top title="Profile"/>
    <View style={{alignItems:'center'}}>
      <Image source={photo||IMG.laura} style={{width:112,height:112,borderRadius:56,borderWidth:3,borderColor:C.salmon}}/>
      <Text style={{color:C.text,fontSize:23,fontWeight:'900',marginTop:10}}>Your profile</Text>
      <Text style={{color:C.muted,marginTop:3}}>{backend.isLive?'Beta backend connected':'Local demo profile'}</Text>
      <Btn kind="ghost" style={{minHeight:42,paddingHorizontal:20}} onPress={changePhoto}>Change photo</Btn>
    </View>
    <SectionTitle>Account</SectionTitle>
    {[
      ['My availability',`${slots.filter(x=>x.active).length} active`,()=>setScreen('slots')],
      ['NOW+',premium?'Active':'Free',()=>setScreen('premium')],
      ['Credits',String(credits),()=>setScreen('premium')],
      ['Invite friends','Referral',()=>setScreen('referral')],
      ['Privacy & Incognito',premium?'Available':'NOW+',()=>setScreen('premium')]
    ].map(([t,v,onPress])=><TouchableOpacity key={t} onPress={onPress} style={{padding:15,borderRadius:16,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,marginBottom:9,flexDirection:'row'}}>
      <Text style={{color:C.text,flex:1,fontWeight:'800'}}>{t}</Text><Text style={{color:C.muted}}>{v} ›</Text>
    </TouchableOpacity>)}
    <SectionTitle>Safety & legal</SectionTitle>
    {[['Community guidelines','guidelines'],['Privacy policy','privacy'],['Terms of use','terms']].map(([x,k])=><TouchableOpacity key={x} onPress={()=>setScreen('legal:'+k)} style={{padding:15,borderRadius:16,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,marginBottom:9}}><Text style={{color:C.text,fontWeight:'800'}}>{x} ›</Text></TouchableOpacity>)}
    <Btn kind="ghost" onPress={onSignOut}>Sign out</Btn>
    <Btn kind="ghost" onPress={deleteMe} style={{borderColor:C.red}}><Text>Delete account</Text></Btn>
  </ScrollView></Shell>;
}

export default function App(){
  const [screen,setScreen]=useState('auth');
  const [tab,setTab]=useState('discover');
  const [selected,setSelected]=useState(['Now']);
  const [slots,setSlots]=useState([]);
  const [editing,setEditing]=useState(null);
  const [seen,setSeen]=useState([]);
  const [favs,setFavs]=useState([]);
  const [matches,setMatches]=useState([]);
  const [chats,setChats]=useState(START_CHATS);
  const [peer,setPeer]=useState(null);
  const [premium,setPremium]=useState(false);
  const [credits,setCredits]=useState(5);
  const [filters,setFilters]=useState({dist:25});
  const [livePeople,setLivePeople]=useState([]);
  const [matchPeople,setMatchPeople]=useState([]);
  const [booted,setBooted]=useState(false);
  const [referralCode,setReferralCode]=useState(null);

  const nav=(t)=>{setTab(t);setScreen(t)};
  const begin=()=>setScreen('intent');

  const hydrateLive=async()=>{
    if(!backend.isLive){setBooted(true);return;}
    try{
      const session=await backend.currentSession();
      if(!session){setBooted(true);return;}
      const b=await backend.loadBootstrap();
      const mr=await backend.loadMatches().catch(()=>[]);
      setSlots(b.slots||[]); setPremium(!!b.premium); setCredits(b.credits||0);
      setMatches(mr.map(x=>x.person_id));
      setMatchPeople(mr.map(x=>({id:x.person_id,name:x.display_name,age:x.age,bio:x.bio||'',vibes:x.vibes||[],verified:x.verified,matchId:x.match_id,conversationId:x.conversation_id,img:IMG.lena,city:'',dist:0,slot:'Matched'})));
      setChats(mr.map(x=>({id:x.person_id,name:x.display_name,img:IMG.lena,last:'Open chat',time:'',unread:0,matchId:x.match_id,conversationId:x.conversation_id})));
      setScreen((b.slots||[]).some(x=>x.active)?'discover':'intent');
      registerPushToken().catch(()=>{});
    }catch(e){Alert.alert('Backend',e.message||String(e));}
    finally{setBooted(true);}
  };
  useEffect(()=>{hydrateLive();},[]);
  useEffect(()=>{
    const capture=(url)=>{try{if(!url)return;const m=url.match(/[?&]ref=([^&#]+)/)||url.match(/\/invite\/([^/?#]+)/);if(m)setReferralCode(decodeURIComponent(m[1]));}catch(_){}};
    Linking.getInitialURL().then(capture).catch(()=>{});
    const sub=Linking.addEventListener('url',({url})=>capture(url));
    return ()=>sub?.remove?.();
  },[]);
  useEffect(()=>{
    if(backend.isLive && slots.some(x=>x.active)){
      backend.discover(filters.dist).then(setLivePeople).catch(()=>setLivePeople([]));
    }
  },[slots,filters.dist,screen]);

  const onLogin=async(email,password)=>{
    await backend.signInEmail(email,password);
    const b=await backend.loadBootstrap();
    const mr=await backend.loadMatches().catch(()=>[]);
    setSlots(b.slots||[]); setPremium(!!b.premium); setCredits(b.credits||0);
    setMatches(mr.map(x=>x.person_id));
    setMatchPeople(mr.map(x=>({id:x.person_id,name:x.display_name,age:x.age,bio:x.bio||'',vibes:x.vibes||[],verified:x.verified,matchId:x.match_id,conversationId:x.conversation_id,img:IMG.lena,city:'',dist:0,slot:'Matched'})));
    setChats(mr.map(x=>({id:x.person_id,name:x.display_name,img:IMG.lena,last:'Open chat',time:'',unread:0,matchId:x.match_id,conversationId:x.conversation_id})));
    setScreen((b.slots||[]).some(x=>x.active)?'discover':'intent');
    registerPushToken().catch(()=>{});
  };
  const onSignup=async(payload)=>{
    await backend.signUpEmail(payload);
    if(payload.referralCode){
      const session=await backend.currentSession().catch(()=>null);
      if(session) await backend.redeemReferral(payload.referralCode).catch(()=>{});
    }
    Alert.alert('Account created',payload.referralCode?'Welcome to NOW. Your friend invite is linked; rewards are granted after a valid new registration.':'If email confirmation is enabled, confirm the email first.');
    setScreen('intent');
  };
  const onOAuth=async(provider)=>{
    if(!backend.isLive){Alert.alert('Demo','OAuth becomes active after Supabase is configured.');return;}
    try{await backend.signInOAuth(provider);}catch(e){Alert.alert('Login',e.message||String(e));}
  };
  const onPhone=async()=>{if(!backend.isLive){Alert.alert('Demo','Phone OTP becomes active after Supabase is configured.');return;}setScreen('phoneAuth');};

  const newSlot=()=>{
    if(!premium && slots.filter(x=>x.active).length>=1){setScreen('premium');return;}
    setEditing({id:null,city:'Zürich',date:'Today',dateISO:new Date().toISOString().slice(0,10),time:'20:00–24:00',start:'20:00',end:'24:00',active:true});
    setScreen('slotEdit');
  };
  const saveSlot=async()=>{
    try{
      let s={...editing,id:editing.id||('s'+Date.now())};
      if(backend.isLive){
        const liveSlot=await backend.saveAvailability(s);
        s={...s,...liveSlot};
      }
      setSlots(editing.id?slots.map(x=>x.id===editing.id?s:x):[...slots,s]);
      setScreen('discover'); setTab('discover');
    }catch(e){Alert.alert('Availability',e.message||String(e));}
  };
  const shareProfile=async(p)=>{
    try{
      let code='DEMO42';
      if(backend.isLive) code=await backend.createReferralCode();
      const link=`https://now.app/p/${p.id}?ref=${encodeURIComponent(code)}`;
      await Share.share({message:`Someone for you? 👀 ${p.name}, ${p.age} is on NOW. Join to see the profile: ${link}`});
    }catch(e){Alert.alert('Share',e.message||String(e));}
  };
  const openProfile=(p)=>{setPeer(p);setScreen('person')};
  const openMatch=(p)=>{setPeer(p);setScreen('match')};
  const likePeer=async()=>{
    try{
      if(backend.isLive && peer) await backend.likeUser(peer.id, peer.slotId||null);
      if(peer && !matches.includes(peer.id)) setMatches([...matches,peer.id]);
      if(peer && !chats.find(c=>c.id===peer.id)) setChats([{id:peer.id,name:peer.name,img:peer.img||IMG.lena,last:'New match — say hi 👋',time:'now',unread:0,fav:false},...chats]);
      setScreen('match');
    }catch(e){Alert.alert('Like',e.message||String(e));}
  };
  const openChat=(p)=>{const m=matchPeople.find(x=>x.id===p?.id);setPeer(m||p);setScreen('chat')};

  if(!booted && backend.isLive) return <Shell noNav><View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text style={{color:C.salmon,fontSize:34,fontWeight:'900'}}>NOW</Text><Text style={{color:C.muted,marginTop:10}}>Connecting…</Text></View></Shell>;
  if(screen==='auth') return <Auth live={backend.isLive} enter={begin} onLogin={onLogin} onSignup={onSignup} onOAuth={onOAuth} onPhone={onPhone} referralCode={referralCode}/>;
  if(screen==='phoneAuth') return <PhoneAuth back={()=>setScreen('auth')} onDone={async()=>{const b=await backend.loadBootstrap();setSlots(b.slots||[]);setPremium(!!b.premium);setCredits(b.credits||0);setScreen((b.slots||[]).some(x=>x.active)?'discover':'intent')}}/>;
  if(screen==='intent') return <IntentScreen selected={selected} setSelected={setSelected} next={async()=>{try{if(backend.isLive)await backend.saveIntents(selected);newSlot();}catch(e){Alert.alert('Intent',e.message||String(e));}}}/>;
  if(screen==='slotEdit') return <SlotEditor slot={editing} setSlot={setEditing} save={saveSlot} cancel={()=>setScreen(slots.length?'slots':'intent')}/>;
  if(screen==='slots') return <Slots slots={slots} setSlots={setSlots} premium={premium} add={newSlot} edit={(s)=>{setEditing(s);setScreen('slotEdit')}} back={()=>setScreen('discover')}/>;
  if(screen==='person') return <Profile person={peer} back={()=>setScreen('discover')} like={likePeer} shareProfile={shareProfile}/>;
  if(screen==='match') return <MatchPopup person={peer} openChat={()=>openChat(peer)} close={()=>setScreen('discover')}/>;
  if(screen==='chat') return <Chat person={peer} back={()=>setScreen('chats')} premium={premium}/>;
  if(screen==='filters') return <Filters filters={filters} setFilters={setFilters} premium={premium} back={()=>setScreen('discover')}/>;
  if(screen==='premium') return <Premium premium={premium} setPremium={setPremium} credits={credits} setCredits={setCredits} back={()=>setScreen('profile')}/>;
  if(screen==='referral') return <Referral credits={credits} setCredits={setCredits} back={()=>setScreen('profile')}/>;
  if(screen==='matches') return <Matches matches={matches} favs={favs} setFavs={setFavs} openProfile={openProfile} setScreen={nav} matchPeople={matchPeople}/>;
  if(screen==='chats') return <Chats chats={chats} setScreen={nav} openChat={openChat}/>;
  if(screen.startsWith('legal:')) return <LegalScreen kind={screen.split(':')[1]} back={()=>setScreen('profile')}/>;
  if(screen==='profile') return <Me premium={premium} credits={credits} slots={slots} setScreen={setScreen} onSignOut={async()=>{if(backend.isLive)await backend.signOut();setSlots([]);setMatches([]);setChats([]);setScreen('auth')}}/>;
  return <Discover slots={slots} seen={seen} setSeen={setSeen} favs={favs} setFavs={setFavs} matches={matches} setMatches={setMatches} chats={chats} setChats={setChats} openProfile={openProfile} openMatch={openMatch} filters={filters} setScreen={nav} people={backend.isLive?livePeople:PEOPLE} shareProfile={shareProfile}/>;
}

const authInput = {
  height:42,borderRadius:12,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,
  color:C.text,paddingHorizontal:12,marginTop:6,fontSize:13
};
const authMiniButton = {
  flex:1,height:40,borderRadius:12,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,
  flexDirection:'row',alignItems:'center',justifyContent:'center'
};
const authMiniText = {color:C.text,fontSize:11,fontWeight:'800',marginLeft:5};

const input = {
  height:54,borderRadius:15,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,
  color:C.text,paddingHorizontal:15,marginTop:10,fontSize:16
};
const smallBadge={backgroundColor:'rgba(10,10,12,.62)',borderRadius:999,paddingHorizontal:10,paddingVertical:7};
const smallBadgeText={color:'#fff',fontWeight:'800',fontSize:12};
const circleAction={width:58,height:58,borderRadius:29,backgroundColor:'rgba(20,18,20,.92)',borderWidth:1,borderColor:'#4B4244',alignItems:'center',justifyContent:'center',marginHorizontal:6};
const likeAction={width:72,height:72,borderRadius:36,backgroundColor:C.salmon,alignItems:'center',justifyContent:'center',marginHorizontal:6};
