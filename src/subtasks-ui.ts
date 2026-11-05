import {Board,Task,Subtask,taskSubtasks,entryFor} from './model';
import {StepEdit,stepPlan} from './subtasks';

export interface ChecklistState {expanded:boolean;hideDone:boolean;details:Set<string>;editor?:{id?:string;title:string;minutes:string;definition:string;context:string;expected?:StepEdit['expected']}}
export const newChecklistState=():ChecklistState=>({expanded:true,hideDone:false,details:new Set()});
export interface ChecklistPort {check(sub:Subtask,done:boolean):Promise<void>;start(sub:Subtask):Promise<void>;save(value:StepEdit):Promise<void>;suggest?():Promise<void>;tools?(root:HTMLElement,sub:Subtask):void}
export function mountChecklist(parent:HTMLElement,b:Board,task:Task,date:string,locked:boolean,port:ChecklistPort,state:ChecklistState,full=false):void {
  const d=parent.ownerDocument,box=d.createElement('section');box.className='cs-step-checklist';box.dataset.checklistTask=task.id;box.setAttribute('aria-label',`${task.title} checklist`);parent.append(box);
  const steps=taskSubtasks(b,task.id,date),done=steps.filter(s=>s.done).length,next=steps.find(s=>!s.done);let busy=false;
  const el=<K extends keyof HTMLElementTagNameMap>(tag:K,p:HTMLElement,cls='',text='')=>{const x=d.createElement(tag);x.className=cls;x.textContent=text;p.append(x);return x;};
  const button=(p:HTMLElement,text:string,action:()=>void,disabled=locked)=>{const x=el('button',p,'cs-step-button',text);x.type='button';x.disabled=disabled;x.onclick=action;return x;};
  const run=async(action:()=>Promise<void>,success?:()=>void)=>{if(busy)return;busy=true;box.setAttribute('aria-busy','true');box.querySelectorAll<HTMLInputElement|HTMLButtonElement>('button,input,textarea').forEach(x=>x.disabled=true);try{await action();success?.();}catch(e){status.textContent=e instanceof Error?e.message:String(e);}finally{busy=false;box.removeAttribute('aria-busy');if(box.isConnected)paint();}};
  const status=el('p',box,'cs-step-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const paint=()=>{
    const message=status.textContent;box.replaceChildren();const head=el('div',box,'cs-step-head');el('strong',head,'cs-step-heading','Checklist');el('span',head,'cs-step-count',`${done} / ${steps.length}`);
    const expanded=full||state.expanded;
    if(!full){const toggle=button(head,expanded?'Collapse':'All steps',()=>{state.expanded=!state.expanded;paint();},false);toggle.setAttribute('aria-expanded',String(expanded));}
    if(steps.length){const meter=el('div',box,'cs-step-meter');meter.setAttribute('role','progressbar');meter.setAttribute('aria-label','Checklist progress');meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax',String(steps.length));meter.setAttribute('aria-valuenow',String(done));el('span',meter).style.width=`${done/steps.length*100}%`;}
    const list=el('ul',box,'cs-step-list');
    const shown=expanded?steps.filter(s=>!state.hideDone||!s.done):next?[next]:[];
    for(const sub of shown){
      const row=el('li',list,`cs-step-row${sub.done?' is-complete':''}${sub.id===next?.id?' is-next':''}`);row.dataset.stepId=sub.id;
      const line=el('div',row,'cs-step-line'),label=el('label',line,'cs-step-check-label'),check=el('input',label);check.type='checkbox';check.checked=sub.done;check.disabled=locked;check.setAttribute('aria-label',`Complete step: ${sub.title}`);
      const copy=el('span',label,'cs-step-copy');if(sub.id===next?.id)el('small',copy,'cs-step-next','NEXT STEP');el('span',copy,'cs-step-title',sub.title);
      check.onchange=()=>{const wanted=check.checked;void run(()=>port.check(sub,wanted));};
      if(!sub.done){const timer=button(line,sub.minutes?`◷ ${sub.minutes}m`:'◷ Timer',()=>void run(()=>port.start(sub)),locked||!!b.timer);timer.classList.add('cs-step-timer');timer.setAttribute('aria-label',`Start optional timer for ${sub.title}${sub.minutes?`, ${sub.minutes} minutes`:''}`);if(b.timer)timer.title='Finish or cancel the active focus before starting another timer.';}
      if(expanded){const details=el('details',row,'cs-step-details');details.open=state.details.has(sub.id);const more=el('summary',details,'','⋯');more.setAttribute('aria-label',`Details and edit: ${sub.title}`);more.title='Details and edit';details.ontoggle=()=>{details.open?state.details.add(sub.id):state.details.delete(sub.id);};el('p',details,'cs-step-definition',sub.definition==='-'?'No extra instructions.':sub.definition);if(sub.done&&sub.completed!=='-')el('small',details,'',`Completed ${sub.completed}`);button(details,'Edit step',()=>{state.editor={id:sub.id,title:sub.title,minutes:String(sub.minutes),definition:sub.definition==='-'?'':sub.definition,context:sub.context,expected:stepPlan(sub)};paint();box.querySelector<HTMLInputElement>('[name="step-title"]')?.focus();});port.tools?.(details,sub);}
    }
    if(!steps.length)el('p',box,'cs-step-hint','Break this task into small, checkable actions. Timers are optional.');
    else if(!next)el('p',box,'cs-step-hint','Steps complete. Finish the main task when its done means is met.');
    else if(!expanded&&done)el('p',box,'cs-step-hint',`${done} completed · open All steps to review or undo`);
    if(expanded){const controls=el('div',box,'cs-step-controls');if(done){const hide=button(controls,state.hideDone?'Show completed':'Hide completed',()=>{state.hideDone=!state.hideDone;paint();},false);hide.setAttribute('aria-pressed',String(state.hideDone));}button(controls,'+ Add step',()=>{state.editor={title:'',minutes:'0',definition:'',context:entryFor(b,task.id,date)?.detail||'-'};paint();box.querySelector<HTMLInputElement>('[name="step-title"]')?.focus();});if(!steps.length&&port.suggest)button(controls,'Use suggested steps',()=>void run(()=>port.suggest!()));
      if(b.timer)el('p',box,'cs-step-hint','Another focus is active. You can still check steps; new timers wait until it ends.');
    }
    if(expanded&&state.editor){
      const draft=state.editor,form=el('form',box,'cs-step-editor');el('h4',form,'',draft.id?'Edit step':'New step');
      const field=(name:string,title:string,value:string,area=false)=>{const label=el('label',form);el('span',label,'',title);const input=area?el('textarea',label):el('input',label);input.name=name;input.value=value;input.disabled=locked;return input;};
      const title=field('step-title','Step',draft.title) as HTMLInputElement;title.required=true;title.maxLength=500;title.placeholder='e.g. Gather clothes into one pile';
      const minutes=field('step-minutes','Optional timer · minutes (0 = stopwatch)',draft.minutes) as HTMLInputElement;minutes.type='number';minutes.min='0';minutes.max='1440';minutes.step='1';minutes.required=true;
      const definition=field('step-definition','Done means (optional)',draft.definition,true);definition.maxLength=2000;
      const advanced=el('details',form,'cs-step-advanced');el('summary',advanced,'','Advanced');const context=field('step-context','Match day details (− or - = any day)',draft.context) as HTMLInputElement;advanced.append(context.parentElement!);context.oninput=()=>{draft.context=context.value.trim()==='−'?'-':context.value;};
      for(const [input,key] of [[title,'title'],[minutes,'minutes'],[definition,'definition']] as const)input.oninput=()=>{draft[key]=input.value;};
      const actions=el('div',form,'cs-step-controls');const save=button(actions,'Save step',()=>{});save.type='submit';button(actions,'Cancel',()=>{state.editor=undefined;paint();},false);
      form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;void run(async()=>{state.editor=undefined;try{await port.save({id:draft.id||`step-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,taskId:task.id,title:draft.title,minutes:Number(draft.minutes),definition:draft.definition.trim().replace(/\s*\r?\n\s*/g,' ')||'-',context:draft.context.trim()||'-',expected:draft.expected});}catch(e){state.editor=draft;throw e;}});};
    }
    status.textContent=message;box.append(status);
  };paint();
}
