# Pocket HUD · mobile presentation 0.22.0

A touch-first visual refinement of the existing Obsidian surface, not a new app
or data migration. All six source colors, semantic category accents, actual
checks, set logs, queue state and scoring rules retain their existing meanings.

- Softer layered surfaces, a compact rank/progress panel, tinted category edges,
  pill navigation, consistent type and a clear Focus action.
- Finish/effort lives alongside Focus and Queue. Full definitions, Day details,
  Edit and suggested-time tools are under **Details & planning**. Nothing is
  removed from the Markdown or automatically completed.
- Still-open obligations have a counted disclosure, so they remain visible
  without pushing today's cards out of the way. The Obligations tab is unchanged.
- Upper/Lower exercise creation is on **Workouts** or its body-category filter,
  rather than occupying space on every unrelated day view.
- Short, finite entry motion on view/date/filter changes; a small check pulse
  and color ring only when an already-rendered unchecked card becomes checked.
  Existing completion sound/particles and rank feedback remain configurable.
- The Effects motion preference and OS Reduce Motion both suppress these new
  animations. No endless pulsing, blur backdrop, remote font or downloaded media.
- Navigation rails retain horizontal position on refresh. Selecting a view keeps
  its active chip visible without scrollIntoView moving the whole page. Explicit
  view changes return the surface to the top; normal progress refreshes do not.
- Expandable card details remain open across same-view tracker refreshes. Phone
  controls have 44px hit targets, full text is readable on expansion, and no
  mobile definition is permanently clipped to an unreadable single line.

Most new chrome is scoped to <=600px. The full-card disclosure arrangement also
applies to PC Obsidian; the separate Windows HUD retains its cinematic layout.
HUD 0.22.0 packages the matching plugin; its data/bridge behavior is unchanged.

## Cinematic HUD skin

The mobile skin now borrows the Windows HUD's cyan instrument frames, etched
corner brackets, navy panels, amber rank accents, faint static routing grid and
monospaced status labels. Light mode gets a pale instrument-panel palette.
Source task stripes and semantic category colors retain their meanings.

Non-module focus uses a circular instrument dial whose arc shows the actual
remaining fraction of the current countdown. Paused time is preserved. Stopwatch
tasks have no fabricated target arc; cookbook/study workspaces keep the compact
timer. These are presentation values, not completion or scoring inputs.

**Effects → HUD styling** (also in plugin Appearance & feedback) switches back to
the clean 0.21.1 look. This saved plugin appearance preference is independent of
sound, haptics and motion, and does not touch the tracker or phone checkpoints.
The HUD skin defaults on mobile; its CSS is scoped to <=600px and does not
reskin the separate Electron app or desktop Obsidian. There are no WebGL canvases,
JavaScript animation loops, third-party media, network calls or extra libraries.
Brief focus frame lock-in respects both the Effects motion switch and system
Reduce Motion. Decorative layers never own pointer events or clip controls.

## Animated routing and CSS 3D instruments

0.22.0 adds slow dotted SVG routing along the daily panel and first three task
cards, a genuine perspective cube with six CSS-transformed faces, and three
tilted 3D gimbal rings around non-module focus timers. The dial and its readable
text still represent actual time; decorations do not contribute task progress.

**Effects → Ambient lines & 3D** independently disables this layer; it defaults
on with HUD styling. Motion off / OS Reduce Motion leave static geometry.
Document visibility pauses all loops; IntersectionObserver pauses offscreen
instruments. Paused focus freezes its core but does not alter real timer state.
At most five decorative roots appear in Today and two in Focus (seven in a
combined fixture). No per-task canvas, sensor permissions, networking or new
dependency. CSS animations handle rotation and stroke offsets, with no JS RAF.

Routing geometry uses pixel-sized notches and updates only after layout/size
changes through ResizeObserver, preventing a tall/open card from stretching a
border through its text. Neither observer runs a frame-by-frame DOM measure.
Observers and media/visibility listeners are disconnected on view disposal;
retired SVG/3D nodes are removed on refresh, disable and desktop-width resize.
The numerical readout is updated separately so timer ticks do not destroy the
geometry. All decorative nodes are aria-hidden and ignore pointer events.

Additional validation: scripts/check-mobile-visuals.mjs verifies bounded scenes,
real rotation, offscreen and visibility pause CSS, preference persistence without
tracker changes, pause/resume, reduced motion, resizing and working Cancel/check
controls. Native iPhone performance/battery and installation remain unverified
until tried on the device; browser checks are not a substitute for that.

## Whole-surface consistency pass

Queue controls, Week grid chrome, goal metadata, actual-set History and the
study/cook workspaces use the same mobile instrument palette. The Week table
still pans within its own container; form inputs use readable mobile sizing.
History retains dates rather than hiding them under compact task-card rules.
Reflection modal colors/edges are updated without moving its keyboard-safe
toolbar or changing draft/save behavior.

Study/cooking modules load asynchronously. A workspace-scoped MutationObserver
switches pending/unbound/module presentation so the large focus core never
survives over a loaded learner or recipe. It watches only structural state
changes and is disconnected with the other observers. Module reviews, timers,
recipe text and task completion behavior are unchanged.

scripts/check-mobile-workspaces.mjs covers all nine views at 320/390px, populated
queues, contained Week scrolling, Japanese and Cook focus, and reflection control
clearance in a shortened viewport. Native keyboard and battery QA still require
the phone.

Validation: `node scripts/check-mobile-polish.mjs` uses fictional browser-local
demo data, tests 320–600px, light/dark, check retention, focus/cancel, navigation
continuity and both motion preferences. Screenshots are synthetic previews, not
proof of installation or native iPhone acceptance. No personal vault is read or
rewritten by this pass.
