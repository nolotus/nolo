import interfaceLocale from "../../app/i18n/translations/interface.locale";
import { Language } from "../../app/i18n/types";

/** Copy shown on the branded macOS DMG background (Finder drag-to-install window). */
export interface MacosDmgInstallerCopy {
  windowTitle: string;
  subtitle: string;
  appLabel: string;
  applicationsLabel: string;
}

export type MacosDmgLocaleCode = Language;

const DEFAULT_LOCALE: MacosDmgLocaleCode = Language.EN;

const LOCALE_ALIASES: Record<string, MacosDmgLocaleCode> = {
  en: Language.EN,
  "en-us": Language.EN,
  "en-gb": Language.EN,
  "zh-cn": Language.ZH_CN,
  "zh-hans": Language.ZH_CN,
  "zh-hant": Language.ZH_HANT,
  "zh-tw": Language.ZH_HANT,
  "zh-hk": Language.ZH_HANT,
  ja: Language.JA,
  "ja-jp": Language.JA,
};

export function normalizeMacosDmgLocale(input?: string | null): MacosDmgLocaleCode {
  const raw = input?.trim();
  if (!raw) {
    return DEFAULT_LOCALE;
  }
  const direct = Object.values(Language).find((code) => code === raw);
  if (direct) {
    return direct;
  }
  const alias = LOCALE_ALIASES[raw.toLowerCase()];
  return alias ?? DEFAULT_LOCALE;
}

export function resolveMacosDmgInstallerLocale(): MacosDmgLocaleCode {
  const fromEnv = process.env.NOLO_DESKTOP_DMG_LOCALE;
  if (fromEnv?.trim()) {
    return normalizeMacosDmgLocale(fromEnv);
  }
  if (process.platform === "darwin") {
    const pref = Bun.spawnSync(["defaults", "read", "-g", "AppleLanguages"], {
      stdout: "pipe",
      stderr: "ignore",
    });
    if (pref.exitCode === 0) {
      const first = pref.stdout
        .toString("utf8")
        .split(/\r?\n/)
        .map((line) => line.replace(/[(),]/g, "").trim())
        .find(Boolean);
      if (first) {
        return normalizeMacosDmgLocale(first);
      }
    }
  }
  return DEFAULT_LOCALE;
}

function readInstallerBlock(locale: MacosDmgLocaleCode): MacosDmgInstallerCopy {
  const translation = interfaceLocale[locale]?.translation as {
    clientDownloads?: {
      macosDmgInstaller?: Partial<MacosDmgInstallerCopy>;
    };
  };
  const block = translation?.clientDownloads?.macosDmgInstaller;
  const fallback = interfaceLocale[Language.EN].translation as {
    clientDownloads: { macosDmgInstaller: MacosDmgInstallerCopy };
  };
  const en = fallback.clientDownloads.macosDmgInstaller;
  return {
    windowTitle: block?.windowTitle?.trim() || en.windowTitle,
    subtitle: block?.subtitle?.trim() || en.subtitle,
    appLabel: block?.appLabel?.trim() || en.appLabel,
    applicationsLabel: block?.applicationsLabel?.trim() || en.applicationsLabel,
  };
}

export function getMacosDmgInstallerCopy(locale: MacosDmgLocaleCode): MacosDmgInstallerCopy {
  return readInstallerBlock(locale);
}

export function getMacosDmgInstallerCopyForBuild(): MacosDmgInstallerCopy {
  return getMacosDmgInstallerCopy(resolveMacosDmgInstallerLocale());
}