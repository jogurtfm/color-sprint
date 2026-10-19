import {readFile,writeFile,mkdir,realpath,lstat,readdir} from 'node:fs/promises';
import path from 'node:path';
import {generateKeyPairSync,randomUUID,sign,createPublicKey,createHash} from 'node:crypto';
import {HudAction,HudRequest,HudResult,hudFolder,hudNote,hudPayload,signedHudBody,parseHudRequest,bridgeId} from '../../src/hud-protocol';
import {parseProposal} from '../../src/sync';

export interface Integration {mode:'standalone'|'obsidian';vault:string;tracker:string;pluginVersion:string;ready:boolean;pending:number;issues:string[]}
const exists=async(file:string)=>{try{return await lstat(file);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}};
const proposalIndex=new Map<string,{mtime:number;size:number;tracker:string;id:string}>();
export async function integrationFor(filename:string):Promise<Integration>{
  let parent=path.dirname(filename),vault='';
  for(let n=0;n<16&&path.dirname(parent)!==parent;n++,parent=path.dirname(parent)){if(await exists(path.join(parent,'.obsidian'))){vault=parent;break;}}
  const root=path.join(path.dirname(filename),'Color Sprint Sync');
  const result:Integration={mode:vault||await exists(root)?'obsidian':'standalone',vault,tracker:vault?path.relative(vault,filename).split(path.sep).join('/'):'',pluginVersion:'',ready:false,pending:0,issues:[]};
  if(result.mode==='standalone')return result;
  if(!vault){result.issues.push('Protected tracker found outside a recognizable Obsidian vault. Connect its original vault copy.');return result;}
  try{const manifest=JSON.parse(await readFile(path.join(vault,'.obsidian','plugins','color-sprint','manifest.json'),'utf8'));result.pluginVersion=manifest.version||'';const [major,minor]=result.pluginVersion.split('.').map(Number);result.ready=manifest.id==='color-sprint'&&(major>0||major===0&&minor>=11);}catch{result.issues.push('Color Sprint plugin manifest not readable.');}
  if(!result.ready)result.issues.push('Install Color Sprint 0.11.0 or newer in Windows Obsidian to enable the HUD bridge.');
  const proposals=path.join(root,'Proposals');const metadata=await exists(proposals);
  if(metadata){if(!metadata.isDirectory()||metadata.isSymbolicLink()){result.issues.push('Proposal inbox is not an ordinary directory.');return result;}
    const files=await readdir(proposals);if(files.length>1000){result.issues.push('Proposal inbox exceeds 1000 files. Review it in Obsidian.');return result;}
    let parsedBytes=0;
    for(const name of files.filter(x=>x.endsWith('.md'))){try{const file=path.join(proposals,name),s=await lstat(file);if(!s.isFile()||s.isSymbolicLink()||s.size>4*1024*1024)throw new Error('Invalid proposal file.');let p=proposalIndex.get(file);if(!p||p.mtime!==s.mtimeMs||p.size!==s.size){parsedBytes+=s.size;if(parsedBytes>8*1024*1024){result.issues.push('Large proposal inbox: pending count is partial. Open Obsidian Sync review.');break;}const proposal=parseProposal(await readFile(file,'utf8'));p={mtime:s.mtimeMs,size:s.size,tracker:proposal.tracker,id:proposal.id};if(proposalIndex.size>1000)proposalIndex.clear();proposalIndex.set(file,p);}if(p.tracker!==result.tracker)continue;if(!await exists(path.join(root,'Applied',p.id+'.md')))result.pending++;}catch{result.issues.push(`Unreviewable proposal: ${name}`);}}
  }
  return result;
}
// Reject links/junctions in bridge destinations rather than escaping the vault.
async function ordinaryPath(vault:string,relative:string,create=false):Promise<string>{
  if(path.isAbsolute(relative)||relative.split('/').some(p=>!p||p==='.'||p==='..'||/[\\:]/.test(p)))throw new Error('Invalid bridge path.');
  const root=await realpath(vault);let folder=root;const parts=relative.split('/');const leaf=parts.pop()!;
  for(const part of parts){folder=path.join(folder,part);let s=await exists(folder);if(!s&&create){try{await mkdir(folder);}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;}s=await lstat(folder);}if(!s)throw Object.assign(new Error('Bridge folder not found.'),{code:'ENOENT'});if(!s.isDirectory()||s.isSymbolicLink()||await realpath(folder)!==folder)throw new Error('Bridge directories must be ordinary vault folders, not links.');}
  const file=path.join(folder,leaf),s=await exists(file);if(s&&(!s.isFile()||s.isSymbolicLink()||s.size>4*1024*1024))throw new Error('Invalid bridge record.');return file;
}
interface Client {id:string;publicKey:string;privateKey:string}
export class ObsidianBridge {
  private client:Client|null=null;
  constructor(private profile:string,private open:(url:string)=>Promise<unknown>,private timeout=90000){}
  get fingerprint(){return this.client?createHash('sha256').update(this.client.publicKey).digest('hex').slice(0,24):'';}
  async load():Promise<void>{
    if(this.client)return;const file=path.join(this.profile,'hud-client.json');
    try{const c=JSON.parse(await readFile(file,'utf8')) as Client;if(!bridgeId(c.id)||typeof c.privateKey!=='string'||typeof c.publicKey!=='string'||createPublicKey(c.privateKey).export({type:'spki',format:'der'}).toString('base64')!==c.publicKey)throw new Error('HUD pairing key is corrupt; keep it for recovery and choose a fresh profile to re-pair.');this.client=c;}
    catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;await mkdir(this.profile,{recursive:true});const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'});const c:Client={id:'hud-'+randomUUID(),publicKey:pair.publicKey.export({type:'spki',format:'der'}).toString('base64'),privateKey:pair.privateKey.export({type:'pkcs8',format:'pem'}).toString()};await writeFile(file,JSON.stringify(c),{flag:'wx',mode:0o600});this.client=c;}
  }
  async send(text:string,action:HudAction,context:Integration):Promise<void>{
    if(context.mode!=='obsidian'||!context.ready||!context.vault)throw new Error(context.issues[0]||'Obsidian bridge unavailable. No direct tracker write was made.');
    await this.load();const c=this.client!,now=Date.now();const r:HudRequest={version:1,id:'hud-'+randomUUID(),tracker:context.tracker,created:now,expires:now+120000,client:c.id,publicKey:c.publicKey,base:text,action,signature:''};
    r.signature=sign('sha256',Buffer.from(signedHudBody(r)),{key:c.privateKey,dsaEncoding:'ieee-p1363'}).toString('base64');const note=hudNote(r);parseHudRequest(note);
    const request=await ordinaryPath(context.vault,`${hudFolder(r.tracker)}/Requests/${r.id}.md`,true);await writeFile(request,note,{flag:'wx'});if(await readFile(request,'utf8')!==note)throw new Error('HUD request read-back failed. Nothing was sent.');
    await this.open(`obsidian://color-sprint-hud?vault=${encodeURIComponent(path.basename(context.vault))}&tracker=${encodeURIComponent(r.tracker)}&id=${encodeURIComponent(r.id)}`);
    const deadline=Date.now()+this.timeout;
    while(Date.now()<deadline){try{const file=await ordinaryPath(context.vault,`${hudFolder(r.tracker)}/Results/${r.id}.md`);const result=hudPayload(await readFile(file,'utf8')) as HudResult;if(result.version!==1||result.id!==r.id||result.requestSignature!==r.signature||!['processing','done','rejected','unconfirmed'].includes(result.status)||typeof result.message!=='string')throw new Error('Invalid Obsidian bridge receipt.');if(result.status==='done')return;if(result.status!=='processing')throw new Error(result.message);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    throw new Error('Obsidian has not confirmed this action. Open Windows Obsidian, update Color Sprint to 0.11.0+, and approve pairing. Refresh before retrying; the request was not replayed.');
  }
}
