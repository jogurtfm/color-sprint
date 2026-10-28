// Synthetic browser fixture only. No user vault, browser profile or credentials.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
process.env.COLOR_SPRINT_PREVIEW_PORT='0';
const {server}=await import('./preview.mjs');
await new Promise(r=>server.listening?r():server.once('listening',r));
let browser;
try {
  await mkdir('docs',{recursive:true});browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
  await page.locator('.cs-card').first().waitFor();
  assert.equal(await page.locator('.cs-root').getAttribute('data-cs-skin'),'hud');
  await page.addStyleTag({content:'#app{height:calc(100dvh - 31px);min-height:0}'});
  const settle=()=>page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));document.querySelector('.cs-root').scrollTop=0;});
  // Filter chrome and cards must remain reachable, not spill the document horizontally.
  for(const width of [320,375,390,430,600]){
    await page.setViewportSize({width,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
    assert(await page.locator('.cs-check-target').first().evaluate(el=>el.getBoundingClientRect().width>=44));
  }
  await page.setViewportSize({width:390,height:844});
  await page.addStyleTag({content:'body.theme-dark{--background-primary:#10151e;--background-secondary:#19212d;--text-normal:#edf2fb;--text-muted:#a3afc0;--background-modifier-border:#344051;--interactive-accent:#8070e9;--text-on-accent:#fff;background:#10151e;color:#edf2fb}'});
  await page.evaluate(()=>document.body.classList.add('theme-dark'));
  await page.locator('.cs-card').first().getByText('Details & planning',{exact:true}).click();
  assert(await page.locator('.cs-card').first().locator('.cs-definition').isVisible());
  await settle();
  await page.screenshot({path:'docs/pocket-hud-details.png',fullPage:false});
  await page.locator('.cs-card').first().getByText('Details & planning',{exact:true}).click();
  await settle();
  await page.screenshot({path:'docs/pocket-hud-dark.png',fullPage:false});
  await page.locator('.cs-card').first().getByText('Details & planning',{exact:true}).click();
  const check=page.getByLabel('Complete Make Bed',{exact:true});await check.check();
  await page.getByLabel('Complete Make Bed',{exact:true}).waitFor();assert(await page.getByLabel('Complete Make Bed',{exact:true}).isChecked());
  assert(await page.locator('.cs-card').first().locator('.cs-card-details').evaluate(el=>el.open));
  assert.equal(await page.locator('.cs-root').evaluate(el=>el.classList.contains('cs-view-arrival')),false);
  await page.locator('.cs-feedback-layer').waitFor({state:'detached'});
  // Native disclosure + focus controls still work; completion never removes the card.
  const focus=page.locator('.cs-card').filter({has:page.getByRole('heading',{name:'Clean Room',exact:true})});
  await focus.getByRole('button',{name:'Start focus for Clean Room',exact:true}).click();await page.locator('.cs-focus-card').waitFor();
  const ring=page.locator('.cs-focus-card>.cs-time');assert.equal(await ring.evaluate(el=>el.style.getPropertyValue('--cs-focus-progress')),'100%');
  // Update only the fictional timer start, not production files. The visual dial must follow it.
  await page.evaluate(async()=>{const p=window.colorSprintPreview,text=p.getMarkdown();const earlier=new Date(Date.now()-5*60*1000).toISOString();await p.setMarkdown(text.replace(/\| (\d{4}-\d{2}-\d{2}T[^| ]+) \|/,`| ${earlier} |`));});
  const value=parseFloat(await ring.evaluate(el=>el.style.getPropertyValue('--cs-focus-progress')));
  assert(value<70&&value>65,'dial uses the real elapsed time, not a looping animation');
  await settle();
  await page.screenshot({path:'docs/pocket-hud-focus.png'});
  const cancel=page.getByRole('button',{name:/Cancel/}).first();await cancel.click();await page.locator('.cs-tabs').waitFor();
  // Horizontal view navigation survives a tracker refresh and keeps the selected tab in view.
  await page.locator('.cs-tabs').getByRole('button',{name:'History',exact:true}).click();
  const scroll=await page.locator('.cs-tabs').evaluate(el=>el.scrollLeft);assert(scroll>0);
  await page.evaluate(()=>window.colorSprintPreview.setMarkdown(window.colorSprintPreview.getMarkdown()));
  assert.equal(await page.locator('.cs-tabs').evaluate(el=>el.scrollLeft),scroll);
  await page.locator('.cs-tabs').getByRole('button',{name:'Today',exact:true}).click();
  await page.evaluate(()=>document.body.classList.remove('theme-dark'));
  await settle();
  await page.screenshot({path:'docs/pocket-hud-light.png'});
  const beforeSkin=await page.evaluate(()=>window.colorSprintPreview.getMarkdown());
  await page.locator('.cs-mobile-tools').getByRole('button',{name:'Effects',exact:true}).click();
  await page.getByLabel('HUD styling',{exact:true}).uncheck();
  assert.equal(await page.locator('.cs-root').getAttribute('data-cs-skin'),'clean');
  assert.equal(await page.evaluate(()=>window.colorSprintPreview.getMarkdown()),beforeSkin);
  await page.reload();await page.locator('.cs-card').first().waitFor();
  assert.equal(await page.locator('.cs-root').getAttribute('data-cs-skin'),'clean');
  await page.locator('.cs-mobile-tools').getByRole('button',{name:'Effects',exact:true}).click();
  await page.getByLabel('HUD styling',{exact:true}).check();
  await page.getByRole('button',{name:'Close effects',exact:true}).click();
  await page.setViewportSize({width:900,height:844});
  assert.notEqual(await page.locator('.cs-tabs').evaluate(el=>getComputedStyle(el).borderRadius),'8px','HUD skin must not restyle desktop Obsidian');
  await page.setViewportSize({width:390,height:844});
  // Both OS Reduce Motion and the in-app Effects preference must stop the new motion.
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('.cs-tabs').getByRole('button',{name:'Pages',exact:true}).click();
  assert.equal(await page.locator('.cs-card').first().evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('.cs-mobile-tools').getByRole('button',{name:'Effects',exact:true}).click();
  await page.getByLabel('Completion animations',{exact:true}).uncheck();
  await page.getByRole('button',{name:'Close effects',exact:true}).click();
  await page.locator('.cs-tabs').getByRole('button',{name:'Today',exact:true}).click();
  assert.equal(await page.locator('.cs-root').getAttribute('data-cs-motion'),'off');
  assert.equal(await page.locator('.cs-card').first().evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.deepEqual(errors,[]);
  console.log('PASS: 320–600px layout, 44px check targets, full details, completion retention, focus/cancel, actual countdown dial, navigation continuity, dark/light, persistent HUD toggle without tracker writes, desktop isolation, and OS/in-app reduced motion.');
} finally {await browser?.close();await new Promise(r=>server.close(r));}
