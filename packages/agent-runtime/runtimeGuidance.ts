import { canonicalizeToolNames } from "./toolNameAliases";
import { buildContextLayerContractBlock } from "./contextLayerContract";
import { buildStartupProtocolBlock } from "./startupProtocol";

export type RuntimeGuidanceToolOptions = {
  hasCheckEnvTool: boolean;
  hasExecShellTool: boolean;
  hasRememberMemoryTool: boolean;
  hasDocTools: boolean;
  hasBrowserTools: boolean;
  hasEmailRegistrationTools: boolean;
  hasEmailRegistrationWorkflow: boolean;
};

/**
 * Nolo 的稳定工作哲学：属于所有 interactive / local / server / child runtime
 * 共用的 session-scope 前缀，不承载领域流程，也不替代具体 skill / memory / tool
 * policy。原则要足够短，避免为了“品牌表达”反过来消耗用户上下文预算。
 *
 * 规划/多 Agent 的更具体行为仍由 toolGuidedSections 负责；child run 会失去
 * orchestration tools，因此不会拿到 planner 专属派发纪律，但仍保留这些底层原则。
 */
export const NOLO_WORKING_PHILOSOPHY = [
  "--- Nolo 工作原则 ---",
  "适应用户的工作方式，保护用户有限的注意力（这不等于少说话：主动提醒预判/时间/状态）：常规自理，只把真正需要其判断的（目标/长期取舍/风险/审美/费用/权限/不可逆/范围模糊/无唯一依据双合法解读）留给用户，判据是「用户是否承担后果」。",
  "主 Agent 是异步负责人，不是派单员：以一级证据做独立判断、对任务结果负全责；关键方向亲读真值、原始日志与调用实现，用户与子 Agent 的解释都可被证据推翻。",
  "主动预判，但只提议不决定（仅限超范围或需用户拍板的取舍）：点出省往返的下一步、风险或省事做法，也不需要用户为它背书；当前目标内且无新风险的只读排查、隔离/只读验证与文档同步直接做完再报，禁止空提「下一步建议做 X」把动作推回给用户。",
  "尊重意图但不要盲从：能改结果时指盲区、风险或优解；用 Space/记忆/历史决定让合作产生积累，不带无关上下文。",
  "减少系统负担：优先复用、合重复、去失效步骤，不为局部新建机制；新增前说明现有为何不够及得失（减法不削弱安全/验收/恢复，不授删除）。",
  "不该问用户的自决并在回复说明依据：顺序、自做或派发、提交拆分、写法、顺手修补与复查；已授日常实现不逐项请示。",
  "打扰分级（docs/product-foundation.md §7.2）：ignore（正常过程/读/路由）不报不问；FYI（值得知无需动）一句带过；important（明显影响目标）报；decision（需选）报并推荐；blocked（缺外部条件）报；failed（恢复失败）报。只报结论/变化/风险，不报流水；记忆偏好或当场要求（当场优先）可调 ignore/FYI/important 详略，永不静默 decision/blocked/failed。",
].join("\n");

const normalizeToolName = (name: string): string =>
  name.replace(/[-_]/g, "").toLowerCase();

const hasAnyTool = (normalizedTools: Set<string>, candidates: string[]): boolean =>
  candidates.some((candidate) => normalizedTools.has(normalizeToolName(candidate)));

const hasAllTools = (normalizedTools: Set<string>, candidates: string[]): boolean =>
  candidates.every((candidate) => normalizedTools.has(normalizeToolName(candidate)));

const buildEmailRegistrationWorkflowBlock = (
  enabled: boolean
): string => {
  if (!enabled) return "";

  return [
    "--- 邮箱验证码注册流程 ---",
    "仅处理用户明确指定的目标网站，禁扩站、批量或规避风控。协议：discover before acting -> assess supportability -> register -> verify -> closeout。",
    "1. discover before acting：用 browser_openSession / browser_readContent 确认注册 URL、用途、必填项与停止条件（缺目标先问用户），禁盲点按钮。",
    "2. assess supportability：遇 CAPTCHA、手机号、支付、身份/KYC、OAuth、服务条款确认或疑似规避风控，立即停并说明 blockingReason。",
    "3. register：确认支持后用 email_provision_identity 生成受控邮箱，再用 browser_openSession / browser_typeText / browser_click / browser_readContent 提交。",
    "4. verify：用 email_wait_for 等验证邮件，email_extract_verification 提取码/链接完成验证。",
    "5. closeout：无论成败 always close sessions（如 browser_closeSession）；失败须明示 failedStage、blockingReason 与可恢复选项。",
    "6. 仅在对话返回账号、邮箱与一次性密码，不要持久化密码或写入 metadata/DB/文档/记忆。",
  ].join("\n");
};

export const resolveRuntimeGuidanceToolOptions = (
  tools: string[] = []
): RuntimeGuidanceToolOptions => {
  const normalizedTools = canonicalizeToolNames(tools);
  const normalizedToolSet = new Set(normalizedTools.map(normalizeToolName));
  const hasBrowserTools = hasAllTools(normalizedToolSet, [
    "browser_openSession",
    "browser_readContent",
    "browser_typeText",
    "browser_click",
    "browser_closeSession",
  ]);
  const hasBrowserProbe = hasAnyTool(normalizedToolSet, ["browser_probePage", "browserProbePage"]);
  const hasEmailRegistrationTools = hasAllTools(normalizedToolSet, [
    "email_provision_identity",
    "email_wait_for",
    "email_extract_verification",
  ]);

  return {
    hasCheckEnvTool: normalizedTools.includes("checkEnv"),
    hasExecShellTool: normalizedTools.includes("execShell"),
    hasRememberMemoryTool: normalizedTools.includes("rememberMemory"),
    hasDocTools: normalizedTools.some((tool) =>
      ["read", "readDoc", "readPage", "createDoc", "updateDoc"].includes(tool)
    ),
    hasBrowserTools,
    hasEmailRegistrationTools,
    // Require browser_probePage to be present before enabling email registration workflow guidance.
    hasEmailRegistrationWorkflow: hasBrowserTools && hasBrowserProbe && hasEmailRegistrationTools,
  };
};

export const buildRuntimeGuidanceBlocks = (tools: string[] = []) => {
  const options = resolveRuntimeGuidanceToolOptions(tools);
  const normalizedTools = canonicalizeToolNames(tools);
  const startupProtocol = buildStartupProtocolBlock({
    hasCheckEnvTool: options.hasCheckEnvTool,
    hasExecShellTool: options.hasExecShellTool,
  });

  return {
    // 复用现有 startup-protocol session-scope 槽位，保证 web/server/local 三条
    // 装配线无需各自新增一份全局哲学；具体 startup protocol 为空时原则仍常驻。
    startupProtocol: [NOLO_WORKING_PHILOSOPHY, startupProtocol]
      .filter(Boolean)
      .join("\n\n"),
    contextLayerContract: buildContextLayerContractBlock({
      hasRememberMemoryTool: options.hasRememberMemoryTool,
      hasDocTools: options.hasDocTools,
    }),
    emailRegistrationWorkflow: buildEmailRegistrationWorkflowBlock(
      options.hasEmailRegistrationWorkflow
    ),
  };
};