// Real renderer + synthetic Markdown. Never touches a live vault or native HUD profile.
import {chromium} from '../node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const m=createRequire(import.meta.url)('./test-results/fixtures.cjs');
const {server,filename}=await import('./preview.mjs');let browser;
const geometry=page=>page.evaluate(()=>{
  const rect=selector=>{const el=document.querySelector(selector),r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,layoutHeight:el.offsetHeight,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight};};
  return {shell:rect('.hud-shell'),dashboard:rect('.dashboard'),queue:rect('.queue-panel'),list:rect('.task-scroll'),right:rect('.right-column'),ring:rect('.viewport-focus .ring-stage'),width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight};
});
try{
  await mkdir('test-results/catalog-layout',{recursive:true});let text=await readFile(filename,'utf8');
  for(const taskId of ['clean-room','audio-portfolio','hard-task'])for(let i=0;i<8;i++)text=m.saveSubtask(text,{id:`layout-${taskId}-${i}`,taskId,context:'-',minutes:5,title:`Step ${i+1} · one concrete action`,definition:'A small visible result.',done:false,completed:'-'});
  await writeFile(filename,text);await fetch('http://127.0.0.1:8788/date',{method:'POST',body:JSON.stringify({day:'2026-11-06'})});
  browser=await chromium.launch({channel:'msedge',headless:true,chromiumSandbox:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const report=[];
  for(const [width,height] of [[1920,1080],[1600,900],[1280,800],[1040,720]]){
    await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:8788');await page.locator('.queue-panel').waitFor();await page.emulateMedia({reducedMotion:'reduce'});
    const before=await geometry(page);await page.locator('details.catalog > summary').click();await page.locator('details.catalog[open]').waitFor();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const after=await geometry(page);report.push({width,height,before,after});
    await page.screenshot({path:`test-results/catalog-layout/${width}x${height}.png`});
    await writeFile('test-results/catalog-layout/geometry.json',JSON.stringify(report,null,2));
    assert(Math.abs(after.shell.layoutHeight-before.shell.layoutHeight)<=1,'Unfolding available tasks must not stretch the HUD shell');
    assert(Math.abs(after.dashboard.layoutHeight-before.dashboard.layoutHeight)<=1,'The dashboard must keep its height');
    assert(Math.abs(after.right.layoutHeight-before.right.layoutHeight)<=1,'The itinerary column must not stretch');
    assert(after.shell.layoutHeight<=height+1,'HUD shell must fit the viewport');
    assert(after.dashboard.x+after.dashboard.width<=width+1,'Dashboard columns must fit, not just be clipped');
    assert(Math.abs(after.ring.x+after.ring.width/2-width/2)<1,'The focus ring stays anchored to screen center');
    assert(after.queue.layoutHeight>before.queue.layoutHeight+100,'The deck must actually grow when unfolded');
    assert(after.queue.width>before.queue.width+30,'The expanded deck must provide more horizontal working space');
    assert(after.list.clientHeight>=height*.55,'The expanded deck gives checklists most of the available screen height');
    assert(after.scrollWidth<=width+1&&after.scrollHeight<=height+1,'No page-level horizontal or vertical overflow');
    assert(after.list.scrollHeight>after.list.clientHeight+200,'The task bank must scroll internally');
    const checklist=page.locator('.task-scroll [data-checklist-task="clean-room"]');await checklist.getByRole('button',{name:'Collapse',exact:true}).click();assert.equal((await geometry(page)).shell.layoutHeight,before.shell.layoutHeight);await checklist.getByRole('button',{name:'All steps',exact:true}).click();assert.equal((await geometry(page)).shell.layoutHeight,before.shell.layoutHeight);await page.getByRole('button',{name:'Dock task deck',exact:true}).click();assert.equal(await page.locator('.task-deck').count(),0);await page.getByRole('button',{name:'Expand task deck',exact:true}).click();await page.locator('.task-deck').waitFor();
    await page.locator('.task-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);assert(await page.locator('.task-scroll').evaluate(el=>el.scrollTop>100));
    await page.locator('.task-scroll').evaluate(el=>el.scrollTop=0);await page.locator('details.catalog > summary').click();const collapsed=await geometry(page);assert.equal(collapsed.shell.layoutHeight,before.shell.layoutHeight);
  }
  await page.setViewportSize({width:1600,height:900});await fetch('http://127.0.0.1:8788/date',{method:'POST',body:JSON.stringify({day:'2026-10-18'})});await page.reload();await page.locator('.hud-shell').waitFor();await page.locator('details.catalog > summary').click();const planned=await geometry(page);assert.equal(planned.shell.layoutHeight,900);assert.equal(planned.right.layoutHeight,planned.dashboard.layoutHeight);
  await page.locator('[data-workspace-tab="Pages"]').click();await page.locator('.workspace-view').waitFor();assert(await page.evaluate(()=>document.querySelector('.hud-shell').offsetHeight===innerHeight&&document.querySelector('.workspace-view').getBoundingClientRect().bottom<innerHeight));
  await page.locator('[data-workspace-tab="Today"]').click();await writeFile(filename,'Invalid synthetic tracker');await fetch('http://127.0.0.1:8788/state');await page.locator('body.source-stale .error-strip').waitFor();const stale=await geometry(page);assert.equal(stale.shell.layoutHeight,900);assert(stale.dashboard.height>250);await writeFile(filename,text);await fetch('http://127.0.0.1:8788/state');await page.locator('body:not(.source-stale)').waitFor();
  await fetch('http://127.0.0.1:8788/settings',{method:'POST',body:JSON.stringify({patch:{editing:true}})});await page.reload();await page.locator('.task-deck-toggle').waitFor();await page.getByRole('button',{name:'Expand task deck',exact:true}).click();
  const room=page.locator('[data-checklist-task="clean-room"]');await room.getByRole('button',{name:'+ Add step',exact:true}).click();const draft=room.locator('[name="step-title"]');await draft.fill('One shelf at a time');
  const revised=m.saveTask(text,{...m.parseBoard(text).tasks.find(t=>t.id==='brush-teeth'),title:'Brush Teeth · synced fixture'});await writeFile(filename,revised);await fetch('http://127.0.0.1:8788/state');await page.waitForFunction(()=>document.querySelector('[data-select="brush-teeth"]')?.textContent.includes('synced fixture'));assert.equal(await draft.inputValue(),'One shelf at a time');assert(await draft.evaluate(el=>el===document.activeElement));assert.equal(await page.locator('.task-deck-arriving').count(),0);await room.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.locator('.task-scroll').evaluate(el=>{const row=el.querySelector('[data-select="clean-room"]').closest('.task-row');el.scrollTop=row.offsetTop-12;});await page.screenshot({path:'test-results/catalog-layout/expanded-room.png'});
  assert.deepEqual(errors,[]);console.log('PASS: task deck grows taller/wider without cockpit distortion at 1920×1080, 1600×900, 1280×800 and 1040×720.');
}finally{await browser?.close();server.close();}
