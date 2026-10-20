# Persistent one-offs and moving a task

Plugin 0.13.0 and Windows HUD 0.12.0 add **Obligations**, **Tomorrow** and **Pick date**.
Update the plugin on PC and phone before using moves. Older clients can read the
Markdown but do not understand moved-away plans; they may still display old rows.

- One-off tasks with `Kind` set to `obligation` or `one-off`, and nonrepeating Admin
  tasks, appear in Obligations until explicitly checked off. Their source colors
  and labels are unchanged. Other projects/practices are not silently categorized.
- Unfinished earlier and undated obligations get a shortcut on Today. Earlier dates
  are not called missed/failed. Future plans stay visible in Obligations too.
- Tomorrow moves to the next day relative to the viewed daily page. Pick date
  accepts an explicit date, including beyond the sprint. Original source dates and
  unchecked rows remain history, not extra pending obligations.
- Distinct dated Hard Task entries remain distinct obligations. Taxes and Letters
  are not merged because they share a label. A date collision asks for another day
  rather than overwriting either obligation. Explicit repeated moves remain one
  obligation; returning to an earlier date is supported.
- Only explicit checkoff/Done today completes work and counts a win. Moves, elapsed
  dates and roadmap subtask completion do not resolve an entire tax/legal matter.
  Actual completion still means the existing task's stated definition of done.
- A task in an active focus queue must be finished/cancelled before moving. Draft
  queue steps from its old day no longer play; add it to the new day's queue if wanted.
- Details, roadmap context/progress, logs and old Focus Targets survive. A dated
  duration carries forward when the destination does not already have one.
- No clock time or calendar event is copied to the destination. Existing time/event
  IDs remain at their original date with `needs-review`. Reconciliation must update
  a real provider event and read it back before calling a new booking Scheduled.
- Phone checkbox recovery can complete an earlier source entry; that closes the
  occurrence without fabricating a second completion on its later planned date.

## Markdown

The existing Tasks and Schedule formats are unchanged. For a new one-off:

```md
| example-admin | Named obligation | blue | Admin | obligation | - | 10 | Specific verifiable next action |
```

Moves append an optional, standard Markdown table:

```md
## Task Moves

| ID | Task ID | Original date | From date | To date | Moved ISO |
| --- | --- | --- | --- | --- | --- |
| move-example | example-admin | 2026-10-19 | 2026-10-19 | 2026-10-20 | 2026-10-20T14:00:00Z |
```

Keep both Schedule rows and their original details. Subsequent moves keep the same
Original date and append in order from the current planned day. Direct Markdown
editing remains supported; broken/missing references or branching histories fail
closed for review. Completing any date in that occurrence closes only that instance.
Undo a completion by explicitly unchecking the actual completed entry.

Planning proposals cannot replace Task Moves, completions or logs. Stale proposals
that edit a moved-away source date are flagged for review. This does not add a
distributed lock or automatically resolve Relay conflicts; sync before switching
devices, and do not manipulate recovery records. No live tracker is migrated by
installing this version.
