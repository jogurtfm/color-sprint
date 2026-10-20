# Color Sprint HUD · Windows preview 0.15.0

Includes companion plugin 0.16.0. Today focus stays centered on the screen while
scrolling; GPU bounds refresh correctly. Prominent rank sprites, replaceable UI
sounds and rank-up effects are included. See ARCADE.md. Also retains rated red 😴 / yellow 🙂 / green 😤 finishes.
Task cards and focus controls preview points; the compact rim has emoji choices.
All levels are one win. Update PC Obsidian to 0.15.0+ for rated bridge actions.
See RATED-FINISH.md; physical iPhone/BRAT confirmation remains separate.

## Personal effort and arcade ranks

Open **Effort** to rate starting friction, sustained attention, physical effort,
emotional weight and uncertainty per task, page or task type. Today shows points
and a trial daily letter rank. Repeated pushes flag review, not automatic increases.
Weights live in optional Markdown, with reviewed sync proposals and stale-edit
checks. Only explicit task checks earn points; logs, timers and subtasks do not
double-award. See EFFORT.md. Requires plugin **0.14.1+** for protected vault edits.

## Persistent obligations

Open **Obligations** for unfinished one-off admin/hard tasks across dates.
Use **Tomorrow / Pick date** to move the next plan while preserving original
history, source colors, roadmap context and progress. Distinct taxes/letters
remain separate. An earlier date is not automatically a miss; moves are not wins.
Requires plugin **0.13.1+** for these actions on a protected vault. Old calendar
events/times are retained as needs-review, not silently moved. See OBLIGATIONS.md.

## Quick Queue and workspace tabs

Add tasks with **+**, open **Queue**, order steps and edit minutes, then Start.
Timed targets advance automatically without inventing completions. Finish checks
off the current task/step and continues; Skip leaves it unfinished. Queue order,
durations and active-run state are ordinary Markdown shared with the mobile plugin.

Tabs: Today, Queue, Digest, Week, Pages, Goals, History. Week supports plan/checkoff;
Pages includes roadmap checks and actual Workout/Treadmill logging; Goals records
evidence; History keeps real data separate from timer targets.

The workspace uses an etched command rail, luminous active indicators, amber focus
controls, numbered queue steps and sector headers. Controls remain on a flat native
hit plane. Reduced Motion and Quiet mode suppress panel entrance animation.

Requires Obsidian plugin **0.12.0+** for these new controls on a protected vault.
The portable package includes its standard three plugin files in
`resources/app/dist/obsidian-plugin`. Update Obsidian only when it is closed, keep
backups, then reopen it and pair normally. No live vault was changed by packaging.
See QUICK-QUEUE.md in the package. Desktop artifacts are prepared locally, not
automatically uploaded to GitHub. Physical phone/native Windows acceptance is pending.

## Toolbar repair

The previously omitted interaction stylesheet is now shipped and loaded last.
Only the brand is draggable; toolbar controls have explicit native no-drag regions.
The toolbar itself is no longer perspective-transformed, keeping its Windows hit
map aligned without changing the curved panels or the rest of the 3-D design.

- Command opens the searchable command deck; refresh ticks no longer replace its rows.
- Desktop Rim opens the three edge surfaces.
- Focus / Day Widget opens, closes, or restores a hidden widget.
- Gear opens settings. Fullscreen and F11 toggle actual fullscreen, not rim mode.
- Minimize leaves fullscreen before minimizing. Close hides all overlays to the tray.
- Hidden renderers use normal Electron background throttling; native reminders remain main-process driven.

Extract into a new folder and launch **Launch Color Sprint HUD.cmd**. Do not
overwrite an open old version. Your existing Local AppData settings are reused;
this package does not replace notes or enable tracker editing.

89 automated tests and strict TypeScript pass. A native read-only fixture launched
and exposed its toolbar through Windows accessibility, but screen capture timed
out and pointer geometry was unavailable. Actual native clicks remain unverified.
See [Windows theme and taskbar notes](WINDOWS-THEME.md) for the matching palette,
safe native settings and measured taskbar observations.

## Curved surfaces restored · corrective art-direction pass

0.10.1 **removes the Three.js panel replacements**. The original curved panels,
CSS depth treatment and rim crescent remain authoritative. No generated rectangle,
bevel-edge band, full-screen globe or per-task GPU cube is layered over them.

The reactor now has a clear central aperture, solid lit annular sectors and two
restrained mechanical gimbals. A small latitude/longitude globe stays in its own
instrument port instead of drifting across task text. App cubes have five distinct
3-D cores, with real app icons retained as small corner badges.

A compositor exclusion mask protects panels, timer text, buttons and app badges,
including overlapping protected regions. This is not just lower graphic opacity.
Original panel shapes/curvature, task data and controls are unchanged.

The GPU now targets only the reactor, bounded globe and app sculptures (or terrain
when no app dock is shown). Each individual scene has fewer than 20 renderable
objects. Pixel ratio is capped at 1.25, animation at 24 fps Cinematic / 16 Balanced;
DOM bounds are cached between layout changes. Duplicate CSS scenery and large
animated rear rails are stopped while GPU visuals are active. These are workload
reductions, not a claim of measured Windows CPU or RAM improvement.

Close the old HUD using its tray menu, extract this ZIP into a **new folder**, and
run **Launch Color Sprint HUD.cmd** there. Visor → Settings → Cinematic enables
the instruments. Native GPU appearance/performance still needs manual Windows
acceptance; the managed workspace does not permit that launch. Your screenshot
of 0.10.0 was used to identify and remove the obstructing geometry.

## Previous 0.10.0 implementation (superseded above)

This build uses bundled **Three.js 0.180.0 / WebGL2**, not just CSS perspective.
Close the older HUD from its tray menu, extract the new portable ZIP into its own
folder, then run **Launch Color Sprint HUD.cmd**. Choose **Visor → Settings →
Visual density → Cinematic**. Settings shows **THREE.JS / WEBGL2** when the GPU
renderer starts, or an explicit CSS fallback when it cannot.

- A genuine multi-axis reactor: wireframe globe, independently rotating gimbals,
  studded hoops, orbiting crystals, selected-task accent, live focus-progress arc,
  and a soft Fresnel glow. Task/time text stays on the stable HTML plane.
- Real beveled, extruded curved panel frames with a separated rear layer; hover
  brightens the frame and opens its depth. The rim uses a crescent-shaped mesh,
  not a filled rectangular background.
- The curved launcher gets actual rotating 3-D cubes, octahedral cores, orbital
  collars, individual colors, floating motion and faster inspection on hover.
  Native app icons, labels and saved-ID-only launch buttons remain accessible.
- Three environmental wireframe globes, six cube satellites, perspective grid,
  bounded pointer parallax, and shader-driven animated terrain replace the old
  Canvas2D terrain loop. Confirmed completion cues produce a fading GPU particle
  burst; graphics never check off a task or invent progress.
- One transparent renderer per window, capped pixel ratio and frame rate
  (Cinematic 40 fps target / Balanced 24 fps target). Quiet hides GPU visuals;
  motion-off and Windows Reduce Motion render static geometry without an idle
  animation loop. Hidden windows stop rendering. These are caps, not measured
  performance promises.
- WebGL context loss exposes the CSS fallback, then restores the scene when the
  context returns. Removed panels release their geometry/materials. DOM scroll
  clipping is reapplied to GPU glyphs so icons do not spill out of task lists.

Three.js and its MIT license are packaged locally. No CDN, runtime asset download,
renderer Node access, relaxed sandbox or new vault-writing privileges are used.
The Obsidian bridge/data protocol, daily wins, timer commands, local refresh and
launcher allowlist are unchanged. HUD 0.10.0 is independent of the companion
Obsidian plugin's version; protected write controls still require plugin 0.11.0+.

Native Windows/WebGL appearance and performance still need manual acceptance on
your machine. This managed workspace blocks the Electron startup needed for that
check. Automated tests validate real Three geometry and the renderer lifecycle
through an injected recording renderer, **not actual GPU pixels**.

## Spatial cockpit redesign

Open **Visor**, then choose **Settings → Visual density → Cinematic** for the
complete redesign. This is the expanded full-screen treatment; the default rim
continues to leave Windows usable and keeps its small native window bounds.

- Main panels are **perspective-angled 3-D slabs**: the existing working front,
  rear plate, four extrusion faces, floating rear rails and scanning glass. Left
  and right banks curve toward the center; header and lower deck occupy inclined
  planes. Hover/keyboard focus lights the frame, not a moving text/click target.
- A larger **four-axis reactor** surrounds focus: motorized gimbals, double hoops,
  moving studs, elevated platforms, crystal nodes and the wireframe sphere. The
  time and task stay on a readable forward plane. The bottom rim gets a compact
  version that stays within its existing curved window.
- The environment has **three floating 3-D globes**, five orbital cube satellites,
  a perspective energy floor, ceiling ring and floating tower traces. Pointer
  movement steers only this scene's camera within bounded angles.
- Tasks, panel headings, all six color groups and command-deck results have 3-D
  glyphs. Program cages are larger in the full visor, with deeper emblems and
  faster tumbling. The dock still launches saved app IDs through the same guard.
- Verified completion feedback now expands/turns through 3-D space. Source task
  labels, colors, checkboxes, counts, timer semantics and sync behavior are intact.

All geometry is local HTML/CSS 3-D with perspective, XYZ transforms and real
latitude/longitude rings. No new server, downloaded artwork, tracking, renderer
Node access or extra JavaScript animation loop is added. Outside the curved rim
and full-visor panels remains transparent. The normal app cache/profile location
and Windows/antivirus protections are unchanged.

Balanced reduces environmental clutter. Quiet hides spatial dressing and flattens
working panels. Animated HUD effects off and system Reduce Motion stop animation
and camera steering, retaining a static pose. Hidden scenes pause. Native Windows
legibility, 3-D compositing/clipping, hit testing and GPU cost still need actual
acceptance testing; synthetic tests are not a rendered screenshot or performance
measurement. This build does not install/reload the Obsidian bridge automatically.

## New: cinematic command interface

**Ctrl+K** or **⌘ Command** opens a searchable command deck for your tasks,
configured apps, local refresh, Settings and widget/rim controls. Search, use
Up/Down and Enter, or click a result. Escape closes the deck without hiding the
visor. A task selection only selects that task, never starts/completes it.
Completed tasks remain searchable, and a live tracker refresh preserves your query.
From the top rim, **⌘** opens the deck in the full visor instead of a tiny widget.
The shortcut is local to an active HUD window, not a Windows-wide hotkey.

Full-visor scenery adds a layered schematic grid, animated signal-routing paths,
fine comb marks, targeting brackets and rotating sector optics. Sector colors
and done/planned numbers come from the six real Markdown groups. Selecting a
task changes the active sector/accent. No CPU, network, biometric or other fake
live telemetry is introduced. The short assembly reveal is decoration only;
controls are available immediately without an intro/wait screen.

Focus now has visual **standby / engaged / paused / stale** phases. Starting a
confirmed timer adds a lock-on transition; while it runs, the surrounding routes
and ambient field quiet down and app cubes stop tumbling. Pause has a distinct
reticle treatment; a source error keeps existing stale-source/write guards.
Verified completion cues add expanding amber rings and twelve sparks. Merely
opening/selecting a task does not trigger a win or completion cue.

**Settings → Visual density** offers Cinematic, Balanced and Quiet. Quiet hides
decorative geometry and the ambient field while retaining app emblems, labels,
timers and controls. **Animated HUD effects off** and Windows Reduce Motion still
override animation, and hidden scenes pause. Effects are code-native, local and
below interactive content; there is no new server, permission or data upload.
Native compositing, keyboard/window focus and visual legibility need Windows QA.

## New: console-style holograms

The curved launcher now carries independent **six-face wireframe cubes** with
slow tumble, floating motion, orbital tracks, program-color glow and a readable
native app icon/monogram suspended in front. Hover or keyboard focus freezes the
cube's spin and lights its edges. Mouse movement adds bounded 3-D tilt; pressing
an app gives a small visual recoil. Labels and click targets do not orbit.

The full visor, focus widget and bottom-rim timer also have a rotating **wireframe
sphere** built from real 3-D latitude/longitude rings, a tilted axis and amber/cyan
orbital traces. Its center is masked back behind the time and task text. Geometry
is decorative, not live telemetry, and cannot intercept clicks.

These are local CSS 3-D scenes, not video, downloaded art, WebGL or another render
loop. Hidden HUD/rim scenes pause; **Animated HUD effects off** and Windows
**Reduce Motion** freeze geometry and suppress pointer tilt. The normal launcher,
focus controls and Obsidian bridge are unchanged. Native Windows compositing and
animation appearance/performance still need a real launch check.

## New: Obsidian-owned writes

Use **Color Sprint plugin 0.11.0+ in Windows Obsidian** with this HUD. Keep Obsidian
open. On your first task/focus action, approve **Pair HUD** there and compare its
fingerprint with HUD Settings. Thereafter the HUD signs unique requests; Obsidian
checks the exact current Markdown and applies each through its own queue.
Protected vaults never use the old direct tracker replacement path, including
when an older preference enabled edits. An old plugin leaves controls locked with
an update hint. No tracker migration is required.

HUD Settings show pending planning proposals and open Obsidian's Sync review.
These remain proposals until reviewed/applied; phone checkpoint records are not
automatically overlaid onto the current tracker. Ordinary local refresh still
does not force Relay/Obsidian Sync delivery. A closed/busy Obsidian, declined
pairing, stale request or timeout never triggers a direct-write fallback. Inspect
Obsidian and refresh before retrying a timed-out action.

The signing key stays in LocalAppData, pairing trust stays device-local in
Obsidian, and request/result snapshots stay private in `Color Sprint Sync/HUD`.
No automatic request replay, recovery pruning or whole-file phone restoration.
To revoke trust, run **Color Sprint: Revoke desktop HUD pairings on this device**
in Obsidian. See the plugin's HUD-BRIDGE.md for protocol and installation details.

A local-first visor for your existing Color Sprint Markdown: animated concentric focus rings, a live action queue, daily wins, itinerary, six color groups, reflections, real training-log totals, plus independent pinned focus and day widgets.

## Open the app

1. Quit the older preview through its tray menu first. Extract the entire new ZIP. Do not run it from inside the ZIP.
2. Open **Launch Color Sprint HUD.cmd** (or **Color Sprint HUD.exe** in a normal desktop environment).
3. The default is a **curved desktop rim**, not a fullscreen window. It briefly peeks on entry, then auto-hides. Hover near the primary screen's **top, bottom, or right edge** to reveal the status arc, crescent focus hub, or task dock. Move over the revealed panel to use it; leaving fades/slides it away after a one-second grace period. Select **Visor** for the full dashboard; use its gear to connect your Markdown tracker. Existing saved tracker paths are retained. A fresh profile uses a generic Documents/Obsidian/Sync/Color Sprint.md placeholder until you choose your file; no personal vault path is bundled.
4. It starts **read-only**. **Enable & start focus** reviews the connected file and asks for permission, then routes protected-vault actions through Windows Obsidian. Approve pairing there once. **Keep read-only** changes no task or timer. An old/missing plugin shows an update hint; forced `--read-only` stays locked. Direct backup/revision-checked writes remain only for standalone files outside Obsidian/protected folders.

No task data is bundled. Nothing needs to be imported or migrated. This reads the same standard Markdown schema as the Obsidian plugin; your existing Obsidian Sync provider remains responsible for iPhone/cloud sync. It does not connect to Google Calendar or create calendar events.

## Daily controls

- Select a task in the rim's right dock, then **Start focus** in the crescent hub. Or open the full visor, select a task on the left, then **Engage focus**. Dated reading targets take precedence over default minutes. Existing plugin routine/subtask queues are displayed and can be advanced.
- **Pause / Resume**, **Reset**, **Cancel**, and **Finish** use the plugin's shared timer logic. **Done → Next** completes the current queue step. **Finish** completes the current item and saves/ends the focus session. Cancel does not complete anything. A timer reaching zero never checks off work automatically.
- Completed tasks remain visible and count toward daily wins. Task wins and roadmap-step wins are separate; focus minutes are not inferred to be workouts.
- The right itinerary shows protected time, suggested blocks, confirmed calendar-block metadata, and overlaps from your Markdown. It is not a live calendar connection.
- **Focus widget / Day widget** toggle separate draggable, always-on-top windows. The full visor is always on top too. Its panel layout now uses curved sides, bowed rails, a circular focus lens and a glowing perimeter rather than square cards. Rim/visor surroundings remain fully transparent.
- Floating widgets/rim panels use quieter translucent glass and slightly dimmed contents while idle; **hover or keyboard focus** restores contrast. The full visor now defaults to **88% dark glass with undimmed panel text**, so bright Windows content behind it is less distracting. Tune **Settings → Visor glass** from 65–98%, with live preview and saved preference. The native window opacity is never lowered. Windows alpha compositing/legibility still need a real visual check.
- To keep the rim visible, turn off **Settings → Reveal rim at screen edges**, or uncheck **tray → Auto-hide rim at screen edges**. Hide-all remains available regardless of this setting. Automatic reminders briefly peek an active rim without taking keyboard focus. System Reduce Motion suppresses the visual transition.
- **Visor** opens the full dashboard; **Desktop rim**, **Escape**, or closing the visor returns to the rim. **F11** switches rim/visor when an app panel has keyboard focus. The rim's **×** hides all overlays; tray → **Show desktop rim** restores them without taking keyboard focus. To stop the app and reminders, use **tray → Quit Color Sprint HUD**.
- The rim uses three small windows, not a fullscreen transparent mouse catcher. The middle is unobstructed; only the edge panels themselves cover Windows content. Panels follow the primary display's work area and avoid the taskbar. Exclusive-fullscreen games may cover them; use borderless/windowed applications for ordinary overlays. Always-on-top behavior still needs native acceptance testing.
- **Today** follows the local day in the configured time zone, including midnight rollover. Looking at another date stays on that date.
- The voice-journal button opens your daily voice note in Obsidian. Recording itself stays in Obsidian; this app does not request microphone permission.

## Curved app launcher / taskbar companion

The bottom focus crescent and full visor now include a curved shortcut strip for **ChatGPT, Blender, Notepad++, FL Studio and REAPER**. Use its **Apps** gear (or the main Settings gear) to manage shortcuts: scan common installs, choose a trusted local `.exe` or normal `.lnk`, rename, add custom apps, remove, or reset a preset to auto-detection. The compact strip shows the first six configured apps; all configured apps are launchable from Settings (maximum twelve).

The app scans standard Program Files locations, known ChatGPT launcher paths and bounded Start Menu folders, not every drive or your personal notes. It prefers newer Blender/FL Studio versions and ignores reset/uninstall/project-launch shortcut names. Native icons are requested from Windows with monograms as fallback. Detection means a file exists, **not** that the app is running. ChatGPT opens its clearly labeled website fallback when its local launcher is not found; use Choose app to select the desktop version instead.

Launcher clicks are explicit and work independently of tracker read-only mode. Executable/shortcut targets stay in `%LOCALAPPDATA%\Color Sprint HUD\launchers.json`, not in Markdown. Config changes retain an original-file backup. Scripts, remote/UNC executables, generic command interpreters and app links with command arguments are rejected. If a shortcut has arguments, select its app executable directly. Launch errors stay visible, repeated rapid clicks are throttled, and a successful launch request returns the visor to the rim so it does not cover the opened application. These are launch requests, not running-process or foreground-window guarantees.

For a replacement-style **launchbar**, enable **Settings → Keep the app dock visible**. This pins only the bottom focus/app crescent while other rim panels can still auto-hide. Then use **Windows taskbar settings** in the launcher configuration to open the Windows page, and, if desired, turn on **Taskbar behaviors → Automatically hide the taskbar**. [Microsoft's instructions](https://support.microsoft.com/en-us/windows/experience/personalization/customize-the-taskbar-in-windows)

**This is not a full Explorer/taskbar replacement.** It does not provide Start, the system tray, volume/network controls, running-window previews or a shell task switcher. No Explorer termination, registry edits, automatic taskbar hiding, shell replacement registration or antivirus changes are performed. Windows Start/taskbar remain your fallback, and any Windows auto-hide choice is yours to reverse in Windows Settings. Hide-all and Quit never alter Windows' taskbar settings.

## Local refresh and Obsidian Sync

Use **↻** in the top rim, task dock, focus/day widgets, full visor, or **tray → Refresh tracker now**. It forces another disk read and reports whether the connected local tracker changed. The task-dock footer/full-visor sync area shows the local file's saved time and last successful check; hover for the full path and timestamps. Parse/access errors stay visibly stale and keep task edits locked.

Automatic refresh watches the tracker's parent folder (so atomic editor/cloud replacements are caught), with a **750 ms polling fallback**. Returning focus to the app, restoring it from the tray, and waking Windows also request a fresh read. Polling and manual loads are serialized. No task re-import or progress reset is involved.

**This is not a cloud-sync button.** The HUD reads your Windows Markdown file, not the iPhone's private Obsidian storage or every note in the library. If phone changes are missing, open Obsidian on both devices and check that your existing Obsidian Sync/provider has delivered them to this Windows vault. Confirm the connected file in Settings. Seeing a recent successful file check proves only that the local file was read; it does not prove cloud sync has finished. The app does not change your sync provider, access its credentials, or overwrite the tracker during refresh.

## Reminder behavior

Suggested-time reminders and focus-target cues run while the app is running, including when hidden to the tray. Sound is synthesized locally. Quiet hours default to 10 PM–7 AM in America/Chicago. No catch-up flood of old events is sent on launch. Use **Test sound + notification** to test your Windows configuration. The test deliberately bypasses quiet hours but still respects the sound switch.

Windows toast delivery is **not guaranteed in this portable preview**. It can require installed Start Menu/AUMID registration, and Windows Do Not Disturb may suppress it. In-app sound/cues and a requested tray-balloon fallback are implemented; native delivery still needs a real Windows launch check. There are no phone vibrations or system wake alarms. Sleeping or quitting the computer/app stops reminder processing.

Animated dashed circuit lines, amber signal traces, glowing arcs, rotating rings and the ambient neural field add the visor effects. SVG decorations cannot receive clicks and contain no synthetic progress/telemetry. **Settings → Animated HUD effects** disables motion; Windows Reduce Motion takes precedence. The hidden full visor and hidden rim traces pause animations. Startup is opt-in through **Settings → Start with Windows**; no startup registration is performed just by unpacking the ZIP.

## Data safety

Settings, Chromium cache, reminder deduplication and original-file backups now default to `%LOCALAPPDATA%\Color Sprint HUD` (with Windows AppData fallback). Chromium's session cache is under its `chromium` subfolder. Do not share that directory casually: backups can contain private task data. The ZIP is portable, but the normal profile is per-user and outside the extracted application folder. An explicit development `--data-dir` override remains supported for isolated tests.

Version 0.1 stored its profile beside the executable, which caused AVG's protected-Documents warning for the app-owned `ShaderCache` shown in chat. This version stops using that default location; it does **not** alter AVG rules, remove protected folders, delete old caches, or claim the unsigned executable is trusted. Old `user-data` is left untouched and is not automatically migrated. Your tasks remain in the same Markdown, but preferences restart read-only. Enabling Markdown writes may still produce a legitimate protected-folder prompt because your vault itself remains in Documents. Do not disable protection or grant broad exceptions to work around a warning.

Protected-vault writes are serialized by Obsidian, not replaced by the HUD. Requests contain an exact private base snapshot and an expiring signature; stale or duplicate requests do not overwrite new progress. Malformed/missing source shows a stale snapshot and disables writes. Standalone-file writes retain local backups and revision checks. Neither mode promises a distributed transaction with Relay or an offline phone; retain the primary-phone checkpoint workflow.

The application uses sandboxed isolated renderers, no remote UI, no renderer Node access, no network data upload, and a narrowly validated message bridge. No sandbox-disabling switches are used. This preview is unsigned, so Windows may display a publisher warning; do not disable Windows security protections.

## Validation status

Source builds and type-checks. Node/synthetic-DOM checks cover existing controls and the new bridge's signatures, pairing, stale/replayed requests, interrupted receipts, honest timeouts, protected-write refusal and proposal separation. The plugin's bundled synthetic integration tests cover its actual registered handler and own write queue. No native app was launched during these tests. See `VALIDATION.md`; these are not native visual tests or a measurement of GPU performance.

**Native acceptance remains incomplete.** Earlier managed-workspace launches encountered a sandbox ACL failure; no ACL change or sandbox bypass was attempted. Current browser-renderer checks with generic fixtures verify pointer tab activation, queue controls and layout, not native Windows notifications, transparency, scaling or actual iPhone background behavior. See VALIDATION.md for the remaining device checks.

## Source development

Use a supported Node runtime. From this folder: `npm install`, then install the pinned Electron runtime if your package manager did not (`node node_modules/electron/install.js`). Run `npm run build`, `npm test`, and `node ../node_modules/typescript/bin/tsc -p tsconfig.json`. The shared parser/model is in the parent Color Sprint source tree. `npm start` is a normal sandboxed native launch; `npm run package` builds the portable ZIP from an already built `dist` folder.

No test fixture, live vault content, developer browser harness, or local settings are included in the archive.
