/**
 * app 分享载荷的唯一构造点。
 *
 * 详情页「分享」（`useShareWorkflow`）与卡片「发布到社区」（一次性动作）以前各写一份
 * `share({ type: APP, data: {…} })`，字段一漂移，分享落地页（`share/AppSharePreview`）
 * 就会读不到 `data.url`（访客打不开）或读不到 `data.appKey`（作者回不到应用页）。
 *
 * 字段约定（消费者：`share/AppSharePreview` → `share/appShareTarget`）：
 * - `data.url`：应用运行地址，**必须**有，访客打开的就是它；
 * - `data.appKey`：应用页 key，老分享没有也能用（退回 legacy `app-<appId>`）；
 * - `data.appId` / `data.name`：标识与标题；
 * - `title`：分享标题，与展示名一致。
 */

import { DataType } from "create/types";
import type { SharePayload } from "render/layout/shareWorkflowCore";

export interface AppSharePayloadInput {
  appId?: string | null;
  appKey?: string | null;
  name?: string | null;
  url?: string | null;
}

const trimOrNull = (value?: string | null): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/**
 * 没有运行地址就没有可分享的内容（落地页只能显示「缺少访问地址」）→ 返回 null，
 * 由调用方决定是禁用按钮还是什么都不做。
 */
export const buildAppSharePayload = (
  input: AppSharePayloadInput
): SharePayload | null => {
  const appId = trimOrNull(input.appId);
  const url = trimOrNull(input.url);
  if (!appId || !url) return null;

  const name = trimOrNull(input.name) ?? "App";
  const appKey = trimOrNull(input.appKey);

  return {
    type: DataType.APP,
    data: {
      appId,
      ...(appKey ? { appKey } : {}),
      name,
      url,
    },
    title: name,
  };
};
