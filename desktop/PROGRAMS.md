# Programs and local Spotify controls

HUD 0.16.0. Obsidian plugin stays 0.16.1; this update is Windows-only.

The dock shows four app shortcuts plus Programs and settings. Programs opens a
searchable, keyboard-friendly menu in the full visor, including from the desktop
rim. Discord, HandBrake, OBS Studio and Spotify are included. Use Manage / add
apps to choose a local EXE or normal shortcut, rename it, remove it or add more.
Up to 24 apps are supported. Missing apps show Choose app, not fake launch success.

The old ChatGPT shortcut and browser fallback are removed. Version-1 launcher
settings are migrated once with an exact local backup; custom paths/names remain.
Apps removed after migration stay removed. Launchers are private PC settings,
never vault/sync/phone data. No software is installed or downloaded.

## Spotify

Programs contains title/artist, play, pause, previous, next and refresh. This uses
Windows 10/11 Global System Media Transport Controls, scoped only to Spotify's
documented desktop/Store app identifiers. It never falls back to the current
media session, which could belong to another player. Open Spotify and play a
track once if no session is visible. Unsupported commands are disabled.

A static bundled PowerShell script bridges the Windows Runtime API. Electron
accepts exactly five command names; it does not accept arbitrary code, paths,
arguments, credentials or URLs from the renderer. PowerShell runs without a
profile, with a timeout, bounded output and no shell. Execution policy is not
bypassed or changed. A policy/API failure leaves an honest unavailable state.
No Spotify OAuth, Premium API access, tokens, audio capture or telemetry is used.
The menu polls only while open and visible. No media data is saved to Markdown.

Live verification on this PC confirmed Windows media access and Spotify app
discovery, but found no active Spotify media session. Real play/pause/skip
acceptance still requires an active Spotify session and user testing.

## Discord

Discord launches normally. Personal notifications/messages are NOT read or
managed: the user explicitly deferred the personal inbox pending supported,
approved access. No bot, user token extraction, client modification, notification
capture or message sending is added. OBS and HandBrake are launchers, not remote
controllers.

## Rank and XP

The XP bar is progress from the current rank threshold to the next, not the
percentage of scheduled tasks completed. Rank, total daily XP, remaining XP and
bar fill all derive from dailyScore on the same latest parsed Markdown. The old
task progress bar remains separately labeled. No second XP ledger is stored.
Completions/rated finishes add score; intentional unchecks and lower ratings
reduce it. Date navigation uses that date. SSS fills the bar without inventing
another rank. Current effort-profile changes may recalculate earlier days, as
already documented; no new scoring rule is introduced.

Regression checks cover external synced snapshots, atomic file replacement,
rerating, undo, day changes, moved-occurrence de-duplication and max-rank clamping.
They verify local file-to-HUD updates, not Relay transport to or from the phone.

## References

- Windows media API: https://learn.microsoft.com/en-us/uwp/api/windows.media.control.globalsystemmediatransportcontrolssession
- Discord OAuth scopes: https://discord.com/developers/docs/topics/oauth2
