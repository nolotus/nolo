import { describe, expect, it } from "bun:test";
import { Language } from "../app/i18n/types";
import {
  getMacosDmgInstallerCopy,
  normalizeMacosDmgLocale,
} from "./scripts/macos-dmg-i18n";

describe("macOS dmg installer i18n", () => {
  it("normalizes locale aliases", () => {
    expect(normalizeMacosDmgLocale("zh-CN")).toBe(Language.ZH_CN);
    expect(normalizeMacosDmgLocale("zh-Hant")).toBe(Language.ZH_HANT);
    expect(normalizeMacosDmgLocale("ja")).toBe(Language.JA);
    expect(normalizeMacosDmgLocale("")).toBe(Language.EN);
  });

  it("returns localized installer copy from interface.locale", () => {
    const zh = getMacosDmgInstallerCopy(Language.ZH_CN);
    expect(zh.subtitle).toContain("应用程序");
    expect(zh.applicationsLabel).toBe("应用程序");

    const ja = getMacosDmgInstallerCopy(Language.JA);
    expect(ja.applicationsLabel).toBe("アプリケーション");
  });
});