import { readFile, mkdir, lstat, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseProposal, syncFolder, syncNote, PlanProposal } from '../src/sync';

// Run through tsx. Writes one NEW proposal only; never edits the live tracker.
async function main():Promise<void>{
const args=new Map<string,string>();for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i],value=process.argv[i+1];if(!['--vault','--tracker','--base','--proposed'].includes(key)||!value||args.has(key))throw new Error('Usage: plan-proposal.ts --vault VAULT --tracker Sync/Color Sprint.md --base BASE.md --proposed PROPOSED.md');args.set(key,value);}
for(const key of ['--vault','--tracker','--base','--proposed'])if(!args.has(key))throw new Error(`Missing ${key}`);
const vault=await realpath(args.get('--vault')!),tracker=args.get('--tracker')!;
const proposal:PlanProposal={version:1,id:`plan-${randomUUID()}`,tracker,created:new Date().toISOString(),base:await readFile(args.get('--base')!,'utf8'),proposed:await readFile(args.get('--proposed')!,'utf8')};
const note=syncNote('proposal',proposal);parseProposal(note);
let folder=vault;for(const part of [...syncFolder(tracker).split('/'),'Proposals']){folder=path.join(folder,part);try{const metadata=await lstat(folder);if(!metadata.isDirectory()||metadata.isSymbolicLink())throw new Error('Proposal destination must be ordinary directories, not links.');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;await mkdir(folder);}}
const output=path.join(folder,proposal.id+'.md');await writeFile(output,note,{flag:'wx'});if(await readFile(output,'utf8')!==note)throw new Error('Proposal read-back mismatch. Inspect the written note.');console.log(output);
}
void main().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
