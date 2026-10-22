import { createDeviceAppearanceOwner, type DeviceAppearanceChanges } from "./deviceAppearanceOwner";
import { readDeviceAppearance, persistDeviceAppearanceChanges, type DeviceAppearanceStorage } from "./deviceAppearancePersistence";

/**
 * A host-owned device appearance controller. Web, SSR and RN inject their own
 * storage and OS preference; this module owns neither browser globals nor a
 * process-wide singleton.
 */
export const createDeviceAppearanceController = (
  storage: DeviceAppearanceStorage | null,
  systemPrefersDark: boolean,
) => {
  const owner = createDeviceAppearanceOwner(
    readDeviceAppearance(storage, systemPrefersDark),
    systemPrefersDark,
  );
  return {
    ...owner,
    updateAndPersist: (changes: DeviceAppearanceChanges) => {
      owner.update(changes);
      persistDeviceAppearanceChanges(storage, changes);
    },
  };
};
