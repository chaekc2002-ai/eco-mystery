import http from 'node:http';
import {get,put,all} from './storage.js';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {current,scenarioFor,publicScenario,assignedRoles,feedbackFor} from './scenarios/index.js';
const id=()=>randomBytes(16).toString('hex');
const code=async()=>{let c;do{c=randomBytes(3).toString('hex').toUpperCase()}while(await get(c));return c};
function sessionCookie(res,t) {res.setHeader('Set-Cookie',`session=${t}; HttpOnly; SameSite=Strict; Path=/${process.env.VERCEL?'; Secure':''}`)}
function checkedChoices(values,max,min=1,exact=null) {
  return Array.isArray(values) && values.length>=min && (exact===null||values.length===exact) && new Set(values).size===values.length && values.every(i=>Number.isInteger(i)&&i>=0&&i<max);
}
function moveNext(g,s) {
  if(g.started&&g.phase<s.submitPhase){g.phase++;g.deadline=Date.now()+s.durations[g.phase]*60000}
}
export default async function handler(req,res) {
 const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value))};
 try {
  const path=new URL(req.url,'http://localhost').pathname;
  if(!path.startsWith('/api/')) {
   const file=path==='/'?'index.html':path.slice(1);
   if(!['index.html','app.js','scenario-ui.js','style.css'].includes(file)){res.writeHead(404);return res.end()}
   res.setHeader('Content-Type',file.endsWith('js')?'text/javascript':file.endsWith('css')?'text/css':'text/html');
   return res.end(readFileSync(new URL('public/'+file,import.meta.url)));
  }
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>16000)throw Error('입력이 너무 깁니다.')}
  const b=raw?JSON.parse(raw):{};
  const token=(req.headers.cookie||'').match(/session=([a-f0-9]+)/)?.[1];
  const session=token&&await get('session:'+token);
  const requireTeacher=()=>{if(session?.type!=='teacher')throw Error('교사 로그인이 필요합니다.')};
  if(path==='/api/auth') {
   const email=String(b.email||'').trim().toLowerCase();
   if(!email.includes('@')||String(b.password||'').length<8)throw Error('이메일과 8자 이상의 비밀번호를 입력하세요.');
   let user=await get('user:'+email);
   if(b.register){if(user)throw Error('이미 등록된 이메일입니다.');const salt=id();user={salt,hash:scryptSync(b.password,salt,64).toString('hex')};await put('user:'+email,user)}
   if(!user||!timingSafeEqual(Buffer.from(user.hash,'hex'),scryptSync(b.password,user.salt,64)))throw Error('로그인 정보를 확인하세요.');
   const t=id();await put('session:'+t,{type:'teacher',email});sessionCookie(res,t);return send(200,{ok:true});
  }
  if(path==='/api/logout'){res.setHeader('Set-Cookie','session=; Max-Age=0; Path=/');return send(200,{ok:true})}
  if(path==='/api/create') {
   requireTeacher();const c=await code();
   await put(c,{kind:'class',scenarioId:current.id,code:c,owner:session.email,title:String(b.title||'우리 반 환경 탐정단').slice(0,80),date:new Date().toISOString(),groups:[]});
   return send(200,{code:c});
  }
  if(path==='/api/join') {
   const nickname=String(b.nickname||'').trim().slice(0,20);if(!nickname)throw Error('별명을 입력하세요.');
   const room=await get(String(b.code||'').toUpperCase());
   if(!room||!['class','group'].includes(room.kind))throw Error('참여 코드를 확인하세요.');
   let g;
   if(room.kind==='class') {
    if(![3,4,5].includes(Number(b.size)))throw Error('모둠 인원은 3~5명입니다.');
    const c=await code();g={kind:'group',scenarioId:scenarioFor(room).id,code:c,classCode:room.code,name:String(b.name||'환경 탐정단').slice(0,30),size:Number(b.size),members:[],phase:0,started:false,deadline:null};
    room.groups.push(c);await put(room.code,room);
   }else g=room;
   if(g.started||g.members.length>=g.size)throw Error('이미 시작했거나 인원이 찬 모둠입니다.');
   const t=id();g.members.push({id:t,nickname});await put(g.code,g);await put('session:'+t,{type:'student',group:g.code,member:t});sessionCookie(res,t);return send(200,{ok:true});
  }
  if(path==='/api/state') {
   if(!session)return send(200,{type:'guest'});
   if(session.type==='teacher') {
    const classes=await Promise.all((await all()).filter(x=>x.kind==='class'&&x.owner===session.email).map(async c=>({
     ...c,scenario:publicScenario(scenarioFor(c)),
     groups:await Promise.all(c.groups.map(async key=>{
      const g=await get(key);
      const promises=await Promise.all(g.members.map(m=>get('pledge:'+g.code+':'+m.id)));
      return {...g,members:g.members.map((m,i)=>({nickname:m.nickname,pledge:promises[i]?.text||null}))};
     }))
    })));
    return send(200,{type:'teacher',classes,scenario:{...publicScenario(current),roles:current.roles,clues:current.clues,solution:current.solution,wrapup:current.wrapup}});
   }
   const g=await get(session.group),s=scenarioFor(g),index=g.members.findIndex(x=>x.id===session.member);
   const complete=g.phase===s.resultPhase;
   const base={type:'student',group:{...g,members:g.members.map(x=>({nickname:x.nickname})),answer:complete?g.answer:null},leader:index===0,scenario:publicScenario(s),phases:s.phases,causes:s.causes,measures:s.measures};
   if(s.id==='legacy')return send(200,{...base,role:s.roles[index],clues:g.started?s.clues.map((text,i)=>({text,i})).filter(x=>x.i%g.size===index):[],solution:complete?s.clues:null});
   const roles=g.started?assignedRoles(s,g.size,index):[];
   return send(200,{...base,roles,clues:roles.flatMap(r=>r.clues.map(i=>({...s.clues[i],i}))),solution:complete?s.solution:null,feedback:complete?feedbackFor(s,g.answer):null,pledge:(await get('pledge:'+g.code+':'+session.member))?.text||null});
  }
  if(path==='/api/control') {
   requireTeacher();const c=await get(b.code);if(!c||c.kind!=='class'||c.owner!==session.email)throw Error('수업 접근 권한이 없습니다.');
   if(!['time','next'].includes(b.action))throw Error('진행 명령을 확인하세요.');
   for(const gc of c.groups){const g=await get(gc),s=scenarioFor(g);if(g.started&&g.phase<s.resultPhase){if(b.action==='time')g.deadline=(g.deadline||Date.now())+120000;else moveNext(g,s);await put(gc,g)}}
   return send(200,{ok:true});
  }
  if(['/api/advance','/api/submit','/api/pledge'].includes(path)) {
   if(session?.type!=='student')throw Error('모둠에 참여하세요.');
   const g=await get(session.group),s=scenarioFor(g);
   if(path==='/api/pledge') {
    if(s.id==='legacy'||g.phase!==s.resultPhase)throw Error('결과를 확인한 뒤 실천 약속을 정하세요.');
    const text=b.choice==='custom'?String(b.text||'').trim():s.pledges[b.choice];
    if((b.choice!=='custom'&&!Number.isInteger(b.choice))||!text||text.length>300)throw Error('실천 행동을 선택하거나 300자 이내로 적어 주세요.');
    await put('pledge:'+g.code+':'+session.member,{text});return send(200,{ok:true});
   }
   if(g.members[0].id!==session.member)throw Error('대표만 진행할 수 있습니다.');
   if(path==='/api/submit') {
    if(!g.started||g.phase!==s.submitPhase)throw Error('모둠 답변 제출 단계에서 제출하세요.');
    const modern=s.id!=='legacy';
    if(!checkedChoices(b.causes,s.causes.length))throw Error('관련 원인을 하나 이상 선택하세요.');
    if(!checkedChoices(b.clues,modern?s.evidence.length:s.clues.length,modern?2:1))throw Error(modern?'서로 다른 근거를 두 개 이상 선택하세요.':'근거를 선택하세요.');
    if(!checkedChoices(b.measures,s.measures.length,1,modern?2:null))throw Error('대책을 서로 다르게 두 가지 선택하세요.');
    const reason=String(b.reason||'').trim();if(modern&&(!reason||reason.length>300))throw Error('두 대책을 고른 이유를 300자 이내로 적어 주세요.');
    g.answer={causes:b.causes,clues:b.clues,measures:b.measures,reason,idea:String(b.idea||'').slice(0,300),action:String(b.action||'').slice(0,300)};g.phase=s.resultPhase;
   }else if(!g.started){if(g.members.length!==g.size)throw Error('모둠원이 모두 참여한 뒤 시작하세요.');g.started=true;g.deadline=Date.now()+s.durations[0]*60000}
   else moveNext(g,s);
   await put(g.code,g);return send(200,{ok:true});
  }
  send(404,{error:'경로를 찾을 수 없습니다.'});
 }catch(e){send(400,{error:e.message})}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))http.createServer(handler).listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Eco mystery listening on port '+(process.env.PORT||3000)));
