import { t } from "./i18n";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type VersionChangeNotice = { from: string; to: string };

const resolveNoticePath = (env: NodeJS.ProcessEnv, homeDir: string): string =>
  join(env.NOLO_HOME?.trim() || join(homeDir, ".nolo"), "cli", "last-run-version");

/**
 * 记录并比较「上次运行的 CLI 版本」，用于在版本真的变了时告诉用户一句。
 *
 * 只保存一个版本号（约 6 字节），刻意不扩大：
 * - 不记录更新任务，不区分 pending/success/failed（那套状态机已删除）
 * - 不参与启动门禁，绝不让版本记录阻塞启动
 * - 不影响 helper，helper 成功/失败由它自己发系统通知
 *
 * 边界（有意接受，不为它们扩展状态）：
 * - 首次运行没有旧值，只建立基线，不声称「更新成功」
 * - 降级、切渠道也表现为「版本变了」，所以文案说「版本从 x 变为 y」而不是「更新到」
 * - 同版本重装发现不了；更新失败则下次仍是旧版本，不会误报
 */
export function takeVersionChangeNotice(
  currentVersion: string,
  options: { env?: NodeJS.ProcessEnv; homeDir?: string } = {},
): VersionChangeNotice | null {
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? homedir();
  const noticePath = resolveNoticePath(env, homeDir);

  let previous = "";
  try {
    previous = readFileSync(noticePath, "utf8").trim();
  } catch {
    // 首次运行或不可读：只建立基线
  }

  if (previous === currentVersion) return null;

  try {
    mkdirSync(dirname(noticePath), { recursive: true });
    writeFileSync(noticePath, `${currentVersion}\n`, "utf8");
  } catch {
    // 写不进去就下次再说，绝不阻塞启动
  }

  // 没有旧值时不提示：无从知道「从什么变过来的」
  return previous ? { from: previous, to: currentVersion } : null;
}

/** Format separately from persistence so callers can choose their output stream. */
export function formatVersionChangeNotice(change: VersionChangeNotice): string {
  return t("updateVersionChanged", change.from, change.to);
}
