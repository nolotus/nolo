// packages/agent-runtime/localWorkspaceToolDefs.ts
//
// Workspace tool schema 定义 + shell 命令构建 + tool 分发器。
// 从 localWorkspaceTools.ts 提取——纯声明，零 I/O，零副作用。
//
// 这组函数接受 variant 字符串，输出 OpenAI tool schema 对象。
// 执行器（readFileTool / execShellTool 等）留在 localWorkspaceTools.ts。

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

export type GlobFilesDescriptionVariant = "brief" | "strategy" | "workflow" | "antiShell";
export type GlobFilesParameterVariant = "minimal" | "scoped" | "rich";
export type ReadFileDescriptionVariant = "brief" | "strategy" | "workflow" | "antiShell";
export type ReadFileParameterVariant = "minimal" | "scoped" | "rich";

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

function buildReadWorkspaceDescription(variant?: ReadFileDescriptionVariant) {
  if (variant === "brief") {
    return "Read a UTF-8 text file inside the workspace.";
  }
  if (variant === "workflow") {
    return 'Read a UTF-8 text file inside the workspace. Use lines with a range from search matches, or lines: "-50" for logs. Read the whole file only when the task needs all content.';
  }
  if (variant === "antiShell") {
    return "Read a UTF-8 text file inside the workspace. Prefer readFile over shell commands (cat/head/tail).";
  }
  return "Read a UTF-8 text file inside the workspace. Use lines for focused range reads after search to save tokens. A range already delivered earlier for an unchanged file answers with a short notice instead of resending (force:true refetches).";
}

function buildReadWorkspaceParameters(variant?: ReadFileParameterVariant) {
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
  if (variant === "minimal") {
    return {
      type: "object",
      properties: { path },
      required: ["path"],
    };
  }
  if (variant === "rich") {
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

function buildReadWorkspaceFileTool(args?: {
  descriptionVariant?: ReadFileDescriptionVariant;
  parameterVariant?: ReadFileParameterVariant;
}): OpenAiCompatibleTool {
  return {
    type: "function",
    function: {
      name: "readFile",
      description: buildReadWorkspaceDescription(args?.descriptionVariant),
      parameters: buildReadWorkspaceParameters(args?.parameterVariant),
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

function buildGlobWorkspaceDescription(variant?: GlobFilesDescriptionVariant) {
  if (variant === "brief") {
    return "Find workspace files by path glob without reading file contents.";
  }
  if (variant === "workflow") {
    return "Find files by glob pattern. Use codeSearch for text inside candidates, and readFile for specific paths.";
  }
  if (variant === "antiShell") {
    return "Find workspace files by path glob. Prefer globFiles over shell find/ls commands.";
  }
  return "Find file paths by glob pattern without reading file contents. Use brace groups (e.g. '**/*.{ts,tsx}') to match multiple patterns in one call.";
}

function buildGlobWorkspaceParameters(variant?: GlobFilesParameterVariant) {
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
  if (variant === "minimal") {
    return {
      type: "object",
      properties: { pattern },
      required: ["pattern"],
    };
  }
  if (variant === "rich") {
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
  return {
    type: "object",
    properties: {
      pattern,
      glob: {
        type: "string",
        description: "Alias for pattern, kept for compatibility.",
      },
      path,
      exclude,
      includeIgnored,
      maxResults,
    },
  };
}

function buildGlobWorkspaceFilesTool(args?: {
  descriptionVariant?: GlobFilesDescriptionVariant;
  parameterVariant?: GlobFilesParameterVariant;
}): OpenAiCompatibleTool {
  return {
    type: "function",
    function: {
      name: "globFiles",
      description: buildGlobWorkspaceDescription(args?.descriptionVariant),
      parameters: buildGlobWorkspaceParameters(args?.parameterVariant),
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

export function buildWorkspaceToolDefinition(toolName: string, args?: {
  readFileDescriptionVariant?: ReadFileDescriptionVariant;
  readFileParameterVariant?: ReadFileParameterVariant;
  globFilesDescriptionVariant?: GlobFilesDescriptionVariant;
  globFilesParameterVariant?: GlobFilesParameterVariant;
}) {
  if (toolName === "readFile") {
    return buildReadWorkspaceFileTool({
      descriptionVariant: args?.readFileDescriptionVariant,
      parameterVariant: args?.readFileParameterVariant,
    });
  }
  if (toolName === "writeFile") {
    return buildWriteWorkspaceFileTool();
  }
  if (toolName === "editFile") {
    return buildReplaceWorkspaceTextTool();
  }
  if (toolName === "globFiles") {
    return buildGlobWorkspaceFilesTool({
      descriptionVariant: args?.globFilesDescriptionVariant,
      parameterVariant: args?.globFilesParameterVariant,
    });
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
