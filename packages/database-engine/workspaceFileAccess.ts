import serverDb from "./db";
import { getFileMetadataById, type FileMetadata } from "./fileService";
import {
  isValidKeySegment,
  normalizeSpaceIdSegment,
  resolveSpaceMemberRole,
  type SpaceReadableStore,
  type SpaceRole,
} from "./spaceStoreReader";
import { fileKey as buildFileKey } from "database/keys";
import { isTombstoneRecord } from "database/tombstones";
import { asOptionalTrimmedString } from "core/optionalString";

export type PrincipalRef =
  | { kind: "user"; id: string }
  | { kind: "space"; id: string };

export type WorkspaceFileAccessDenyReason =
  | "unauthenticated"
  | "invalid_file_id"
  | "file_not_found"
  | "not_file_owner"
  | "not_space_member"
  | "file_not_authorized_for_space"
  | "space_mismatch"
  | "insufficient_space_role"
  | "authorization_unavailable";

export type WorkspaceFileAccessResult =
  | {
      allowed: true;
      principal: PrincipalRef;
      fileKey: string;
      metadata: FileMetadata;
      role?: SpaceRole;
    }
  | {
      allowed: false;
      reason: WorkspaceFileAccessDenyReason;
      statusCode: 400 | 401 | 403 | 404 | 503;
      message: string;
    };

export type WorkspaceFileAccessDeps = {
  store?: SpaceReadableStore;
  getFileMetadataById?: (fileId: string) => Promise<FileMetadata | null>;
};

export function normalizePrincipalRef(principal: PrincipalRef): PrincipalRef | null {
  if (principal.kind === "user") {
    const id = asOptionalTrimmedString(principal.id);
    if (!id || !isValidKeySegment(id)) return null;
    return { kind: "user", id };
  }
  if (principal.kind === "space") {
    const id = normalizeSpaceIdSegment(principal.id);
    if (!id || !isValidKeySegment(id)) return null;
    return { kind: "space", id };
  }
  return null;
}

/**
 * Resolve verified Space role using the canonical `resolveSpaceMemberRole`
 * projection from `spaceStoreReader.ts`. Never swallows store errors into a
 * fallback role (fail-closed).
 */
export async function resolveSpaceRoleFromStore(
  store: SpaceReadableStore,
  userId: string,
  spaceId: string | null | undefined,
): Promise<SpaceRole | null> {
  return await resolveSpaceMemberRole(store, userId, spaceId);
}

export function resolveCanonicalFileKey(fileId: string, metadata: FileMetadata): string {
  if (typeof metadata.dbKey === "string" && metadata.dbKey.startsWith("file-")) {
    return metadata.dbKey;
  }
  if (fileId.startsWith("file-")) return fileId;
  return buildFileKey.single(metadata.tenantId || "default", metadata.id || fileId);
}

/**
 * Authorize whether `actorUserId` may read `fileId` (optionally in the context of `spaceId`).
 *
 * Security invariants:
 * - User A cannot read User B's private file.
 * - Non-members and revoked members cannot read a private Space's file.
 * - Space inclusion/bookmarking (`space.contents` / `sp:{id}:item:*`) does NOT
 *   grant members access to another user's private file: only files owned by
 *   the Space (`ownerType === "space" && ownerId === spaceId`) are readable via membership.
 * - Passing a client-supplied `spaceId` never grants access on its own.
 * - Storage read errors fail closed (`authorization_unavailable`, 503).
 */
export async function authorizeWorkspaceFileRead(args: {
  actorUserId?: string | null;
  fileId: string;
  spaceId?: string | null;
  metadata?: FileMetadata | null;
  deps?: WorkspaceFileAccessDeps;
}): Promise<WorkspaceFileAccessResult> {
  const actorUserId = asOptionalTrimmedString(args.actorUserId);
  if (!actorUserId) {
    return {
      allowed: false,
      reason: "unauthenticated",
      statusCode: 401,
      message: "Authentication required to access workspace files",
    };
  }

  const fileId = asOptionalTrimmedString(args.fileId);
  if (!fileId || /[\\/\0]/.test(fileId)) {
    return {
      allowed: false,
      reason: "invalid_file_id",
      statusCode: 400,
      message: "Invalid fileId",
    };
  }

  const store = args.deps?.store ?? (serverDb as unknown as SpaceReadableStore);
  let metadata: FileMetadata | null;
  try {
    metadata =
      args.metadata !== undefined
        ? args.metadata
        : await (args.deps?.getFileMetadataById ?? getFileMetadataById)(fileId);
  } catch {
    return {
      allowed: false,
      reason: "authorization_unavailable",
      statusCode: 503,
      message: "Failed to verify file metadata for authorization",
    };
  }

  if (!metadata || isTombstoneRecord(metadata)) {
    return {
      allowed: false,
      reason: "file_not_found",
      statusCode: 404,
      message: `File not found: ${fileId}`,
    };
  }

  const requestedSpaceId = normalizeSpaceIdSegment(args.spaceId);
  const fileKey = resolveCanonicalFileKey(fileId, metadata);

  // Case 1: Space-owned file
  if (metadata.ownerType === "space") {
    const fileSpaceId = normalizeSpaceIdSegment(metadata.ownerId);
    if (!fileSpaceId) {
      return {
        allowed: false,
        reason: "file_not_authorized_for_space",
        statusCode: 403,
        message: "Space file is missing a valid space ownerId",
      };
    }
    if (requestedSpaceId && requestedSpaceId !== fileSpaceId) {
      return {
        allowed: false,
        reason: "space_mismatch",
        statusCode: 403,
        message: "Requested spaceId does not match the file's owning Space",
      };
    }
    let role: SpaceRole | null;
    try {
      role = await resolveSpaceRoleFromStore(store, actorUserId, fileSpaceId);
    } catch {
      return {
        allowed: false,
        reason: "authorization_unavailable",
        statusCode: 503,
        message: "Failed to verify Space membership",
      };
    }
    if (!role) {
      return {
        allowed: false,
        reason: "not_space_member",
        statusCode: 403,
        message: "Caller is not a member of the Space owning this file",
      };
    }
    return {
      allowed: true,
      principal: { kind: "space", id: fileSpaceId },
      fileKey,
      metadata,
      role,
    };
  }

  // Case 2: User-owned (or dialog/legacy tenant-owned) private file
  const ownerUserId =
    asOptionalTrimmedString(metadata.ownerType === "user" ? metadata.ownerId : undefined) ??
    asOptionalTrimmedString(metadata.uploadedBy) ??
    asOptionalTrimmedString(metadata.tenantId);

  // Legacy upload metadata can be client-supplied. Only Space ownership,
  // never an ad hoc metadata grant or a bookmark, delegates private bytes.
  if (requestedSpaceId && ownerUserId !== actorUserId) {
    return { allowed: false, reason: "file_not_authorized_for_space", statusCode: 403, message: "Private file is not authorized for this Space" };
  }

  if (!ownerUserId || ownerUserId !== actorUserId) {
    return {
      allowed: false,
      reason: "not_file_owner",
      statusCode: 403,
      message: "Caller does not own this private file",
    };
  }

  return {
    allowed: true,
    principal: { kind: "user", id: ownerUserId },
    fileKey,
    metadata,
  };
}

export async function authorizeWorkspacePrincipalWrite(args: {
  actorUserId?: string | null;
  principal: PrincipalRef;
  deps?: WorkspaceFileAccessDeps;
}): Promise<
  | { allowed: true; principal: PrincipalRef; role?: SpaceRole }
  | { allowed: false; reason: WorkspaceFileAccessDenyReason; statusCode: 401 | 403 | 503; message: string }
> {
  const actorUserId = asOptionalTrimmedString(args.actorUserId);
  if (!actorUserId) {
    return {
      allowed: false,
      reason: "unauthenticated",
      statusCode: 401,
      message: "Authentication required to commit artifacts",
    };
  }
  const normalized = normalizePrincipalRef(args.principal);
  if (!normalized) {
    return {
      allowed: false,
      reason: "not_file_owner",
      statusCode: 403,
      message: "Invalid target principal",
    };
  }
  if (normalized.kind === "user") {
    if (normalized.id !== actorUserId) {
      return {
        allowed: false,
        reason: "not_file_owner",
        statusCode: 403,
        message: "Cannot write artifacts to another user's private workspace",
      };
    }
    return { allowed: true, principal: normalized };
  }

  const store = args.deps?.store ?? (serverDb as unknown as SpaceReadableStore);
  let role: SpaceRole | null;
  try {
    role = await resolveSpaceRoleFromStore(store, actorUserId, normalized.id);
  } catch {
    return {
      allowed: false,
      reason: "authorization_unavailable",
      statusCode: 503,
      message: "Failed to verify Space role for write authorization",
    };
  }
  if (!role) {
    return {
      allowed: false,
      reason: "not_space_member",
      statusCode: 403,
      message: "Caller is not a member of the target Space",
    };
  }
  if (role === "guest") {
    return {
      allowed: false,
      reason: "insufficient_space_role",
      statusCode: 403,
      message: "Space guests cannot commit artifacts",
    };
  }
  return { allowed: true, principal: normalized, role };
}

/** Host storage paths are internal, even for callers allowed to read bytes. */
export function projectWorkspaceFileMetadata(metadata: FileMetadata) {
  if (metadata.accessPolicy !== "restricted") return metadata;
  const { filePath: _filePath, ...publicMetadata } = metadata;
  return publicMetadata;
}
