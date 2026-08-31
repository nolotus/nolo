import type { PermissionRequest } from "./actionGate";

export type FileWritePolicyResult =
  | { permissionDecision: "allow" }
  | {
      permissionDecision: "ask";
      permissionRequest: PermissionRequest;
    };

/** Session-scoped confirmation policy for the first write/edit in a session. */
export function evaluateFileWritePolicy(args: {
  tool: string;
  path: string;
  sessionApproved: boolean;
}): FileWritePolicyResult {
  if (args.sessionApproved) return { permissionDecision: "allow" };

  return {
    permissionDecision: "ask",
    permissionRequest: {
      id: "permission-file-write-session",
      tool: args.tool,
      action: "file_write",
      title: "确认写入文件",
      body: `本会话首次写入文件：${args.path}。批准后本会话后续写入不再逐次确认。`,
      command: args.path,
      suggestedRule: {
        scope: "session",
        pattern: { capability: "file_write", target: "session" },
      },
    },
  };
}
