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
    // dev 模式下浏览器无法解析 bare specifier（如 "life/web/InviteRewards"），
    // 因为 cloudLazy 用变量路径绕过了 esbuild static resolution，
    // esbuild 不会把 import 路径转成 chunk URL。
    // 生产构建有 import map 能解析，dev 模式直接返回 fallback。
    if (process.env.NODE_ENV !== "production") {
      return Promise.resolve({ default: fallback });
    }
    // 变量路径：esbuild 无法 static resolve，运行时再解析
    const path = cloudPath;
    return import(/* @vite-ignore */ path) as Promise<{ default: ComponentType<P> }>;
  });
}