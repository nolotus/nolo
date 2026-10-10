/**
 * 附件来源解析（设计 §3/§8 的「共用 resolve」步骤）—— **平台无关、纯判定**。
 *
 * 本模块**不直接碰 fs / network、不读取任何内容**：权限判定、原件可达性预检、**处理时**内容指纹
 * 全部由调用方注入适配器（Web / 桌面 / TUI / RN 各自实现）。它把
 * 「同机定位 → 授权 → 可达性预检 → 可复用性核验」判成一个判别联合：
 * `ready / unavailable / denied / changed / unsupported`，**永不返回空、永不静默回退、永不抛错**。
 *
 * 阶段语义（不要互相冒充）：
 * - `ready` = **授权通过**，且（仅当注入了对应 probe 端口时）**原件可达性已确认**。`located` 字段
 *   标明是否真的走过 probe：`false` = 只判到「授权 + 元数据」，**不代表内容已读取**（本模块不读内容）。
 * - `denied` = 授权失败，**在其之前不读任何原件信息**（不 probe、不 hash）。
 * - `changed` = 预检/指纹结论为「可能已变 或 无法核验复用」→ 要求重新处理，绝不沿用旧派生。
 * - `unavailable` = 当前不可用（异机/未绑定、原件不在、缺端内句柄、指纹采集失败、注入的适配器抛错）。
 * - `unsupported` = 契约层不认识（坏 part / 未知 v / 未知 source）。
 *
 * 红线：
 * - **授权适配器必须拿到端内 locator**（path / workspaceRoot），才能核验真实路径、符号链接与越界；
 *   **不能只凭 machineId 就放行、然后去读任意 path**。locator 只进端内适配器，
 *   **绝不进 `safeDescription`，绝不回传远端/模型上下文**。
 * - **不含路径**：返回给执行层的 `ref` 是 remote 的不可变 fileKey 或端内不透明句柄。
 * - `machineId` 是**定位不是授权**：同机判定只回答「本机有没有这个原件」，授权另判。
 * - `size` / `mtimeMs` 只是**预检**；派生复用的唯一依据是**处理时**内容指纹，且**旧基线缺失即拒用**。
 * - 不实现任何解析器、转写或下载；不实现网络。
 */
import {
  attachmentKind,
  describeAttachmentForModel,
  describeValidatedAttachment,
  normalizeAttachmentPart,
  type AttachmentKind,
  type AttachmentSource,
  type ValidatedAttachment,
} from "./attachmentPart";

/** 端内定位信息：只交给注入的适配器，绝不回传远端、绝不进模型上下文。 */
export interface LocalLocator {
  path: string;
  workspaceRoot?: string;
}

export type AuthorizeRequest =
  | { kind: "remote-file"; fileKey: string }
  /** 端内适配器必须按 `locator` 核验真实路径/符号链接/越界，而不是只凭 machineId 放行。 */
  | { kind: "local-file"; machineId: string; locator: LocalLocator };

export interface AuthorizeDecision {
  allowed: boolean;
  /** 拒绝原因（可见降级用；不得含路径）。 */
  reason?: string;
}

/** 同机 local 的只读预检结果。`handle` 是端内不透明句柄（不含路径），执行层靠它定位。 */
export interface LocalSourceProbe {
  exists: boolean;
  size?: number;
  mtimeMs?: number;
  handle?: string;
}

/** remote 原件可达性预检结果（由端内/服务侧适配器实现；本模块不做网络）。 */
export interface RemoteSourceProbe {
  exists: boolean;
}

export interface AttachmentSourcePorts {
  /** 当前执行端的可信机器身份；`null` = 未绑定（不猜、不放行）。 */
  currentMachineId(): string | null | Promise<string | null>;
  /** 权限适配器（必注入；本模块绝不自行放行，拒绝即不读原件）。 */
  authorize(request: AuthorizeRequest): AuthorizeDecision | Promise<AuthorizeDecision>;
  /** 同机 local 预检 + 端内句柄；缺失 = 本机无法定位。 */
  probeLocalFile?(locator: LocalLocator): LocalSourceProbe | null | Promise<LocalSourceProbe | null>;
  /** remote 原件可达性预检；不注入 = 只判授权与元数据（`located:false`），不暗示已读内容。 */
  probeRemoteFile?(fileKey: string): RemoteSourceProbe | null | Promise<RemoteSourceProbe | null>;
  /** **处理时**内容指纹（sha256 等）：派生复用的唯一依据。 */
  fingerprintLocalFile?(locator: LocalLocator): string | null | Promise<string | null>;
}

/** 想复用既有派生时提供的上次记录（旧指纹 = 复用核验基线，mtime = 仅预检）。 */
export interface PriorAttachmentDerivation {
  contentHash?: string;
  mtimeMs?: number;
}

export interface ResolveOptions {
  /** 复用既有派生：**旧 `contentHash` 缺失/空即拒用**（不会用新指纹替换缺失的旧基线）。 */
  prior?: PriorAttachmentDerivation;
  /** 明确请求为「初次处理」采集一次内容指纹；不传就绝不 hash 整个文件。 */
  fingerprint?: boolean;
}

export interface ResolvedAttachment {
  /** 执行层引用：remote = 不可变 fileKey；local = 端内不透明句柄。**都不含路径。** */
  ref: string;
  sourceKind: AttachmentSource["kind"];
  kind: AttachmentKind;
  name: string;
  mimeType: string;
  size: number;
  /**
   * 原件可达性是否已由注入的 probe 端口确认（remote: `probeRemoteFile`；local: `probeLocalFile`）。
   * `false` = 只判到「授权 + 元数据」。**两种都不代表内容已读取**。
   */
  located: boolean;
  /** 处理时算出的内容指纹（仅 local 且明确采集或复用核验成功时才有）。 */
  contentHash?: string;
  /** 可安全回传远端的最小描述（永不含 locator / 异常原文）。 */
  safeDescription: string;
}

export type SourceResolution =
  | { status: "ready"; attachment: ResolvedAttachment }
  | {
      status: "unavailable";
      reason:
        | "machine-unbound"
        | "machine-mismatch"
        | "local-missing"
        | "remote-missing"
        | "locator-missing"
        | "fingerprint-unavailable"
        | "adapter-failed";
      safeDescription: string;
    }
  | { status: "denied"; reason: "forbidden"; safeDescription: string }
  | {
      status: "changed";
      reason: "size-mismatch" | "mtime-mismatch" | "hash-mismatch" | "hash-unavailable";
      safeDescription: string;
    }
  | {
      status: "unsupported";
      reason: "invalid-part" | "unknown-version" | "unknown-source" | "missing-metadata";
      safeDescription: string;
    };

/** 注入适配器抛错 → 收敛成可辨识结果；异常原文一律不进入任何返回值。 */
type PortResult<T> = { ok: true; value: T } | { ok: false };

const callPort = async <T>(call: () => T | Promise<T>): Promise<PortResult<T>> => {
  try {
    return { ok: true, value: await call() };
  } catch {
    return { ok: false };
  }
};

const isUsableHash = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const locatorOf = (source: Extract<AttachmentSource, { kind: "local-file" }>): LocalLocator => ({
  path: source.path,
  ...(source.workspaceRoot ? { workspaceRoot: source.workspaceRoot } : {}),
});

const resolved = (
  attachment: ValidatedAttachment,
  ref: string,
  extra: { located: boolean; contentHash?: string },
): ResolvedAttachment => ({
  ref,
  sourceKind: attachment.source.kind,
  kind: attachmentKind(attachment),
  name: attachment.name,
  mimeType: attachment.mimeType,
  size: attachment.size,
  located: extra.located,
  ...(extra.contentHash ? { contentHash: extra.contentHash } : {}),
  safeDescription: describeValidatedAttachment(attachment),
});

/**
 * 解析一个附件 part 当前是否可用（发送前/使用前的准备步骤；写入侧归一化见 `normalizeAttachmentPart`）。
 * 坏数据、未知版本、异机、无权限、源已变、适配器故障 → 一律返回**显式降级**结果；本函数**不抛错**。
 */
export const resolveAttachmentSource = async (
  part: unknown,
  ports: AttachmentSourcePorts,
  options: ResolveOptions = {},
): Promise<SourceResolution> => {
  const normalized = normalizeAttachmentPart(part);
  if (normalized.status === "unsupported-version") {
    return {
      status: "unsupported",
      reason: "unknown-version",
      safeDescription: describeAttachmentForModel(part),
    };
  }
  if (normalized.status === "invalid") {
    const reason =
      normalized.reason === "not-attachment"
        ? "invalid-part"
        : normalized.reason === "missing-metadata"
          ? "missing-metadata"
          : "unknown-source";
    return { status: "unsupported", reason, safeDescription: describeAttachmentForModel(part) };
  }

  const attachment = normalized.attachment;
  const source = attachment.source;
  const safeDescription = describeValidatedAttachment(attachment);

  if (source.kind === "remote-file") {
    const authorized = await callPort(() =>
      ports.authorize({ kind: "remote-file", fileKey: source.fileKey }),
    );
    if (!authorized.ok) return { status: "unavailable", reason: "adapter-failed", safeDescription };
    if (!authorized.value.allowed) {
      return { status: "denied", reason: "forbidden", safeDescription };
    }
    // 授权 ≠ 可达：只有注入了可达性端口才敢说「定位已确认」，也才可能发现原件缺失。
    if (ports.probeRemoteFile) {
      const probePort = ports.probeRemoteFile;
      const probed = await callPort(() => probePort(source.fileKey));
      if (!probed.ok) return { status: "unavailable", reason: "adapter-failed", safeDescription };
      if (!probed.value || !probed.value.exists) {
        return { status: "unavailable", reason: "remote-missing", safeDescription };
      }
      return {
        status: "ready",
        attachment: resolved(attachment, source.fileKey, { located: true }),
      };
    }
    return { status: "ready", attachment: resolved(attachment, source.fileKey, { located: false }) };
  }

  // local-file：先定位（同机），再授权（拿到端内 locator），最后才预检 / 算指纹 —— 前面任一关不过都不读原件。
  const machine = await callPort(() => ports.currentMachineId());
  if (!machine.ok) return { status: "unavailable", reason: "adapter-failed", safeDescription };
  if (!machine.value) return { status: "unavailable", reason: "machine-unbound", safeDescription };
  if (machine.value !== source.machineId) {
    return { status: "unavailable", reason: "machine-mismatch", safeDescription };
  }
  const locator = locatorOf(source);
  const authorized = await callPort(() =>
    ports.authorize({ kind: "local-file", machineId: source.machineId, locator }),
  );
  if (!authorized.ok) return { status: "unavailable", reason: "adapter-failed", safeDescription };
  if (!authorized.value.allowed) {
    // 授权失败不读原件：probe / 指纹一个都不调用。
    return { status: "denied", reason: "forbidden", safeDescription };
  }

  const probePort = ports.probeLocalFile;
  const probed: PortResult<LocalSourceProbe | null> = probePort
    ? await callPort(() => probePort(locator))
    : { ok: true, value: null };
  if (!probed.ok) return { status: "unavailable", reason: "adapter-failed", safeDescription };
  const probe = probed.value;
  if (!probe || !probe.exists) {
    return { status: "unavailable", reason: "local-missing", safeDescription };
  }
  // size 只是预检（发送时快照 vs 现在 stat）：不符即按「可能已变」处理。
  if (typeof probe.size === "number" && probe.size !== attachment.size) {
    return { status: "changed", reason: "size-mismatch", safeDescription };
  }
  if (!probe.handle) {
    // 端内句柄缺失 = 执行层没有不含路径的定位手段，不做「顺手把路径递出去」的降级。
    return { status: "unavailable", reason: "locator-missing", safeDescription };
  }

  const prior = options.prior;
  let contentHash: string | undefined;
  if (prior) {
    if (
      typeof prior.mtimeMs === "number" &&
      typeof probe.mtimeMs === "number" &&
      prior.mtimeMs !== probe.mtimeMs
    ) {
      return { status: "changed", reason: "mtime-mismatch", safeDescription };
    }
    // 旧基线缺失/空 → 直接拒用复用；绝不用「新指纹」替换缺失的旧基线然后 ready。
    if (!isUsableHash(prior.contentHash)) {
      return { status: "changed", reason: "hash-unavailable", safeDescription };
    }
    const hashed = await callPort(async () =>
      ports.fingerprintLocalFile ? ports.fingerprintLocalFile(locator) : null,
    );
    if (!hashed.ok) return { status: "unavailable", reason: "adapter-failed", safeDescription };
    if (!isUsableHash(hashed.value)) {
      return { status: "changed", reason: "hash-unavailable", safeDescription };
    }
    if (hashed.value !== prior.contentHash) {
      return { status: "changed", reason: "hash-mismatch", safeDescription };
    }
    contentHash = hashed.value;
  } else if (options.fingerprint) {
    // 初次处理：指纹采集必须被明确请求（普通 metadata 准备不 hash 整个文件）。
    const hashed = await callPort(async () =>
      ports.fingerprintLocalFile ? ports.fingerprintLocalFile(locator) : null,
    );
    if (!hashed.ok) return { status: "unavailable", reason: "adapter-failed", safeDescription };
    if (!isUsableHash(hashed.value)) {
      return { status: "unavailable", reason: "fingerprint-unavailable", safeDescription };
    }
    contentHash = hashed.value;
  }

  return {
    status: "ready",
    attachment: resolved(attachment, probe.handle, { located: true, contentHash }),
  };
};
