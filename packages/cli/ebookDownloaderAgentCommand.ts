import { toErrorMessage } from "core/errorMessage";
import { asOptionalTrimmedString } from "core/optionalString";
import { PUBLIC_AGENT_KEY_PREFIX, isOwnedAgentKey, ownedAgentKey, publicAgentKey } from "core/prefix";
import { normalizeServerOrigin } from "core/serverOrigin";
import type {
  AgentRuntimeShellPolicy,
  AgentRuntimeToolPolicy,
} from "agent-runtime/types";
import { DEFAULT_NOLO_SERVER_URL } from "./defaultServer";
import type { CliFetchImpl } from "./cliFetch";

type EnvLike = Record<string, string | undefined>;

type OutputLike = {
  write(chunk: string): unknown;
};

type SetupEbookDownloaderDeps = {
  env?: EnvLike;
  output?: OutputLike;
  fetchImpl?: CliFetchImpl;
  now?: () => number;
};

type ParsedArgs = {
  serverUrl: string;
  authToken: string;
  userId: string;
  targetAgentId: string;
  targetAgentKey: string;
  spaceId: string | null;
  name: string;
  publicAgent: boolean;
  model: string | null;
  apiSource: string | null;
  copyProviderFrom: string | null;
  customProviderUrl: string | null;
  apiKey: string | null;
  tools: string[] | null;
  skillDocKey: string | null;
  json: boolean;
};

const DEFAULT_USER_ID = "0e95801d90";
const DEFAULT_AGENT_NAME = "电子书下载助手";

/**
 * 关联的 Z-Library skill 文档（平台 doc pageKey）。
 *
 * 只作为提示词里的指针写进记录，不在 CLI 侧读取内容：CLI 拿不到该 doc 就一定
 * 不该把「已挂载 skill」写进结果。可用 `--skill-doc <pageKey>` 覆盖，
 * 传空串（`--skill-doc ""`）则不写指针。
 */
export const DEFAULT_EBOOK_SKILL_DOC_KEY = "page-0e95801d90-01SK00000001D2G20G";

/**
 * 平台托管的默认模型（`apiSource: "platform"`，由平台额度计费）。
 * 与 `packages/core/builtinAgentCatalog.ts` 里的平台 agent 保持一致。
 * 私有模式与 `--public` 未显式指定模型时都用它：公开版绝不沿用调用方可能
 * 携带的私人 OAuth 凭证。
 */
export const PLATFORM_DEFAULT_MODEL = "deepseek-flash";
const PLATFORM_PROVIDER = "nolo";

/**
 * 默认挂载的**通用**工具（不新增任何 zlib 专用业务工具）：
 * skill 资产物化 → sandbox shell 执行 → 产物提交进空间 / 个人存储，
 * 加上凭据安全收集与空间读写。全端（Web / RN / 桌面 / CLI）同一套。
 * `--tools` 显式传入时整体覆盖这组默认值。
 */
export const DEFAULT_EBOOK_AGENT_TOOLS = [
  "execShell",
  "materializeSkillAssets",
  "commitSandboxArtifact",
  "secret-request",
  "listUserSpaces",
  "readSpace",
];

/** `AgentRuntimeShellPolicy` 目前没有 allowlist 网络枚举，白名单只能作为扩展字段携带。 */
type ShellPolicyExtras = {
  allowedEgressDomains?: string[];
  allowedSecrets?: string[];
};

/**
 * 默认 Agent 的托管执行策略，形状对齐 `docs/web-hosted-executable-runtime.md`
 * 的 Web 默认策略。
 *
 * 类型真值（`packages/agent-runtime/types.ts:272-280`）：
 * `networkPolicy?: "default-deny" | "allowed" | "approval"` —— **没有** `"allowlist"`。
 * 所以这里用值合法的 `"default-deny"`，把允许出网的域名与允许读取的 secret 名
 * 放在扩展字段 `allowedEgressDomains` / `allowedSecrets` 里（`normalizeAgentRuntimeToolPolicy`
 * 对 `shell` 是整体展开保留，不会丢弃这两个字段）。
 */
export const EBOOK_AGENT_RUNTIME_TOOL_POLICY: AgentRuntimeToolPolicy & {
  shell: AgentRuntimeShellPolicy & ShellPolicyExtras;
} = {
  version: 1,
  runtimeTools: ["execShell"],
  workspace: { mode: "lease" },
  shell: {
    enabled: true,
    commandPolicy: "approval",
    networkPolicy: "default-deny",
    allowedEgressDomains: [
      "1lib.sk",
      "article.sk",
      "articles.sk",
      "z-lib.by",
      "z-lib.fm",
      "z-lib.gd",
      "z-lib.gl",
      "z-lib.sk",
      "z-library.ec",
      "z-library.im",
      "z-library.qa",
      "z-library.sk",
      "z-library.website",
      "zlib.bz",
    ],
    allowedSecrets: ["ZLIB_USER_ID", "ZLIB_USER_KEY", "ZLIB_DOMAIN"],
  },
  isolation: { mode: "os-sandbox" },
};

/**
 * 本 Agent 的系统提示词。
 *
 * 独立导出成可读常量便于 review 与复用：这里只有业务规则，没有凭据、没有
 * 用户私有标识。所有涉及用户账号的敏感动作（登录、cookie、密码）都不经过对话。
 */
export const EBOOK_DOWNLOADER_SYSTEM_PROMPT = `你是「电子书下载助手」，帮用户在自己的 Z-Library 账号额度内找书、下载、并把书放到他想要的位置。

# 边界（先记住）
- 你只操作用户本人的账号。绝不索取、复述或保存密码、cookie、token；用户主动要贴进来时要先阻止。
- 每一次下载都会扣用户自己的下载额度，所以「先确认再下载」比「多下一份」重要。
- 不确定的事就说不知道，不要编造书名、版本、年份或链接。

# 0. 工作机制：通用执行底座 + executable skill（重要）
你没有 zlib 专用业务工具。你手上是一组**通用**工具，全端（Web、手机 App、桌面、CLI）都可用：
- \`materializeSkillAssets({ skill: "zlib" })\`：把 zlib skill 的脚本与依赖物化到当前 workspace。
- \`execShell\`：在 sandbox workspace 里执行命令。
- \`commitSandboxArtifact\`：把 workspace 里的产物提交进空间或个人存储，返回 \`fileKey\` 与 \`downloadUrl\`（**不返回 pageUrl**，阅读页链接要你自己拼，见第 5 节）。
- \`secret-request\`：在受控面板里安全收集凭据（不进对话、不写聊天记录）。
- \`listUserSpaces\`：列出当前用户可写的空间。
- \`readSpace\`：读空间内容，判断是否已有同名/同一本书。

固定顺序（不要跳步，也不要自己发明工具名）：
1. \`materializeSkillAssets({ skill: "zlib" })\`
2. \`execShell\` 跑 \`bun work/skills/zlib/zlib.ts <子命令> …\`（profile / search / download）
3. 下载产物落在 \`output/<书名 - 作者.epub>\`
4. \`commitSandboxArtifact\` 把该产物提交到用户选定的落点

# 1. 首次使用：绑定用户自己的 Z-Library 账号
- 先跑 \`bun work/skills/zlib/zlib.ts profile --json\` 看登录态与额度。
- 退出码 3（缺凭据）时，用一两句话温和说明：账号按用户隔离，凭据不经过这段对话，也不会写进聊天记录。
- 然后调 \`secret-request\` 收集 \`ZLIB_USER_ID\` 与 \`ZLIB_USER_KEY\`（域名可另收 \`ZLIB_DOMAIN\`），由用户在弹出的面板里填写。
- **严禁**让用户把密码、cookie、token 明文贴进对话；用户主动要贴时先制止，并改为引导 \`secret-request\`。
- 连不上、域名不可达时，跑 \`bun work/skills/zlib/zlib.ts doctor --json\` 拿到真实诊断再给下一步，不要猜。
- 用户明确说「不想登录」时，说明没有账号就无法下载，并给出替代路径（比如只做检索建议），不要偷偷换别的账号。

# 2. 额度与防重复
- 每次下载前先跑 \`… zlib.ts profile --json\`：
  - 剩余额度为 0：直接告诉用户今天额度用完了（返回里有下次可用时间就说），不要再尝试下载。
  - 额度紧张（≤2）：提醒这是最后一两次，先和用户确认要哪一本。
- 写入任何落点前，先 \`readSpace\` 检查是否已有同名或同一本书的文件；有就告诉用户「这本已经有了」，不要为了省事重复下载。
- 下载失败不要立刻重试多次：先看错误（额度、域名、404、超时），把原因告诉用户；同一本连续失败两次就停下问用户，不要刷额度。

# 3. 找书与挑版本
- 用 \`… zlib.ts search --json "<关键词>"\` 拿候选，然后把关键信息列清楚：书名、作者、语言（简/繁/英）、出版社、年份、页数、文件体积、格式、评分。
- 给出你的推荐和理由（例如：同样的书优先推荐官方出版社的简体版、页数最全、体积合理、评分高）。
- 有简繁差异、不同译者、不同版本、不同格式（epub/pdf/mobi）时，先让用户选，不要替用户决定。
- 只有「唯一高匹配 + 用户已明确说要下载」时才直接下载；只要有歧义就先确认。
- 用户说不清书名时，先给 2-3 个最可能的候选让他认，不要一次列几十个。

# 4. 下载与落点
- 下载命令：\`bun work/skills/zlib/zlib.ts download --id <书id> --out output/"<书名> - <作者>.<ext>"\`，产物必须是规整后的文件名。
- 落点四类（在空间对话里默认第 1 类；其余先问用户想放哪）。**参数名必须精确**：
  1. **当前空间（默认）**：\`commitSandboxArtifact\` 传 \`principalKind: "space"\`，\`spaceId\` 可省略（默认落到当前空间），也可显式传当前空间 ID。
  2. **用户选定的其他空间**：先 \`listUserSpaces\` 列出他有写权限的空间让他挑，再传 \`principalKind: "space"\` + \`spaceId: "<选定的空间 ID>"\`。
     - 目标空间是公开（\`visibility: public\`）时，必须先明确提醒「这个空间是公开的，上传后其他人也能看到并下载」，用户明确同意后才传 \`confirmPublicSpace: true\`。
  3. **个人私有持久存储（空间外）**：必须传 \`principalKind: "user"\`（这是唯一正确的写法；不要自造 \`target\` 之类的参数名，也别只传 spaceId——传错会误落进当前空间）。这条不写任何空间记录，只有用户自己能看到。
  4. **本机本地目录 / 各端保存**：用返回的 \`downloadUrl\` 让各端自己收下（Web 走浏览器下载、手机走系统保存）；只有桌面端或 CLI 且确实具备本机 shell 时，才可以把文件落盘到 \`~/Downloads\` 或用户指定路径，并给出完整绝对路径。覆盖同名文件前必须先问。

# 5. 干净命名与收尾
- 产物文件名一律用 \`"<书名> - <作者>.<ext>"\`，不要把站点给的随机长文件名、括号编号、外文符号原样留下；扩展名要跟真实格式一致。
- 阅读页链接要按 \`commitSandboxArtifact\` 返回的 \`fileKey\` 自己拼（工具不返回 pageUrl）：
  - 落到空间：\`<origin>/space/<spaceId>/<fileKey>\`
  - 落到个人私有存储：\`<origin>/<fileKey>\`
  - \`<origin>\` 用当前服务地址（如 \`https://nolo.chat\`），\`<fileKey>\` 原样使用，不要改写或加前缀。
- 收尾必须同时给出：可点击的阅读页链接（上面拼出的那条）与 \`downloadUrl\` 直链（供另存到本地）。
- 收尾时用固定格式回报：书名 / 作者 / 格式与体积 / 落到哪里 / 阅读页链接 / downloadUrl。下载失败或额度不足时同样明确说清失败原因。

# 6. 可选外发（默认不做）
- 只有用户明确提到 Kindle、微信读书（WeRead）等设备或服务时才投递；没提到就不要主动推送、不要主动承诺「已发送到你的 Kindle」。
- 投递失败要如实说失败原因，不要说成成功。

# 回复风格
- 中文回答，短句，先给结论再给理由。
- 不输出工具返回的原始 JSON 长串、不贴 cookie 或 token、不贴账号密码。
- 拿不准的信息标成「待确认」，不要把推测写成事实。`;

function buildEbookDownloaderPrompt(skillDocKey: string | null): string {
  if (!skillDocKey) return EBOOK_DOWNLOADER_SYSTEM_PROMPT;
  return [
    EBOOK_DOWNLOADER_SYSTEM_PROMPT,
    "",
    "# 关联 Skill",
    `Z-Library 操作细节见 skill 文档 \`${skillDocKey}\`（用 doc 读取能力按需查阅）。遇到本提示词没覆盖的 zlib 用法，先读它再动手，不要猜参数。`,
  ].join("\n");
}

function readFlagValue(args: string[], flag: string) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function hasFlag(args: string[], flag: string) {
  return args.includes(flag);
}

function parseUserIdFromToken(token: string) {
  const payload = token.split(".")[1];
  if (!payload) return undefined;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const parsed = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    return asOptionalTrimmedString(parsed?.userId);
  } catch {
    return undefined;
  }
}

/**
 * 由 userId 确定性派生默认 agent id 里的所有者片段。
 *
 * Ask: 默认 agent id 曾经是全局常量，于是不同用户各自执行一次默认命令都会写
 * 同一条 `agent-pub-<id>` 公开记录，互相覆盖。片段进 id 后，默认公开 key 天然
 * 按所有者隔离，用户显式传 `--agent-id` 时仍然尊重显式值。
 *
 * 用 FNV-1a 64 位散列而不是拼接 userId：userId 可能含 `-`，直接拼会产出
 * `agent-<userId>-…` 的歧义 key；散列固定为 8 位大写 base36，只含 A-Z0-9。
 * 这是隔离用的确定性标识，不是安全边界。
 */
export function ownerFragmentForAgentId(userId: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (const byte of new TextEncoder().encode(userId)) {
    hash ^= BigInt(byte);
    hash = (hash * prime) & mask;
  }
  return hash.toString(36).toUpperCase().padStart(8, "0").slice(0, 8);
}

/** 默认 agent id：`01EBOOKDL` + 所有者片段（8 位）+ 序号，长度与既有 agent id 一致（24）。 */
export function defaultEbookDownloaderAgentId(userId: string): string {
  return `01EBOOKDL${ownerFragmentForAgentId(userId)}0000001`;
}

function parseToolsArg(raw: string | undefined): string[] | null {
  if (raw === undefined) return null;
  const tools = raw
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  return tools.length ? tools : null;
}

/**
 * `--agent` / 写入目标必须落在当前用户的私有命名空间里。
 *
 * Ask: 这个命令会把 apiKey / 私有端点写进它操作的那条记录。一旦目标 key 是
 * `agent-pub-*`（公开、所有人可读）或别人家的 `agent-<other>-*`，调用方就能用
 * 一个"看起来像参数错误"的方式把私有凭据写进公开记录。这里在任何网络动作之前
 * 就按命名空间拒绝，而不是事后过滤载荷。
 */
export function assertOwnedAgentNamespace(args: { targetAgentKey: string; userId: string }) {
  const key = args.targetAgentKey;
  if (key.startsWith(PUBLIC_AGENT_KEY_PREFIX)) {
    throw new Error(
      `--agent cannot point at a public record (${key}): public agent records are readable by everyone and must never receive private credentials. Pass your own agent-${args.userId}-… key.`,
    );
  }
  if (!isOwnedAgentKey(key, args.userId)) {
    throw new Error(
      `--agent must live in the current user's namespace (agent-${args.userId}-…), got: ${key}`,
    );
  }
}

export function parseEbookDownloaderArgs(args: string[], env: EnvLike): ParsedArgs | null {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) return null;
  const serverUrl = normalizeServerOrigin(
    readFlagValue(args, "--server") ??
      readFlagValue(args, "--server-url") ??
      env.NOLO_SERVER ??
      env.BASE_URL ??
      DEFAULT_NOLO_SERVER_URL
  );
  const authToken = readFlagValue(args, "--token") ?? env.AUTH_TOKEN ?? env.NOLO_AUTH_TOKEN ?? "";
  const userId =
    readFlagValue(args, "--user-id") ??
    env.NOLO_USER_ID ??
    parseUserIdFromToken(authToken) ??
    DEFAULT_USER_ID;
  const targetAgentId =
    readFlagValue(args, "--agent-id") ??
    env.NOLO_EBOOK_DOWNLOADER_AGENT_ID ??
    defaultEbookDownloaderAgentId(userId);
  const targetAgentKey =
    readFlagValue(args, "--agent") ??
    readFlagValue(args, "--target-agent") ??
    env.NOLO_EBOOK_DOWNLOADER_AGENT_KEY ??
    ownedAgentKey(userId, targetAgentId);
  const spaceIdRaw = readFlagValue(args, "--space");
  const skillDocRaw = readFlagValue(args, "--skill-doc");
  assertOwnedAgentNamespace({ targetAgentKey, userId });
  return {
    serverUrl,
    authToken,
    userId,
    targetAgentId,
    targetAgentKey,
    spaceId: spaceIdRaw?.trim() ? spaceIdRaw.trim() : null,
    name:
      readFlagValue(args, "--name") ??
      env.NOLO_EBOOK_DOWNLOADER_AGENT_NAME ??
      DEFAULT_AGENT_NAME,
    publicAgent: hasFlag(args, "--public"),
    model: asOptionalTrimmedString(readFlagValue(args, "--model")) ?? null,
    apiSource: asOptionalTrimmedString(readFlagValue(args, "--api-source")) ?? null,
    copyProviderFrom: asOptionalTrimmedString(readFlagValue(args, "--copy-provider-from")) ?? null,
    customProviderUrl: asOptionalTrimmedString(readFlagValue(args, "--custom-provider-url")) ?? null,
    apiKey:
      asOptionalTrimmedString(
        readFlagValue(args, "--api-key") ?? readFlagValue(args, "--provider-api-key")
      ) ?? null,
    tools: parseToolsArg(readFlagValue(args, "--tools")),
    // 只有显式传 --skill-doc 才覆盖；传空串表示不要 skill 指针。
    skillDocKey:
      skillDocRaw === undefined ? DEFAULT_EBOOK_SKILL_DOC_KEY : skillDocRaw.trim() || null,
    json: hasFlag(args, "--json"),
  };
}

/**
 * 公开模式 + 私人凭据的组合在任何网络动作之前就拒绝。
 *
 * Ask: `--public` 写的是所有人可读的 `agent-pub-*` 记录，一旦把调用方自己的
 * apiKey / 私有 OAuth 端点写进去，等于把凭据发布出去。这里一次性拦住两种入口
 * （显式 `--api-key` 与 `--copy-provider-from`），而不是等到写载荷时再过滤。
 */
function assertPublicModeHasNoPrivateCredentials(parsed: ParsedArgs) {
  if (!parsed.publicAgent) return;
  if (parsed.apiKey) {
    throw new Error(
      "--public cannot be combined with --api-key: a public agent record is readable by everyone and must never carry a private key. Publish with --model (platform model) instead.",
    );
  }
  if (parsed.copyProviderFrom) {
    throw new Error(
      "--public cannot be combined with --copy-provider-from: copying a private agent's credentials into a public record would publish them. Publish with --model (platform model) instead.",
    );
  }
}

function printUsage(output: OutputLike) {
  output.write(
    [
      "Usage: nolo agent setup-ebook-downloader [options]",
      "",
      "Creates or updates the 「电子书下载助手」agent record (idempotent).",
      "",
      "Options:",
      "  --server <url>                 API target. Defaults to NOLO_SERVER or the public host.",
      "  --token <jwt>                  Auth token (`nolo login`), or AUTH_TOKEN.",
      "  --name <name>                  Agent display name. Default: 电子书下载助手",
      "  --agent-id <id>                Agent id to create/update (default is owner-scoped).",
      "  --agent <key>                  Full agent record key (defaults to the owner-scoped key).",
      "  --public                       Publish the agent record under the public key.",
      "  --space <spaceId>              Also attach the agent to this space's contents.",
      "  --model <id>                   Model id. Default: deepseek-flash on the platform model.",
      "  --api-source platform|custom   Where the credential comes from.",
      "  --copy-provider-from <agent>   Copy model/provider credentials from an existing agent you own.",
      "  --custom-provider-url <url>    Custom OpenAI-compatible endpoint (with --api-key).",
      "  --api-key <key>                Provider key. Prefer `nolo secret run --with <name> -- ...`.",
      `  --tools <a,b>                  Override the default tool set (${DEFAULT_EBOOK_AGENT_TOOLS.join(", ")}).`,
      `  --skill-doc <pageKey>          Linked skill doc. Default: ${DEFAULT_EBOOK_SKILL_DOC_KEY}`,
      '  --skill-doc ""                 Do not link any skill doc.',
      "  --json                         Print machine-readable JSON.",
      "",
      "Safety: --public refuses --api-key / --copy-provider-from outright. A public",
      "agent runs on the platform model (deepseek-flash) and its public record is a",
      "whitelisted payload with no key, endpoint or OAuth field in it.",
      "",
    ].join("\n")
  );
}

type DbReadResult =
  | { ok: true; record: Record<string, any> | null }
  | { ok: false; status: number; detail: string };

/**
 * 读一条记录，但**只把 404 当作「不存在」**。
 *
 * Ask: 早期版本把任何读失败都当成「没有旧记录」，于是 403 / 5xx / 网络抖动
 * 都会让后续写入用一个空对象覆盖掉已有的 agent 记录。同样地，一个 2xx 但
 * 返回非 JSON 或空对象的响应也**不是**「不存在」——那是异常，必须中止。
 */
async function readDbRecordOrNull(args: {
  fetchImpl: CliFetchImpl;
  serverUrl: string;
  authToken: string;
  dbKey: string;
}): Promise<DbReadResult> {
  const res = await args.fetchImpl(
    `${args.serverUrl}/api/v1/db/read/${encodeURIComponent(args.dbKey)}`,
    { headers: { Authorization: `Bearer ${args.authToken}` } }
  );
  const rawText = await res.text();
  if (res.status === 404) return { ok: true, record: null };
  if (!res.ok) {
    return { ok: false, status: res.status, detail: rawText.slice(0, 300) };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(
      `read ${args.dbKey} returned HTTP ${res.status} but the body is not JSON; refusing to treat that as "no record" and overwrite it. Body starts with: ${rawText.slice(0, 120)}`,
    );
  }
  // 响应显式带 `data` 键时必须取 `parsed.data`（含 `data: null`），不能回退到外层
  // 信封对象——否则 `{ data: null }` 会被当成"记录存在"或者反过来被误当空对象。
  const hasDataKey =
    parsed !== null &&
    typeof parsed === "object" &&
    Object.prototype.hasOwnProperty.call(parsed, "data");
  const candidate = hasDataKey ? (parsed as any).data : parsed;
  if (
    !candidate ||
    typeof candidate !== "object" ||
    Array.isArray(candidate) ||
    Object.keys(candidate as Record<string, unknown>).length === 0
  ) {
    throw new Error(
      `read ${args.dbKey} returned HTTP ${res.status} with ${hasDataKey ? "data: " : ""}${JSON.stringify(hasDataKey ? (parsed as any).data : null)}; refusing to treat that as "no record" and overwrite it.`,
    );
  }
  return { ok: true, record: candidate as Record<string, any> };
}

async function readDbRecordOrThrow(args: {
  fetchImpl: CliFetchImpl;
  serverUrl: string;
  authToken: string;
  dbKey: string;
}) {
  const result = await readDbRecordOrNull(args);
  if (!result.ok) {
    throw new Error(`read ${args.dbKey} failed (${result.status}): ${result.detail}`);
  }
  return result.record;
}

async function writeDbRecord(args: {
  fetchImpl: CliFetchImpl;
  serverUrl: string;
  authToken: string;
  userId: string;
  dbKey: string;
  data: Record<string, any>;
}) {
  const res = await args.fetchImpl(`${args.serverUrl}/api/v1/db/write/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.authToken}`,
    },
    body: JSON.stringify({
      customKey: args.dbKey,
      userId: args.userId,
      data: { ...args.data, dbKey: args.dbKey },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`write ${args.dbKey} failed (${res.status}): ${JSON.stringify(data)}`);
  }
}

type ProviderFields = {
  model: string;
  provider: string;
  apiSource: string;
  apiKey?: string;
  customProviderUrl?: string;
  apiKeyHeader?: string;
};

/**
 * 决定这个 agent 用哪个模型/凭据。
 *
 * 优先级：`--copy-provider-from`（用户显式指定的来源 agent）→ 显式 `--model` /
 * `--api-source` → 平台默认模型。
 *
 * 公开模式由 `assertPublicModeHasNoPrivateCredentials` 先行拦截私人凭据入口，
 * 所以走到这里的公开 agent 只可能是平台模型或调用方显式给的模型。
 */
function resolveProviderFields(args: {
  parsed: ParsedArgs;
  sourceAgent: Record<string, any> | null;
}): ProviderFields {
  const { parsed, sourceAgent } = args;

  if (sourceAgent) {
    if (!sourceAgent.apiKey && !sourceAgent.apiKeyRef) {
      throw new Error("--copy-provider-from agent has no apiKey; cannot copy its credentials.");
    }
    if (!sourceAgent.model) {
      throw new Error("--copy-provider-from agent has no model field; cannot copy its credentials.");
    }
    return {
      model: parsed.model ?? sourceAgent.model,
      provider: sourceAgent.provider ?? "custom",
      apiSource: parsed.apiSource ?? sourceAgent.apiSource ?? "custom",
      apiKey: sourceAgent.apiKey,
      customProviderUrl: sourceAgent.customProviderUrl,
      apiKeyHeader: sourceAgent.apiKeyHeader ?? "api-key",
    };
  }

  const apiSource = parsed.apiSource ?? (parsed.apiKey || parsed.customProviderUrl ? "custom" : "platform");
  if (apiSource === "platform") {
    return {
      model: parsed.model ?? PLATFORM_DEFAULT_MODEL,
      provider: PLATFORM_PROVIDER,
      apiSource: "platform",
    };
  }
  if (apiSource !== "custom") {
    throw new Error(`--api-source must be either "platform" or "custom", got: ${apiSource}`);
  }
  if (!parsed.model) {
    throw new Error('--api-source custom requires --model (e.g. --model glm-5.3).');
  }
  return {
    model: parsed.model,
    provider: "custom",
    apiSource: "custom",
    apiKey: parsed.apiKey ?? undefined,
    customProviderUrl: parsed.customProviderUrl ?? undefined,
    apiKeyHeader: "api-key",
  };
}

/**
 * 公开副本的严格白名单字段。
 *
 * 这些字段都是「公开语义」本身需要的；任何凭据/端点/密钥引用字段一律不在此列，
 * 于是构造公开记录时它们连出现的机会都没有（不靠过滤黑名单）。
 */
const PUBLIC_AGENT_FIELD_WHITELIST = [
  "id",
  "type",
  "name",
  "description",
  "prompt",
  "isPublic",
  "model",
  "provider",
  "apiSource",
  "temperature",
  "maxTokens",
  "category",
  "tags",
  "skillDocKey",
  "runtimeToolPolicy",
  "tools",
  "userId",
  "createdAt",
  "updatedAt",
] as const;

/** 不进入公开副本的私有字段（写在这里仅用于自检与说明，运行时不依赖它）。 */
const PRIVATE_AGENT_FIELDS = [
  "apiKey",
  "apiKeyRef",
  "apiKeyHeader",
  "customProviderUrl",
  "oauthToken",
  "oauthTokens",
  "oauthTokenStore",
] as const;

export function buildPublicAgentRecord(record: Record<string, any>): Record<string, any> {
  const published: Record<string, any> = {};
  for (const field of PUBLIC_AGENT_FIELD_WHITELIST) {
    if (record[field] !== undefined) published[field] = record[field];
  }
  published.isPublic = true;
  for (const field of PRIVATE_AGENT_FIELDS) delete published[field];
  return published;
}

/**
 * 写 `agent-pub-*` 的唯一入口。
 *
 * 守卫有两层：目标 key 必须是公开键前缀；载荷必须先过 `buildPublicAgentRecord`
 * 白名单，且过滤后仍不得出现任何私有字段（防御性自检，失败即中止，绝不"尽量写"）。
 * 任何调用方都不得把 `target` 直接交给公开写入。
 */
async function writePublicAgentRecord(args: {
  fetchImpl: CliFetchImpl;
  serverUrl: string;
  authToken: string;
  userId: string;
  publicKey: string;
  target: Record<string, any>;
}) {
  if (!args.publicKey.startsWith(PUBLIC_AGENT_KEY_PREFIX)) {
    throw new Error(
      `refusing to write a public record to a non-public key (${args.publicKey}).`,
    );
  }
  const payload = buildPublicAgentRecord(args.target);
  for (const field of PRIVATE_AGENT_FIELDS) {
    if (payload[field] !== undefined) {
      throw new Error(
        `refusing to publish ${args.publicKey}: private field ${field} survived the whitelist.`,
      );
    }
  }
  await writeDbRecord({
    fetchImpl: args.fetchImpl,
    serverUrl: args.serverUrl,
    authToken: args.authToken,
    userId: args.userId,
    dbKey: args.publicKey,
    data: payload,
  });
}

/**
 * 覆盖一条已存在记录前的统一守卫：必须是 agent 记录，且归属可验证为当前用户。
 *
 * 归属口径（收紧后的规则）：`userId` 与 `ownerId` 只要出现就必须全部等于当前
 * 用户；两者都缺失视为「归属不可验证」，同样拒绝。只凭 key 前缀判断归属是不够
 * 的——私有键前缀共享、公开键跨用户复用的场景下，key 与记录内容可能对不上。
 */
function assertRecordIsReplaceableAgent(args: {
  record: Record<string, any>;
  userId: string;
  label: string;
}) {
  const recordType = asOptionalTrimmedString(args.record.type);
  if (recordType && recordType !== "agent") {
    throw new Error(
      `${args.label} is not an agent record (type: ${recordType}); refusing to overwrite it.`,
    );
  }
  const recordUserId = asOptionalTrimmedString(args.record.userId);
  const recordOwnerId = asOptionalTrimmedString(args.record.ownerId);
  const claims = [recordUserId, recordOwnerId].filter((value): value is string => Boolean(value));
  if (!claims.length) {
    throw new Error(
      `${args.label} has no verifiable owner (userId and ownerId are both missing); refusing to overwrite it.`,
    );
  }
  const foreign = claims.find((value) => value !== args.userId);
  if (foreign) {
    throw new Error(
      `${args.label} belongs to ${foreign}; refusing to overwrite another owner's record.`,
    );
  }
}

/**
 * 覆盖公开记录前先确认它属于当前用户。
 *
 * Ask: 服务端写入的原子校验另行补齐，CLI 侧不能因此"先写了再说"。这里先读公开键：
 * 404 = 可以创建；已存在且归属（`userId` + `ownerId`）就是当前用户 = 可以更新；
 * 否则拒绝，绝不覆盖别人的公开记录。
 */
async function assertPublicRecordIsWritable(args: {
  fetchImpl: CliFetchImpl;
  serverUrl: string;
  authToken: string;
  publicKey: string;
  userId: string;
}) {
  const existing = await readDbRecordOrNull({
    fetchImpl: args.fetchImpl,
    serverUrl: args.serverUrl,
    authToken: args.authToken,
    dbKey: args.publicKey,
  });
  if (!existing.ok) {
    throw new Error(
      `cannot verify public record ${args.publicKey} (HTTP ${existing.status}); refusing to overwrite it: ${existing.detail}`,
    );
  }
  if (!existing.record) return;
  assertRecordIsReplaceableAgent({
    record: existing.record,
    userId: args.userId,
    label: `public agent ${args.publicKey}`,
  });
}

/** 本命令管理的字段：更新时这些字段取新值，其余字段保持旧记录原样。 */
function buildManagedAgentFields(args: {
  parsed: ParsedArgs;
  provider: ProviderFields;
  now: number;
}) {
  const { parsed, provider, now } = args;
  const fields: Record<string, any> = {
    id: parsed.targetAgentId,
    type: "agent",
    name: parsed.name,
    description:
      "在用户自己的 Z-Library 账号额度内找书、挑版本、下载，并把电子书提交到当前空间、指定空间、个人私有存储或本机目录，最后给出可直接阅读的链接。",
    prompt: buildEbookDownloaderPrompt(parsed.skillDocKey),
    isPublic: parsed.publicAgent,
    model: provider.model,
    provider: provider.provider,
    apiSource: provider.apiSource,
    category: "document-tools",
    tags: ["ebook", "z-library", "download", "document-tools"],
    skillDocKey: parsed.skillDocKey,
    tools: parsed.tools ?? DEFAULT_EBOOK_AGENT_TOOLS,
    runtimeToolPolicy: EBOOK_AGENT_RUNTIME_TOOL_POLICY,
    userId: parsed.userId,
    updatedAt: now,
  };
  if (provider.apiKey) fields.apiKey = provider.apiKey;
  if (provider.customProviderUrl) fields.customProviderUrl = provider.customProviderUrl;
  if (provider.apiKeyHeader) fields.apiKeyHeader = provider.apiKeyHeader;
  return fields;
}

function buildTargetAgent(args: {
  parsed: ParsedArgs;
  provider: ProviderFields;
  now: number;
  existing: Record<string, any> | null;
}): Record<string, any> {
  const { parsed, provider, now, existing } = args;
  const managed = buildManagedAgentFields({ parsed, provider, now });
  // 已有记录：保留非本命令管理的字段（temperature / maxTokens / 别名等）。
  // 新记录：给出稳定的默认值。
  const base: Record<string, any> = existing
    ? { ...existing }
    : {
        temperature: 0.2,
        maxTokens: 4096,
        createdAt: now,
      };
  return { ...base, ...managed, createdAt: base.createdAt ?? now };
}

async function attachAgentToSpace(args: {
  fetchImpl: CliFetchImpl;
  parsed: ParsedArgs;
  contentKey: string;
  title: string;
  now: number;
}) {
  const spaceKey = `space-${args.parsed.spaceId}`;
  const space = await readDbRecordOrThrow({
    fetchImpl: args.fetchImpl,
    serverUrl: args.parsed.serverUrl,
    authToken: args.parsed.authToken,
    dbKey: spaceKey,
  });
  if (!space) throw new Error(`space ${args.parsed.spaceId} not found.`);
  await writeDbRecord({
    fetchImpl: args.fetchImpl,
    serverUrl: args.parsed.serverUrl,
    authToken: args.parsed.authToken,
    userId: args.parsed.userId,
    dbKey: spaceKey,
    data: {
      ...space,
      contents: {
        ...(space.contents ?? {}),
        [args.contentKey]: {
          ...(space.contents?.[args.contentKey] ?? {}),
          title: args.title,
          type: "agent",
          contentKey: args.contentKey,
          createdAt: space.contents?.[args.contentKey]?.createdAt ?? args.now,
          updatedAt: args.now,
        },
      },
      updatedAt: args.now,
    },
  });
}

export async function runSetupEbookDownloaderAgentCommand(
  args: string[],
  deps: SetupEbookDownloaderDeps = {}
) {
  const env = deps.env ?? process.env;
  const output = deps.output ?? process.stdout;
  let parsed: ParsedArgs | null;
  try {
    parsed = parseEbookDownloaderArgs(args, env);
  } catch (error) {
    // 参数/命名空间校验必须发生在任何网络动作之前，且要按命令失败返回而不是抛栈。
    output.write(`setup-ebook-downloader failed: ${toErrorMessage(error)}\n`);
    return 1;
  }
  if (!parsed) {
    printUsage(output);
    return 1;
  }
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now?.() ?? Date.now();

  try {
    // 任何网络动作（含读）之前先拒绝「公开 + 私人凭据」。
    assertPublicModeHasNoPrivateCredentials(parsed);

    const sourceAgent = parsed.copyProviderFrom
      ? await readDbRecordOrThrow({
          fetchImpl,
          serverUrl: parsed.serverUrl,
          authToken: parsed.authToken,
          dbKey: parsed.copyProviderFrom,
        })
      : null;

    const provider = resolveProviderFields({ parsed, sourceAgent });

    // 幂等：404 = 尚无记录；403 / 5xx / 网络异常一律中止，绝不覆盖。
    const existingResult = await readDbRecordOrNull({
      fetchImpl,
      serverUrl: parsed.serverUrl,
      authToken: parsed.authToken,
      dbKey: parsed.targetAgentKey,
    });
    if (!existingResult.ok) {
      throw new Error(
        `cannot verify existing agent ${parsed.targetAgentKey} (HTTP ${existingResult.status}); refusing to overwrite it: ${existingResult.detail}`,
      );
    }
    // 键前缀一致 ≠ 记录归属一致：既有记录同样要用同一套归属校验。
    // 非 agent 记录（type 存在且不是 "agent"）也不得被本命令的写入覆盖。
    if (existingResult.record) {
      assertRecordIsReplaceableAgent({
        record: existingResult.record,
        userId: parsed.userId,
        label: `existing record ${parsed.targetAgentKey}`,
      });
    }
    const priorAgent = existingResult.record ?? null;

    const target = buildTargetAgent({
      parsed,
      provider,
      now,
      existing: priorAgent,
    });

    // 写入前再确认一次目标命名空间（parse 已校验，这里是写入前的最后一道）。
    assertOwnedAgentNamespace({ targetAgentKey: parsed.targetAgentKey, userId: parsed.userId });

    const publicKey = publicAgentKey(parsed.targetAgentId);
    // 检查必须发生在任何写入之前：别人的公开记录一条都不许被覆盖。
    if (parsed.publicAgent) {
      await assertPublicRecordIsWritable({
        fetchImpl,
        serverUrl: parsed.serverUrl,
        authToken: parsed.authToken,
        publicKey,
        userId: parsed.userId,
      });
    }

    await writeDbRecord({
      fetchImpl,
      serverUrl: parsed.serverUrl,
      authToken: parsed.authToken,
      userId: parsed.userId,
      dbKey: parsed.targetAgentKey,
      data: target,
    });
    if (parsed.publicAgent) {
      await writePublicAgentRecord({
        fetchImpl,
        serverUrl: parsed.serverUrl,
        authToken: parsed.authToken,
        userId: parsed.userId,
        publicKey,
        target,
      });
    }
    if (parsed.spaceId) {
      await attachAgentToSpace({
        fetchImpl,
        parsed,
        contentKey: parsed.publicAgent ? publicKey : parsed.targetAgentKey,
        title: parsed.name,
        now,
      });
    }

    const result = {
      serverUrl: parsed.serverUrl,
      agentKey: parsed.targetAgentKey,
      agentUrl: `${parsed.serverUrl}/${parsed.targetAgentKey}`,
      publicKey: parsed.publicAgent ? publicKey : null,
      name: parsed.name,
      isPublic: parsed.publicAgent,
      spaceId: parsed.spaceId,
      model: target.model,
      provider: target.provider,
      apiSource: target.apiSource,
      copiedFrom: parsed.copyProviderFrom,
      skillDocKey: parsed.skillDocKey,
      tools: target.tools ?? null,
      runtimeToolPolicy: target.runtimeToolPolicy ?? null,
      created: !priorAgent,
    };
    if (parsed.json) {
      output.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      output.write(
        [
          `${result.created ? "created" : "updated"}: ${result.agentKey}`,
          `url: ${result.agentUrl}`,
          `name: ${result.name}`,
          `model: ${result.model} (${result.apiSource})`,
          `visibility: ${result.isPublic ? "public" : "private"}`,
          ...(result.spaceId ? [`space: ${result.spaceId}`] : []),
          ...(result.skillDocKey ? [`skill doc: ${result.skillDocKey}`] : []),
          `tools: ${(result.tools ?? []).join(", ")}`,
          "",
        ].join("\n")
      );
    }
    return 0;
  } catch (error) {
    output.write(`setup-ebook-downloader failed: ${toErrorMessage(error)}\n`);
    return 1;
  }
}
