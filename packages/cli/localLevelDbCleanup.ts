import fs from "node:fs";
import path from "node:path";
import { resolveNoloHome } from "../database-engine/dbPath";
import { getOrCreateServerStoreRuntime } from "../database-engine/serverStoreFactory";
import { getDefaultCliLocalRuntimeDb } from "./localRuntimeAuthority";

/** Delete local agent records through their shared owners; never close a shared store. */
export async function clearAgentKeysFromLocalLevelDbs(args: {
  keys: string[];
}): Promise<string[]> {
  const cliDb = path.join(resolveNoloHome(), "data", "leveldb");
  const serverDbPath = process.env.NOLO_SERVER_DB_PATH?.trim();
  const dbPaths = [cliDb, ...(serverDbPath ? [serverDbPath] : [])];
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const dbPath of dbPaths) {
    if (!fs.existsSync(path.join(dbPath, "CURRENT"))) continue;
    const canonicalPath = fs.realpathSync(dbPath);
    if (seen.has(canonicalPath)) continue;
    seen.add(canonicalPath);
    const isCliHome = fs.existsSync(cliDb) && canonicalPath === fs.realpathSync(cliDb);
    const db = isCliHome
      ? await getDefaultCliLocalRuntimeDb()
      : getOrCreateServerStoreRuntime(dbPath).serverDb;
    // The server runtime is process-wide. Never delete from a different cached store
    // or construct a second Level handle if that singleton belongs to another path.
    if (!isCliHome && (!db.location || fs.realpathSync(db.location) !== canonicalPath)) {
      throw new Error(`Server database singleton does not own requested cleanup path: ${dbPath}`);
    }
    await db.open();
    await db.batch(args.keys.map((key) => ({ type: "del" as const, key })));
    cleaned.push(dbPath);
  }
  return cleaned;
}
