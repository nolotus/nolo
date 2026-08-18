// Cloud-only routes: local edition 返回空数组。
// cloud edition 在公开集被剥离（PUBLIC_EXCLUDED_PATHS），不进 projection。
// 消费方通过 identity/cloudRoutes 导入，package.json 条件导出解析到本文件（local）或 .cloud.ts。
import type { RouteObject } from "app/routing";

export const cloudRoutes: RouteObject[] = [];