import { connectorRootFromHere } from "./desktopConnectorRoot";
import {
  NATIVE_HOST_SUPPORTED_PLATFORMS,
  detectInstalledBrowsers,
  installNativeHostManifests,
  isThrowawayCheckout,
  resolveNativeHostInstallTargets,
} from "./desktopChromeNativeHost";

type Env = Record<string, string | undefined>;

export type NativeHostAutoInstallPlan =
  | { run: true; connectorRoot: string; targets: string[]; detected: string[] }
  | { run: false; reason: string };

export type NativeHostAutoInstallResult = {
  skipped: boolean;
  reason: string | null;
  targets: string[];
  detected: string[];
  installs: Array<{ browser: string } & Record<string, unknown>>;
  errors: Array<{ browser: string; message: string }>;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Decides whether start-up may register the native host, and where the connector tree is. Kept pure so
 * the gates are unit-testable instead of only observable by running the desktop app:
 * - `NOLO_DESKTOP_DISABLE_NATIVE_HOST_AUTOINSTALL=1` switches it off;
 * - a connector tree inside a throwaway checkout is refused, because the wrapper we write embeds
 *   absolute paths into it (`nolo chrome install` refuses the same roots).
 * The root must come from `connectorRootFromHere()`, never from `dirname(import.meta.url)` of the
 * installer: in a packaged build that path is the bundle directory, not the vendored connector.
 */
export function planNativeHostAutoInstall({
  env = {},
  connectorRoot,
  platform,
}: {
  env?: Env;
  connectorRoot?: string;
  platform?: string;
} = {}): NativeHostAutoInstallPlan {
  if (env.NOLO_DESKTOP_DISABLE_NATIVE_HOST_AUTOINSTALL === "1") {
    return { run: false, reason: "disabled by NOLO_DESKTOP_DISABLE_NATIVE_HOST_AUTOINSTALL" };
  }
  const targetPlatform = platform ?? process.platform;
  if (!NATIVE_HOST_SUPPORTED_PLATFORMS.includes(targetPlatform)) {
    // Chrome is always a target, so without this every Windows boot would log a per-browser failure
    // for a platform the installer does not support anyway (review 2026-10-02, WARNING-2).
    return { run: false, reason: `native host installation is not implemented on ${targetPlatform}` };
  }
  let root: string;
  try {
    root = connectorRoot ?? connectorRootFromHere();
  } catch (error) {
    return { run: false, reason: errorMessage(error) };
  }
  const throwaway = isThrowawayCheckout(root);
  if (throwaway) {
    return {
      run: false,
      reason: `connector root ${root} lives in a throwaway checkout (${throwaway})`,
    };
  }
  return {
    run: true,
    connectorRoot: root,
    targets: resolveNativeHostInstallTargets({ home: env.HOME || "", platform }),
    // Detected BEFORE anything is written: an install creates the browser's manifest directory, so a
    // later probe would report the browser we just wrote to as "installed on this machine".
    detected: detectInstalledBrowsers({ home: env.HOME || "", platform }),
  };
}

/**
 * Registers the connector's native messaging host for the browsers on this machine, at desktop
 * start-up.
 *
 * Why this exists: nothing else did. The desktop endpoint defaulted to Chrome, the settings toggle is
 * gone, and only `nolo chrome install --browser firefox` / scripts/installNativeHostManifest.mjs could
 * set up Firefox — so an extension-store Firefox user had no reachable way to connect. One idempotent
 * install at start-up gives every user the same zero-action path Chrome users get.
 *
 * Deliberately best-effort: failures are returned, not thrown, because a browser we cannot register for
 * (or an unsupported platform) must not stop the desktop app from booting.
 *
 * Caller: the desktop app's own start-up (`packages/desktop/src/bun/index.ts`), NOT the runtime boot —
 * tests and tooling import the runtime entry, and this writes into the user's real browser
 * configuration.
 */
export function ensureNativeHostForDetectedBrowsers({
  env = process.env,
  connectorRoot,
  platform,
}: {
  env?: Env;
  connectorRoot?: string;
  platform?: string;
} = {}): NativeHostAutoInstallResult {
  const home = env.HOME || "";
  const plan = planNativeHostAutoInstall({ env, connectorRoot, platform });
  if (!plan.run) {
    return { skipped: true, reason: plan.reason, targets: [], detected: [], installs: [], errors: [] };
  }
  const { installs, errors } = installNativeHostManifests({
    home,
    connectorRoot: plan.connectorRoot,
    platform,
  });
  return {
    skipped: false,
    reason: null,
    targets: plan.targets,
    detected: plan.detected,
    installs,
    errors,
  };
}
