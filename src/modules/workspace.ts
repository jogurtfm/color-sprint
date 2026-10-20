import type {Board} from '../model';
import {activeModuleFocus,ModuleFocus,ReviewRecord} from './contracts';
import {StudyData,StudyPort} from './data';
import {TaskModuleHost} from './host';
import {builtinModules} from './registry';
/** Shared focus-only host; loading/polling stops when its focus surface closes. */
export class StudyWorkspace {
  private host:TaskModuleHost|null=null;private focus:ModuleFocus|null=null;private root:HTMLElement|null=null;private key='';private generation=0;private dead=false;private polling=false;private timer:ReturnType<typeof setInterval>|null=null;private listeners=new Set<()=>void>();private config='';private history='';
  constructor(private port:StudyPort,private presence?:(visible:boolean)=>void){}
  async sync(root:HTMLElement|null,board:Board|null){
    const focus=root?activeModuleFocus(board):null;this.root=root;this.focus=focus;
    if(!focus||!root){this.reset();return;}
    if(this.key===focus.key&&this.host){await this.host.sync(root,focus,this.binding?[this.binding]:[]);return;}
    const seq=++this.generation;this.host?.destroy();this.host=null;this.key=focus.key;root.textContent='Opening task workspace…';
    try{const data=await this.port.load(focus);if(this.dead||seq!==this.generation)return;this.mount(data);if(!this.timer)this.timer=setInterval(()=>void this.poll(),3000);}catch(e){if(seq===this.generation)root.textContent=e instanceof Error?e.message:'Study workspace unavailable.';}
  }
  private binding:StudyData['binding']=null;
  private mount(data:StudyData){
    this.binding=data.binding;this.config=JSON.stringify([data.binding,data.deck]);this.history=JSON.stringify(data.records);if(!this.root||!this.focus)return;
    this.presence?.(!!data.binding);
    if(!data.binding){this.root.replaceChildren();return;}
    this.host?.destroy();this.host=new TaskModuleHost(builtinModules,{documents:{deck:data.deck},deviceId:data.deviceId,now:()=>Date.now(),id:()=> 'review-'+crypto.randomUUID(),store:{read:async()=> (await this.port.load(this.focus!)).records,append:async value=>{const focus=this.focus;if(!focus)throw new Error('Focus ended.');await this.port.append(value as ReviewRecord,focus);this.listeners.forEach(fn=>fn());},subscribe:(_dataset,fn)=>{this.listeners.add(fn);return ()=>this.listeners.delete(fn);}}});
    void this.host.sync(this.root,this.focus,[data.binding]);
  }
  private async poll(){if(this.polling||this.dead||!this.focus||!this.root)return;this.polling=true;const seq=this.generation;try{const data=await this.port.load(this.focus);if(seq!==this.generation||this.dead)return;if(this.config!==JSON.stringify([data.binding,data.deck]))this.mount(data);else if(this.history!==JSON.stringify(data.records)){this.history=JSON.stringify(data.records);this.listeners.forEach(fn=>fn());}}catch{this.listeners.forEach(fn=>fn());}finally{this.polling=false;}}
  private reset(){++this.generation;this.host?.destroy();this.host=null;this.key='';this.listeners.clear();if(this.timer)clearInterval(this.timer);this.timer=null;}
  destroy(){this.dead=true;this.reset();}
}
