# desktop

Electrobun desktop shell for the existing Nolo Bun server and web app.

## Commands

```bash
bun run desktop:dev
bun run desktop:build
bun run desktop:build:alpha
bun run desktop:build:stable
```

`desktop:dev` starts the existing `scripts/esDev.js` watcher and runs Electrobun in watch mode.
`desktop:build` first builds the web bundle, then packages the desktop app with Electrobun.
`desktop:build:alpha` uses Electrobun's `canary` channel so it produces distributable update artifacts for the alpha release line.
`desktop:build:stable` creates release-style artifacts in `packages/desktop/artifacts/`.

`desktop:build:stable` / `desktop:build:alpha` produce a branded macOS DMG (site theme) via `post-package` unless `NOLO_DESKTOP_SKIP_DMG=1` or `NOLO_DESKTOP_BRANDED_DMG=0`.

## Local connector autostart

Desktop tries to start the local agent connector silently after the embedded
server is ready. It can use the existing CLI profile at `~/.nolo/config.json`;
when that profile points at localhost, the connector target is resolved from
the desktop channel instead (`canary`/alpha -> `https://us.nolo.chat`, stable ->
`https://nolo.chat`). `NOLO_DESKTOP_CONNECTOR_SERVER` can override this.

When the user opens Settings -> Machines inside the desktop app, the signed-in
web session also asks the local desktop runtime to start the connector with the
current remote server and token. If no profile or signed-in session exists,
desktop skips autostart without showing an error.

CLI equivalent:

```bash
nolo connect --daemon
```

For CLI-first setup on Mac or Windows:

```bash
nolo login
nolo daemon --server-url https://api.nolo.chat --api-key sk_machine_xxx
```

Repo-local one-shot script:

```bash
bun ./scripts/setupLocalCliAgent.ts --server-url https://api.nolo.chat --api-key sk_machine_xxx
```

Published macOS release verification runs through:

```bash
bash ./scripts/verifyPublishedMacArtifact.sh https://us.nolo.chat/public/downloads/canary-macos-arm64-NoloDesktop-canary.dmg
```

It downloads the public DMG, mounts it on macOS, copies the `.app` out, runs `codesign --verify --deep --strict`, and checks `spctl` output so we can distinguish a genuinely broken package from a merely unsigned/unnotarized one.

macOS public downloads are only considered healthy when they pass both:

- `codesign --verify --deep --strict`
- `spctl -a -vv --type exec`
- `xcrun stapler validate -v`

The published DMG is also checked before mounting with:

- `codesign --verify --verbose=2`
- `spctl -a -vv --type open --context context:primary-signature`
- `xcrun stapler validate -v`

Release builds use Electrobun's native mac signing pipeline when these env vars are present:

- `ELECTROBUN_DEVELOPER_ID`
- `ELECTROBUN_DEVELOPER_ID_P12_BASE64`
- `ELECTROBUN_DEVELOPER_ID_P12_PASSWORD`
- `ELECTROBUN_KEYCHAIN_PASSWORD`
- `ELECTROBUN_APPLEAPIISSUER`, `ELECTROBUN_APPLEAPIKEY`, `ELECTROBUN_APPLEAPIKEYPATH`
  or
- `ELECTROBUN_APPLEID`, `ELECTROBUN_APPLEIDPASS`, `ELECTROBUN_TEAMID`

The Apple Developer ID `.p12` key is password-protected. Store that password in
`ELECTROBUN_DEVELOPER_ID_P12_PASSWORD` as a CI/local secret, and never commit the
password or an unencrypted key to the repository. `ELECTROBUN_KEYCHAIN_PASSWORD`
protects the temporary macOS keychain used during signing and may be generated
per run when omitted.

CI now blocks mac release publication if those signing/notarization credentials are missing.
