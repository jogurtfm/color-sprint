import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voicePath, voiceScaffold, recorderState, requireRecorder, requireRecording, hasNewAudioEmbed, waitForAudioEmbed, mountRecordingBar, mountVoicePanel } from '../src/voice';
import { createRequire } from 'node:module';
const {JSDOM}=createRequire(import.meta.url)('jsdom');

test('voice journals use dated visible vault Markdown and do not opt into daily redirects',()=>{
  assert.equal(voicePath('Sync/Reflection/Voice','2026-10-18'),'Sync/Reflection/Voice/2026-10-18.md');
  for(const path of ['../Other','.obsidian','C:/Other','/Other','Sync//Voice'])assert.throws(()=>voicePath(path,'2026-10-18'),/vault-relative/);
  assert.throws(()=>voicePath('Voice','2026-02-30'),/real/);assert.throws(()=>voiceScaffold('invalid'),/real/);
  const md=voiceScaffold('2026-10-18');assert.match(md,/voice-reflection-date: "2026-10-18"/);assert.ok(!md.includes('color-sprint: true'));assert.ok(md.endsWith('## Recordings\n\n'));assert.ok(!md.includes('- [ ]'));assert.match(md,/Stay in this note/);
});

test('core recorder bridge checks availability and existing recordings without executing commands',()=>{
  assert.deepEqual(recorderState(),{available:false,recording:null});assert.throws(()=>requireRecorder(),/Enable Audio recorder/);
  let executed=0;let recording=false;const bridge={commands:{'audio-recorder:start':{},'audio-recorder:stop':{checkCallback:(checking:boolean)=>{assert.equal(checking,true);return recording;}}},executeCommandById:()=>{executed++;return true;}};
  assert.deepEqual(recorderState(bridge),{available:true,recording:false});assert.doesNotThrow(()=>requireRecorder(bridge));assert.equal(executed,0);recording=true;assert.throws(()=>requireRecorder(bridge),/already recording/);assert.equal(executed,0);
  bridge.commands['audio-recorder:stop'].checkCallback=()=>{throw new Error('Changed API');};assert.deepEqual(recorderState(bridge),{available:true,recording:null});assert.throws(()=>requireRecorder(bridge),/status is unavailable/);
});

test('stop validation and audio confirmation reject missing or unchanged recordings',async()=>{
  assert.throws(()=>requireRecording(),/unavailable/);const bridge={commands:{'audio-recorder:start':{},'audio-recorder:stop':{checkCallback:()=>false}},executeCommandById:()=>true};assert.throws(()=>requireRecording(bridge),/No audio recording/);bridge.commands['audio-recorder:stop'].checkCallback=()=>true;assert.doesNotThrow(()=>requireRecording(bridge));
  const before='# Journal\n![[Old.m4a]]\n';assert.equal(hasNewAudioEmbed(before,before+'Just text.'),false);assert.equal(hasNewAudioEmbed(before,before+'\n![[photo.png]]'),false);assert.equal(hasNewAudioEmbed(before,before+'\n![[New.webm]]'),true);assert.equal(hasNewAudioEmbed(before,before+'\n![Voice](Recording%20new.m4a)'),true);assert.equal(hasNewAudioEmbed(before,before+'\n![[Old.m4a]]'),true);assert.equal(hasNewAudioEmbed(before,before+'\n![[New.m4a.jpg]]'),false);
  await assert.rejects(()=>waitForAudioEmbed(before,()=>before,{timeoutMs:20,pollMs:5}),/not confirmed/);await assert.rejects(()=>waitForAudioEmbed(before,()=>before,{cancelled:()=>true}),/interrupted/);let value=before;setTimeout(()=>value+='\n![[Added.wav]]',5);await waitForAudioEmbed(before,()=>value,{timeoutMs:100,pollMs:5});
});

test('recording bar remains outside tracker content, stops once, and shows Saving until completion',async()=>{
  const dom=new JSDOM('<body><main></main></body>');let state={available:true,recording:true,saving:false},calls=0;let resolve!:()=>void;const errors:unknown[]=[];
  const control=mountRecordingBar(dom.window.document.body,{state:()=>state,stop:async()=>{calls++;state={...state,saving:true};control.update();await new Promise<void>(r=>resolve=r);state={...state,recording:false,saving:false};},error:e=>errors.push(e),target:()=> 'Voice/selected-day.md'});
  try{const button=dom.window.document.querySelector('[aria-label="Stop and save audio recording"]') as HTMLButtonElement;dom.window.document.querySelector('main')!.replaceChildren();assert.ok(button.isConnected);button.click();button.click();assert.equal(calls,1);assert.equal(button.disabled,true);assert.match(dom.window.document.body.textContent!,/Saving recording/);resolve();await new Promise(r=>setTimeout(r,0));assert.equal(dom.window.document.querySelector('.cs-recording-bar'),null);assert.deepEqual(errors,[]);}finally{control.destroy();dom.window.close();}
});

test('voice panel updates its visible Stop control when recording starts after mounting',async()=>{
  const dom=new JSDOM('<body><main></main></body>');let recording=false,stops=0;const root=dom.window.document.querySelector('main')!;const dispose=mountVoicePanel(root,{day:'2026-10-18',state:{available:true,recording:false},getState:()=>({available:true,recording}),read:async()=>({path:'Voice/2026-10-18.md',text:''}),renderMarkdown:async()=>{},open:async()=>{},stop:async()=>{stops++;recording=false;},error:()=>{throw new Error('Unexpected error');}});
  try{const stop=root.querySelector('[aria-label="Stop and save voice reflection"]') as HTMLButtonElement;assert.equal(stop.hidden,true);recording=true;await new Promise(r=>setTimeout(r,330));assert.equal(stop.hidden,false);stop.click();await new Promise(r=>setTimeout(r,0));assert.equal(stops,1);assert.equal(stop.hidden,true);}finally{dispose();dom.window.close();}
});
