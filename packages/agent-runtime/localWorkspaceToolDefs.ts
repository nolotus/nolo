// packages/agent-runtime/localWorkspaceToolDefs.ts
//
// Workspace tool schema 定义 + shell 命令构建 + tool 分发器。
// 从 localWorkspaceTools.ts 提取——纯声明，零 I/O，零副作用。
//
// 这组函数输出唯一的 canonical OpenAI tool schema 对象（schema variant 实验
// 已结束，experiment layer 移除；执行器（readFileTool / execShellTool 等）
// 留在 localWorkspaceTools.ts）。

import { resolveExecutableOnPath } from "./runtimeCompat";
import type { AgentRuntimeToolResult } from "./hostAdapter";
import { IMMEDIATE_DETACH_SLEEP_THRESHOLD_SECONDS } from "./shellCommandPolicy";
import { buildExecShellToolDefinition } from "./capabilities/execShellCapability";
import {
  tokenizeShellPrefix,
  wrapPowerShellCommand,
  findPowerShellExecutable,
  buildPowerShellCommand,
  buildBashCommand,
  buildWorkspaceShellCommand,
  findWorkspaceShellEscapeToken,
  buildWorkspaceShellEscapeBlockedResult,
} from "./workspaceShell";
import type { OpenAiCompatibleTool } from "./capabilities";

export type { OpenAiCompatibleTool };

const WORKSPACE_TOOL_NAMES = [
  "readFile", "writeFile", "editFile", "globFiles", "captureVisualState",
  "execShell", "launchProcess", "listProcesses",
] as const;

const SHELL_TOOL_NAMES = ["execShell", "launchProcess", "listProcesses"] as const;

const WORKSPACE_TOOL_NAME_SET = new Set<string>(WORKSPACE_TOOL_NAMES);
const REMOVED_WORKSPACE_TOOL_NAMES = new Set([
  "gitStatus", "gitDiff", "gitCreateBranch", "gitAdd", "gitCommit", "commitWorkspace",
]);

export {
  WORKSPACE_TOOL_NAMES,
  SHELL_TOOL_NAMES,
  WORKSPACE_TOOL_NAME_SET,
  REMOVED_WORKSPACE_TOOL_NAMES,
  tokenizeShellPrefix,
  wrapPowerShellCommand,
  findPowerShellExecutable,
  buildPowerShellCommand,
  buildBashCommand,
  buildWorkspaceShellCommand,
  findWorkspaceShellEscapeToken,
  buildWorkspaceShellEscapeBlockedResult,
};

function buildWorkspacePathProperty() {
  return {
    type: "string",
    minLength: 1,
    description:
      "Path relative to the workspace root. Defaults to workspace root when omitted.",
  };
}

function buildReadWorkspaceDescription() {
  return "Read a UTF-8 text file inside the workspace. Use lines for focused range reads after search to save tokens. A range already delivered earlier for an unchanged file answers with a short notice instead of resending (force:true refetches).";
}

function buildReadWorkspaceParameters() {
  const path = buildWorkspacePathProperty();
  const lines = {
    type: "string",
    description:
      'Line slice: "40-120" (range, 1-based, inclusive), "120-" (from line to end), "-50" (tail N lines), "50" (head N lines). Omit to read full file.',
  };
  const force = {
    type: "boolean",
    description:
      "Refetch even when the requested range was already delivered earlier and the file is unchanged (e.g. after context compaction).",
  };
  return {
    type: "object",
    properties: {
      path,
      lines,
      force,
    },
    required: ["path"],
  };
}

function buildReadWorkspaceFileTool(): OpenAiCompatibleTool {
  return {
    type: "function",
    function: {
      name: "readFile",
      description: buildReadWorkspaceDescription(),
      parameters: buildReadWorkspaceParameters(),
    },
  };
}

function buildWriteWorkspaceFileTool(): OpenAiCompatibleTool {
  return {
    type: "function",
    function: {
      name: "writeFile",
      description:
        "Write full UTF-8 file content inside the workspace (new files or whole-file rewrites). Prefer editFile for targeted edits.",
      parameters: {
        type: "object",
        properties: {
          path: buildWorkspacePathProperty(),
          content: {
            type: "string",
            description: "Full UTF-8 file content to write.",
          },
        },
        required: ["path", "content"],
      },
    },
  };
}

function buildReplaceWorkspaceTextTool(): OpenAiCompatibleTool {
  return {
    type: "function",
    function: {
      name: "editFile",
      description:
        "Replace exact text occurrences in a workspace file. If expected replacement count fails, report the error instead of falling back to a whole-file rewrite.",
      parameters: {
        type: "object",
        properties: {
          path: buildWorkspacePathProperty(),
          oldText: {
            type: "string",
            description: "Exact text currently present in the file.",
          },
          newText: {
            type: "string",
            description: "Replacement text to write in place of oldText.",
          },
          expectedReplacements: {
            type: "integer",
            description: "Expected replacement count. Defaults to 1.",
          },
        },
        required: ["path", "oldText", "newText"],
      },
    },
  };
}

function buildGlobWorkspaceDescription() {
  return "Find file paths by glob pattern without reading file contents. Use brace groups (e.g. '**/*.{ts,tsx}') to match multiple patterns in one call.";
}

function buildGlobWorkspaceParameters() {
  const pattern = {
    type: "string",
    description: "Glob pattern for files (supports brace groups like '**/*.{ts,tsx}', '**/{package.json,tsconfig*.json}').",
  };
  const path = buildWorkspacePathProperty();
  const includeIgnored = {
    type: "boolean",
    description:
      "When true, include gitignored files (.git and node_modules remain excluded).",
  };
  const maxResults = {
    type: "integer",
    description: "Max file paths to return.",
  };
  const exclude = {
    type: "array",
    items: { type: "string" },
    description: "Glob patterns to exclude from results.",
  };
  return {
    type: "object",
    properties: {
      pattern,
      path,
      exclude,
      includeIgnored,
      maxResults,
    },
    required: ["pattern"],
  };
}

function buildGlobWorkspaceFilesTool(): OpenAiCompatibleTool {
  return {
    type: "function",
    function: {
      name: "globFiles",
      description: buildGlobWorkspaceDescription(),
      parameters: buildGlobWorkspaceParameters(),
    },
  };
}

function buildCaptureVisualStateTool(): OpenAiCompatibleTool {
  return {
    type: "function",
    function: {
      name: "captureVisualState",
      description: "Capture a real local app screenshot and DOM/computed-style metrics for a selected UI state.",
      parameters: {
        type: "object",
        properties: {
          baseUrl: {
            type: "string",
            description: "Optional local app base URL. Defaults to http://127.0.0.1:38123.",
          },
          path: {
            type: "string",
            description: "App route to open, for example / or /dialog-123. Defaults to /.",
          },
          waitSelector: {
            type: "string",
            description: "CSS selector that must become visible before capture.",
          },
          scrollSelector: {
            type: "string",
            description: "Optional CSS selector to scroll into view before capture.",
          },
          focusSelector: {
            type: "string",
            description: "Optional CSS selector for the target element whose rect/style should be reported.",
          },
          expectText: {
            type: "string",
            description: "Optional visible text expected on the page before capture.",
          },
          screenshotPath: {
            type: "string",
            description: "Workspace-relative screenshot path. Defaults under test-results/frontend-agent/.",
          },
          metricsPath: {
            type: "string",
            description: "Workspace-relative metrics JSON path. Defaults under test-results/frontend-agent/.",
          },
        },
        required: ["waitSelector"],
      },
    },
  };
}

function buildExecShellTool(toolName: string): OpenAiCompatibleTool {
  return buildExecShellToolDefinition(toolName);
}

function buildLaunchProcessTool(): OpenAiCompatibleTool {
  return {
    type: "function",
    function: {
      name: "launchProcess",
      description:
        "Start a long-running background process (dev server, watcher, REPL) and return immediately with {pid, label, status}. Use listProcesses to inspect or stop it.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Shell command to run in background.",
          },
          label: {
            type: "string",
            description: "Optional friendly label for the process.",
          },
          persist: {
            type: "boolean",
            description:
              "Keep process alive after session/conversation closes. Defaults to false.",
          },
        },
        required: ["command"],
      },
    },
  };
}

function buildListProcessesTool(): OpenAiCompatibleTool {
  return {
    type: "function",
    function: {
      name: "listProcesses",
      description:
        "List active background processes launched via launchProcess. Returns {pid, label, command, status, startedAt, persist}[].",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  };
}

export function buildWorkspaceToolDefinition(toolName: string) {
  if (toolName === "readFile") {
    return buildReadWorkspaceFileTool();
  }
  if (toolName === "writeFile") {
    return buildWriteWorkspaceFileTool();
  }
  if (toolName === "editFile") {
    return buildReplaceWorkspaceTextTool();
  }
  if (toolName === "globFiles") {
    return buildGlobWorkspaceFilesTool();
  }
  if (toolName === "captureVisualState") return buildCaptureVisualStateTool();
  if (toolName === "execShell") return buildExecShellTool(toolName);
  if (toolName === "launchProcess") return buildLaunchProcessTool();
  if (toolName === "listProcesses") return buildListProcessesTool();
  return null;
}

export function filterDeclaredWorkspaceToolNames(args: {
  toolNames?: string[];
  exposeShellTools: boolean;
}) {
  return (args.toolNames ?? []).filter((toolName) =>
    WORKSPACE_TOOL_NAME_SET.has(toolName) &&
    !REMOVED_WORKSPACE_TOOL_NAMES.has(toolName) &&
    (args.exposeShellTools || !SHELL_TOOL_NAMES.includes(toolName as any))
  );
}
