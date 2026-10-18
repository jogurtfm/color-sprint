# Daily dashboards

Color Sprint 0.2.0 connects standard daily-note metadata to the existing Markdown tracker. A daily note supplies context; the tracker supplies tasks and progress. iPhone and desktop use the same format.

## Create a day

Use **Color Sprint: Open or create today’s daily dashboard**. The defaults are `Sync/Daily/MM-DD-YYYY.md` and tracker `Sync/Color Sprint.md`. Set the folder/format in **Settings → Color Sprint**. The alternate command **Create daily dashboard for a date** lets you select an exact date.

The generator never replaces an existing note. If the day's note already exists without metadata, open it as Markdown and add the properties below, preserving its existing frontmatter keys and content. Notes are generated when requested, not by a background scheduler.

## Link a daily note

Add these properties at the very beginning of the note. If a YAML properties block already exists, merge these keys into that block rather than adding a second block.

```yaml
---
color-sprint: true
sprint-date: "2026-10-18"
sprint-tracker: "Sync/Color Sprint.md"
sprint-page: All
sprint-open: true
---
```

- `color-sprint: true` explicitly marks a daily note for this integration.
- `sprint-date` is the note's exact local calendar date, even when you open an older note. Keep it quoted as `YYYY-MM-DD`.
- `sprint-tracker` is a vault-relative path to a Markdown tracker in the documented [format](FORMAT.md). Do not point it to the daily note itself.
- `sprint-page` selects a page such as `All`, `Morning`, or `Workouts`.
- `sprint-open: true` opens/reuses the full tracker tab on note open. The original daily note stays available. Set it to `false` for an embed-only note; a global switch can disable all automatic opening.

**Daily note ↗** in the full view opens the original daily Markdown with a one-time redirect bypass, so you can edit it normally. **Markdown ↗** opens the underlying tracker data instead.

## Embed the interface

Put an empty `color-sprint` fenced block in the daily body. It reads the date, tracker, and page from the properties above:

````md
```color-sprint
```
````

The full interactive interface renders in Reading view or when the code block is rendered in Live Preview. Source mode deliberately remains editable Markdown. The embed includes an **Open full tracker ↗** button. Closing/unrendering the note cleans up that embed's timer display and listeners; the active timer remains saved in the tracker.

For a standalone embed or an override, specify fields inside the block:

````md
```color-sprint
date: "2026-10-18"
tracker: "Sync/Color Sprint.md"
page: Workouts
view: pages
```
````

`view` accepts `today`, `digest`, `week`, `pages`, `goals`, or `history`. Use `view: digest` for a chronological itinerary from Time Blocks and Availability, followed by untimed planned tasks. Use `view: pages` to browse a whole page's task catalog; `view: today` shows that date's planned tasks plus the separate available catalog. Explicit embed values take precedence over note properties. Use `date: today` only when you intentionally want the current day rather than the note's date. An empty embed without a note date shows an error instead of guessing.

For a reusable, always-current itinerary note:

````md
```color-sprint
date: today
tracker: "Sync/Color Sprint.md"
view: digest
```
````

Digest does not add new schedule entries or calendar events when opened. Suggested and verified calendar blocks are labeled separately. Completed tasks remain present and checkable. Timed overlaps in the same time zone are flagged for review; different-zone conflicts need separate reconciliation.

Multiple embeds can point to different trackers. Edits and task/goal/session dialogs stay bound to their originating tracker, and all views of the same tracker refresh together. Note metadata does not change the global default tracker.

## Daily Notes core template

Copy [examples/Daily Template.md](examples/Daily%20Template.md) into your vault's templates folder. In Obsidian **Settings → Daily notes**, select it as the **Template file**. Set the folder and filename format to match your vault.

The template uses `{{date:YYYY-MM-DD}}` in the properties and `{{date:dddd, MMMM D, YYYY}}` in the heading. These are supported by [Obsidian's Templates and Daily Notes](https://obsidian.md/help/plugins/templates). Use the plugin's date-specific generator if another creation tool does not expand those tokens. Do not open the unexpanded template as though it were a dated daily note.

Task completions remain in the tracker's Schedule section; focus history remains in Sessions. Do not copy the same completion checkboxes into both notes and expect them to sync. The daily scaffold includes a short evening reflection with room, workout, creative/admin evidence and one next action.

## Update from 0.1.0

Ask BRAT to check for updates, then disable/re-enable Color Sprint or reload Obsidian to load the new code. Existing tracker files require no migration. Version 0.2.0 requires Obsidian 1.5.7 or later. Plugin configuration and the Daily Notes template may need to be selected separately on each device, depending on your sync settings.
