import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(import.meta.dir, relativePath), "utf-8");

describe("dialog path source contract", () => {
  it("creates dialogs through dbSlice.write in createDialogAction", () => {
    const source = readSource("actions/createDialogAction.ts");
    expect(source).toContain(
      "removeCachedEntity,"
    );
    expect(source).toContain("buildBuiltinObjectAssistantAgentFromKey");
    expect(source).toContain("customKey: dialogPath");
    expect(source).toContain("dispatch(removeCachedEntity(dialogPath))");
  });

  it("updates dialog titles through dbSlice.patch in updateDialogTitleAction", () => {
    const source = readSource("actions/updateDialogTitleAction.ts");
    const messageActionsSource = readSource("../messages/web/MessageActions.tsx");
    const builtinLlmSource = readSource("actions/builtinDialogLlm.ts");
    expect(source).toContain('import { patch, selectById } from "database/dbSlice";');
    expect(source).toContain("llmConfig: BUILTIN_TITLE_LLM_CONFIG");
    expect(source).toContain('msg?.role !== "tool"');
    expect(source).toContain("!isAssistantToolStub(msg)");
    expect(source).toContain("patchAction = patch");
    expect(source).toContain("patchAction({ dbKey: dialogKey, changes: { title } })");
    expect(source).not.toContain("titleAgentDbKey");
    expect(messageActionsSource).toContain("llmConfig: BUILTIN_TITLE_LLM_CONFIG");
    expect(messageActionsSource).not.toContain("titleAgentDbKey");
    expect(messageActionsSource).not.toContain("DataType.DOC");
    expect(messageActionsSource).not.toContain("ulid()");
    expect(builtinLlmSource).toContain('model: "deepseek-v4-flash"');
  });

  it("keeps primary dialog entrypoints routed through createDialog and deleteDialog", () => {
    const useCreateDialogSource = readSource("useCreateDialog.ts");
    const dialogSliceSource = readSource("dialogSlice.ts");
    const deleteOrchestrationSource = readSource("deleteDialogOrchestration.ts");
    const createTaskModalSource = readSource("../web/CreateTaskModal.tsx");
    const messageListSource = readSource("../messages/web/MessageList.tsx");
    const deleteContentSource = readSource("../../create/space/content/deleteContentFromSpaceAction.ts");

    expect(useCreateDialogSource).toContain(
      'cybots: resolvedAgentMode === "auto" ? [] : agents,'
    );
    expect(createTaskModalSource).toContain("createAgentAutomation({");
    expect(messageListSource).toContain("createDialog({");
    expect(deleteContentSource).toContain('await (dispatch as any)(deleteDialog(key)).unwrap();');
    // deleteDialog body lives in deleteDialogOrchestration (slice only wires the thunk).
    expect(dialogSliceSource).toContain('from "./deleteDialogOrchestration"');
    expect(dialogSliceSource).toContain("deleteDialogThunk");
    expect(deleteOrchestrationSource).toContain('import { getRuntimeServerContext } from "database/runtimeServerContext"');
    expect(deleteOrchestrationSource).toContain("getRuntimeServerContext(state)");
    expect(deleteOrchestrationSource).not.toContain('import { selectRuntimeSnapshot } from "app/stateViews/runtime"');
    expect(deleteOrchestrationSource).toContain("scheduleDeleteReplication");
    expect(deleteOrchestrationSource).toContain('import { cleanupCliSessionForDialog } from "./actions/cleanupCliSession";');
    expect(deleteOrchestrationSource).not.toContain('await import("./actions/cleanupCliSession")');
    expect(deleteOrchestrationSource).not.toContain("syncWithServers(");
    expect(deleteOrchestrationSource).not.toContain("noloDeleteRequest");
  });

  it("does not surface recoverable dialog config misses as RN LogBox errors", () => {
    const dialogSliceSource = readSource("dialogSlice.ts");

    expect(dialogSliceSource).toContain('console.info("Failed to load dialog config:"');
    expect(dialogSliceSource).not.toContain('console.error("Failed to load dialog config:"');
  });

  it("lets only space-scoped agent callers pass explicit dialog space ids", () => {
    const useAgentDialogSource = readSource("../../ai/agent/hooks/useAgentDialog.ts");
    const agentBlockSource = readSource("../../ai/agent/web/AgentBlock.tsx");
    const agentPageSource = readSource("../../ai/agent/web/AgentPage.tsx");
    const createAgentToolCardSource = readSource("../messages/web/CreateAgentToolCard.tsx");
    const updateAgentToolCardSource = readSource("../messages/web/UpdateAgentToolCard.tsx");

    expect(useAgentDialogSource).toContain("...(spaceId ? { spaceId } : {})");
    expect(useAgentDialogSource).toContain(
      "preferredServerOrigin ? { preferredServerOrigin } : {}"
    );
    // 重构后：AgentBlock 的 dialog 空间解析统一走 dialogLaunchScope 的共享 helper
    expect(agentBlockSource).toContain("resolveDialogLaunchSpaceId({");
    expect(agentBlockSource).toContain("dialogSpaceId={dialogSpaceId}");
    expect(agentBlockSource).toContain("item.authorityServer || item.originServer || currentServer");
    expect(agentBlockSource).toContain("preferredServerOrigin: server");
    expect(agentBlockSource).toContain("allowSidebarSpaceFallback: true");
    expect(agentPageSource).toContain("useAgentDialog(");
    expect(agentPageSource).toContain("currentKey,");
    expect(agentPageSource).toContain("spaceId: dialogSpaceId");
    expect(agentPageSource).toContain("item?.authorityServer || item?.originServer || server");
    expect(agentPageSource).toContain("preferredServerOrigin: agentAuthorityServer");
    expect(agentPageSource).toContain("routeSpaceId");
    expect(createAgentToolCardSource).toContain("recordSpaceId: currentDialogSpaceId");
    expect(createAgentToolCardSource).toContain("spaceId: dialogSpaceId");
    expect(updateAgentToolCardSource).toContain("recordSpaceId: currentDialogSpaceId");
    expect(updateAgentToolCardSource).toContain("spaceId: dialogSpaceId");
  });

});
