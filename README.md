# Nolo

**Nolo** is an AI-native, local-first cross-platform workspace.
It deeply integrates AI agents into your daily workflow with local-first data and privacy.

## 🌟 Core Principles

1. **Agent-First CLI & TUI** — The `nolo` CLI understands context, not just commands.
2. **Local-First** — Your data stays on your machine. Cloud is optional sync, not a dependency.
3. **Cross-Platform** — One data layer, React for Web/Desktop, React Native for mobile.

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

### Test
```bash
bun test
```

### CLI
```bash
bun run cli
# or after global install:
nolo chat
nolo run "summarize this agent's recent 10 dialogs"
```

## 📂 Project Structure (Monorepo)

- `packages/cli/` — CLI tool and TUI terminal engine.
- `packages/desktop/` — Electron-based desktop app (Electrobun).
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
