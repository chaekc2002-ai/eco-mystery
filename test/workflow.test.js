import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createClient} from '@libsql/client';
import {current,assignedRoles,feedbackFor} from '../scenarios/index.js';

test('scenario assignments include every role and all eleven clues',()=>{
 for(const size of [3,4,5]) {
  const assigned=Array.from({length:size},(_,i)=>assignedRoles(current,size,i));
  assert.deepEqual(assigned.flat().map(r=>r.title),current.roles.map(r=>r.title));
  assert.deepEqual(assigned.flat().flatMap(r=>r.clues),Array.from({length:11},(_,i)=>i));
  assert.ok(assigned.flat().every(r=>r.summary.length===3));
 }
 assert.deepEqual(assignedRoles(current,3,1).map(r=>r.title),['가게 직원: 이다온','시장 상인: 박하늘']);
 assert.deepEqual(assignedRoles(current,4,3).map(r=>r.title),['기상 관찰자: 최구름','마을 환경 조사자: 정초록']);
});
test('feedback distinguishes unsupported claims and all three policy combinations',()=>{
 const base={causes:[0,1,2],clues:[0,1],measures:[0,1]};
 assert.ok(feedbackFor(current,base).join('').includes('여러 단서를 연결했어요'));
 assert.ok(feedbackFor(current,base).join('').includes('마을의 침수 피해에 대비하는 방법'));
 assert.ok(feedbackFor(current,{...base,measures:[3,4]}).join('').includes('기후변화에 대응하는 생활 속 행동'));
 assert.ok(feedbackFor(current,{...base,measures:[2,3]}).join('').includes('두 가지 관점을 함께'));
 const wrong=feedbackFor(current,{...base,causes:[3,4],clues:[0,6]}).join('');
 for(const text of ['다른 자료도','쪽지는 조사를 시작','폭우와 침수 피해를 구분','쪽지는 질문의 시작','다른 자료와도 비교'])assert.ok(wrong.includes(text),text);
});
test('new and legacy classroom workflows, private cards and individual pledges',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'eco-test-'));
 const database=createClient({url:'file:'+join(dir,'test.db')});
 await database.execute('CREATE TABLE store (key TEXT PRIMARY KEY,value TEXT)');
 await database.execute({sql:'INSERT INTO store VALUES (?,?)',args:['LEGACY',JSON.stringify({kind:'class',code:'LEGACY',owner:'teacher@example.org',title:'이전 수업',groups:[],date:new Date().toISOString()})]});
 const server=spawn(process.execPath,['server.js'],{env:{...process.env,VERCEL:'',TURSO_DATABASE_URL:'',TURSO_AUTH_TOKEN:'',PORT:'3099',DB_PATH:join(dir,'test.db')},stdio:['ignore','pipe','pipe']});
 try {
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',()=>reject(Error('server exited')))});
  function client(){let cookie='';return async(path,body)=>{
   const r=await fetch('http://127.0.0.1:3099/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',cookie},body:body?JSON.stringify(body):undefined});
   if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};
  }}
  const teacher=client();assert.equal((await teacher('auth',{email:'teacher@example.org',password:'testing-password',register:true})).status,200);
  const {data:{code}}=await teacher('create',{});
  for(const size of [3,4,5]) {
   const students=Array.from({length:size},client);
   await students[0]('join',{code,size,nickname:'대표'});
   let s=(await students[0]('state')).data;const gc=s.group.code;
   assert.deepEqual(s.roles,[]);assert.deepEqual(s.clues,[]);assert.equal(s.solution,null);
   assert.equal((await students[0]('pledge',{choice:0})).status,400);
   for(let i=1;i<size;i++)assert.equal((await students[i]('join',{code:gc,nickname:'학생'+i})).status,200);
   assert.equal((await students[1]('advance',{})).status,400);
   await students[0]('advance',{});
   const found=[];
   for(let i=0;i<size;i++) {
    s=(await students[i]('state')).data;found.push(...s.clues.map(x=>x.i));assert.equal(s.solution,null);assert.equal(s.feedback,null);
    assert.deepEqual(s.roles.map(r=>r.title),assignedRoles(current,size,i).map(r=>r.title));
    assert.equal(s.scenario.roles,undefined);assert.equal(s.scenario.solution,undefined);assert.equal(s.group.members[0].id,undefined);
   }
   assert.deepEqual(found.sort((a,b)=>a-b),Array.from({length:11},(_,i)=>i));
   for(let phase=1;phase<=4;phase++){await students[0]('advance',{});assert.equal((await students[0]('state')).data.group.phase,phase)}
   await teacher('control',{code,action:'next'});assert.equal((await students[0]('state')).data.group.phase,4);
   const good={causes:[0,1,2],clues:[0,1,2,3],measures:[0,3],reason:'배수로 사진과 기후변화 자료를 비교했어요.',idea:'빗물 정원'};
   for(const bad of [{clues:[0]},{clues:[0,0]},{measures:[0]},{measures:[0,1,2]},{measures:[1,1]},{reason:''},{causes:[5]}])assert.equal((await students[0]('submit',{...good,...bad})).status,400);
   assert.equal((await students[1]('submit',good)).status,400);
   assert.equal((await students[0]('submit',good)).status,200);
   s=(await students[2]('state')).data;assert.equal(s.group.phase,5);assert.ok(s.solution.includes('가게 직원 이다온'));assert.equal(s.group.answer.reason,good.reason);
   assert.ok(s.feedback.join('').includes('두 가지 관점을 함께'));
   assert.equal((await students[1]('pledge',{choice:'custom',text:''})).status,400);
   assert.equal((await students[1]('pledge',{choice:'custom',text:'불을 끄겠어요.'})).status,200);
   assert.equal((await students[2]('pledge',{choice:2})).status,200);
   assert.equal((await students[0]('state')).data.pledge,null);
   assert.equal((await students[1]('state')).data.pledge,'불을 끄겠어요.');
   const teacherState=(await teacher('state')).data;
   const group=teacherState.classes.find(c=>c.code===code).groups.find(g=>g.code===gc);
   assert.equal(group.members[1].pledge,'불을 끄겠어요.');assert.equal(group.members[0].id,undefined);
  }
  // No version field means an old class. Its original role distribution and answer indices remain valid.
  const old=Array.from({length:3},client);await old[0]('join',{code:'LEGACY',size:3,nickname:'이전 대표'});
  const gc=(await old[0]('state')).data.group.code;
  for(let i=1;i<3;i++)await old[i]('join',{code:gc,nickname:'이전 학생'+i});
  for(let i=0;i<3;i++)await old[0]('advance',{});
  assert.equal((await old[0]('submit',{causes:[0,1,2,3],clues:[0,1,2,3,4],measures:[0,1,2],idea:'이전 답변'})).status,200);
  const legacy=(await old[2]('state')).data;assert.equal(legacy.group.phase,3);assert.equal(legacy.solution.length,5);assert.equal(legacy.scenario.id,'legacy');
  assert.equal((await teacher('state')).data.classes.find(c=>c.code==='LEGACY').groups[0].answer.idea,'이전 답변');
 }finally{server.kill();await new Promise(r=>server.once('exit',r));database.close();rmSync(dir,{recursive:true,force:true})}
});
