import { build } from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
const marker='/* Task module styles */';
await writeFile('styles.css',(await readFile('styles.css','utf8')).split(marker)[0].trimEnd()+'\n'+marker+'\n'+await readFile('src/modules/modules.css','utf8')+'\n'+await readFile('src/progress.css','utf8')+'\n'+await readFile('src/mobile.css','utf8')+'\n'+await readFile('src/mobile-hud.css','utf8'));
await build({ entryPoints: ['src/main.ts'], bundle: true, external: ['obsidian','node:*'],loader:{'.png':'dataurl','.wav':'dataurl','.md':'text'},
  platform: 'browser', target: ['es2020', 'safari14'], format: 'cjs', outfile: 'main.js', minifyWhitespace: true,
  banner: { js: '/* Color Sprint — MIT — https://github.com/jogurtfm/color-sprint */' } });
