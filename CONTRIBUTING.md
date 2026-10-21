# Contributing to Nolo

Thanks for your interest in contributing! This repository is a public projection
generated from the canonical source. Here's how to contribute:

## Development Setup

1. Install [Bun](https://bun.sh/)
2. `bun install`
3. `bun scripts/public-audit/verifyProjection.ts` to verify the projection boundary
4. `bun scripts/dev/esBuild.js` to verify the web build

## Code Structure

- This repo is a monorepo with `packages/*` workspaces.
- Identity/billing use edition injection — see `packages/identity/EDITION.md`.
- Do not add imports of `auth/`, `server/`, or `billing/` internal paths.
  The projection gate will reject them.

## Submitting Changes

1. Fork and create a feature branch
2. Run `bun scripts/public-audit/verifyProjection.ts` to verify the projection boundary
3. Run `bun scripts/dev/esBuild.js` to verify the web build
4. Open a PR with a clear description

## Security

Found a security issue? Please see [SECURITY.md](./SECURITY.md).
