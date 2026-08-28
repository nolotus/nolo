import { describe, expect, it, mock } from "bun:test";
import { readFileSync } from "node:fs";
import React from "react";
import { flushDomUpdates, renderInDom } from "../../../testing/domRender";

let moduleVersion = 0;
let globalDispatchSpy: ((action: any) => void) | null = null;

async function loadToolMessageContent() {
  const actualDialogSlice = await import("chat/dialog/dialogSlice");
  const mockDispatch = (action: any) => {
    if (globalDispatchSpy) {
      globalDispatchSpy(action);
    }
    return {
      unwrap: () =>
        Promise.resolve({
          blob: new Blob(["mock-image"], { type: "image/png" }),
        }),
    };
  };

  mock.module("app/store", () => ({
    useAppDispatch: () => mockDispatch,
    useAppSelector: () => undefined,
  }));
  mock.module("database/dbSlice", () => ({
    readFileContent: () => ({ type: "readFileContent" }),
  }));
  mock.module("render/web/ui/modal/ImagePreviewModal", () => ({
    default: () => null,
  }));
  mock.module("create/editor/Editor", () => ({
    default: () => <div data-testid="editor" />,
  }));
  mock.module("./CreateAgentToolCard", () => ({
    default: () => <div data-testid="create-agent-card" />,
  }));
  mock.module("./UpdateAgentToolCard", () => ({
    default: () => <div data-testid="update-agent-card" />,
  }));
  mock.module("./AppDeployCard", () => ({
    default: () => <div data-testid="app-deploy-card" />,
  }));
  mock.module("./ApplyLineEditsPreviewViewer", () => ({
    default: () => <div data-testid="line-edits-viewer" />,
  }));
  mock.module("./DiffViewer", () => ({
    DiffViewer: () => <div data-testid="diff-viewer" />,
  }));
  mock.module("chat/dialog/dialogSlice", () => ({
    ...actualDialogSlice,
    handleSendMessage: (payload: unknown) => payload,
  }));
  mock.module("identity", () => ({
    useCurrentUser: () => null,
    useIdentity: () => ({
      currentUser: null,
      userId: undefined,
      isLoggedIn: false,
      isInitialized: true,
      token: null,
    }),
    useUserId: () => undefined,
    useIsLoggedIn: () => false,
    useToken: () => null,
    useCouldEdit: () => false,
  }));
  mock.module("app/utils/toast", () => ({
    default: {
      success: () => {},
      error: () => {},
    },
    toast: {
      success: () => {},
      error: () => {},
    },
  }));
  mock.module("create/space/spaceSlice", () => ({
    selectCurrentSpaceId: () => undefined,
  }));
  mock.module("render/page/docSlice", () => ({
    createDoc: (payload: unknown) => payload,
  }));
  mock.module("../ziweiChartDoc", () => ({
    buildZiweiChartDocMarkdown: () => "",
    buildZiweiChartDocTitle: () => "",
  }));

  const mod = await import(`./ToolMessageContent?test=${moduleVersion++}`);
  mock.restore();
  return mod.default;
}

const t = (_key: string, fallback?: string) => fallback ?? "";

describe("Conversation Todo visibility contract", () => {
  it("hides setTodoList when conversation-todo is disabled", () => {
    const source = readFileSync(
      new URL("./ToolMessageContent.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain('props.toolName === "setTodoList"');
    expect(source).toContain('conversationTodoEnabled');
    expect(source).toContain('return null');
    // Todo presentation receives visibility explicitly; do not add a new
    // Redux read to this leaf component while Redux is being retired.
    expect(source).not.toContain("selectSystemBuiltinSkills");
  });
});

describe("ToolMessageContent XHS action contract", () => {
  it("does not generate old login or comment-collection follow-up prompts", () => {
    const source = readFileSync(
      new URL("./ToolMessageContent.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("stop_anonymous_unavailable");
    expect(source).toContain("请说明匿名公开访问不可见的原因");
    expect(source).toContain("请基于当前匿名公开快照分析，说明评论未采集");
    expect(source).not.toContain("请在桌面端浏览器登录小红书");
    expect(source).not.toContain("请分析 1 步评论");
  });
});

describe("ToolMessageContent read_x_post", () => {
  it("renders a readable X post card from persisted tool rawData", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const view = await renderInDom(
      <ToolMessageContent
        toolName="read_x_post"
        isError={false}
        t={t}
        rawData={{
          ok: true,
          backend: "desktop_local_browser",
          fetchedAt: "2026-05-06T05:46:33.810Z",
          data: {
            id: "2051832734533013575",
            url: "https://x.com/karminski3/status/2051832734533013575",
            author: {
              handle: "karminski3",
              displayName: "karminski-牙医",
            },
            text: "Google 刚刚发布了 Gemma 4系列模型的草稿专用模型!",
            media: [],
            sourceBackend: "desktop_local_browser",
            fetchedAt: "2026-05-06T05:46:33.810Z",
          },
        }}
      />
    );

    try {
      expect(view.container.querySelector(".x-post-card")).toBeTruthy();
      expect(view.getByText("karminski-牙医")).toBeTruthy();
      expect(view.getByText(/@karminski3/)).toBeTruthy();
      expect(view.getByText(/Google 刚刚发布了 Gemma 4系列模型/)).toBeTruthy();
      expect(
        view.getByText("https://x.com/karminski3/status/2051832734533013575")
      ).toBeTruthy();
      expect(view.getByRole("button", { name: "Copy" })).toBeTruthy();
      expect(view.getByRole("button", { name: "Open" })).toBeTruthy();
    } finally {
      await view.cleanup();
    }
  });

  it("unwraps server tool results that are nested under rawData", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const view = await renderInDom(
      <ToolMessageContent
        toolName="read_x_post"
        isError={false}
        t={t}
        rawData={{
          rawData: {
            ok: true,
            backend: "desktop_local_browser",
            data: {
              url: "https://x.com/karminski3/status/2051832734533013575",
              author: { handle: "karminski3" },
              text: "nested payload text",
            },
          },
        }}
      />
    );

    try {
      expect(view.container.querySelector(".x-post-card")).toBeTruthy();
      expect(view.getByText("nested payload text")).toBeTruthy();
    } finally {
      await view.cleanup();
    }
  });

  it("renders the shared image gallery for OpenAI GPT Image generate/edit tool outputs", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const previousCreateObjectURL = globalThis.URL.createObjectURL;
    const previousRevokeObjectURL = globalThis.URL.revokeObjectURL;
    const createObjectURLMock = mock(() => "blob:mock-image");
    globalThis.URL.createObjectURL = createObjectURLMock as typeof URL.createObjectURL;
    globalThis.URL.revokeObjectURL = () => {};
    try {
      const sharedRawData = {
        text: "已生成 1 张图片。",
        imageCount: 1,
        files: [
          {
            fileId: "01KR8RJY7J8K6TWX3W4YZV6VD5",
            metadata: { originalName: "gpt-image-2-1.png" },
          },
        ],
      };

      for (const toolName of [
        "openAIGptImageGenerate",
        "chatgptWebImageGenerate",
        "openAIGptImageEdit",
      ] as const) {
        createObjectURLMock.mockClear();
        const view = await renderInDom(
          <ToolMessageContent
            toolName={toolName}
            isError={false}
            t={t}
            rawData={sharedRawData}
          />
        );

        try {
          await flushDomUpdates(2);

          expect(view.container.querySelector(".g-img-card")).toBeTruthy();
          expect(view.getByText("Image Generation")).toBeTruthy();
          expect(view.getByText("1 images generated")).toBeTruthy();
          expect(view.container.textContent).not.toContain("{{count}}");
          expect(createObjectURLMock).toHaveBeenCalledTimes(1);
          const firstCallArg = (createObjectURLMock.mock.calls as unknown as unknown[][])[0]?.[0];
          expect(firstCallArg instanceof Blob).toBe(true);

          const img = view.container.querySelector("img");
          expect(img).toBeTruthy();
          expect(img?.getAttribute("src")).toBe("blob:mock-image");
        } finally {
          await view.cleanup();
        }
      }
    } finally {
      globalThis.URL.createObjectURL = previousCreateObjectURL;
      globalThis.URL.revokeObjectURL = previousRevokeObjectURL;
    }
  });

  it("renders the shared image gallery when persisted OpenAI image tool rawData is a JSON string", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const previousCreateObjectURL = globalThis.URL.createObjectURL;
    const previousRevokeObjectURL = globalThis.URL.revokeObjectURL;
    const createObjectURLMock = mock(() => "blob:mock-image");
    globalThis.URL.createObjectURL = createObjectURLMock as typeof URL.createObjectURL;
    globalThis.URL.revokeObjectURL = () => {};

    try {
      const persistedRawData = JSON.stringify({
        text: "已生成 1 张图片。",
        imageCount: 1,
        files: [
          {
            fileId: "01KR8W5BS19VN0BMZYY6ZECMEK",
            metadata: { originalName: "gpt-image-2-1.png" },
          },
        ],
      });

      const view = await renderInDom(
        <ToolMessageContent
          toolName="openAIGptImageGenerate"
          isError={false}
          t={t}
          rawData={persistedRawData}
        />
      );

      try {
        await flushDomUpdates(2);

        expect(view.container.querySelector(".g-img-card")).toBeTruthy();
        expect(createObjectURLMock).toHaveBeenCalledTimes(1);
        const img = view.container.querySelector("img");
        expect(img).toBeTruthy();
        expect(img?.getAttribute("src")).toBe("blob:mock-image");
      } finally {
        await view.cleanup();
      }
    } finally {
      globalThis.URL.createObjectURL = previousCreateObjectURL;
      globalThis.URL.revokeObjectURL = previousRevokeObjectURL;
    }
  });
});

describe("ToolMessageContent read_xhs_profile", () => {
  it("renders a success card with profile, analysis, and comment buckets", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const view = await renderInDom(
      <ToolMessageContent
        toolName="read_xhs_profile"
        isError={false}
        t={t}
        rawData={{
          ok: true,
          data: {
            profile: {
              userId: "5abc123",
              nickname: "测试博主",
              redId: "1234567890",
              desc: "一个测试账号简介",
              interactionCounts: {
                follows: 100,
                fans: 5000,
                likesAndCollects: 80000,
              },
            },
            notes: [
              { noteId: "n1", title: "穿搭日记" },
              { noteId: "n2", title: "美食探店" },
              { noteId: "n3", title: "旅行碎片" },
            ],
            noteDetails: [
              { noteId: "n1", title: "穿搭日记", desc: "", type: "normal", userId: "5abc123", nickname: "测试博主", metrics: { likedCount: 100, collectedCount: 50, commentCount: 20, shareCount: 5 } },
            ],
            commentsByNote: {},
            analysis: {
              totalNotes: 3,
              highestLikedNote: { noteId: "n1", title: "穿搭日记", count: 12000 },
              highestCommentedNote: { noteId: "n2", title: "美食探店", count: 300 },
              highestCollectedNote: { noteId: "n1", title: "穿搭日记", count: 500 },
              highestSharedNote: { noteId: "n3", title: "旅行碎片", count: 80 },
              commentBuckets: [
                { label: "穿搭", count: 42, sampleCommentIds: ["c1"] },
                { label: "美食", count: 18, sampleCommentIds: ["c2"] },
              ],
              topLikedComments: [
                { commentId: "c1", userId: "u1", nickname: "路人甲", content: "太好看了！", likeCount: 999, subCommentCount: 5 },
                { commentId: "c2", userId: "u2", nickname: "路人乙", content: "求链接", likeCount: 500, subCommentCount: 2 },
              ],
            },
            diagnostic: {
              code: "unknown",
              message: "partial data",
              loginDetected: false,
              pageTitle: "测试博主 - 小红书",
            },
          },
        }}
      />
    );

    try {
      expect(view.container.querySelector(".x-post-card")).toBeTruthy();
      expect(view.getByText("测试博主")).toBeTruthy();
      expect(view.getByText(/1234567890/)).toBeTruthy();
      expect(view.getByText("一个测试账号简介")).toBeTruthy();
      expect(view.getByText(/笔记 3/)).toBeTruthy();
      expect(view.getByText(/粉丝 5,000/)).toBeTruthy();
      expect(view.getByText(/赞藏 80,000/)).toBeTruthy();
      expect(view.getByText(/穿搭日记 \(12,000\)/)).toBeTruthy();
      expect(view.getByText(/美食探店 \(300\)/)).toBeTruthy();
      expect(view.getByText(/穿搭/)).toBeTruthy();
      expect(view.getByText(/美食/)).toBeTruthy();
      expect(view.getByText(/太好看了！/)).toBeTruthy();
      expect(view.getByText(/999/)).toBeTruthy();
      expect(view.getByText(/partial data/)).toBeTruthy();
      expect(view.getByText(/测试博主 - 小红书/)).toBeTruthy();
    } finally {
      await view.cleanup();
    }
  });

  it("renders a login_required failure with a human-readable hint", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const view = await renderInDom(
      <ToolMessageContent
        toolName="read_xhs_profile"
        isError={false}
        t={t}
        rawData={{
          rawData: {
            ok: false,
            code: "login_required",
            message: "小红书未登录，请先在桌面端登录",
            fetchedAt: "2025-07-09T10:00:00Z",
          },
          displayData: "小红书未登录，请先在桌面端登录",
        }}
      />
    );

    try {
      expect(view.container.querySelector(".x-post-card.is-error")).toBeTruthy();
      expect(view.getByText(/小红书账号读取失败/)).toBeTruthy();
      expect(view.getByText("login_required")).toBeTruthy();
      expect(view.getByText(/小红书未登录/)).toBeTruthy();
      expect(
        view.getByText(/匿名公开访问不可见或暂不可用/)
      ).toBeTruthy();
    } finally {
      await view.cleanup();
    }
  });

  it("renders collection status, diagnostic alert, next suggested action and handles suggested action click", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    let dispatchedAction: any = null;
    globalDispatchSpy = (action: any) => {
      dispatchedAction = action;
    };

    const view = await renderInDom(
      <ToolMessageContent
        toolName="read_xhs_profile"
        isError={false}
        t={t}
        rawData={{
          ok: true,
          data: {
            profile: {
              nickname: "辅助测试博主",
            },
            notes: [],
            analysis: {},
            collectionStatus: {
              mode: "assisted",
              action: "snapshot",
              extendedCollectionConsent: true,
              assistedStepCount: 1,
              limits: {
                maxAssistedSteps: 3,
                maxScrollPages: 2,
                maxCommentPagesPerNote: 1,
                includeComments: true,
              },
              nextSuggestedAction: {
                action: "read_more_notes",
                label: "读取更多 1 步",
                reason: "还有未采集的笔记",
              },
            },
            diagnostic: {
              code: "captcha_detected",
              message: "slide captcha shown",
              captchaDetected: true,
              pageTitle: "小红书验证码",
            },
          },
        }}
      />
    );

    try {
      // 1. Verify collectionStatus display
      expect(view.getByText("采集状态")).toBeTruthy();
      expect(view.getByText(/模式：辅助自动化/)).toBeTruthy();
      expect(view.getByText(/当前操作：单页快照/)).toBeTruthy();
      expect(view.getByText(/已执行步数：1/)).toBeTruthy();
      expect(view.getByText(/最大步数限制：3/)).toBeTruthy();
      expect(view.getByText(/滚动上限：2 页/)).toBeTruthy();

      // 2. Verify diagnostic display
      expect(view.getByText(/诊断提示：captcha_detected - slide captcha shown/)).toBeTruthy();
      expect(view.getByText(/检测到滑动验证码/)).toBeTruthy();

      // 3. Verify nextSuggestedAction display
      expect(view.getByText(/建议下一步：/)).toBeTruthy();
      expect(view.getByText(/还有未采集的笔记/)).toBeTruthy();
      
      const btn = view.getByRole("button", { name: "读取更多 1 步" });
      expect(btn).toBeTruthy();

      // 4. Click button and verify dispatch
      btn.click();
      await flushDomUpdates();
      expect(dispatchedAction).toEqual({ userInput: "请多读取 1 步更多笔记" });
    } finally {
      globalDispatchSpy = null;
      await view.cleanup();
    }
  });
});

describe("ToolMessageContent shell detail", () => {
  it("renders camelCase execShell results as a structured terminal view instead of JSON", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const view = await renderInDom(
      <ToolMessageContent
        toolName="execShell"
        isError={false}
        t={(key: string, fallback?: any) =>
          key === "bash.exitCode" ? `退出码 ${fallback?.code}` : fallback ?? ""
        }
        rawData={{
          ok: true,
          command: "bun test packages/chat/messages/web/ToolMessageGroup.test.tsx",
          cwd: "/Users/nolotus/bun-nolo-tool-activity-v2",
          exitCode: 0,
          stdout: "1 pass\n0 fail\n",
          stderr: "",
        }}
      />
    );

    try {
      expect(view.container.querySelector(".bash-terminal-window")).toBeTruthy();
      expect(view.container.querySelector(".code-dump")).toBeNull();
      expect(view.container.textContent).toContain(
        "bun test packages/chat/messages/web/ToolMessageGroup.test.tsx"
      );
      expect(view.getByText(/1 pass/)).toBeTruthy();
      expect(view.getByText("退出码 0")).toBeTruthy();
    } finally {
      await view.cleanup();
    }
  });

  it("hides shell command chrome in groupDetail and keeps only result content", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const command =
      "git rev-parse HEAD origin/HEAD 2>/dev/null; echo \"---\"; git log --oneline -5";
    const view = await renderInDom(
      <ToolMessageContent
        toolName="execShell"
        isError={false}
        presentation="groupDetail"
        t={(key: string, fallback?: any) =>
          key === "bash.exitCode" ? `退出码 ${fallback?.code}` : fallback ?? ""
        }
        rawData={{
          ok: false,
          command,
          cwd: "/tmp",
          exitCode: 126,
          stdout: "workspace_shell_escape_blocked\nblockedToken: /dev/null\n",
          stderr: "",
        }}
      />
    );

    try {
      expect(view.container.querySelector(".bash-prompt-line")).toBeNull();
      expect(view.container.querySelector(".shell-cmd")).toBeNull();
      expect(view.container.textContent).not.toContain("git rev-parse HEAD");
      expect(view.container.textContent).toContain("workspace_shell_escape_blocked");
      expect(view.container.textContent).toContain("退出码 126");
    } finally {
      await view.cleanup();
    }
  });

  it("shows the blocked command in groupDetail so users see what was intercepted", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const view = await renderInDom(
      <ToolMessageContent
        toolName="execShell"
        isError={false}
        presentation="groupDetail"
        t={(key: string, fallback?: any) => fallback ?? ""}
        rawData={{
          blocked: true,
          requireUnsafe: true,
          command: "BLOCKED_CMD_PLACEHOLDER",
          cwd: "/tmp",
          stdout: "",
          stderr: "",
          exitCode: undefined,
        }}
      />
    );
    try {
      expect(view.container.textContent).toContain("危险命令已被拦截");
      expect(view.container.textContent).toContain("BLOCKED_CMD_PLACEHOLDER");
      expect(view.container.querySelector(".shell-cmd")).toBeNull();
    } finally {
      await view.cleanup();
    }
  });

  it("truncates long shell stdout by default and expands on demand", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const longStdout =
      "START_MARKER\n" +
      Array.from({ length: 400 }, (_, i) => `log-line-${i}-${"x".repeat(40)}`).join(
        "\n"
      ) +
      "\nEND_MARKER";
    const view = await renderInDom(
      <ToolMessageContent
        toolName="execShell"
        isError={false}
        t={(key: string, fallback?: any) =>
          key === "bash.exitCode" ? `退出码 ${fallback?.code}` : fallback ?? ""
        }
        rawData={{
          ok: true,
          command: "bun test",
          cwd: "/tmp",
          exitCode: 0,
          stdout: longStdout,
          stderr: "",
        }}
      />
    );

    try {
      const mountedChars = view.container.textContent?.length ?? 0;
      expect(mountedChars).toBeLessThan(longStdout.length);
      expect(view.container.textContent).toContain("START_MARKER");
      expect(view.container.textContent).not.toContain("END_MARKER");
      const expandBtn = view.getByRole("button", { name: /展开全部/ });
      expect(expandBtn).toBeTruthy();
      expandBtn.click();
      await flushDomUpdates();
      expect(view.container.textContent).toContain("END_MARKER");
      expect((view.container.textContent?.length ?? 0)).toBeGreaterThan(
        longStdout.length * 0.9
      );
    } finally {
      await view.cleanup();
    }
  });
});

describe("ToolMessageContent long fallback dump", () => {
  it("defaults to a truncated JSON dump and mounts full text only after expand", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const payload = {
      ok: true,
      blob: "Z".repeat(12_000),
      trail: "TAIL_UNIQUE_TOKEN",
    };
    const fullJson = JSON.stringify(payload, null, 2);
    const view = await renderInDom(
      <ToolMessageContent
        toolName={"unknownHugeTool" as any}
        isError={false}
        t={t}
        rawData={payload}
      />
    );

    try {
      const dump = view.container.querySelector(".code-dump");
      expect(dump).toBeTruthy();
      const before = dump?.textContent?.length ?? 0;
      expect(before).toBeLessThan(fullJson.length);
      expect(view.container.textContent).not.toContain("TAIL_UNIQUE_TOKEN");
      const expandBtn = view.getByRole("button", { name: /展开全部/ });
      expandBtn.click();
      await flushDomUpdates();
      expect(view.container.textContent).toContain("TAIL_UNIQUE_TOKEN");
      const after = view.container.querySelector(".code-dump")?.textContent?.length ?? 0;
      expect(after).toBeGreaterThanOrEqual(fullJson.length);
    } finally {
      await view.cleanup();
    }
  });
});

describe("ToolMessageContent readFile meta-only", () => {
  it("renders path + line stats and never mounts file body", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const body = "export const streamAgentChatTurn = () => {};\n// secret marker BODY_NOT_IN_UI\n";
    const view = await renderInDom(
      <ToolMessageContent
        toolName="readFile"
        isError={false}
        t={t}
        rawData={{
          filePath: "packages/ai/agent/streamAgentChatTurn.ts",
          content: body,
          startLine: 1,
          endLine: 2,
          totalLines: 2600,
        }}
      />,
    );

    try {
      expect(view.container.textContent).toContain(
        "packages/ai/agent/streamAgentChatTurn.ts",
      );
      expect(view.container.textContent).toContain("streamAgentChatTurn.ts:1-2");
      expect(view.container.textContent).not.toContain("BODY_NOT_IN_UI");
      expect(view.container.textContent).not.toContain("Unknown");
      expect(view.container.querySelector('[data-testid="editor"]')).toBeNull();
      expect(view.container.querySelector(".code-dump")).toBeNull();
    } finally {
      await view.cleanup();
    }
  });

  it("derives line count from plain-string desktop content without dumping body", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const view = await renderInDom(
      <ToolMessageContent
        toolName="readFile"
        isError={false}
        t={t}
        rawData={"const x = 1;\nconst y = 2;\n"}
      />,
    );

    try {
      // Trailing newline → 3 line terminators counted; body must stay out of DOM.
      expect(view.container.textContent).toMatch(/3 lines/);
      expect(view.container.textContent).not.toContain("const x = 1");
      expect(view.container.querySelector(".code-dump")).toBeNull();
    } finally {
      await view.cleanup();
    }
  });

  it("renders nothing for empty Unknown-style payloads", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const view = await renderInDom(
      <ToolMessageContent
        toolName="readFile"
        isError={false}
        t={t}
        rawData={{}}
      />,
    );

    try {
      expect(view.container.querySelector(".code-preview-widget")).toBeNull();
      expect(view.container.textContent).not.toContain("Unknown");
    } finally {
      await view.cleanup();
    }
  });
});

describe("ToolMessageContent fetchWebpage", () => {
  it("renders a Fetch tree from toolArgs.url when rawData is pure markdown (no URL header) and never dumps body", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const url = "https://example.com/x";
    const raw =
      "# Page Title\n\nSome long markdown body that should never be rendered into the DOM. BODY_UNIQUE_TOKEN_FETCH";
    const view = await renderInDom(
      <ToolMessageContent
        toolName="fetchWebpage"
        isError={false}
        t={t}
        rawData={raw}
        toolArgs={{ url }}
      />,
    );

    try {
      const tree = view.container.querySelector(".read-tool-tree-widget");
      expect(tree).toBeTruthy();
      expect(tree?.textContent).toContain("Fetch");
      expect(tree?.textContent).toContain(url);
      // Body must not be dumped.
      expect(view.container.textContent).not.toContain(
        "BODY_UNIQUE_TOKEN_FETCH",
      );
    } finally {
      await view.cleanup();
    }
  });

  it("renders a Fetch tree from [Resolved URL] header when toolArgs is absent", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const url = "https://a.com/x";
    const raw = `[Resolved URL] ${url}\n\n# md`;
    const view = await renderInDom(
      <ToolMessageContent
        toolName="fetchWebpage"
        isError={false}
        t={t}
        rawData={raw}
      />,
    );

    try {
      const tree = view.container.querySelector(".read-tool-tree-widget");
      expect(tree).toBeTruthy();
      expect(tree?.textContent).toContain(url);
    } finally {
      await view.cleanup();
    }
  });

  it("renders nothing when rawData is pure markdown and no toolArgs", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const raw = "# md\n\nSome body. BODY_UNIQUE_TOKEN_NO_URL";
    const view = await renderInDom(
      <ToolMessageContent
        toolName="fetchWebpage"
        isError={false}
        t={t}
        rawData={raw}
      />,
    );

    try {
      expect(view.container.querySelector(".read-tool-tree-widget")).toBeNull();
    } finally {
      await view.cleanup();
    }
  });

  it("renders a Fetch tree from inline (URL: ...) for legacy displayData shape", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const url = "https://example.com/legacy";
    const raw = `✅ 已成功获取网页内容 (URL: ${url})\n\n# Page Title\n\nSome long markdown body. BODY_UNIQUE_TOKEN_LEGACY`;
    const view = await renderInDom(
      <ToolMessageContent
        toolName="fetchWebpage"
        isError={false}
        t={t}
        rawData={raw}
      />,
    );

    try {
      const tree = view.container.querySelector(".read-tool-tree-widget");
      expect(tree).toBeTruthy();
      expect(tree?.textContent).toContain(url);
      expect(view.container.textContent).not.toContain(
        "BODY_UNIQUE_TOKEN_LEGACY",
      );
    } finally {
      await view.cleanup();
    }
  });
});

describe("ToolMessageContent loadSkill", () => {
  it("renders loaded-inline summary plus collapsible skill body", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const content =
      'Skill "search-first" loaded inline. Follow its instructions.\n\n' +
      "Search the repo before writing new code. Reuse existing helpers.";
    const view = await renderInDom(
      <ToolMessageContent
        toolName="loadSkill"
        isError={false}
        t={t}
        rawData={content}
        toolArgs={{ name: "search-first" }}
      />,
    );

    try {
      expect(
        view.getByText(/Skill "search-first" loaded inline/),
      ).toBeTruthy();
      expect(view.container.querySelector(".load-skill-line")).toBeTruthy();
      expect(view.container.querySelector(".code-dump")).toBeTruthy();
      expect(view.getByText(/Reuse existing helpers/)).toBeTruthy();
      // 契约前缀不进入正文展示
      expect(view.container.textContent).not.toContain(
        "Follow its instructions",
      );
    } finally {
      await view.cleanup();
    }
  });

  it("falls back to name parsed from content when toolArgs are absent", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const content =
      'Skill "click-path-audit" loaded inline. Follow its instructions.\n\n' +
      "Trace button state transitions end to end.";
    const view = await renderInDom(
      <ToolMessageContent
        toolName="loadSkill"
        isError={false}
        t={t}
        rawData={content}
      />,
    );

    try {
      expect(
        view.getByText(/Skill "click-path-audit" loaded inline/),
      ).toBeTruthy();
      expect(view.getByText(/Trace button state transitions/)).toBeTruthy();
    } finally {
      await view.cleanup();
    }
  });

  it("renders a not-found failure (not a green-check success) when the executor returned the not-found contract", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    // Matches the exact executor contract from
    // packages/agent-runtime/noloWorkspaceTools.ts formatUnknownSkillMessage:
    // `Skill "<name>" not found in this workspace's skill directories ...`.
    const content =
      'Skill "ghost" not found in this workspace\'s skill directories ' +
      "(.agents/skills/<name>/SKILL.md, docs/skills/<name>.md).\n\n" +
      "Available skills: deployment, legacy";
    const view = await renderInDom(
      <ToolMessageContent
        toolName="loadSkill"
        isError={false}
        t={t}
        rawData={content}
        toolArgs={{ name: "ghost" }}
      />,
    );

    try {
      // Failure surface, not success.
      expect(view.getByText(/Skill "ghost" not found/)).toBeTruthy();
      expect(
        view.container.querySelector(".icon-error"),
      ).toBeTruthy();
      expect(view.container.querySelector(".icon-success")).toBeFalsy();
      // The available-skills list is surfaced to help recovery.
      expect(view.getByText(/Available skills: deployment, legacy/)).toBeTruthy();
      // The "loaded inline" success wording must never appear.
      expect(view.container.textContent).not.toContain("loaded inline");
    } finally {
      await view.cleanup();
    }
  });

  it("renders a not-found failure with the no-skills-discovered branch", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    const content =
      'Skill "ghost" not found in this workspace\'s skill directories ' +
      "(.agents/skills/<name>/SKILL.md, docs/skills/<name>.md).\n\n" +
      "No skills were discovered in this workspace.";
    const view = await renderInDom(
      <ToolMessageContent
        toolName="loadSkill"
        isError={false}
        t={t}
        rawData={content}
      />,
    );

    try {
      expect(view.getByText(/Skill "ghost" not found/)).toBeTruthy();
      expect(view.container.querySelector(".icon-error")).toBeTruthy();
      expect(view.getByText(/No skills were discovered/)).toBeTruthy();
      expect(view.container.textContent).not.toContain("loaded inline");
    } finally {
      await view.cleanup();
    }
  });

  it("renders a not-found failure for the platform/server-side message variant", async () => {
    const ToolMessageContent = await loadToolMessageContent();
    // Platform (packages/ai/tools/loadSkillTool.ts) and server
    // (packages/server/handlers/agentRun/noloWorkspaceServerTools.ts) use the
    // shorter prefix `Skill "<name>" not found. Available skills: ...`.
    const content =
      'Skill "ghost" not found. Available skills: deployment, legacy';
    const view = await renderInDom(
      <ToolMessageContent
        toolName="loadSkill"
        isError={false}
        t={t}
        rawData={content}
        toolArgs={{ name: "ghost" }}
      />,
    );
    try {
      // Failure surface, not success.
      expect(view.getByText(/Skill "ghost" not found/)).toBeTruthy();
      expect(view.container.querySelector(".icon-error")).toBeTruthy();
      expect(view.container.querySelector(".icon-success")).toBeFalsy();
      expect(view.container.textContent).not.toContain("loaded inline");
    } finally {
      await view.cleanup();
    }
  });
});

