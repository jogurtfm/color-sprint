import type {ModuleBinding,ReviewRecord} from './contracts';
import {validDay} from '../model';
export const BINDING_HEADER='| Task ID | Module | Dataset | New kanji | Vocab | Grammar | Reviews |';
const identifier=(v:unknown):v is string=>typeof v==='string'&&/^[a-z0-9][a-z0-9-]{0,79}$/.test(v);
export function parseBindings(text:string):ModuleBinding[]{
  const lines=text.replace(/\r/g,'').split('\n'),at=lines.findIndex(l=>l.trim()===BINDING_HEADER);if(at<0)return [];
  const found=new Set<string>(),out:ModuleBinding[]=[];for(const line of lines.slice(at+2)){if(!line.startsWith('|'))break;const cells=line.split('|').slice(1,-1).map(c=>c.trim());if(cells.length!==7)throw new Error('Invalid task-module binding row.');
    const [taskId,moduleId,dataset,...numbers]=cells;if(![taskId,moduleId,dataset].every(identifier)||found.has(taskId)||numbers.some(n=>!/^\d+$/.test(n)||Number(n)>50))throw new Error('Invalid or duplicate module binding. Targets must be 0–50.');
    found.add(taskId);out.push({taskId,moduleId,dataset,targets:{kanji:+numbers[0],vocab:+numbers[1],grammar:+numbers[2],review:+numbers[3]}});
  }return out;
}
export function validateReview(value:unknown):ReviewRecord {
  const r=value as ReviewRecord;if(!r||r.version!==1||r.moduleId!=='japanese-srs'||![r.id,r.dataset,r.deckRevision,r.cardId,r.deviceId,r.sessionId].every(identifier)||r.parentId!==null&&!identifier(r.parentId)||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!validDay(r.date)||!/^\d{4}-\d{2}-\d{2}T/.test(r.at)||!Number.isFinite(Date.parse(r.at))||new Date(Date.parse(r.at)).toISOString()!==r.at||!['again','hard','good','easy'].includes(r.rating)||!['new','review'].includes(r.mode))throw new Error('Invalid study review record.');
  return {version:1,id:r.id,moduleId:r.moduleId,dataset:r.dataset,deckRevision:r.deckRevision,cardId:r.cardId,parentId:r.parentId,deviceId:r.deviceId,sessionId:r.sessionId,date:r.date,at:r.at,rating:r.rating,mode:r.mode};
}
export function reviewMarkdown(record:ReviewRecord):string {const r=validateReview(record);return '# Color Sprint study review\n\nVersion 1 · actual learner rating, not task completion.\n\n```json\n'+JSON.stringify(r,null,2)+'\n```\n';}
export function parseReviewMarkdown(text:string):ReviewRecord {if(text.length>16384)throw new Error('Review note too large.');const blocks=[...text.matchAll(/```json\s*\n([\s\S]*?)\n```/g)];if(blocks.length!==1)throw new Error('Expected exactly one review record.');return validateReview(JSON.parse(blocks[0][1]));}
