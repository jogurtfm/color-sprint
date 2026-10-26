// Real Chromium renderer check with synthetic demo data only. No personal vault access.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
process.env.COLOR_SPRINT_PREVIEW_PORT='8791';
const {server}=await import('./preview.mjs');
let browser;
try{
  await mkdir('docs',{recursive:true});browser=await chromium.launch({headless:true,channel:process.env.COLOR_SPRINT_TEST_CHANNEL||'msedge'});const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8791/');await page.locator('.cs-card').first().waitFor();
  await page.getByRole('button',{name:'Effort',exact:true}).click();await page.getByText('Points, measurable goals & daily defaults',{exact:true}).click();
  await page.locator('.cs-progress-settings > form').getByRole('button',{name:'Save to Markdown'}).click();
  await page.getByRole('button',{name:'Today',exact:true}).first().click();assert.equal(await page.locator('#app.cs-effort').count(),0);
  for(const title of ['Make Bed','Brush Teeth','Clean Kitchen','Mindfulness'])assert(await page.locator('.cs-card').filter({has:page.getByRole('heading',{name:title,exact:true})}).locator('input[type=checkbox]').count());
  await page.getByRole('button',{name:'Effort',exact:true}).click();await page.getByText('Points, measurable goals & daily defaults',{exact:true}).click();
  const summary=page.getByText('Pushups · Home workout',{exact:true});await summary.click();const settings=summary.locator('..');await settings.getByLabel('Measured target (blank = unchanged)').fill('10');await settings.getByRole('button',{name:'Save to Markdown'}).click();
  await page.getByRole('button',{name:'Today',exact:true}).first().click();const card=page.locator('.cs-card').filter({has:page.getByRole('heading',{name:'Pushups',exact:true})});
  await card.getByRole('button',{name:'Add 5 reps for Pushups'}).click();await card.locator('.cs-measured-score').filter({hasText:'5/10 reps'}).waitFor();
  await card.getByRole('button',{name:'Add 5 reps for Pushups'}).click();await card.locator('.cs-measured-score').filter({hasText:'10/10 reps'}).waitFor();await card.getByLabel('Complete Pushups',{exact:true}).check();
  await page.locator('.cs-arcade').filter({hasText:'20 pt'}).waitFor();assert.equal(await page.locator('.cs-arcade .cs-rank-mark').textContent(),'C');
  await card.getByText('Suggest time',{exact:true}).click();await card.getByLabel('Start time',{exact:true}).fill('16:00');await card.getByLabel('End time',{exact:true}).fill('16:15');await card.getByRole('button',{name:'Save to Markdown',exact:true}).click();await card.getByText('Suggested · 4 PM–4:15 PM',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Workouts',exact:true}).click();await page.locator('.cs-rankup').waitFor({state:'detached'});await page.waitForTimeout(1600);await page.evaluate(()=>window.scrollTo(0,0));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await page.locator('.cs-arcade').evaluate(el=>el.getBoundingClientRect().height<160));
  await page.screenshot({path:'docs/progress-mobile.png',fullPage:false});
  await page.setViewportSize({width:1280,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'docs/progress-desktop.png',fullPage:false});
  assert.deepEqual(errors,[]);console.log('PASS: actual mobile/desktop clicks, routine preloads, saved goals, measured increments, threshold Finish, rank, suggested time, no horizontal overflow.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
