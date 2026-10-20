import { getClientDownloadChannel } from "./clientDownloads";

export const NOLO_CLI_PACKAGE_NAME = "nolo-cli";

// web 产物里显示的 CLI 版本。真值来自构建期注入的 __NOLO_CLI_VERSION__
// （scripts/dev/esbuild.config.js 的 define 从 packages/cli/package.json 读），
// 这样「网页上写死的版本号」不再是需要人工同步的第二份真值——
// 目标状态是 main 不再为版本号产生提交，版本只由 tag 决定，web 构建时注入。
// 未注入时（bun 直接跑源码 / 测试 / SSR）回退到下面的常量，行为与改造前一致。
declare const __NOLO_CLI_VERSION__: string;
const FALLBACK_CLI_VERSION = "0.150.0";
export const NOLO_CLI_VERSION: string =
  typeof __NOLO_CLI_VERSION__ === "string" && __NOLO_CLI_VERSION__
    ? __NOLO_CLI_VERSION__
    : FALLBACK_CLI_VERSION;

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
