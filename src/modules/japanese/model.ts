import type {ReviewRecord} from '../contracts';
import {validateReview} from '../markdown';
export type CardKind='kanji'|'vocab'|'grammar';
export interface StudyCard {id:string;kind:CardKind;concept:string;front:string;answer:string;reading:string;example:string;meaning:string}
export interface CardState {cardId:string;lastId:string;intervalDays:number;due:number;reviews:number;lapses:number}
export const CARD_HEADER='| ID | Kind | Concept | Front | Answer | Reading | Example | Meaning |';
const day=86400000;
/** Prototype scheduler only, not FSRS, Anki compatibility or a validated learning recommendation. */
export function schedule(previous:CardState|undefined,record:ReviewRecord):CardState{
  const at=Date.parse(record.at),prior=previous?.intervalDays||1;
  const intervalDays=record.rating==='again'?0:record.rating==='hard'?(previous?Math.max(1,Math.ceil(prior*1.2)):1):record.rating==='easy'?(previous?Math.ceil(prior*3.5):3):(previous?Math.ceil(prior*2.5):1);
  return {cardId:record.cardId,lastId:record.id,intervalDays,due:at+(record.rating==='again'?60000:intervalDays*day),reviews:(previous?.reviews||0)+1,lapses:(previous?.lapses||0)+(record.rating==='again'?1:0)};
}
export function parseDeck(text:string):StudyCard[]{
  if(!/^Schema: 1\s*$/m.test(text))throw new Error('Unsupported study deck schema.');
  if(text.length>1048576)throw new Error('Deck is too large for the scaffold.');const lines=text.replace(/\r/g,'').split('\n'),at=lines.findIndex(l=>l.trim()===CARD_HEADER);if(at<0)throw new Error('Missing Japanese card table.');
  const cards:StudyCard[]=[],seen=new Set<string>();for(const line of lines.slice(at+2)){if(!line.startsWith('|'))break;const c=line.split('|').slice(1,-1).map(x=>x.trim().replace(/&#124;/g,'|').replace(/<br\s*\/?\s*>/gi,'\n'));if(c.length!==8||!/^[-a-z0-9]{1,80}$/.test(c[0])||seen.has(c[0])||!['kanji','vocab','grammar'].includes(c[1])||c.some(v=>!v||v.length>2000))throw new Error('Invalid or duplicate study card.');seen.add(c[0]);cards.push({id:c[0],kind:c[1] as CardKind,concept:c[2],front:c[3],answer:c[4],reading:c[5]==='-'?'':c[5],example:c[6]==='-'?'':c[6],meaning:c[7]==='-'?'':c[7]});}return cards;
}
/** Parent-linked records, not wall-clock last-writer-wins. A branch pauses the card. */
export function projectReviews(cards:StudyCard[],records:ReviewRecord[],dataset:string,deckRevision?:string){
  const states=new Map<string,CardState>(),conflicts=new Set<string>(),issues:string[]=[],byId=new Map<string,ReviewRecord>();const known=new Set(cards.map(c=>c.id));
  for(const raw of records){const r=validateReview(raw);if(r.dataset!==dataset)continue;if(!known.has(r.cardId))issues.push('Unknown card '+r.cardId);if(deckRevision&&r.deckRevision!==deckRevision)conflicts.add(r.cardId);const old=byId.get(r.id);if(old&&JSON.stringify(old)!==JSON.stringify(r))throw new Error('Review ID collision. No history was chosen.');byId.set(r.id,r);}
  for(const card of cards){
    const rows=[...byId.values()].filter(r=>r.cardId===card.id),visited=new Set<string>();let parent:string|null=null,state:CardState|undefined;
    while(true){const children=rows.filter(r=>r.parentId===parent);if(!children.length)break;if(children.length>1){conflicts.add(card.id);break;}const record=children[0];if(visited.has(record.id)){conflicts.add(card.id);break;}visited.add(record.id);state=schedule(state,record);parent=record.id;}
    if(rows.some(r=>!visited.has(r.id)))conflicts.add(card.id);if(state)states.set(card.id,state);
  }return {states,conflicts,issues,records:[...byId.values()]};
}
export function sessionProgress(cards:StudyCard[],records:ReviewRecord[],sessionId:string){
  const byId=new Map(cards.map(c=>[c.id,c])),latest=new Map<string,ReviewRecord>(),unique=[...new Map(records.map(r=>[r.id,r])).values()],rows=unique.filter(r=>r.sessionId===sessionId);
  for(const card of cards){const group=rows.filter(r=>r.cardId===card.id),heads=group.filter(r=>!group.some(c=>c.parentId===r.id));if(heads.length===1)latest.set(card.id,heads[0]);}
  const result={kanji:0,vocab:0,grammar:0,review:0,attempts:rows.length},concepts={kanji:new Set<string>(),vocab:new Set<string>(),grammar:new Set<string>()},conflicts=projectReviews(cards,unique,unique[0]?.dataset||'').conflicts;
  for(const r of latest.values()){if(r.rating==='again'||conflicts.has(r.cardId))continue;const card=byId.get(r.cardId);if(card){if(r.mode==='review')result.review++;else concepts[card.kind].add(card.concept);}}
  for(const kind of ['kanji','vocab','grammar'] as const)result[kind]=concepts[kind].size;return result;
}
