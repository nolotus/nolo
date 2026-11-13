/**
 * Windows Terminal 的 EA=A（East Asian Ambiguous）宽度策略探测。
 *
 * 背景（一手事实，2026-02 合入 microsoft/terminal#19864）：
 *   - WT 新增全局设置 `compatibility.ambiguousWidth`，取值 `narrow`（默认）/ `wide`；
 *   - 该策略经 ConPTY（PSEUDOCONSOLE_AMBIGUOUS_IS_WIDE）传给 conhost 的
 *     CodepointWidthDetector，只影响「终端 + 控制台宿主」两侧；
 *   - **没有任何环境变量或协议告诉客户端进程（我们）**，所以客户端只能自己读
 *     WT 的 settings.json 才不会猜错。
 *
 * 这决定了两件事：
 *   1. 默认（绝大多数人）是 narrow → 我们的默认口径与 WT 一致；
 *   2. 用户若手动设成 wide，我们不读它就会把每个 EA=A 字符少算 1 列，
 *      表格竖线逐列漂移——这正是「开了 wide 还漂」的另一半成因。
 *
 * 本模块只做「读配置 + 解析」，纯函数可注入依赖，因此在 Linux/CI 上也能测。
 */
import fs from "node:fs";
import path from "node:path";

export type WtAmbiguousWidth = "narrow" | "wide";

export interface WtWidthPolicyDeps {
  platform?: NodeJS.Platform;
  env?: Record<string, string | undefined>;
  /** 读取文件内容；失败返回 null（缺文件、权限、编码问题都归到这一档）。 */
  readFile?: (filePath: string) => string | null;
}

/** WT 打包版的两个包名：稳定版与预览版。 */
const WT_PACKAGE_NAMES = [
  "Microsoft.WindowsTerminal_8wekyb3d8bbwe",
  "Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe",
];

/**
 * WT settings.json 的候选路径（按优先级）。
 * 打包安装（Store / 官方 msi）都在 %LOCALAPPDATA%\Packages\<name>\LocalState 下。
 */
export function wtSettingsCandidates(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const localAppData = env.LOCALAPPDATA;
  if (typeof localAppData !== "string" || localAppData.trim() === "") return [];
  return WT_PACKAGE_NAMES.map((name) =>
    path.join(localAppData, "Packages", name, "LocalState", "settings.json"),
  );
}

/**
 * 剥掉 JSONC 的 `//` 行注释与 `/* *\/` 块注释（字符串内的 `//`/`/*` 原样保留）。
 *
 * WT 的 settings.json 是 JSONC，用户常把设置注释掉当备忘；如果直接用正则在全文里
 * 找键，被注释掉的 `"compatibility.ambiguousWidth": "wide"` 会被误当成生效值，
 * 于是本该 narrow 的终端被我们按 wide 算 → 表格反向漂移。
 */
function stripJsonComments(text: string): string {
  let out = "";
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
        out += ch;
      }
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }
    if (inString) {
      out += ch;
      if (ch === "\\") {
        out += next ?? "";
        i += 1;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * 从 settings.json 文本里取 `compatibility.ambiguousWidth`。
 *
 * settings.json 是 JSONC（允许注释与尾逗号），因此不走 JSON.parse：先剥注释，
 * 再定位该键值对（被注释掉的键不算生效值）。键名在 WT 的 schema 里带命名空间
 * （`"compatibility.ambiguousWidth": "wide"` 出现在 profile defaults 里），
 * 也兼容嵌套写法 `"ambiguousWidth": "wide"`。找不到或值非法一律返回 null
 * （调用方回落到默认 narrow）。
 */
export function parseAmbiguousWidthSetting(
  text: string,
): WtAmbiguousWidth | null {
  // 键可能带命名空间前缀（`"compatibility.ambiguousWidth"`），也可能写成嵌套
  // 对象里的 `"ambiguousWidth"`，两种都认；注释掉的不算。
  const active = stripJsonComments(text);
  const match = active.match(/"(?:[A-Za-z0-9_]+\.)?ambiguousWidth"\s*:\s*"([A-Za-z]+)"/);
  if (!match) return null;
  const value = match[1].toLowerCase();
  if (value === "wide") return "wide";
  if (value === "narrow") return "narrow";
  return null;
}

/**
 * 探测当前 Windows Terminal 的 EA=A 策略；非 Windows / 读不到 / 未设置时返回 null。
 * 调用方拿到 null 就走默认 narrow。
 */
export function detectWindowsTerminalAmbiguousWidth(
  deps: WtWidthPolicyDeps = {},
): WtAmbiguousWidth | null {
  const platform = deps.platform ?? process.platform;
  if (platform !== "win32") return null;
  const env = deps.env ?? process.env;
  const readFile =
    deps.readFile ??
    ((filePath: string) => {
      try {
        return fs.readFileSync(filePath, "utf8");
      } catch {
        return null;
      }
    });

  for (const candidate of wtSettingsCandidates(env)) {
    const text = readFile(candidate);
    if (text === null) continue;
    const parsed = parseAmbiguousWidthSetting(text);
    // 文件存在但没设这个键 → WT 用 schema 默认 narrow，直接采用，不再看预览版。
    return parsed ?? "narrow";
  }
  return null;
}
