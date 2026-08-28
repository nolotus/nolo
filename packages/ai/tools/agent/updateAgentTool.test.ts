import { describe, expect, it, mock } from "bun:test";

const updateAgentActionMock = mock((payload: any) => ({
  type: "agent/updateAgent",
  payload,
}));

const selectUserIdMock = mock(() => "user-1");

let moduleVersion = 0;

async function loadUpdateAgentTool() {
  const realAuthSlice = await import("auth/authSlice");
  mock.module("ai/agent/agentSlice", () => ({
    updateAgent: updateAgentActionMock,
  }));
  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectUserId: selectUserIdMock,
  }));

  const mod = await import(`./updateAgentTool`);
  mock.restore();
  return mod;
}

const createThunkApi = (agent: any, updatedAgent?: any) => {
  const dispatch = mock(() => ({
    unwrap: async () => updatedAgent ?? agent,
  }));

  return {
    dispatch,
    getState: () => ({}),
    extra: {
      db: {
        get: mock(async () => agent),
      },
    },
  };
};

describe("updateAgentTool", () => {
  it("asks for confirmation before generic agent updates", async () => {
    const { updateAgentToolFunc } = await loadUpdateAgentTool();
    const previousAgent = {
      id: "agent-1",
      dbKey: "agent-user-1-agent-1",
      name: "Generic Agent",
    };

    await expect(
      updateAgentToolFunc(
        {
          agentId: previousAgent.dbKey,
          introduction: "new intro",
        },
        createThunkApi(previousAgent)
      )
    ).rejects.toMatchObject({
      code: "agent_update_requires_confirmation",
      rawData: {
        policy: {
          capability: "agent_update",
          scope: "generic",
          decision: "ask",
          blockedFields: ["introduction"],
        },
      },
    });
  });

  it("allows a confirmed generic update", async () => {
    const { updateAgentToolFunc } = await loadUpdateAgentTool();
    const previousAgent = {
      id: "agent-2",
      dbKey: "agent-user-1-agent-2",
      name: "Prompt Agent",
      prompt: "old prompt",
      isPublic: false,
    };
    const updatedAgent = {
      ...previousAgent,
      prompt: "new prompt",
    };
    const thunkApi = createThunkApi(previousAgent, updatedAgent);

    const result = await updateAgentToolFunc(
      {
        agentId: previousAgent.dbKey,
        prompt: "new prompt",
        __confirmedSelfEvolution: true,
      },
      thunkApi
    );

    expect(updateAgentActionMock).toHaveBeenCalledTimes(1);
    expect(result.rawData).toMatchObject({
      _isUpdate: true,
      _changes: {
        prompt: {
          o: "old prompt",
          n: "new prompt",
        },
      },
    });
  });
});
