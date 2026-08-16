import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(import.meta.dir, "./SpaceSettings.tsx"),
  "utf8"
);
const visibilitySource = readFileSync(
  resolve(import.meta.dir, "../spaceLocalAgentsSyncActionVisibility.ts"),
  "utf8"
);
const adapterSource = readFileSync(
  resolve(import.meta.dir, "../runSyncAccountSpaceLocalAgentsToAccount.ts"),
  "utf8"
);
const localeSource = readFileSync(
  resolve(import.meta.dir, "../space.locale.ts"),
  "utf8"
);

describe("SpaceSettings local-Agent reconciliation UI contract", () => {
  it("enters from Space Settings for owner non-local account only", () => {
    expect(source).toContain("resolveSpaceLocalAgentsSyncActionVisibility");
    expect(source).toContain('t("syncLocalAgents"');
    expect(source).toContain('localAgentsSyncVisibility.kind === "sync"');
    expect(visibilitySource).toContain('account !== "local"');
    expect(visibilitySource).toContain("owner !== account");
    expect(source).not.toContain("SyncCenter");
    expect(source).not.toContain("createLocalSpace");
  });

  it("runs read-only preflight before confirm; no writes on entry click path", () => {
    expect(source).toContain("runPreflightAccountSpaceLocalAgents");
    expect(source).toContain("handleLocalAgentsEntryClick");
    expect(source).toContain("setLocalAgentsConfirmOpen(true)");
    expect(source).toContain("setLocalAgentsBlockedOpen(true)");
    // Confirm open only after successful preflight with queued agents
    expect(source).toContain("queuedLocalAgents.length");
    expect(source).toContain("if (queued === 0)");
    // Capture active account at click for authoritative Space validation
    expect(source).toContain("accountAtClick");
    expect(source).toContain("accountUserId: accountAtClick");
    // Entry path must not call confirmed sync
    const entryFnStart = source.indexOf("handleLocalAgentsEntryClick");
    const entryFn = source.slice(entryFnStart, entryFnStart + 1600);
    expect(entryFn).toContain("runPreflightAccountSpaceLocalAgents");
    expect(entryFn).toContain("accountUserId: accountAtClick");
    expect(entryFn).not.toContain("runSyncAccountSpaceLocalAgentsToAccount");
  });

  it("blocks unsupported/missing with type/count UI; never success path", () => {
    expect(source).toContain("formatUnsupportedTypeCountLines");
    expect(source).toContain("syncLocalAgentsBlockedTitle");
    expect(source).toContain("blockedTypeLines");
    expect(source).toContain("showCancel={false}");
    expect(source).not.toContain(
      'toast.success(\n          t("syncLocalAgentsBlocked'
    );
  });

  it("confirm copy covers local remains, snapshot, catalog rewrite, no dialogs/secrets/continuous", () => {
    const requiredKeys = [
      "syncLocalAgentsFactLocalRemains",
      "syncLocalAgentsFactSnapshot",
      "syncLocalAgentsFactCatalogRewrite",
      "syncLocalAgentsFactNoDialogs",
      "syncLocalAgentsFactNoSecrets",
      "syncLocalAgentsFactNoContinuous",
    ];
    for (const key of requiredKeys) {
      expect(source).toContain(key);
      expect(localeSource).toContain(key);
    }
    expect(source).toContain("本机 Agent 会继续留在全局/本机视图中");
    expect(source).toContain("创建或复用账号侧配置快照");
    expect(source).toContain("引用会切换为账号 Agent 键");
    expect(source).toContain("不会上传对话、消息、附件、文档、表格或文件");
    expect(source).toContain("不会上传本机 API 密钥或令牌");
    expect(source).toContain("不会持续同步");
  });

  it("guards double submit; loading disables close while syncing", () => {
    expect(source).toContain("localAgentsInFlightRef");
    expect(source).toContain("if (localAgentsInFlightRef.current) return");
    expect(source).toContain("loading={localAgentsSyncing}");
    expect(source).toContain("allowCancelWhileLoading={false}");
    expect(source).toContain("if (localAgentsSyncing) return");
  });

  it("reports success with rewritten count, honest no-op, and errors via toast", () => {
    expect(source).toContain('from "app/utils/toast"');
    expect(source).toContain("toast.success");
    expect(source).toContain("toast.error");
    expect(source).toContain("syncLocalAgentsSuccess");
    expect(source).toContain("result.rewrittenCount");
    expect(source).toContain("syncLocalAgentsNoop");
    expect(source).toContain("result.noop");
  });

  it("never auto-invokes sync from login/onboarding effects", () => {
    expect(source).not.toContain(
      "useEffect(() => {\n      void runSyncAccountSpaceLocalAgentsToAccount"
    );
    expect(source).not.toContain(
      "useEffect(() => {\n      void runPreflightAccountSpaceLocalAgents"
    );
    expect(adapterSource).toContain("Never auto-invoked");
  });

  it("production adapter uses Redux db read/write/patch same spaceKey", () => {
    expect(adapterSource).toContain('from "database/dbSlice"');
    expect(adapterSource).toContain("read, write, patch");
    expect(adapterSource).toContain("syncAccountSpaceLocalAgentsToAccount");
    expect(adapterSource).toContain(
      "assertAuthoritativeAccountSpaceForLocalAgentsSync"
    );
    expect(adapterSource).toContain("accountUserId: string");
    expect(adapterSource).toContain("patch({ dbKey, changes })");
    expect(adapterSource).toContain("dispatch(read({ dbKey }))");
    expect(adapterSource).not.toContain("fetch(");
    expect(adapterSource).not.toContain("createSyncMappingStore");
  });

  it("entry label is explicit and product wording avoids full Space cloud sync", () => {
    expect(localeSource).toContain("同步此 Space 中的本机 Agent");
    expect(localeSource).toContain("不会创建新 Space");
    expect(localeSource).toContain("完整 Space 云同步");
    expect(source).toContain("同步此 Space 中的本机 Agent");
  });
});
