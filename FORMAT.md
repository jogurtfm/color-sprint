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

Sessions record elapsed focus and actual notes. They are not automatic workouts or task completions. You can add a manual record with a unique ID and actual seconds, or correct an existing result directly. IDs prevent a repeated Save action from duplicating the same timer session.

## Active timer

```md
## Timer

| Session ID | Task ID | Date | Started ISO | Elapsed seconds | Target seconds |
| --- | --- | --- | --- | --- | --- |
```

Zero or one data row. Started ISO is an ISO timestamp when running; `-` means paused. Elapsed seconds is the accumulated time before the current run; Target seconds is optional focus intent (zero for stopwatch). Do not edit the timer row on two devices at once. Saving a timer appends its session and clears this row in one atomic Vault operation.

Malformed tables, duplicate IDs/dates, missing sections, unknown references/colors, and invalid numeric/date values show a readable error and stop writes. Fix the Markdown to resume. Existing prose and unrelated sections are not regenerated.
