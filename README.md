# Color Sprint

A calm, color-coded surface for habits, tasks, goals, and focus sessions in **Obsidian on iPhone, iPad, and desktop**. Your tracker is an ordinary Markdown note: edit it in Obsidian or tap through the interface. Both use the same data.

![Mobile tracker](docs/mobile-preview.png)

## Install with BRAT

1. Install and enable [BRAT](https://github.com/TfTHacker/obsidian42-brat) from Obsidian's community plugins on your iPhone.
2. In BRAT settings, choose **Add beta plugin** and enter **`https://github.com/jogurtfm/color-sprint`**.
3. Enable **Color Sprint** in community plugins.
4. Run **Color Sprint: Create starter Markdown note**, then **Color Sprint: Open tracker** from the command palette. You can add Open tracker to Obsidian's mobile toolbar.
5. Choose **Pages** to plan your first tasks. Edit a task's **Page** field to create your own pages, such as Morning, Workouts, Room, or Creative.

The default note is `Sync/Color Sprint.md`. To use an existing note in this format, run **Color Sprint: Choose tracker Markdown note**. The plugin never replaces an existing note when creating a starter.

For a manual installation, download `manifest.json`, `main.js`, and `styles.css` from [Releases](https://github.com/jogurtfm/color-sprint/releases) and put them in `<vault>/.obsidian/plugins/color-sprint/`. Enable the plugin in Obsidian. No build is required.

## What you get

- **Today:** only the selected day's planned tasks, color-coded cards, completion progress, first actions, and daily result notes.
- **Week:** a task-per-row, day-per-column grid. A blank `+` means unscheduled. Tap to plan; tap a planned cell to check it.
- **Pages:** your Markdown page labels become navigation filters. Morning, Workouts, Kitchen, Room, Learning, Creative, Admin, and Portfolio are starter interpretations you can change.
- **Goals:** milestones with due dates and evidence. The interface asks for evidence before marking a goal done.
- **History:** focus sessions with elapsed time and the actual result you record. Training details can go in the result or Day details.
- **Focus timer / stopwatch:** start, pause, resume, and save. The active timer and saved sessions live in Markdown. Elapsed time recovers when you return after sleep or app restart.
- **Direct Markdown editing:** checkboxes, task definitions, colors, pages, schedules, recurring weekdays, goals, and timer records remain readable text. File changes refresh the interface.

The six colors match the source palette exactly: pink `#ea9999`, blue `#cfe2f3`, yellow `#fff2cc`, purple `#d9d2e9`, orange `#fce5cd`, and salmon `#e6b8af`. Pages do not merge or reinterpret these color groups.

The starter retains 22 task labels with every task initially **unscheduled**. Set Repeat to `daily` or `mon,wed,fri` to opt into a recurring habit during the Sprint dates. A focus duration is a suggestion for attention, not an exercise prescription. Exercise components never count themselves as additional workouts.

## Markdown is the source of truth

See [FORMAT.md](FORMAT.md) for the complete schema and [examples/Color Sprint.md](examples/Color%20Sprint.md) for a generic example. The format uses standard headings, tables, and `- [ ]` checkboxes. Personal vault contents and daily notes are not published in this repository.

The existing planning document stays useful context. A prose plan is not automatically imported: explicit task IDs, dates, and checkboxes in the tracker determine what appears. This avoids guessing completion, frequency, or workout programming from ordinary prose. A planning assistant can edit the tracker using the same documented format.

## Mobile behavior and limits

No Node.js, filesystem, Electron, or network APIs are used by the plugin. Obsidian's Vault API performs reads and atomic edits. No account, analytics, or external service is required.

iOS can suspend Obsidian. The timer uses persisted timestamps instead of counting background ticks, so elapsed time is reconstructed on return. **There is no background alarm or push notification.** The timer continues until you pause/save; reaching the focus target does not end it or mark work complete. Before changing devices, pause or save the timer. Vault sync conflicts across two simultaneously active devices still require your sync provider's conflict handling.

**Verification:** parser/write/timer tests, actual plugin lifecycle tests with an Obsidian API harness, and narrow-viewport browser interaction checks are provided. Browser checks are not real-device iPhone validation. A real iPhone installation remains the final device check.

## Development

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run preview
```

Preview serves the same surface at `http://127.0.0.1:8776` with generic browser-local demo data. It is a developer preview, not a hosted replacement for Obsidian. Release files are checked into the repo and attached to the `0.1.0` GitHub release for BRAT.

License: [MIT](LICENSE).
