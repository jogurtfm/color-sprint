import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { starter } from '../src/starter';
import { parseBoard, setEntry, startTimer, localDay } from '../src/model';
import { dailyScaffold } from '../src/daily';
import { addRoadmap } from '../src/roadmaps';
import { timeBlockFor, saveTimeBlock } from '../src/model';
const require=createRequire(import.meta.url);
const {JSDOM}=require('jsdom');
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));

async function harness(initial=starter(),initialFiles:Record<string,string>={}) {
  const dom=new JSDOM('<!doctype html><body></body>',{url:'https://preview.invalid'});const document=dom.window.document;const proto=dom.window.HTMLElement.prototype;
  Object.assign(proto,{addClass:function(this:any,name:string){this.classList.add(name);},empty:function(this:any){this.replaceChildren();},createEl:function(this:any,tag:string,options:any={}){const e=document.createElement(tag);e.className=options.cls||'';e.textContent=options.text||'';for(const [key,value] of Object.entries(options.attr||{}))e.setAttribute(key,String(value));this.append(e);return e;}});
  const notices:string[]=[];const modals:any[]=[];const events=new Map<string,Set<(...args:any[])=>void>>();const commands=new Map<string,any>();const blocks=new Map<string,any>();const children:any[]=[];const opened:any[]=[];let md=initial;let writes=0;
  class TFile {constructor(public path:string) {}}
  const file=new TFile('Sync/Color Sprint.md');
  const files=new Map(Object.entries(initialFiles).map(([path,text])=>[path,{file:new TFile(path),text}]));const folders=new Map<string,any>();
  const listen=(event:string,fn:any)=>{if(!events.has(event))events.set(event,new Set());const set=events.get(event)!;set.add(fn);return {set,fn};};
  class Plugin {
    cleanups:(()=>void)[]=[];app:any;
    constructor(app:any){this.app=app;}
    async loadData(){return null;}async saveData(_data:any){}
    registerView(type:string,factory:any){this.app.workspace.factory=factory;}
    addSettingTab(){}registerMarkdownCodeBlockProcessor(language:string,handler:any){blocks.set(language,handler);}
    addRibbonIcon(){}addCommand(command:any){commands.set(command.id,command);}
    registerEvent(ref:any){this.cleanups.push(()=>ref.set.delete(ref.fn));}
    registerDomEvent(target:any,event:string,fn:any){target.addEventListener(event,fn);this.cleanups.push(()=>target.removeEventListener(event,fn));}
  }
  class ItemView {contentEl:any;constructor(public leaf:any){this.contentEl=document.createElement('main');document.body.append(this.contentEl);}async setState() {}}
  class MarkdownRenderChild {cleanups:(()=>void)[]=[];constructor(public containerEl:any){}registerEvent(ref:any){this.cleanups.push(()=>ref.set.delete(ref.fn));}unload(){if('onunload' in this)(this as any).onunload();for(const cleanup of this.cleanups)cleanup();}}
  class PluginSettingTab {containerEl=document.createElement('section');constructor(public app:any,public plugin:any){}}
  class Modal {
    contentEl:any;modalEl:any;
    constructor(public app:any){this.modalEl=document.createElement('section');this.contentEl=document.createElement('div');this.modalEl.append(this.contentEl);}
    setTitle(title:string){this.modalEl.setAttribute('data-title',title);}
    open(){document.body.append(this.modalEl);modals.push(this);}
    close(){this.modalEl.remove();modals.splice(modals.indexOf(this),1);if('onClose' in this)(this as any).onClose();}
  }
  class Setting {
    row:any;name='';constructor(parent:any){this.row=document.createElement('div');parent.append(this.row);}setName(name:string){this.name=name;return this;}setDesc(){return this;}
    control(tag:string){const el=document.createElement(tag);this.row.append(el);const api:any={inputEl:el,setValue:(value:string)=>{el.value=value;return api;},onChange:(fn:any)=>{el.addEventListener(tag==='select'?'change':'input',()=>fn(el.value));return api;},addOptions:(options:any)=>{for(const [value,text] of Object.entries(options)){const option=document.createElement('option');option.value=value;option.textContent=String(text);el.append(option);}return api;}};return api;}
    addText(fn:any){fn(this.control('input'));return this;}addTextArea(fn:any){fn(this.control('textarea'));return this;}addDropdown(fn:any){fn(this.control('select'));return this;}
    addToggle(fn:any){const api=this.control('input');api.inputEl.type='checkbox';api.setValue=(value:boolean)=>{api.inputEl.checked=value;return api;};api.onChange=(handler:any)=>{api.inputEl.addEventListener('change',()=>handler(api.inputEl.checked));return api;};fn(api);return this;}
    addButton(fn:any){const el=document.createElement('button');this.row.append(el);const api:any={setButtonText:(value:string)=>{el.textContent=value;return api;},setCta:()=>api,setDisabled:(value:boolean)=>{el.disabled=value;return api;},onClick:(handler:any)=>{el.addEventListener('click',handler);return api;}};fn(api);return this;}
  }
  const getText=(target:any)=>target.path===file.path?md:files.get(target.path)?.text;
  const vault={getAbstractFileByPath:(path:string)=>path===file.path?file:files.get(path)?.file||folders.get(path)||null,read:async(target:any)=>getText(target),process:async(target:any,fn:any)=>{const next=fn(getText(target));if(target.path===file.path)md=next;else files.get(target.path)!.text=next;writes++;for(const cb of events.get('modify')||[])cb(target);return next;},on:listen,create:async(path:string,text:string)=>{if(files.has(path))throw new Error('File exists');const f=new TFile(path);files.set(path,{file:f,text});return f;},createFolder:async(path:string)=>{folders.set(path,{path});}};
  let activeFile:any=null;
  const leaf:any={view:null,setViewState:async(state:any)=>{opened.push(state);activeFile=null;for(const cb of events.get('workspace:file-open')||[])cb(null);if(leaf.view)await leaf.view.setState(state.state||{},{history:false});},openFile:async(f:any)=>{activeFile=f;for(const cb of events.get('workspace:file-open')||[])cb(f);}};
  const app:any={vault,workspace:{getLeavesOfType:()=>leaf.view?[leaf]:[],getLeaf:()=>leaf,revealLeaf:async()=>{},getActiveFile:()=>activeFile,on:(event:string,fn:any)=>listen(`workspace:${event}`,fn),onLayoutReady:(fn:any)=>fn()}};
  const exports:any={};const module={exports};
  const parseYaml=(text:string)=>{const out:Record<string,unknown>={};for(const line of text.split(/\r?\n/)){if(!line.trim()||line.trim().startsWith('#'))continue;const match=line.match(/^([-\w]+):\s*(.*?)\s*$/);if(!match)throw new Error('Invalid YAML');out[match[1]]=match[2].startsWith('"')?JSON.parse(match[2]):match[2]==='true'?true:match[2]==='false'?false:match[2];}return out;};
  const obsidian={Plugin,ItemView,MarkdownRenderChild,PluginSettingTab,Modal,Setting,TFile,parseYaml,getFrontMatterInfo:(text:string)=>{const m=text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);return {exists:!!m,frontmatter:m?.[1]||''};},Notice:class {constructor(message:string){notices.push(message);}},debounce:(fn:any)=>fn};
  runInNewContext(readFileSync('main.js','utf8'),{module,exports,require:(id:string)=>{assert.equal(id,'obsidian');return obsidian;},document,window:dom.window,console,setTimeout,clearTimeout,setInterval,clearInterval});
  const plugin:any=new module.exports.default(app,{});await plugin.onload();const view:any=app.workspace.factory(leaf);leaf.view=view;await view.onOpen();
  return {dom,document,plugin,view,commands,notices,modals,opened,files,get text(){return md;},get writes(){return writes;},async external(fn:(s:string)=>string){md=fn(md);for(const cb of events.get('modify')||[])cb(file);await settle();},async openFile(path:string){const target=files.get(path)?.file;assert.ok(target);await leaf.openFile(target);await settle();},async embed(source:string,sourcePath:string){const el=document.createElement('article');document.body.append(el);let child:any;blocks.get('color-sprint')(source,el,{sourcePath,addChild:(c:any)=>{child=c;children.push(c);c.onload();}});await settle();return {el,child};},async close(){for(const child of children)child.unload();await view.onClose();plugin.onunload();for(const cleanup of plugin.cleanups)cleanup();dom.window.close();},button(label:string,within:any=view.contentEl){const b=[...within.querySelectorAll('button')].find((e:any)=>e.textContent===label);assert.ok(b,`Button not found: ${label}`);return b as HTMLButtonElement;}};
}
test('digest reads the Markdown itinerary and keeps completed tasks after a save and focus',async()=>{
  const day=localDay();let md=setEntry(setEntry(starter(),day,'japanese',true,'Lesson saved'),day,'make-bed',false);
  md=saveTimeBlock(md,{date:day,taskId:'cook',start:'19:00',end:'19:30',timezone:'America/Chicago',status:'suggested',eventId:'-',eventUrl:'-'});
  const h=await harness(md);try{assert.ok(h.commands.has('open-digest'));h.button('Digest').click();await settle();assert.equal(h.writes,0);assert.match(h.document.querySelector('.cs-itinerary')!.textContent!,/7 PM/);assert.match(h.document.querySelector('.cs-itinerary')!.textContent!,/SUGGESTED/);
    const done=h.document.querySelector('[aria-label="Complete Study Japanese in digest"]') as HTMLInputElement;assert.equal(done.checked,true);
    (h.document.querySelector('[aria-label="Complete Cook in digest"]') as HTMLInputElement).click();await settle();assert.equal(parseBoard(h.text).entries.find(e=>e.taskId==='cook')!.done,true);assert.match(h.document.querySelector('.cs-feedback-toast')!.textContent!,/Cook/);assert.equal(h.document.querySelectorAll('.cs-itinerary-item.is-done').length,1);
    const flexible=h.document.querySelector('.cs-flexible-item:not(.is-done)')!;h.button('Focus',flexible).click();await settle();h.button('Finish').click();await settle();assert.ok(h.document.querySelector('.cs-digest'));assert.equal(parseBoard(h.text).entries.find(e=>e.taskId==='make-bed')!.done,true);assert.equal(h.document.querySelectorAll('.cs-flexible-item.is-done').length,2);
  }finally{await h.close();}
});

test('failed completion does not celebrate and sound controls do not edit tracker data',async()=>{
  const h=await harness(setEntry(starter(),localDay(),'make-bed',false));try{
    h.button('♫').click();await settle();assert.equal(h.plugin.settings.feedback.sound,false);assert.ok(h.button('♫̸'));assert.equal(h.writes,0);
    h.plugin.app.vault.process=async()=>{throw new Error('Save rejected');};const check=h.document.querySelector('[aria-label="Complete Make Bed"]') as HTMLInputElement;check.click();await settle();assert.equal(check.checked,false);assert.equal(h.document.querySelectorAll('.cs-feedback-toast').length,0);assert.match(h.notices[0],/Save rejected/);assert.equal(h.writes,0);
    const embedded=await h.embed('view: digest\ndate: today','ordinary.md');assert.ok(embedded.el.querySelector('.cs-digest'));const flexible=embedded.el.querySelector('[aria-label="Complete Make Bed in digest"]') as HTMLInputElement;flexible.click();await settle();assert.equal(flexible.checked,false);assert.equal(h.document.querySelectorAll('.cs-feedback-toast').length,0);assert.equal(h.writes,0);
  }finally{await h.close();}
});

test('actual bundled plugin registers views/commands and writes real checkbox edits through Vault.process',async()=>{
  const day=localDay();const h=await harness(setEntry(starter(),day,'make-bed',false,'Clear the bed first'));
  try {assert.ok(h.commands.has('open'));assert.equal(h.document.querySelectorAll('.cs-card').length,22);assert.match(h.document.body.textContent,/Clear the bed first/);assert.match(h.document.body.textContent,/Available to plan/);const check=h.document.querySelector('.cs-check') as HTMLInputElement;check.click();await settle();assert.equal(parseBoard(h.text).entries[0].done,true);assert.equal(h.writes,1);assert.match(h.document.body.textContent,/1 of 1/);
    await h.external(s=>setEntry(s,day,'cook',false,'Chicken'));assert.equal(h.document.querySelectorAll('.cs-card').length,22);assert.match(h.document.body.textContent,/1 of 2/);
  } finally {await h.close();}
});
test('Workouts page retains four exercise colors and does not invent schedules',async()=>{
  const h=await harness();try{h.button('Pages').click();await settle();h.button('Workouts').click();await settle();const colors=[...h.document.querySelectorAll('.cs-card')].map((e:any)=>e.getAttribute('data-color'));assert.deepEqual([...new Set(colors)],['blue','yellow','orange','salmon']);assert.equal(parseBoard(h.text).entries.length,0);assert.match(h.document.body.textContent,/Bench 4x10/);}finally{await h.close();}
});
test('task edit modal changes Markdown, and refuses a stale edit after an external change',async()=>{
  const h=await harness(setEntry(starter(),localDay(),'make-bed',false));try{h.button('Edit').click();await settle();const modal=h.modals[0];const input=modal.contentEl.querySelector('[aria-label="Task name"]');input.value='Make Bed with care';input.dispatchEvent(new h.dom.window.Event('input'));h.button('Save',modal.contentEl).click();await settle();assert.equal(parseBoard(h.text).tasks[0].title,'Make Bed with care');
    h.button('Edit').click();await settle();const stale=h.modals[0];await h.external(s=>s.replace('Make Bed with care','Make Bed external'));h.button('Save',stale.contentEl).click();await settle();assert.match(stale.contentEl.textContent,/changed in Markdown/);assert.equal(parseBoard(h.text).tasks[0].title,'Make Bed external');
  }finally{await h.close();}
});
test('timer recovers from an old start and Finish saves evidence and checks the explicit item',async()=>{
  const text=startTimer(starter(),'workout',localDay(),Date.now()-120000);const h=await harness(text);try{assert.match(h.document.querySelector('.cs-time').textContent,/02:0\d/);h.button('Pause').click();await settle();assert.equal(parseBoard(h.text).timer?.started,'-');h.button('Resume').click();await settle();assert.notEqual(parseBoard(h.text).timer?.started,'-');h.button('Open active focus').click();await settle();const field=h.view.contentEl.querySelector('[aria-label="Focus result note"]');field.value='Actual: light movement';field.dispatchEvent(new h.dom.window.Event('input'));h.button('Finish').click();await settle();assert.equal(parseBoard(h.text).timer,null);assert.equal(parseBoard(h.text).sessions.length,1);assert.equal(parseBoard(h.text).entries[0].done,true);assert.match(parseBoard(h.text).sessions[0].note,/Actual: light movement/);assert.equal(h.document.querySelectorAll('.cs-card').length,22);}finally{await h.close();}
});
test('broken Markdown produces a recoverable error and no writes; view cleanup clears DOM',async()=>{
  const h=await harness(starter().replace('## Schedule','## Broken'));try{assert.match(h.document.body.textContent,/Missing ## Schedule/);assert.equal(h.writes,0);await h.view.onClose();assert.equal(h.view.contentEl.children.length,0);}finally{await h.close();}
});
test('opening a linked daily note navigates the full view to that note date without altering either note',async()=>{
  const path='Sync/Daily/10-19-2026.md';const daily=dailyScaffold('2026-10-19','Sync/Color Sprint.md');const tracker=setEntry(starter('2026-10-18'),'2026-10-19','hard-task',false,'2020 Tax');
  const h=await harness(tracker,{[path]:daily});try{await h.openFile(path);assert.equal(h.opened.length,1);assert.equal(h.view.contentEl.querySelector('input[type=date]').value,'2026-10-19');assert.match(h.view.contentEl.textContent,/2020 Tax/);assert.equal(h.view.getState().date,'2026-10-19');assert.equal(h.files.get(path)!.text,daily);assert.equal(h.text,tracker);h.button('Daily note ↗').click();await settle();assert.equal(h.opened.length,1,'raw Markdown action must bypass redirect');await h.openFile(path);assert.equal(h.opened.length,2,'later deliberate reopening restores automatic navigation');assert.equal(h.notices.length,0);}finally{await h.close();}
});
test('unmarked notes, note-level opt-out and global opt-out stay in the Markdown view',async()=>{
  const h=await harness(starter(),{'Daily/unmarked.md':'# ordinary note','Daily/embed-only.md':dailyScaffold('2026-10-19','Sync/Color Sprint.md',false),'Daily/auto.md':dailyScaffold('2026-10-19','Sync/Color Sprint.md')});
  try{await h.openFile('Daily/unmarked.md');await h.openFile('Daily/embed-only.md');h.plugin.settings.autoOpenDaily=false;await h.openFile('Daily/auto.md');assert.equal(h.opened.length,0);assert.equal(h.notices.length,0);}finally{await h.close();}
});
test('inline dashboard uses its own tracker/date, writes to that tracker, and disposes cleanly',async()=>{
  const path='Daily/10-19.md';const other=setEntry(starter('2026-10-18'),'2026-10-19','make-bed',false,'Other tracker entry');const source=dailyScaffold('2026-10-19','Other.md',false);
  const h=await harness(starter(),{[path]:source,'Other.md':other});try{const {el,child}=await h.embed('',path);assert.equal(el.querySelector('input[type=date]').value,'2026-10-19');assert.match(el.textContent,/Other tracker entry/);(el.querySelector('.cs-check') as HTMLInputElement).click();await settle();assert.equal(parseBoard(h.files.get('Other.md')!.text).entries[0].done,true);assert.equal(parseBoard(h.text).entries.length,0);assert.equal(h.files.get(path)!.text,source);
    h.button('Edit',el).click();await settle();const modal=h.modals[0];const input=modal.contentEl.querySelector('[aria-label="Task name"]');input.value='Edited in embedded tracker';input.dispatchEvent(new h.dom.window.Event('input'));h.button('Save',modal.contentEl).click();await settle();assert.equal(parseBoard(h.files.get('Other.md')!.text).tasks[0].title,'Edited in embedded tracker');assert.equal(parseBoard(h.text).tasks[0].title,'Make Bed');child.unload();assert.equal(el.querySelector('.cs-root').children.length,0);
  }finally{await h.close();}
});
test('embed config can select a Workouts page and malformed config stays read-only',async()=>{
  const h=await harness(starter(),{'Daily/note.md':dailyScaffold('2026-10-19','Sync/Color Sprint.md',false)});try{const good=await h.embed('page: Workouts\nview: pages','Daily/note.md');assert.equal(good.el.querySelectorAll('.cs-card').length,10);const bad=await h.embed('date: wrong','Daily/note.md');assert.match(bad.el.textContent,/real YYYY-MM-DD/);assert.equal(bad.el.querySelectorAll('.cs-check').length,0);assert.equal(h.writes,0);}finally{await h.close();}
});
test('daily generator preserves existing daily contents and scaffolds only missing dates',async()=>{
  const existing='Personal content that must remain exactly intact.';const h=await harness(starter(),{'Sync/Daily/10-19-2026.md':existing});try{await h.plugin.createDaily('2026-10-19');assert.equal(h.files.get('Sync/Daily/10-19-2026.md')!.text,existing);await h.plugin.createDaily('2026-10-20');await settle();assert.match(h.files.get('Sync/Daily/10-20-2026.md')!.text,/sprint-date: "2026-10-20"/);assert.equal(h.view.contentEl.querySelector('input[type=date]').value,'2026-10-20');assert.equal(parseBoard(h.text).entries.length,0);assert.ok(h.commands.has('daily-today'));assert.ok(h.commands.has('daily-date'));}finally{await h.close();}
});
test('embed and full view stay synchronized against the same tracker without copying daily progress',async()=>{
  const path='Daily/shared.md';const initial=setEntry(starter('2026-10-18'),'2026-10-19','cook',false,'Shared planned meal');const source=dailyScaffold('2026-10-19','Sync/Color Sprint.md',false);
  const h=await harness(initial,{[path]:source});try{await h.plugin.open({day:'2026-10-19'});const {el}=await h.embed('',path);(el.querySelector('.cs-check') as HTMLInputElement).click();await settle();assert.equal(h.view.contentEl.querySelector('.cs-check').checked,true);await h.external(s=>setEntry(s,'2026-10-19','cook',false));assert.equal(el.querySelector('.cs-check').checked,false);assert.equal(h.files.get(path)!.text,source);}finally{await h.close();}
});
test('meditation launches into focus, pauses, refreshes, resumes and saves using an old tracker table',async()=>{
  const source=starter().replace('| Queue cursor | Step offset seconds |','|').replace('| --- | --- | --- | --- | --- | --- | --- | --- |\n\n## Workout Log','| --- | --- | --- | --- | --- | --- |\n\n## Workout Log');const h=await harness(source);try{const meditate=h.view.contentEl.querySelector('[aria-label="Start meditation mode"]');meditate.click();await settle();assert.equal(parseBoard(h.text).timer!.taskId,'mindfulness');assert.ok(h.document.querySelector('.cs-focus-mode'));assert.equal(h.document.querySelector('.cs-focus-card h1').textContent,'Mindfulness');assert.match(h.document.querySelector('.cs-time').textContent,/0[12]:/);h.button('Pause').click();await settle();assert.equal(parseBoard(h.text).timer!.started,'-');h.button('Refresh timer').click();await settle();assert.equal(parseBoard(h.text).timer!.elapsed,0);h.button('Pause').click();await settle();h.button('Resume').click();await settle();h.button('Finish').click();await settle();assert.equal(parseBoard(h.text).timer,null);assert.equal(parseBoard(h.text).sessions.length,1);assert.equal(parseBoard(h.text).entries[0].done,true);assert.equal(h.notices.length,0);}finally{await h.close();}
});
test('queued subtask completion advances once and wins survive reloading the view',async()=>{
  const h=await harness(addRoadmap(starter(),'audio-portfolio'));try{const start=h.view.contentEl.querySelector('[aria-label="Start focus for Revamped Audio Portfolio"]');start.click();await settle();assert.match(h.document.querySelector('.cs-focus-card h1').textContent,/audience/);h.button('Done & next').click();await settle();assert.equal(parseBoard(h.text).timer!.cursor,1);assert.equal(parseBoard(h.text).subtasks.filter(sub=>sub.done).length,1);assert.equal(parseBoard(h.text).entries.length,1);assert.equal(parseBoard(h.text).entries[0].done,false);h.button('Back to plan').click();await settle();assert.match(h.document.querySelector('.cs-wins').textContent,/0 tasks done · 1 subtask done/);h.button('Open active focus').click();await settle();assert.match(h.document.querySelector('.cs-focus-card h1').textContent,/Inventory/);assert.equal(h.notices.length,0);}finally{await h.close();}
});
test('color focus schedules its entire group, cues each task, and credits only explicit completion',async()=>{
  const h=await harness();try{h.button('Schedule group').click();await settle();assert.equal(parseBoard(h.text).entries.length,3);h.button('Focus group').click();await settle();assert.equal(h.document.querySelector('.cs-focus-card h1').textContent,'Make Bed');h.button('Done & next').click();await settle();assert.equal(h.document.querySelector('.cs-focus-card h1').textContent,'Brush Teeth');assert.equal(parseBoard(h.text).entries.filter(entry=>entry.done).length,1);h.button('Skip / next').click();await settle();assert.equal(h.document.querySelector('.cs-focus-card h1').textContent,'Clean Kitchen');assert.equal(parseBoard(h.text).entries.filter(entry=>entry.done).length,1);assert.equal(h.notices.length,0);}finally{await h.close();}
});
test('quick counts render their total and unavailable cue APIs do not prevent focus',async()=>{
  const h=await harness();try{h.button('+5 reps').click();await settle();assert.match(h.view.contentEl.querySelector('.cs-quick-total').textContent,/5 reps/);Object.defineProperty(h.dom.window,'Notification',{value:{permission:'default',requestPermission(){throw new Error('Device API unavailable');}},configurable:true});h.view.contentEl.querySelector('[aria-label="Start meditation mode"]').click();await settle();assert.equal(parseBoard(h.text).timer!.taskId,'mindfulness');assert.ok(h.document.querySelector('.cs-focus-mode'));assert.equal(h.notices.length,0);}finally{await h.close();}
});
test('Day details saves suggested time and displays it on cards and week cells',async()=>{
  const day=localDay();const h=await harness(setEntry(starter(),day,'cook',false,'Soup'));try{h.button('Day details').click();await settle();const modal=h.modals[0];for(const [name,value] of [['Suggested start','19:00'],['Suggested end','19:30'],['Time zone','America/Chicago']]){const input=modal.contentEl.querySelector(`[aria-label="${name}"]`);input.value=value;input.dispatchEvent(new h.dom.window.Event('input'));}h.button('Save',modal.contentEl).click();await settle();assert.equal(timeBlockFor(parseBoard(h.text),'cook',day)?.status,'suggested');assert.match(h.document.querySelector('.cs-time-slot').textContent,/7 PM–7:30 PM/);assert.equal(parseBoard(h.text).entries[0].detail,'Soup');assert.equal(parseBoard(h.text).entries[0].done,false);h.button('Week').click();await settle();assert.match(h.document.querySelector('.cs-cell-time').textContent,/~7 PM/);assert.equal(h.notices.length,0);}finally{await h.close();}
});
test('Japanese remains checked and visible after Finish, reopening, and cancellation of another attempt',async()=>{
  const h=await harness();try{h.button('Pages').click();await settle();h.button('Learning').click();await settle();h.view.contentEl.querySelector('[aria-label="Start focus for Study Japanese"]').click();await settle();h.button('Finish').click();await settle();let card=[...h.view.contentEl.querySelectorAll('.cs-card')].find((el:any)=>el.querySelector('h3')?.textContent==='Study Japanese') as any;assert.ok(card);assert.equal(card.querySelector('input[type=checkbox]').checked,true);assert.match(h.view.contentEl.querySelector('.cs-wins').textContent,/1 task done/);assert.equal(h.view.contentEl.querySelectorAll('.cs-card').length,22);await h.view.surface.refresh();card=[...h.view.contentEl.querySelectorAll('.cs-card')].find((el:any)=>el.querySelector('h3')?.textContent==='Study Japanese');assert.ok(card.classList.contains('is-done'));h.view.contentEl.querySelector('[aria-label="Start focus for Study Japanese"]').click();await settle();h.button('Cancel').click();await settle();assert.equal(parseBoard(h.text).sessions.length,1);assert.equal(parseBoard(h.text).entries.find(entry=>entry.taskId==='japanese')!.done,true);assert.equal(h.view.contentEl.querySelectorAll('.cs-card').length,22);assert.equal(h.notices.length,0);}finally{await h.close();}
});
