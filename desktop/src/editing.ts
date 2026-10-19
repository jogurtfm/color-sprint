/** Ask once across multiple widget windows. Never treat starting a timer as implicit consent to writes. */
export class EditingConsent {
  private pending:Promise<void>|null=null;
  async ensure(enabled:boolean,locked:boolean,ask:()=>Promise<boolean>,save:()=>Promise<void>):Promise<void>{
    if(locked)throw new Error('This launch is locked read-only. Relaunch normally to enable focus controls.');
    if(this.pending)return this.pending;
    if(enabled)return;
    const work=(async()=>{if(!await ask())throw new Error('Kept read-only. No timer or task was changed.');await save();})();
    this.pending=work;try{await work;}finally{if(this.pending===work)this.pending=null;}
  }
}
