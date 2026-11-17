# Identity Edition 注入模式

## 概述

`packages/identity` 用 `package.json` 条件导出实现 edition 注入：cloud edition 委托 auth 包，desktop/local edition 提供公开实现（依契约读取会话、提供浏览器管理入口或 no-op）。公开投影（`prepareNoloOpenSourceMirror`）保留 desktop/local edition，cloud 文件通过 `PUBLIC_EXCLUDED_PATHS` 剥离。

## 现有 edition 对

| 导出路径 | cloud 实现 | local 实现 | 用途 |
|---|---|---|---|
| `identity/selectors` | `selectors.cloud.ts` | `selectors.local.ts` | 身份读取 selector |
| `identity/actions` | `actions.cloud.ts` | `actions.local.ts` | 写操作 action creators |
| `identity/cloudRoutes` | `cloudRoutes.cloud.ts` | `cloudRoutes.local.ts` | auth+life 路由数组 |
| `identity/RequireSignedIn` | `RequireSignedIn.cloud.tsx` | `RequireSignedIn.local.tsx` | 登录守卫组件 |
| `identity/cloudBootstrap` | `cloudBootstrap.cloud.ts` | `cloudBootstrap.local.ts` | token manager + auth state bootstrap |
| `identity/authTypes` | `authTypes.cloud.ts` | `authTypes.local.ts` | TokenManager 等类型 |
| `identity/useDeleteOwnAccountFlow` | `useDeleteOwnAccountFlow.cloud.ts` | `useDeleteOwnAccountFlow.local.ts` | 删账号 hook |
| `identity/useIdentity` | `useIdentity.cloud.ts` | `useIdentity.local.ts` | 身份读取 React hook |
| `identity/accountProfile` | `accountProfile.cloud.ts` | `accountProfile.local.ts` | 账号 Profile 读取 |
| `identity/storeSession` | `storeSession.cloud.ts` | `storeSession.local.ts` | Redux store 会话运行时组装 |

非 edition 导出（两版共用）：`identity`（barrel）、`identity/cloudLazy`（条件 lazy helper）、`identity/types`。

## Desktop edition（nolo-desktop 条件，Phase 2）

Desktop 行为与纯 local 不同的导出面在 `nolo-cloud`/`default` 之外显式声明 `nolo-desktop`（排第一，fail closed）：

| 导出路径 | desktop 实现 | 与 local 的差异 |
|---|---|---|
| `identity`（barrel） | `index.desktop.ts` | session-aware hooks，`isCloudEdition=false` |
| `identity/selectors` | `selectors.desktop.ts` | 真实 isLoggedIn；未绑定回退 Local User |
| `identity/actions` | `actions.desktop.ts` | 委托公开 AccountSessionService；失败必须 rethrow |
| `identity/cloudRoutes` | `cloudRoutes.desktop.tsx` | `/login`、`/life`、`/life/usage` 有意图页面（外跳 allowlist），绝不 NoMatch |
| `identity/accountProfile` | `accountProfile.desktop.ts` | 复用公开 core/accountSession 的 profile 读取 |
| `identity/cloudBootstrap` | `cloudBootstrap.desktop.ts` | desktopTokenManager（Phase 1） |
| `identity/storeSession` | `storeSession.desktop.ts` | 真实会话 core/service 组装（Phase 1） |

共用（非条件）：`identity/accountExternalActions`（固定 nolo.chat allowlist + `nolo-desktop-browser-action` host bridge 精确 schema）。契约测试：`desktopEdition.source.test.ts`、`accountActions.desktop.test.tsx`（含 `--conditions=nolo-desktop` 运行时解析探针）。

## 公开账号读取与 Google 管理

三个 subpath 的条件顺序固定为 `nolo-desktop`、`nolo-cloud`、`default`：

- `identity/useAccountSession` → `useAccountSession.desktop.ts` / `useAccountSession.cloud.ts` / `useAccountSession.local.ts`。公开读取桥接保留完整 `AccountSessionSnapshot`，与私有 hooks 共用同一 Provider Context；不提供认证写能力。
- `identity/GoogleBinding` → `GoogleBinding.desktop.tsx` / `GoogleBinding.cloud.tsx` / `GoogleBinding.local.tsx`。
- `identity/GoogleButton` → `GoogleButton.desktop.tsx` / `GoogleButton.cloud.tsx` / `GoogleButton.local.tsx`；保持 `mode: "login" | "bind" | "revoke"` 与可选 `returnTo` 签名。

Google cloud 组件委托私有原实现；desktop/default 提供浏览器管理入口，不在本地绑定或撤销 Google，不把 `returnTo`、账号或 token 带入安全页 URL。发送打开请求不代表浏览器已打开、操作已完成或桌面状态已更新。

三份 cloud 文件全部显式排除。投影只通过 `PUBLIC_IMPORT_REWRITES` 的四条精确 import 规则转换现有会话与 Google 消费者；不公开 auth 包、不放宽私有 import gate。根 `App.tsx` 是 RN 入口，不在投影中；实际 web 入口 `packages/app/web/App.tsx` 使用同一会话重写规则。

## 新增 edition 对的 4 步清单

1. **创建 edition 文件**：`<name>.cloud.ts(x)`（委托 auth）+ `<name>.local.ts(x)`（按公开契约实现）；desktop 行为有差异时加 `<name>.desktop.ts(x)`，条件排第一。
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