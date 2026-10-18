# Color Sprint — implementation specification

This is the software source of truth. The user's personal sprint brief and notes remain in the private vault.

## Required result

Build a native Obsidian plugin, usable on iPhone, for managing habits, tasks, goals, and focus timers. Markdown must remain directly editable and authoritative. The interface must expose pages such as Morning and Workouts based on Markdown fields. Publish a public GitHub repository and a BRAT-installable release. Do not add calendar events or scheduling automations.

## Source palette and exact task labels

Preserve six distinct source groups. Color meaning and importance are unconfirmed; pages are editable interface organization.

| Source fill | Exact labels |
| --- | --- |
| #ea9999 | Make Bed; Brush Teeth; Clean Kitchen |
| #cfe2f3 | Cook; Workout; Treadmill; Clean Room; 5 Mile Hike; Revamped Audio Portfolio; Hard Task |
| #fff2cc | Mindfulness; Pushups; Plank |
| #d9d2e9 | Study Japanese; Write code; Model; Lyrics |
| #fce5cd | Push/Pull; Bench 4x10; Overhead |
| #e6b8af | Dips; Leg Press |

## Data and behavior constraints

- 22 labels in the starter; blank dates stay unscheduled. Frequency is opt-in.
- Differentiate habits, sessions, projects, obligations, and exercise components.
- No automatic exercise prescriptions or double-counted workouts. Timer targets measure focus only.
- Checkboxes reflect the user's evidence. Timer completion never marks a task complete.
- Preserve source-dated assignments during the local vault setup. They live only in that vault; public examples contain no personal obligations.
- Room work includes clothes/shoes reduction, outgoing removal, reclaimed space, and storage capacity checks. These can be expressed as goals with evidence.
- An entry's date, task ID, and detail remain editable in Markdown. No opaque database replaces the note.
- Atomic edits use current note content; malformed/ambiguous documents stop writes. Task/goal forms reject edits when their source row changes while open.
- Retain unrelated prose, sections, line endings, and stable task references. Never replace a user's existing note with a starter.
- iOS timer recovery uses persisted timestamps. No claim of background alarms or real-device validation without evidence.
- No runtime network requests, personal data publication, analytics, or external account requirement.

## Acceptance checks

- Parser/writer tests cover all colors, all labels, recurrence, escaped Markdown, source date preservation, stale timer controls, idempotent session saves, and invalid-data refusal.
- Plugin lifecycle harness covers view registration, Markdown checkbox writes, modal task edits, active timer recovery, and cleanup.
- Phone-width browser checks cover Today, Pages/Workouts, Week, direct Markdown edits, timer pause/resume/save, and persistence.
- Release tag matches manifest version; release contains main.js, manifest.json, and styles.css.

## Daily integration amendment · 0.2.0

- Detect explicitly marked daily notes through flat YAML properties: color-sprint, sprint-date, sprint-tracker, sprint-page, sprint-open.
- Route note open to the correct note date, tracker and page. Support per-note and global opt-outs. Preserve access to the raw daily Markdown.
- Register a color-sprint Markdown code block that renders the same interactive surface inline, inheriting note context or taking explicit overrides.
- Support independent tracker bindings for concurrent embeds, views, and edit/session modals. Never redirect writes into the global default by mistake.
- Provide commands to create/open a daily dashboard today or for a selected date. Preserve existing notes byte-for-byte.
- Provide a scaffold for Obsidian's native Daily Notes/Templates, with standard date tokens. No new recurring automation.
- Keep all progress in the existing tracker; daily bodies hold context and reflections. No duplicate task completion state.
- Cover auto-open, opt-out, historical-date routing, embed writes/cleanup, and safe daily creation with tests. Actual iPhone validation remains separate from the harness/browser checks.
