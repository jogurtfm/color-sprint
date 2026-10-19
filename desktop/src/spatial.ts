import {wireCube,wireSphere} from './holograms';

/** Volumetric scene dressing. All generated geometry is constant and noninteractive. */
const hull=()=>`<span class="spatial-hull" aria-hidden="true"><i class="slab-back"></i><i class="slab-top"></i><i class="slab-bottom"></i><i class="slab-left"></i><i class="slab-right"></i><i class="slab-scanner"></i><i class="slab-rail rail-one"></i><i class="slab-rail rail-two"></i></span>`;
const gem=(type:'cube'|'sphere'|'diamond')=>`<span class="spatial-glyph glyph-${type}" aria-hidden="true"><span class="glyph-pedestal"></span><span class="glyph-spin">${type==='sphere'?wireSphere():wireCube()}</span></span>`;
const world=()=>`<div class="spatial-world" aria-hidden="true"><div class="world-camera"><div class="world-floor"><i></i></div><div class="world-ceiling"></div>${['port','starboard','zenith'].map((name,i)=>`<div class="world-globe globe-${name}">${wireSphere()}<span class="globe-collar collar-a"></span><span class="globe-collar collar-b"></span></div>`).join('')}<div class="world-orbits">${Array.from({length:5},(_,i)=>`<span class="world-orbit orbit-${i}" style="--orbit-phase:${i*-4}s;--orbit-plane:${30+i*22}deg"><i></i><b>${wireCube()}</b></span>`).join('')}</div><div class="world-towers">${Array.from({length:8},(_,i)=>`<i style="--tower-x:${8+i*12}%;--tower-height:${32+(i*17)%65}px;--tower-phase:${i*-.8}s"></i>`).join('')}</div></div></div>`;
const reactor=()=>`<div class="spatial-reactor" aria-hidden="true">${Array.from({length:4},(_,i)=>`<span class="reactor-gimbal gimbal-${i}" style="--gimbal-phase:${i*-2.4}s"><span class="reactor-rotor"><i class="reactor-hoop"></i><i class="reactor-hoop hoop-inner"></i>${Array.from({length:8},(_,k)=>`<b class="reactor-stud" style="--stud-angle:${k*45}deg"></b>`).join('')}</span></span>`).join('')}<span class="reactor-platform platform-rear"></span><span class="reactor-platform platform-front"></span>${['north','south'].map(name=>`<span class="reactor-crystal crystal-${name}">${wireCube()}</span>`).join('')}</div>`;

const bound=(n:number,max:number)=>Number.isFinite(n)?Math.max(-max,Math.min(max,n)):0;
export class SpatialUI {
  private attached=new WeakSet<HTMLElement>();
  constructor(private root:HTMLElement) {
    const doc=root.ownerDocument,win=doc.defaultView;
    const reset=()=>{root.style.removeProperty('--camera-x');root.style.removeProperty('--camera-y');};
    root.addEventListener('pointermove',event=>{
      if(doc.body.dataset.cinema!=='cinematic'||doc.body.classList.contains('motion-off')||win?.matchMedia('(prefers-reduced-motion: reduce)').matches||event.pointerType==='touch'){reset();return;}
      const rect=root.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;
      // Camera affects geometry, not the working text/input planes.
      root.style.setProperty('--camera-x',`${bound((event.clientY-rect.top)/rect.height*2-1,1)*-5}deg`);
      root.style.setProperty('--camera-y',`${bound((event.clientX-rect.left)/rect.width*2-1,1)*7}deg`);
    });
    root.addEventListener('pointerleave',reset);root.addEventListener('pointercancel',reset);
  }
  paint(){
    const doc=this.root.ownerDocument,body=doc.body;
    const subdued=body.dataset.cinema!=='cinematic'||body.classList.contains('motion-off')||doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(subdued){this.root.style.removeProperty('--camera-x');this.root.style.removeProperty('--camera-y');}
    const hud=this.root.querySelector<HTMLElement>('.hud-shell');
    if(hud&&!hud.querySelector('.spatial-world'))hud.insertAdjacentHTML('afterbegin',world());
    const stages=this.root.querySelectorAll<HTMLElement>('.ring-stage,.rim-orbit');
    for(const stage of stages)if(!stage.querySelector('.spatial-reactor'))stage.insertAdjacentHTML('afterbegin',reactor());
    const surfaces=this.root.querySelectorAll<HTMLElement>('.panel,.topbar,.utility-bar,.neural-panel,.widget-shell,.rim-surface');
    surfaces.forEach((panel,i)=>{
      panel.classList.add('spatial-panel');panel.style.setProperty('--slab-phase',`${i*-.9}s`);
      if(!panel.querySelector(':scope > .spatial-hull'))panel.insertAdjacentHTML('afterbegin',hull());
      const title=panel.querySelector<HTMLElement>(':scope > .panel-title');
      if(title&&!title.querySelector('.spatial-glyph'))title.insertAdjacentHTML('afterbegin',gem(panel.classList.contains('wins-panel')?'sphere':panel.classList.contains('reflection-panel')?'diamond':'cube'));
      if(this.attached.has(panel))return;this.attached.add(panel);
      panel.addEventListener('pointerenter',()=>panel.classList.add('slab-inspecting'));
      panel.addEventListener('pointerleave',()=>panel.classList.remove('slab-inspecting'));
    });
    for(const icon of this.root.querySelectorAll<HTMLElement>('.task-index'))if(!icon.querySelector('.spatial-glyph')){const label=doc.createElement('span');label.className='spatial-index-value';label.textContent=icon.textContent;icon.replaceChildren(label);icon.insertAdjacentHTML('afterbegin',gem('cube'));}
    for(const row of this.root.querySelectorAll<HTMLElement>('.color-signal'))if(!row.querySelector('.spatial-glyph'))row.insertAdjacentHTML('afterbegin',gem('diamond'));
    const brand=this.root.querySelector('.brand p');if(brand)brand.textContent='VOLUMETRIC COMMAND SYSTEM / MARKDOWN LINK';
  }
}
