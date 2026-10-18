import { chromium, webkit } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:8776');await page.waitForSelector('.cs-card');assert.ok((await page.locator('.cs-card').first().boundingBox()).y<430,'The first action card should be available without a long phone scroll.');
  assert.equal(await page.locator('.cs-card').count(),22);
  await page.getByRole('checkbox',{name:'Complete Make Bed',exact:true}).check();
  await page.waitForFunction(()=>window.colorSprintPreview.getMarkdown().includes('- [x]'));
  const saved=await page.evaluate(()=>window.colorSprintPreview.getMarkdown());assert.ok(saved.includes('- [x]'));
  await page.reload();await page.waitForSelector('.cs-card');assert.equal(await page.getByRole('checkbox',{name:'Complete Make Bed',exact:true}).isChecked(),true);
  await page.getByRole('button',{name:'Pages',exact:true}).click();await page.getByRole('button',{name:'Workouts',exact:true}).click();
  assert.equal(await page.locator('.cs-card').count(),10);
  assert.deepEqual([...new Set(await page.locator('.cs-card').evaluateAll(cards=>cards.map(c=>c.dataset.color)))],['blue','yellow','orange','salmon']);
  await page.getByRole('button',{name:'Morning',exact:true}).click();await page.getByRole('button',{name:'Edit',exact:true}).first().click();await page.getByRole('textbox',{name:'Task',exact:true}).fill('Make Bed · edited in the interface');await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.waitForFunction(()=>window.colorSprintPreview.getMarkdown().includes('edited in the interface'));
  await page.evaluate(async()=>{const s=window.colorSprintPreview.getMarkdown();await window.colorSprintPreview.setMarkdown(s.replace('Make Bed · edited in the interface','Make Bed · edited in Markdown'));});
  await page.getByRole('button',{name:'Today',exact:true}).first().click();await page.getByRole('button',{name:'All',exact:true}).click();await page.waitForSelector('h3:text("Make Bed · edited in Markdown")');
  await page.getByRole('button',{name:'Start timer for Make Bed · edited in Markdown',exact:true}).click();await page.waitForSelector('.cs-time');
  await page.getByRole('button',{name:'Pause',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();await page.reload();await page.waitForSelector('.cs-time');
  await page.getByRole('button',{name:'Save session',exact:true}).click();await page.getByRole('textbox',{name:'Result',exact:true}).fill('Actual: bedding straightened');await page.getByRole('button',{name:'Save',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.cs-time'));
  await page.getByRole('button',{name:'History',exact:true}).click();await page.waitForSelector('.cs-card');assert.match(await page.locator('#app').innerText(),/Actual: bedding straightened/);
  await page.getByRole('button',{name:'Week',exact:true}).click();assert.equal(await page.locator('tbody tr').count(),22);await page.locator('tbody tr').nth(1).locator('button').first().click();await page.locator('tbody tr').nth(1).locator('button').first().click();
  assert.equal(await page.locator('tbody tr').nth(1).locator('button').first().innerText(),'✓');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await page.getByRole('button',{name:'Goals',exact:true}).click();await page.getByRole('button',{name:'Record progress',exact:true}).click();await page.getByRole('textbox',{name:'Evidence',exact:true}).fill('Actual: two outgoing bags removed');await page.getByRole('textbox',{name:'Status',exact:true}).fill('done');await page.getByRole('button',{name:'Save',exact:true}).click();await page.waitForSelector('.cs-goal.is-done');
  // Restore generic demo state for screenshots, leaving real vault data untouched.
  await page.evaluate(()=>localStorage.removeItem('color-sprint-demo'));await page.reload();await page.waitForSelector('.cs-card');
  await mkdir('docs',{recursive:true});await page.screenshot({path:'docs/mobile-preview.png',fullPage:true});
  await page.getByRole('button',{name:'Pages',exact:true}).click();await page.getByRole('button',{name:'Workouts',exact:true}).click();await page.screenshot({path:'docs/workouts-preview.png',fullPage:true});
  await page.setViewportSize({width:1100,height:900});await page.getByRole('button',{name:'Week',exact:true}).click();await page.getByRole('button',{name:'All',exact:true}).click();await page.screenshot({path:'docs/week-preview.png',fullPage:true});
  await page.setViewportSize({width:320,height:740});await page.getByRole('button',{name:'Today',exact:true}).first().click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await page.goto('http://127.0.0.1:8776/?embed=1');await page.waitForSelector('.cs-card');assert.equal(await page.locator('.cs-embedded').count(),1);assert.equal(await page.locator('.cs-embedded').evaluate(el=>getComputedStyle(el).overflow),'visible');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);await page.screenshot({path:'docs/daily-embed-preview.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: phone-width task edits, Markdown round-trip, persistence, Workout colors, timer recovery/save, weekly grid, goals, 320px layout, and inline embed sizing.');
} finally {await context.close();await browser.close();}
