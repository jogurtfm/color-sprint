import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starter } from '../src/starter';
import { parseBoard, setEntry, saveTask, saveSubtask, startTimer, saveTimeBlock, saveFocusTarget } from '../src/model';
import { mergePlan, checkboxChanges, recoverPhoneChecks, syncNote, parseProposal, parseCheckpoint, PhoneCheckpoint } from '../src/sync';
import { addWorkoutLog, addQuickCount, finishTimer } from '../src/model';
const day='2026-10-18';
test('planning merges retain phone checkoffs, evidence, timers and logs while applying new definitions/times',()=>{
  const base=setEntry(starter(day),day,'japanese',false,'Original lesson');let current=setEntry(base,day,'japanese',true,'Actual lesson completed');current=startTimer(current,'make-bed',day,1792328400000);
  const proposed=saveTask(saveFocusTarget(base,{date:day,taskId:'japanese',minutes:20}),{...parseBoard(base).tasks.find(t=>t.id==='japanese')!,definition:'New proposed lesson criterion'});
  const result=mergePlan(base,current,proposed);const board=parseBoard(result.text);assert.equal(board.entries.find(e=>e.taskId==='japanese')!.done,true);assert.equal(board.entries.find(e=>e.taskId==='japanese')!.detail,'Actual lesson completed');assert.deepEqual(board.timer,parseBoard(current).timer);assert.equal(board.tasks.find(t=>t.id==='japanese')!.definition,'New proposed lesson criterion');assert.equal(board.focusTargets[0].minutes,20);assert.deepEqual(result.conflicts,[]);assert.equal(mergePlan(base,result.text,proposed).text,result.text);
});
test('same-field disagreement and deletions never silently choose a side',()=>{
  const base=starter(day),task=parseBoard(base).tasks[0];const current=saveTask(base,{...task,title:'My phone name'}),proposed=saveTask(base,{...task,title:'Planner name'});const result=mergePlan(base,current,proposed);assert.match(result.conflicts.join('\n'),/changed on both sides/);assert.equal(parseBoard(result.text).tasks[0].title,'My phone name');const removed=base.replace(/^\| make-bed .*\n/m,'');assert.match(mergePlan(base,base,removed).conflicts.join('\n'),/deletion requires review/);
});
test('planner completion claims and fabricated sessions are ignored, not proof of work',()=>{
  const base=starter(day);const proposed=setEntry(base,day,'japanese',true,'Proposed plan');const result=mergePlan(base,base,proposed);assert.equal(parseBoard(result.text).entries[0].done,false);assert.match(result.protected.join('\n'),/actual progress preserved/);assert.equal(parseBoard(result.text).sessions.length,0);
});
test('subtask text refinements preserve completion date and checked state',()=>{
  const sub={id:'portfolio-scope',taskId:'audio-portfolio',context:'-',minutes:10,title:'Choose scope',definition:'One selected page',done:false,completed:'-'};
  const base=saveSubtask(starter(day),sub),current=saveSubtask(base,{...sub,done:true,completed:day}),proposed=saveSubtask(base,{...sub,title:'Choose the published page'});const row=parseBoard(mergePlan(base,current,proposed).text).subtasks[0];assert.equal(row.done,true);assert.equal(row.completed,day);assert.equal(row.title,'Choose the published page');
});
test('conflicting time blocks stay atomic and retain the current time',()=>{
  const block={date:day,taskId:'japanese',start:'19:00',end:'19:20',timezone:'America/Chicago',status:'suggested' as const,eventId:'-',eventUrl:'-'};const base=saveTimeBlock(starter(day),block),current=saveTimeBlock(base,{...block,start:'20:00',end:'20:20'}),proposed=saveTimeBlock(base,{...block,start:'21:00',end:'21:20'});const result=mergePlan(base,current,proposed);assert.match(result.conflicts.join('\n'),/changed on both sides/);assert.equal(parseBoard(result.text).timeBlocks[0].start,'20:00');
});
function record(sequence:number,done:boolean,device='phone-one'):PhoneCheckpoint{return {version:1,id:`record-${sequence}`,device,sequence,created:'2026-10-18T20:00:00Z',tracker:'Sync/Color Sprint.md',checks:[{kind:'entry',date:day,id:'japanese',done}]};}
test('phone recovery retains intentional unchecks, uses logical sequence not clocks and leaves multi-phone disagreements unresolved',()=>{
  const text=setEntry(starter(day),day,'japanese',true);const result=recoverPhoneChecks(text,[record(2,false),{...record(1,true),created:'2099-01-01T00:00:00Z'}]);assert.equal(parseBoard(result.text).entries[0].done,false);assert.match(result.changes[0],/unchecked/);const conflict=recoverPhoneChecks(text,[record(2,false),record(3,true,'tablet-two')]);assert.equal(conflict.text,text);assert.match(conflict.conflicts.join('\n'),/devices disagree/);
});
test('checkpoint deltas record real checkbox changes, not blank schedule placement',()=>{
  const base=starter(day);assert.deepEqual(checkboxChanges(base,setEntry(base,day,'japanese',false)),[]);assert.equal(checkboxChanges(base,setEntry(base,day,'japanese',true))[0].done,true);assert.equal(checkboxChanges(setEntry(base,day,'japanese',true),setEntry(base,day,'japanese',false))[0].done,false);
});
test('proposal and phone recovery records validate schema and round trip as ordinary Markdown',()=>{
  const proposal={version:1 as const,id:'proposal-one',tracker:'Sync/Color Sprint.md',created:'2026-10-18T20:00:00Z',base:starter(day),proposed:starter(day)};assert.deepEqual(parseProposal(syncNote('proposal',proposal)),proposal);assert.deepEqual(parseCheckpoint(syncNote('phone-checkpoint',record(1,true))),record(1,true));assert.throws(()=>parseProposal(syncNote('proposal',{...proposal,tracker:'../Secret.md'})),/vault-relative/);assert.throws(()=>parseCheckpoint(syncNote('phone-checkpoint',{...record(1,true),sequence:-1})),/Invalid/);
});
test('planner snapshots never erase actual sessions, workout measurements or increment history',()=>{
  const base=starter(day);let current=startTimer(base,'japanese',day,1000000);current=finishTimer(current,parseBoard(current).timer!.id,'Actual saved practice',1060000);current=addWorkoutLog(current,{date:day,taskId:'treadmill',minutes:12,distance:0.5,details:'Actual measured walk',note:'Not a prescribed target'});current=addQuickCount(current,{date:day,taskId:'pushups',amount:1,unit:'reps'});const proposed=saveTask(base,{...parseBoard(base).tasks[0],definition:'New planning definition'});const result=parseBoard(mergePlan(base,current,proposed).text),before=parseBoard(current);assert.deepEqual(result.sessions,before.sessions);assert.deepEqual(result.workoutLogs,before.workoutLogs);assert.deepEqual(result.quickCounts,before.quickCounts);
});
test('phone checkpoint replay is idempotent and missing-parent recovery is flagged',()=>{
  const text=setEntry(starter(day),day,'japanese',false),r=recoverPhoneChecks(text,[record(1,true)]);assert.equal(recoverPhoneChecks(r.text,[record(1,true)]).changes.length,0);const invalidParent={...record(2,true),checks:[{kind:'entry' as const,date:day,id:'removed-task',done:true}]};const blocked=recoverPhoneChecks(text,[invalidParent]);assert.equal(blocked.text,text);assert.match(blocked.conflicts.join('\n'),/Task removed/);
});
