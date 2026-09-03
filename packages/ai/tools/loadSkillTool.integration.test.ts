import { afterEach, describe, expect, it, mock } from "bun:test";
import * as stateViewsRuntimeActual from "app/stateViews/runtime";
import * as dialogRuntimeStoreActual from "chat/dialog/dialogRuntimeStore";
import * as dbSliceActual from "database/dbSlice";
import * as setDialogExtraReferencesActual from "chat/dialog/actions/setDialogExtraReferencesAction";

const originalFetch = globalThis.fetch;
let moduleVersion = 0;

// 模拟一个已登录用户 + 空 space（无 skill 索引），验证 builtin 回退真正生效。
const runtime = {
  currentServer: "https://nolo.chat",
  currentToken: "token-1",
  currentUserId: "user-1",
};

const jsonResponse = (value: unknown) =>
  ({ ok: true, json: async () => value }) as Response;

const notFoundResponse = () =>
  ({ ok: false, status: 404, json: async () => ({}) }) as Response;

// 记录 persistLoadedSkillReference 是否真的把 coding skill 写进了 extraReferences。
let writtenExtraReferences: Array<{ dbKey: string; title: string }> = [];

async function loadLoadSkillTool() {
  // mock.module 用「真实导出展开 + 仅覆盖所需项」：bun 的 mock.restore() 无法还原
  // 已被固化的 ESM 绑定，若整体替换 dbSlice 等共享模块，同进程后续测试文件的
  // 其他导出（如 dbSlice.read）会丢失（SyntaxError: Export named 'read' not found）。
  mock.module("app/stateViews/runtime", () => ({
    ...stateViewsRuntimeActual,
    selectRuntimeSnapshot: () => runtime,
  }));
  // mock dialog 依赖：getActiveDialogKey 返回固定对话，selectById 返回现有 references，
  // setDialogExtraReferencesAction 记录写入内容。
  mock.module("chat/dialog/dialogRuntimeStore", () => ({
    ...dialogRuntimeStoreActual,
    getActiveDialogKey: () => "dialog-user-1-test",
  }));
  mock.module("database/dbSlice", () => ({
    ...dbSliceActual,
    selectById: () => ({ extraReferences: [] }),
  }));
  mock.module("chat/dialog/actions/setDialogExtraReferencesAction", () => ({
    ...setDialogExtraReferencesActual,
    setDialogExtraReferencesAction: async (refs: any[]) => {
      writtenExtraReferences = refs.map((r: any) => ({
        dbKey: r.dbKey,
        title: r.title,
      }));
      return { unwrap: async () => ({}) };
    },
  }));
  const mod = await import(`./loadSkillTool`);
  mock.restore();
  return mod;
}

function mockFetchRoutes(routes: Record<string, () => unknown>) {
  globalThis.fetch = mock((input: any) => {
    const url = String(input instanceof Request ? input.url : input);
    for (const [suffix, handler] of Object.entries(routes)) {
      if (url.includes(suffix)) return Promise.resolve(jsonResponse(handler()));
    }
    return Promise.resolve(notFoundResponse());
  }) as any;
}

describe("loadSkill coding builtin fallback (agent self-loads coding mid-conversation)", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    writtenExtraReferences = [];
    mock.restore();
  });

  it("returns the coding skill body via builtin fallback when no space skill matches", async () => {
    const { loadSkillFunc } = await loadLoadSkillTool();
    // 空 space（无任何 skillSummary）→ listSkillCandidates 返回空 → builtin 回退命中。
    mockFetchRoutes({
      "/rpc/getUserSpaceMemberships": () => [{ spaceId: "space-1" }],
      "/api/v1/db/read/space-1": () => ({
        data: { dbKey: "space-1", name: "My Space", contents: {} },
      }),
    });

    const result = await loadSkillFunc(
      { name: "coding" },
      { getState: () => ({}) }
    );

    expect(result.rawData).toMatchObject({
      success: true,
      name: "coding",
    });
    const raw = result.rawData as { dbKey?: string };
    // 内置 skill 不落库，引用键就是 slug——注册表按 slug 解析，不需要 DB 记录。
    expect(raw.dbKey).toBe("coding");
    // 返回的是 coding skill 完整内容，必须包含写代码纪律 + review 纪律。
    expect(result.displayData).toContain("写代码纪律");
    expect(result.displayData).toContain("Review 纪律");
    expect(result.displayData).toContain("startAgentRun");
    expect(result.displayData).toContain("code-quality");
  });

  it("writes the coding skill reference into dialog.extraReferences (tool-surface expansion)", async () => {
    const { loadSkillFunc } = await loadLoadSkillTool();
    mockFetchRoutes({
      "/rpc/getUserSpaceMemberships": () => [{ spaceId: "space-1" }],
      "/api/v1/db/read/space-1": () => ({
        data: { dbKey: "space-1", name: "My Space", contents: {} },
      }),
    });

    await loadSkillFunc({ name: "coding" }, { getState: () => ({}) });

    // 关键闭环：coding skill 必须被写进 dialog.extraReferences，
    // 后续 turn 的 resolveReferenceAssets 才能据此扩展工具面。
    expect(writtenExtraReferences).toHaveLength(1);
    expect(writtenExtraReferences[0].title).toBe("coding");
    expect(writtenExtraReferences[0].dbKey).toBe("coding");

    // 真正要守的不变量不是键长什么样，而是这个键能不能解析回工具面。
    // 内置注册表不查库，所以下一轮即便 DB 里什么都没有也能扩展。
    const { resolveBuiltinSkillPage } = await import(
      "ai/skills/builtinSkillRegistry"
    );
    const page = resolveBuiltinSkillPage(writtenExtraReferences[0].dbKey);
    expect(page).not.toBeNull();
    const skillConfig = (page?.meta as { skillConfig?: { toolNames?: string[] } })
      ?.skillConfig;
    expect(skillConfig?.toolNames?.length ?? 0).toBeGreaterThan(0);
  });

  it("returns coding-review-* role skills via builtin fallback too", async () => {
    const { loadSkillFunc } = await loadLoadSkillTool();
    mockFetchRoutes({
      "/rpc/getUserSpaceMemberships": () => [{ spaceId: "space-1" }],
      "/api/v1/db/read/space-1": () => ({
        data: { dbKey: "space-1", name: "My Space", contents: {} },
      }),
    });

    const securityResult = await loadSkillFunc(
      { name: "coding-review-security" },
      { getState: () => ({}) }
    );
    expect(securityResult.rawData).toMatchObject({ success: true });
    expect(securityResult.displayData).toContain("安全审计员");
    expect(securityResult.displayData).toContain("XSS");
    expect(securityResult.displayData).toContain("SQL 注入");
  });

  it("still reports not-found for a non-coding unknown skill", async () => {
    const { loadSkillFunc } = await loadLoadSkillTool();
    mockFetchRoutes({
      "/rpc/getUserSpaceMemberships": () => [{ spaceId: "space-1" }],
      "/api/v1/db/read/space-1": () => ({
        data: { dbKey: "space-1", name: "My Space", contents: {} },
      }),
    });

    const result = await loadSkillFunc(
      { name: "definitely-not-a-skill" },
      { getState: () => ({}) }
    );
    expect(result.rawData).toMatchObject({ success: false });
    expect(result.displayData).toContain('Skill "definitely-not-a-skill" not found');
  });
});
