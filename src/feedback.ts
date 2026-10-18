export interface FeedbackSettings {sound:boolean;haptics:boolean;motion:boolean}
export const DEFAULT_FEEDBACK:FeedbackSettings={sound:true,haptics:true,motion:true};
type FeedbackKind='complete'|'increment'|'saved'|'timer';

export class Feedback {
  private context:AudioContext|null=null;private layer:HTMLElement|null=null;private timeout:ReturnType<typeof setTimeout>|null=null;private stopped=false;
  constructor(private root:HTMLElement,private settings:()=>FeedbackSettings){}
  prepare():void {if(this.stopped||!this.settings().sound)return;const win=this.root.ownerDocument.defaultView as any;try{const Audio=win?.AudioContext||win?.webkitAudioContext;if(Audio){this.context=this.context||new Audio();void Promise.resolve(this.context!.resume()).catch(()=>{});}}catch{}}
  play(kind:FeedbackKind):void {
    if(this.stopped)return;const prefs=this.settings();const win=this.root.ownerDocument.defaultView;
    if(prefs.haptics)try{win?.navigator?.vibrate?.(kind==='complete'?[20,35,45]:kind==='timer'?[80,60,120]:10);}catch{}
    if(!prefs.sound)return;const play=()=>{try{const ctx=this.context;if(!ctx||this.stopped||!this.settings().sound)return;const notes=kind==='complete'?[523.25,659.25,783.99]:kind==='timer'?[659.25,880]:kind==='saved'?[523.25,659.25]:[740];for(const [index,hz] of notes.entries()){const time=ctx.currentTime+index*.075;const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type='sine';oscillator.frequency.value=hz;gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(.055,time+.012);gain.gain.exponentialRampToValueAtTime(.0001,time+.17);oscillator.connect(gain).connect(ctx.destination);oscillator.start(time);oscillator.stop(time+.19);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};}}catch{}};
    try{if(this.context?.state==='suspended')void this.context.resume().then(play).catch(()=>{});else play();}catch{}
  }
  show(message:string,color='#8a59ed',kind:FeedbackKind='complete'):void {
    if(this.stopped)return;this.play(kind);if(this.timeout)clearTimeout(this.timeout);const doc=this.root.ownerDocument;const win=doc.defaultView;this.layer=this.layer||doc.createElement('div');this.layer.className='cs-feedback-layer';this.layer.replaceChildren();this.layer.style.setProperty('--cs-celebrate-color',color);if(!this.layer.isConnected)doc.body.append(this.layer);
    const moving=this.settings().motion&&!win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;this.layer.classList.toggle('cs-feedback-motion',moving);
    const toast=doc.createElement('div');toast.className='cs-feedback-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');const icon=doc.createElement('span');icon.className='cs-feedback-check';icon.textContent=kind==='complete'?'✓':kind==='increment'?'+':'✓';icon.setAttribute('aria-hidden','true');toast.append(icon,doc.createTextNode(message));this.layer.append(toast);
    if(moving&&kind==='complete'){const burst=doc.createElement('div');burst.className='cs-feedback-burst';burst.setAttribute('aria-hidden','true');for(let i=0;i<12;i++){const particle=doc.createElement('i');const angle=(i/12)*Math.PI*2;particle.style.setProperty('--dx',`${Math.round(Math.cos(angle)*100)}px`);particle.style.setProperty('--dy',`${Math.round(-65+Math.sin(angle)*75)}px`);particle.style.setProperty('--twist',`${i*61}deg`);particle.style.setProperty('--delay',`${i%3*15}ms`);burst.append(particle);}this.layer.append(burst);}
    this.timeout=setTimeout(()=>{this.layer?.remove();this.timeout=null;},kind==='increment'?1100:1900);
  }
  destroy():void {this.stopped=true;if(this.timeout)clearTimeout(this.timeout);this.layer?.remove();try{void this.context?.close().catch(()=>{});}catch{}}
}
