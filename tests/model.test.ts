import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starter } from '../src/starter';
import { parseBoard, setEntry, saveTask, setGoal, startTimer, pauseTimer, resumeTimer, finishTimer, timerSeconds, planned, splitCells, cell, addDays } from '../src/model';

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
test('goal evidence and completion persist without modifying task entries',()=>{const md=setGoal(seed(),{id:'room-fit',due:'2026-10-31',page:'Room',title:'Keepers fit',evidence:'2 bags left | closet shuts',done:true});const b=parseBoard(md);assert.equal(b.goals[0].done,true);assert.equal(b.goals[0].evidence,'2 bags left | closet shuts');assert.equal(b.entries.length,0);});
test('timer survives sleep/restart through timestamps, pauses and resumes',()=>{
  const now=Date.parse('2026-10-18T14:00:00Z');let md=startTimer(seed(),'make-bed','2026-10-18',now);let timer=parseBoard(md).timer!;assert.equal(timerSeconds(timer,now+600000),600);
  md=pauseTimer(md,timer.id,now+601000);timer=parseBoard(md).timer!;assert.equal(timerSeconds(timer,now+900000),601);assert.equal(timer.started,'-');
  md=resumeTimer(md,timer.id,now+900000);assert.equal(timerSeconds(parseBoard(md).timer!,now+910000),611);
});
test('saving timer is exactly once, retains result, and never auto-completes or counts workouts',()=>{
  const now=Date.parse('2026-10-18T14:00:00Z');let md=startTimer(seed(),'workout','2026-10-18',now);const id=parseBoard(md).timer!.id;md=finishTimer(md,id,'Actual sets 4x10',now+90000);assert.equal(parseBoard(md).timer,null);assert.equal(parseBoard(md).sessions[0].seconds,90);assert.equal(parseBoard(md).entries.length,0);assert.equal(finishTimer(md,id,'duplicate',now+999999),md);
});
test('competing timers and stale controls cannot overwrite a running session',()=>{const now=Date.now();const md=startTimer(seed(),'make-bed','2026-10-18',now);assert.throws(()=>startTimer(md,'cook','2026-10-18',now+1),/already active/);assert.throws(()=>pauseTimer(md,'stale',now),/changed/);assert.throws(()=>finishTimer(md,'stale','',now),/changed/);});
test('calendar date arithmetic works across month boundaries',()=>{assert.equal(addDays('2026-10-31',1),'2026-11-01');assert.equal(addDays('2026-11-01',-1),'2026-10-31');});
