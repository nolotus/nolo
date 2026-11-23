import type { AppExtra } from "app/store";
import { fetchFromClientDb } from "./actions/common";

type ClientDb = AppExtra["db"];

// Sublevel keys are outside the root DB keyspace that reads, patches and sync
// use for metadata. Fields in a remote record (even cached verbatim) cannot
// create an entry here.
function mappings(db: ClientDb | undefined) {
  return db?.sublevel?.<string, string>("web-space-upload-file-ids", { valueEncoding: "utf8" });
}

const mappingKey = (userId: string, pageKey: string) => JSON.stringify([userId, pageKey]);

export async function recordWebSpaceUploadFileId(db: ClientDb, userId: string, pageKey: string, fileId: string) {
  await mappings(db)?.put(mappingKey(userId, pageKey), fileId);
}

export async function readWebSpaceUploadFileId(db: ClientDb, userId: string, pageKey: string): Promise<string | undefined> {
  const store = mappings(db);
  const fileId = store && await fetchFromClientDb(store, mappingKey(userId, pageKey));
  return typeof fileId === "string" && fileId ? fileId : undefined;
}
