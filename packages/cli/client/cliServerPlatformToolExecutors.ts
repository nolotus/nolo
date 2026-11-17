/**
 * deleteMemory 回执 metadata 的显式形状。
 *
 * 不写字面量推断而显式声明，是因为这个函数有三条 return：两条参数错误分支
 * （只有 serverPlatformTool/memoryDelete）与成功分支（含 reason 等投影）。
 * 让 TS 自行推断会得到两种 metadata 形状的联合，于是任何消费方写
 * `result.metadata?.reason` 都会报 TS2339 —— 既有测试文件里已经出现 6 处。
 */
type DeleteMemoryMetadata = {
  serverPlatformTool: boolean;
  memoryDelete: boolean;
  reason?: string;
  contentKeyword?: string;
  idsCount?: number;
  memoryLocalRetired?: number;
  memoryRemoteDeleted?: number;
  memoryRemoteMatched?: number;
  memoryLocalOnlyRetired?: number;
  memoryLocalSkippedRemoteMiss?: number;
  memoryLocalAlignmentIncomplete?: boolean;
};

/**
 * Server platform tool executors for CLI local runtime.
 *
 * Extracted from localRuntimeAdapter.ts. Builds executors that bridge CLI
 * local tool calls (table CRUD, web access) to the nolo server API.
 *
 * Direct imports replace lazy ensureHeavyCliLocalRuntimeModules indirection.
 */
import type { EnvLike } from "./localRuntimeHelpers";
import {
  resolveRuntimeServerUrl,
  resolveRuntimeAuthToken,
} from "./localRuntimeHelpers";
import type { CliFetchImpl } from "../cliFetch";
import { parseNoloWorkspaceToolArguments } from "../../agent-runtime/noloWorkspaceTools";
import {
  LOCAL_SERVER_TABLE_TOOL_NAMES,
  LOCAL_SERVER_WEB_TOOL_NAMES,
} from "./cliToolClassification";
import {
  classifyFetchWebpageUrl,
  fetchWebpageLocally,
} from "./fetchWebpageContent";
import { fetchWithTransientRetry } from "./localRuntimeFetchRetry";
import { createHash } from "node:crypto";

export function buildServerPlatformToolExecutors(args: {
  env: EnvLike;
  fetchImpl: CliFetchImpl;
  /**
   * Current agent key, used to scope written memories to this agent's subject
   * (mirrors the web tool's behavior). Absent for adapters built before an
   * agent is resolved; the server then falls back to owner-level scoping.
   */
  agentKey?: string | null;
  /**
   * 本地记忆库覆盖（测试/嵌入用）。
   *
   * 生产路径不传：`localMemoryContext` 自己去开 CLI 本地 runtime db。测试若
   * 走真实打开路径，就会在开发者真实 `~/.nolo` 里建库、并读真实 machine-id
   * ——两者都不属于单元测试该碰的东西。
   */
  localDb?: any;
}) {
  const postServer = async (
    path: string,
    body: object,
    opts?: { retryTransient?: boolean },
  ) => {
    const serverUrl = resolveRuntimeServerUrl(args.env);
    const authToken = resolveRuntimeAuthToken(args.env);
    if (!serverUrl)
      throw new Error(
        "server platform tools require NOLO_SERVER_URL, NOLO_SERVER, or BASE_URL.",
      );
    if (!authToken)
      throw new Error(
        "server platform tools require AUTH_TOKEN or NOLO_MACHINE_API_KEY.",
      );
    const url = `${serverUrl}${path}`;
    const init = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    };
    // Table and web tools surface their failure to the user, who can retry by
    // asking again. A dropped memory write is silent — nobody learns it was
    // lost — so it is the one bridge that retries. Only 429/503 are retried
    // (the upstream saying "not accepted"), so this cannot double-write.
    const response = opts?.retryTransient
      ? await fetchWithTransientRetry(args.fetchImpl, url, init)
      : await args.fetchImpl(url, init);
    const text = await response.text().catch(() => "");
    if (!response.ok) {
      throw new Error(
        `server platform tool bridge failed: HTTP ${response.status} ${text.slice(0, 500)}`,
      );
    }
    return text;
  };

  const guardExplicitTableCapture = (call: any) => {
    return JSON.stringify({
      error: "knowledge_capture_requires_confirmation",
      message:
        "当前执行面没有可信确认重放能力；请在支持确认的界面核对具体内容和目标后保存。",
      policy: {
        capability: "knowledge_capture",
        target: "table",
        mode: "explicit-only-local",
      },
    });
  };

  const tableExecutors = Object.fromEntries(
    LOCAL_SERVER_TABLE_TOOL_NAMES.map((toolName) => [
      toolName,
      async (call: any) => {
        const blocked = guardExplicitTableCapture(call);
        if (blocked) {
          return {
            content: blocked,
            metadata: { serverPlatformTool: true, tableWriteBlocked: true },
          };
        }
        const parsed = parseNoloWorkspaceToolArguments(call.arguments);
        const path =
          toolName === "createTable"
            ? "/api/table/create"
            : toolName === "addTableRow"
              ? "/api/table/add-row"
              : toolName === "addTableRows"
                ? "/api/table/add-rows"
                : toolName === "updateTableRow"
                  ? "/api/table/update-row"
                  : "/api/table/update-rows";
        const content = await postServer(path, parsed);
        return {
          content,
          metadata: { serverPlatformTool: true, tableWrite: true },
        };
      },
    ]),
  );

  // Web access tools (fetchWebpage / exa_search) bridge to the same server
  // routes the desktop runtime uses. The CLI holds no local API keys, so these
  // only work when NOLO_SERVER_URL + auth are configured.
  //
  // Exception: private/loopback fetchWebpage targets must stay on-box. Bridging
  // them to the server hits the server's own SSRF guard (correctly) and would
  // never reach the user's machine. Public URLs still bridge for billing/UA.
  const webExecutors = Object.fromEntries(
    LOCAL_SERVER_WEB_TOOL_NAMES.map((toolName) => [
      toolName,
      async (call: any) => {
        const parsed = parseNoloWorkspaceToolArguments(call.arguments);
        if (toolName === "fetchWebpage") {
          const route = classifyFetchWebpageUrl(parsed.url);
          if (route.kind === "reject") {
            throw new Error(route.error);
          }
          if (route.kind === "local") {
            const content = await fetchWebpageLocally({
              url: route.url,
              fetchImpl: args.fetchImpl,
            });
            return {
              content,
              metadata: {
                serverPlatformTool: true,
                webTool: toolName,
                url: parsed.url,
                localFetch: true,
              },
            };
          }
          const content = await postServer("/api/fetch-webpage", {
            url: route.url,
          });
          return {
            content,
            metadata: {
              serverPlatformTool: true,
              webTool: toolName,
              url: parsed.url,
            },
          };
        }

        // 与 exaSearchFunc 镜像同一份 body（plan 第 3 节契约）：
        // intent 原样转发，没给就不带这个键，由服务端按场景定档；
        // useAutoprompt 已废弃不转发；type 不再补默认值（服务端按 plan 定档）。
        const body: Record<string, any> = {
          query: parsed.query,
          ...(parsed.numResults !== undefined ? { numResults: parsed.numResults } : {}),
        };
        if (typeof parsed.intent === "string" && parsed.intent) {
          body.intent = parsed.intent;
        }
        if (typeof parsed.category === "string" && parsed.category) {
          body.category = parsed.category;
        }
        if (typeof parsed.timeRange === "string" && parsed.timeRange) {
          body.timeRange = parsed.timeRange;
        }
        if (Array.isArray(parsed.includeDomains) && parsed.includeDomains.length > 0) {
          body.includeDomains = parsed.includeDomains;
        }
        if (Array.isArray(parsed.excludeDomains) && parsed.excludeDomains.length > 0) {
          body.excludeDomains = parsed.excludeDomains;
        }
        // legacy：includeContent 只作兼容映射透传（服务端映射为 detail），不补默认值。
        if (typeof parsed.includeContent === "boolean") {
          body.includeContent = parsed.includeContent;
        }
        // 定档信号：CLI 手里没有 dialog 消息历史（无 Redux store），
        // priorSearches / lastResultCount 拿不到就**不发**——服务端对缺失键跳过
        // 对应规则。origin 由 agent-runtime 从 turn 输入推导后随 call 注入
        // （toolCallTransaction → AgentRuntimeToolCallInput.origin），有才发。
        if (call?.origin) body.origin = call.origin;
        const content = await postServer("/api/exa-search", body);
        return {
          content,
          metadata: {
            serverPlatformTool: true,
            webTool: toolName,
            query: parsed.query,
          },
        };
      },
    ]),
  );

  // ---- 本地记忆层（客户端 + 远程）-------------------------------------
  // 记忆模型：写入 = 本地 vNext + 远程 API；读取 = 两者按 contentKey 合并去重。
  // 所有本地操作 best-effort：本地库打不开（锁冲突/未初始化）或写入失败时
  // 静默降级为纯远程，绝不让本地问题阻塞远程结果。
  // 依赖全部动态 import，避免 CLI 启动时把 memory/ai 包拉进常驻内存。
  const shortHash = (value: string, len: number) =>
    createHash("sha256").update(value).digest("hex").slice(0, len);

  const localMemoryContext = async (): Promise<{
    db: any;
    principal: string;
    userId: string;
  } | null> => {
    // 打开 CLI 本地 runtime db（broker/LevelDB）。独立成函数是为了让上面的
    // 覆盖分支保持单行可读。
    const openCliLocalRuntimeDb = async () => {
      const { getDefaultCliLocalRuntimeDb } = await import("../localRuntimeDb");
      return getDefaultCliLocalRuntimeDb({ env: args.env });
    };
    try {
      // 本地 owner 必须与 CLI 既有本地召回保持一致（packages/cli/memoryRecall.ts:167
      // 用 resolveMachineId()），否则写进去的记忆在自动注入路径里召不回，库里还会
      // 长期并存两个 owner 命名空间。同时这也避开了 NOLO_USER_ID 残留导致的
      // 「本地 A 的记忆被并进 B 的输出」身份错配。
      const { resolveMachineId } = await import("../../connector-experimental/machineInfo");
      const machineId = resolveMachineId();
      if (!machineId) return null;
      const db = args.localDb ?? (await openCliLocalRuntimeDb());
      return { db, principal: `user:${encodeURIComponent(machineId)}`, userId: machineId };
    } catch {
      return null;
    }
  };

  /** 读路径：本地 vNext 召回 + 远程结果合并去重。返回 null 表示无需改写远程输出。 */
  const mergeLocalMemoryIntoQuery = async (
    query: string,
    remoteRaw: string
  ): Promise<string | null> => {
    const ctx = await localMemoryContext();
    if (!ctx) return null;
    let remote: any;
    try {
      remote = JSON.parse(remoteRaw);
    } catch {
      return null;
    }
    const remoteItems: any[] = Array.isArray(remote?.selectedItems) ? remote.selectedItems : [];

    const [{ loadMemoryVNextCatalog, getMemoryEvidenceVNextStrict }, { recallMemoryVNextLocal }] = await Promise.all([
      import("../../ai/memory/vnext/store"),
      import("../../ai/memory/vnext/localRecall"),
    ]);
    const catalog = await loadMemoryVNextCatalog(ctx.db, ctx.principal);
    const hits = recallMemoryVNextLocal({
      query,
      entities: catalog.entities,
      states: catalog.states.filter((s: any) => !s.retiredAt && s.facet !== "work-context" && s.text.trim()),
    });
    if (hits.length === 0) return null;

    const { mergeAndDedupUserData } = await import("../../database/userDataMerge");
    const localItems = await Promise.all(hits.map(async (hit: any) => {
      const value = (hit.state.value ?? {}) as Record<string, any>;
      const evidence = (await Promise.all((hit.state.evidenceIds ?? []).map((id: string) =>
        getMemoryEvidenceVNextStrict(ctx.db, ctx.principal, id),
      ))).filter((item) => item != null && item.ownerId === ctx.principal);
      return {
        id: `vnext-state-${hit.state.id}`,
        ownerType: "user",
        ownerId: ctx.userId,
        visibility: "private",
        subjectType: "user",
        subjectId: ctx.userId,
        kind: typeof value.kind === "string" ? value.kind : "semantic",
        content: hit.state.text.trim(),
        createdAt: hit.state.createdAt,
        lastActivatedAt: hit.state.createdAt,
        activationCount: 1,
        importance: typeof value.importance === "number" ? value.importance : 0.9,
        ...(typeof value.confidence === "number" && Number.isFinite(value.confidence) ? { confidence: value.confidence } : {}),
        ...(["verified", "stated", "inferred"].includes(value.provenance) ? { provenance: value.provenance } : {}),
        ...(typeof value.sourceKind === "string" ? { sourceKind: value.sourceKind } : {}),
        ...(typeof value.sourceDialogId === "string" ? { sourceDialogId: value.sourceDialogId } : {}),
        evidence,
        sourceOrigin: "local",
      };
    }));

    // mergeAndDedupUserData 第二参的契约是远端分页包装 [{ data: { data: [...] } }]
    // （见 packages/database/userDataMerge.ts 的 remoteResults.forEach(result =>
    // result?.data?.data)）。直接传扁平数组会让远端条目一条都进不了 map，
    // 结果只剩本地若干条——等于把远端记忆整段丢掉。
    const merged = mergeAndDedupUserData(localItems, [{ data: { data: remoteItems } }]);
    // 判据不能比长度：本地条目可能被远端同 key 条目合并掉，长度会变。
    const hasNewLocal = merged.some((item: any) => item.sourceOrigin === "local");
    if (!hasNewLocal) return null; // 本地没有新增可补充的内容，保持远程原样

    // 顺序与遮蔽修正：mergeAndDedupUserData 先入 localData，会把本地条目全部
    // 排到前面——服务端相关性排序被打乱，且同内容时本地条目会遮蔽远端条目
    // （丢掉远端 id / kind:"semantic" / resident，模型因此拿不到远端 id 去删）。
    // 这里改为远端优先、按内容归一，本地只补远端没有的条目。
    const seenContent = new Set<string>();
    const ordered: any[] = [];
    const push = (item: any) => {
      const key = String(item?.content ?? "").trim();
      if (key) {
        if (seenContent.has(key)) return;
        seenContent.add(key);
      }
      ordered.push(item);
    };
    for (const item of remoteItems) push(item);
    for (const item of merged) {
      if (item.sourceOrigin === "local") push(item);
    }
    // 远端条目是重新组装的，绕过了 mergeAndDedupUserData 的 tombstone 过滤
    // （userDataMerge 默认 includeDeleted=false 会滤掉 deletedAt 记录）。
    // 这里补一次，避免已删记录借重排路径回到 selectedItems。
    const { isTombstoneRecord } = await import("../../database/tombstones");
    for (let i = ordered.length - 1; i >= 0; i -= 1) {
      if (isTombstoneRecord(ordered[i])) ordered.splice(i, 1);
    }

    // promptBlock 必须与 selectedItems 同步重算：只替换 selectedItems 会让同一份
    // JSON 自相矛盾（按 promptBlock 消费的调用方看不到本地记忆）。
    const { buildMemoryOverlay, DEFAULT_MEMORY_OVERLAY_TOKEN_BUDGET } = await import(
      "../../ai/memory/overlay"
    );
    const promptBlock = buildMemoryOverlay(ordered, {
      maxTokens: DEFAULT_MEMORY_OVERLAY_TOKEN_BUDGET,
    });
    return JSON.stringify({ ...remote, selectedItems: ordered, promptBlock });
  };

  /** 写路径：把一条记忆写入本地 vNext（Entity/State/Evidence），幂等。 */
  const writeLocalMemory = async (input: {
    content: string;
    kind: string;
    createdAt: string;
    confidence: number;
    tags?: string[];
    provenance?: string;
    sourceKind?: string;
  }): Promise<boolean> => {
    const ctx = await localMemoryContext();
    if (!ctx) return false;
    const [{ putMemoryEntityVNext, putMemoryStateVNext, putMemoryEvidenceVNext }, { buildLegacyMemoryEvidence }] =
      await Promise.all([
        import("../../ai/memory/vnext/store"),
        import("../../ai/memory/vnext/legacyMigration"),
      ]);

    // 与远程一致的 contentKey 语义（仅用于派生稳定 stateId；合并已不依赖它，
    // 因为服务端 query 返回的 selectedItems 不带 contentKey）
    const contentKey = `mem-${shortHash(
      [ctx.principal, "user", ctx.userId, input.kind, input.content].join("\u0000"),
      16
    )}`;
    const stateId = `st-cli-${contentKey.slice(4)}`;

    // 每条记忆一个独立 Entity。共用同一 Entity 会让它的 name 参与每条 State 的
    // 召回 haystack（CJK bigram「本地/地记/记忆/忆库」），任何含「记忆/本地」的
    // query 都能与所有本地 State 共享 ≥2 个 token → 越过 MIN_SHARED_TOKENS=2
    // 门槛 → 最多 8 条无关本地记忆被注入。Entity name 取本条内容摘要，既提供
    // 召回信号，又不会跨条目污染。
    const entityId = `ent-cli-${shortHash(`${ctx.principal}\u0000${contentKey}`, 24)}`;

    const evidence = buildLegacyMemoryEvidence({
      id: stateId,
      ownerType: "user",
      ownerId: ctx.userId,
      content: input.content,
      confidence: input.confidence,
      createdAt: input.createdAt,
    } as any);

    await putMemoryEntityVNext(ctx.db, {
      id: entityId,
      ownerId: ctx.principal,
      type: "concept",
      // 用内容摘要而非固定名：固定名会让所有本地记忆共享同一组 bigram 而互相污染召回
      name: input.content.slice(0, 30),
      subtype: "cli-local-memory",
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    });
    await putMemoryEvidenceVNext(ctx.db, evidence);
    await putMemoryStateVNext(ctx.db, {
      id: stateId,
      ownerId: ctx.principal,
      entityId,
      // facet 必须满足 vNext 不变量「每个 (entityId, facet) 只有一条当前 State」。
      // 用 kind 做 facet 会让同类记忆互相覆盖；每条记忆独占一个 facet。
      facet: stateId,
      // tags 一起落库：删除联动的 tags 过滤（retireLocalMemory）要读它，早前
      // 只存 kind 导致带 tags 的删除请求永远跳过本地条目，已删记忆复活。
      value: {
        kind: input.kind,
        contentKey,
        origin: "cli-local",
        ...(input.provenance ? { provenance: input.provenance } : {}),
        ...(input.sourceKind ? { sourceKind: input.sourceKind } : {}),
        ...(input.tags?.length ? { tags: input.tags } : {}),
      },
      text: input.content,
      evidenceIds: [evidence.id],
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    });
    return true;
  };

  /** 删除联动：把匹配的本地 State 退休，否则已删记忆会从本地重新召回。 */
  const retireLocalMemory = async (filter: {
    ids?: string[];
    contents?: string[];
    contentKeyword?: string;
    kinds?: string[];
    tags?: string[];
    /**
     * 远端本次是否**真的删掉了东西**（confirm 响应 `deletedCount > 0`，或返回了
     * 命中内容）。这是本地退休的前置条件，不是提示。
     *
     * 本地副本的远端孪生体不可能被本地删除动作删掉（本地库只由 rememberMemory
     * 写入、没有任何回填路径）。远端一条都没删时退休本地副本，唯一结果就是两边
     * 分叉：远端还在、本地消失，下一次 queryMemory 又把它从远端召回来（用户看到
     * 「删了又回来」，且本地那条已经没有任何恢复入口）。所以零命中时一条都不退，
     * 由调用点把「跳过了几条」如实写进回执。
     */
    remoteConfirmedRemoval: boolean;
  }): Promise<{
    retired: number;
    localOnlyRetired: number;
    skippedRemoteMiss: number;
  }> => {
    const ctx = await localMemoryContext();
    if (!ctx) return { retired: 0, localOnlyRetired: 0, skippedRemoteMiss: 0 };
    const { loadMemoryVNextCatalog, retireMemoryStateVNext } = await import(
      "../../ai/memory/vnext/store"
    );
    const catalog = await loadMemoryVNextCatalog(ctx.db, ctx.principal);
    if (catalog.states.length === 0) {
      return { retired: 0, localOnlyRetired: 0, skippedRemoteMiss: 0 };
    }

    // 模型看到的本地 id 是 `vnext-state-<stateId>`，必须剥掉前缀再比；
    // 直接拼 `vnext-state-${id}` 会得到双重前缀，永远匹配不到。
    // 服务端 id（ULID / mem-legacy-*）与本地 st-cli-* 命名空间不相交，
    // 所以远端删除结果还需要按**内容**对齐（调用点从 matchedContents 取，
    // 旧服务端退回 preview）。
    const wantedIds = new Set(
      (filter.ids ?? []).map((id) => String(id).replace(/^vnext-state-/, ""))
    );
    const wantedContents = new Set(
      (filter.contents ?? []).map((c) => String(c).trim()).filter(Boolean)
    );

    const now = new Date().toISOString();
    let retired = 0;
    // byId 命中、但远端本次一条没删：本地退休了而远端副本仍在（或远端早就删过、
    // 只是上一次本地退休失败）。前者是本地/远端分叉，后者是收敛，代码无法区分，
    // 所以不拦、但**必须在回执里如实报数**（见调用点的 memoryLocalOnlyRetired）。
    let localOnlyRetired = 0;
    // 模糊条件命中、但远端一条没删：一条都不退。远端没删说明远端没有可删的东西，
    // 凭关键词/kind/tags 去退休本地副本是纯推测，只会把还活着的远端条目在本地
    // 抹掉（本地库没有回填路径，抹掉就再也回不来本地）。
    let skippedRemoteMiss = 0;
    for (const state of catalog.states) {
      if (state.retiredAt) continue;
      const value = (state.value ?? {}) as Record<string, any>;
      const byId = wantedIds.size > 0 && wantedIds.has(state.id);
      const byContent = wantedContents.has(state.text.trim());
      const byKeyword = !!filter.contentKeyword && state.text.includes(filter.contentKeyword);
      if (!byId && !byContent && !byKeyword) continue;
      // ids 与内容/关键词之间也是 AND（服务端 legacy `matchesFilters` 与 vNext
      // `matchesVNextFilters` 都是「先在 id 集里，再判其它维度」）。若这里是 OR，
      // `{ids:[X], contentKeyword:"配置"}` 会在远端只删了 X 的情况下，把本地所有
      // 含「配置」的副本一起退休——同一个「远端活着、本地被抹掉」的分叉。
      if (wantedIds.size > 0 && !byId && !byContent) continue;
      // kinds/tags 过滤**只**作用于模糊匹配（byId 是调用方指名的精确身份，
      // byContent 是服务端实测命中内容，两者都不再过一遍）。
      //
      // tags 语义必须与服务端**逐字一致**：服务端 `matchesFilters` 要求条目 tags
      // 覆盖过滤集的每一条（packages/ai/memory/delete.ts:163-169，`for` 循环里
      // 任缺一条即 return false），这里也必须是 every。用 some（命中任一即放行）
      // 会让「远端只删了部分条目」的请求把本地**所有**只沾一个 tag 的副本一并退休
      // ——远端还活着、本地被静默抹掉，正是本地/远端分叉。
      if (!byId && !byContent) {
        if (filter.kinds?.length && !filter.kinds.includes(String(value.kind ?? ""))) continue;
        const stateTags = Array.isArray(value.tags) ? (value.tags as string[]) : [];
        if (filter.tags?.length && !filter.tags.every((t) => stateTags.includes(t))) continue;
        if (!filter.remoteConfirmedRemoval) {
          skippedRemoteMiss++;
          continue;
        }
      }
      if (byId && !filter.remoteConfirmedRemoval && !byContent) {
        // 走到这里：调用方指名了一个本地 id，而远端确认 0 删除。退休它并单独计数。
        localOnlyRetired++;
      }
      try {
        await retireMemoryStateVNext(ctx.db, ctx.principal, state.id, now);
        retired++;
      } catch {
        /* 单条失败不得中断整个循环，否则剩余 State 全部漏退休 */
      }
    }
    return { retired, localOnlyRetired, skippedRemoteMiss };
  };

  const workMemory = async (call: any, parsed: any, write: boolean) => {
    const context = call.runtimeContext;
    const dialogId = context?.dialogId;
    const userMessageId = context?.userMessageId;
    if (typeof dialogId !== "string" || (write && typeof userMessageId !== "string")) throw new Error("work memory requires host dialogId and persisted userMessageId");
    const fields = write ? ["itemKey", "activityId", "expectedRevision", "changeId", "patch"] : ["activityId", "status", "query", "limit", "discovery"];
    const payload = Object.fromEntries(fields.filter(k => parsed[k] !== undefined && parsed[k] !== "").map(k => [k, parsed[k]]));
    if (parsed.storage !== undefined && parsed.storage !== "server" && parsed.storage !== "local") throw new Error("invalid work storage");
    // 写侧回执：updateWorkContext 的冲突（revision 过期 / scope mismatch / changeId 复用）
    // 是正常返回而不是 error，裸传 JSON 会让模型把「没写进去」当成「已记住」。
    // 服务端与本地两条路径都用同一句话，保证 Web 与 CLI 口径一致。
    const { formatWorkContextWriteNotice } = await import("../../ai/memory/vnext/workContextWriteNotice");
    // 存储位置只有调用处知道：queryMemory(mode="work") 不指定 storage 时默认读本地库，
    // 所以这里的回执必须把本次实际存储透给 formatter，否则「按建议读最新 revision」会查错库。
    const writeResult = (result: any, priorNotice?: string, storage?: "server" | "local") => ({
      ...result,
      notice: [formatWorkContextWriteNotice(result, storage ? { storage } : undefined), priorNotice]
        .filter((v): v is string => typeof v === "string" && v !== "")
        .join("\n"),
    });
    const workMetadata = { serverPlatformTool: true, memoryWrite: write, memoryRead: !write };
    if (parsed.storage === "server") {
      const content = await postServer(write ? "/api/memory/remember" : "/api/memory/query", { mode: "work", ...payload, dialogId, ...(write ? { userMessageId } : {}) });
      if (!write) return { content, metadata: workMetadata };
      let served: any;
      try { served = JSON.parse(content); } catch { return { content, metadata: workMetadata }; }
      return { content: JSON.stringify(writeResult(served, typeof served?.notice === "string" ? served.notice : undefined, "server")), metadata: workMetadata };
    }
    const ctx = await localMemoryContext();
    if (!ctx) throw new Error("local work memory unavailable");
    const { resolveLocalUserId } = await import("./cliAgentConfigHelpers");
    const localUserId = resolveLocalUserId(args.env);
    const { resolveWorkContextAccess } = await import("../../ai/memory/vnext/workContextAccess");
    const { updateWorkContext, readWorkContexts } = await import("../../ai/memory/vnext/workContext");
    const { scope, sourceRef } = await resolveWorkContextAccess(ctx.db, localUserId, dialogId, write ? userMessageId : undefined);
    // Local membership cannot be proven from a model-supplied space ID.
    if (scope.spaceId) throw new Error("local work memory cannot verify space membership");
    const result = write ? await updateWorkContext(ctx.db, scope, { ...(payload.activityId !== undefined ? { activityId: payload.activityId, expectedRevision: payload.expectedRevision } : { itemKey: payload.itemKey, originRef: sourceRef }), changeId: payload.changeId, sourceRefs: [sourceRef], patch: payload.patch } as any) : await readWorkContexts(ctx.db, scope, payload);
    const storageNotice = "Local and server stores are independent; changeId deduplication covers actual changes only.";
    const content = write
      ? { ...writeResult(result, storageNotice, "local"), storage: "local" }
      : { ...result, storage: "local", notice: storageNotice };
    return { content: JSON.stringify(content), metadata: workMetadata };
  };

  const queryMemory = async (call: any) => {
    const parsed = parseNoloWorkspaceToolArguments(call.arguments);
    if (parsed.mode === "work") return workMemory(call, parsed, false);
    const query = typeof parsed.query === "string" ? parsed.query.trim() : "";
    if (!query) {
      return {
        content: JSON.stringify({ error: "queryMemory 需要非空 query。" }),
        metadata: { serverPlatformTool: true, memoryRead: false },
      };
    }
    if (parsed.source !== undefined && parsed.source !== "archive") {
      return { content: JSON.stringify({ error: "Invalid memory source" }), metadata: { serverPlatformTool: true, memoryRead: false } };
    }
    if (parsed.source === undefined && (parsed.limit !== undefined || parsed.cursor !== undefined)) {
      return { content: JSON.stringify({ error: "Pagination requires source archive" }), metadata: { serverPlatformTool: true, memoryRead: false } };
    }
    const body: Record<string, unknown> = { userInput: query };
    if (parsed.source === "archive") {
      body.source = parsed.source;
      if (parsed.limit !== undefined) body.limit = parsed.limit;
      if (parsed.cursor !== undefined) body.cursor = parsed.cursor;
    }
    if (args.agentKey) body.agentKey = args.agentKey;
    const raw = await postServer("/api/memory/query", body, {
      retryTransient: true,
    });
    // 本地 vNext 召回 + 远程结果合并（best-effort；本地异常时保持纯远程输出）
    let content = raw;
    try {
      const merged = parsed.source === "archive" ? null : await mergeLocalMemoryIntoQuery(query, raw);
      if (merged) content = merged;
    } catch {
      /* 降级为纯远程 */
    }
    return {
      content,
      metadata: { serverPlatformTool: true, memoryRead: true, query },
    };
  };

  // Long-term memory writes bridge to /api/memory/remember — the same store
  // /api/memory/query recalls from. `source: agent-inferred` matches the web
  // tool: an agent deciding on its own to remember is a guess, not a user
  // directive, so it gets the lower base confidence.
  const rememberMemory = async (call: any) => {
    const parsed = parseNoloWorkspaceToolArguments(call.arguments);
    if (parsed.mode === "work") return workMemory(call, parsed, true);
    const content =
      typeof parsed.content === "string" ? parsed.content.trim() : "";
    if (!content) {
      return {
        content: JSON.stringify({
          error: "rememberMemory 需要非空 content。",
        }),
        metadata: { serverPlatformTool: true, memoryWrite: false },
      };
    }
    const body: Record<string, unknown> = {
      content,
      scope: parsed.scope ?? "auto",
      kind: parsed.kind ?? "episodic",
      source: "agent-inferred",
    };
    // procedural 的复现证据透传给服务端硬门；缺失时服务端降级 episodic。
    if (["verified", "stated", "inferred"].includes(parsed.provenance)) body.provenance = parsed.provenance;
    if (typeof parsed.recurrenceEvidence === "string" && parsed.recurrenceEvidence.trim()) {
      body.recurrenceEvidence = parsed.recurrenceEvidence.trim();
    }
    if (args.agentKey) body.agentKey = args.agentKey;
    const raw = await postServer("/api/memory/remember", body, {
      retryTransient: true,
    });
    // 同步写本地 vNext（best-effort）：远程成功后镜像一份到本地库，本地
    // 召回（packages/cli/memoryRecall.ts）在服务端不可达时还能命中。
    // 本地失败不影响远程成功结果。
    //
    // 注意写入的值取自**服务端响应的实际落库结果**，不是请求参数：
    //   - content：服务端精确去重要求内容**完全相同**（remember.ts:440
    //     `item.content === input.content` 才走 existing 分支），所以 content
    //     不会分叉；这里仍取 saved.content，是为了让「服务端 trim/规范化后」的
    //     文本与本地一致（本地召回与内容对齐都按文本比较）；
    //   - kind：procedural 缺复现证据会被降级成 episodic（resolveEffectiveKind）；
    //   - tags：服务端按 owner/kind 生成（buildMemoryTags），删除联动的 tags
    //     过滤要读它；早期只落 kind 导致带 tags 的删除永远跳过本地条目。
    // 真正会变的是 kind / tags / createdAt / confidence 四项，content 只是恒等
    // 兜底。
    let localSaved = false;
    try {
      let serverResult: any = null;
      try {
        serverResult = JSON.parse(raw);
      } catch {
        /* 非 JSON 响应：退回请求参数（旧行为） */
      }
      const saved = Array.isArray(serverResult?.savedItems) ? serverResult.savedItems[0] : null;
      localSaved = await writeLocalMemory({
        content: typeof saved?.content === "string" && saved.content.trim() ? saved.content : content,
        kind: String(saved?.kind ?? serverResult?.savedKind ?? body.kind ?? "episodic"),
        createdAt:
          typeof saved?.createdAt === "string" && saved.createdAt
            ? saved.createdAt
            : new Date().toISOString(),
        confidence: typeof saved?.confidence === "number" ? saved.confidence : 0.8,
        provenance: typeof saved?.provenance === "string" ? saved.provenance : undefined,
        sourceKind: typeof saved?.sourceKind === "string" ? saved.sourceKind : undefined,
        tags: Array.isArray(saved?.tags) ? saved.tags.map(String) : undefined,
      });
    } catch {
      /* 本地写入失败不影响远程结果 */
    }
    return {
      content: raw,
      metadata: { serverPlatformTool: true, memoryWrite: true, content, memoryLocalWrite: localSaved },
    };
  };

  const deleteMemory = async (
    call: any,
  ): Promise<{ content: string; metadata: DeleteMemoryMetadata }> => {
    const parsed = parseNoloWorkspaceToolArguments(call.arguments);
    const reason =
      typeof parsed.reason === "string" ? parsed.reason.trim() : "";
    if (!reason && !parsed.ids && !parsed.contentKeyword && !parsed.query) {
      return {
        content: JSON.stringify({
          error: "deleteMemory 需要用户明确的删除原因或过滤条件。",
        }),
        metadata: { serverPlatformTool: true, memoryDelete: false } satisfies DeleteMemoryMetadata,
      };
    }
    const isConfirmed = parsed.confirmed === true;
    if (isConfirmed && !parsed.deletionToken?.trim()) {
      return {
        content: JSON.stringify({
          error:
            "deleteMemory 在确认删除阶段（confirmed: true）必须提供预检阶段获取的 deletionToken。请先调用本工具进行预检预览。",
        }),
        metadata: { serverPlatformTool: true, memoryDelete: false } satisfies DeleteMemoryMetadata,
      };
    }
    // 删除条件的可读投影（trim 后取首个非空分支；与 body 的 contentSubstring
    // 同源），只进 metadata 供 TUI 紧凑行显示摘要，不改请求体本身。
    const contentKeyword =
      typeof parsed.contentKeyword === "string" && parsed.contentKeyword.trim()
        ? parsed.contentKeyword.trim()
        : typeof parsed.query === "string" && parsed.query.trim()
          ? parsed.query.trim()
          : undefined;
    const body: Record<string, unknown> = {
      ids: parsed.ids,
      contentSubstring: parsed.contentKeyword ?? parsed.query,
      kinds: parsed.kinds,
      tags: parsed.tags,
      dryRun: !isConfirmed,
      deletionToken: parsed.deletionToken,
      reason,
    };
    if (args.agentKey) body.agentKey = args.agentKey;
    const raw = await postServer("/api/memory/delete", body, {
      retryTransient: true,
    });
    // 本地联动退休：不 retire 本地 State，已删记忆下次 queryMemory 会从本地
    // 原样召回。只在真删（isConfirmed）时执行，预检阶段不动本地。
    let memoryLocalRetired = 0;
    // 远端本次删了几条、本地对齐了几条：两者不等就是「远端删了、本地没对齐」
    // 或反之。差值必须进回执，否则模型/用户看到 success 就以为两边都干净了。
    let memoryRemoteDeleted = 0;
    let memoryRemoteMatched = 0;
    let localOnlyRetired = 0;
    let skippedRemoteMiss = 0;
    let localAlignmentIncomplete = false;
    if (isConfirmed) {
      try {
        // 服务端 id 与本地 id 命名空间不相交（ULID/mem-legacy-* vs st-cli-*），
        // 只靠 id 永远匹配不到本地副本。用服务端返回的**完整命中内容**做对齐，
        // 才能让「按 ids 删除」也真正退休本地副本。
        // `matchedContents` 是完整清单（最多 200 条）；`preview` 只有前 5 条，
        // 仅作旧服务端（未返回 matchedContents）的回退。
        let remoteResult: any = null;
        try {
          remoteResult = JSON.parse(raw);
        } catch {
          /* 非 JSON 响应：退回纯 id/keyword 匹配 */
        }
        const hasMatchedContents = Array.isArray(remoteResult?.matchedContents);
        const contentList: unknown = hasMatchedContents
          ? remoteResult.matchedContents
          : Array.isArray(remoteResult?.preview)
            ? remoteResult.preview.map((p: any) => p?.content)
            : [];
        const deletedContents: string[] = (contentList as unknown[])
          .map((c) => String(c ?? "").trim())
          .filter(Boolean);
        const remoteDeletedCount =
          typeof remoteResult?.deletedCount === "number" ? remoteResult.deletedCount : 0;
        memoryRemoteDeleted = remoteDeletedCount;
        memoryRemoteMatched =
          typeof remoteResult?.matchedCount === "number"
            ? remoteResult.matchedCount
            : deletedContents.length;
        // 远端到底删没删掉东西：deletedCount>0 是服务端的权威计数；旧服务端若
        // 没有 deletedCount，则退回「返回了命中内容」。两者都没有 → 视为没删。
        const remoteConfirmedRemoval = remoteDeletedCount > 0 || deletedContents.length > 0;
        const outcome = await retireLocalMemory({
          ids: Array.isArray(parsed.ids) ? parsed.ids.map(String) : undefined,
          contents: deletedContents,
          contentKeyword,
          kinds: Array.isArray(parsed.kinds) ? parsed.kinds.map(String) : undefined,
          tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : undefined,
          remoteConfirmedRemoval,
        });
        memoryLocalRetired = outcome.retired;
        localOnlyRetired = outcome.localOnlyRetired;
        skippedRemoteMiss = outcome.skippedRemoteMiss;
        // 对账：远端声称命中 N 条，本地拿到的对齐清单只有 M 条（M<N 的两种已知
        // 成因：旧服务端只给 5 条 preview；命中 >200 被 matchedContents 封顶）。
        // 差集里的本地副本这次没被退休，下次还会被本地召回。
        localAlignmentIncomplete =
          memoryRemoteMatched > deletedContents.length || memoryRemoteDeleted > deletedContents.length;
      } catch {
        /* 本地退休失败不影响远程删除结果 */
      }
    }
    // 2026-09-26: deleteMemory 原来只回 memoryDelete flag，TUI gist 无料可
    // 显示；补 reason / contentKeyword / idsCount 三个投影（消费方见
    // toolOutput.ts 的 memoryToolGist "-" 分支）。
    //
    // content 默认原样透传服务端响应。只有当**本地镜像与远端不同步**时才附加
    // `localMirror`：模型看到的 success:true 只说明远端删了，本地库有没有跟上
    // 是另一回事，不写进去就只能靠模型猜（而模型没有任何手段复查本地库）。
    let content = raw;
    if (localOnlyRetired > 0 || skippedRemoteMiss > 0 || localAlignmentIncomplete) {
      try {
        const parsedRemote = JSON.parse(raw);
        if (parsedRemote && typeof parsedRemote === "object" && !Array.isArray(parsedRemote)) {
          content = JSON.stringify({
            ...parsedRemote,
            localMirror: {
              // 「远端一条没删，本地退休了 N 条」：这些本地条目要么远端早已不存在，
              // 要么远端副本还活着（本地/远端分叉）。没有回填路径，如实报数。
              ...(localOnlyRetired > 0 ? { retiredLocalOnly: localOnlyRetired } : {}),
              // 「条件在本地选得中、远端一条没删」：这些本地条目**保留未退休**
              // （远端还在，退休只会让本地副本消失而远端照旧被召回）。
              ...(skippedRemoteMiss > 0 ? { keptRemoteAlive: skippedRemoteMiss } : {}),
              // 远端命中数 > 本地拿到的对齐清单：差额里的本地副本这次没退休。
              ...(localAlignmentIncomplete
                ? {
                    alignmentIncomplete: true,
                    remoteMatched: memoryRemoteMatched,
                    remoteDeleted: memoryRemoteDeleted,
                    alignedContents: memoryLocalRetired,
                    note:
                      "远端命中多于本地对齐清单（旧服务端只回 5 条 preview，或命中 >200 被 matchedContents 封顶）；差额里的本地副本仍会从本地召回。",
                  }
                : {}),
            },
          });
        }
      } catch {
        /* 非 JSON 响应：保持原样 */
      }
    }
    return {
      content,
      metadata: {
        serverPlatformTool: true,
        memoryDelete: true,
        reason,
        contentKeyword,
        idsCount: Array.isArray(parsed.ids) ? parsed.ids.length : undefined,
        memoryLocalRetired,
        // 以下四项是对账信号：远端删了什么、本地跟到什么程度。缺了它们，
        // 「远端 0 命中但本地退休了」「命中 7 条只对齐 5 条」都只能靠模型猜。
        memoryRemoteDeleted,
        memoryRemoteMatched,
        ...(localOnlyRetired > 0 ? { memoryLocalOnlyRetired: localOnlyRetired } : {}),
        ...(skippedRemoteMiss > 0 ? { memoryLocalSkippedRemoteMiss: skippedRemoteMiss } : {}),
        ...(localAlignmentIncomplete ? { memoryLocalAlignmentIncomplete: true } : {}),
      },
    };
  };

  return {
    ...tableExecutors,
    ...webExecutors,
    queryMemory,
    rememberMemory,
    deleteMemory,
  };
}
