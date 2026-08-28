import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(import.meta.dir, relativePath), "utf-8");

describe("tool base url consumer source contract", () => {
  it("routes shared tool http clients through getToolBaseUrl", () => {
    const readFileSource = readSource("./readFileTool.ts");
    const writeFileSource = readSource("./writeFileTool.ts");
    const applyEditSource = readSource("./applyEditTool.ts");
    const applyLineEditsSource = readSource("./applyLineEditsTool.ts");
    const codeSearchSource = readSource("./codeSearchTool.ts");
    const searchRepoSource = readSource("./searchRepoTool.ts");

    for (const source of [
      readFileSource,
      writeFileSource,
      applyEditSource,
      applyLineEditsSource,
      codeSearchSource,
      searchRepoSource,
    ]) {
      expect(source).toContain("getToolBaseUrl");
      expect(source).not.toContain("selectCurrentServer");
    }
  });

  it("routes tool request context consumers through getToolRequestContext", () => {
    const appToolsSource = readSource("./appTools.ts");
    const cloudflareCrawlSource = readSource("./cloudflareCrawlTool.ts");
    const executeSqlSource = readSource("./executeSqlTool.ts");

    expect(appToolsSource).toContain("getToolRequestContext");
    expect(appToolsSource).not.toContain("getRequestConfig(");

    expect(cloudflareCrawlSource).toContain("getToolRequestContext");
    expect(cloudflareCrawlSource).not.toContain("getRequestConfig(");

    expect(executeSqlSource).toContain("getToolRequestContext");
    expect(executeSqlSource).not.toContain("getRequestConfig(");
  });
});
