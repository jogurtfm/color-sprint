// Reviewed plugin-only bridge correction. No credential files, commits or vault writes.
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),git='C:/Program Files/Git/cmd/git.exe',version='0.16.2';
if(!process.execArgv.includes('--use-system-ca')||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0'||/^(1|true|yes)$/i.test(process.env.GIT_SSL_NO_VERIFY||''))throw new Error('Use trusted Node 24+ with --use-system-ca and normal TLS verification.');
const env={...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'};
function run(args,input){const r=spawnSync(git,['-c','http.sslBackend=schannel','-c','credential.interactive=never',...args],{cwd:root,env,input,encoding:'utf8',windowsHide:true,timeout:120000});if(r.status!==0)throw new Error(`Git ${args[0]} failed. Diagnostic output withheld to protect credentials.`);return r.stdout.trim();}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
if(run(['remote','get-url','--push','origin'])!=='https://github.com/jogurtfm/color-sprint.git')throw new Error('Unexpected destination.');
for(const file of ['manifest.json','package.json','package-lock.json'])if(JSON.parse(await readFile(path.join(root,file),'utf8')).version!==version)throw new Error('This publisher is restricted to plugin 0.16.2.');
if(JSON.parse(await readFile(path.join(root,'desktop/package.json'),'utf8')).version!=='0.16.0')throw new Error('HUD must remain unchanged at 0.16.0.');
const raw=run(['credential','fill'],'protocol=https\nhost=github.com\nusername=jogurtfm\n\n'),token=raw.split(/\r?\n/).find(x=>x.startsWith('password='))?.slice(9);
if(!token)throw new Error('Saved GitHub credential unavailable.');
const api='https://api.github.com/repos/jogurtfm/color-sprint',headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'Color-Sprint-reviewed-bridge-release'};
async function request(url,options={}){let r;try{r=await fetch(url,{...options,headers:{...headers,...options.headers},redirect:'error',signal:AbortSignal.timeout(60000)});}catch{throw new Error('GitHub HTTPS request failed. Credential details withheld.');}if(!r.ok)throw new Error(`GitHub HTTP ${r.status}. Response withheld.`);return r.json();}
const account=await request('https://api.github.com/user'),repo=await request(api),commit=run(['rev-parse','HEAD']);
if(account.login!=='jogurtfm'||repo.private||!repo.permissions?.push)throw new Error('Expected account and public push destination not confirmed.');
if(!process.argv.includes('--publish')){console.log(JSON.stringify({account:account.login,repository:repo.full_name,commit,plugin:version,hud:'0.16.0',published:false}));process.exit(0);}
if(run(['diff','--cached','--name-only']))throw new Error('Commit only the reviewed release allowlist first.');
const sources=['src/main.ts','src/hud-store.ts','tests/plugin.test.ts','main.js','manifest.json','styles.css','package.json','package-lock.json','versions.json','esbuild.mjs','scripts/package-plugin.mjs','scripts/publish-bridge-fix.mjs','HUD-BRIDGE.md','UPDATE-WORKFLOW.md'];
if(run(['diff','HEAD','--',...sources]))throw new Error('Release sources differ from the reviewed commit.');
const zipIndex=process.argv.indexOf('--plugin-zip'),zip=path.resolve(root,zipIndex<0?'':process.argv[zipIndex+1]||'');
if(!zip.startsWith(path.join(root,'release')+path.sep)||!/^Color-Sprint-plugin-0\.16\.2-\d{8}T\d{6}\.zip$/.test(path.basename(zip)))throw new Error('Provide the exact prepared plugin ZIP.');
const zipBytes=await readFile(zip),zipHash=hash(zipBytes);if(!(await readFile(zip+'.sha256','utf8')).startsWith(zipHash+'  '))throw new Error('ZIP checksum mismatch.');
const assets=[];for(const name of ['main.js','manifest.json','styles.css']){const bytes=await readFile(path.join(root,name));if(hash(await readFile(path.join(zip.slice(0,-4),'color-sprint',name)))!==hash(bytes))throw new Error('Packaged plugin differs from reviewed runtime.');assets.push({name,bytes});}
assets.push({name:'Color-Sprint-plugin-0.16.2.zip',bytes:zipBytes});assets.push({name:'SHA256SUMS.txt',bytes:Buffer.from(assets.map(a=>hash(a.bytes)+'  '+a.name).join('\n')+'\n')});
run(['push','origin','HEAD:main']);if(run(['ls-remote','origin','refs/heads/main']).split(/\s/)[0]!==commit)throw new Error('Remote commit read-back failed.');
const tag=version,localTag=spawnSync(git,['show-ref','--verify','--quiet','refs/tags/'+tag],{cwd:root,env,windowsHide:true});if(localTag.status!==0)run(['tag',tag,commit]);else if(run(['rev-list','-n','1',tag])!==commit)throw new Error('Existing tag points elsewhere. Never overwrite.');run(['push','origin','refs/tags/'+tag]);
let release=(await request(api+'/releases?per_page=100')).find(r=>r.tag_name===tag);
if(!release)release=await request(api+'/releases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag_name:tag,target_commitish:commit,name:'Color Sprint 0.16.2 · Windows HUD bridge fix',body:'Fixes HUD actions and planning-review links rejected after Windows Obsidian consumes the vault routing parameter. Signature checks, explicit pairing, stale-write protection and receipts remain intact. Existing HUD 0.16.0 is compatible; no HUD replacement needed. No old actions replayed. PC installation and user-confirmed native HUD writes verified; BRAT phone reload remains a separate step. See HUD-BRIDGE.md.',draft:true,prerelease:false})});
for(const asset of assets){let remote=release.assets.find(a=>a.name===asset.name);if(!remote)remote=await request(`https://uploads.github.com/repos/jogurtfm/color-sprint/releases/${release.id}/assets?name=${encodeURIComponent(asset.name)}`,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:asset.bytes});if(remote.size!==asset.bytes.length||remote.digest&&remote.digest!==`sha256:${hash(asset.bytes)}`)throw new Error('Existing/uploaded asset differs. Nothing overwritten.');}
release=await request(`${api}/releases/${release.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft:false,make_latest:'true'})});
for(const asset of assets){const remote=release.assets.find(a=>a.name===asset.name);if(!remote?.browser_download_url?.startsWith('https://github.com/jogurtfm/color-sprint/releases/download/0.16.2/'))throw new Error('Unexpected public download path.');const r=await fetch(remote.browser_download_url,{signal:AbortSignal.timeout(60000)});if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==hash(asset.bytes))throw new Error('Public asset verification failed.');}
if((await request(api+'/releases/latest')).tag_name!==version)throw new Error('BRAT Latest read-back failed.');
console.log(JSON.stringify({url:release.html_url,commit,latest:version,hudUnchanged:'0.16.0',assets:assets.map(a=>({name:a.name,sha256:hash(a.bytes)}))},null,2));
