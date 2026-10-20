import {contextBridge,ipcRenderer} from 'electron';
contextBridge.exposeInMainWorld('hud',{
  spotify:(action:unknown)=>ipcRenderer.invoke('hud:spotify',action),
  onOpenPrograms:(fn:()=>void)=>{const listener=()=>fn();ipcRenderer.on('hud:open-programs',listener);return ()=>ipcRenderer.removeListener('hud:open-programs',listener);},
  onOpenSettings:(fn:()=>void)=>{const listener=()=>fn();ipcRenderer.on('hud:open-settings',listener);return ()=>ipcRenderer.removeListener('hud:open-settings',listener);},
  onOpenCommandDeck:(fn:()=>void)=>{const listener=()=>fn();ipcRenderer.on('hud:open-command-deck',listener);return ()=>ipcRenderer.removeListener('hud:open-command-deck',listener);},
  launcher:(request:unknown)=>ipcRenderer.invoke('hud:launcher',request),
  state:()=>ipcRenderer.invoke('hud:state'),
  action:(revision:string,action:unknown)=>ipcRenderer.invoke('hud:action',revision,action),
  select:(taskId:string)=>ipcRenderer.invoke('hud:select',taskId),
  date:(date:string)=>ipcRenderer.invoke('hud:date',date),
  settings:(patch:unknown)=>ipcRenderer.invoke('hud:settings',patch),
  command:(command:string)=>ipcRenderer.invoke('hud:command',command),
  onState:(fn:(state:unknown)=>void)=>{const listener=(_event:unknown,state:unknown)=>fn(state);ipcRenderer.on('hud:state',listener);return ()=>ipcRenderer.removeListener('hud:state',listener);},
  onCue:(fn:(cue:unknown)=>void)=>{const listener=(_event:unknown,cue:unknown)=>fn(cue);ipcRenderer.on('hud:cue',listener);return ()=>ipcRenderer.removeListener('hud:cue',listener);}
});
