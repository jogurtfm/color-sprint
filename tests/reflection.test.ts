import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newReflectionDraft, reflectionDraft, reflectionScaffold, appendReflection } from '../src/reflection';

test('text reflections preserve original Markdown and retries do not duplicate entries',()=>{
  const before='# My words\n\n![[Old.m4a]]\n',draft={...newReflectionDraft(),text:'I feel a little clearer.\n\nKeep this paragraph.'};
  const after=appendReflection(before,draft);assert.ok(after.startsWith(before));assert.ok(after.endsWith(draft.text+'\n'));assert.equal(appendReflection(after,draft),after);assert.ok(reflectionDraft(draft));assert.equal(reflectionDraft({...draft,id:'-->broken'}),null);assert.throws(()=>appendReflection(before,{...draft,text:'  '}),/few words/);
});
test('new text journals do not contain tasks or audio instructions and validate the day',()=>{
  const md=reflectionScaffold('2026-10-18');assert.match(md,/reflection-date: "2026-10-18"/);assert.ok(!md.includes('audio-recorder'));assert.ok(!md.includes('- [ ]'));assert.throws(()=>reflectionScaffold('2026-02-30'),/real/);
});
