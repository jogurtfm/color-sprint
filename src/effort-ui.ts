import {Board,EffortProfile,localDay} from './model';
import {FINISH_LEVELS,finishMultiplier,dailyScore,defaultEffort,effortFor,effortSignals,EFFORT_DIMENSIONS,EFFORT_LABELS} from './effort';

function el<K extends keyof HTMLElementTagNameMap>(root:HTMLElement,tag:K,text='',cls=''):HTMLElementTagNameMap[K]{const node=root.ownerDocument.createElement(tag);node.textContent=text;node.className=cls;root.append(node);return node;}
export const newEffortEditorState=()=>({scope:'task' as EffortProfile['scope'],drafts:new Map<string,{profile:EffortProfile;expected:EffortProfile|undefined}>()});
export function mountScore(root:HTMLElement,board:Board,day:string,open:()=>void,compact=false):void {
  const score=dailyScore(board,day),box=el(root,'div','','cs-arcade');box.setAttribute('aria-live','polite');
  if(compact){box.classList.add('cs-arcade-compact');const button=el(box,'button','','cs-rank-control');button.type='button';button.setAttribute('aria-label',`Effort profile. Rank ${score.rank}, ${score.points} points${score.next?', '+score.remaining+' to '+score.next:''}`);button.title='Open effort profile · trial daily rank';el(button,'b',score.rank,'cs-rank');el(button,'small',`${score.points} pt`);button.onclick=open;return;}
  el(box,'b',score.rank,'cs-rank');const line=el(box,'div');el(line,'strong',`${score.points} pt · effort score`);el(line,'small',score.next?`${score.remaining} to ${score.next} · trial ranks`:'SSS reached · no extra work required');
  const button=el(box,'button','Effort profile');button.type='button';button.onclick=open;
}
export function mountEffortEditor(root:HTMLElement,board:Board,day:string,locked:boolean,save:(profile:EffortProfile,expected:EffortProfile|undefined)=>Promise<void>,state=newEffortEditorState()):void {
  root.classList.add('cs-effort');el(root,'h2','Your effort profile');
  el(root,'p','How hard it is for you, not a judgment of worth. Open a task to rate its effort.');
  const rules=el(root,'details');el(rules,'summary','How scoring and daily review work');
  el(rules,'p','Rate starting friction, sustained attention, physical effort, emotional weight and uncertainty. Unknown is not easy. Task ratings override page ratings, then task-type ratings. Proposed rows do not change scores. Daily reflections and repeated pushes inform review, not automatic increases.');
  el(rules,'p','10 + 10 per rated difficulty level; unrated tasks use 20 pt (strength components 0). Manual points override the formula. Only task checkboxes earn points, not timers, logs, subtasks or moves. Current ratings also recalculate past days.');
  el(rules,'p','Trial ranks: C 10 · B 40 · A 70 · S 100 · SS 150 · SSS 200. No streak penalty, debt or requirement to fill the day.');
  el(rules,'p',`Today’s finish levels: ${FINISH_LEVELS.map(l=>`${l.emoji} ${l.label} ${finishMultiplier(board,l.id)}×`).join(' · ')}. Ordinary checks are unrated and earn base points. Edit the optional Finish Multipliers Markdown table (0–3). All levels count as one win; subtask levels add no duplicate task points.`);const label=el(root,'label','Profile scope '),scope=el(label,'select');scope.setAttribute('aria-label','Effort profile scope');
  for(const [value,name] of [['task','Individual tasks'],['page','Pages / areas'],['kind','Task types']]){const option=el(scope,'option',name);option.value=value;}
  scope.value=state.scope;
  const list=el(root,'div');
  const render=()=>{list.replaceChildren();const kind=scope.value as EffortProfile['scope'];const matches=kind==='task'?board.tasks.map(t=>t.id):[...new Set(board.tasks.map(t=>kind==='page'?t.page:t.kind))];
    for(const match of matches){const task=board.tasks.find(t=>kind==='task'?t.id===match:kind==='page'?t.page===match:t.kind===match)!;const key=kind+'/'+match,cached=state.drafts.get(key);const expected=cached?cached.expected:board.effortProfiles.find(p=>p.scope===kind&&p.match===match);
      const inherited=kind==='task'?effortFor(board,task).profile:null;
      const initial:EffortProfile=cached?.profile||expected||{...(inherited||defaultEffort(task)),...(kind==='task'?{}:{friction:null,attention:null,physical:null,emotional:null,uncertainty:null}),id:`effort-${kind}-${board.tasks.indexOf(task)}-${task.id}`,scope:kind,match,status:'proposed',reviewed:'-',notes:inherited?.scope==='task'?inherited.notes:'Not rated yet.'};
      const details=el(list,'details','','cs-effort-item');const summary=el(details,'summary',`${kind==='task'?task.title:match} · ${kind==='task'?effortFor(board,task).points+' pt · ':''}${expected?.status||'not confirmed'}`);
      const signal=kind==='task'?effortSignals(board,task):null;if(signal?.review)el(details,'p',`${signal.moves} recorded pushes: review the first step, timing, dependencies or effort rating. This is not proof of avoidance.`,'cs-effort-signal');
      const form=el(details,'form');const fields=new Map<string,HTMLSelectElement>();
      for(let i=0;i<EFFORT_DIMENSIONS.length;i++){const key=EFFORT_DIMENSIONS[i],wrap=el(form,'label',EFFORT_LABELS[i]),input=el(wrap,'select');input.name=key;input.setAttribute('aria-label',`${EFFORT_LABELS[i]} for ${kind==='task'?task.title:match}`);for(const [value,text] of [['-','Unknown'],['0','0 · Easy'],['1','1 · Light'],['2','2 · Moderate'],['3','3 · High']]){const option=el(input,'option',text);option.value=value;}input.value=initial[key]===null?'-':String(initial[key]);input.disabled=locked;fields.set(key,input);}
      const pointLabel=el(form,'label','Points override (blank = auto)'),points=el(pointLabel,'input');points.name='points';points.type='number';points.min='0';points.max='200';points.step='1';points.value=initial.points===null?'':String(initial.points);points.disabled=locked;
      const noteLabel=el(form,'label','Your context / evidence'),notes=el(noteLabel,'textarea');notes.name='notes';notes.maxLength=2000;notes.value=initial.notes;notes.disabled=locked;
      const statusLabel=el(form,'label','Review status'),status=el(statusLabel,'select');for(const [value,name] of [['confirmed','Confirm my rating'],['proposed','Keep as proposal only']]){const option=el(status,'option',name);option.value=value;}status.disabled=locked;
      const button=el(form,'button','Save effort profile');button.type='submit';button.disabled=locked;
      if(cached){status.value=cached.profile.status;details.open=true;}
      const result=el(form,'p',cached?'Unsaved draft retained in this open app; save to sync.':'');result.setAttribute('role','status');let base=expected;
      const read=()=>{const p={...initial,status:status.value as EffortProfile['status'],reviewed:localDay(),points:points.value===''?null:Number(points.value),notes:notes.value.replace(/[\r\n]+/g,' ').trim()};for(const key of EFFORT_DIMENSIONS)p[key]=fields.get(key)!.value==='-'?null:Number(fields.get(key)!.value);return p;};
      const remember=()=>state.drafts.set(key,{profile:read(),expected:base});form.oninput=remember;form.onchange=remember;
      form.onsubmit=async event=>{event.preventDefault();if(locked||button.disabled||!form.reportValidity())return;button.disabled=true;result.textContent='Saving…';const p=read();state.drafts.delete(key);try{await save(p,base);base=p;result.textContent='Saved to Markdown.';summary.textContent=`${kind==='task'?task.title:match} · saved ${p.status}`;}catch(error){state.drafts.set(key,{profile:p,expected:base});result.textContent=error instanceof Error?error.message:String(error);}finally{button.disabled=locked;}};
    }
  };scope.onchange=()=>{state.scope=scope.value as EffortProfile['scope'];render();};render();
}
