// src/app/i18n/i18n.config.ts
import { Language } from "app/i18n/types";
import { i18nBaseConfig } from "./i18n.base";
import aiLocale from "ai/ai.locale";
import chatLocale from "chat/chat.locale";
import spaceLocale from "create/space/space.locale";
import interfaceLocale from "./translations/interface.locale";
import errorLocale from "./translations/error.locale";
import seoLocale from "./translations/seo.locale";
import appBuilderLocale from "./translations/appBuilder.locale";
import pricingLocale from "./translations/pricing.locale";
import rechargeLocale from "./translations/recharge.locale";
import privacyLocale from "./translations/privacy.locale";
import termsLocale from "./translations/terms.locale";
import aupLocale from "./translations/aup.locale";
import footerLocale from "./translations/footer.locale";
import localFirstLocale from "./translations/localFirst.locale";

export const resources = {
  [Language.EN]: {
    common: {
      ...interfaceLocale[Language.EN].translation,
      ...errorLocale[Language.EN].translation,
      ...appBuilderLocale[Language.EN].translation,
      ...pricingLocale[Language.EN].translation,
      ...rechargeLocale[Language.EN].translation,
      ...privacyLocale[Language.EN].translation,
      ...termsLocale[Language.EN].translation,
      ...aupLocale[Language.EN].translation,
      ...footerLocale[Language.EN].translation,
      ...localFirstLocale[Language.EN].translation,
      seo: seoLocale[Language.EN],
    },
    space: spaceLocale[Language.EN].translation,
    ai: aiLocale[Language.EN].translation,
    chat: chatLocale[Language.EN].translation,
  },
  [Language.ZH_CN]: {
    common: {
      ...interfaceLocale[Language.ZH_CN].translation,
      ...errorLocale[Language.ZH_CN].translation,
      ...appBuilderLocale[Language.ZH_CN].translation,
      ...pricingLocale[Language.ZH_CN].translation,
      ...rechargeLocale[Language.ZH_CN].translation,
      ...privacyLocale[Language.ZH_CN].translation,
      ...termsLocale[Language.ZH_CN].translation,
      ...aupLocale[Language.ZH_CN].translation,
      ...footerLocale[Language.ZH_CN].translation,
      ...localFirstLocale[Language.ZH_CN].translation,
      seo: seoLocale[Language.ZH_CN],
    },
    space: spaceLocale[Language.ZH_CN].translation,
    ai: aiLocale[Language.ZH_CN].translation,
    chat: chatLocale[Language.ZH_CN].translation,
  },
  [Language.ZH_HANT]: {
    common: {
      ...interfaceLocale[Language.ZH_HANT].translation,
      ...errorLocale[Language.ZH_HANT].translation,
      ...appBuilderLocale[Language.ZH_HANT].translation,
      ...pricingLocale[Language.ZH_HANT].translation,
      ...rechargeLocale[Language.ZH_HANT].translation,
      ...privacyLocale[Language.ZH_HANT].translation,
      ...termsLocale[Language.ZH_HANT].translation,
      ...aupLocale[Language.ZH_HANT].translation,
      ...footerLocale[Language.ZH_HANT].translation,
      ...localFirstLocale[Language.ZH_HANT].translation,
      seo: seoLocale[Language.ZH_HANT],
    },
    space: spaceLocale[Language.ZH_HANT].translation,
    ai: aiLocale[Language.ZH_HANT].translation,
    chat: chatLocale[Language.ZH_HANT].translation,
  },
  [Language.JA]: {
    common: {
      ...interfaceLocale[Language.JA].translation,
      ...errorLocale[Language.JA].translation,
      ...appBuilderLocale[Language.JA].translation,
      ...pricingLocale[Language.JA].translation,
      ...rechargeLocale[Language.JA].translation,
      ...privacyLocale[Language.JA].translation,
      ...termsLocale[Language.JA].translation,
      ...aupLocale[Language.JA].translation,
      ...footerLocale[Language.JA].translation,
      ...localFirstLocale[Language.JA].translation,
      seo: seoLocale[Language.JA],
    },
    space: spaceLocale[Language.JA].translation,
    ai: aiLocale[Language.JA].translation,
    chat: chatLocale[Language.JA].translation,
  },
  [Language.KO]: {
    common: {
      ...((interfaceLocale as any)[Language.KO]?.translation ?? interfaceLocale[Language.EN].translation),
      ...((errorLocale as any)[Language.KO]?.translation ?? errorLocale[Language.EN].translation),
      ...((appBuilderLocale as any)[Language.KO]?.translation ?? appBuilderLocale[Language.EN].translation),
      ...((pricingLocale as any)[Language.KO]?.translation ?? pricingLocale[Language.EN].translation),
      ...((rechargeLocale as any)[Language.KO]?.translation ?? rechargeLocale[Language.EN].translation),
      ...((privacyLocale as any)[Language.KO]?.translation ?? privacyLocale[Language.EN].translation),
      ...((termsLocale as any)[Language.KO]?.translation ?? termsLocale[Language.EN].translation),
      ...((aupLocale as any)[Language.KO]?.translation ?? aupLocale[Language.EN].translation),
      ...((footerLocale as any)[Language.KO]?.translation ?? footerLocale[Language.EN].translation),
      ...((localFirstLocale as any)[Language.KO]?.translation ?? localFirstLocale[Language.EN].translation),
      seo: seoLocale[Language.KO],
    },
    space: (spaceLocale as any)[Language.KO]?.translation ?? spaceLocale[Language.EN].translation,
    ai: (aiLocale as any)[Language.KO]?.translation ?? aiLocale[Language.EN].translation,
    chat: (chatLocale as any)[Language.KO]?.translation ?? chatLocale[Language.EN].translation,
  },
};

export const i18nConfig = {
  ...i18nBaseConfig,
  resources,
};
