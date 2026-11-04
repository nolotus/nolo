import type { AgentQuota } from "ai/agent/quotaSnapshot";
import {
  BIGMODEL_PROVIDER_TARGET,
  buildCredentialUseGrant,
  verifyCredentialUseGrant,
} from "agent-runtime/credentialUseGrant";
import { refreshSubscriptionQuotas } from "./subscriptionQuotaRefresh";
import { resolveCliAgentKeyInput } from "./agentAliases";
import { getReadableCliDb, type AgentCommandDeps } from "./agentCommandSupport";
import {
  buildUpdatedAgentRecord,
  buildCreatedAgentRecord,
  normalizeAgentRecordForOutput,
  parseAgentUpdateArgs,
  readBoundAgentCredential,
  refreshAgentRecordCache,
  resolveAgentRecordFromHybridStore,
  sanitizeAgentRecordForCliOutput,
  writeAgentRecord,
} from "./agentRecordHelpers";
import { parseUserIdFromAuthToken, resolveAuthToken } from "./cliEnvHelpers";
import { readCredentialAvailability } from "agent-runtime/credentialAvailability";
import { clearCliLocalRuntimePreparedAgentCache } from "./client/localRuntimeAdapter";
import { toErrorMessage } from "core/errorMessage";

export async function runAgentReadCommand(
  args: string[],
  deps: AgentCommandDeps = {}
) {
  const env = deps.env ?? process.env;
  const output = deps.output ?? process.stdout;
  const agentInput = args[0]?.trim();
  if (!agentInput || agentInput === "--help" || agentInput === "-h") {
    output.write("Usage: nolo agent read <agent>\n");
    return agentInput ? 0 : 1;
  }

  const authToken = resolveAuthToken(args, env);
  if (!authToken) {
    output.write("[nolo] agent read requires an auth token. Run `nolo login` or set AUTH_TOKEN.\n");
    return 1;
  }

  const agentKey = resolveCliAgentKeyInput(agentInput);
  const db = deps.db ?? await getReadableCliDb(output);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const fallbackFetchImpl = deps.fallbackFetchImpl;

  try {
    let result = await resolveAgentRecordFromHybridStore({
      agentInput,
      cliArgs: args,
      env,
      db,
      fetchImpl,
      fallbackFetchImpl,
    });
    // 容错：传入 agent-pub-<id> 但公开记录不存在时，剥掉前缀用裸 id 再走一次
    // 现有的双候选解析（同时尝试 agent-{userId}-<id> 私有键和 agent-pub-<id>）。
    // 这只是兜底——两次都查不到仍然报 not found，不静默返回错误的 agent。
    if (!result && agentKey.startsWith("agent-pub-")) {
      const bareId = agentKey.slice("agent-pub-".length);
      if (bareId) {
        result = await resolveAgentRecordFromHybridStore({
          agentInput: bareId,
          cliArgs: args,
          env,
          db,
          fetchImpl,
          fallbackFetchImpl,
        });
      }
    }
    if (!result) {
      throw new Error(`agent not found: ${agentKey}`);
    }
    // 额度按需刷新：只探测被读的这一个、且带订阅凭据（apiKeyRef）的 agent；
    // 普通 agent 不付这次往返。失败静默，沿用记录里的快照。
    const rawRecord = result.record as { quota?: AgentQuota; apiKeyRef?: unknown } | null;
    const recordQuota = rawRecord?.quota;
    const hasSubscriptionCredential =
      typeof rawRecord?.apiKeyRef === "string" && rawRecord.apiKeyRef.trim() !== "";
    const fresh = hasSubscriptionCredential
      ? await refreshSubscriptionQuotas({
          entries: [{ key: result.agentKey, ...(recordQuota ? { quota: recordQuota } : {}) }],
          onlyKeys: [result.agentKey],
          env,
          cliArgs: args,
          fetchImpl,
        })
      : {};
    const quota = fresh[result.agentKey] ?? recordQuota;
    const rawRecordObj = result.record as Record<string, unknown> | null;
    const credAvail = await readCredentialAvailability(env).catch(() => ({} as Record<string, number>));
    const credGroup = typeof rawRecordObj?.apiKeyRef === "string" ? rawRecordObj.apiKeyRef : undefined;
    const credDeadline = credGroup ? credAvail[credGroup] : undefined;
    const recordDeadline = typeof rawRecordObj?.nextAvailableAt === "number" ? rawRecordObj.nextAvailableAt : undefined;
    const effectiveNextAvailableAt = Math.max(recordDeadline ?? 0, credDeadline ?? 0) || undefined;
    const isRateLimited = typeof effectiveNextAvailableAt === "number" && effectiveNextAvailableAt > Date.now();

    output.write(JSON.stringify({
      ...normalizeAgentRecordForOutput(result.agentKey, authToken, result.record),
      ...(isRateLimited ? {
        rateLimited: true,
        cooldownRemainingSeconds: Math.ceil((effectiveNextAvailableAt - Date.now()) / 1000),
        nextAvailableAt: new Date(effectiveNextAvailableAt).toISOString(),
      } : {}),
      ...(quota ? { quota } : {}),
      source: result.source,
    }, null, 2));
    output.write("\n");
    return 0;
  } catch (error) {
    output.write(
      `[nolo] agent read failed: ${
        toErrorMessage(error)
      }\n`
    );
    return 1;
  }
}

export async function runAgentUpdateCommand(
  args: string[],
  deps: AgentCommandDeps = {}
) {
  const env = deps.env ?? process.env;
  const output = deps.output ?? process.stdout;
  let parsed;
  try {
    parsed = parseAgentUpdateArgs(args);
  } catch (error) {
    output.write(`[nolo] agent update failed: ${toErrorMessage(error)}\n`);
    return 1;
  }
  if (!parsed) {
    output.write(
      "Usage: nolo agent update <agent> [--model <id>] [--cli-provider <provider>] [--api-source <source>] [--max-concurrent <n>] [--expires-at <iso>] [--prompt <text> | --prompt-file <path> | --prompt-doc <pageKey>] [--tools <json>] [--copy-provider-from <agent>] [--name <name>] [--custom-provider-url <url>] [--api-key <key>|--provider-api-key <key>] [--field key=value]\n"
        .replace("[--field key=value]", "[--handle <name>] [--field key=value]  (e.g. --field disabledTools='[\"exa_search\"]' to disable default tools)")
    );
    return args[0] ? 0 : 1;
  }

  const authToken = resolveAuthToken(args, env);
  if (!authToken) {
    output.write("[nolo] agent update requires an auth token. Run `nolo login` or set AUTH_TOKEN.\n");
    return 1;
  }

  const userId = parseUserIdFromAuthToken(authToken);
  if (!userId) {
    output.write("[nolo] agent update could not read userId from AUTH_TOKEN.\n");
    return 1;
  }

  const db = deps.db ?? await getReadableCliDb(output);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const fallbackFetchImpl = deps.fallbackFetchImpl;

  try {
    const built = await buildUpdatedAgentRecord({
      cliArgs: args,
      parsed,
      env,
      db,
      fetchImpl,
      fallbackFetchImpl,
      authToken,
      credentialBroker: deps.credentialBroker,
      hostApproval: deps.hostApproval,
    });

    await writeAgentRecord({
      agentKey: built.agentKey,
      authToken,
      fallbackFetchImpl,
      fetchImpl,
      serverUrl: built.serverUrl,
      userId,
      record: built.nextRecord,
      remoteIncludeApiKey: !deps.hostApproval?.gateId,
    });
    await refreshAgentRecordCache({
      db,
      agentKey: built.agentKey,
      record: built.nextRecord,
      serverOrigin: built.serverUrl,
    });
    clearCliLocalRuntimePreparedAgentCache();

    output.write(JSON.stringify({
      ok: true,
      agentKey: built.agentKey,
      baseUrl: built.serverUrl,
      updates: sanitizeAgentRecordForCliOutput(built.updates),
      record: sanitizeAgentRecordForCliOutput(built.nextRecord),
    }, null, 2));
    output.write("\n");
    return 0;
  } catch (error) {
    output.write(
      `[nolo] agent update failed: ${
        toErrorMessage(error)
      }\n`
    );
    return 1;
  }
}

export async function runAgentCreateCommand(
  args: string[],
  deps: AgentCommandDeps = {}
) {
  const env = deps.env ?? process.env;
  const output = deps.output ?? process.stdout;
  let parsed;
  try {
    parsed = parseAgentUpdateArgs(args);
  } catch (error) {
    output.write(`[nolo] agent create failed: ${toErrorMessage(error)}\n`);
    return 1;
  }
  if (!parsed) {
    output.write(
      "Usage: nolo agent create <agent> [--preset <id>] [--model <id>] [--cli-provider <provider>] [--api-source <source>] [--max-concurrent <n>] [--expires-at <iso>] [--prompt <text> | --prompt-file <path> | --prompt-doc <pageKey>] [--tools <json>] [--copy-provider-from <agent>] [--name <name>] [--custom-provider-url <url>] [--api-key <key>|--provider-api-key <key>] [--verify] [--field key=value]\n" +
        "  --preset <id> resolves a `nolo agent providers` preset (e.g. step-plan) into provider/baseUrl/model; explicit flags override it.\n"
        .replace("[--field key=value]", "[--handle <name>] [--field key=value]")
    );
    return args[0] ? 0 : 1;
  }

  const authToken = resolveAuthToken(args, env);
  if (!authToken) {
    output.write("[nolo] agent create requires an auth token. Run `nolo login` or set AUTH_TOKEN.\n");
    return 1;
  }

  const userId = parseUserIdFromAuthToken(authToken);
  if (!userId) {
    output.write("[nolo] agent create could not read userId from AUTH_TOKEN.\n");
    return 1;
  }

  const db = deps.db ?? await getReadableCliDb(output);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const fallbackFetchImpl = deps.fallbackFetchImpl;

  try {
    const built = await buildCreatedAgentRecord({
      cliArgs: args,
      parsed,
      env,
      db,
      fetchImpl,
      fallbackFetchImpl,
      authToken,
      credentialBroker: deps.credentialBroker,
      hostApproval: deps.hostApproval,
    });

    await writeAgentRecord({
      agentKey: built.agentKey,
      authToken,
      fallbackFetchImpl,
      fetchImpl,
      serverUrl: built.serverUrl,
      userId,
      record: built.nextRecord,
      remoteIncludeApiKey: !deps.hostApproval?.gateId,
    });
    await db.put(built.agentKey, {
      ...built.nextRecord,
      dbKey: built.agentKey,
      key: built.nextRecord?.key || built.agentKey,
      serverOrigin: built.serverUrl,
    });
    clearCliLocalRuntimePreparedAgentCache();

    let verifyResult: {
      ok: boolean;
      status?: number;
      providerUrl?: string;
      model?: string;
      reply?: string;
      reason?: string;
    } | undefined;
    if (parsed.verify) {
      try {
        const { verifyCustomProvider } = await import("./agentProviderCommands");
        const rec = built.nextRecord as {
          customProviderUrl?: string;
          apiKey?: string;
          apiKeyRef?: string;
          credentialRef?: string;
          apiKeyHeader?: string;
          model?: string;
        };
        // 凭据在进程内按 ref 取用，作用域限定在用户显式指定的 provider 目标上；
        // 明文只活在这一个调用里，不进 argv / 记录 / 日志。
        const verifyCredentialRef =
          typeof rec.credentialRef === "string" && rec.credentialRef.trim()
            ? rec.credentialRef.trim()
            : "";
        if (verifyCredentialRef) {
          // 凭据 → 目标 的授权只能来自宿主可信确认通道（ActionGate）。
          // 模型自填的 URL / 参数不构成授权；CLI 批处理没有该通道＝不外发。
          const providerUrl = rec.customProviderUrl ?? "";
          const hostGateId = (deps.hostApproval?.gateId ?? "").trim();
          const confirmCredentialUse = hostGateId ? undefined : deps.confirmCredentialUse;
          let grantReason = "host-grant-unavailable: no in-process host approval in this entry point; credential not sent";
          let grantedOrigin: string | undefined;
          if (hostGateId) {
            // 宿主在真实批准后传进来的 gate id：批准事实来自宿主调用栈，不由模型提供。
            const gate = {
              id: hostGateId,
              kind: "confirm" as const,
              title: "Use pasted API key for this agent?",
              body: `Target: ${providerUrl}`,
              payload: { agentKey: built.agentKey, credentialRef: verifyCredentialRef },
            };
            const builtGrant = buildCredentialUseGrant({
              gate,
              result: { gateId: hostGateId, status: "completed", output: "confirmed" },
              credentialRef: verifyCredentialRef,
              agentKey: built.agentKey,
              deviceId: deps.deviceId ?? "",
              providerId: BIGMODEL_PROVIDER_TARGET.providerId,
              providerUrl,
              operations: ["verify"],
              persistence: "os-store",
            });
            if (builtGrant.ok) {
              const granted = verifyCredentialUseGrant({
                grant: builtGrant.grant,
                credentialRef: verifyCredentialRef,
                agentKey: built.agentKey,
                requestUrl: providerUrl,
                operation: "verify",
              });
              if (granted.ok) {
                grantedOrigin = builtGrant.grant.allowedOrigin;
              } else {
                grantReason = `host-grant-rejected: ${granted.reason}; credential not sent`;
              }
            } else {
              grantReason = `host-grant-rejected: ${builtGrant.reason}; credential not sent`;
            }
          }
          if (confirmCredentialUse) {
            const gate = {
              id: `credential-use-${built.agentKey}`,
              kind: "confirm" as const,
              title: "Use pasted API key for this agent?",
              body: `Target: ${providerUrl}`,
              payload: { agentKey: built.agentKey, credentialRef: verifyCredentialRef },
            };
            const gateResult = await confirmCredentialUse(gate);
            const builtGrant = buildCredentialUseGrant({
              gate,
              result: gateResult,
              credentialRef: verifyCredentialRef,
              agentKey: built.agentKey,
              deviceId: deps.deviceId ?? "",
              providerId: BIGMODEL_PROVIDER_TARGET.providerId,
              providerUrl,
              operations: ["verify"],
              persistence: "os-store",
            });
            if (builtGrant.ok) {
              const granted = verifyCredentialUseGrant({
                grant: builtGrant.grant,
                credentialRef: verifyCredentialRef,
                agentKey: built.agentKey,
                requestUrl: providerUrl,
                operation: "verify",
              });
              if (granted.ok) {
                grantedOrigin = builtGrant.grant.allowedOrigin;
              } else {
                grantReason = `host-grant-rejected: ${granted.reason}; credential not sent`;
              }
            } else {
              grantReason = `host-grant-rejected: ${builtGrant.reason}; credential not sent`;
            }
          }
          if (!grantedOrigin) {
            // 不再从可写的授权文件里读"已批准"：批准事实只存在于宿主进程内（见
            // hostCredentialCreate），CLI 侧没有可信来源就必须 fail closed。
            if (grantReason.startsWith("host-grant-unavailable")) {
              grantReason =
                "host-grant-unavailable: no in-process host approval for this credential/target in this entry point; credential not sent";
            }
          }
          if (!grantedOrigin) {
            verifyResult = {
              ok: false,
              providerUrl,
              model: rec.model,
              reason: grantReason,
            };
          } else {
            const secret = await readBoundAgentCredential(
              verifyCredentialRef,
              deps.credentialBroker,
            );
            verifyResult = secret
              ? await verifyCustomProvider({
                  providerUrl,
                  apiKey: secret,
                  apiKeyHeader: rec.apiKeyHeader,
                  model: rec.model,
                  prompt: parsed.verifyPrompt,
                  fetchImpl,
                  // 实际请求目标必须等于授权的 origin；重定向一律拒绝。
                  allowedOrigin: grantedOrigin,
                })
              : {
                  ok: false,
                  providerUrl,
                  model: rec.model,
                  reason: "host-grant-ok but credential is not readable from the OS store",
                };
          }
        } else {
          verifyResult = await verifyCustomProvider({
            providerUrl: rec.customProviderUrl,
            apiKey: rec.apiKey,
            apiKeyHeader: rec.apiKeyHeader,
            model: rec.model,
            prompt: parsed.verifyPrompt,
            fetchImpl,
          });
        }
      } catch (error) {
        verifyResult = {
          ok: false,
          reason: toErrorMessage(error),
        };
      }
    }

    const isVerifyFailure = parsed.verify ? (!verifyResult || !verifyResult.ok) : false;
    const verified = parsed.verify ? Boolean(verifyResult?.ok) : null;

    const apiKeyRef = String(built.updates?.apiKeyRef || "").trim();
    let authHint: string | undefined;
    const OAUTH_REFS = new Set(["claude", "chatgpt", "xai", "antigravity", "cloudflare"]);
    if (apiKeyRef && OAUTH_REFS.has(apiKeyRef)) {
      try {
        const { createOAuthTokenStore } = await import("agent-runtime/oauthTokenStore");
        const store = createOAuthTokenStore();
        if (!store.read(apiKeyRef as any)) {
          authHint = `Subscription "${apiKeyRef}" is not authorized yet. Run \`nolo auth ${apiKeyRef}\` to log in.`;
        }
      } catch {}
    }

    output.write(JSON.stringify({
      ok: !isVerifyFailure,
      created: true,
      verified,
      agentKey: built.agentKey,
      baseUrl: built.serverUrl,
      updates: sanitizeAgentRecordForCliOutput(built.updates),
      record: sanitizeAgentRecordForCliOutput(built.nextRecord),
      ...(verifyResult ? { verify: verifyResult } : {}),
      ...(authHint ? { hint: authHint } : {}),
    }, null, 2));
    output.write("\n");

    if (authHint) {
      const errorOutput = deps.error ?? process.stderr;
      errorOutput.write(`[nolo] Hint: ${authHint}\n`);
    }
    return isVerifyFailure ? 2 : 0;
  } catch (error) {
    output.write(
      `[nolo] agent create failed: ${
        toErrorMessage(error)
      }\n`
    );
    return 1;
  }
}
