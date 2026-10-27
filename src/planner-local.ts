import {PlannerPolicy} from './planner';
// Desktop-only and outside Relay. No key is stored in the vault or renderer.
export async function plannerPolicy(vault:string):Promise<PlannerPolicy>{
  if(process.platform!=='win32'||!process.env.LOCALAPPDATA)throw new Error('Trusted planning is configured on the Windows owner device only.');
  const fs=require('node:fs/promises') as typeof import('node:fs/promises'),path=require('node:path') as typeof import('node:path');
  const filename=path.join(process.env.LOCALAPPDATA,'Color Sprint HUD','planner-policy.json'),s=await fs.lstat(filename);if(s.isSymbolicLink()||!s.isFile()||s.size>8192)throw new Error('Invalid local planner policy.');
  const p=JSON.parse(await fs.readFile(filename,'utf8')) as PlannerPolicy;
  if(p.version!==1||!p.enabled||p.timezone!=='America/Chicago'||!Number.isFinite(Date.parse(p.enabledAt))||typeof p.client!=='string'||typeof p.publicKey!=='string'||typeof p.tracker!=='string'||await fs.realpath(p.vault)!==await fs.realpath(vault))throw new Error('Trusted planner is disabled or belongs to another vault.');return p;
}
export async function disablePlanner():Promise<void>{if(process.platform!=='win32'||!process.env.LOCALAPPDATA)throw new Error('Windows planner profile unavailable.');const fs=require('node:fs/promises') as typeof import('node:fs/promises'),path=require('node:path') as typeof import('node:path'),filename=path.join(process.env.LOCALAPPDATA,'Color Sprint HUD','planner-policy.json'),s=await fs.lstat(filename);if(!s.isFile()||s.isSymbolicLink()||s.size>8192)throw new Error('Invalid local planner policy.');const p=JSON.parse(await fs.readFile(filename,'utf8'));await fs.writeFile(filename,JSON.stringify({...p,enabled:false},null,2)+'\n');}
