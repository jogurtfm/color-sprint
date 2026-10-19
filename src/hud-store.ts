import {App,Modal,Notice,Platform,TFile,Setting} from 'obsidian';
import {processHudRequest} from './hud-protocol';
const TRUST='color-sprint.hud-trust';
export class HudBridge {
  private tail:Promise<unknown>=Promise.resolve();private stopped=false;private pairing:PairHudModal|null=null;
  constructor(private app:App,private change:(fn:(text:string)=>string,tracker:string)=>Promise<void>){}
  stop(){this.stopped=true;this.pairing?.close();}
  revoke(){if(!this.app.saveLocalStorage)throw new Error('Local pairing storage unavailable.');this.app.saveLocalStorage(TRUST,{});}
  handle(params:Record<string,string>):Promise<void>{const work=this.tail.catch(()=>{}).then(async()=>{
    if(this.stopped)return;if(Platform.isMobile)throw new Error('HUD controls must be handled by Obsidian on the same Windows computer.');
    if(params.vault!==this.app.vault.getName())throw new Error('HUD request belongs to another vault.');
    const result=await processHudRequest({
      read:async path=>{const file=this.app.vault.getAbstractFileByPath(path);if(!file)return null;if(!(file instanceof TFile)||file.stat.size>4*1024*1024)throw new Error('HUD note is invalid or too large.');return this.app.vault.read(file);},
      create:async(path,text)=>{if(this.stopped)throw new Error('Plugin stopped.');const parts=path.split('/');parts.pop();let parent='';for(const part of parts){parent=parent?parent+'/'+part:part;if(!this.app.vault.getAbstractFileByPath(parent))try{await this.app.vault.createFolder(parent);}catch(error){if(!this.app.vault.getAbstractFileByPath(parent))throw error;}}await this.app.vault.create(path,text);},
      replace:async(path,before,after)=>{const file=this.app.vault.getAbstractFileByPath(path);if(!(file instanceof TFile))throw new Error('HUD receipt missing.');await this.app.vault.process(file,current=>{if(current!==before)throw new Error('HUD receipt changed; inspect it.');return after;});},
      change:async(tracker,fn)=>{if(this.stopped)throw new Error('Plugin stopped.');await this.change(fn,tracker);},
      approve:async(client,key,tracker)=>{
        const read=()=>{const raw=this.app.loadLocalStorage?.(TRUST);return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,string>:{};};
        const slot=client+'/'+tracker;if(read()[slot]===key)return true;
        if(!this.app.saveLocalStorage)throw new Error('Update Obsidian for device-local HUD pairing.');
        const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));const fingerprint=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,24);
        const approved=await new Promise<boolean>(resolve=>{this.pairing=new PairHudModal(this.app,tracker,fingerprint,resolve);this.pairing.open();});this.pairing=null;
        if(!approved||this.stopped)return false;this.app.saveLocalStorage(TRUST,{...read(),[slot]:key});return true;
      }
    },params.tracker,params.id);
    if(result.status!=='done')new Notice(`Color Sprint HUD: ${result.message}`,10000);
  });this.tail=work;return work;}
}
class PairHudModal extends Modal {
  private accepted=false;
  constructor(app:App,private tracker:string,private fingerprint:string,private resolve:(approved:boolean)=>void){super(app);}
  onOpen(){this.contentEl.createEl('h2',{text:'Pair this Color Sprint HUD?'});this.contentEl.createEl('p',{text:'Approve only if you just clicked a control in your Windows HUD. This pairs its signing key on this computer for this tracker. It may start/stop focus and change task checkboxes through Obsidian, but cannot apply planning proposals or restore phone checkpoints.'});this.contentEl.createEl('p',{text:this.tracker});this.contentEl.createEl('p',{text:`Compare with HUD Settings fingerprint: ${this.fingerprint}`});new Setting(this.contentEl).addButton(b=>b.setButtonText('Cancel').onClick(()=>this.close())).addButton(b=>b.setButtonText('Pair HUD').setCta().onClick(()=>{this.accepted=true;this.close();}));}
  onClose(){this.contentEl.empty();this.resolve(this.accepted);}
}
