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
    "校验当前隔离 Sandbox 中 output/ 目录内的产物文件，并将其持久化提交到 Space 或用户私有 Artifact 存储（支持版本冲突检测与幂等重试）。提交必须指向产生该产物的那次成功执行：executionId 取自 execShell 返回结果里的 executionId。",
  parameters: {
    type: "object",
    properties: {
      outputPath: {
        type: "string",
        description: "Sandbox 中 output/ 下的相对文件路径，例如 output/report.json 或 report.json。",
      },
      executionId: {
        type: "string",
        description:
          "产生该产物的那次 execShell 执行 ID（见 execShell 返回的 executionId）。该路径必须由这次执行创建或修改过（按执行前后 output/ 差分判定），否则提交会被拒；执行失败/取消/超时、或文件在执行后被改动，都不能提交。",
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
    required: ["outputPath", "executionId"],
  },
};

export const materializeSkillAssetsFunctionSchema = {
  name: "materializeSkillAssets",
  description:
    "把平台内置的可执行技能脚本复制到当前 Sandbox 的 work/skills/<skill>/，只读来源、幂等：源目录是平台内置的仓库脚本（allowlist 硬编码，调用方无法指定路径），重复调用只会覆盖同名文件，不会叠加内容。",
  parameters: {
    type: "object",
    properties: {
      skill: {
        type: "string",
        description: "技能名，必须是平台内置的可执行技能（例如 cad-analysis）；其它取值会被拒绝。",
      },
    },
    required: ["skill"],
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

export async function materializeSkillAssetsClientStub() {
  return {
    rawData: {
      ok: false,
      error: "server_only_tool",
      message: "materializeSkillAssets must run inside a server web-hosted sandbox run.",
    },
    displayData: "materializeSkillAssets 仅在服务端隔离 Sandbox 运行中可用。",
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
