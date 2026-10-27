import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('teacher and 3/4/5-person group workflows',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'eco-test-'));const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3099',DB_PATH:join(dir,'test.db')},stdio:['ignore','pipe','pipe']});
 try {await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',()=>reject(Error('server exited')))});
 function client(){let cookie='';return async(path,body)=>{const r=await fetch('http://127.0.0.1:3099/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',cookie},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()}}}
 const teacher=client();assert.equal((await teacher('auth',{email:'teacher@example.org',password:'testing-password',register:true})).status,200);
 const {data:{code}}=await teacher('create',{});
 for(const size of [3,4,5]){const students=Array.from({length:size},client);await students[0]('join',{code,size,nickname:'대표'});let s=(await students[0]('state')).data;const gc=s.group.code;
 for(let i=1;i<size;i++)assert.equal((await students[i]('join',{code:gc,nickname:'학생'+i})).status,200);
 assert.equal((await students[1]('advance',{})).status,400);
 await students[0]('advance',{});const found=[];for(const c of students){s=(await c('state')).data;found.push(...s.clues.map(x=>x.i));assert.equal(s.solution,null)}assert.deepEqual(found.sort(),[0,1,2,3,4]);
 await students[0]('advance',{});await students[0]('advance',{});assert.equal((await students[0]('submit',{})).status,400);
 assert.equal((await students[0]('submit',{causes:[0,1,2,3],clues:[0,1,2,3,4],measures:[0,1,2],idea:'빗물 정원',action:'쓰레기 분리 배출'})).status,200);
 s=(await students[2]('state')).data;assert.equal(s.group.phase,3);assert.equal(s.solution.length,5);assert.equal(s.group.answer.idea,'빗물 정원');
 }
 assert.equal((await teacher('state')).data.classes[0].groups.length,3);
 }finally{server.kill();await new Promise(r=>server.once('exit',r));rmSync(dir,{recursive:true,force:true})}
});
