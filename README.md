# Nolo

**Nolo** is an AI-native, local-first workspace.

## Public Audit Projection

This repository is a public source projection generated from Nolo's private
canonical repository for privacy and security auditing of the CLI, desktop app,
and other clients whose source has been made public here. It does not include
unreleased mobile clients or cloud service backends.

Privacy and security feedback is welcome. This is not a traditional community
co-development repository, and routine feature pull requests are not accepted.
No response or remediation timeline is promised. This maintenance policy does not
restrict the rights granted by the MIT license, including use, modification,
forking, and redistribution.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for audit setup and feedback guidance,
and [SECURITY.md](./SECURITY.md) for private vulnerability reporting.

## 🌟 Core Principles

1. **Agent-First CLI & TUI** — The `nolo` CLI understands context, not just commands.
2. **Local-First** — Local storage and user-configured API providers support local use.
3. **Published Client Source** — CLI, Electrobun desktop, and shared web UI source included in this projection.

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh/) runtime

### Install
```bash
bun install
```

### Build (Desktop)
```bash
bun run build
```

### CLI
```bash
bun packages/cli/index.ts
# or after global install:
nolo chat
nolo run "summarize this agent's recent 10 dialogs"
```

## 📂 Project Structure (Monorepo)

- `packages/cli/` — CLI tool and TUI terminal engine.
- `packages/desktop/` — Electrobun-based desktop app.
- `packages/web/` — Web frontend entry.
- `packages/app/` — Shared application logic and state management.
- `packages/chat/` — Chat UI and dialog management.
- `packages/render/` — Shared rendering and layout components.
- `packages/ai/` — Agent core, model management, tool protocol.
- `packages/database/` / `packages/database-engine/` — Local-first storage engine.
- `packages/identity/` — Identity contract (local/cloud edition injection).
- `packages/billing/` — Billing contract (local no-op, cloud injected).
- `packages/core/` — Shared utilities and pure functions.
- `packages/agent-runtime/` — Agent runtime and provider adapters.
- `packages/create/` — Space creation and management.
- `packages/share/` — Content sharing.
- `packages/integrations/` — Third-party integrations (OpenAI, etc).
- `packages/shared/` — Cross-platform shared types.

## 🔒 Local-First Architecture

This repository is the public projection of Nolo. It contains everything needed
to run Nolo locally with your own API keys — no cloud account, no server backend,
no billing. The identity and billing systems use edition injection (cloud delegates
to private auth, local is no-op), so the same codebase works in both modes.

See `packages/identity/EDITION.md` for details on the edition injection pattern.

## 📄 License

MIT — see [LICENSE](./LICENSE).

---
*Powered by Bun & React. Designed for the AI era.*
