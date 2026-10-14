// packages/app/settings/mediaAllowanceClient.ts
//
// 设置页「媒体自动执行额度」的服务端通道。
//
// 该字段（`autoApproveCredits`）是服务端独占的积分闸门：通用 settings write/patch
// 对它静默丢弃或 400，唯一合法写入通道是专属端点
// `POST /api/user-settings/media-allowance`（要求 cookie 鉴权 + 同源 + 自定义确认头）。
// 因此这里不能用 `setSettings` 透传，必须显式调用该端点，成功后由调用方把返回值写回本地 state。
//
// 单一职责：请求 + 响应/错误的归一化，不含任何 UI。

export const MEDIA_ALLOWANCE_ENDPOINT = "/api/user-settings/media-allowance";
/**
 * 额度上限（积分），与服务端 `packages/server/mediaAllowance.ts` 的
 * MEDIA_ALLOWANCE_MAX 必须一致（有测试守着）。
 */
export const MEDIA_ALLOWANCE_MAX = 10000;
/** 与服务端 isBrowserUserConfirmation 要求的自定义确认头一致。 */
export const MEDIA_CONFIRMATION_HEADER = "X-Media-User-Confirmation";

export type MediaAllowanceSaveResult =
  | { ok: true; autoApproveCredits: number }
  | { ok: false; error: string };

/** 把输入框里的文本解析成合法额度；非法（空/非数/负数/超上限）返回 null。 */
export function parseMediaAllowanceDraft(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Number("") === 0、Number("1e3") === 1000 都接受，但 "12abc"/NaN/Infinity 一律拒绝
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  if (value < 0 || value > MEDIA_ALLOWANCE_MAX) return null;
  return value;
}

export async function saveMediaAllowance(
  autoApproveCredits: number,
  fetchImpl: typeof fetch = fetch,
): Promise<MediaAllowanceSaveResult> {
  try {
    const response = await fetchImpl(MEDIA_ALLOWANCE_ENDPOINT, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        [MEDIA_CONFIRMATION_HEADER]: "1",
      },
      body: JSON.stringify({ autoApproveCredits }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { autoApproveCredits?: unknown; error?: { message?: unknown } }
      | null;
    if (!response.ok) {
      const message =
        typeof payload?.error?.message === "string" && payload.error.message
          ? payload.error.message
          : `额度保存失败（HTTP ${response.status}）`;
      return { ok: false, error: message };
    }
    const saved = payload?.autoApproveCredits;
    if (typeof saved !== "number" || !Number.isFinite(saved) || saved < 0) {
      return { ok: false, error: "服务器返回了非法的额度值，请重试" };
    }
    return { ok: true, autoApproveCredits: saved };
  } catch (error) {
    return {
      ok: false,
      error: `无法连接服务器：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
