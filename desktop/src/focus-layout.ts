/** A perspective ancestor makes position:fixed relative to that ancestor, not the
 * screen. Portal the Today focus column outside the cinematic dashboard only. */
export function anchorFocus(root:HTMLElement):void {
  if(root.ownerDocument.body.dataset.mode!=='hud')return;
  const shell=root.querySelector('.hud-shell:not(.workspace-mode)'),center=shell?.querySelector<HTMLElement>('.center-column');
  if(!center)return;
  const placeholder=root.ownerDocument.createElement('div');placeholder.className='focus-placeholder';placeholder.setAttribute('aria-hidden','true');center.replaceWith(placeholder);
  center.classList.add('viewport-focus');root.append(center);
  const rank=root.ownerDocument.createElement('div');rank.className='focus-rank';center.prepend(rank);
  const core=center.querySelector('.core');if(!core)return;
  const controls=root.ownerDocument.createElement('div');controls.className='focus-controls';
  for(const el of [...core.children])if(el.matches('.focus-actions,.focus-help'))controls.append(el);
  core.append(controls);
}
