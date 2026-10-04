import { Language } from "../types";

// 站点页脚文案。法务链接本身的标题复用 terms/privacy/aup 各自的 title key，
// 这里只放页脚特有的几条。
export default {
  [Language.EN]: {
    translation: {
      footer: {
        legal: "Legal",
        rights: "All rights reserved.",
      },
    },
  },
  [Language.ZH_CN]: {
    translation: {
      footer: {
        legal: "法律条款",
        rights: "保留所有权利。",
      },
    },
  },
  [Language.ZH_HANT]: {
    translation: {
      footer: {
        legal: "法律條款",
        rights: "保留所有權利。",
      },
    },
  },
  [Language.JA]: {
    translation: {
      footer: {
        legal: "法的事項",
        rights: "All rights reserved.",
      },
    },
  },
};
