import {build} from '../node_modules/esbuild/lib/main.js';
import {mkdir,copyFile,readFile,access,readdir} from 'node:fs/promises';
import path from 'node:path';
// Scope source resolution to explicit project files rather than walking drive-root directories.
const sources={name:'project-sources',setup(b){b.onResolve({filter:/.*/},async args=>{if(args.path==='electron'||args.path.startsWith('node:'))return {path:args.path,external:true};let file=args.path==='three'?path.resolve('node_modules/three/build/three.module.js'):path.isAbsolute(args.path)?args.path:path.resolve(args.importer?path.dirname(args.importer):process.cwd(),args.path);for(const candidate of [file,`${file}.ts`,`${file}.js`])try{await access(candidate);return {path:candidate,namespace:'hud-source'};}catch{}return {errors:[{text:`Project source not found: ${file}`}]};});b.onLoad({filter:/.*/,namespace:'hud-source'},async args=>({contents:await readFile(args.path,/\.(png|wav)$/.test(args.path)?undefined:'utf8'),loader:/\.(png|wav)$/.test(args.path)?'dataurl':args.path.endsWith('.ts')?'ts':'js'}));}};
// Omit absolute source-path comments from public binaries; editable source stays in Git.
const common={absWorkingDir:process.cwd(),plugins:[sources],minifyWhitespace:true,legalComments:'eof',tsconfigRaw:{compilerOptions:{target:'ES2022',useDefineForClassFields:true}},logLevel:'info'};
await mkdir('dist',{recursive:true});
await build({...common,entryPoints:[path.resolve('src/main.ts')],outfile:'dist/main.cjs',bundle:true,platform:'node',format:'cjs',target:'node22',external:['electron'],sourcemap:false});
await build({...common,entryPoints:[path.resolve('src/preload.ts')],outfile:'dist/preload.cjs',bundle:true,platform:'node',format:'cjs',target:'node22',external:['electron']});
await build({...common,entryPoints:[path.resolve('src/renderer.ts')],outfile:'dist/renderer.js',bundle:true,platform:'browser',target:'chrome130',format:'iife'});
for(const file of ['index.html','hud.css','rim.css','glass.css','effects.css','launcher.css','holograms.css','cinema.css','spatial.css','three-hud.css','interaction.css','workspace.css'])await copyFile(`src/${file}`,`dist/${file}`);
await copyFile('node_modules/three/LICENSE','dist/LICENSE-three.txt');
if(process.argv.includes('--tests')){await build({...common,entryPoints:[path.resolve('tests/core.test.ts')],outfile:'test-results/core.test.cjs',bundle:true,platform:'node',format:'cjs',target:'node22'});await build({...common,entryPoints:[path.resolve('src/qa-exports.ts')],outfile:'test-results/fixtures.cjs',bundle:true,platform:'node',format:'cjs',target:'node22'});}
if(process.argv.includes('--tests'))await build({...common,entryPoints:[path.resolve('tests/rim.test.ts')],outfile:'test-results/rim.test.cjs',bundle:true,platform:'node',format:'cjs',target:'node22'});
if(process.argv.includes('--tests'))await build({...common,entryPoints:[path.resolve('tests/navigation.test.ts')],outfile:'test-results/navigation.test.cjs',bundle:true,platform:'node',format:'cjs',target:'node22'});
if(process.argv.includes('--tests'))await build({...common,entryPoints:[path.resolve('tests/sync.test.ts')],outfile:'test-results/sync.test.cjs',bundle:true,platform:'node',format:'cjs',target:'node22'});
if(process.argv.includes('--tests'))await build({...common,entryPoints:[path.resolve('tests/editing.test.ts')],outfile:'test-results/editing.test.cjs',bundle:true,platform:'node',format:'cjs',target:'node22'});
if(process.argv.includes('--tests'))await build({...common,entryPoints:[path.resolve('tests/launcher.test.ts')],outfile:'test-results/launcher.test.cjs',bundle:true,platform:'node',format:'cjs',target:'node22'});
console.log('HUD built: main, isolated preload and renderer.');
if(process.argv.includes('--tests'))await build({...common,entryPoints:[path.resolve('tests/bridge.test.ts')],outfile:'test-results/bridge.test.cjs',bundle:true,platform:'node',format:'cjs',target:'node22'});
if(process.argv.includes('--tests'))await build({...common,entryPoints:[path.resolve('tests/three.test.ts')],outfile:'test-results/three.test.cjs',bundle:true,platform:'node',format:'cjs',target:'node22'});
if(process.argv.includes('--tests'))await build({...common,entryPoints:[path.resolve('src/three-qa.ts')],outfile:'test-results/three-fixtures.cjs',bundle:true,platform:'node',format:'cjs',target:'node22'});
if(process.argv.includes('--plugin-tests')){
  await build({...common,tsconfigRaw:{compilerOptions:{target:'ES2020'}},entryPoints:[path.resolve('../src/main.ts')],outfile:'../main.js',bundle:true,platform:'browser',format:'cjs',target:['es2020','safari14'],banner:{js:'/* Color Sprint — MIT — https://github.com/jogurtfm/color-sprint */'},external:['obsidian'],plugins:[{name:'obsidian-api',setup(b){b.onResolve({filter:/^obsidian$/},args=>({path:args.path,external:true}));}},sources]});
  for(const test of (await readdir('../tests')).filter(x=>x.endsWith('.test.ts')))await build({...common,entryPoints:[path.resolve('../tests',test)],outfile:`test-results/plugin/${test.replace('.ts','.mjs')}`,bundle:true,platform:'node',format:'esm',target:'node22'});
}
