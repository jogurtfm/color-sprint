/** Small independent edge windows: there is no full-screen input surface over other apps. */
export interface Rect {x:number;y:number;width:number;height:number}
export type RimPart='rim-top'|'rim-focus'|'rim-queue';
export const RIM_PARTS:RimPart[]=['rim-top','rim-focus','rim-queue'];
export function rimBounds(area:Rect):Record<RimPart,Rect>{
  const gap=12,w=Math.max(1,Math.floor(area.width)),h=Math.max(1,Math.floor(area.height));
  const topW=Math.min(560,w-24),focusW=Math.min(660,w-24),queueW=Math.min(244,w-24);
  const topH=64,focusH=158,queueH=Math.max(40,Math.min(278,h-topH-focusH-gap*4));
  return {
    'rim-top':{x:area.x+Math.round((w-topW)/2),y:area.y+gap,width:topW,height:topH},
    'rim-focus':{x:area.x+Math.round((w-focusW)/2),y:area.y+h-focusH-gap,width:focusW,height:focusH},
    'rim-queue':{x:area.x+w-queueW-gap,y:area.y+topH+gap*2,width:queueW,height:queueH}
  };
}
export interface EdgeWindow {isDestroyed():boolean;setBounds(bounds:Rect):void;showInactive():void;hide():void}
export class RimController<T extends EdgeWindow>{
  readonly windows=new Map<RimPart,T>();readonly visibility=new Map<RimPart,boolean>();active=false;
  private fades=new Map<RimPart,ReturnType<typeof setTimeout>>();
  constructor(private create:(part:RimPart,bounds:Rect)=>T){}
  show(area:Rect,visible:RimPart[]=RIM_PARTS){this.active=true;const bounds=rimBounds(area);for(const part of RIM_PARTS){let window=this.windows.get(part);if(!window||window.isDestroyed()){window=this.create(part,bounds[part]);this.windows.set(part,window);this.visibility.delete(part);}window.setBounds(bounds[part]);this.setVisible(part,visible.includes(part));}}
  setVisible(part:RimPart,visible:boolean,animate=false):boolean{
    const window=this.windows.get(part);if(!window||window.isDestroyed()||this.visibility.get(part)===visible)return false;
    const pending=this.fades.get(part);if(pending)clearTimeout(pending);this.fades.delete(part);this.visibility.set(part,visible);
    if(visible)window.showInactive();else if(animate){this.fades.set(part,setTimeout(()=>{this.fades.delete(part);if(!window.isDestroyed()&&!this.visibility.get(part))window.hide();},230));}else window.hide();return true;
  }
  hide(){this.active=false;for(const pending of this.fades.values())clearTimeout(pending);this.fades.clear();for(const [part,window] of this.windows){this.visibility.set(part,false);if(!window.isDestroyed())window.hide();}}
  reflow(area:Rect){if(this.active)this.show(area,RIM_PARTS.filter(p=>this.visibility.get(p)));}
}
