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
  await page.addStyleTag({content:'#app{height:calc(100dvh - 31px);min-height:0}'});
  const settle=()=>page.evaluate(async()=>{await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));document.querySelector('.cs-root').scrollTop=0;});
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
  console.log('PASS: 320–600px layout, 44px check targets, accessible full details, completion retention, focus/cancel, horizontal navigation continuity, dark/light and OS/in-app reduced motion.');
} finally {await browser?.close();await new Promise(r=>server.close(r));}
