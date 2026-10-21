import {readFile,readdir,lstat} from 'node:fs/promises';
import path from 'node:path';
import {ordinaryPath,Integration} from './bridge';
import {loadStudy,StudyIO} from '../../src/modules/data';
import {activeModuleFocus} from '../../src/modules/contracts';
import {Board} from '../../src/model';
export async function hudStudyData(context:Integration|undefined,board:Board|null,key:string,deviceId='hud-study'){
  const focus=activeModuleFocus(board);if(!context?.vault||context.mode!=='obsidian'||!focus||focus.key!==key)throw new Error('Open an active study focus in the connected Obsidian vault.');
  const io:StudyIO={read:async path=>{try{const file=await ordinaryPath(context.vault,path);if((await lstat(file)).size>1048576)throw new Error('Study file is too large.');return await readFile(file,'utf8');}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}},
    list:async folder=>{const files:string[]=[];async function walk(relative:string,depth:number){if(depth>3)throw new Error('Unexpected study folder nesting.');let dir;try{dir=await ordinaryPath(context!.vault,relative+'/.study-list');}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return;throw e;}const base=path.dirname(dir);for(const entry of await readdir(base,{withFileTypes:true})){if(entry.isSymbolicLink())throw new Error('Study folders cannot contain links.');const next=relative+'/'+entry.name;if(entry.isDirectory())await walk(next,depth+1);else if(entry.name.endsWith('.md'))files.push(next);if(files.length>5000)throw new Error('Study history exceeds the safe limit.');}}await walk(folder.replace(/\/$/,''),0);return files;},
    create:async()=>{throw new Error('HUD study files are read-only. Save through Obsidian.');}};
  const data=await loadStudy(io,context.tracker,focus.taskId,deviceId);return {...data,scope:context.vault+'/'+context.tracker};
}
