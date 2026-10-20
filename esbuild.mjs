import { build } from 'esbuild';
await build({ entryPoints: ['src/main.ts'], bundle: true, external: ['obsidian'],loader:{'.png':'dataurl','.wav':'dataurl'},
  platform: 'browser', target: ['es2020', 'safari14'], format: 'cjs', outfile: 'main.js', minifyWhitespace: true,
  banner: { js: '/* Color Sprint — MIT — https://github.com/jogurtfm/color-sprint */' } });
