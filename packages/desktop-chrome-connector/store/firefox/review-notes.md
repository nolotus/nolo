# AMO review notes — Nolo Browser Connector (Firefox)

Submitters: attach this text in the "Notes for Reviewers" field, or keep it for the inevitable
questions. Everything below describes the shipped `dist/nolo-browser-connector-firefox-*.zip`.

## What this add-on does

It connects Firefox to the Nolo Desktop application running on the same machine, via native
messaging over a local loopback RPC. It has no standalone UI beyond a status popup — its only
purpose is to let a locally-running desktop agent read and operate browser tabs the user asks about.

## Why the permissions look wide

- `host_permissions: http://*/*, https://*/*, <all_urls>` — the agent must read the page the
  user points it at; the target URL is not known at install time. `<all_urls>` is additionally
  required for `tabs.captureVisibleTab`: Firefox does not accept http/https-only host grants for
  it — without `<all_urls>` the call fails with "Missing activeTab permission", and `activeTab`
  can never cover this flow because the screenshot is taken on behalf of the desktop app, not a
  fresh toolbar-button gesture. Verified on Firefox 156 during the BiDi E2E run. Injection is
  still guarded: the extension refuses protected pages (`about:`, `view-source:`, browser UI)
  before any `scripting.executeScript` call.
- `nativeMessaging` — the bridge to Nolo Desktop. The host manifest (`com.nolo.chrome_connector`)
  is written by the desktop installer into `~/.mozilla/native-messaging-hosts` (Linux) or
  `~/Library/Application Support/Mozilla/NativeMessagingHosts` (macOS) with
  `allowed_extensions: ["nolo-browser-connector@nolo.chat"]`. The host binary is part of Nolo
  Desktop, not shipped in this zip.
- `scripting`, `tabs`, `activeTab`, `storage` — the interaction surface (read/click/type/scroll)
  plus opened-tab bookkeeping in `storage.session`.
- `debugger` is **absent** in the Firefox build: Firefox does not implement `chrome.debugger`
  (Mozilla bug 1316741), and the packaged manifest drops the permission. Every `chrome.debugger.*`
  call site in `background.js` is behind a runtime `HAS_DEBUGGER` check; unreachable code paths are
  dormant, not executable. (`web-ext lint` reports them as `UNSUPPORTED_API` *warnings*, zero
  errors; see the lint output in the submission package notes.)

## Capabilities deliberately disabled on Firefox

`set_files`, `mouse_move`, `mouse_click`, `douyin_*` coordinate flows, `read_console`,
`read_network` return `UNSUPPORTED_ON_FIREFOX` verdicts. `screenshot` uses
`tabs.captureVisibleTab` and only ever captures the currently visible tab. This is by design —
see `docs/plans/2026-09-28-firefox-amo-port.md` in the source tree.

## Privacy / data collection

`browser_specific_settings.gecko.data_collection_permissions.required = ["none"]` — the add-on
itself transmits nothing off-device. Page content flows only to the user's own Nolo Desktop app
on 127.0.0.1.

## Reproducing the build

```bash
cd packages/desktop-chrome-connector
node scripts/buildStorePackage.mjs --browser firefox
bunx web-ext lint --source-dir <unzipped output>   # 0 errors, warnings are the dormant CDP paths
```

The source is not minified; no source bundle is required.
