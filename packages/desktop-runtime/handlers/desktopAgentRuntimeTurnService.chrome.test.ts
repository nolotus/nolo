import { describe, expect, test } from "bun:test";

import {
  buildDesktopChromeConnectorOpenAiToolsForTest,
  buildDesktopChromeConnectorPolicyToolNamesForTest,
  buildDesktopChromeConnectorToolExecutorsForTest,
} from "./desktopAgentRuntimeTurnService";

describe("desktop agent runtime Chrome connector tools", () => {
  test("exposes Chrome connector schemas only when explicitly requested", () => {
    const tools = buildDesktopChromeConnectorOpenAiToolsForTest({
      toolNames: ["chrome_list_tabs", "readFile", "chrome_read_page"],
    });

    expect(tools.map((tool: any) => tool.function.name)).toEqual([
      "chrome_list_tabs",
      "chrome_read_page",
    ]);
  });

  test("omits bulky activity metadata from Chrome connector schemas", () => {
    const tools = buildDesktopChromeConnectorOpenAiToolsForTest({
      toolNames: ["chrome_open_tab"],
    });

    expect(tools[0]?.function?.parameters?.properties).not.toHaveProperty("_activity");
  });

  test("includes Chrome connector tools in desktop local policy names", () => {
    const toolNames = buildDesktopChromeConnectorPolicyToolNamesForTest({
      toolNames: ["chrome_list_tabs", "chrome_click", "fetchWebpage"],
    });

    expect(toolNames).toEqual(["chrome_list_tabs", "chrome_click"]);
  });

  test("registers local executors for Chrome connector tools", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];
    const executors = buildDesktopChromeConnectorToolExecutorsForTest({
      client: {
        request: async (action, payload) => {
          calls.push({ action, payload });
          if (action === "connector_info") {
            return { extensionId: "ahpdoopadkamnglhlacfjdfnonpjdplg" };
          }
          return { tabs: [{ id: 1, title: "Example", url: "https://example.com" }] };
        },
      },
    });

    await expect(executors.chrome_list_tabs({
      id: "call-1",
      name: "chrome_list_tabs",
      arguments: "{}",
    })).resolves.toEqual({
      content: JSON.stringify({
        ok: true,
        result: { tabs: [{ id: 1, title: "Example", url: "https://example.com" }] },
      }),
      metadata: {
        chromeConnector: true,
        action: "list_tabs",
      },
    });
    expect(calls).toEqual([
      { action: "connector_info", payload: {} },
      { action: "list_tabs", payload: {} },
    ]);
  });

  test("blocks local executors when the connector_info handshake is missing", async () => {
    const calls: string[] = [];
    const executors = buildDesktopChromeConnectorToolExecutorsForTest({
      client: {
        request: async (action) => {
          calls.push(action);
          if (action === "connector_info") {
            const error = new Error("Unknown Chrome connector action: connector_info") as Error & {
              code?: string;
            };
            error.code = "UNKNOWN_ACTION";
            throw error;
          }
          return { tabs: [{ id: 1, title: "Example", url: "https://example.com" }] };
        },
      },
    });

    const result = await executors.chrome_list_tabs({
      id: "call-1",
      name: "chrome_list_tabs",
      arguments: "{}",
    });

    expect(JSON.parse(result.content)).toMatchObject({
      ok: false,
      error: {
        code: "UNKNOWN_ACTION",
        message: "Unknown Chrome connector action: connector_info",
      },
    });
    expect(calls).toEqual(["connector_info"]);
  });
});
