import {
  buildAppRuntimeUrl,
  normalizeAppHttpOrigin,
  normalizeAppHttpUrl,
} from "core/appHttpUrl";

// 协议校验与运行地址构造只有一份实现（web/server 共用）；这里保持既有导入路径不变。
export { buildAppRuntimeUrl, normalizeAppHttpUrl };

const normalizeAbsoluteUrl = (value?: string | null): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const normalizeOrigin = (value?: string | null): string | undefined =>
  normalizeAppHttpOrigin(value);

/**
 * 解析应用的访问地址。
 *
 * 优先级：
 * 1. 自定义域名（customUrl 与平台地址不同时）—— 用户绑定的自定义域保持不变；
 * 2. versionServerOrigin —— 记录里保存的原部署 server，部署位置的真值来源；
 *    副本机与本地入口都不得改写它；
 * 3. url —— 记录里已保存的合法访问地址（服务端下发或此前解析结果）；
 * 4. serverOrigin —— 承载该记录的 server（旧记录兼容路径，**不是**原部署位置）；
 * 5. 都没有部署证据时返回空串：按「地址不可用」处理，不拿入口域名拼一个
 *    看起来能跑、实际 404 的地址。
 */
export const resolvePreferredAppRuntimeUrl = (params: {
  appId?: string | null;
  customUrl?: string | null;
  url?: string | null;
  versionServerOrigin?: string | null;
  serverOrigin?: string | null;
}): string => {
  const customUrl = normalizeAppHttpUrl(params.customUrl);
  const recordedUrl = normalizeAppHttpUrl(params.url);
  const deploymentUrl = buildAppRuntimeUrl(params.appId, params.versionServerOrigin);

  // 自定义域名优先；与平台地址重复时不当作自定义域名。
  const platformUrl = deploymentUrl ?? recordedUrl;
  if (customUrl && customUrl !== platformUrl) return customUrl;

  // 部署位置优先于任何其它来源。
  if (deploymentUrl) return deploymentUrl;

  if (recordedUrl) return recordedUrl;

  // 旧记录兼容：承载该记录的 server。
  const hostUrl = buildAppRuntimeUrl(params.appId, params.serverOrigin);
  if (hostUrl) return hostUrl;

  return "";
};
