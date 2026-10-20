// Local packaging only. Never uploads or installs into a user's vault.
import {mkdir,copyFile,readFile,writeFile,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
if(manifest.id!=='color-sprint'||!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(manifest.version))throw new Error('Invalid plugin manifest.');
const stamp=new Date().toISOString().replace(/[-:]/g,'').slice(0,15),name=`Color-Sprint-plugin-${manifest.version}-${stamp}`,folder=path.join(root,'release',name),plugin=path.join(folder,'color-sprint');
await mkdir(plugin,{recursive:true});
const sums=[];for(const file of ['main.js','manifest.json','styles.css']){const bytes=await readFile(path.join(root,file));await copyFile(path.join(root,file),path.join(plugin,file));sums.push(`${createHash('sha256').update(bytes).digest('hex')}  color-sprint/${file}`);}
await copyFile(path.join(root,'QUICK-QUEUE.md'),path.join(folder,'QUICK-QUEUE.md'));await writeFile(path.join(folder,'SHA256SUMS.txt'),sums.join('\n')+'\n');
await copyFile(path.join(root,'OBLIGATIONS.md'),path.join(folder,'OBLIGATIONS.md'));await copyFile(path.join(root,'EFFORT.md'),path.join(folder,'EFFORT.md'));await copyFile(path.join(root,'REFLECTION-KEYBOARD.md'),path.join(folder,'REFLECTION-KEYBOARD.md'));
await copyFile(path.join(root,'RATED-FINISH.md'),path.join(folder,'RATED-FINISH.md'));
const zip=folder+'.zip',quote=value=>`'${value.replaceAll("'","''")}'`;
const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Compress-Archive -LiteralPath ${quote(folder)} -DestinationPath ${quote(zip)} -CompressionLevel Optimal`],{windowsHide:true,encoding:'utf8'});
if(result.status!==0)throw new Error('Plugin ZIP packaging failed; source files remain intact.');
const hash=createHash('sha256').update(await readFile(zip)).digest('hex');await writeFile(zip+'.sha256',hash+'  '+path.basename(zip)+'\n');console.log(JSON.stringify({folder,zip,bytes:(await stat(zip)).size,sha256:hash},null,2));
