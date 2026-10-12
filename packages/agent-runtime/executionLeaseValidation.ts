import { isAbsolute, relative, resolve } from "node:path";
import type { ExecutionLease, ExecutionTicket } from "./executionBackend";

/** Lexical (non-symlink-aware) containment; non-absolute paths never match. */
export function withinRoot(root: string, child: string): boolean {
  if (!isAbsolute(root) || !isAbsolute(child)) return false;
  const canonicalRoot = resolve(root);
  const canonicalChild = resolve(child);
  const suffix = relative(canonicalRoot, canonicalChild);
  return suffix === "" || (suffix !== ".." && !suffix.startsWith("../") && !suffix.startsWith("..\\") && !isAbsolute(suffix));
}

function subsetOf(allowed: string[], actual: string[]): boolean {
  return actual.every((root) =>
    isAbsolute(root) && allowed.some((parent) => withinRoot(parent, root))
  );
}

/**
 * Validate only explicit configured-root authority.
 *
 * runtime-workspace roots are resolved from a separate trusted workspace lease,
 * and legacy-unscoped reads are deliberately not converted to a bounded root.
 * Callers must provide a scope-aware validator for those cases.
 *
 * This is lexical path validation, not symlink-safe filesystem containment.
 * The backend must enforce actual mounts/realpaths separately.
 */
export function validateConfiguredRootExecutionLease(
  ticket: ExecutionTicket,
  lease: ExecutionLease,
): boolean {
  if (
    lease.ticketId !== ticket.ticketId ||
    lease.grantId !== ticket.grantId ||
    !lease.leaseId ||
    !lease.backendId
  ) return false;

  const { filesystem } = ticket;
  if (
    filesystem.readScope === "runtime-workspace" ||
    filesystem.readScope === "legacy-unscoped" ||
    filesystem.writeScope === "runtime-workspace"
  ) return false;

  if (filesystem.readScope === "none" && lease.readableRoots.length > 0) return false;
  if (filesystem.writeScope === "none" && lease.writableRoots.length > 0) return false;
  if (
    filesystem.readScope === "configured-roots" &&
    !subsetOf(filesystem.readableRoots, lease.readableRoots)
  ) return false;
  if (
    filesystem.writeScope === "configured-roots" &&
    !subsetOf(filesystem.writableRoots, lease.writableRoots)
  ) return false;

  return true;
}
