# Security Policy

This repository is a public source projection generated from Nolo's private
canonical repository for privacy and security auditing of the CLI, desktop app,
and other clients whose source has been made public here. It does not include
unreleased mobile clients or cloud service backends.

Privacy and security feedback is welcome. This is not a traditional community
co-development repository, and routine feature pull requests are not accepted.
No response or remediation timeline is promised. This maintenance policy does not
restrict the rights granted by the MIT license, including use, modification,
forking, and redistribution.

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not** open a public issue.
Instead, email security@nolo.chat with details and reproduction steps.

## Scope

- Credential exposure in the local-first data store
- Local data corruption or loss
- Unsafe tool execution (shell, file system, network)
- Supply-chain vulnerabilities in build dependencies
- Vulnerabilities in included client/CLI/desktop code

## Out of Scope

- API key leakage from user-configured providers (user responsibility)
- Cloud service vulnerabilities (report to the cloud team separately)

## Defense in Depth

The private generation process applies projection boundary checks before export.
In this public repository, run `bun scripts/public-audit/verifyProjection.ts`
to check the exported projection contract. These are build-time controls, not a
substitute for security review.

## Response Expectations

Privacy and security reports are welcome, but acknowledgment, assessment, and
fixes have no guaranteed response times or service-level commitments.
