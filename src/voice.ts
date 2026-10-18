import { validDay } from './model';
import { vaultPath } from './daily';

export const DEFAULT_VOICE_FOLDER='Sync/Reflection/Voice';
export function voicePath(folder:string,day:string):string {
  if(!validDay(day))throw new Error('Choose a real YYYY-MM-DD date for your reflection.');
  return `${vaultPath(folder,true)}/${day}.md`;
}
export function voiceScaffold(day:string):string {
  if(!validDay(day))throw new Error('Choose a real YYYY-MM-DD date for your reflection.');
  return `---\nvoice-reflection-date: "${day}"\n---\n\n# Voice reflection · ${day}\n\nSay what is on your mind. It does not have to be polished or turn into a task.\n\nUse Audio recorder: Start recording, then Stop recording (or tap the microphone again). Stay in this note until you stop so the recording is embedded here. Allow microphone access if asked.\n\nAudio files stay in your vault and follow your own attachment and sync settings. No transcription is requested by Color Sprint.\n\n## Notes (optional)\n\n\n## Recordings\n\n`;
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

export function mountVoicePanel(root:HTMLElement,options:{day:string;state:ReturnType<typeof recorderState>;read:()=>Promise<{path:string;text:string}>;renderMarkdown:(note:{path:string;text:string},body:HTMLElement)=>Promise<void>;open:(record:boolean)=>Promise<void>;error:(error:unknown)=>void}):()=>void {
  let closed=false,pending=false;const doc=root.ownerDocument;root.classList.add('cs-voice');
  const el=(tag:string,parent:HTMLElement,cls:string,text='')=>{const node=doc.createElement(tag);node.className=cls;node.textContent=text;parent.append(node);return node;};
  el('p',root,'cs-voice-intro','What is on your mind? Say it as it is. No need to turn every thought into a task.');
  const state=options.state;el('p',root,'cs-voice-status',state.recording===true?'Audio recorder is already recording. Save it in its current note first.':!state.available?'Audio recorder is not enabled on this device. Enable it in Settings → Core plugins, or open your journal and attach audio manually.':state.recording===null?'Automatic recorder controls are unavailable. Open your journal and use Audio recorder manually.':'Uses your enabled Obsidian Audio recorder. You will move into the journal to record.');
  const error=el('p',root,'cs-form-error');error.setAttribute('role','alert');const actions=el('div',root,'cs-voice-actions');
  const open=async(record:boolean)=>{if(pending||closed)return;pending=true;recordButton.disabled=true;journal.disabled=true;try{await options.open(record);}catch(e){if(closed)options.error(e);else error.textContent=e instanceof Error?e.message:String(e);}finally{pending=false;if(!closed){recordButton.disabled=!state.available||state.recording!==false;journal.disabled=false;}}};
  const recordButton=el('button',actions,'mod-cta','Record in journal') as HTMLButtonElement;recordButton.type='button';recordButton.setAttribute('aria-label','Record voice reflection in journal');recordButton.disabled=!state.available||state.recording!==false;recordButton.addEventListener('click',()=>void open(true));
  const journal=el('button',actions,'','Open journal') as HTMLButtonElement;journal.type='button';journal.addEventListener('click',()=>void open(false));
  el('p',root,'cs-voice-hint','Stop with Obsidian’s microphone button or Audio recorder: Stop recording. Keep this journal active until the audio is saved. No automatic transcription or upload by Color Sprint.');
  const saved=el('section',root,'cs-voice-saved');el('h3',saved,'','This day’s reflections');
  void options.read().then(async note=>{if(closed)return;if(!note.text){el('p',saved,'cs-muted','Nothing captured yet. Record a thought, or open the journal to write.');return;}const body=el('div',saved,'cs-voice-preview');await options.renderMarkdown(note,body);}).catch(e=>{if(!closed)error.textContent=e instanceof Error?e.message:String(e);});
  return ()=>{closed=true;};
}
