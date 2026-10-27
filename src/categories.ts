import {Board,Task} from './model';
import {taskType} from './progress';
export const CATEGORIES=[
  {id:'routine',label:'Routine & care',icon:'☀',color:'#e8a1ae',ink:'#813447'},
  {id:'upper',label:'Upper body',icon:'↑',color:'#f4bd78',ink:'#805013'},
  {id:'lower',label:'Lower body',icon:'↓',color:'#ef9a94',ink:'#8c3932'},
  {id:'home',label:'Home workout',icon:'⌂',color:'#d7c36a',ink:'#6d6019'},
  {id:'cardio',label:'Cardio & outdoors',icon:'↗',color:'#75c8bf',ink:'#226b63'},
  {id:'accessory',label:'Strength accessory',icon:'+',color:'#d9a789',ink:'#815337'},
  {id:'kitchen',label:'Kitchen',icon:'◇',color:'#8fc8ed',ink:'#2b6186'},
  {id:'room',label:'Home & room',icon:'▦',color:'#91cfa4',ink:'#386945'},
  {id:'admin',label:'One-off obligations',icon:'!',color:'#efa5d5',ink:'#853d70'},
  {id:'learning',label:'Learning',icon:'文',color:'#b3a4eb',ink:'#58448e'},
  {id:'creative',label:'Creative',icon:'✦',color:'#bdade5',ink:'#64508a'},
  {id:'project',label:'Projects',icon:'▤',color:'#9abfe0',ink:'#3e6180'},
  {id:'leisure',label:'Intentional leisure',icon:'▶',color:'#9ecbd3',ink:'#3d6970'},
  {id:'other',label:'Other',icon:'·',color:'#b8bdc9',ink:'#555d6e'}
] as const;
export type CategoryId=typeof CATEGORIES[number]['id'];
export function categoryFor(b:Board,t:Task){const type=taskType(b,t).toLowerCase();let id:CategoryId=type.includes('upper body')?'upper':type.includes('lower body')?'lower':type.includes('home workout')?'home':type.includes('cardio')?'cardio':type.includes('accessory')?'accessory':type.includes('obligation')||/one-off/i.test(t.kind)?'admin':/cook|kitchen/.test(type)||t.page==='Kitchen'?'kitchen':t.page==='Room'||type.includes('room')?'room':type.includes('routine')||t.page==='Morning'?'routine':t.page==='Learning'||type.includes('learning')?'learning':t.page==='Creative'||type.includes('creative')?'creative':t.page==='Leisure'||type.includes('leisure')?'leisure':t.kind==='project'?'project':'other';return CATEGORIES.find(c=>c.id===id)!;}
export function decorateCategory(el:HTMLElement,b:Board,t:Task){const c=categoryFor(b,t);el.dataset.category=c.id;el.style.setProperty('--cs-category',c.color);el.style.setProperty('--cs-category-ink',c.ink);const label=el.querySelector<HTMLElement>('.cs-task-type');if(label){label.classList.add('cs-category-badge');label.textContent=`${c.icon} ${c.label}`;label.title=taskType(b,t)+' · source color '+t.color;}return c;}
