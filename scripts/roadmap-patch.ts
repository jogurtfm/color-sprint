import { readFileSync } from 'node:fs';
import { parseBoard } from '../src/model';
import { addRoadmap } from '../src/roadmaps';

const path=process.argv[2];if(!path)throw new Error('Pass a tracker Markdown path. This command prints an additive patch; it does not write files.');
const source=readFileSync(path,'utf8');const before=parseBoard(source);let next=source;
if(/^## Subtasks\s*$/m.test(source))throw new Error('This tracker already has a Subtasks section. Add roadmaps through the task interface.');
for(const id of ['audio-portfolio','clean-room','lyrics','write-code','japanese','model'])if(before.tasks.some(task=>task.id===id))next=addRoadmap(next,id);
if(before.tasks.some(task=>task.id==='hard-task')){next=addRoadmap(next,'hard-task','2020 Tax');next=addRoadmap(next,'hard-task','Letters');}
const after=parseBoard(next);if(JSON.stringify(before.entries)!==JSON.stringify(after.entries)||JSON.stringify(before.timer)!==JSON.stringify(after.timer)||JSON.stringify(before.sessions)!==JSON.stringify(after.sessions))throw new Error('Unexpected progress change.');
if(next===source){console.log(JSON.stringify({added:0,verified:true}));}else{
  const added=next.slice(source.length).trim();const last=source.trimEnd().split(/\r?\n/).slice(-2).join('\n');const patch=`*** Begin Patch\n*** Update File: ${path}\n@@\n${last.split('\n').map(line=>' '+line).join('\n')}\n+\n${added.split(/\r?\n/).map(line=>'+'+line).join('\n')}\n*** End Patch`;
  console.log(JSON.stringify({added:after.subtasks.length-before.subtasks.length,patch,verified:true}));
}
