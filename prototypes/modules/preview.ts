import {starter} from '../../src/starter';
import {startTimer,parseBoard,pauseTimer,resumeTimer,cancelTimer,addDays} from '../../src/model';
import {activeModuleFocus} from '../../src/modules/contracts';
import {TaskModuleHost} from '../../src/modules/host';
import {builtinModules} from '../../src/modules/registry';
import {parseBindings} from '../../src/modules/markdown';
import {PreviewModuleStore} from '../../src/modules/preview-store';
import bindingsMarkdown from '../../modules/Bindings.md';
import deckMarkdown from '../../modules/japanese/N5-Starter.md';
const store=new PreviewModuleStore(),bindings=parseBindings(bindingsMarkdown);
let day='2026-10-20',offset=0,text=starter(day),sequence=0;
const phoneRoot=document.querySelector<HTMLElement>('#phone-module')!,hudRoot=document.querySelector<HTMLElement>('#hud-module')!;
const makeHost=(deviceId:string)=>new TaskModuleHost(builtinModules,{store,now:()=>Date.now()+offset,id:()=> 'review-'+crypto.randomUUID(),deviceId,documents:{deck:deckMarkdown},preview:true});
const phone=makeHost('preview-phone'),hud=makeHost('preview-hud');
async function render(){const focus=activeModuleFocus(parseBoard(text));document.querySelectorAll<HTMLElement>('[data-focus-label]').forEach(el=>el.textContent=focus?(focus.paused?'PAUSED · ':'FOCUS · ')+focus.taskTitle:'NO ACTIVE FOCUS');
  document.querySelector<HTMLButtonElement>('#next-demo-day')!.disabled=day>=parseBoard(text).end;
  await Promise.all([phone.sync(phoneRoot,focus,bindings),hud.sync(hudRoot,focus,bindings)]);
  if(!focus||!bindings.some(b=>b.taskId===focus.taskId)){phoneRoot.textContent=hudRoot.textContent='Study module stays unloaded until the Japanese task is focused.';}
  document.querySelector('#preview-state')!.textContent=focus?'Focus identity: '+focus.key+' · both surfaces share only the temporary preview store.':'No learner module has been requested.';
}
document.querySelectorAll<HTMLButtonElement>('[data-focus-task]').forEach(b=>b.onclick=()=>{const current=parseBoard(text).timer;if(current)text=cancelTimer(text,current.id);text=startTimer(text,b.dataset.focusTask!,day,Date.now()+(++sequence));void render();});
document.querySelector<HTMLButtonElement>('#pause-focus')!.onclick=()=>{const timer=parseBoard(text).timer;if(timer){text=timer.started==='-'?resumeTimer(text,timer.id):pauseTimer(text,timer.id);void render();}};
document.querySelector<HTMLButtonElement>('#end-focus')!.onclick=()=>{const timer=parseBoard(text).timer;if(timer){text=cancelTimer(text,timer.id);void render();}};
document.querySelector<HTMLButtonElement>('#next-demo-day')!.onclick=()=>{const timer=parseBoard(text).timer;if(timer)text=cancelTimer(text,timer.id);offset+=86400000;day=addDays(day,1);text=startTimer(text,'japanese',day,Date.now()+(++sequence));void render();};
window.addEventListener('pagehide',()=>{phone.destroy();hud.destroy();},{once:true});
void render();
