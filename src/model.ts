export type ColorId = 'pink' | 'blue' | 'yellow' | 'purple' | 'orange' | 'salmon';
export const COLORS: {id: ColorId; name: string; hex: string}[] = [
  {id:'pink', name:'Red / pink', hex:'#ea9999'},
  {id:'blue', name:'Light blue', hex:'#cfe2f3'},
  {id:'yellow', name:'Yellow', hex:'#fff2cc'},
  {id:'purple', name:'Lavender / purple', hex:'#d9d2e9'},
  {id:'orange', name:'Peach / orange', hex:'#fce5cd'},
  {id:'salmon', name:'Salmon / dusty rose', hex:'#e6b8af'}
];
export interface Task {id:string; title:string; color:ColorId; page:string; kind:string; repeat:string; minutes:number; definition:string}
export interface Entry {date:string; taskId:string; detail:string; done:boolean}
export interface Goal {id:string; due:string; page:string; title:string; evidence:string; done:boolean}
export interface Session {id:string; date:string; taskId:string; seconds:number; note:string}
export interface Timer {id:string; taskId:string; date:string; started:string; elapsed:number; target:number; cursor:number; stepOffset:number}
export interface Subtask {id:string; taskId:string; context:string; minutes:number; title:string; definition:string; done:boolean; completed:string}
export interface FocusStep {id:string; taskId:string; subtask?:Subtask; title:string; definition:string; minutes:number; done:boolean}
export interface WorkoutLog {id:string; date:string; taskId:'workout'|'treadmill'; minutes:number; distance:number; details:string; note:string}
export interface QuickCount {id:string; date:string; taskId:string; amount:number; unit:string}
export interface GroupRef {kind:'page'|'color'; value:string}
export interface TimeBlock {date:string;taskId:string;start:string;end:string;timezone:string;status:'suggested'|'scheduled'|'needs-review';eventId:string;eventUrl:string}
export interface Availability {id:string;label:string;days:string;start:string;end:string;timezone:string}
export interface Board {tasks:Task[]; entries:Entry[]; goals:Goal[]; sessions:Session[]; timer:Timer|null; workoutLogs:WorkoutLog[]; quickCounts:QuickCount[]; reflections:string[]; subtasks:Subtask[]; timeBlocks:TimeBlock[]; availability:Availability[]; start:string; end:string}
export const TASK_HEADER='| ID | Task | Color | Page | Kind | Repeat | Timer minutes | Done means |';
export const SESSION_HEADER='| Session ID | Date | Task ID | Seconds | Note |';
export const TIMER_HEADER='| Session ID | Task ID | Date | Started ISO | Elapsed seconds | Target seconds | Queue cursor | Step offset seconds |';
const QUEUE_TIMER_HEADER='| Session ID | Task ID | Date | Started ISO | Elapsed seconds | Target seconds | Queue cursor |';
const LEGACY_TIMER_HEADER='| Session ID | Task ID | Date | Started ISO | Elapsed seconds | Target seconds |';
export const WORKOUT_LOG_HEADER='| ID | Date | Task ID | Duration minutes | Distance miles | Sets / reps / load | Notes |';
export const QUICK_COUNT_HEADER='| ID | Date | Task ID | Amount | Unit |';
export const TIME_BLOCK_HEADER='| Date | Task ID | Start | End | Time zone | Status | Calendar event ID | Event URL |';
export const AVAILABILITY_HEADER='| ID | Label | Days | Start | End | Time zone |';
const SECTIONS=['Tasks','Schedule','Goals','Sessions','Timer'];const OPTIONAL_SECTIONS=['Reflections','Workout Log','Quick Counts','Subtasks','Time Blocks','Availability'];
export function localDay(date=new Date()):string {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function addDays(day:string,n:number):string {const d=new Date(`${day}T12:00:00`);d.setDate(d.getDate()+n);return localDay(d);}
export function validDay(day:string):boolean {return /^\d{4}-\d{2}-\d{2}$/.test(day)&&localDay(new Date(`${day}T12:00:00`))===day;}
export function cell(text:string):string {return text.replace(/[\r\n]+/g,' ').replace(/\\/g,'\\\\').replace(/\|/g,'\\|').trim();}
export function splitCells(line:string):string[] {
  const trimmed=line.trim();const source=trimmed.startsWith('|')?trimmed.replace(/^\|/,'').replace(/\|$/,''):trimmed;const parts:string[]=[];let value='';
  for(let i=0;i<source.length;i++){const c=source[i];if(c==='\\'&&(source[i+1]==='|'||source[i+1]==='\\')){value+=source[++i];}else if(c==='|'){parts.push(value.trim());value='';}else value+=c;}parts.push(value.trim());return parts;
}
interface Range {start:number;end:number}
function ranges(lines:string[]):Map<string,Range>{
  const map=new Map<string,Range>();let current:string|null=null;let fenced=false;let fenceChar='';
  for(let i=0;i<lines.length;i++){
    const fence=lines[i].match(/^\s*(`{3,}|~{3,})/);if(fence){if(!fenced){fenced=true;fenceChar=fence[1][0];}else if(fence[1][0]===fenceChar)fenced=false;continue;}if(fenced)continue;
    const match=lines[i].match(/^##\s+(.+?)\s*$/);if(!match)continue;
    if(current)map.get(current)!.end=i;
    current=[...SECTIONS,...OPTIONAL_SECTIONS].includes(match[1])?match[1]:null;
    if(current){if(map.has(current))throw new Error(`Duplicate section: ${current}`);map.set(current,{start:i+1,end:lines.length});}
  }return map;
}
function dataLines(lines:string[],range:Range):string[]{let fenced=false;return lines.slice(range.start,range.end).filter(line=>{if(/^\s*(`{3,}|~{3,})/.test(line)){fenced=!fenced;return false;}return !fenced;});}
function table(lines:string[],range:Range,header:string):string[][]{
  const rows=dataLines(lines,range).filter(x=>x.trim().startsWith('|'));if(rows.length<2||rows[0].replace(/\s/g,'')!==header.replace(/\s/g,''))throw new Error(`Expected table header: ${header}`);
  if(!splitCells(rows[1]).every(x=>/^:?-{3,}:?$/.test(x)))throw new Error('Table requires a Markdown separator row.');
  const width=splitCells(header).length;return rows.slice(2).map(x=>{const parts=splitCells(x);if(parts.length!==width)throw new Error(`Expected ${width} cells: ${x}`);return parts;});
}
function timerTable(lines:string[],range:Range):string[][]{
  const rows=dataLines(lines,range).filter(x=>x.trim().startsWith('|'));if(rows.length<2)throw new Error(`Expected table header: ${TIMER_HEADER}`);const header=rows[0].replace(/\s/g,'');const width=header===TIMER_HEADER.replace(/\s/g,'')?8:header===QUEUE_TIMER_HEADER.replace(/\s/g,'')?7:header===LEGACY_TIMER_HEADER.replace(/\s/g,'')?6:0;if(!width)throw new Error(`Expected table header: ${TIMER_HEADER}`);if(!splitCells(rows[1]).every(x=>/^:?-{3,}:?$/.test(x)))throw new Error('Table requires a Markdown separator row.');return rows.slice(2).map(x=>{const parts=splitCells(x);if(parts.length!==width)throw new Error(`Expected ${width} cells: ${x}`);return parts;});
}
function unique(ids:string[],kind:string):void {if(ids.some(x=>!/^[-a-z0-9]+$/.test(x)))throw new Error(`${kind} IDs must use lowercase letters, numbers, and hyphens.`);if(new Set(ids).size!==ids.length)throw new Error(`Duplicate ${kind} ID. Give every item its own stable ID.`);}
function number(value:string):number {if(!/^\d+(\.\d+)?$/.test(value)||!Number.isFinite(Number(value)))throw new Error(`Invalid nonnegative number: ${value}`);return Number(value);}
function integer(value:string):number {if(!/^\d+$/.test(value))throw new Error(`Invalid nonnegative integer: ${value}`);return Number(value);}
function checkboxRows(lines:string[],range:Range):{done:boolean;parts:string[]}[]{return dataLines(lines,range).filter(x=>/^\s*- \[[ xX]\]/.test(x)).map(x=>{const match=x.match(/^\s*- \[([ xX])\]\s*(.*)$/)!;return {done:match[1].toLowerCase()==='x',parts:splitCells(match[2])};});}
export function parseBoard(text:string):Board {
  const lines=text.split(/\r?\n/);const rs=ranges(lines);for(const section of SECTIONS)if(!rs.has(section))throw new Error(`Missing ## ${section} section. Open the Markdown format guide.`);
  const tasks=table(lines,rs.get('Tasks')!,TASK_HEADER).map(p=>({id:p[0],title:p[1],color:p[2] as ColorId,page:p[3],kind:p[4],repeat:p[5],minutes:number(p[6]),definition:p[7]}));
  unique(tasks.map(x=>x.id),'task');for(const task of tasks){if(!COLORS.some(x=>x.id===task.color))throw new Error(`Unknown color for ${task.title}: ${task.color}`);if(!task.title||!task.page||task.page==='All')throw new Error('Every task needs a title and page. All is reserved for the unfiltered view.');if(!validRepeat(task.repeat))throw new Error(`Invalid Repeat value for ${task.title}. Use -, daily, or mon,tue,...`);if(task.minutes>1440)throw new Error('Timer minutes must be 0–1440.');}
  const entries=checkboxRows(lines,rs.get('Schedule')!).map(({done,parts:p})=>{if(p.length!==3)throw new Error('Schedule rows need Date | Task ID | Detail.');if(!validDay(p[0]))throw new Error(`Invalid schedule date: ${p[0]}`);return {date:p[0],taskId:p[1],detail:p[2],done};});
  if(new Set(entries.map(x=>`${x.date}/${x.taskId}`)).size!==entries.length)throw new Error('Duplicate task/date in Schedule. Combine details or give separate tasks unique IDs.');
  const goals=checkboxRows(lines,rs.get('Goals')!).map(({done,parts:p})=>{if(p.length!==5)throw new Error('Goals rows need ID | Due date or - | Page | Goal | Evidence.');if(p[1]!=='-'&&!validDay(p[1]))throw new Error(`Invalid goal due date: ${p[1]}`);if(!p[2]||p[2]==='All'||!p[3])throw new Error('Goals need a title and page. All is a reserved page name.');return {id:p[0],due:p[1],page:p[2],title:p[3],evidence:p[4],done};});unique(goals.map(x=>x.id),'goal');
  const sessions=table(lines,rs.get('Sessions')!,SESSION_HEADER).map(p=>({id:p[0],date:p[1],taskId:p[2],seconds:number(p[3]),note:p[4]}));unique(sessions.map(x=>x.id),'session');for(const session of sessions)if(!validDay(session.date))throw new Error('Invalid session date.');
  const timers=timerTable(lines,rs.get('Timer')!).map(p=>({id:p[0],taskId:p[1],date:p[2],started:p[3],elapsed:number(p[4]),target:number(p[5]),cursor:p.length>=7?integer(p[6]):0,stepOffset:p.length===8?number(p[7]):0}));if(timers.length>1)throw new Error('Only one active timer is supported per tracker.');const timer=timers[0]||null;
  if(timer){unique([timer.id],'timer');if(!validDay(timer.date)|| (timer.started!=='-'&&!Number.isFinite(Date.parse(timer.started))))throw new Error('Invalid timer date or start timestamp.');}
  const workoutRange=rs.get('Workout Log');const workoutLogs=workoutRange?table(lines,workoutRange,WORKOUT_LOG_HEADER).map(p=>({id:p[0],date:p[1],taskId:p[2] as WorkoutLog['taskId'],minutes:number(p[3]),distance:number(p[4]),details:p[5],note:p[6]})):[];unique(workoutLogs.map(x=>x.id),'workout log');for(const log of workoutLogs)if(!validDay(log.date)||(log.taskId!=='workout'&&log.taskId!=='treadmill'))throw new Error('Workout Log rows must use a valid date and Workout or Treadmill task ID.');
  const quickRange=rs.get('Quick Counts');const quickCounts=quickRange?table(lines,quickRange,QUICK_COUNT_HEADER).map(p=>({id:p[0],date:p[1],taskId:p[2],amount:number(p[3]),unit:p[4]})):[];unique(quickCounts.map(x=>x.id),'quick count');for(const count of quickCounts)if(!validDay(count.date)||count.amount<=0||!count.unit)throw new Error('Quick Counts need a valid date, positive amount, and unit.');
  const taskIds=new Set(tasks.map(x=>x.id));const knownReference=(id:string)=>taskIds.has(id)||!!parseGroupTimerId(id);for(const item of [...entries,...sessions,...timers,...quickCounts])if(!knownReference(item.taskId))throw new Error(`Unknown task ID: ${item.taskId}. Restore the task row or update its references.`);
  const reflectionRange=rs.get('Reflections');const reflections=reflectionRange?dataLines(lines,reflectionRange).map(line=>line.trim().replace(/^[-*]\s+|^>\s?/,'')).filter(line=>line&&!line.startsWith('<!--')):[];
  const match=text.match(/^Sprint: (\d{4}-\d{2}-\d{2}) \/ (\d{4}-\d{2}-\d{2})\s*$/m);const start=match?.[1]||localDay();const end=match?.[2]||addDays(start,13);if(!validDay(start)||!validDay(end)||end<start)throw new Error('Invalid Sprint date range.');
  const subRange=rs.get('Subtasks');const subtasks=subRange?checkboxRows(lines,subRange).map(({done,parts:p})=>{if(p.length!==7)throw new Error('Subtask rows need ID | Task ID | Context or - | Minutes | Action | Done means | Completed date or -.');const sub:Subtask={id:p[0],taskId:p[1],context:p[2],minutes:number(p[3]),title:p[4],definition:p[5],completed:p[6],done};if(!taskIds.has(sub.taskId)||!sub.title||!sub.context||sub.minutes>1440||(sub.completed!=='-'&&!validDay(sub.completed)))throw new Error('Invalid subtask parent, title, duration, or completed date.');return sub;}):[];unique(subtasks.map(sub=>sub.id),'subtask');
  const timeRange=rs.get('Time Blocks');const timeBlocks=timeRange?table(lines,timeRange,TIME_BLOCK_HEADER).map(p=>({date:p[0],taskId:p[1],start:p[2],end:p[3],timezone:p[4],status:p[5] as TimeBlock['status'],eventId:p[6],eventUrl:p[7]})):[];
  for(const block of timeBlocks){if(!validDay(block.date)||!taskIds.has(block.taskId)||!validTime(block.start)||!validTime(block.end)||block.end<=block.start||!validTimezone(block.timezone)||!['suggested','scheduled','needs-review'].includes(block.status))throw new Error('Time Blocks need a real task/date, HH:MM start/end, time zone, and valid status.');if(block.status==='scheduled'&&(!block.eventId||block.eventId==='-'))throw new Error('Scheduled blocks need a verified calendar event ID.');if(block.eventUrl!=='-'&&!/^https:\/\/(calendar\.google\.com|www\.google\.com)\//.test(block.eventUrl))throw new Error('Event URL must be a Google Calendar HTTPS link or -.');}
  if(new Set(timeBlocks.map(block=>`${block.date}/${block.taskId}`)).size!==timeBlocks.length)throw new Error('Duplicate time block for task/date.');
  const availRange=rs.get('Availability');const availability=availRange?table(lines,availRange,AVAILABILITY_HEADER).map(p=>({id:p[0],label:p[1],days:p[2],start:p[3],end:p[4],timezone:p[5]})):[];unique(availability.map(block=>block.id),'availability');for(const block of availability)if(!block.label||!validRepeat(block.days)||!validTime(block.start)||!validTime(block.end)||block.end<=block.start||!validTimezone(block.timezone))throw new Error('Availability blocks need a label, repeat days, HH:MM start/end and time zone.');
  return {tasks,entries,goals,sessions,timer,workoutLogs,quickCounts,reflections,subtasks,timeBlocks,availability,start,end};
}
export function validTime(value:string):boolean{return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);}
function validTimezone(value:string):boolean{try{new Intl.DateTimeFormat('en',{timeZone:value});return true;}catch{return false;}}
export function clockLabel(value:string):string{const [hour,minute]=value.split(':').map(Number);return `${hour%12||12}${minute?':'+String(minute).padStart(2,'0'):''}${hour<12?' AM':' PM'}`;}
export function timeBlockFor(board:Board,taskId:string,date:string):TimeBlock|undefined{return board.timeBlocks.find(block=>block.date===date&&block.taskId===taskId);}
export function timeBlockLabel(block:TimeBlock):string{return `${block.status==='scheduled'?'On calendar':block.status==='needs-review'?'Review time':'Suggested'} · ${clockLabel(block.start)}–${clockLabel(block.end)}`;}
export function availabilityFor(board:Board,date:string):Availability[]{return board.availability.filter(block=>scheduled({repeat:block.days} as Task,date));}
export function taskSubtasks(board:Board,taskId:string,date:string):Subtask[]{const detail=entryFor(board,taskId,date)?.detail.toLowerCase()||'';return board.subtasks.filter(sub=>sub.taskId===taskId&&(sub.context==='-'||detail.includes(sub.context.toLowerCase())));}
export function focusQueue(board:Board,timer:Timer):FocusStep[]{const group=parseGroupTimerId(timer.taskId);const tasks=board.tasks.filter(task=>group?(group.kind==='page'?task.page===group.value:task.color===group.value):task.id===timer.taskId);return tasks.flatMap(task=>{const subs=taskSubtasks(board,task.id,timer.date);return subs.length?subs.map(sub=>({id:sub.id,taskId:task.id,subtask:sub,title:sub.title,definition:sub.definition,minutes:sub.minutes,done:sub.done})):[{id:task.id,taskId:task.id,title:task.title,definition:task.definition,minutes:task.minutes,done:!!entryFor(board,task.id,timer.date)?.done}];});}
export function dailyWins(board:Board,date:string):{tasks:number;subtasks:number}{return {tasks:board.entries.filter(entry=>entry.date===date&&entry.done).length,subtasks:board.subtasks.filter(sub=>sub.done&&sub.completed===date).length};}
export function validRepeat(value:string):boolean {return value==='-'||value==='daily'||/^(mon|tue|wed|thu|fri|sat|sun)(,(mon|tue|wed|thu|fri|sat|sun))*$/.test(value);}
export function scheduled(task:Task,day:string):boolean {return task.repeat==='daily'||task.repeat.split(',').includes(['sun','mon','tue','wed','thu','fri','sat'][new Date(`${day}T12:00:00`).getDay()]);}
export function entryFor(board:Board,id:string,day:string):Entry|undefined{return board.entries.find(e=>e.taskId===id&&e.date===day);}
export function planned(board:Board,task:Task,day:string):boolean{return !!entryFor(board,task.id,day)||board.sessions.some(session=>session.date===day&&session.taskId===task.id)||board.subtasks.some(sub=>sub.taskId===task.id&&sub.done&&sub.completed===day)||(day>=board.start&&day<=board.end&&scheduled(task,day));}
export function groupTimerId(group:GroupRef):string{return `group:${group.kind}:${encodeURIComponent(group.value)}`;}
export function parseGroupTimerId(id:string):GroupRef|null {const match=id.match(/^group:(page|color):(.+)$/);if(!match)return null;try{return {kind:match[1] as GroupRef['kind'],value:decodeURIComponent(match[2])};}catch{return null;}}
function lineEdit(text:string,section:string,find:(line:string)=>boolean,transform:(line:string)=>string,append:string):string{
  const nl=text.includes('\r\n')?'\r\n':'\n';const lines=text.split(/\r?\n/);const range=ranges(lines).get(section);if(!range)throw new Error(`Missing section ${section}`);
  let matches:number[]=[];let fenced=false;for(let i=range.start;i<range.end;i++){if(/^\s*(`{3,}|~{3,})/.test(lines[i])){fenced=!fenced;continue;}if(!fenced&&find(lines[i]))matches.push(i);}
  if(matches.length>1)throw new Error('Ambiguous row; no changes written.');if(matches.length)lines[matches[0]]=transform(lines[matches[0]]);else if(append){let index=range.end;while(index>range.start&&!lines[index-1].trim())index--;lines.splice(index,0,append);}return lines.join(nl);
}
export function setEntry(text:string,date:string,id:string,done:boolean,detail?:string):string{
  const board=parseBoard(text);if(!validDay(date)||!board.tasks.some(x=>x.id===id))throw new Error('Invalid task/date.');const old=entryFor(board,id,date);const row=`- [${done?'x':' '}] ${date} | ${id} | ${cell(detail??old?.detail??'')}`;
  return lineEdit(text,'Schedule',line=>{const m=line.match(/^\s*- \[[ xX]\]\s*(.*)$/);if(!m)return false;const p=splitCells(m[1]);return p[0]===date&&p[1]===id;},()=>row,row);
}
export function scheduleGroup(text:string,group:GroupRef,date:string):string{
  let board=parseBoard(text);if(!validDay(date)||!group.value.trim())throw new Error('A schedule group needs a valid date and group.');const tasks=board.tasks.filter(task=>group.kind==='page'?task.page===group.value:task.color===group.value);if(!tasks.length)throw new Error('This schedule group has no tasks.');let next=text;for(const task of tasks){if(!entryFor(board,task.id,date)){next=setEntry(next,date,task.id,false);board=parseBoard(next);}}return next;
}
export function saveTimeBlock(text:string,block:TimeBlock):string{
  const board=parseBoard(text);if(!validTime(block.start)||!validTime(block.end)||block.end<=block.start)throw new Error('Use HH:MM start and end, with end after start.');const conflict=availabilityFor(board,block.date).find(fixed=>fixed.timezone===block.timezone&&block.start<fixed.end&&block.end>fixed.start);if(conflict)throw new Error(`This overlaps ${conflict.label} (${clockLabel(conflict.start)}–${clockLabel(conflict.end)}). Choose an open time.`);
  if(board.timeBlocks.some(other=>other.date===block.date&&other.taskId!==block.taskId&&other.timezone===block.timezone&&block.start<other.end&&block.end>other.start))throw new Error('This overlaps another task on this date. Choose an open time.');
  const nl=text.includes('\r\n')?'\r\n':'\n';let next=text;if(!ranges(text.split(/\r?\n/)).has('Time Blocks'))next+=`${nl}## Time Blocks${nl}${nl}${TIME_BLOCK_HEADER}${nl}| --- | --- | --- | --- | --- | --- | --- | --- |${nl}`;
  const row=`| ${[block.date,block.taskId,block.start,block.end,block.timezone,block.status,block.eventId||'-',block.eventUrl||'-'].map(cell).join(' | ')} |`;
  next=lineEdit(next,'Time Blocks',line=>{const p=splitCells(line);return p[0]===block.date&&p[1]===block.taskId;},()=>row,row);parseBoard(next);if(!entryFor(board,block.taskId,block.date))next=setEntry(next,block.date,block.taskId,false);return next;
}
export function clearTimeBlock(text:string,taskId:string,date:string):string{if(!parseBoard(text).timeBlocks.some(block=>block.taskId===taskId&&block.date===date))return text;return lineEdit(text,'Time Blocks',line=>{const p=splitCells(line);return p[0]===date&&p[1]===taskId;},()=>'', '');}
export function saveSubtask(text:string,sub:Subtask):string{
  let next=text;const nl=text.includes('\r\n')?'\r\n':'\n';if(!ranges(text.split(/\r?\n/)).has('Subtasks'))next+=`${nl}## Subtasks${nl}${nl}<!-- - [ ] ID | Task ID | Context or - | Minutes | Action | Done means | Completed date or - -->${nl}`;
  const row=`- [${sub.done?'x':' '}] ${[sub.id,sub.taskId,sub.context,String(sub.minutes),sub.title,sub.definition,sub.completed].map(cell).join(' | ')}`;
  next=lineEdit(next,'Subtasks',line=>{const m=line.match(/^\s*- \[[ xX]\]\s*(.*)$/);return !!m&&splitCells(m[1])[0]===sub.id;},()=>row,row);parseBoard(next);return next;
}
export function setSubtaskDone(text:string,id:string,done:boolean,date:string):string{const sub=parseBoard(text).subtasks.find(sub=>sub.id===id);if(!sub||!validDay(date))throw new Error('Subtask changed or date is invalid.');return saveSubtask(text,{...sub,done,completed:done?date:'-'});}
export function addWorkoutLog(text:string,log:Omit<WorkoutLog,'id'> & {id?:string}):string{
  const board=parseBoard(text);if(!validDay(log.date)||(log.taskId!=='workout'&&log.taskId!=='treadmill')||!Number.isFinite(log.minutes)||log.minutes<0||!Number.isFinite(log.distance)||log.distance<0)throw new Error('Workout log needs a valid date, Workout or Treadmill, and nonnegative duration and distance.');const id=log.id||`w-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;if(board.workoutLogs.some(item=>item.id===id))throw new Error('Workout log ID already exists.');const row=`| ${[id,log.date,log.taskId,String(log.minutes),String(log.distance),log.details,log.note].map(cell).join(' | ')} |`;return lineEdit(text,'Workout Log',()=>false,()=>row,row);
}
export function addQuickCount(text:string,count:Omit<QuickCount,'id'> & {id?:string}):string{
  const board=parseBoard(text);if(!validDay(count.date)||!board.tasks.some(task=>task.id===count.taskId)||!Number.isFinite(count.amount)||count.amount<=0||!count.unit.trim())throw new Error('Quick count needs a valid date, task, positive amount, and unit.');const id=count.id||`q-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;if(board.quickCounts.some(item=>item.id===id))throw new Error('Quick count ID already exists.');const row=`| ${[id,count.date,count.taskId,String(count.amount),count.unit].map(cell).join(' | ')} |`;return lineEdit(text,'Quick Counts',()=>false,()=>row,row);
}
export function saveTask(text:string,task:Task):string{
  parseBoard(text);const row=`| ${[task.id,task.title,task.color,task.page,task.kind,task.repeat,String(task.minutes),task.definition].map(cell).join(' | ')} |`;
  const next=lineEdit(text,'Tasks',line=>line.trim().startsWith('|')&&splitCells(line)[0]===task.id,()=>row,row);parseBoard(next);return next;
}
export function setGoal(text:string,goal:Goal):string{
  parseBoard(text);const row=`- [${goal.done?'x':' '}] ${[goal.id,goal.due,goal.page,goal.title,goal.evidence].map(cell).join(' | ')}`;
  const next=lineEdit(text,'Goals',line=>{const m=line.match(/^\s*- \[[ xX]\]\s*(.*)$/);return !!m&&splitCells(m[1])[0]===goal.id;},()=>row,row);parseBoard(next);return next;
}
export function timerSeconds(timer:Timer,now=Date.now()):number{return Math.floor(timer.elapsed+(timer.started==='-'?0:Math.max(0,now-Date.parse(timer.started))/1000));}
export function writeTimer(text:string,timer:Timer|null):string{
  parseBoard(text);const lines=text.split(/\r?\n/);const timerRange=ranges(lines).get('Timer')!;const indices:number[]=[];let fenced=false;for(let i=timerRange.start;i<timerRange.end;i++){if(/^\s*(`{3,}|~{3,})/.test(lines[i])){fenced=!fenced;continue;}if(!fenced&&lines[i].trim().startsWith('|'))indices.push(i);}
  const row=timer?`| ${[timer.id,timer.taskId,timer.date,timer.started,String(timer.elapsed),String(timer.target),String(timer.cursor),String(timer.stepOffset)].map(cell).join(' | ')} |`:'';
  // Replace the header, separator, and row together; leading blanks and old active rows are safe.
  for(let i=indices.length-1;i>=0;i--)lines.splice(indices[i],1);const rows=[TIMER_HEADER,'| --- | --- | --- | --- | --- | --- | --- | --- |'];if(row)rows.push(row);lines.splice(indices[0],0,...rows);const next=lines.join(text.includes('\r\n')?'\r\n':'\n');parseBoard(next);return next;
}
export function startTimer(text:string,taskId:string,date:string,now=Date.now()):string{
  const board=parseBoard(text);if(board.timer)throw new Error('A timer is already active. Open its focus screen to resume or finish it.');const task=board.tasks.find(t=>t.id===taskId);if(!task||!validDay(date))throw new Error('Task or date not found.');const scheduledText=entryFor(board,taskId,date)?text:setEntry(text,date,taskId,false);return writeTimer(scheduledText,{id:`s-${now}-${Math.random().toString(36).slice(2,8)}`,taskId,date,started:new Date(now).toISOString(),elapsed:0,target:task.minutes*60,cursor:0,stepOffset:0});
}
export function startGroupTimer(text:string,group:GroupRef,date:string,now=Date.now()):string{
  const board=parseBoard(text);if(board.timer)throw new Error('A timer is already active. Open its focus screen to resume or save it.');if(!validDay(date)||!group.value.trim())throw new Error('A group timer needs a valid date and group.');const tasks=board.tasks.filter(task=>group.kind==='page'?task.page===group.value:task.color===group.value);if(!tasks.length)throw new Error('This focus group has no tasks.');if(tasks.some(task=>!entryFor(board,task.id,date)))throw new Error('Schedule every task in this group before starting routine focus.');return writeTimer(text,{id:`s-${now}-${Math.random().toString(36).slice(2,8)}`,taskId:groupTimerId(group),date,started:new Date(now).toISOString(),elapsed:0,target:0,cursor:0,stepOffset:0});
}
export function moveGroupTimer(text:string,id:string,delta:number,now=Date.now()):string{
  const board=parseBoard(text);const timer=board.timer;if(!timer||timer.id!==id)throw new Error('Routine timer changed. Refresh and try again.');const length=focusQueue(board,timer).length;if(!length)throw new Error('This queue is empty. Save this session and choose another task.');return writeTimer(text,{...timer,cursor:Math.max(0,Math.min(length-1,timer.cursor+delta)),stepOffset:timerSeconds(timer,now)});
}
export function completeFocusStep(text:string,id:string,cursor:number,now=Date.now()):string{const board=parseBoard(text);const timer=board.timer;if(!timer||timer.id!==id||timer.cursor!==cursor)throw new Error('Focus step changed. Refresh and try again.');const queue=focusQueue(board,timer);const step=queue[cursor];if(!step)throw new Error('Focus queue changed.');const next=step.subtask?setSubtaskDone(text,step.subtask.id,true,timer.date):setEntry(text,timer.date,step.taskId,true);return cursor<queue.length-1?moveGroupTimer(next,id,1,now):next;}
export function pauseTimer(text:string,id:string,now=Date.now()):string{
  const timer=parseBoard(text).timer;if(!timer||timer.id!==id)throw new Error('Timer changed. Refresh and try again.');return writeTimer(text,{...timer,elapsed:timerSeconds(timer,now),started:'-'});
}
export function resumeTimer(text:string,id:string,now=Date.now()):string{
  const timer=parseBoard(text).timer;if(!timer||timer.id!==id||timer.started!=='-')throw new Error('Timer changed or is already running.');return writeTimer(text,{...timer,started:new Date(now).toISOString()});
}
export function refreshTimer(text:string,id:string,now=Date.now()):string{
  const timer=parseBoard(text).timer;if(!timer||timer.id!==id)throw new Error('Timer changed. Refresh and try again.');return writeTimer(text,{...timer,elapsed:0,stepOffset:0,started:new Date(now).toISOString()});
}
export function finishTimer(text:string,id:string,note:string,now=Date.now()):string{
  const board=parseBoard(text);if(board.sessions.some(s=>s.id===id))return text;const timer=board.timer;if(!timer||timer.id!==id)throw new Error('Timer changed. No session saved.');
  const row=`| ${[id,timer.date,timer.taskId,String(timerSeconds(timer,now)),note].map(cell).join(' | ')} |`;
  return writeTimer(lineEdit(text,'Sessions',()=>false,x=>x,row),null);
}
export function finishFocus(text:string,id:string,expectedStepId:string,note='',now=Date.now()):string{
  const board=parseBoard(text);if(board.sessions.some(session=>session.id===id)&&board.timer?.id!==id)return text;const timer=board.timer;if(!timer||timer.id!==id)throw new Error('Timer changed. Refresh before finishing.');const queue=focusQueue(board,timer);const step=queue[Math.min(timer.cursor,Math.max(0,queue.length-1))];if(!step||step.id!==expectedStepId)throw new Error('Focus item changed. Check the current item before finishing.');
  let next=entryFor(board,step.taskId,timer.date)?text:setEntry(text,timer.date,step.taskId,false);next=step.subtask?(step.done?next:setSubtaskDone(next,step.subtask.id,true,timer.date)):setEntry(next,timer.date,step.taskId,true);return finishTimer(next,id,`Finished: ${step.title}${note.trim()?`. ${note.trim()}`:''}`,now);
}
export function cancelTimer(text:string,id:string):string{const board=parseBoard(text);const timer=board.timer;if(!timer||timer.id!==id)throw new Error('Timer changed. Refresh before cancelling.');let next=text;const step=focusQueue(board,timer)[Math.min(timer.cursor,Math.max(0,focusQueue(board,timer).length-1))];if(step&&!entryFor(board,step.taskId,timer.date))next=setEntry(next,timer.date,step.taskId,false);return writeTimer(next,null);}
export function duration(seconds:number):string{const s=Math.max(0,Math.floor(seconds));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
