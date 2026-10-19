import type {Board} from '../../src/model';
import {focusQueue} from '../../src/model';
interface RadialState {board:Board|null;readOnly:boolean;forcedReadOnly:boolean;error:string|null;setup:boolean;motion:boolean;quality:string;mode:string}
interface Ports {command(command:string):Promise<unknown>;focus(action:string):Promise<unknown>;error(message:string):void}
interface Control {id:string;label:string;icon:string;kind:'command'|'focus';value:string;disabled?:boolean;primary?:boolean;danger?:boolean}
const svgPoint=(r:number,a:number)=>`${300+Math.cos(a)*r} ${300+Math.sin(a)*r}`;
const segment=(i:number)=>{const a=(i*45-90-17)*Math.PI/180,b=a+34*Math.PI/180;return `M${svgPoint(284,a)}A284 284 0 0 1 ${svgPoint(284,b)}L${svgPoint(250,b)}A250 250 0 0 0 ${svgPoint(250,a)}Z`;};

/** Native HTML buttons in an annular layout; no gesture or drag is required to activate them. */
export class RadialControls {
  private controls:Control[]=[];private state:RadialState|null=null;
  constructor(private root:HTMLElement,private ports:Ports){
    root.addEventListener('click',event=>{const button=(event.target as Element).closest<HTMLButtonElement>('[data-radial-id]');if(!button||button.disabled)return;const control=this.controls.find(c=>c.id===button.dataset.radialId);if(!control)return;void (control.kind==='focus'?ports.focus(control.value):ports.command(control.value)).catch(error=>ports.error(error instanceof Error?error.message:String(error)));});
    root.addEventListener('keydown',event=>{const button=(event.target as Element).closest<HTMLButtonElement>('[data-radial-id]');if(!button||!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;const buttons=[...button.parentElement!.querySelectorAll<HTMLButtonElement>('[data-radial-id]:not(:disabled)')];const i=buttons.indexOf(button);const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(i+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;event.preventDefault();buttons[next]?.focus();});
    root.addEventListener('pointerover',event=>{const el=(event.target as Element).closest<HTMLButtonElement>('[data-radial-id]');this.highlight(el?.dataset.radialId||'');});
    root.addEventListener('pointerout',event=>{if((event.target as Element).closest('[data-radial-id]'))this.highlight('');});
    root.addEventListener('focusin',event=>this.highlight((event.target as HTMLElement).dataset.radialId||''));
    root.addEventListener('focusout',()=>this.highlight(''));
  }
  private highlight(id:string){for(const node of this.root.querySelectorAll<SVGElement>('[data-radial-sector]'))node.classList.toggle('sector-hot',node.dataset.radialSector===id);}
  paint(state:RadialState){
    this.state=state;if(state.mode!=='hud'&&state.mode!=='focus')return;
    const timer=state.board?.timer,q=timer&&state.board?focusQueue(state.board,timer):[];
    const locked=state.forcedReadOnly||!!state.error,mutating=locked||state.readOnly;
    this.controls=[
      {id:'previous',label:'Previous day',icon:'‹',kind:'command',value:'previous'},
      {id:'next',label:'Next day',icon:'›',kind:'command',value:'next'},
      {id:'rim',label:'Desktop rim',icon:'◉',kind:'command',value:'rim'},
      {id:'finish',label:'Finish',icon:'✓',kind:'focus',value:'finish',disabled:!timer||mutating||!q.length},
      state.setup&&!locked?{id:'primary',label:'Set up focus',icon:'⚙',kind:'command',value:'install-plugin',primary:true}:{id:'primary',label:timer?(timer.started==='-'?'Resume':'Pause'):(state.readOnly?'Enable focus':'Start'),icon:timer?(timer.started==='-'?'▷':'Ⅱ'):'▷',kind:'focus',value:timer?(timer.started==='-'?'resume':'pause'):'start',disabled:locked||!!timer&&state.readOnly||!state.board?.tasks.length,primary:true},
      {id:'cancel',label:'Cancel',icon:'×',kind:'focus',value:'cancel',disabled:!timer||mutating,danger:true},
      {id:'refresh',label:'Refresh',icon:'↻',kind:'command',value:'refresh'},
      {id:'reset',label:'Reset timer',icon:'⟲',kind:'focus',value:'reset',disabled:!timer||mutating}
    ];
    for(const stage of this.root.querySelectorAll<HTMLElement>('.ring-stage')){
      let radial=stage.querySelector<HTMLElement>(':scope > .radial-controls');
      if(!radial){radial=stage.ownerDocument.createElement('nav');radial.className='radial-controls';radial.setAttribute('aria-label','Radial focus and navigation controls');radial.innerHTML=`<svg class="radial-sectors" viewBox="0 0 600 600" aria-hidden="true">${this.controls.map((c,i)=>`<path d="${segment(i)}" data-radial-sector="${c.id}"/>`).join('')}<circle class="radial-flow" cx="300" cy="300" r="296"/></svg>`;
        for(const [i,c] of this.controls.entries()){const b=stage.ownerDocument.createElement('button');b.dataset.radialId=c.id;b.style.left=`${50+Math.cos((i*45-90)*Math.PI/180)*44}%`;b.style.top=`${50+Math.sin((i*45-90)*Math.PI/180)*44}%`;b.innerHTML='<span></span><small></small>';radial.append(b);}stage.append(radial);stage.classList.add('has-radial');
      }
      for(const c of this.controls){const b=radial.querySelector<HTMLButtonElement>(`[data-radial-id="${c.id}"]`)!;b.disabled=!!c.disabled;b.className=`radial-button${c.primary?' radial-primary':''}${c.danger?' radial-danger':''}`;b.setAttribute('aria-label',c.label);b.title=c.label;b.querySelector('span')!.textContent=c.icon;b.querySelector('small')!.textContent=c.label;}
    }
  }
}
