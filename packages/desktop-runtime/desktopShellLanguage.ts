// desktopShellLanguage.ts
// 桌面 embedded server 的界面语言协商。
//
// 为什么需要它：桌面壳的 HTML 是动态生成的 SPA 壳（不做 SSR），客户端入口
// （packages/web/entry.tsx）的语言来源顺序是 `window.__SSR_LANG__` >
// localStorage > `navigator.language`。壳里既没有 __SSR_LANG__，localStorage
// 又是空的，客户端就只剩 navigator.language —— 而内嵌 CEF 的默认
// `intl.accept_languages` 是 "en-US,en"，并不跟随系统 locale（实测
// ~/.cache/<identifier>/<channel>/CEF/Default/Preferences）。结果是一台
// LANG=zh_CN.UTF-8 的机器上新装桌面端直接变英文。
//
// 因此这里按请求算出语言，由壳注入 __SSR_LANG__ 与 <html lang>：
//   ?lang= > nolo_language cookie > 系统 locale > Accept-Language > 英文
// 系统 locale 排在 Accept-Language 之前是有意的：桌面 WebView 的
// Accept-Language 只是 CEF 的默认值，不代表用户意图；机器 locale 才代表。
import { Language } from "app/i18n/types";
import { readLanguageCookie } from "app/i18n/languagePreference";
import {
  matchLanguageTag,
  parseAcceptLanguage,
  resolveSystemLocaleLanguage,
  type LocaleEnv,
} from "app/i18n/requestLanguage";

export type DesktopShellLanguageSources = {
  url: URL;
  cookieHeader?: string | null;
  acceptLanguageHeader?: string | null;
  env?: LocaleEnv;
};

export const resolveDesktopShellLanguage = ({
  url,
  cookieHeader,
  acceptLanguageHeader,
  env,
}: DesktopShellLanguageSources): Language => {
  // ?lang= 允许带地区码（de-DE / es-MX），归一化到基础语言；非法值忽略。
  const queryLang = url.searchParams.get("lang");
  if (queryLang) {
    const matched = matchLanguageTag(queryLang);
    if (matched) return matched;
  }

  // 用户在界面里显式切换过的语言（switcher 同时写 localStorage 与 cookie）。
  const cookieLang = readLanguageCookie(cookieHeader);
  if (cookieLang) return cookieLang;

  const systemLang = resolveSystemLocaleLanguage(env ?? process.env);
  if (systemLang) return systemLang;

  if (acceptLanguageHeader) {
    const accepted = parseAcceptLanguage(acceptLanguageHeader);
    if (accepted) return accepted;
  }

  return Language.EN;
};
