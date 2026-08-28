import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type WindowsInstallerRecoverySource =
  | { kind: "tar"; path: string }
  | { kind: "payload-dir"; path: string };

export function findWindowsPayloadDir(rootDir: string) {
  const entries = readdirSync(rootDir, { withFileTypes: true });
  const payloadDir = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(rootDir, entry.name))
    .find(
      (path) => existsSync(join(path, "Resources", "main.js")) && existsSync(join(path, "bin")),
    );

  if (!payloadDir) {
    throw new Error(`Unable to locate Windows desktop payload directory in ${rootDir}`);
  }

  return payloadDir;
}

export function resolveWindowsInstallerRecoverySource(args: {
  buildDir: string;
  rawTarPath: string;
}): WindowsInstallerRecoverySource {
  if (existsSync(args.rawTarPath)) {
    return {
      kind: "tar",
      path: args.rawTarPath,
    };
  }

  try {
    return {
      kind: "payload-dir",
      path: findWindowsPayloadDir(args.buildDir),
    };
  } catch {
    throw new Error(
      `Electrobun failed and neither raw tar nor payload directory is available (checked ${args.rawTarPath} and ${args.buildDir})`,
    );
  }
}
