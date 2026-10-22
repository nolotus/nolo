import { lazy, type ComponentType } from "react";

/**
 * cloudLazy: local / desktop fallback 实现。
 *
 * 公开集与 desktop edition 不包含 life/auth 等 cloud-only 私有模块。
 * 走 package.json 条件导出（default 条件）。
 * 严禁包含任何 cloud 私有包的静态或字面量 import，避免 esbuild 解析失败。
 * 语义与原本 isCloudEdition = false 完全一致，直接返回 fallback 组件。
 */
export function cloudLazy<P = {}>(
  _cloudPath: string,
  fallback: ComponentType<P>
): ComponentType<P> {
  return lazy(() => Promise.resolve({ default: fallback }));
}

export default cloudLazy;
