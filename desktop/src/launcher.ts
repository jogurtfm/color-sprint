import {readFile,writeFile,mkdir,rename,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export interface Shortcut {id:string;label:string;target:string;glyph:string;color:string}
export interface LaunchItem extends Shortcut {kind:'file'|'web'|'missing';icon:string;automatic:boolean}
export interface LauncherView {items:LaunchItem[];warning:string}
export const PRESETS:Shortcut[]=[
  {id:'blender',label:'Blender',target:'',glyph:'B',color:'#f6aa6f'},
  {id:'notepad',label:'Notepad++',target:'',glyph:'N+',color:'#b8e895'},
  {id:'fl-studio',label:'FL Studio',target:'',glyph:'FL',color:'#f6c16e'},
  {id:'reaper',label:'REAPER',target:'',glyph:'R',color:'#82d8ef'},
  {id:'discord',label:'Discord',target:'',glyph:'D',color:'#9baaff'},
  {id:'handbrake',label:'HandBrake',target:'',glyph:'HB',color:'#a5cda6'},
  {id:'obs',label:'OBS Studio',target:'',glyph:'O',color:'#b9d0df'},
  {id:'spotify',label:'Spotify',target:'',glyph:'S',color:'#8ac9ac'}
];
const blockedExe=/^(cmd|powershell|pwsh|wscript|cscript|mshta|rundll32|regsvr32|regedit)\.exe$/i;
export function nativeTarget(value:string):string{
  if(typeof value!=='string'||value.length>2048||/[\x00-\x1f"<>|]/.test(value)||!path.win32.isAbsolute(value)||!value.match(/^[a-z]:\\/i))throw new Error('Choose a local Windows application or shortcut.');
  if(!/\.(exe|lnk)$/i.test(value)||blockedExe.test(path.win32.basename(value)))throw new Error('Only app .exe files and .lnk shortcuts are supported, not scripts or command interpreters.');
  return path.win32.normalize(value);
}
export function resolvedShortcut(target:string,args:string):void{
  nativeTarget(target);if(!/\.exe$/i.test(target))throw new Error('The shortcut must point to an application executable.');
  if(args.trim()&&!(path.win32.basename(target).toLowerCase()==='explorer.exe'&&/^"?shell:AppsFolder\\[a-z0-9._!-]+"?$/i.test(args.trim())))throw new Error('This shortcut has launch arguments. Choose the application .exe directly instead.');
}
export function cleanShortcuts(value:unknown):Shortcut[]{
  if(!Array.isArray(value)||value.length>24)throw new Error('Launcher configuration needs at most 24 app shortcuts.');
  const ids=new Set<string>();return value.map(raw=>{const x=raw as Shortcut;
    if(!x||!/^[-a-z0-9]{1,80}$/.test(x.id)||ids.has(x.id)||typeof x.label!=='string'||!x.label.trim()||x.label.length>50||/[\x00-\x1f]/.test(x.label))throw new Error('Invalid launcher label or ID.');
    ids.add(x.id);if(x.target)nativeTarget(x.target);
    return {id:x.id,label:x.label.trim(),target:x.target||'',glyph:typeof x.glyph==='string'?x.glyph.slice(0,2):x.label.slice(0,1),color:typeof x.color==='string'&&/^#[a-f0-9]{6}$/i.test(x.color)?x.color:'#80d8ee'};
  });
}
export interface SearchRoots {programs:string[];local:string;roaming?:string;menus:string[]}
export function windowsRoots(env:Record<string,string|undefined>):SearchRoots{return {
  programs:[env.ProgramW6432,env.ProgramFiles,env['ProgramFiles(x86)']].filter((x):x is string=>!!x&&path.win32.isAbsolute(x)).filter((v,i,a)=>a.indexOf(v)===i),
  local:env.LOCALAPPDATA||'',roaming:env.APPDATA||'',menus:[env.ProgramData?path.join(env.ProgramData,'Microsoft/Windows/Start Menu/Programs'):'',env.APPDATA?path.join(env.APPDATA,'Microsoft/Windows/Start Menu/Programs'):''].filter(Boolean)
};}
const exists=async(file:string)=>{try{return (await stat(file)).isFile();}catch{return false;}};
const matchers:Record<string,RegExp>={blender:/^Blender(?: [\d.]+)?\.lnk$/i,notepad:/^Notepad\+\+\.lnk$/i,'fl-studio':/^FL Studio(?: [\d.]+)?\.lnk$/i,reaper:/^REAPER(?: \(x64\))?\.lnk$/i,discord:/^Discord\.lnk$/i,spotify:/^Spotify\.lnk$/i,handbrake:/^HandBrake\.lnk$/i,obs:/^OBS Studio(?: \(64bit\))?\.lnk$/i};
export async function discoverCandidates(roots:SearchRoots):Promise<Record<string,string[]>>{
  const found:Record<string,string[]>={};for(const p of PRESETS)found[p.id]=[];
  const add=async(id:string,file:string)=>{if(await exists(file))found[id].push(file);};
  for(const root of roots.programs){
    await add('reaper',path.join(root,'REAPER (x64)/reaper.exe'));await add('reaper',path.join(root,'REAPER/reaper.exe'));await add('notepad',path.join(root,'Notepad++/notepad++.exe'));
    await add('handbrake',path.join(root,'HandBrake/HandBrake.exe'));await add('obs',path.join(root,'obs-studio/bin/64bit/obs64.exe'));await add('spotify',path.join(root,'Spotify/Spotify.exe'));
    for(const [folder,id,pattern,exe] of [['Blender Foundation','blender',/^Blender(?: [\d.]+)?$/i,'blender.exe'],['Image-Line','fl-studio',/^FL Studio(?: [\d.]+)?$/i,'FL64.exe']] as const){
      const parent=path.join(root,folder);try{const dirs=await readdir(parent,{withFileTypes:true});for(const dir of dirs.filter(d=>d.isDirectory()&&pattern.test(d.name)).sort((a,b)=>b.name.localeCompare(a.name,undefined,{numeric:true})))await add(id,path.join(parent,dir.name,exe));}catch{}
    }
  }
  if(roots.local){const discord=path.join(roots.local,'Discord');try{for(const dir of (await readdir(discord,{withFileTypes:true})).filter(d=>d.isDirectory()&&/^app-[\d.]+$/.test(d.name)).sort((a,b)=>b.name.localeCompare(a.name,undefined,{numeric:true})))await add('discord',path.join(discord,dir.name,'Discord.exe'));}catch{}await add('discord',path.join(discord,'Discord.exe'));}
  let visited=0;async function menu(dir:string,depth:number){if(depth>3||visited>5000)return;let entries;try{entries=await readdir(dir,{withFileTypes:true});}catch{return;}for(const e of entries){if(++visited>5000)return;const file=path.join(dir,e.name);if(e.isDirectory())await menu(file,depth+1);else for(const [id,re] of Object.entries(matchers))if(re.test(e.name))found[id].push(file);}}
  for(const root of roots.menus)await menu(root,0);
  // Prefer executables, then newest normal launcher links. Reset/uninstall/project links never match.
  if(roots.roaming)await add('spotify',path.join(roots.roaming,'Spotify/Spotify.exe'));
  for(const id of Object.keys(found)){const files=found[id].filter(p=>/\.exe$/i.test(p)),shortcuts=found[id].filter(p=>/\.lnk$/i.test(p)).sort((a,b)=>path.basename(b).localeCompare(path.basename(a),undefined,{numeric:true})||a.localeCompare(b));found[id]=[...new Set([...files,...shortcuts])];}
  return found;
}
export class LauncherLibrary {
  shortcuts:Shortcut[]=PRESETS.map(p=>({...p}));view:LauncherView={items:[],warning:''};private warning='';
  constructor(private filename:string){}
  async load(){try{const raw=JSON.parse(await readFile(this.filename,'utf8'));this.shortcuts=cleanShortcuts(raw.shortcuts);if(raw.version!==2){const retained=this.shortcuts.filter(p=>p.id!=='chatgpt');const additions=PRESETS.filter(p=>['discord','handbrake','obs','spotify'].includes(p.id)&&!retained.some(x=>x.id===p.id));await this.update(()=>[...retained,...additions].slice(0,24));}}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')this.warning='Saved launcher settings could not be read or upgraded. Original file preserved; review app shortcuts.';}}
  async refresh(roots:SearchRoots,icon?:(file:string)=>Promise<string>){const candidates=await discoverCandidates(roots);const items:LaunchItem[]=[];
    for(const config of this.shortcuts){const automatic=!config.target,target=config.target||candidates[config.id]?.[0]||'',present=target&&await exists(target);let image='';if(present&&icon)try{image=await icon(target);}catch{}
      if(config.id==='chatgpt')continue;
      items.push({...config,target,kind:present?'file':'missing',icon:/^data:image\/(png|jpeg|webp);base64,/.test(image)?image:'',automatic});
    }this.view={items,warning:this.warning};return this.view;
  }
  async update(change:(items:Shortcut[])=>Shortcut[]){const next=cleanShortcuts(change(this.shortcuts.map(s=>({...s}))));await mkdir(path.dirname(this.filename),{recursive:true});let original='';try{original=await readFile(this.filename,'utf8');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}if(original)await writeFile(this.filename+'.backup-'+Date.now()+'-'+randomUUID(),original,{flag:'wx'});
    const temp=this.filename+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify({version:2,shortcuts:next},null,2),{flag:'wx'});await rename(temp,this.filename);this.shortcuts=next;this.warning='';
  }
}
export async function launchApp(item:LaunchItem|undefined,adapters:{openFile:(file:string)=>Promise<string>;openURL:(url:string)=>Promise<void>;shortcut:(file:string)=>{target:string;args:string};exists:(file:string)=>Promise<boolean>}){
  if(!item)throw new Error('Unknown launcher shortcut.');
  if(item.kind==='web')throw new Error('Web launchers are not supported. Choose a local app.');
  if(item.kind==='missing')throw new Error('App not found. Choose its executable in App launcher settings.');
  const file=nativeTarget(item.target);if(!await adapters.exists(file))throw new Error('App moved or was removed. Choose its new executable.');
  if(/\.lnk$/i.test(file)){const link=adapters.shortcut(file);resolvedShortcut(link.target,link.args);if(!await adapters.exists(link.target))throw new Error('Shortcut target is missing. Choose the app executable.');}
  const error=await adapters.openFile(file);if(error)throw new Error(error);
}
