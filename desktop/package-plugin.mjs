// Package only public plugin artifacts; never copy a vault or private profile.
import {mkdir,copyFile,readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url)),plugin=path.dirname(root);
const manifest=JSON.parse(await readFile(path.join(plugin,'manifest.json'),'utf8'));
const stamp=new Date().toISOString().replace(/[-:]/g,'').slice(0,15);
const folder=path.join(root,'release',`Color-Sprint-Plugin-${manifest.version}-${stamp}`);
await mkdir(folder,{recursive:true});
const sums=[];
for(const file of ['main.js','manifest.json','styles.css','HUD-BRIDGE.md']){await copyFile(path.join(plugin,file),path.join(folder,file));sums.push(`${createHash('sha256').update(await readFile(path.join(folder,file))).digest('hex')}  ${file}`);}
await writeFile(path.join(folder,'SHA256SUMS.txt'),sums.join('\n')+'\n');
const zip=folder+'.zip',ps=s=>`'${s.replaceAll("'","''")}'`;
const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Compress-Archive -LiteralPath ${ps(folder)} -DestinationPath ${ps(zip)} -CompressionLevel Optimal`],{stdio:'inherit',windowsHide:true});
if(result.status!==0)throw new Error('Plugin ZIP packaging failed. Folder retained.');
const sha256=createHash('sha256').update(await readFile(zip)).digest('hex');await writeFile(zip+'.sha256',`${sha256}  ${path.basename(zip)}\n`);
console.log(JSON.stringify({folder,zip,bytes:(await stat(zip)).size,sha256},null,2));
