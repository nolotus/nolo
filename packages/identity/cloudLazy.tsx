// cloudLazy: 条件加载 cloud-only 模块的 lazy helper。
//
// 公开集（local edition）不包含 life/auth 等 cloud-only 包，直接 import 会导致
// esbuild build 时 module not found（esbuild 会 static resolve 所有 import()，
// 即使在条件分支内）。用变量路径绕过 static resolution：
//
//   const path = "life/LifeSidebar";  // 变量 → esbuild 无法 static resolve
//   return import(/* @vite-ignore */ path);
//
// local 模式（isCloudEdition=false）返回 fallback 组件，不触发 dynamic import。
// cloud 模式（isCloudEdition=true）动态加载真实组件。
//
// 用法：
//   const LifeSidebar = cloudLazy("life/LifeSidebar", () => null);
//   <LifeSidebar />
//
// 泛型 P 默认为 {}。如果 cloud 组件接受 props，消费方应显式传泛型：
//   const Sidebar = cloudLazy<{ collapsed: boolean }>("life/Sidebar", () => null);
// fallback 组件的 props 类型必须与 P 兼容。
import { lazy, type ComponentType } from "react";
// 从 identity barrel 导入 isCloudEdition（走 package.json 条件导出，
// 而非直接 import index.local — 后者永远拿到 false，cloud 构建会回归）。
import { isCloudEdition } from "identity";

export function cloudLazy<P = {}>(cloudPath: string, fallback: ComponentType<P>): ComponentType<P> {
  return lazy(() => {
    if (!isCloudEdition) return Promise.resolve({ default: fallback });
    // dev 模式：esDev（esbuild）同样能把 string literal 的 import() 打成
    // chunk（723a24ed7 之后路径已是 literal，不再依赖 import map），
    // 之前「dev 直接返回 fallback」会导致侧边栏等 cloud 组件在 dev 下
    // 永远空白（2026-09-02 修复）。仅 local edition（无 life/auth 包）保留 fallback。
    return resolveCloudLazyImport(cloudPath);
  });
}

/**
 * 静态路径映射：让 esbuild 能识别并打包对应 chunk。
 * 添加新的 cloud lazy 模块时，在这里加一行映射。
 * 路径必须是 string literal，esbuild 才能 static resolve。
 */
async function resolveCloudLazyImport(cloudPath: string): Promise<{ default: ComponentType<any> }> {
  switch (cloudPath) {
    case "life/web/InviteRewards":
      return import("life/web/InviteRewards");
    case "life/LifeSidebar":
      return import("life/LifeSidebar");
    case "app/pages/Pricing/Price":
      return import("app/pages/Pricing/Price");
    case "app/pages/Recharge":
      return import("app/pages/Recharge");
    case "create/space/pages/SpaceInvite":
      return import("create/space/pages/SpaceInvite");
    case "app/email/AgentEmailE2EPage":
      return import("app/email/AgentEmailE2EPage");
    default:
      throw new Error(
        `[cloudLazy] Unregistered path "${cloudPath}". Add it to the switch in identity/cloudLazy.tsx. ` +
          `Using a bare specifier at runtime would cause "Failed to resolve module specifier" in the browser.`
      );
  }
}