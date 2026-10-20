import {execFile} from 'node:child_process';
import path from 'node:path';
export const SPOTIFY_ACTIONS=['status','play','pause','next','previous'] as const;
export type SpotifyAction=typeof SPOTIFY_ACTIONS[number];
export interface SpotifyState {available:boolean;message:string;title?:string;artist?:string;playing?:boolean;play?:boolean;pause?:boolean;next?:boolean;previous?:boolean;accepted?:boolean|null}
export function spotifyAction(value:unknown):SpotifyAction {if(typeof value!=='string'||!SPOTIFY_ACTIONS.includes(value as SpotifyAction))throw new Error('Unsupported Spotify command.');return value as SpotifyAction;}
export function cleanSpotifyState(raw:unknown):SpotifyState {
  if(!raw||typeof raw!=='object'||typeof (raw as any).available!=='boolean')throw new Error('Invalid local Spotify response.');
  const x=raw as any,result:SpotifyState={available:x.available,message:typeof x.message==='string'?x.message.slice(0,240):''};
  if(result.available){result.title=typeof x.title==='string'?x.title.slice(0,300):'';result.artist=typeof x.artist==='string'?x.artist.slice(0,300):'';for(const key of ['playing','play','pause','next','previous'] as const)result[key]=x[key]===true;result.accepted=typeof x.accepted==='boolean'?x.accepted:null;}
  return result;
}
/** Static packaged script, a five-command allowlist, no shell, tokens or user-supplied code. */
export class LocalSpotify {
  private pending:Promise<SpotifyState>|null=null;
  constructor(private script:string,private systemRoot:string){}
  async run(value:unknown):Promise<SpotifyState>{
    const action=spotifyAction(value);if(this.pending){if(action==='status')return this.pending;throw new Error('Wait for the current Spotify command.');}
    const exe=path.join(this.systemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe');
    this.pending=new Promise<SpotifyState>(resolve=>execFile(exe,['-NoProfile','-NonInteractive','-File',this.script,'-Action',action],{windowsHide:true,timeout:12000,maxBuffer:16384,encoding:'utf8'},(error,stdout)=>{
      if(error){resolve({available:false,message:'Local Spotify controls could not start. No security settings were changed.'});return;}
      try{resolve(cleanSpotifyState(JSON.parse(stdout.replace(/^\uFEFF/,'').trim())));}catch{resolve({available:false,message:'Local Spotify controls returned no usable response.'});}
    }));
    try{return await this.pending;}finally{this.pending=null;}
  }
}
