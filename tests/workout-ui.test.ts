import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {starter} from '../src/starter';
import {saveSubtask,setEntry,parseBoard} from '../src/model';
import {mountWorkoutSteps} from '../src/workout-ui';
const {JSDOM}=createRequire(import.meta.url)('jsdom'),day='2026-10-27';
test('workout steps expose readable targets and explicit controls, without a second whole-workout check',async()=>{const dom=new JSDOM('<main></main>'),root=dom.window.document.querySelector('main');let text=setEntry(starter(day),day,'workout',false,'Upper body '+day);text=saveSubtask(text,{id:'upper-step',taskId:'workout',context:'Upper body '+day,minutes:0,title:'Standing Press · 3 × 8 · ~65 lbs',definition:'Log actuals',done:false,completed:'-'});const b=parseBoard(text),task=b.tasks.find(t=>t.id==='workout')!,calls:any[]=[];mountWorkoutSteps(root,b,task,day,false,async(sub,done)=>{calls.push([sub.id,done]);},async()=>{calls.push('focus');});assert.match(root.textContent,/3 × 8 · ~65 lbs/);root.querySelector('input').click();await new Promise(r=>setTimeout(r,1));root.querySelector('button').click();await new Promise(r=>setTimeout(r,1));assert.deepEqual(calls,[['upper-step',true],'focus']);assert.equal(root.querySelectorAll('input').length,1);assert(!b.entries[0].done);const future=dom.window.document.createElement('main');mountWorkoutSteps(future,b,task,'2026-10-28',false,async()=>{},async()=>{});assert.equal(future.children.length,0);dom.window.close();});
