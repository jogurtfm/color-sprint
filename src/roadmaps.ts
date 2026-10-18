import { parseBoard, saveSubtask, Subtask } from './model';

// Starting points, not claims about an existing project or exercise prescriptions.
const plans:Record<string,[string,number,string][]>={
  'audio-portfolio':[
    ['Choose the portfolio audience and destination',10,'Record the current URL/platform, audience, and the one update to ship.'],
    ['Inventory current examples',15,'List available clips and mark which may be shared publicly.'],
    ['Choose a small set of examples',15,'Select examples and write one sentence about your role in each.'],
    ['Prepare the selected media',25,'Save shareable edits with clear filenames and role descriptions.'],
    ['Update the portfolio page',25,'Place the selected examples, descriptions, and contact link on the chosen platform.'],
    ['Check playback and phone layout',15,'Open every selected example and test the public-facing page on a phone.'],
    ['Publish and save the final link',10,'Verify the published link and record what shipped.']
  ],
  'clean-room':[
    ['Choose the first blocked zone',5,'Name the bed, floor path, desk, or clothing area to reclaim; record the baseline.'],
    ['Clothes: first high-volume category',20,'Sort Keep / Outgoing / Trash and bag outgoing items immediately.'],
    ['Clothes: remaining categories',20,'Triage another category and record what remains; repeat this step if needed.'],
    ['Shoes: keep within actual storage capacity',15,'Gather pairs, select keepers that fit, and bag outgoing usable pairs.'],
    ['Remove outgoing items',15,'Arrange a real donation/removal route and get the outgoing items out of the home.'],
    ['Restore bed, floor paths, and work surface',20,'Return retained items to practical homes and reclaim normal room functions.'],
    ['Test whether the keepers fit',10,'Put clothes/shoes away; reduce again if storage overflows and record remaining work.']
  ],
  'lyrics':[
    ['Choose the song and capture a listening bounce',10,'Save a bounce and name the lyric section to work on.'],
    ['Write one concrete lyric pass',20,'Save a verse/chorus revision with a clear throughline.'],
    ['Test the words against the melody',15,'Sing a rough pass and note specific prosody fixes.'],
    ['Record and save a guide vocal',20,'Save the take and a named decision for the next session.']
  ],
  'write-code':[
    ['Choose one project and one change',5,'Write a named bug, exercise, or feature with a small definition of done.'],
    ['Make the smallest useful change',25,'Save a working implementation or exercise output.'],
    ['Verify and save the result',10,'Run a relevant check and save the commit/file plus the next action.']
  ],
  'japanese':[
    ['Choose a resource and lesson',5,'Name the book/app/lesson and the exercise to finish.'],
    ['Complete the chosen exercise',15,'Save answers or notes for one defined exercise.'],
    ['Recall a few examples',5,'Record what you can recall and the next lesson.']
  ],
  'model':[['Clarify what Model means and select an output',5,'Record the actual practice, resource, and smallest saved result before expanding the roadmap.']],
  'hard-task-tax':[
    ['Identify exactly what 2020 Tax requires',10,'Record the obligation, known status, missing facts, and any deadline to verify.'],
    ['Gather relevant documents',15,'Make a document checklist and collect what is available.'],
    ['Identify the next qualified contact or filing step',10,'Record who to contact or the verified next action and any blocking question.'],
    ['Complete one administrative next action',20,'Save evidence of the action or record the blocker; this alone does not mean taxes are resolved.']
  ],
  'hard-task-letters':[
    ['Identify the letters and each recipient',5,'Record the purpose and recipient separately for each letter.'],
    ['Draft the chosen letter',20,'Save a recipient-specific draft in your own voice.'],
    ['Review facts and boundaries',10,'Verify concrete claims, recipient, and intended request; note unresolved questions.'],
    ['Record the delivery decision',5,'Choose whether/when to send; drafting does not imply sending.']
  ]
};
export function addRoadmap(text:string,taskId:string,context='-'):string{
  const board=parseBoard(text);const task=board.tasks.find(task=>task.id===taskId);if(!task)throw new Error('Task no longer exists.');
  const lower=context.toLowerCase();const key=taskId==='hard-task'?(lower.includes('tax')?'hard-task-tax':lower.includes('letter')?'hard-task-letters':'hard-task'):taskId;
  const steps=plans[key]||[['Define the next visible result',5,'Write the smallest observable result and any decision needed.'],['Do one bounded work block',20,'Save a file, decision, cleared zone, or other visible result.'],['Record the next action',5,'Write what changed and the next action or blocker.']] as [string,number,string][];
  const scope=key==='hard-task-tax'?'2020 Tax':key==='hard-task-letters'?'Letters':taskId==='hard-task'?context:'-';let next=text;
  for(const [index,[title,minutes,definition]] of steps.entries()){
    const id=`roadmap-${key}-${index+1}`;if(board.subtasks.some(sub=>sub.id===id))continue;
    const sub:Subtask={id,taskId,context:scope,minutes,title,definition:`PROPOSED: ${definition} Suggested focus time; edit to fit.`,done:false,completed:'-'};next=saveSubtask(next,sub);
  }return next;
}
