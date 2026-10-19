# Color Sprint update workflow

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
without `--publish` it is read-only. It never commits automatically. Tags are
`0.12.0` for BRAT and `hud-0.11.0` for Windows. The desktop release is explicitly
not marked Latest, so it cannot replace BRAT's three plugin assets.

## Updates from this chat

1. Confirm the current checkout, remote changes and outstanding local edits.
2. Implement the requested scope; preserve existing user changes and actual vault progress.
3. Run the relevant plugin/HUD checks. Native UI checks are separate from synthetic tests.
4. Publish only when requested, stage only reviewed files, and keep private notes,
   profiles, caches, recordings and unrelated files out of the public repository.
5. Read back the remote commit/release and verify asset hashes before saying shipped.

Previous baseline: plugin 0.11.0 at `f59aeb2`; local HUD 0.10.2.
Approved release scope: plugin 0.12.0 and HUD 0.11.0 with Quick Queue and cinematic
desktop workspace tabs. Public release read-back, not this document, establishes
shipping. Publishing does not install over a running app or modify a live vault.

GitHub plugin discovery in this chat returned an availability error during this
check. That is separate from the verified local Git/Credential Manager route and
does not establish an account-authentication failure.
