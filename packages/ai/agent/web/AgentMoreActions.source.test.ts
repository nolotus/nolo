import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(import.meta.dir, "./AgentMoreActions.tsx"),
  "utf8"
);
const visibilitySource = readFileSync(
  resolve(import.meta.dir, "../agentSyncActionVisibility.ts"),
  "utf8"
);
const adapterSource = readFileSync(
  resolve(import.meta.dir, "../runSyncStandaloneAgentToAccount.ts"),
  "utf8"
);
const webVisibilityReexport = readFileSync(
  resolve(import.meta.dir, "./agentSyncActionVisibility.ts"),
  "utf8"
);
const webAdapterReexport = readFileSync(
  resolve(import.meta.dir, "./runSyncStandaloneAgentToAccount.ts"),
  "utf8"
);
const localeSource = readFileSync(
  resolve(import.meta.dir, "../../ai.locale.ts"),
  "utf8"
);

describe("AgentMoreActions explicit sync UI contract", () => {
  it("enters via the shared overflow menu, not a global sync center", () => {
    expect(source).toContain("resolveAgentSyncActionVisibility");
    expect(source).toContain('t("syncToAccount"');
    expect(source).toContain("agent__action-item--sync");
    expect(source).not.toContain("SyncCenter");
    expect(source).not.toContain("globalSync");
  });

  it("shows non-interactive synced status when mapped to the active account", () => {
    expect(source).toContain('syncVisibility.kind === "synced"');
    expect(source).toContain('role="status"');
    expect(source).toContain('t("syncedToAccount"');
    expect(source).toContain("agent__action-item--synced");
  });

  it("opens ConfirmModal only after user click and never auto-invokes sync", () => {
    expect(source).toContain("setSyncConfirmOpen(true)");
    expect(source).toContain("runSyncStandaloneAgentToAccount");
    expect(source).toContain("handleSyncConfirm");
    expect(source).not.toContain("useEffect(() => {\n      void runSyncStandaloneAgentToAccount");
    expect(adapterSource).toContain("Never auto-invoked");
  });

  it("confirm copy covers local remains, snapshot-only, no dialogs/secrets/Space membership", () => {
    const requiredKeys = [
      "syncToAccountFactLocalRemains",
      "syncToAccountFactSnapshotOnly",
      "syncToAccountFactNoDialogs",
      "syncToAccountFactNoSecrets",
      "syncToAccountFactNoSpaceMembership",
    ];
    for (const key of requiredKeys) {
      expect(source).toContain(key);
      expect(localeSource).toContain(key);
    }
    // zh defaults in component (also mirrored in locale)
    expect(source).toContain("本机 Agent 会继续留在这台设备上");
    expect(source).toContain("本次只上传 Agent 配置快照");
    expect(source).toContain("不会上传对话、消息、附件");
    expect(source).toContain("不会上传本机 API 密钥或令牌");
    expect(source).toContain("不会变更或同步 Space 成员关系");
  });

  it("guards double submit with in-flight ref and disables close/confirm while loading", () => {
    expect(source).toContain("syncInFlightRef");
    expect(source).toContain("if (syncInFlightRef.current) return");
    expect(source).toContain("loading={syncing}");
    expect(source).toContain("allowCancelWhileLoading={false}");
    expect(source).toContain("if (syncing) return");
  });

  it("reports success and error via toast conventions", () => {
    expect(source).toContain('from "app/utils/toast"');
    expect(source).toContain("toast.success");
    expect(source).toContain("toast.error");
  });

  it("visibility rules require non-local account + device-local agent", () => {
    expect(visibilitySource).toContain("isDeviceLocalDbKey");
    expect(visibilitySource).toContain('account !== "local"');
    expect(visibilitySource).toContain('kind: "synced"');
    expect(visibilitySource).toContain('kind: "sync"');
    expect(visibilitySource).toContain('kind: "hidden"');
  });

  it("production adapter uses Redux db read/write only", () => {
    expect(adapterSource).toContain('from "database/dbSlice"');
    expect(adapterSource).toContain("read, write");
    expect(adapterSource).toContain("syncStandaloneAgentToAccount");
    expect(adapterSource).toContain("write({ data, customKey, userId })");
    expect(adapterSource).toContain("dispatch(read({ dbKey }))");
    expect(adapterSource).not.toContain("fetch(");
    expect(adapterSource).not.toContain("createSyncMappingStore");
  });

  it("web paths re-export the platform-neutral visibility and adapter", () => {
    expect(webVisibilityReexport).toContain(
      'from "../agentSyncActionVisibility"'
    );
    expect(webAdapterReexport).toContain(
      'from "../runSyncStandaloneAgentToAccount"'
    );
  });
});
