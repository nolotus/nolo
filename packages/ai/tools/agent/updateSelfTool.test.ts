import { describe, expect, it, mock } from "bun:test";

const updateAgentActionMock = mock((payload: any) => ({
  type: "agent/updateAgent",
  payload,
}));

const selectUserIdMock = mock(() => "user-1");
const selectAutoApproveSelfUpdateFieldsMock = mock(() => [
  "greeting",
  "introduction",
  "tags",
]);
const selectMsgByIdMock = mock((_state: any, _messageId: string) => ({
  agentKey: "agent-user-1-agent-1",
}));
const selectCurrentDialogConfigMock = mock(() => ({
  cybots: ["agent-user-1-agent-1"],
}));

let moduleVersion = 0;

async function loadUpdateSelfTool() {
const realAuthSlice = await import("auth/authSlice");
  const actualMessageSlice = await import("chat/messages/messageSlice");
  const actualDialogSlice = await import("chat/dialog/dialogSlice");

  mock.module("ai/agent/agentSlice", () => ({
    updateAgent: updateAgentActionMock,
  }));
  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectUserId: selectUserIdMock,
  }));
  mock.module("app/settings/settingSlice", () => ({
    selectAutoApproveSelfUpdateFields: selectAutoApproveSelfUpdateFieldsMock,
  }));
  mock.module("chat/messages/messageSlice", () => ({
    ...actualMessageSlice,
    selectMsgById: selectMsgByIdMock,
  }));
  mock.module("chat/dialog/dialogSlice", () => ({
    ...actualDialogSlice,
    selectCurrentDialogConfig: selectCurrentDialogConfigMock,
  }));

  const mod = await import(`./updateSelfTool`);
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

describe("updateSelfTool", () => {
  it("allows default low-risk self updates without confirmation", async () => {
    const { updateSelfToolFunc } = await loadUpdateSelfTool();
    const previousAgent = {
      id: "agent-1",
      dbKey: "agent-user-1-agent-1",
      name: "Self Agent",
      introduction: "old intro",
      isPublic: false,
    };
    const updatedAgent = {
      ...previousAgent,
      introduction: "new intro",
    };

    const result = await updateSelfToolFunc(
      {
        introduction: "new intro",
      },
      createThunkApi(previousAgent, updatedAgent),
      { parentMessageId: "msg-1" }
    );

    expect(updateAgentActionMock).toHaveBeenCalledTimes(1);
    expect(result.rawData).toMatchObject({
      _changes: {
        introduction: {
          o: "old intro",
          n: "new intro",
        },
      },
    });
  });

  it("asks for confirmation before prompt self updates by default", async () => {
    const { updateSelfToolFunc } = await loadUpdateSelfTool();
    const previousAgent = {
      id: "agent-1",
      dbKey: "agent-user-1-agent-1",
      name: "Self Agent",
      prompt: "old prompt",
      isPublic: false,
    };

    await expect(
      updateSelfToolFunc(
        {
          prompt: "new prompt",
        },
        createThunkApi(previousAgent),
        { parentMessageId: "msg-1" }
      )
    ).rejects.toMatchObject({
      code: "agent_update_requires_confirmation",
      rawData: {
        policy: {
          capability: "self_update",
          blockedFields: ["prompt"],
        },
      },
    });
  });

  it("respects user settings that auto-approve additional self-update fields", async () => {
    const { updateSelfToolFunc } = await loadUpdateSelfTool();
    selectAutoApproveSelfUpdateFieldsMock.mockReturnValueOnce([
      "greeting",
      "introduction",
      "tags",
      "prompt",
    ]);
    const previousAgent = {
      id: "agent-1",
      dbKey: "agent-user-1-agent-1",
      name: "Self Agent",
      prompt: "old prompt",
      isPublic: false,
    };
    const updatedAgent = {
      ...previousAgent,
      prompt: "new prompt",
    };

    const result = await updateSelfToolFunc(
      {
        prompt: "new prompt",
      },
      createThunkApi(previousAgent, updatedAgent),
      { parentMessageId: "msg-1" }
    );

    expect(result.rawData).toMatchObject({
      _changes: {
        prompt: {
          o: "old prompt",
          n: "new prompt",
        },
      },
    });
  });
});
