import {watch,FSWatcher} from 'node:fs';
import path from 'node:path';
import {VaultStore,Source} from './core';
/** Watch the parent, not the old file handle, so atomic editor/cloud replacements remain visible. */
export class TrackerSync {
  private watcher:FSWatcher|null=null;private watched='';private poll:ReturnType<typeof setInterval>|null=null;
  private debounce:ReturnType<typeof setTimeout>|null=null;private tail:Promise<unknown>=Promise.resolve();private pending:Promise<Source>|null=null;private stopped=false;
  constructor(private current:()=>VaultStore,private fresh:()=>void,private pollMs=750,private debounceMs=60){}
  get mode(){return this.watcher?`watch + ${this.pollMs} ms fallback`:`${this.pollMs} ms poll fallback`;}
  start(){this.stopped=false;this.connect();if(!this.poll){this.poll=setInterval(()=>{this.connect();void this.refresh().catch(()=>{});},this.pollMs);this.poll.unref();}}
  connect(){const filename=this.current().filename;if(this.watched===filename&&this.watcher)return;
    this.watcher?.close();this.watcher=null;this.watched=filename;
    try{const watcher=watch(path.dirname(filename),{persistent:false},(_kind,name)=>{
      const equal=(a:string,b:string)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
      if(name&&!equal(path.basename(String(name)),path.basename(filename)))return;
      if(this.debounce)clearTimeout(this.debounce);this.debounce=setTimeout(()=>{this.debounce=null;void this.refresh().catch(()=>{});},this.debounceMs);
    });watcher.on('error',()=>{if(this.watcher===watcher){watcher.close();this.watcher=null;}});this.watcher=watcher;}catch{/* Read-only polling still works if this filesystem cannot watch. */}
  }
  refresh(force=false):Promise<Source>{
    if(this.pending&&!force)return this.pending;
    const work=this.tail.catch(()=>{}).then(async()=>{const target=this.current();const result=await target.load();if(!this.stopped&&target===this.current())this.fresh();return result;});
    this.tail=work;this.pending=work;void work.finally(()=>{if(this.pending===work)this.pending=null;}).catch(()=>{});return work;
  }
  stop(){this.stopped=true;if(this.poll)clearInterval(this.poll);if(this.debounce)clearTimeout(this.debounce);this.poll=null;this.debounce=null;this.watcher?.close();this.watcher=null;}
}
