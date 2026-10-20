import { validDay } from './model';
import {fitReflectionViewport} from './reflection-viewport';

export interface ReflectionDraft {id:string;text:string;created:string}
export function newReflectionDraft():ReflectionDraft{return {id:`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`,text:'',created:new Date().toISOString()};}
export function reflectionDraft(value:unknown):ReflectionDraft|null {
  if(!value||typeof value!=='object')return null;const draft=value as ReflectionDraft;
  return typeof draft.id==='string'&&/^[a-z0-9-]{6,80}$/.test(draft.id)&&typeof draft.text==='string'&&typeof draft.created==='string'&&Number.isFinite(Date.parse(draft.created))?{id:draft.id,text:draft.text,created:draft.created}:null;
}
export function reflectionScaffold(day:string):string {
  if(!validDay(day))throw new Error('Choose a real reflection date.');
  return `---\nreflection-date: "${day}"\n---\n\n# Reflection · ${day}\n\nCapture with the iPhone keyboard microphone or type directly. Review dictated words before saving.\n\n`;
}
export function appendReflection(text:string,draft:ReflectionDraft):string {
  if(!reflectionDraft(draft)||!draft.text.trim())throw new Error('Add a few words before saving.');
  const marker=`<!-- color-sprint-reflection:${draft.id} -->`;
  if(text.includes(marker))return text; // Retry after a successful write must not duplicate an entry.
  return `${text}${text.endsWith('\n')?'':'\n'}\n## Reflection · ${draft.created}\n\n${marker}\n\n${draft.text.trim()}\n`;
}

// A normal textarea delegates speech-to-text to the phone's keyboard. No audio
// capture, speech API, permission request or network client belongs in this UI.
export function mountReflectionPanel(root:HTMLElement,options:{frame?:HTMLElement;draft:ReflectionDraft;draftChanged:(draft:ReflectionDraft)=>void;save:(draft:ReflectionDraft)=>Promise<void>;read:()=>Promise<{path:string;text:string}>;renderMarkdown:(note:{path:string;text:string},body:HTMLElement)=>Promise<void>;open:()=>Promise<void>;saved:()=>void}):()=>void {
  const doc=root.ownerDocument;let closed=false,pending=false,composing=false,draft={...options.draft};root.classList.add('cs-reflection');
  const frame=options.frame||root.closest<HTMLElement>('dialog,.modal'),disposeViewport=frame?fitReflectionViewport(frame):()=>{};
  const el=(tag:string,parent:HTMLElement,cls:string,text='')=>{const node=doc.createElement(tag);node.className=cls;node.textContent=text;parent.append(node);return node;};
  el('p',root,'cs-voice-intro','Use the microphone on your iPhone keyboard, or type. Review, then save.');
  const label=el('label',root,'cs-reflection-label','What is on your mind?');
  const input=el('textarea',label,'cs-reflection-input') as HTMLTextAreaElement;input.value=draft.text;input.rows=5;input.setAttribute('aria-label','Reflection text');input.placeholder='No need to organize it first…';input.setAttribute('autocapitalize','sentences');input.spellcheck=true;
  const status=el('p',root,'cs-voice-status',draft.text?'Unfinished draft restored on this device.':'Text saves as Markdown. No recording file is created.');status.setAttribute('role','status');
  const error=el('p',root,'cs-form-error');error.setAttribute('role','alert');
  const remember=()=>{draft={...draft,text:input.value};try{options.draftChanged({...draft});error.textContent='';status.textContent='Draft kept on this device. Save to sync it with your journal.';}catch(e){error.textContent=`Draft could not be kept on this device. Save to your journal before closing. ${e instanceof Error?e.message:String(e)}`;}};
  input.addEventListener('input',remember);input.addEventListener('compositionstart',()=>{composing=true;});input.addEventListener('compositionend',()=>{composing=false;remember();});
  const actions=el('div',root,'cs-voice-actions');
  actions.setAttribute('role','toolbar');actions.setAttribute('aria-label','Reflection controls');
  root.insertBefore(actions,root.firstChild);
  root.insertBefore(error,actions.nextSibling);
  const focus=el('button',actions,'','Dictate / type') as HTMLButtonElement;focus.type='button';focus.addEventListener('click',()=>input.focus());
  const save=el('button',actions,'mod-cta','Save reflection') as HTMLButtonElement;save.type='button';
  actions.insertBefore(save,actions.firstChild);
  const hide=el('button',actions,'','Hide keyboard') as HTMLButtonElement;hide.type='button';hide.addEventListener('click',()=>{remember();input.blur();hide.focus({preventScroll:true});});actions.insertBefore(hide,focus);
  const open=el('button',actions,'','Open journal') as HTMLButtonElement;open.type='button';
  const setPending=(value:boolean)=>{pending=value;input.readOnly=value;save.disabled=value;hide.disabled=value;focus.disabled=value;open.disabled=value;save.textContent=value?'Saving…':'Save reflection';};
  save.addEventListener('click',()=>{if(pending)return;if(composing){error.textContent='Finish dictation or text composition on the keyboard, then save.';return;}remember();const snapshot={...draft};if(!snapshot.text.trim()){error.textContent='Add a few words before saving.';input.focus();return;}setPending(true);error.textContent='';void options.save(snapshot).then(()=>{if(!closed)options.saved();}).catch(e=>{if(!closed)error.textContent=`Not saved. Your text is still here. ${e instanceof Error?e.message:String(e)}`;}).finally(()=>{if(!closed)setPending(false);});});
  open.addEventListener('click',()=>{if(pending)return;remember();void options.open().catch(e=>{if(!closed)error.textContent=e instanceof Error?e.message:String(e);});});
  const help=el('details',root,'cs-reflection-help');el('summary',help,'','Keyboard microphone missing?');el('p',help,'','On iPhone: Settings → General → Keyboard → Enable Dictation. Color Sprint cannot start or stop Apple Dictation for you. Finish dictation using the keyboard before saving. Apple controls speech processing.');
  el('p',root,'cs-voice-hint','Closing keeps an unfinished draft on this device; it does not sync until saved. Existing journal entries and recordings stay intact.');
  const existing=el('details',root,'cs-reflection-existing');el('summary',existing,'','Saved entries for this day');
  void options.read().then(async note=>{if(closed)return;if(!note.text){el('p',existing,'cs-muted','Nothing saved yet.');return;}const body=el('div',existing,'cs-voice-preview');await options.renderMarkdown(note,body);}).catch(e=>{if(!closed)error.textContent=e instanceof Error?e.message:String(e);});
  return ()=>{closed=true;disposeViewport();};
}
