import { describe, expect, it } from "bun:test";
import React from "react";
import { act } from "react";
import { flushDomUpdates, renderInDom } from "../../../testing/domRender";
import { useGuidedAgentCreation } from "./useGuidedAgentCreation";

const VISIBILITY_QUESTION = "这个 AI 是只给自己用，还是公开给别人使用？";
const READY_MESSAGE = "配置草稿已经可创建。你还想补充哪些资料或使用边界？";

type GuidedHookResult = ReturnType<typeof useGuidedAgentCreation>;

let latestGuided: GuidedHookResult | null = null;

const HookProbe: React.FC = () => {
  const guided = useGuidedAgentCreation();

  React.useEffect(() => {
    latestGuided = guided;
  }, [guided]);

  return (
    <>
      <pre data-testid="messages">
        {JSON.stringify(guided.messages.map((message) => message.content))}
      </pre>
      <pre data-testid="draft">{JSON.stringify(guided.draft)}</pre>
    </>
  );
};

const getLastMessage = (container: HTMLElement) => {
  const text = container.querySelector('[data-testid="messages"]')?.textContent ?? "[]";
  const messages = JSON.parse(text) as string[];
  return messages.at(-1) ?? "";
};

const getDraft = (container: HTMLElement) => {
  const text = container.querySelector('[data-testid="draft"]')?.textContent ?? "{}";
  return JSON.parse(text) as GuidedHookResult["draft"];
};

describe("useGuidedAgentCreation", () => {
  it("auto-assembles a shell-backed image compression agent from a plain user goal", async () => {
    latestGuided = null;
    const view = await renderInDom(<HookProbe />);

    try {
      await flushDomUpdates(1);

      await act(async () => {
        latestGuided?.setInput("我想创建一个压缩图片的 Agent，上传图片后自动压小一点，尽量保持清晰。自己用");
      });
      await flushDomUpdates(5);
      expect(latestGuided!.input).toContain("压缩图片");

      await act(async () => {
        await latestGuided?.submit();
      });
      await flushDomUpdates(20);

      const draft = getDraft(view.container);
      expect(draft.name).toContain("图片");
      expect(draft.capabilityIds).toContain("imageProcessing");
      expect(draft.toolIds).toContain("execShell");
      expect(draft.prompt).toContain("上传图片");
      expect(draft.prompt).toContain("execShell");
      expect(draft.prompt).toContain("scripts/agent-tools/compressImage.ts");
      expect(draft.assemblyNotes).toContain(
        "这个 Agent 会用可执行脚本处理图片压缩。"
      );
      expect(draft.suggestedEvalCases).toEqual(
        expect.arrayContaining([
          "上传一张大图，应返回更小且可打开的图片。",
          "没有图片时，应要求用户上传图片，而不是编造文件链接。",
        ])
      );
    } finally {
      await view.cleanup();
      latestGuided = null;
    }
  });

  it("treats self-use answers as resolving the visibility question", async () => {
    latestGuided = null;
    const view = await renderInDom(<HookProbe />);

    try {
      await flushDomUpdates(1);

      await act(async () => {
        latestGuided?.setInput("帮我做一个英文文档阅读助手，要能读文档和 PDF，翻译生词、生句并分析语法。");
      });
      await flushDomUpdates(1);

      await act(async () => {
        await latestGuided?.submit();
      });
      await flushDomUpdates(2);

      expect(getLastMessage(view.container)).toBe(VISIBILITY_QUESTION);

      await act(async () => {
        latestGuided?.setInput("自己用");
      });
      await flushDomUpdates(1);

      await act(async () => {
        await latestGuided?.submit();
      });
      await flushDomUpdates(2);

      expect(getLastMessage(view.container)).toBe(READY_MESSAGE);
    } finally {
      await view.cleanup();
      latestGuided = null;
    }
  });
});
