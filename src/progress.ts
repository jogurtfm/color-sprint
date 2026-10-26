import {Board,Task,Subtask,entryFor,taskSubtasks,ScoringRule} from './model';

export function scoringFor(board:Board,date:string):ScoringRule|undefined{return [...board.scoringRules].filter(r=>r.since<=date).sort((a,b)=>b.since.localeCompare(a.since))[0];}
export function metricFor(board:Board,task:Task,date:string){return [...board.metricGoals].filter(r=>r.taskId===task.id&&r.since<=date).sort((a,b)=>b.since.localeCompare(a.since))[0];}
export function metricProgress(board:Board,task:Task,date:string){
  const goal=metricFor(board,task,date);if(!goal)return null;
  const quick=board.quickCounts.filter(c=>c.taskId===task.id&&c.date===date&&c.unit===goal.unit).reduce((n,c)=>n+c.amount,0);
  const logged=board.workoutLogs.filter(l=>l.taskId===task.id&&l.date===date).reduce((n,l)=>n+(goal.unit==='min'?l.minutes:goal.unit==='mi'?l.distance:0),0);
  // Counts and workout fields can describe the same work. Use the larger total, not both.
  const amount=Math.max(quick,logged),fraction=Math.min(1,amount/goal.target);
  return {goal,amount,met:amount>=goal.target,partial:Math.round(goal.points*.5*fraction*10)/10,bonus:goal.points*.5};
}
export function subtaskMetricFor(board:Board,sub:Subtask,date:string){
  const effective=sub.done&&sub.completed!=='-'&&sub.completed<date?sub.completed:date;
  return [...board.subtaskGoals].filter(r=>r.subtaskId===sub.id&&r.since<=effective).sort((a,b)=>b.since.localeCompare(a.since))[0];
}
/** Project steps accumulate actual input across days; only each day's newly earned fraction scores. */
export function subtaskProgress(board:Board,sub:Subtask,date:string){
  const goal=subtaskMetricFor(board,sub,date);if(!goal)return null;
  const end=sub.done&&sub.completed!=='-'&&sub.completed<date?sub.completed:date;
  const counts=board.stepCounts.filter(c=>c.subtaskId===sub.id&&c.unit===goal.unit&&c.date>=goal.since&&c.date<=end);
  const amount=counts.reduce((n,c)=>n+c.amount,0),prior=counts.filter(c=>c.date<date).reduce((n,c)=>n+c.amount,0);
  const partial=(value:number)=>Math.round(goal.points*.5*Math.min(1,value/goal.target)*10)/10;
  return {goal,amount,met:amount>=goal.target,partial:partial(amount),earned:Math.max(0,Math.round((partial(amount)-partial(prior))*10)/10),bonus:goal.points*.5};
}
export function completionReady(board:Board,task:Task,date:string):boolean {
  const metric=metricProgress(board,task,date);if(metric&&!metric.met)return false;
  if(!scoringFor(board,date))return true;
  return taskSubtasks(board,task.id,date).every(s=>s.done&&(s.completed==='-'||s.completed<=date)&&(!subtaskProgress(board,s,s.completed==='-'?date:s.completed)||subtaskProgress(board,s,s.completed==='-'?date:s.completed)!.met));
}
export const TYPE_LABELS=['Routine','One-off obligation','Cooking','Room recovery','Cardio / outdoors','Home workout','Gym · upper body','Gym · lower body','Strength accessory','Creative','Learning','Project','Leisure'];
export function taskType(board:Board,task:Task):string {
  const custom=board.taskTypes.find(r=>r.taskId===task.id);if(custom)return custom.type;
  if(task.id==='hard-task'||/obligation|one-off/i.test(task.kind)||/^Admin\b/i.test(task.page))return 'One-off obligation';
  if(task.page==='Morning'||['make-bed','brush-teeth','clean-kitchen'].includes(task.id))return 'Routine';
  if(task.id==='cook')return 'Cooking';if(task.page==='Room')return 'Room recovery';
  if(['treadmill','five-mile-hike'].includes(task.id))return 'Cardio / outdoors';
  if(['pushups','plank'].includes(task.id))return 'Home workout';
  if(['push-pull','bench','overhead'].includes(task.id))return 'Gym · upper body';
  if(task.id==='leg-press')return 'Gym · lower body';if(task.id==='dips')return 'Strength accessory';
  if(task.page==='Creative')return 'Creative';if(task.page==='Learning')return 'Learning';if(task.page==='Leisure')return 'Leisure';return task.kind==='project'?'Project':task.kind;
}
export const COLOR_PURPOSES:Record<string,string>={pink:'Routine & care',blue:'Practical actions & projects',yellow:'Mind & home practice',purple:'Learning & creative',orange:'Gym · push / pull',salmon:'Strength accessories & legs'};
export function progressLabel(board:Board,task:Task,date:string,basePoints:number):string {
  const metric=metricProgress(board,task,date);if(metric)return `${metric.amount}/${metric.goal.target} ${metric.goal.unit} · ${metric.partial} progress pt${entryFor(board,task.id,date)?.done&&!metric.met?' · goal not met':''}`;
  const subs=taskSubtasks(board,task.id,date),rules=scoringFor(board,date);
  if(rules&&subs.length)return `${subs.filter(s=>s.done).length}/${subs.length} steps · separate step points · parent ${basePoints} pt after steps`;
  return `${basePoints} pt`;
}
