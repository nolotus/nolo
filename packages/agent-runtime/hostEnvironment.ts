/**
 * 宿主环境上下文层（Host Environment Context Layer）。
 *
 * 在 TUI 桌面端、CLI 和 Desktop Runtime 启动或组装上下文时，
 * 快速（<1ms）读取当前宿主的操作系统、架构、桌面环境与 Shell，
 * 作为静态会话层（cacheScope: "session"）注入系统上下文。
 *
 * 避免 Agent 在排查本机问题时误判操作系统（如将 Linux 错认为 Windows）。
 */

import { existsSync, readFileSync } from "node:fs";
import os from "node:os";

import { type TurnContextLayer } from "./turnContext";

export interface HostEnvironmentDetails {
  platform: string;
  osName: string;
  arch: string;
  desktop?: string;
  sessionType?: string;
  shell?: string;
}

export interface HostEnvironmentProbeOptions {
  platform?: string;
  arch?: string;
  release?: string;
  env?: Record<string, string | undefined>;
  osReleaseContent?: string;
}

function parseLinuxOsRelease(content: string): string | undefined {
  let prettyName: string | undefined;
  let name: string | undefined;
  let version: string | undefined;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }

    if (key === "PRETTY_NAME") {
      prettyName = val;
    } else if (key === "NAME") {
      name = val;
    } else if (key === "VERSION") {
      version = val;
    }
  }

  if (prettyName) return prettyName;
  if (name && version) return `${name} ${version}`;
  return name;
}

export function probeHostEnvironment(
  options?: HostEnvironmentProbeOptions,
): HostEnvironmentDetails {
  const platform = options?.platform ?? process.platform;
  const arch = options?.arch ?? os.arch();
  const release = options?.release ?? os.release();
  const env = options?.env ?? process.env;

  let osName = `${platform} ${release}`;

  if (platform === "linux") {
    let osReleaseText = options?.osReleaseContent;
    if (osReleaseText === undefined) {
      try {
        if (existsSync("/etc/os-release")) {
          osReleaseText = readFileSync("/etc/os-release", "utf8");
        } else if (existsSync("/usr/lib/os-release")) {
          osReleaseText = readFileSync("/usr/lib/os-release", "utf8");
        }
      } catch {
        // read failure, fall back to Linux release
      }
    }

    if (osReleaseText) {
      const parsed = parseLinuxOsRelease(osReleaseText);
      if (parsed) {
        osName = parsed;
      } else {
        osName = `Linux ${release}`;
      }
    } else {
      osName = `Linux ${release}`;
    }
  } else if (platform === "darwin") {
    osName = `macOS (${release})`;
  } else if (platform === "win32") {
    osName = `Windows (${release})`;
  }

  const desktop =
    env.XDG_CURRENT_DESKTOP ||
    env.XDG_SESSION_DESKTOP ||
    env.DESKTOP_SESSION ||
    undefined;

  const sessionType = env.XDG_SESSION_TYPE || undefined;

  const shell =
    env.SHELL ||
    (platform === "win32" ? env.COMSPEC || "PowerShell" : undefined);

  return {
    platform,
    osName,
    arch,
    desktop,
    sessionType,
    shell,
  };
}

export function formatHostEnvironmentContent(
  details: HostEnvironmentDetails,
): string {
  const lines: string[] = ["--- 宿主环境（Host Environment）---"];

  lines.push(`操作系统: ${details.osName} (${details.arch})`);

  if (details.desktop || details.sessionType) {
    const desktopParts: string[] = [];
    if (details.desktop) desktopParts.push(details.desktop);
    if (details.sessionType) desktopParts.push(details.sessionType);
    lines.push(`桌面环境: ${desktopParts.join(" / ")}`);
  }

  if (details.shell) {
    lines.push(`默认 Shell: ${details.shell}`);
  }

  return lines.join("\n");
}

let cachedLayer: TurnContextLayer | null = null;

/**
 * 构建宿主环境上下文层。
 * 进程级单例缓存，session 级缓存范围。
 */
export function buildHostEnvironmentLayer(
  options?: HostEnvironmentProbeOptions,
): TurnContextLayer {
  if (!options && cachedLayer) {
    return cachedLayer;
  }

  const details = probeHostEnvironment(options);
  const content = formatHostEnvironmentContent(details);

  const layer: TurnContextLayer = {
    id: "host-environment",
    owner: "runtime",
    cacheScope: "session",
    content,
  };

  if (!options) {
    cachedLayer = layer;
  }

  return layer;
}

export function clearHostEnvironmentCacheForTesting(): void {
  cachedLayer = null;
}
