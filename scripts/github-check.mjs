// Read-only authentication check: secrets are captured in memory, never printed or persisted.
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const git='C:/Program Files/Git/cmd/git.exe';
const expectedRemote='https://github.com/jogurtfm/color-sprint.git';
export async function checkGitHub({run=spawnSync,request=fetch,environment=process.env}={}){
  if(environment.NODE_TLS_REJECT_UNAUTHORIZED==='0'||/^(1|true|yes)$/i.test(environment.GIT_SSL_NO_VERIFY||''))throw new Error('Refusing an insecure TLS configuration. Certificate verification must stay enabled.');
  const env={...environment,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'};
  function invoke(args,input){
    const result=run(git,['-c','http.sslBackend=schannel','-c','credential.interactive=never',...args],{cwd:root,env,encoding:'utf8',windowsHide:true,input,timeout:20000});
    if(result.status!==0)throw new Error(`GitHub check failed during ${args[0]}. Credentials and command output were withheld. Sign in with Git Credential Manager if needed.`);
    return result.stdout.trim();
  }
  if(invoke(['remote','get-url','--push','origin'])!==expectedRemote)throw new Error('Unexpected push remote. Check stopped without retrieving credentials.');
  const raw=invoke(['credential','fill'],'protocol=https\nhost=github.com\nusername=jogurtfm\n\n');
  const credential=Object.fromEntries(raw.split(/\r?\n/).filter(Boolean).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
  if(!credential.password)throw new Error('No saved GitHub credential was available. No sign-in window was opened.');
  const headers={Authorization:`Bearer ${credential.password}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'Color-Sprint-auth-check'};
  async function get(resource){
    let response;
    try{response=await request(`https://api.github.com${resource}`,{headers,signal:AbortSignal.timeout(20000),redirect:'error'});}
    catch{throw new Error('GitHub HTTPS check failed. Use scripts/github.ps1 with trusted Node 24+; certificate checks were not disabled.');}
    if(!response.ok)throw new Error(`GitHub authentication check returned HTTP ${response.status}. No response body or credential was printed.`);
    return response.json();
  }
  const account=await get('/user');
  if(account.login!=='jogurtfm')throw new Error('Saved credential belongs to a different account. Check stopped before repository operations.');
  const repo=await get('/repos/jogurtfm/color-sprint');
  if(!repo.permissions?.push)throw new Error('The authenticated account lacks push permission for Color Sprint.');
  // Receive-pack authentication is exercised without committing, changing refs, or uploading a release.
  invoke(['push','--dry-run','origin','HEAD:main']);
  const remote=invoke(['ls-remote','origin','refs/heads/main']).split(/\s/)[0];
  const head=invoke(['rev-parse','HEAD']);
  return {account:account.login,repository:repo.full_name,pushAllowed:true,dryRunPush:'passed',remoteMatchesHead:remote===head,localHead:head,remoteHead:remote,changesPublished:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(await checkGitHub(),null,2));}
  catch(error){console.error(error instanceof Error?error.message:'GitHub check failed.');process.exitCode=1;}
}
