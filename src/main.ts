import { App, ItemView, MarkdownRenderChild, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf, ViewStateResult, getFrontMatterInfo, parseYaml, debounce } from 'obsidian';
import { COLORS, Task, Goal, WorkoutLog, QuickCount, GroupRef, parseBoard, saveTask, setGoal, setEntry, entryFor, startTimer, startGroupTimer, pauseTimer, resumeTimer, refreshTimer, finishTimer, addWorkoutLog, addQuickCount, localDay, validDay } from './model';
import { starter } from './starter';
import { Surface, Host, SurfaceOptions } from './surface';
import { DailyLink, dailyLink, embedLink, dailyScaffold, dailyFilename, vaultPath } from './daily';

const VIEW='color-sprint-view';
interface Settings {path:string;autoOpenDaily:boolean;dailyFolder:string;dailyFormat:string}
interface Context extends SurfaceOptions {tracker?:string;dailyNote?:string}
export default class ColorSprint extends Plugin {
  settings:Settings={path:'Sync/Color Sprint.md',autoOpenDaily:true,dailyFolder:'Sync/Daily',dailyFormat:'MM-DD-YYYY'};
  private queue:Promise<void>=Promise.resolve();
  private surfaces=new Map<Surface,string>();
  private dailyRequest=0;
  private stopped=false;
  private bypassDaily=new Set<string>();
  async onload():Promise<void>{
    const saved=await this.loadData();if(saved&&typeof saved.path==='string')this.settings.path=saved.path;
    if(typeof saved?.autoOpenDaily==='boolean')this.settings.autoOpenDaily=saved.autoOpenDaily;
    if(typeof saved?.dailyFolder==='string')this.settings.dailyFolder=saved.dailyFolder;
    if(saved?.dailyFormat==='YYYY-MM-DD'||saved?.dailyFormat==='MM-DD-YYYY')this.settings.dailyFormat=saved.dailyFormat;
    this.registerView(VIEW,leaf=>new SprintView(leaf,this));
    this.addSettingTab(new SprintSettings(this.app,this));
    this.registerMarkdownCodeBlockProcessor('color-sprint',(source,el,ctx)=>{ctx.addChild(new SprintEmbed(el,this,source,ctx.sourcePath));});
    this.addRibbonIcon('calendar-check','Open Color Sprint',()=>{void this.open().catch(e=>this.error(e));});
    this.addCommand({id:'open',name:'Open tracker',callback:()=>{void this.open().catch(e=>this.error(e));}});
    this.addCommand({id:'choose-note',name:'Choose tracker Markdown note',callback:()=>this.chooseNote()});
    this.addCommand({id:'create-starter',name:'Create starter Markdown note',callback:()=>{void this.createNote().catch(e=>this.error(e));}});
    this.addCommand({id:'open-source',name:'Open tracker Markdown',callback:()=>{void this.openNote().catch(e=>this.error(e));}});
    this.addCommand({id:'daily-today',name:'Open or create today’s daily dashboard',callback:()=>{void this.createDaily(localDay()).catch(e=>this.error(e));}});
    this.addCommand({id:'daily-date',name:'Create daily dashboard for a date',callback:()=>{const modal=new FormModal(this.app,'Daily dashboard');let date=localDay();modal.field('Date','Create or open this day without replacing existing note content.',date,v=>date=v,'date');modal.save(()=>this.createDaily(date),'Open day');modal.open();}});
    const refresh=debounce(()=>this.refresh(),120,true);
    const watched=(path:string)=>path===this.settings.path||[...this.surfaces.values()].includes(path);
    this.registerEvent(this.app.vault.on('modify',file=>{if(watched(file.path))refresh();}));
    this.registerEvent(this.app.vault.on('create',file=>{if(watched(file.path))refresh();}));
    this.registerEvent(this.app.vault.on('delete',file=>{if(watched(file.path))refresh();}));
    this.registerEvent(this.app.vault.on('rename',(file,old)=>{if(old===this.settings.path&&file instanceof TFile){this.settings.path=file.path;void this.saveData(this.settings);new Notice('Tracker renamed. Update sprint-tracker properties in linked daily notes.');refresh();}}));
    this.registerEvent(this.app.workspace.on('file-open',file=>{void this.openDailyFile(file).catch(e=>this.error(e));}));
    this.app.workspace.onLayoutReady(()=>{if(!this.stopped)void this.openDailyFile(this.app.workspace.getActiveFile()).catch(e=>this.error(e));});
    this.registerDomEvent(document,'visibilitychange',()=>{if(!document.hidden)this.refresh();});
  }
  onunload():void {this.stopped=true;this.dailyRequest++;for(const surface of this.surfaces.keys())surface.destroy();this.surfaces.clear();}
  async open(context:Context={}):Promise<void>{let leaf=this.app.workspace.getLeavesOfType(VIEW)[0];if(!leaf)leaf=this.app.workspace.getLeaf('tab');await leaf.setViewState({type:VIEW,active:true,state:{tracker:context.tracker||this.settings.path,date:context.day||localDay(),page:context.page||'All',tab:context.tab||'Today',dailyNote:context.dailyNote}});await this.app.workspace.revealLeaf(leaf);}
  file(path=this.settings.path):TFile{const file=this.app.vault.getAbstractFileByPath(vaultPath(path));if(!(file instanceof TFile))throw new Error(`Tracker note not found: ${path}. Create it or choose an existing tracker note.`);return file;}
  async read(path=this.settings.path):Promise<string>{return this.app.vault.read(this.file(path));}
  change(transform:(text:string)=>string,path=this.settings.path):Promise<void>{
    const operation=this.queue.then(async()=>{await this.app.vault.process(this.file(path),text=>{const next=transform(text);parseBoard(next);return next;});this.refresh();});this.queue=operation.catch(()=>{});return operation;
  }
  refresh():void{for(const surface of this.surfaces.keys())void surface.refresh();}
  error(error:unknown):void{new Notice(error instanceof Error?error.message:String(error),8000);}
  attach(root:HTMLElement,context:Context={}):Surface {
    const path=vaultPath(context.tracker||this.settings.path);
    const change=(fn:(text:string)=>string)=>this.change(fn,path);
    const host:Host={
      read:()=>this.read(path),change,
      editTask:task=>new TaskModal(this.app,this,task,path).open(),editGoal:goal=>new GoalModal(this.app,this,goal,path).open(),
      editEntry:(task,day)=>{void this.read(path).then(text=>new EntryModal(this.app,this,task,day,text,path).open()).catch(e=>this.error(e));},
      schedule:(task,day,detail)=>change(text=>{const board=parseBoard(text);if(board.entries.some(e=>e.taskId===task.id&&e.date===day))throw new Error('Task already has an entry on this day.');return setEntry(text,day,task.id,false,detail);}),
      check:(task,day,done)=>change(text=>setEntry(text,day,task.id,done)),
      start:(task,day)=>change(text=>startTimer(text,task.id,day)),startGroup:(group,day)=>change(text=>startGroupTimer(text,group,day)),
      pause:id=>change(text=>pauseTimer(text,id)),resume:id=>change(text=>resumeTimer(text,id)),refresh:id=>change(text=>refreshTimer(text,id)),logWorkout:log=>change(text=>addWorkoutLog(text,log)),quickCount:count=>change(text=>addQuickCount(text,count)),
      finish:id=>new SessionModal(this.app,this,id,path).open(),openNote:()=>{void this.openNote(path).catch(e=>this.error(e));},
      openDaily:context.dailyNote&&!context.embedded?()=>{void this.openDailyMarkdown(context.dailyNote!).catch(e=>this.error(e));}:undefined,
      createNote:()=>this.createNote(path),settings:()=>this.chooseNote(),error:e=>this.error(e)
    };const surface=new Surface(root,host,context);this.surfaces.set(surface,path);return surface;
  }
  detach(surface:Surface):void{surface.destroy();this.surfaces.delete(surface);}
  async openNote(path=this.settings.path):Promise<void>{await this.app.workspace.getLeaf('tab').openFile(this.file(path));}
  async openDailyMarkdown(path:string):Promise<void>{const file=this.file(path);this.bypassDaily.add(path);try{await this.app.workspace.getLeaf('tab').openFile(file);}finally{this.bypassDaily.delete(path);}}
  private async ensureFolder(path:string):Promise<void>{const pieces=path.split('/');pieces.pop();let parent='';for(const piece of pieces){parent=parent?`${parent}/${piece}`:piece;if(!this.app.vault.getAbstractFileByPath(parent))await this.app.vault.createFolder(parent);}}
  async createNote(path=this.settings.path):Promise<void>{
    vaultPath(path);if(this.app.vault.getAbstractFileByPath(path)){new Notice('Note already exists. No content was replaced.');this.refresh();return;}
    await this.ensureFolder(path);await this.app.vault.create(path,starter());this.refresh();new Notice('Markdown starter created. Choose tasks in Pages to plan your first day.');
  }
  async frontmatter(path:string):Promise<unknown>{const source=this.app.vault.getAbstractFileByPath(path);if(!(source instanceof TFile))return {};const text=await this.app.vault.read(source);const info=getFrontMatterInfo(text);return info.exists?parseYaml(info.frontmatter):{};}
  async openDailyFile(file:TFile|null):Promise<void>{
    const request=++this.dailyRequest;if(this.stopped||!this.settings.autoOpenDaily||!file||!file.path.endsWith('.md'))return;if(this.bypassDaily.delete(file.path))return;
    const link=dailyLink(await this.frontmatter(file.path),this.settings.path);
    if(!link?.autoOpen||this.stopped||request!==this.dailyRequest||this.app.workspace.getActiveFile()?.path!==file.path)return;
    await this.open({tracker:link.tracker,day:link.date,page:link.page,dailyNote:file.path});
  }
  async createDaily(date:string):Promise<void>{
    const path=`${vaultPath(this.settings.dailyFolder,true)}/${dailyFilename(date,this.settings.dailyFormat)}`;let file=this.app.vault.getAbstractFileByPath(path);
    if(!file){await this.ensureFolder(path);file=await this.app.vault.create(path,dailyScaffold(date,this.settings.path,true));}
    if(!(file instanceof TFile))throw new Error('Daily destination is a folder, not a note.');
    await this.app.workspace.getLeaf('tab').openFile(file);new Notice('Daily dashboard opened. Existing notes are preserved.');
  }
  chooseNote():void {const modal=new FormModal(this.app,'Choose your tracker note');let path=this.settings.path;modal.field('Markdown path','Relative to this vault, such as Sync/Color Sprint.md',path,v=>path=v);modal.save(async()=>{this.settings.path=vaultPath(path);await this.saveData(this.settings);await this.open();});modal.open();}
}
class SprintView extends ItemView {
  private surface?:Surface;
  private context:Context={};
  constructor(leaf:WorkspaceLeaf,private plugin:ColorSprint){super(leaf);}
  getViewType():string{return VIEW;}
  getDisplayText():string{return 'Color Sprint';}
  getIcon():string{return 'calendar-check';}
  getState():Record<string,unknown>{const selected=this.surface?.context;return {tracker:this.context.tracker||this.plugin.settings.path,date:selected?.day||this.context.day||localDay(),page:selected?.page||this.context.page||'All',tab:selected?.tab||this.context.tab||'Today',dailyNote:this.context.dailyNote};}
  async setState(state:unknown,result:ViewStateResult):Promise<void>{const data=(state&&typeof state==='object'?state:{}) as Record<string,unknown>;this.context={tracker:typeof data.tracker==='string'?vaultPath(data.tracker):this.plugin.settings.path,day:typeof data.date==='string'&&validDay(data.date)?data.date:localDay(),page:typeof data.page==='string'?data.page:'All',tab:['Today','Week','Pages','Goals','History'].includes(String(data.tab))?data.tab as SurfaceOptions['tab']:'Today',dailyNote:typeof data.dailyNote==='string'?vaultPath(data.dailyNote):undefined};if(this.surface)this.plugin.detach(this.surface);this.surface=this.plugin.attach(this.contentEl,this.context);await this.surface.refresh();await super.setState(state,result);}
  async onOpen():Promise<void>{this.surface=this.plugin.attach(this.contentEl,this.context);await this.surface.refresh();}
  async onClose():Promise<void>{if(this.surface)this.plugin.detach(this.surface);}
}
class SprintEmbed extends MarkdownRenderChild {
  private surface?:Surface;private disposed=false;private request=0;
  constructor(el:HTMLElement,private plugin:ColorSprint,private source:string,private sourcePath:string){super(el);}
  onload():void{this.registerEvent(this.plugin.app.vault.on('modify',file=>{if(file.path===this.sourcePath)void this.render();}));void this.render();}
  private async render():Promise<void>{const request=++this.request;try{const fm=await this.plugin.frontmatter(this.sourcePath);const config=this.source.trim()?parseYaml(this.source):{};const link=embedLink(config,fm,this.plugin.settings.path);if(this.disposed||request!==this.request)return;if(this.surface)this.plugin.detach(this.surface);this.containerEl.replaceChildren();this.containerEl.classList.add('cs-embed-frame');const expand=this.containerEl.createEl('button',{cls:'cs-expand',text:'Open full tracker ↗'});expand.addEventListener('click',()=>{void this.plugin.open({tracker:link.tracker,day:link.date,page:link.page,tab:link.view}).catch(e=>this.plugin.error(e));});const root=this.containerEl.createEl('div');this.surface=this.plugin.attach(root,{tracker:link.tracker,day:link.date,page:link.page,tab:link.view,embedded:true});await this.surface.refresh();}catch(e){if(this.disposed||request!==this.request)return;if(this.surface){this.plugin.detach(this.surface);this.surface=undefined;}this.containerEl.replaceChildren();this.containerEl.createEl('p',{cls:'cs-form-error',text:e instanceof Error?e.message:String(e)});}}
  onunload():void{this.disposed=true;this.request++;if(this.surface)this.plugin.detach(this.surface);}
}
class SprintSettings extends PluginSettingTab {
  constructor(app:App,private plugin:ColorSprint){super(app,plugin);}
  display():void{const {containerEl}=this;containerEl.empty();containerEl.createEl('h2',{text:'Daily dashboards'});
    new Setting(containerEl).setName('Open linked daily notes as a sprint').setDesc('Only notes with color-sprint: true and sprint-open: true auto-open. Set sprint-open: false to stay with the inline embed.').addToggle(toggle=>toggle.setValue(this.plugin.settings.autoOpenDaily).onChange(async value=>{this.plugin.settings.autoOpenDaily=value;await this.plugin.saveData(this.plugin.settings);}));
    new Setting(containerEl).setName('Daily note folder').setDesc('Used by the daily dashboard creation commands.').addText(input=>input.setValue(this.plugin.settings.dailyFolder).onChange(async value=>{try{this.plugin.settings.dailyFolder=vaultPath(value,true);await this.plugin.saveData(this.plugin.settings);}catch{}}));
    new Setting(containerEl).setName('Daily filename format').addDropdown(input=>input.addOptions({'MM-DD-YYYY':'MM-DD-YYYY','YYYY-MM-DD':'YYYY-MM-DD'}).setValue(this.plugin.settings.dailyFormat).onChange(async value=>{this.plugin.settings.dailyFormat=value;await this.plugin.saveData(this.plugin.settings);}));
    new Setting(containerEl).setName('Tracker note').setDesc(this.plugin.settings.path).addButton(button=>button.setButtonText('Choose note').onClick(()=>this.plugin.chooseNote()));
  }
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
  constructor(app:App,plugin:ColorSprint,original?:Task,path=plugin.settings.path){
    super(app,original?'Edit task':'Add a task');
    const task:Task=original?{...original}:{id:`task-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,title:'',color:'blue',page:'General',kind:'habit',repeat:'-',minutes:10,definition:''};
    this.field('Task name','Keep the label meaningful.',task.title,v=>task.title=v.trim());
    this.field('Page','Examples: Morning, Workouts, Room. Create pages by naming them here.',task.page,v=>task.page=v.trim());
    this.select('Color','These six colors retain their original grouping.',task.color,Object.fromEntries(COLORS.map(c=>[c.id,c.name])),v=>task.color=v as Task['color']);
    this.field('Kind','habit, session, component, project, practice, or obligation',task.kind,v=>task.kind=v.trim());
    this.field('Repeat','- means unscheduled. Use daily or mon,wed,fri. Applies inside the Sprint dates.',task.repeat,v=>task.repeat=v.trim().toLowerCase());
    this.field('Focus timer minutes','0 uses a stopwatch. This sets focus time, not exercise workload.',String(task.minutes),v=>task.minutes=Number(v),'number');
    this.text('Done means','Write the small, observable result that counts.',task.definition,v=>task.definition=v.trim());
    this.save(()=>plugin.change(text=>{const current=parseBoard(text).tasks.find(t=>t.id===task.id);if(original&&JSON.stringify(current)!==JSON.stringify(original))throw new Error('This task changed in Markdown. Reopen it to edit the latest version.');if(!task.title||!task.page||!task.kind||!Number.isFinite(task.minutes)||task.minutes<0||task.minutes>1440)throw new Error('Name, page, kind, and 0–1440 timer minutes are required.');return saveTask(text,task);},path));
  }
}
class GoalModal extends FormModal {
  constructor(app:App,plugin:ColorSprint,original?:Goal,path=plugin.settings.path){
    super(app,original?'Goal progress':'Add a goal');const goal:Goal=original?{...original}:{id:`goal-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,due:'-',page:'General',title:'',evidence:'',done:false};
    this.field('Goal','One observable milestone.',goal.title,v=>goal.title=v.trim());this.field('Page','Match a task page or make a new one.',goal.page,v=>goal.page=v.trim());this.field('Due date','YYYY-MM-DD, or - for no deadline.',goal.due,v=>goal.due=v.trim()||'-');this.text('Evidence','What actually changed? File, count, usable space, or other result.',goal.evidence,v=>goal.evidence=v.trim());this.select('Status','Completion needs real evidence.',goal.done?'done':'open',{open:'Open',done:'Done'},v=>goal.done=v==='done');
    this.save(()=>plugin.change(text=>{const current=parseBoard(text).goals.find(g=>g.id===goal.id);if(original&&JSON.stringify(current)!==JSON.stringify(original))throw new Error('This goal changed in Markdown. Reopen it.');if(!goal.title||!goal.page)throw new Error('Goal and page are required.');if(goal.done&&!goal.evidence)throw new Error('Record the evidence before marking this goal done.');return setGoal(text,goal);},path));
  }
}
class SessionModal extends FormModal {
  constructor(app:App,plugin:ColorSprint,id:string,path=plugin.settings.path){super(app,'Save your focus session');let note='';this.text('Actual result','Record what happened. For training, include actual sets/reps/distance. A saved timer does not mark the task complete.',note,v=>note=v);this.save(()=>plugin.change(text=>finishTimer(text,id,note),path),'Save session');}
}
class EntryModal extends FormModal {
  constructor(app:App,plugin:ColorSprint,task:Task,day:string,text:string,path=plugin.settings.path){
    super(app,`${task.title} · ${day}`);const original=entryFor(parseBoard(text),task.id,day);let detail=original?.detail||'';
    this.text('Plan / actual result','Keep source assignments intact; add actual sets, reps, distances, evidence, or blockers here.',detail,v=>detail=v);
    this.save(()=>plugin.change(current=>{const entry=entryFor(parseBoard(current),task.id,day);if(JSON.stringify(entry)!==JSON.stringify(original))throw new Error('This entry changed in Markdown. Reopen the latest version.');return setEntry(current,day,task.id,entry?.done||false,detail);},path));
  }
}
