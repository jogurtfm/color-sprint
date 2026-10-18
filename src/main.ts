import { App, ItemView, Modal, Notice, Plugin, Setting, TFile, WorkspaceLeaf, normalizePath, debounce } from 'obsidian';
import { COLORS, Task, Goal, parseBoard, saveTask, setGoal, setEntry, entryFor, startTimer, pauseTimer, resumeTimer, finishTimer } from './model';
import { starter } from './starter';
import { Surface, Host } from './surface';

const VIEW='color-sprint-view';
interface Settings {path:string}
export default class ColorSprint extends Plugin {
  settings:Settings={path:'Sync/Color Sprint.md'};
  private queue:Promise<void>=Promise.resolve();
  private surfaces=new Set<Surface>();
  async onload():Promise<void>{
    const saved=await this.loadData();if(saved&&typeof saved.path==='string')this.settings.path=saved.path;
    this.registerView(VIEW,leaf=>new SprintView(leaf,this));
    this.addRibbonIcon('calendar-check','Open Color Sprint',()=>{void this.open();});
    this.addCommand({id:'open',name:'Open tracker',callback:()=>{void this.open();}});
    this.addCommand({id:'choose-note',name:'Choose tracker Markdown note',callback:()=>this.chooseNote()});
    this.addCommand({id:'create-starter',name:'Create starter Markdown note',callback:()=>{void this.createNote().catch(e=>this.error(e));}});
    this.addCommand({id:'open-source',name:'Open tracker Markdown',callback:()=>{void this.openNote().catch(e=>this.error(e));}});
    const refresh=debounce(()=>this.refresh(),120,true);
    this.registerEvent(this.app.vault.on('modify',file=>{if(file.path===this.settings.path)refresh();}));
    this.registerEvent(this.app.vault.on('create',file=>{if(file.path===this.settings.path)refresh();}));
    this.registerEvent(this.app.vault.on('delete',file=>{if(file.path===this.settings.path)refresh();}));
    this.registerEvent(this.app.vault.on('rename',(file,old)=>{if(old===this.settings.path&&file instanceof TFile){this.settings.path=file.path;void this.saveData(this.settings);refresh();}}));
    this.registerDomEvent(document,'visibilitychange',()=>{if(!document.hidden)this.refresh();});
  }
  onunload():void {for(const surface of this.surfaces)surface.destroy();this.surfaces.clear();}
  async open():Promise<void>{let leaf=this.app.workspace.getLeavesOfType(VIEW)[0];if(!leaf){leaf=this.app.workspace.getLeaf('tab');await leaf.setViewState({type:VIEW,active:true});}await this.app.workspace.revealLeaf(leaf);}
  private file():TFile{const file=this.app.vault.getAbstractFileByPath(this.settings.path);if(!(file instanceof TFile))throw new Error(`Tracker note not found: ${this.settings.path}. Create it or choose an existing tracker note.`);return file;}
  async read():Promise<string>{return this.app.vault.read(this.file());}
  change(transform:(text:string)=>string):Promise<void>{
    const path=this.settings.path;const operation=this.queue.then(async()=>{if(this.settings.path!==path)throw new Error('Tracker note changed. Reopen the current note before saving.');await this.app.vault.process(this.file(),text=>{const next=transform(text);parseBoard(next);return next;});this.refresh();});this.queue=operation.catch(()=>{});return operation;
  }
  refresh():void{for(const surface of this.surfaces)void surface.refresh();}
  error(error:unknown):void{new Notice(error instanceof Error?error.message:String(error),8000);}
  attach(root:HTMLElement):Surface {
    const host:Host={
      read:()=>this.read(),change:fn=>this.change(fn),
      editTask:task=>new TaskModal(this.app,this,task).open(),editGoal:goal=>new GoalModal(this.app,this,goal).open(),
      editEntry:(task,day)=>{void this.read().then(text=>new EntryModal(this.app,this,task,day,text).open()).catch(e=>this.error(e));},
      schedule:(task,day,detail)=>this.change(text=>{const board=parseBoard(text);if(board.entries.some(e=>e.taskId===task.id&&e.date===day))throw new Error('Task already has an entry on this day.');return setEntry(text,day,task.id,false,detail);}),
      check:(task,day,done)=>this.change(text=>setEntry(text,day,task.id,done)),
      start:(task,day)=>this.change(text=>startTimer(text,task.id,day)),
      pause:id=>this.change(text=>pauseTimer(text,id)),resume:id=>this.change(text=>resumeTimer(text,id)),
      finish:id=>new SessionModal(this.app,this,id).open(),openNote:()=>{void this.openNote().catch(e=>this.error(e));},
      createNote:()=>this.createNote(),settings:()=>this.chooseNote(),error:e=>this.error(e)
    };const surface=new Surface(root,host);this.surfaces.add(surface);return surface;
  }
  detach(surface:Surface):void{surface.destroy();this.surfaces.delete(surface);}
  async openNote():Promise<void>{await this.app.workspace.getLeaf('tab').openFile(this.file());}
  async createNote():Promise<void>{
    if(this.app.vault.getAbstractFileByPath(this.settings.path)){new Notice('Note already exists. No content was replaced.');this.refresh();return;}
    const pieces=this.settings.path.split('/');pieces.pop();let path='';for(const piece of pieces){path=path?`${path}/${piece}`:piece;if(!this.app.vault.getAbstractFileByPath(path))await this.app.vault.createFolder(path);}
    await this.app.vault.create(this.settings.path,starter());this.refresh();new Notice('Markdown starter created. Choose tasks in Pages to plan your first day.');
  }
  chooseNote():void {const modal=new FormModal(this.app,'Choose your tracker note');let path=this.settings.path;modal.field('Markdown path','Relative to this vault, such as Sync/Color Sprint.md',path,v=>path=v);modal.save(async()=>{const clean=normalizePath(path.trim());if(!clean.endsWith('.md')||clean.startsWith('/')||clean.split('/').some(p=>p==='..'||p.startsWith('.'))||/[:\\]/.test(clean))throw new Error('Choose a visible, vault-relative .md path.');this.settings.path=clean;await this.saveData(this.settings);this.refresh();});modal.open();}
}
class SprintView extends ItemView {
  private surface?:Surface;
  constructor(leaf:WorkspaceLeaf,private plugin:ColorSprint){super(leaf);}
  getViewType():string{return VIEW;}
  getDisplayText():string{return 'Color Sprint';}
  getIcon():string{return 'calendar-check';}
  async onOpen():Promise<void>{this.surface=this.plugin.attach(this.contentEl);await this.surface.refresh();}
  async onClose():Promise<void>{if(this.surface)this.plugin.detach(this.surface);}
}
class FormModal extends Modal {
  private errorEl:HTMLElement;
  constructor(app:App,title:string){super(app);this.setTitle(title);this.contentEl.addClass('cs-form');this.errorEl=this.contentEl.createEl('p',{cls:'cs-form-error',attr:{role:'alert'}});}
  field(name:string,desc:string,value:string,change:(v:string)=>void,type='text'):void{new Setting(this.contentEl).setName(name).setDesc(desc).addText(input=>{input.setValue(value);input.inputEl.type=type;input.inputEl.setAttribute('aria-label',name);input.onChange(change);});}
  text(name:string,desc:string,value:string,change:(v:string)=>void):void{new Setting(this.contentEl).setName(name).setDesc(desc).addTextArea(input=>{input.setValue(value);input.inputEl.setAttribute('aria-label',name);input.onChange(change);});}
  select(name:string,desc:string,value:string,options:Record<string,string>,change:(v:string)=>void):void{new Setting(this.contentEl).setName(name).setDesc(desc).addDropdown(input=>input.addOptions(options).setValue(value).onChange(change));}
  save(action:()=>Promise<void>,label='Save'):void{new Setting(this.contentEl).addButton(button=>button.setButtonText(label).setCta().onClick(async()=>{button.setDisabled(true);this.errorEl.textContent='';try{await action();this.close();}catch(e){this.errorEl.textContent=e instanceof Error?e.message:String(e);button.setDisabled(false);}}));}
  onClose():void{this.contentEl.empty();}
}
class TaskModal extends FormModal {
  constructor(app:App,plugin:ColorSprint,original?:Task){
    super(app,original?'Edit task':'Add a task');
    const task:Task=original?{...original}:{id:`task-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,title:'',color:'blue',page:'General',kind:'habit',repeat:'-',minutes:10,definition:''};
    this.field('Task name','Keep the label meaningful.',task.title,v=>task.title=v.trim());
    this.field('Page','Examples: Morning, Workouts, Room. Create pages by naming them here.',task.page,v=>task.page=v.trim());
    this.select('Color','These six colors retain their original grouping.',task.color,Object.fromEntries(COLORS.map(c=>[c.id,c.name])),v=>task.color=v as Task['color']);
    this.field('Kind','habit, session, component, project, practice, or obligation',task.kind,v=>task.kind=v.trim());
    this.field('Repeat','- means unscheduled. Use daily or mon,wed,fri. Applies inside the Sprint dates.',task.repeat,v=>task.repeat=v.trim().toLowerCase());
    this.field('Focus timer minutes','0 uses a stopwatch. This sets focus time, not exercise workload.',String(task.minutes),v=>task.minutes=Number(v),'number');
    this.text('Done means','Write the small, observable result that counts.',task.definition,v=>task.definition=v.trim());
    this.save(()=>plugin.change(text=>{const current=parseBoard(text).tasks.find(t=>t.id===task.id);if(original&&JSON.stringify(current)!==JSON.stringify(original))throw new Error('This task changed in Markdown. Reopen it to edit the latest version.');if(!task.title||!task.page||!task.kind||!Number.isFinite(task.minutes)||task.minutes<0||task.minutes>1440)throw new Error('Name, page, kind, and 0–1440 timer minutes are required.');return saveTask(text,task);}));
  }
}
class GoalModal extends FormModal {
  constructor(app:App,plugin:ColorSprint,original?:Goal){
    super(app,original?'Goal progress':'Add a goal');const goal:Goal=original?{...original}:{id:`goal-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,due:'-',page:'General',title:'',evidence:'',done:false};
    this.field('Goal','One observable milestone.',goal.title,v=>goal.title=v.trim());this.field('Page','Match a task page or make a new one.',goal.page,v=>goal.page=v.trim());this.field('Due date','YYYY-MM-DD, or - for no deadline.',goal.due,v=>goal.due=v.trim()||'-');this.text('Evidence','What actually changed? File, count, usable space, or other result.',goal.evidence,v=>goal.evidence=v.trim());this.select('Status','Completion needs real evidence.',goal.done?'done':'open',{open:'Open',done:'Done'},v=>goal.done=v==='done');
    this.save(()=>plugin.change(text=>{const current=parseBoard(text).goals.find(g=>g.id===goal.id);if(original&&JSON.stringify(current)!==JSON.stringify(original))throw new Error('This goal changed in Markdown. Reopen it.');if(!goal.title||!goal.page)throw new Error('Goal and page are required.');if(goal.done&&!goal.evidence)throw new Error('Record the evidence before marking this goal done.');return setGoal(text,goal);}));
  }
}
class SessionModal extends FormModal {
  constructor(app:App,plugin:ColorSprint,id:string){super(app,'Save your focus session');let note='';this.text('Actual result','Record what happened. For training, include actual sets/reps/distance. A saved timer does not mark the task complete.',note,v=>note=v);this.save(()=>plugin.change(text=>finishTimer(text,id,note)),'Save session');}
}
class EntryModal extends FormModal {
  constructor(app:App,plugin:ColorSprint,task:Task,day:string,text:string){
    super(app,`${task.title} · ${day}`);const original=entryFor(parseBoard(text),task.id,day);let detail=original?.detail||'';
    this.text('Plan / actual result','Keep source assignments intact; add actual sets, reps, distances, evidence, or blockers here.',detail,v=>detail=v);
    this.save(()=>plugin.change(current=>{const entry=entryFor(parseBoard(current),task.id,day);if(JSON.stringify(entry)!==JSON.stringify(original))throw new Error('This entry changed in Markdown. Reopen the latest version.');return setEntry(current,day,task.id,entry?.done||false,detail);}));
  }
}
