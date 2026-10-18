import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voicePath, voiceScaffold, recorderState, requireRecorder } from '../src/voice';

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
