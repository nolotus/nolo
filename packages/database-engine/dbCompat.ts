import { ensureDbOpen } from "./ensureDbOpen";

type CompatStore = Record<string, any> & {
  get(key: string): Promise<any>;
  batch?(...args: any[]): any;
  batchWrite?(...args: any[]): any;
  createBatch?(...args: any[]): any;
  open?(): Promise<unknown>;
};

type CompatDbModule = {
  default: CompatStore;
  getServerAuthorityStore?: () => CompatStore;
  ensureServerDbOpen?: () => Promise<unknown>;
};

export function getAuthorityStoreCompat(dbModule: CompatDbModule): CompatStore {
  if (typeof dbModule.getServerAuthorityStore === "function") {
    return dbModule.getServerAuthorityStore() as CompatStore;
  }
  return dbModule.default as CompatStore;
}

export async function ensureAuthorityStoreCompatOpen(
  dbModule: CompatDbModule,
  store = getAuthorityStoreCompat(dbModule)
) {
  if (
    typeof dbModule.getServerAuthorityStore !== "function" &&
    typeof dbModule.ensureServerDbOpen === "function"
  ) {
    await dbModule.ensureServerDbOpen();
    return;
  }
  await ensureDbOpen(store);
}
