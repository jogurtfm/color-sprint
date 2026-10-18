import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const tests=readdirSync('tests').filter(f=>f.endsWith('.test.ts')).map(f=>`tests/${f}`);
const result=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','--test',...tests],{stdio:'inherit'});
process.exit(result.status??1);
