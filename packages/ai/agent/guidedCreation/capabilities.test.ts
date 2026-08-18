import { describe, expect, it } from "bun:test";
import {
  GUIDED_AGENT_CAPABILITIES,
  mapCapabilityIdsToToolIds,
} from "./capabilities";

describe("guided agent creation capabilities", () => {
  it("shows user-facing labels while mapping to concrete tool ids", () => {
    expect(GUIDED_AGENT_CAPABILITIES.webSearch.label.zhCN).toBe("联网搜索");
    expect(GUIDED_AGENT_CAPABILITIES.webSearch.toolIds).toContain("exa_search");

    expect(mapCapabilityIdsToToolIds(["webSearch", "docs", "tables"])).toEqual(
      expect.arrayContaining(["exa_search", "createDoc", "updateDoc", "createTable"])
    );
  });

  it("deduplicates tools and ignores unknown capability ids", () => {
    expect(
      mapCapabilityIdsToToolIds(["docs", "docs", "unknown" as any])
    ).toEqual(["createDoc", "updateDoc", "read"]);
  });

  it("uses actual registered tools for apps capability", () => {
    expect(GUIDED_AGENT_CAPABILITIES.apps.toolIds).toEqual([
      "appDeploy",
      "appList",
      "appRead",
      "appFileList",
      "appFileSearch",
      "appFileRead",
      "appFileReplace",
      "appFileWrite",
    ]);
    expect(mapCapabilityIdsToToolIds(["apps"])).toEqual([
      "appDeploy",
      "appList",
      "appRead",
      "appFileList",
      "appFileSearch",
      "appFileRead",
      "appFileReplace",
      "appFileWrite",
    ]);
  });

  it("maps image processing to shell execution without exposing a UI-only spec", () => {
    expect(GUIDED_AGENT_CAPABILITIES.imageProcessing.label.zhCN).toBe("图片处理");
    expect(GUIDED_AGENT_CAPABILITIES.imageProcessing.description.zhCN).toContain(
      "压缩图片"
    );
    expect(GUIDED_AGENT_CAPABILITIES.imageProcessing.toolIds).toEqual([
      "execShell",
    ]);
    expect(mapCapabilityIdsToToolIds(["imageProcessing"])).toEqual([
      "execShell",
    ]);
  });
});
