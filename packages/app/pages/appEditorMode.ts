// app/pages/appEditorMode.ts
//
// app 编辑器的「另一个视图」只有代码编辑（急救通道），默认视图永远是预览。
//
// 判据（对应产品方向：目标群体是爱好者，代码用于急救和专业人士）：
//   1. **视图不落 URL、不记忆**：视图只活在本页面的组件状态里，进入编辑器一律是预览；
//      刷新、从代码视图离开、切到另一个 app，下次进来都是预览。
//   2. 老链接可能带 `?mode=code` / `sidebar=files` / `tab=source`（历史实现把视图写进了
//      URL）。这些参数一律视为「历史遗留」，进入时清掉，避免地址栏与屏幕说的不是一回事，
//      也顺手挡住「上个 app 的 mode 跟到下一个 app」这条继承链。
//   3. 所以这里只需要一个谓词：**这个 URL 要不要归一化成干净的编辑器地址**。
//      视图恒为预览，不返回 `view` / 参数清单这些恒常量（review W5）。
import { APP_EDITOR_SIDEBAR_SEARCH_PARAM, APP_EDITOR_TAB_SEARCH_PARAM, APP_EDIT_MODE_SEARCH_PARAM } from "app/constants/appEditor";

/** 编辑器视图：预览（默认）与代码（急救通道，入口在「更多」菜单里）。 */
export type AppEditorView = "preview" | "code";

/** 进入编辑器时的固定视图——不读记忆、不看 URL。 */
export const DEFAULT_APP_EDITOR_VIEW: AppEditorView = "preview";

/** URL 上曾经代表「视图」的参数：现在只用于识别历史链接并清理。 */
export const APP_EDITOR_VIEW_SEARCH_PARAM_KEYS = [
  APP_EDIT_MODE_SEARCH_PARAM,
  APP_EDITOR_SIDEBAR_SEARCH_PARAM,
  APP_EDITOR_TAB_SEARCH_PARAM,
] as const;

const toSearchParams = (
  search: URLSearchParams | string | null | undefined,
): URLSearchParams => {
  if (!search) return new URLSearchParams();
  if (search instanceof URLSearchParams) return search;
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
};

/**
 * true = URL 上还带着历史视图参数，应当 replace 成干净的编辑器 URL。
 * 视图本身恒为 `DEFAULT_APP_EDITOR_VIEW`，不需要由这里回答。
 */
export const resolveAppEditorEntry = (
  search: URLSearchParams | string | null | undefined,
): boolean => {
  const params = toSearchParams(search);
  return APP_EDITOR_VIEW_SEARCH_PARAM_KEYS.some((key) => params.get(key) !== null);
};
