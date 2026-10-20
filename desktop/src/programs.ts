import type {LauncherView} from './launcher';
import type {SpotifyAction,SpotifyState} from './spotify';
interface ProgramActions {launch:(id:string)=>Promise<void>;choose:(id:string)=>Promise<void>;manage:()=>void;scan:()=>Promise<void>;spotify:(action:SpotifyAction)=>Promise<SpotifyState>}
/** A persistent, keyboard-friendly app menu. No task writes, protocols or launch arguments. */
export class ProgramsMenu {
  private dialog:HTMLDialogElement;private search:HTMLInputElement;private list:HTMLElement;private status:HTMLElement;
  private view:LauncherView={items:[],warning:''};private opener:HTMLElement|null=null;private signature='';private controller:AbortController;private launchBusy=false;
  private music:HTMLElement;private musicTitle:HTMLElement;private musicHint:HTMLElement;private musicButtons=new Map<SpotifyAction,HTMLButtonElement>();private musicState:SpotifyState={available:false,message:''};private musicBusy=false;private poll:ReturnType<typeof setInterval>|null=null;
  constructor(private doc:Document,private actions:ProgramActions){
    this.controller=new doc.defaultView!.AbortController();const signal=this.controller.signal;
    const dialog=doc.createElement('dialog');this.dialog=dialog;dialog.className='programs-menu';dialog.setAttribute('aria-label','Programs');
    const header=doc.createElement('header'),title=doc.createElement('h2');title.textContent='PROGRAMS';
    const close=doc.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close programs');close.onclick=()=>this.close();header.append(title,close);
    const help=doc.createElement('p');help.textContent='Your apps. One click away.';help.className='programs-help';
    const search=doc.createElement('input');this.search=search;search.type='search';search.placeholder='Find a program…';search.setAttribute('aria-label','Find a program');search.oninput=()=>this.render();
    this.list=doc.createElement('div');this.list.className='programs-list';this.list.setAttribute('role','group');this.list.setAttribute('aria-label','Applications');
    this.status=doc.createElement('p');this.status.className='programs-status';this.status.setAttribute('role','status');
    const footer=doc.createElement('footer'),manage=doc.createElement('button'),scan=doc.createElement('button');manage.textContent='Manage / add apps';scan.textContent='Rescan installed apps';
    manage.type=scan.type='button';manage.onclick=()=>{this.close();this.actions.manage();};scan.onclick=()=>void this.run(()=>this.actions.scan());
    this.music=doc.createElement('section');this.music.className='programs-spotify';this.music.setAttribute('aria-label','Spotify local controls');
    const musicLabel=doc.createElement('h3');musicLabel.textContent='SPOTIFY / LOCAL PLAYER';this.musicTitle=doc.createElement('strong');this.musicHint=doc.createElement('p');this.musicHint.textContent='Checking local Spotify…';
    const controls=doc.createElement('div');controls.className='programs-transport';
    for(const [action,label] of [['previous','Previous track'],['play','Play Spotify'],['pause','Pause Spotify'],['next','Next track'],['status','Refresh Spotify']] as const){const b=doc.createElement('button');b.type='button';b.dataset.spotify=action;b.setAttribute('aria-label',label);b.textContent={previous:'⏮',play:'▶',pause:'Ⅱ',next:'⏭',status:'↻'}[action];b.title=label;b.disabled=action!=='status';b.onclick=()=>void this.refreshMusic(action);this.musicButtons.set(action,b);controls.append(b);}
    this.music.append(musicLabel,this.musicTitle,this.musicHint,controls);footer.append(manage,scan);dialog.append(header,help,this.music,search,this.list,this.status,footer);doc.body.append(dialog);
    dialog.addEventListener('close',()=>{this.stopPoll();if(this.opener?.isConnected)this.opener.focus();},{signal});
    dialog.addEventListener('cancel',event=>{event.preventDefault();this.close();},{signal});
    search.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();this.list.querySelector<HTMLButtonElement>('button')?.focus();}else if(event.key==='Enter'){const buttons=this.list.querySelectorAll<HTMLButtonElement>('button');if(buttons.length===1){event.preventDefault();buttons[0].click();}}},{signal});
    this.list.addEventListener('keydown',event=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;const buttons=[...this.list.querySelectorAll<HTMLButtonElement>('button')];const at=buttons.indexOf(doc.activeElement as HTMLButtonElement);if(at<0)return;event.preventDefault();buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(at+(event.key==='ArrowUp'?-1:1)+buttons.length)%buttons.length]?.focus();},{signal});
    doc.defaultView!.addEventListener('pagehide',()=>this.destroy(),{once:true,signal});
  }
  update(view?:LauncherView){this.view=view||{items:[],warning:''};const signature=JSON.stringify(this.view);if(signature===this.signature)return;this.signature=signature;if(this.dialog.open)this.render();}
  open(){this.opener=this.doc.activeElement as HTMLElement;this.search.value='';this.status.textContent='';this.render();if(!this.dialog.open)this.dialog.showModal();this.search.focus();void this.refreshMusic();this.stopPoll();this.poll=setInterval(()=>{if(this.dialog.open&&!this.doc.hidden)void this.refreshMusic();},6000);}
  close(){this.stopPoll();if(this.dialog.open)this.dialog.close();}
  private stopPoll(){if(this.poll)clearInterval(this.poll);this.poll=null;}
  private async refreshMusic(action:SpotifyAction='status'){if(this.musicBusy)return;this.musicBusy=true;this.paintMusic();try{this.musicState=await this.actions.spotify(action);}catch(error){this.musicState={available:false,message:error instanceof Error?error.message:'Local Spotify controls are unavailable.'};}finally{this.musicBusy=false;this.paintMusic();}}
  private paintMusic(){const s=this.musicState;this.musicTitle.textContent=s.available?s.title||'Spotify player':'Spotify not connected';this.musicHint.textContent=this.musicBusy?'Checking Spotify…':s.message||[s.artist,s.playing?'Playing':'Paused'].filter(Boolean).join(' · ');for(const [key,b] of this.musicButtons)b.disabled=this.musicBusy||(key!=='status'&&(!s.available||!s[key as 'play'|'pause'|'next'|'previous']));}
  private async run(action:()=>Promise<void>){if(this.launchBusy)return;this.launchBusy=true;try{this.status.textContent='Working…';await action();this.status.textContent='';}catch(error){this.status.textContent=error instanceof Error?error.message:String(error);}finally{this.launchBusy=false;}}
  private render(){
    const query=this.search.value.trim().toLocaleLowerCase(),all=this.view.items.filter(i=>i.id!=='chatgpt'),items=[...all.slice(4),...all.slice(0,4)].filter(i=>i.label.toLocaleLowerCase().includes(query));this.list.replaceChildren();
    for(const item of items){const button=this.doc.createElement('button');button.type='button';button.dataset.programId=item.id;
      const glyph=this.doc.createElement('span');glyph.className='programs-icon';glyph.setAttribute('aria-hidden','true');
      if(/^data:image\/(png|jpeg|webp);base64,/.test(item.icon)){const img=this.doc.createElement('img');img.src=item.icon;img.alt='';glyph.append(img);}else glyph.textContent=item.glyph;
      const name=this.doc.createElement('strong');name.textContent=item.label;const hint=this.doc.createElement('small');hint.textContent=item.kind==='file'?'Launch ↗':'Choose app…';
      button.setAttribute('aria-label',(item.kind==='file'?'Launch ':'Choose app for ')+item.label);button.append(glyph,name,hint);
      button.onclick=()=>void this.run(async()=>{if(item.kind==='file'){await this.actions.launch(item.id);this.close();}else{this.close();await this.actions.choose(item.id);}});this.list.append(button);
    }
    if(!items.length){const empty=this.doc.createElement('p');empty.className='programs-empty';empty.textContent=query?'No matching programs.':'No apps configured. Use Manage / add apps.';this.list.append(empty);}
    if(this.view.warning)this.status.textContent=this.view.warning;
  }
  destroy(){this.stopPoll();this.controller.abort();this.dialog.remove();}
}
