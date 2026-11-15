import React,{useEffect,useRef,useState}from'react';
import{ArrowLeft,Award,Bell,MessageCircle,Send,ShieldCheck,Smile,Trophy,Users,X}from'lucide-react';

const BLOCKED_WORDS=new Set([
 'fuck','fucker','fucking','motherfucker','shit','shitty','bullshit','bitch','bitches','bastard','asshole','dickhead','cunt','piss off','slut','whore','nigger','nigga','retard',
 'punda','pundai','thevdiya','thevidiya','otha','otha dei','ommala','omala','mayiru','mayeeru','baadu','baadu paiya','koothi','poolu','soothu','sunni','sunniya','otha dei','otha punda','otha poda',
 'madarchod','behenchod','bhenchod','chutiya','gaand','randi','harami','lund','bhosdi','puta','puto','mierda','coño','joder','cabron','putain','merde','connard','arschloch','scheisse','kurwa','chuj','blyat'
]);
const BLOCKED_TAMIL_SCRIPT=['புண்டை','தேவடியா','ஒத்தா','மயிரு','கூதி','பூலு'];
const BLOCKED_PHRASES=['piss off','otha dei','baadu paiya','otha punda'];
const EMOJIS=['😀','😄','😂','🥲','😊','😍','😎','🥳','🤔','🙏','👏','🔥','💪','🏋️','❤️','👍','👎','✅','🎉','🤝','😅','😮','💯','🙌'];
const MEMBER_NAME_COLORS=['#ff5252','#ff9f43','#c678dd','#42c7f5','#57d68d','#f3ce48','#7b9cff','#f27aa8'];
const phonePattern=/(?:\+?\d[\s().-]*){7,}/;
const linkPattern=/(?:https?:\/\/|www\.)|(?:[\w-]+\.)+[a-z]{2,63}(?:[/:?#\s)\]}]|$)/i;
const mergeChatMessages=(...groups)=>{const rows=new Map();groups.flat().forEach(message=>rows.set(message.client_nonce||message.id,message));return [...rows.values()].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).slice(-100)};
const initialFor=name=>String(name||'RK').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase();

export function chatMessageIssue(value){
 const text=String(value||'').normalize('NFKC').trim();
 if(!text)return 'Type a message first.';
 if(text.length>500)return 'Keep messages within 500 characters.';
 if(linkPattern.test(text))return 'Links are not allowed in Global Chat. Text messages only.';
 if(phonePattern.test(text))return 'Phone numbers are not allowed. Keep personal contact details private.';
 const words=text.toLocaleLowerCase().replace(/[’']/g,'').split(/[^\p{L}\p{N}]+/u).filter(Boolean),normalized=words.join(' ');
 if(BLOCKED_PHRASES.some(phrase=>normalized.includes(phrase))||words.some(word=>BLOCKED_WORDS.has(word))||BLOCKED_TAMIL_SCRIPT.some(word=>text.includes(word)))return 'Please keep the chat respectful. This message contains language that is not allowed.';
 return '';
}

export function GlobalChatNotifications({account,page,go,setToast,supabase}){
 const pageRef=useRef(page),goRef=useRef(go);pageRef.current=page;goRef.current=go;
 useEffect(()=>{
  if(!account?.id)return;
  const channel=supabase.channel('rk-fitness-global-chat-alerts').on('postgres_changes',{event:'INSERT',schema:'public',table:'global_chat_messages'},payload=>{
   const message=payload.new;if(!message||message.sender_id===account.id||pageRef.current==='globalchat')return;
   const title=String(message.display_name||'RK FITNESS member').slice(0,60),body=String(message.body||'').slice(0,160);
   setToast(`RK FITNESS · ${title}: ${body}`);setTimeout(()=>setToast(current=>current===`RK FITNESS · ${title}: ${body}`?'':current),4500);
   if('Notification'in window&&Notification.permission==='granted'){
    const notification=new Notification('RK FITNESS · Global Chat',{body:`${title}: ${body}`,icon:'/icons/rk-fitness-app-192-v2.png',tag:`rk-chat-${message.id}`});
    notification.onclick=()=>{window.focus();goRef.current('globalchat');notification.close()};
   }
  }).subscribe();
  return()=>{supabase.removeChannel(channel)};
 },[account?.id,supabase,setToast]);
 return null;
}

export default function GlobalChat({supabase,user,displayName,go}){
 const [messages,setMessages]=useState([]),[text,setText]=useState(''),[loading,setLoading]=useState(true),[sending,setSending]=useState(false),[status,setStatus]=useState('connecting'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[warning,setWarning]=useState(''),[emojiOpen,setEmojiOpen]=useState(false),[profiles,setProfiles]=useState({}),[selectedProfile,setSelectedProfile]=useState(null),[profileLoading,setProfileLoading]=useState(false);
 const listRef=useRef(null),userRef=useRef(user),requestedProfiles=useRef(new Set());userRef.current=user;
 useEffect(()=>{
  let live=true;
  if(!user?.id){setLoading(false);setError('Log in to join the RK FITNESS community chat.');return()=>{live=false}};
  (async()=>{
   const{data,error:loadError}=await supabase.from('global_chat_messages').select('id,client_nonce,sender_id,display_name,body,created_at').order('created_at',{ascending:false}).limit(100);
   if(!live)return;
   if(loadError){setError('Global Chat database setup is not finished yet. Run the RK FITNESS chat SQL file in Supabase, then reload.');setLoading(false);return}
   setMessages(current=>mergeChatMessages((data||[]).reverse(),current));setLoading(false);
  })();
  const channel=supabase.channel('rk-fitness-global-chat-room').on('postgres_changes',{event:'INSERT',schema:'public',table:'global_chat_messages'},payload=>{
   const incoming=payload.new;if(!live||!incoming)return;requestedProfiles.current.delete(incoming.sender_id);setProfiles(current=>{const next={...current};delete next[incoming.sender_id];return next});setMessages(current=>mergeChatMessages(current,[incoming]));
  }).subscribe(channelStatus=>{if(live)setStatus(channelStatus==='SUBSCRIBED'?'connected':channelStatus==='CHANNEL_ERROR'?'offline':'connecting')});
  return()=>{live=false;supabase.removeChannel(channel)};
 },[user?.id,supabase]);
 useEffect(()=>{const node=listRef.current;if(node)node.scrollTop=node.scrollHeight},[messages.length]);
 useEffect(()=>{
  const ids=[...new Set(messages.map(message=>message.sender_id).filter(Boolean))].filter(id=>!requestedProfiles.current.has(id));
  if(!ids.length)return;
  ids.forEach(id=>requestedProfiles.current.add(id));
  supabase.rpc('get_global_chat_member_profiles',{member_ids:ids}).then(({data,error:profileError})=>{
   if(profileError){ids.forEach(id=>requestedProfiles.current.delete(id));return}
   setProfiles(current=>({...current,...Object.fromEntries((data||[]).map(profile=>[profile.user_id,profile]))}));
  });
 },[messages,supabase]);
 const send=async event=>{
  event?.preventDefault();if(sending)return;
  const body=text.trim(),issue=chatMessageIssue(body);if(issue){setWarning(issue);return}
  const currentUser=userRef.current;if(!currentUser?.id){setError('Please log in again to send a message.');return}
  const nonce=crypto.randomUUID(),optimistic={id:`pending-${nonce}`,client_nonce:nonce,sender_id:currentUser.id,display_name:String(displayName||'RK Athlete').trim().slice(0,60)||'RK Athlete',body,created_at:new Date().toISOString()};
  setSending(true);setText('');setMessages(current=>[...current,optimistic].slice(-100));setError('');
  const{data,error:sendError}=await supabase.from('global_chat_messages').insert({client_nonce:nonce,sender_id:currentUser.id,display_name:optimistic.display_name,body}).select('id,client_nonce,sender_id,display_name,body,created_at').single();
  if(sendError){setMessages(current=>current.filter(item=>item.client_nonce!==nonce));setText(body);const serverMessage=String(sendError.message||'').toLowerCase();if(/respectful|language that is not allowed|links are not allowed|phone numbers are not allowed|500 characters/.test(serverMessage))setWarning(sendError.message);else setError(sendError.code==='42P01'?'Chat setup SQL has not been run in Supabase yet.':'Message did not send. Check your connection and try again.');}
  else{requestedProfiles.current.delete(currentUser.id);setProfiles(current=>{const next={...current};delete next[currentUser.id];return next});setMessages(current=>mergeChatMessages(current,[data]));}
  setSending(false);
 };
 const openMember=async id=>{
  setSelectedProfile({user_id:id});
  setProfileLoading(true);
  const{data,error:profileError}=await supabase.rpc('get_global_chat_member_profiles',{member_ids:[id]});
  setProfileLoading(false);
  if(profileError){setSelectedProfile({user_id:id,error:'Profile details are not ready yet. Run the chat profile SQL migration in Supabase.'});return}
  const found=data?.[0];if(found){setProfiles(current=>({...current,[id]:found}));setSelectedProfile(found)}else setSelectedProfile({user_id:id,error:'This profile is not available yet.'});
 };
 const enableNotifications=async()=>{if(!('Notification'in window)){setNotice('This browser does not support message notifications.');return}try{const permission=await Notification.requestPermission();setNotice(permission==='granted'?'Message notifications are enabled.':permission==='denied'?'Notifications are blocked in browser settings.':'Allow notifications to get message alerts.')}catch{setNotice('Could not enable notifications in this browser.')}};
 const addEmoji=emoji=>{setText(value=>`${value}${emoji}`);setEmojiOpen(false)};
 const colorByMember=Object.fromEntries(Object.values(profiles).sort((a,b)=>Number(b.level||1)-Number(a.level||1)||String(a.user_id).localeCompare(String(b.user_id))).map((member,index)=>[member.user_id,MEMBER_NAME_COLORS[index%MEMBER_NAME_COLORS.length]]));
 return <section className="global-chat-screen">
  <header className="global-chat-header"><button className="global-chat-back" aria-label="Back to Training" onClick={()=>go('home',true)}><ArrowLeft size={21}/></button><span className="global-chat-mark"><MessageCircle size={21}/></span><div><h1>Global Chat</h1><p><i className={status==='connected'?'is-online':''}/>{status==='connected'?'Community chat':status==='offline'?'Reconnecting…':'Connecting…'}</p></div><button className="global-chat-bell" title="Enable message notifications" aria-label="Enable message notifications" onClick={enableNotifications}><Bell size={19}/></button></header>
  {notice&&<div className="global-chat-notice" role="status"><Bell size={16}/><span>{notice}</span></div>}
  <div className="global-chat-notice"><ShieldCheck size={17}/><span>Text-only chat. Messages stay as sent; no edit or delete.</span></div>
  {error&&<div className="global-chat-error" role="status">{error}</div>}
  <div className="global-chat-messages" ref={listRef} aria-live="polite">{loading?<div className="global-chat-empty">Loading the community chat…</div>:messages.length===0?<div className="global-chat-empty"><Users size={34}/><b>Welcome to the community</b><span>Say hello and encourage someone’s workout today.</span></div>:messages.map(message=>{const own=message.sender_id===user?.id,profile=profiles[message.sender_id],shownName=profile?.display_name||(own?displayName||'You':message.display_name||'RK Athlete'),memberColor=colorByMember[message.sender_id]||'#b7ff00';return <article className={`global-chat-message ${own?'own':''}`} key={message.id}><button type="button" className="global-chat-member" style={{'--member-color':memberColor}} onClick={()=>openMember(message.sender_id)} aria-label={`View ${shownName} profile`}><span className="global-chat-avatar">{profile?.avatar_url?<img src={profile.avatar_url} alt="" loading="lazy"/>:initialFor(shownName)}</span><b>{shownName}</b><span className="global-chat-level">{profile?.level?`Lv ${profile.level}`:'Profile'}</span></button><p>{message.body}</p><time>{new Date(message.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time></article>})}</div>
  {emojiOpen&&<div className="global-chat-emoji-picker" role="group" aria-label="Choose an emoji">{EMOJIS.map((emoji,index)=><button key={`${emoji}-${index}`} type="button" onClick={()=>addEmoji(emoji)} aria-label={`Add ${emoji}`}>{emoji}</button>)}</div>}
  <form className="global-chat-composer" onSubmit={send}><textarea value={text} onChange={event=>setText(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();send(event)}}} placeholder="Write a message…" aria-label="Text message" maxLength={500} rows={1}/><span className="global-chat-char-count">{text.length}/500</span><button className="global-chat-emoji-toggle" type="button" aria-label="Add emoji" aria-expanded={emojiOpen} onClick={()=>setEmojiOpen(value=>!value)}><Smile size={20}/></button><button className="global-chat-send" type="submit" disabled={sending||!text.trim()} aria-label="Send message"><Send size={19}/></button></form>
  {warning&&<div className="global-chat-warning-backdrop" onClick={()=>setWarning('')}><div className="global-chat-warning" role="alertdialog" aria-modal="true" aria-labelledby="global-chat-warning-title" onClick={event=>event.stopPropagation()}><span><ShieldCheck size={23}/></span><h2 id="global-chat-warning-title">Message not sent</h2><p>{warning}</p><button onClick={()=>setWarning('')}>Got it</button></div></div>}
  {selectedProfile&&<div className="global-chat-profile-backdrop" onClick={()=>setSelectedProfile(null)}><section className="global-chat-profile-card" role="dialog" aria-modal="true" aria-labelledby="global-profile-name" onClick={event=>event.stopPropagation()}><button className="global-chat-profile-close" onClick={()=>setSelectedProfile(null)} aria-label="Close profile"><X size={19}/></button>{profileLoading?<div className="global-chat-profile-loading">Loading profile…</div>:selectedProfile.error?<div className="global-chat-profile-loading">{selectedProfile.error}</div>:<><div className="global-chat-profile-cover"><span className="global-chat-profile-avatar">{selectedProfile.avatar_url?<img src={selectedProfile.avatar_url} alt=""/>:initialFor(selectedProfile.display_name)}</span></div><h2 id="global-profile-name">{selectedProfile.display_name}</h2><span className="global-chat-profile-rank">{selectedProfile.rank_name||'E Rank'} · Level {selectedProfile.level||1}</span><div className="global-chat-profile-stats"><span><b>{selectedProfile.workout_count||0}</b><small>Workouts</small></span><span><b>{selectedProfile.xp||0}</b><small>XP</small></span><span><b>{selectedProfile.achievements?.length||0}</b><small>Badges</small></span></div><div className="global-chat-profile-achievements"><h3><Trophy size={17}/> Badges & achievements</h3>{selectedProfile.achievements?.length?<div>{selectedProfile.achievements.map((badge,index)=><span key={`${badge.id}-${index}`}><i>{badge.type==='Rank'?<Award size={15}/>:<Trophy size={15}/>}</i>{badge.name}</span>)}</div>:<p>No badges unlocked yet. Keep training!</p>}</div></>}</section></div>}
 </section>;
}
