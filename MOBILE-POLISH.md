# Pocket HUD · mobile presentation 0.21.1

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
HUD 0.21.1 packages the matching plugin; its data/bridge behavior is unchanged.

Validation: `node scripts/check-mobile-polish.mjs` uses fictional browser-local
demo data, tests 320–600px, light/dark, check retention, focus/cancel, navigation
continuity and both motion preferences. Screenshots are synthetic previews, not
proof of installation or native iPhone acceptance. No personal vault is read or
rewritten by this pass.
