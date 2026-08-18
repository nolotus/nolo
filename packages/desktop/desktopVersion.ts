import { readFileSync } from "node:fs";

type DesktopPackageJson = {
  version?: string;
};

export function readDesktopAppVersion() {
  const packageJson = JSON.parse(
    readFileSync(new URL("./package.json", import.meta.url), "utf8"),
  ) as DesktopPackageJson;
  const version = packageJson.version?.trim();
  if (!version) {
    throw new Error("packages/desktop/package.json is missing a version field");
  }
  return version;
}

export const DESKTOP_APP_VERSION = readDesktopAppVersion();
