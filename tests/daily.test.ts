import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyLink, embedLink, dailyFilename, dailyScaffold, dailyTemplate, vaultPath } from '../src/daily';

const metadata={'color-sprint':true,'sprint-date':'2026-10-19','sprint-tracker':'Sync/Color Sprint.md','sprint-page':'All','sprint-open':true};
test('daily metadata requires explicit opt-in and uses the note date, never the current day',()=>{
  assert.equal(dailyLink({},'Tracker.md'),null);assert.equal(dailyLink({'color-sprint':'true'},'Tracker.md'),null);
  assert.deepEqual(dailyLink(metadata,'Other.md'),{date:'2026-10-19',tracker:'Sync/Color Sprint.md',page:'All',autoOpen:true});
});
test('per-note auto-open is independent of enabling the embed',()=>{
  assert.equal(dailyLink({...metadata,'sprint-open':false},'Other.md')?.autoOpen,false);
  assert.equal(dailyLink({...metadata,'sprint-open':undefined},'Other.md')?.autoOpen,false);
  assert.equal(embedLink({},metadata,'Other.md').date,'2026-10-19');
});
test('embed inherits daily properties and supports explicit date/tracker/page/view overrides',()=>{
  assert.deepEqual(embedLink({date:'2026-10-25',tracker:'Other.md',page:'Workouts',view:'pages'},metadata,'Default.md'),{date:'2026-10-25',tracker:'Other.md',page:'Workouts',view:'Pages',autoOpen:false});
});
test('bad dates, traversal, hidden files, and unknown embed views fail clearly',()=>{
  assert.throws(()=>dailyLink({...metadata,'sprint-date':'2026-02-30'},'Tracker.md'),/real YYYY-MM-DD/);
  assert.throws(()=>embedLink({}, {},'Tracker.md'),/sprint-date/);
  for(const path of ['../Tracker.md','/Tracker.md','.obsidian/data.md','Sync/../Tracker.md','C:\\Tracker.md','https://example.test/data.md'])assert.throws(()=>vaultPath(path),/vault-relative/);
  assert.throws(()=>embedLink({view:'unknown'},metadata,'Tracker.md'),/view must/);
});
test('daily scaffold has quoted metadata, an embed, and no duplicate task completion checkboxes',()=>{
  const note=dailyScaffold('2026-10-19','Sync/Color Sprint.md');assert.ok(note.startsWith('---\ncolor-sprint: true\n'));assert.match(note,/sprint-date: "2026-10-19"/);assert.match(note,/sprint-open: true/);assert.match(note,/```color-sprint\n```/);assert.match(note,/# Monday, October 19, 2026/);assert.equal(note.includes('- [ ]'),false);
});
test('native Templates scaffold resolves its date through standard Obsidian date tokens',()=>{
  const template=dailyTemplate('Sync/Color Sprint.md',false);assert.match(template,/sprint-date: "\{\{date:YYYY-MM-DD\}\}"/);assert.match(template,/sprint-open: false/);assert.match(template,/\{\{date:dddd, MMMM D, YYYY\}\}/);
});
test('daily filenames support the existing vault pattern and ISO format',()=>{
  assert.equal(dailyFilename('2026-10-19'),'10-19-2026.md');assert.equal(dailyFilename('2026-10-19','YYYY-MM-DD'),'2026-10-19.md');assert.throws(()=>dailyFilename('2026-02-30'),/real/);assert.throws(()=>dailyFilename('2026-10-19','../../YY'),/format/);
});
