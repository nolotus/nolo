// Minimal schema declarations for web-hosted sandbox storage/compute bridge tools.
// Actual execution runs exclusively on the server inside `developerServerTools.ts`
// against an authenticated, isolated web-hosted workspace lease.

export const materializeWorkspaceFileFunctionSchema = {
  name: "materializeWorkspaceFile",
  description:
    "将当前用户有权访问的 Space 授权文件或私有文件（或已持久化的 Workspace Artifact）物化到当前隔离 Sandbox 的只读 input/ 目录中。",
  parameters: {
    type: "object",
    properties: {
      fileId: {
        type: "string",
        description: "目标文件的 fileId 或完整 file-* dbKey（与 logicalName 二选一）。",
      },
      logicalName: {
        type: "string",
        description: "已持久化 Artifact 的逻辑文件名（如 report.json，与 fileId 二选一）。",
      },
      spaceId: {
        type: "string",
        description: "可选，目标 Space ID；省略时使用当前对话所属 Space。",
      },
      targetName: {
        type: "string",
        description: "可选，物化到 input/ 下的安全文件名。",
      },
    },
  },
};

export const commitSandboxArtifactFunctionSchema = {
  name: "commitSandboxArtifact",
  description:
    "校验当前隔离 Sandbox 中 output/ 目录内的产物文件，并将其持久化提交到 Space 或用户私有 Artifact 存储（支持版本冲突检测与幂等重试）。",
  parameters: {
    type: "object",
    properties: {
      outputPath: {
        type: "string",
        description: "Sandbox 中 output/ 下的相对文件路径，例如 output/report.json 或 report.json。",
      },
      logicalName: {
        type: "string",
        description: "可选，持久化后的逻辑文件名，默认取 outputPath 的文件名。",
      },
      mimeType: {
        type: "string",
        description: "可选，文件 MIME 类型（默认按扩展名推断）。",
      },
      spaceId: {
        type: "string",
        description: "可选，目标 Space ID；省略时若对话在 Space 中则归属该 Space，否则归属当前用户私有空间。",
      },
      principalKind: {
        type: "string",
        enum: ["space", "user"],
        description: "可选，显式指定归属主体类型（space 或 user）。",
      },
      expectedVersion: {
        type: "integer",
        description: "可选，乐观并发控制期望版本号；与当前版本不一致时拒绝覆盖。",
      },
      idempotencyKey: {
        type: "string",
        description: "可选，重试幂等键；重复提交同内容返回同一条已提交记录。",
      },
    },
    required: ["outputPath"],
  },
};

export async function materializeWorkspaceFileClientStub() {
  return {
    rawData: {
      ok: false,
      error: "server_only_tool",
      message: "materializeWorkspaceFile must run inside a server web-hosted sandbox run.",
    },
    displayData: "materializeWorkspaceFile 仅在服务端隔离 Sandbox 运行中可用。",
  };
}

export async function commitSandboxArtifactClientStub() {
  return {
    rawData: {
      ok: false,
      error: "server_only_tool",
      message: "commitSandboxArtifact must run inside a server web-hosted sandbox run.",
    },
    displayData: "commitSandboxArtifact 仅在服务端隔离 Sandbox 运行中可用。",
  };
}
