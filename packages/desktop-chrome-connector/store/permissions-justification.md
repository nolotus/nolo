# Permission justifications for the Chrome Web Store dashboard

The dashboard asks a free-text justification for each permission it considers sensitive.
Paste one paragraph per permission below. Keep them specific and tied to user-visible features.

## Single purpose statement

```text
Nolo Browser Connector lets the Nolo Desktop app on the same computer drive the Chrome tabs its user asks about. It reads page content, performs the clicks and typing the user's local agent decides on, verifies those actions, and closes the tabs it opened. It has no other purpose and no standalone features.
```

## `debugger`

```text
Used to capture a screenshot and to read console and network activity of the tab the user's agent is working on. These reads cannot be done with content scripts alone, which is why the debugger API is required. The extension never evaluates model-supplied code, never uses Runtime.evaluate, and detaches automatically after 30 seconds of inactivity and whenever a tab it controls is closed. Users see Chrome's standard "started debugging this browser" banner while it is attached.
```

## `nativeMessaging`

```text
Used to talk to the Nolo Desktop application installed on the same machine. Chrome launches the registered native host process; the host exposes a token-protected RPC endpoint bound to 127.0.0.1 only. This is the only channel between the extension and Nolo Desktop, and it is the reason the extension cannot function without the desktop app installed.
```

## `tabs`

```text
Used to list open tabs, to open a tab for a URL the user asked about, to read the active tab of the connection, and to close tabs that this extension opened itself. Pinned tabs are refused when closing.
```

## `scripting`

```text
Used to inject one self-contained read/act function into the tab the user asked about, so the extension can read visible text and interactive elements and perform the click or typing the user's agent requested. The injected function is fixed code shipped with the extension; it takes data-only arguments and never receives executable code.
```

## `storage`

```text
Used for one thing: remembering which tab ids this extension opened during the current browser session, so list_tabs can mark them and so the agent can clean up after itself. It uses chrome.storage.session, which never touches disk and is cleared when the browser closes. No page content, no credentials, and no user identifiers are stored.
```

## Host permissions (`http://*/*`, `https://*/*`)

```text
The agent must be able to work on whichever site the user is looking at when they ask for help, and that site is not knowable in advance. Host access is used only for the tab the user's request names: to read its compact observation, to act on the elements the user asked about, and to verify the result. Reading cookies, passwords, profile databases and session stores is explicitly out of scope and is never implemented.
```

## Optional narrowing note (if review pushes back)

If a reviewer requires narrower host access, the documented fallback is:

1. Drop `host_permissions` and request the origin at use time with `chrome.permissions.request()` from the tab the user is acting on, driven by `activeTab` plus optional host permissions.
2. Keep `debugger`, `nativeMessaging`, `scripting`, `tabs` and `storage` as-is; those are already the narrowest set that supports the shipped features.
