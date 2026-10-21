export interface RecipeStep {id:string;title:string;instruction:string;temperature:string;seconds:number}
export interface Recipe {id:string;title:string;status:string;servings:string;ingredients:string[];steps:RecipeStep[];notes:string;path:string;markdown:string;revision:string}
const slug=(s:string)=>s.toLowerCase().normalize('NFKC').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function fingerprint(text:string):string {let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
export function timerSeconds(text:string):number {
  const value=text.trim().toLowerCase();let seconds:number;
  const clock=value.match(/^(\d{1,2}):([0-5]\d):([0-5]\d)$/),unit=value.match(/^(\d+(?:\.\d+)?)\s*(s|sec|secs|seconds?|m|min|mins|minutes?|h|hr|hrs|hours?)$/);
  if(clock)seconds=+clock[1]*3600+ +clock[2]*60+ +clock[3];
  else if(unit)seconds=Number(unit[1])*(unit[2].startsWith('h')?3600:unit[2].startsWith('m')?60:1);
  else throw new Error('Timer must be a duration such as 5 min, 90 sec or 00:05:00.');
  if(!Number.isFinite(seconds)||seconds<0||seconds>86400||!Number.isInteger(seconds))throw new Error('Timer must be whole seconds between 0 and 24 hours.');return seconds;
}
export function parseRecipe(markdown:string,path:string):Recipe {
  if(markdown.length>65536)throw new Error('Recipe exceeds 64 KB.');
  const text=markdown.replace(/\r/g,''),lines=text.split('\n');
  const field=(name:string)=>lines.find(l=>l.startsWith(name+':'))?.slice(name.length+1).trim()||'';
  const id=field('Recipe ID'),title=lines.find(l=>/^#\s+/.test(l))?.replace(/^#\s+/,'').trim()||'';
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)||!title)throw new Error('Add a title and unique lowercase Recipe ID.');
  const sections=new Map<string,string[]>();let section='';for(const l of lines){const h=l.match(/^##\s+(.+?)\s*$/);if(h){section=h[1].toLowerCase();if(sections.has(section))throw new Error('Duplicate recipe section: '+h[1]);sections.set(section,[]);}else sections.get(section)?.push(l);}
  const ingredients:string[]=[];let group='';for(const l of sections.get('ingredients')||[]){const h=l.match(/^###\s+(.+?)\s*$/);if(h)group=h[1];else if(/^\s*[-*+]\s+/.test(l)){const item=l.replace(/^\s*[-*+]\s+(?:\[[ xX]\]\s*)?/,'').trim();if(item)ingredients.push((group?group+' · ':'')+item);}}
  const steps:RecipeStep[]=[];let step:RecipeStep|null=null;let body:string[]=[];
  const flush=()=>{if(!step)return;step.instruction=body.join('\n').trim();if(!step.instruction)throw new Error('Add instructions for '+step.title+'.');steps.push(step);body=[];};
  for(const l of sections.get('steps')||[]){const h=l.match(/^###\s+(.+?)\s*$/);if(h){flush();const stepTitle=h[1],stepId=slug(stepTitle);if(!stepId||stepId.length>100||steps.some(s=>s.id===stepId))throw new Error('Step headings must be distinct and contain letters or numbers.');step={id:stepId,title:stepTitle,instruction:'',temperature:'',seconds:0};}
    else if(step&&/^Timer:/.test(l))step.seconds=timerSeconds(l.slice(6));
    else if(step&&/^Temperature:/.test(l))step.temperature=l.slice(12).trim();
    else if(step)body.push(l);
  }flush();if(!ingredients.length||!steps.length||steps.length>50||ingredients.length>100)throw new Error('Add Ingredients bullets and 1–50 Steps headings (up to 100 ingredients).');
  return {id,title,status:field('Status')||'Draft',servings:field('Servings'),ingredients,steps,notes:(sections.get('notes')||[]).join('\n').trim(),path,markdown,revision:fingerprint(text)};
}
export interface CookingTimer {duration:number;remaining:number;deadline:number|null;status:'running'|'paused'|'ringing';notified:boolean}
export function makeTimer(seconds:number,now:number):CookingTimer {if(!Number.isInteger(seconds)||seconds<1||seconds>86400)throw new Error('Choose a timer from 1 second to 24 hours.');return {duration:seconds,remaining:seconds,deadline:now+seconds*1000,status:'running',notified:false};}
export function remaining(timer:CookingTimer,now:number):number {return timer.status==='running'?Math.max(0,Math.ceil(((timer.deadline??now)-now)/1000)):timer.remaining;}
export function advanceTimer(timer:CookingTimer,now:number):CookingTimer {return timer.status==='running'&&remaining(timer,now)===0?{...timer,remaining:0,deadline:null,status:'ringing'}:timer;}
export function pauseCooking(timer:CookingTimer,now:number):CookingTimer {const next=advanceTimer(timer,now);return next.status==='running'?{...next,remaining:remaining(next,now),deadline:null,status:'paused'}:next;}
export function resumeCooking(timer:CookingTimer,now:number):CookingTimer {return timer.status==='paused'?{...timer,deadline:now+timer.remaining*1000,status:'running'}:timer;}
export function extendCooking(timer:CookingTimer,now:number):CookingTimer {const left=Math.min(86400,remaining(advanceTimer(timer,now),now)+60);return {...timer,remaining:left,deadline:timer.status==='paused'?null:now+left*1000,status:timer.status==='paused'?'paused':'running',notified:false};}
export function validTimer(value:unknown):value is CookingTimer {const t=value as CookingTimer;return !!t&&Number.isInteger(t.duration)&&t.duration>=1&&t.duration<=86400&&Number.isInteger(t.remaining)&&t.remaining>=0&&t.remaining<=86400&&['running','paused','ringing'].includes(t.status)&&typeof t.notified==='boolean'&&(t.status==='running'?typeof t.deadline==='number'&&Number.isSafeInteger(t.deadline):t.deadline===null);}
export function clock(seconds:number):string {const s=Math.max(0,Math.ceil(seconds));return (s>=3600?Math.floor(s/3600)+':':'')+String(Math.floor(s/60)%60).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
