import {Board,Task,Subtask,PlanningSetting,SuggestedTime,timeBlockFor,entryFor} from './model';
import {metricFor,metricProgress,subtaskMetricFor,subtaskProgress,scoringFor,taskType,TYPE_LABELS} from './progress';

function el<K extends keyof HTMLElementTagNameMap>(root:HTMLElement,tag:K,text=''):HTMLElementTagNameMap[K]{const node=root.ownerDocument.createElement(tag);node.textContent=text;root.append(node);return node;}
function field(root:HTMLElement,label:string,type:string,value:string,min?:string,max?:string){const wrap=el(root,'label',label+' '),input=el(wrap,'input');input.type=type;input.value=value;if(min)input.min=min;if(max)input.max=max;input.setAttribute('aria-label',label);return input;}
function submit(form:HTMLFormElement,locked:boolean,save:()=>Promise<void>){const button=el(form,'button','Save to Markdown');button.type='submit';button.disabled=locked;const result=el(form,'small');result.setAttribute('role','status');form.onsubmit=async event=>{event.preventDefault();if(button.disabled||!form.reportValidity())return;button.disabled=true;try{await save();result.textContent='Saved.';}catch(error){result.textContent=error instanceof Error?error.message:String(error);}finally{button.disabled=locked;}};}
export function mountProgressSettings(root:HTMLElement,b:Board,day:string,locked:boolean,save:(value:PlanningSetting|PlanningSetting[])=>Promise<void>){
  const box=el(root,'details');box.className='cs-progress-settings';el(box,'summary','Points, measurable goals & daily defaults');
  el(box,'p','Measured progress earns up to half its budget before Finish. Goal + explicit completion earns the other half. Effort ratings never multiply measured progress. Subtasks have separate points: fixed per step or their own measured goal. A roadmap parent needs all applicable steps. Rules are dated so activation does not rewrite earlier scores.');
  const current=scoringFor(b,day),form=el(box,'form');form.className='cs-rule-form';
  const since=field(form,'Apply rules from','date',day),rank=field(form,'Rank multiplier','number',String(current?.rankMultiplier??1.25),'1','3');rank.step='.05';
  const steps=field(form,'Points per completed step','number',String(current?.stepPoints??5),'0','50');steps.step='1';
  const preload=field(form,'Preload morning routine','checkbox','');preload.checked=true;
  el(form,'small','Includes Make Bed, Brush Teeth, Clean Kitchen and Mindfulness when present. Preload means flexible tasks, not calendar appointments. Existing explicit rows and checks always remain.');
  submit(form,locked,async()=>{const prior=b.scoringRules.find(r=>r.since===since.value),values:PlanningSetting[]=[{kind:'scoring',row:{id:prior?.id||'scoring-'+since.value,since:since.value,rankMultiplier:Number(rank.value),stepPoints:Number(steps.value)},expected:prior}];
    if(preload.checked)for(const task of b.tasks.filter(t=>t.page==='Morning'||['make-bed','brush-teeth','clean-kitchen'].includes(t.id))){const old=b.dailyDefaults.find(r=>r.taskId===task.id);values.push({kind:'daily',row:{taskId:task.id,since:old?.since||since.value,until:old?.until||'-',enabled:true},expected:old});}await save(values);});
  for(const task of b.tasks){const details=el(box,'details');el(details,'summary',task.title+' · '+taskType(b,task));const f=el(details,'form');f.className='cs-rule-form';
    const oldType=b.taskTypes.find(r=>r.taskId===task.id),typeLabel=el(f,'label','Task type '),type=el(typeLabel,'select');for(const label of [...new Set([...TYPE_LABELS,taskType(b,task)])]){const option=el(type,'option',label);option.value=label;}type.value=taskType(b,task);
    const oldDaily=b.dailyDefaults.find(r=>r.taskId===task.id),daily=field(f,'Preload each day','checkbox','');daily.checked=!!oldDaily?.enabled;
    const oldGoal=metricFor(b,task,day),goal=field(f,'Measured target (blank = unchanged)','number',oldGoal?String(oldGoal.target):'','0.01','100000');goal.step='any';
    const unitLabel=el(f,'label','Measured unit '),unit=el(unitLabel,'select');for(const u of ['reps','sec','min','mi','pages','count']){const option=el(unit,'option',u);option.value=u;}unit.value=oldGoal?.unit||(task.id==='plank'?'sec':'reps');
    const points=field(f,'Measured points budget','number',String(oldGoal?.points??20),'0','200');points.step='1';const start=field(f,'Changes start','date',day);
    submit(f,locked,async()=>{const values:PlanningSetting[]=[{kind:'type',row:{taskId:task.id,type:type.value},expected:oldType},{kind:'daily',row:{taskId:task.id,since:oldDaily?.since||start.value,until:oldDaily?.until||'-',enabled:daily.checked},expected:oldDaily}];if(goal.value!=='')values.push({kind:'metric',row:{taskId:task.id,target:Number(goal.value),unit:unit.value,points:Number(points.value),since:start.value},expected:b.metricGoals.find(r=>r.taskId===task.id&&r.since===start.value)});await save(values);});
    if(locked)f.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input,select').forEach(input=>input.disabled=true);
    for(const sub of b.subtasks.filter(s=>s.taskId===task.id))mountStepGoalSettings(details,b,sub,day,locked,save);
  }
  if(locked)form.querySelectorAll<HTMLInputElement>('input').forEach(input=>input.disabled=true);
}
export function mountStepGoalSettings(root:HTMLElement,b:Board,sub:Subtask,day:string,locked:boolean,save:(value:PlanningSetting)=>Promise<void>){
  const details=el(root,'details');details.className='cs-progress-settings';el(details,'summary',sub.title+' · measured step goal');
  el(details,'small','Optional. Actual increments accumulate across days; the step has its own capped budget, not the parent’s. No goal means the dated fixed step points.');
  const goal=subtaskMetricFor(b,sub,day),form=el(details,'form');form.className='cs-rule-form';
  const target=field(form,'Step target','number',goal?String(goal.target):'','0.01','100000');target.step='any';target.required=true;
  const label=el(form,'label','Step unit '),unit=el(label,'select');unit.setAttribute('aria-label','Step unit');for(const u of ['reps','sec','min','mi','pages','count'])el(unit,'option',u).value=u;unit.value=goal?.unit||'count';
  const points=field(form,'Step points budget','number',String(goal?.points??10),'0','200');points.step='1';const since=field(form,'Step goal starts','date',day);
  submit(form,locked,()=>save({kind:'step-goal',row:{subtaskId:sub.id,target:Number(target.value),unit:unit.value,points:Number(points.value),since:since.value},expected:b.subtaskGoals.find(g=>g.subtaskId===sub.id&&g.since===since.value)}));
  if(locked)form.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input,select').forEach(input=>input.disabled=true);
}
export function mountStepProgressTools(root:HTMLElement,b:Board,sub:Subtask,day:string,locked:boolean,count:(amount:number,unit:string)=>Promise<void>){
  const metric=subtaskProgress(b,sub,day);if(!metric||root.querySelector('.cs-step-progress'))return;
  const tools=el(root,'div');tools.className='cs-step-progress cs-hud-task-tools';el(tools,'small',`${metric.amount}/${metric.goal.target} ${metric.goal.unit} · ${metric.partial} progress pt · ${metric.met?'goal reached':'goal needed for completion points'}`);
  const error=el(tools,'small');error.setAttribute('role','status');
  for(const amount of metric.goal.unit==='sec'?[5,10,30]:metric.goal.unit==='mi'?[.1,.25]:[1,5]){const button=el(tools,'button',`+${amount} ${metric.goal.unit}`);button.type='button';button.disabled=locked||sub.done;button.onclick=async()=>{if(button.disabled)return;button.disabled=true;error.textContent='';try{await count(amount,metric.goal.unit);}catch(e){error.textContent=e instanceof Error?e.message:String(e);}finally{button.disabled=locked||sub.done;}};}
}
export function mountSuggestedTime(root:HTMLElement,b:Board,task:Task,day:string,locked:boolean,save:(value:SuggestedTime)=>Promise<void>){
  const current=timeBlockFor(b,task.id,day),details=el(root,'details');details.className='cs-plan-time';el(details,'summary',current?'Adjust time':'Suggest time');
  const form=el(details,'form');form.className='cs-rule-form';const start=field(form,'Start time','time',current?.start||''),end=field(form,'End time','time',current?.end||'');start.required=end.required=true;
  const zone=current?.timezone||b.availability[0]?.timezone||'America/Chicago';el(form,'small',zone+' · suggestion only; no Calendar event is created.');
  submit(form,locked,()=>save({taskId:task.id,date:day,start:start.value,end:end.value,timezone:zone,expected:current}));
  if(locked){start.disabled=true;end.disabled=true;}
}
export function mountTaskProgressTools(root:HTMLElement,b:Board,task:Task,day:string,locked:boolean,count:(amount:number,unit:string)=>Promise<void>,time:(value:SuggestedTime)=>Promise<void>){
  if(root.querySelector('.cs-hud-task-tools'))return;
  const tools=el(root,'div');tools.className='cs-hud-task-tools';el(tools,'small',taskType(b,task)).className='cs-task-type';
  mountTaskCountTools(tools,b,task,day,locked,count);
  mountSuggestedTime(tools,b,task,day,locked,time);
}
export function mountTaskCountTools(root:HTMLElement,b:Board,task:Task,day:string,locked:boolean,count:(amount:number,unit:string)=>Promise<void>){
  const metric=metricProgress(b,task,day);if(!metric||root.querySelector('.cs-task-counts'))return;const tools=el(root,'div');tools.className='cs-task-counts cs-hud-task-tools';el(tools,'small',`${metric.amount}/${metric.goal.target} ${metric.goal.unit} · ${metric.partial} progress pt`);const error=el(tools,'small');error.setAttribute('role','status');
  for(const amount of metric.goal.unit==='sec'?[5,10,30]:metric.goal.unit==='mi'?[.1,.25]:[1,5]){const button=el(tools,'button',`+${amount} ${metric.goal.unit}`);button.type='button';button.disabled=locked;button.onclick=async()=>{if(button.disabled)return;button.disabled=true;error.textContent='';try{await count(amount,metric.goal.unit);}catch(e){error.textContent=e instanceof Error?e.message:String(e);}finally{button.disabled=locked;}};}
}
