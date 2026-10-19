import {Rect,RimPart,RIM_PARTS,rimBounds} from './rim';
export interface Point{x:number;y:number}
export class EdgeReveal {
  private until=new Map<RimPart,number>();
  reset(){this.until.clear();}
  peek(now:number,duration=1800){for(const part of RIM_PARTS)this.until.set(part,now+Math.max(1800,Math.min(10000,duration)));}
  visible(area:Rect,point:Point,now:number,autoHide=true,display=area):RimPart[]{
    if(!autoHide)return [...RIM_PARTS];const bounds=rimBounds(area),inside=point.x>=display.x-2&&point.x<=display.x+display.width+2&&point.y>=display.y-2&&point.y<=display.y+display.height+2;
    const at:Record<RimPart,boolean>={
      'rim-top':inside&&point.y<=area.y+18,
      'rim-focus':inside&&point.y>=area.y+area.height-18,
      'rim-queue':inside&&point.x>=area.x+area.width-18
    };
    for(const part of RIM_PARTS){const r=bounds[part],wasVisible=(this.until.get(part)||0)>now;
      // The panel remains revealed while the mouse travels from its edge to its controls.
      const over=point.x>=r.x-14&&point.x<=r.x+r.width+14&&point.y>=r.y-14&&point.y<=r.y+r.height+14;
      if(at[part]||(wasVisible&&over))this.until.set(part,now+1000);
    }
    return RIM_PARTS.filter(part=>(this.until.get(part)||0)>now);
  }
}
