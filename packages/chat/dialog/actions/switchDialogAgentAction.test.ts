import { describe, expect, test, mock } from "bun:test";
import { switchDialogAgentAction } from "./switchDialogAgentAction";
import { getActiveDialogAgentId } from "../dialogAgents";

describe("switchDialogAgentAction & getActiveDialogAgentId", () => {
  test("switchDialogAgentAction patches activeAgentKey without modifying messages or cybots", async () => {
    let patchedChanges: any = null;
    const mockDb = {
      get: mock(async (key: string) => ({
        id: key,
        dbKey: key,
        type: "dialog",
        title: "Test Dialog",
        cybots: ["agent-default"],
      })),
      put: mock(async (key: string, data: any) => {
        patchedChanges = data;
      }),
      patch: mock(async () => {}),
    };

    const mockState = {
      db: {
        ids: ["dialog-1"],
        entities: {
          "dialog-1": {
            id: "dialog-1",
            dbKey: "dialog-1",
            type: "dialog",
            title: "Test Dialog",
            cybots: ["agent-default"],
            activeAgentKey: "agent-default",
          },
        },
      },
    };

    const thunkApi = {
      dispatch: (action: any) => {
        if (typeof action === "function") {
          return action(thunkApi.dispatch, thunkApi.getState, { db: mockDb });
        }
        return { unwrap: () => action };
      },
      getState: () => mockState,
      extra: { db: mockDb },
    };

    await switchDialogAgentAction(
      { dialogKey: "dialog-1", agentKey: "agent-switched" },
      thunkApi,
    );

    expect(patchedChanges).toBeDefined();
    expect(patchedChanges.activeAgentKey).toBe("agent-switched");
    expect(patchedChanges.messages).toBeUndefined();
  });

  test("getActiveDialogAgentId fallback logic", () => {
    // 1. activeAgentKey present
    expect(
      getActiveDialogAgentId({
        id: "d1",
        type: "dialog" as any,
        title: "t",
        cybots: ["cybot-1"],
        activeAgentKey: "active-agent",
        createdAt: "",
        updatedAt: "",
      }),
    ).toBe("active-agent");

    // 2. activeAgentKey missing -> fallback to cybots[0]
    expect(
      getActiveDialogAgentId({
        id: "d1",
        type: "dialog" as any,
        title: "t",
        cybots: ["cybot-1", "cybot-2"],
        createdAt: "",
        updatedAt: "",
      }),
    ).toBe("cybot-1");

    // 3. cybots missing -> fallback to primaryAgentKey
    expect(
      getActiveDialogAgentId({
        id: "d1",
        type: "dialog" as any,
        title: "t",
        cybots: [],
        primaryAgentKey: "primary-agent",
        createdAt: "",
        updatedAt: "",
      }),
    ).toBe("primary-agent");

    // 4. Everything missing -> fallback to default agent key
    expect(
      getActiveDialogAgentId(
        {
          id: "d1",
          type: "dialog" as any,
          title: "t",
          cybots: [],
          createdAt: "",
          updatedAt: "",
        },
        "system-default-agent",
      ),
    ).toBe("system-default-agent");
  });
});
