# Markdown tracker format · version 1

Create a tracker with the plugin's starter command and keep these exact second-level headings once each: **Tasks**, **Schedule**, **Goals**, **Sessions**, **Timer**. Arbitrary prose and other sections are preserved. Fenced examples are ignored. Use the complete starter for the required tables; this page explains their contents.

## Sprint window

```md
Sprint: 2026-10-18 / 2026-10-31
```

Dates are local calendar dates. Recurrence applies only within this range. Explicit Schedule entries can be outside it. The Week view displays seven dates beginning at the selected day; advance seven days to view week two.

## Task catalog

```md
## Tasks

| ID | Task | Color | Page | Kind | Repeat | Timer minutes | Done means |
| --- | --- | --- | --- | --- | --- | --- | --- |
| make-bed | Make Bed | pink | Morning | habit | daily | 2 | Straighten bedding and make bed usable |
| treadmill | Treadmill | blue | Workouts | component | - | 0 | Record actual duration; exercise program to confirm |
```

- **ID:** unique, stable lowercase letters/numbers/hyphens. Rename the visible Task field freely; keep IDs stable so references stay connected.
- **Color:** `pink`, `blue`, `yellow`, `purple`, `orange`, or `salmon`. These map to the original six hex colors. The palette is fixed in this release.
- **Page:** any nonempty label; used for page navigation independently of color. Use `All` only as the built-in unfiltered view, not a custom page label.
- **Kind:** a descriptive label such as habit, practice, component, session, project, or obligation. It does not change counting rules.
- **Repeat:** `-` (unscheduled), `daily`, or comma-separated lowercase weekdays such as `mon,wed,fri` (no spaces). Recurrences are pending until checked; they do not create false completion evidence.
- **Timer minutes:** 0–1440. Zero is a stopwatch. Other values provide a focus target. Timer completion never checks off a task.
- **Done means:** an observable result; add PROPOSED / TO CONFIRM where needed.

Escape literal pipes as `\|`; backslashes as `\\`. Keep each table row on one physical line. The UI escapes entered text automatically. The UI uses text content, so Markdown/HTML in labels is displayed as text.

## Schedule / daily results

```md
## Schedule

- [ ] 2026-10-18 | make-bed | Clear the bed before straightening bedding
- [x] 2026-10-19 | treadmill | Actual: 12 minutes walking; completed as planned
```

Each row is Date | Task ID | Detail. The Detail field may be empty, but keep both `|` separators. One row per date + task ID. Use separate stable task IDs if you need separate morning/evening occurrences. Checkboxes are the only source of task completion. An explicit unchecked entry makes that task planned even when its Repeat is `-`.

An absent entry on a non-recurring day means **unscheduled**, not missed. In the view use Day details to record a result or blocker. For a repeating task, checking it creates the dated entry. To remove an explicit date, delete its Schedule line in Markdown. To retire a task, remove future Schedule lines and set Repeat to `-`; retain the catalog row while historical entries/sessions reference its ID.

## Goals

```md
## Goals

- [ ] room-fit | 2026-10-31 | Room | Kept clothes and shoes fit storage | 
- [x] donation-load | - | Room | Outgoing bags leave the home | Actual: two bags donated
```

Five fields: stable Goal ID | due date or `-` | Page | goal title | evidence. Completing goals in the interface requires evidence. Direct Markdown edits are authoritative, including manual completion changes.

## Sessions

```md
## Sessions

| Session ID | Date | Task ID | Seconds | Note |
| --- | --- | --- | --- | --- |
| s-example | 2026-10-18 | make-bed | 90 | Bedding straightened |
```

Sessions record elapsed focus and actual notes. A manual or legacy log-only row does not infer task completion. The explicit **Finish** action atomically checks off the current task (or subtask), saves its session, and clears the timer. It does not complete unvisited queue items or a subtask's parent project. IDs prevent repeat Finish actions from creating duplicate sessions. **Cancel** clears the running timer without creating a session or changing completion.

## Active timer

```md
## Timer

| Session ID | Task ID | Date | Started ISO | Elapsed seconds | Target seconds | Queue cursor | Step offset seconds |
| --- | --- | --- | --- | --- | --- | --- | --- |
```

Zero or one data row. Started ISO is an ISO timestamp when running; `-` means paused. Elapsed seconds is the accumulated time before the current run; Target seconds is optional focus intent (zero for stopwatch). Do not edit the timer row on two devices at once. Saving a timer appends its session and clears this row in one atomic Vault operation.

Group timer IDs use `group:page:Morning` or `group:color:pink`. Schedule the group first to create unchecked Schedule rows for its members; existing details and completion states are preserved. Queue cursor is zero-based. Step offset seconds records the cumulative elapsed time when the current step began, so each step gets its own countdown while the session total continues. Older six- and seven-column Timer tables migrate on the next timer action, including active timers.

## Subtasks (optional)

```md
## Subtasks

<!-- ID | Task ID | Context or - | Minutes | Action | Done means | Completed date or - -->
- [ ] portfolio-scope | audio-portfolio | - | 10 | Choose the portfolio scope | Record the destination and one update to ship | -
- [ ] tax-documents | hard-task | 2020 Tax | 15 | Gather the available documents | Save a checklist and identify missing documents | -
```

Each subtask has a stable lowercase ID, a real parent task ID, suggested minutes (0 for stopwatch), and a completion date. `-` context means every occurrence of the parent; other contexts appear only when that day's Schedule detail contains the text, case-insensitively. This keeps tax and letter roadmaps separate under Hard Task. Rows stay in Markdown order. Proposed roadmaps can be generated and edited from a task's Roadmap screen.

Focus expands a parent or group into these steps. Done & next records the subtask date and advances; Skip advances without completion. Finish records the current step and ends the focus session. Completing all subtasks does not mark the parent done. The daily wins display counts dated task completions and dated subtask completions separately; sessions and quick increments do not add completion wins. If you edit a subtask checkbox directly, fill its Completed date to include it in that day's count.

## Time Blocks and Availability (optional)

```md
## Time Blocks

| Date | Task ID | Start | End | Time zone | Status | Calendar event ID | Event URL |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-19 | cook | 19:00 | 19:30 | America/Chicago | suggested | - | - |

## Availability

| ID | Label | Days | Start | End | Time zone |
| --- | --- | --- | --- | --- | --- |
| reserved-block | Reserved | mon,tue,wed,thu,fri | 10:00 | 18:00 | America/Chicago |
```

Time Blocks adds a clock time separately from Schedule details and completion. Use 24-hour `HH:MM`, same-day end after start, and an IANA time zone. Status is `suggested`, `scheduled`, or `needs-review`. A `scheduled` block requires a provider event ID; absent IDs/URLs use `-`. Card labels show the range and status, week cells show `~` before suggested start times, and accessible labels include the time zone. Edit start/end from Day details. Saving a new time also creates an unchecked Schedule entry if needed, and retains existing details/completions.

The Digest view merges Time Blocks and Availability chronologically for the selected date. Its planned-minutes total counts task blocks only, not protected availability. Planned tasks without a Time Block remain in Flexible, including completed tasks. Other tasks are collapsed under Available, not due. The view is derived entirely from these existing sections; it does not introduce a second schedule or completion store.

Availability is protected time, not a spreadsheet task or completion win. Days use `daily` or comma-separated weekday tokens like Repeat. The editor rejects overlap with protected blocks or other task blocks in the same time zone; different-zone conflict checks must be performed by the calendar reconciliation workflow. A linked Google event must be reconciled separately after changing its proposed time. This plugin does not hold Google credentials or create events itself; the scheduling assistant uses the connected Google Calendar integration and writes verified provider references back to Markdown.

## Workout Log (optional)

```md
## Workout Log

| ID | Date | Task ID | Duration minutes | Distance miles | Sets / reps / load | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| w-example | 2026-10-18 | treadmill | 20 | 0.8 | 2.8 mph, incline 2 | Easy start |
```

Use task ID `workout` or `treadmill`. Duration and distance are nonnegative numbers; use `0` where a field does not apply. The two dedicated training screens append real entries to this table. A workout-log row is evidence, not a new planned task, completion checkbox, or automatic exercise count.

## Quick Counts (optional)

```md
## Quick Counts

| ID | Date | Task ID | Amount | Unit |
| --- | --- | --- | --- | --- |
| q-example | 2026-10-18 | pushups | 5 | reps |
```

Appropriate cards expose fast increment buttons: Pushups and Dips use reps, Plank uses seconds, and Treadmill uses minutes. Each tap appends an actual increment; it does not complete the card or merge itself into a full workout log.

## Reflections (optional)

```md
## Reflections

What a privilege it is to have another day to try again.
```

Use one plain quote per line. Focus and Meditation mode select one deterministically for the active session. Edit or remove these lines directly; the plugin does not write them.

Malformed tables, duplicate IDs/dates, missing sections, unknown references/colors, and invalid numeric/date values show a readable error and stop writes. Fix the Markdown to resume. Existing prose and unrelated sections are not regenerated.
