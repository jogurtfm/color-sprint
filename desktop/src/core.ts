import {readFile,writeFile,rename,unlink,mkdir,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {Board,parseBoard,focusQueue,timerSeconds} from '../../src/model';
import {applyHudAction,HudAction} from '../../src/hud-protocol';
import {integrationFor,Integration} from './bridge';

export function revision(text:string):string{return createHash('sha256').update(text).digest('hex');}
export interface Source {board:Board|null;revision:string;path:string;error:string|null;checkedAt:number;changedAt:number;verifiedAt:number;fileModifiedAt:number;integration?:Integration}
export type Action=HudAction;
export const applyAction=applyHudAction;

export class VaultStore {
  state:Source;private queue:Promise<unknown>=Promise.resolve();private canonical='';
  constructor(public filename:string,private backupDir:string,private bridge?:(text:string,action:Action,context:Integration)=>Promise<void>){this.state={board:null,revision:'',path:filename,error:null,checkedAt:0,changedAt:0,verifiedAt:0,fileModifiedAt:0};}
  async load():Promise<Source>{try{const canonical=await realpath(this.filename);if(this.canonical&&this.canonical!==canonical)throw new Error('Tracker file target changed. Reconnect the intended Markdown file.');if(path.extname(canonical).toLowerCase()!=='.md')throw new Error('Choose a Markdown tracker (.md).');const metadata=await stat(canonical);if(metadata.size>8*1024*1024)throw new Error('Tracker is larger than the 8 MB safety limit.');const text=await readFile(canonical,'utf8');const hash=revision(text);const board=parseBoard(text),integration=await integrationFor(canonical);this.canonical=canonical;this.state={board,revision:hash,path:this.filename,error:null,checkedAt:Date.now(),verifiedAt:Date.now(),fileModifiedAt:metadata.mtimeMs,changedAt:hash===this.state.revision?this.state.changedAt:Date.now(),integration};}catch(error){this.state={...this.state,error:error instanceof Error?error.message:String(error),checkedAt:Date.now()};}return this.state;}
  edit(expected:string,action:Action,writable:boolean):Promise<Source>{const operation=this.queue.then(async()=>{
    if(!writable)throw new Error('Read-only link. Enable task edits in Settings after reviewing the source path.');
    await this.load();if(this.state.error)throw new Error(this.state.error);if(expected!==this.state.revision)throw new Error('Vault changed since this screen loaded. Nothing was overwritten. Refresh and try again.');
    const text=await readFile(this.canonical,'utf8');if(revision(text)!==expected)throw new Error('Vault changed. Nothing written.');const next=applyAction(text,action);parseBoard(next);
    if(next===text)return this.state;
    const context=this.state.integration!;
    if(context.mode==='obsidian'){
      if(!this.bridge)throw new Error('Protected Obsidian tracker: use the Obsidian bridge, never a direct HUD write.');
      await this.bridge(text,action,context);await this.load();if(this.state.error)throw new Error(this.state.error);return this.state;
    }
    await mkdir(this.backupDir,{recursive:true});await writeFile(path.join(this.backupDir,`${Date.now()}-${randomUUID()}.md`),text,{flag:'wx'});
    const temp=path.join(path.dirname(this.canonical),`.${path.basename(this.canonical)}.hud-${randomUUID()}.tmp`);
    try{await writeFile(temp,next,{flag:'wx'});if(await realpath(this.filename)!==this.canonical||revision(await readFile(this.canonical,'utf8'))!==expected)throw new Error('Another app changed this tracker. Saved your original backup; no replacement made.');await rename(temp,this.canonical);}finally{await unlink(temp).catch(()=>{});}
    return this.load();
  });this.queue=operation.catch(()=>{});return operation;}
}

export function zoned(now:number,timezone:string):{date:string;time:string;hour:number}{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);const p=Object.fromEntries(parts.map(p=>[p.type,p.value]));return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`,hour:Number(p.hour)};}
export function isQuiet(now:number,timezone:string,enabled:boolean):boolean{const hour=zoned(now,timezone).hour;return enabled&&(hour>=22||hour<7);}
export interface Reminder {id:string;title:string;body:string;kind:'timer'|'reminder'}
export function dueReminders(board:Board,now:number,timezone:string):Reminder[]{
  const found:Reminder[]=[];const timer=board.timer;
  if(timer&&timer.started!=='-'){const q=focusQueue(board,timer),step=q[Math.min(timer.cursor,Math.max(0,q.length-1))];if(step&&step.minutes>0&&timerSeconds(timer,now)-timer.stepOffset>=step.minutes*60)found.push({id:`timer:${timer.id}:${timer.cursor}:${timer.stepOffset}:${timer.started}`,title:'Focus target reached',body:`${step.title}. Finish only when the work is done; your timer stays available.`,kind:'timer'});}
  for(const block of board.timeBlocks){const local=zoned(now,block.timezone||timezone);const minute=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3));const lag=minute(local.time)-minute(block.start);if(local.date===block.date&&lag>=0&&lag<2&&!board.entries.some(e=>e.taskId===block.taskId&&e.date===block.date&&e.done)){const task=board.tasks.find(t=>t.id===block.taskId);if(task)found.push({id:`block:${block.date}:${block.taskId}:${block.start}`,title:task.title,body:`${block.status==='scheduled'?'Calendar block':'Suggested block'} · ${block.start}–${block.end}. One clear next action.`,kind:'reminder'});}}
  return found;
}
