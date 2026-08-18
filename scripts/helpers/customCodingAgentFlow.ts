import { deterministicId, type ServerDemoCredentials } from "./agentHelpers";
import {
  ensureDemoUserAccess,
  ensureDemoUserAccessOnBases,
  upsertAgentRecordOnBases,
  verifyAgentResponse,
} from "./agentFlowHelpers";
import { ensureAgentAttachedToSpace } from "./spaceDataHelpers";
import {
  resolveTargetSpaceId,
} from "./agentWorkspaceDefaults";
import { normalizeBaseUrl } from "./serverBases";

const DEFAULT_CODING_AGENT_PROMPT = [
  "你是空间里的私有代码助理。",
  "底层模型来自 OpenAI 兼容接口。",
  "默认输出中文，代码、路径和命令保持英文。",
  "执行命令前先判断当前环境；环境不明确时先调用 checkEnv({check:'context'})。",
  "Windows 默认使用 PowerShell 语法，Linux/macOS 默认使用 bash 语法。",
  "开始动手前先理解需求和上下文，避免无关改动。",
  "优先做可验证、可落地的修改，必要时先读取文件和环境。",
  "涉及代码改动时，尽量给出最小但完整的实现，并说明验证方式。",
].join("\n");

type BuildCodingAgentRecordOptions = {
  userId: string;
  now: number;
  agentId: string;
  name: string;
  provider: string;
  model: string;
  apiSource: "custom" | "platform";
  tools: string[];
  enabledPacks?: string[];
  tags: string[];
  introduction?: string;
  greeting?: string;
  prompt?: string;
  providerUrl?: string;
  apiKey?: string;
  apiKeyHeader?: string;
};

export interface CreateCustomCodingAgentOptions {
  baseUrl: string;
  spaceId?: string;
  localCoreBaseUrl?: string;
  agentId?: string;
  seed?: string;
  username?: string;
  locale?: string;
  apiKey: string;
  apiKeyHeader?: string;
  providerUrl: string;
  model: string;
  name: string;
  providerTag?: string;
  introduction?: string;
  greeting?: string;
  prompt?: string;
  tags?: string[];
  tools?: string[];
  enabledPacks?: string[];
  verifyPrompt?: string;
  expectedResponse?: string;
  skipVerify?: boolean;
  syncAllBases?: boolean;
}

function inferHostTag(providerUrl: string) {
  try {
    return new URL(providerUrl).hostname.replace(/^www\./, "").replace(/\./g, "-");
  } catch {
    return "custom";
  }
}

function isLocalProviderUrl(providerUrl: string | undefined) {
  if (!providerUrl) return false;
  try {
    const hostname = new URL(providerUrl).hostname.toLowerCase();
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  } catch {
    return false;
  }
}

export function buildCodingAgentRecord(options: BuildCodingAgentRecordOptions) {
  const normalizedProviderUrl = options.providerUrl
    ? normalizeBaseUrl(options.providerUrl)
    : "";
  return {
    type: "agent",
    id: options.agentId,
    userId: options.userId,
    name: options.name.trim(),
    introduction: options.introduction ?? `使用 ${options.provider} 的私有代码助理。`,
    greeting:
      options.greeting ??
      `你好，我是 ${options.name}。你可以直接让我读项目、改代码、查环境、写脚本。`,
    prompt: options.prompt ?? DEFAULT_CODING_AGENT_PROMPT,
    apiSource: options.apiSource,
    provider: options.provider,
    model: options.model.trim(),
    ...(normalizedProviderUrl
      ? { customProviderUrl: normalizedProviderUrl }
      : {}),
    ...(options.apiKey?.trim() ? { apiKey: options.apiKey.trim() } : {}),
    ...(options.apiKeyHeader?.trim()
      ? { apiKeyHeader: options.apiKeyHeader.trim() }
      : {}),
    useServerProxy: true,
    hasVision: false,
    inputPrice: 0,
    outputPrice: 0,
    isPublic: false,
    tools: [...options.tools],
    ...(options.enabledPacks
      ? { enabledPacks: [...options.enabledPacks] }
      : {}),
    tags: [...new Set(options.tags.filter(Boolean))],
    ...(isLocalProviderUrl(normalizedProviderUrl)
      ? {
          runtimeBinding: {
            kind: "desktop-local-provider",
            providerUrl: normalizedProviderUrl,
          },
        }
      : {}),
    whitelist: [],
    createdAt: options.now,
    updatedAt: options.now,
  };
}

type CreateCodingAgentFromRecordOptions = {
  baseUrl: string;
  spaceId?: string;
  localCoreBaseUrl?: string;
  seed?: string;
  username?: string;
  locale?: string;
  agentId: string;
  skipVerify?: boolean;
  verifyPrompt?: string;
  expectedResponse?: string;
  syncAllBases?: boolean;
  buildRecord: (args: {
    userId: string;
    now: number;
    agentId: string;
  }) => Record<string, any> & { id: string; name?: string; isPublic?: boolean };
};

export function splitCodingAgentServerEntries(
  serverEntries: ServerDemoCredentials[],
  attachBaseUrl: string
) {
  const normalizedAttachBaseUrl = normalizeBaseUrl(attachBaseUrl);
  const runtimeEntries = serverEntries.map((entry) => ({
    ...entry,
    baseUrl: normalizeBaseUrl(entry.baseUrl),
  }));
  const attachEntries = runtimeEntries.filter(
    (entry) => entry.baseUrl === normalizedAttachBaseUrl
  );

  return {
    runtimeEntries,
    attachEntries,
    needsAttachLogin: attachEntries.length === 0,
  };
}

async function createCodingAgentFromRecord(
  options: CreateCodingAgentFromRecordOptions
) {
  const {
    baseUrl,
    spaceId,
    localCoreBaseUrl,
    seed = process.env.AGENT_SEED ?? "nolo-platform-demo-account-v1",
    username = process.env.AGENT_USER ?? "platform-demo",
    locale = process.env.AGENT_LOCALE ?? "zh-CN",
    agentId,
    skipVerify = false,
    verifyPrompt = "只回复 OK",
    expectedResponse = "OK",
    syncAllBases = true,
    buildRecord,
  } = options;

  const attachSpaceId = resolveTargetSpaceId(spaceId);
  const attachBaseUrl = normalizeBaseUrl(localCoreBaseUrl ?? baseUrl);
  const serverEntries = syncAllBases
    ? await ensureDemoUserAccessOnBases({
        baseUrl,
        seed,
        username,
        locale,
      })
    : [
        {
          baseUrl,
          ...(await ensureDemoUserAccess({
            baseUrl,
            seed,
            username,
            locale,
          })),
        },
      ];
  const entryPlan = splitCodingAgentServerEntries(serverEntries, attachBaseUrl);
  const attachEntries = entryPlan.needsAttachLogin
    ? [
        {
          baseUrl: attachBaseUrl,
          ...(await ensureDemoUserAccess({
            baseUrl: attachBaseUrl,
            seed,
            username,
            locale,
          })),
        },
      ]
    : entryPlan.attachEntries;
  const allEntries = [
    ...entryPlan.runtimeEntries,
    ...attachEntries.filter(
      (attachEntry) =>
        !entryPlan.runtimeEntries.some((runtimeEntry) => runtimeEntry.baseUrl === attachEntry.baseUrl)
    ),
  ];
  const primaryEntry = allEntries[0];
  const { userId, authToken } = primaryEntry;
  const now = Date.now();
  const agentRecord = buildRecord({
    userId,
    now,
    agentId,
  });

  const [{ privateKey, contentKey }] = await upsertAgentRecordOnBases({
    serverEntries: allEntries,
    agentRecord,
  });
  if (attachSpaceId) {
    for (const entry of attachEntries) {
      await ensureAgentAttachedToSpace({
        baseUrl: entry.baseUrl,
        userId,
        authToken: entry.authToken,
        spaceId: attachSpaceId,
        contentKey,
        title: agentRecord.name ?? agentId,
      });
    }
  }

  const verify = skipVerify
    ? { dialogId: "", content: "SKIPPED" }
    : await verifyAgentResponse({
        baseUrl: primaryEntry.baseUrl,
        authToken,
        agentKey: privateKey,
        prompt: verifyPrompt,
        expected: expectedResponse,
      });

  return {
    userId,
    authToken,
    agentId,
    privateKey,
    agentUrl: `${primaryEntry.baseUrl}/${privateKey}`,
    spaceId: attachSpaceId,
    verify,
    replicatedBases: allEntries.map((entry) => entry.baseUrl),
    verifiedBase: primaryEntry.baseUrl,
    agentRecord,
  };
}

export async function createCustomCodingAgent(options: CreateCustomCodingAgentOptions) {
  const {
    baseUrl,
    spaceId,
    localCoreBaseUrl,
    seed = process.env.AGENT_SEED ?? "nolo-platform-demo-account-v1",
    username = process.env.AGENT_USER ?? "platform-demo",
    locale = process.env.AGENT_LOCALE ?? "zh-CN",
    apiKey,
    apiKeyHeader,
    providerUrl,
    model,
    name,
    providerTag = "custom",
    introduction = `使用 ${providerTag} 提供的 OpenAI 兼容接口的私有代码助理，适合代码阅读、修改、命令执行与开发协作。`,
    greeting = `你好，我是 ${name}。你可以直接让我读项目、改代码、查环境、写脚本。`,
    prompt = DEFAULT_CODING_AGENT_PROMPT,
    tags = [providerTag, inferHostTag(providerUrl), "coding"],
    enabledPacks = ["code", "web-search"],
    tools = [
      "read",
      "searchDialogMessages",
      "checkEnv",
      "rememberMemory",
      "createDoc",
      "updateDoc",
      "createTable",
      "addTableRow",
      "queryTableRows",
      "updateContentTitle",
    ],
    verifyPrompt = "只回复 OK",
    expectedResponse = "OK",
    skipVerify = false,
    syncAllBases = true,
  } = options;

  const normalizedProviderUrl = normalizeBaseUrl(providerUrl);
  const normalizedApiKey = apiKey.trim();
  if (!normalizedApiKey) {
    throw new Error("缺少 API key。");
  }
  if (!normalizedProviderUrl) {
    throw new Error("缺少 provider url。");
  }
  if (!model.trim()) {
    throw new Error("缺少 model。");
  }
  if (!name.trim()) {
    throw new Error("缺少 agent 名称。");
  }

  const agentId =
    options.agentId ??
    deterministicId(
      "01CUSTOMCODEA",
      `custom-coding-agent:${normalizedProviderUrl}:${model}:${name}`
    );
  return createCodingAgentFromRecord({
    baseUrl,
    spaceId,
    localCoreBaseUrl,
    seed,
    username,
    locale,
    agentId,
    skipVerify,
    verifyPrompt,
    expectedResponse,
    syncAllBases,
    buildRecord: ({ userId, now }) =>
      buildCodingAgentRecord({
        userId,
        now,
        agentId,
        name,
        introduction,
        greeting,
        prompt,
        apiSource: "custom",
        provider: "custom",
        model,
        providerUrl: normalizedProviderUrl,
        apiKey: normalizedApiKey,
        apiKeyHeader,
        tools,
        enabledPacks,
        tags,
      }),
  });
}
