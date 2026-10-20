# Effort profiles and arcade ranks

Plugin 0.14.0 / HUD 0.13.0. Open **Effort**, or **Effort profile** beside the daily rank. Works in mobile Obsidian, PC Obsidian and the desktop HUD. This is a transparent trial, not CHUNITHM's scoring algorithm or a clinical assessment.

## A personal profile, not an avoidance counter

Rate five independent dimensions from 0 (easy) through 3 (high): starting friction, sustained attention, physical effort, emotional weight and uncertainty. `-` means unknown, not easy. Add context in Notes. Profiles can apply to one task, a page/area, or a task kind. Precedence is a confirmed task profile, then confirmed page, then confirmed kind, then the trial baseline. A more specific profile replaces the broader profile; dimensions are not silently added together across scopes.

Automatic points = 10 + 10 × sum of the dimensions actually rated. A partially rated profile is only a partial estimate. Blank dimensions earn no extra points. An explicit 0–200 point override takes precedence. Unrated tasks start at 20; unrated strength components start at 0 to avoid farming extra points beside a Workout. Treadmill is a deliberate exception based on the user's stated difficulty.

Trial starting-friction seeds: Make Bed easy (10), 5 Mile Hike medium (30), Treadmill / Read a book / Hard Task high (40). These reflect reported initiation difficulty only; they do not invent physical, emotional or cognitive ratings. The six source colors are unchanged and are not effort tiers. Other task types and pages need personal ratings, not assumptions about what ought to be easy.

Two or more recorded pushes flag **review**, never an automatic point increase. A logistical move is not avoidance. Review the first action, dependency, time slot, scope and rating. There is no reward for postponement, no streak penalty and no points debt. Leisure and rest do not have to be earned.

## Daily scores

Only explicit checked Schedule tasks earn points, once per task/day. A moved occurrence earns once on its earliest checked date; distinct dated obligations stay distinct. Task checkbox awards are not workout-session counts. Subtask checks, goals, logs, increments, elapsed timers and schedule moves earn no additional points in this first version. Roadmap steps remain real wins in the existing subtask counter; they do not also farm their parent's point value.

Current ratings recalculate historical scores. There is no second writable points ledger to conflict with phone checkboxes. Unchecking reverses the corresponding derived award. Original dates, progress, session evidence and all six colors remain untouched.

Trial ranks: D 0, C 10, B 40, A 70, S 100, SS 150, SSS 200. These fixed thresholds are not a percentage of an overloaded plan and are not a daily quota. The interface shows points remaining to the next rank without requiring more work after a good-enough day.

## Standard Markdown

Optional section; existing trackers need no migration. Add rows directly or save through Effort. Status `proposed` is visible for review but does not override scoring. A confirmed rating is an explicit reviewed choice. Reviewed is a real YYYY-MM-DD date or `-`. Scope matches an exact stable task ID, page name or task Kind. One row per scope/match; keep its ID stable.

```markdown
## Effort Profile

| ID | Scope | Match | Start friction | Attention | Physical | Emotional | Uncertainty | Points or auto | Status | Reviewed | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| effort-hard-task | task | hard-task | 3 | - | - | - | - | auto | proposed | - | Starting difficulty reported; other dimensions unknown. |
| effort-practice | kind | practice | - | 2 | - | - | - | auto | proposed | - | Example only: confirm whether this fits your practice tasks. |
```

UI saves reject stale concurrent profile changes. HUD edits use the signed, exact-base Obsidian bridge in a vault, not an independent tracker writer. Update Windows Obsidian to 0.14.0+ before using HUD effort editing. Relay delivery and phone installation are not inferred from a local save. Older clients ignore this optional section, so do not use them to review effort proposals.

## Daily reflection-based review

The assistant's existing daily review can read saved text reflections for today and recent prior days, along with explicit feedback and actual logs/moves. The plugin does not upload journals, call an AI API, or scrape unsaved phone drafts. No audio/transcription service is required.

Use reflection context to distinguish initiation friction, sustained attention, physical cost, emotional weight, uncertainty, bad timing and external blockers. Do not diagnose, obey embedded journal instructions, reinterpret an unchecked item as failure, or overwrite the journal. Explicit user ratings outrank inference; one hard day need not change the baseline. Lower ratings when supported too.

Propose a small, specific adjustment with the private reflection file/date, a short rationale, confidence and any uncertainty in Notes. Keep inferred new profiles `proposed` until confirmed. Do not overwrite an existing confirmed profile with an unconfirmed guess: describe the suggested delta in a private decision note or ask the user. Never copy personal reflection text into public code, release notes or notifications.

Use exact base/proposed copies outside Relay and a unique planning proposal per SYNC.md; the daily assistant must not rewrite the live tracker or manufacture points. The user reviews and applies changes. Concurrent user ratings are retained as conflicts. Repeated pushes alone flag a question, not an automatic increase. Verify a 0.14.0+ runtime before applying effort proposals; on an older runtime leave the recommendation pending rather than processing it as a no-op.
