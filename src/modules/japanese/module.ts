import type {ModuleBinding,ModuleDefinition,ModuleFocus,ModuleInstance,ModuleServices,ReviewRecord} from '../contracts';
import {parseDeck,projectReviews,sessionProgress,StudyCard} from './model';
import {reviewMarkdown,validateReview} from '../markdown';
type Lane='kanji'|'vocab'|'grammar'|'review';
class JapaneseSession implements ModuleInstance {
  private root:HTMLElement|null=null;private cards:StudyCard[];private deckRevision:string;private records:ReviewRecord[]=[];private dead=false;private pending=false;private generation=0;
  private lane:Lane='kanji';private revealed=false;private selected='';private error='';private showExport=false;private unsubscribe:()=>void;
  private targets:ModuleBinding['targets'];private readReady=false;
  constructor(private focus:ModuleFocus,private binding:ModuleBinding,private services:ModuleServices){
    this.deckRevision=services.documents.deck.match(/^Content revision: ([a-z0-9-]+)$/m)?.[1]||'unversioned';this.cards=parseDeck(services.documents.deck);this.targets={...binding.targets};this.unsubscribe=services.store.subscribe(binding.dataset,()=>void this.refresh());
  }
  async refresh(){const seq=++this.generation;try{const records=await this.services.store.read(this.binding.dataset);if(this.dead||seq!==this.generation)return;this.records=projectReviews(this.cards,records.map(validateReview),this.binding.dataset,this.deckRevision).records;this.readReady=true;this.render();}catch(error){if(!this.dead&&seq===this.generation){this.readReady=false;this.error=error instanceof Error?error.message:'Study data unavailable.';this.render();}}}
  mount(root:HTMLElement){if(this.dead)return;this.root=root;root.classList.add('cs-task-module');this.render();}
  update(focus:ModuleFocus){this.focus=focus;}
  dispose(){this.dead=true;++this.generation;this.unsubscribe();this.root?.replaceChildren();this.root=null;}
  private el<K extends keyof HTMLElementTagNameMap>(parent:HTMLElement,tag:K,text='',cls=''):HTMLElementTagNameMap[K]{const node=parent.ownerDocument.createElement(tag);node.textContent=text;node.className=cls;parent.append(node);return node;}
  private button(parent:HTMLElement,text:string,action:()=>void,cls=''){const b=this.el(parent,'button',text,cls);b.type='button';b.onclick=action;return b;}
  private mode(cardId:string):'new'|'review'{const sessionRows=this.records.filter(r=>r.sessionId===this.focus.sessionId&&r.cardId===cardId),first=sessionRows.find(r=>!sessionRows.some(p=>p.id===r.parentId));return first?.mode||(this.records.some(r=>r.cardId===cardId)?'review':'new');}
  private candidates(lane:Lane):StudyCard[]{
    const projection=projectReviews(this.cards,this.records,this.binding.dataset,this.deckRevision),progress=sessionProgress(this.cards,this.records,this.focus.sessionId),now=this.services.now();
    if(!this.readReady||progress[lane]>=this.targets[lane])return [];
    const acceptedConcepts=new Set(this.records.filter(r=>r.sessionId===this.focus.sessionId&&r.mode==='new'&&r.rating!=='again'&&!projection.conflicts.has(r.cardId)).map(r=>this.cards.find(c=>c.id===r.cardId)).filter((c):c is StudyCard=>!!c).map(c=>c.kind+':'+c.concept));
    return this.cards.filter(card=>{if(projection.conflicts.has(card.id))return false;const state=projection.states.get(card.id),done=this.records.some(r=>r.sessionId===this.focus.sessionId&&r.cardId===card.id&&r.rating!=='again');
      if(done)return false;if(lane==='review')return !!state&&state.due<=now&&this.mode(card.id)==='review';
      return card.kind===lane&&!acceptedConcepts.has(card.kind+':'+card.concept)&&(!state||state.due<=now&&this.mode(card.id)==='new');
    });
  }
  private render(){
    const root=this.root;if(!root||this.dead)return;root.replaceChildren();const projected=projectReviews(this.cards,this.records,this.binding.dataset,this.deckRevision),progress=sessionProgress(this.cards,this.records,this.focus.sessionId);
    const head=this.el(root,'header','','cs-module-heading');this.el(head,'span','JAPANESE / STUDY MODULE','cs-module-kicker');this.el(head,'small',this.services.preview?'DESIGN PROTOTYPE':'STARTER / SRS');
    this.el(root,'p',this.services.preview?'Sample deck · preview memory only. Practice does not finish the task or award XP.':'Ratings save as Markdown. Finish the task separately; study ratings do not award XP.','cs-module-notice');
    const targets=this.el(root,'details','','cs-module-targets');this.el(targets,'summary','Session targets · editable examples');
    for(const [lane,label] of [['kanji','New kanji'],['vocab','New vocab'],['grammar','Grammar'],['review','Due reviews']] as const){const wrap=this.el(targets,'label',label),input=this.el(wrap,'input');input.type='number';input.min='0';input.max='50';input.step='1';input.value=String(this.targets[lane]);input.setAttribute('aria-label',label+' target');input.disabled=this.pending;input.onchange=()=>{if(input.reportValidity()&&Number.isInteger(input.valueAsNumber)){this.targets[lane]=input.valueAsNumber;this.selected='';this.revealed=false;this.render();}};}
    const lanes=this.el(root,'nav','','cs-module-lanes');lanes.setAttribute('aria-label','Study lanes');
    for(const [lane,label] of [['kanji','Kanji'],['vocab','Vocab'],['grammar','Grammar'],['review','Review']] as const){const b=this.button(lanes,label+' '+progress[lane]+'/'+this.targets[lane],()=>{this.lane=lane;this.selected='';this.revealed=false;this.render();},lane===this.lane?'is-active':'');b.setAttribute('aria-pressed',String(lane===this.lane));}
    const status=this.el(root,'p',this.error||'', 'cs-module-status');status.setAttribute('role','status');
    if(projected.conflicts.size||projected.issues.length)this.el(root,'p',projected.conflicts.size+' card(s) paused for review conflicts. No device history was silently discarded.','cs-module-warning');
    if(this.focus.paused)this.el(root,'p','Focus is paused. Resume the host timer to reveal or rate.','cs-module-warning');
    const candidates=this.candidates(this.lane);let card=candidates.find(c=>c.id===this.selected);if(!card){card=candidates[0];this.selected=card?.id||'';this.revealed=false;}
    if(card){const panel=this.el(root,'section','','cs-study-card');panel.dataset.cardId=card.id;this.el(panel,'small',this.lane==='review'?'DUE REVIEW':card.kind.toUpperCase()+' / NEW');
      if(card.kind==='kanji')this.el(panel,'div',card.concept,'cs-kanji-glyph');this.el(panel,'h3',card.front);
      if(!this.revealed){const b=this.button(panel,'Reveal answer',()=>{this.revealed=true;this.render();},'cs-module-primary');b.disabled=this.pending||this.focus.paused;}
      else {this.el(panel,'p',card.answer,'cs-study-answer');if(card.reading&&!card.answer.includes(card.reading))this.el(panel,'p',card.reading,'cs-study-reading');if(card.example){this.el(panel,'p',card.example,'cs-study-example');this.el(panel,'p',card.meaning,'cs-study-meaning');}
        const grades=this.el(panel,'div','','cs-study-grades');for(const [rating,label] of [['again','Again'],['hard','Hard'],['good','Good'],['easy','Easy']] as const){const b=this.button(grades,label,()=>void this.rate(card!,rating),rating==='good'?'cs-module-primary':'');b.dataset.studyRating=rating;b.disabled=this.pending||this.focus.paused;}
        this.el(panel,'small','Your recall rating. Not a correctness detector or an official JLPT assessment.');
      }
    }else {this.el(root,'h3',progress[this.lane]>=this.targets[this.lane]?'Target reached for this lane.':'No eligible cards right now.');
      this.el(root,'p',this.lane==='review'?'Only already-studied cards that are due appear here. No reviews are invented to fill the target.':'Choose another lane, adjust the target, or wait for an Again card to become due.','cs-module-notice');
      this.button(root,'Refresh due cards',()=>void this.refresh());
    }
    this.el(root,'p',progress.attempts+' rating(s) in this focus · Again does not count toward the completed-card target.','cs-module-notice');
    this.button(root,this.showExport?'Hide review Markdown':'Inspect review Markdown',()=>{this.showExport=!this.showExport;this.render();});
    if(this.showExport){const area=this.el(root,'textarea');area.className='cs-module-export';area.readOnly=true;area.setAttribute('aria-label','Prototype review Markdown');area.value=this.records.filter(r=>r.sessionId===this.focus.sessionId).map(reviewMarkdown).join('\n---\n\n')||'No review records yet. Nothing was saved to your vault.';}
  }
  private async rate(card:StudyCard,rating:ReviewRecord['rating']){
    if(this.dead||!this.readReady||this.pending||this.focus.paused||!this.revealed)return;this.pending=true;this.error='';
    try{const projection=projectReviews(this.cards,this.records,this.binding.dataset,this.deckRevision);if(projection.conflicts.has(card.id))throw new Error('This card has a review conflict.');
      const record:ReviewRecord={version:1,id:this.services.id(),moduleId:'japanese-srs',dataset:this.binding.dataset,deckRevision:this.deckRevision,cardId:card.id,parentId:projection.states.get(card.id)?.lastId||null,deviceId:this.services.deviceId,sessionId:this.focus.sessionId,date:this.focus.date,at:new Date(this.services.now()).toISOString(),rating,mode:this.mode(card.id)};
      await this.services.store.append(record);this.selected='';this.revealed=false;await this.refresh();
    }catch(error){this.error=error instanceof Error?error.message:'Rating was not saved.';await this.refresh();}finally{this.pending=false;this.render();}
  }
}
export const japaneseModule:ModuleDefinition={id:'japanese-srs',schemaVersion:1,capabilities:['study.read','study.append'],async create(focus,binding,services){const session=new JapaneseSession(focus,binding,services);await session.refresh();return session;}};
