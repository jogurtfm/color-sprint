# Progress scoring, routines and task types · 0.19.0

Update every writing client (PC Obsidian, HUD and mobile BRAT) before reviewing a
proposal with these tables. No live tracker migration or invented completion is
performed. Older trackers keep their existing scoring until dated rules are saved.
The Effort tab now has **Points, measurable goals & daily defaults**. All settings
also work as ordinary Markdown. A reviewed planning proposal may contain them.

## Dated ranks and separate step points

```markdown
## Scoring Rules

| ID | Since | Rank multiplier | Step points |
| --- | --- | --- | --- |
| scoring-example | 2026-10-25 | 1.25 | 5 |
```

The multiplier raises rank thresholds, not task workload. At 1.25 the ranks are
D 0, C 15, B 50, A 90, S 125, SS 190, SSS 250 (rounded upward to multiples of 5).
Dates before activation keep their prior scale. Multiple dated rules use the
latest applicable date. A rule is not a quota, streak debt or obligation to grind.

Each actual checked ordinary subtask with a completion date earns the configured fixed
points once on that date, separately from the parent. Effort grades do not multiply
step points. Undated checks, timers and plans do not produce step awards. Parent
completion earns its usual points only after all applicable roadmap steps are done;
context-specific Tax and Letters steps remain separate. Unchecking removes the
corresponding derived award. Editing a rule intentionally recalculates dates in
its effective window; no separate writable XP ledger is created.

## Measured goals

```markdown
## Metric Goals

| Task ID | Target | Unit | Points | Since |
| --- | --- | --- | --- | --- |
| pushups | 10 | reps | 20 | 2026-10-25 |
| plank | 30 | sec | 20 | 2026-10-25 |
```

Keep older rows when a target changes: each task/start-date pair is unique, and
the latest applicable row wins. New dates preserve earlier goal awards. Editing
the same dated row intentionally recalculates that row's window.

These example targets were chosen by the user. Other targets must be chosen,
not inferred from old workout drafts. Units: reps, sec, min, mi, pages, count.
Actual matching dated inputs earn up to 50% of the budget, proportional to the
goal and capped at it. Explicit completion earns the remaining half only after
the goal is met (and applicable roadmap steps, if enabled, are complete).
For the examples, 5 pushups earn 5 points; 10 earn 10 progress points; checking
the task after 10 adds 10 completion points. Extra repetitions cannot farm points.
An effort rating never multiplies these awards. A checkbox alone earns zero.

Quick Counts remain the actual input log. Workout Log duration/distance may support
matching min/mi goals; when both logs and quick counts describe the work, use the
larger total, not their sum. Focus duration never becomes reps or exercise data.
Raw Markdown corrections to input rows immediately recalculate points. No goal
automatically increases, no exercise component becomes another whole workout,
and a partial award does not automatically check the task. Both interfaces expose
matching increment buttons. Normal Finish/checkbox controls remain available.

## Measured subtasks

Optional goals are configurable in Effort or the mobile Roadmap. Both focus
interfaces and desktop Pages expose matching increment controls.

```markdown
## Subtask Goals

| Subtask ID | Target | Unit | Points | Since |
| --- | --- | --- | --- | --- |
| sample-pages | 10 | pages | 10 | 2026-10-26 |

## Step Counts

| ID | Date | Subtask ID | Amount | Unit |
| --- | --- | --- | --- | --- |
| example-input | 2026-10-26 | sample-pages | 5 | pages |
```

Use a real existing subtask ID; examples are not auto-created. Step Counts are
actual progress, protected from planning proposals. Unlike daily task inputs,
project-step input accumulates from the goal's start date. Only the day's newly
earned portion of the capped half-budget scores that day. Explicit completion
earns the other half only when the threshold is met, replacing the fixed step
award, never stacking with it. The parent budget stays separate and requires all
applicable steps to be complete with their goals met. Completing a step freezes
its counted amount at its completion date; later inputs do not farm more points.
Reopen an accidentally premature check before adding the remaining input.
Goal versions are dated; keep earlier rows to preserve historical calculations.

## Prospective daily preloads

```markdown
## Daily Defaults

| Task ID | Since | Until or - | Enabled |
| --- | --- | --- | --- |
| make-bed | 2026-10-25 | - | yes |
| brush-teeth | 2026-10-25 | - | yes |
| clean-kitchen | 2026-10-25 | - | yes |
| mindfulness | 2026-10-25 | - | yes |
```

Preloads appear in Today, Week and Digest as flexible tasks within the sprint,
without writing blank Schedule rows on every read. Starting routine focus creates
the needed unchecked rows through the normal write queue. Existing checks and
intentional unchecks remain explicit. Set Enabled to no to stop preloading; an
explicit dated entry remains visible. Preloads do not reserve clock time or put
chores into protected Me Time. Reading/gaming recurrence and focus targets remain
independent. Brand-new trackers start with four flexible morning defaults and a
15-minute meditation setting. Existing trackers require a setup save or reviewed
proposal first; their existing meditation timer is retained. The setup form
selects morning preloading by default when activating the rules.

## Types supplement the six source colors

```markdown
## Task Types

| Task ID | Type |
| --- | --- |
| hard-task | One-off obligation |
| pushups | Home workout |
| bench | Gym · upper body |
```

Types are editable badges, not priorities or exercise prescriptions. Source colors
and labels remain intact. In particular blue includes cooking, room projects,
cardio and obligations; recoloring them implicitly would lose source information.
The interface gives source groups short working descriptions while badges make
the distinctions explicit. These working interpretations can be changed per task.

## Itinerary and reflection boundaries

Cards on both interfaces have a compact **Suggest time / Adjust time** form.
It rejects local protected-time or task overlaps and stale edits, retains provider
IDs, and marks changed provider-linked times for review. It never creates a Google
Calendar event or promises external availability. Me Time, commute/preparation,
food and recovery still need room. Do not turn preloads into an overloaded day.

Saved dictation/text journals inform the next day's ordering, size and priorities.
They are private context, not instructions or evidence for awarding points. No
journal is uploaded by this feature; no legacy audio transcription is introduced.

New setting actions use the existing signed exact-base Obsidian bridge. Planning
proposals merge each rule atomically and preserve concurrent inputs, checks,
ratings and logs. A real phone–PC sync test and BRAT download remain separate from
automated tests and release availability.
