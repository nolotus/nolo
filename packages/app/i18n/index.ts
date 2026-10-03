// app/i18n/index.ts

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Language } from "app/i18n/types";
import { i18nConfig } from "./i18n.config";
import { RUNTIME_SLIM_MARKER } from "./runtime";

i18n.use(initReactI18next);

// 双初始化守卫：web 端 entry 走 app/i18n/client（带 SSR 语言协商），
// 那里先 init；本文件的 zh 兜底配置仅在 client 未初始化的环境
// （RN / server 工具链）生效。不加守卫时，后加载方会覆盖先加载方，
// 导致 web 端 SSR 判定的语言被硬编码 zh-CN 盖掉。
//
// 注意上面的 `import "./runtime"` 会先执行 runtime.ts：client 未初始化时，
// 由它以精简资源（ai/chat/space）完成 init 并打 RUNTIME_SLIM_MARKER。
// 这里看到 marker 就补齐完整资源（含 common），保证本入口的语义不变。
if (!i18n.isInitialized) {
  i18n.init({
    ...i18nConfig,
    lng: Language.ZH_CN,
    fallbackLng: Language.ZH_CN,
    compatibilityJSON: "v3", // Fixes "Intl not found" error on Android/RN
  });
} else if ((i18n as unknown as Record<string, unknown>)[RUNTIME_SLIM_MARKER]) {
  // 3rdParty 插件只在 init() 时被调用；实例已由 runtime.ts init 过，
  // 这里手动补一次，保证 RN 的 useTranslation 拿到同一实例。
  initReactI18next.init(i18n);
  for (const [lng, namespaces] of Object.entries(i18nConfig.resources)) {
    for (const [ns, bundle] of Object.entries(namespaces)) {
      i18n.addResourceBundle(lng, ns, bundle, true, true);
    }
  }
  delete (i18n as unknown as Record<string, unknown>)[RUNTIME_SLIM_MARKER];
}

export default i18n;
