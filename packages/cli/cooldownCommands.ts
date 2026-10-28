import { t } from "./i18n";
import {
  clearCredentialAvailability,
  readCredentialAvailability,
} from "./credentialAvailability";

// `nolo auth cooldown` 帮助文本按调用时 locale 现算（见 runAuthCooldownCommand），
// 不要导出模块级常量：常量会在首次 import 时冻结 locale，TUI /lang 切换后即过期。

function wantsHelp(args: string[]) {
  return args.includes("--help") || args.includes("-h");
}

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (days > 0) return t("cliCooldownDays", String(days), String(hours), String(minutes));
  if (hours > 0) return t("cliCooldownHours", String(hours), String(minutes));
  return t("cliCooldownMinutes", String(minutes));
}

export async function runAuthCooldownCommand(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  if (wantsHelp(args)) {
    console.log(t("cliCooldownHelp"));
    return 0;
  }

  if (args.includes("--clear-all")) {
    const entries = await readCredentialAvailability(env);
    const keys = Object.keys(entries);
    for (const key of keys) {
      await clearCredentialAvailability(key, env);
    }
    console.log(
      keys.length > 0
        ? t("cliCooldownClearedCount", String(keys.length))
        : t("cliCooldownNoneToClear"),
    );
    return 0;
  }

  const clearIdx = args.indexOf("--clear");
  if (clearIdx >= 0) {
    const key = args[clearIdx + 1];
    if (!key || key.startsWith("-")) {
      console.log(
        t("cliCooldownMissingCredential"),
      );
      return 1;
    }
    const entries = await readCredentialAvailability(env);
    if (!(key in entries)) {
      console.log(t("cliCooldownNotActive", key));
      return 0;
    }
    await clearCredentialAvailability(key, env);
    console.log(t("cliCooldownCleared", key));
    return 0;
  }

  const entries = await readCredentialAvailability(env);
  const keys = Object.keys(entries);
  if (keys.length === 0) {
    console.log(t("cliCooldownNoneActive"));
    return 0;
  }
  const now = Date.now();
  console.log(t("cliCooldownActive"));
  for (const key of keys.sort()) {
    const at = entries[key];
    console.log(
      // 列宽按最长的 fallback key（custom-endpoint:<origin>，如
      // custom-endpoint:https://ollama.com = 34 字符）取值，避免撑破对齐。
      t("cliCooldownEntry", key.padEnd(34), new Date(at).toISOString(), formatRemaining(at - now)),
    );
  }
  return 0;
}
