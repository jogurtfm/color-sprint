// Explicitly approved two-build release. No automatic commits, credential files or live-vault access.
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const git='C:/Program Files/Git/cmd/git.exe';
if(!process.execArgv.includes('--use-system-ca')||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0'||/^(1|true|yes)$/i.test(process.env.GIT_SSL_NO_VERIFY||''))throw new Error('Use Node 24+ with --use-system-ca and normal certificate validation.');
const env={...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'};
function run(args,input){const r=spawnSync(git,['-c','http.sslBackend=schannel','-c','credential.interactive=never',...args],{cwd:root,env,input,encoding:'utf8',windowsHide:true});if(r.status!==0)throw new Error(`Git ${args[0]} failed; diagnostic output withheld to protect credentials.`);return r.stdout.trim();}
if(run(['remote','get-url','--push','origin'])!=='https://github.com/jogurtfm/color-sprint.git')throw new Error('Unexpected destination.');
const raw=run(['credential','fill'],'protocol=https\nhost=github.com\nusername=jogurtfm\n\n');
const token=raw.split(/\r?\n/).find(l=>l.startsWith('password='))?.slice(9);if(!token)throw new Error('Saved GitHub credential unavailable.');
const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'Color-Sprint-reviewed-release'};
const api='https://api.github.com/repos/jogurtfm/color-sprint';
async function request(url,options={}){let r;try{r=await fetch(url,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(600000)});}catch{throw new Error('GitHub HTTPS request failed; credential details withheld.');}if(!r.ok)throw new Error(`GitHub returned HTTP ${r.status}; response body withheld.`);return r.json();}
const account=await request('https://api.github.com/user'),repo=await request(api);
if(account.login!=='jogurtfm'||repo.private||!repo.permissions?.push)throw new Error('Expected public repository and authenticated account were not confirmed.');
const plugin=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8')),hud=JSON.parse(await readFile(path.join(root,'desktop/package.json'),'utf8'));
if(plugin.version!=='0.21.1'||hud.version!=='0.21.1')throw new Error('This reviewed release requires plugin and HUD 0.21.1.');
const commit=run(['rev-parse','HEAD']);
const remote=run(['ls-remote','origin','refs/heads/main']).split(/\s/)[0];
if(!process.argv.includes('--publish')){console.log(JSON.stringify({account:account.login,repository:repo.full_name,commit,remote,plugin:plugin.version,hud:hud.version,changesPublished:false}));process.exit(0);}
if(run(['diff','--cached','--name-only']))throw new Error('Commit the reviewed allowlist before publishing.');
const releaseSources=['assets/arcade','esbuild.mjs','scripts/test.mjs','scripts/preview.mjs','scripts/apply-planning.ts','scripts/check-planner-ui.mjs','scripts/check-exercises-ui.mjs','scripts/check-mobile-polish.mjs','scripts/package-plugin.mjs','src','styles.css','main.js','manifest.json','package.json','package-lock.json','versions.json','desktop/src','desktop/package.json','desktop/package-lock.json','desktop/build.mjs','desktop/package.mjs','scripts/publish-mobile-polish-release.mjs','MODULES.md','PROGRESS.md','TRUSTED-PLANNING.md','EXERCISES.md','MOBILE-POLISH.md','EFFORT.md','RATED-FINISH.md','SYNC.md','UPDATE-WORKFLOW.md','modules','tests','desktop/tests','desktop/preview.mjs','desktop/tsconfig.json'];
if(run(['diff','HEAD','--',...releaseSources]))throw new Error('Release sources differ from the reviewed commit.');
const getArg=name=>process.argv[process.argv.indexOf(name)+1];
async function zipArg(flag,folder,prefix){if(!process.argv.includes(flag))throw new Error(`Missing ${flag}.`);const file=path.resolve(root,getArg(flag)),base=path.resolve(root,folder);if(!file.startsWith(base+path.sep)||!path.basename(file).startsWith(prefix)||!file.endsWith('.zip'))throw new Error('Archive is outside its expected release directory.');const bytes=await readFile(file),hash=createHash('sha256').update(bytes).digest('hex');const sidecar=await readFile(file+'.sha256','utf8');if(!sidecar.startsWith(hash+'  '))throw new Error('Archive checksum mismatch.');return {bytes,hash};}

const hudZip=await zipArg('--hud-zip','desktop/release','Color-Sprint-HUD-0.21.1-win-x64-');
const pluginZip=await zipArg('--plugin-zip','release','Color-Sprint-plugin-0.21.1-');
const pluginAssets=[];for(const name of ['main.js','manifest.json','styles.css']){const bytes=await readFile(path.join(root,name));if(createHash('sha256').update(await readFile(path.join(path.resolve(root,getArg('--plugin-zip')).slice(0,-4),'color-sprint',name))).digest('hex')!==createHash('sha256').update(bytes).digest('hex'))throw new Error('Packaged plugin differs from reviewed runtime.');pluginAssets.push({name,bytes});}
pluginAssets.push({name:'Color-Sprint-plugin-0.21.1.zip',bytes:pluginZip.bytes});
// No force-push. A concurrent upstream edit fails normally.
run(['push','origin','HEAD:main']);
if(run(['ls-remote','origin','refs/heads/main']).split(/\s/)[0]!==commit)throw new Error('Remote commit read-back failed.');
async function release(tag,name,body,assets,latest){
  const local=spawnSync(git,['show-ref','--verify','--quiet',`refs/tags/${tag}`],{cwd:root,env,windowsHide:true});
  if(local.status!==0)run(['tag',tag,commit]);else if(run(['rev-list','-n','1',tag])!==commit)throw new Error('Existing tag points elsewhere; never overwrite it.');
  run(['push','origin',`refs/tags/${tag}`]);
  const releases=await request(api+'/releases?per_page=100');let r=releases.find(x=>x.tag_name===tag);
  if(!r)r=await request(api+'/releases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag_name:tag,target_commitish:commit,name,body,draft:true,prerelease:false})});
  const verified=[];
  for(const asset of assets){const hash=createHash('sha256').update(asset.bytes).digest('hex');let a=r.assets.find(x=>x.name===asset.name);if(!a){console.log(`Uploading ${asset.name} (${asset.bytes.length} bytes)`);a=await request(`https://uploads.github.com/repos/jogurtfm/color-sprint/releases/${r.id}/assets?name=${encodeURIComponent(asset.name)}`,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:asset.bytes});}if(a.size!==asset.bytes.length||a.digest&&a.digest!==`sha256:${hash}`)throw new Error(`Existing/uploaded asset differs: ${asset.name}. Never overwrite silently.`);verified.push({...asset,hash});}
  r=await request(`${api}/releases/${r.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft:false,make_latest:latest?'true':'false'})});
  for(const a of verified){const info=r.assets.find(x=>x.name===a.name);const response=await fetch(info.browser_download_url,{signal:AbortSignal.timeout(600000)});if(!response.ok)throw new Error(`Public download failed: ${a.name}.`);const actual=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');if(actual!==a.hash)throw new Error(`Public asset hash mismatch: ${a.name}.`);}
  return {url:r.html_url,tag,verifiedAssets:verified.map(x=>({name:x.name,sha256:x.hash}))};
}
const pluginRelease=await release(plugin.version,'Color Sprint 0.21.1 · Pocket HUD mobile polish','Touch-first Pocket HUD polish: layered cards, compact rank/progress, clearer Focus, condensed secondary actions and counted obligations. Finite view transitions and completion check/ring feedback respect OS Reduce Motion and Effects settings. Navigation rails and expanded details retain context on refresh. Workout creation is on Workouts/body-category views. No tracker migration, scoring change or fabricated progress. See MOBILE-POLISH.md.',pluginAssets,true);
const checksum=Buffer.from(`${hudZip.hash}  Color-Sprint-HUD-0.21.1-win-x64.zip\n`);
const hudRelease=await release('hud-0.21.1','Color Sprint HUD 0.21.1 · Matching mobile plugin bundle','Packages plugin 0.21.1 with the Pocket HUD mobile polish. Windows cinematic layout and signed bridge behavior are unchanged. Existing exercise targets and actual set logging remain available. Side-by-side local preparation preserves profiles and prior builds; no forced restart or personal tracker migration.',[{name:'Color-Sprint-HUD-0.21.1-win-x64.zip',bytes:hudZip.bytes},{name:'SHA256SUMS.txt',bytes:checksum}],false);
const latest=await request(api+'/releases/latest');if(latest.tag_name!=='0.21.1')throw new Error('BRAT latest must remain plugin 0.21.1.');
// User-authorized three-target shipping. Local targets remain private, opt-in and backed up.
let local={status:'not-configured'};
const {localPaths}=await import('./deploy-local.mjs');
const localDirectories=localPaths();let targets;
try{targets=JSON.parse(await readFile(path.join(localDirectories.profile,'deploy-targets.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
if(targets){if(targets.schema!==1||path.resolve(targets.hudRoot).toLowerCase()!==path.resolve(localDirectories.hudRoot).toLowerCase())throw new Error('Unexpected local target configuration.');const deployed=spawnSync(process.execPath,[path.join(root,'scripts/deploy-local.mjs'),'--install','--hud-release',path.resolve(root,getArg('--hud-zip')).slice(0,-4)],{cwd:root,encoding:'utf8',windowsHide:true});if(deployed.status!==0)throw new Error('GitHub releases are published, but local deployment failed. Inspect the local deploy step before claiming all three targets updated.');local=JSON.parse(await readFile(path.join(localDirectories.profile,'last-deployment.json'),'utf8'));}
console.log(JSON.stringify({commit,plugin:pluginRelease,hud:hudRelease,latest:latest.tag_name,local},null,2));
