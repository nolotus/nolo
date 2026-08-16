import { describe, expect, it } from "bun:test";
import {
  getGuidedCapabilityLabel,
  getGuidedCapabilityLabels,
} from "./capabilityPresentation";

describe("capabilityPresentation", () => {
  it("presents guided capabilities and low-level tool ids as user-facing labels", () => {
    expect(getGuidedCapabilityLabel("docs")).toBe("读写文档");
    expect(getGuidedCapabilityLabel("workspace-read")).toBe("读取工作区");
    expect(getGuidedCapabilityLabel("dialog-continuation")).toBe("延续当前对话");
  });

  it("deduplicates capability labels", () => {
    expect(getGuidedCapabilityLabels(["docs", "docs", "markdown-output"])).toEqual([
      "读写文档",
      "Markdown 输出",
    ]);
  });
});
