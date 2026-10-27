# Exercise cards and category colors · 0.21.0

Synthetic previews: [mobile](docs/exercises-mobile.png), [keyboard-sized editor](docs/exercises-editor.png), [Windows HUD](docs/exercises-hud.png).

Obsidian on iPhone/PC and the Windows HUD share one editor and one Markdown model. Open Today or Pages → Workouts, then filter Upper body / Lower body. **+ Upper body exercise** and **+ Lower body exercise** create individual cards, not generic Workout parents.

## Quick editing

- Name, optional target sets, target reps and weight. Blank means unconfigured, not a suggested quota.
- Weight stays readable text: `~65 lb`, `20 kg`, `1 plate`, `bodyweight`. No plate-size, per-side or unit conversions are inferred.
- New cards can be planned for the selected day; no recurrence or Calendar event is created.
- **Edit targets** saves a dated prescription. Earlier prescriptions remain for earlier dates. Concurrent same-row edits are rejected.
- Save, Cancel and Hide keyboard stay above scrollable fields. Keyboard-sized viewports reflow the editor. Failed saves retain the visible draft; cancel discards it.

Targets do not prove performance. **+ Log actual set** starts with blank actual fields; targets are placeholders only. Enter reps, actual weight and an optional note. Actual sets are append-only with unique IDs/set numbers, visible on that day's card and in History. Zero reps can record a failed attempt. Saving never checks the task or finishes a timer. Completion, effort choices and sessions remain separate.

An explicitly configured measured reps/points goal can use actual set reps for capped partial credit. Quick rep counts and set reps use the larger total rather than summing the same work twice. Target sets/reps never award points or create scoring goals. Five exercise cards are not five full workout sessions.

## Plain Markdown

Task names, source colors and pages use Tasks; semantic labels use Task Types. Optional readable tables:

```markdown
## Exercise Targets

| Task ID | Since | Sets | Reps | Weight |
| --- | --- | --- | --- | --- |
| example-press | 2026-10-27 | 3 | 8 | 65 lb |
| example-leg | 2026-10-27 | - | - | - |

## Exercise Sets

| ID | Date | Task ID | Set | Reps | Weight | Note |
| --- | --- | --- | --- | --- | --- | --- |
| set-example-one | 2026-10-27 | example-press | 1 | 7 | 60 lb | Actual work |
```

Referenced task IDs must exist. `-` means unspecified target or empty weight/note. Targets accept sets 1–50, reps 1–1000; actual sets accept reps 0–1000. Task/date/set numbers and record IDs are unique. Targets and actuals survive checkbox writes as ordinary Markdown, with no opaque database or login.

Legacy explicit prescriptions can prefill the editor as a draft. Reading them never creates targets, actual sets or completions. Existing trackers need no migration; task inventory is not rebuilt automatically.

## Category accents, not source-color rewrites

Chips and badges share labels, icons and colors on both surfaces: Routine & care, Upper body, Lower body, Home workout, Cardio & outdoors, Strength accessory, Kitchen, Home & room, One-off obligations, Learning, Creative, Projects, Intentional leisure and Other. Labels accompany color cues. Upper body is amber; lower body coral; cardio teal; obligations magenta. A blue-source obligation can be distinguished from a blue-source project without erasing its spreadsheet origin.

The six source groups remain on card accents; existing color focus queues the source group, not an inferred program. Category filters only change display. New upper-body cards use orange / Gym · upper body; lower-body cards use salmon / Gym · lower body. Other source tasks are not silently recolored.

## Sync and versions

Update all writing/scoring clients to 0.21.0 before using actual-set scoring. Older clients cannot interpret these fields or show the editor. New HUD exercise commands require the matching PC plugin; rejection never falls back to another filesystem writer. HUD actions use the existing signed, exact-base Obsidian bridge. Targets are atomic planning fields; actual sets are protected. Routine automatic planning holds backdated target changes.

These guards do not prove Relay reached the phone or guarantee offline conflict immunity. Never fabricate actual logs from targets, reflections or timers. Private trackers and journals are not release assets.
