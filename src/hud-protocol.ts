import {parseBoard,setEntry,startTimer,pauseTimer,resumeTimer,refreshTimer,cancelTimer,finishFocus,completeFocusStep,validDay} from './model';
import {vaultPath} from './daily';
import {syncFolder} from './sync';
import {enqueueTask,editQueue,startQuickQueue,advanceQuickQueue,skipQuickQueue,claimQuickQueue,setGoal,setSubtaskDone,addWorkoutLog} from './model';

export type HudAction={kind:string;taskId?:string;date?:string;done?:boolean;timerId?:string;stepId?:string;cursor?:number;itemId?:string;operation?:string;minutes?:number;goalId?:string;evidence?:string;distance?:number;details?:string;note?:string};
const ACTION_FIELDS=['kind','taskId','date','done','timerId','stepId','cursor','itemId','operation','minutes','goalId','evidence','distance','details','note'];
export function applyHudAction(text:string,action:HudAction,now=Date.now(),runner='standalone'):string {
  const b=parseBoard(text);if(!action||typeof action.kind!=='string')throw new Error('Invalid task action.');
  if(Object.keys(action).some(key=>!ACTION_FIELDS.includes(key)))throw new Error('Unsupported action field.');
  if(action.kind==='queue-add')return enqueueTask(text,action.taskId||'',action.date||'');
  if(action.kind==='queue-start')return startQuickQueue(text,action.date||'',now,runner);
  if(action.kind==='queue-takeover')return claimQuickQueue(text,action.timerId||'',runner);
  if(action.kind==='queue-edit'){if(!['up','down','remove','minutes','clear'].includes(action.operation||''))throw new Error('Invalid queue edit.');return editQueue(text,action.date||'',action.itemId||'',action.operation as 'up'|'down'|'remove'|'minutes'|'clear',action.minutes);}
  if(action.kind==='queue-advance'){if(typeof action.cursor!=='number')throw new Error('Queue cursor required.');return advanceQuickQueue(text,action.timerId||'',action.cursor,now);}
  if(action.kind==='queue-skip'){if(b.timer?.cursor!==action.cursor)throw new Error('Queue advanced elsewhere.');return skipQuickQueue(text,action.timerId||'',now);}
  if(action.kind==='goal-check'){const goal=b.goals.find(g=>g.id===action.goalId);if(!goal||typeof action.done!=='boolean'||(action.evidence!==undefined&&typeof action.evidence!=='string'))throw new Error('Choose an existing goal and explicit progress.');return setGoal(text,{...goal,done:action.done,evidence:action.evidence??goal.evidence});}
  if(action.kind==='subtask-check'){if(typeof action.done!=='boolean')throw new Error('Completion must be explicit.');return setSubtaskDone(text,action.stepId||'',action.done,action.date||'');}
  if(action.kind==='workout-log'){if((action.taskId!=='workout'&&action.taskId!=='treadmill')||typeof action.minutes!=='number'||typeof action.distance!=='number'||typeof action.details!=='string'||typeof action.note!=='string')throw new Error('Invalid workout log.');return addWorkoutLog(text,{taskId:action.taskId,date:action.date||'',minutes:action.minutes,distance:action.distance,details:action.details,note:action.note});}
  if(!['complete','start','schedule','pause','resume','reset','cancel','finish','next'].includes(action.kind))throw new Error('Unsupported action.');
  if(['complete','start','schedule'].includes(action.kind)){
    if(typeof action.taskId!=='string'||!b.tasks.some(t=>t.id===action.taskId)||typeof action.date!=='string'||!validDay(action.date))throw new Error('Unknown task or invalid date.');
    if(action.kind==='start')return startTimer(text,action.taskId,action.date,now);
    if(action.kind==='complete'&&typeof action.done!=='boolean')throw new Error('Completion must be explicit.');
    if(action.kind==='schedule'&&b.entries.some(e=>e.taskId===action.taskId&&e.date===action.date))return text;
    return setEntry(text,action.date,action.taskId,action.kind==='complete'?action.done!:false);
  }
  const timer=b.timer;if(!timer||timer.id!==action.timerId)throw new Error('The timer changed in Obsidian. Refresh before acting.');
  switch(action.kind){case 'pause':return pauseTimer(text,timer.id,now);case 'resume':return resumeTimer(text,timer.id,now);case 'reset':return refreshTimer(text,timer.id,now);case 'cancel':return cancelTimer(text,timer.id);case 'finish':return finishFocus(text,timer.id,action.stepId||'','',now);case 'next':if(action.cursor!==timer.cursor)throw new Error('The queue advanced elsewhere.');return completeFocusStep(text,timer.id,timer.cursor,now);default:throw new Error('Unsupported action.');}
}
export interface HudRequest {version:1;id:string;tracker:string;created:number;expires:number;client:string;publicKey:string;base:string;action:HudAction;signature:string}
export interface HudResult {version:1;id:string;requestSignature:string;status:'processing'|'done'|'rejected'|'unconfirmed';message:string}
export const bridgeId=(value:unknown):value is string=>typeof value==='string'&&/^hud-[a-f0-9-]{36}$/.test(value);
export const hudFolder=(tracker:string)=>`${syncFolder(tracker)}/HUD`;
export function hudNote(value:HudRequest|HudResult):string{return `# Color Sprint HUD bridge\n\nPrivate sync record. Not a planning proposal or phone checkpoint.\n\n\`\`\`json\n${JSON.stringify(value,null,2)}\n\`\`\`\n`;}
export function hudPayload(text:string):unknown {if(text.length>4*1024*1024)throw new Error('HUD record exceeds 4 MB.');const blocks=[...text.matchAll(/^```json\r?\n([\s\S]*?)\r?\n```\s*$/gm)];if(blocks.length!==1)throw new Error('Expected one HUD JSON payload.');return JSON.parse(blocks[0][1]);}
// Fixed field order is shared by Node signing and Obsidian WebCrypto verification.
export function signedHudBody(r:HudRequest):string{const extended=ACTION_FIELDS.slice(7).some(k=>Object.prototype.hasOwnProperty.call(r.action,k));return JSON.stringify([r.version,r.id,r.tracker,r.created,r.expires,r.client,r.publicKey,r.base,...ACTION_FIELDS.slice(0,extended?ACTION_FIELDS.length:7).map(k=>r.action[k as keyof HudAction]??null)]);}
export function parseHudRequest(text:string,now=Date.now()):HudRequest {
  const r=hudPayload(text) as HudRequest;
  if(!r||r.version!==1||!bridgeId(r.id)||!bridgeId(r.client)||typeof r.tracker!=='string'||typeof r.base!=='string'||typeof r.publicKey!=='string'||!/^[A-Za-z0-9+/]{100,200}={0,2}$/.test(r.publicKey)||typeof r.signature!=='string'||!/^[A-Za-z0-9+/]{80,100}={0,2}$/.test(r.signature)||!Number.isSafeInteger(r.created)||!Number.isSafeInteger(r.expires)||r.expires-r.created>120000||r.expires<=r.created||r.created>now+5000||r.expires<=now)throw new Error('Invalid or expired HUD request. Refresh and try again.');
  vaultPath(r.tracker);applyHudAction(r.base,r.action,now);return r;
}
const bytes=(base64:string)=>Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
export async function verifyHudRequest(r:HudRequest):Promise<boolean>{const key=await crypto.subtle.importKey('spki',bytes(r.publicKey),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);return crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,bytes(r.signature),new TextEncoder().encode(signedHudBody(r)));}
export interface HudHost {
  runner?():string;
  read(path:string):Promise<string|null>;create(path:string,text:string):Promise<void>;replace(path:string,before:string,after:string):Promise<void>;
  change(tracker:string,transform:(text:string)=>string):Promise<void>;
  approve(client:string,key:string,tracker:string):Promise<boolean>;
}
// Only called by an explicit local URI, never by directory watching/sync delivery.
// A durable processing receipt precedes mutation. Uncertain/crashed requests are
// not replayed, even if the URI is delivered twice or a cloud copy arrives later.
export async function processHudRequest(host:HudHost,tracker:string,id:string,now=()=>Date.now()):Promise<HudResult>{
  vaultPath(tracker);if(!bridgeId(id))throw new Error('Invalid HUD request ID.');
  const folder=hudFolder(tracker),requestPath=`${folder}/Requests/${id}.md`,resultPath=`${folder}/Results/${id}.md`;
  const raw=await host.read(requestPath);if(!raw)throw new Error('HUD request not found.');const r=parseHudRequest(raw,now());if(r.tracker!==tracker||r.id!==id)throw new Error('HUD request identity mismatch.');
  if(!await verifyHudRequest(r))throw new Error('HUD signature rejected.');
  const prior=await host.read(resultPath);if(prior){const result=hudPayload(prior) as HudResult;if(result.id!==id||result.version!==1||result.requestSignature!==r.signature||!['processing','done','rejected','unconfirmed'].includes(result.status)||typeof result.message!=='string')throw new Error('HUD receipt differs; inspect it before continuing.');return result;}
  const pending:HudResult={version:1,id,requestSignature:r.signature,status:'processing',message:'Outcome pending. Never replay this request.'},pendingText=hudNote(pending);await host.create(resultPath,pendingText);
  let wrote=false,result:HudResult;
  try{if(!await host.approve(r.client,r.publicKey,tracker))throw new Error('HUD pairing declined. Nothing changed.');parseHudRequest(raw,now());if(await host.read(requestPath)!==raw)throw new Error('HUD request changed after review.');let next='';await host.change(tracker,current=>{parseHudRequest(raw,now());if(current!==r.base)throw new Error('Tracker changed in Obsidian. Nothing overwritten. Refresh and try again.');next=applyHudAction(current,r.action,now(),r.action.kind==='queue-start'||r.action.kind==='queue-takeover'?host.runner?.()||'standalone':'standalone');return next;});wrote=true;
    if(await host.read(tracker)!==next)throw new Error('Tracker changed during verification. Inspect Obsidian before retrying.');
    result={version:1,id,requestSignature:r.signature,status:'done',message:'Applied and read back through Obsidian.'};
  }catch(error){let unchanged=false;try{unchanged=await host.read(tracker)===r.base;}catch{}result={version:1,id,requestSignature:r.signature,status:wrote||!unchanged?'unconfirmed':'rejected',message:error instanceof Error?error.message:String(error)};}
  await host.replace(resultPath,pendingText,hudNote(result));return result;
}
