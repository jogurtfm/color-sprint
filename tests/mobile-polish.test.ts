import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {prepareSurfacePaint} from '../src/mobile-polish';
const {JSDOM}=createRequire(import.meta.url)('jsdom');
test('presentation refresh retains chip rail positions and expanded card details without replaying entry motion',()=>{
  const d=new JSDOM('<main><nav class="cs-tabs"></nav><div class="cs-pages"></div><div class="cs-categories"></div><details data-cs-disclosure="test" open></details></main>');
  const root=d.window.document.querySelector('main');root.querySelector('.cs-tabs').scrollLeft=129;root.querySelector('.cs-pages').scrollLeft=45;
  const finish=prepareSurfacePaint(root,'today','today',false);
  root.innerHTML='<nav class="cs-tabs"></nav><div class="cs-pages"></div><details data-cs-disclosure="test"></details><article class="cs-card"></article>';
  finish();assert.equal(root.querySelector('.cs-tabs').scrollLeft,129);assert.equal(root.querySelector('.cs-pages').scrollLeft,45);assert.equal(root.querySelector('details').open,true);assert.equal(root.dataset.csMotion,'off');assert.equal(root.classList.contains('cs-view-arrival'),false);d.window.close();
});
test('explicit view changes keep selected chips visible horizontally, with motion bounded to six cards',()=>{
  const d=new JSDOM('<main></main>'),root=d.window.document.querySelector('main'),finish=prepareSurfacePaint(root,'week','today',true);
  root.innerHTML='<nav class="cs-tabs"><button class="is-active">Week</button></nav>'+Array.from({length:12},()=>'<article class="cs-card"></article>').join('');
  const nav=root.querySelector('nav');nav.getBoundingClientRect=()=>({left:0,right:320});root.querySelector('button').getBoundingClientRect=()=>({left:400,right:450});
  finish();assert.equal(nav.scrollLeft,134);assert.equal(root.querySelectorAll('.cs-no-arrival').length,6);assert.equal(root.lastElementChild.style.getPropertyValue('--cs-arrival-delay'),'110ms');assert.equal(root.dataset.csMotion,'on');d.window.close();
});
test('only a newly checked known card gets the completion highlight, never reloads, unchecks or changed days',()=>{
  const d=new JSDOM('<main><article class="cs-card" data-cs-task="one"></article><article class="cs-card is-done" data-cs-task="two"></article></main>'),root=d.window.document.querySelector('main');
  const finish=prepareSurfacePaint(root,'today','today',true);
  root.innerHTML='<article class="cs-card is-done" data-cs-task="one"></article><article class="cs-card is-done" data-cs-task="two"></article><article class="cs-card is-done" data-cs-task="unknown"></article>';
  finish();assert.equal(root.querySelectorAll('.cs-completion-arrival').length,1);assert.equal(root.querySelector('.cs-completion-arrival').dataset.csTask,'one');
  const changed=prepareSurfacePaint(root,'tomorrow','today',true);root.innerHTML='<article class="cs-card is-done" data-cs-task="one"></article>';changed();assert.equal(root.querySelectorAll('.cs-completion-arrival').length,0);d.window.close();
});
