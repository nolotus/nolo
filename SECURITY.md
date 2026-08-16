# Security Policy

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

The public projection includes a safety gate (`prepareNoloOpenSourceMirror.ts`)
that prevents private modules (auth, billing, server) from leaking into the
public repository. This is a build-time control, not a substitute for security review.

## Response Timeline

- Acknowledgment: within 48 hours
- Initial assessment: within 7 days
- Fix or mitigation: depends on severity
