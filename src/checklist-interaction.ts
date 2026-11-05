/** Keep keyboard position and scroll stable when a synced edit repaints the surface. */
export function captureChecklistInteraction(root:HTMLElement):()=>void {
  const d=root.ownerDocument,active=d.activeElement as HTMLElement|null,box=active?.closest<HTMLElement>('[data-checklist-task]');
  const task=box?.dataset.checklistTask,step=active?.closest<HTMLElement>('[data-step-id]')?.dataset.stepId;
  const name=active?.getAttribute('name'),label=active?.getAttribute('aria-label'),text=active?.textContent;
  const selection=active instanceof (d.defaultView?.HTMLInputElement||Object)||active instanceof (d.defaultView?.HTMLTextAreaElement||Object)?active as HTMLInputElement:null;
  const start=selection?.selectionStart,end=selection?.selectionEnd;
  const positions=['.task-scroll','.workspace-view'].map(selector=>({selector,top:root.querySelector<HTMLElement>(selector)?.scrollTop||0}));
  const catalog=root.querySelector<HTMLDetailsElement>('details.catalog')?.open;
  return ()=>{
    if(catalog){const el=root.querySelector<HTMLDetailsElement>('details.catalog');if(el)el.open=true;}
    for(const p of positions){const el=root.querySelector<HTMLElement>(p.selector);if(el)el.scrollTop=p.top;}
    if(!task)return;
    const target=Array.from(root.querySelectorAll<HTMLElement>('[data-checklist-task]')).find(el=>el.dataset.checklistTask===task);
    const scope=step?Array.from(target?.querySelectorAll<HTMLElement>('[data-step-id]')||[]).find(el=>el.dataset.stepId===step):target;
    const control=Array.from(scope?.querySelectorAll<HTMLElement>('input,textarea,button,summary')||[]).find(el=>name?el.getAttribute('name')===name:label?el.getAttribute('aria-label')===label:el.textContent===text);
    if(control){control.focus({preventScroll:true});if(start!=null&&end!=null&&'setSelectionRange' in control)try{(control as HTMLInputElement).setSelectionRange(start,end);}catch{}}
  };
}
