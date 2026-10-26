import { App, Component, ItemView, MarkdownRenderChild, MarkdownRenderer, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf, ViewStateResult, getFrontMatterInfo, parseYaml, debounce, Platform } from 'obsidian';
import { COLORS, Task, Goal, WorkoutLog, QuickCount, GroupRef, Subtask, parseBoard, setTaskCompletion, saveTask, saveSubtask, setGoal, setEntry, scheduleGroup, entryFor, startTimer, startGroupTimer, moveGroupTimer, pauseTimer, resumeTimer, refreshTimer, finishTimer, addWorkoutLog, addQuickCount, localDay, validDay, timeBlockFor, saveTimeBlock, clearTimeBlock } from './model';
import { starter,routineStarter } from './starter';
import { Surface, Host, SurfaceOptions } from './surface';
import { DailyLink, dailyLink, embedLink, dailyScaffold, dailyFilename, vaultPath } from './daily';
import { FeedbackSettings, DEFAULT_FEEDBACK } from './feedback';
import { DEFAULT_VOICE_FOLDER, RecorderBridge, recorderState, requireRecorder, voicePath, voiceScaffold, mountVoicePanel } from './voice';
import { requireRecording, waitForAudioEmbed, mountRecordingBar, VoiceState } from './voice';
import type { MarkdownView } from 'obsidian';
import { ReflectionDraft, newReflectionDraft, reflectionDraft, reflectionScaffold, appendReflection, mountReflectionPanel } from './reflection';
import { SyncStore } from './sync-store';
import { mountSyncPanel } from './sync-panel';
import { PhoneCheckpoint } from './sync';
import { HudBridge, requireRoutedHudVault } from './hud-store';
import {advanceQuickQueue,queueNeedsAdvance} from './model';
import {loadStudy,appendStudy} from './modules/data';
import {obsidianStudyIO} from './modules/obsidian-store';
import {activeModuleFocus,ModuleFocus,ReviewRecord} from './modules/contracts';

const VIEW='color-sprint-view';
interface Settings {path:string;autoOpenDaily:boolean;dailyFolder:string;dailyFormat:string;feedback:FeedbackSettings;voiceFolder:string}
interface Context extends SurfaceOptions {tracker?:string;dailyNote?:string}
export default class ColorSprint extends Plugin {
  settings:Settings={path:'Sync/Color Sprint.md',autoOpenDaily:true,dailyFolder:'Sync/Daily',dailyFormat:'MM-DD-YYYY',feedback:{...DEFAULT_FEEDBACK},voiceFolder:DEFAULT_VOICE_FOLDER};
  private queue:Promise<void>=Promise.resolve();
  private queuePoll:ReturnType<typeof setInterval>|null=null;private advancingQueue=false;
  private reflectionQueue:Promise<void>=Promise.resolve();private reflectionModal:ReflectionModal|null=null;
  private reflectionDrafts=new Map<string,ReflectionDraft>();
  syncStore!:SyncStore;primaryPhone=false;
  private hudBridge!:HudBridge;
  private surfaces=new Map<Surface,string>();
  private dailyRequest=0;
  private stopped=false;
  private bypassDaily=new Set<string>();
  private voiceOwner:{path:string;seen:boolean;requestedAt:number}|null=null;
  private voiceSaving=false;private voiceStopPromise:Promise<void>|null=null;
  private voiceControls:ReturnType<typeof mountRecordingBar>|null=null;private voicePoll:ReturnType<typeof setInterval>|null=null;
  async onload():Promise<void>{
    this.hudBridge=new HudBridge(this.app,(fn,path)=>this.change(fn,path),()=>this.queueDevice(),async(path,action,base)=>{const focus=activeModuleFocus(parseBoard(base));if(!focus||focus.stepId!==action.stepId)throw new Error('Study focus changed.');await this.saveStudy(path,JSON.parse(action.details||''),focus,base);});
    this.registerObsidianProtocolHandler('color-sprint-hud',params=>{if(params.review==='1'){try{requireRoutedHudVault(params,this.app.vault.getName());this.file(params.tracker);this.openSyncReview(params.tracker);}catch(e){this.error(e);}return;}void this.hudBridge.handle(params).catch(e=>this.error(e));});
    this.addCommand({id:'revoke-hud-pairings',name:'Revoke desktop HUD pairings on this device',callback:()=>{try{this.hudBridge.revoke();new Notice('HUD pairings revoked on this device.');}catch(e){this.error(e);}}});
    const primary=this.app.loadLocalStorage?.('color-sprint.primary-phone');this.primaryPhone=typeof primary==='boolean'?primary:!!Platform?.isMobile;this.syncStore=new SyncStore(this.app,message=>new Notice(message,10000));
    try{const owner=this.app.loadLocalStorage?.('color-sprint.voice-capture');if(owner&&typeof owner.path==='string'&&typeof owner.seen==='boolean'&&Number.isFinite(owner.requestedAt))this.voiceOwner={path:vaultPath(owner.path),seen:owner.seen,requestedAt:owner.requestedAt};}catch{}
    const saved=await this.loadData();if(saved&&typeof saved.path==='string')this.settings.path=saved.path;
    if(typeof saved?.autoOpenDaily==='boolean')this.settings.autoOpenDaily=saved.autoOpenDaily;
    if(typeof saved?.dailyFolder==='string')this.settings.dailyFolder=saved.dailyFolder;
    if(saved?.dailyFormat==='YYYY-MM-DD'||saved?.dailyFormat==='MM-DD-YYYY')this.settings.dailyFormat=saved.dailyFormat;
    if(typeof saved?.voiceFolder==='string')try{this.settings.voiceFolder=vaultPath(saved.voiceFolder,true);}catch{}
    for(const key of ['sound','haptics','motion'] as const)if(typeof saved?.feedback?.[key]==='boolean')this.settings.feedback[key]=saved.feedback[key];
    this.registerView(VIEW,leaf=>new SprintView(leaf,this));
    this.addSettingTab(new SprintSettings(this.app,this));
    this.registerMarkdownCodeBlockProcessor('color-sprint',(source,el,ctx)=>{ctx.addChild(new SprintEmbed(el,this,source,ctx.sourcePath));});
    this.addRibbonIcon('calendar-check','Open Color Sprint',()=>{void this.open().catch(e=>this.error(e));});
    this.addCommand({id:'open',name:'Open tracker',callback:()=>{void this.open().catch(e=>this.error(e));}});
    this.addCommand({id:'open-digest',name:'Open daily digest / itinerary',callback:()=>{void this.open({tab:'Digest'}).catch(e=>this.error(e));}});
    this.addCommand({id:'sync-review',name:'Review sync and recover phone checkboxes',callback:()=>this.openSyncReview()});
    this.addCommand({id:'voice-reflection',name:'Capture a reflection (dictate or type)',callback:()=>this.openVoiceReflection(localDay())});
    this.addCommand({id:'legacy-audio-reflection',name:'Open legacy audio reflections',callback:()=>this.openLegacyVoiceReflection(localDay())});
    this.addCommand({id:'stop-voice-recording',name:'Stop and save audio recording',callback:()=>{void this.stopVoiceRecording().catch(e=>this.error(e));}});
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
    this.registerEvent(this.app.vault.on('rename',(file,old)=>{if(this.voiceOwner?.path===old&&file instanceof TFile)this.rememberVoiceOwner({...this.voiceOwner,path:file.path});if(old===this.settings.path&&file instanceof TFile){this.settings.path=file.path;void this.saveData(this.settings);new Notice('Tracker renamed. Update sprint-tracker properties in linked daily notes.');refresh();}}));
    this.registerEvent(this.app.workspace.on('file-open',file=>{void this.openDailyFile(file).catch(e=>this.error(e));}));
    this.app.workspace.onLayoutReady(()=>{if(!this.stopped)void this.openDailyFile(this.app.workspace.getActiveFile()).catch(e=>this.error(e));});
    this.registerDomEvent(document,'visibilitychange',()=>{if(!document.hidden){this.refresh();this.syncVoiceControls();}});
    this.voiceControls=mountRecordingBar(document.body,{state:()=>this.voiceState(),stop:()=>this.stopVoiceRecording(),target:()=>this.voiceOwner?.path||'Obsidian Audio recorder',error:e=>this.error(e)});
    this.syncVoiceControls();this.voicePoll=setInterval(()=>this.syncVoiceControls(),300);
    this.queuePoll=setInterval(()=>void this.advanceQueues(),1000);
  }
  onunload():void {this.stopped=true;if(this.queuePoll)clearInterval(this.queuePoll);this.hudBridge?.stop();this.dailyRequest++;this.reflectionModal?.close();if(this.voicePoll)clearInterval(this.voicePoll);this.voiceControls?.destroy();for(const surface of this.surfaces.keys())surface.destroy();this.surfaces.clear();}
  private async advanceQueues():Promise<void>{
    if(this.stopped||this.advancingQueue)return;this.advancingQueue=true;
    try{for(const path of new Set([this.settings.path,...this.surfaces.values()])){
      try{const board=parseBoard(await this.read(path)),timer=board.timer,device=this.app.loadLocalStorage?.('color-sprint.queue-device');if(typeof device==='string'&&timer&&timer.owner===device&&queueNeedsAdvance(board))await this.change(text=>{const current=parseBoard(text);return current.timer?.owner===device?advanceQuickQueue(text,timer.id,timer.cursor):text;},path);}catch{/* Missing/stale notes remain visible in their own surface; never guess a repair. */}
    }}finally{this.advancingQueue=false;}
  }
  async open(context:Context={}):Promise<void>{let leaf=this.app.workspace.getLeavesOfType(VIEW)[0];if(!leaf)leaf=this.app.workspace.getLeaf('tab');await leaf.setViewState({type:VIEW,active:true,state:{tracker:context.tracker||this.settings.path,date:context.day||localDay(),page:context.page||'All',tab:context.tab||'Today',dailyNote:context.dailyNote}});await this.app.workspace.revealLeaf(leaf);}
  private queueDevice():string{const stored=this.app.loadLocalStorage?.('color-sprint.queue-device');if(typeof stored==='string'&&/^[-a-z0-9]{1,100}$/.test(stored))return stored;if(!this.app.saveLocalStorage)throw new Error('Device-local queue ownership is unavailable. Update Obsidian first.');const device='runner-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);this.app.saveLocalStorage('color-sprint.queue-device',device);return device;}
  file(path=this.settings.path):TFile{const file=this.app.vault.getAbstractFileByPath(vaultPath(path));if(!(file instanceof TFile))throw new Error(`Tracker note not found: ${path}. Create it or choose an existing tracker note.`);return file;}
  async read(path=this.settings.path):Promise<string>{return this.app.vault.read(this.file(path));}
private saveStudy(path:string,record:ReviewRecord,focus:ModuleFocus,base?:string):Promise<void>{const operation=this.queue.then(async()=>{if(this.stopped)throw new Error('Plugin stopped.');if(base!==undefined&&await this.read(path)!==base)throw new Error('Tracker changed before the study review. Refresh first.');await appendStudy(obsidianStudyIO(this.app),path,record,focus,()=>this.read(path));});this.queue=operation.catch(()=>{});return operation;}
  change(transform:(text:string)=>string,path=this.settings.path):Promise<void>{
    const operation=this.queue.then(async()=>{let checkpoint:PhoneCheckpoint|null=null;await this.app.vault.process(this.file(path),text=>{const next=transform(text);parseBoard(next);if(this.primaryPhone)checkpoint=this.syncStore.prepare(path,text,next);return next;});if(checkpoint)await this.syncStore.committed(checkpoint);this.refresh();});this.queue=operation.catch(()=>{});return operation;
  }
  openSyncReview(path=this.settings.path):void{new SyncReviewModal(this.app,this,path).open();}
  refresh():void{for(const surface of this.surfaces.keys())void surface.refresh();}
  error(error:unknown):void{new Notice(error instanceof Error?error.message:String(error),8000);}
  attach(root:HTMLElement,context:Context={}):Surface {
    const path=vaultPath(context.tracker||this.settings.path);
    const change=(fn:(text:string)=>string)=>this.change(fn,path);
    const host:Host={
      study:{load:focus=>loadStudy(obsidianStudyIO(this.app),path,focus.taskId,this.queueDevice()),append:(record,focus)=>this.saveStudy(path,record,focus)},
      queueOwner:()=>this.queueDevice(),
      read:()=>this.read(path),change,
      getFeedback:()=>({...this.settings.feedback}),saveFeedback:async prefs=>{await this.saveData({...this.settings,feedback:prefs});this.settings.feedback={...prefs};this.refresh();},
      openVoiceReflection:day=>this.openVoiceReflection(day),
      openSyncReview:()=>this.openSyncReview(path),
      editTask:task=>new TaskModal(this.app,this,task,path).open(),editSubtask:(task,sub)=>new SubtaskModal(this.app,this,task,sub,path).open(),editGoal:goal=>new GoalModal(this.app,this,goal,path).open(),
      editEntry:(task,day)=>{void this.read(path).then(text=>new EntryModal(this.app,this,task,day,text,path).open()).catch(e=>this.error(e));},
      schedule:(task,day,detail)=>change(text=>{const board=parseBoard(text);if(board.entries.some(e=>e.taskId===task.id&&e.date===day))throw new Error('Task already has an entry on this day.');return setEntry(text,day,task.id,false,detail);}),scheduleGroup:(group,day)=>change(text=>scheduleGroup(text,group,day)),
      check:(task,day,done)=>change(text=>setTaskCompletion(text,day,task.id,done)),
      start:(task,day)=>change(text=>startTimer(text,task.id,day)),startGroup:(group,day)=>change(text=>startGroupTimer(text,group,day)),moveGroup:(id,delta)=>change(text=>moveGroupTimer(text,id,delta)),
      pause:id=>change(text=>pauseTimer(text,id)),resume:id=>change(text=>resumeTimer(text,id)),refresh:id=>change(text=>refreshTimer(text,id)),logWorkout:log=>change(text=>addWorkoutLog(text,log)),quickCount:count=>change(text=>addQuickCount(text,count)),
      openNote:()=>{void this.openNote(path).catch(e=>this.error(e));},
      openDaily:context.dailyNote&&!context.embedded?()=>{void this.openDailyMarkdown(context.dailyNote!).catch(e=>this.error(e));}:undefined,
      createNote:()=>this.createNote(path),settings:()=>this.chooseNote(),error:e=>this.error(e)
    };const surface=new Surface(root,host,context);this.surfaces.set(surface,path);return surface;
  }
  detach(surface:Surface):void{surface.destroy();this.surfaces.delete(surface);}
  async openNote(path=this.settings.path):Promise<void>{await this.app.workspace.getLeaf('tab').openFile(this.file(path));}
  recorderBridge():RecorderBridge|undefined{return (this.app as App&{commands?:RecorderBridge}).commands;}
  voiceState():VoiceState{return {...recorderState(this.recorderBridge()),saving:this.voiceSaving};}
  private rememberVoiceOwner(owner:typeof this.voiceOwner):void{this.voiceOwner=owner;try{this.app.saveLocalStorage?.('color-sprint.voice-capture',owner);}catch{}}
  private syncVoiceControls():void{const state=this.voiceState();if(this.voiceOwner){if(state.recording===true&&!this.voiceOwner.seen)this.rememberVoiceOwner({...this.voiceOwner,seen:true});else if(state.recording===false&&!state.saving&&(this.voiceOwner.seen||Date.now()-this.voiceOwner.requestedAt>60000))this.rememberVoiceOwner(null);}this.voiceControls?.update();}
  stopVoiceRecording():Promise<void>{if(this.voiceStopPromise)return this.voiceStopPromise;const operation=this.performVoiceStop();this.voiceStopPromise=operation;void operation.finally(()=>{if(this.voiceStopPromise===operation)this.voiceStopPromise=null;}).catch(()=>{});return operation;}
  private async performVoiceStop():Promise<void>{
    const bridge=this.recorderBridge();requireRecording(bridge);this.voiceSaving=true;this.voiceControls?.update();
    try{
      // The core recorder chooses its destination when stopping. Restore only a
      // journal owned by this device's Color Sprint capture, never a guessed date.
      const ownedPath=this.voiceOwner?.path;
      if(ownedPath){const file=this.file(ownedPath);const active=this.app.workspace.activeEditor;if(this.app.workspace.getActiveFile()?.path!==ownedPath||active?.file?.path!==ownedPath){const leaf=this.app.workspace.getLeaf('tab');await leaf.openFile(file,{active:true,state:{mode:'source'}});await this.app.workspace.revealLeaf(leaf);}}
      const info=this.app.workspace.activeEditor;const active=this.app.workspace.getActiveFile()?.path===info?.file?.path?info:null;const path=active?.file?.path;const editor=active?.editor;
      if(ownedPath&&(path!==ownedPath||!editor))throw new Error('The recording journal is not ready. Open it in the editor, then tap Stop & save again.');
      const before=editor?.getValue();const view=this.app.workspace.getLeavesOfType('markdown').map(leaf=>leaf.view as MarkdownView).find(view=>view.file?.path===path&&view.editor===editor);
      if(editor){const last=editor.lastLine();editor.setCursor({line:last,ch:editor.getLine(last).length});}
      requireRecording(bridge);if(!bridge!.executeCommandById!('audio-recorder:stop'))throw new Error('The recorder could not stop. Try Stop & save again, or use Audio recorder: Stop recording.');
      this.voiceControls?.update();
      if(editor&&path&&before!==undefined){await waitForAudioEmbed(before,()=>editor.getValue(),{cancelled:()=>this.stopped});if(view?.file?.path===path&&typeof view.save==='function')await view.save();this.rememberVoiceOwner(null);new Notice('Audio added to your journal. You can replay it from Voice reflections.');}
      else{this.rememberVoiceOwner(null);new Notice('Stop requested. Obsidian is saving the audio as an attachment. Check the saved recording before starting another.');}
    }finally{this.voiceSaving=false;this.syncVoiceControls();}
  }
  openVoiceReflection(day:string):void{if(this.reflectionModal){this.reflectionModal.focusText();new Notice('A reflection draft is already open. Finish or close it before opening another day.');return;}const path=voicePath(this.settings.voiceFolder,day);this.reflectionModal=new ReflectionModal(this.app,this,day,path,()=>{this.reflectionModal=null;});this.reflectionModal.open();this.reflectionModal.focusText();}
  openLegacyVoiceReflection(day:string):void{new VoiceReflectionModal(this.app,this,day).open();}
  getReflectionDraft(path:string):ReflectionDraft {let draft=this.reflectionDrafts.get(path);if(!draft){draft=reflectionDraft(this.app.loadLocalStorage?.(`color-sprint.reflection-draft:${path}`))||newReflectionDraft();this.reflectionDrafts.set(path,draft);}return {...draft};}
  keepReflectionDraft(path:string,draft:ReflectionDraft):void {this.reflectionDrafts.set(path,{...draft});if(typeof this.app.saveLocalStorage!=='function')throw new Error('Persistent local drafts are unavailable in this Obsidian version.');this.app.saveLocalStorage(`color-sprint.reflection-draft:${path}`,draft);}
  saveReflection(path:string,day:string,draft:ReflectionDraft):Promise<void>{
    const operation=this.reflectionQueue.then(async()=>{
      vaultPath(path);if(!validDay(day))throw new Error('Choose a real reflection date.');appendReflection('',draft);
      let file=this.app.vault.getAbstractFileByPath(path);
      if(!file){await this.ensureFolder(path);try{file=await this.app.vault.create(path,reflectionScaffold(day));}catch(e){file=this.app.vault.getAbstractFileByPath(path);if(!file)throw e;}}
      if(!(file instanceof TFile))throw new Error('Reflection journal path is a folder, not a note.');
      await this.app.vault.process(file,current=>appendReflection(current,draft));
      // Clear only the saved snapshot, never newer text entered in another draft.
      const latest=this.reflectionDrafts.get(path);if(latest?.id===draft.id&&latest.text===draft.text){this.reflectionDrafts.delete(path);try{this.app.saveLocalStorage?.(`color-sprint.reflection-draft:${path}`,null);}catch{}}
      new Notice('Reflection saved as Markdown. Your vault sync can carry the text.');
    });this.reflectionQueue=operation.catch(()=>{});return operation;
  }
  async readVoiceReflection(day:string):Promise<{path:string;text:string}>{const path=voicePath(this.settings.voiceFolder,day);const file=this.app.vault.getAbstractFileByPath(path);if(file&&!(file instanceof TFile))throw new Error('Voice journal path is a folder, not a note.');return {path,text:file instanceof TFile?await this.app.vault.read(file):''};}
  async openVoiceJournal(day:string,record=false):Promise<void>{
    if(this.voiceSaving)throw new Error('The previous recording is still saving. Keep its journal open until the audio player appears.');
    const bridge=this.recorderBridge();if(record)requireRecorder(bridge);
    const path=voicePath(this.settings.voiceFolder,day);
    if(recorderState(bridge).recording===true&&this.app.workspace.getActiveFile()?.path!==path)throw new Error('Stop and save the current recording before switching journals.');
    let file=this.app.vault.getAbstractFileByPath(path);
    if(!file){await this.ensureFolder(path);file=this.app.vault.getAbstractFileByPath(path)||await this.app.vault.create(path,record?voiceScaffold(day):reflectionScaffold(day));}
    if(!(file instanceof TFile))throw new Error('Voice journal path is a folder, not a note.');
    // Recheck after file I/O: opening another journal would change the core recorder's save target.
    if(recorderState(bridge).recording===true&&this.app.workspace.getActiveFile()?.path!==path)throw new Error('Stop and save the current recording before switching journals.');
    const leaf=this.app.workspace.getLeaf('tab');await leaf.openFile(file,{active:true,state:{mode:'source'}});await this.app.workspace.revealLeaf(leaf);
    if(!record)return;
    const active=this.app.workspace.activeEditor;
    if(this.app.workspace.getActiveFile()?.path!==path||active?.file?.path!==path||!active.editor)throw new Error('Journal opened. Use Audio recorder: Start recording here after the editor is ready.');
    const last=active.editor.lastLine();active.editor.setCursor({line:last,ch:active.editor.getLine(last).length});
    requireRecorder(bridge);this.rememberVoiceOwner({path,seen:false,requestedAt:Date.now()});if(!bridge!.executeCommandById!('audio-recorder:start')){this.rememberVoiceOwner(null);throw new Error('Journal opened, but the recorder could not start. Use Audio recorder: Start recording manually.');}
    this.syncVoiceControls();new Notice('Recorder requested. Allow microphone access if asked. Use the floating Stop & save button when finished.');
  }
  async openDailyMarkdown(path:string):Promise<void>{const file=this.file(path);this.bypassDaily.add(path);try{await this.app.workspace.getLeaf('tab').openFile(file);}finally{this.bypassDaily.delete(path);}}
  private async ensureFolder(path:string):Promise<void>{const pieces=path.split('/');pieces.pop();let parent='';for(const piece of pieces){parent=parent?`${parent}/${piece}`:piece;if(!this.app.vault.getAbstractFileByPath(parent))await this.app.vault.createFolder(parent);}}
  async createNote(path=this.settings.path):Promise<void>{
    vaultPath(path);if(this.app.vault.getAbstractFileByPath(path)){new Notice('Note already exists. No content was replaced.');this.refresh();return;}
    await this.ensureFolder(path);await this.app.vault.create(path,routineStarter());this.refresh();new Notice('Markdown starter created with flexible morning defaults. Choose additional tasks in Pages.');
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
  async setState(state:unknown,result:ViewStateResult):Promise<void>{const data=(state&&typeof state==='object'?state:{}) as Record<string,unknown>;this.context={tracker:typeof data.tracker==='string'?vaultPath(data.tracker):this.plugin.settings.path,day:typeof data.date==='string'&&validDay(data.date)?data.date:localDay(),page:typeof data.page==='string'?data.page:'All',tab:['Today','Digest','Week','Pages','Goals','History'].includes(String(data.tab))?data.tab as SurfaceOptions['tab']:'Today',dailyNote:typeof data.dailyNote==='string'?vaultPath(data.dailyNote):undefined};if(this.surface)this.plugin.detach(this.surface);this.surface=this.plugin.attach(this.contentEl,this.context);await this.surface.refresh();await super.setState(state,result);}
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
    containerEl.createEl('h2',{text:'Sync safety'});new Setting(containerEl).setName('Primary phone checkpoints on this device').setDesc('Device-local preference. Enabled by default on mobile, off on desktop. Captures explicit checkbox actions, including unchecks. Use one primary phone; disagreements between primary devices need review.').addToggle(toggle=>toggle.setValue(this.plugin.primaryPhone).onChange(value=>{this.plugin.app.saveLocalStorage('color-sprint.primary-phone',value);this.plugin.primaryPhone=value;}));new Setting(containerEl).setName('Review sync and recovery').setDesc('Review pending planning proposals and restore phone checkbox states with a backup. Does not claim server synchronization.').addButton(button=>button.setButtonText('Sync review').onClick(()=>this.plugin.openSyncReview()));
    containerEl.createEl('h2',{text:'Reflections · dictate or type'});new Setting(containerEl).setName('Reflection journal folder').setDesc('Dated Markdown text journals. The existing Voice folder is retained for compatibility; no audio recording is needed.').addText(input=>input.setValue(this.plugin.settings.voiceFolder).onChange(async value=>{try{const folder=vaultPath(value,true);await this.plugin.saveData({...this.plugin.settings,voiceFolder:folder});this.plugin.settings.voiceFolder=folder;}catch{}}));
    containerEl.createEl('h2',{text:'Completion feedback'});for(const [key,label] of [['sound','Completion sounds'],['haptics','Haptics when supported'],['motion','Completion animations']] as const)new Setting(containerEl).setName(label).setDesc(key==='motion'?'Always respects system Reduce Motion.':key==='haptics'?'Uses vibration only when the device exposes it.':'Quiet synthesized chimes after successful saves.').addToggle(toggle=>toggle.setValue(this.plugin.settings.feedback[key]).onChange(async value=>{this.plugin.settings.feedback[key]=value;await this.plugin.saveData(this.plugin.settings);this.plugin.refresh();}));
  }
}
class SyncReviewModal extends Modal {
  private dispose:()=>void;
  constructor(app:App,plugin:ColorSprint,path:string){super(app);this.setTitle('Color Sprint · Sync review');const version=(app as App&{plugins?:{plugins?:Record<string,{manifest?:{version?:string}}>}}).plugins?.plugins?.['system3-relay']?.manifest?.version;this.dispose=mountSyncPanel(this.contentEl,{primary:plugin.primaryPhone,relay:version?`Relay ${version} detected locally. Check Relay's own Sync status for conflicts and transport state.`:'Relay status unavailable here. These are local recovery and planning checks, not server acknowledgments.',load:()=>plugin.syncStore.review(path),baseline:current=>plugin.syncStore.baseline(path,current),apply:async(proposal,current,keepCurrent)=>{await plugin.syncStore.apply(path,proposal,current,keepCurrent);plugin.refresh();new Notice('Planning proposal processed; current progress preserved. Relay delivery is not yet verified.');},restore:async review=>{await plugin.syncStore.restore(path,review.current,review.recovery);plugin.refresh();new Notice('Reviewed phone checkbox states restored. Backup kept; verify Relay on the other device.');},archive:()=>plugin.syncStore.archiveUnconfirmed(),open:target=>plugin.openNote(target)});}
  onClose():void{this.dispose();this.contentEl.empty();}
}
class ReflectionModal extends Modal {
  private component:Component;private dispose:()=>void;
  constructor(app:App,plugin:ColorSprint,day:string,path:string,private closed:()=>void){
    super(app);this.shouldRestoreSelection=false;this.setTitle(`Reflection · ${day}`);this.component=new Component();this.component.load();
    this.dispose=mountReflectionPanel(this.contentEl,{frame:this.modalEl,draft:plugin.getReflectionDraft(path),draftChanged:draft=>plugin.keepReflectionDraft(path,draft),save:draft=>plugin.saveReflection(path,day,draft),read:async()=>{const file=app.vault.getAbstractFileByPath(path);if(file&&!(file instanceof TFile))throw new Error('Reflection path is not a note.');return {path,text:file instanceof TFile?await app.vault.read(file):''};},renderMarkdown:(note,body)=>MarkdownRenderer.render(app,note.text,body,note.path,this.component),open:async()=>{await plugin.openVoiceJournal(day);this.close();},saved:()=>this.close()});
  }
  focusText():void{this.contentEl.querySelector('textarea')?.focus();}
  onClose():void{this.dispose();this.component.unload();this.closed();this.contentEl.empty();}
}
class VoiceReflectionModal extends Modal {
  private component:Component|null=null;private dispose:()=>void;
  constructor(app:App,private plugin:ColorSprint,private day:string){
    super(app);this.shouldRestoreSelection=false;this.setTitle(`Voice reflection · ${day}`);
    this.dispose=mountVoicePanel(this.contentEl,{day,state:plugin.voiceState(),getState:()=>plugin.voiceState(),stop:async()=>{this.close();await plugin.stopVoiceRecording();},read:()=>plugin.readVoiceReflection(day),renderMarkdown:async(note,body)=>{this.component=new Component();this.component.load();await MarkdownRenderer.render(app,note.text,body,note.path,this.component);},open:async record=>{if(record)requireRecorder(plugin.recorderBridge());this.close();await plugin.openVoiceJournal(day,record);},error:e=>plugin.error(e)});
  }
  onClose():void{this.dispose();this.component?.unload();this.component=null;this.contentEl.empty();}
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
class SubtaskModal extends FormModal {
  constructor(app:App,plugin:ColorSprint,task:Task,original?:Subtask,path=plugin.settings.path){
    super(app,original?'Edit roadmap step':'Add roadmap step');const sub:Subtask=original?{...original}:{id:`step-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,taskId:task.id,context:'-',minutes:10,title:'',definition:'',done:false,completed:'-'};
    this.field('Step','A concrete next action.',sub.title,v=>sub.title=v.trim());this.field('Suggested minutes','0 runs an open stopwatch.',String(sub.minutes),v=>sub.minutes=Number(v),'number');this.field('Context','- for all days; or a schedule detail such as 2020 Tax or Letters.',sub.context,v=>sub.context=v.trim()||'-');this.text('Done means','What visible result finishes this step?',sub.definition,v=>sub.definition=v.trim());this.save(()=>plugin.change(text=>{const current=parseBoard(text).subtasks.find(item=>item.id===sub.id);if(original&&JSON.stringify(current)!==JSON.stringify(original))throw new Error('This step changed in Markdown. Reopen it.');if(!Number.isFinite(sub.minutes)||sub.minutes<0||sub.minutes>1440)throw new Error('Use 0–1440 minutes.');return saveSubtask(text,sub);},path));
  }
}
class EntryModal extends FormModal {
  constructor(app:App,plugin:ColorSprint,task:Task,day:string,text:string,path=plugin.settings.path){
    super(app,`${task.title} · ${day}`);const board=parseBoard(text);const original=entryFor(board,task.id,day);const originalBlock=timeBlockFor(board,task.id,day);let detail=original?.detail||'';let start=originalBlock?.start||'',end=originalBlock?.end||'',timezone=originalBlock?.timezone||board.availability[0]?.timezone||'America/Chicago';
    this.text('Plan / actual result','Keep source assignments intact; add actual sets, reps, distances, evidence, or blockers here.',detail,v=>detail=v);
    this.field('Suggested start','24-hour local time, such as 19:00; leave both time fields empty for flexible.',start,v=>start=v,'time');this.field('Suggested end','Same day, after the start.',end,v=>end=v,'time');this.field('Time zone','Time zone used by the calendar block.',timezone,v=>timezone=v.trim());
    this.save(()=>plugin.change(current=>{const latest=parseBoard(current);const entry=entryFor(latest,task.id,day);const block=timeBlockFor(latest,task.id,day);if(JSON.stringify(entry)!==JSON.stringify(original)||JSON.stringify(block)!==JSON.stringify(originalBlock))throw new Error('This entry changed in Markdown. Reopen the latest version.');let next=setEntry(current,day,task.id,entry?.done||false,detail);if(start||end){const changed=start!==originalBlock?.start||end!==originalBlock?.end||timezone!==originalBlock?.timezone;next=saveTimeBlock(next,{date:day,taskId:task.id,start,end,timezone,status:changed?'suggested':originalBlock?.status||'suggested',eventId:originalBlock?.eventId||'-',eventUrl:originalBlock?.eventUrl||'-'});}else{if(block?.eventId&&block.eventId!=='-')throw new Error('This time has a calendar event. Change its time and reconcile the linked event before clearing it.');next=clearTimeBlock(next,task.id,day);}return next;},path));
  }
}
