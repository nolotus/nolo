import {
  BUILTIN_AGENT_CATALOG,
  type BuiltinAgentCatalogEntry,
} from "../../packages/core/builtinAgentCatalog";
import {
  parsePublicAgentId,
  publicAgentKey,
} from "../../packages/core/prefix";
import { lookupModelUpgrade } from "../../packages/core/modelUpgradeTable";

export type AuditDriftKind =
  | "model_mismatch"
  | "provider_mismatch"
  | "ownership_mismatch"
  | "orphan_system_preset"
  | "missing_from_plaza"
  | "unexpected_non_zero_price";

export type AgentDrift = {
  id: string;
  dbKey?: string;
  name: string;
  kind: AuditDriftKind;
  expected: string;
  actual: string;
  severity: "error" | "warning";
  details?: string;
};

export type CatalogAuditSummary = {
  ok: boolean;
  totalCatalogEntries: number;
  totalLiveAgents: number;
  matchedCount: number;
  drifts: AgentDrift[];
};

export type LiveAgentLike = {
  id?: string;
  dbKey?: string;
  name?: string;
  model?: string;
  provider?: string;
  userId?: string;
  isPublic?: boolean;
  inputPrice?: number | null;
  outputPrice?: number | null;
  imageModel?: string;
  imageWorkflow?: string;
  isTombstone?: boolean;
  [key: string]: any;
};

export type AuditOptions = {
  /**
   * 允许的公共预设拥有者（除了 "system" 之外）。
   * 默认包含已知管理员 ID "0e95801d90" 或 process.env.ADMIN_USER_ID。
   */
  allowedPresetOwners?: string[];
  /**
   * 是否对图片档位的 imageModel/imageWorkflow 进行校验。默认 true。
   */
  checkImageWorkflows?: boolean;
  /**
   * 是否对公开纯模型档检查零定价（非零定价会覆盖模型目录价并可能导致缓存费率失效）。默认 true。
   */
  checkZeroPricingOnModelPresets?: boolean;
};

const DEFAULT_ADMIN_ID = process.env.ADMIN_USER_ID || "0e95801d90";
const DEFAULT_ALLOWED_OWNERS = new Set(["system", DEFAULT_ADMIN_ID]);

/**
 * 从 live agent 提取规范化的 id（剥离 agent-pub- 或 agent-system- 前缀）。
 */
export function extractAgentId(agent: LiveAgentLike): string {
  if (agent.id && typeof agent.id === "string") {
    const parsed = parsePublicAgentId(agent.id);
    if (parsed) return parsed;
    if (agent.id.startsWith("agent-system-")) {
      return agent.id.slice("agent-system-".length);
    }
    return agent.id;
  }
  if (agent.dbKey && typeof agent.dbKey === "string") {
    const parsed = parsePublicAgentId(agent.dbKey);
    if (parsed) return parsed;
    if (agent.dbKey.startsWith("agent-system-")) {
      return agent.dbKey.slice("agent-system-".length);
    }
  }
  return "";
}

/**
 * 纯函数：比对线上/外部 Public Agent 列表与代码层 BUILTIN_AGENT_CATALOG 的一致性。
 *
 * 核心检查：
 * 1. model / provider 分叉（2026-08-21 事故根因：DB 记录 kimi ↔ catalog deepseek 分叉 16 天）
 * 2. 预设 agent 归属不是 system / admin（防 §2.3 分润漏洞）
 * 3. 库中有公开/system 预设但不在 catalog（孤儿预设，无法通过代码升级换代，如 Gemini 3 Flash Preview）
 * 4. 纯模型公共预设携带非零 prices（覆盖目录价并破坏缓存价格优惠）
 * 5. 广场公开的 catalog 条目是否存在
 */
export function auditPublicAgentsAgainstCatalog(
  liveAgents: LiveAgentLike[],
  catalog: BuiltinAgentCatalogEntry[] = BUILTIN_AGENT_CATALOG,
  options: AuditOptions = {},
): CatalogAuditSummary {
  const allowedOwners = options.allowedPresetOwners
    ? new Set(options.allowedPresetOwners)
    : DEFAULT_ALLOWED_OWNERS;
  const checkImage = options.checkImageWorkflows !== false;
  const checkZeroPrice = options.checkZeroPricingOnModelPresets !== false;

  const drifts: AgentDrift[] = [];
  const catalogById = new Map<string, BuiltinAgentCatalogEntry>();
  for (const entry of catalog) {
    catalogById.set(entry.id, entry);
  }

  // 建立 live agent 索引（按 id 查）
  const liveById = new Map<string, LiveAgentLike>();
  for (const live of liveAgents) {
    const id = extractAgentId(live);
    if (id) {
      liveById.set(id, live);
    }
  }

  let matchedCount = 0;

  // 1. 检查 Catalog 中应上架的条目（group === "public"，以及上广场的 builtin 如 nolo）
  for (const entry of catalog) {
    // internal 不上广场，跳过
    if (entry.group === "internal") continue;

    // builtin 中除 nolo 默认入口外，其余如 Chrome 操作员等不上广场
    if (entry.group === "builtin" && entry.id !== "01NOLOAPPBLD000000019KCKT0") {
      continue;
    }

    const live = liveById.get(entry.id);
    if (!live || live.isTombstone) {
      drifts.push({
        id: entry.id,
        name: entry.name,
        kind: "missing_from_plaza",
        expected: `agent present in public plaza with model=${entry.model}`,
        actual: live?.isTombstone ? "tombstoned in DB" : "not found in live public agents list",
        severity: "warning",
      });
      continue;
    }

    matchedCount++;

    // 检查 Model 是否一致 (CRITICAL BUG DEFENSE)
    if (live.model && live.model !== entry.model) {
      drifts.push({
        id: entry.id,
        dbKey: live.dbKey,
        name: entry.name,
        kind: "model_mismatch",
        expected: entry.model,
        actual: live.model,
        severity: "error",
        details: `Catalog specifies model '${entry.model}', but live record has '${live.model}'`,
      });
    }

    // 检查 Provider 是否一致
    if (entry.provider && live.provider && live.provider !== entry.provider) {
      const upgrade = lookupModelUpgrade(entry.provider, entry.model);
      const isKnownUpgradeAlias = upgrade && upgrade.to.provider === live.provider;

      if (!isKnownUpgradeAlias) {
        drifts.push({
          id: entry.id,
          dbKey: live.dbKey,
          name: entry.name,
          kind: "provider_mismatch",
          expected: entry.provider,
          actual: live.provider,
          severity: "error",
          details: `Catalog specifies provider '${entry.provider}', but live record has '${live.provider}'`,
        });
      }
    }

    // 检查预设 Agent 所有权（防止挂在普通用户下漏分润）
    if (live.userId && !allowedOwners.has(live.userId)) {
      drifts.push({
        id: entry.id,
        dbKey: live.dbKey,
        name: entry.name,
        kind: "ownership_mismatch",
        expected: "system (or admin)",
        actual: live.userId,
        severity: "warning",
        details: `Preset agent is owned by non-system user '${live.userId}'`,
      });
    }

    // 检查纯模型预设的零定价（D1/D4: 记录价必须为 0，让位给目录价以获得缓存折扣）
    if (checkZeroPrice && !entry.hasImageOutput && entry.group === "public") {
      const inputPrice = typeof live.inputPrice === "number" ? live.inputPrice : 0;
      const outputPrice = typeof live.outputPrice === "number" ? live.outputPrice : 0;
      if (inputPrice > 0 || outputPrice > 0) {
        drifts.push({
          id: entry.id,
          dbKey: live.dbKey,
          name: entry.name,
          kind: "unexpected_non_zero_price",
          expected: "inputPrice=0, outputPrice=0 (defer to catalog pricing for cache discounts)",
          actual: `inputPrice=${inputPrice}, outputPrice=${outputPrice}`,
          severity: "warning",
          details: `Public preset has non-zero DB price, which may override platform catalog price and cache discount rates.`,
        });
      }
    }

    // 检查图片工作流模型
    if (checkImage && entry.hasImageOutput) {
      if (entry.imageModel && live.imageModel && live.imageModel !== entry.imageModel) {
        drifts.push({
          id: entry.id,
          dbKey: live.dbKey,
          name: entry.name,
          kind: "model_mismatch",
          expected: `imageModel=${entry.imageModel}`,
          actual: `imageModel=${live.imageModel}`,
          severity: "error",
        });
      }
      if (entry.imageWorkflow && live.imageWorkflow && live.imageWorkflow !== entry.imageWorkflow) {
        drifts.push({
          id: entry.id,
          dbKey: live.dbKey,
          name: entry.name,
          kind: "model_mismatch",
          expected: `imageWorkflow=${entry.imageWorkflow}`,
          actual: `imageWorkflow=${live.imageWorkflow}`,
          severity: "warning",
        });
      }
    }
  }

  // 2. 检查反向孤儿：Live 中有 userId === 'system' 或带有 agent-pub- 前缀，但在 catalog 中未声明
  for (const live of liveAgents) {
    const id = extractAgentId(live);
    if (!id) continue;

    const isMarkedAsSystem = live.userId === "system";
    const isPublicPresetPrefix = (live.dbKey || "").startsWith("agent-pub-");

    if ((isMarkedAsSystem || isPublicPresetPrefix) && !catalogById.has(id)) {
      drifts.push({
        id,
        dbKey: live.dbKey,
        name: live.name || id,
        kind: "orphan_system_preset",
        expected: "agent registered in builtinAgentCatalog",
        actual: `orphan live preset '${live.name || id}' (model: ${live.model}, owner: ${live.userId})`,
        severity: "warning",
        details: "Live DB has a public/system preset agent not present in builtinAgentCatalog",
      });
    }
  }

  const hasErrors = drifts.some((d) => d.severity === "error");

  return {
    ok: !hasErrors,
    totalCatalogEntries: catalog.length,
    totalLiveAgents: liveAgents.length,
    matchedCount,
    drifts,
  };
}

/**
 * 直接从远端/本地 DB 读取各 Catalog 条目的真实 ground-truth 记录（绕过 RPC 的 C7 overlay）。
 */
export async function fetchRawPresetAgentsFromDb(
  server: string,
  token?: string,
  catalog: BuiltinAgentCatalogEntry[] = BUILTIN_AGENT_CATALOG,
): Promise<LiveAgentLike[]> {
  const cleanServer = server.replace(/\/+$/, "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const results: LiveAgentLike[] = [];
  const entriesToCheck = catalog.filter(
    (e) => e.group === "public" || e.id === "01NOLOAPPBLD000000019KCKT0",
  );

  for (const entry of entriesToCheck) {
    const key = publicAgentKey(entry.id);
    try {
      const res = await fetch(`${cleanServer}/api/v1/db/read/${key}?includeDeleted=true`, {
        headers,
      });
      if (res.ok) {
        const doc = (await res.json()) as any;
        if (doc && typeof doc === "object") {
          results.push({
            ...doc,
            dbKey: key,
            id: entry.id,
            isTombstone: !!doc.isDeleted || !!doc.tombstone,
          });
        }
      }
    } catch {
      // 网络或读取失败忽略
    }
  }

  return results;
}

/**
 * CLI 运行入口：综合使用 raw-db 权威读取与 rpc 列表扫描，兼顾模型真实值核对与孤儿预设发现。
 */
async function runCli(): Promise<void> {
  const args = process.argv.slice(2);
  let server = "https://nolo.chat";
  let mode: "hybrid" | "raw-db" | "rpc" = "hybrid";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--server" && args[i + 1]) {
      server = args[i + 1];
      i++;
    } else if (args[i] === "--rpc") {
      mode = "rpc";
    } else if (args[i] === "--raw-db") {
      mode = "raw-db";
    }
  }
  if (process.env.BASE_URL) {
    server = process.env.BASE_URL;
  }

  let token = process.env.NOLO_TOKEN || process.env.AUTH_TOKEN || "";
  if (!token) {
    try {
      const fs = require("node:fs");
      const path = require("node:path");
      const confPath = path.join(process.env.HOME || "", ".nolo", "config.json");
      if (fs.existsSync(confPath)) {
        const c = JSON.parse(fs.readFileSync(confPath, "utf8"));
        token = c.profiles?.[c.currentProfile]?.authToken || c.token || c.authToken || "";
      }
    } catch {}
  }

  console.log(`[catalog-audit] Auditing public agents against BUILTIN_AGENT_CATALOG at ${server} (mode: ${mode})...`);

  try {
    const agentMap = new Map<string, LiveAgentLike>();

    // 1. 若为 hybrid 或 raw-db，拉取真实 DB 记录以覆盖 model/pricing/ownership 真值
    if (mode === "hybrid" || mode === "raw-db") {
      console.log(`[catalog-audit] 1/2 Fetching raw DB records via /api/v1/db/read (ground-truth billing shape)...`);
      const rawAgents = await fetchRawPresetAgentsFromDb(server, token);
      for (const a of rawAgents) {
        const id = extractAgentId(a);
        if (id) agentMap.set(id, a);
      }
      console.log(`[catalog-audit]   -> Loaded ${rawAgents.length} raw DB preset records.`);
    }

    // 2. 若为 hybrid 或 rpc，拉取广场全量列表以检出孤儿预设（DB 中有但 catalog 未登记的 system/agent-pub-）
    if (mode === "hybrid" || mode === "rpc") {
      console.log(`[catalog-audit] 2/2 Fetching public plaza list via /rpc/getPublicAgents (orphan preset detection)...`);
      const res = await fetch(`${server.replace(/\/+$/, "")}/rpc/getPublicAgents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100 }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const plazaAgents: LiveAgentLike[] = Array.isArray(data)
          ? data
          : data.agents || data.data || data.publicAgents || [];
        console.log(`[catalog-audit]   -> Loaded ${plazaAgents.length} plaza agents.`);

        for (const pa of plazaAgents) {
          const id = extractAgentId(pa);
          if (id && !agentMap.has(id)) {
            agentMap.set(id, pa);
          }
        }
      } else {
        console.warn(`[catalog-audit]   -> Plaza fetch failed: HTTP ${res.status}`);
      }
    }

    const liveAgents = Array.from(agentMap.values());
    const result = auditPublicAgentsAgainstCatalog(liveAgents);

    console.log(`[catalog-audit] Total live agents audited: ${result.totalLiveAgents}, Catalog matched: ${result.matchedCount}`);

    if (result.drifts.length === 0) {
      console.log("[catalog-audit] ✅ All public agents match catalog definitions perfectly!");
      process.exit(0);
    }

    console.log(`[catalog-audit] Found ${result.drifts.length} drifts:`);
    for (const drift of result.drifts) {
      const tag = drift.severity === "error" ? "❌ ERROR" : "⚠️ WARN";
      console.log(`  ${tag} [${drift.kind}] ${drift.name} (${drift.id})`);
      console.log(`      Expected: ${drift.expected}`);
      console.log(`      Actual:   ${drift.actual}`);
      if (drift.details) console.log(`      Details:  ${drift.details}`);
    }

    if (!result.ok) {
      console.error("\n[catalog-audit] ❌ Audit failed with critical errors!");
      process.exit(1);
    } else {
      console.log("\n[catalog-audit] ⚠️ Audit passed with warnings (no blocking errors).");
      process.exit(0);
    }
  } catch (err: any) {
    console.error(`[catalog-audit] Error executing audit: ${err?.message || String(err)}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  runCli();
}
