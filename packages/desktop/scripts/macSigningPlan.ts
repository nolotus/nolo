/**
 * macOS 发布签名的唯一判定源。
 *
 * 为什么单独抽一个纯函数模块：electrobun 配置（packages/desktop/electrobun.config.ts）、
 * postWrap 钩子（scripts/post-wrap.ts）、DMG 打包（scripts/macos-dmg-installer.ts）
 * 三处都要回答同一个问题——「这次 macOS 产物用哪种签名」。判定散落在三处时，
 * 极易出现「配置认为走正式签名、包装链却按 ad-hoc 处理」的错配，而这种错配
 * 产出的产物外观正常、安装时才炸，所以判定必须只有一份实现并可被单测直接覆盖。
 *
 * 两种签名模式：
 * - developer-id：拿到付费的 Apple Developer ID，走 electrobun 原生的正式签名 +
 *   公证路径，行为与改造前逐字一致。
 * - ad-hoc：公开仓没有任何 Apple 签名凭据时的过渡方案。用
 *   `codesign --force --deep --sign -` 给 .app 打上 ad-hoc 签名，让 Gatekeeper
 *   从「已损坏、移入废纸篓」（Apple Silicon 上不可绕过）降级为「未识别开发者」
 *   提示，用户右键「打开」即可放行。
 *
 * 注意 ad-hoc **不消除**警告，Apple 官方也明确未签名/自签名分发不能当作正式
 * 分发渠道；它只是让 macOS 用户能装上。owner 拿到证书后本模块自动切回
 * developer-id，无需改任何调用方。
 */

/** electrobun 的 build.mac.codesign 是 boolean，无法表达 ad-hoc identity。 */
export type MacSigningMode = "developer-id" | "ad-hoc";

export type MacSigningPlan = {
  /** 是否配置了 Developer ID 证书 identity。 */
  hasDeveloperId: boolean;
  /** 是否配置了任一公证凭据（App Store Connect API key 或 Apple ID + app 专用密码）。 */
  hasNotary: boolean;
  /** 本次产物使用的签名模式。 */
  mode: MacSigningMode;
  /** electrobun build.mac.codesign：只能开/关，不能表达 ad-hoc。 */
  electrobunCodesign: boolean;
  /** electrobun build.mac.notarize：没有公证凭据时必须为 false。 */
  electrobunNotarize: boolean;
  /** postWrap / DMG 打包阶段是否需要自己做 ad-hoc 签名。 */
  adhocCodesign: boolean;
  /** 是否检测到任意 Apple 签名相关凭据（含只配了一半的半配置）。 */
  hasAnySigningCredential: boolean;
};

// 「非空」语义必须与 shell 闸门（`[[ -n "${VAR:-}" ]]`）和改造前的 electrobun
// 配置（`Boolean(value)`）一致：非空字符串即为「已配置」。
// 不要在这里 .trim() —— 纯空白字符串在 shell 的 -n 与旧配置的 Boolean 下都算
// 「非空/已配置」，若这里改成 trim 后为空，就会让「shell 判为已配置、配置层
// 判为未配置」的分歧出现，把配置错误切换成另一种签名模式。
const isSet = (value: string | undefined) => typeof value === "string" && value.length > 0;

/**
 * 依据环境变量推导 macOS 签名计划。
 *
 * 判定规则（保持与改造前的 electrobun 配置逐字一致的部分）：
 * - 有 Developer ID → developer-id 模式，electrobun 自己签，公证凭据齐备才公证。
 * - 无 Developer ID → ad-hoc 模式，electrobun 不签（boolean codesign 无法表达
 *   ad-hoc identity），由 postWrap / DMG 阶段补 ad-hoc 签名。
 *
 * 「半配置」（例如只有 Apple ID 没有 Developer ID）在这里仍落到 ad-hoc，
 * 但 CI 的 fail-closed 闸门（scripts/verify/desktop/verifyDesktopMacSigningEnv.sh
 * 的 adhoc 模式）会在构建前拒绝它——闸门才是防静默降级的地方，判定层只负责
 * 描述产物该长什么样。
 */
export const resolveMacSigningPlan = (
  env: Record<string, string | undefined> = process.env,
  options: {
    /**
     * API Key 的 .p8 文件是否真实存在。shell 闸门用 `-f` 检查该路径（只判
     * 变量非空不够：路径不存在同样算缺失），而改造前的 electrobun 配置只看
     * 变量。这里允许调用方注入判断结果，让配置层与 shell 层语义一致，
     * 同时保持本函数本身是纯函数（默认不碰文件系统）。
     */
    apiKeyPathExists?: boolean;
  } = {}
): MacSigningPlan => {
  const hasDeveloperId = isSet(env.ELECTROBUN_DEVELOPER_ID);
  const hasApiKeyNotary = Boolean(
    isSet(env.ELECTROBUN_APPLEAPIISSUER) &&
      isSet(env.ELECTROBUN_APPLEAPIKEY) &&
      isSet(env.ELECTROBUN_APPLEAPIKEYPATH) &&
      (options.apiKeyPathExists ?? true)
  );
  const hasAppleIdNotary = Boolean(
    isSet(env.ELECTROBUN_APPLEID) &&
      isSet(env.ELECTROBUN_APPLEIDPASS) &&
      isSet(env.ELECTROBUN_TEAMID)
  );
  const hasNotary = hasApiKeyNotary || hasAppleIdNotary;
  const hasAnySigningCredential = Boolean(
    hasDeveloperId ||
      hasNotary ||
      isSet(env.ELECTROBUN_APPLEAPIISSUER) ||
      isSet(env.ELECTROBUN_APPLEAPIKEY) ||
      isSet(env.ELECTROBUN_APPLEAPIKEYPATH) ||
      isSet(env.ELECTROBUN_APPLEID) ||
      isSet(env.ELECTROBUN_APPLEIDPASS) ||
      isSet(env.ELECTROBUN_TEAMID)
  );

  if (hasDeveloperId) {
    return {
      hasDeveloperId,
      hasNotary,
      mode: "developer-id",
      electrobunCodesign: true,
      electrobunNotarize: hasNotary,
      adhocCodesign: false,
      hasAnySigningCredential,
    };
  }

  return {
    hasDeveloperId,
    hasNotary,
    mode: "ad-hoc",
    electrobunCodesign: false,
    electrobunNotarize: false,
    adhocCodesign: true,
    hasAnySigningCredential,
  };
};
