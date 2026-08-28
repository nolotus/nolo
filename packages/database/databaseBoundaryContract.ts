/**
 * Public Projection Database Boundary Contract (Wave 1)
 *
 * 明确 packages/database 与 packages/database-engine 在开源投影中的边界规范：
 * 1. packages/database/server (私有服务端路由、handler、emailRepository、coreDataProxy 等) 绝不进 public projection
 * 2. packages/database-engine/serverStoreFactory.ts (服务端 AuthorityStore 工厂) 绝不进 public projection
 * 3. 公开集非测试代码严禁 import database/server/* 或 database-engine/serverStoreFactory
 * 4. prepareNoloOpenSourceMirror gate 统一复用该契约，实现 fail-closed 门禁
 */

export type DatabaseBoundaryRule = {
  id: string;
  category: "denied-subtree" | "denied-file" | "forbidden-import";
  description: string;
  pattern: string | RegExp;
};

export const DATABASE_BOUNDARY_CONTRACT = {
  version: 1,
  packages: ["database", "database-engine"] as const,

  // 严禁进入 public projection 的私有子树路径（相对 packages/ 根目录）
  forbiddenSubtrees: [
    "packages/database/server",
    "database/server",
  ] as const,

  // serverStoreFactory.ts 不再禁止：CLI 构建需要 db.ts，db.ts import serverStoreFactory。
  // serverStoreFactory 只依赖 fs/path/level + 同包文件，无 auth/server 依赖，安全公开。
  forbiddenFiles: [] as const,

  // 私有 import 规则定义
  forbiddenImportRules: [
    {
      id: "packages/database/server",
      category: "forbidden-import",
      description: "Database server routes and private handlers must not be imported in public projection",
      pattern: /^(packages\/)?database\/server(\/.*)?$/,
    },
    // serverStoreFactory 不再禁止 import：CLI 构建需要它（经 db.ts）。
  ] as const,

  // 公开包允许暴露并投影的核心能力清单（白名单基准）
  allowedPublicCapabilities: [
    // database
    "actions",
    "authority",
    "cache",
    "models",
    "records",
    "schemas",
    "tombstones",
    "userDataMerge",
    "utils",
    // database-engine
    "authorityStoreTypes",
    "authorityStoreConformance",
    "memoryAuthorityStore",
    "levelAuthorityStore",
    "sqliteAuthorityStore",
    "cliAuthorityBrokerClient",
    "cliAuthorityBrokerServer",
    "db",
    "dbCompat",
    "dbPath",
    "storeOps",
    "agentDelegation",
    "agentGrant",
    "agentReferenceGrants",
    "coreDataOwnership",
    "writeAuthority",
    "spaceMemberAuthority",
  ] as const,
} as const;

/**
 * 校验给定的 import specifier 是否触犯 database 私有边界
 */
export function isForbiddenDatabaseImport(specifier: string): {
  forbidden: boolean;
  rule?: string;
} {
  const normalized = specifier
    .replace(/^\.\.?\//, "")
    .replace(/^@nolo\//, "");

  // 1. database/server
  if (
    normalized === "database/server" ||
    normalized.startsWith("database/server/") ||
    normalized === "packages/database/server" ||
    normalized.startsWith("packages/database/server/") ||
    normalized.includes("/database/server") ||
    /^(?:\.\.\/)+database\/server(?:\/.*)?$/.test(specifier) ||
    /^(?:\.\.\/)+server\/routes(?:\/.*)?$/.test(specifier)
  ) {
    return { forbidden: true, rule: "packages/database/server" };
  }

  // serverStoreFactory 不再禁止 import：CLI 构建需要它（经 db.ts）。
  // 它只依赖 fs/path/level + 同包文件，无 auth/server 依赖。

  return { forbidden: false };
}

/**
 * 校验相对路径是否属于 database 私有禁止子树或私有文件
 */
export function isForbiddenDatabasePath(relPath: string): {
  forbidden: boolean;
  reason?: string;
} {
  const normalized = relPath.replace(/\\/g, "/").replace(/^\.\//, "");

  // 检查 forbiddenSubtrees
  for (const subtree of DATABASE_BOUNDARY_CONTRACT.forbiddenSubtrees) {
    if (
      normalized === subtree ||
      normalized.startsWith(`${subtree}/`) ||
      normalized.includes(`/${subtree}/`) ||
      normalized.endsWith(`/${subtree}`)
    ) {
      return {
        forbidden: true,
        reason: `Matches forbidden database subtree: ${subtree}`,
      };
    }
  }

  // 检查 forbiddenFiles
  for (const file of DATABASE_BOUNDARY_CONTRACT.forbiddenFiles) {
    if (
      normalized === file ||
      normalized.endsWith(`/${file}`) ||
      normalized === `packages/database-engine/${file}`
    ) {
      return {
        forbidden: true,
        reason: `Matches forbidden database file: ${file}`,
      };
    }
  }

  return { forbidden: false };
}

/**
 * 校验文件名是否属于 database 专属敏感/私有文件
 */
export function isForbiddenDatabaseFile(filename: string): boolean {
  for (const file of DATABASE_BOUNDARY_CONTRACT.forbiddenFiles) {
    if (filename === file) {
      return true;
    }
  }
  return false;
}
