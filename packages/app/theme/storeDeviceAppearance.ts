import { useSyncExternalStore } from "react";
import { useStore } from "react-redux";
import { createDeviceAppearanceController } from "./deviceAppearanceController";
import { resolveDeviceAppearancePreload } from "./themeModeBootstrap";

// Hydration must read the same stable server snapshot on SSR and on the
// browser hydration pass. Browser-local preferences become visible after mount.
export const serverAppearanceSnapshot = Object.freeze(
  resolveDeviceAppearancePreload({ storage: null, systemPrefersDark: false }),
);

/**
 * True while the tree is still rendering from the SSR-stable snapshot, i.e. before the
 * external store has synced browser-local preferences. Consumers that imperatively write
 * to the DOM must not publish this snapshot's values: the server bootstrap has already
 * painted the persisted appearance, so writing defaults over it flashes.
 */
export const isServerAppearanceSnapshot = (
  snapshot: ReturnType<typeof resolveDeviceAppearancePreload>,
): boolean => snapshot === serverAppearanceSnapshot;

export type DeviceAppearanceController = ReturnType<typeof createDeviceAppearanceController>;

// A controller belongs to an app store, never to the process or a user account.
// Hosts explicitly bind it; missing bindings are programming errors (not a second default owner).
const controllers = new WeakMap<object, DeviceAppearanceController>();

export const bindStoreDeviceAppearance = (store: object, controller: DeviceAppearanceController): void => {
  controllers.set(store, controller);
};

export const getStoreDeviceAppearance = (store: object): DeviceAppearanceController => {
  const controller = controllers.get(store);
  if (!controller) throw new Error("Device appearance controller has not been bound to this store.");
  return controller;
};

const NO_SUBSCRIPTION = () => () => {};

/** Hook can be consumed after the host has bound its controller. */
export const useStoreDeviceAppearance = () => {
  const store = useStore();
  const controller = getStoreDeviceAppearance(store);
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    () => serverAppearanceSnapshot,
  );
  return { controller, snapshot };
};

/**
 * Read-only appearance view. Unlike the mutation-facing hook it never throws: an
 * unbound store (minimal stores in tests, embedded renders) degrades to the
 * SSR-stable snapshot, which is exactly what those trees render anyway. Writes
 * remain impossible, because `getStoreDeviceAppearance` still throws.
 */
export const useDeviceAppearanceSnapshot = () => {
  const store = useStore();
  const controller = controllers.get(store) ?? null;
  return useSyncExternalStore(
    controller ? controller.subscribe : NO_SUBSCRIPTION,
    controller ? controller.getSnapshot : () => serverAppearanceSnapshot,
    () => serverAppearanceSnapshot,
  );
};
