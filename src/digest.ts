import { Board, Task, TimeBlock, Availability, availabilityFor, planned, entryFor } from './model';

export interface ItineraryItem {key:string;kind:'protected'|'task';title:string;start:string;end:string;timezone:string;task?:Task;block?:TimeBlock;fixed?:Availability;done:boolean;conflict:boolean}
export function itinerary(board:Board,date:string):{timed:ItineraryItem[];flexible:Task[];available:Task[];minutes:number}{
  const fixed=availabilityFor(board,date).map(block=>({key:`fixed:${block.id}`,kind:'protected' as const,title:block.label,start:block.start,end:block.end,timezone:block.timezone,fixed:block,done:false,conflict:false}));
  const blocks=board.timeBlocks.filter(block=>block.date===date).flatMap(block=>{const task=board.tasks.find(task=>task.id===block.taskId);return task?[{key:task.id,kind:'task' as const,title:task.title,start:block.start,end:block.end,timezone:block.timezone,task,block,done:!!entryFor(board,task.id,date)?.done,conflict:false}]:[];});
  const timed:ItineraryItem[]=[...fixed,...blocks].sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end)||a.key.localeCompare(b.key));
  for(const item of timed)item.conflict=timed.some(other=>other!==item&&other.timezone===item.timezone&&item.start<other.end&&item.end>other.start);
  const timedIds=new Set(blocks.map(item=>item.task!.id));const flexible=board.tasks.filter(task=>planned(board,task,date)&&!timedIds.has(task.id));const available=board.tasks.filter(task=>!planned(board,task,date)&&!timedIds.has(task.id));
  const minutes=blocks.reduce((total,block)=>{const toMinutes=(value:string)=>Number(value.slice(0,2))*60+Number(value.slice(3));return total+toMinutes(block.end)-toMinutes(block.start);},0);
  return {timed,flexible,available,minutes};
}
