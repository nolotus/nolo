import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const toolIndexSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const toolSource = readFileSync(
  new URL("./chatgptWebImageTool.ts", import.meta.url),
  "utf8"
);
const toolMessageContentSource = readFileSync(
  new URL("../../chat/messages/web/ToolMessageContent.tsx", import.meta.url),
  "utf8"
);

describe("chatgptWebImageTool registry source contract", () => {
  it("registers chatgptWebImageGenerate in the tools index", () => {
    expect(toolIndexSource).toContain("chatgptWebImageGenerateFunctionSchema");
    expect(toolIndexSource).toContain("chatgptWebImageGenerateFunc");
    expect(toolIndexSource).toContain('id: "chatgptWebImageGenerate"');
    expect(toolIndexSource).toContain("executor: chatgptWebImageGenerateFunc");
    expect(toolIndexSource).toContain('category: "多媒体生成"');
    expect(toolIndexSource).toContain('uiGroup: "media"');
  });

  it("posts to /api/chatgpt-web-image and forbids OpenAI API fallback in description", () => {
    expect(toolSource).toContain('name: "chatgptWebImageGenerate"');
    expect(toolSource).toContain("/api/chatgpt-web-image");
    expect(toolSource).toContain("失败勿 fallback OpenAI API");
    expect(toolSource).toContain('withAuth: true');
  });

  it("maps chatgptWebImageGenerate to GeminiGallery in ToolMessageContent", () => {
    expect(toolMessageContentSource).toContain(
      "chatgptWebImageGenerate: (props) => <GeminiGallery {...props} />"
    );
  });
});
