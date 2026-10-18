import { build } from 'esbuild';
await build({ entryPoints: ['src/main.ts'], bundle: true, external: ['obsidian'],
  platform: 'browser', target: ['es2020', 'safari14'], format: 'cjs', outfile: 'main.js',
  banner: { js: '/* Color Sprint — MIT — https://github.com/jogurtfm/color-sprint */' } });
