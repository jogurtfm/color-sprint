# Color Sprint Windows companion theme

Use Windows' own colors first. No shell replacements, patchers, registry scripts,
startup changes or extra animated overlay are required. Nothing below was applied
automatically.

## Suggested palette

| Role | Color |
| --- | --- |
| HUD cyan / custom Windows accent | `#40DCEC` |
| Deep navy desktop background | `#07131E` |
| Secondary slate | `#102635` |
| Small warm highlight, within HUD | `#EABB72` |

In **Settings > Personalization > Colors**:

1. Choose **Dark**, or **Custom** with both Windows and app modes set to Dark.
2. Choose a custom accent, cyan `#40DCEC`.
3. Try accent color on title bars/window borders. Taskbar/Start accent is optional;
   leave it off if the bright cyan makes the taskbar distracting.
4. Try **Transparency effects off** while investigating lag. This affects Windows
   surfaces; it does not remove the HUD's own transparent window or curved glass.

Keep the present wallpaper if you prefer it; a plain navy background is an optional
quieter match, not a requirement. Default Windows controls cannot reproduce the
HUD's custom curved sci-fi panels exactly.

Microsoft's supported color controls:
https://support.microsoft.com/en-us/windows/experience/personalization/personalize-your-colors-in-windows

## Taskbar observations, October 19, 2026

- Windows 10 build 19045. Existing Windows mode was dark, app mode light,
  transparency on. No personalization values were changed.
- Explorer briefly used about one logical CPU core while the HUD was not running.
  A later 3-second sample was idle, as were the shell/search performance counters.
  This is evidence of a transient Explorer spike, not a confirmed root cause.
- An Explorer "1 Interrupted Action" dialog appeared in the initial window list
  and disappeared before inspection. Its operation and relation to lag are unknown.
- Roughly 10 GB memory was free in the initial sample. Accumulated HUD CPU time and
  one large renderer working set are not proof of current CPU/GPU contention.
- No Explorer restart, file-operation cancellation, driver change, shell-extension
  change, security change or Windows theme change was performed.

Next useful check: when lag recurs, compare Explorer and HUD CPU/GPU over the same
short interval. Try HUD **Settings > Visual density > Balanced**, or Quiet as a
temporary comparison. If the taskbar still stalls with the HUD quit and no active
copy/file dialog, an Explorer restart is a separate user-approved diagnostic step,
not a proven fix. Save work and finish file transfers before considering it.

## Acceptance checks for this release

- [ ] Command opens the deck; selecting a result works while the clock updates.
- [ ] Focus and Day each open, close, and restore after hide-to-tray.
- [ ] Gear opens settings; fullscreen toggles without opening the desktop rim.
- [ ] Minimize works from fullscreen; taskbar restores the window.
- [ ] Close hides every overlay; tray double-click restores the saved mode.
- [ ] Dragging the brand moves the window; clicking the toolbar never drags it.

Windows capture failed in the automated native check, so these native pointer
checks are not marked complete merely because synthetic tests pass.
