# Color Sprint release targets

The user has requested that new Color Sprint versions update all three targets:

1. PC Obsidian: the `color-sprint` plugin in the configured local vault.
2. PC Electron: the local Windows HUD installation.
3. Mobile Obsidian: publish the plugin release for BRAT (`jogurtfm/color-sprint`).

This is the standard release workflow when shipping a requested new version, not
permission to publish unfinished edits. Do not stop at a ZIP or GitHub upload and
call all targets updated. Report each target independently with read-back evidence.

- Read UPDATE-WORKFLOW.md. Private target paths are in LocalAppData deployment
  configuration, not in the public repository or release assets.
- Use scripts/deploy-local.mjs with Node 24+ for local deployments. Close PC
  Obsidian before replacing its three runtime files; preserve data.json, other
  plugin files, notes, checkboxes, logs and sync metadata. Keep verified backups.
- Deploy HUD builds side by side under the configured Programs directory. Keep
  prior versions and the existing LocalAppData profile. Never force-kill a running
  HUD or discard unsaved data; obtain a safe restart or report restart pending.
- Do not broaden ACLs or weaken antivirus, sandbox, certificate or other security
  protections to get an update through. If an actual access denial occurs, report
  the exact scoped target and ask for the least-privilege remedy.
- Verify public plugin assets and keep the Obsidian release as GitHub Latest for
  BRAT. HUD releases use hud-prefixed tags and must not replace BRAT Latest.
- BRAT availability is not proof the phone downloaded/reloaded the plugin. A
  running process is not visual/native acceptance. Keep these claims distinct.
