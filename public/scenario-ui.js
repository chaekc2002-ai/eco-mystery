// Escape first: scenario prose and student answers are never interpreted as HTML.
function prose(source='') {
  const inline=s=>esc(s).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
  let table=false;
  const result=source.split('\n').map(raw=>{
    const line=raw.replace(/^>\s?/, '').trim();
    if(line.startsWith('|')) {
      if(/^\|[\s:|-]+\|$/.test(line))return '';
      const cells=line.split('|').slice(1,-1).map(c=>`<td>${inline(c.trim())}</td>`).join('');
      const prefix=table?'':'<div class="table-wrap"><table>';table=true;
      return `${prefix}<tr>${cells}</tr>`;
    }
    let prefix='';if(table){prefix='</table></div>';table=false}
    if(!line||line==='---')return prefix;
    const heading=line.match(/^#{1,4}\s+(.*)/);
    if(heading)return prefix+`<h3>${inline(heading[1])}</h3>`;
    if(line.startsWith('□'))return prefix+`<label class="check"><input type="checkbox"><span>${inline(line.slice(1))}</span></label>`;
    return prefix+`<p>${inline(line.replace(/^- /,'• '))}</p>`;
  }).join('');
  return `<div class="prose">${result}${table?'</table></div>':''}</div>`;
}
function illustration(id) {
  const frame=body=>`<svg class="clue-picture" viewBox="0 0 460 170" role="img" aria-label="${esc(id)} 단서 자료 그림">${body}</svg>`;
  if(id==='4-A')return frame('<text x="20" y="25">오후 4–6시 강수량 비교</text><rect x="90" y="122.667" width="70" height="13.333" fill="#91b8a7"/><rect x="290" y="36" width="70" height="100" fill="#3b7984"/><text x="104" y="110">8mm</text><text x="296" y="27">60mm</text><text x="70" y="158">지난주 비 온 날</text><text x="282" y="158">어제 폭우</text>');
  if(id==='1-A')return frame('<rect x="25" y="45" width="170" height="80" fill="#c2cbd1"/><text x="55" y="90">포장된 주차장</text><path d="M200 100L320 130" stroke="#3786a3" stroke-width="12"/><path d="M300 111L330 132L295 145" fill="#3786a3"/><rect x="340" y="95" width="100" height="55" fill="#e3c898"/><text x="355" y="127">시장 도로</text><text x="25" y="27">오후 5시 20분 · 낮은 출입구를 지나 흐르는 물</text>');
  if(id==='3-A')return frame('<rect x="110" y="20" width="240" height="130" rx="10" fill="#9bada9"/><path d="M145 40v90m40-90v90m40-90v90m40-90v90m40-90v90" stroke="#405b56" stroke-width="12"/><ellipse cx="180" cy="60" rx="45" ry="18" fill="#b7a15e"/><ellipse cx="270" cy="105" rx="40" ry="20" fill="#988452"/><path d="M220 30l60 10-10 35-45-10Z" fill="#f2ede0"/><text x="18" y="165">낙엽과 비닐이 빗물받이 구멍을 가리고 있어요.</text>');
  if(id==='5-A')return frame('<rect x="15" y="20" width="190" height="100" fill="#d7e7c9"/><text x="30" y="47">몇 년 전 · 흙과 나무</text><circle cx="70" cy="80" r="20" fill="#679b6b"/><circle cx="140" cy="80" r="20" fill="#679b6b"/><text x="218" y="75">→</text><rect x="255" y="20" width="190" height="100" fill="#c6ced2"/><text x="270" y="47">지금 · 포장된 주차장</text><text x="25" y="150">낮은 시장 ↓</text><text x="275" y="150">낮은 시장 ↓ 물의 흐름</text>');
  if(id==='5-B')return frame('<text x="20" y="25">같은 양의 물을 천천히 부어요</text><rect x="25" y="65" width="170" height="70" fill="#c2a47b"/><rect x="265" y="65" width="170" height="70" fill="#bfc8ce"/><text x="60" y="90">흙 상자</text><text x="285" y="90">포장재 상자</text><text x="85" y="125" font-size="32">↓</text><text x="370" y="125" font-size="32">→</text><text x="35" y="160">일부가 스며들어요</text><text x="270" y="160">표면을 따라 흘러요</text>');
  if(id==='2-A')return frame('<rect x="35" y="10" width="390" height="150" rx="10" fill="#fff9dd"/><text x="55" y="45">관찰 메모 · 지난달 비가 온 날</text><text x="55" y="78">3:00 물 고임 → 3:30 출입구로 흐름</text><text x="55" y="110">4:00 비가 약해지자 고인 물이 줄어듦</text><text x="55" y="140">“주인에게 주차장 물 고임을 이야기함.”</text>');
  return '';
}
function scenarioAnswer(a,s) {
  return `<p><b>원인:</b> ${a.causes.map(i=>esc(s.causes[i])).join(' / ')}</p>
  <p><b>근거:</b> ${a.clues.map(i=>esc(s.evidence?.[i]||'단서 '+(i+1))).join(' / ')}</p>
  <p><b>대책:</b> ${a.measures.map(i=>esc(s.measures[i])).join(' / ')}</p>
  ${a.reason?`<p><b>대책을 고른 이유:</b> ${esc(a.reason)}</p>`:''}
  <p><b>추가 아이디어:</b> ${esc(a.idea||'작성하지 않음')}</p>${a.action?`<p><b>이전 모둠 실천:</b> ${esc(a.action)}</p>`:''}`;
}
function teacherScenario() {
  view='teacher';const s=state.scenario;
  app.innerHTML=`<div class="intro"><div><span class="eyebrow">TEACHER'S ROOM</span><h1>우리 반 탐구 교실</h1><p>${esc(s.title)}</p></div><button onclick="createClass()">+ 새 수업 열기</button></div>
  <details class="card"><summary>수업 진행 안내 · 교사용 해설</summary>
  <p>접속 5분 → 각자 읽기 5분 → 질문 4분 → 조사 4분 → 마지막 공유 3분 → 토론·제출 7분 → 진상·개인 약속·마무리 12분. 총 40분을 목표로 조절하세요. 실제 읽기 시간은 수업에서 확인해 주세요.</p>
  <p>3명: 주인 / 직원+상인 / 기상+환경. 4명: 주인 / 직원 / 상인 / 기상+환경. 5명: 각각 한 역할. 두 역할을 맡으면 인물 이름을 먼저 말합니다. 전체 다음 단계는 제출 화면에서 멈춥니다.</p>
  ${prose(s.solution)}${prose(s.wrapup)}<details><summary>전체 역할·단서 원문</summary>${s.roles.map(r=>`<h2>${esc(r.title)}</h2>${prose(r.text)}${r.clues.map(i=>`<h3>${esc(s.clues[i].id+' · '+s.clues[i].title)}</h3>${prose(s.clues[i].text)}`).join('')}`).join('')}</details></details>
  ${state.classes.length?'':'<section class="card"><h2>첫 수업을 열어 보세요.</h2><p>수업 코드는 모둠 대표에게 알려 주세요.</p></section>'}
  ${state.classes.slice().reverse().map(c=>`<section class="card" style="margin-top:20px"><h2>${esc(c.title)}</h2><p>${esc(c.scenario.title)} · ${new Date(c.date).toLocaleDateString('ko-KR')}</p><p>대표에게 알려 줄 수업 코드</p><div class="code">${c.code}</div><div class="row"><button class="secondary" onclick="control('${c.code}','time')">전체 시간 +2분</button><button class="secondary" onclick="control('${c.code}','next')">전체 다음 단계</button></div>
  ${c.groups.map(g=>`<details><summary>${esc(g.name)} · ${g.members.length}/${g.size}명 · ${g.started?esc(c.scenario.phases[g.phase]):'접속 중'}</summary><p>모둠 코드 ${g.code}</p>${g.answer?scenarioAnswer(g.answer,c.scenario):'<p>아직 제출하지 않았어요.</p>'}<h3>학생별 실천 약속</h3>${g.members.map(m=>`<p><b>${esc(m.nickname)}</b> · ${esc(m.pledge||'아직 정하지 않았어요.')}</p>`).join('')}</details>`).join('')}</section>`).join('')}`;
}
const cardViews = new Map();
function cardViewKey() {
 return state.group.code + ':' + state.roles.map(r=>r.title).join('|');
}
function cardViewState() {
 const key=cardViewKey();
 if(!cardViews.has(key))cardViews.set(key,{tab:'roles',read:new Set()});
 return cardViews.get(key);
}
function roleCards() {
 return state.roles.map(r=>`<article class="card role-card"><span class="eyebrow">나의 역할 카드</span><h2>${esc(r.title)}</h2>
 <div class="result"><b>핵심 사실 3줄 요약</b>${r.summary.map(t=>`<p>• ${esc(t)}</p>`).join('')}</div>
 ${prose(r.text.split('### 말하기 예시')[0])}</article>`).join('');
}
function clueCards() {
 const view=cardViewState();
 return state.roles.map(r=>`<section class="clue-set"><h2>${esc(r.title)}의 단서</h2>${r.clues.map(i=>{
  const c=state.clues.find(c=>c.i===i);
  return `<article class="clue"><span class="eyebrow">나의 단서 카드 ${esc(c.id)}</span><h3>${esc(c.title)}</h3>${illustration(c.id)}${prose(c.text)}<label class="check"><input type="checkbox" data-read-clue="${i}" ${view.read.has(i)?'checked':''}><span>이 단서를 읽고 친구에게 설명할 준비가 됐어요.</span></label></article>`;
 }).join('')}</section>`).join('');
}
function scriptCards() {
 return `<p class="hint">그대로 읽어도 좋고 내 말로 바꿔도 좋아요. 질문을 받으면 카드에 적힌 사실대로 답해요.</p>`+state.roles.map(r=>{
  const script=r.text.split('### 말하기 예시')[1]||'';
  const lines=script.split('\n').filter(line=>line.startsWith('>')&&line.slice(1).trim()).map(line=>line.replace(/^>\s?/,''));
  return `<article class="card script-card"><span class="eyebrow">${esc(r.title)} · 예시 대본</span><h2>${esc(r.title)}</h2><p class="dialogue-label">이렇게 소개해요</p><blockquote class="speech">“저는 ${esc(r.title.replace(':','인'))}입니다. 제가 알고 있는 일을 이야기할게요.”</blockquote><p class="dialogue-label">관련 질문을 받으면 이렇게 말해요</p>${lines.map(line=>`<blockquote class="speech">${esc(line)}</blockquote>`).join('')}<p class="dialogue-label">친구의 근거를 물어봐요</p><blockquote class="speech">“어떤 단서를 보고 그렇게 생각했나요?”</blockquote></article>`;
 }).join('');
}
function studentCardDesk() {
 const view=cardViewState();
 const tabs=[['roles','역할 카드',state.roles.length],['clues','단서 카드',state.clues.length],['scripts','예시 대본',state.roles.length]];
 return `<section class="card-desk" aria-label="나의 탐정 수첩"><div class="section-title"><h2>나의 탐정 수첩</h2><span>내가 맡은 인물의 자료</span></div>
 ${state.roles.length>1?'<p class="hint">두 역할을 맡았어요. 대본을 말하기 전에 어떤 인물인지 먼저 알려 주세요.</p>':''}
 <div class="card-tabs" role="tablist" aria-label="카드 종류">${tabs.map(([id,label,count])=>`<button type="button" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${view.tab===id}" tabindex="${view.tab===id?0:-1}" data-card-tab="${id}">${label} <span>${count}</span></button>`).join('')}</div>
 <section id="panel-roles" role="tabpanel" aria-labelledby="tab-roles" tabindex="0" ${view.tab==='roles'?'':'hidden'}>${roleCards()}</section>
 <section id="panel-clues" role="tabpanel" aria-labelledby="tab-clues" tabindex="0" ${view.tab==='clues'?'':'hidden'}><p id="read-progress" role="status">읽은 단서 ${view.read.size} / ${state.clues.length}개</p>${clueCards()}</section>
 <section id="panel-scripts" role="tabpanel" aria-labelledby="tab-scripts" tabindex="0" ${view.tab==='scripts'?'':'hidden'}>${scriptCards()}</section></section>`;
}
function selectCardTab(id) {
 cardViewState().tab=id;
 for(const tab of document.querySelectorAll('[data-card-tab]')) {
  const selected=tab.dataset.cardTab===id;
  tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
  document.getElementById('panel-'+tab.dataset.cardTab).hidden=!selected;
 }
}
document.addEventListener('click',event=>{
 const tab=event.target.closest('[data-card-tab]');if(tab)selectCardTab(tab.dataset.cardTab);
});
document.addEventListener('keydown',event=>{
 const tab=event.target.closest('[data-card-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();const tabs=[...document.querySelectorAll('[data-card-tab]')];
 let i=tabs.indexOf(tab);i=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
 selectCardTab(tabs[i].dataset.cardTab);tabs[i].focus();
});
document.addEventListener('change',event=>{
 if(!event.target.matches('[data-read-clue]'))return;
 const view=cardViewState(),i=Number(event.target.dataset.readClue);
 if(event.target.checked)view.read.add(i);else view.read.delete(i);
 document.getElementById('read-progress').textContent=`읽은 단서 ${view.read.size} / ${state.clues.length}개`;
});
function studentScenario() {
 view='student';const g=state.group,s=state.scenario;
 app.innerHTML=`<div class="intro"><div><span class="eyebrow">CASE 01 · 푸른달 마을</span><h1>${esc(g.name)}</h1><p>${g.members.map(m=>esc(m.nickname)).join(' · ')}</p></div><span class="pill">모둠 참여 코드 <b>${g.code}</b></span></div>
 ${!g.started?`<section class="card"><h2>탐정들이 모이고 있어요 (${g.members.length}/${g.size})</h2><p>모두 모이면 대표가 시작해요.</p>${state.leader?'<button onclick="advance()">모두 모였어요 · 시작하기</button>':'<p>대표가 시작하면 나의 역할이 나타나요.</p>'}</section>`:
 `<div class="steps">${s.phases.map((p,i)=>`<span class="${i===g.phase?'active':''}">${i+1}. ${esc(p)}</span>`).join('')}</div><div class="row"><span class="pill" id="timer"></span><span class="pill">${state.roles.map(r=>esc(r.title)).join(' + ')}</span></div>
 ${studentCardDesk()}
 ${g.phase===s.resultPhase?scenarioResult():`<details class="card"><summary>${esc(s.title)} · 공통 사건 소개와 약속</summary>${prose(s.intro)}</details>
 ${g.phase<s.submitPhase?`<section class="card"><h2>${esc(s.steps[g.phase].title)}</h2>${prose(s.steps[g.phase].text)}</section>`:scenarioSubmission()}

 ${state.leader&&g.phase<s.submitPhase?'<button class="next-step" onclick="advance()">모두 이야기를 나눴어요 · 다음 단계 →</button>':''}`}`}`;
 tick();
}
function scenarioSubmission() {
 if(!state.leader)return '<div class="hint">모둠의 의견을 함께 정해요. 대표가 원인·근거와 두 가지 대책을 제출합니다.</div>';
 const s=state.scenario;
 return `<form class="card" id="submit" style="max-width:none"><h2>우리 모둠의 추리 기록</h2><h3>1. 침수 피해가 커진 이유는? (관련 있는 것 모두)</h3>${checks('causes',s.causes)}
 <h3>2. 어떤 단서를 근거로 삼았나요? (두 개 이상)</h3>${checks('clues',s.evidence)}
 <h3>3. 마을이 먼저 추진할 대책은? (정확히 두 가지)</h3>${checks('measures',s.measures)}
 <label>두 대책을 고른 이유는 무엇인가요?<textarea name="reason" required maxlength="300" placeholder="조사한 단서와 연결해 한두 문장으로 적어 주세요."></textarea></label>
 <label>우리 모둠의 추가 아이디어 (선택)<textarea name="idea" maxlength="300"></textarea></label>
 <p>직접 쓴 답변은 자동 채점하지 않고 선생님과 함께 살펴봐요.</p><button>모둠의 추리 제출하기 →</button></form>`;
}
function scenarioResult() {
 const s=state.scenario;
 return `<section class="card"><span class="eyebrow">MYSTERY SOLVED</span><h2>단서가 모여 드러난 사건의 진상</h2>${prose(state.solution)}<h2>우리 모둠의 선택과 피드백</h2>${state.feedback.map(f=>`<div class="result">${prose(f)}</div>`).join('')}${scenarioAnswer(state.group.answer,s)}</section>
 <form class="card" id="pledge" style="max-width:none"><h2>내가 실천할 한 가지</h2>${state.pledge?`<div class="result"><b>나의 실천 약속</b><p>${esc(state.pledge)}</p><p>오늘 발견한 작은 실천이 우리 마을과 지구를 아끼는 시작이 될 수 있어요.</p></div>`:''}
 <p>나의 약속은 선생님에게 별명과 함께 표시됩니다. 다른 모둠원의 약속을 대신 제출하지 않아요.</p>
 ${s.pledges.map((p,i)=>`<label class="check"><input type="radio" name="choice" value="${i}" required ${state.pledge===p?'checked':''}><span>${esc(p)}</span></label>`).join('')}
 <label class="check"><input type="radio" name="choice" value="custom" ${state.pledge&&!s.pledges.includes(state.pledge)?'checked':''}><span>내가 직접 정할래요.</span></label>
 <label>내가 정한 실천 행동<textarea name="text" maxlength="300" placeholder="직접 정하기를 선택했다면 적어 주세요.">${state.pledge&&!s.pledges.includes(state.pledge)?esc(state.pledge):''}</textarea></label><button>${state.pledge?'실천 약속 수정하기':'나의 실천 약속 저장하기'}</button>
 <p>폭우 때 물이 찬 곳이나 배수로에 직접 접근하지 말고 어른에게 알려요.</p></form>`;
}
