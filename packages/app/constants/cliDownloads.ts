import { getClientDownloadChannel } from "./clientDownloads";

export const NOLO_CLI_PACKAGE_NAME = "nolo-cli";
export const NOLO_CLI_VERSION = "0.32.0-alpha.4";
export const NOLO_CLI_NPM_URL = "https://www.npmjs.com/package/nolo-cli";

export type CliReleaseChannel = "alpha" | "latest";

export const getCliInstallTag = (origin?: string | null): CliReleaseChannel =>
  getClientDownloadChannel(origin) === "alpha" ? "alpha" : "latest";

export const getCliInstallCommand = (origin?: string | null) => {
  const tag = getCliInstallTag(origin);
  return tag === "latest"
    ? `npm install -g ${NOLO_CLI_PACKAGE_NAME}`
    : `npm install -g ${NOLO_CLI_PACKAGE_NAME}@${tag}`;
};

export const getCurlCliInstallCommand = (origin?: string | null) => {
  const channel = getClientDownloadChannel(origin);
  const base =
    channel === "alpha" ? "https://us.nolo.chat" : "https://nolo.chat";
  return `curl -fsSL ${base}/install-nolo.sh | sh`;
};

export const getCliDownloadMeta = (): string => `v${NOLO_CLI_VERSION}`;
