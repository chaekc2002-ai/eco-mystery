import blueMoon from './blue-moon.json' with {type:'json'};
import * as legacy from './legacy.js';
export const current = {...blueMoon, submitPhase:4, resultPhase:5};
export function scenarioFor(record) {
  return record?.scenarioId === current.id ? current : legacy;
}
export function publicScenario(s) {
  if(s.id==='legacy') return {id:s.id,title:'초록마을 침수 사건',phases:s.phases,causes:s.causes,measures:s.measures,submitPhase:s.submitPhase,resultPhase:s.resultPhase};
  const {id,title,intro,steps,phases,causes,evidence,measures,pledges,submitPhase,resultPhase}=s;
  return {id,title,intro,steps,phases,causes,evidence,measures,pledges,submitPhase,resultPhase};
}
export function assignedRoles(s,size,index) {
  return s.assignment[size][index].map(i=>s.roles[i]);
}
export function feedbackFor(s,a) {
  const out=[s.feedback.causes[[0,1,2].every(i=>a.causes.includes(i))?0:1]];
  if(a.causes.includes(3)) out.push(s.feedback.causes[2]);
  if(a.causes.includes(4)) out.push(s.feedback.causes[3]);
  out.push(s.feedback.evidence[a.clues.filter(i=>i<6).length>=2?0:1]);
  if(a.clues.includes(6)) out.push(s.feedback.evidence[2]);
  const adaptation=a.measures.filter(i=>i<3).length;
  out.push(s.feedback.measures[adaptation===2?0:adaptation===0?1:2]);
  return out;
}
