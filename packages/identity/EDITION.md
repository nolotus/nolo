# Identity Edition 注入模式

## 概述

`packages/identity` 用 `package.json` 条件导出实现 edition 注入：cloud edition 委托 auth 包，local edition 提供 no-op 实现。公开投影（`prepareNoloOpenSourceMirror`）只保留 local edition，cloud 文件通过 `PUBLIC_EXCLUDED_PATHS` 剥离。

## 现有 edition 对

| 导出路径 | cloud 实现 | local 实现 | 用途 |
|---|---|---|---|
| `identity/selectors` | `selectors.cloud.ts` | `selectors.local.ts` | 身份读取 selector |
| `identity/actions` | `actions.cloud.ts` | `actions.local.ts` | 写操作 action creators |
| `identity/cloudRoutes` | `cloudRoutes.cloud.ts` | `cloudRoutes.local.ts` | auth+life 路由数组 |
| `identity/RequireSignedIn` | `RequireSignedIn.cloud.tsx` | `RequireSignedIn.local.tsx` | 登录守卫组件 |
| `identity/cloudBootstrap` | `cloudBootstrap.cloud.ts` | `cloudBootstrap.local.ts` | token manager + auth state bootstrap |
| `identity/authReducer` | `authReducer.cloud.ts` | `authReducer.local.ts` | auth reducer |
| `identity/authTypes` | `authTypes.cloud.ts` | `authTypes.local.ts` | TokenManager 等类型 |
| `identity/useDeleteOwnAccountFlow` | `useDeleteOwnAccountFlow.cloud.ts` | `useDeleteOwnAccountFlow.local.ts` | 删账号 hook |

非 edition 导出（两版共用）：`identity`（barrel）、`identity/cloudLazy`（条件 lazy helper）、`identity/types`。

## 新增 edition 对的 4 步清单

1. **创建文件对**：`<name>.cloud.ts`（委托 auth）+ `<name>.local.ts`（no-op）
2. **package.json 加条件导出**：
   ```json
   "./<name>": {
     "nolo-cloud": "./<name>.cloud.ts",
     "default": "./<name>.local.ts"
   }
   ```
3. **`PUBLIC_EXCLUDED_PATHS` 加 cloud 文件**（`scripts/release/prepareNoloOpenSourceMirror.ts`）
4. **不需要手动加 gate allowlist** — gate 自动跳过 `.cloud.ts/.cloud.tsx` 文件的 import 检查

## 规则

- **函数签名必须匹配**：cloud 和 local 的导出函数/类型签名必须一致。reviewer 在 wave 5 审查中抓到过 TokenManager 和 bootstrap 函数签名不匹配的 HIGH 问题。
- **local no-op 不假设 Redux**：no-op action 返回 `{ type: "identity/noop" }`，但不要假设 dispatch 存在（react-redux 弃用方向）。
- **cloud 文件不进 projection**：任何 `.cloud.ts/.cloud.tsx` 文件自动被 gate 跳过 import 检查，但仍需在 `PUBLIC_EXCLUDED_PATHS` 里显式列出（防止被 copyTree 复制进 projection）。

## cloudLazy helper

公开集消费 cloud-only 组件（如 life 包）时用 `identity/cloudLazy`：
```ts
import { cloudLazy } from "identity/cloudLazy";
const LifeSidebar = cloudLazy("life/LifeSidebar", () => null);
```
cloud 模式动态加载，local 模式返回 fallback 组件。用变量路径绕过 esbuild static resolution。