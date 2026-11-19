import { hostname } from "node:os";
import { isAbsolute, relative } from "node:path";
import type { LocalAgentToolImageArtifact } from "../../agent-runtime/localLoopContract";
import { isRemoteSession } from "./clipboardImage";
import { sanitizeImageLabel } from "./tuiImageLayout";

export const DEFAULT_MAX_TURN_IMAGE_ARTIFACTS = 4;

/**
 * 结构化图片产物元数据（仅来自工具结果事件，绝不做文件系统 stat/读盘，也不从回复正文猜路径）。
 */
export type TurnImageArtifact = {
  readonly artifactIndex: number;
  readonly kind: "screenshot" | "image";
  /** 工具回报的原始路径（用于复制路径）。 */
  readonly path: string;
  /** 面向用户展示的路径（在当前 cwd 内时缩短为相对路径，已净化控制字符）。 */
  readonly displayPath: string;
  /** 标明该图片文件所在机器。 */
  readonly hostLabel: string;
  readonly width?: number;
  readonly height?: number;
  readonly bytes?: number;
};

/**
 * 纯字符串路径展示格式化：绝不触发 stat / realpath / 网络访问。
 * 若路径位于 cwd 子目录内则显示相对路径（例如 `artifacts/foo.png`），否则保留净化后的原路径。
 */
export function formatArtifactDisplayPath(rawPath: string, cwd?: string): string {
  const safe = sanitizeImageLabel(rawPath);
  if (!cwd) return safe;
  // Windows UNC / 远端共享路径一律原样返回，不做相对化计算。
  if (rawPath.startsWith("\\\\") || rawPath.startsWith("//")) return safe;
  if (isAbsolute(rawPath) && isAbsolute(cwd)) {
    const rel = relative(cwd, rawPath);
    if (rel && !rel.startsWith("..") && !isAbsolute(rel)) {
      return sanitizeImageLabel(rel);
    }
  }
  return safe;
}

/**
 * 解析产物文件所在机器标签：
 * - 工具在绑定远端设备执行时使用该设备名；
 * - 处于 SSH 远程会话时标明远端主机名；
 * - 否则标明本机（含主机名）。
 */
export function resolveArtifactHostLabel(options: {
  env?: Record<string, string | undefined>;
  toolExecutionDeviceName?: string;
  localHostname?: string;
} = {}): string {
  const remoteDevice = options.toolExecutionDeviceName
    ? sanitizeImageLabel(options.toolExecutionDeviceName)
    : "";
  if (remoteDevice) return remoteDevice;
  const host = sanitizeImageLabel(options.localHostname ?? hostname());
  if (isRemoteSession(options.env ?? {})) {
    return host && host !== "image" ? `远端 (${host})` : "远端主机";
  }
  return host && host !== "image" ? `本机 (${host})` : "本机";
}

export type BuildTurnImageArtifactsOptions = {
  toolArtifacts?: readonly LocalAgentToolImageArtifact[];
  cwd?: string;
  hostLabel: string;
  startIndex?: number;
  maxImages?: number;
};

/**
 * 100% 纯函数：仅把显式工具产物（`toolArtifacts`）规整、去重、编号为 `TurnImageArtifact[]`。
 * 不读取文件系统（无 stat / open / realpath），不从 assistant 正文正则猜路径。
 */
export function buildTurnImageArtifacts(
  options: BuildTurnImageArtifactsOptions,
): TurnImageArtifact[] {
  const maxImages = Math.max(0, options.maxImages ?? DEFAULT_MAX_TURN_IMAGE_ARTIFACTS);
  if (maxImages === 0 || !options.toolArtifacts?.length) return [];
  const startIndex = Math.max(1, options.startIndex ?? 1);
  const hostLabel = sanitizeImageLabel(options.hostLabel);

  const out: TurnImageArtifact[] = [];
  const seen = new Set<string>();
  for (const item of options.toolArtifacts) {
    if (out.length >= maxImages) break;
    const rawPath = typeof item?.path === "string" ? item.path.trim() : "";
    // eslint-disable-next-line no-control-regex
    if (!rawPath || /[\u0000-\u001f\u007f]/.test(rawPath)) continue;
    if (/^(?:https?|data|javascript):/i.test(rawPath)) continue;
    if (seen.has(rawPath)) continue;
    seen.add(rawPath);

    out.push({
      artifactIndex: startIndex + out.length,
      kind: item.kind === "image" ? "image" : "screenshot",
      path: rawPath,
      displayPath: formatArtifactDisplayPath(rawPath, options.cwd),
      hostLabel,
      ...(typeof item.width === "number" && item.width > 0 ? { width: item.width } : {}),
      ...(typeof item.height === "number" && item.height > 0 ? { height: item.height } : {}),
      ...(typeof item.bytes === "number" && item.bytes > 0 ? { bytes: item.bytes } : {}),
    });
  }
  return out;
}

/**
 * 渲染单行可选中纯文本产物提示：
 * 例如：`截图 · artifacts/foo.png (1280×720) · 本机 (devbox)`
 */
export function formatImageArtifactLine(artifact: TurnImageArtifact): string {
  const prefix = artifact.kind === "image" ? "图片" : "截图";
  const dims =
    artifact.width && artifact.height ? ` (${artifact.width}×${artifact.height})` : "";
  return `${prefix} · ${artifact.displayPath}${dims} · ${artifact.hostLabel}`;
}

export function formatArtifactChoiceLabel(
  artifact: Pick<TurnImageArtifact, "artifactIndex" | "kind" | "displayPath" | "hostLabel">,
): string {
  const prefix = artifact.kind === "image" ? "图片" : "截图";
  return `#${artifact.artifactIndex} · ${prefix} · ${artifact.displayPath} (${artifact.hostLabel})`;
}

/** 从历史对话 turns 收集所有显式工具图片产物。 */
export function collectConversationImageArtifacts(
  turns: ReadonlyArray<{ imageArtifacts?: readonly TurnImageArtifact[] }>,
): TurnImageArtifact[] {
  const out: TurnImageArtifact[] = [];
  for (const turn of turns) {
    if (!turn?.imageArtifacts?.length) continue;
    out.push(...turn.imageArtifacts);
  }
  return out;
}
