import { localDay, validDay } from './model';

export interface DailyLink {date:string;tracker:string;page:string;autoOpen:boolean}
export interface EmbedLink extends DailyLink {view:'Today'|'Digest'|'Week'|'Pages'|'Goals'|'History'|'Queue'|'Obligations'}
function record(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))return {};return value as Record<string,unknown>;}
export function vaultPath(value:string,folder=false):string{
  const path=value.trim();if(!path||path.startsWith('/')||/[\\:\r\n]/.test(path)||path.split('/').some(p=>!p||p==='..'||p==='.'||p.startsWith('.'))||(!folder&&!path.endsWith('.md')))throw new Error(`Use a visible vault-relative ${folder?'folder':'.md path'}: ${path}`);return path;
}
function dateValue(value:unknown):string{const date=value instanceof Date?value.toISOString().slice(0,10):String(value??'');if(!validDay(date))throw new Error('Set sprint-date to a real YYYY-MM-DD date in the daily note.');return date;}
export function dailyLink(frontmatter:unknown,fallbackTracker:string):DailyLink|null{
  const fm=record(frontmatter);if(fm['color-sprint']!==true)return null;
  return {date:dateValue(fm['sprint-date']),tracker:vaultPath(typeof fm['sprint-tracker']==='string'?fm['sprint-tracker']:fallbackTracker),page:typeof fm['sprint-page']==='string'&&fm['sprint-page'].trim()?fm['sprint-page'].trim():'All',autoOpen:fm['sprint-open']===true};
}
export function embedLink(config:unknown,frontmatter:unknown,fallbackTracker:string):EmbedLink{
  const cfg=record(config);const fm=record(frontmatter);
  const rawDate=cfg.date==='today'?localDay():cfg.date??fm['sprint-date'];
  const tracker=typeof cfg.tracker==='string'?cfg.tracker:typeof fm['sprint-tracker']==='string'?fm['sprint-tracker']:fallbackTracker;
  const page=typeof cfg.page==='string'?cfg.page:typeof fm['sprint-page']==='string'?fm['sprint-page']:'All';
  const views:Record<string,EmbedLink['view']>={today:'Today',digest:'Digest',week:'Week',pages:'Pages',goals:'Goals',history:'History',queue:'Queue',obligations:'Obligations'};
  const view=views[String(cfg.view??'today').toLowerCase()];if(!view)throw new Error('Embed view must be today, digest, week, pages, goals, or history.');
  return {date:dateValue(rawDate),tracker:vaultPath(tracker),page:page.trim()||'All',autoOpen:false,view};
}
export function dailyFilename(day:string,format='MM-DD-YYYY'):string{
  if(!validDay(day))throw new Error('Choose a real YYYY-MM-DD date.');if(format!=='MM-DD-YYYY'&&format!=='YYYY-MM-DD')throw new Error('Daily filename format must be MM-DD-YYYY or YYYY-MM-DD.');
  return (format==='MM-DD-YYYY'?`${day.slice(5,7)}-${day.slice(8,10)}-${day.slice(0,4)}`:day)+'.md';
}
function scaffold(date:string,title:string,tracker:string,autoOpen:boolean):string{return `---
color-sprint: true
sprint-date: ${JSON.stringify(date)}
sprint-tracker: ${JSON.stringify(vaultPath(tracker))}
sprint-page: All
sprint-open: ${autoOpen}
---

# ${title}

## Today’s sprint

The dashboard below uses this note’s date. Checkboxes, day details, goals, and timers save into the linked tracker.

\`\`\`color-sprint
\`\`\`

## Notes / next action

- First action:
- What changed:
- Blocker or adjustment:

## Evening check-in

- Completed (actual evidence):
- Workout (actual sets / duration / distance, if any):
- Room (category sorted / items removed / space reclaimed):
- Creative / learning / admin result:
- One thing to start with tomorrow:
`;}
export function dailyScaffold(date:string,tracker:string,autoOpen=true):string{
  if(!validDay(date))throw new Error('Choose a real YYYY-MM-DD date.');const title=new Date(`${date}T12:00:00`).toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});return scaffold(date,title,tracker,autoOpen);
}
export function dailyTemplate(tracker:string,autoOpen=true):string{return scaffold('{{date:YYYY-MM-DD}}','{{date:dddd, MMMM D, YYYY}}',tracker,autoOpen);}
