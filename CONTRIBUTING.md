# Contributing to Nolo

This repository is a public source projection generated from Nolo's private
canonical repository for privacy and security auditing of the CLI, desktop app,
and other clients whose source has been made public here. It does not include
unreleased mobile clients or cloud service backends.

Privacy and security feedback is welcome. This is not a traditional community
co-development repository, and routine feature pull requests are not accepted.
No response or remediation timeline is promised. This maintenance policy does not
restrict the rights granted by the MIT license, including use, modification,
forking, and redistribution.

## Audit Setup

1. Install [Bun](https://bun.sh/)
2. `bun install`
3. `bun scripts/public-audit/verifyProjection.ts` to verify the projection boundary
4. `bun scripts/dev/esBuild.js` to verify the web build

## Code Structure

- This repo is a monorepo with `packages/*` workspaces.
- Identity/billing use edition injection — see `packages/identity/EDITION.md`.
- Do not add imports of `auth/`, `server/`, or `billing/` internal paths.
  The projection gate will reject them.

## Privacy and Security Feedback

For non-sensitive privacy or security observations, open an issue with the
projection revision, affected client, reproduction steps, and expected behavior.
Do not include credentials, personal data, or exploitable vulnerability details.
Report sensitive findings privately as described in [SECURITY.md](./SECURITY.md).
Routine feature pull requests are not accepted; maintenance happens in the
private canonical repository and is projected here.

## Security

Found a security issue? Please see [SECURITY.md](./SECURITY.md).
