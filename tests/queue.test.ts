import {test} from 'node:test';
import assert from 'node:assert/strict';
import {starter} from '../src/starter';
import {enqueueTask,editQueue,startQuickQueue,advanceQuickQueue,queueNeedsAdvance,queueItemsFor,parseBoard,focusQueue,finishFocus,cancelTimer,pauseTimer,resumeTimer,refreshTimer,skipQuickQueue,setEntry,saveSubtask,dailyWins} from '../src/model';
import {mergePlan} from '../src/sync';
import {applyHudAction} from '../src/hud-protocol';
const day='2026-10-19',now=Date.parse(day+'T19:00:00Z');
function seed(){return enqueueTask(enqueueTask(starter(day),'make-bed',day),'brush-teeth',day);}

test('mixed queue persists in editable Markdown, schedules once, deduplicates and preserves original dates',()=>{
  let text=setEntry(starter(day),'2026-10-18','cook',false,'Chicken');text=enqueueTask(text,'make-bed',day);text=enqueueTask(text,'japanese',day);const before=text;text=enqueueTask(text,'japanese',day);
  const b=parseBoard(text);assert.equal(text,before);assert.deepEqual(b.queueItems.map(q=>q.taskId),['make-bed','japanese']);assert.equal(b.entries.find(e=>e.taskId==='cook')?.detail,'Chicken');assert.equal(b.entries.filter(e=>e.date===day).length,2);assert.equal(dailyWins(b,day).tasks,0);
  assert.equal(parseBoard(text.replace(/\n/g,'\r\n')).queueItems.length,2);
});
test('reorder, duration, remove, clear and daily isolation are validated',()=>{
  let text=seed(),b=parseBoard(text);text=editQueue(text,day,b.queueItems[1].id,'up');b=parseBoard(text);assert.equal(b.queueItems[0].taskId,'brush-teeth');text=editQueue(text,day,b.queueItems[0].id,'minutes',5);assert.equal(parseBoard(text).queueItems[0].minutes,5);assert.throws(()=>editQueue(text,day,b.queueItems[0].id,'minutes',NaN));
  text=enqueueTask(text,'japanese','2026-10-20');text=editQueue(text,day,b.queueItems[0].id,'remove');assert.equal(queueItemsFor(parseBoard(text),day).length,1);text=editQueue(text,day,'','clear');assert.equal(parseBoard(text).queueItems[0].date,'2026-10-20');
});
test('active ordering is stable; future edits and live appends preserve the current step',()=>{
  let text=startQuickQueue(seed(),day,now),b=parseBoard(text),timer=b.timer!;const first=focusQueue(b,timer)[0];assert.throws(()=>editQueue(text,day,first.id,'remove'),/locked/);assert.throws(()=>editQueue(text,day,b.queueItems[1].id,'up'),/current/);assert.throws(()=>editQueue(text,day,'','clear'),/Cancel/);
  text=enqueueTask(text,'japanese',day);b=parseBoard(text);assert.equal(b.timer!.itemIds!.length,3);assert.equal(focusQueue(b,b.timer!)[0].id,first.id);text=editQueue(text,day,b.queueItems[1].id,'down');b=parseBoard(text);assert.equal(focusQueue(b,b.timer!)[1].taskId,'japanese');
  text=editQueue(text,day,b.queueItems.find(q=>q.taskId==='brush-teeth')!.id,'remove');assert.equal(parseBoard(text).timer!.itemIds!.length,2);
});
test('automatic deadlines progress across resume gaps without inventing completions',()=>{
  let text=startQuickQueue(seed(),day,now),b=parseBoard(text),id=b.timer!.id;assert.equal(queueNeedsAdvance(b,now+119000),false);text=advanceQuickQueue(text,id,0,now+125000);b=parseBoard(text);assert.equal(b.timer!.cursor,1);assert.equal(b.timer!.stepOffset,120);assert.equal(dailyWins(b,day).tasks,0);assert.equal(advanceQuickQueue(text,id,0,now+130000),text);
  text=advanceQuickQueue(text,id,1,now+3600000);b=parseBoard(text);assert.equal(b.timer,null);assert.equal(b.sessions[0].seconds,240);assert.equal(dailyWins(b,day).tasks,0);assert.match(b.sessions[0].note,/not inferred/);
});
test('pause, reset, zero-duration holds, Finish and Skip retain distinct semantics',()=>{
  let text=seed(),second=parseBoard(text).queueItems[1].id;text=editQueue(text,day,second,'minutes',0);text=startQuickQueue(text,day,now);const id=parseBoard(text).timer!.id;text=pauseTimer(text,id,now+30000);assert.equal(advanceQuickQueue(text,id,0,now+900000),text);text=resumeTimer(text,id,now+900000);text=refreshTimer(text,id,now+901000);text=advanceQuickQueue(text,id,0,now+1021000);let b=parseBoard(text);assert.equal(b.timer!.cursor,1);assert.equal(queueNeedsAdvance(b,now+99999999),false);
  text=skipQuickQueue(text,id,now+1022000);assert.equal(parseBoard(text).timer,null);assert.equal(dailyWins(parseBoard(text),day).tasks,0);
  text=startQuickQueue(seed(),day,now);b=parseBoard(text);text=finishFocus(text,b.timer!.id,focusQueue(b,b.timer!)[0].id,'',now+30000);b=parseBoard(text);assert.equal(b.timer!.cursor,1);assert.equal(dailyWins(b,day).tasks,1);text=cancelTimer(text,b.timer!.id);assert.equal(dailyWins(parseBoard(text),day).tasks,1);assert.equal(parseBoard(text).queueItems.length,2);
});
test('roadmap steps expand once and Finish checks only the exact subtask',()=>{
  let text=saveSubtask(starter(day),{id:'portfolio-first',taskId:'audio-portfolio',context:'-',minutes:5,title:'Choose one reel',definition:'Name saved',done:false,completed:'-'});text=saveSubtask(text,{id:'portfolio-second',taskId:'audio-portfolio',context:'-',minutes:10,title:'Export reel',definition:'File saved',done:false,completed:'-'});text=enqueueTask(text,'audio-portfolio',day);text=startQuickQueue(text,day,now);let b=parseBoard(text);assert.equal(focusQueue(b,b.timer!).length,2);text=finishFocus(text,b.timer!.id,focusQueue(b,b.timer!)[0].id);b=parseBoard(text);assert.equal(b.subtasks[0].done,true);assert.equal(b.subtasks[1].done,false);assert.equal(b.entries[0].done,false);
});
test('planner changes cannot overwrite a phone queue; bridge actions use the same rules',()=>{
  const base=starter(day),current=seed(),proposal=enqueueTask(base,'japanese',day),merged=mergePlan(base,current,proposal);assert.deepEqual(parseBoard(merged.text).queueItems,parseBoard(current).queueItems);assert.ok(merged.protected.some(s=>s.startsWith('queueItems')));
  let text=applyHudAction(base,{kind:'queue-add',taskId:'make-bed',date:day},now);text=applyHudAction(text,{kind:'queue-start',date:day},now);assert.ok(parseBoard(text).timer);assert.throws(()=>applyHudAction(text,{kind:'queue-edit',date:day,operation:'evil'}));
});

test('queue meditation honors the minimum and manually reordered rows cannot retarget a running step',()=>{
  let text=enqueueTask(starter(day),'mindfulness',day),item=parseBoard(text).queueItems[0];assert.equal(item.minutes,15);assert.throws(()=>editQueue(text,day,item.id,'minutes',2),/15-minute/);
  text=enqueueTask(seed(),'japanese',day);text=startQuickQueue(text,day,now);let b=parseBoard(text),id=b.timer!.itemIds![0];const rows=text.split('\n'),first=rows.findIndex(row=>row.startsWith('| '+id+' |')),third=rows.findIndex(row=>row.startsWith('| '+b.queueItems[2].id+' |'));[rows[first],rows[third]]=[rows[third],rows[first]];text=rows.join('\n');text=editQueue(text,day,b.queueItems[1].id,'minutes',7);b=parseBoard(text);assert.equal(focusQueue(b,b.timer!)[0].id,id);
});
