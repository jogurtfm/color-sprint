import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { starter } from '../src/starter';
import { parseBoard, setEntry, startTimer, localDay,addDays,movedTo } from '../src/model';
import { dailyScaffold } from '../src/daily';
import { addRoadmap } from '../src/roadmaps';
import { timeBlockFor, saveTimeBlock } from '../src/model';
import { saveTask } from '../src/model';
import { syncNote, parseCheckpoint, PlanProposal } from '../src/sync';
import {generateKeyPairSync,randomUUID,sign} from 'node:crypto';
import {HudRequest,hudNote,hudFolder,signedHudBody,hudPayload} from '../src/hud-protocol';
import {enqueueTask,startQuickQueue,queueItemsFor,focusQueue} from '../src/model';
import {defaultEffort,dailyScore} from '../src/effort';
import {completionLevel} from '../src/model';
const require=createRequire(import.meta.url);
const {JSDOM}=require('jsdom');
const settle=(ms=20)=>new Promise(resolve=>setTimeout(resolve,ms));

test('mobile colored finishes keep cards visible, rerate one win and clear on intentional uncheck',async()=>{
  const day=localDay(),h=await harness(setEntry(starter(day),day,'make-bed',false),{}, {mobile:true});try{
    const card=()=>[...h.document.querySelectorAll('.cs-card')].find((el:any)=>el.querySelector('h3')?.textContent==='Make Bed') as any;
    const pick=(level:string)=>card().querySelector(`[data-finish-level="${level}"]`).click();
    pick('light');await settle();assert.equal(dailyScore(parseBoard(h.text),day).points,5);assert.ok(card().querySelector('input[type=checkbox]').checked);assert.match(h.document.querySelector('.cs-wins').textContent,/1 task done/);assert.match(card().querySelector('.cs-finish-choices summary').textContent,/Bare minimum/);
    pick('full');await settle();assert.equal(dailyScore(parseBoard(h.text),day).points,15);assert.equal(parseBoard(h.text).entries.filter(e=>e.done).length,1);assert.match(card().querySelector('.cs-finish-choices summary').textContent,/Full effort/);card().querySelector('input[type=checkbox]').click();await settle();assert.equal(parseBoard(h.text).completionRatings.length,0);assert.equal(h.notices.length,0);
  }finally{await h.close();}
});

test('mobile group graded finishes advance only current task then finish the last item',async()=>{
  const h=await harness(starter(),{}, {mobile:true});try{h.button('Schedule group').click();await settle();h.button('Focus group').click();await settle();h.document.querySelector('.cs-focus-mode [data-finish-level="light"]').click();await settle();let b=parseBoard(h.text);assert.equal(b.timer!.cursor,1);assert.equal(b.completionRatings[0].id,'make-bed');assert.equal(b.entries.filter(e=>e.done).length,1);h.document.querySelector('.cs-focus-mode [data-finish-level="solid"]').click();await settle();h.document.querySelector('.cs-focus-mode [data-finish-level="full"]').click();await settle();b=parseBoard(h.text);assert.equal(b.timer,null);assert.equal(b.completionRatings.length,3);assert.equal(b.sessions.length,1);assert.equal(h.notices.length,0);}finally{await h.close();}
});

test('real signed HUD rated finish passes verification and replay cannot add a win',async()=>{
  const base=setEntry(starter(),localDay(),'make-bed',false),r=hudRequest(base,{kind:'complete-rated',date:localDay(),taskId:'make-bed',operation:'light'}),local=new Map([['color-sprint.hud-trust',{[r.client+'/'+r.tracker]:r.publicKey}]]),h=await harness(base,{[`${hudFolder(r.tracker)}/Requests/${r.id}.md`]:hudNote(r)},{store:local});try{h.plugin.app.vault.getName=()=> 'Fixture';await h.plugin.hudBridge.handle({vault:'Fixture',tracker:r.tracker,id:r.id});assert.equal(completionLevel(parseBoard(h.text),localDay(),'task','make-bed'),'light');assert.equal(dailyScore(parseBoard(h.text),localDay()).points,5);const writes=h.writes;await h.plugin.hudBridge.handle({vault:'Fixture',tracker:r.tracker,id:r.id});assert.equal(h.writes,writes);assert.equal(parseBoard(h.text).entries.filter(e=>e.done).length,1);}finally{await h.close();}
});

test('mobile reflection controls stay above input and Hide keyboard retains text without journal or tracker writes',async()=>{const h=await harness(starter(),{}, {mobile:true});try{h.button('🎙').click();await settle();const modal=h.modals[0],input=modal.contentEl.querySelector('textarea');assert.ok(modal.modalEl.classList.contains('cs-reflection-modal'));const toolbar=modal.contentEl.querySelector('[role="toolbar"]');assert.equal(modal.contentEl.firstElementChild,toolbar);assert.equal(toolbar.firstElementChild.textContent,'Save reflection');input.value='My draft stays here.';input.dispatchEvent(new h.dom.window.Event('input'));input.focus();h.button('Hide keyboard',modal.contentEl).click();assert.notEqual(h.document.activeElement,input);assert.equal(input.value,'My draft stays here.');assert.equal(h.files.size,0);assert.equal(h.writes,0);h.button('Save reflection',modal.contentEl).click();await settle();assert.equal(h.modals.length,0);assert.equal(h.files.get(`Sync/Reflection/Voice/${localDay()}.md`)!.text.includes('My draft stays here.'),true);assert.equal(parseBoard(h.text).entries.length,0);}finally{await h.close();}});

test('mobile effort profile saves real Markdown, updates rank and preserves explicit checkboxes',async()=>{const day=localDay(),h=await harness(setEntry(starter(day),day,'hard-task',true),{}, {mobile:true});try{assert.match(h.document.querySelector('.cs-arcade').textContent,/40 pt/);h.button('Effort profile').click();await settle();const item=[...h.document.querySelectorAll('.cs-effort-item')].find((row:any)=>row.querySelector('summary').textContent.startsWith('Hard Task'));item.querySelector('[name="attention"]').value='2';item.querySelector('[name="notes"]').value='Requires quiet attention, not just starting.';h.button('Save effort profile',item).click();await settle();let b=parseBoard(h.text);assert.equal(b.effortProfiles[0].attention,2);assert.equal(b.effortProfiles[0].status,'confirmed');assert.equal(b.entries[0].done,true);h.button('Today').click();await settle();assert.match(h.document.querySelector('.cs-arcade').textContent,/60 pt/);assert.equal(h.notices.length,0);}finally{await h.close();}});

test('mobile Tomorrow and Pick date keep one-off obligations visible with source history and real completion',async()=>{const today=localDay(),tomorrow=addDays(today,1);const h=await harness(setEntry(starter(today),today,'hard-task',false,'2020 Tax'),{}, {mobile:true});try{h.button('Obligations').click();await settle();const row=h.document.querySelector('.cs-obligation');h.button('Tomorrow',row).click();await settle();let b=parseBoard(h.text);assert.equal(movedTo(b,'hard-task',today),tomorrow);assert.equal(b.entries.filter(e=>e.done).length,0);assert.match(h.document.querySelector('.cs-obligation').textContent,/2020 Tax/);const input=h.document.querySelector('.cs-move-picker input');input.value=addDays(today,3);h.button('Move',h.document.querySelector('.cs-move-picker')).click();await settle();b=parseBoard(h.text);assert.equal(movedTo(b,'hard-task',today),addDays(today,3));h.button('Done today',h.document.querySelector('.cs-obligation')).click();await settle();b=parseBoard(h.text);assert.equal(b.entries.filter(e=>e.done).length,1);assert.equal(b.entries.find(e=>e.done)?.date,today);assert.equal(h.document.querySelectorAll('.cs-obligation').length,0);assert.equal(h.notices.length,0);}finally{await h.close();}});

test('mobile mixed queue can be built, reordered, timed, finished forward and cancelled without disappearing',async()=>{
  const day=localDay(),h=await harness(starter(day),{}, {mobile:true});try{
    h.view.contentEl.querySelector('[aria-label="Add Make Bed to focus queue"]').click();await settle();
    h.view.contentEl.querySelector('[aria-label="Add Study Japanese to focus queue"]').click();await settle();
    h.button('Queue').click();await settle();assert.equal(h.document.querySelectorAll('.cs-queue-row').length,2);
    h.view.contentEl.querySelector('[aria-label="up Study Japanese in queue"]').click();await settle();assert.equal(parseBoard(h.text).queueItems[0].taskId,'japanese');
    const minutes=h.view.contentEl.querySelector('[aria-label="Minutes for Study Japanese"]');minutes.value='5';minutes.dispatchEvent(new h.dom.window.Event('change'));await settle();
    h.button('Start queue').click();await settle();let b=parseBoard(h.text);assert.match(b.timer!.owner!,/^runner-/);assert.equal(focusQueue(b,b.timer!)[0].minutes,5);
    h.button('Finish & next').click();await settle();b=parseBoard(h.text);assert.equal(b.timer!.cursor,1);assert.equal(b.entries.find(e=>e.taskId==='japanese')!.done,true);
    h.button('Cancel').click();await settle();h.button('Queue').click();await settle();assert.equal(queueItemsFor(parseBoard(h.text),day).length,2);assert.ok(parseBoard(h.text).entries.find(e=>e.taskId==='japanese')!.done);assert.equal(h.notices.length,0);
  }finally{await h.close();}
});

test('only the designated plugin runner advances automatically; another device must take over explicitly',async()=>{
  const day=localDay(),store=new Map<string,unknown>([['color-sprint.queue-device','runner-phone']]);let text=enqueueTask(enqueueTask(starter(day),'make-bed',day),'brush-teeth',day);text=startQuickQueue(text,day,Date.now()-125000,'runner-windows');
  const h=await harness(text,{}, {mobile:true,store});try{
    await h.plugin.advanceQueues();assert.equal(parseBoard(h.text).timer!.cursor,0);assert.equal(h.writes,0);
    h.button('Queue').click();await settle();h.button('Run on this device').click();await settle();assert.equal(parseBoard(h.text).timer!.owner,'runner-phone');
    await h.plugin.advanceQueues();await settle();const b=parseBoard(h.text);assert.equal(b.timer!.cursor,1);assert.ok(b.entries.every(e=>!e.done));assert.equal(h.notices.length,0);
  }finally{await h.close();}
});

async function harness(initial=starter(),initialFiles:Record<string,string>={},voiceOptions:{store?:Map<string,unknown>;recorder?:unknown;mobile?:boolean}={}) {
  const dom=new JSDOM('<!doctype html><body></body>',{url:'https://preview.invalid'});const document=dom.window.document;const proto=dom.window.HTMLElement.prototype;
  Object.assign(proto,{addClass:function(this:any,name:string){this.classList.add(name);},empty:function(this:any){this.replaceChildren();},createEl:function(this:any,tag:string,options:any={}){const e=document.createElement(tag);e.className=options.cls||'';e.textContent=options.text||'';for(const [key,value] of Object.entries(options.attr||{}))e.setAttribute(key,String(value));this.append(e);return e;}});
  const notices:string[]=[];const modals:any[]=[];const events=new Map<string,Set<(...args:any[])=>void>>();const commands=new Map<string,any>();const blocks=new Map<string,any>();const children:any[]=[];const opened:any[]=[];let md=initial;let writes=0;
  class TFile {stat={size:0};constructor(public path:string) {}}
  const file=new TFile('Sync/Color Sprint.md');
  const files=new Map(Object.entries(initialFiles).map(([path,text])=>[path,{file:new TFile(path),text}]));const folders=new Map<string,any>();
  const listen=(event:string,fn:any)=>{if(!events.has(event))events.set(event,new Set());const set=events.get(event)!;set.add(fn);return {set,fn};};
  class Plugin {
    cleanups:(()=>void)[]=[];app:any;
    constructor(app:any){this.app=app;}
    async loadData(){return null;}async saveData(_data:any){}
    registerView(type:string,factory:any){this.app.workspace.factory=factory;}
    registerObsidianProtocolHandler(action:string,handler:any){commands.set('protocol:'+action,handler);}
    addSettingTab(){}registerMarkdownCodeBlockProcessor(language:string,handler:any){blocks.set(language,handler);}
    addRibbonIcon(){}addCommand(command:any){commands.set(command.id,command);}
    registerEvent(ref:any){this.cleanups.push(()=>ref.set.delete(ref.fn));}
    registerDomEvent(target:any,event:string,fn:any){target.addEventListener(event,fn);this.cleanups.push(()=>target.removeEventListener(event,fn));}
  }
  class ItemView {contentEl:any;constructor(public leaf:any){this.contentEl=document.createElement('main');document.body.append(this.contentEl);}async setState() {}}
  class MarkdownRenderChild {cleanups:(()=>void)[]=[];constructor(public containerEl:any){}registerEvent(ref:any){this.cleanups.push(()=>ref.set.delete(ref.fn));}unload(){if('onunload' in this)(this as any).onunload();for(const cleanup of this.cleanups)cleanup();}}
  class PluginSettingTab {containerEl=document.createElement('section');constructor(public app:any,public plugin:any){}}
  const renderedMarkdown:{markdown:string;path:string}[]=[];let componentsUnloaded=0;
  class Component {load(){}unload(){componentsUnloaded++;}}
  const MarkdownRenderer={render:async(_app:any,markdown:string,el:any,path:string,_component:any)=>{renderedMarkdown.push({markdown,path});el.textContent=markdown;}};
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
  const vault={getMarkdownFiles:()=>[file,...[...files.values()].map(item=>item.file)],getAbstractFileByPath:(path:string)=>path===file.path?file:files.get(path)?.file||folders.get(path)||null,read:async(target:any)=>getText(target),process:async(target:any,fn:any)=>{const next=fn(getText(target));if(target.path===file.path)md=next;else files.get(target.path)!.text=next;writes++;for(const cb of events.get('modify')||[])cb(target);return next;},on:listen,create:async(path:string,text:string)=>{if(files.has(path))throw new Error('File exists');const f=new TFile(path);files.set(path,{file:f,text});return f;},createFolder:async(path:string)=>{folders.set(path,{path});}};
  let activeFile:any=null;
  const leaf:any={view:null,setViewState:async(state:any)=>{opened.push(state);activeFile=null;for(const cb of events.get('workspace:file-open')||[])cb(null);if(leaf.view)await leaf.view.setState(state.state||{},{history:false});},openFile:async(f:any)=>{activeFile=f;app.workspace.activeEditor={file:f,editor:{getValue:()=>getText(f)||'',lastLine:()=>(getText(f)||'').split(/\r?\n/).length-1,getLine:(line:number)=>(getText(f)||'').split(/\r?\n/)[line],setCursor:(position:any)=>{app.workspace.lastCursor=position;}}};for(const cb of events.get('workspace:file-open')||[])cb(f);}};
  const deviceStore=voiceOptions.store||new Map<string,unknown>();const app:any={vault,commands:voiceOptions.recorder,loadLocalStorage:(key:string)=>deviceStore.get(key)||null,saveLocalStorage:(key:string,value:unknown)=>{if(value===null)deviceStore.delete(key);else deviceStore.set(key,value);},workspace:{getLeavesOfType:()=>leaf.view?[leaf]:[],getLeaf:()=>leaf,revealLeaf:async()=>{},getActiveFile:()=>activeFile,on:(event:string,fn:any)=>listen(`workspace:${event}`,fn),onLayoutReady:(fn:any)=>fn()}};
  const exports:any={};const module={exports};
  const parseYaml=(text:string)=>{const out:Record<string,unknown>={};for(const line of text.split(/\r?\n/)){if(!line.trim()||line.trim().startsWith('#'))continue;const match=line.match(/^([-\w]+):\s*(.*?)\s*$/);if(!match)throw new Error('Invalid YAML');out[match[1]]=match[2].startsWith('"')?JSON.parse(match[2]):match[2]==='true'?true:match[2]==='false'?false:match[2];}return out;};
  const obsidian={Platform:{isMobile:!!voiceOptions.mobile},Plugin,Component,MarkdownRenderer,ItemView,MarkdownRenderChild,PluginSettingTab,Modal,Setting,TFile,parseYaml,getFrontMatterInfo:(text:string)=>{const m=text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);return {exists:!!m,frontmatter:m?.[1]||''};},Notice:class {constructor(message:string){notices.push(message);}},debounce:(fn:any)=>fn};
  runInNewContext(readFileSync('main.js','utf8'),{module,exports,require:(id:string)=>{assert.equal(id,'obsidian');return obsidian;},document,window:dom.window,console,setTimeout,clearTimeout,setInterval,clearInterval,crypto,TextEncoder,atob});
  const plugin:any=new module.exports.default(app,{});await plugin.onload();const view:any=app.workspace.factory(leaf);leaf.view=view;await view.onOpen();
  return {dom,document,plugin,view,commands,notices,modals,opened,files,renderedMarkdown,get componentsUnloaded(){return componentsUnloaded;},get text(){return md;},get writes(){return writes;},async external(fn:(s:string)=>string){md=fn(md);for(const cb of events.get('modify')||[])cb(file);await settle();},async openFile(path:string){const target=files.get(path)?.file;assert.ok(target);await leaf.openFile(target);await settle();},async embed(source:string,sourcePath:string){const el=document.createElement('article');document.body.append(el);let child:any;blocks.get('color-sprint')(source,el,{sourcePath,addChild:(c:any)=>{child=c;children.push(c);c.onload();}});await settle();return {el,child};},async close(){for(const modal of [...modals])modal.close();for(const child of children)child.unload();await view.onClose();plugin.onunload();for(const cleanup of plugin.cleanups)cleanup();dom.window.close();},button(label:string,within:any=view.contentEl){const b=[...within.querySelectorAll('button')].find((e:any)=>e.textContent===label);assert.ok(b,`Button not found: ${label}`);return b as HTMLButtonElement;}};
}
test('mobile actions checkpoint checks and unchecks; reviewed recovery keeps planning changes',async()=>{
  const day=localDay(),base=setEntry(starter(),day,'japanese',false),h=await harness(base,{}, {mobile:true});try{assert.equal(h.plugin.primaryPhone,true);await h.plugin.change((s:string)=>setEntry(s,day,'japanese',true));await h.plugin.change((s:string)=>setEntry(s,day,'japanese',false));const records=[...h.files.entries()].filter(([path])=>path.includes('/Phone/')).map(([,item])=>parseCheckpoint(item.text));assert.equal(records.length,2);assert.deepEqual(records.map(record=>record.checks[0].done),[true,false]);assert.ok(records[1].sequence>records[0].sequence);
    await h.external(md=>saveTask(setEntry(md,day,'japanese',true),{...parseBoard(md).tasks.find(t=>t.id==='japanese')!,definition:'Keep this new planning definition'}));const review=await h.plugin.syncStore.review('Sync/Color Sprint.md');assert.equal(review.recovery.changes.length,1);await h.plugin.syncStore.restore('Sync/Color Sprint.md',review.current,review.recovery);assert.equal(parseBoard(h.text).entries[0].done,false);assert.equal(parseBoard(h.text).tasks.find(t=>t.id==='japanese')!.definition,'Keep this new planning definition');assert.ok([...h.files.keys()].some(path=>path.includes('/Recovery/')));
  }finally{await h.close();}
});

function hudRequest(base:string,action:HudRequest['action']={kind:'complete',taskId:'japanese',date:localDay(),done:true}):HudRequest {const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),now=Date.now();const r:HudRequest={version:1,id:'hud-'+randomUUID(),tracker:'Sync/Color Sprint.md',created:now,expires:now+120000,client:'hud-'+randomUUID(),publicKey:pair.publicKey.export({type:'spki',format:'der'}).toString('base64'),base,action,signature:''};r.signature=sign('sha256',Buffer.from(signedHudBody(r)),{key:pair.privateKey,dsaEncoding:'ieee-p1363'}).toString('base64');return r;}
test('signed effort review passes through real plugin verification without changing progress or replaying',async()=>{const base=setEntry(starter(),localDay(),'brush-teeth',true),profile={...defaultEffort(parseBoard(base).tasks.find(t=>t.id==='treadmill')!),attention:2,status:'confirmed',reviewed:localDay()},r=hudRequest(base,{kind:'effort-profile',details:JSON.stringify({profile})}),local=new Map([['color-sprint.hud-trust',{[r.client+'/'+r.tracker]:r.publicKey}]]),h=await harness(base,{[`${hudFolder(r.tracker)}/Requests/${r.id}.md`]:hudNote(r)},{store:local});try{h.plugin.app.vault.getName=()=> 'Fixture';await h.plugin.hudBridge.handle({vault:'Fixture',tracker:r.tracker,id:r.id});const b=parseBoard(h.text);assert.equal(b.effortProfiles[0].attention,2);assert.equal(b.entries[0].done,true);assert.equal(b.sessions.length,0);assert.equal((hudPayload(h.files.get(`${hudFolder(r.tracker)}/Results/${r.id}.md`)!.text) as any).status,'done');const writes=h.writes;await h.plugin.hudBridge.handle({vault:'Fixture',tracker:r.tracker,id:r.id});assert.equal(h.writes,writes);}finally{await h.close();}});
test('signed desktop obligation move is applied once through the real plugin queue and read back',async()=>{const today=localDay(),tomorrow=addDays(today,1),base=setEntry(starter(today),today,'hard-task',false,'2020 Tax'),r=hudRequest(base,{kind:'move-task',taskId:'hard-task',date:today,toDate:tomorrow}),local=new Map([['color-sprint.hud-trust',{[r.client+'/'+r.tracker]:r.publicKey}]]),h=await harness(base,{[`${hudFolder(r.tracker)}/Requests/${r.id}.md`]:hudNote(r)},{store:local});try{h.plugin.app.vault.getName=()=> 'Fixture';await h.plugin.hudBridge.handle({vault:'Fixture',tracker:r.tracker,id:r.id});assert.equal(movedTo(parseBoard(h.text),'hard-task',today),tomorrow);assert.equal(parseBoard(h.text).entries.filter(e=>e.done).length,0);assert.equal((hudPayload(h.files.get(`${hudFolder(r.tracker)}/Results/${r.id}.md`)!.text) as any).status,'done');const writes=h.writes;await h.plugin.hudBridge.handle({vault:'Fixture',tracker:r.tracker,id:r.id});assert.equal(h.writes,writes);}finally{await h.close();}});
test('paired HUD actions use the plugin queue once, retain phone checkoffs and keep planning separate',async()=>{
  const base=setEntry(starter(),localDay(),'brush-teeth',true),r=hudRequest(base),local=new Map([['color-sprint.hud-trust',{[r.client+'/'+r.tracker]:r.publicKey}]]),h=await harness(base,{[`${hudFolder(r.tracker)}/Requests/${r.id}.md`]:hudNote(r)},{store:local});
  try{h.plugin.app.vault.getName=()=> 'Fixture';assert.ok(h.commands.has('protocol:color-sprint-hud'));await h.plugin.hudBridge.handle({vault:'Fixture',tracker:r.tracker,id:r.id});assert.ok(parseBoard(h.text).entries.find(e=>e.taskId==='brush-teeth')!.done);assert.ok(parseBoard(h.text).entries.find(e=>e.taskId==='japanese')!.done);assert.equal((hudPayload(h.files.get(`${hudFolder(r.tracker)}/Results/${r.id}.md`)!.text) as any).status,'done');const writes=h.writes;await h.plugin.hudBridge.handle({vault:'Fixture',tracker:r.tracker,id:r.id});assert.equal(h.writes,writes);h.commands.get('revoke-hud-pairings').callback();assert.deepEqual(Object.keys(local.get('color-sprint.hud-trust')!),[]);assert.ok(![...h.files.keys()].some(p=>p.includes('/Phone/')||p.includes('/Proposals/')));
  }finally{await h.close();}
});
test('unpaired HUD key requires explicit pairing and rejects cancel without task changes',async()=>{
  const base=starter(),r=hudRequest(base),h=await harness(base,{[`${hudFolder(r.tracker)}/Requests/${r.id}.md`]:hudNote(r)});
  try{h.plugin.app.vault.getName=()=> 'Fixture';const work=h.plugin.hudBridge.handle({vault:'Fixture',tracker:r.tracker,id:r.id});await settle();assert.equal(h.modals.length,1);const modal=h.modals[0];modal.onOpen();assert.match(modal.contentEl.textContent,/Pair this Color Sprint HUD/);assert.match(modal.contentEl.textContent,/fingerprint/);h.button('Cancel',modal.contentEl).click();await work;assert.equal(h.text,base);assert.equal((hudPayload(h.files.get(`${hudFolder(r.tracker)}/Results/${r.id}.md`)!.text) as any).status,'rejected');
  }finally{await h.close();}
});
test('mobile Obsidian never consumes desktop HUD requests',async()=>{
  const h=await harness(starter(),{},{mobile:true});try{await assert.rejects(h.plugin.hudBridge.handle({vault:'Fixture',tracker:'Sync/Color Sprint.md',id:'hud-'+randomUUID()}),/same Windows/);assert.equal(h.writes,0);}finally{await h.close();}
});
test('phone baseline protects existing checkbox states without changing progress or counting wins',async()=>{
  const day=localDay(),initial=setEntry(setEntry(starter(),day,'japanese',true,'My actual lesson'),day,'make-bed',false),h=await harness(initial,{}, {mobile:true});try{await h.plugin.syncStore.baseline('Sync/Color Sprint.md',h.text);assert.equal(h.text,initial);assert.equal(h.writes,0);const records=[...h.files.entries()].filter(([path])=>path.includes('/Phone/')).map(([,item])=>parseCheckpoint(item.text));assert.equal(records.length,1);assert.equal(records[0].checks.length,2);assert.deepEqual(records[0].checks.map(c=>c.done),[true,false]);assert.equal((await h.plugin.syncStore.review('Sync/Color Sprint.md')).recovery.changes.length,0);
  }finally{await h.close();}
});

test('phone checkpoint sync failure keeps durable local outbox for retry without losing a checked item',async()=>{
  const day=localDay(),h=await harness(setEntry(starter(),day,'japanese',false),{}, {mobile:true});try{const create=h.plugin.app.vault.create;h.plugin.app.vault.create=async()=>{throw new Error('Storage temporarily unavailable');};await h.plugin.change((s:string)=>setEntry(s,day,'japanese',true));assert.equal(parseBoard(h.text).entries[0].done,true);assert.equal(h.plugin.app.loadLocalStorage('color-sprint.phone-outbox')[0].committed,true);assert.match(h.notices.at(-1)!,/device-local/);h.plugin.app.vault.create=create;const review=await h.plugin.syncStore.review('Sync/Color Sprint.md');assert.equal(review.checkpoints,1);assert.equal(review.outbox,0);
  }finally{await h.close();}
});
test('failed tracker write never promotes a prepared phone intent into committed recovery',async()=>{
  const day=localDay(),h=await harness(setEntry(starter(),day,'japanese',false),{}, {mobile:true});try{h.plugin.app.vault.process=async(_file:unknown,fn:(text:string)=>string)=>{fn(h.text);throw new Error('Write failed');};await assert.rejects(()=>h.plugin.change((s:string)=>setEntry(s,day,'japanese',true)),/Write failed/);assert.equal(parseBoard(h.text).entries[0].done,false);const review=await h.plugin.syncStore.review('Sync/Color Sprint.md');assert.equal(review.checkpoints,0);assert.equal(review.recovery.changes.length,0);assert.match(review.errors.join('\n'),/Unconfirmed/);await h.plugin.syncStore.archiveUnconfirmed();assert.ok([...h.files.keys()].some(path=>path.includes('/Unconfirmed/')));assert.equal((await h.plugin.syncStore.review('Sync/Color Sprint.md')).outbox,0);
  }finally{await h.close();}
});
test('phone checkbox write stops before tracker mutation if durable journal storage fails',async()=>{
  const day=localDay(),h=await harness(setEntry(starter(),day,'japanese',false),{}, {mobile:true});try{h.plugin.app.saveLocalStorage=()=>{throw new Error('Local storage full');};await assert.rejects(()=>h.plugin.change((s:string)=>setEntry(s,day,'japanese',true)),/Local storage full/);assert.equal(parseBoard(h.text).entries[0].done,false);assert.equal(h.writes,0);assert.equal(h.files.size,0);
  }finally{await h.close();}
});
test('proposal review applies safe plan changes with backup/receipt, retains checkboxes and rejects stale review',async()=>{
  const day=localDay(),base=setEntry(starter(),day,'japanese',false);const proposal:PlanProposal={version:1,id:'proposal-test',tracker:'Sync/Color Sprint.md',created:'2026-10-18T20:00:00Z',base,proposed:saveTask(base,{...parseBoard(base).tasks[0],definition:'Proposed clearer next action'})};const path='Sync/Color Sprint Sync/Proposals/proposal-test.md';const h=await harness(setEntry(base,day,'japanese',true),{[path]:syncNote('proposal',proposal)});try{let review=await h.plugin.syncStore.review(proposal.tracker);assert.equal(review.proposals.length,1);await h.external(s=>setEntry(s,day,'cook',false));await assert.rejects(()=>h.plugin.syncStore.apply(proposal.tracker,review.proposals[0],review.current),/changed since review/);review=await h.plugin.syncStore.review(proposal.tracker);await h.plugin.syncStore.apply(proposal.tracker,review.proposals[0],review.current);assert.equal(parseBoard(h.text).entries.find(e=>e.taskId==='japanese')!.done,true);assert.equal(parseBoard(h.text).tasks[0].definition,'Proposed clearer next action');assert.equal((await h.plugin.syncStore.review(proposal.tracker)).proposals.length,0);assert.ok([...h.files.keys()].some(path=>path.includes('/Recovery/')));assert.ok([...h.files.keys()].some(path=>path.includes('/Applied/')));
  }finally{await h.close();}
});
test('planning disagreements require explicit keep-current and never replace the phone definition or checkbox',async()=>{
  const day=localDay(),base=setEntry(starter(),day,'japanese',false),task=parseBoard(base).tasks[0],current=setEntry(saveTask(base,{...task,title:'My phone title'}),day,'japanese',true);let proposed=saveTask(base,{...task,title:'Planner title'});proposed=saveTask(proposed,{...parseBoard(proposed).tasks[1],definition:'Safe new criterion'});const proposal:PlanProposal={version:1,id:'proposal-conflict',tracker:'Sync/Color Sprint.md',created:'2026-10-18T20:00:00Z',base,proposed};const h=await harness(current,{'Sync/Color Sprint Sync/Proposals/conflict.md':syncNote('proposal',proposal)});try{const review=await h.plugin.syncStore.review(proposal.tracker);await assert.rejects(()=>h.plugin.syncStore.apply(proposal.tracker,review.proposals[0],review.current),/explicitly keep current/);assert.equal(h.writes,0);await h.plugin.syncStore.apply(proposal.tracker,review.proposals[0],review.current,true);assert.equal(parseBoard(h.text).tasks[0].title,'My phone title');assert.equal(parseBoard(h.text).tasks[1].definition,'Safe new criterion');assert.equal(parseBoard(h.text).entries[0].done,true);assert.equal((await h.plugin.syncStore.review(proposal.tracker)).proposals.length,0);
  }finally{await h.close();}
});

test('active focus prevents applying a plan and malformed proposals cannot mutate a tracker',async()=>{
  const base=starter(),proposal:PlanProposal={version:1,id:'proposal-timer',tracker:'Sync/Color Sprint.md',created:'2026-10-18T20:00:00Z',base,proposed:saveTask(base,{...parseBoard(base).tasks[0],definition:'New'})};const h=await harness(startTimer(base,'japanese',localDay()),{'Sync/Color Sprint Sync/Proposals/good.md':syncNote('proposal',proposal),'Sync/Color Sprint Sync/Proposals/broken.md':'Bad proposal'});try{const review=await h.plugin.syncStore.review(proposal.tracker);assert.equal(review.errors.length,1);await assert.rejects(()=>h.plugin.syncStore.apply(proposal.tracker,review.proposals[0],review.current),/active focus/);assert.equal(h.writes,0);h.plugin.openSyncReview();await settle();assert.match(h.modals[0].contentEl.textContent,/not server acknowledgments/);assert.match(h.modals[0].contentEl.textContent,/No recoverable phone checkbox differences/);assert.equal(h.writes,0);
  }finally{await h.close();}
});

test('date-specific durations reach Today, Digest, meditation and the running countdown',async()=>{
  let md=starter('2026-10-18')+'\n## Focus Targets\n\n| Date | Task ID | Minutes |\n| --- | --- | --- |\n| 2026-10-28 | japanese | 25 |\n| 2026-10-28 | mindfulness | 15 |\n';md=setEntry(md,'2026-10-28','japanese',false);const h=await harness(md);try{
    await h.view.setState({date:'2026-10-28',tab:'Today'},{});await settle();assert.equal(h.button('Start focus · 25m').getAttribute('aria-label'),'Start focus for Study Japanese');assert.equal(h.button('Meditate · 15m').getAttribute('aria-label'),'Start meditation mode');
    h.button('Digest').click();await settle();h.button('Focus · 25m').click();await settle();assert.equal(parseBoard(h.text).timer!.target,1500);assert.match(h.document.querySelector('.cs-time')!.textContent!,/^2[45]:/);h.button('Cancel').click();await settle();assert.ok(h.document.querySelector('.cs-digest'));h.button('Meditate · 15m').click();await settle();assert.equal(parseBoard(h.text).timer!.target,900);assert.match(h.document.querySelector('.cs-time')!.textContent!,/^1[45]:/);assert.equal(parseBoard(h.text).sessions.length,0);
  }finally{await h.close();}
});

test('voice reflection shortcut reads existing audio Markdown without changing notes or recording',async()=>{
  const day=localDay(),path=`Sync/Reflection/Voice/${day}.md`,note='# My reflection\n\n![[Private recording.m4a]]\n\nKeep my words.';const h=await harness(starter(),{[path]:note});try{assert.ok(h.commands.has('voice-reflection'));h.button('🎙').click();await settle();const modal=h.modals[0];assert.ok(modal.contentEl.querySelector('textarea[aria-label="Reflection text"]'));assert.equal(h.button('Save reflection',modal.contentEl).disabled,false);assert.match(modal.contentEl.textContent,/microphone on your iPhone keyboard/);assert.deepEqual(h.renderedMarkdown,[{markdown:note,path}]);assert.equal(h.files.get(path)!.text,note);assert.equal(h.writes,0);modal.close();assert.equal(h.componentsUnloaded,1);assert.equal(h.document.querySelectorAll('.cs-reflection').length,0);
  }finally{await h.close();}
});

test('dictation text draft survives closing and app reload, appends safely and adds no task wins',async()=>{
  const day='2026-10-21',path=`Sync/Reflection/Voice/${day}.md`,store=new Map<string,unknown>(),original='# My existing note\n\n![[Keep.m4a]]\n';let h=await harness(starter(),{[path]:original},{store});
  try{await h.view.setState({date:day},{});await settle();h.button('🎙').click();await settle();const input=h.document.querySelector('textarea[aria-label="Reflection text"]') as HTMLTextAreaElement;input.value='Dictated words, ready to keep.';input.dispatchEvent(new h.dom.window.Event('input'));h.modals[0].close();assert.equal(h.files.get(path)!.text,original);assert.equal(h.writes,0);assert.equal(store.size,1);}finally{await h.close();}
  h=await harness(starter(),{[path]:original},{store});try{h.plugin.openVoiceReflection(day);await settle();const input=h.document.querySelector('textarea[aria-label="Reflection text"]') as HTMLTextAreaElement;assert.equal(input.value,'Dictated words, ready to keep.');h.button('Dictate / type',h.modals[0].contentEl).click();assert.equal(h.document.activeElement,input);
    h.files.get(path)!.text+='\nDirect Markdown edit while panel is open.\n';h.plugin.app.commands={executeCommandById:()=>{throw new Error('Dictation must not invoke audio recorder.');}};
    const button=h.button('Save reflection',h.modals[0].contentEl);button.click();button.click();await settle();const result=h.files.get(path)!.text;assert.ok(result.startsWith(original));assert.match(result,/Direct Markdown edit/);assert.match(result,/Dictated words, ready to keep/);assert.equal((result.match(/color-sprint-reflection:/g)||[]).length,1);assert.equal(store.size,0);assert.equal(h.modals.length,0);assert.equal(parseBoard(h.text).entries.length,0);assert.equal(parseBoard(h.text).sessions.length,0);assert.equal(h.writes,1);assert.match(h.notices.at(-1)!,/saved as Markdown/);
  }finally{await h.close();}
});

test('reflection save failure retains text, and retry creates only the selected dated note',async()=>{
  const h=await harness();const day='2026-10-24',path=`Sync/Reflection/Voice/${day}.md`;try{h.plugin.openVoiceReflection(day);await settle();assert.equal(h.files.size,0);const input=h.document.querySelector('textarea') as HTMLTextAreaElement;input.value='A short reflection.';input.dispatchEvent(new h.dom.window.Event('input'));const process=h.plugin.app.vault.process;h.plugin.app.vault.process=async()=>{throw new Error('Disk full');};h.button('Save reflection',h.modals[0].contentEl).click();await settle();assert.match(h.modals[0].contentEl.textContent,/Not saved.*Disk full/);assert.equal(input.value,'A short reflection.');assert.ok(h.plugin.app.loadLocalStorage(`color-sprint.reflection-draft:${path}`));assert.equal(h.notices.some(n=>n.includes('saved as Markdown')),false);
    h.plugin.app.vault.process=process;h.button('Save reflection',h.modals[0].contentEl).click();await settle();assert.equal(h.modals.length,0);assert.equal(h.files.size,1);assert.match(h.files.get(path)!.text,/reflection-date: "2026-10-24"/);assert.match(h.files.get(path)!.text,/A short reflection/);assert.equal(h.plugin.app.loadLocalStorage(`color-sprint.reflection-draft:${path}`),null);
  }finally{await h.close();}
});

test('voice journal opens in the editor before start command, preserves existing recordings and has no task wins',async()=>{
  const day=localDay(),path=`Sync/Reflection/Voice/${day}.md`,note='# Existing\n\n![[First recording.m4a]]\n';const h=await harness(starter(),{[path]:note});let started=0;try{h.plugin.app.commands={commands:{'audio-recorder:start':{},'audio-recorder:stop':{checkCallback:()=>false}},executeCommandById:(id:string)=>{assert.equal(id,'audio-recorder:start');assert.equal(h.plugin.app.workspace.getActiveFile().path,path);assert.equal(h.plugin.app.workspace.lastCursor.line,note.split('\n').length-1);started++;return true;}};
    h.plugin.openLegacyVoiceReflection(day);await settle();const modal=h.modals[0];assert.equal(h.button('Record in journal',modal.contentEl).disabled,false);h.button('Record in journal',modal.contentEl).click();await settle();assert.equal(started,1);assert.equal(h.modals.length,0);assert.equal(h.files.get(path)!.text,note);assert.equal(parseBoard(h.text).sessions.length,0);assert.equal(parseBoard(h.text).entries.length,0);assert.match(h.notices[0],/Recorder requested/);
  }finally{await h.close();}
});

test('floating Stop restores the owned journal after navigation and confirms new audio, exactly once',async()=>{
  const day=localDay(),path=`Sync/Reflection/Voice/${day}.md`;const h=await harness(starter(),{'Other.md':'Leave this note intact.'});let recording=false,stops=0;try{
    h.plugin.app.commands={commands:{'audio-recorder:start':{},'audio-recorder:stop':{checkCallback:()=>recording}},executeCommandById:(id:string)=>{if(id==='audio-recorder:start'){recording=true;return true;}assert.equal(id,'audio-recorder:stop');assert.equal(h.plugin.app.workspace.getActiveFile().path,path);recording=false;stops++;setTimeout(()=>{h.files.get(path)!.text+='\n![[New recording.m4a]]\n';},10);return true;}};
    await h.plugin.openVoiceJournal(day,true);assert.ok(h.document.querySelector('.cs-recording-bar'));assert.equal(h.plugin.app.loadLocalStorage('color-sprint.voice-capture').path,path);await h.openFile('Other.md');
    const first=h.plugin.stopVoiceRecording(),second=h.plugin.stopVoiceRecording();assert.equal(first,second);assert.match(h.document.querySelector('.cs-recording-bar')!.textContent!,/Saving/);assert.equal(h.notices.some(n=>n.includes('Audio added')),false);await first;assert.equal(stops,1);assert.equal(h.files.get('Other.md')!.text,'Leave this note intact.');assert.match(h.files.get(path)!.text,/New recording/);assert.equal(h.document.querySelector('.cs-recording-bar'),null);assert.equal(h.plugin.app.loadLocalStorage('color-sprint.voice-capture'),null);assert.match(h.notices.at(-1)!,/Audio added/);assert.equal(h.writes,0);assert.equal(parseBoard(h.text).sessions.length,0);assert.ok(h.commands.has('stop-voice-recording'));
  }finally{await h.close();}
});

test('voice panel has an explicit Stop button for an already active recording',async()=>{
  const day=localDay(),path=`Sync/Reflection/Voice/${day}.md`;const h=await harness(starter(),{[path]:'# Existing journal\n'});let recording=true,stops=0;try{await h.openFile(path);h.plugin.app.commands={commands:{'audio-recorder:start':{},'audio-recorder:stop':{checkCallback:()=>recording}},executeCommandById:(id:string)=>{assert.equal(id,'audio-recorder:stop');recording=false;stops++;h.files.get(path)!.text+='\n![[Native recording.webm]]\n';return true;}};
    h.plugin.openLegacyVoiceReflection(day);await settle();const modal=h.modals[0];assert.equal(h.button('Stop & save',modal.contentEl).hidden,false);assert.equal(h.button('Record in journal',modal.contentEl).disabled,true);h.button('Stop & save',modal.contentEl).click();await settle();assert.equal(stops,1);assert.equal(h.modals.length,0);assert.match(h.files.get(path)!.text,/Native recording/);assert.equal(h.writes,0);
  }finally{await h.close();}
});

test('device-local capture destination survives plugin loading without guessing a new journal',async()=>{
  const path='Sync/Reflection/Voice/2026-10-18.md';let recording=true,stops=0;const store=new Map<string,unknown>([['color-sprint.voice-capture',{path,seen:true,requestedAt:Date.now()}]]);let h:any;const recorder={commands:{'audio-recorder:start':{},'audio-recorder:stop':{checkCallback:()=>recording}},executeCommandById:(id:string)=>{assert.equal(id,'audio-recorder:stop');assert.equal(h.plugin.app.workspace.getActiveFile().path,path);recording=false;stops++;h.files.get(path).text+='\n![[Resumed recording.m4a]]\n';return true;}};h=await harness(starter(),{[path]:'# Capture in progress\n'},{store,recorder});try{assert.ok(h.document.querySelector('.cs-recording-bar'));h.button('Stop & save',h.document.body).click();await settle();assert.equal(stops,1);assert.equal(store.size,0);assert.equal(h.document.querySelector('.cs-recording-bar'),null);}finally{await h.close();}
});

test('failed stop keeps its control and does not claim saved audio or destroy notes',async()=>{
  const day=localDay(),path=`Sync/Reflection/Voice/${day}.md`;const h=await harness(starter(),{[path]:'# Unchanged\n'});try{await h.openFile(path);h.plugin.app.commands={commands:{'audio-recorder:start':{},'audio-recorder:stop':{checkCallback:()=>true}},executeCommandById:()=>false};h.plugin.syncVoiceControls();assert.ok(h.document.querySelector('.cs-recording-bar'));await assert.rejects(()=>h.plugin.stopVoiceRecording(),/could not stop/);assert.ok(h.document.querySelector('.cs-recording-bar'));assert.equal(h.button('Stop & save',h.document.body).disabled,false);assert.equal(h.notices.some(n=>n.includes('Audio added')),false);assert.equal(h.files.get(path)!.text,'# Unchanged\n');assert.equal(h.writes,0);
  }finally{await h.close();}
});

test('voice stop awaits Markdown persistence and never announces success after a save failure',async()=>{
  const day=localDay(),path=`Sync/Reflection/Voice/${day}.md`;const h=await harness(starter(),{[path]:'# Journal\n'});let recording=true,saves=0;try{await h.openFile(path);let buffer='# Journal\n';const editor=h.plugin.app.workspace.activeEditor.editor;editor.getValue=()=>buffer;const view={file:h.plugin.app.workspace.getActiveFile(),editor,save:async()=>{saves++;throw new Error('Journal disk save failed');}};h.plugin.app.workspace.getLeavesOfType=(type:string)=>type==='markdown'?[{view}]:[];h.plugin.app.commands={commands:{'audio-recorder:start':{},'audio-recorder:stop':{checkCallback:()=>recording}},executeCommandById:()=>{recording=false;buffer+='\n![[Captured.m4a]]\n';return true;}};await assert.rejects(()=>h.plugin.stopVoiceRecording(),/disk save failed/);assert.equal(saves,1);assert.equal(h.notices.some(n=>n.includes('Audio added')),false);assert.equal(h.files.get(path)!.text,'# Journal\n');assert.match(buffer,/Captured.m4a/);assert.equal(h.writes,0);
  }finally{await h.close();}
});

test('an older unowned recording stops without waiting on a stale editor or guessing a journal',async()=>{
  const path='Old journal.md';const h=await harness(starter(),{[path]:'# Keep this\n'});let recording=true,stops=0;try{await h.openFile(path);await h.plugin.open({tab:'Digest'});assert.equal(h.plugin.app.workspace.getActiveFile(),null);h.plugin.app.commands={commands:{'audio-recorder:start':{},'audio-recorder:stop':{checkCallback:()=>recording}},executeCommandById:(id:string)=>{assert.equal(id,'audio-recorder:stop');recording=false;stops++;return true;}};await h.plugin.stopVoiceRecording();assert.equal(stops,1);assert.equal(h.files.size,1);assert.equal(h.files.get(path)!.text,'# Keep this\n');assert.match(h.notices.at(-1)!,/Stop requested/);assert.equal(h.notices.some(n=>n.includes('Audio added')),false);assert.equal(h.writes,0);
  }finally{await h.close();}
});

test('voice journal creates only the selected date and refuses active-recorder navigation',async()=>{
  const h=await harness();try{const day='2026-10-19',path=`Sync/Reflection/Voice/${day}.md`;await h.plugin.openVoiceJournal(day);assert.match(h.files.get(path)!.text,/2026-10-19/);const original=h.files.get(path)!.text;await h.plugin.openVoiceJournal(day);assert.equal(h.files.get(path)!.text,original);assert.equal(h.opened.length,0,'journals do not redirect into the sprint');
    h.plugin.app.commands={commands:{'audio-recorder:start':{},'audio-recorder:stop':{checkCallback:()=>true}},executeCommandById:()=>{throw new Error('Must never execute');}};
    await assert.rejects(()=>h.plugin.openVoiceJournal('2026-10-20',true),/already recording/);await assert.rejects(()=>h.plugin.openVoiceJournal('2026-10-20'),/Stop and save/);assert.equal(h.files.has('Sync/Reflection/Voice/2026-10-20.md'),false);assert.equal(h.plugin.app.workspace.getActiveFile().path,path);assert.equal(h.writes,0);
  }finally{await h.close();}
});

test('digest reads the Markdown itinerary and keeps completed tasks after a save and focus',async()=>{
  const day=localDay();let md=setEntry(setEntry(starter(),day,'japanese',true,'Lesson saved'),day,'make-bed',false);
  md=saveTimeBlock(md,{date:day,taskId:'cook',start:'19:00',end:'19:30',timezone:'America/Chicago',status:'suggested',eventId:'-',eventUrl:'-'});
  const h=await harness(md);try{assert.ok(h.commands.has('open-digest'));h.button('Digest').click();await settle();assert.equal(h.writes,0);assert.match(h.document.querySelector('.cs-itinerary')!.textContent!,/7 PM/);assert.match(h.document.querySelector('.cs-itinerary')!.textContent!,/SUGGESTED/);
    const done=h.document.querySelector('[aria-label="Complete Study Japanese in digest"]') as HTMLInputElement;assert.equal(done.checked,true);
    (h.document.querySelector('[aria-label="Complete Cook in digest"]') as HTMLInputElement).click();await settle();assert.equal(parseBoard(h.text).entries.find(e=>e.taskId==='cook')!.done,true);assert.match(h.document.querySelector('.cs-feedback-toast')!.textContent!,/Cook/);assert.equal(h.document.querySelectorAll('.cs-itinerary-item.is-done').length,1);
    const flexible=h.document.querySelector('.cs-flexible-item:not(.is-done)')!;h.button('Focus · 2m',flexible).click();await settle();h.button('Finish').click();await settle();assert.ok(h.document.querySelector('.cs-digest'));assert.equal(parseBoard(h.text).entries.find(e=>e.taskId==='make-bed')!.done,true);assert.equal(h.document.querySelectorAll('.cs-flexible-item.is-done').length,2);
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
