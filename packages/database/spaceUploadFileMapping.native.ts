import Level from "@nolo/leveldb";
import type { AppExtra } from "app/store";

// RN Level does not implement sublevel(). Use a physically separate DB so no
// key accepted by metadata reads, patches or sync can populate this mapping.
function mappings() {
  // Native open is idempotent and reopens after the developer closes all DBs.
  return new Level("rn-space-upload-file-ids");
}

const mappingKey = (userId: string, pageKey: string) => JSON.stringify([userId, pageKey]);

export async function recordWebSpaceUploadFileId(_db: AppExtra["db"], userId: string, pageKey: string, fileId: string) {
  await mappings().put(mappingKey(userId, pageKey), fileId);
}

export async function readWebSpaceUploadFileId(_db: AppExtra["db"], userId: string, pageKey: string): Promise<string | undefined> {
  const fileId = await mappings().get(mappingKey(userId, pageKey));
  return typeof fileId === "string" && fileId ? fileId : undefined;
}
