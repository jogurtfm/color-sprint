import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starter } from '../src/starter';
import { parseBoard, focusMinutes, focusQueue, startTimer, startGroupTimer, scheduleGroup, setEntry, pauseTimer, refreshTimer, FOCUS_TARGET_HEADER, planned } from '../src/model';
import { addRoadmap } from '../src/roadmaps';

const targets=(rows:string)=>`\n## Focus Targets\n\n${FOCUS_TARGET_HEADER}\n| --- | --- | --- |\n${rows}\n`;
test('dated focus targets override only their day and do not schedule or complete tasks',()=>{
  const text=starter('2026-10-18')+targets('| 2026-10-18 | japanese | 10 |\n| 2026-10-21 | japanese | 15 |\n| 2026-10-24 | japanese | 20 |\n| 2026-10-28 | japanese | 25 |');const b=parseBoard(text),task=b.tasks.find(t=>t.id==='japanese')!;
  for(const [day,min] of [['2026-10-18',10],['2026-10-21',15],['2026-10-24',20],['2026-10-28',25]] as const){assert.equal(focusMinutes(b,task,day),min);const running=parseBoard(startTimer(text,task.id,day));assert.equal(running.timer!.target,min*60);assert.equal(focusQueue(running,running.timer!)[0].minutes,min);assert.equal(planned(b,task,day),false);}
  assert.equal(focusMinutes(b,task,'2026-10-29'),15);assert.equal(b.entries.length,0);assert.equal(b.sessions.length,0);assert.equal(b.timer,null);
});

test('group queue uses its recorded date and preserves explicit roadmap step times',()=>{
  const day='2026-10-28';let md=starter('2026-10-18')+targets(`| ${day} | japanese | 25 |\n| ${day} | lyrics | 40 |`);md=scheduleGroup(md,{kind:'color',value:'purple'},day);md=startGroupTimer(md,{kind:'color',value:'purple'},day);let b=parseBoard(md);assert.equal(focusQueue(b,b.timer!).find(step=>step.taskId==='japanese')!.minutes,25);assert.equal(focusQueue(b,b.timer!).find(step=>step.taskId==='lyrics')!.minutes,40);
  md=addRoadmap(md,'japanese');b=parseBoard(md);assert.deepEqual(focusQueue(b,b.timer!).filter(step=>step.taskId==='japanese').map(step=>step.minutes),[5,15,5]);
});

test('a standalone timer captures its target and does not jump after editing future plans',()=>{
  const now=Date.parse('2026-10-18T14:00:00Z');let md=startTimer(starter('2026-10-18')+targets('| 2026-10-18 | japanese | 10 |'),'japanese','2026-10-18',now);const timer=parseBoard(md).timer!;md=md.replace('| japanese | 10 |','| japanese | 30 |');md=pauseTimer(md,timer.id,now+60000);md=refreshTimer(md,timer.id,now+70000);const b=parseBoard(md);assert.equal(focusMinutes(b,b.tasks.find(t=>t.id==='japanese')!,'2026-10-18'),30);assert.equal(b.timer!.target,600);assert.equal(focusQueue(b,b.timer!)[0].minutes,10);
});

test('dated targets reject malformed, ambiguous or unknown data, preserve Markdown on checkbox writes and allow explicit stopwatch targets',()=>{
  const base=starter('2026-10-18');for(const row of ['| 2026-02-30 | japanese | 10 |','| 2026-10-18 | unknown | 10 |','| 2026-10-18 | japanese | -5 |','| 2026-10-18 | japanese | 1441 |','| 2026-10-18 | japanese | ten |','| 2026-10-18 | japanese | 10 |\n| 2026-10-18 | japanese | 20 |'])assert.throws(()=>parseBoard(base+targets(row)));
  const section=targets('| 2026-10-18 | japanese | 0 |');const md=setEntry(base+section,'2026-10-18','japanese',true,'Original evidence');assert.ok(md.endsWith(section));const b=parseBoard(startTimer(md,'japanese','2026-10-18'));assert.equal(b.timer!.target,0);assert.equal(focusQueue(b,b.timer!)[0].minutes,0);assert.equal(parseBoard(base).focusTargets.length,0);
});
