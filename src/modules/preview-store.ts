import type {ModuleStore,ReviewRecord,ModuleRecord} from './contracts';
import {validateReview} from './markdown';
/** Demonstration adapter only. Does not read or write files/localStorage/network. */
export class PreviewModuleStore implements ModuleStore {
  private records=new Map<string,ReviewRecord>();private listeners=new Map<string,Set<()=>void>>();
  async read(dataset:string){return [...this.records.values()].filter(r=>r.dataset===dataset).map(r=>({...r}));}
  async append(raw:ModuleRecord){const r=validateReview(raw),old=this.records.get(r.id);if(old){if(JSON.stringify(old)!==JSON.stringify(r))throw new Error('Review ID already has different content.');return;}
    const siblings=[...this.records.values()].filter(p=>p.dataset===r.dataset&&p.cardId===r.cardId),heads=siblings.filter(p=>!siblings.some(c=>c.parentId===p.id));
    if(siblings.length?(heads.length!==1||heads[0].id!==r.parentId):r.parentId!==null)throw new Error('This card changed in the other preview. Refreshed; rate the current card again.');
    this.records.set(r.id,r);for(const changed of this.listeners.get(r.dataset)||[])changed();
  }
  subscribe(dataset:string,changed:()=>void){let set=this.listeners.get(dataset);if(!set){set=new Set();this.listeners.set(dataset,set);}set.add(changed);return()=>set!.delete(changed);}
}
