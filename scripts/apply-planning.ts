import {readFile,writeFile,realpath,lstat,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {ObsidianBridge,integrationFor,ordinaryPath} from '../desktop/src/bridge';
import {parseProposal,syncFolder} from '../src/sync';
import {vaultPath} from '../src/daily';
import {automaticPlan,plannerAction,plannerDay,PlannerPolicy} from '../src/planner';
import {plannerPolicy} from '../src/planner-local';
import {parseBoard} from '../src/model';
async function main(){
  const args=new Map<string,string>();let configure=false;for(let i=2;i<process.argv.length;i++){const key=process.argv[i];if(key==='--configure'){configure=true;continue;}if(!['--vault','--tracker','--proposal'].includes(key)||!process.argv[i+1]||args.has(key))throw new Error('Use --vault VAULT --tracker TRACKER [--configure | --proposal plan-ID].');args.set(key,process.argv[++i]);}
  if(!args.get('--vault')||!args.get('--tracker')||process.platform!=='win32'||!process.env.LOCALAPPDATA)throw new Error('A Windows vault/tracker must be explicitly configured.');
  const vault=await realpath(args.get('--vault')!),tracker=vaultPath(args.get('--tracker')!),filename=await ordinaryPath(vault,tracker),profile=path.join(process.env.LOCALAPPDATA,'Color Sprint HUD'),keyFile=path.join(profile,'hud-client.json'),keyStat=await lstat(keyFile);
  if(!keyStat.isFile()||keyStat.isSymbolicLink()||keyStat.size>8192)throw new Error('Use an existing local HUD signing identity.');
  const bridge=new ObsidianBridge(profile,async url=>{if(!url.startsWith('obsidian://color-sprint-hud?'))throw new Error('Unexpected external URL.');await promisify(execFile)('rundll32.exe',['url.dll,FileProtocolHandler',url],{windowsHide:true});},60000);await bridge.load();
  const client=JSON.parse(await readFile(keyFile,'utf8'));const policyFile=path.join(profile,'planner-policy.json');
  if(configure){if(args.has('--proposal'))throw new Error('Configure consent separately from an apply operation.');let prior:PlannerPolicy|undefined;try{const s=await lstat(policyFile);if(s.isSymbolicLink()||!s.isFile())throw new Error('Invalid policy file.');prior=JSON.parse(await readFile(policyFile,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    if(prior?.enabled){if(prior.vault!==vault||prior.tracker!==tracker||prior.client!==client.id||prior.publicKey!==client.publicKey)throw new Error('Existing policy targets differ; inspect before reconfiguring.');console.log(JSON.stringify({status:'already-configured',enabledAt:prior.enabledAt}));return;}
    if(prior)await copyFile(policyFile,policyFile+'.backup-'+Date.now());const policy:PlannerPolicy={version:1,enabled:true,vault,tracker,client:client.id,publicKey:client.publicKey,enabledAt:new Date().toISOString(),timezone:'America/Chicago'};await writeFile(policyFile,JSON.stringify(policy,null,2)+'\n',{mode:0o600});const checked=await plannerPolicy(vault);if(JSON.stringify(checked)!==JSON.stringify(policy))throw new Error('Policy read-back failed.');console.log(JSON.stringify({status:'configured',enabledAt:policy.enabledAt,scope:'signed fresh conflict-free planning only'}));return;
  }
  const policy=await plannerPolicy(vault);if(policy.tracker!==tracker||policy.client!==client.id||policy.publicKey!==client.publicKey)throw new Error('Planner identity/target is not configured.');
  const id=args.get('--proposal')||'';plannerAction({id,sha256:'0'.repeat(64)});const proposalPath=await ordinaryPath(vault,`${syncFolder(tracker)}/Proposals/${id}.md`),raw=await readFile(proposalPath,'utf8'),p=parseProposal(raw);if(p.id!==id||p.tracker!==tracker)throw new Error('Proposal identity mismatch.');
  try{await lstat(await ordinaryPath(vault,`${syncFolder(tracker)}/Applied/${id}.md`));console.log(JSON.stringify({status:'already-processed',proposal:id,trackerWritten:false}));return;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  if(Date.parse(p.created)<Date.parse(policy.enabledAt))throw new Error('Old proposal requires manual review; no existing backlog is auto-applied.');
  const integration=await integrationFor(filename),[major,minor]=integration.pluginVersion.split('.').map(Number);if(!integration.ready||!(major>0||major===0&&minor>=20))throw new Error('Windows Obsidian Color Sprint 0.20.0+ is required.');
  if(JSON.stringify(parseBoard(p.base).exerciseTargets)!==JSON.stringify(parseBoard(p.proposed).exerciseTargets)&&!(major>0||major===0&&minor>=21))throw new Error('Exercise target proposals require Windows Obsidian Color Sprint 0.21.0+.');
  const current=await readFile(filename,'utf8'),expected=automaticPlan(p.base,current,p.proposed,plannerDay()),sha256=createHash('sha256').update(raw).digest('hex');
  await bridge.send(current,{kind:'plan-apply',details:JSON.stringify({id,sha256})},integration);
  if(await readFile(filename,'utf8')!==expected.text)throw new Error('Planner result changed before read-back; inspect before retrying.');
  console.log(JSON.stringify({status:'applied',proposal:id,planningChanges:expected.changes.length,progressPreserved:true,receipt:`${syncFolder(tracker)}/Applied/${id}.md`}));
}
void main().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
