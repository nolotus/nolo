import { describe, expect, it } from "bun:test";

import {
  parseShellToolTextContent,
  projectDesktopToolUiContent,
} from "./projectDesktopToolUiContent";

describe("parseShellToolTextContent", () => {
  it("parses stdout/stderr/exitCode workspace shape", () => {
    expect(
      parseShellToolTextContent(
        ["stdout:", "hello", "world", "", "stderr:", "warn", "", "exitCode: 0"].join(
          "\n",
        ),
      ),
    ).toEqual({
      stdout: "hello\nworld",
      stderr: "warn",
      exitCode: 0,
    });
  });

  it("treats unstructured text as stdout", () => {
    expect(parseShellToolTextContent("plain output\nline2")).toEqual({
      stdout: "plain output\nline2",
      stderr: "",
    });
  });

  it("handles empty content", () => {
    expect(parseShellToolTextContent("")).toEqual({ stdout: "", stderr: "" });
  });
});

describe("projectDesktopToolUiContent", () => {
  it("preserves structured setTodoList data for desktop rendering", () => {
    const content = projectDesktopToolUiContent({
      toolName: "setTodoList",
      content: JSON.stringify({
        todos: [{ title: "Add toggle", status: "in_progress" }],
      }),
    });
    expect(JSON.parse(content)).toEqual({
      todos: [{ title: "Add toggle", status: "in_progress" }],
    });
  });

  it("projects execShell into ExecShellViewer JSON", () => {
    const content = projectDesktopToolUiContent({
      toolName: "execShell",
      content: [
        "stdout:",
        "## alpha...origin/alpha [ahead 2]",
        "",
        "exitCode: 0",
      ].join("\n"),
      summary: "exit=0 1 lines",
      metadata: { command: "git status -sb", exitCode: 0 },
    });
    const parsed = JSON.parse(content);
    expect(parsed.command).toBe("git status -sb");
    expect(parsed.stdout).toContain("ahead 2");
    expect(parsed.exitCode).toBe(0);
  });

  it("falls back to argumentsPreview for command", () => {
    const parsed = JSON.parse(
      projectDesktopToolUiContent({
        toolName: "execShell",
        content: "stdout:\nok\n\nexitCode: 0",
        argumentsPreview: "pwd",
        metadata: { exitCode: 0 },
      }),
    );
    expect(parsed.command).toBe("pwd");
    expect(parsed.stdout).toBe("ok");
  });

  it("projects readFile into CodePreviewViewer JSON with path + content", () => {
    const parsed = JSON.parse(
      projectDesktopToolUiContent({
        toolName: "readFile",
        content: "file body here",
        summary: "1 lines 10 chars",
        metadata: {
          path: "packages/ai/agent/streamAgentChatTurn.ts",
          startLine: 1,
          endLine: 40,
          totalLines: 2600,
        },
      }),
    );
    expect(parsed.filePath).toBe("packages/ai/agent/streamAgentChatTurn.ts");
    expect(parsed.content).toBe("file body here");
    expect(parsed.startLine).toBe(1);
    expect(parsed.endLine).toBe(40);
    expect(parsed.totalLines).toBe(2600);
  });

  it("falls back to summary when readFile content missing", () => {
    const parsed = JSON.parse(
      projectDesktopToolUiContent({
        toolName: "readFile",
        summary: "file contents here",
        metadata: { path: "README.md" },
      }),
    );
    expect(parsed.filePath).toBe("README.md");
    expect(parsed.content).toBe("file contents here");
  });

  it("prefers full content over summary for other non-shell tools", () => {
    expect(
      projectDesktopToolUiContent({
        toolName: "codeSearch",
        content: "match body",
        summary: "3 matches",
      }),
    ).toBe("match body");
  });
});
