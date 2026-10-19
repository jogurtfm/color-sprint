import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkGitHub} from './github-check.mjs';

function fixture({remote='https://github.com/jogurtfm/color-sprint.git',account='jogurtfm',push=true,status=200,failGit=false,failRequest=false}={}){
  const calls=[],requests=[];
  return {calls,requests,options:{environment:{},run(_exe,args,options){
    calls.push({args,options});const index=args.findIndex(a=>['remote','credential','push','ls-remote','rev-parse'].includes(a));const command=args[index];
    if(failGit)return {status:1,stderr:'FAKE_SECRET must not escape'};
    return {status:0,stdout:command==='remote'?remote:command==='credential'?'username=jogurtfm\npassword=FAKE_SECRET\n':command==='ls-remote'?'abc123\trefs/heads/main\n':command==='rev-parse'?'abc123\n':'Everything up-to-date\n'};
  },async request(url,options){requests.push({url,options});if(failRequest)throw new Error('FAKE_SECRET');return {ok:status===200,status,json:async()=>url.endsWith('/user')?{login:account}:{full_name:'jogurtfm/color-sprint',permissions:{push}}};}}};
}
test('checks the expected account, authenticated push permission and dry-run without publishing',async()=>{
  const f=fixture(),result=await checkGitHub(f.options);
  assert.equal(result.account,'jogurtfm');assert.equal(result.dryRunPush,'passed');assert.equal(result.remoteMatchesHead,true);assert.equal(result.changesPublished,false);
  assert.ok(!JSON.stringify(result).includes('FAKE_SECRET'));
  assert.equal(f.requests.length,2);assert.ok(f.requests.every(r=>r.options.headers.Authorization==='Bearer FAKE_SECRET'&&r.options.redirect==='error'));
  assert.ok(f.calls.some(c=>c.args.includes('push')&&c.args.includes('--dry-run')));
  assert.ok(f.calls.every(c=>c.args.includes('http.sslBackend=schannel')&&c.options.env.GCM_INTERACTIVE==='Never'));
  assert.ok(!f.calls.some(c=>c.args.includes('commit')||c.args.includes('tag')));
});
test('unexpected remotes fail before credential retrieval or HTTP',async()=>{
  const f=fixture({remote:'https://example.invalid/repo.git'});await assert.rejects(checkGitHub(f.options),/Unexpected push remote/);
  assert.equal(f.calls.length,1);assert.equal(f.requests.length,0);
});
test('wrong account or insufficient permissions never attempts a push',async()=>{
  for(const settings of [{account:'someone-else'},{push:false}]){const f=fixture(settings);await assert.rejects(checkGitHub(f.options));assert.ok(!f.calls.some(c=>c.args.includes('push')));}
});
test('errors redact credential-helper and HTTP internals',async()=>{
  for(const settings of [{failGit:true},{failRequest:true},{status:401}]){
    const f=fixture(settings);await assert.rejects(checkGitHub(f.options),error=>!error.message.includes('FAKE_SECRET'));
  }
});
test('insecure TLS bypasses are rejected before any operation',async()=>{
  for(const environment of [{NODE_TLS_REJECT_UNAUTHORIZED:'0'},{GIT_SSL_NO_VERIFY:'true'}]){
    const f=fixture();await assert.rejects(checkGitHub({...f.options,environment}),/insecure TLS/);assert.equal(f.calls.length,0);
  }
});
