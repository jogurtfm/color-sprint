import {readFile,writeFile,mkdir,lstat,realpath,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const FILES=['main.js','styles.css','manifest.json'] as const;
const digest=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const normal=(p:string)=>process.platform==='win32'?p.toLowerCase():p;
async function directory(p:string,create=false){try{const s=await lstat(p);if(!s.isDirectory()||s.isSymbolicLink()||normal(await realpath(p))!==normal(path.resolve(p)))throw new Error('Refusing a linked or nonordinary plugin directory.');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT'||!create)throw error;await mkdir(p);}}
async function ordinaryFile(p:string){try{const s=await lstat(p);if(!s.isFile()||s.isSymbolicLink()||s.size>20*1024*1024)throw new Error('Plugin files must be ordinary files smaller than 20 MB.');return await readFile(p);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}}
const versionParts=(v:string)=>/^\d+\.\d+\.\d+$/.test(v)?v.split('.').map(Number):null;
function atLeast(a:string,b:string){const x=versionParts(a),y=versionParts(b);if(!x||!y)return false;for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]>y[i];}return true;}
export interface PluginBundle {version:string;files:Record<string,string>}
export async function inspectPluginBundle(folder:string){const spec=JSON.parse(await readFile(path.join(folder,'bundle.json'),'utf8')) as PluginBundle;if(!versionParts(spec.version)||Object.keys(spec.files).sort().join(',')!==[...FILES].sort().join(','))throw new Error('Invalid bundled plugin manifest.');const files=new Map<string,Buffer>();for(const name of FILES){const bytes=await ordinaryFile(path.join(folder,name));if(!bytes||digest(bytes)!==spec.files[name])throw new Error('Bundled plugin integrity check failed.');files.set(name,bytes);}const manifest=JSON.parse(files.get('manifest.json')!.toString('utf8'));if(manifest.id!=='color-sprint'||manifest.version!==spec.version)throw new Error('Wrong bundled plugin identity.');return {version:spec.version,files};}

/** Called only after a native, explicit installation confirmation. Never writes notes/data.json. */
export async function installBundledPlugin(vault:string,bundle:string,backupRoot:string,afterReplace?:(name:string)=>Promise<void>){
  if(!path.isAbsolute(vault))throw new Error('Choose an absolute vault folder.');await directory(vault);await directory(path.join(vault,'.obsidian'));
  const payload=await inspectPluginBundle(bundle);const plugins=path.join(vault,'.obsidian','plugins');await directory(plugins,true);const target=path.join(plugins,'color-sprint');await directory(target,true);
  const originals=new Map<string,Buffer|null>();for(const name of FILES)originals.set(name,await ordinaryFile(path.join(target,name)));
  const current=originals.get('manifest.json');if(current){const manifest=JSON.parse(current.toString('utf8'));if(manifest.id!=='color-sprint')throw new Error('The destination is not Color Sprint.');if(atLeast(manifest.version,payload.version))return {version:manifest.version,changed:false,backup:''};}
  await directory(backupRoot);const backups=path.join(backupRoot,'plugin-backups');await directory(backups,true);const id=`${Date.now()}-${randomUUID()}`,backup=path.join(backups,id);await directory(backup,true);
  for(const [name,bytes] of originals)if(bytes){await writeFile(path.join(backup,name),bytes,{flag:'wx'});if(digest(await readFile(path.join(backup,name)))!==digest(bytes))throw new Error('Plugin backup verification failed. No plugin file was replaced.');}
  const staged=new Map<string,string>(),replaced:string[]=[];
  try{
    for(const [name,bytes] of payload.files){const temporary=path.join(target,`.${name}.hud-install-${id}.tmp`);await writeFile(temporary,bytes,{flag:'wx'});staged.set(name,temporary);if(digest(await readFile(temporary))!==digest(bytes))throw new Error('Plugin staging verification failed.');}
    // manifest.json is last: the installed version is advertised only after both runtime files.
    for(const name of FILES){await rename(staged.get(name)!,path.join(target,name));staged.delete(name);replaced.push(name);await afterReplace?.(name);}
    for(const [name,bytes] of payload.files)if(digest(await readFile(path.join(target,name)))!==digest(bytes))throw new Error('Installed plugin verification failed.');
    return {version:payload.version,changed:true,backup};
  }catch(error){
    const failed:string[]=[];for(const name of replaced.reverse()){try{const original=originals.get(name);if(original)await writeFile(path.join(target,name),original);else await unlink(path.join(target,name));}catch{failed.push(name);}}
    throw new Error(`${error instanceof Error?error.message:String(error)} ${failed.length?'Automatic rollback incomplete.':'Original plugin files restored.'} Backup: ${backup}`);
  }finally{for(const file of staged.values())await unlink(file).catch(()=>{});}
}
