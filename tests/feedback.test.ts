import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Feedback, DEFAULT_FEEDBACK } from '../src/feedback';
const {JSDOM}=createRequire(import.meta.url)('jsdom');

test('completion feedback honors each preference, reduced motion, and cleans up',async()=>{
  const dom=new JSDOM('<body><main></main></body>');let prefs={...DEFAULT_FEEDBACK},notes=0,vibrations=0,closed=0,reduced=false;
  class Audio {state='running';currentTime=0;destination={};resume(){return Promise.resolve();}close(){closed++;return Promise.resolve();}createOscillator(){return {type:'',frequency:{value:0},connect(){return {connect(){}};},start(){notes++;},stop(){},disconnect(){}};}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},disconnect(){}};}}
  Object.defineProperty(dom.window,'AudioContext',{value:Audio});Object.defineProperty(dom.window.navigator,'vibrate',{value:()=>{vibrations++;return true;}});Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:reduced})});
  const fx=new Feedback(dom.window.document.querySelector('main')!,()=>prefs);
  try{fx.prepare();fx.show('One real win','#ea9999');assert.equal(notes,3);assert.equal(vibrations,1);assert.equal(dom.window.document.querySelectorAll('.cs-feedback-burst i').length,12);assert.equal(dom.window.document.querySelector('[role=status]')!.textContent,'✓One real win');
    prefs={sound:false,haptics:false,motion:false};fx.show('+5 reps','#fff2cc','increment');assert.equal(notes,3);assert.equal(vibrations,1);assert.equal(dom.window.document.querySelectorAll('.cs-feedback-burst').length,0);
    prefs={...DEFAULT_FEEDBACK};reduced=true;fx.show('Reduced motion');assert.equal(notes,6);assert.equal(vibrations,2);assert.equal(dom.window.document.querySelectorAll('.cs-feedback-burst').length,0);
  }finally{fx.destroy();assert.equal(dom.window.document.querySelectorAll('.cs-feedback-layer').length,0);assert.equal(closed,1);dom.window.close();}
});

test('missing or denied sound and vibration APIs never prevent the visual confirmation',()=>{
  const dom=new JSDOM('<body><main></main></body>');Object.defineProperty(dom.window,'AudioContext',{value:class {constructor(){throw new Error('Unsupported');}}});Object.defineProperty(dom.window.navigator,'vibrate',{value:()=>{throw new Error('Denied');}});
  const fx=new Feedback(dom.window.document.querySelector('main')!,()=>DEFAULT_FEEDBACK);
  try{assert.doesNotThrow(()=>{fx.prepare();fx.show('Saved');});assert.match(dom.window.document.body.textContent!,/Saved/);fx.destroy();fx.show('Must not reappear');assert.equal(dom.window.document.querySelectorAll('.cs-feedback-layer').length,0);}finally{fx.destroy();dom.window.close();}
});
