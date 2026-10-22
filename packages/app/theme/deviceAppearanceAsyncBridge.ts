import { resolveDeviceAppearancePreload } from "./themeModeBootstrap";
import type { DeviceAppearanceChanges } from "./deviceAppearanceOwner";
import type { DeviceAppearanceController } from "./storeDeviceAppearance";
import { FONT_PRESET_STORAGE_KEY } from "./fontPreference";

/** RN storage is asynchronous (Keychain), unlike the browser's localStorage.
 * Hydrate once, but never overwrite a user edit made while reads are pending. */
export interface AsyncDeviceAppearanceStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const KEY_BY_FIELD = {
  themeName: "nolo-theme-name",
  themeMode: "nolo-theme-mode",
  density: "nolo-density",
  fontPreset: FONT_PRESET_STORAGE_KEY,
} as const;

export const createAsyncDeviceAppearanceBridge = (
  controller: DeviceAppearanceController,
  storage: AsyncDeviceAppearanceStorage,
  systemPrefersDark: () => boolean,
) => {
  const edited = new Set<keyof typeof KEY_BY_FIELD>();
  let generation = 0;
  let disposed = false;
  let writes = Promise.resolve();
  return {
    update: async (changes: DeviceAppearanceChanges): Promise<void> => {
      if (disposed) return;
      controller.updateAndPersist(changes);
      const pending: Promise<void>[] = [];
      for (const key of Object.keys(KEY_BY_FIELD) as Array<keyof typeof KEY_BY_FIELD>) {
        if (changes[key] === undefined) continue;
        edited.add(key);
        // RN Keychain adapter stores a JSON bag. Serialize writes so concurrent
        // read-modify-write operations cannot lose unrelated preference keys.
        const nextWrite = writes.then(() => storage.setItem(KEY_BY_FIELD[key], String(changes[key])));
        // Keep the queue alive after a failed write, but report the failure
        // to the current caller rather than silently treating it as persisted.
        writes = nextWrite.catch(() => {});
        pending.push(nextWrite);
      }
      const results = await Promise.allSettled(pending);
      const failed = results.find(result => result.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
    },
    hydrate: async (): Promise<void> => {
      const request = ++generation;
      const pairs = await Promise.all(
        (Object.keys(KEY_BY_FIELD) as Array<keyof typeof KEY_BY_FIELD>).map(async key => {
          try { return [key, await storage.getItem(KEY_BY_FIELD[key])] as const; }
          catch { return [key, null] as const; }
        }),
      );
      if (disposed || generation !== request) return;
      const values = new Map<string, string>();
      for (const [field, value] of pairs) {
        if (!edited.has(field) && value !== null) values.set(KEY_BY_FIELD[field], value);
      }
      const loaded = resolveDeviceAppearancePreload({
        storage: { getItem: key => values.get(key) ?? null },
        systemPrefersDark: systemPrefersDark(),
      });
      const changes: { -readonly [K in keyof DeviceAppearanceChanges]: DeviceAppearanceChanges[K] } = {};
      for (const field of Object.keys(KEY_BY_FIELD) as Array<keyof typeof KEY_BY_FIELD>) {
        if (!edited.has(field) && values.has(KEY_BY_FIELD[field])) {
          // Never reset omitted fields to defaults after a user interaction.
          changes[field] = loaded[field] as never;
        }
      }
      controller.updateSystemPrefersDark(systemPrefersDark());
      controller.update(changes);
    },
    dispose: () => { disposed = true; ++generation; },
  };
};
