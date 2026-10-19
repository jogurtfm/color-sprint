# Quick Queue and desktop workspace tabs

Prepared locally: Obsidian plugin **0.12.0** and Windows HUD **0.11.0**. These are
separate versions. Update the plugin on both phone and Windows before creating a
queue; older plugins cannot interpret a running Quick Queue timer.

## Using the queue

1. Tap **+ Queue** on any task. Missing schedule entries are added unchecked for
   the selected day; existing dates, details and actual completions are preserved.
2. Open **Queue**. Mix tasks from any page/color, use up/down to order them, remove
   future items, and edit minutes. Applicable unfinished roadmap steps expand into
   individual queue items. Duplicate task/step additions do not create duplicates.
3. Choose **Start queue**. Dated reading targets are captured on adding a task;
   meditation queue blocks retain the 15-minute minimum. Zero-minute steps are
   open stopwatches and wait for an explicit Finish or Skip.
4. Timed steps automatically advance. A timer expiring is **not evidence of task
   completion**: it never checks tasks off or increases daily wins by itself.
5. **Finish & next** checks off only the current task/subtask and starts the next
   block. Finishing a subtask does not finish its project. **Skip** advances without
   completion; **Cancel** stops the run without erasing the queue or prior checkoffs.
6. Add tasks while running; they append after the current run. Active/earlier items
   are protected from reorder/removal; upcoming items remain editable.

## Switching devices and sync

The active timer records a designated runner. Only that device automatically
advances it. On another device choose **Queue > Run on this device**, then Resume
if paused. Windows HUD actions use the paired local Windows Obsidian writer; a
standalone demo file uses the HUD writer instead. No protected-vault direct writes.

Let Relay finish syncing before switching; do not operate the same queue on two
offline devices. The runner marker reduces competing automatic writes, but is
not a distributed lock or a guarantee of conflict-free cloud synchronization.
Planning proposals cannot replace the current queue, completions or active timer.

iOS may suspend Obsidian when backgrounded/locked. On the designated device,
elapsed timed blocks catch up when the plugin runs again. Open-ended steps hold
the queue. This feature does not promise closed-app background alarms, native
notifications or haptics. Long gaps do not become unlimited logged focus time:
automatic session time stops at the final target boundary.

## Editable Markdown

Queue order is table-row order. IDs must be unique lowercase letters, numbers,
and hyphens; parent task/subtask IDs must exist. Do not delete or change IDs used
by an active timer. Use the interface to safely edit a running queue.

```md
## Focus Queue

| ID | Date | Task ID | Subtask ID or - | Minutes | Action | Done means |
| --- | --- | --- | --- | --- | --- | --- |
| queue-bed | 2026-10-19 | make-bed | - | 2 | Make Bed | Bed usable |
| queue-japanese | 2026-10-19 | japanese | - | 15 | Study Japanese | Named lesson recorded |
```

The existing Timer table keeps its old 6/7/8-column compatibility. Running Quick
Queues add **Queue item IDs** (comma-separated stable IDs) and **Runner device**.
Titles, definitions and durations are captured queue values; editing the task
catalog later does not unexpectedly change a running block.

## Windows workspace additions

The HUD retains its Today cockpit and adds Queue, Digest, Week, Pages, Goals and
History tabs. Week supports planning/checkoffs and suggested times. Pages shows
task cards and roadmap checkboxes, with separate Workout/Treadmill actual-data
forms. Goals can save evidence and complete/reopen existing goals. History keeps
focus and training records separate. Digest shows protected/suggested itinerary
blocks and flexible tasks.

Creating/editing task definitions, new goals, and full roadmap authoring still
belong in the Markdown/Obsidian editor; this is not a claim of complete parity
with every mobile editing dialog. No calendar-provider events are created here.

## Verification boundary

Tests use generated fixtures, not the personal vault. Browser previews were
checked at 1280px desktop and 390px mobile widths, including actual pointer tab
activation. These are browser-renderer checks, not native Windows hit testing or
physical iPhone/Relay background-delivery verification. Native acceptance remains.
