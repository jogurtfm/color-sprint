# Color Sprint

Local development: **0.12.0** adds mixed, editable Quick Queues shared with the
Windows HUD **0.11.0**, plus desktop workspace tabs. See [Quick Queue guide](QUICK-QUEUE.md).
These builds are prepared locally; this line does not mean a BRAT release was published.

A calm, color-coded surface for habits, tasks, goals, and focus sessions in **Obsidian on iPhone, iPad, and desktop**. Your tracker is an ordinary Markdown note: edit it in Obsidian or tap through the interface. Both use the same data.

![Mobile tracker](docs/mobile-preview.png)

## Install with BRAT

Windows HUD 0.6.0 uses plugin 0.11.0+'s paired bridge for focus/checkoff controls,
so Obsidian owns tracker writes. Pending planning proposals and primary-phone
recovery records stay separate. See [HUD-BRIDGE.md](HUD-BRIDGE.md) for setup,
pairing, privacy, failure behavior and manual-install fallback. No tracker migration.

1. Install and enable [BRAT](https://github.com/TfTHacker/obsidian42-brat) from Obsidian's community plugins on your iPhone.
2. In BRAT settings, choose **Add beta plugin** and enter **`https://github.com/jogurtfm/color-sprint`**.
3. Enable **Color Sprint** in community plugins.
4. Run **Color Sprint: Create starter Markdown note**, then **Color Sprint: Open tracker** from the command palette. You can add Open tracker to Obsidian's mobile toolbar.
5. Choose **Pages** to plan your first tasks. Edit a task's **Page** field to create your own pages, such as Morning, Workouts, Room, or Creative.

The default note is `Sync/Color Sprint.md`. To use an existing note in this format, run **Color Sprint: Choose tracker Markdown note**. The plugin never replaces an existing note when creating a starter.

For a manual installation, download `manifest.json`, `main.js`, and `styles.css` from [Releases](https://github.com/jogurtfm/color-sprint/releases) and put them in `<vault>/.obsidian/plugins/color-sprint/`. Enable the plugin in Obsidian. No build is required.

## What you get

- **Today:** the selected day's explicitly planned tasks, color-coded completion progress, plus an **Available to plan** section for the remaining tasks. The planned count stays honest; a task is not made due merely because it is visible.
- **Digest / itinerary:** a compact chronological timeline of protected time and suggested task blocks, followed by flexible tasks without a clock time. Start the first open task, check items off, or adjust their times directly. Completed items stay visible. Daily task/step wins and planned task minutes exclude protected time. Open the Digest tab or run **Color Sprint: Open daily digest / itinerary**. It reads your existing Markdown; it does not create calendar events.
- **Completion feedback:** a gentle three-note chime, color-matched check animation and small particle burst after a successful completion save. Queued steps celebrate individually; quick increments get lighter feedback. Use the music-note button to mute, or **Effects** / **Settings → Color Sprint → Completion feedback** to independently control sound, animation and supported haptics. Reduce Motion removes animations. No feedback is played for failed saves or merely viewing existing completions.
- **Dictate or type reflections:** tap the microphone shortcut for the selected day, use the iPhone keyboard microphone in the text field, review the words and save straight to Markdown. No audio attachment needs to sync. Unfinished drafts stay on this device until saved; reflections do not change daily task wins.
- **Sync safety:** device-local phone checkbox checkpoints, unique Markdown recovery records and a **Sync review** screen. Scheduled planning changes arrive as separate proposals and merge by task/date/field without replacing checkoffs or actual logs. Intentional unchecks are retained. Review disagreements, preserve current values or restore phone checkbox states with a backup. This is not an automatic Relay conflict resolver or server-sync guarantee. See [SYNC.md](SYNC.md).
- **Fast phone layout:** on narrow screens, branding and secondary status collapse, page filters become a single swipe row, and the first task card comes before the fold. Tap targets remain at least 40–44 px.
- **Week:** a task-per-row, day-per-column grid. A blank `+` means unscheduled. Tap to plan; tap a planned cell to check it.
- **Pages:** your Markdown page labels become navigation filters. Morning, Workouts, Kitchen, Room, Learning, Creative, Admin, and Portfolio are starter interpretations you can change.
- **Goals:** milestones with due dates and evidence. The interface asks for evidence before marking a goal done.
- **History:** focus sessions with elapsed time and the actual result you record. Training details can go in the result or Day details.
- **Focus mode / timer:** tapping **Start focus** dates the task in Schedule and opens its countdown or stopwatch. **Finish** saves the focus session and checks off the current task or subtask, then returns to the full daily list. **Cancel** discards the running timer, preserving every task and any already-completed steps. Result notes are optional. For a page or color group, tap **Schedule [group]** first. **Done & next** checks off a queue step and advances; **Skip / next** advances without completion. Finish never checks off an entire group at once.
- **Focus cues:** starting a timed focus session asks for notification permission when the device supports it. At the target, Color Sprint attempts a chime, vibration, and permitted notification. These cues are best-effort while Obsidian remains open; iOS may suspend plugins in the background, so this is not a substitute for a native alarm or Calendar reminder.
- **Meditation mode and reflections:** tap **Meditate** to start the existing Mindfulness task as a clean, timed practice. Add a `## Reflections` heading with one plain quote per line in the tracker Markdown; focus and meditation mode rotate through those quotes without publishing or rewriting them.
- **Training surfaces:** `Workout` and `Treadmill` each open their own minimal data-entry screen. They append real duration, distance, sets/load, and notes to `## Workout Log`; this stays separate from plan checkboxes and focus sessions.
- **Quick increments:** appropriate cards add real, Markdown-backed counts in one tap: `+1` / `+5 reps` for Pushups and Dips, seconds for Plank, and minutes for Treadmill. Quick counts never complete a task or count as a whole workout.
- **Direct Markdown editing:** checkboxes, task definitions, colors, pages, schedules, recurring weekdays, goals, and timer records remain readable text. File changes refresh the interface.
- **Graduated daily focus targets:** an optional `## Focus Targets` Markdown table can give one habit different durations on different dates. Cards, Digest focus buttons, meditation, and group queues resolve that day's target. A solo timer keeps its captured target once started. Roadmap step times stay independent. See [the format guide](FORMAT.md#focus-targets-optional); no automatic ramp, forced completion, or calendar booking is imposed.

The six colors match the source palette exactly: pink `#ea9999`, blue `#cfe2f3`, yellow `#fff2cc`, purple `#d9d2e9`, orange `#fce5cd`, and salmon `#e6b8af`. Pages do not merge or reinterpret these color groups.

The starter retains 22 task labels with every task initially **unscheduled**. Set Repeat to `daily` or `mon,wed,fri` to opt into a recurring habit during the Sprint dates. A focus duration is a suggestion for attention, not an exercise prescription. Exercise components never count themselves as additional workouts.

## Markdown is the source of truth

Version 0.4.0 adds editable roadmaps, subtasks with suggested minutes, queued step countdowns with a cumulative focus total, and a daily tasks/subtasks completed display. Open **Roadmap** or **Steps** on a task, generate proposed steps, and edit them before use. Portfolio, room recovery, lyrics, code, Japanese, and context-specific admin tasks have starter roadmaps; an unknown task receives a small generic starting point. No roadmap auto-completes its parent or automatically fills the daily schedule.

This release also fixes old Timer table upgrades and makes focus/meditation open reliably after a save. If a timer is already active, tap **Open active focus** to return to it. The phone layout has a smaller header, compact cards, and group actions alongside their color labels; Markdown and settings shortcuts remain at the foot of the list.

See [FORMAT.md](FORMAT.md) for the complete schema and [examples/Color Sprint.md](examples/Color%20Sprint.md) for a generic example. The format uses standard headings, tables, and `- [ ]` checkboxes. Personal vault contents and daily notes are not published in this repository.

The existing planning document stays useful context. A prose plan is not automatically imported: explicit task IDs, dates, and checkboxes in the tracker determine what appears. This avoids guessing completion, frequency, or workout programming from ordinary prose. A planning assistant can edit the tracker using the same documented format.

Completed cards remain visible with checked boxes. Starting focus creates an unchecked dated entry when one is missing. Legacy log-only task sessions and dated completed subtasks also keep their parent visible for that day, without inventing parent completion. Finish and Cancel return to the full daily list for the timer's date (or Digest if you started there), so page filters do not hide the item you just used.

## Dictate a text reflection · new in 0.9.0

1. Tap **🎙** in Color Sprint, or run **Color Sprint: Capture a reflection (dictate or type)**. The shortcut uses the selected date, not necessarily today.
2. Tap the text field or **Dictate / type**, then tap the microphone on your iPhone keyboard. You can also type normally.
3. Finish dictation using the keyboard, review the words, then tap **Save reflection**. The text appends to `Sync/Reflection/Voice/YYYY-MM-DD.md` without replacing existing entries or audio embeds.
4. Reopen the panel and expand **Saved entries for this day** to review, or use **Open journal** to edit ordinary Markdown.

If the keyboard microphone is missing, enable **iPhone Settings → General → Keyboard → Enable Dictation**. Color Sprint provides a normal text field; it cannot press Apple's microphone or stop keyboard dictation automatically. Speech processing follows Apple's settings and availability, not a plugin transcription service. See [Apple's Dictation guide](https://support.apple.com/guide/iphone/iph2c0651d2/ios).

Closing the panel keeps the unfinished draft in device-local, vault-specific Obsidian storage. Drafts do not sync and are not encrypted separately by the plugin. **Save reflection** is required to put the words in Markdown for your existing vault sync. Saves are append-only, retries are deduplicated, and failed writes retain the draft. Clearing app storage can lose an unsaved draft. Older Obsidian versions without local storage show a warning to save before closing. No audio file, API key, Whisper setup, Audio recorder core plugin, or plugin microphone permission is needed for the default flow.

Change the destination under **Settings → Color Sprint → Reflection journal folder**. The historical `Voice` folder is retained so existing notes are still found; no migration or deletion is performed. A journal is created only on save or explicit **Open journal**, not just by viewing the panel. These journals are separate from the tracker's `## Reflections` quote list. The morning planning assistant can read saved text directly as reflection context, never as proof of completion or automatic task instructions.

### Existing audio recordings

Existing audio remains accessible in saved journal entries. **Color Sprint: Open legacy audio reflections** retains the old recorder panel if needed. Its floating **Stop & save** control and command remain available for an already active recording. This legacy flow still requires Obsidian's Audio recorder and attachment sync; it is not the recommended capture path.

The core recorder chooses its note at stop time. For a Color Sprint capture, **Stop & save restores the original journal** before stopping, so returning to the tracker or selecting another day does not redirect the audio there. The origin pointer is kept on this device (using vault-specific local storage when available); it is not published or put in the tracker. The control shows **Saving** until a new audio embed is observed and asks the Markdown view to save. **Keep the journal open until its player appears**. A stop/save failure is reported, not labeled as a successful recording. Repeated stop clicks share one operation; starting another capture is blocked during saving. Recordings started outside Color Sprint, or before origin tracking existed, use the native current-note destination rather than a guessed journal. If no note is active, Obsidian may save an attachment without embedding it; check the saved recording before continuing.

The integration checks the core recorder's runtime command bridge. Missing/changed controls fail safely with manual instructions; opening another capture never toggles an existing recording off. Automatic command dispatch is verified against the installed Obsidian 1.14.4 source and in the plugin harness, not by recording from a real iPhone. Recording permission, audio quality, saving and sync still need a real-device check. **Stop an active recording before restarting Obsidian or updating its plugins.** See [Obsidian's Audio recorder documentation](https://obsidian.md/help/plugins/audio-recorder).

## Daily notes and embedded dashboards · new in 0.2.0

Run **Color Sprint: Open or create today’s daily dashboard**. The plugin creates a daily note with date metadata and a working dashboard embed, or opens the existing note without replacing its content. To create another day, use **Color Sprint: Create daily dashboard for a date**.

Linked daily notes can automatically open the full sprint interface for **their own date**. Use **Daily note ↗** in the interface to return to the daily Markdown without being redirected again. To stay with the inline dashboard, set `sprint-open: false` in that note. A global switch is available under **Settings → Color Sprint → Open linked daily notes as a sprint**.

To use your existing daily notes, add the properties and embed documented in [DAILY.md](DAILY.md). To scaffold new days with Obsidian's Daily Notes core plugin, choose [examples/Daily Template.md](examples/Daily%20Template.md) as its template. Properties use standard YAML and templates use Obsidian's built-in date tokens. No scheduler or extra template plugin is required; notes are generated when you create/open a day.

Embedded and full-screen dashboards share the same tracker note. They do not duplicate checkboxes into the daily note. The daily body stays available for notes and reflection; the tracker keeps dated progress and sessions. Embeds work in Reading view and rendered code blocks in Live Preview; Source mode shows the editable code block.

## Mobile behavior and limits

For first sync-safety setup on the primary phone, update to **0.10.0**, open **Sync review**, confirm its current checkboxes are correct and tap **Protect this phone’s current checkbox state**. Later plugin checkbox actions are checkpointed automatically. Leave **Primary phone checkpoints on this device** on for the phone and off for the PC. Checkpoints and proposals must be inside your Relay Shared Folder. Existing Relay conflicts are not silently resolved, and direct Markdown edits still work but are not automatically checkpointed as phone actions. Independent desktop/script writers should remain read-only during concurrent phone use until they adopt the protocol. Full details and the planning-proposal helper are in [SYNC.md](SYNC.md).

Optional Markdown Time Blocks display suggested start/end times on cards and in the weekly cells. Set them in Day details; Availability holds protected time separately from task counts. Google Calendar synchronization is performed by the scheduling assistant through its connected Calendar integration, with provider IDs stored in private vault data. The Obsidian plugin displays that data and makes no Google API calls. See [FORMAT.md](FORMAT.md) for both schemas and sync status rules.

No Node.js, filesystem, Electron, or network APIs are used by the plugin. Obsidian's Vault API performs reads and atomic edits. No account, analytics, or external service is required.

iOS can suspend Obsidian. The timer uses persisted timestamps instead of counting background ticks, so elapsed time is reconstructed on return. **There is no background alarm or push notification.** Quick Queue catches up elapsed timed steps when its owning device resumes; other focus modes continue until you pause/save. Reaching any target never marks work complete. Before changing devices, sync, then explicitly use **Run on this device** for Quick Queue (or pause/save other timers). Runner ownership is not a distributed lock; simultaneous offline edits can still conflict in your sync provider.

Sounds use Web Audio after an interaction; volume, silent mode, or audio routing can affect what you hear. Haptics use the browser Vibration API where available and are **not guaranteed on iPhone**. There is no native Taptic Engine bridge or new phone permission that enables unsupported vibration. Feedback failures never block a saved checkbox. Preferences are stored in plugin settings, not the task Markdown.

**Verification:** parser/write/timer tests, actual plugin lifecycle tests with an Obsidian API harness, and narrow-viewport browser interaction checks are provided. Browser checks are not real-device iPhone validation. A real iPhone installation remains the final device check.

## Development

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run preview
```

Preview serves the same surface at `http://127.0.0.1:8776` with generic browser-local demo data. It is a developer preview, not a hosted replacement for Obsidian. Release files are checked into the repo and attached to versioned GitHub releases for BRAT.

License: [MIT](LICENSE).
# New in 0.13.0: persistent obligations

**Obligations** keeps unfinished nonrepeating admin/hard tasks visible until
explicit completion. Use **Tomorrow / Pick date** on a planned one-off card;
original dates, separate tax/letter entries, notes and progress stay intact.
Moves are not wins. Calendar IDs stay at the old date marked for review rather
than pretending a provider event moved. Update PC/mobile before using moves.
See [OBLIGATIONS.md](OBLIGATIONS.md). Windows companion: HUD 0.12.0.
