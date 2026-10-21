// packages/cli/client/localInstaboxFileBridge.ts
//
// Instabox 专属文件工具桥（adapter）。目标：在同一条 ExecutionLease 里给出
// **固定工作目录**，并把 readFile / writeFile / editFile / globFiles 变成容器内
// 结构化调用，而不是每调用一次就重建机器、更不是回落到宿主工具。
//
// 复用（只读 import，不修改共享实现）：
//   - `buildWorkspaceHelperSource()`：容器内 helper 的唯一真值（文件 op 协议、
//     输出预算、路径逃逸校验都在这里），专属适配只替换它的 ROOT 常量；
//   - `parseToolOutput()`：helper 的 `{ok,value}` envelope 解析；
//   - `SANDBOX_OUTPUT_LIMITS`：内容 / argv 体积上限，与 docker 通道同一预算。
//
// 三个硬约束（与 instaboxBackend 的既有事实一致，不猜）：
// 1. 本适配目前**只接** shell `cmd` 通道（见 instaboxBackend 的 exec API 注释）：
//    helper argv 由后端逐 token 转义拼接，所以这里只产出 argv，不自己拼 shell。
//    若供应商后续提供原生文件 API，另开通道接入——此处结论只覆盖「当前接了哪种」。
// 2. 模板里的运行时二进制不可假设：先探测 bun / node，**探测不到就显式标记
//    bridge 未就绪并拒绝文件工具**，绝不宣布「bridge 就绪」。
// 3. 就绪要有实测证据：上传后用 helper 真的读一次探针文件，读通才算 ready。

import {
  buildWorkspaceHelperSource,
  parseToolOutput,
  SANDBOX_HELPER_PATH,
  SANDBOX_OUTPUT_LIMITS,
} from "../../agent-runtime/docker/sandboxWorkspaceHelper";
import type { ExecutionRequest } from "../../agent-runtime/executionBackend";

/** 容器内 helper 路径：与 docker 通道同一位置（不同沙盒互不可见，无冲突）。 */
export const INSTABOX_HELPER_PATH = SANDBOX_HELPER_PATH;

/** 本适配钉住的默认固定工作目录（可用 env INSTABOX_WORKSPACE_ROOT 覆盖）。 */
export const INSTABOX_WORKSPACE_ROOT = "/data/home";

/** 由本适配器桥接给模型的结构化文件工具（其余工具一律显式拒绝）。 */
export const INSTABOX_FILE_TOOL_NAMES = [
  "readFile",
  "writeFile",
  "editFile",
  "globFiles",
] as const;

export type InstaboxFileToolName = (typeof INSTABOX_FILE_TOOL_NAMES)[number];

/** 探测到的容器内运行时；null = 模板里没有可用 JS 运行时。 */
export type InstaboxRuntimeBinary = "bun" | "node";

export type InstaboxBridgeProbe = {
  /** 容器内**固定**工作目录绝对值；null = 未建成。 */
  root: string | null;
  runtime: InstaboxRuntimeBinary | null;
  /** helper 上传并实测读通 = ready；file 工具只在 ready 时才可用。 */
  ready: boolean;
  /** 未就绪原因（稳定码，可直接进 model-facing 文案）。 */
  reason?: "runtime_missing" | "root_unavailable" | "upload_failed" | "probe_failed" | "root_mismatch" | "helper_source_invalid";
};

const PROBE_FILE_NAME = "nolo-bridge-probe";

/** runId → shell 安全的探测文件前缀（只允许 [A-Za-z0-9._-]，其余折叠为 -）。 */
function escapeForShell(value: string): string {
  const cleaned = String(value).replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 40);
  return cleaned || "run";
}
const PROBE_FILE_CONTENT = "nolo-bridge-ok";

function posixQuote(value: string): string {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

/**
 * 把共享 helper 源码的 ROOT 换成 Instabox 的固定工作目录。
 * 用显式断言替换而不是字符串裸 replace：helper 真值一旦改形，这里立刻失败
 * （`instabox_helper_root_patch_failed`），不会静默把文件写到容器里别的地方。
 */
export function buildInstaboxHelperSource(root: string): string {
  const source = buildWorkspaceHelperSource();
  const rootLiteral = /const ROOT = "[^"]*";/;
  if (!rootLiteral.test(source)) {
    throw new Error("instabox_helper_root_patch_failed");
  }
  if (!root.startsWith("/") || root.includes('"') || root.includes("\\")) {
    throw new Error("instabox_invalid_workspace_root");
  }
  return source.replace(rootLiteral, `const ROOT = "${root}";`);
}

/**
 * bootstrap 脚本：**幂等**，只在 workload 创建时执行一次。
 * 依次：选定固定工作目录 → 探测运行时 → 上传 helper → 写探针文件。
 * 输出固定 marker 行，供调用方解析成真实结论（不靠「应该能跑」推断）。
 */
export function buildInstaboxBridgeBootstrapScript(root: string, probeId: string): string {
  let helperPayload: string;
  if (!root.startsWith("/") || root.includes('"') || root.includes("\\")) {
    return `printf 'NOLO_BRIDGE_REASON=root_unavailable\n'`;
  }
  try {
    // ROOT 常量与**唯一** pin 的目录一致；不做多候选回退，避免 ticket 声明的
    // 可写根与实际 cwd 漂移（不可写就如实 root_unavailable）。
    helperPayload = Buffer.from(buildInstaboxHelperSource(root), "utf8").toString("base64");
  } catch (error) {
    return `printf 'NOLO_BRIDGE_REASON=helper_source_invalid\n'`;
  }
  const dir = INSTABOX_HELPER_PATH.slice(0, INSTABOX_HELPER_PATH.lastIndexOf("/"));
  return [
    `root=${posixQuote(root)}`,
    `mkdir -p "$root" 2>/dev/null || true`,
    `if [ ! -w "$root" ]; then printf 'NOLO_BRIDGE_REASON=root_unavailable\\n'; exit 0; fi`,
    `printf 'NOLO_BRIDGE_ROOT=%s\\n' "$root"`,
    "rt=''",
    `for cand in bun node; do if command -v "$cand" >/dev/null 2>&1; then rt="$cand"; break; fi; done`,
    `printf 'NOLO_BRIDGE_RUNTIME=%s\\n' "\${rt:-none}"`,
    `if [ -z "$rt" ]; then printf 'NOLO_BRIDGE_REASON=runtime_missing\\n'; exit 0; fi`,
    `mkdir -p ${posixQuote(dir)} 2>/dev/null || true`,
    `if ! printf %s ${posixQuote(helperPayload)} | base64 -d > ${posixQuote(INSTABOX_HELPER_PATH)}; then printf 'NOLO_BRIDGE_REASON=upload_failed\\n'; exit 0; fi`,
    `chmod 0644 ${posixQuote(INSTABOX_HELPER_PATH)} 2>/dev/null || true`,
    // 探针文件名带本次 run 的唯一 id：**只创建自己的**，绝不覆盖/删除同名既有文件
    `probe=$root/${escapeForShell(probeId)}-${PROBE_FILE_NAME}`,
    `if [ -e "$probe" ]; then printf 'NOLO_BRIDGE_REASON=probe_failed\\n'; exit 0; fi`,
    `printf %s ${posixQuote(PROBE_FILE_CONTENT)} > "$probe" || { printf 'NOLO_BRIDGE_REASON=upload_failed\\n'; exit 0; }`,
    `printf 'NOLO_BRIDGE_PROBE=%s\\n' "$probe"`,
    `printf 'NOLO_BRIDGE_UPLOAD=ok\\n'`,
  ].join("\n");
}

/** bootstrap 输出的 marker 解析：只认自己打印的键值，其它输出忽略。 */
export function parseInstaboxBootstrapOutput(
  stdout: string,
): {
  root: string | null;
  runtime: InstaboxRuntimeBinary | null;
  probePath: string | null;
  reason?: InstaboxBridgeProbe["reason"];
} {
  let root: string | null = null;
  let probePath: string | null = null;
  let runtime: InstaboxRuntimeBinary | null = null;
  let reason: InstaboxBridgeProbe["reason"] | undefined;
  let uploadOk = false;
  for (const rawLine of stdout.split(String.fromCharCode(10))) {
    const line = rawLine.trim();
    if (line.startsWith("NOLO_BRIDGE_ROOT=")) {
      const value = line.slice("NOLO_BRIDGE_ROOT=".length).trim();
      root = value.startsWith("/") ? value : null;
    } else if (line.startsWith("NOLO_BRIDGE_RUNTIME=")) {
      const value = line.slice("NOLO_BRIDGE_RUNTIME=".length).trim();
      runtime = value === "bun" || value === "node" ? value : null;
    } else if (line.startsWith("NOLO_BRIDGE_UPLOAD=")) {
      uploadOk = line.slice("NOLO_BRIDGE_UPLOAD=".length).trim() === "ok";
    } else if (line.startsWith("NOLO_BRIDGE_PROBE=")) {
      const value = line.slice("NOLO_BRIDGE_PROBE=".length).trim();
      probePath = value.startsWith("/") ? value : null;
    } else if (line.startsWith("NOLO_BRIDGE_REASON=")) {
      const value = line.slice("NOLO_BRIDGE_REASON=".length).trim();
      reason =
        value === "runtime_missing" ||
        value === "root_unavailable" ||
        value === "upload_failed" ||
        value === "probe_failed" ||
        value === "root_mismatch" ||
        value === "helper_source_invalid"
          ? value
          : "probe_failed";
    }
  }
  if (!root) return { root: null, runtime: null, probePath: null, reason: reason ?? "root_unavailable" };
  if (!runtime) return { root, runtime: null, probePath, reason: reason ?? "runtime_missing" };
  if (!uploadOk) return { root, runtime, probePath, reason: reason ?? "upload_failed" };
  if (!probePath) return { root, runtime, probePath: null, reason: reason ?? "probe_failed" };
  return { root, runtime, probePath };
}

/**
 * 路径解析：与共享 helper 的 `resolvePath` 同一规则（绝对路径必须落在固定 root
 * 内、相对路径 join 后不得逃逸）。在宿主侧先判一次，好在不发请求时就给出稳定错误码。
 */
export function resolveInstaboxPath(
  root: string,
  input: string,
): { ok: true; path: string } | { ok: false; error: string } {
  if (typeof input !== "string" || !input.trim() || input.includes("\0")) {
    return { ok: false, error: "invalid_path" };
  }
  const normalizedRoot = root.endsWith("/") ? root.slice(0, -1) : root;
  const isAbs = input.startsWith("/");
  if (isAbs && input !== normalizedRoot && !input.startsWith(`${normalizedRoot}/`)) {
    return { ok: false, error: "path_outside_workspace" };
  }
  const resolved = isAbs
    ? posixNormalize(input)
    : posixNormalize(`${normalizedRoot}/${input}`);
  if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}/`)) {
    return { ok: false, error: "path_escape" };
  }
  return { ok: true, path: resolved };
}

function posixNormalize(input: string): string {
  const parts: string[] = [];
  for (const segment of input.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  return `/${parts.join("/")}`;
}

/**
 * 结构化文件工具 → helper argv。
 * 形状与共享 `buildToolInvocation` 一致：`[<runtime>, <helperPath>, <base64 payload>]`，
 * 只有运行时二进制与 root 换成 Instabox 探测到的真值。
 * 体积上限沿用共享预算：大文件 / 整仓内容不会被 base64-over-exec 放大传输。
 */
export function buildInstaboxToolArgv(
  toolName: string,
  args: Record<string, unknown>,
  bridge: { root: string; runtime: InstaboxRuntimeBinary },
): { ok: true; argv: string[] } | { ok: false; error: string } {
  const validated: Record<string, unknown> = {};
  let op: string;

  switch (toolName) {
    case "readFile": {
      const res = resolveInstaboxPath(bridge.root, String(args.path ?? ""));
      if (!res.ok) return { ok: false, error: res.error };
      op = "readFile";
      validated.path = res.path;
      if (typeof args.lines === "string") validated.lines = args.lines;
      break;
    }
    case "writeFile": {
      if (typeof args.content !== "string") return { ok: false, error: "missing_content" };
      if (Buffer.byteLength(args.content, "utf-8") > SANDBOX_OUTPUT_LIMITS.maxContentBytes) {
        return { ok: false, error: "content_too_large" };
      }
      const res = resolveInstaboxPath(bridge.root, String(args.path ?? ""));
      if (!res.ok) return { ok: false, error: res.error };
      op = "writeFile";
      validated.path = res.path;
      validated.content = args.content;
      break;
    }
    case "editFile": {
      if (typeof args.oldText !== "string" || typeof args.newText !== "string") {
        return { ok: false, error: "missing_edit_text" };
      }
      if (args.oldText === args.newText) return { ok: false, error: "edit_text_identical" };
      if (Buffer.byteLength(args.newText, "utf-8") > SANDBOX_OUTPUT_LIMITS.maxContentBytes) {
        return { ok: false, error: "content_too_large" };
      }
      const res = resolveInstaboxPath(bridge.root, String(args.path ?? ""));
      if (!res.ok) return { ok: false, error: res.error };
      op = "editFile";
      validated.path = res.path;
      validated.oldText = args.oldText;
      validated.newText = args.newText;
      break;
    }
    case "globFiles":
    case "glob": {
      if (typeof args.pattern !== "string" || !args.pattern.trim()) {
        return { ok: false, error: "missing_pattern" };
      }
      op = "glob";
      validated.pattern = args.pattern;
      if (typeof args.path === "string" && args.path.trim()) {
        const res = resolveInstaboxPath(bridge.root, args.path);
        if (!res.ok) return { ok: false, error: res.error };
        validated.path = res.path;
      }
      break;
    }
    default:
      return { ok: false, error: "unsupported_tool" };
  }

  const payload = Buffer.from(JSON.stringify({ op, args: validated }), "utf-8").toString("base64");
  if (payload.length > SANDBOX_OUTPUT_LIMITS.maxArgvBytes) {
    return { ok: false, error: "content_too_large" };
  }
  return { ok: true, argv: [bridge.runtime, INSTABOX_HELPER_PATH, payload] };
}

/** 探针读回：helper 真实读过 bootstrap 写的探针文件才算 bridge 就绪。 */
export function buildInstaboxBridgeProbeRequest(bridge: {
  runtime: InstaboxRuntimeBinary;
}, probePath: string): ExecutionRequest {
  const payload = Buffer.from(
    JSON.stringify({ op: "readFile", args: { path: probePath } }),
    "utf-8",
  ).toString("base64");
  return { kind: "command", argv: [bridge.runtime, INSTABOX_HELPER_PATH, payload] };
}

/** 探针结果 → ready 判定；只有 helper 明确返回 {ok:true,value} 且内容匹配才算通。 */
export function readInstaboxProbeResult(
  stdout: string,
): { ready: boolean; reason?: InstaboxBridgeProbe["reason"] } {
  if (typeof stdout !== "string") return { ready: false, reason: "probe_failed" };
  // 真机实测（2026-10-20）根因：helper 的 readFile 成功时输出 **`{"ok":true,"value":"<内容>"}`**
  // ——信封是有的，但 `value` 是**字符串**，不是 `{content}` 对象（`clampString` 见
  // sandboxWorkspaceHelper.ts）。旧实现要求 `value.content` 为字符串才判就绪，于是真机
  // 永远 probe_failed；单测 mock 用的是 `{content}` 形态，所以一直绿（mock 与真实输出不一致）。
  // 因此这里按「字符串 value」判就绪，并保留裸文本与 `{content}` 两种形态的兼容。
  const text = stdout.trim();
  if (!text) return { ready: false, reason: "probe_failed" };
  if (text.includes('"ok":false') || text.includes("'ok':false")) {
    return { ready: false, reason: "probe_failed" };
  }
  if (text.includes(PROBE_FILE_CONTENT)) return { ready: true };
  // 兼容 helper 将来改回信封形态的输出。
  const parsed = parseToolOutput(text);
  if (!parsed.ok) return { ready: false, reason: "probe_failed" };
  const value = parsed.value as { content?: unknown } | null;
  return typeof value === "object" && value !== null && typeof value.content === "string"
    && value.content.includes(PROBE_FILE_CONTENT)
    ? { ready: true }
    : { ready: false, reason: "probe_failed" };
}

/** 把 bridge 的失败色码翻成 model-facing 文案（稳定前缀，便于调用方匹配）。 */
export function describeInstaboxBridgeUnavailable(bridge: InstaboxBridgeProbe): string {
  const detail =
    bridge.reason === "runtime_missing"
      ? "Instabox 模板内既没有 bun 也没有 node，容器内 helper 无法执行"
      : bridge.reason === "root_unavailable"
        ? "Instabox 容器内无法创建可写工作目录"
        : bridge.reason === "upload_failed"
          ? "容器内 helper 上传失败"
          : bridge.reason === "root_mismatch"
            ? "容器内固定工作目录与 helper ROOT 不一致"
            : bridge.reason === "helper_source_invalid"
              ? "共享 helper 源码形状变化，无法安全改写 ROOT"
              : "容器内 helper 探针读回失败";
  return `instabox 文件工具 bridge 未就绪（${bridge.reason ?? "probe_failed"}）：${detail}；` +
    `文件工具已显式拒绝，绝不回落宿主执行（execShell 仍可用）。`;
}
