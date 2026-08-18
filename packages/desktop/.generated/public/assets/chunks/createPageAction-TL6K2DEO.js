import {
  markdownToSlate
} from "/public/assets/chunks/chunk-AWGGOX2H.js";
import {
  parseSkillDocProtocol
} from "/public/assets/chunks/chunk-DFTLAEUX.js";
import {
  createEmptyParagraph,
  splitSlateTitleAndBody
} from "/public/assets/chunks/chunk-ZV2RZQG3.js";
import "/public/assets/chunks/chunk-GIMH23VB.js";
import {
  slateToRenderMarkdown
} from "/public/assets/chunks/chunk-PTH5G2FS.js";
import {
  buildSkillSummaryMarker
} from "/public/assets/chunks/chunk-FXT35AYA.js";
import {
  addContentToSpace,
  createPageKey,
  selectCurrentSpaceId,
  selectIdentityUserId,
  write
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  client_default
} from "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
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
import "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/page/createPageAction.ts
var normalizeCategoryId = (raw) => {
  const trimmed = raw?.trim();
  if (!trimmed) return void 0;
  const asciiNoSpace = /^[\x20-\x7E]+$/;
  if (!asciiNoSpace.test(trimmed)) return void 0;
  if (trimmed.length < 8) return void 0;
  return trimmed;
};
var createPageAction = async ({
  categoryId,
  spaceId: customSpaceId,
  title: initialTitle,
  addMomentTag,
  content,
  slateData
} = {}, { dispatch, getState }) => {
  const state = getState();
  const userId = selectIdentityUserId(state);
  if (!userId) throw new Error("User ID not found.");
  const spaceId = customSpaceId ?? selectCurrentSpaceId(state);
  const { dbKey, id } = createPageKey.create(userId);
  const now = /* @__PURE__ */ new Date();
  const defaultTitle = client_default.t("page:untitled", {
    defaultValue: "\u672A\u547D\u540D\u9875\u9762"
  });
  let title = asOptionalTrimmedString(initialTitle) ?? defaultTitle;
  const tags = addMomentTag ? ["moment"] : void 0;
  let pageMeta;
  let initialSlateData;
  if (slateData) {
    initialSlateData = slateData;
  } else if (content) {
    const parsedProtocol = parseSkillDocProtocol(content);
    const normalizedContent = parsedProtocol.content;
    pageMeta = parsedProtocol.meta;
    console.log("content", content);
    try {
      const parsed = markdownToSlate(normalizedContent);
      console.log("parsed", parsed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const split = splitSlateTitleAndBody(parsed, initialTitle);
        title = asOptionalTrimmedString(initialTitle) ?? (split.title || defaultTitle);
        initialSlateData = split.body;
      } else {
        initialSlateData = [
          { type: "paragraph", children: [{ text: normalizedContent }] }
        ];
      }
    } catch (e) {
      console.error(
        "[createPageAction] markdownToSlate failed, fallback to plain text:",
        e
      );
      initialSlateData = [
        { type: "paragraph", children: [{ text: normalizedContent }] }
      ];
    }
  } else {
    initialSlateData = [createEmptyParagraph()];
  }
  const safeCategoryId = normalizeCategoryId(categoryId);
  const pageData = {
    dbKey,
    id,
    type: "page" /* DOC */,
    title,
    spaceId,
    slateData: initialSlateData,
    // `content` 只作为只读展示缓存 / legacy bridge，真源仍是 `slateData`。
    content: typeof content === "string" ? parseSkillDocProtocol(content, pageMeta).content || slateToRenderMarkdown(initialSlateData) : slateToRenderMarkdown(initialSlateData),
    tags,
    created: now.toISOString(),
    ...pageMeta ? { meta: pageMeta } : {}
  };
  const skillSummary = buildSkillSummaryMarker(pageMeta);
  await dispatch(write({ data: pageData, customKey: dbKey })).unwrap();
  if (spaceId) {
    dispatch(
      addContentToSpace({
        contentKey: dbKey,
        type: "page" /* DOC */,
        spaceId,
        title,
        // 只使用经过 normalize 的 safeCategoryId
        categoryId: safeCategoryId,
        ...skillSummary ? { skillSummary } : {}
      })
    );
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("nolo-user-data-updated"));
  }
  return dbKey;
};
export {
  createPageAction
};
