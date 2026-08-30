import {
  clearCredentialAvailability,
  readCredentialAvailability,
} from "./credentialAvailability";

export const AUTH_COOLDOWN_HELP_TEXT = `Manage per-credential availability cooldowns (429 限流冷却).

Usage:
  nolo auth cooldown                List all active cooldowns
  nolo auth cooldown --clear <credential>   Clear one credential's cooldown
  nolo auth cooldown --clear-all            Clear all cooldowns

Options:
  --clear <credential>  Clear the cooldown for the given credential
                       (e.g. chatgpt / claude / antigravity / api-key:agent-...).
  --clear-all           Clear every credential cooldown.
  --help                Show this help.

No argument lists the currently cooled credentials with their human-readable
recovery time and remaining duration.
`;

function wantsHelp(args: string[]) {
  return args.includes("--help") || args.includes("-h");
}

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export async function runAuthCooldownCommand(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  if (wantsHelp(args)) {
    console.log(AUTH_COOLDOWN_HELP_TEXT);
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
        ? `Cleared ${keys.length} credential cooldown(s).`
        : "No credential cooldowns to clear.",
    );
    return 0;
  }

  const clearIdx = args.indexOf("--clear");
  if (clearIdx >= 0) {
    const key = args[clearIdx + 1];
    if (!key || key.startsWith("-")) {
      console.log(
        "Missing credential for --clear. Usage: nolo auth cooldown --clear <credential>",
      );
      return 1;
    }
    const entries = await readCredentialAvailability(env);
    if (!(key in entries)) {
      console.log(`No active cooldown for credential: ${key}`);
      return 0;
    }
    await clearCredentialAvailability(key, env);
    console.log(`Cleared cooldown for credential: ${key}`);
    return 0;
  }

  const entries = await readCredentialAvailability(env);
  const keys = Object.keys(entries);
  if (keys.length === 0) {
    console.log("No active credential cooldowns.");
    return 0;
  }
  const now = Date.now();
  console.log("Active credential cooldowns:");
  for (const key of keys.sort()) {
    const at = entries[key];
    console.log(
      // 列宽按最长的 fallback key（custom-endpoint:<origin>，如
      // custom-endpoint:https://ollama.com = 34 字符）取值，避免撑破对齐。
      `  ${key.padEnd(34)} recovers ${new Date(at).toISOString()}  (${formatRemaining(at - now)} remaining)`,
    );
  }
  return 0;
}
