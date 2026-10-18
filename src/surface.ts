import { Board, COLORS, ColorId, Task, Goal, parseBoard, entryFor, planned, addDays, localDay, timerSeconds, duration } from './model';

export interface Host {
  read():Promise<string>;
  change(transform:(text:string)=>string):Promise<void>;
  editTask(task?:Task):void;
  editGoal(goal?:Goal):void;
  editEntry(task:Task,day:string):void;
  schedule(task:Task,day:string,detail:string):Promise<void>;
  check(task:Task,day:string,done:boolean):Promise<void>;
  start(task:Task,day:string):Promise<void>;
  pause(id:string):Promise<void>;
  resume(id:string):Promise<void>;
  finish(id:string):void;
  openNote():void;
  openDaily?():void;
  createNote():Promise<void>;
  settings():void;
  error(error:unknown):void;
}
type Tab='Today'|'Week'|'Pages'|'Goals'|'History';
export interface SurfaceOptions {day?:string;page?:string;tab?:Tab;embedded?:boolean}
export class Surface {
  private board:Board|null=null;
  private day=localDay();private tab:Tab='Today';private page='All';private filter='';
  private request=0;private destroyed=false;private pending=false;
  private ticker:ReturnType<typeof setInterval>;private timerDisplay:HTMLElement|null=null;
  constructor(private root:HTMLElement,private host:Host,options:SurfaceOptions={}){this.day=options.day||this.day;this.page=options.page||'All';this.tab=options.tab||'Today';root.classList.add('cs-root');if(options.embedded)root.classList.add('cs-embedded');this.ticker=setInterval(()=>this.tick(),1000);}
  get context():{day:string;page:string;tab:Tab}{return {day:this.day,page:this.page,tab:this.tab};}
  destroy():void {this.destroyed=true;clearInterval(this.ticker);this.root.replaceChildren();}
  async refresh():Promise<void>{const seq=++this.request;try{const board=parseBoard(await this.host.read());if(this.destroyed||seq!==this.request)return;this.board=board;this.render();}catch(error){if(!this.destroyed&&seq===this.request)this.renderError(error);}}
  private el<K extends keyof HTMLElementTagNameMap>(tag:K,parent:HTMLElement,className='',text=''):HTMLElementTagNameMap[K]{const e=parent.ownerDocument.createElement(tag);e.className=className;e.textContent=text;parent.append(e);return e;}
  private button(parent:HTMLElement,text:string,action:()=>void|Promise<void>,className='',label?:string):HTMLButtonElement{
    const b=this.el('button',parent,className,text);b.type='button';if(label)b.setAttribute('aria-label',label);
    b.addEventListener('click',()=>{void this.run(action);});return b;
  }
  private async run(action:()=>void|Promise<void>):Promise<void>{if(this.pending)return;this.pending=true;this.root.classList.add('cs-busy');try{await action();}catch(error){this.host.error(error);}finally{this.pending=false;this.root.classList.remove('cs-busy');}}
  private renderError(error:unknown):void {this.root.replaceChildren();this.el('p',this.root,'cs-eyebrow','COLOR SPRINT');this.el('h2',this.root,'','Your Markdown is the starting point.');this.el('p',this.root,'cs-muted',error instanceof Error?error.message:String(error));this.button(this.root,'Create starter note',()=>this.host.createNote(),'cs-primary');this.button(this.root,'Choose tracker note',()=>this.host.settings());this.button(this.root,'Open Markdown',()=>this.host.openNote());}
  private render():void {
    if(!this.board)return;const b=this.board;this.root.replaceChildren();this.timerDisplay=null;
    const head=this.el('header',this.root,'cs-header');const title=this.el('div',head);this.el('p',title,'cs-eyebrow','COLOR SPRINT · MARKDOWN FIRST');this.el('h1',title,'','A little more intentional.');
    const tools=this.el('div',head,'cs-toolbar');if(this.host.openDaily)this.button(tools,'Daily note ↗',()=>this.host.openDaily!(),'cs-link');this.button(tools,'Markdown ↗',()=>this.host.openNote(),'cs-link');this.button(tools,'⚙',()=>this.host.settings(),'cs-icon','Tracker settings');
    const nav=this.el('nav',this.root,'cs-tabs');nav.setAttribute('aria-label','Tracker views');
    for(const tab of ['Today','Week','Pages','Goals','History'] as Tab[]){const btn=this.button(nav,tab,()=>{this.tab=tab;this.render();},tab===this.tab?'is-active':'');btn.setAttribute('aria-current',String(tab===this.tab));}
    const controls=this.el('div',this.root,'cs-controls');this.button(controls,'‹',()=>{this.day=addDays(this.day,-1);this.render();},'cs-icon','Previous day');
    const date=this.el('input',controls,'cs-date');date.type='date';date.value=this.day;date.setAttribute('aria-label','Selected date');date.addEventListener('change',()=>{if(date.value){this.day=date.value;this.render();}});
    this.button(controls,'›',()=>{this.day=addDays(this.day,1);this.render();},'cs-icon','Next day');this.button(controls,'Today',()=>{this.day=localDay();this.render();},'cs-link');
    this.el('p',this.root,'cs-muted cs-sprint',`Sprint ${b.start} → ${b.end}`);
    if(b.timer)this.renderTimer();
    if(this.tab==='Today')this.renderToday();else if(this.tab==='Week')this.renderWeek();else if(this.tab==='Pages')this.renderPages();else if(this.tab==='Goals')this.renderGoals();else this.renderHistory();
    this.tick();
  }
  private pages():string[]{return ['All',...new Set([...this.board!.tasks.map(t=>t.page),...this.board!.goals.map(g=>g.page)])];}
  private pageFilter(parent:HTMLElement):void {const bar=this.el('div',parent,'cs-pages');for(const page of this.pages()){const button=this.button(bar,page,()=>{this.page=page;this.render();},page===this.page?'is-active':'');button.setAttribute('aria-pressed',String(page===this.page));}}
  private taskColor(task:Task,el:HTMLElement):void{el.style.setProperty('--cs-color',COLORS.find(c=>c.id===task.color)!.hex);el.setAttribute('data-color',task.color);}
  private renderToday():void {
    const b=this.board!;this.pageFilter(this.root);const tasks=b.tasks.filter(t=>planned(b,t,this.day)&&(this.page==='All'||t.page===this.page));const done=tasks.filter(t=>entryFor(b,t.id,this.day)?.done).length;
    const hero=this.el('section',this.root,'cs-summary');this.el('p',hero,'cs-eyebrow',new Date(`${this.day}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'}));this.el('h2',hero,'',tasks.length?`${done} of ${tasks.length} planned tasks complete`:'Start with one clear action.');
    const progress=this.el('progress',hero);progress.max=tasks.length||1;progress.value=done;progress.setAttribute('aria-label','Planned tasks completed');this.el('p',hero,'cs-muted','Your plan can be small. Check off what actually happened.');
    if(!tasks.length)this.el('p',this.root,'cs-empty','Nothing scheduled here. Open Pages to choose a task, or add one below.');
    for(const color of COLORS){const groupTasks=tasks.filter(t=>t.color===color.id);if(!groupTasks.length)continue;const group=this.el('section',this.root,'cs-group');this.el('h3',group,'cs-group-title',color.name);for(const task of groupTasks)this.taskCard(task,group,true);}
    this.button(this.root,'+ Add task',()=>this.host.editTask(),'cs-add');
  }
  private taskCard(task:Task,parent:HTMLElement,scheduledToday:boolean):void{
    const b=this.board!;const entry=entryFor(b,task.id,this.day);const card=this.el('article',parent,`cs-card ${entry?.done?'is-done':''}`);this.taskColor(task,card);
    const row=this.el('div',card,'cs-card-main');
    if(scheduledToday){const target=this.el('label',row,'cs-check-target');const check=this.el('input',target,'cs-check');check.type='checkbox';check.checked=!!entry?.done;check.setAttribute('aria-label',`Complete ${task.title}`);check.addEventListener('change',()=>{void this.run(async()=>{try{await this.host.check(task,this.day,check.checked);}catch(e){check.checked=!check.checked;throw e;}});});}
    const body=this.el('div',row,'cs-card-body');this.el('h3',body,'cs-task-title',task.title);this.el('p',body,'cs-meta',`${task.page} · ${task.kind}`);if(entry?.detail)this.el('p',body,'cs-detail',entry.detail);this.el('p',body,'cs-definition',task.definition);
    const actions=this.el('div',card,'cs-actions');if(!scheduledToday)this.button(actions,'+ Plan this day',()=>this.host.schedule(task,this.day,''),'cs-small');
    if(scheduledToday)this.button(actions,'Day details',()=>this.host.editEntry(task,this.day),'cs-small');
    this.button(actions,task.minutes?`◷ ${task.minutes} min`:'◷ Stopwatch',()=>this.host.start(task,this.day),'cs-small',`Start timer for ${task.title}`);
    this.button(actions,'Edit',()=>this.host.editTask(task),'cs-small');
  }
  private renderPages():void {
    this.pageFilter(this.root);const search=this.el('input',this.root,'cs-search');search.type='search';search.placeholder='Find a task…';search.value=this.filter;search.setAttribute('aria-label','Search tasks');
    const list=this.el('div',this.root);const render=()=>{list.replaceChildren();const tasks=this.board!.tasks.filter(t=>(this.page==='All'||t.page===this.page)&&`${t.title} ${t.definition}`.toLowerCase().includes(this.filter.toLowerCase()));for(const color of COLORS){const group=tasks.filter(t=>t.color===color.id);if(!group.length)continue;this.el('h3',list,'cs-group-title',color.name);for(const task of group)this.taskCard(task,list,planned(this.board!,task,this.day));}if(!tasks.length)this.el('p',list,'cs-empty','No tasks in this page yet. Add one below.');};
    search.addEventListener('input',()=>{this.filter=search.value;render();});render();this.button(this.root,'+ Add task',()=>this.host.editTask(),'cs-add');
  }
  private renderWeek():void {
    this.pageFilter(this.root);this.el('h2',this.root,'','The next seven days');this.el('p',this.root,'cs-muted','✓ completed · ○ planned · + unscheduled. Tap + to plan; tap a planned day to check it.');
    const wrap=this.el('div',this.root,'cs-grid-scroll');const table=this.el('table',wrap,'cs-grid');const thead=this.el('thead',table);const head=this.el('tr',thead);this.el('th',head,'','Task');const days=Array.from({length:7},(_,i)=>addDays(this.day,i));for(const day of days){const th=this.el('th',head,'',new Date(`${day}T12:00:00`).toLocaleDateString(undefined,{weekday:'short',day:'numeric'}));th.scope='col';}
    const body=this.el('tbody',table);for(const color of COLORS){for(const task of this.board!.tasks.filter(t=>t.color===color.id&&(this.page==='All'||t.page===this.page))){const row=this.el('tr',body);this.taskColor(task,row);const name=this.el('th',row,'cs-grid-name',task.title);name.scope='row';for(const day of days){const entry=entryFor(this.board!,task.id,day);const isPlanned=planned(this.board!,task,day);const cell=this.el('td',row);const btn=this.button(cell,entry?.done?'✓':isPlanned?'○':'+',()=>isPlanned?this.host.check(task,day,!entry?.done):this.host.schedule(task,day,''),entry?.done?'cs-cell done':isPlanned?'cs-cell planned':'cs-cell',`${task.title}, ${day}: ${entry?.done?'completed':isPlanned?'planned':'add to plan'}`);btn.setAttribute('aria-pressed',String(!!entry?.done));}}}
  }
  private renderGoals():void {
    this.pageFilter(this.root);this.el('h2',this.root,'','Goals with evidence');const goals=this.board!.goals.filter(g=>this.page==='All'||g.page===this.page);
    if(!goals.length)this.el('p',this.root,'cs-empty','Add a milestone with a concrete definition of done.');for(const goal of goals){const card=this.el('article',this.root,`cs-goal ${goal.done?'is-done':''}`);this.el('p',card,'cs-eyebrow',`${goal.page} · ${goal.due==='-'?'No deadline':goal.due}`);this.el('h3',card,'',`${goal.done?'✓ ':''}${goal.title}`);this.el('p',card,'cs-muted',goal.evidence||'Evidence: awaiting a real result.');this.button(card,goal.done?'Edit / reopen':'Record progress',()=>this.host.editGoal(goal),'cs-small');}this.button(this.root,'+ Add goal',()=>this.host.editGoal(),'cs-add');
  }
  private renderHistory():void {
    this.pageFilter(this.root);this.el('h2',this.root,'','Sessions, honestly logged');this.el('p',this.root,'cs-muted','Timer sessions measure focus. They do not automatically complete a task or count as a workout.');
    const sessions=[...this.board!.sessions].reverse().filter(s=>{const task=this.board!.tasks.find(t=>t.id===s.taskId)!;return this.page==='All'||task.page===this.page;});if(!sessions.length)this.el('p',this.root,'cs-empty','Saved timer sessions appear here.');for(const s of sessions){const task=this.board!.tasks.find(t=>t.id===s.taskId)!;const card=this.el('article',this.root,'cs-card');this.taskColor(task,card);this.el('p',card,'cs-meta',s.date);this.el('h3',card,'',`${task.title} · ${duration(s.seconds)}`);this.el('p',card,'cs-definition',s.note||'No note recorded.');}
  }
  private renderTimer():void {
    const timer=this.board!.timer!;const task=this.board!.tasks.find(t=>t.id===timer.taskId)!;const box=this.el('section',this.root,'cs-timer');this.taskColor(task,box);const details=this.el('div',box);this.el('p',details,'cs-eyebrow',timer.started==='-'?'PAUSED':'IN FOCUS');this.el('h2',details,'',task.title);this.timerDisplay=this.el('div',box,'cs-time');this.timerDisplay.setAttribute('role','timer');this.timerDisplay.setAttribute('aria-label','Elapsed focus time');const actions=this.el('div',box,'cs-actions');this.button(actions,timer.started==='-'?'Resume':'Pause',()=>timer.started==='-'?this.host.resume(timer.id):this.host.pause(timer.id),'cs-small');this.button(actions,'Save session',()=>this.host.finish(timer.id),'cs-primary');this.el('p',box,'cs-muted','Elapsed time recovers after sleep. Save the actual result before starting another task.');
  }
  private tick():void {const timer=this.board?.timer;if(!timer||!this.timerDisplay)return;const elapsed=timerSeconds(timer);const target=timer.target;this.timerDisplay.textContent=duration(elapsed);this.timerDisplay.setAttribute('data-target-reached',String(target>0&&elapsed>=target));const parent=this.timerDisplay.parentElement!;let label=parent.querySelector('.cs-timer-target');if(!label)label=this.el('p',parent,'cs-timer-target');label.textContent=target?(elapsed>=target?'Target reached — save when ready.':`${duration(Math.max(0,target-elapsed))} to your focus target`):'Open stopwatch';}
}
