# Nolo Browser Connector — Privacy Policy

Last updated: 2026-09-16

This policy describes how the **Nolo Browser Connector** Chrome extension handles data.
It covers the extension only. The Nolo Desktop application and the Nolo service have their own
policy at <https://nolo.chat/privacy>.

> **Publishing note.** Chrome Web Store requires a public URL for this policy. Host the text below
> at a stable public address (recommended: add a "Nolo Browser Connector" section to
> <https://nolo.chat/privacy> and link that page, or publish this file and link it). The URL must be
> reachable without signing in.

## What the extension processes

The extension acts only on tabs that your Nolo desktop agent is working on at your request. For
those tabs it may process:

- **Page content**: visible text, the label of interactive elements, and the value of visible
  non-password form fields, used to read the page and to verify that typing worked.
- **Action results**: whether a click changed the page, and the final value of a field after typing.
- **Console messages and network request metadata** (URL, method, resource type, timestamp) for the
  tab you are debugging. Static assets such as images, fonts and CSS are filtered out by default.
- **Screenshots** of the tab, only when your agent (or you) requests one.
- **Tab metadata**: id, title, URL, window id, and whether the tab was opened by the connector.

Password fields are never read back. The connector does not read cookies, passwords, the Chrome
profile database, or session stores, and it does not export your browsing session.

## Where the data goes

Data that the extension collects is sent, over a token-protected connection on `127.0.0.1`, to the
**Nolo Desktop application running on the same computer**. The extension itself does not send data
to Nolotus servers, does not contact any third-party service, and has no analytics or advertising
code.

The Nolo Desktop application may include what your agent reads in the agent conversation. What
happens to that conversation afterwards is governed by the model provider you configured in Nolo
Desktop and by Nolo's own privacy policy.

## How long data is kept

Everything the extension holds lives in the extension's memory or in session-scoped storage:

- Console buffer: at most 200 entries per tab; network buffer: at most 300 entries per tab.
- Element references and page revisions: expire after 2 minutes and are never persisted.
- The list of tabs the connector opened: kept in `chrome.storage.session`, which is cleared when the
  browser closes.
- Per-tab buffers and references are dropped when the tab is closed.

The extension stores nothing else and writes no files.

## What we never do

- We do not sell or rent your data.
- We do not use your data for advertising, profiling, or creditworthiness decisions.
- We do not collect data for purposes unrelated to the extension's single purpose of letting your
  local agent drive the tabs you ask about.
- We do not read credentials, and we do not bypass authentication, CAPTCHA or payment flows.

## Your controls

- Disable or remove the extension in `chrome://extensions` at any time.
- Turn the Chrome connector off in Nolo Desktop settings; the extension then has nothing to serve.
- Chrome shows a "started debugging this browser" banner while the connector is attached; it is
  released automatically after 30 seconds of inactivity and whenever the tab is closed.

## Contact

Questions or data requests: **s@nolotus.com**

## Changes

We will update this page when the extension's data handling changes, and we will note the revision
date at the top.
