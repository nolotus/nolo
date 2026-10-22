// packages/core/credentialEnvironment.ts
//
// 凭据相关的「环境」判定**唯一真值**。
//
// 之前有 4–5 份拷贝：两个服务端 handler 各自只看 `NODE_ENV === "production"`，
// 其余几处各自按 NOLO_DEPLOY_ENV → NOLO_ENV → NODE_ENV 排序。后果是同一个进程里
// 「平台认为这是生产」而「凭据存储认为这是开发」——于是 `NOLO_DEPLOY_ENV=production`
// 但 `NODE_ENV` 未设的部署会**静默以明文存储凭据**。
//
// 两条概念必须分开：
// - **环境标签**（resolveCredentialEnvironment）：用于归属与展示，按既有优先级取第一个。
// - **是否按生产对待**（isProductionCredentialEnvironment）：**任一**来源显式声明 production
//   就算生产。这样做只会比旧实现更严（旧实现只认 NODE_ENV），绝不会因为优先级
//   把「NODE_ENV=production」这类既有保护放松掉。

export type CredentialEnvironment = string;

/** 接受 `process.env` 与 `Record<string, string | undefined>` 两种来源。 */
export type CredentialEnvSource = Record<string, string | undefined>;

/** 解析环境标签；都没设置时返回 undefined（不与任何合法环境名冲突）。 */
export function resolveCredentialEnvironment(
  env: CredentialEnvSource = process.env,
): string | undefined {
  return (
    env.NOLO_DEPLOY_ENV?.trim() ||
    env.NOLO_ENV?.trim() ||
    env.NODE_ENV?.trim() ||
    undefined
  );
}

/**
 * 是否按生产对待：**任一**来源显式声明 production 就算。
 *
 * 刻意不做「优先级最高的那个说了算」——那会让 `NODE_ENV=production` 被
 * `NOLO_DEPLOY_ENV=alpha` 覆盖，把既有的 fail-fast 降级成明文存储。
 *
 * 一个来源都没设置时**不算生产**：保持既有部署行为不变（不会因为这次改动启动失败）。
 */
export function isProductionCredentialEnvironment(
  env: CredentialEnvSource = process.env,
): boolean {
  return [env.NOLO_DEPLOY_ENV, env.NOLO_ENV, env.NODE_ENV]
    .map((value) => value?.trim())
    .some((value) => value === "production");
}

/**
 * 平台视角的默认：没设置任何环境变量时按生产对待。
 * 与既有 `providerCredentialEnvironment()` 的默认值保持一致。
 */
export function platformCredentialEnvironment(
  env: CredentialEnvSource = process.env,
): string {
  return resolveCredentialEnvironment(env) ?? "production";
}
