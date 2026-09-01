import { afterAll, describe, expect, it, mock } from "bun:test";
import { fileURLToPath } from "node:url";

const realDbSlice = await import("database/dbSlice");
const realContentThunks = {
  ...(await import("create/space/content/contentThunks")),
};
const realMessageSlice = await import("chat/messages/messageSlice");
const realAuthSlice = await import("auth/authSlice");
const realUiAskChoice = await import("ai/tools/uiAskChoiceTool");

const readAndWaitMock = mock((dbKey: string) => ({
  kind: "readAndWait",
  dbKey,
}));
const writeMock = mock((payload: any) => ({
  kind: "write",
  payload,
}));
const addContentToSpaceMock = mock((payload: any) => ({
  kind: "addContentToSpace",
  payload,
}));
const prepareAndPersistMessageMock = mock((payload: any) => ({
  kind: "prepareAndPersistMessage",
  payload,
}));
const resolveUnderstandingGreetingMemoryMock = mock(async () => ({
  item: {
    id: "m1",
    ownerType: "user",
    ownerId: "user-1",
    visibility: "private",
    subjectType: "agent",
    subjectId: "agent-email",
    kind: "semantic",
    facet: "tension",
    content: "在权衡先稳住首封体验还是先把营销分层搭起来",
    createdAt: "2026-04-22T00:00:00.000Z",
    lastActivatedAt: "2026-04-22T00:00:00.000Z",
    activationCount: 0,
    importance: 0.9,
    confidence: 0.8,
    tags: ["understanding-memory", "memory-facet:tension"],
    patternKey: "understanding:tension:test",
  },
}));
const resolveRecentRelationshipRecapMock = mock(async () => ({
  recap: "旧 recap 不应出现在 greeting 里",
  reason: "selected" as const,
}));

let moduleVersion = 0;
const dbSlicePath = fileURLToPath(
  new URL("../../../database/dbSlice.ts", import.meta.url),
);

const loadCreateDialogAction = async () => {
  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    readAndWait: readAndWaitMock,
    write: writeMock,
  }));
  mock.module(dbSlicePath, () => ({
    ...realDbSlice,
    readAndWait: readAndWaitMock,
    write: writeMock,
  }));
  mock.module("create/space/content/contentThunks", () => ({
    ...realContentThunks,
    addContentToSpace: addContentToSpaceMock,
  }));
  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectUserId: (state: any) => state.auth?.currentUser?.userId,
  }));
  mock.module("chat/messages/messageSlice", () => ({
    ...realMessageSlice,
    prepareAndPersistMessage: prepareAndPersistMessageMock,
  }));
  mock.module("ai/tools/uiAskChoiceTool", () => ({
    ...realUiAskChoice,
    uiAskChoiceFunc: realUiAskChoice.uiAskChoiceFunc,
  }));
  mock.module("ai/memory/understandingGreeting", () => ({
    resolveUnderstandingGreetingMemory: resolveUnderstandingGreetingMemoryMock,
    mergeGreetingWithUnderstandingMemory: (input: any) =>
      `${input.greetingText}\n\n欢迎回来。我记得你上次更在意的是首封体验的信任感。\n如果你愿意，我们可以接着看：先稳住首封体验，还是先把营销分层搭起来。如果今天是新问题，也直接说。`,
  }));
  mock.module("ai/memory/recentRelationshipRecap", () => ({
    shouldUseRecentRelationshipRecap: () => true,
    resolveRecentRelationshipRecap: resolveRecentRelationshipRecapMock,
    mergeGreetingWithRelationshipRecap: (input: any) =>
      `${input.greetingText}\n\n上次我们主要聊到：${input.recentRecap}`,
  }));

  const module = await import(
    `./createDialogAction.ts?understanding-test=${moduleVersion++}`
  );
  mock.restore();
  return module.createDialogAction;
};

describe("createDialogAction understanding greeting", () => {
  it("prefers understanding memory over raw recent recap in the initial greeting", async () => {
    const createDialogAction = await loadCreateDialogAction();
    readAndWaitMock.mockClear();
    writeMock.mockClear();
    prepareAndPersistMessageMock.mockClear();
    resolveUnderstandingGreetingMemoryMock.mockClear();
    resolveRecentRelationshipRecapMock.mockClear();

    const dispatch = mock((action: any) => {
      if (action.kind === "readAndWait") {
        return {
          unwrap: async () => ({
            dbKey: "agent-email",
            name: "邮件助手",
            greeting: "你好，我是邮件助手。",
          }),
        };
      }

      if (action.kind === "write") {
        return {
          unwrap: async () => ({
            ...action.payload.data,
            dbKey: action.payload.customKey,
          }),
        };
      }

      if (action.kind === "prepareAndPersistMessage") {
        return { unwrap: async () => ({}) };
      }

      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    await createDialogAction(
      { cybots: ["agent-email"] },
      {
        dispatch,
        getState: () =>
          ({
            auth: {
              currentUser: {
                userId: "user-1",
              },
            },
          }) as any,
        extra: { db: {} },
      },
    );

    const greetingPayload = prepareAndPersistMessageMock.mock.calls[0]?.[0];
    expect(resolveUnderstandingGreetingMemoryMock).toHaveBeenCalledTimes(1);
    expect(resolveRecentRelationshipRecapMock).toHaveBeenCalledTimes(0);
    expect(greetingPayload?.message?.content).toContain(
      "欢迎回来。我记得你上次更在意的是首封体验的信任感",
    );
    expect(greetingPayload?.message?.content).toContain(
      "如果你愿意，我们可以接着看：先稳住首封体验，还是先把营销分层搭起来",
    );
    expect(greetingPayload?.message?.content).not.toContain(
      "旧 recap 不应出现在 greeting 里",
    );
  });
});
