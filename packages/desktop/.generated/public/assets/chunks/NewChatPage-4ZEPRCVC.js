import {
  buildStaticPageMeta,
  usePageMeta
} from "/public/assets/chunks/chunk-M4PBN5X7.js";
import {
  QuickChat_default
} from "/public/assets/chunks/chunk-J75ENCDY.js";
import "/public/assets/chunks/chunk-QOSSDINO.js";
import "/public/assets/chunks/chunk-6SCCZZZJ.js";
import "/public/assets/chunks/chunk-JUT5AJQ2.js";
import "/public/assets/chunks/chunk-6EJRYVCO.js";
import "/public/assets/chunks/chunk-5SG4AG33.js";
import "/public/assets/chunks/chunk-EA4SLPRB.js";
import "/public/assets/chunks/chunk-QADHV2NS.js";
import "/public/assets/chunks/chunk-APUNFOYF.js";
import "/public/assets/chunks/chunk-GYU2TA6X.js";
import "/public/assets/chunks/chunk-SDMAWFBN.js";
import "/public/assets/chunks/chunk-4JMBIZX5.js";
import "/public/assets/chunks/chunk-2CATDSNY.js";
import "/public/assets/chunks/chunk-CXTRCW5J.js";
import "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import "/public/assets/chunks/chunk-M5DXP5RW.js";
import "/public/assets/chunks/chunk-7PX5UKK4.js";
import "/public/assets/chunks/chunk-5IJJ57JD.js";
import "/public/assets/chunks/chunk-VCSNZD3S.js";
import "/public/assets/chunks/chunk-IHMA4QTO.js";
import "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import {
  useSearchParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/pages/NewChatPage.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var NewChatPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const rawSpaceId = searchParams.get("spaceId");
  const spaceId = rawSpaceId?.trim() ? rawSpaceId : void 0;
  const launch = searchParams.get("launch");
  const pageMeta = (0, import_react.useMemo)(() => buildStaticPageMeta(t, "default"), [t]);
  usePageMeta(pageMeta);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", { className: "new-chat-page", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "section",
    {
      className: "new-chat-page__content",
      "aria-label": t("chat:newchat", "\u65B0\u5BF9\u8BDD"),
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        QuickChat_default,
        {
          surface: "home-primary",
          spaceId,
          launch,
          isEmptyState: true
        }
      )
    }
  ) });
};
var NewChatPage_default = NewChatPage;
export {
  NewChatPage_default as default
};
