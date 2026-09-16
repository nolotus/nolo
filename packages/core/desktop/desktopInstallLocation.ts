// packages/core/desktop/desktopInstallLocation.ts
//
// 判断当前运行的桌面应用是否位于 electrobun 的「受管理更新目录」内。
//
// 背景（2026-09-16 实测）：electrobun 的 Updater 在 apply/download 阶段要求
//   execPath 的「父父目录」正好是 <dataBase>/<identifier> 的直接子目录：
//     linux:  ${XDG_DATA_HOME:-~/.local/share}/chat.nolo.desktop/<channel>/app/bin/launcher
//     win:    %LOCALAPPDATA%\chat.nolo.desktop\<channel>\app\bin\launcher.exe
//     macos:  不走该检查（app 在 /Applications 内原地替换，天然可用）
// 而 Linux 的 .deb/.rpm 装到 /opt/nolo-desktop、Windows 的 Inno 安装器装到
// %LOCALAPPDATA%\Programs\...，都在受管理目录之外：这类安装能检查更新，但点
// 「下载/安装」会被 electrobun 拒绝（"outside its managed update directory"）。
// 这里把这个判定提前搬到我们的代码里，让更新面板能给出诚实的引导，而不是等
// 用户点了才报错。

import { posix as posixPath, win32 as win32Path } from "node:path";

export const ELECTROBUN_MANAGED_IDENTIFIER = "chat.nolo.desktop";

export type DesktopInstallLocation = "managed" | "external";

export type DesktopInstallLocationInput = {
  platform: "linux" | "win" | "macos";
  /** 运行中可执行文件路径（process.execPath）。 */
  execPath: string;
  homeDir: string;
  xdgDataHome?: string | null;
  localAppData?: string | null;
  identifier?: string;
};

const isUsableXdgDataHome = (value?: string | null): value is string => {
  const trimmed = value?.trim();
  return Boolean(trimmed) && trimmed!.startsWith("/") && trimmed !== "/";
};

export function resolveDesktopInstallLocation(
  input: DesktopInstallLocationInput
): DesktopInstallLocation {
  const { platform, execPath, homeDir } = input;
  if (platform === "macos") return "managed";

  const pathApi = platform === "win" ? win32Path : posixPath;
  const identifier = input.identifier ?? ELECTROBUN_MANAGED_IDENTIFIER;
  const baseDir =
    platform === "win"
      ? input.localAppData?.trim() || pathApi.join(homeDir, "AppData", "Local")
      : isUsableXdgDataHome(input.xdgDataHome)
        ? pathApi.resolve(input.xdgDataHome.trim())
        : pathApi.join(homeDir, ".local", "share");

  const managedRoot = pathApi.resolve(pathApi.join(baseDir, identifier));
  // electrobun 的判定：dirname(execPath) 的“父父目录”的父目录必须等于 managedRoot。
  const channelRoot = pathApi.resolve(pathApi.dirname(execPath), "..", "..");
  const parentOfChannelRoot = pathApi.resolve(pathApi.dirname(channelRoot));
  const normalize = (value: string) => (platform === "win" ? value.toLowerCase() : value);
  return normalize(parentOfChannelRoot) === normalize(managedRoot) ? "managed" : "external";
}
