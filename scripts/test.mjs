import {readdirSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {build} from 'esbuild';
await mkdir('test-results',{recursive:true});
const tests=readdirSync('tests').filter(f=>f.endsWith('.test.ts'));
for(const file of tests)await build({entryPoints:['tests/'+file],outfile:'test-results/'+file.replace('.ts','.mjs'),bundle:true,platform:'node',format:'esm',target:'node22',loader:{'.png':'dataurl','.wav':'dataurl'},logLevel:'silent'});
const result=spawnSync(process.execPath,['--test',...tests.map(f=>'test-results/'+f.replace('.ts','.mjs'))],{stdio:'inherit'});
process.exit(result.status??1);
