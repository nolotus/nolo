# Chrome Web Store submission checklist

Ordered so that the cheapest, highest-risk checks come first. Steps marked **OWNER** need the store
account owner (payment or dashboard access); everything else is automated or prepared in this repo.

## 0. Preconditions (done)

- [x] Extension package builds from `packages/desktop-chrome-connector/extension`
- [x] `manifest.json` sits at the package root, MV3, fixed `key` for a stable extension id
- [x] Icons: `extension/icons/icon{16,32,48,128}.png`
- [x] Screenshots (1280×800) and promo tile (440×280) in `store/`
- [x] Listing copy: `store/listing.md`
- [x] Permission justifications: `store/permissions-justification.md`
- [x] Privacy policy text: `store/privacy-policy.md`
- [x] **Sensitive-action refusal shipped** (`e12f1595b`) and verified live in the user's Chrome: a
      "Pay now" control is marked `sensitive: true` and refused pre-action, leaving the page unchanged
- [x] Privacy policy section added in-repo (`packages/app/i18n/translations/privacy.locale.ts`, four
      languages, section 6 "Browser Extension") — it goes live with the next alpha deploy; verify
      <https://nolo.chat/privacy> shows it before submitting
- [ ] **Reviewer notes** prepared (see step 6) — required, because the sandbox has no Nolo Desktop.
      A demo video is **optional**: record it only if review pushes back on "minimum functionality".

## 1. Build the upload package

```bash
bun packages/desktop-chrome-connector/scripts/buildStorePackage.mjs
```

Produces `packages/desktop-chrome-connector/dist/nolo-browser-connector-<version>.zip`.
The script asserts that `manifest.json` is at the zip root and that no development file leaks in.

## 2. Register the developer account — **OWNER**

- One-time US$5 registration fee, tied to a Google account; not yearly, not per extension.
- Use a developer email you are willing to publish (it appears on the listing and is used for
  account recovery) — a project address such as `s@nolotus.com` is a better fit than a personal one.
- Turn on 2-Step Verification for that account.

## 3. Upload a draft and verify the extension id — **OWNER** (do this before anything else)

**Done 2026-09-16.** The dashboard reported the item id `ahpdoopadkamnglhlacfjdfnonpjdplg`, identical to
the id derived from `manifest.key` and to `NOLO_CHROME_CONNECTOR_EXTENSION_ID`. Nothing to migrate: the
native host `allowed_origins`, the installer and the runtime constant all stay as they are.

Kept for the next extension (and for Edge, whose id is still unverified):

1. Developer Dashboard → **New item** → upload the zip from step 1.
2. Open `chrome://extensions` with Developer mode on and note the local id.
3. Compare it with the **Item ID** shown in the dashboard.
   - **If they match**: nothing to migrate.
   - **If they differ**: stop and migrate first — update
     `packages/desktop-chrome-connector/chromeConnector.ts` (`NOLO_CHROME_CONNECTOR_EXTENSION_ID`),
     the generated native host manifest `allowed_origins`, and the installer, then re-verify the
     connector against the real Chrome before submitting.
4. Do not submit for review yet.

## 4. Fill the listing

- Name / short description / detailed description: paste from `store/listing.md` (add the Chinese
  locale as well).
- Category: Tools. Language: English + 简体中文.
- Icon 128×128, screenshots (all three), small promo tile.
- Homepage and support URL: <https://nolo.chat>.

## 5. Fill privacy practices

- Data categories to declare (truthful, matches `privacy-policy.md`): **Website content**,
  **User activity** (console/network metadata and tab metadata).
  Do **not** declare health, financial, location, personal communications or web history — the
  extension does not collect them.
- Certify: not sold to third parties; not used for unrelated purposes; not used for creditworthiness.
- Paste the per-permission justifications from `store/permissions-justification.md`
  (`debugger`, `nativeMessaging`, `tabs`, `scripting`, `storage`, host permissions).
- Privacy policy URL from step 0.

## 6. Submit for review

Paste this into the dashboard's **Reviewer notes** field (fill in the two links first):

```text
This extension is the browser half of Nolo Desktop. It has no standalone features by design: without
the desktop app it only shows a status popup, which is why it looks inert in a sandbox.

To see it work: (1) download and open Nolo Desktop — https://nolo.chat/downloads; (2) in its settings
enable the Chrome Connector (the app installs the native messaging host for the current browser
automatically); (3) click the Nolo Browser Connector toolbar icon — it reports "Connected to Nolo
Desktop" with the negotiated protocol version. [OPTIONAL, only if available: a short unlisted demo
recording — <VIDEO_URL>.]

What it does with data: for the tab a user asks about, it reads visible text and interactive elements
and performs the clicks or typing the user's agent decided on. Irreversible actions (payment, send,
delete, publish, permission changes) are refused before any page effect. It never reads cookies,
passwords, the Chrome profile database or session stores, and the connector drops all per-tab state
when a tab closes.
```

- Visibility: **Unlisted** for the first submission.
- Expect review time to vary; an extension asking for `debugger` plus broad host access is in the
  slower bucket. If a reviewer narrows host permissions, use the fallback documented at the end of
  `store/permissions-justification.md` (`activeTab` + optional host permissions requested at use
  time) rather than arguing.

## 7. Verify the unlisted build against real Chrome — **OWNER** + automated

1. Install from the unlisted item link.
2. Confirm Nolo Desktop detects it: connector status online, `connector_info` reports
   `protocolVersion: "2"`.
3. Run the desktop smoke test (settings page) and confirm read / type / click / scroll / screenshot /
   console / network all pass.
4. Confirm the connector cleans up: the smoke test leaves no tab behind and no debugger banner.

## 8. Publish publicly

- Switch visibility to **Public** once step 7 passes.
- Record the published version, the item id and the date in the plan file.

## 9. Ongoing updates

- Bump `extension/manifest.json` version → rebuild → upload → submit.
- Chrome updates installed copies on its own schedule (hours to days), so old and new versions
  coexist: protocol skew is detected and fails closed with a "reload/update" message rather than
  silently misbehaving.
- Keep the version in the manifest and the store listing in step.
