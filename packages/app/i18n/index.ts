// app/i18n/index.ts

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Language } from "app/i18n/types";
import { i18nConfig } from "./i18n.config";

i18n.use(initReactI18next);

// 双初始化守卫：web 端 entry 走 app/i18n/client（带 SSR 语言协商），
// 那里先 init；本文件的 zh 兜底配置仅在 client 未初始化的环境
// （RN / server 工具链）生效。不加守卫时，后加载方会覆盖先加载方，
// 导致 web 端 SSR 判定的语言被硬编码 zh-CN 盖掉。
if (!i18n.isInitialized) {
  i18n.init({
    ...i18nConfig,
    lng: Language.ZH_CN,
    fallbackLng: Language.ZH_CN,
    compatibilityJSON: "v3", // Fixes "Intl not found" error on Android/RN
  });
}

export default i18n;
