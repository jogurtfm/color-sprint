# Trusted local planning · 0.20.0

Routine refinements can apply without a per-proposal approval after the owner explicitly authorizes this Windows device. This is not a new Relay transport or a second tracker writer. Obsidian must run Color Sprint 0.20.0+; the existing paired HUD signing identity is reused. Mobile keeps normal checkbox ownership.

## One-time authorization

Run from this repository with Node 24 and dependencies installed, only with explicit owner consent:

```sh
node --import tsx scripts/apply-planning.ts --vault "PATH TO VAULT" --tracker "Sync/Color Sprint.md" --configure
```

This creates `planner-policy.json` in the existing Windows LocalAppData Color Sprint HUD profile, outside Relay. It pins the vault, tracker, signing identity and authorization timestamp. Private signing keys never enter the vault. Existing enabled policies are not silently retargeted or given a new timestamp.

## Every planning pass

1. Read current planning sources and saved text reflections. Preserve actual progress at every time of day. A fresh morning is permission to refine planning, not evidence that no phone actions exist.
2. Save an exact base and a separate proposed Markdown copy outside the shared folder. Keep source labels, colors, assignments, protected availability and history intact.
3. If there is a meaningful safe change, create a unique version-1 proposal with `scripts/plan-proposal.ts` as documented in SYNC.md. No no-op proposals.
4. Apply that specific newly created proposal:

```sh
node --import tsx scripts/apply-planning.ts --vault "PATH TO VAULT" --tracker "Sync/Color Sprint.md" --proposal plan-UNIQUE-ID
```

The CLI preflights, signs the proposal hash and current tracker base, and opens the existing Obsidian URI handler. The plugin independently verifies signature, pairing, local policy, freshness, exact proposal hash and current tracker. It uses the same write queue and SyncStore backup/receipt logic as ordinary plugin actions. Read-back is required before reporting application. An already-processed receipt does not promise every historical field remains active today.

## Held for review

- Existing backlog predating authorization; nothing automatically scans or applies synced notes.
- Active or paused focus, concurrent edits, changed hashes or merge disagreements.
- Renaming, removing or recoloring source tasks; sprint boundary changes.
- Protected availability, finish multipliers and personal effort-profile changes.
- Backdated schedule/rule changes or any change affecting prior-day points or ranks.
- Any attempted checkbox, evidence, session, workout, input, queue or move-history rewrite.

Do not retry pending/unconfirmed actions blindly. Read the result and current tracker first. Obsidian closed, pairing revoked or policy disabled means pending, not permission for a filesystem fallback. Phone checkpoint recovery stays manual. Relay delivery and phone runtime must be verified separately.

Disable in PC Color Sprint settings or the command **Disable trusted planning on this Windows device**. Re-enabling requires new explicit authorization; scheduled jobs must never run `--configure` themselves.

## Visible workouts

When a Workout has dated/context-matching roadmap steps, Today and Pages show its exercise checklist directly, with targets as written and **Start workout steps**. Step checks are explicit actions, not fabricated logs or a second whole workout. Parent completion and actual sets remain separate controls. Older mobile clients can read the same Markdown via Steps; update BRAT for the inline presentation.
