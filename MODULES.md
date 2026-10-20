# Task-linked modules · 0.17.0

The original Japanese screen was a local prototype. Version 0.17.0 connects it
to real Japanese focus in Obsidian desktop/iPhone and the full Windows HUD.
The learner is a small experimental SRS starter, not a full Japanese course.

## Start studying

Update both the PC plugin and HUD to 0.17.0; update/reload the phone plugin with
BRAT. Start Study Japanese focus. In Obsidian, choose Open active focus if the
timer was started elsewhere. The full HUD automatically shows the learner for
the current Japanese step, including group/Quick Queue steps. Selecting a task
alone does not start study. Small rim/widgets keep their timer controls; use the
full HUD for learning.

Reveal an answer, then rate Again, Hard, Good or Easy based on actual recall.
Ratings save independently as Markdown. Finish still belongs to the task/timer:
learning does not check off tasks or steps, create workout sessions or award XP.

At the first explicit rating, missing starter bindings/deck files are created
alongside the tracker under Color Sprint Modules/. Existing custom Markdown is
never overwritten. For a tracker in Sync/, share Sync/Color Sprint Modules/
through the same Relay share on both devices. Opening focus alone creates no
files. Default targets are editable in Bindings.md; running target inputs are
temporary per-view overrides. Increase Content revision when changing card
meaning. Active surfaces check updated study files every three seconds.

Obsidian owns immutable review-file creation through its serialized queue. HUD
ratings use the signed, paired, expiring bridge and never direct filesystem
writes. Live focus, deck revision, binding, card and parent history are rechecked.
Task checkboxes, timers, sessions, phone recovery and planning proposals remain
separate. Malformed history blocks learning instead of resetting it. There are
no external APIs, account credentials, microphone permissions or remote scripts.

## Contract

A task selects a capability-specific workspace, not a second task manager.
Modules attach to an actual active focus step by stable task ID. Merely selecting
a task, opening its daily note, or sharing its color does not load a module.
Japanese is the first built-in module, not a special case embedded in the timer.

```text
Host focus (timer + current queue step)
        → explicit Markdown binding
        → allowlisted lazy module loader
        → shared module UI + narrow data adapter
        → learner review event, never a task/XP mutation
```

- Bindings: [modules/Bindings.md](modules/Bindings.md).
- Generic lifecycle/data contracts: [src/modules/contracts.ts](src/modules/contracts.ts).
- Lazy lifecycle/race guard: [src/modules/host.ts](src/modules/host.ts).
- Built-in loader registry: [src/modules/registry.ts](src/modules/registry.ts).
- First module: [src/modules/japanese/module.ts](src/modules/japanese/module.ts).
- Editable sample cards: [modules/japanese/N5-Starter.md](modules/japanese/N5-Starter.md).

The host grants only study-read and study-append capabilities. Markdown cannot
import a script, open arbitrary files, run IPC commands or invoke other accounts.
A module has no task-check, calendar, timer-control or XP-write API. Only trusted
built-in modules are included in this scaffold; a third-party plugin marketplace
or remote code loader is explicitly outside scope.

### Lifecycle and host integration

1. Resolve activeModuleFocus(board) from the real timer and current group/quick-
   queue item. Match the exact task ID in the bindings.
2. Call TaskModuleHost.sync(container, focus, bindings). The loader runs only for
   an active bound task. A stale async load cannot mount after focus has ended.
3. Pass paused state. The module retains its current UI but reveal/rating is
   disabled while paused.
4. A host re-render can remount the same instance without losing its in-memory
   targets or revealed card. Changing focus disposes the old instance/listeners.
5. Call sync(null, null, bindings) on focus end/queue change and destroy() when
   closing the host. The shared learner component works in mobile and HUD shells.
   A tiny desktop-rim widget should offer “Open study in visor,” not clip the full
   learner into its edge panel.

Surface.renderFocusMode in src/surface.ts and Today focus in
desktop/src/renderer.ts now attach the shared StudyWorkspace. The existing focus
controls and data owners remain in place. The original standalone preview still
uses the same activeModuleFocus selector and component on both sides.

The prototype uses genuine ESM lazy chunks. A BRAT release is currently a single
main.js: its future integration can defer initialization/work without pretending
the bundled bytes are separately downloaded. Do not add remote script loading
to achieve code splitting on iPhone.

## Japanese learner

- Kanji, vocabulary, grammar and due-review lanes.
- User-adjustable session targets (0–50 each); the example defaults are proposals.
- Target edits are per-view preview state only; they do not rewrite or sync the
  Markdown binding. Persistent configuration is a future adapter responsibility.
- Kanji readings in specific words, answer reveal, reading/example/translation.
- Again / Hard / Good / Easy, then next eligible card.
- New-kanji progress counts distinct concepts, not multiple cards for one Kanji.
- Again is an attempt but does not satisfy a completed-concept target.
- Review lane uses only previously studied cards that are actually due. A target
  does not invent reviews, force an overload or imply a failed day.
- Learning progress is separate from the host's explicit Finish task action.

The tiny original deck contains 6 Kanji, 4 vocabulary cards and 4 grammar cards,
aimed at basic/N5-oriented practice. It is not an official or complete N5 list.
There is no handwriting recognition, pronunciation grading, voice capture,
imported commercial Anki deck, generated correctness claim or mastery estimate.

The deterministic scheduler is a replaceable prototype: Again +1 minute; first
Hard/Good +1 day; first Easy +3 days; later intervals use simple multipliers. It
is NOT FSRS, SM-2 compatibility, a validated optimal policy or an Anki sync client.
Scheduler replacement must replay versioned events with an explicit migration.

## Markdown data and future sync

Decks and bindings are ordinary Markdown tables. Escape a literal table separator
as &#124;. Each learner action has a version-1 JSON-in-Markdown review record with
stable ID, module, dataset, deck content revision, card ID, prior review ID,
device/session IDs, date/time, rating and new/review mode. The Inspect review
Markdown button shows exactly the records produced by the sample UI.

Runtime layout, relative to the tracker parent:

```text
Color Sprint Modules/
  Bindings.md
  Japanese/Decks/n5-starter.md
  Japanese/Reviews/<device-id>/<unique-review-id>.md
```

Review records should be unique, immutable appends, not two devices rewriting a
single progress table. SRS state is derived by parent links, not clock-based
last-writer-wins. Replays deduplicate the same event; duplicate IDs with differing
payloads fail closed. Parallel grades from the same parent, orphaned parents or
changed content revisions pause that card for explicit review. Unknown card
records are retained and flagged, not silently deleted.

The PreviewModuleStore is temporary memory only: both example surfaces share it
to demonstrate the adapter. It rejects a stale second local review of the same
card. This is NOT a filesystem adapter, encrypted store, Relay implementation or
claim of verified offline phone/HUD synchronization. Reload clears all practice.

The installed adapter is guarded Obsidian-owned append plus signed HUD requests.
It verifies saves and exact-ID retries, but does not implement a device-local
study outbox or automatic interrupted-save replay. Inspect an uncertain saved
record before retrying. Parallel/offline grades that fork a card pause it; neither
device is silently chosen and no review history is deleted. Unknown cards remain
flagged. Explicit migrations/recovery UI are future work. Real iPhone offline/
reconnect delivery is still an acceptance check, not established by local tests.

## Future study-consolidation seam

Concept IDs + deck revisions + source review IDs are the stable inputs. A future
consolidator can suggest cross-deck reinforcement, tagged notes or a study digest
without inventing prior recall, rewriting review evidence, auto-completing tasks
or changing XP. Keep that service outside the module UI, behind a read-only event
adapter and an explicit proposal/action boundary. No AI consolidation is enabled.

## Try the design

From this repository with the trusted Node runtime:

```text
node scripts/preview-modules.mjs
http://127.0.0.1:8790/
```

Click Focus Japanese. Reveal/rate on either example surface and watch the other
reflect it. Pause/resume blocks/allows interaction. Switch to treadmill or End
focus to dispose the learner. Advance demo +1 day starts another temporary
Japanese focus so previously accepted cards become due. It does not advance the
real schedule or clock. Both views have prototype labels and no vault connection.

Tests cover lazy loading/disposal/races, explicit binding, queue identity,
Markdown round-trips, ratings/targets, parent-graph conflicts/replays, stale
reviews, paused focus, mirroring through the preview adapter and literal-text UI.
The separate design harness still has no vault connection; its shared memory is
not production persistence or proof of Relay server receipt. Version 0.17.0 runtime
integration has additional real-plugin, repository and HUD-renderer tests.

Reference boundaries:
[JLPT level descriptions](https://www.jlpt.jp/e/about/levelsummary.html) define N5
as basic Japanese comprehension; they are not a card-by-card curriculum for this
prototype. [Anki scheduler documentation](https://faqs.ankiweb.net/what-spaced-repetition-algorithm)
describes its scheduling options; this scaffold does not implement them.
