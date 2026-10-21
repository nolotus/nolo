// packages/agent-runtime/localSecretResolver.ts
//
// broker 的**本地实现**：把 `core/secretsStore` 里的一条 secret 解析成
// 「要注入子进程的环境变量」。
//
// 这是 broker 与真实凭据之间缺的最后一块——broker 本身只接受注入的 resolver，
// 之前仓库里没有任何真实实现，所以它取不到凭据。
//
// 边界：
// - 只读本地 secret store，不碰服务端凭据、不做 space/user 作用域解析（那是 D1/D5 的范围）；
// - 不存在的 ref → `null`（broker 回 `unknown_credential`）；
// - **映射失败或结果为空时抛错**（broker 回 `resolver_failed`）——不允许无凭据启动，
//   也不能把「有这条 secret 但解析不了」伪装成「没有这条」；
// - **store 损坏时抛错**（`readSecretsForRead().corrupted`）：`getSecret()` 会把损坏读成空，
//   不自己检查就会把「存储坏了」误报成「没配这条凭据」。
//
// 关于「映射结果为空」这条兜底为什么不是死路径：`resolveSecretEnvVars()` 会**再次读 store**，
// 若两次读取之间 secret 被删或 store 变得不可读，它会返回 `{}`——兜底把这种情况变成失败。
// - 返回值只作为子进程环境变量传入，**不经过 agent 可见的面**。

import { readSecretsForRead, resolveSecretEnvVars } from "core/secretsStore";
import type { CredentialResolver } from "./credentialExecBroker";

export type LocalSecretResolverOptions = {
  /** 注入前的名称校验，默认拒绝空白名。 */
  normalizeRef?: (ref: string) => string | null;
};

const defaultNormalizeRef = (ref: string): string | null => {
  const trimmed = typeof ref === "string" ? ref.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
};

export function createLocalSecretResolver(
  options: LocalSecretResolverOptions = {},
): CredentialResolver {
  const normalizeRef = options.normalizeRef ?? defaultNormalizeRef;

  return async (ref) => {
    const name = normalizeRef(ref);
    if (!name) return null;

    // 必须**自己**看 corrupted 状态：`getSecret()` 会把损坏的 store 读成空对象，
    // 于是「存储坏了」会被误报成「没有这条凭据」，把使用者引向重新配置而不是修存储。
    // 这里抛错，broker 会把它转成固定码 `resolver_failed`（不透传原始信息）。
    const read = readSecretsForRead();
    if (read.corrupted) {
      throw new Error("credential_store_corrupted");
    }
    if (!(name in read.data)) return null;

    // 映射失败（无映射字段 / 结构不符）**故意不 catch**：抛错同样不会启动子进程，
    // 但不会被伪装成「这条凭据不存在」。broker 侧统一转 `resolver_failed`。
    const env = resolveSecretEnvVars(name);
    if (Object.keys(env).length === 0) {
      throw new Error("credential_not_mappable");
    }
    return env;
  };
}
