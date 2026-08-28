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

## Safety Boundary

- The connector does not read Chrome cookies, passwords, profile databases, or session stores.
- Page reads and actions go through content scripts and the Chrome debugger API.
- External side-effect actions still need action-time confirmation in the agent runtime policy.
- CAPTCHA, paywall, browser safety interstitial, and final password-change submission bypasses are out of scope.
