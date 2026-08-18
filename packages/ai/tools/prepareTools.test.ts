import { beforeEach, describe, expect, it } from "bun:test";

import i18n from "app/i18n";
import {
  __clearPrepareToolsCacheForTests,
  prepareTools,
} from "./prepareTools";
import { filterToolNamesForRunKind } from "../../agent-runtime/agentRunIsolation";
import { getChromeConnectorToolDefaultConsent } from "./chromeConnectorTools";
import { canonicalizeToolName } from "./toolNameAliases";

describe("prepareTools", () => {
  beforeEach(() => {
    __clearPrepareToolsCacheForTests();
  });

  it("canonicalizes legacy knowledge tool aliases", () => {
    const tools = prepareTools(["createPage", "update_page", "read_page", "read", "codeSearch"]);

    expect(tools.map((tool) => tool.function.name)).toEqual([
      "createDoc",
      "updateDoc",
      "readDoc",
      "read",
      "codeSearch",
    ]);
  });

  it("describes updateDoc ids with the actual page- dbKey prefix", () => {
    const [tool] = prepareTools(["updateDoc"]);
    const idDescription = tool.function.parameters.properties.id.description;

    expect(idDescription).toContain("page-");
    expect(idDescription).not.toContain("PAGE-");
  });

  it("omits disabled tools after canonicalizing their names", () => {
    const tools = prepareTools(["exa-search", "fetchWebpage"], {
      disabledToolNames: ["exa_search"],
    });

    expect(tools.map((tool) => tool.function.name)).toEqual(["fetchWebpage"]);
  });

  it("does not expose activity metadata in prepared tool schemas", () => {
    const [tool] = prepareTools(["fetchWebpage"]);

    expect(tool.function.parameters.properties).not.toHaveProperty("_activity");
    expect(tool.function.parameters.required ?? []).not.toContain("_activity");
  });

  it("sanitizes composition keywords for fireworks tool schemas", () => {
    const [tool] = prepareTools(["appDeploy"], { provider: "fireworks" });

    expect(tool.function.parameters.anyOf).toBeUndefined();
  });

  it("preserves composition keywords for openai tool schemas", () => {
    const [tool] = prepareTools(["appDeploy"], { provider: "openai" });

    expect(tool.function.parameters.anyOf).toEqual([
      { required: ["name"] },
      { required: ["appId"] },
    ]);
  });

  it("includes Nolo React workspace file tools when explicitly enabled", () => {
    const tools = prepareTools(["appFileList", "appFileSearch", "appFileRead", "appFileReplace", "appFileWrite"]);

    expect(tools.map((tool) => tool.function.name)).toEqual([
      "appFileList",
      "appFileSearch",
      "appFileRead",
      "appFileReplace",
      "appFileWrite",
    ]);
    expect(tools.find((tool) => tool.function.name === "appFileSearch")?.function.parameters.required).toEqual([
      "appId",
      "query",
    ]);
    const appFileRead = tools.find((tool) => tool.function.name === "appFileRead");
    const appFileList = tools.find((tool) => tool.function.name === "appFileList");
    const appFileSearch = tools.find((tool) => tool.function.name === "appFileSearch");
    const appFileWrite = tools.find((tool) => tool.function.name === "appFileWrite");
    const appFileReplace = tools.find((tool) => tool.function.name === "appFileReplace");
    expect(appFileList?.function.description).toContain("listFiles");
    expect(appFileSearch?.function.description).toContain("searchFiles");
    expect(appFileRead?.function.description).toContain("readFile");
    expect(appFileWrite?.function.description).toContain("writeFile");
    expect(appFileWrite?.function.description).toContain("整文件重写");
    expect(appFileReplace?.function.description).toContain("editFile");
    expect(appFileReplace?.function.description).toContain("小改动优先");
    expect(appFileRead?.function.parameters.required).toEqual([
      "appId",
      "path",
    ]);
    expect(appFileRead?.function.parameters.properties).toHaveProperty("startLine");
    expect(appFileRead?.function.parameters.properties).toHaveProperty("endLine");
    expect(appFileWrite?.function.parameters.required).toEqual([
      "appId",
      "path",
      "code",
    ]);
    expect(appFileReplace?.function.parameters.required).toEqual([
      "appId",
      "path",
      "oldText",
      "newText",
    ]);
  });

  it("documents email_provision_identity readiness semantics", () => {
    const [tool] = prepareTools(["email_provision_identity"]);

    expect(tool.function.description).toContain("readiness");
    expect(tool.function.description).toContain("ready");
    expect(tool.function.description).toContain("ingress-ready");
  });

  it("includes the confirmed deleteSpaces tool when explicitly enabled", () => {
    const [tool] = prepareTools(["deleteSpaces"]);

    expect(tool.function.name).toBe("deleteSpaces");
    expect(tool.function.parameters.properties.matchMode.enum).toContain("prefix");
  });


  it("includes Nolo desktop Chrome connector tools when explicitly enabled", () => {
    const tools = prepareTools([
      "chrome_list_tabs",
      "chrome_open_tab",
      "chrome_read_page",
      "chrome_click",
      "chrome_type",
      "chrome_press",
      "chrome_scroll",
      "chrome_screenshot",
      "chrome_read_console",
      "chrome_read_network",
    ]);

    expect(tools.map((tool) => tool.function.name)).toEqual([
      "chrome_list_tabs",
      "chrome_open_tab",
      "chrome_read_page",
      "chrome_click",
      "chrome_type",
      "chrome_press",
      "chrome_scroll",
      "chrome_screenshot",
      "chrome_read_console",
      "chrome_read_network",
    ]);
    expect(tools.find((tool) => tool.function.name === "chrome_click")?.function.parameters.required).toEqual([
      "tabId",
      "selector",
    ]);
    expect(tools.find((tool) => tool.function.name === "chrome_type")?.function.description).toContain(
      "Chrome"
    );
  });

  it("requires confirmation for Chrome connector action tools while keeping read tools automatic", () => {
    expect(getChromeConnectorToolDefaultConsent("chrome_list_tabs")).toBe("auto");
    expect(getChromeConnectorToolDefaultConsent("chrome_read_page")).toBe("auto");
    expect(getChromeConnectorToolDefaultConsent("chrome_screenshot")).toBe("auto");
    expect(getChromeConnectorToolDefaultConsent("chrome_read_console")).toBe("auto");
    expect(getChromeConnectorToolDefaultConsent("chrome_read_network")).toBe("auto");

    expect(getChromeConnectorToolDefaultConsent("chrome_open_tab")).toBe("ask");
    expect(getChromeConnectorToolDefaultConsent("chrome_click")).toBe("ask");
    expect(getChromeConnectorToolDefaultConsent("chrome_type")).toBe("ask");
    expect(getChromeConnectorToolDefaultConsent("chrome_press")).toBe("ask");
    expect(getChromeConnectorToolDefaultConsent("chrome_scroll")).toBe("ask");
  });

  it("includes browser-safe Nolo workspace read tools when enabled", () => {
    const tools = prepareTools(["listDialogs", "readDialog", "queryDialogsBySubjectRef", "deleteDialogs", "readAgent", "cliDoctor"]);

    expect(tools.map((tool) => tool.function.name)).toEqual([
      "listDialogs",
      "readDialog",
      "queryDialogsBySubjectRef",
      "deleteDialogs",
      "readAgent",
      "cliDoctor",
    ]);
    expect(tools.find((tool) => tool.function.name === "queryDialogsBySubjectRef")?.function.parameters.properties).toMatchObject({
      subjectKind: { type: "string" },
      subjectId: { type: "string" },
      rowDbKey: { type: "string" },
      excludeDialogId: { type: "string" },
    });
    expect(tools.find((tool) => tool.function.name === "deleteDialogs")?.function.parameters.properties).toMatchObject({
      query: { type: "string" },
      confirmedDialogIds: { type: "array" },
    });
  });

  it("exposes the authoritative startAgentRun schema from the tool registry", () => {
    const [tool] = prepareTools(["startAgentRun"]);
    expect(tool?.type).toBe("function");
    expect(tool?.function?.name).toBe("startAgentRun");
    expect(tool?.function?.parameters?.required).toEqual(["agentKey", "task"]);
    expect(tool?.function?.parameters?.properties).toMatchObject({
      agentKey: { type: "string" },
      task: { type: "string" },
      wait: { type: "boolean" },
    });
    expect(tool?.function?.parameters?.properties).not.toHaveProperty("mode");
    expect(tool?.function?.parameters?.properties).not.toHaveProperty("serverBase");
  });

  it("accepts common tool aliases from model tool calls", () => {
    expect(canonicalizeToolName("terminalCommand")).toBe("execShell");
    expect(canonicalizeToolName("runInBash")).toBe("execShell");
    expect(canonicalizeToolName("executeCommand")).toBe("execShell");
  });

  it("includes a Taobao/Tmall product detail scraper when explicitly enabled", () => {
    const [tool] = prepareTools(["taobaoTmallProductScraper"]);

    expect(tool.function.name).toBe("taobaoTmallProductScraper");
    expect(tool.function.description).toContain("淘宝");
    expect(tool.function.parameters.required).toContain("itemId");
    expect(tool.function.parameters.properties.detailDepth.enum).toContain("full");
  });

  it("includes a JD product detail scraper when explicitly enabled", () => {
    const [tool] = prepareTools(["jdProductScraper"]);

    expect(tool.function.name).toBe("jdProductScraper");
    expect(tool.function.description).toContain("京东");
    expect(tool.function.parameters.required).toContain("skuId");
    expect(tool.function.parameters.properties.url.description).toContain("item.jd.com");
  });

  it("includes a Marxists.org offline book converter when explicitly enabled", () => {
    const [tool] = prepareTools(["convertMarxistsBookToOfflineHtml"]);

    expect(tool.function.name).toBe("convertMarxistsBookToOfflineHtml");
    expect(tool.function.description).toContain("Marxists.org");
    expect(tool.function.parameters.required).toContain("startUrl");
    expect(tool.function.parameters.properties.outputMode.enum).toContain("html");
  });

  it("includes the WeRead gateway when explicitly enabled", () => {
    const [tool] = prepareTools(["wereadGateway"]);

    expect(tool.function.name).toBe("wereadGateway");
    expect(tool.function.description).toContain("微信读书");
    expect(tool.function.parameters.required).toContain("api_name");
  });

  it("translates tool schemas dynamically based on i18n language", async () => {
    // 1. 默认中文环境下，应显示中文
    await i18n.changeLanguage("zh-CN");
    const [zhTool] = prepareTools(["checkEnv"]);
    expect(zhTool.function.description).toContain("执行环境检查");
    expect(zhTool.function.parameters.properties.check.description).toContain("检查项");

    // 2. 切换为英文环境下，应显示英文
    await i18n.changeLanguage("en");
    const [enTool] = prepareTools(["checkEnv"]);
    expect(enTool.function.description).toContain("Perform environment check");
    expect(enTool.function.parameters.properties.check.description).toContain("The check item");

    // 3. 恢复为中文
    await i18n.changeLanguage("zh-CN");
  });

  it("caches prepared tools for repeated hot-path calls without changing semantics", () => {
    const first = prepareTools(["fetchWebpage", "exa_search"], { provider: "openai" });
    const second = prepareTools(["fetchWebpage", "exa_search"], { provider: "openai" });

    expect(second.map((tool) => tool.function.name)).toEqual(
      first.map((tool) => tool.function.name),
    );
    expect(second[0].function.description).toBe(first[0].function.description);
    expect(second[0].function.parameters).toEqual(first[0].function.parameters);

    // Array identity is not shared so callers cannot poison the cache.
    expect(second).not.toBe(first);
    second.pop();
    const third = prepareTools(["fetchWebpage", "exa_search"], { provider: "openai" });
    expect(third).toHaveLength(2);
  });

  it("does not reuse cache across provider sanitization boundaries", () => {
    const openaiTools = prepareTools(["appDeploy"], { provider: "openai" });
    const fireworksTools = prepareTools(["appDeploy"], { provider: "fireworks" });

    expect(openaiTools[0].function.parameters.anyOf).toEqual([
      { required: ["name"] },
      { required: ["appId"] },
    ]);
    expect(fireworksTools[0].function.parameters.anyOf).toBeUndefined();
  });

  it("agent-run isolation: subtask-filtered tool list produces a distinct cache key from the interactive list", () => {
    // The runKind filter removes orchestration + git-write names BEFORE
    // prepareTools, so the two run kinds feed prepareTools different name
    // lists. prepareTools' cache key is built from the final name list, so
    // interactive and subtask results are cached separately — no cache
    // poisoning across run kinds.
    // Note: gitAdd/gitCommit are REMOVED_WORKSPACE_TOOL_NAMES (not in
    // toolRegistry), so prepareTools warns and drops them. The filter still
    // removes them from the subtask list; here we verify the cacheKey split
    // using real registry tools (readFile/writeFile/startAgentRun/controlAgentRun).
    const interactiveNames = [
      "readFile",
      "writeFile",
      "startAgentRun",
      "controlAgentRun",
    ];
    const subtaskNames = filterToolNamesForRunKind(interactiveNames, true);

    // Subtask filter removed the orchestration names
    expect(subtaskNames).toEqual(["readFile", "writeFile"]);

    const interactiveTools = prepareTools(interactiveNames);
    const subtaskTools = prepareTools(subtaskNames);

    // Interactive result keeps the orchestration tools
    const interactiveNamesResult = interactiveTools.map((t) => t.function.name);
    expect(interactiveNamesResult).toContain("startAgentRun");
    expect(interactiveNamesResult).toContain("controlAgentRun");
    expect(interactiveNamesResult).toContain("readFile");
    expect(interactiveNamesResult).toContain("writeFile");

    // Subtask result does NOT have orchestration tools
    const subtaskNamesResult = subtaskTools.map((t) => t.function.name);
    expect(subtaskNamesResult).not.toContain("startAgentRun");
    expect(subtaskNamesResult).not.toContain("controlAgentRun");
    expect(subtaskNamesResult).toContain("readFile");
    expect(subtaskNamesResult).toContain("writeFile");

    // Re-preparing the interactive list still returns the full set (cache
    // not poisoned by the subtask call)
    const interactiveAgain = prepareTools(interactiveNames);
    expect(interactiveAgain.map((t) => t.function.name)).toEqual(
      interactiveNamesResult,
    );
  });
});
