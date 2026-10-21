import type {ModuleLoader} from './contracts';
/** This loader executes only after an active bound focus step is found. */
export const builtinModules:ReadonlyMap<string,ModuleLoader>=new Map([
  ['japanese-srs',async()=> (await import('./japanese/module')).japaneseModule],
  ['cookbook',async()=> (await import('./cookbook/module')).cookbookModule]
]);
