import { validDay } from './model';
import { vaultPath } from './daily';

export const DEFAULT_VOICE_FOLDER='Sync/Reflection/Voice';
export function voicePath(folder:string,day:string):string {
  if(!validDay(day))throw new Error('Choose a real YYYY-MM-DD date for your reflection.');
  return `${vaultPath(folder,true)}/${day}.md`;
}
export function voiceScaffold(day:string):string {
  if(!validDay(day))throw new Error('Choose a real YYYY-MM-DD date for your reflection.');
  return `---\nvoice-reflection-date: "${day}"\n---\n\n# Voice reflection · ${day}\n\nSay what is on your mind. It does not have to be polished or turn into a task.\n\nRecord from Color Sprint's voice panel, then use the floating Stop & save button when finished. Audio recorder: Stop recording in the command palette also works. Stay in this note until its audio player appears. Allow microphone access if asked.\n\nAudio files stay in your vault and follow your own attachment and sync settings. No transcription is requested by Color Sprint.\n\n## Notes (optional)\n\n\n## Recordings\n\n`;
}

// Obsidian exposes these core commands at runtime, not in its public API types.
// Guard the entire bridge; never guess a toggle command or hijack an existing recording.
export interface RecorderBridge {
  commands?:Record<string,{checkCallback?:(checking:boolean)=>boolean|void}>;
  executeCommandById?:(id:string)=>boolean;
}
export function recorderState(bridge?:RecorderBridge):{available:boolean;recording:boolean|null} {
  const start=bridge?.commands?.['audio-recorder:start'],stop=bridge?.commands?.['audio-recorder:stop'];
  if(!start||!stop||typeof bridge?.executeCommandById!=='function')return {available:false,recording:null};
  try {const recording=stop.checkCallback?.(true);return {available:true,recording:typeof recording==='boolean'?recording:null};}
  catch {return {available:true,recording:null};}
}
export function requireRecorder(bridge?:RecorderBridge):void {
  const state=recorderState(bridge);
  if(!state.available)throw new Error('Enable Audio recorder in Obsidian Settings → Core plugins on this device. You can still open the journal and insert recordings manually.');
  if(state.recording===true)throw new Error('Audio recorder is already recording. Stop and save that recording in its current note before starting another.');
  if(state.recording===null)throw new Error('Recorder status is unavailable in this Obsidian version. Open the journal and use Audio recorder: Start recording manually.');
}

export function requireRecording(bridge?:RecorderBridge):void {
  const state=recorderState(bridge);
  if(!state.available)throw new Error('Audio recorder controls are unavailable. Use Obsidian’s Audio recorder: Stop recording command.');
  if(state.recording!==true)throw new Error(state.recording===null?'Recorder status is unavailable. Use Audio recorder: Stop recording manually.':'No audio recording is currently active.');
}
export function hasNewAudioEmbed(before:string,after:string):boolean {
  const embeds=(text:string)=>{const tokens=text.match(/!\[\[[^\]\n]+\]\]|!\[[^\]\n]*\]\([^\n)]+\)/g)||[];return tokens.filter(token=>{try{return /\.(webm|m4a|mp3|wav|ogg|mp4|aac|flac|opus)(?:[\s|#?\]>)]|$)/i.test(decodeURIComponent(token));}catch{return false;}});};
  const counts=new Map<string,number>();for(const token of embeds(before))counts.set(token,(counts.get(token)||0)+1);
  for(const token of embeds(after)){const count=counts.get(token)||0;if(!count)return true;counts.set(token,count-1);}return false;
}
export async function waitForAudioEmbed(before:string,read:()=>string,options:{timeoutMs?:number;pollMs?:number;cancelled?:()=>boolean}={}):Promise<void>{
  const deadline=Date.now()+(options.timeoutMs??12000);while(!options.cancelled?.()){if(hasNewAudioEmbed(before,read()))return;if(Date.now()>=deadline)throw new Error('Stop was requested, but a new audio embed was not confirmed. Keep the journal open and check Obsidian’s saved recordings before trying again.');await new Promise(resolve=>setTimeout(resolve,options.pollMs??100));}throw new Error('Recording save confirmation was interrupted. Check the journal before recording again.');
}
export interface VoiceState {available:boolean;recording:boolean|null;saving?:boolean}
export function mountRecordingBar(root:HTMLElement,options:{state:()=>VoiceState;stop:()=>Promise<void>;error:(error:unknown)=>void;target?:()=>string}):{update:()=>void;destroy:()=>void}{
  const doc=root.ownerDocument,bar=doc.createElement('section');bar.className='cs-recording-bar';bar.setAttribute('aria-label','Voice recording controls');const info=doc.createElement('div'),status=doc.createElement('strong'),target=doc.createElement('small'),button=doc.createElement('button');status.setAttribute('role','status');info.append(status,target);button.type='button';button.setAttribute('aria-label','Stop and save audio recording');bar.append(info,button);let pending=false,destroyed=false;
  const update=()=>{if(destroyed)return;const state=options.state();const visible=state.recording===true||state.saving===true;if(!visible){bar.remove();return;}if(!bar.isConnected)root.append(bar);status.textContent=state.saving?'Saving recording…':'● Recording';target.textContent=options.target?.()||'Obsidian Audio recorder';button.textContent=state.saving?'Saving…':'Stop & save';button.disabled=pending||!!state.saving||state.recording!==true;};
  button.addEventListener('click',()=>{if(pending||button.disabled)return;pending=true;button.disabled=true;void options.stop().catch(options.error).finally(()=>{pending=false;update();});});update();return {update,destroy:()=>{destroyed=true;bar.remove();}};
}

export function mountVoicePanel(root:HTMLElement,options:{day:string;state:VoiceState;getState?:()=>VoiceState;stop?:()=>Promise<void>;read:()=>Promise<{path:string;text:string}>;renderMarkdown:(note:{path:string;text:string},body:HTMLElement)=>Promise<void>;open:(record:boolean)=>Promise<void>;error:(error:unknown)=>void}):()=>void {
  let closed=false,pending=false;const doc=root.ownerDocument;root.classList.add('cs-voice');
  const el=(tag:string,parent:HTMLElement,cls:string,text='')=>{const node=doc.createElement(tag);node.className=cls;node.textContent=text;parent.append(node);return node;};
  el('p',root,'cs-voice-intro','What is on your mind? Say it as it is. No need to turn every thought into a task.');
  let state=options.getState?.()||options.state;const status=el('p',root,'cs-voice-status');
  const error=el('p',root,'cs-form-error');error.setAttribute('role','alert');const actions=el('div',root,'cs-voice-actions');
  const open=async(record:boolean)=>{if(pending||closed)return;pending=true;recordButton.disabled=true;journal.disabled=true;try{await options.open(record);}catch(e){if(closed)options.error(e);else error.textContent=e instanceof Error?e.message:String(e);}finally{pending=false;if(!closed){recordButton.disabled=!state.available||state.recording!==false;journal.disabled=false;}}};
  const recordButton=el('button',actions,'mod-cta','Record in journal') as HTMLButtonElement;recordButton.type='button';recordButton.setAttribute('aria-label','Record voice reflection in journal');recordButton.disabled=!state.available||state.recording!==false;recordButton.addEventListener('click',()=>void open(true));
  const journal=el('button',actions,'','Open journal') as HTMLButtonElement;journal.type='button';journal.addEventListener('click',()=>void open(false));
  const stopButton=el('button',actions,'cs-voice-stop','Stop & save') as HTMLButtonElement;stopButton.type='button';stopButton.setAttribute('aria-label','Stop and save voice reflection');stopButton.addEventListener('click',()=>{if(pending||!options.stop)return;pending=true;update();void options.stop().catch(e=>{if(closed)options.error(e);else error.textContent=e instanceof Error?e.message:String(e);}).finally(()=>{pending=false;update();});});
  const update=()=>{if(closed)return;state=options.getState?.()||options.state;status.textContent=state.saving?'Saving recording… Keep the journal open until its audio player appears.':state.recording===true?'Recording is active. Use Stop & save below or the floating recording control.':!state.available?'Audio recorder is not enabled on this device. Enable it in Settings → Core plugins, or open your journal and attach audio manually.':state.recording===null?'Automatic recorder controls are unavailable. Open your journal and use Audio recorder manually.':'Uses your enabled Obsidian Audio recorder. You will move into the journal to record.';recordButton.disabled=pending||!!state.saving||!state.available||state.recording!==false;journal.disabled=pending||!!state.saving||state.recording===true;stopButton.hidden=!options.stop||(state.recording!==true&&!state.saving);stopButton.disabled=pending||!!state.saving||state.recording!==true;stopButton.textContent=state.saving?'Saving…':'Stop & save';};
  update();const poll=options.getState?setInterval(update,300):null;
  el('p',root,'cs-voice-hint','Use the floating Stop & save button when finished. The native Audio recorder: Stop recording command also works. Wait for the audio player to appear before leaving the journal. No automatic transcription or upload by Color Sprint.');
  const saved=el('section',root,'cs-voice-saved');el('h3',saved,'','This day’s reflections');
  void options.read().then(async note=>{if(closed)return;if(!note.text){el('p',saved,'cs-muted','Nothing captured yet. Record a thought, or open the journal to write.');return;}const body=el('div',saved,'cs-voice-preview');await options.renderMarkdown(note,body);}).catch(e=>{if(!closed)error.textContent=e instanceof Error?e.message:String(e);});
  return ()=>{closed=true;if(poll)clearInterval(poll);};
}
