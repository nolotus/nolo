/**
 * Platform-owned `secrets-manager` built-in skill（平台级开发者本地秘密管理）。
 *
 * 用于统一安全管理宿主机本地运维、打包、部署等开发者外部凭据（如 Mozilla AMO 签名密钥、
 * Docker Hub Token、发布密钥等），彻底告别对话框手动复制粘贴密钥。
 *
 * 内容全部来自代码，经 builtinSkillRegistry 暴露给所有端（Web, Desktop, CLI, TUI）运行时。
 */

import {
  buildSkillDocMarkdown,
  type SkillDocConfig,
} from "./skillDocProtocol";

export const SECRETS_MANAGER_SKILL_SLUGS = ["secrets-manager"] as const;

export type SecretsManagerSkillSlug = (typeof SECRETS_MANAGER_SKILL_SLUGS)[number];

type SecretsManagerSkillSeedDef = {
  slug: SecretsManagerSkillSlug;
  title: string;
  description: string;
  body: string;
};

function deterministicId(prefix: string, seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  const suffix = h.toString(36).toUpperCase().padStart(14, "0");
  return (prefix + suffix).slice(0, 26);
}

function normalizeSkillSeed(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildSecretsManagerSkillId(slug: SecretsManagerSkillSlug): string {
  return deterministicId("01SK", normalizeSkillSeed(slug) || slug);
}

export function buildSecretsManagerSkillPageKey(
  userId: string,
  slug: SecretsManagerSkillSlug,
): string {
  return `page-${userId}-${buildSecretsManagerSkillId(slug)}`;
}

const SECRETS_MANAGER_SKILL_DEFINITIONS: Record<
  SecretsManagerSkillSlug,
  SecretsManagerSkillSeedDef
> = {
  "secrets-manager": {
    slug: "secrets-manager",
    title: "Secrets Manager",
    description:
      "触发词：本地密钥、保存密钥、secrets、AMO签名凭据、凭据保存、nolo secret、注入环境变量执行。Nolo 平台级开发者本地秘密管理（~/.nolo/credentials/secrets.json，权限 0600）。",
    body: `# Nolo Secrets Manager — 本地平台级开发者凭据管理

用于统一安全管理宿主机本地运维、打包、部署等开发者外部凭据（如 Mozilla AMO 签名密钥、Docker Hub Token、发布密钥等），彻底告别对话框手动复制粘贴密钥。

## 存储契约与安全红线

1. **绝对存储路径**：\`$NOLO_HOME/credentials/secrets.json\`（未设 \`NOLO_HOME\` 时回落 \`~/.nolo/credentials/secrets.json\`），权限严格锁定为 \`0600\`，父目录 \`0700\`。
2. **禁止回显原则**：
   - Agent 无论在任何情况下，**绝不在对话消息、日志或报告中打印任何密钥明文**；
   - 查看已保存的凭据一律使用 \`nolo secret list\`（仅输出凭据名称，不输出内容）；
   - Agent **不得**执行 \`nolo secret get\`（该子命令只供人类调试），只允许 \`nolo secret run --with\`。
3. **用户授权门禁**：
   - 只有当用户在对话中明确提到“允许获取 / 使用本地保存的 xxx 凭据”时，Agent 才被授权调用该凭据；未获用户明确指示时，不得读取或注入。

## 常用 CLI 命令

\`\`\`bash
# 1. 查看已有秘密（安全，仅输出名称列表，绝不打印密钥值）
nolo secret list

# 2. 设置或更新凭据（支持字符串或 JSON 对象）
nolo secret set amo '{"issuer":"user:<account-id>:<key-id>","secret":"<key>"}'
nolo secret set docker_token 'my-secret-token'

# 3. 安全注入环境变量并执行命令（推荐用法，子进程结束后变量自动销毁）
# 例如: amo 自动映射出 WEB_EXT_API_KEY / WEB_EXT_API_SECRET / AMO_JWT_ISSUER / AMO_JWT_SECRET
nolo secret run --with amo -- bunx web-ext sign --channel unlisted ...

# 4. 删除不再需要的凭据
nolo secret delete amo
\`\`\`

## 已支持的自动化映射服务

- **\`amo\`**（Mozilla Add-ons）：
  - 存储格式：\`{"issuer": "...", "secret": "..."}\`
  - 自动注入环境变量：\`WEB_EXT_API_KEY\`, \`WEB_EXT_API_SECRET\`, \`AMO_JWT_ISSUER\`, \`AMO_JWT_SECRET\`
- **通用凭据**：
  - 字符串：自动转为大写下划线环境变量（如 \`my_api_key\` → \`MY_API_KEY\`）
  - 对象：自动展开为前缀变量（如 \`docker: { "user": "a", "token": "b" }\` → \`DOCKER_USER\`, \`DOCKER_TOKEN\`）
`,
  },
};

export function buildSecretsManagerSkillConfig(
  slug: SecretsManagerSkillSlug,
): SkillDocConfig {
  const seed = SECRETS_MANAGER_SKILL_DEFINITIONS[slug];
  if (!seed) throw new Error(`Unknown secrets-manager skill slug: ${slug}`);
  return {
    version: "0.1",
    kind: "skill",
    id: buildSecretsManagerSkillId(slug),
    name: seed.title,
    description: seed.description,
    triggerMode: "manual",
  };
}

export function buildSecretsManagerSkillContentBySlug(
  slug: SecretsManagerSkillSlug,
): string {
  const seed = SECRETS_MANAGER_SKILL_DEFINITIONS[slug];
  if (!seed) throw new Error(`Unknown secrets-manager skill slug: ${slug}`);
  const skillConfig = buildSecretsManagerSkillConfig(slug);
  return buildSkillDocMarkdown({
    body: seed.body,
    skillConfig,
  });
}
