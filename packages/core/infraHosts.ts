/**
 * 平台基础设施主机的 **IP 单一真源**（TS 侧）。
 *
 * 为什么要有它（2026-11-17 真实事故）：alpha 应用机从美国 Vultr 换到德国 netcup 之后，
 * 有三处生产代码仍硬编码旧 IP，其中
 *   - `packages/nolo-ci/core/src/mapping.ts` 的兜底部署目标是 **GitHub Actions 挂掉时手工
 *     接管部署**用的默认值 —— 它留在旧机上，等于紧急接管那天部署到一台已经停掉应用的机器；
 *   - `packages/server/handlers/appDomainHandler.ts` 的「平台域期望 A 记录」会让自定义域名
 *     绑定校验对着一台不存在的机器判定；
 *   - 顺带发现 `nolo.chat` 那条期望 A 记录本身也是旧的（写的是 tw 机房的 IP）。
 * 散落的字面量靠人记得改不可靠，所以在这里收敛成唯一常量，消费者只准引用，不准再写字面量。
 *
 * 权威文档真源：`.agents/skills/deployment/references/server-ops.md`（机器身份、服务、端口）。
 * 一致性由 `scripts/ci/alphaHostIpConsistency.source.test.ts` 守住：文档、本模块、
 * `scripts/ops/sshAlpha.sh`（shell 无法 import TS）四处必须说同一个 IP。
 */

/** alpha 应用机（德国 netcup）。同时是 GitHub runner `alpha-ci` 与 nolo-ci 控制面宿主。 */
export const ALPHA_ORIGIN_IP = "62.83.99.45";

/** 生产 main（GCP asia-east1-c，台湾）。 */
export const MAIN_ORIGIN_IP = "34.81.179.232";

/**
 * 平台域 → 期望的源站 A 记录。
 *
 * 用途：自定义域名绑定时的「你指向的确实是我们的机器」校验（见 appDomainHandler）。
 * 只列**归平台所有**的主机名；用户自定义域名不在此表。
 */
export const PLATFORM_ORIGIN_IPS: ReadonlyMap<string, string> = new Map([
  ["us.nolo.chat", ALPHA_ORIGIN_IP],
  ["de.nolo.chat", ALPHA_ORIGIN_IP],
  // ⚠️ 待核验的既有不一致：这里是 `34.81.108.123`，而 nolo.chat 当前实际解析是
  // `34.81.179.232`（DoH 实测，docs/cloudflare.md 把 34.81.108.123 记在 tw.nolo.chat）。
  // 该值决定「自定义域名该指向哪个 IP」的引导文案，改它等于改行为，故保留原值并标注，
  // 由 owner 确认路由/证书/承载后再改。
  ["nolo.chat", "34.81.108.123"],
]);

/** 显式导出上面那条待核验值，便于 review/测试看到它没有被偷偷改掉。 */
export const PENDING_VERIFY_NOLO_CHAT_ORIGIN = "34.81.108.123";
