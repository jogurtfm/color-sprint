# Color Sprint update workflow

Mobile animated routing and CSS 3D instruments 0.22.0 use
scripts/publish-mobile-visuals-release.mjs. MOBILE-POLISH.md documents lifecycle,
animation limits and the independent ambient toggle. No planning data migration.

Mobile cinematic HUD skin 0.21.2 uses scripts/publish-mobile-hud-release.mjs.
It adds a reversible mobile appearance setting, etched frames and an actual
countdown dial, with no planning/progress migration. See MOBILE-POLISH.md.

Mobile Pocket HUD polish 0.21.1 uses scripts/publish-mobile-polish-release.mjs.
MOBILE-POLISH.md describes the presentation-only changes. Preserve pending local
activation when the user chooses to leave their PC apps running; publishing for
BRAT never proves an iPhone downloaded or reloaded it.

Exercise/category UI 0.21.0 uses scripts/publish-exercises-release.mjs with exact verified plugin/HUD ZIPs. EXERCISES.md documents editable targets, actual sets and semantic category accents. No personal tracker migration or performance logging is part of deployment.

Data-only daily planning does not require a code release or app restart. With explicit owner authorization and a configured Windows policy, use the signed route in TRUSTED-PLANNING.md after creating a fresh proposal. Keep all actual progress even in mornings; never replace a stale whole tracker. Code updates still follow the three-target verification and safe-activation workflow below.

This chat is the working brief for requested changes. The repository, commit IDs,
tests and release read-backs record what was actually implemented and shipped.
The conversation is not automatically uploaded or mirrored to GitHub.

- Canonical repository: https://github.com/jogurtfm/color-sprint
- Branch: `main`
- Local checkout: this directory (`outputs/color-sprint`).
- Obsidian plugin: root `src/`, `manifest.json`, `main.js`, `styles.css`.
- Windows HUD: `desktop/`; it has a separate version and release package.
- User vault and credentials are private and never release assets.

## Working GitHub connection

Verified October 19, 2026: saved account `jogurtfm` has authenticated push permission
for this repository. Use Windows Git and its existing Credential Manager, with
Windows certificate trust (`schannel`). The checkout's local Git setting now uses
that backend; no global Git settings, stored credentials or system PATH were changed.

Run from PowerShell:

```powershell
.\scripts\github.ps1
```

This checks account identity and repository permission, performs a dry-run push,
and compares local/remote HEAD. It does not commit, upload a release or change a
remote branch. Credentials remain in memory and are not printed. It selects the
bundled Node 24 runtime before the older system Node 20; alternatively pass
`-NodePath` with a trusted Node 24+ executable. HTTPS verification stays enabled.

For the existing version-scoped plugin release helper:

```powershell
.\scripts\github.ps1 -Action PluginPreflight
# Only for an explicitly requested, reviewed release:
.\scripts\github.ps1 -Action PublishPlugin
```

That legacy publisher retains its 0.11.0 guard. The explicitly approved two-build
workflow is `scripts/publish-queue-release.mjs` (Node 24+ with `--use-system-ca`).
It requires a reviewed commit and validated `--plugin-zip` / `--hud-zip` paths;
without `--publish` it is read-only. It never commits automatically. For this Windows-only update pass `--hud-only --hud-zip EXPLICIT_ZIP`.
The Windows tag is `hud-0.16.0`; the existing BRAT release remains `0.16.1`. The desktop release is explicitly
not marked Latest, so it cannot replace BRAT's three plugin assets.

## Updates from this chat

Progress scoring 0.19.0 uses scripts/publish-progress-release.mjs with exact plugin
and HUD archives. Read PROGRESS.md before reviewing new table proposals. Existing
trackers are not automatically migrated; all writing clients need 0.19.0+ first.
The update keeps the previous runtime/profile and never force-closes an app.

The user's standing release targets are PC Obsidian, PC Electron HUD, and mobile
Obsidian through BRAT. For each requested new version, deploy all three, not just
GitHub. See AGENTS.md. Private local targets are stored in
`%LOCALAPPDATA%/Color Sprint HUD/deploy-targets.json`.

Configure once with trusted Node 24+:

```powershell
node scripts/deploy-local.mjs --configure --vault 'ABSOLUTE_VAULT_PATH'
# After tests/package validation, with PC Obsidian closed:
node scripts/deploy-local.mjs --install --hud-release 'EXTRACTED_VALIDATED_HUD_FOLDER'
```

This replaces only main.js, styles.css and manifest.json, with verified backups
under the existing local HUD profile. It does not change data.json, notes, logs,
checkboxes, sync settings, permissions or security protections. A running PC
Obsidian defers replacement. Same-version drift fails for investigation; newer
installed plugins are never downgraded. HUD builds are installed side by side
under LocalAppData/Programs/Color Sprint HUD, preserving the old build/profile;
the stable launcher points to the verified new build. Restart is a separate safe
step, not a force-kill. Local read-back results are in last-deployment.json.
Publish/verify the plugin assets for BRAT separately and keep that release Latest.
Phone download/reload still depends on BRAT and cannot be inferred from publishing.
The approved publisher invokes this local step automatically after public asset
verification whenever private local targets are configured. A running Obsidian
produces an explicit pending status. The stable HUD launcher selects the prepared
build; safely restarting a running HUD remains a separate, explicit step.

Deployment-only checks (Node 24+): `node --test tests/local-deploy.test.mjs`.

1. Confirm the current checkout, remote changes and outstanding local edits.
2. Implement the requested scope; preserve existing user changes and actual vault progress.
3. Run the relevant plugin/HUD checks. Native UI checks are separate from synthetic tests.
4. Publish only when requested, stage only reviewed files, and keep private notes,
   profiles, caches, recordings and unrelated files out of the public repository.
5. Read back the remote commit/release and verify asset hashes before saying shipped.

Previous baseline: plugin 0.11.0 at `f59aeb2`; local HUD 0.10.2.
Cookbook integration 0.18.0 adds the shared Cook workspace and readable recipe
notes with independent, device-local cooking timers. Use the version-guarded
scripts/publish-cookbook-release.mjs with exact verified plugin/HUD archives.
Keep the plugin release Latest for BRAT. Existing vault recipe/binding changes
are explicit additions, not whole-tracker planning rewrites. See MODULES.md.
Current study integration: plugin and HUD 0.17.0 connect the shared learner to
real Japanese focus. Use scripts/publish-study-release.mjs with reviewed exact
--plugin-zip and --hud-zip archives. Keep the plugin release Latest for BRAT;
the hud-prefixed release must not replace it. See MODULES.md for storage limits.

Previous bridge correction: plugin 0.16.2 fixes Windows URI routing after Obsidian
consumes the vault parameter. Existing HUD 0.16.0 is compatible and unchanged;
no HUD reinstall or restart is required. Use the version-guarded
scripts/publish-bridge-fix.mjs for this plugin-only correction, not the previous
HUD-only publisher. Verify PC plugin hashes and BRAT Latest independently.

Previous release scope: HUD 0.16.0 only; plugin 0.16.1. Programs, local Spotify controls and a shared-source XP bar retain rated finishes and personal effort
profiles and daily arcade ranks, retaining obligations and date moves. Public release read-back, not this document, establishes
shipping. Publishing does not install over a running app or modify a live vault.

GitHub plugin discovery in this chat returned an availability error during this
check. That is separate from the verified local Git/Credential Manager route and
does not establish an account-authentication failure.
