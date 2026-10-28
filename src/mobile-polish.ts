// Device-local presentation only: no tracker writes, timers or score changes.
export function prepareSurfacePaint(root:HTMLElement, view:string, previous:string, motion:boolean):()=>void {
  const rails=['.cs-tabs','.cs-pages','.cs-categories'];
  const positions=rails.map(selector=>root.querySelector<HTMLElement>(selector)?.scrollLeft||0);
  const open=new Set(Array.from(root.querySelectorAll<HTMLDetailsElement>('details[data-cs-disclosure][open]')).map(el=>el.dataset.csDisclosure));
  const checks=new Map(Array.from(root.querySelectorAll<HTMLElement>('.cs-card[data-cs-task]')).map(el=>[el.dataset.csTask,el.classList.contains('is-done')]));
  const changed=view!==previous;
  root.dataset.csMotion=motion?'on':'off';
  root.classList.toggle('cs-view-arrival',changed);
  return ()=>{
    if(changed)root.scrollTop=0;
    if(!changed)root.querySelectorAll<HTMLDetailsElement>('details[data-cs-disclosure]').forEach(el=>{el.open=open.has(el.dataset.csDisclosure);});
    rails.forEach((selector,index)=>{
      const rail=root.querySelector<HTMLElement>(selector);if(!rail)return;
      rail.scrollLeft=positions[index];
      // Keep the selected chip visible without scrolling the page vertically.
      const active=rail.querySelector<HTMLElement>('.is-active');if(!active||!changed)return;
      const r=rail.getBoundingClientRect(),a=active.getBoundingClientRect();
      if(a.left<r.left)rail.scrollLeft-=r.left-a.left+4;
      else if(a.right>r.right)rail.scrollLeft+=a.right-r.right+4;
    });
    root.querySelectorAll<HTMLElement>('.cs-card').forEach((card,index)=>{
      if(!changed&&checks.get(card.dataset.csTask)===false&&card.classList.contains('is-done'))card.classList.add('cs-completion-arrival');
      card.style.setProperty('--cs-arrival-delay',`${Math.min(index,5)*22}ms`);
      if(index>5)card.classList.add('cs-no-arrival');
    });
  };
}
