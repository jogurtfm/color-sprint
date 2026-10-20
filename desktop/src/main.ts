import {app,BrowserWindow,Menu,Tray,nativeImage,ipcMain,dialog,Notification,shell,screen,powerMonitor} from 'electron';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {VaultStore,dueReminders,isQuiet,zoned,Action} from './core';
import {Settings,DEFAULTS,cleanSettings} from './settings';
import {RimController,Rect,RIM_PARTS} from './rim';
import {EdgeReveal} from './reveal';
import {TrackerSync} from './sync';
import {profileDirectory} from './profile';
import {EditingConsent} from './editing';
import {ObsidianBridge} from './bridge';
import {LauncherLibrary,windowsRoots,nativeTarget,launchApp,PRESETS} from './launcher';
import {randomUUID} from 'node:crypto';
import {presentMode,minimizeVisor} from './navigation';
import {inspectPluginBundle,installBundledPlugin} from './plugin-installer';
import {planned,entryFor,validDay,focusQueue,dailyWins} from '../../src/model';
import {queueNeedsAdvance} from '../../src/model';

const arg=(key:string)=>process.argv.find(x=>x.startsWith(`--${key}=`))?.slice(key.length+3);
const dataDir=profileDirectory(arg('data-dir'),process.env.LOCALAPPDATA,app.getPath('appData'));
app.setPath('userData',dataDir);app.setPath('sessionData',path.join(dataDir,'chromium'));app.setAppUserModelId(process.execPath);
const readOnly=process.argv.includes('--read-only'),testMode=process.argv.includes('--test-mode');
let visorFullscreen=!process.argv.includes('--windowed');
let settings:Settings={...DEFAULTS},store:VaultStore,main:BrowserWindow,tray:Tray,quitting=false,day='',selected='',notifyState='not tested',followToday=!arg('date');
const widgets=new Map<string,BrowserWindow>(),windows=new Set<BrowserWindow>();let seen=new Set<string>();
const index=path.join(__dirname,'index.html'),indexURL=pathToFileURL(index).href;
const configFile=path.join(dataDir,'settings.json'),remindersFile=path.join(dataDir,'reminders.json');
async function saveSettings(){await writeFile(configFile,JSON.stringify(settings,null,2));}
function snapshot(){const b=store.state.board;if(b&&!b.tasks.some(t=>t.id===selected))selected=b.tasks.find(t=>planned(b,t,day)&&!entryFor(b,t.id,day)?.done)?.id||b.tasks[0]?.id||'';const bridgeUnavailable=store.state.integration?.mode==='obsidian'&&!store.state.integration.ready;return {source:store.state,settings,day,selected,now:Date.now(),readOnly:readOnly||!settings.editing||bridgeUnavailable,forcedReadOnly:readOnly,notifyState,widgets:[...widgets.keys()],version:app.getVersion(),hudVisible:main&&!main.isDestroyed()?main.isVisible():false,rimVisible:Object.fromEntries(rim.visibility),syncMode:sync.mode,editingLocked:readOnly||bridgeUnavailable,bridgeFingerprint:bridge.fingerprint,launcher:launchers.view};}
function broadcast(){const s=snapshot();for(const w of windows)if(!w.isDestroyed())w.webContents.send('hud:state',s);}
function icon(){const size=32,bitmap=Buffer.alloc(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const radius=Math.hypot(x-15.5,y-15.5);if((radius>10&&radius<14)||(radius<3)){const i=(y*size+x)*4;bitmap[i]=236;bitmap[i+1]=220;bitmap[i+2]=64;bitmap[i+3]=255;}}return nativeImage.createFromBitmap(bitmap,{width:size,height:size});}
const rim=new RimController<BrowserWindow>((part,bounds)=>createWindow(part,bounds));
const workArea=()=>screen.getPrimaryDisplay().workArea;
const edgeReveal=new EdgeReveal();
const sync=new TrackerSync(()=>store,broadcast);
const editingConsent=new EditingConsent();
const bridge=new ObsidianBridge(dataDir,async url=>{if(testMode)throw new Error('External Obsidian bridge disabled in test mode.');await shell.openExternal(url);});
const newStore=(source:string)=>new VaultStore(source,path.join(dataDir,'backups'),(text,action,context)=>bridge.send(text,action,context));
const launchers=new LauncherLibrary(path.join(dataDir,'launchers.json'));
const launchRoots=windowsRoots(process.env);
const launcherLast=new Map<string,number>();
async function refreshLaunchers(){await launchers.refresh(launchRoots,async file=>/\.exe$/i.test(file)?(await app.getFileIcon(file,{size:'large'})).toDataURL():'');broadcast();}
async function pickLauncherApp(){const result=await dialog.showOpenDialog(main,{title:'Choose a trusted application or normal app shortcut',properties:['openFile'],filters:[{name:'Windows apps',extensions:['exe','lnk']}]});return result.canceled?'':nativeTarget(result.filePaths[0]);}
async function enableEditing(){await store.load();if(store.state.error)throw new Error(store.state.error);const integration=store.state.integration;if(integration?.mode==='obsidian'&&!integration.ready)throw new Error(integration.issues.join(' '));await editingConsent.ensure(settings.editing,readOnly,async()=>{const result=await dialog.showMessageBox({type:'question',buttons:['Enable updates','Keep read-only'],defaultId:1,cancelId:1,message:'Enable Color Sprint focus controls?',detail:'Connected tracker:\n'+settings.source+(integration?.mode==='obsidian'?'\n\nActions are signed and sent to Windows Obsidian. Approve pairing there once. The HUD never replaces this tracker; Obsidian validates and saves changes through its own queue. Planning proposals remain review-only.':'\n\nStandalone tracker: originals are backed up and revisions checked. Avoid concurrent edits.')+'\n\nStart records a timer; only Finish checks off completed work.'});return result.response===0;},async()=>{const previous=settings.editing;settings.editing=true;try{await saveSettings();}catch(error){settings.editing=previous;throw error;}broadcast();});}
function activateMode(foreground=false){
  if(settings.desktopMode==='rim')edgeReveal.peek(Date.now(),7000);
  presentMode(settings.desktopMode,main,rim,workArea(),foreground,!visorFullscreen);
  broadcast();
}
async function setMode(mode:'rim'|'visor',foreground=true){const previous=settings.desktopMode;settings.desktopMode=mode;try{await saveSettings();}catch(error){settings.desktopMode=previous;throw error;}activateMode(foreground);}
function reveal(){if(!main.isDestroyed()){void sync.refresh(true);activateMode(true);}}
function hideAll(){main.hide();rim.hide();for(const w of widgets.values())w.hide();broadcast();}
async function toggleFullscreen(){
  if(settings.desktopMode==='rim'){visorFullscreen=true;await setMode('visor');}
  else{visorFullscreen=!main.isFullScreen();main.setFullScreen(visorFullscreen);broadcast();}
}
function cue(title:string,body:string,kind='reminder',test=false){
  if(!test&&isQuiet(Date.now(),settings.timezone,settings.quietHours))return;
  if(rim.active)edgeReveal.peek(Date.now());
  // Only the main HUD owns sound, even when several widgets are open.
  main.webContents.send('hud:cue',{title,body,kind,sound:settings.sound,volume:settings.volume});
  for(const w of windows)if(w!==main&&!w.isDestroyed())w.webContents.send('hud:cue',{title,body,kind,sound:false,volume:0});
  if(!settings.notifications&&!test)return;
  if(testMode){notifyState='test mode · native delivery suppressed';broadcast();return;}
  if(Notification.isSupported())try{const n=new Notification({title:`Color Sprint · ${title}`,body,silent:true,icon:icon()});n.on('click',reveal);n.on('show',()=>{notifyState='Windows reported shown';broadcast();});n.on('failed',()=>{notifyState='Toast unavailable · tray fallback requested';tray.displayBalloon({title,content:body,icon:icon()});broadcast();});n.show();notifyState='requested · Windows may suppress';}catch{notifyState='tray fallback requested';tray.displayBalloon({title,content:body,icon:icon()});}
  else {notifyState='tray fallback requested';tray.displayBalloon({title,content:body,icon:icon()});}
  broadcast();
}
function secure(window:BrowserWindow){windows.add(window);window.on('closed',()=>windows.delete(window));window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(indexURL))event.preventDefault();});window.webContents.session.setPermissionRequestHandler((_c,_p,done)=>done(false));window.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&input.key==='F11'){void toggleFullscreen();event.preventDefault();}});}
function createWindow(mode='hud',bounds?:Rect){
  const edge=mode.startsWith('rim-'),widget=mode!=='hud';
  const window=new BrowserWindow({
    ...(bounds||{width:widget?(mode==='focus'?390:440):1600,height:widget?(mode==='focus'?475:640):980}),
    minWidth:edge?100:widget?340:1040,minHeight:edge?40:widget?380:720,show:false,frame:false,transparent:true,
    backgroundColor:'#00000000',title:'Color Sprint · '+mode,icon:icon(),alwaysOnTop:widget||settings.pin,
    resizable:!edge,maximizable:!edge,minimizable:!edge,fullscreenable:!edge,skipTaskbar:widget,hasShadow:!edge,autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,backgroundThrottling:true,autoplayPolicy:'no-user-gesture-required',devTools:!app.isPackaged}
  });
  secure(window);void window.loadFile(index,{query:{mode}});
  if(!widget)window.on('close',event=>{if(!quitting){event.preventDefault();hideAll();}});
  else if(!edge){widgets.set(mode,window);window.on('closed',()=>{widgets.delete(mode);broadcast();});window.once('ready-to-show',()=>{if(!process.argv.includes('--hidden'))window.showInactive();});}
  else window.on('close',event=>{if(!quitting){event.preventDefault();hideAll();}});
  window.webContents.on('did-finish-load',()=>{if(edge&&rim.active){edgeReveal.peek(Date.now(),7000);}broadcast();});window.on('focus',()=>void sync.refresh(true));
  const visibilityChanged=()=>{if(main)broadcast();};
  window.on('show',visibilityChanged);window.on('hide',visibilityChanged);window.on('minimize',visibilityChanged);window.on('restore',visibilityChanged);
  return window;
}
function trusted(event:Electron.IpcMainInvokeEvent){const frame=event.senderFrame;if(!frame||frame!==event.sender.mainFrame||![...windows].some(w=>w.webContents===event.sender)||!(frame.url===indexURL||frame.url.startsWith(`${indexURL}?`)))throw new Error('Untrusted app request.');}
const handle=(name:string,fn:(...args:any[])=>any)=>ipcMain.handle(name,async(event,...args)=>{trusted(event);try{return {ok:true,value:await fn(...args)};}catch(error){return {ok:false,error:error instanceof Error?error.message:String(error)};}});
async function reload(){await sync.refresh(true);}
let advancingStandalone=false;
async function advanceStandaloneQueue(){
  const board=store.state.board,timer=board?.timer;
  // Protected vaults advance inside Obsidian. The HUD never competes with that writer.
  if(advancingStandalone||readOnly||!settings.editing||store.state.integration?.mode!=='standalone'||!timer||timer.owner!=='standalone'||!queueNeedsAdvance(board!))return;
  advancingStandalone=true;try{await store.edit(store.state.revision,{kind:'queue-advance',timerId:timer.id,cursor:timer.cursor},true);broadcast();cue('Queue advanced','The next focus target is ready. Completion stays explicit.','timer');}catch{/* A stale revision is re-read on the next normal sync; never replay a write. */}finally{advancingStandalone=false;}
}
async function boot(){await mkdir(dataDir,{recursive:true});try{settings=cleanSettings(JSON.parse(await readFile(configFile,'utf8')));}catch{}if(arg('source'))settings.source=path.resolve(arg('source')!);if(process.argv.includes('--visor')||process.argv.includes('--windowed'))settings.desktopMode='visor';try{const list=JSON.parse(await readFile(remindersFile,'utf8'));if(Array.isArray(list))seen=new Set(list.filter(x=>typeof x==='string').slice(-400));}catch{}
  await launchers.load();await launchers.refresh(launchRoots,async file=>/\.exe$/i.test(file)?(await app.getFileIcon(file,{size:'large'})).toDataURL():'');
  if(!settings.source)settings.source=path.join(app.getPath('documents'),'Obsidian','Sync','Color Sprint.md');
  await bridge.load();store=newStore(settings.source);await store.load();day=arg('date')||zoned(Date.now(),settings.timezone).date;if(!validDay(day))day=zoned(Date.now(),settings.timezone).date;
  main=createWindow();Menu.setApplicationMenu(null);tray=new Tray(icon());tray.setToolTip('Color Sprint HUD · live Markdown');tray.on('double-click',reveal);
  const trayMenu=Menu.buildFromTemplate([
    {label:'Show desktop rim',click:()=>void setMode('rim',false)},
    {label:'Open full visor',click:()=>void setMode('visor')},
    {label:'Hide all overlays',click:hideAll},
    {id:'edge-auto-hide',label:'Auto-hide rim at screen edges',type:'checkbox',checked:settings.autoHide,click:item=>{settings.autoHide=item.checked;edgeReveal.peek(Date.now());void saveSettings();broadcast();}},
    {label:'Refresh tracker now',click:()=>void sync.refresh(true)},
    {label:'Focus widget',click:()=>{const w=widgets.get('focus');if(w)w.showInactive();else createWindow('focus');}},
    {label:'Day widget',click:()=>{const w=widgets.get('day');if(w)w.showInactive();else createWindow('day');}},
    {type:'separator'},{label:'Quit Color Sprint HUD',click:()=>{quitting=true;app.quit();}}
  ]);tray.setContextMenu(trayMenu);
  handle('hud:state',()=>snapshot());handle('hud:select',(id:string)=>{if(!store.state.board?.tasks.some(t=>t.id===id))throw new Error('Unknown task.');selected=id;broadcast();return snapshot();});handle('hud:date',(value:string)=>{if(typeof value!=='string'||!validDay(value))throw new Error('Choose a valid date.');day=value;followToday=day===zoned(Date.now(),settings.timezone).date;broadcast();return snapshot();});
  handle('hud:action',async(hash:string,action:Action)=>{if(typeof hash!=='string'||hash.length!==64)throw new Error('Refresh the source first.');
    if(action?.kind==='effort-profile'&&store.state.integration?.mode==='obsidian'&&store.state.integration.pluginVersion.startsWith('0.')&&Number(store.state.integration.pluginVersion.split('.')[1])<14)throw new Error('Update Color Sprint to 0.14.0+ in Windows Obsidian for effort profiles.');if(['move-task','obligation-done'].includes(action?.kind)&&store.state.integration?.mode==='obsidian'&&store.state.integration.pluginVersion.startsWith('0.')&&Number(store.state.integration.pluginVersion.split('.')[1])<13)throw new Error('Update Color Sprint to 0.13.0+ in Windows Obsidian for obligation moves.');
    if((action?.kind?.startsWith('queue-')||['goal-check','subtask-check','workout-log'].includes(action?.kind))&&store.state.integration?.mode==='obsidian'&&store.state.integration.pluginVersion.startsWith('0.')&&Number(store.state.integration.pluginVersion.split('.')[1])<12)throw new Error('Update Color Sprint to 0.12.0+ in Windows Obsidian for Quick Queue and workspace controls.');if(['start','queue-add','queue-start'].includes(action?.kind)&&!settings.editing)await enableEditing();const before=store.state.board?dailyWins(store.state.board,day):null;await store.edit(hash,action,!readOnly&&settings.editing);broadcast();const after=store.state.board?dailyWins(store.state.board,day):null;if(before&&after&&after.tasks+after.subtasks>before.tasks+before.subtasks)cue('Progress recorded','One more real win. Keep the momentum.','complete');return snapshot();});
  handle('hud:settings',async(patch:Record<string,unknown>)=>{if(!patch||typeof patch!=='object')throw new Error('Invalid settings.');for(const [key,value] of Object.entries(patch)){if(!['editing','sound','notifications','quietHours','motion','volume','pin','timezone','desktopMode','autoHide','launcherEnabled','dockPinned','visorOpacity','cinema'].includes(key)||typeof value!==typeof settings[key as keyof Settings])throw new Error('Unsupported preference.');}if('desktopMode' in patch&&patch.desktopMode!=='rim'&&patch.desktopMode!=='visor')throw new Error('Choose rim or visor mode.');if('cinema' in patch&&!['cinematic','balanced','quiet'].includes(patch.cinema as string))throw new Error('Choose a supported visual density.');if(patch.editing===true)await enableEditing();settings=cleanSettings({...settings,...patch});const edgeItem=trayMenu.getMenuItemById('edge-auto-hide');if(edgeItem)edgeItem.checked=settings.autoHide;await saveSettings();main.setAlwaysOnTop(settings.desktopMode==='visor'||settings.pin);if('desktopMode' in patch)activateMode(true);broadcast();});
  handle('hud:command',async(command:string)=>{switch(command){case 'command-deck':await setMode('visor');main.webContents.send('hud:open-command-deck');break;case 'taskbar-settings':if(testMode)throw new Error('External launches disabled in test mode.');await shell.openExternal('ms-settings:taskbar');await setMode('rim',false);break;case 'launcher-settings':await setMode('visor');main.webContents.send('hud:open-settings');break;case 'enable-edits':await enableEditing();break;case 'rim':await setMode('rim',false);break;case 'visor':await setMode('visor');break;case 'configure':await setMode('visor');main.webContents.send('hud:open-settings');break;case 'fullscreen':await toggleFullscreen();break;case 'minimize':minimizeVisor(main);break;case 'hide':case 'hide-all':hideAll();break;case 'show':await setMode('visor');break;case 'quit':quitting=true;app.quit();break;case 'refresh':await reload();broadcast();break;
    case 'focus-widget':case 'day-widget':{const mode=command==='focus-widget'?'focus':'day';const existing=widgets.get(mode);if(existing&&!existing.isDestroyed()){if(existing.isVisible())existing.close();else existing.showInactive();}else createWindow(mode);broadcast();break;}
    case 'choose-source':{const result=await dialog.showOpenDialog(main,{title:'Connect Color Sprint Markdown',properties:['openFile'],filters:[{name:'Color Sprint tracker',extensions:['md']}]});if(!result.canceled&&result.filePaths[0]){const candidate=newStore(result.filePaths[0]);await candidate.load();if(candidate.state.error)throw new Error(candidate.state.error);settings.source=result.filePaths[0];settings.editing=false;await saveSettings();store=candidate;sync.connect();selected='';await sync.refresh(true);broadcast();}break;}
    case 'install-plugin':{if(readOnly||testMode)throw new Error('Plugin installation is disabled in this locked/test launch.');const context=store.state.integration;if(!context?.vault)throw new Error('Connect your Obsidian vault tracker first.');const bundle=path.join(__dirname,'obsidian-plugin');const payload=await inspectPluginBundle(bundle);const choice=await dialog.showMessageBox(main,{type:'question',buttons:[`Install ${payload.version}`,'Cancel'],defaultId:1,cancelId:1,message:'Close Obsidian before updating Color Sprint.',detail:`Vault: ${context.vault}\n\nConfirm Obsidian is closed, then choose Install. Only main.js, styles.css and manifest.json are replaced. Existing files are backed up locally; notes, data.json and plugin settings are untouched. No network download is used.\n\nAfterward, reopen Obsidian. Enable focus controls and approve HUD pairing there once.`});if(choice.response!==0)break;const result=await installBundledPlugin(context.vault,bundle,dataDir);await sync.refresh(true);notifyState=`Plugin ${result.version} ${result.changed?'installed':'already current'} · reopen Windows Obsidian`;broadcast();await dialog.showMessageBox(main,{type:'info',message:notifyState,detail:result.backup?`Previous plugin files: ${result.backup}\n\nOpen Windows Obsidian before starting focus.`:'Plugin files were not changed.'});break;}
    case 'open-source':{const error=await shell.openPath(settings.source);if(error)throw new Error(error);break;}
    case 'sync-review':case 'open-obsidian':{const context=store.state.integration;if(!context?.vault)throw new Error('Connect a tracker inside an Obsidian vault.');if(testMode)throw new Error('External Obsidian bridge disabled in test mode.');const route=command==='sync-review'?'color-sprint-hud':'open';await shell.openExternal(`obsidian://${route}?vault=${encodeURIComponent(path.basename(context.vault))}&${command==='sync-review'?'tracker':'file'}=${encodeURIComponent(context.tracker)}${command==='sync-review'?'&review=1':''}`);break;}
    case 'voice':{const parent=path.dirname(settings.source);const vault=path.basename(path.dirname(parent));await shell.openExternal(`obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(`Sync/Reflection/Voice/${day}.md`)}`);break;}
    case 'test-cue':cue('Systems online','Your next action is one deliberate choice.','timer',true);break;
    case 'startup-on':case 'startup-off':if(testMode||readOnly)throw new Error('Startup changes are disabled in this test/read-only launch.');app.setLoginItemSettings({openAtLogin:command==='startup-on',path:process.execPath,args:app.isPackaged?[]:[app.getAppPath()]});break;
    default:throw new Error('Unknown window command.');}return snapshot();});
  let launcherQueue:Promise<unknown>=Promise.resolve();
  handle('hud:launcher',(request:unknown)=>{
    const operation=launcherQueue.catch(()=>{}).then(async()=>{
      if(!request||typeof request!=='object')throw new Error('Invalid launcher request.');
      const r=request as {kind:string;id?:string;label?:string};
      if(!['launch','choose','add','remove','auto','rename','scan'].includes(r.kind))throw new Error('Unsupported launcher action.');
      if(!['add','scan'].includes(r.kind)&&!launchers.shortcuts.some(item=>item.id===r.id))throw new Error('Unknown app shortcut.');
      if(r.kind==='launch'){
        if(testMode)throw new Error('External launches disabled in test mode.');
        const id=r.id!,now=Date.now();if(now-(launcherLast.get(id)||0)<2000)throw new Error('Launch already requested. Give the app a moment.');launcherLast.set(id,now);
        try{await launchApp(launchers.view.items.find(item=>item.id===id),{openFile:file=>shell.openPath(file),openURL:url=>shell.openExternal(url),shortcut:file=>{const link=shell.readShortcutLink(file);return {target:link.target,args:link.args||''};},exists:async file=>{try{return (await stat(file)).isFile();}catch{return false;}}});}catch(error){launcherLast.delete(id);throw error;}
        if(settings.desktopMode==='visor')await setMode('rim',false);else edgeReveal.peek(Date.now());
      }else if(r.kind==='choose'||r.kind==='add'){
        await setMode('visor');main.webContents.send('hud:open-settings');const file=await pickLauncherApp();if(file)await launchers.update(items=>r.kind==='add'?[...items,{id:'app-'+randomUUID(),label:path.basename(file,path.extname(file)).slice(0,50),target:file,glyph:'A',color:'#80d8ee'}]:items.map(item=>item.id===r.id?{...item,target:file}:item));
        await refreshLaunchers();
      }else if(r.kind==='remove'){await launchers.update(items=>items.filter(item=>item.id!==r.id));await refreshLaunchers();}
      else if(r.kind==='rename'){if(typeof r.label!=='string')throw new Error('Enter a shortcut name.');await launchers.update(items=>items.map(item=>item.id===r.id?{...item,label:r.label!}:item));await refreshLaunchers();}
      else if(r.kind==='auto'){if(!PRESETS.some(p=>p.id===r.id))throw new Error('Choose an executable for custom apps.');await launchers.update(items=>items.map(item=>item.id===r.id?{...item,target:''}:item));await refreshLaunchers();}
      else await refreshLaunchers();
      return snapshot();
    });launcherQueue=operation;return operation;
  });
  const reflow=()=>rim.reflow(workArea());screen.on('display-metrics-changed',reflow);screen.on('display-added',reflow);screen.on('display-removed',reflow);
  if(!process.argv.includes('--hidden'))activateMode(false);
  sync.start();powerMonitor.on('resume',()=>void sync.refresh(true));
  app.on('before-quit',()=>sync.stop());
  setInterval(()=>{if(!rim.active)return;const display=screen.getPrimaryDisplay(),visible=edgeReveal.visible(display.workArea,screen.getCursorScreenPoint(),Date.now(),settings.autoHide,display.bounds);if(settings.launcherEnabled&&settings.dockPinned&&!visible.includes('rim-focus'))visible.push('rim-focus');let changed=false;for(const part of RIM_PARTS)changed=rim.setVisible(part,visible.includes(part),settings.motion)||changed;if(changed)broadcast();},80);
  setInterval(()=>{if(followToday)day=zoned(Date.now(),settings.timezone).date;broadcast();void advanceStandaloneQueue();if(!store.state.board||store.state.error)return;for(const reminder of dueReminders(store.state.board,Date.now(),settings.timezone)){if(seen.has(reminder.id))continue;seen.add(reminder.id);if(seen.size>400)seen=new Set([...seen].slice(-400));void writeFile(remindersFile,JSON.stringify([...seen])).catch(()=>{});cue(reminder.title,reminder.body,reminder.kind);}},1000);
}
if(!app.requestSingleInstanceLock()){app.quit();}else{app.on('second-instance',()=>{if(main)reveal();});app.on('before-quit',()=>quitting=true);app.on('window-all-closed',()=>{});void app.whenReady().then(boot).catch(error=>{console.error(error);app.exit(1);});}
