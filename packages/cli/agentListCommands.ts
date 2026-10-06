import { toErrorMessage } from "core/errorMessage";
import { formatQuotaSummary } from "ai/agent/quotaSnapshot";
import { summarizeCredentialGroups } from "ai/agent/safeAgentSummary";
import { injectSpeedContextIntoListAgentsResult } from "ai/agent/candidateSpeedContext";
import path from "node:path";
import { resolveNoloHome } from "../database-engine/dbPath";
import {
  buildAgentDiscoveryResult,
  matchesAgentQuery,
  toDiscoverySafeAgentSummary,
} from "ai/agent/agentDiscovery";
import { getReadableCliDb, type AgentCommandDeps, type OutputLike } from "./agentCommandSupport";
import { refreshSubscriptionQuotas } from "./subscriptionQuotaRefresh";
import {
  decorateAgentsWithPublicStatusAcrossServers,
  listFavoriteAgentIdsAcrossServers,
  listLocalCachedAgents,
  listRemoteAgentsAcrossServers,
  listRemoteAgents,
  listRemotePublicAgents,
  normalizeListedAgent,
  parseAgentListArgs,
  isAgentUnavailableNow,
  type ListedAgent,
} from "./agentListHelpers";
import {
  applyCredentialAvailability,
  readCredentialAvailability,
} from "./credentialAvailability";
import {
  queryUserRecords,
  readDbRecord,
} from "./agentRecordHelpers";
import { buildSpaceLookup, getSpaceContentKeys } from "./cliSpaceHelpers";
import {
  parseUserIdFromAuthToken,
  readOption,
  resolveAuthToken,
  resolveServerCandidates,
  resolveServerUrl,
  type EnvLike,
} from "./cliEnvHelpers";
import { readLiveDbRecordAfterTombstoneMerge } from "./globalRecordOperations";

/**
 * Diagnostics sink for the optional speed-sample read: `--json` output must stay
 * parseable, and a local db that cannot be opened simply means AA-only speed
 * data rather than a failed command.
 */
const discardOutput: OutputLike = { write: () => undefined };

/**
 * Disk cache for the observed speed samples: every `nolo agent list` is a fresh
 * process, so the in-process samples cache in ai/agent/candidateSpeedContext
 * never survives a call. Layout: `<NOLO_HOME>/cache/speed-samples-<userId>.json`.
 */
export function resolveSpeedSamplesCachePath(env: EnvLike, userId: string): string {
  const safeUserId = userId.replace(/[^A-Za-z0-9._-]/g, "_");
  // NOLO_HOME is read from the process environment as well: callers pass a
  // partial deps.env (tests), and a cache path that silently fell back to the
  // developer's real ~/.nolo would defeat that isolation.
  const mergedEnv = { ...process.env, ...env };
  return path.join(resolveNoloHome({ env: mergedEnv }), "cache", `speed-samples-${safeUserId}.json`);
}

export async function runAgentListCommand(
  args: string[],
  deps: AgentCommandDeps = {}
) {
  const env = deps.env ?? process.env;
  const output = deps.output ?? process.stdout;
  const { wantJson, wantSafe, publicOnly, scope: requestedScope, idsOnly, showUnavailable, verbose, query } = parseAgentListArgs(args);
  if (requestedScope && !["preferred", "public", "all"].includes(requestedScope)) {
    throw new Error(`Invalid scope '${requestedScope}'`);
  }
  if (requestedScope && publicOnly && requestedScope !== "public") {
    throw new Error(`Conflicting arguments: scope='${requestedScope}' conflicts with publicOnly=true.`);
  }
  // Keep the legacy CLI --public-only path on its existing companion-proof
  // filtering; explicit --scope=public uses the marketplace datasource.
  const scope = requestedScope ?? "preferred";
  const spaceInput = readOption(args, "--space") ?? readOption(args, "--space-id");

  const authToken = resolveAuthToken(args, env);
  if (!authToken) {
    output.write("[nolo] agent list requires an auth token. Run `nolo login` or set AUTH_TOKEN.\n");
    return 1;
  }

  const userId = parseUserIdFromAuthToken(authToken);
  if (!userId) {
    output.write("[nolo] agent list could not read userId from AUTH_TOKEN.\n");
    return 1;
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const fallbackFetchImpl = deps.fallbackFetchImpl;
  const serverUrl = resolveServerUrl(args, env);
  const serverUrls = resolveServerCandidates(args, env, serverUrl);

  try {
    let agents: ListedAgent[];
    let source: "local-cache" | "remote-cache" | "global-cache";
    let serverFailures: Array<{ serverUrl: string; error: string }> = [];
    try {
      const remoteResult = await listRemoteAgentsAcrossServers({
        authToken,
        fallbackFetchImpl,
        fetchImpl,
        serverUrls,
        userId,
      });
      agents = remoteResult.agents;
      serverFailures = remoteResult.failures;
      source = "global-cache";
    } catch {
      try {
        const db = deps.db ?? await getReadableCliDb(output);
        agents = await listLocalCachedAgents({ db, userId });
        source = "local-cache";
      } catch {
        agents = await listRemoteAgents({
          authToken,
          fallbackFetchImpl,
          fetchImpl,
          serverUrl,
          userId,
          queryUserRecords,
          readDbRecord,
        });
        source = "remote-cache";
      }
    }

    if (scope !== "preferred") {
      const publicAgents = await Promise.all(serverUrls.map((url) => listRemotePublicAgents({
        authToken, fetchImpl, serverUrl: url, limit: 500,
      })));
      agents = publicAgents.flat();
      if (scope === "all") {
        const preferred = await listRemoteAgentsAcrossServers({
          authToken, fallbackFetchImpl, fetchImpl, serverUrls, userId,
        });
        agents = [...preferred.agents, ...agents];
      }
    }

    agents = agents.filter((agent) => agent.privateKey.startsWith("agent-"));
    let resolvedSpaceId: string | null = null;
    let spaceContentKeys: Set<string> | null = null;
    if (spaceInput) {
      const { spaceId, spaceKey } = buildSpaceLookup(spaceInput);
      resolvedSpaceId = spaceId;
      const spaceRead = await readLiveDbRecordAfterTombstoneMerge({
        authToken,
        dbKey: spaceKey,
        fallbackFetchImpl,
        fetchImpl,
        serverUrls,
      });
      serverFailures = [...serverFailures, ...spaceRead.failures];
      const spaceRecord = spaceRead.record;
      const currentSpaceContentKeys = getSpaceContentKeys(spaceRecord);
      spaceContentKeys = currentSpaceContentKeys;
      agents = agents.filter((agent) =>
        currentSpaceContentKeys.has(agent.privateKey) ||
        currentSpaceContentKeys.has(agent.publicKey) ||
        currentSpaceContentKeys.has(agent.id)
      );
    }
    if (source === "global-cache") {
      await decorateAgentsWithPublicStatusAcrossServers({
        agents,
        authToken,
        fallbackFetchImpl,
        fetchImpl,
        serverUrls,
      });
    }
    if (publicOnly) {
      agents = agents.filter((agent) => agent.publicRecordExists);
    }

    // 合并 credential 级冷却：限流是 provider 凭证的属性，共用同一 OAuth
    // （chatgpt / claude / antigravity）的 agent 必须一起被判定为不可用，
    // 否则列表会把「凭证已耗尽但自己还没撞过」的 agent 显示成可用，用户选中
    // 后必然再撞一次。与 agent 自身的 nextAvailableAt 取更晚者。
    agents = applyCredentialAvailability(
      agents,
      await readCredentialAvailability(env).catch(() => ({})),
    );

    // 429 限流中（nextAvailableAt 在未来）的 agent 默认不列出，避免误选到
    // 打不了的 agent。--show-unavailable 可见全量（脚本/排障需要）。
    // 在 space/publicOnly 过滤之后计算总数，避免把无关排除的 agent 计入。
    const unavailableCount = agents.filter((agent) => isAgentUnavailableNow(agent)).length;
    let agentsForOutput = showUnavailable
      ? agents
      : agents.filter((agent) => !isAgentUnavailableNow(agent));
    if (query && typeof query === "string" && query.trim()) {
      agentsForOutput = agentsForOutput.filter((agent) => matchesAgentQuery(agent as any, query));
    }

    // 额度按需刷新：只在真要展示完整列表时探测（--ids 等脚本场景不付这个代价），
    // 只探测订阅类 agent（有凭据的私有 agent）。失败静默，沿用缓存里的快照。
    if (!idsOnly) {
      const fresh = await refreshSubscriptionQuotas({
        entries: agentsForOutput.map((agent) => ({
          key: agent.privateKey,
          ...(agent.quota ? { quota: agent.quota } : {}),
          probeable: agent.credentialConfigured === true,
        })),
        env,
        cliArgs: args,
        fetchImpl,
      });
      for (const agent of agentsForOutput) {
        const quota = fresh[agent.privateKey];
        if (quota) agent.quota = quota;
      }
    }

    if (idsOnly) {
      output.write(`${agentsForOutput.map((agent) => agent.id).join("\n")}\n`);
      return 0;
    }

    if (wantSafe) {
      const favoritesMap = await listFavoriteAgentIdsAcrossServers({
        authToken,
        fetchImpl,
        serverUrls,
      }).catch(() => ({} as Record<string, number>));

      const existingKeys = new Set<string>();
      for (const agent of agents) {
        existingKeys.add(agent.privateKey);
        existingKeys.add(agent.publicKey);
        existingKeys.add(agent.id);
      }
      const extraFavoriteRecords: any[] = [];
      const hydratedFavoriteAgents: ListedAgent[] = [];

      for (const favKey of Object.keys(favoritesMap)) {
        if (existingKeys.has(favKey)) continue;
        try {
          const favRead = await readLiveDbRecordAfterTombstoneMerge({
            authToken,
            dbKey: favKey,
            fallbackFetchImpl,
            fetchImpl,
            serverUrls,
          });
          const record = favRead.record;
          if (!record || (record.type && record.type !== "agent")) continue;
          const norm = normalizeListedAgent(record);
          const candidateKeys = [record.dbKey, record.publicKey, record.id]
            .filter((key): key is string => typeof key === "string" && key.length > 0);
          if (
            spaceContentKeys &&
            !candidateKeys.some((key) => spaceContentKeys?.has(key))
          ) {
            continue;
          }
          if (norm) {
            // 与 server 端 noloWorkspaceServerTools 收藏水化同一证明标准：读成功
            // 即证明 favKey 可解析。public 形态由 decorateAgentsWithPublicStatus
            // 负责，这里只钉非 public 的他人 agent（空间共享 / grant）。
            if (!favKey.startsWith("agent-pub-")) {
              norm.verifiedAgentKey = favKey;
              if (typeof record.userId === "string" && record.userId) {
                norm.ownerId = record.userId;
              }
            }
            agents.push(norm);
            hydratedFavoriteAgents.push(norm);
            existingKeys.add(norm.privateKey);
            existingKeys.add(norm.publicKey);
            existingKeys.add(norm.id);
          } else {
            extraFavoriteRecords.push(record);
            for (const key of candidateKeys) existingKeys.add(key);
          }
        } catch {
          // orphan favorite key, skip it.
        }
      }

      if (source === "global-cache" && hydratedFavoriteAgents.length > 0) {
        await decorateAgentsWithPublicStatusAcrossServers({
          agents: hydratedFavoriteAgents,
          authToken,
          fallbackFetchImpl,
          fetchImpl,
          serverUrls,
        });
      }

      // --safe 是选人投影而非 scope 重过滤：本地 publicOnly 预过滤保留
      // companion-proof 语义（对 favorites-hydration 补入的 extraFavoriteRecords
      // 同样生效），discovery 侧只做 query + 429 + 投影，不再二次 scope 过滤。
      const safeRecords = [...agents, ...extraFavoriteRecords]
        .map((record) => toDiscoverySafeAgentSummary(record, { favoritesMap, userId }))
        .filter((agent) => (publicOnly ? agent.isPublic === true : true));
      const discovery = buildAgentDiscoveryResult({
        agents: safeRecords,
        scope: "all",
        query,
        showUnavailable,
        verbose,
      });

      const listResult = JSON.stringify({
        success: true,
        userId,
        ...(resolvedSpaceId ? { spaceId: resolvedSpaceId } : {}),
        total: discovery.total,
        unavailableCount: discovery.unavailableCount,
        unavailableAgents: discovery.unavailableAgents,
        credentialGroups: discovery.credentialGroups,
        agents: discovery.agents,
      }, null, 2);
      // Observed speed data needs the local db; the call is disk-cached with a
      // scan budget and degrades to AA-only on any failure (it never throws), so
      // `agent list` cannot fail because of speed context.
      const withSpeedContext = await injectSpeedContextIntoListAgentsResult(listResult, {
        db: deps.db ?? await getReadableCliDb(discardOutput),
        userId,
        diskCache: { cachePath: resolveSpeedSamplesCachePath(env, userId) },
      });
      output.write(withSpeedContext);
      output.write("\n");
      return 0;
    }

    if (wantJson) {
      const credentialGroups = summarizeCredentialGroups(agentsForOutput);
      output.write(JSON.stringify({
        userId,
        ...(resolvedSpaceId ? { spaceId: resolvedSpaceId } : {}),
        targetServers: serverUrls,
        ...(serverFailures.length ? { serverFailures } : {}),
        total: agentsForOutput.length,
        publicCount: agentsForOutput.filter((agent) => agent.publicRecordExists).length,
        unavailableCount,
        credentialGroups,
        source,
        agents: agentsForOutput,
      }, null, 2));
      output.write("\n");
      return 0;
    }

    output.write(`userId: ${userId}\n`);
    if (resolvedSpaceId) {
      output.write(`spaceId: ${resolvedSpaceId}\n`);
    }
    output.write(`targetServers: ${serverUrls.join(", ")}\n`);
    if (serverFailures.length) {
      output.write(`serverFailures: ${serverFailures.length}\n`);
    }
    output.write(`total agents: ${agentsForOutput.length}\n`);
    output.write(`public agents: ${agentsForOutput.filter((agent) => agent.publicRecordExists).length}\n`);
    if (unavailableCount > 0 && !showUnavailable) {
      output.write(`⛔ ${unavailableCount} agent(s) temporarily unavailable (429) hidden. Use --show-unavailable to list them.\n`);
      const unavailableList = agents.filter((agent) => isAgentUnavailableNow(agent));
      for (const unavail of unavailableList) {
        const remainingSec = Math.max(0, Math.ceil(((unavail.nextAvailableAt ?? 0) - Date.now()) / 1000));
        const quotaSummary = formatQuotaSummary(unavail.quota);
        const quotaText = quotaSummary ? ` (${quotaSummary})` : "";
        output.write(`   - [429 限流] ${unavail.name} (id: ${unavail.id}) 预计 ${remainingSec} 秒后恢复${quotaText}\n`);
      }
    }
    output.write(`source: ${source}\n`);
    if (agentsForOutput.length === 0) {
      output.write("\n(no agents found)\n");
      return 0;
    }
    for (const agent of agentsForOutput) {
      const status = agent.publicRecordExists ? "public" : "private";
      const flagMismatch = agent.isPublicFlag !== agent.publicRecordExists
        ? ` flag=${agent.isPublicFlag}`
        : "";
      const credentialLine = agent.credentialConfigured
        ? `credentialConfigured=true${agent.credentialRef ? ` credentialRef=${agent.credentialRef}` : ""}${agent.apiKeyRef ? ` apiKeyRef=${agent.apiKeyRef}` : ""}`
        : "credentialConfigured=false";
      const availabilityLine =
        typeof agent.nextAvailableAt === "number" && agent.nextAvailableAt > Date.now()
          ? `nextAvailableAt=${new Date(agent.nextAvailableAt).toISOString()}`
          : "nextAvailableAt=now";
      const quotaSummary = formatQuotaSummary(agent.quota);
      const quotaLine = `quota=${quotaSummary ?? "-"}`;
      output.write(
        [
          `\n[${status}] ${agent.name}`,
          `id=${agent.id}`,
          `type=${agent.type ?? "-"}`,
          `model=${agent.model}`,
          `updatedAt=${agent.updatedAt ?? "-"}`,
          // 不输出 privateKey（dbKey 属敏感标识，与 web 端 listAgentsFunc 降权
          // 对齐；需要完整记录请用 --json）。
          // 私有 agent（publicRecordExists=false）的公开记录不存在，输出 "-" 而非
          // 一个库里不存在的 agent-pub-<id>，避免误导调用方拿它去 readAgent。
          `publicKey=${agent.publicRecordExists ? agent.publicKey : "-"}${flagMismatch}`,
          `tools=${agent.tools.join(", ") || "-"}`,
          credentialLine,
          availabilityLine,
          quotaLine,
        ].join("\n")
      );
      output.write("\n");
    }
    return 0;
  } catch (error) {
    output.write(
      `[nolo] agent list failed: ${toErrorMessage(error)}\n`
    );
    return 1;
  }
}
