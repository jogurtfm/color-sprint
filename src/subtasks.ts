import {Subtask,parseBoard,taskSubtasks,startTimer,writeTimer,focusQueue,saveSubtask} from './model';

/** Start exactly the chosen checklist item, without replacing an existing focus. */
export function startSubtaskTimer(text:string,taskId:string,stepId:string,date:string,now=Date.now()):string {
  const b=parseBoard(text),sub=taskSubtasks(b,taskId,date).find(s=>s.id===stepId);
  if(!sub||sub.done)throw new Error('Choose an unfinished step from this day’s checklist.');
  const next=startTimer(text,taskId,date,now),board=parseBoard(next),timer=board.timer!;
  const cursor=focusQueue(board,timer).findIndex(s=>s.id===stepId);
  if(cursor<0)throw new Error('Checklist changed. Refresh before starting.');
  return writeTimer(next,{...timer,cursor,target:sub.minutes*60});
}

export type StepEdit={id:string;taskId:string;title:string;definition:string;minutes:number;context:string;expected?:Pick<Subtask,'title'|'definition'|'minutes'|'context'>};
export const stepPlan=(s:Subtask)=>({title:s.title,definition:s.definition,minutes:s.minutes,context:s.context});
/** Planning edits never write completion state, including when a phone checked a step meanwhile. */
export function reviewSubtaskEdit(text:string,value:StepEdit):string {
  if(!value||typeof value!=='object'||Object.keys(value).some(k=>!['id','taskId','title','definition','minutes','context','expected'].includes(k)))throw new Error('Invalid step edit.');
  for(const key of ['id','taskId','title','definition','context'] as const)if(typeof value[key]!=='string'||!value[key].trim()||value[key].length>2000||/[\r\n|]/.test(value[key]))throw new Error('Use a single line for step fields.');
  if(!/^[a-zA-Z0-9_-]+$/.test(value.id)||!Number.isSafeInteger(value.minutes)||value.minutes<0||value.minutes>1440)throw new Error('Use 0–1440 whole minutes; 0 is an open timer.');
  const b=parseBoard(text),current=b.subtasks.find(s=>s.id===value.id);
  if(!b.tasks.some(t=>t.id===value.taskId))throw new Error('Parent task no longer exists.');
  if(value.expected){
    if(Object.keys(value.expected).some(k=>!['title','definition','minutes','context'].includes(k))||!current||current.taskId!==value.taskId||Object.entries(stepPlan(current)).some(([k,v])=>(value.expected as any)[k]!==v))throw new Error('This step was edited elsewhere. Refresh and try again.');
  }else if(current)throw new Error('This step already exists. Refresh before editing.');
  return saveSubtask(text,{id:value.id,taskId:value.taskId,title:value.title.trim(),definition:value.definition.trim(),minutes:value.minutes,context:value.context.trim(),done:current?.done??false,completed:current?.completed??'-'});
}
