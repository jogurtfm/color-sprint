# Reflection keyboard fix

Plugin 0.14.2 / HUD 0.13.2 companion bundle.

- Save reflection and Hide keyboard are first in a sticky control bar, followed by Dictate / type and Open journal.
- The reflection modal follows the visible viewport's height and vertical offset as the keyboard opens, closes, or pans the screen. The behavior is scoped to this modal, not the entire app. Native mobile layouts also remain bounded in landscape.
- Instructions are shorter, the text area scales down in tight space, and the content scrolls beneath the toolbar. Errors appear near the controls rather than below an obscured input. Existing Markdown/dictation behavior is unchanged.
- Hide keyboard retains the draft and moves focus off the text field. It does not save a journal, mark a task done, upload a recording, or programmatically control Apple Dictation. Finish dictation/composition before saving.
- Viewport listeners are removed on close and plugin unload. Without VisualViewport, window resize is used. No extra permission, dependency, network service, or sync write was added.

Regression checks cover keyboard shrink/restore/pan, window-resize fallback, listener cleanup, toolbar order, draft preservation and explicit Save through the compiled plugin. Reduced-height browser checks are not a physical iPhone or WKWebView acceptance test.

On iPhone, update Color Sprint through BRAT, reload the plugin, open a reflection, type/dictate, check that Save and Hide keyboard stay reachable, hide and reopen the keyboard, rotate, then explicitly save. Confirm the exact words in the journal. Existing task progress is unrelated and must remain unchanged.
