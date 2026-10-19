# Desktop HUD bridge · plugin 0.11.0 / HUD 0.6.0

The tracker is still **Markdown format version 1**. No migration, replacement
tracker or second task database is introduced. The rules in [SYNC.md](SYNC.md)
remain authoritative: plans are separate proposals; phone checkpoints are recovery
records, not an automatically applied progress overlay.

## Use

1. Update Color Sprint in **Windows Obsidian** to 0.11.0+, then reload the plugin.
   BRAT needs a published release with main.js, manifest.json and styles.css;
   a local source/version change alone does not update BRAT.
2. Quit the older HUD from its tray and open HUD 0.6.0. Keep Windows Obsidian open.
3. Start focus or enable controls in HUD Settings. Review the connected path.
   On the first request, approve **Pair HUD** in Obsidian only if you just initiated
   it. Compare the fingerprint with HUD Settings. Cancel keeps tasks unchanged.
4. Task checkboxes and start/pause/resume/reset/cancel/Finish/queue-next now go
   through the plugin's serialized `change` / `Vault.process` path. Finish checks
   explicit work; a timer never implies workout completion.

The HUD detects an enclosing `.obsidian` vault or sibling `Color Sprint Sync`
folder and refuses its old direct tracker replacement path, even if an old
preference enabled editing. An old/missing plugin shows an update-needed state.
Isolated standalone Markdown fixtures retain opt-in, revision-checked direct
edits; that is not a supported concurrent-device workflow.

**HUD Settings → Review planning proposals** opens Obsidian's Sync review.
The HUD counts locally present, valid, unprocessed proposals without applying
them, counting their tasks as active, or restoring checkpoints. It never writes
Phone/Applied/Recovery/Unconfirmed. Receipt existence counts a proposal as
processed; Obsidian's full review still detects modified proposals/receipts and
semantic disagreements. Local freshness does not confirm cloud delivery.

## Protocol and trust

Each user action creates a unique ordinary Markdown note:

`<tracker parent>/Color Sprint Sync/HUD/Requests/hud-<UUID>.md`

Its version-1 JSON has `id`, vault-relative `tracker`, millisecond `created` and
`expires`, random `client`, SPKI/base64 P-256 `publicKey`, exact `base` Markdown,
allowlisted `action`, and base64 ECDSA SHA-256 `signature` (64-byte IEEE P1363).
`signedHudBody` in src/hud-protocol.ts defines the canonical field order.
The private PKCS8 key stays in `%LOCALAPPDATA%\Color Sprint HUD\hud-client.json`,
never the vault/public release. Do not share that private profile or backups.

Only an explicit `obsidian://color-sprint-hud?vault=…&tracker=…&id=…` dispatch
consumes a request. Sync delivery does **not** execute it. Mobile refuses action
dispatch. Pairings are device-local public-key trust scoped to client and tracker,
not synchronized preferences. **Color Sprint: Revoke desktop HUD pairings on this
device** removes trust and requires fresh approval.

The plugin checks signature, identity, schema, expiry (maximum two minutes), path,
action and exact current Markdown before mutation. Changed bases fail closed.
Only known task/timer actions exist; there is no arbitrary Markdown replacement,
planning application, checkpoint restoration, shell command or script execution.
Intentional unchecks remain explicit, not discarded by a checked-always-wins rule.

A unique `HUD/Results/<request ID>.md` processing receipt precedes approval and
mutation, then becomes `done`, `rejected` or `unconfirmed`. Duplicate dispatch
does not repeat writes. An interrupted `processing` receipt is never automatically
replayed. The HUD waits up to 90 seconds, makes no optimistic completion claim,
and never falls back to direct writes. If it times out, inspect Obsidian and
refresh before retrying: an action may have succeeded. Expired requests cannot
execute later. Records/exact base snapshots are retained for recovery, contain
private data and are not pruned or published.

There is no server, background request listener, new sync provider or Calendar
dependency. Signing uses the standard [Node crypto API](https://nodejs.org/api/crypto.html);
verification uses WebCrypto and dispatch uses Obsidian's registered URI API.
This removes the second local tracker writer, but does **not** make Relay or
offline phone edits a distributed transaction. Keep primary-phone checkpoints
and normal review. Native Windows URI dispatch, actual Obsidian pairing, and
phone–PC Relay reconnect still require manual acceptance; tests use synthetic hosts.

## Manual installation when publishing is blocked

Extract the plugin ZIP. Close Obsidian or disable Color Sprint, then replace only
`main.js`, `manifest.json` and `styles.css` in the existing vault's
`.obsidian/plugins/color-sprint` folder. Preserve `data.json`, other settings and
all notes. Re-enable/reload, then launch the new HUD. Development builds/tests
do not write the live vault.
