import {
  buildDatabaseFileContentUrl
} from "/public/assets/chunks/chunk-RWWUEPWY.js";

// packages/ai/agent/avatarUtils.ts
function resolveAvatarUrl(avatarFileId, server) {
  if (!avatarFileId) return null;
  if (avatarFileId.startsWith("http") || avatarFileId.startsWith("blob:")) {
    return avatarFileId;
  }
  if (avatarFileId.startsWith("/")) {
    if (!server) return avatarFileId;
    return `${server}${avatarFileId}`;
  }
  return buildDatabaseFileContentUrl(server, avatarFileId);
}

export {
  resolveAvatarUrl
};
