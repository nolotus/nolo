import { normalizeServerOrigin } from "core/serverOrigin";

// Raw-byte limits shared by every provider inline path and the public byte route.
export const INLINE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const INLINE_IMAGE_TOTAL_MAX_BYTES = 20 * 1024 * 1024;
export const INLINE_IMAGE_PUBLIC_HEADER = "x-nolo-inline-public";
import { API_ENDPOINTS } from "./config";

const normalizeFileId = (fileId: string | undefined | null): string => {
  if (typeof fileId !== "string") return "";
  return fileId.trim();
};

export const buildDatabaseFileContentUrl = (
  serverOrigin: string | undefined | null,
  fileId: string | undefined | null
): string | null => {
  const normalizedServer = normalizeServerOrigin(serverOrigin);
  const normalizedFileId = normalizeFileId(fileId);

  if (!normalizedServer || !normalizedFileId) {
    return null;
  }

  return `${normalizedServer}${API_ENDPOINTS.DATABASE}/file/content/${normalizedFileId}`;
};

export const isLocalDatabaseFileContentUrl = (
  url: string | null | undefined
): boolean => {
  if (typeof url !== "string" || !url) return false;
  return url.includes("localhost") || url.includes("127.0.0.1");
};
