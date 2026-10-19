import { readFileSync } from "node:fs";

type DesktopPackageJson = {
  version?: string;
};

/**
 * 桌面端应用版本。
 *
 * 优先取构建期注入的 `NOLO_DESKTOP_APP_VERSION`，未注入时回退
 * `packages/desktop/package.json` 的 version。
 *
 * 为什么需要注入：`main` 停止为版本号产生提交之后，投影里的 package.json 会停在
 * alpha 版本线上，而本次要发布的版本只存在于 tag / projection-release-metadata.json
 * （由 desktop-build.yml 的 inputs.version 传入）。不注入的话，electrobun 会把
 * alpha 版本号烘焙进安装包与下载 manifest——包能装、能跑，只是版本是错的，
 * 且没有任何检查会发现。
 */
export function readDesktopAppVersion() {
  // 区分「未声明」与「声明了但为空」——这两者的后果完全不同：
  //   未声明（本地开发/测试）：回退 package.json，保持原有行为；
  //   声明但 trim 后为空：CI 里 `NOLO_DESKTOP_APP_VERSION: ${{ inputs.version }}`
  //     若因误配展开成空串，回退会静默把 alpha 版本号烘焙进发布包——包能装能跑、
  //     版本是错的、没有任何检查会发现。所以这里必须 fail-closed。
  if ("NOLO_DESKTOP_APP_VERSION" in process.env) {
    const injected = process.env.NOLO_DESKTOP_APP_VERSION?.trim();
    if (!injected) {
      throw new Error(
        "NOLO_DESKTOP_APP_VERSION is set but blank — refusing to fall back to packages/desktop/package.json (that would bake a stale version into the release)",
      );
    }
    return injected;
  }

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
