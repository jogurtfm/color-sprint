import {parseBoard,addDays,validDay} from './model';
import {mergePlan} from './sync';
import {dailyScore} from './effort';

export interface PlannerAction {id:string;sha256:string}
export interface PlannerPolicy {version:1;enabled:boolean;vault:string;tracker:string;client:string;publicKey:string;enabledAt:string;timezone:'America/Chicago'}
export function plannerAction(value:unknown):PlannerAction {
  const p=value as PlannerAction;if(!p||Object.keys(p).sort().join(',')!=='id,sha256'||!/^plan-[a-z0-9-]{6,90}$/.test(p.id)||!/^[a-f0-9]{64}$/.test(p.sha256))throw new Error('Invalid planner proposal reference.');return p;
}
export function plannerDay(now=Date.now()):string{const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now),get=(type:string)=>parts.find(p=>p.type===type)!.value;return `${get('year')}-${get('month')}-${get('day')}`;}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
/** Explicit signed planner requests only. Never a synced-folder auto-executor. */
export function automaticPlan(base:string,current:string,proposed:string,day:string){
  if(!validDay(day))throw new Error('Invalid planner day.');const b=parseBoard(base),p=parseBoard(proposed),c=parseBoard(current),result=mergePlan(base,current,proposed);
  if(c.timer)throw new Error('Planning held: finish or cancel active focus first.');
  if(result.conflicts.length||result.protected.length)throw new Error('Planning held for review: conflicts or attempted progress changes.');
  if(b.start!==p.start||b.end!==p.end)throw new Error('Sprint boundaries require review.');
  for(const key of ['availability','finishMultipliers','effortProfiles'] as const)if(!same(b[key],p[key]))throw new Error(`${key} changes require review.`);
  for(const task of b.tasks){const next=p.tasks.find(t=>t.id===task.id);if(!next||next.title!==task.title||next.color!==task.color)throw new Error('Task removal, renaming or source recoloring requires review.');}
  for(const key of ['entries','timeBlocks','focusTargets'] as const)for(const row of p[key]){const old=b[key].find(r=>r.taskId===row.taskId&&r.date===row.date);if(!same(old,row)&&row.date<day)throw new Error('Historical schedule changes require review.');}
  for(const key of ['scoringRules','metricGoals','subtaskGoals','dailyDefaults','exerciseTargets'] as const)for(const row of p[key])if(row.since<day&&!b[key].some(r=>same(r,row)))throw new Error('Backdated rule changes require review.');
  const after=parseBoard(result.text);
  for(const key of ['timer','sessions','workoutLogs','quickCounts','stepCounts','queueItems','taskMoves','completionRatings','exerciseSets'] as const)if(!same(c[key],after[key]))throw new Error('Actual progress cannot be overwritten.');
  for(const row of c.entries)if(after.entries.find(r=>r.date===row.date&&r.taskId===row.taskId)?.done!==row.done)throw new Error('Checkbox change rejected.');
  for(const row of c.subtasks){const next=after.subtasks.find(r=>r.id===row.id);if(!next||next.done!==row.done||next.completed!==row.completed)throw new Error('Step progress change rejected.');}
  for(const row of c.goals){const next=after.goals.find(r=>r.id===row.id);if(!next||next.done!==row.done||next.evidence!==row.evidence)throw new Error('Goal evidence change rejected.');}
  let days=0;for(let d=c.start;d<day&&d<=c.end;d=addDays(d,1)){if(++days>400)throw new Error('Long historical window requires review.');const old=dailyScore(c,d),next=dailyScore(after,d);if(old.points!==next.points||!same(old.ranks,next.ranks))throw new Error('Historical scoring change requires review.');}
  return result;
}
