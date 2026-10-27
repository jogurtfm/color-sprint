# Sync safety and planning proposals · 0.20.0

0.21.0 adds dated Exercise Targets and protected append-only Exercise Sets. Update writing/scoring clients before using set-based metric credit; see [EXERCISES.md](EXERCISES.md). Target proposals merge atomically and cannot replace actual performed sets.

Owner-authorized routine updates may use the separately configured signed local planner in [TRUSTED-PLANNING.md](TRUSTED-PLANNING.md). It applies fresh, conflict-free planning through the plugin queue with the same backup and receipts. It never scans old proposals, bypasses progress protection or auto-restores phone checkpoints. Manual review below remains available for other changes.

This is a safety layer around normal Markdown, not a replacement sync engine or a promise that Relay never conflicts. The tracker remains directly editable and readable by older clients. No existing tracker is migrated or split into an opaque database.

## Ownership

| Data | Authority / behavior |
| --- | --- |
| Task definitions, durations, proposed schedule/details, time blocks, availability, focus targets and roadmap wording | The planning assistant submits a separate proposal. The plugin reviews it against the latest tracker by stable task/step/date IDs. |
| Task, subtask and goal checkboxes | Actual user actions; planning proposals never replace them. Mobile checkpoint recovery takes precedence when explicitly reviewed and restored. Intentional unchecks are retained. |
| Completion evidence, sessions, active timer, workout logs and increments | Current tracker is preserved by the planning merger. No invented completion or replacement from a stale planning snapshot. |
| Effort Profile | Optional personal task/page/kind ratings; planning changes go through reviewed proposals and concurrent user ratings are retained. Reflection-based guesses remain proposed; see EFFORT.md. |
| Reflection capture | Separate dated journal files; not treated as commands or task-completion evidence. |
| Task Moves / persistent obligations | Explicit user schedule moves; planning proposals retain current history and flag stale edits to moved-away dates. Checkbox recovery preserves real completion without manufacturing a second completion on the new day. |
| Completion Ratings | Actual per-completion user choices, protected from planning rewrites. Primary phone checkpoints include rating-only changes and explicit clearing with checks/unchecks. Old checkpoints without a level retain current ratings. |
| Finish Multipliers | Optional scoring rules; reviewed planning merges use three-way conflicts. Changing rules recalculates historical points, not completion. See RATED-FINISH.md. |

The user's phone is the primary checkbox device. Under Settings → Color Sprint, **Primary phone checkpoints on this device** defaults on for mobile and off for desktop. This preference is device-local, not synchronized in plugin settings. Leave it on for one primary phone. If multiple primary devices disagree, recovery flags the disagreement rather than guessing based on a wall clock.

## Phone checkpoints

Before a primary-phone checkbox change, the plugin saves its intent to vault-specific device-local storage. Only after the tracker write succeeds is that record marked committed and copied to a unique Markdown note:

`<tracker parent>/Color Sprint Sync/Phone/<device ID>/<record ID>.md`

No shared append file is rewritten. A logical per-device sequence orders checks and unchecks without trusting clock timestamps. Unchecks are not discarded by a naive “checked always wins” rule. Notes contain versioned JSON inside ordinary Markdown, using stable task/date/step/goal IDs. The device ID is random, not a phone serial number or account credential.

If the checkpoint note cannot be written, the committed device-local outbox is retained for retry through **Sync review**. If the tracker write fails or the app closes between stages, the intent stays **unconfirmed** and is never automatically used as completed work. Archive unconfirmed attempts to separate Markdown records for manual inspection; archiving is not completion. A local-storage failure blocks a primary-phone checkbox write before changing the tracker.

Open **Color Sprint: Review sync and recover phone checkboxes**, or **Sync review** in the tracker tools/footer. It previews committed checkpoint differences, including checks and unchecks. **Restore … phone checkbox states** creates a full pre-restore recovery copy and checks that the tracker has not changed since review. It restores completion fields, not the whole old file. Existing task definitions and session/workout/count history stay current. A removed task/step is flagged for review instead of recreated from a guess. Conflicting goal evidence stays in its original checkpoint while current nonempty evidence is retained.

For first setup on the phone, confirm its existing tracker shows the correct checks and unchecks, then choose **Protect this phone’s current checkbox state** once in Sync review. This records the visible baseline without changing completion. Do not capture a stale PC copy as the phone baseline. Later explicit plugin actions are checkpointed automatically.

This only protects explicit plugin checkbox actions **after this update is installed on the phone**. It cannot reconstruct unsynced edits it has never received. Direct edits in the Markdown editor still work but are not checkpointed as phone plugin actions. Do not restore stale checkpoints over intentional later raw-Markdown edits without reviewing the preview. Keep separate backups for full history. Clearing app storage can erase a checkpoint that has not been exported yet.

## Scheduled refinements: proposal inbox, not hot-file rewrites

The scheduling assistant must NOT edit the live tracker or the Phone/Applied/Recovery records. At the beginning of a refinement, save the exact tracker Markdown as a base snapshot outside the Relay shared folder. Edit a second working copy into the proposed plan. Then create one new proposal in:

`<tracker parent>/Color Sprint Sync/Proposals/<unique ID>.md`

The note is generated with the script below, or contains exactly one `json` fenced block with:

```json
{
  "version": 1,
  "id": "plan-unique-id",
  "tracker": "Sync/Color Sprint.md",
  "created": "2026-10-18T20:00:00Z",
  "base": "THE EXACT ORIGINAL MARKDOWN STRING",
  "proposed": "THE PROPOSED MARKDOWN STRING"
}
```

Use a new ID for every proposal. JSON-escape the Markdown strings normally; do not truncate either snapshot. The payload is limited to 4 MB and both snapshots must parse as valid Color Sprint Markdown. Notes are private vault data and must not be committed to this public repository. Share the parent folder through Relay so the inbox and checkpoint notes reach the phone; these are Markdown and do not require attachment sync.

From this repository (Node and dependencies installed):

```sh
node node_modules/tsx/dist/cli.mjs scripts/plan-proposal.ts --vault "PATH TO VAULT" --tracker "Sync/Color Sprint.md" --base "BASE.md" --proposed "PROPOSED.md"
```

The script writes a unique new proposal only, refuses linked destination directories and never modifies the live tracker. Existing public examples may be used in a temporary test vault, not as replacements for a personal tracker.

## Three-way review

0.19.0 adds atomic planning merges for Scoring Rules, Metric Goals, Subtask Goals,
Daily Defaults and Task Types. Actual Step Counts are protected, not planning
fields. Update every writing client to 0.19.0+ before reviewing proposals
that include these sections; older clients cannot apply these settings. Raw inputs,
subtask checks, task checks, ratings and timers remain protected actual progress.

The plugin compares **base**, **current tracker**, and **proposed plan**. It changes only allowlisted planning fields that still match the base (or already match the proposal). Same-field disagreements, removals, missing referenced entities, invalid intervals, protected-time overlaps and sprint date-range changes are flagged. New schedule entries start unchecked, regardless of a planner's completion claims. Time-block rows are merged atomically, so a start time cannot be spliced with an unrelated end or event ID. Non-planning prose is retained from the current tracker.

In Sync review, inspect **Review changes** before applying. With no disagreements, use **Apply reviewed planning changes**. Otherwise either make a revised proposal, or explicitly choose **Keep current conflicts; apply listed safe changes**. The latter retains current values for every flagged disagreement/removal and marks that proposal processed, not every proposed field accepted. No ambiguous change is auto-selected. If a proposal contains newly introduced tasks needed by dependent rows, those are applied first.

Applying creates a full pre-apply Markdown recovery snapshot. The live write uses `Vault.process` and exact compare-and-swap against the reviewed current text. An intervening edit aborts rather than overwrites it. An active or paused timer blocks plan application until finished/cancelled. A processed receipt retains the exact proposal so repeated review does not reapply an obsolete plan. Changing a processed proposal under the same ID is flagged; submit a new one instead. Neither source proposals nor backups are deleted.

Review is user-triggered; proposals do not silently change a routine in progress. Newly scheduled tasks/times appear only after application. For two simultaneous planning proposals, apply one, refresh, and review the next against the new current state.

## Relay conflicts and boundaries

Relay local conflicts compare a file on disk with its collaborative record; Local/Remote labels do not reliably mean “my phone” and “my PC.” See [Relay's conflict guide](https://docs.relay.md/guides/resolve-local-conflicts/). Keep a backup of the latest contents on **each device**, inspect actual text, and do not select an entire file merely because of its label. A recovered checkbox is not proof Relay has delivered the result elsewhere.

This plugin does not call Relay's private mutation/debug APIs, clear its merge bases, replace its CRDT records, delete a shared folder or choose Keep Remote/Local. Its Sync review does not claim to clear existing Relay conflict banners or confirm server acknowledgment. Resolve those with Relay's own comparison workflow, then use the phone checkpoints to recover checkbox intent where necessary. Keep phone and PC Obsidian open long enough to exchange records; an offline phone's latest actions cannot be inferred on the PC.

Read-only companion apps that parse the tracker remain compatible. A desktop HUD or script that independently writes the tracker can still collide with phone edits; keep such clients read-only while relying on primary-phone progress. HUD 0.6.0 and plugin 0.11.0 add a paired [Obsidian bridge](HUD-BRIDGE.md): actions pass through the plugin's own write queue instead of a second local writer. It keeps proposals/checkpoints separate, rejects stale requests and does not claim distributed/offline conflict immunity. Do not enable a second independent sync provider over the same shared files without reviewing Relay's guidance.

Automated unit/integration/browser checks exercise stale reviews, rejected writes, outbox retry, intentional unchecks and semantic merge behavior. They do not substitute for a real phone–PC–Relay offline/reconnect test. There is no automatic background conflict-repair loop, record pruning or history compaction in this release.
