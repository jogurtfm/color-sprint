import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { starter } from '../src/starter';
import { parseBoard, setEntry, startTimer, localDay } from '../src/model';
const require=createRequire(import.meta.url);
const {JSDOM}=require('jsdom');
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));

async function harness(initial=starter()) {
  const dom=new JSDOM('<!doctype html><body></body>',{url:'https://preview.invalid'});const document=dom.window.document;const proto=dom.window.HTMLElement.prototype;
  Object.assign(proto,{addClass:function(this:any,name:string){this.classList.add(name);},empty:function(this:any){this.replaceChildren();},createEl:function(this:any,tag:string,options:any={}){const e=document.createElement(tag);e.className=options.cls||'';e.textContent=options.text||'';for(const [key,value] of Object.entries(options.attr||{}))e.setAttribute(key,String(value));this.append(e);return e;}});
  const notices:string[]=[];const modals:any[]=[];const events=new Map<string,Set<(...args:any[])=>void>>();const commands=new Map<string,any>();let md=initial;let writes=0;
  class TFile {constructor(public path:string) {}}
  const file=new TFile('Sync/Color Sprint.md');
  class Plugin {
    cleanups:(()=>void)[]=[];app:any;
    constructor(app:any){this.app=app;}
    async loadData(){return null;}async saveData(_data:any){}
    registerView(type:string,factory:any){this.app.workspace.factory=factory;}
    addRibbonIcon(){}addCommand(command:any){commands.set(command.id,command);}
    registerEvent(ref:any){this.cleanups.push(()=>ref.set.delete(ref.fn));}
    registerDomEvent(target:any,event:string,fn:any){target.addEventListener(event,fn);this.cleanups.push(()=>target.removeEventListener(event,fn));}
  }
  class ItemView {contentEl:any;constructor(public leaf:any){this.contentEl=document.createElement('main');document.body.append(this.contentEl);}}
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
    addButton(fn:any){const el=document.createElement('button');this.row.append(el);const api:any={setButtonText:(value:string)=>{el.textContent=value;return api;},setCta:()=>api,setDisabled:(value:boolean)=>{el.disabled=value;return api;},onClick:(handler:any)=>{el.addEventListener('click',handler);return api;}};fn(api);return this;}
  }
  const vault={getAbstractFileByPath:(path:string)=>path===file.path?file:null,read:async()=>md,process:async(_file:any,fn:any)=>{const next=fn(md);md=next;writes++;for(const cb of events.get('modify')||[])cb(file);return md;},on:(event:string,fn:any)=>{if(!events.has(event))events.set(event,new Set());const set=events.get(event)!;set.add(fn);return {set,fn};},create:async()=>{},createFolder:async()=>{}};
  const leaf:any={setViewState:async()=>{},openFile:async()=>{}};const app:any={vault,workspace:{getLeavesOfType:()=>[],getLeaf:()=>leaf,revealLeaf:async()=>{}}};
  const exports:any={};const module={exports};const obsidian={Plugin,ItemView,Modal,Setting,TFile,Notice:class {constructor(message:string){notices.push(message);}},normalizePath:(path:string)=>path.replace(/\\/g,'/'),debounce:(fn:any)=>fn};
  runInNewContext(readFileSync('main.js','utf8'),{module,exports,require:(id:string)=>{assert.equal(id,'obsidian');return obsidian;},document,window:dom.window,console,setTimeout,clearTimeout,setInterval,clearInterval});
  const plugin:any=new module.exports.default(app,{});await plugin.onload();const view:any=app.workspace.factory(leaf);await view.onOpen();
  return {dom,document,plugin,view,commands,notices,modals,get text(){return md;},get writes(){return writes;},async external(fn:(s:string)=>string){md=fn(md);for(const cb of events.get('modify')||[])cb(file);await settle();},async close(){await view.onClose();plugin.onunload();for(const cleanup of plugin.cleanups)cleanup();dom.window.close();},button(label:string,within:any=view.contentEl){const b=[...within.querySelectorAll('button')].find((e:any)=>e.textContent===label);assert.ok(b,`Button not found: ${label}`);return b as HTMLButtonElement;}};
}
test('actual bundled plugin registers views/commands and writes real checkbox edits through Vault.process',async()=>{
  const day=localDay();const h=await harness(setEntry(starter(),day,'make-bed',false,'Clear the bed first'));
  try {assert.ok(h.commands.has('open'));assert.equal(h.document.querySelectorAll('.cs-card').length,1);assert.match(h.document.body.textContent,/Clear the bed first/);const check=h.document.querySelector('.cs-check') as HTMLInputElement;check.click();await settle();assert.equal(parseBoard(h.text).entries[0].done,true);assert.equal(h.writes,1);assert.match(h.document.body.textContent,/1 of 1/);
    await h.external(s=>setEntry(s,day,'cook',false,'Chicken'));assert.equal(h.document.querySelectorAll('.cs-card').length,2);
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
test('timer rendered by bundled plugin recovers from an old start and saves without completion',async()=>{
  const text=startTimer(starter(),'workout',localDay(),Date.now()-120000);const h=await harness(text);try{assert.match(h.document.querySelector('.cs-time').textContent,/02:0\d/);h.button('Pause').click();await settle();assert.equal(parseBoard(h.text).timer?.started,'-');h.button('Resume').click();await settle();assert.notEqual(parseBoard(h.text).timer?.started,'-');h.button('Save session').click();await settle();const modal=h.modals[0];const field=modal.contentEl.querySelector('textarea');field.value='Actual: light movement';field.dispatchEvent(new h.dom.window.Event('input'));h.button('Save session',modal.contentEl).click();await settle();assert.equal(parseBoard(h.text).timer,null);assert.equal(parseBoard(h.text).sessions.length,1);assert.equal(parseBoard(h.text).entries.length,0);}finally{await h.close();}
});
test('broken Markdown produces a recoverable error and no writes; view cleanup clears DOM',async()=>{
  const h=await harness(starter().replace('## Schedule','## Broken'));try{assert.match(h.document.body.textContent,/Missing ## Schedule/);assert.equal(h.writes,0);await h.view.onClose();assert.equal(h.view.contentEl.children.length,0);}finally{await h.close();}
});
