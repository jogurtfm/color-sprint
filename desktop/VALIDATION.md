# Preview validation · 2026-10-19 America/Chicago

## 0.13.0 effort-profile pass · October 20

Plugin 0.14.0 / HUD 0.13.0: shared profiles cover five independent dimensions,
task/page/kind precedence, proposed versus confirmed ratings, daily ranks and
duplicate-award protection for moved occurrences. Repeated moves flag review,
not automatic increases. No new runtime network service or dependency.

Focused source security review: effort payload is bounded, keys and numeric
ratings are validated, notes render through textContent, existing signature
layouts are preserved, old bridge runtimes are gated, and stale profile saves
are rejected. Planning proposals cannot replace concurrent user ratings or
actual checkbox/log state. No live tracker migration or public journal content.
This is not a third-party security audit.

Browser harness verified a multidimensional treadmill rating saved to Markdown,
then an explicit demo completion changed the daily rank. Mobile-width controls
fit at 390 px without horizontal overflow. Native Electron appearance and
actual iPhone/Relay delivery still require device acceptance. Local prepared
builds and public BRAT assets are not proof a running device loaded the update.

## 0.12.0 obligations pass · October 20

- 124 plugin and 95 HUD checks pass, plus both strict TypeScript checks. Coverage
  includes repeated moves, returning to an earlier date, beyond-sprint dates,
  distinct taxes/letters and collisions, source-date retention, no invented wins,
  active-focus protection, target durations, event-ID review, stale planning,
  later source-date phone completions, signed destination fields and actual
  compiled-plugin bridge read-back/replay protection.
- Browser pointer checks exercised Obligation plan/move controls on desktop and
  the shared mobile surface at 390x844. Pick date retained the original date;
  page width was 375 within the 390 viewport. Preview screenshots use only
  synthetic data. They do not prove physical iPhone/Relay offline behavior.
- Source edits and preview tests do not move a live vault task. Local installation
  is a separate backed-up step and defers while PC Obsidian is running.
- Native acceptance of this particular build is reported separately. Earlier
  native 0.11.0 window/accessible UI verification is not acceptance of 0.12.0.

## Passed

- 0.11.0 feature build: **94 HUD tests and 112 Obsidian-plugin tests pass**, plus
  strict TypeScript in both projects. New coverage includes mixed queue persistence,
  deduplication, ordering, durations, live append, protected current step, roadmap
  expansion, explicit Finish/Skip/Cancel, automatic deadline catch-up without wins,
  bounded end-of-queue duration, runner ownership/handoff, planning protection,
  signed extended fields and Obsidian read-back with its runner ID. Desktop DOM
  checks exercise all workspace tabs, weekly plan/check actions, separate treadmill
  logging, goal evidence drafts, and timer/toolbar regressions.
- Browser renderer verification: generic localhost fixtures at 1280x720 desktop
  and 390x844 mobile. Pointer tab activation exposed a perspective hit-target issue;
  the utility/navigation plane is now flat. Queue panels have bounded scrolling,
  readable contrast and no horizontal page overflow. Screenshots are
  `docs/quick-queue-desktop.jpg` and `docs/quick-queue-mobile.jpg`. These are not
  physical iPhone or native Windows acceptance tests. No private tracker was used.
- The cinematic workspace rail adds flat native hit regions, sector headings,
  etched panels, visible active indicators and motion preferences. Real browser
  pointer checks exercised Queue/Pages navigation and a mixed two-step queue.
- Published release availability is recorded on GitHub; these checks do not install
  over a running plugin or establish native-device acceptance.

- 0.10.2 toolbar repair: **89 automated HUD tests pass**. The interaction CSS is
  now copied and linked last; controls are excluded from native drag regions and
  the toolbar's perspective transform is removed. New tests cover packaged style
  loading, toolbar command dispatch, settings open/close, stable command-deck rows,
  rim/windowed restore order and leave-fullscreen-before-minimize. Fullscreen/F11
  now toggles native fullscreen, close hides all to tray, and hidden widgets restore
  on demand. Normal background throttling is enabled. These are targeted fixes,
  not a measured claim of native click or performance success.
- Native 0.10.2 read-only demo fixture launched on Windows. Its accessibility tree
  showed all eight toolbar actions and version 0.10.2. Screenshot capture failed
  with `FrameArrived timed out: timed out waiting on channel`, then
  `window capture timed out: timed out waiting on channel`. Pointer input failed
  before a verified action with `coordinate input geometry is unavailable`.
  Native testing stopped; no accessibility-only tree is claimed as click success.
- Read-only shell diagnostics: Explorer briefly occupied about one logical core
  without the HUD running, later sampled idle. Cause remains unconfirmed. Windows
  theme settings, Explorer, security settings and the live vault were not modified.

- 0.10.1 corrective pass: **85 HUD tests and strict TypeScript pass.** User screenshot confirmed obstructing foreground globes and dense beveled frame traces; the user explicitly preferred the original curved surfaces. All GPU frame/arch/environment/glyph types were removed. Actual panels retain their CSS geometry and original controls; GPU scenes are limited to bounded instruments. All eight original styling files match the archived 0.9.0 files byte-for-byte (SHA-256); the new Three stylesheet contains no panel reshaping/flattening override. New tests cover a clear reactor aperture, solid lit segments without bevel-edge bands, latitude/longitude topology, five distinct app cores, fewer than 20 renderable objects per scene, protected overlapping UI exclusions, cached bounds and retired scenes. Full runtime pixel appearance, CPU/RAM and native mask/compositing acceptance remain unverified, not inferred from synthetic tests.

- 0.10: **81 HUD tests and strict TypeScript pass.** Three.js 0.180.0 is pinned and bundled locally, with its MIT license. Real Scene/PerspectiveCamera geometry tests cover every surface, finite buffers, progress draw ranges, independent gimbals, reduced-motion pose, shader terrain, beveled extrusions/resize disposal, completion particles, focus slowing, quiet hiding, unique resource cleanup and scissor bounds. Injected-renderer DOM tests cover transparent clears, one context across updates, unchanged click targets, explicit fallback on construction/render failure, hidden/static/quiet scheduling, context loss/recovery, pagehide cleanup, resolution caps, retired scenes, scroll clipping, static hover/resize redraw and edge-reveal suspension/resume. Existing tracker/bridge/timer/launcher DOM checks continue to run without GPU access. These checks do not render pixels or claim native GPU success. npm audit --omit=dev reports zero known advisories for the production dependency tree; this is a dependency database check, not a complete security certification.

- 0.9: **66 HUD tests** pass. Five new synthetic checks cover six-surface panel construction, preserved controls/Markdown, 22 task glyphs and six group glyphs, three world globes/five cube orbits/four reactor gimbals, decorative-only geometry, deduplication across refresh, bounded camera steering/reset, stationary working-text styles, panel hover state, quiet/reduced-motion/hidden-scene contracts and retained completion/cards/launch/deck behavior. The existing sphere check now intentionally expects five full-visor spheres (three environmental, one focus, one panel-heading glyph), and one in each compact focus surface. Builds and strict TypeScript pass. Native projection, text clarity, edge clipping, click-target geometry and GPU/animation performance remain unverified.

- 0.8: **61 HUD tests** pass. Seven new synthetic checks cover real six-color optics/counts and selected accents; searchable task selection without completion; keyboard navigation and explicit saved-app routing; escaped search content and empty results; retained completed tasks/query through refresh; focus standby/engaged/paused/stale phases; saved visual-density settings without Markdown changes; completion-only bursts, cleanup and reduced motion/quiet behavior; and rim command-deck routing to the main visor. Existing safety/bridge/timer/launcher tests and strict TypeScript checks pass. No native Windows launch or visual-rendering verification is claimed.

- 0.7: **54 HUD tests** pass, including four new synthetic geometry/interaction checks: six faces per program cube, stable accessible labels and independent phases, real latitude/longitude markup in visor/rim/focus widget, no duplicate geometry on state updates, bounded pointer tilt/reset, unchanged launch routing and tracker text, motion-off/Reduce Motion, and hidden-scene animation pause contracts. Strict TypeScript and source builds pass. These do not verify native 3-D rendering, clipping, transparency, GPU cost or animation appearance.

- 0.6: 102 parent-plugin tests pass using its newly bundled JavaScript and synthetic Obsidian hosts. New checks cover registered bridge dispatch, paired writes through the actual plugin queue, retained unrelated phone checkoffs, replay, explicit pairing cancellation, local revocation, and mobile refusal. All existing phone checkpoint/planning merge tests pass.
- HUD bridge tests exercise P-256 Node signing/WebCrypto verification, tampering, expiry, path/action restrictions, stale bases, duplicates, interrupted/uncertain receipts, closed-Obsidian timeouts, private-key persistence, unique requests, protected direct-write refusal, linked-folder refusal, and proposal separation. Synthetic DOM covers old-plugin update hints, disabled controls, escaped errors, pending-plan refresh and review routing. Total HUD checks: 50. Neither test suite touches the live vault.
- Native Windows URI delivery, installed Obsidian pairing, BRAT delivery and phone–PC Relay reconnect remain unverified. The local installed plugin was read as 0.10.0; development did not replace it. Plugin 0.11.0 installation/reload is required before HUD controls become available. Public publishing was attempted with certificate verification enabled but blocked by GitHub TLS certificate validation; no published-release claim is made.

- Electron main/preload and browser renderer build from the existing Color Sprint shared model.
- Strict TypeScript check (`tsc -p tsconfig.json`).
- 8 Node core tests: read-only default, backup on write, stale revision and concurrent-command rejection, malformed-source preservation, timer finish/cancel semantics, IANA-zone reminder windows, quiet hours, paused targets, settings constraints, and reminder identity after resetting a target.
- 7 Node/JSDOM interaction tests: the previous five plus curved rim focus controls, real completion in the edge queue, retained completed cards, stale-source disabling, and visor/settings/hide-all command routing.
- 4 profile/rim tests: old/new settings default to rim, three compact windows leave the center empty, work-area geometry including negative display origins and reduced heights, non-focusing show/reflow/hide lifecycle with fake windows, and Local AppData profile selection.
- 5 refresh/reveal tests: actual workspace directory-watch events after atomic file replacement, clean watcher shutdown, polling recovery of missing/invalid sources, forced-refresh load serialization, per-edge hover/latch/grace timing, taskbar/other-monitor handling and peek expiry. The existing DOM command test also checks manual refresh feedback and disabled-button recovery. Total: **24 tests**.
- Tests use generated workspace fixtures. No test task completion is written to the live Obsidian vault.
- 0.3.1 adds two synthetic-DOM/style-contract checks: only the crescent's curved SVG interior gets a 76–84% translucent fill; top/task panels have translucent fills while HTML/body and surrounding windows stay clear. These do not verify native compositing. Current total: **26 tests**.
- 0.4 adds 3 consent-gate tests and 3 DOM/style-contract tests for curved full-visor rails/circuits, hover plus keyboard focus, motion controls, and explicit enable/start versus forced lock. The previous read-only DOM test now verifies that task checkboxes remain disabled while Start offers confirmation, rather than asserting an unexplained disabled Start. Current total: **32 tests**.
- 0.5 adds 5 launcher unit tests and 3 synthetic-DOM tests: target/shortcut restrictions, config validation and backups, newest-app/bounded discovery without reset shortcuts, injected launch requests/errors, curved dock routing without tracker mutations, escaped labels, missing-app picker routing, opacity bounds and live slider behavior. Current total: **40 tests**.
- Read-only discovery with the actual search function found Blender 5.2, Notepad++, FL Studio 21 and REAPER executable paths. ChatGPT was not detected locally and is explicitly marked as a web fallback. This did not start any app, resolve/execute a Windows shortcut, alter taskbar settings or write the live vault.

## Blocked / not verified

- Native Electron launch stopped before application startup: Electron's `install_dir_access.cc` sandbox readability check rejected the managed workspace ACL. This raised the Windows breakpoint dialog in the conversation. No sandbox disabling or ACL modification was attempted.
- An earlier browser preview was stopped when authorization was declined. The current generic-fixture browser pass above supersedes that earlier browser-only limitation; JSDOM checks remain synthetic, not native verification.
- Fullscreen, tray persistence, pinned widget behavior, startup registration, system sound output, Windows notification delivery and sleep/resume still need a normal native Windows acceptance test.
- Portable archive is unsigned. Windows notifications can require installed shortcut/AUMID registration and can be suppressed by Windows. No guaranteed wake alarms or phone haptics.
- User screenshot showed AVG blocking the old 0.1 Documents-based ShaderCache. 0.2 selects standard Windows app data for new profiles. Antivirus policy is unchanged; no new native launch or claim that AVG accepts the executable is made.
- User's 0.2 screenshot showed a dark rectangular canvas around the crescent. 0.3 removes the HTML/body background and rim fills, enables native transparency for the full visor, and keeps that visor always on top. Native alpha compositing, focus/stacking and edge fade/slide appearance have not been visually verified here.
- User's 0.3 screenshot showed poor contrast over a bright app. 0.3.1 restores a translucent fill only inside the curved shapes, keeping surrounding alpha clear and text/timer layers fully opaque. Native legibility still needs a user screenshot check.
- 0.4 expands the curved glass treatment to the full visor, adds quiet idle content with hover/focus contrast and animated decorative circuits. Native hover compositing, animation appearance/performance and the Windows editing-confirmation dialog remain unverified in this restricted session.
- 0.5 increases full-visor glass to 88% by default and restores full panel-text opacity; the 65–98% slider is exercised synthetically. Native application launches, Windows file-icon rendering, native file-picker behavior, launch foreground activation and opening the taskbar-settings page remain manual acceptance items.

## Manual acceptance checklist

- [ ] Quit 0.1 first. App opens in three curved edge panels, leaving Windows usable in the middle. Visor opens fullscreen; Escape returns to rim; F11 switches modes when a panel is focused.
- [ ] Normal cache/settings are in Local AppData, not Documents; no protected-Documents ShaderCache operation. Check actual AVG behavior without disabling protection.
- [ ] Hide-all clears every overlay; tray restores rim without focus stealing. Recheck taskbar position, scaling and display changes.
- [ ] Hover at each top/bottom/right edge: only its panel reveals, remains reachable, and fades/slides away after leaving. Disable auto-hide in Settings/tray to leave the rim visible. Reduce Motion stops animation.
- [ ] Windows content shows through the rim's surrounding rectangle and crescent interior; full visor stays above ordinary windows. Check native scaling/compositing and exclusive-fullscreen limitations.
- [ ] Refresh buttons return success/no-change/error accurately; source path and file/check timestamps match the intended local tracker. Edit the local Markdown and confirm immediate watch or 750 ms fallback; verify cloud delivery separately in Obsidian.
- [ ] Source path is the intended tracker; initial read-only mode prevents accidental edits.
- [ ] A normal Markdown edit appears within about 1.5 seconds; invalid text shows stale warning.
- [ ] After opting into edits, test one low-stakes real task: pause/resume/reset/cancel; verify Cancel does not complete it.
- [ ] From read-only, choose **Enable & start focus**, inspect the connected path and choose Keep read-only first: no timer starts. Then explicitly enable updates and start a low-stakes real task. A forced read-only launch must remain locked.
- [ ] Verify the full visor's curved panels/perimeter and translucent idle/hover states over both bright and dark apps. Keyboard focus must brighten controls too. Motion off / Windows Reduce Motion must stop the decorative animation without hiding task controls.
- [ ] Verify stronger full-visor contrast at 88% over a white app, tune the slider, relaunch and confirm the saved value. Floating widget hover behavior should remain unchanged.
- [ ] Launch each chosen trusted app from dock and Settings. Verify actual launch, error messages for a missing target, and that the full visor returns to rim rather than obscuring the app. Check the ChatGPT WEB label or choose its local launcher.
- [ ] Add/rename/remove a custom app; verify settings backup and a fresh launch after restart. Confirm app actions do not check off tasks or require enabling Markdown writes.
- [ ] Pin just the bottom dock, hide-all, restore from tray and quit. Windows taskbar behavior must remain unchanged unless the user separately changes it in Windows Settings.
- [ ] Finish intentionally completed work; verify same completion in Obsidian, retained card, daily-win count and original backup.
- [ ] Open/move/close both widgets; hide main window and reopen via tray; quit ends background reminders.
- [ ] Test sound/notification and muted/quiet modes. Verify actual delivery; do not assume a requested toast was displayed.
- [ ] Test existing group/subtask queue and a dated reading target from the plugin.
- [ ] Check 1080p/1440p layout, Windows scaling, Reduce Motion and multi-monitor placement.
- [ ] If desired, explicitly enable startup, then verify after the next Windows login.

Security review: no remote renderer content, Node integration off, context isolation and Chromium sandbox on, restrictive CSP, denied renderer permission prompts, fixed trusted-frame IPC, escaped user strings, no runtime upload service. Revision checks and backups are not a distributed lock with Obsidian/cloud sync; avoid simultaneous cross-device edits. This is a source review, not a third-party security audit.
