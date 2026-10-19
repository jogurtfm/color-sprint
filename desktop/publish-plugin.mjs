// Explicit release workflow. Credentials stay in memory and are never logged or written.
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const desktop=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(desktop,'..'),git='C:/Program Files/Git/cmd/git.exe';
if(!process.execArgv.includes('--use-system-ca'))throw new Error('Run scripts/github.ps1 -Action PluginPreflight (or PublishPlugin for an approved release). Windows certificate validation must stay enabled.');
const env={...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'};
function run(args,input){const r=spawnSync(git,['-c','http.sslBackend=schannel',...args],{cwd:root,env,encoding:'utf8',windowsHide:true,input});if(r.status!==0)throw new Error(`Git ${args[0]} failed. Credential-helper output was withheld.`);return r.stdout.trim();}
const credentials=run(['credential','fill'],'protocol=https\nhost=github.com\n\n');
const credential=Object.fromEntries(credentials.split(/\r?\n/).filter(Boolean).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
if(!credential.password)throw new Error('GitHub credential unavailable. No credential was printed.');
const endpoint='https://api.github.com/repos/jogurtfm/color-sprint';
const headers={Authorization:`Bearer ${credential.password}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'Color-Sprint-release'};
async function request(url,init={}){const r=await fetch(url,{...init,headers:{...headers,...init.headers}});if(!r.ok)throw new Error(`GitHub request failed (${r.status}). No credentials were printed.`);return r.json();}
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8')),version=manifest.version;
if(manifest.id!=='color-sprint'||!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Invalid Color Sprint release manifest.');
const repo=await request(endpoint),remote=run(['ls-remote','origin','refs/heads/main']).split(/\s/)[0],head=run(['rev-parse','HEAD']);
if(!repo.permissions?.push)throw new Error('Connected GitHub account does not have push permission.');
if(!process.argv.includes('--publish')){console.log(JSON.stringify({repository:repo.full_name,pushAllowed:true,remoteMatchesHead:remote===head,version,authorConfigured:!!run(['config','user.name'])&&!!run(['config','user.email'])}));process.exit(0);}
if(version!=='0.11.0')throw new Error('Publishing remains scoped to the previously approved 0.11.0 allowlist. Review the new release files and update this guard only with explicit publishing approval.');
const expected=['FORMAT.md','HUD-BRIDGE.md','README.md','SYNC.md','main.js','manifest.json','package-lock.json','package.json','src/hud-protocol.ts','src/hud-store.ts','src/main.ts','tests/plugin.test.ts','versions.json'].sort();
const staged=run(['diff','--cached','--name-only']).split(/\r?\n/).filter(Boolean).sort();
if(staged.length){if(JSON.stringify(staged)!==JSON.stringify(expected))throw new Error('Staged files do not match this plugin-only release. Nothing committed.');if(remote!==head)throw new Error('Remote changed; reconcile before committing.');run(['commit','-m','Add conflict-safe Obsidian bridge for desktop HUD controls']);}
const commit=run(['rev-parse','HEAD']);run(['push','origin','HEAD:main']);
const localTag=spawnSync(git,['show-ref','--verify','--quiet',`refs/tags/${version}`],{cwd:root,env,windowsHide:true});
if(localTag.status!==0)run(['tag',version,commit]);else if(run(['rev-list','-n','1',version])!==commit)throw new Error('Existing release tag points elsewhere.');
run(['push','origin',`refs/tags/${version}`]);
const check=await fetch(`${endpoint}/releases/tags/${version}`,{headers});let release;
if(check.status===404)release=await request(`${endpoint}/releases`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag_name:version,target_commitish:commit,name:`Color Sprint ${version} · Desktop HUD bridge`,draft:false,prerelease:false,body:'Adds the signed, conflict-safe Windows HUD bridge. Obsidian remains the tracker writer; phone checkpoints and planning proposals remain separate.\n\nUpdate through BRAT, then reload Color Sprint (or restart Obsidian). Keep Windows Obsidian open and approve the HUD pairing request once. The plugin remains mobile compatible; the desktop bridge itself runs only in Windows Obsidian.\n\nDesktop HUD releases are separate. This release contains the Obsidian plugin only.'})});
else if(check.ok)release=await check.json();else throw new Error(`Release lookup failed (${check.status}).`);
const verified=[];for(const name of ['main.js','manifest.json','styles.css']){
  const bytes=await readFile(path.join(root,name)),hash=createHash('sha256').update(bytes).digest('hex');let asset=release.assets?.find(a=>a.name===name);
  if(!asset)asset=await request(`https://uploads.github.com/repos/jogurtfm/color-sprint/releases/${release.id}/assets?name=${name}`,{method:'POST',headers:{'Content-Type':name.endsWith('.json')?'application/json':'application/octet-stream'},body:bytes});
  const downloaded=await fetch(asset.browser_download_url);if(!downloaded.ok)throw new Error(`Public asset ${name} is not available.`);const actual=createHash('sha256').update(Buffer.from(await downloaded.arrayBuffer())).digest('hex');if(actual!==hash)throw new Error(`Published ${name} does not match the validated build.`);verified.push(name);
}
const latest=await request(`${endpoint}/releases/latest`);if(latest.tag_name!==version)throw new Error('BRAT latest release has not switched to 0.11.0.');
console.log(JSON.stringify({version,commit,url:release.html_url,publicAssetsVerified:verified,latest:latest.tag_name},null,2));
