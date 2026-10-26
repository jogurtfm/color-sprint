import {Board,Task,EffortProfile,taskOccurrences,FinishLevel,completionLevel} from './model';
import {metricProgress,subtaskProgress,completionReady,scoringFor} from './progress';

export const EFFORT_DIMENSIONS=['friction','attention','physical','emotional','uncertainty'] as const;
export const EFFORT_LABELS=['Starting friction','Sustained attention','Physical effort','Emotional weight','Uncertainty'];
export const RANKS=[{name:'D',points:0},{name:'C',points:10},{name:'B',points:40},{name:'A',points:70},{name:'S',points:100},{name:'SS',points:150},{name:'SSS',points:200}];
export const FINISH_LEVELS=[{id:'light' as const,emoji:'😴',label:'Bare minimum',multiplier:.5},{id:'solid' as const,emoji:'🙂',label:'Solid',multiplier:1},{id:'full' as const,emoji:'😤',label:'Full effort',multiplier:1.5}];
export function finishMultiplier(board:Board,level:FinishLevel|null):number{return level===null?1:board.finishMultipliers.find(r=>r.level===level)?.multiplier??FINISH_LEVELS.find(r=>r.id===level)!.multiplier;}
export function completionPoints(board:Board,task:Task,level:FinishLevel|null):number{return Math.round(effortFor(board,task).points*finishMultiplier(board,level)*10)/10;}
export function defaultEffort(task:Task):EffortProfile {
  // These seeds encode the user's stated starting difficulty only. Other dimensions remain unknown.
  const friction=['treadmill','read-book','reading','hard-task'].includes(task.id)?3:task.id==='five-mile-hike'?2:task.id==='make-bed'?0:null;
  return {id:`effort-${task.id}`,scope:'task',match:task.id,friction,attention:null,physical:null,emotional:null,uncertainty:null,points:null,status:'proposed',reviewed:'-',notes:friction===null?'Not rated yet.': 'Starting difficulty reported by you; other dimensions are not rated.'};
}
export function effortFor(board:Board,task:Task):{profile:EffortProfile;points:number;basis:string} {
  const confirmed=board.effortProfiles.filter(p=>p.status==='confirmed');
  const profile=confirmed.find(p=>p.scope==='task'&&p.match===task.id)||confirmed.find(p=>p.scope==='page'&&p.match===task.page)||confirmed.find(p=>p.scope==='kind'&&p.match===task.kind)||defaultEffort(task);
  const known=EFFORT_DIMENSIONS.map(k=>profile[k]).filter((n):n is number=>n!==null);
  // Unrated strength components earn no extra points alongside a whole Workout.
  const points=profile.points??(known.length?10+10*known.reduce((a,b)=>a+b,0):task.kind==='component'?0:20);
  return {profile,points,basis:profile.status==='confirmed'?`${profile.scope} profile`:'trial baseline'};
}
export function effortSignals(board:Board,task:Task):{moves:number;review:boolean} {
  // A recorded reschedule is a signal, not proof of avoidance. Nothing escalates automatically.
  const moves=board.taskMoves.filter(m=>m.taskId===task.id).length;return {moves,review:moves>=2};
}
export function dailyScore(board:Board,date:string) {
  const rules=scoringFor(board,date),ranks=RANKS.map(r=>({...r,points:Math.ceil(r.points*(rules?.rankMultiplier??1)/5)*5}));
  const awards=board.tasks.flatMap(task=>{
    // Moved occurrences count once on their first checked date, regardless of later duplicate checks.
    const groups=taskOccurrences(board,task);
    return groups.flatMap(group=>{
      const checked=board.entries.filter(e=>e.taskId===task.id&&group.dates.includes(e.date)&&e.done).sort((a,b)=>a.date.localeCompare(b.date));
      if(checked[0]?.date!==date)return [];
      const metric=metricProgress(board,task,date);
      return [{taskId:task.id,points:completionReady(board,task,date)?metric?metric.bonus:completionPoints(board,task,completionLevel(board,date,'task',task.id)):0,level:completionLevel(board,date,'task',task.id)}];
    });
  });
  for(const task of board.tasks){const metric=metricProgress(board,task,date);if(metric?.partial)awards.push({taskId:task.id,points:metric.partial,level:null});}
  for(const sub of board.subtasks){const metric=subtaskProgress(board,sub,date);if(metric){if(metric.earned)awards.push({taskId:sub.taskId,points:metric.earned,level:null});if(sub.done&&sub.completed===date&&metric.met)awards.push({taskId:sub.taskId,points:metric.bonus,level:null});}else if(rules&&sub.done&&sub.completed===date)awards.push({taskId:sub.taskId,points:rules.stepPoints,level:null});}
  const points=Math.round(awards.reduce((sum,a)=>sum+a.points,0)*10)/10,rank=[...ranks].reverse().find(r=>points>=r.points)!,next=ranks.find(r=>r.points>points);
  return {points,rank:rank.name,next:next?.name||null,remaining:next?Math.round((next.points-points)*10)/10:0,progress:next?(points-rank.points)/(next.points-rank.points):1,awards,ranks};
}
