/**
 * 充值入口联动（E6）纯逻辑：外部入口（定价页 / 余额不足拦截）通过
 * `/recharge?credits=N` 携带推荐档位，充值页读取后预选。
 *
 * 全部纯函数，无 React / DOM 依赖，与 rechargeOrderState.ts 同一写法。
 */

/**
 * 在线支付预设档位（积分数）。
 * 与 packages/app/pages/Recharge.tsx 的 WAFFO_TIER_PACKAGES 及服务端
 * WAFFO_PRESET_TIER_MAP 保持一致：档位变动三处必须同步改。
 */
export const RECHARGE_TIER_CREDITS: readonly number[] = [1, 10, 50, 100];

/** URL 参数名：/recharge?credits=50 */
export const RECHARGE_PRESET_PARAM = "credits";

/**
 * 解析 ?credits= 参数。
 * 只接受正整数；缺参、非数字、小数、0、负数、Infinity 一律返回 null
 * （调用方回落到现有默认行为，不报错、不留白）。
 */
export function parseRechargePresetCredits(
  search: string,
  param = RECHARGE_PRESET_PARAM
): number | null {
  if (!search) return null;
  const raw = new URLSearchParams(search).get(param);
  if (raw == null) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

/**
 * 选档 + 下限裁剪：返回 ≥ max(needed, minCredits) 的最小可用档位。
 * needed 非法（NaN / Infinity / ≤0 时仍按 minCredits 兜底）或没有任何
 * 档位够得着（如需 199 超过最大档 100）→ 返回 null，调用方回落默认行为。
 */
export function pickRechargeTier(
  needed: number,
  tiers: readonly number[] = RECHARGE_TIER_CREDITS,
  minCredits = 1
): number | null {
  const floor = Number.isFinite(minCredits) && minCredits > 0 ? minCredits : 1;
  // Infinity = 任何档位都不够 → null；NaN 等非法输入按下限兜底选档。
  if (needed === Infinity) return null;
  const target = Number.isFinite(needed)
    ? Math.max(Math.ceil(needed), floor)
    : floor;
  const sorted = tiers
    .filter((tier) => Number.isInteger(tier) && tier > 0)
    .slice()
    .sort((a, b) => a - b);
  for (const tier of sorted) {
    if (tier >= target) return tier;
  }
  return null;
}

/**
 * 预选参数校验：必须是当前档位之一且不低于渠道下限。
 * 非法值 / 非档位值 / 低于下限 → null（回落现有默认金额）。
 */
export function resolveRechargePreset(
  credits: number | null,
  options?: { tiers?: readonly number[]; minCredits?: number }
): number | null {
  if (credits == null) return null;
  const tiers = options?.tiers ?? RECHARGE_TIER_CREDITS;
  if (!tiers.includes(credits)) return null;
  const minCredits = options?.minCredits ?? 1;
  if (credits < minCredits) return null;
  return credits;
}

/** search → 最终预选档位，一步完成解析 + 校验。 */
export function resolveRechargePresetFromSearch(
  search: string,
  options?: { tiers?: readonly number[]; minCredits?: number; param?: string }
): number | null {
  return resolveRechargePreset(
    parseRechargePresetCredits(search, options?.param),
    options
  );
}
