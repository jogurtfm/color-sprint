import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starter } from '../src/starter';
import { AVAILABILITY_HEADER, parseBoard, saveTimeBlock, setEntry } from '../src/model';
import { itinerary } from '../src/digest';

test('digest sorts protected and suggested blocks, counts only task minutes, and retains completed tasks',()=>{
  const day='2026-10-19';let md=setEntry(setEntry(starter('2026-10-18'),day,'japanese',true,'One lesson'),day,'hard-task',false,'2020 Tax');
  md+=`\n## Availability\n\n${AVAILABILITY_HEADER}\n| --- | --- | --- | --- | --- | --- |\n| coffee | Coffee shop | daily | 07:00 | 09:00 | America/Chicago |\n| work | Work | mon,tue,wed,thu,fri | 10:00 | 18:00 | America/Chicago |\n`;
  md=saveTimeBlock(md,{date:day,taskId:'hard-task',start:'19:00',end:'19:25',timezone:'America/Chicago',status:'suggested',eventId:'-',eventUrl:'-'});
  const board=parseBoard(md),plan=itinerary(board,day);
  assert.deepEqual(plan.timed.map(item=>item.title),['Coffee shop','Work','Hard Task']);assert.equal(plan.minutes,25);
  assert.deepEqual(plan.flexible.map(task=>task.id),['japanese']);assert.equal(plan.available.length,20);assert.equal(plan.timed[2].done,false);assert.ok(plan.timed.every(item=>!item.conflict));assert.equal(board.entries.length,2);
  const done=itinerary(parseBoard(setEntry(md,day,'hard-task',true)),day);assert.equal(done.timed[2].done,true);assert.equal(done.timed[2].block?.status,'suggested');
  assert.deepEqual(itinerary(board,'2026-10-18').timed.map(item=>item.title),['Coffee shop']);
});

test('digest flags overlapping manual Markdown edits and never treats blank dates as missed tasks',()=>{
  const day='2026-10-18';let md=saveTimeBlock(starter(day),{date:day,taskId:'cook',start:'19:00',end:'19:30',timezone:'America/Chicago',status:'suggested',eventId:'-',eventUrl:'-'});
  md+=`\n## Availability\n\n${AVAILABILITY_HEADER}\n| --- | --- | --- | --- | --- | --- |\n| reserved | Reserved | daily | 19:15 | 20:00 | America/Chicago |\n`;
  const plan=itinerary(parseBoard(md),day);assert.ok(plan.timed.every(item=>item.conflict));assert.equal(plan.minutes,30);
  const blank=itinerary(parseBoard(starter(day)),day);assert.equal(blank.timed.length,0);assert.equal(blank.flexible.length,0);assert.equal(blank.available.length,22);assert.equal(blank.minutes,0);
});
