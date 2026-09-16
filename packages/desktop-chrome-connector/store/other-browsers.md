# Other browser stores: cost and submission standards

Research notes for porting the Nolo Browser Connector beyond Chrome. Chrome is the first target; the
other three are recorded here so the porting decision is not made twice.

Verified 2026-09-16 against official documentation. Anything marked **待核实** was not confirmed from
official sources and must be checked before acting on it.

## Cost comparison

| Store | Registration cost | Account | Notes |
|---|---|---|---|
| Chrome Web Store | **US$5 one-time** | Google account + 2-Step Verification | Covers all extensions under the account |
| Microsoft Edge Add-ons | **No fee stated anywhere in the official registration flow** | Microsoft Partner Center; company accounts need a company approver | Registration flow: account type → contact info → developer agreement → verification |
| Firefox (AMO) | **No fee stated anywhere**; submission, listing and signing have no charge | Free Mozilla account | Signing is mandatory for distribution |
| Safari (App Store) | **US$99 per membership year** (quoted: "The Apple Developer Program is 99 USD per membership year") | Apple Developer Program | Fee waivers only for nonprofits / educational / government |

## Technical portability (this is what actually decides effort)

The extension's three "debug" features — screenshot, console and network reads — are built on
`chrome.debugger`, and **only Chromium browsers implement that API**:

- **Firefox**: `chrome.debugger` is *not implemented*. Mozilla bug 1316741 ("Implement chrome.debugger
  to let extensions use remote debugging protocol") is still open and tracked as a
  `webextensions-chrome-gaps` item.
- **Safari**: Safari implements a subset of WebExtensions; the debugger API is not part of it, and the
  converter warns about unsupported manifest keys during conversion.
- **Edge**: Chromium-based, so `debugger`, `nativeMessaging` and the rest work as-is.

Consequences per feature:

- **Screenshot**: portable — Firefox `tabs.captureTab`, Safari `tabs.captureVisibleTab`,
  Chromium `Page.captureScreenshot`.
- **Console**: needs an alternative on Firefox/Safari (content-script console hooks). Lower fidelity.
- **Network**: needs an alternative on Firefox/Safari (`webRequest` for request metadata; no response
  bodies). Lower fidelity.
- **Page reads, element refs, click/type and action verification**: portable as-is; they use
  `scripting` + `tabs`.
- **Native messaging**: Chromium uses a native messaging host manifest with `allowed_origins`
  (our current design). Safari uses `SafariWebExtensionHandler` inside the containing app — a
  different bridge, not a manifest. Firefox uses the same native messaging concept as Chromium.

## Submission standards per store

### Chrome Web Store (primary target)

- One-time US$5; MV3 zip with `manifest.json` at the archive root.
- Single purpose; narrowest permissions ("Use of Permissions" policy forbids future-proofing).
- Privacy practices disclosure + public privacy policy URL; per-permission justification text.
- Review time varies; `debugger` plus broad host access sits in the slower bucket.
- Extension id is derived from `manifest.key`; verify the dashboard Item ID against the local id after
  a draft upload (see `submission-checklist.md`).

### Microsoft Edge Add-ons

- **The same Chromium package we already build is the submission artifact** — no rebuild needed.
- Listing fields mirror Chrome's (category, description, screenshots); markets are selectable.
- Partner Center registration is free; company accounts require verification of an authorized contact.
- Extra work is listing + privacy disclosures, not code.
- **待核实**: whether the Edge item id equals our existing `ahpdoopadkamnglhlacfjdfnonpjdplg`. If it
  does, the native host `allowed_origins` and installer work unchanged; if not, the same three places
  listed in `submission-checklist.md` need updating. Verify with a draft upload, exactly like Chrome.

### Firefox (addons.mozilla.org)

- Free; add-on **signing is mandatory** for installation in Release/Beta (Developer Edition/Nightly can
  relax this).
- Listed add-ons go through AMO review; self-distributed ("unlisted") add-ons are signed without a
  listing but still validated.
- Source code must be provided if the submitted code is minified or obfuscated (ours is not).
- **Manifest work**: Firefox MV3 does not use a `service_worker` background the way Chromium does; our
  module service worker would need an event-page form. **待核实**: exact `background` shape and whether
  `"type": "module"` is honoured for `background.scripts` on current Firefox.
- **Feature work**: replace the debugger-backed console/network reads with Firefox equivalents;
  screenshot switches to `tabs.captureTab`.
- Verdict: medium effort, and it degrades two features. Do it only if Firefox users are a real segment.

### Safari (App Store / macOS)

- US$99/year; requires macOS + Xcode; the extension must be wrapped in a containing app
  (`xcrun safari-web-extension-converter`).
- Unsigned extensions cannot be enabled in Safari; development signing only works on the machine that
  built it. Public distribution needs the paid account plus notarization (or App Store review).
- Native messaging must be re-implemented as `SafariWebExtensionHandler` inside the app, so the
  current native host manifest/wrapper design does not carry over.
- Review: macOS app review on top of extension review.
- Verdict: highest effort by a wide margin, and it needs Apple hardware in the loop. Justify with real
  user demand before starting.

## Recommended order

1. **Chrome** — in progress; unblocks the desktop feature and most users.
2. **Edge** — *deferred by owner decision* (see the readiness report §8). It is **not** "the same package
   plus a listing": Edge keeps its own native-messaging locations/registry keys per OS, and the
   installer currently registers Chrome on macOS and Linux only. Revisit when Edge is actually wanted.
3. **Firefox** — only with a capability seam (browser adapter) so console/network degrade gracefully
   instead of being forked.
4. **Safari** — last; requires the native bridge rewrite and a Mac build/CI path.

## Design implication to keep in mind (do not build yet)

If more than one non-Chromium browser is ever targeted, the debugger-backed features should sit behind
one internal capability seam inside the extension (`debugger-backed` vs `content-script-backed`), so a
port chooses an implementation instead of forking `background.js`. That is a porting-time refactor, not
something to build speculatively now.
