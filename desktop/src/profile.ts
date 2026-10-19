import path from 'node:path';
/** App-owned state belongs in application data, not beside a ZIP under Documents. */
export function profileDirectory(override:string|undefined,localAppData:string|undefined,appData:string):string{
  if(override)return path.resolve(override);
  const base=localAppData&&path.isAbsolute(localAppData)?localAppData:appData;
  return path.join(base,'Color Sprint HUD');
}
