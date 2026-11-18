import { summarizeShellCommand } from "./shellCommandGist";

export type ExecutionState = "unknown" | "pending" | "running" | "success" | "failed" | "cancelled" | "repairing";
export type AttentionKind = "failure" | "blocked" | "permission" | "delete-confirmation";
export interface AttentionEvidence { kind: AttentionKind; source: string }
export interface ToolActivityInput {
  key: string;
  toolName: string;
  args?: Readonly<Record<string, unknown>>;
  state: ExecutionState;
  attention: readonly AttentionEvidence[];
  mode: "ordinary" | "interactive" | "handoff" | "artifact";
  scopeKey: string;
  batchKey?: string;
  evidenceKey: string;
}
export interface ToolActivityProjection {
  key: string;
  action: string;
  object?: string;
  context?: string;
  summary?: string;
  readOnly: boolean;
  confidence: "recognized" | "raw-fallback";
  state: ExecutionState;
  attention: readonly AttentionEvidence[];
  standalone: boolean;
  scopeKey: string;
  batchKey?: string;
  evidenceKey: string;
}
export interface ToolBatchSummary {
  /** Tool-call count only; never a task completion verdict. */
  total: number;
  states: Readonly<Record<ExecutionState, number>>;
  attention: readonly AttentionKind[];
}
const families: Record<string, readonly [string, string, readonly string[], boolean]> = {
  readFile: ["read", "读取", ["path"], true], read_file: ["read", "读取", ["path"], true], readWorkspaceFile: ["read", "读取", ["path"], true],
  writeFile: ["write", "写入", ["path"], false], editFile: ["edit", "修改", ["path"], false],
  globFiles: ["find", "查找文件", ["pattern", "path"], true], search: ["search", "搜索", ["query", "pattern"], true],
  codeSearch: ["search", "搜索", ["query", "pattern"], true], exa_search: ["search", "搜索", ["query", "pattern"], true],
  grep: ["search", "搜索", ["pattern", "query"], true], loadSkill: ["skill", "加载技能", ["name", "slug"], true],
};
const shellTools = new Set(["execShell", "exec_shell", "runCommand", "launchProcess"]);
/** Display only, not a secret sanitizer. Callers must retain their existing safe output boundary. */
export function projectToolActivity(input: ToolActivityInput, translate?: (key: string, fallback: string) => string): ToolActivityProjection {
  const text = (...keys: string[]) => {
    for (const key of keys) { const value = input.args?.[key]; if (typeof value === "string" && value.length) return value; }
    return undefined;
  };
  let action = input.toolName, object: string | undefined, summary: string | undefined, readOnly = false;
  let confidence: ToolActivityProjection["confidence"] = "raw-fallback";
  let context = text("cwd");
  if (shellTools.has(input.toolName)) {
    object = text("command", "cmd");
    const gist = object ? summarizeShellCommand(object) : null;
    action = gist?.action ?? gist?.summary ?? "命令";
    if (gist) {
      object = gist.object;
      context = context ?? gist.context;
      summary = gist.summary;
      readOnly = gist.readOnly === true;
      confidence = "recognized";
    }
    // Compound summaries contain operands: never replace them with a generic translation.
    if (!gist || gist.action) action = translate?.(gist?.action ? `toolActivity.shell.${gist.action}` : "toolActivity.shell", action) ?? action;
  } else {
    const family = families[input.toolName];
    if (family) {
      action = translate?.(`toolActivity.${family[0]}`, family[1]) ?? family[1];
      object = text(...family[2]);
      readOnly = family[3];
      confidence = "recognized";
    }
    else object = text("path", "query", "command", "url", "name");
  }
  return { key: input.key, action, object, context, ...(summary ? { summary } : {}), readOnly, confidence, state: input.state, attention: input.attention, standalone: input.mode !== "ordinary" || input.attention.length > 0 || ["failed", "cancelled", "repairing"].includes(input.state), scopeKey: input.scopeKey, batchKey: input.batchKey, evidenceKey: input.evidenceKey };
}
export function canCoalesceToolActivities(previous: ToolActivityProjection, next: ToolActivityProjection): boolean {
  return !previous.standalone && !next.standalone && previous.attention.length === 0 && next.attention.length === 0 && !!previous.scopeKey && previous.scopeKey === next.scopeKey && !!previous.batchKey && previous.batchKey === next.batchKey;
}
export function summarizeToolBatch(items: readonly ToolActivityProjection[]): ToolBatchSummary {
  const states: Record<ExecutionState, number> = { unknown: 0, pending: 0, running: 0, success: 0, failed: 0, cancelled: 0, repairing: 0 };
  const attention = new Set<AttentionKind>();
  for (const item of items) { states[item.state]++; for (const evidence of item.attention) attention.add(evidence.kind); }
  return { total: items.length, states, attention: [...attention] };
}
