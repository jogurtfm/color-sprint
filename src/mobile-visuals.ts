/** Bounded, decorative CSS 3D/SVG instruments. No canvas loop, task writes or sensors. */
export interface MobileVisualPreferences {hudStyle?:boolean;ambient?:boolean;motion:boolean;paused?:boolean}
const NS='http://www.w3.org/2000/svg';
export function setTimerReadout(node:HTMLElement,text:string):void {
  const readout=node.querySelector<HTMLElement>('.cs-time-readout');
  if(readout)readout.textContent=text;else node.textContent=text;
}
export class MobileVisuals {
  private win:Window;private media:MediaQueryList|undefined;private observer:IntersectionObserver|undefined;
  private resizer:ResizeObserver|undefined;
  private moduleWatcher:MutationObserver|undefined;private moduleState='';
  private regions=new Map<Element,Element[]>();private prefs:MobileVisualPreferences={motion:false};private stopped=false;
  private onVisibility=()=>{this.root.dataset.csVisible=this.root.ownerDocument.hidden?'no':'yes';};
  private onMedia=()=>this.draw();
  constructor(private root:HTMLElement){
    this.win=root.ownerDocument.defaultView!;this.media=this.win.matchMedia?.('(max-width:600px)');
    this.media?.addEventListener?.('change',this.onMedia);
    root.ownerDocument.addEventListener('visibilitychange',this.onVisibility);this.onVisibility();
    const Observer=(this.win as any).IntersectionObserver;
    if(Observer)this.observer=new Observer((entries:IntersectionObserverEntry[])=>{
      for(const entry of entries)for(const deco of this.regions.get(entry.target)||[])
        deco.setAttribute('data-cs-in-view',entry.isIntersecting?'yes':'no');
    },{threshold:0});
    const Resize=(this.win as any).ResizeObserver;
    if(Resize)this.resizer=new Resize((entries:ResizeObserverEntry[])=>{
      for(const entry of entries)if(this.regions.has(entry.target))this.sizeRoute(entry.target as HTMLElement);
    });
    const Watcher=(this.win as any).MutationObserver;
    if(Watcher)this.moduleWatcher=new Watcher(()=>{if(this.workspaceState()!==this.moduleState)this.draw();});
  }
  private workspaceState():string {const node=this.root.querySelector('.cs-study-workspace');return !node?'':node.querySelector('.cs-task-module')?'module':node.childNodes.length?'pending':'empty';}
  update(prefs:MobileVisualPreferences):void {this.prefs={...prefs};this.draw();}
  private el(tag:string,cls:string,parent:Element):HTMLElement {
    const el=this.root.ownerDocument.createElement(tag);el.className=cls;parent.append(el);return el;
  }
  private register(host:HTMLElement,deco:Element):void {
    deco.classList.add('cs-mobile-decor');deco.setAttribute('aria-hidden','true');deco.setAttribute('data-cs-in-view','no');
    if(!this.observer)deco.setAttribute('data-cs-in-view','yes');
    this.regions.set(host,[...(this.regions.get(host)||[]),deco]);this.observer?.observe(host);
  }
  private route(host:HTMLElement):void {
    const svg=this.root.ownerDocument.createElementNS(NS,'svg');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('focusable','false');svg.classList.add('cs-mobile-routing');
    for(const cls of ['cs-route-track','cs-route-packets']){const path=this.root.ownerDocument.createElementNS(NS,'path');path.setAttribute('vector-effect','non-scaling-stroke');path.classList.add(cls);svg.append(path);}
    host.append(svg);this.register(host,svg);this.sizeRoute(host);this.resizer?.observe(host);
  }
  private sizeRoute(host:HTMLElement):void {
    const svg=Array.from(host.children).find(el=>el.classList.contains('cs-mobile-routing'));if(!svg)return;
    const w=Math.max(40,host.clientWidth>4?host.clientWidth-4:320),h=Math.max(24,host.clientHeight>4?host.clientHeight-4:120),a=w*.29,b=w*.71;
    // Notches stay 7px from the edge, even on a very tall focus card or open details.
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    const d=`M12 3 H${a} L${a+8} 7 H${b-8} L${b} 3 H${w-12} Q${w-3} 3 ${w-3} 12 V${h*.35} M${w-3} ${h*.65} V${h-12} Q${w-3} ${h-3} ${w-12} ${h-3} H${b} L${b-8} ${h-7} H${a+8} L${a} ${h-3} H12 Q3 ${h-3} 3 ${h-12} V${h*.65} M3 ${h*.35} V12 Q3 3 12 3`;
    for(const path of svg.children)path.setAttribute('d',d);
  }
  private cube(host:HTMLElement):void {
    const port=this.el('span','cs-mobile-cube-port',host),cube=this.el('span','cs-mobile-cube',port);
    for(const side of ['front','back','left','right','top','bottom'])this.el('i',`cs-cube-face cs-cube-${side}`,cube);
    this.register(host,port);
  }
  private core(host:HTMLElement):void {
    host.classList.add('cs-mobile-instrument');
    if(!host.querySelector('.cs-time-readout')){const text=host.textContent||'';host.replaceChildren();this.el('span','cs-time-readout',host).textContent=text;}
    const core=this.el('span','cs-mobile-core',host),rotor=this.el('span','cs-mobile-gimbal',core);
    for(const plane of ['one','two','three'])this.el('i',`cs-core-ring cs-core-${plane}`,rotor);
    this.register(host,core);
  }
  private clear():void {this.observer?.disconnect();this.resizer?.disconnect();this.moduleWatcher?.disconnect();for(const decos of this.regions.values())for(const deco of decos){if(deco.classList.contains('cs-mobile-core'))deco.parentElement?.classList.remove('cs-mobile-instrument');deco.remove();}this.regions.clear();}
  private draw():void {
    if(this.stopped)return;this.clear();this.onVisibility();
    this.root.dataset.csAmbient=this.prefs.ambient===false?'off':'on';
    this.root.dataset.csMotion=this.prefs.motion?'on':'off';
    this.root.dataset.csFocusPaused=this.prefs.paused?'yes':'no';
    if(!this.media?.matches||this.prefs.hudStyle===false||this.prefs.ambient===false)return;
    this.moduleState=this.workspaceState();const workspace=this.root.querySelector('.cs-study-workspace');if(workspace)this.moduleWatcher?.observe(workspace,{childList:true,subtree:true});
    const summary=this.root.querySelector<HTMLElement>('.cs-summary');if(summary){this.route(summary);this.cube(summary);}
    for(const card of Array.from(this.root.querySelectorAll<HTMLElement>('.cs-card')).slice(0,3))this.route(card);
    const focus=this.root.querySelector<HTMLElement>('.cs-focus-card');if(focus)this.route(focus);
    const timer=focus&&(!this.moduleState||this.moduleState==='empty')?Array.from(focus.children).find(el=>el.classList.contains('cs-time')):null;if(timer)this.core(timer as HTMLElement);
  }
  destroy():void {
    if(this.stopped)return;this.stopped=true;this.clear();this.observer?.disconnect();
    this.media?.removeEventListener?.('change',this.onMedia);this.root.ownerDocument.removeEventListener('visibilitychange',this.onVisibility);
  }
}
