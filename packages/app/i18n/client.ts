import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Language } from "app/i18n/types";
import { i18nBaseConfig } from "./i18n.base";

i18n.use(initReactI18next).init({
  ...i18nBaseConfig,
  lng: Language.ZH_CN,
  fallbackLng: {
    [Language.EN]: [Language.EN],
    [Language.ZH_CN]: [Language.ZH_CN, Language.EN],
    [Language.ZH_HANT]: [Language.ZH_HANT, Language.ZH_CN, Language.EN],
    [Language.JA]: [Language.JA, Language.EN],
    default: [Language.EN],
  },
  compatibilityJSON: "v3",
});

export default i18n;
