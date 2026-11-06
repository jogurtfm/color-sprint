/** An expanding game-menu surface, portalled out of the cockpit's perspective.
 * Its screen bounds can grow without stretching the dashboard or task controls. */
export class TaskDeck {
  private expanded=false;private catalogOpen=false;
  private panel:HTMLElement|null=null;private slot:HTMLElement|null=null;private toggle:HTMLButtonElement|null=null;
  constructor(private root:HTMLElement){const win=root.ownerDocument.defaultView;const resize=()=>this.layout();win?.addEventListener('resize',resize);win?.addEventListener('pagehide',()=>win.removeEventListener('resize',resize),{once:true});}
  mount():void {
    this.panel=null;this.slot=null;this.toggle=null;this.root.classList.remove('task-deck-open');
    if(this.root.ownerDocument.body.dataset.mode!=='hud')return;
    const panel=this.root.querySelector<HTMLElement>('.hud-shell:not(.workspace-mode) .queue-panel');if(!panel)return;
    this.panel=panel;
    const catalog=panel.querySelector<HTMLDetailsElement>('details.catalog');if(catalog){catalog.open=this.catalogOpen;catalog.addEventListener('toggle',()=>{if(catalog.open===this.catalogOpen)return;this.catalogOpen=catalog.open;this.setExpanded(catalog.open);});}
    const header=panel.querySelector<HTMLElement>('.panel-title');if(!header)return;
    const toggle=this.root.ownerDocument.createElement('button');toggle.className='task-deck-toggle';toggle.type='button';this.toggle=toggle;header.append(toggle);toggle.onclick=()=>{if(!this.expanded&&catalog){this.catalogOpen=true;catalog.open=true;}this.setExpanded(!this.expanded);};
    this.setExpanded(this.expanded);
  }
  private setExpanded(value:boolean):void {
    const arriving=value&&!this.expanded;this.expanded=value;const panel=this.panel;if(!panel)return;
    const active=panel.contains(this.root.ownerDocument.activeElement)?this.root.ownerDocument.activeElement as HTMLElement:null;
    if(value&&!this.slot){this.slot=this.root.ownerDocument.createElement('div');this.slot.className='task-deck-slot';this.slot.setAttribute('aria-hidden','true');panel.replaceWith(this.slot);this.root.append(panel);}
    else if(!value&&this.slot){this.slot.replaceWith(panel);this.slot=null;}
    panel.classList.toggle('task-deck',value);this.root.classList.toggle('task-deck-open',value);
    const animate=arriving&&!this.root.ownerDocument.body.classList.contains('motion-off')&&!this.root.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    panel.classList.toggle('task-deck-arriving',animate);if(animate)panel.addEventListener('animationend',()=>panel.classList.remove('task-deck-arriving'),{once:true});
    const title=Array.from(panel.querySelector('.panel-title')?.children||[]).find(el=>el.tagName==='SPAN'&&/^01 \//.test(el.textContent||''));if(title)title.textContent=value?'01 / TASK DECK':'01 / ACTION QUEUE';
    if(this.toggle){this.toggle.textContent=value?'↙ Dock':'↗ Expand';this.toggle.setAttribute('aria-label',value?'Dock task deck':'Expand task deck');this.toggle.setAttribute('aria-expanded',String(value));}
    this.layout();if(active?.isConnected)active.focus({preventScroll:true});this.root.ownerDocument.defaultView?.dispatchEvent(new Event('scroll'));
  }
  private layout():void {
    if(!this.panel||!this.expanded||!this.slot)return;
    const column=this.slot.parentElement?.getBoundingClientRect(),dashboard=this.root.querySelector('.dashboard')?.getBoundingClientRect();
    this.root.style.setProperty('--task-deck-left',`${Math.max(16,column?.left||24)}px`);
    this.root.style.setProperty('--task-deck-top',`${Math.max(112,dashboard?.top||152)}px`);
  }
}
