# Rated finishes · plugin 0.15.0 / HUD 0.14.0

Two separate questions: **How hard is this task usually for you?** (Effort profile,
base points) and **How did you approach this completion today?** (Finish rating).
This is self-report, not a judgment of your character or an inferred diagnosis.

| Finish | Today's execution | Default multiplier | Make Bed, 10 base points |
| --- | --- | --- | --- |
| Red 😴 | Bare minimum | 0.5× | 5 |
| Yellow 🙂 | Solid | 1× | 10 |
| Green 😤 | Full effort | 1.5× | 15 |

All three explicitly check the task and count as **one win**. Minimum effort still
counts. Rest does not need to be earned. Use the level that honestly fits today.
Ordinary checkboxes and legacy Finish remain **unrated at base points**, not an
invented Solid rating. Timer expiry, skipping and cancelling do not rate or
complete anything. Changing an existing completion's rating changes its points,
not its number of wins; unchecking clears that completion's rating.

## Using it

- On a scheduled card, open **Finish · effort** and choose an emoji/point preview.
  Completed cards stay visible; open **Change** to correct the rating.
- Focus mode offers the same three choices. In a routine or roadmap, a rated
  completion advances to the next step; the last choice finishes the session.
  Quick Queue continues forward normally. Pause, Reset, Cancel and unrated Finish
  remain available. The small Windows rim uses emoji buttons with labeled tooltips.
- Roadmap steps can record a rating and a subtask win, but earn no extra task
  points. Complete/rate the parent explicitly when its definition is actually met.
- The HUD uses the signed, revision-checked Obsidian bridge for vault writes.
  Update PC Obsidian to **0.15.0+** before using rated HUD actions in a vault.

## Plain Markdown, no migration

Optional sections; task IDs and source colors remain unchanged. A task rating is
keyed by date/target/ID. A subtask uses its stable step ID and completion date.
Ratings do not imply completion: only a checked Schedule row earns task points.

```markdown
## Completion Ratings

| Date | Target | ID | Level |
| --- | --- | --- | --- |
| 2026-10-20 | task | make-bed | light |

## Finish Multipliers

| Level | Multiplier |
| --- | --- |
| light | 0.5 |
| solid | 1 |
| full | 1.5 |
```

Edit multipliers directly in Markdown, or submit an assistant planning proposal
for review. Each is a finite number from 0 through 3; missing rows use defaults.
The Effort view explains the active values. Points are rounded to one decimal.
Current difficulty profiles and multipliers recalculate historical scores; there
is no second mutable XP ledger. Moved occurrences still award only once, on their
earliest checked day. Separate dated obligations remain separate.

## Sync and privacy

Completion Ratings are actual user progress, not allowlisted planning fields.
Reviewed proposals preserve them. Primary-phone write-ahead checkpoints include
rating changes and explicit clearing even when the checkbox itself stays checked.
Recovery uses the existing sequence/review/backup process, not a whole-file winner.
Older checkpoint records without a rating preserve the current rating.

Update both devices before using this feature. Older clients do not manage ratings
or their clearing, and direct Markdown edits are not phone plugin checkpoints.
When manually unchecking a task, also remove its corresponding rating row if you
do not want that rating to apply on a later manual recheck. Review recovery before
restoring over intentional raw-Markdown edits. No new network service, journal
upload, permission, tracker rewrite or automatic retrospective rating is added.

## Verification limits

Shared model, signed bridge, phone recovery and actual bundled-plugin/HUD DOM
tests cover grading, rerating, intentional unchecks, stale cursors, queue advance,
duplicate prevention and protected planning merges. Browser previews use generic
fixtures, including mobile-width and compact-rim checks. These are not proof of
BRAT delivery, native iPhone haptics or every Windows display layout.

The HUD timer action row is now on a flat interactive plane; decorative panels
retain their curves and depth. A real browser hit-test caught the old perspective
transform blocking Pause/Start clicks. Real clicks then verified Reset, Pause,
and rated Finish with persisted demo Markdown, separately from synthetic tests.
