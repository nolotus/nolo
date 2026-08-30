import { describe, expect, it } from "bun:test";

import { BUILTIN_TITLE_LLM_CONFIG } from "./builtinDialogLlm";
import { updateDialogTitleActionWithDeps } from "./updateDialogTitleAction";
import {
  TITLE_UPDATE_INTERVAL_MINUTES,
  shouldUpdateTitle,
} from "./updateDialogTitlePolicy";

describe("updateDialogTitleAction timing", () => {
  const now = new Date("2026-03-20T06:00:00.000Z");

  it("allows frequent updates during the initial title update window", () => {
    expect(
      shouldUpdateTitle(
        "2026-03-20T05:40:00.000Z",
        "2026-03-20T05:55:00.000Z",
        now
      )
    ).toBe(true);
  });

  it("blocks updates before the longer interval elapses on older dialogs", () => {
    expect(
      shouldUpdateTitle(
        "2026-03-20T04:00:00.000Z",
        "2026-03-20T05:35:00.000Z",
        now
      )
    ).toBe(false);
  });

  it("allows updates once the longer interval has elapsed on older dialogs", () => {
    expect(
      shouldUpdateTitle(
        "2026-03-20T04:00:00.000Z",
        "2026-03-20T05:30:00.000Z",
        now
      )
    ).toBe(true);
    expect(TITLE_UPDATE_INTERVAL_MINUTES).toBe(30);
  });
});

describe("updateDialogTitleAction LLM execution", () => {
  it("passes BUILTIN_TITLE_LLM_CONFIG.prompt as systemPromptOverride to runLlmAction", async () => {
    let capturedArgs: any = null;
    const runLlmMock = (args: any) => {
      capturedArgs = args;
      return {
        unwrap: async () => "新标题",
      };
    };
    const dialogKey = "dialog-user-01TEST0000000000000001";
    const state = {
      user: { currentUserId: "user-1" },
    };
    const dispatch = (action: any) => action;
    const getState = () => state;

    await updateDialogTitleActionWithDeps(
      { dialogKey },
      { dispatch, getState, extra: {} },
      {
        runLlmAction: runLlmMock as any,
        patchAction: ((changes: any) => ({ unwrap: async () => changes })) as any,
        selectDialogById: (() => ({
          createdAt: "2026-03-20T05:40:00.000Z",
          updatedAt: "2026-03-20T05:40:00.000Z",
        })) as any,
        selectAllMessages: (() => [
          { id: "m1", role: "user", content: "用户提问" },
          { id: "m2", role: "assistant", content: "助手回复" },
        ]) as any,
        selectCurrentUserId: (() => "user-1") as any,
      }
    );

    expect(capturedArgs).not.toBeNull();
    expect(capturedArgs.systemPromptOverride).toBe(
      BUILTIN_TITLE_LLM_CONFIG.prompt
    );
  });
});
