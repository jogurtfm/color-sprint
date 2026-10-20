import {test} from 'node:test';
import assert from 'node:assert/strict';
import {starter} from '../src/starter';
import {parseBoard,setEntry,setTaskCompletion,saveCompletionRating,completionLevel,saveFinishMultiplier,saveSubtask,setSubtaskDone,startTimer,startGroupTimer,completeFocusStep,finishFocus,focusQueue,enqueueTask,startQuickQueue,cancelTimer,moveTask,dailyWins} from '../src/model';
import {completionPoints,dailyScore} from '../src/effort';
import {checkboxChanges,recoverPhoneChecks,mergePlan,validateCheckpoint,PhoneCheck,PhoneCheckpoint} from '../src/sync';
import {applyHudAction} from '../src/hud-protocol';
const day='2026-10-20',now=1792494000000,seed=()=>starter(day);
const record=(checks:PhoneCheck[],sequence=1):PhoneCheckpoint=>({version:1,id:'phone-record-'+sequence,device:'phone-primary',tracker:'Sync/Color Sprint.md',sequence,created:new Date(now).toISOString(),checks});

test('rated finish awards 50/100/150 percent without extra wins or inferred completion',()=>{
  let text=seed();for(const [level,points] of [['light',5],['solid',10],['full',15]] as const){text=setTaskCompletion(text,day,'make-bed',true,level);const b=parseBoard(text);assert.equal(dailyScore(b,day).points,points);assert.equal(dailyWins(b,day).tasks,1);assert.equal(b.sessions.length,0);assert.equal(b.completionRatings.length,1);assert.equal(completionLevel(b,day,'task','make-bed'),level);}
  text=setTaskCompletion(text,day,'make-bed',false);assert.equal(parseBoard(text).completionRatings.length,0);assert.equal(dailyScore(parseBoard(text),day).points,0);text=setTaskCompletion(text,day,'make-bed',true);assert.equal(completionLevel(parseBoard(text),day,'task','make-bed'),null);assert.equal(dailyScore(parseBoard(text),day).points,10);
  const ratingOnly=saveCompletionRating(seed(),{date:day,target:'task',id:'make-bed',level:'full'});assert.equal(dailyScore(parseBoard(ratingOnly),day).points,0);assert.equal(dailyScore(parseBoard(setEntry(seed(),day,'make-bed',true)),day).points,10);
});

test('multiplier Markdown is bounded, round-trips CRLF and does not change unrated points',()=>{
  let text=seed().replace(/\r?\n/g,'\r\n');text=saveFinishMultiplier(text,{level:'full',multiplier:1.25});const b=parseBoard(text),task=b.tasks.find(t=>t.id==='make-bed')!;assert.equal(completionPoints(b,task,'full'),12.5);assert.equal(completionPoints(b,task,null),10);assert.equal(text.replace(/\r\n/g,'').includes('\n'),false);assert.throws(()=>saveFinishMultiplier(text,{level:'full',multiplier:3.1}));assert.throws(()=>saveFinishMultiplier(text,{level:'solid',multiplier:-1}));assert.throws(()=>saveCompletionRating(text,{date:day,target:'task',id:'make-bed',level:'bad' as any}));assert.throws(()=>parseBoard(text.replace('| full | 1.25 |','| full | 1.25 |\r\n| full | 2 |')));
});

test('moved obligations deduplicate rated points while independent obligations stay distinct',()=>{
  let text=moveTask(setEntry(seed(),day,'hard-task',false,'Tax'),'hard-task',day,'2026-10-22',now);text=setTaskCompletion(text,day,'hard-task',true,'light');text=setTaskCompletion(text,'2026-10-22','hard-task',true,'full');text=setEntry(text,'2026-10-23','hard-task',false,'Letters');text=setTaskCompletion(text,'2026-10-23','hard-task',true,'solid');assert.equal(dailyScore(parseBoard(text),day).points,20);assert.equal(dailyScore(parseBoard(text),'2026-10-22').points,0);assert.equal(dailyScore(parseBoard(text),'2026-10-23').points,40);
});

test('subtask rating records a step win, never duplicate task points, and clears on uncheck',()=>{
  let text=saveSubtask(seed(),{id:'portfolio-step',taskId:'audio-portfolio',context:'-',minutes:10,title:'Choose reel',definition:'Name examples',done:false,completed:'-'});text=setSubtaskDone(text,'portfolio-step',true,day,'full');assert.equal(completionLevel(parseBoard(text),day,'subtask','portfolio-step'),'full');assert.equal(dailyScore(parseBoard(text),day).points,0);assert.equal(dailyWins(parseBoard(text),day).subtasks,1);text=setSubtaskDone(text,'portfolio-step',false,day);assert.equal(parseBoard(text).completionRatings.length,0);assert.equal(parseBoard(text).entries.length,0);
});

test('graded group and Quick Queue advance only current step and reject stale cursor replay',()=>{
  let text=seed();for(const id of ['make-bed','brush-teeth','clean-kitchen'])text=setEntry(text,day,id,false);text=startGroupTimer(text,{kind:'color',value:'pink'},day,now);let b=parseBoard(text),id=b.timer!.id;text=completeFocusStep(text,id,0,now+1000,'light');b=parseBoard(text);assert.equal(b.timer!.cursor,1);assert.equal(b.completionRatings[0].id,'make-bed');assert.equal(b.entries.filter(e=>e.done).length,1);assert.throws(()=>completeFocusStep(text,id,0,now+2000,'full'),/changed/);text=cancelTimer(text,id);assert.equal(parseBoard(text).completionRatings.length,1);
  text=enqueueTask(seed(),'make-bed',day);text=enqueueTask(text,'brush-teeth',day);text=startQuickQueue(text,day,now);b=parseBoard(text);id=b.timer!.id;const step=focusQueue(b,b.timer!)[0];text=finishFocus(text,id,step.id,'',now+1000,'full',0);assert.equal(parseBoard(text).timer!.cursor,1);assert.equal(dailyScore(parseBoard(text),day).points,15);assert.throws(()=>finishFocus(text,id,step.id,'',now+2000,'full',0),/advanced/);assert.equal(parseBoard(text).sessions.length,0);
});

test('focus finish saves rating once; cancel and timer-only passage infer none',()=>{
  let text=startTimer(seed(),'make-bed',day,now),b=parseBoard(text);assert.equal(b.completionRatings.length,0);const id=b.timer!.id,step=focusQueue(b,b.timer!)[0];const cancelled=cancelTimer(text,id);assert.equal(dailyScore(parseBoard(cancelled),day).points,0);text=finishFocus(text,id,step.id,'Saved',now+1000,'solid',0);assert.equal(parseBoard(text).sessions.length,1);assert.equal(parseBoard(text).completionRatings.length,1);assert.equal(finishFocus(text,id,step.id,'Saved',now+1000,'solid',0),text);
});

test('phone checkpoints include rating-only changes and explicit clearing; legacy checkpoints retain rating',()=>{
  const base=setTaskCompletion(seed(),day,'make-bed',true,'light'),rated=setTaskCompletion(base,day,'make-bed',true,'full');const checks=checkboxChanges(base,rated);assert.equal(checks.length,1);assert.equal((checks[0] as any).level,'full');const restored=recoverPhoneChecks(base,[record(checks)]);assert.equal(completionLevel(parseBoard(restored.text),day,'task','make-bed'),'full');const unchecked=setTaskCompletion(rated,day,'make-bed',false),off=checkboxChanges(rated,unchecked);assert.equal((off[0] as any).level,null);const recovered=recoverPhoneChecks(rated,[record(checks),record(off,2)]);assert.equal(parseBoard(recovered.text).completionRatings.length,0);assert.equal(dailyScore(parseBoard(recovered.text),day).points,0);const legacy=record([{kind:'entry',date:day,id:'make-bed',done:true}]);assert.equal(recoverPhoneChecks(rated,[legacy]).text,rated);assert.throws(()=>validateCheckpoint(record([{kind:'entry',date:day,id:'make-bed',done:false,level:'full'}])));assert.throws(()=>validateCheckpoint(record([{kind:'entry',date:day,id:'make-bed',done:true,level:'malicious' as any}])));
});

test('planning proposals cannot rewrite actual ratings; multipliers use three-way review',()=>{
  const base=setTaskCompletion(seed(),day,'make-bed',true,'light'),current=setTaskCompletion(base,day,'make-bed',true,'full');let proposal=saveFinishMultiplier(setTaskCompletion(base,day,'make-bed',true,'solid'),{level:'full',multiplier:2});const result=mergePlan(base,current,proposal);assert.equal(completionLevel(parseBoard(result.text),day,'task','make-bed'),'full');assert.equal(parseBoard(result.text).finishMultipliers[0].multiplier,2);assert.ok(result.protected.some(x=>x.includes('completionRatings')));proposal=saveFinishMultiplier(base,{level:'full',multiplier:1.8});const conflict=mergePlan(base,saveFinishMultiplier(current,{level:'full',multiplier:1.7}),proposal);assert.ok(conflict.conflicts.some(x=>x.includes('multiplier')));
});

test('latest unrated phone recheck clears a stale desktop grade after an intermediate uncheck',()=>{
  const rated=setTaskCompletion(seed(),day,'make-bed',true,'full'),off=setTaskCompletion(rated,day,'make-bed',false),plain=setTaskCompletion(off,day,'make-bed',true);const checks=checkboxChanges(off,plain);assert.equal((checks[0] as any).level,null);const restored=recoverPhoneChecks(rated,[record(checkboxChanges(seed(),rated)),record(checkboxChanges(rated,off),2),record(checks,3)]);assert.equal(completionLevel(parseBoard(restored.text),day,'task','make-bed'),null);assert.equal(dailyScore(parseBoard(restored.text),day).points,10);const dormant=saveCompletionRating(seed(),{date:day,target:'task',id:'make-bed',level:'full'});assert.deepEqual(checkboxChanges(dormant,startTimer(dormant,'brush-teeth',day,now)),[]);
});

test('HUD rated actions validate level, current cursor and unchanged canonical fields',()=>{
  let text=applyHudAction(seed(),{kind:'complete-rated',taskId:'make-bed',date:day,operation:'light'});assert.equal(dailyScore(parseBoard(text),day).points,5);assert.throws(()=>applyHudAction(text,{kind:'complete-rated',taskId:'make-bed',date:day,operation:'fake'}));text=startTimer(text,'brush-teeth',day,now);const b=parseBoard(text),timer=b.timer!,step=focusQueue(b,timer)[0];assert.throws(()=>applyHudAction(text,{kind:'finish-rated',timerId:timer.id,stepId:step.id,operation:'solid',cursor:1}));const result=applyHudAction(text,{kind:'finish-rated',timerId:timer.id,stepId:step.id,operation:'solid',cursor:0},now+1000);assert.equal(parseBoard(result).timer,null);assert.equal(parseBoard(result).completionRatings.length,2);
});
