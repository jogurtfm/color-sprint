import {RANK_ATLAS,UI_SOUNDS} from './arcade-assets';
import {RANKS,dailyScore} from './effort';
import type {Board} from './model';

export function rankSprite(node:HTMLElement,rank:string):void {
  const index=Math.max(0,RANKS.findIndex(r=>r.name===rank));node.classList.add('cs-rank-sprite');node.style.backgroundImage=`url("${RANK_ATLAS}")`;node.style.backgroundPosition=`${(index%4)/3*100}% ${Math.floor(index/4)*100}%`;if(rank==='SSS'){node.style.backgroundSize='350% 200%';node.style.backgroundPosition='70% 100%';}else node.style.backgroundSize='400% 200%';node.setAttribute('data-rank',rank);node.title=`Rank ${rank}`;
}
type Cue=keyof typeof UI_SOUNDS;
export interface ArcadePreferences {sound:boolean;motion:boolean;volume?:number}
/** Device-local feedback only: never writes points, tasks, files or network data. */
export class Arcade {
  private controller:AbortController;private context:AudioContext|null=null;private buffers=new Map<Cue,AudioBuffer>();private decoding=new Map<Cue,Promise<AudioBuffer>>();
  private previous:{day:string;index:number;points:number}|null=null;private layer:HTMLElement|null=null;private timeout:ReturnType<typeof setTimeout>|null=null;private lastHover=0;private stopped=false;
  constructor(private root:HTMLElement,private prefs:()=>ArcadePreferences,private playOverride?:(cue:Cue)=>void){
    const win=root.ownerDocument.defaultView!;this.controller=new win.AbortController();const signal=this.controller.signal;
    root.addEventListener('pointerdown',()=>this.prepare(),{capture:true,signal});root.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')this.prepare();},{capture:true,signal});
    root.addEventListener('pointerover',event=>{if(event.pointerType==='touch')return;const target=this.target(event.target);if(!target||(event.relatedTarget instanceof win.Node&&target.contains(event.relatedTarget))||Date.now()-this.lastHover<180)return;this.lastHover=Date.now();this.play('hover');},{signal});
    root.addEventListener('click',event=>{const target=this.target(event.target);if(!target)return;this.prepare();this.play(target.matches('[data-workspace-tab],[data-command="rim"],[data-command="visor"],.cs-tabs button,.cs-controls button')?'transition':'click');},{capture:true,signal});
    win.addEventListener('pagehide',()=>this.destroy(),{once:true,signal});
  }
  private target(value:EventTarget|null):HTMLElement|null {const win=this.root.ownerDocument.defaultView!;if(!(value instanceof win.Element))return null;const target=value.closest<HTMLElement>('button,summary,a[href],input[type=checkbox],[role=button]');return target&&this.root.contains(target)&&!target.matches(':disabled,[aria-disabled=true]')?target:null;}
  private prepare(){if(this.stopped||!this.prefs().sound||this.playOverride)return;try{const win=this.root.ownerDocument.defaultView as any,Audio=win.AudioContext||win.webkitAudioContext;if(!Audio)return;this.context=this.context||new Audio();void this.context!.resume().catch(()=>{});}catch{}}
  private async buffer(cue:Cue):Promise<AudioBuffer>{const old=this.buffers.get(cue);if(old)return old;let pending=this.decoding.get(cue);if(!pending){const encoded=UI_SOUNDS[cue].split(',')[1],raw=atob(encoded),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));pending=this.context!.decodeAudioData(bytes.buffer);this.decoding.set(cue,pending);}const result=await pending;this.buffers.set(cue,result);return result;}
  private play(cue:Cue){if(this.stopped||!this.prefs().sound)return;if(this.playOverride){this.playOverride(cue);return;}const ctx=this.context;if(!ctx)return;void (ctx.state==='suspended'?ctx.resume():Promise.resolve()).then(()=>this.buffer(cue)).then(buffer=>{if(this.stopped||!this.prefs().sound||ctx.state!=='running')return;const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=Math.max(0,Math.min(1,this.prefs().volume??.3))*(cue==='hover'?.24:.65);source.connect(gain).connect(ctx.destination);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();}).catch(()=>{});}
  update(board:Board,day:string){const score=dailyScore(board,day),index=RANKS.findIndex(r=>r.name===score.rank),before=this.previous;this.previous={day,index,points:score.points};if(!before||before.day!==day||index<=before.index||score.points<=before.points)return;this.celebrate(score.rank,score.points);}
  private celebrate(rank:string,points:number){this.clear();const doc=this.root.ownerDocument,moving=this.prefs().motion&&!doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;const layer=doc.createElement('div');layer.className='cs-rankup'+(moving?' cs-rankup-motion':'');layer.setAttribute('role','status');layer.setAttribute('aria-live','polite');const card=doc.createElement('div');card.className='cs-rankup-card';const title=doc.createElement('strong');title.textContent=`RANK UP · ${rank}`;const sprite=doc.createElement('span');sprite.setAttribute('aria-hidden','true');rankSprite(sprite,rank);const caption=doc.createElement('p');caption.textContent=`${points} points · real progress`;card.append(title,sprite,caption);layer.append(card);
    if(moving){for(let i=0;i<28;i++){const spark=doc.createElement('i');spark.className='cs-rank-spark';spark.style.setProperty('--angle',`${i/28*360}deg`);spark.style.setProperty('--reach',`${130+(i%4)*30}px`);spark.style.setProperty('--delay',`${i%4*30}ms`);layer.append(spark);}for(const badge of this.root.querySelectorAll('.cs-rank-sprite'))badge.classList.add('cs-rank-impact');}
    doc.body.append(layer);this.layer=layer;this.play('rank-up');this.timeout=setTimeout(()=>this.clear(),moving?1900:1400);
  }
  private clear(){if(this.timeout)clearTimeout(this.timeout);this.timeout=null;this.layer?.remove();this.layer=null;this.root.querySelectorAll('.cs-rank-impact').forEach(el=>el.classList.remove('cs-rank-impact'));}
  destroy(){if(this.stopped)return;this.stopped=true;this.controller.abort();this.clear();try{void this.context?.close().catch(()=>{});}catch{}this.buffers.clear();this.decoding.clear();}
}
