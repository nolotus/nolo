# Nolo Desktop Chrome Connector

Open-source Chrome connector used by Nolo Desktop local agents. This is repository source code, not a Codex plugin and not an MCP server.

## Install For Local Development

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select `packages/desktop-chrome-connector/extension`.
5. Install the native messaging manifest:

```bash
node packages/desktop-chrome-connector/scripts/installNativeHostManifest.mjs
```

For a local manual install, it is fine to copy the `extension` folder to a visible path such as `~/Desktop/NoloChromeExtension` and select that copied folder. The selected folder must contain `manifest.json` at its top level.

The extension manifest includes a fixed public key, so the unpacked extension id is stable:

```text
ahpdoopadkamnglhlacfjdfnonpjdplg
```

The installer writes Chrome's native messaging manifest under:

```text
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.nolo.chrome_connector.json
```

That manifest points to a generated wrapper under:

```text
~/Library/Application Support/Nolo/ChromeConnector/nolo-chrome-native-host
```

The wrapper uses an absolute Node executable path before launching the repository's open-source native host script. This avoids relying on Chrome's stripped-down native host `PATH`.

## Runtime Link

```text
Nolo agent runtime
-> desktop local tool executor
-> packages/desktop-chrome-connector/chromeConnector.ts
-> native-host/nolo-chrome-native-host.mjs
-> extension/background.js
-> Chrome tabs
```

The native host listens on `127.0.0.1:38947` while Chrome keeps it running through native messaging.

When Chrome reloads or stops the extension service worker, the native host exits as soon as the native messaging stdin pipe closes. This prevents stale native host processes from keeping `127.0.0.1:38947` occupied after extension reloads.

## Desktop Diagnostics

Nolo Desktop exposes connector diagnostics through the Local provider runtime settings page.
The backing desktop-only endpoints are:

```text
GET  /api/desktop/chrome-connector/status
POST /api/desktop/chrome-connector/install-native-host
POST /api/desktop/chrome-connector/smoke-test
```

The smoke test opens a local temporary page and verifies read, click, type, scroll, screenshot, console, and network capture without touching real account state.

## Compact Observation Protocol (protocolVersion 2)

`chrome_read_page` returns a budgeted observation instead of the whole page:

- Hard budgets: `text` ≤ 6000 chars, `elements` ≤ 35, and the whole serialized payload ≤ 10 KB (the connector trims elements first, then text, until the payload fits).
- `elements` lists visible interactive elements as `{ref, tag, name, type?, value?, disabled?, readonly?}`. A ref is a revision-scoped string `<pageRevision>-e<N>` derived from the connector's deterministic candidate walk.
- `pageRevision` is a short hash of the page signature (url + candidate key list). The same element index in a new revision gets a new ref, so a stale ref can never silently hit the new element: a ref is only valid for the revision it was issued with, and a `chrome_read_page` snapshot exposes only its own refs (older ones are never merged forward). A new read, a URL/document change, or an observed page signature change makes older refs report `STALE_PAGE_REVISION`. Refs also expire after two minutes (`ELEMENT_REF_STALE`), and nothing is persisted across connector restarts.
- `detail: "compact"` (default) never includes HTML. `detail: "full"` is an explicit debug switch: it keeps the same text/element caps and adds at most 6 KB of capped HTML, which is trimmed before text and elements whenever the 10 KB payload cap is at risk.

`chrome_click` and `chrome_type` accept either `elementRef` (preferred, from the last `chrome_read_page`) or the legacy CSS `selector`; there is no parallel action tool. Disabled targets (and read-only targets for typing) are rejected before any page-side effect, and stale refs fail closed with `STALE_PAGE_REVISION`, `ELEMENT_REF_STALE`, `ELEMENT_REF_UNKNOWN`, `ELEMENT_TARGET_REQUIRED`, `ELEMENT_DISABLED`, or `ELEMENT_READONLY` instead of acting on a page that moved on.

Every action returns one flat verdict envelope `{ok, verified, effect, action, ref|selector, signal, message?, pageRevision?}`. `ok` only says the connector completed the request — **`effect`/`verified` is the authority**:

- `effect: "verified"` (`verified: true`) — a cheap local signal proved the effect (`navigation`, `dom_text_changed`, `element_removed`, `value_matches`, `scroll_changed`).
- `effect: "uncertain"` (`verified: false`) — the action ran but no local signal proves it (`no_observable_effect`, `value_mismatch`, `value_not_readable`, `sensitive_action_not_locally_verifiable`, `page_context_destroyed`). Re-read the page; side-effecting actions are never replayed automatically.
- `effect: "failed"` — the connector refused or could not complete the action (`STALE_PAGE_REVISION`, `ELEMENT_NOT_FOUND`, `ELEMENT_DISABLED`, `ELEMENT_READONLY`, `ELEMENT_REMOVED`).

`chrome_read_console` merges identical messages into one entry with a `count`, truncates long text, and returns at most 20 entries by default (hard cap 60). `chrome_read_network` additionally filters low-value static assets (images, media, fonts, CSS, `data:`/`blob:` URLs) unless `includeAssets: true` is passed. Both return `total` / `deduped` / `dropped` counters (network adds `filtered`). Raw buffers stay in the service worker (200 console entries, 300 network entries) and never reach the model.

`connector_info` reports `protocolVersion` so diagnostics can tell an older unpacked extension apart. Deterministic helpers live in `extension/compactObservation.js`, which keeps the service worker thin and makes budgets, refs, verification, and debug shaping unit-testable; `extension/background.js` only holds the page/DOM glue.

## Safety Boundary

- The connector does not read Chrome cookies, passwords, profile databases, or session stores. Compact observations may include bounded values from visible non-password form controls so agents can verify typing and current form state; password values are never returned.
- Page reads and actions go through content scripts and the Chrome debugger API.
- External side-effect actions still need action-time confirmation in the agent runtime policy.
- CAPTCHA, paywall, browser safety interstitial, and final password-change submission bypasses are out of scope.
