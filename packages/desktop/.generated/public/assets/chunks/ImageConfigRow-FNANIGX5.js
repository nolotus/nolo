import "/public/assets/chunks/chunk-PZK4ZAN4.js";
import {
  Select,
  SelectItem
} from "/public/assets/chunks/chunk-5LT6KM4O.js";
import "/public/assets/chunks/chunk-AL5TXIK3.js";
import "/public/assets/chunks/chunk-CXTRCW5J.js";
import "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/chat/web/ImageConfigRow.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var ImageConfigRow = ({
  aspectRatio,
  imageSize,
  imageProfileKey,
  imageUiConfig,
  onAspectRatioChange,
  onImageSizeChange,
  onImageProfileChange
}) => {
  const { t } = useTranslation("chat");
  const {
    supportedAspectRatios,
    supportedImageSizes,
    pricePerImage,
    waitHint,
    defaultImageProfileKey,
    imageProfiles = []
  } = imageUiConfig;
  if (!supportedAspectRatios.length && !supportedImageSizes.length && typeof pricePerImage !== "number" && !waitHint && imageProfiles.length === 0) {
    return null;
  }
  const handleAspectRatioChange = (value) => {
    onAspectRatioChange(value ? String(value) : void 0);
  };
  const handleImageSizeChange = (value) => {
    onImageSizeChange(value ? String(value) : void 0);
  };
  const handleImageProfileChange = (value) => {
    onImageProfileChange(value ? String(value) : void 0);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "image-config-row", "data-testid": "image-config-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("imageOptionsLabel", "\u751F\u6210\u56FE\u7247\u8BBE\u7F6E") }),
    imageProfiles.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      Select,
      {
        selectedKey: imageProfileKey || "",
        onSelectionChange: (key) => handleImageProfileChange(key == null ? "" : String(key)),
        className: "image-config-row__select",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            SelectItem,
            {
              id: "",
              textValue: defaultImageProfileKey === "speed" ? t("imageProfileDefaultSpeed", "\u6A21\u5F0F: \u9ED8\u8BA4\uFF08\u901F\u5EA6\u4F18\u5148\uFF09") : defaultImageProfileKey === "quality" ? t("imageProfileDefaultQuality", "\u6A21\u5F0F: \u9ED8\u8BA4\uFF08\u8D28\u91CF\u4F18\u5148\uFF09") : t("imageProfileDefault", "\u6A21\u5F0F: \u9ED8\u8BA4"),
              children: defaultImageProfileKey === "speed" ? t("imageProfileDefaultSpeed", "\u6A21\u5F0F: \u9ED8\u8BA4\uFF08\u901F\u5EA6\u4F18\u5148\uFF09") : defaultImageProfileKey === "quality" ? t("imageProfileDefaultQuality", "\u6A21\u5F0F: \u9ED8\u8BA4\uFF08\u8D28\u91CF\u4F18\u5148\uFF09") : t("imageProfileDefault", "\u6A21\u5F0F: \u9ED8\u8BA4")
            }
          ),
          imageProfiles.map((profile) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            SelectItem,
            {
              id: profile.key,
              textValue: profile.label,
              children: profile.label
            },
            profile.key
          ))
        ]
      }
    ),
    supportedAspectRatios.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      Select,
      {
        selectedKey: aspectRatio || "",
        onSelectionChange: (key) => handleAspectRatioChange(key == null ? "" : String(key)),
        className: "image-config-row__select",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: "", textValue: t("imageAspectDefault", "\u6BD4\u4F8B: \u9ED8\u8BA4"), children: t("imageAspectDefault", "\u6BD4\u4F8B: \u9ED8\u8BA4") }),
          supportedAspectRatios.map((ratio) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: ratio, textValue: ratio, children: ratio }, ratio))
        ]
      }
    ),
    supportedImageSizes.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      Select,
      {
        selectedKey: imageSize || "",
        onSelectionChange: (key) => handleImageSizeChange(key == null ? "" : String(key)),
        className: "image-config-row__select",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: "", textValue: t("imageSizeDefault", "\u6E05\u6670\u5EA6: \u9ED8\u8BA4"), children: t("imageSizeDefault", "\u6E05\u6670\u5EA6: \u9ED8\u8BA4") }),
          supportedImageSizes.map((sz) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: sz, textValue: sz, children: sz }, sz))
        ]
      }
    ),
    typeof pricePerImage === "number" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "image-config-row__price", children: [
      t("imagePriceHint", "\u56FE\u50CF\u4EF7\u683C\u7EA6"),
      " ",
      pricePerImage.toFixed(4),
      t("imagePriceUnitSuffix", " / \u5F20\uFF08\u52A0\u4E0A token \u8D39\u7528\uFF09")
    ] }),
    waitHint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "image-config-row__price", children: waitHint })
  ] }) });
};
var ImageConfigRow_default = ImageConfigRow;
export {
  ImageConfigRow_default as default
};
