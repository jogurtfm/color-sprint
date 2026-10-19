import type {Rect} from './rim';
interface MainSurface {setFullScreen(on:boolean):void;setAlwaysOnTop(on:boolean):void;hide():void;show():void;focus():void;isMinimized?():boolean;restore?():void}
interface RimSurface {show(area:Rect):void;hide():void}
/** Release the full-screen/topmost surface before presenting the small native edge windows. */
export function presentMode(mode:'rim'|'visor',main:MainSurface,rim:RimSurface,area:Rect,foreground:boolean,windowed=false){
  if(mode==='rim'){main.setFullScreen(false);main.hide();main.setAlwaysOnTop(false);rim.show(area);}
  else{rim.hide();if(main.isMinimized?.())main.restore?.();main.setAlwaysOnTop(true);main.setFullScreen(!windowed);main.show();if(foreground)main.focus();}
}

interface MinimizeSurface {isFullScreen():boolean;setFullScreen(on:boolean):void;minimize():void;once(event:'leave-full-screen',callback:()=>void):unknown}
/** A frameless fullscreen window must leave fullscreen before Windows can minimize it. */
export function minimizeVisor(main:MinimizeSurface){
  if(!main.isFullScreen()){main.minimize();return;}
  main.once('leave-full-screen',()=>main.minimize());main.setFullScreen(false);
}

/** Serialize relative-date requests so fast repeated clicks advance from the confirmed cursor. */
export class DateNavigation {
  private queue:Promise<void>=Promise.resolve();
  run(operation:()=>Promise<void>){const pending=this.queue.catch(()=>{}).then(operation);this.queue=pending.catch(()=>{});return pending;}
}
