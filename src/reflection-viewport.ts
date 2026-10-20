// Scope keyboard handling to this dialog. Never resize the app or intercept dictation.
export function fitReflectionViewport(frame:HTMLElement):()=>void {
  const win=frame.ownerDocument.defaultView;if(!win)return ()=>{};
  const viewport=win.visualViewport,container=frame.closest<HTMLElement>('.modal-container');
  frame.classList.add('cs-reflection-modal');container?.classList.add('cs-reflection-viewport');
  const update=()=>{const height=viewport?.height??win.innerHeight,top=viewport?.offsetTop??0;if(!Number.isFinite(height)||height<=0)return;for(const node of [frame,container]){node?.style.setProperty('--cs-reflection-vh',`${height}px`);node?.style.setProperty('--cs-reflection-vtop',`${Math.max(0,Number.isFinite(top)?top:0)}px`);}};
  update();viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);win.addEventListener('resize',update);
  return ()=>{viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);win.removeEventListener('resize',update);frame.classList.remove('cs-reflection-modal');container?.classList.remove('cs-reflection-viewport');for(const node of [frame,container]){node?.style.removeProperty('--cs-reflection-vh');node?.style.removeProperty('--cs-reflection-vtop');}};
}
