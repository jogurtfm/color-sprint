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
if(plugin.version!=='0.12.0'||hud.version!=='0.11.0')throw new Error('This reviewed publisher only covers plugin 0.12.0 and HUD 0.11.0.');
const commit=run(['rev-parse','HEAD']);
const remote=run(['ls-remote','origin','refs/heads/main']).split(/\s/)[0];
if(!process.argv.includes('--publish')){console.log(JSON.stringify({account:account.login,repository:repo.full_name,commit,remote,plugin:plugin.version,hud:hud.version,changesPublished:false}));process.exit(0);}
if(run(['diff','--cached','--name-only']))throw new Error('Commit the reviewed allowlist before publishing.');
const releaseSources=['src','styles.css','main.js','manifest.json','package.json','package-lock.json','versions.json','desktop/src','desktop/package.json','desktop/package-lock.json','desktop/build.mjs','desktop/package.mjs','scripts/publish-queue-release.mjs'];
if(run(['diff','HEAD','--',...releaseSources]))throw new Error('Release sources differ from the reviewed commit.');
const getArg=name=>process.argv[process.argv.indexOf(name)+1];
async function zipArg(flag,folder,prefix){if(!process.argv.includes(flag))throw new Error(`Missing ${flag}.`);const file=path.resolve(root,getArg(flag)),base=path.resolve(root,folder);if(!file.startsWith(base+path.sep)||!path.basename(file).startsWith(prefix)||!file.endsWith('.zip'))throw new Error('Archive is outside its expected release directory.');const bytes=await readFile(file),hash=createHash('sha256').update(bytes).digest('hex');const sidecar=await readFile(file+'.sha256','utf8');if(!sidecar.startsWith(hash+'  '))throw new Error('Archive checksum mismatch.');return {bytes,hash};}
const pluginZip=await zipArg('--plugin-zip','release','Color-Sprint-plugin-0.12.0-');
const hudZip=await zipArg('--hud-zip','desktop/release','Color-Sprint-HUD-0.11.0-win-x64-');
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
const pluginAssets=await Promise.all(['main.js','manifest.json','styles.css'].map(async name=>({name,bytes:await readFile(path.join(root,name))})));
pluginAssets.push({name:'Color-Sprint-plugin-0.12.0.zip',bytes:pluginZip.bytes});
const pluginRelease=await release('0.12.0','Color Sprint 0.12.0 · Quick Queue','Build an on-the-fly mixed task queue on desktop and mobile. Reorder steps, edit minutes, append tasks, and expand roadmap steps. Timed targets advance without inventing completion; Finish checks off and advances, Skip leaves work open, Cancel preserves progress. Runner handoff avoids duplicate automatic advancement, but is not a distributed sync lock.\n\nUpdate through BRAT, reload Color Sprint, and let Relay sync before changing runners. Keep Obsidian open for timers; iOS background alarms are not guaranteed. Windows HUD is a separate download under hud-0.11.0. See QUICK-QUEUE.md for behavior and limitations.',pluginAssets,true);
const checksum=Buffer.from(`${hudZip.hash}  Color-Sprint-HUD-0.11.0-win-x64.zip\n`);
const hudRelease=await release('hud-0.11.0','Color Sprint HUD 0.11.0 · Command Deck','Windows portable HUD with cinematic command-rail tabs: Today, Queue, Digest, Week, Pages, Goals and History. Etched panels, cyan active indicators, amber focus controls, sector labels and numbered queue steps match the existing visor. Flat control hit regions preserve pointer usability; motion settings remain respected.\n\nQuick Queue shares standard Markdown with mobile. Includes companion Obsidian plugin 0.12.0. Update through BRAT first; quit the old HUD before launching this build. Existing LocalAppData settings remain intact. A fresh profile must connect its tracker in Settings.\n\n112 plugin and 94 HUD checks pass, plus typechecks and browser pointer/layout checks. Physical iPhone and native Windows acceptance remain pending. Unsigned portable application; no background iPhone alarm promise and no security bypass required.',[{name:'Color-Sprint-HUD-0.11.0-win-x64.zip',bytes:hudZip.bytes},{name:'SHA256SUMS.txt',bytes:checksum}],false);
const latest=await request(api+'/releases/latest');if(latest.tag_name!=='0.12.0')throw new Error('BRAT latest must remain plugin 0.12.0.');
console.log(JSON.stringify({commit,plugin:pluginRelease,hud:hudRelease,latest:latest.tag_name},null,2));
