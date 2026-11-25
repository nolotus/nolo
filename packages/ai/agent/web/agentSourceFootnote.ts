/**
 * 订阅方案脚注里要列出的品牌名。
 *
 * 唯一真源是 registry 给出的订阅预设列表（`listSubscriptionPresetOptions`，
 * 含 Token Plan 类与 OAuth 品牌）；这里只负责把它拼成可读文案，避免界面上
 * 再维护一份手写的"支持某某"名单——那份名单不会随 registry 变化，会变成
 * 用户看到的过期承诺。
 *
 * 带 `riskNotice` 的通道（厂商限制第三方登录、有账号停用风险）**不进**这份
 * 「无条件支持」名单：它们仍可在选择器里选到，但卡片脚注不能把它们写成
 * 没有前提的支持项。
 *
 * 排序：当前选中且已确认连接的 OAuth → Key 订阅 → 其余 OAuth。
 * 页面只检查当前选择的 OAuth，不探测其他品牌；同组沿用 registry 顺序。
 */
export type SubscriptionFootnotePlan = {
  label?: string;
  riskNotice?: string;
  requiresDesktopOAuth?: boolean;
  oauthConnected?: boolean;
};

export function subscriptionFootnoteProviders(
  plans: readonly SubscriptionFootnotePlan[],
): { preview: string[]; total: number } {
  const groups: [string[], string[], string[]] = [[], [], []];
  for (const plan of plans) {
    if (plan.riskNotice?.trim()) continue;
    const label = plan.label?.trim();
    if (!label) continue;
    const rank = !plan.requiresDesktopOAuth ? 1 : plan.oauthConnected ? 0 : 2;
    groups[rank].push(label);
  }
  const names = [...new Set(groups.flat())];
  return { preview: names.slice(0, 4), total: names.length };
}
