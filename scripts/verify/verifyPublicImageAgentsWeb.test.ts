import { describe, expect, it } from "bun:test";
import { fileKey } from "../../packages/database/keys";
import {
  clickStartChatUntilDialog,
  type DialogMessage,
  collectDialogArtifactKeys,
  verifyExistingContinuousImageEditDialog,
  verifyScenarioCarryForward,
} from "./verifyPublicImageAgentsWeb.helpers";

const USER_ID = "user-test";
const latestArtifact = fileKey.single(USER_ID, "filelatestABCDEFGHIJ");
const olderArtifact = fileKey.single(USER_ID, "fileolderABCDEFGHIJ");

function createMessages(content: unknown): DialogMessage[] {
  return [
    { role: "assistant", content: { result: olderArtifact } },
    { role: "user", content },
  ];
}

it("collects generated image artifact keys from tool messages as well as assistant messages", () => {
  const userId = "user-test";
  const expectedKey = fileKey.single(userId, "01KR8RJY7J8K6TWX3W4YZV6VD5");

  const result = collectDialogArtifactKeys(
    [
      {
        role: "tool",
        content: JSON.stringify({
          text: "已生成 1 张图片。",
          files: [{ fileId: "01KR8RJY7J8K6TWX3W4YZV6VD5" }],
        }),
      },
    ],
    userId
  );

  expect(result).toEqual([expectedKey]);
});

describe("verifyPublicImageAgentsWeb carry-forward helpers", () => {
  it("verifies an existing persisted dialog has a successful continuous edit closure", () => {
    const closureUserId = "usertest";
    const closureLatestArtifact = fileKey.single(closureUserId, "FILELATESTABCDEFGHIJ");
    const closureEditedArtifact = fileKey.single(closureUserId, "FILEEDITEDABCDEFGHIJ");
    const result = verifyExistingContinuousImageEditDialog({
      userId: closureUserId,
      messages: [
        {
          role: "tool",
          toolName: "openAIGptImageGenerate",
          content: JSON.stringify({
            files: [{ fileId: "FILELATESTABCDEFGHIJ" }],
          }),
        },
        {
          role: "tool",
          toolName: "openAIGptImageEdit",
          toolPayload: {
            status: "done",
            input: {
              images: [
                {
                  data: `https://nolo.chat/api/v1/db/file/content/${closureLatestArtifact}`,
                },
              ],
            },
          },
          content: JSON.stringify({
            files: [{ fileId: "FILEEDITEDABCDEFGHIJ" }],
          }),
        },
      ],
    });

    expect(result.reusedPriorArtifactKeys).toEqual([closureLatestArtifact]);
    expect(result.outputArtifactKeys).toEqual([closureEditedArtifact]);
  });

  it("rejects an existing dialog when the edit tool only failed upstream", () => {
    expect(() =>
      verifyExistingContinuousImageEditDialog({
        userId: USER_ID,
        messages: [
          {
            role: "tool",
            toolName: "openAIGptImageGenerate",
            content: JSON.stringify({
              files: [{ fileId: "filelatestABCDEFGHIJ" }],
            }),
          },
          {
            role: "tool",
            toolName: "openAIGptImageEdit",
            toolPayload: {
              status: "failed",
              input: {
                images: [{ data: latestArtifact }],
              },
            },
            content: "[Error: 502 Bad Gateway]",
          },
        ],
      })
    ).toThrow(/successful continuous image edit/);
  });

  it("accepts a revise turn that references the immediately prior artifact", () => {
    const result = verifyScenarioCarryForward({
      messages: createMessages({
        text: "continuous-revise-2 再基于最新一版继续改",
        attachments: [{ fileId: "filelatestABCDEFGHIJ" }],
      }),
      scenario: "continuous-revise-2",
      expectedArtifactKeys: [latestArtifact],
      forbiddenArtifactKeys: [olderArtifact],
      userId: USER_ID,
    });

    expect(result.reusedLatestArtifactKeys).toEqual([latestArtifact]);
  });

  it("accepts a revise turn when the follow-up tool input reuses the latest artifact", () => {
    const toolUserId = "usertest";
    const toolLatestArtifact = fileKey.single(toolUserId, "filelatestABCDEFGHIJ");
    const toolOlderArtifact = fileKey.single(toolUserId, "fileolderABCDEFGHIJ");
    const result = verifyScenarioCarryForward({
      messages: [
        { role: "assistant", content: { result: toolOlderArtifact } },
        {
          role: "user",
          content: "continuous-revise-1 基于上一版继续改",
        },
        {
          role: "assistant",
          content: {
            toolPayload: {
              input: {
                images: [{ data: toolLatestArtifact }],
              },
            },
          },
        },
      ],
      scenario: "continuous-revise-1",
      expectedArtifactKeys: [toolLatestArtifact],
      forbiddenArtifactKeys: [toolOlderArtifact],
      userId: toolUserId,
    });

    expect(result.reusedLatestArtifactKeys).toEqual([toolLatestArtifact]);
  });

  it("rejects a revise turn that reuses an older artifact instead of the latest one", () => {
    expect(() =>
      verifyScenarioCarryForward({
        messages: createMessages({
          text: "continuous-revise-2 再基于最新一版继续改",
          attachments: [{ fileId: "fileolderABCDEFGHIJ" }],
        }),
        scenario: "continuous-revise-2",
        expectedArtifactKeys: [latestArtifact],
        forbiddenArtifactKeys: [olderArtifact],
        userId: USER_ID,
      })
    ).toThrow(/reuse one of latest artifacts/);
  });

  it("rejects a revise turn that mixes latest and stale artifacts together", () => {
    expect(() =>
      verifyScenarioCarryForward({
        messages: createMessages({
          text: "continuous-revise-2 再基于最新一版继续改",
          attachments: [
            { fileId: "filelatestABCDEFGHIJ" },
            { fileId: "fileolderABCDEFGHIJ" },
          ],
        }),
        scenario: "continuous-revise-2",
        expectedArtifactKeys: [latestArtifact],
        forbiddenArtifactKeys: [olderArtifact],
        userId: USER_ID,
      })
    ).toThrow(/stale artifacts/);
  });

  it("uses the latest matching revise message when the scenario token appears more than once", () => {
    const result = verifyScenarioCarryForward({
      messages: [
        {
          role: "user",
          content: {
            text: "continuous-revise-2 再基于最新一版继续改",
            attachments: [{ fileId: "fileolderABCDEFGHIJ" }],
          },
        },
        {
          role: "user",
          content: {
            text: "continuous-revise-2 再基于最新一版继续改",
            attachments: [{ fileId: "filelatestABCDEFGHIJ" }],
          },
        },
      ],
      scenario: "continuous-revise-2",
      expectedArtifactKeys: [latestArtifact],
      forbiddenArtifactKeys: [olderArtifact],
      userId: USER_ID,
    });

    expect(result.reusedLatestArtifactKeys).toEqual([latestArtifact]);
  });

  it("retries start-chat when the first click only wakes up the hydrated app shell", async () => {
    let attempt = 0;
    const currentPage = {
      url: () =>
        attempt >= 2
          ? "https://us.nolo.chat/dialog-user-1-01TESTDIALOG000000000001"
          : "https://us.nolo.chat/agent-pub-01GPTIMG2GEN00000000SSEBOS",
      waitForLoadState: async () => {},
      waitForURL: async () => {
        if (attempt < 2) {
          throw new Error("still hydrating");
        }
      },
    };

    const activePage = await clickStartChatUntilDialog({
      currentPage,
      createPopupWaiter: async () => null,
      clickStartChat: async () => {
        attempt += 1;
      },
      retryDelayMs: 0,
    });

    expect(attempt).toBe(2);
    expect(activePage).toBe(currentPage);
  });
});
