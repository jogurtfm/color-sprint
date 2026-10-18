import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starter } from '../src/starter';
import { parseBoard, setEntry, saveTask, setGoal, scheduleGroup, startTimer, startGroupTimer, moveGroupTimer, parseGroupTimerId, pauseTimer, resumeTimer, refreshTimer, finishTimer, addWorkoutLog, addQuickCount, timerSeconds, planned, splitCells, cell, addDays } from '../src/model';
import { TIMER_HEADER, focusQueue, completeFocusStep, dailyWins, setSubtaskDone } from '../src/model';
import { addRoadmap } from '../src/roadmaps';
import { saveTimeBlock, timeBlockFor, availabilityFor, timeBlockLabel, AVAILABILITY_HEADER } from '../src/model';

const seed=()=>starter('2026-10-18');
test('all 22 exact task labels and all six source colors survive Markdown parsing',()=>{
  const b=parseBoard(seed());assert.equal(b.tasks.length,22);assert.deepEqual([...new Set(b.tasks.map(t=>t.color))],['pink','blue','yellow','purple','orange','salmon']);assert.equal(b.start,'2026-10-18');assert.equal(b.end,'2026-10-31');assert.equal(b.entries.length,0);assert.equal(b.sessions.length,0);
});
test('blank schedules are neither failures nor implied planned tasks',()=>{const b=parseBoard(seed());assert.ok(b.tasks.every(t=>!planned(b,t,'2026-10-18')));});
test('four source dates can be added, toggled, and retain their detail',()=>{
  let md=seed();for(const [date,id,detail] of [['2026-10-18','cook','Chicken'],['2026-10-19','hard-task','2020 Tax'],['2026-10-21','cook','Soup'],['2026-10-21','hard-task','Letters']])md=setEntry(md,date,id,false,detail);
  md=setEntry(md,'2026-10-21','cook',true);const b=parseBoard(md);assert.equal(b.entries.length,4);assert.equal(b.entries.find(e=>e.date==='2026-10-21'&&e.taskId==='cook')?.detail,'Soup');assert.equal(b.entries.filter(e=>e.done).length,1);
});
test('empty detail round-trips and repeated checkbox action is idempotent',()=>{let md=setEntry(seed(),'2026-10-18','make-bed',false);assert.equal(parseBoard(md).entries[0].detail,'');md=setEntry(md,'2026-10-18','make-bed',true);md=setEntry(md,'2026-10-18','make-bed',true);assert.equal(parseBoard(md).entries.length,1);});
test('escaped pipes, backslashes and Unicode round-trip',()=>{const value='Actual: 5 | 10 \\ sets — 完了';assert.deepEqual(splitCells(`| ${cell(value)} | second |`),[value,'second']);const md=setEntry(seed(),'2026-10-18','workout',false,value);assert.equal(parseBoard(md).entries[0].detail,value);});
test('unrelated prose, extra sections, CRLF, and fenced examples stay intact on updates',()=>{
  let md=seed().replace(/\n/g,'\r\n')+'\r\n## Private notes\r\nKeep this exactly.\r\n';md=md.replace('## Schedule','```md\r\n## Schedule\r\n- [ ] 2026-10-18 | make-bed | fake\r\n```\r\n\r\n## Schedule');const next=setEntry(md,'2026-10-18','make-bed',true);assert.ok(next.endsWith('Keep this exactly.\r\n'));assert.ok(next.includes('- [ ] 2026-10-18 | make-bed | fake'));assert.equal(parseBoard(next).entries.length,1);assert.equal(next.replace(/\r\n/g,'').includes('\n'),false);
});
test('edits use stable IDs; changing title/page/color does not destroy schedule',()=>{
  let md=setEntry(seed(),'2026-10-18','make-bed',true,'Done');const task=parseBoard(md).tasks[0];md=saveTask(md,{...task,title:'Make Bed — easy',page:'Morning care',repeat:'mon,wed',color:'yellow'});const b=parseBoard(md);assert.equal(b.tasks[0].title,'Make Bed — easy');assert.equal(b.entries[0].done,true);assert.equal(planned(b,b.tasks[0],'2026-10-19'),true);assert.equal(planned(b,b.tasks[0],'2026-11-02'),false);
});
test('incomplete, duplicate, or broken IDs fail closed',()=>{
  assert.throws(()=>parseBoard(seed().replace('## Tasks','## Other')),/Missing/);
  assert.throws(()=>parseBoard(seed().replace('## Notes','## Tasks')),/Duplicate section/);
  assert.throws(()=>parseBoard(seed().replace('| brush-teeth |','| make-bed |')),/Duplicate task/);
  assert.throws(()=>parseBoard(seed().replace('## Goals','- [ ] 2026-10-18 | unknown | detail\n\n## Goals')),/Unknown task/);
  assert.throws(()=>setEntry(seed(),'2026-02-30','cook',false),/Invalid/);
});
test('malformed table shape and unsupported colors are reported',()=>{assert.throws(()=>parseBoard(seed().replace('| pink |','| teal |')),/Unknown color/);assert.throws(()=>parseBoard(seed().replace('| 2 | Bedding','| NaN | Bedding')),/Invalid nonnegative/);});
test('recurrences are opt-in and only apply within sprint',()=>{const b=parseBoard(saveTask(seed(),{...parseBoard(seed()).tasks[0],repeat:'daily'}));assert.equal(planned(b,b.tasks[0],'2026-10-18'),true);assert.equal(planned(b,b.tasks[0],'2026-11-01'),false);});
test('reflection quotes are optional plain Markdown and do not affect schedule state',()=>{const md=seed().replace('<!-- Optional: one plain reflection quote per line. Focus and meditation mode show one at a time. -->','Keep moving.\n\nTry again.');const b=parseBoard(md);assert.deepEqual(b.reflections,['Keep moving.','Try again.']);assert.equal(b.entries.length,0);});
test('workout log preserves actual data without checking or scheduling a task',()=>{const md=addWorkoutLog(seed(),{id:'w-tread-1',date:'2026-10-18',taskId:'treadmill',minutes:20,distance:.8,details:'2.8 mph',note:'Easy start'});const b=parseBoard(md);assert.deepEqual(b.workoutLogs,[{id:'w-tread-1',date:'2026-10-18',taskId:'treadmill',minutes:20,distance:.8,details:'2.8 mph',note:'Easy start'}]);assert.equal(b.entries.length,0);});
test('quick counts append a real increment without completing a task',()=>{const md=addQuickCount(seed(),{id:'q-push-1',date:'2026-10-18',taskId:'pushups',amount:5,unit:'reps'});const b=parseBoard(md);assert.deepEqual(b.quickCounts,[{id:'q-push-1',date:'2026-10-18',taskId:'pushups',amount:5,unit:'reps'}]);assert.equal(b.entries.length,0);});
test('goal evidence and completion persist without modifying task entries',()=>{const md=setGoal(seed(),{id:'room-fit',due:'2026-10-31',page:'Room',title:'Keepers fit',evidence:'2 bags left | closet shuts',done:true});const b=parseBoard(md);assert.equal(b.goals[0].done,true);assert.equal(b.goals[0].evidence,'2 bags left | closet shuts');assert.equal(b.entries.length,0);});
test('timer survives sleep/restart through timestamps, pauses and resumes',()=>{
  const now=Date.parse('2026-10-18T14:00:00Z');let md=startTimer(seed(),'make-bed','2026-10-18',now);let timer=parseBoard(md).timer!;assert.equal(timerSeconds(timer,now+600000),600);
  md=pauseTimer(md,timer.id,now+601000);timer=parseBoard(md).timer!;assert.equal(timerSeconds(timer,now+900000),601);assert.equal(timer.started,'-');
  md=resumeTimer(md,timer.id,now+900000);assert.equal(timerSeconds(parseBoard(md).timer!,now+910000),611);
});
test('refreshing a timer starts a fresh block without creating a completed session',()=>{const now=Date.parse('2026-10-18T14:00:00Z');let md=startTimer(seed(),'make-bed','2026-10-18',now);const id=parseBoard(md).timer!.id;md=refreshTimer(md,id,now+600000);const b=parseBoard(md);assert.equal(timerSeconds(b.timer!,now+600000),0);assert.equal(b.sessions.length,0);assert.equal(b.entries.length,0);});
test('saving timer is exactly once, retains result, and never auto-completes or counts workouts',()=>{
  const now=Date.parse('2026-10-18T14:00:00Z');let md=startTimer(seed(),'workout','2026-10-18',now);const id=parseBoard(md).timer!.id;md=finishTimer(md,id,'Actual sets 4x10',now+90000);assert.equal(parseBoard(md).timer,null);assert.equal(parseBoard(md).sessions[0].seconds,90);assert.equal(parseBoard(md).entries.length,0);assert.equal(finishTimer(md,id,'duplicate',now+999999),md);
});
test('group routine timer stores a stable group reference and preserves individual evidence',()=>{
  const now=Date.parse('2026-10-18T14:00:00Z');let md=scheduleGroup(seed(),{kind:'page',value:'Morning'},'2026-10-18');md=startGroupTimer(md,{kind:'page',value:'Morning'},'2026-10-18',now);const timer=parseBoard(md).timer!;assert.deepEqual(parseGroupTimerId(timer.taskId),{kind:'page',value:'Morning'});assert.equal(timer.target,0);assert.equal(timer.cursor,0);md=moveGroupTimer(md,timer.id,1);assert.equal(parseBoard(md).timer!.cursor,1);md=finishTimer(md,timer.id,'Made bed and brushed teeth',now+125000);const b=parseBoard(md);assert.equal(b.timer,null);assert.equal(b.sessions[0].taskId,timer.taskId);assert.equal(b.sessions[0].seconds,125);assert.equal(b.entries.filter(entry=>entry.done).length,0);
});
test('schedule group adds every missing task as unchecked before group focus can begin',()=>{
  const now=Date.parse('2026-10-18T14:00:00Z');let md=seed();assert.throws(()=>startGroupTimer(md,{kind:'color',value:'pink'},'2026-10-18',now),/Schedule every task/);md=scheduleGroup(md,{kind:'color',value:'pink'},'2026-10-18');const board=parseBoard(md);const pink=board.tasks.filter(task=>task.color==='pink');assert.equal(pink.length,3);assert.equal(board.entries.filter(entry=>entry.date==='2026-10-18'&&pink.some(task=>task.id===entry.taskId)).length,3);assert.ok(board.entries.every(entry=>!entry.done));assert.doesNotThrow(()=>startGroupTimer(md,{kind:'color',value:'pink'},'2026-10-18',now));
});
test('competing timers and stale controls cannot overwrite a running session',()=>{const now=Date.now();const md=startTimer(seed(),'make-bed','2026-10-18',now);assert.throws(()=>startTimer(md,'cook','2026-10-18',now+1),/already active/);assert.throws(()=>pauseTimer(md,'stale',now),/changed/);assert.throws(()=>finishTimer(md,'stale','',now),/changed/);});
test('calendar date arithmetic works across month boundaries',()=>{assert.equal(addDays('2026-10-31',1),'2026-11-01');assert.equal(addDays('2026-11-01',-1),'2026-10-31');});
test('legacy timer tables with blank lines and active six-column rows migrate through every action',()=>{
  const now=Date.parse('2026-10-18T14:00:00Z');let md=seed().replace(TIMER_HEADER,'| Session ID | Task ID | Date | Started ISO | Elapsed seconds | Target seconds |');md=md.replace('## Workout Log','| legacy-timer | mindfulness | 2026-10-18 | 2026-10-18T14:00:00.000Z | 0 | 120 |\n\n## Workout Log');assert.equal(parseBoard(md).timer!.cursor,0);md=pauseTimer(md,'legacy-timer',now+30000);assert.equal(parseBoard(md).timer!.elapsed,30);assert.ok(md.includes(TIMER_HEADER));md=resumeTimer(md,'legacy-timer',now+60000);md=refreshTimer(md,'legacy-timer',now+90000);md=finishTimer(md,'legacy-timer','Actual meditation',now+100000);assert.equal(parseBoard(md).sessions[0].seconds,10);assert.equal(parseBoard(md).timer,null);
});
test('portfolio roadmap queue persists durations, preserves total focus, and counts dated wins without completing parent',()=>{
  const now=Date.parse('2026-10-18T14:00:00Z');let md=addRoadmap(seed(),'audio-portfolio');assert.equal(addRoadmap(md,'audio-portfolio'),md);md=startTimer(md,'audio-portfolio','2026-10-18',now);const timer=parseBoard(md).timer!;assert.equal(focusQueue(parseBoard(md),timer)[0].minutes,10);md=completeFocusStep(md,timer.id,0,now+60000);let b=parseBoard(md);assert.equal(b.timer!.cursor,1);assert.equal(b.timer!.stepOffset,60);assert.equal(timerSeconds(b.timer!,now+65000),65);assert.deepEqual(dailyWins(b,'2026-10-18'),{tasks:0,subtasks:1});assert.deepEqual(dailyWins(b,'2026-10-19'),{tasks:0,subtasks:0});assert.equal(b.entries.length,0);md=setSubtaskDone(md,b.subtasks[0].id,false,'2026-10-18');assert.equal(dailyWins(parseBoard(md),'2026-10-18').subtasks,0);
});
test('tax and letters roadmaps remain scoped to their own schedule details',()=>{
  let md=addRoadmap(addRoadmap(seed(),'hard-task','2020 Tax'),'hard-task','Letters');md=setEntry(md,'2026-10-19','hard-task',false,'2020 Tax');md=setEntry(md,'2026-10-21','hard-task',false,'Letters');md=startTimer(md,'hard-task','2026-10-19');let b=parseBoard(md);assert.ok(focusQueue(b,b.timer!).every(step=>step.subtask?.context==='2020 Tax'));md=finishTimer(md,b.timer!.id,'');md=startTimer(md,'hard-task','2026-10-21');b=parseBoard(md);assert.ok(focusQueue(b,b.timer!).every(step=>step.subtask?.context==='Letters'));
});
test('structured time proposals preserve task evidence, expose local times and block protected overlaps',()=>{
  const reserved=`\n## Availability\n\n${AVAILABILITY_HEADER}\n| --- | --- | --- | --- | --- | --- |\n| reserved | Reserved | mon,tue,wed,thu,fri | 10:00 | 18:00 | America/Chicago |\n`;let md=setEntry(seed(),'2026-10-19','cook',true,'Keep this evidence')+reserved;const proposal={date:'2026-10-19',taskId:'cook',start:'19:00',end:'19:30',timezone:'America/Chicago',status:'suggested' as const,eventId:'-',eventUrl:'-'};md=saveTimeBlock(md,proposal);const board=parseBoard(md);assert.equal(board.entries[0].done,true);assert.equal(board.entries[0].detail,'Keep this evidence');assert.equal(board.sessions.length,0);assert.match(timeBlockLabel(timeBlockFor(board,'cook','2026-10-19')!),/Suggested · 7 PM–7:30 PM/);assert.equal(availabilityFor(board,'2026-10-19').length,1);assert.equal(availabilityFor(board,'2026-10-18').length,0);assert.throws(()=>saveTimeBlock(md,{...proposal,start:'17:30',end:'18:30'}),/overlaps Reserved/);assert.throws(()=>saveTimeBlock(md,{...proposal,taskId:'clean-room',start:'19:15',end:'19:45'}),/overlaps another/);assert.throws(()=>saveTimeBlock(md,{...proposal,status:'scheduled'}),/verified calendar event ID/);
});
