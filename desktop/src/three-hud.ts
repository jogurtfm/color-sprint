import * as THREE from 'three';
import {HudVisual,viewBounds,type VisualKind,type VisualState} from './three-scene';

export interface GPUState {quality:VisualState['quality'];motion:boolean;visible:boolean;accent:string;phase:string;progress:number}
export interface RenderPort {autoClear:boolean;setClearColor(color:number,alpha:number):void;setPixelRatio(ratio:number):void;setSize(w:number,h:number,style?:boolean):void;setScissorTest(on:boolean):void;setViewport(x:number,y:number,w:number,h:number):void;setScissor(x:number,y:number,w:number,h:number):void;clear():void;clearDepth():void;render(scene:THREE.Scene,camera:THREE.Camera):void;dispose():void}
type Surface={element:HTMLElement;visual:HudVisual;rect:DOMRect|null;clip:DOMRect|null};
type Factory=(canvas:HTMLCanvasElement)=>RenderPort;
const EXCLUSIONS='.panel,.topbar,.utility-bar,.core-readout,.focus-actions,.orbit-label,.holo-emblem,.rim-focus-copy,.rim-actions,.cs-study-workspace,.study-focus-clock';
const defaultFactory:Factory=canvas=>new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:true});

/** One WebGL context per native window; DOM controls remain the input/accessibility layer. */
export class ThreeHUD {
  private renderer:RenderPort|null=null;private canvas:HTMLCanvasElement|null=null;private surfaces:Surface[]=[];
  private state:GPUState={quality:'cinematic',motion:true,visible:true,accent:'#66e7ff',phase:'standby',progress:0};
  private width=0;private height=0;private ratio=0;private elapsed=0;private previous=0;private frame=0;private dirty=true;private layoutDirty=true;
  private hovered:HTMLElement|null=null;private lost=false;private failed=false;private disposed=false;private aim={x:0,y:0};
  private controller:AbortController;private observer:ResizeObserver|null=null;private media:MediaQueryList|null=null;
  private observed=new Set<Element>();
  constructor(private root:HTMLElement,private factory:Factory=defaultFactory){
    const win=root.ownerDocument.defaultView!,doc=root.ownerDocument;
    this.controller=new win.AbortController();
    // Feature detection also avoids trying a canvas in environments with no WebGL implementation.
    if(factory===defaultFactory&&!('WebGL2RenderingContext' in win)){this.status('fallback');this.failed=true;return;}
    const signal=this.controller.signal;
    const invalidate=()=>{this.layoutDirty=true;this.dirty=true;this.wake();};
    doc.addEventListener('visibilitychange',invalidate,{signal});win.addEventListener('resize',invalidate,{signal});
    // Document/window scrolling is not captured by #app. Include nested scrollers
    // too, and repaint even when animation/reduced-motion has stopped the loop.
    doc.addEventListener('scroll',invalidate,{capture:true,signal});win.addEventListener('scroll',invalidate,{signal});
    win.visualViewport?.addEventListener('resize',invalidate,{signal});win.visualViewport?.addEventListener('scroll',invalidate,{signal});
    root.addEventListener('transitionend',()=>{this.layoutDirty=true;this.dirty=true;this.wake();},{signal});
    root.addEventListener('pointerover',event=>{this.hovered=event.target instanceof win.HTMLElement?event.target:null;this.dirty=true;this.wake();},{signal});
    root.addEventListener('pointermove',event=>{if(event.pointerType==='touch'||!this.moving())return;this.aim={x:Math.max(-1,Math.min(1,event.clientX/win.innerWidth*2-1)),y:Math.max(-1,Math.min(1,event.clientY/win.innerHeight*2-1))};this.dirty=true;this.wake();},{signal});
    root.addEventListener('pointerleave',()=>{this.hovered=null;this.aim={x:0,y:0};this.dirty=true;this.wake();},{signal});
    this.media=win.matchMedia('(prefers-reduced-motion: reduce)');this.media.addEventListener?.('change',()=>{this.dirty=true;this.wake();},{signal});
    win.addEventListener('pagehide',()=>this.dispose(),{once:true,signal});
    if(win.ResizeObserver)this.observer=new win.ResizeObserver(()=>{this.layoutDirty=true;this.dirty=true;this.wake();});
  }
  private status(value:string){this.root.ownerDocument.body.dataset.gpu=value;const el=this.root.querySelector('.gpu-status');if(el){el.textContent=value==='ready'?'THREE.JS / WEBGL2':value==='lost'?'GPU RECOVERING · CSS FALLBACK':value==='quiet'?'QUIET / GPU IDLE':'CSS FALLBACK / WEBGL UNAVAILABLE';}}
  sync(state:GPUState){
    if(this.disposed)return;const changed=JSON.stringify(state)!==JSON.stringify(this.state);this.state={...state,progress:Math.max(0,Math.min(1,state.progress||0))};
    if(changed)this.layoutDirty=true;
    this.addStatus();if(this.failed){this.status('fallback');return;}
    if(state.quality==='quiet'){if(this.canvas)this.canvas.hidden=true;this.status('quiet');this.cancel();return;}
    if(!this.renderer&&!this.lost&&!this.initialize())return;
    if(this.canvas)this.canvas.hidden=this.lost;this.reconcile();if(changed)this.dirty=true;this.status(this.lost?'lost':'ready');this.wake();
  }
  private addStatus(){const settings=this.root.querySelector('#settings-dialog');if(!settings||settings.querySelector('.gpu-status'))return;const el=this.root.ownerDocument.createElement('p');el.className='gpu-status';el.setAttribute('role','status');settings.querySelector('.cinema-quality-row')?.after(el);}
  private initialize(){
    const doc=this.root.ownerDocument,canvas=doc.createElement('canvas');canvas.className='three-hud';canvas.setAttribute('aria-hidden','true');canvas.setAttribute('role','presentation');
    try{this.renderer=this.factory(canvas);this.renderer.autoClear=false;this.renderer.setClearColor(0,0);this.canvas=canvas;doc.body.append(canvas);
      canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.lost=true;canvas.hidden=true;this.status('lost');this.cancel();});
      canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;canvas.hidden=this.state.quality==='quiet';this.width=0;this.dirty=true;this.status(this.state.quality==='quiet'?'quiet':'ready');this.wake();});
      this.status('ready');return true;
    }catch{this.renderer?.dispose();this.renderer=null;canvas.remove();this.failed=true;this.status('fallback');return false;}
  }
  private reconcile(){
    const wanted=new Map<HTMLElement,VisualKind>();const add=(selector:string,kind:VisualKind)=>this.root.querySelectorAll<HTMLElement>(selector).forEach(el=>wanted.set(el,kind));
    // Never generate replacement panels or draw an environment across the task banks.
    if(this.root.ownerDocument.body.dataset.mode==='hud')for(const stage of this.root.querySelectorAll('.ring-stage'))if(!stage.querySelector('.gpu-globe-port')){const port=this.root.ownerDocument.createElement('div');port.className='gpu-globe-port';port.setAttribute('aria-hidden','true');stage.append(port);}
    add('.ring-stage,.rim-orbit','reactor');add('.program-hologram','program');
    if(this.state.quality==='cinematic')add('.gpu-globe-port','sphere');
    if(!this.root.querySelector('.launcher-dock'))add('#neural-field','terrain');
    for(const surface of this.surfaces)if(!wanted.has(surface.element)){surface.visual.dispose();this.layoutDirty=true;this.dirty=true;}
    const old=new Map(this.surfaces.filter(s=>wanted.has(s.element)).map(s=>[s.element,s]));
    this.surfaces=[...wanted].map(([element,kind],i)=>{const existing=old.get(element);if(existing)return existing;this.layoutDirty=true;const appId=element.closest<HTMLElement>('[data-launcher-id]')?.dataset.launcherId;const seed=appId?Math.max(0,['chatgpt','blender','notepad','fl-studio','reaper'].indexOf(appId)):i;return {element,visual:new HudVisual(kind,seed),rect:null,clip:null};});
    // Size changes in controls/ancestors can move a surface without resizing it.
    const observed=new Set<Element>([this.root,this.root.ownerDocument.documentElement,...wanted.keys(),...this.root.querySelectorAll(EXCLUSIONS)]);
    for(const el of this.observed)if(!observed.has(el))this.observer?.unobserve(el);
    for(const el of observed)if(!this.observed.has(el))this.observer?.observe(el);
    this.observed=observed;
  }
  private measure(){
    for(const surface of this.surfaces){surface.rect=surface.element.getBoundingClientRect();surface.clip=surface.element.closest('.launcher-apps')?.getBoundingClientRect()||null;}
    if(!this.canvas)return;
    // A compositor-level exclusion mask guarantees instruments cannot cover any working text.
    let holes='';
    for(const el of this.root.querySelectorAll(EXCLUSIONS)){const r=el.getBoundingClientRect();if(r.width>0&&r.height>0)holes+=`<rect x="${r.left-2}" y="${r.top-2}" width="${r.width+4}" height="${r.height+4}" fill="black"/>`;}
    // Luminance-mask union: overlapping exclusions remain holes rather than XOR-revealing text.
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}"><defs><mask id="ui" maskUnits="userSpaceOnUse" x="0" y="0" width="${this.width}" height="${this.height}"><rect width="100%" height="100%" fill="white"/>${holes}</mask></defs><rect width="100%" height="100%" fill="white" mask="url(#ui)"/></svg>`;
    this.canvas.style.maskImage=`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  private moving(){return this.state.motion&&!this.media?.matches;}
  private active(){const body=this.root.ownerDocument.body;return !this.disposed&&!this.failed&&!this.lost&&this.state.visible&&!this.root.ownerDocument.hidden&&this.state.quality!=='quiet'&&!body.classList.contains('edge-hidden')&&!body.classList.contains('effects-paused');}
  private cancel(){if(this.frame)this.root.ownerDocument.defaultView!.cancelAnimationFrame(this.frame);this.frame=0;this.previous=0;}
  private wake(){if(!this.active()){this.cancel();return;}if(this.frame)return;this.frame=this.root.ownerDocument.defaultView!.requestAnimationFrame(time=>this.tick(time));}
  private tick(time:number){
    this.frame=0;if(!this.active()||!this.renderer||!this.canvas)return;
    const moving=this.moving(),interval=1000/(this.state.quality==='cinematic'?24:16);
    if(this.previous&&time-this.previous<interval){this.wake();return;}
    const delta=this.previous?Math.min(.08,(time-this.previous)/1000):1/24;this.previous=time;
    if(moving)this.elapsed+=delta;
    const win=this.root.ownerDocument.defaultView!,width=win.innerWidth,height=win.innerHeight,ratio=Math.min(win.devicePixelRatio||1,1.25);
    if(width!==this.width||height!==this.height||ratio!==this.ratio){this.width=width;this.height=height;this.ratio=ratio;this.renderer.setPixelRatio(ratio);this.renderer.setSize(width,height,false);this.dirty=true;this.layoutDirty=true;}
    try{if(moving||this.dirty||this.layoutDirty){
      if(this.layoutDirty)this.measure();
      const r=this.renderer;r.setScissorTest(false);r.clear();r.setScissorTest(true);
      for(const surface of this.surfaces){
        const rect=surface.rect;if(!rect)continue;const bounds=viewBounds(rect,width,height);if(!bounds||!surface.element.isConnected)continue;
        // The canvas is outside DOM overflow clips: reapply scrolling-list scissors explicitly.
        if(surface.clip){const c=surface.clip,x=Math.max(bounds.scissor[0],c.left),right=Math.min(bounds.scissor[0]+bounds.scissor[2],c.right),y=Math.max(bounds.scissor[1],height-c.bottom),top=Math.min(bounds.scissor[1]+bounds.scissor[3],height-c.top);if(right<=x||top<=y)continue;bounds.scissor=[x,y,right-x,top-y];}
        const hover=!!this.hovered&&!!surface.element.closest('.launcher-tile,.panel,.rim-surface,.widget-shell')?.contains(this.hovered);
        const accent=surface.element.closest<HTMLElement>('.launcher-tile')?.style.getPropertyValue('--app-color')||surface.element.closest<HTMLElement>('.task-row')?.style.getPropertyValue('--task-color')||this.state.accent;
        surface.visual.resize(rect.width/rect.height);surface.visual.update(this.elapsed,delta,{...this.state,accent,hover,motion:moving,aimX:this.aim.x,aimY:this.aim.y});
        r.setViewport(...bounds.viewport);r.setScissor(...bounds.scissor);r.clearDepth();r.render(surface.visual.scene,surface.visual.camera);
      }
      r.setScissorTest(false);this.dirty=false;this.layoutDirty=false;
    }}catch{this.failed=true;this.canvas.hidden=true;this.renderer.dispose();this.renderer=null;for(const s of this.surfaces)s.visual.dispose();this.surfaces=[];this.status('fallback');this.cancel();return;}
    if(moving)this.wake();else this.previous=0;
  }
  complete(){if(!this.moving()||this.state.quality==='quiet')return;for(const s of this.surfaces)s.visual.complete();this.dirty=true;this.wake();}
  dispose(){if(this.disposed)return;this.disposed=true;this.cancel();this.controller.abort();this.observer?.disconnect();for(const s of this.surfaces)s.visual.dispose();this.surfaces=[];this.renderer?.dispose();this.renderer=null;this.canvas?.remove();this.status('fallback');}
}
