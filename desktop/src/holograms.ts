/** Code-native geometry: decorative only, with no renderer permissions or frame loop. */
export function wireCube():string {
  return `<span class="holo-cube">${['front','back','left','right','top','bottom'].map(face=>`<i class="cube-face cube-${face}"></i>`).join('')}</span>`;
}
export function programHologram(emblem:string,index:number):string {
  // emblem is escaped/sanitized by the launcher renderer, never raw note content.
  return `<span class="program-hologram" aria-hidden="true" style="--phase:${-index*1.7}s;--spin-time:${19+index*3}s"><span class="holo-orbit"></span><span class="holo-tilt"><span class="holo-float">${wireCube()}<span class="holo-emblem">${emblem}</span></span></span><span class="holo-anchor"></span></span>`;
}
export function wireSphere():string {
  const meridians=Array.from({length:10},(_,i)=>`<i class="sphere-meridian" style="transform:rotateY(${i*18}deg)"></i>`).join('');
  const latitudes=[-.85,-.65,-.35,0,.35,.65,.85].map(y=>{const size=100*Math.sqrt(1-y*y);return `<i class="sphere-latitude" style="width:${size.toFixed(3)}%;height:${size.toFixed(3)}%;left:${((100-size)/2).toFixed(3)}%;top:${(50+50*y-size/2).toFixed(3)}%"></i>`;}).join('');
  return `<span class="wire-sphere" aria-hidden="true"><span class="sphere-axis"></span><span class="sphere-gimbal"><span class="sphere-spin">${meridians}${latitudes}<i class="sphere-equator"></i></span></span><span class="sphere-orbital orbital-a"></span><span class="sphere-orbital orbital-b"></span></span>`;
}
const mounted=new WeakSet<HTMLElement>();
export function decorateHolograms(root:HTMLElement):void {
  root.ownerDocument.body.classList.toggle('geometry-paused',root.ownerDocument.hidden);
  for(const stage of root.querySelectorAll<HTMLElement>('.ring-stage,.rim-orbit'))if(!stage.querySelector('.wire-sphere'))stage.insertAdjacentHTML('afterbegin',wireSphere());
  const win=root.ownerDocument.defaultView;
  const reduced=()=>root.ownerDocument.body.classList.contains('motion-off')||!!win?.matchMedia('(prefers-reduced-motion: reduce)').matches;
  for(const tile of root.querySelectorAll<HTMLElement>('.launcher-tile:has(.program-hologram)')){
    const reset=()=>{tile.style.removeProperty('--aim-x');tile.style.removeProperty('--aim-y');};
    if(reduced())reset();
    if(mounted.has(tile))continue;mounted.add(tile);
    tile.addEventListener('pointermove',event=>{
      if(reduced()||event.pointerType==='touch'){reset();return;}
      const rect=tile.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;
      const clamp=(n:number)=>Math.max(-1,Math.min(1,n));
      tile.style.setProperty('--aim-x',`${(-clamp((event.clientY-rect.top)/rect.height*2-1)*12).toFixed(2)}deg`);
      tile.style.setProperty('--aim-y',`${(clamp((event.clientX-rect.left)/rect.width*2-1)*16).toFixed(2)}deg`);
    });
    tile.addEventListener('pointerleave',reset);tile.addEventListener('pointercancel',reset);tile.addEventListener('blur',reset);
  }
}
