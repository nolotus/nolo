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
  "readFile", "read_image", "captureHostWindow", "writeFile", "editFile", "globFiles", "searchFiles", "captureVisualState",
  "execShell", "launchProcess", "listProcesses", "readProcessOutput",
  "taskWait", "taskStop",
  "openDesktopPreview",
] as const;

// Process-control tools ride the same gate as listProcesses: they only exist
// to follow up on tasks the shell tools spawned, so exposing them without
// shell access would hand out dangling handles. openDesktopPreview is a pure
// UI action (no process handle) and stays with the workspace-level tools.
const SHELL_TOOL_NAMES = [
  "execShell", "launchProcess", "listProcesses", "readProcessOutput",
  "taskWait", "taskStop",
] as const;

const WORKSPACE_TOOL_NAME_SET = new Set<string>(WORKSPACE_TOOL_NAMES);

export {
  WORKSPACE_TOOL_NAMES,
  SHELL_TOOL_NAMES,
  WORKSPACE_TOOL_NAME_SET,
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
      "Path relative to the workspace root. Absolute paths and ~/ (home directory) are also accepted. Defaults to workspace root when omitted.",
  };
}

function buildReadWorkspaceDescription() {
  return "Read UTF-8 text (including runtime spills). Read known targets concurrently in one turn; search/glob first if paths or ranges are unknown, then use lines.";
}

function buildReadWorkspaceParameters() {
  const path = buildWorkspacePathProperty();
  const lines = {
    type: "string",
    description:
      "1-based inclusive slice: \"40-120\", \"120-\" (to EOF), \"-50\" (tail), \"50\" (head). Omit to start at top; large reads are bounded. Continue at metadata endLine+1.",
  };
  const force = {
    type: "boolean",
    description:
      "An unchanged, already delivered range returns only a notice; true refetches (e.g. after compaction).",
  };
  return {
    type: "object",
    properties: {
      path,
      lines,
      force,
      raw: {
        type: "boolean",
        description: "Original *.result.md bytes incl. acceptance observations. Default compacts only machine observations, preserving report text and physical line numbers.",
      },
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
        "Write full UTF-8 file content in the workspace (new files or whole-file rewrites). Prefer editFile for targeted edits.",
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
      description: "Replace exact text. Count mismatch errors; never fall back to whole-file rewrite.",
      parameters: {
        type: "object",
        properties: {
          path: buildWorkspacePathProperty(),
          oldText: {
            type: "string",
            description: "Exact existing text.",
          },
          newText: {
            type: "string",
            description: "Replacement for oldText.",
          },
          expectedReplacements: {
            type: "integer",
            minimum: 1,
            description: "Expected count; default 1.",
          },
          // 刻意保持单一声明（integer），不引入 anyOf/oneOf 组合 schema：
          // provider 对组合 schema 的处理不一致——Gemini 会把无顶层 type 的联合
          // 节点归并成 type:"object"，连原本合法的整数输入都不再符合它的声明；
          // Fireworks 直接剥掉组合子、只剩描述。
        },
        required: ["path", "oldText", "newText"],
      },
    },
  };
}

function buildGlobWorkspaceDescription() {
  return "Glob paths without reading contents; brace groups combine patterns.";
}

function buildGlobWorkspaceParameters() {
  const pattern = {
    type: "string",
    description: "File glob, e.g. **/*.{ts,tsx}.",
  };
  const path = buildWorkspacePathProperty();
  const includeIgnored = {
    type: "boolean",
    description:
      "Include gitignored files, never .git or node_modules.",
  };
  const maxResults = {
    type: "integer",
    description: "Maximum paths.",
  };
  const exclude = {
    type: "array",
    items: { type: "string" },
    description: "Exclude globs.",
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
      description: "Render a URL to an image and DOM/computed-style metrics using platform Playwright/Chromium on the runtime host. Requires an installed renderer; never runs workspace scripts.",
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
            description: "Required non-empty CSS selector that must become visible before capture; choose the element that proves the page is ready.",
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
      description: "Track a dev server, watcher or REPL; returns pid/label/taskId/status immediately unless readyPattern waits (ready/readyOutcome/matchedLine/waitedMs/tails). Exit is notice-only on the next real turn, never wakes one. Inspect/read/wait/stop via listProcesses/readProcessOutput/taskWait/taskStop. Finite jobs needing wakeup: execShell background:true.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Background shell command.",
          },
          label: {
            type: "string",
            description: "Display label.",
          },
          persist: {
            type: "boolean",
            description:
              "Survive session/conversation close; default false.",
          },
          readyPattern: {
            type: "string",
            minLength: 1,
            description:
              "Wait for stdout/stderr regex; omit for immediate return. Linear-time, per line, ANSI stripped; while running, newline-terminated only. Backreferences and lookarounds fail with `invalid-arguments`.",
          },
          readyTimeoutMs: {
            type: "integer",
            minimum: 100,
            maximum: 120000,
            description:
              "Ready wait in ms; default 30000, clamp 100..120000. Timeout returns tails without stopping task.",
          },
        },
        required: ["command"],
      },
    },
  };
}

function buildOpenDesktopPreviewTool(): OpenAiCompatibleTool {
  return {
    type: "function",
    function: {
      name: "openDesktopPreview",
      description:
        "Open the desktop app's local preview split (main-area iframe) at the given URL. " +
        "Use after `launchProcess` once the dev server is confirmed healthy. " +
        "The preview appears inside the main window (right side of the split becomes the artifact area), keeping the conversation on the right. " +
        "Only available on the desktop runtime; returns an error elsewhere.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "Absolute http(s) URL to load in the preview browser window.",
          },
        },
        required: ["url"],
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

function buildReadProcessOutputTool(): OpenAiCompatibleTool {
  return {
    type: "function",
    function: {
      name: "readProcessOutput",
      description: "Read live/final stdout/stderr for tracked launchProcess or promoted execShell tasks. Returns {outcome, taskId, status, exitCode?, cursor, stdout, stderr, truncated, cursorEvicted, matchedStream?, matchedLine?, waitedMs?, outputRef?}. cursorEvicted means earlier bytes dropped from 64KB ring. Do not poll finite execShell jobs; completion wakes the conversation.",
      parameters: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            minLength: 1,
            description: "Task ID from launchProcess or listProcesses.",
          },
          cursor: {
            type: "string",
            description:
              "Reuse returned <stdoutLines>:<stderrLines> cursor for new output; omit for current tail.",
          },
          stream: {
            type: "string",
            enum: ["both", "stdout", "stderr"],
            description: "Read/match streams; default both.",
          },
          maxChars: {
            type: "integer",
            minimum: 256,
            maximum: 32000,
            description: "Chars per stream; default 8000, clamp 256..32000.",
          },
          waitForPattern: {
            type: "string",
            minLength: 1,
            description:
              "Wait for regex match, exit or timeoutMs. Linear-time, per line, ANSI stripped; while running, newline-terminated only. Backreferences and lookarounds fail with `invalid-arguments`.",
          },
          timeoutMs: {
            type: "integer",
            minimum: 0,
            maximum: 120000,
            description:
              "waitForPattern budget (ms); default 30000, clamp 0..120000.",
          },
        },
        required: ["taskId"],
      },
    },
  };
}

// --- ProcessTask follow-up tools (Phase 1) -----------------------------------
// These four only observe/stop tasks that already exist: a launchProcess task,
// or an execShell command that exceeded its detach window and returned
// {detached: true, taskId}. execShell/launchProcess intentionally have NO
// async/mode/background parameter — the model never picks an execution mode.

function buildTaskWaitTool(): OpenAiCompatibleTool {
  return {
    type: "function",
    function: {
      name: "taskWait",
      description:
        "Block until a background task (from launchProcess, or an execShell command that detached) reaches a terminal state, or until timeoutMs elapses. "
        + "Returns {outcome, status, exitCode?, cursor, events}: outcome \"terminal\" with status exited|failed|stopped when it finished, "
        + "outcome \"timeout\" with status \"running\" when it outlived the whole budget, "
        + "outcome \"not-found\" for an unknown taskId, or outcome \"evicted\" when the event trail aged out (never wait again in that case). "
        + "One call already waits the maximum budget and returns the moment the task ends, so a \"timeout\" means the task is genuinely longer — go do other work and come back rather than re-waiting in a loop (each re-wait costs a full model round-trip). "
        + "Pass a small timeoutMs for a cheap liveness peek. `cursor` is the highest event seq covered by this response.",
      parameters: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            minLength: 1,
            description: "Task id returned by launchProcess or by a detached execShell result.",
          },
          timeoutMs: {
            type: "number",
            description:
              "Wait budget in milliseconds. Defaults to the 300000 maximum (one call covers the whole budget and returns early the moment the task ends); values above 300000 are clamped. Pass a small value only when you want a quick liveness check instead of the result.",
          },
        },
        required: ["taskId"],
      },
    },
  };
}

function buildTaskStopTool(): OpenAiCompatibleTool {
  return {
    type: "function",
    function: {
      name: "taskStop",
      description: "Signal background process group: SIGTERM, then SIGKILL after a short grace period if alive. Returns {outcome,status,signal,escalated}: stopped only if signalled; else not-stoppable (finished/foreground) or not-found. Never pass runId/empty IDs; stop agent runs with controlAgentRun(action: \"stop\").",
      parameters: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            minLength: 1,
            description: "Task ID from launchProcess or detached execShell.",
          },
        },
        required: ["taskId"],
      },
    },
  };
}

export function buildWorkspaceToolDefinition(toolName: string) {
  if (toolName === "captureHostWindow") {
    return {
      type: "function" as const,
      function: {
        name: "captureHostWindow",
        description: "Capture the host desktop through the Screenshot portal (interactive permission/selection may appear). Returns an image or a fail-closed reason within 9s. Portal does not identify the application/window: never infer a window name. Linux host requires /usr/bin/python3 with Gio. No arguments.",
        parameters: { type: "object", properties: {}, additionalProperties: false },
      },
    };
  }
  if (toolName === "read_image") {
    return {
      type: "function" as const,
      function: {
        name: "read_image",
        description: "Local PNG/JPEG/WebP/GIF: path or paths (1–4), not both; any failure rejects batch. Long edge >1568px → resize to JPEG q80; base64 limits: 2MiB/image, 8MiB/request. Never reread chat [附件] (already visible).",
        parameters: {
          type: "object",
          properties: {
            path: buildWorkspacePathProperty(),
            paths: { type: "array", items: buildWorkspacePathProperty(), minItems: 1, maxItems: 4 },
          },
          // 不用 oneOf：不少兼容网关/严格模式不支持参数级组合子，模型会两个都传 →
          // 执行器拒绝 → 反复重试形成死循环（2026-10-27 实测）。互斥由执行器校验。
          additionalProperties: false,
        },
      },
    };
  }
  if (toolName === "readFile") {
    return buildReadWorkspaceFileTool();
  }
  if (toolName === "writeFile") {
    return buildWriteWorkspaceFileTool();
  }
  if (toolName === "editFile") {
    return buildReplaceWorkspaceTextTool();
  }
  if (toolName === "searchFiles") {
    return {
      type: "function",
      function: {
        name: "searchFiles",
        description: "Search workspace UTF-8 text, literal or regex, on Windows/macOS/Linux. Prefer over shell grep/rg/Select-String.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", minLength: 1, description: "Search text; pattern is a grep/rg alias if query is omitted." },
            path: buildWorkspacePathProperty(),
            regex: { type: "boolean", description: "Regex if true; literal by default." },
            caseSensitive: { type: "boolean", description: "Default true." },
            include: { type: "string", description: "Include glob, e.g. *.{ts,md}." },
            exclude: { type: "array", items: { type: "string" } },
            contextLines: { type: "integer", minimum: 0, maximum: 5 },
            maxResults: { type: "integer", minimum: 1, maximum: 1000, description: "Stop at this many matches; default 100." },
            includeIgnored: { type: "boolean", description: "Include gitignored files; default false." },
          },
          required: ["query"],
          additionalProperties: false,
        },
      },
    };
  }
  if (toolName === "globFiles") {
    return buildGlobWorkspaceFilesTool();
  }
  if (toolName === "captureVisualState") return buildCaptureVisualStateTool();
  if (toolName === "execShell") return buildExecShellTool(toolName);
  if (toolName === "launchProcess") return buildLaunchProcessTool();
  if (toolName === "openDesktopPreview") return buildOpenDesktopPreviewTool();
  if (toolName === "listProcesses") return buildListProcessesTool();
  if (toolName === "readProcessOutput") return buildReadProcessOutputTool();
  if (toolName === "taskWait") return buildTaskWaitTool();
  if (toolName === "taskStop") return buildTaskStopTool();
  return null;
}

export function filterDeclaredWorkspaceToolNames(args: {
  toolNames?: string[];
  exposeShellTools: boolean;
}) {
  return (args.toolNames ?? []).filter((toolName) =>
    WORKSPACE_TOOL_NAME_SET.has(toolName) &&
    (args.exposeShellTools || !SHELL_TOOL_NAMES.includes(toolName as any))
  );
}
