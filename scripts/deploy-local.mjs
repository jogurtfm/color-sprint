// Local-only deploy. Never changes ACLs, security settings, notes or plugin data.json.
import {readFile,writeFile,mkdir,copyFile,cp,lstat,realpath,rename,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {installBundledPlugin} from '../desktop/src/plugin-installer.ts';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FILES=['main.js','styles.css','manifest.json'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const same=(a,b)=>path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase();
async function dir(folder,create=false){if(!path.isAbsolute(folder))throw new Error('Absolute target required.');if(create)await mkdir(folder,{recursive:true});const s=await lstat(folder);if(!s.isDirectory()||s.isSymbolicLink()||!same(await realpath(folder),folder))throw new Error('Refusing linked/nonordinary deployment directory.');}
async function atomic(file,bytes){const temp=file+'.deploy-'+randomUUID()+'.tmp';await writeFile(temp,bytes,{flag:'wx'});await rename(temp,file);}
export function localPaths(local=process.env.LOCALAPPDATA){if(!local||!path.isAbsolute(local))throw new Error('LOCALAPPDATA unavailable.');return {profile:path.join(local,'Color Sprint HUD'),hudRoot:path.join(local,'Programs','Color Sprint HUD')};}
export async function configureTargets(vault,profile,hudRoot){await dir(vault);await dir(path.join(vault,'.obsidian'));await dir(profile,true);if(!path.isAbsolute(hudRoot))throw new Error('Absolute HUD target required.');const config={schema:1,vault:path.resolve(vault),hudRoot:path.resolve(hudRoot)};await atomic(path.join(profile,'deploy-targets.json'),JSON.stringify(config,null,2)+'\n');return config;}
export function runningApps(){const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"@(Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object { $_.Name -in @('Obsidian.exe','Color Sprint HUD.exe') } | Select-Object ProcessId,Name,ExecutablePath,CommandLine) | ConvertTo-Json -Compress"],{encoding:'utf8',windowsHide:true,timeout:15000});if(r.status!==0||r.error)throw new Error('Could not safely inspect running apps. Deployment stopped.');const value=r.stdout.trim();if(!value)return [];const result=JSON.parse(value);return Array.isArray(result)?result:[result];}
export async function deployPlugin({root=ROOT,vault,profile,processes=runningApps}){
  if((await processes()).some(p=>p.Name.toLowerCase()==='obsidian.exe'))return {status:'pending',reason:'Quit PC Obsidian before plugin replacement. No plugin files changed.'};
  await dir(profile,true);const staging=path.join(profile,'deploy-staging',randomUUID());await dir(staging,true);const hashes={};
  for(const name of FILES){const source=path.join(root,name),s=await lstat(source);if(!s.isFile()||s.isSymbolicLink())throw new Error('Nonordinary source artifact.');hashes[name]=hash(await readFile(source));await copyFile(source,path.join(staging,name));}
  const manifest=JSON.parse(await readFile(path.join(staging,'manifest.json'),'utf8'));if(manifest.id!=='color-sprint')throw new Error('Wrong plugin identity.');await writeFile(path.join(staging,'bundle.json'),JSON.stringify({version:manifest.version,files:hashes}));
  // Recheck after staging; never deliberately hot-replace a running plugin.
  if((await processes()).some(p=>p.Name.toLowerCase()==='obsidian.exe'))return {status:'pending',reason:'Obsidian opened during staging. Close it and retry.'};
  const result=await installBundledPlugin(vault,staging,profile);
  if(result.version!==manifest.version)return {status:'ahead',version:result.version,reason:'Newer installed plugin retained; no downgrade.'};
  for(const name of FILES)if(hash(await readFile(path.join(vault,'.obsidian','plugins','color-sprint',name)))!==hashes[name])throw new Error('Installed files differ at the same version; investigate instead of silently replacing.');
  return {status:result.changed?'installed':'current',...result,verifiedFiles:FILES};
}
export async function inspectHud(folder){
  await dir(folder);const raw=await readFile(path.join(folder,'SHA256SUMS.txt'),'utf8'),entries=[];const seen=new Set();
  for(const line of raw.trim().split(/\r?\n/)){const match=/^([a-f0-9]{64})  (.+)$/.exec(line);if(!match)throw new Error('Malformed HUD checksum manifest.');const relative=match[2];if(relative.includes('\\')||relative.includes(':')||relative.split('/').some(p=>!p||p==='.'||p==='..')||seen.has(relative))throw new Error('Unsafe or repeated HUD manifest path.');seen.add(relative);const file=path.join(folder,relative),s=await lstat(file);if(!s.isFile()||s.isSymbolicLink()||!same(await realpath(file),file)||hash(await readFile(file))!==match[1])throw new Error('HUD file integrity check failed.');entries.push(relative);}
  const actual=[];async function walk(base,prefix=''){for(const e of await readdir(base,{withFileTypes:true})){if(e.isSymbolicLink())throw new Error('Linked release entry.');const relative=prefix+e.name;if(e.isDirectory())await walk(path.join(base,e.name),relative+'/');else actual.push(relative);}}await walk(folder);
  if(actual.some(file=>file!=='SHA256SUMS.txt'&&!seen.has(file)))throw new Error('Unlisted HUD release file.');
  const pkg=JSON.parse(await readFile(path.join(folder,'resources/app/package.json'),'utf8'));if(pkg.name!=='color-sprint-hud'||!/^\d+\.\d+\.\d+$/.test(pkg.version)||!seen.has('Color Sprint HUD.exe'))throw new Error('Wrong HUD identity.');return {version:pkg.version,build:hash(Buffer.from(raw)).slice(0,12),files:entries.length};
}
export async function deployHud({source,hudRoot,profile,processes=runningApps}){
  const info=await inspectHud(source);await dir(hudRoot,true);await dir(profile,true);const versions=path.join(hudRoot,'versions');await dir(versions,true);const destination=path.join(versions,info.version+'-'+info.build);
  try{await lstat(destination);const existing=await inspectHud(destination);if(existing.build!==info.build)throw new Error('Existing immutable build differs.');}catch(error){if(error.code!=='ENOENT')throw error;const temp=path.join(versions,'.stage-'+randomUUID());await cp(source,temp,{recursive:true,errorOnExist:true,force:false});await inspectHud(temp);await rename(temp,destination);}
  const currentFile=path.join(hudRoot,'current.json');let previous=null;try{previous=JSON.parse(await readFile(currentFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(previous&&previous.directory!==destination){const backup=path.join(profile,'deployment-backups');await dir(backup,true);await writeFile(path.join(backup,Date.now()+'-'+randomUUID()+'.json'),JSON.stringify(previous,null,2),{flag:'wx'});}
  await atomic(currentFile,JSON.stringify({version:info.version,build:info.build,directory:destination,executable:path.join(destination,'Color Sprint HUD.exe')},null,2)+'\n');
  // Launcher only resolves a validated descendant of this installation. It never stops a process.
  const launcher=`$ErrorActionPreference = 'Stop'\n$sprintCurrent = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'current.json') -Raw | ConvertFrom-Json\n$sprintBase = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'versions')) + [System.IO.Path]::DirectorySeparatorChar\n$sprintExe = [System.IO.Path]::GetFullPath($sprintCurrent.executable)\nif (-not $sprintExe.StartsWith($sprintBase,[System.StringComparison]::OrdinalIgnoreCase) -or [System.IO.Path]::GetFileName($sprintExe) -ne 'Color Sprint HUD.exe') { throw 'Invalid HUD target.' }\nRemove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue\nStart-Process -FilePath $sprintExe -WorkingDirectory ([System.IO.Path]::GetDirectoryName($sprintExe)) -WindowStyle Hidden\n`;
  await atomic(path.join(hudRoot,'Launch Color Sprint HUD.ps1'),launcher);
  await atomic(path.join(hudRoot,'Launch Color Sprint HUD.cmd'),`@echo off\r\nsetlocal\r\nset ELECTRON_RUN_AS_NODE=\r\nstart "Color Sprint HUD" "%~dp0versions\\${info.version}-${info.build}\\Color Sprint HUD.exe"\r\n`);
  const apps=await processes();const running=apps.filter(p=>p.Name.toLowerCase()==='color sprint hud.exe');
  return {status:'prepared',version:info.version,directory:destination,launcher:path.join(hudRoot,'Launch Color Sprint HUD.cmd'),verifiedFiles:info.files,restartRequired:running.some(p=>!p.ExecutablePath||!same(p.ExecutablePath,path.join(destination,'Color Sprint HUD.exe'))),runningProcesses:running.map(p=>p.ProcessId)};
}
async function cli(){const args=process.argv.slice(2),arg=name=>{const index=args.indexOf(name);if(index<0)return null;if(!args[index+1]||args[index+1].startsWith('--'))throw new Error('Missing argument value.');return args[index+1];};const {profile,hudRoot}=localPaths();let config;
  if(args.includes('--configure')){const vault=arg('--vault');if(!vault)throw new Error('Provide --vault with --configure.');config=await configureTargets(vault,profile,hudRoot);console.log(JSON.stringify({configured:true,configFile:path.join(profile,'deploy-targets.json')}));}
  if(!args.includes('--install'))return;
  config??=JSON.parse(await readFile(path.join(profile,'deploy-targets.json'),'utf8'));if(config.schema!==1||!same(config.hudRoot,hudRoot))throw new Error('Unexpected local target configuration.');const source=arg('--hud-release');if(!source)throw new Error('Provide the validated extracted --hud-release folder.');
  const lock=path.join(profile,'deployment.lock');let handle;try{handle=await (await import('node:fs/promises')).open(lock,'wx');}catch{throw new Error('Another deployment may be active. Inspect deployment.lock; do not automatically steal it.');}
  try{await inspectHud(path.resolve(source));const plugin=await deployPlugin({vault:config.vault,profile});const hud=await deployHud({source:path.resolve(source),hudRoot,profile});const report={at:new Date().toISOString(),plugin,hud,mobile:{status:'requires-release-verification',repository:'jogurtfm/color-sprint',note:'Verify BRAT Latest and its assets in the release workflow; no phone installation is inferred.'}};await atomic(path.join(profile,'last-deployment.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}finally{await handle.close();await (await import('node:fs/promises')).unlink(lock);}
}
if(process.argv[1]&&same(process.argv[1],fileURLToPath(import.meta.url)))cli().catch(error=>{console.error(error.message);process.exitCode=1;});
