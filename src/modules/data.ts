import defaults from '../../modules/Bindings.md';
import starterDeck from '../../modules/japanese/N5-Starter.md';
import {vaultPath} from '../daily';
import {parseBoard} from '../model';
import {activeModuleFocus,ModuleBinding,ModuleFocus,ReviewRecord} from './contracts';
import {parseBindings,parseReviewMarkdown,reviewMarkdown,validateReview} from './markdown';
import {parseDeck,projectReviews} from './japanese/model';
export interface StudyIO {read(path:string):Promise<string|null>;list(folder:string):Promise<string[]>;create(path:string,text:string):Promise<void>}
export interface StudyData {binding:ModuleBinding|null;deck:string;records:ReviewRecord[];deviceId:string}
export interface StudyPort {load(focus:ModuleFocus):Promise<StudyData>;append(record:ReviewRecord,focus:ModuleFocus):Promise<void>}
export const moduleFolder=(tracker:string)=>{vaultPath(tracker);return (tracker.includes('/')?tracker.slice(0,tracker.lastIndexOf('/'))+'/':'')+'Color Sprint Modules';};
export async function loadStudy(io:StudyIO,tracker:string,taskId:string,deviceId:string):Promise<StudyData>{
  const root=moduleFolder(tracker),bindings=await io.read(root+'/Bindings.md')??defaults,binding=parseBindings(bindings).find(b=>b.taskId===taskId&&b.moduleId==='japanese-srs')||null;
  if(!binding)return {binding:null,deck:'',records:[],deviceId};
  const deck=await io.read(`${root}/Japanese/Decks/${binding.dataset}.md`)??(binding.dataset==='n5-starter'?starterDeck:'');parseDeck(deck);
  const folder=root+'/Japanese/Reviews/',files=await io.list(folder);if(files.length>5000)throw new Error('Study history exceeds this version’s safe loading limit. Nothing was removed.');
  let bytes=0;const records:ReviewRecord[]=[];
  for(const file of files){if(!file.startsWith(folder)||!file.endsWith('.md'))continue;vaultPath(file);const text=await io.read(file);if(text===null)throw new Error('Study history changed while loading. Refresh before rating.');bytes+=text.length;if(bytes>8*1024*1024)throw new Error('Study history is too large to load safely.');const r=parseReviewMarkdown(text);if(r.dataset===binding.dataset)records.push(r);}
  // Collision validation before exposing history to the learner.
  projectReviews(parseDeck(deck),records,binding.dataset);
  return {binding,deck,records,deviceId};
}
/** Serialized by the owning Obsidian plugin, never the Electron filesystem. */
export async function appendStudy(io:StudyIO,tracker:string,value:unknown,focus:ModuleFocus,current:()=>Promise<string>):Promise<void>{
  const record=validateReview(value),root=moduleFolder(tracker),path=`${root}/Japanese/Reviews/${record.deviceId}/${record.id}.md`,note=reviewMarkdown(record);
  const prior=await io.read(path);if(prior!==null){if(JSON.stringify(parseReviewMarkdown(prior))!==JSON.stringify(record))throw new Error('Study review ID collision. Neither record was replaced.');return;}
  const live=activeModuleFocus(parseBoard(await current()));if(!live||live.paused||live.key!==focus.key||live.taskId!==focus.taskId||record.sessionId!==live.sessionId||record.date!==live.date)throw new Error('Japanese focus changed or paused. No review was saved.');
  const data=await loadStudy(io,tracker,live.taskId,record.deviceId);if(!data.binding||record.dataset!==data.binding.dataset)throw new Error('Study binding changed. Reopen focus.');
  const revision=data.deck.match(/^Content revision: ([a-z0-9-]+)$/m)?.[1]||'unversioned';if(record.deckRevision!==revision)throw new Error('Study deck changed. Reopen focus.');
  const cards=parseDeck(data.deck),projection=projectReviews(cards,data.records,record.dataset,revision);if(!cards.some(c=>c.id===record.cardId)||projection.conflicts.has(record.cardId))throw new Error('Study card is missing or has a history conflict.');
  if((projection.states.get(record.cardId)?.lastId||null)!==record.parentId)throw new Error('This card was rated on another surface. Refresh before rating again.');
  const session=data.records.filter(r=>r.cardId===record.cardId&&r.sessionId===record.sessionId),first=session.find(r=>!session.some(p=>p.id===r.parentId)),mode=first?.mode||(projection.states.has(record.cardId)?'review':'new');if(record.mode!==mode)throw new Error('Study mode changed. Refresh first.');
  // Persist defaults only at the first explicit rating, never overwrite custom Markdown.
  for(const [file,text] of [[root+'/Bindings.md',defaults],[`${root}/Japanese/Decks/${record.dataset}.md`,data.deck]])if(await io.read(file)===null){try{await io.create(file,text);}catch(error){if(await io.read(file)!==text)throw error;}}
  const latest=activeModuleFocus(parseBoard(await current()));if(latest?.key!==focus.key||latest.paused)throw new Error('Focus changed before saving.');
  try{await io.create(path,note);}catch(error){const saved=await io.read(path);if(saved===null||JSON.stringify(parseReviewMarkdown(saved))!==JSON.stringify(record))throw error;}
  const saved=await io.read(path);if(saved===null||JSON.stringify(parseReviewMarkdown(saved))!==JSON.stringify(record))throw new Error('Review save is unconfirmed. Inspect the Markdown record before retrying.');
}
