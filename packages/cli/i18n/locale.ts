export type CliLocale = "zh" | "en";

const ZH_PATTERNS = /^zh/i;

type EnvLike = Record<string, string | undefined>;

export function parseCliLocale(raw: string | undefined): CliLocale | null {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized) return null;
  if (ZH_PATTERNS.test(normalized)) return "zh";
  if (normalized === "en" || normalized.startsWith("en")) return "en";
  return null;
}

function detectLocaleFromEnv(env: EnvLike): CliLocale | null {
  // Explicit override first: profile config surfaces the saved /lang choice
  // through NOLO_LANG, and users can also export it directly.
  const explicit = parseCliLocale(env.NOLO_LANG);
  if (explicit) return explicit;
  const candidates = [env.LC_ALL, env.LC_CTYPE, env.LANG].filter(Boolean);
  for (const candidate of candidates) {
    if (ZH_PATTERNS.test(candidate!)) return "zh";
    if (candidate && !candidate.startsWith("C.") && !candidate.startsWith("POSIX")) {
      return "en";
    }
  }
  return null;
}

/**
 * `fallback` decides what an env with no usable locale signal resolves to.
 * - TUI surfaces keep the historical `"zh"` default (unchanged behavior).
 * - The CLI command surface passes `"en"` from its entrypoint: those outputs
 *   were hardcoded English before i18n, so a zh fallback would regress users
 *   running with `LANG=C.UTF-8` (the Docker/CI default) or no LANG at all.
 */
function detectLocale(env: EnvLike, fallback: CliLocale = "zh"): CliLocale {
  return detectLocaleFromEnv(env) ?? fallback;
}

let currentLocale: CliLocale = detectLocale(process.env);

export function getCliLocale(): CliLocale {
  return currentLocale;
}

export function setCliLocale(locale: CliLocale) {
  currentLocale = locale;
}

/**
 * Re-detect the locale from a specific env (the TUI passes its merged
 * profile+process env, which module-load detection cannot see).
 *
 * `fallback` defaults to `"zh"` to preserve TUI behavior; pass `"en"` for the
 * CLI command surface.
 */
export function initCliLocale(
  env: EnvLike = process.env,
  fallback: CliLocale = "zh"
) {
  currentLocale = detectLocale(env, fallback);
}

/**
 * Windows terminals (conhost / Windows Terminal default mode) send the same
 * bare \r for Shift+Enter as for plain Enter, so the TUI cannot distinguish
 * the two. Ctrl+J (LF) is supported as newline on every platform/terminal.
 */
export function newlineHint(platform: string = process.platform): string {
  return platform === "win32" ? "Ctrl+J" : "Shift+Enter";
}

/**
 * Rotating welcome-screen tips, one per day. The composer placeholder already
 * covers "type / for commands", so these spend the welcome screen's one hint
 * line on capability discovery instead of repeating it. Day-seeded (not
 * random) so the tip is stable across restarts within a day.
 */
const WELCOME_TIPS: Record<CliLocale, string[]> = {
  en: [
    `${newlineHint()} for newline · /help for all commands`,
    "Drag an image into terminal to send · /images to manage",
    "/doc attach <doc> to attach doc context",
    "/theme to switch colors · follows terminal light/dark",
    "/history to resume dialog · /agents to list agents",
  ],
  zh: [
    `${newlineHint()} 换行 · /help 查看全部命令`,
    "拖入图片即可直发 · /images 管理待发图片",
    "/doc attach <doc> 挂载文档上下文",
    "/theme 切换配色 · 日夜间自动跟随终端",
    "/history 恢复最近对话 · /agents 列出智能体",
  ],
};

export function dailyWelcomeTip(now: number = Date.now()): string {
  const tips = WELCOME_TIPS[currentLocale];
  const day = Math.floor(now / 86_400_000);
  return tips[day % tips.length];
}
