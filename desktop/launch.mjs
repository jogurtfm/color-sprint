import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(path.join(root,'node_modules/electron/dist/electron.exe'),[root,...process.argv.slice(2)],{cwd:root,env,stdio:'inherit',windowsHide:true});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>process.exitCode=code??1);
