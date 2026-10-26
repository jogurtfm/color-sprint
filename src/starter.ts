import { addDays, localDay, TASK_HEADER, SESSION_HEADER, TIMER_HEADER, WORKOUT_LOG_HEADER, QUICK_COUNT_HEADER,saveScoringRule,saveDailyDefault,saveTask,parseBoard } from './model';

/** Only for a brand-new tracker: no existing file or historical checkbox is migrated. */
export function routineStarter(start=localDay()):string{let text=saveScoringRule(starter(start),{id:'scoring-'+start,since:start,rankMultiplier:1.25,stepPoints:5});const meditation=parseBoard(text).tasks.find(t=>t.id==='mindfulness')!;text=saveTask(text,{...meditation,minutes:15,definition:'Meditate for at least 15 actual minutes; choose the practice and record completion honestly.'});for(const taskId of ['make-bed','brush-teeth','clean-kitchen','mindfulness'])text=saveDailyDefault(text,{taskId,since:start,until:'-',enabled:true});return text;}

export function starter(start=localDay()):string{return `# Color Sprint

Sprint: ${start} / ${addDays(start,13)}

Edit this note or use the Color Sprint view. All new tasks begin unscheduled.
Pages are your navigation labels, independent of the six source colors.
Timer minutes are focus suggestions, never exercise prescriptions.
Repeat: - means unscheduled; daily or mon,wed,fri schedules a habit during the sprint.
Completion means the work actually happened. Timers record focus, not workout counts.

## Tasks

${TASK_HEADER}
| --- | --- | --- | --- | --- | --- | --- | --- |
| make-bed | Make Bed | pink | Morning | habit | - | 2 | Bedding straightened and bed usable; proposed |
| brush-teeth | Brush Teeth | pink | Morning | habit | - | 2 | Chosen brushing routine completed; frequency to confirm |
| clean-kitchen | Clean Kitchen | pink | Kitchen | habit | - | 10 | Relevant dishes and surfaces reset; responsibilities to confirm |
| cook | Cook | blue | Kitchen | session | - | 25 | Meal prepared and leftovers put away; proposed |
| workout | Workout | blue | Workouts | session | - | 0 | Agreed training session logged with actual details; program to confirm |
| treadmill | Treadmill | blue | Workouts | component | - | 0 | Actual walking/running duration logged; target to confirm |
| clean-room | Clean Room | blue | Room | project | - | 15 | Named category triaged, outgoing bagged, usable space reclaimed; proposed |
| five-mile-hike | 5 Mile Hike | blue | Workouts | session | - | 0 | Actual distance logged; date and relationship to Workout to confirm |
| audio-portfolio | Revamped Audio Portfolio | blue | Portfolio | project | - | 25 | Defined update shipped; scope/platform to confirm |
| hard-task | Hard Task | blue | Admin | obligation | - | 10 | Next verifiable action or blocker recorded; proposed |
| mindfulness | Mindfulness | yellow | Morning | practice | - | 2 | Practice with a beginning and end; type/duration to confirm |
| pushups | Pushups | yellow | Workouts | component | - | 0 | Actual reps/sets logged; prescription to confirm |
| plank | Plank | yellow | Workouts | component | - | 0 | Actual holds/sets logged; prescription to confirm |
| japanese | Study Japanese | purple | Learning | practice | - | 15 | Named lesson/exercise and learning recorded; resource to confirm |
| write-code | Write code | purple | Creative | practice | - | 25 | Named fix, exercise, or commit saved; project to confirm |
| model | Model | purple | Creative | practice | - | 25 | Concrete output saved; meaning of Model to confirm |
| lyrics | Lyrics | purple | Creative | practice | - | 25 | Named lyric/vocal pass saved; song to confirm |
| push-pull | Push/Pull | orange | Workouts | session | - | 0 | Agreed push or pull session logged; split to confirm |
| bench | Bench 4x10 | orange | Workouts | component | - | 0 | Four sets of ten if agreed; load/variant to confirm |
| overhead | Overhead | orange | Workouts | component | - | 0 | Actual named movement and sets logged; movement to confirm |
| dips | Dips | salmon | Workouts | component | - | 0 | Actual variation and sets logged; volume to confirm |
| leg-press | Leg Press | salmon | Workouts | component | - | 0 | Actual load/sets/reps logged; prescription to confirm |

## Schedule

<!-- Format: - [ ] YYYY-MM-DD | task-id | detail. Empty means unscheduled. -->

## Goals

<!-- Format: - [ ] goal-id | YYYY-MM-DD or - | Page | Goal title | Evidence -->

## Sessions

${SESSION_HEADER}
| --- | --- | --- | --- | --- |

## Timer

${TIMER_HEADER}
| --- | --- | --- | --- | --- | --- | --- | --- |

## Workout Log

${WORKOUT_LOG_HEADER}
| --- | --- | --- | --- | --- | --- |

## Quick Counts

${QUICK_COUNT_HEADER}
| --- | --- | --- | --- | --- |

## Reflections

<!-- Optional: one plain reflection quote per line. Focus and meditation mode show one at a time. -->

## Notes

Your free-form planning, links, and reflections go here. These notes are preserved.
`;}
