# Checklist-first subtasks · 0.23.0

Task cards on mobile and the Windows HUD share one checklist. Steps are open by
default, completed steps remain visible, and the next unfinished step is marked.
Collapse leaves the next action visible; Show/Hide completed is optional. The
progress count and bar describe the applicable checklist, not parent completion.

Tap a checkbox to record actual progress without starting or navigating into a
timer. Each unfinished step has its own optional timer button. A zero-minute
target opens a stopwatch; a positive target counts down. Starting a step selects
that exact focus cursor, never replaces an active timer, and never checks it off
when time expires. Finishing or canceling on mobile returns to its checklist.
The parent still has its own explicit completion rules and scoring thresholds.

The row's ⋯ disclosure contains done-means, editing and existing measured-input
tools. Add step uses an inline form with an optional minute target. Advanced
context matches the day's details; `-` applies on any day. Suggested roadmaps
are added only by an explicit action. No existing tracker is migrated or seeded
automatically. The legacy Workout wrapper remains readable, without recreating it.

The storage remains the existing human-readable `## Subtasks` Markdown checkbox
list. Editing only changes planning fields and preserves the latest completion
and completion date. Conflicting planning edits are rejected. Phone checks can
arrive while an editor is open; text drafts, disclosure state, keyboard focus and
HUD list scroll survive a repaint. Drafts are local to the open view, not durable
notes; saving is required before closing an app. Failed saves announce the error
and retain the draft; failed checkoffs roll back. All decoration is presentation
only, with keyboard controls and reduced-motion support.

HUD individual-step starts and inline edits require the PC Obsidian plugin
0.23.0+. The native process gate rejects those commands on older plugins;
ordinary checkoffs retain the existing supported bridge path.

Validation: plugin tests, HUD tests and `scripts/check-subtasks.mjs`. The browser
check runs isolated synthetic previews at phone widths 390/320 and HUD Today /
Pages, exercising check, save, selected timer, cancel, focus and scroll retention.
It never connects to the live vault, iPhone, or a native app profile.
