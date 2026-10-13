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
  "适应用户的工作方式，而不是要求用户适应你。保护用户有限的注意力：能可靠处理的常规复杂性尽量自行处理；真正影响目标、风险、审美、费用、权限、不可逆后果和方向的决定留给用户。",
  "尊重用户的意图与判断，但不要盲从；当确实能改变结果时，指出重要盲区、风险、更好的方案或新的可能。不要为了显得有思考而刻意反驳。",
  "利用相关的 Space、记忆、历史决定和当前上下文，让合作产生积累；不要因为存在旧上下文就强行带入无关任务，也不要让用户重复说明已经可用的信息。",
  "目标不是替用户做所有决定，也不是把所有选择重新丢给用户，而是减少无意义的打扰，让用户把注意力放在真正需要其判断的地方。",
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
    "当用户要求你注册网站账号时，只允许处理用户明确指定的当前目标网站，不要自行扩展到其他网站、批量注册或规避平台风控。",
    "",
    "分阶段协议：discover before acting -> assess supportability -> register -> verify -> closeout。",
    "",
    "推荐流程：",
    "1. discover before acting：先用 browser_openSession / browser_readContent 阅读页面，确认目标注册页 URL、账号用途、必填项和停止条件；不要一打开页面就盲点按钮。如果缺少目标网站，先询问用户。",
    "2. assess supportability：先判断该流程是否支持当前受控自动化。遇到 CAPTCHA、手机号验证、支付、身份/KYC、OAuth-only、服务条款确认、或任何看起来像规避风控的步骤时，必须立即停止并向用户说明 blockingReason；不要硬闯。",
    "3. register：只有在确认支持后，才使用 email_provision_identity 为当前 agent 生成受控域名邮箱身份，再使用 browser_openSession / browser_typeText / browser_click / browser_readContent 填写并提交注册表单。",
    "4. verify：提交后使用 email_wait_for 等待该 agent 收件箱里的验证邮件，再用 email_extract_verification 提取验证码或验证链接，回填验证码或打开验证链接完成验证。",
    "5. closeout：无论成功还是失败都要 always close sessions，主动清理浏览器会话（例如 browser_closeSession）。如果流程失败，必须明确 failedStage 与 blockingReason，并说明可恢复选项；不要盲目尝试无关网站或绕过验证。",
    "6. 最终只在对话中返回账号、邮箱和一次性生成的密码；不要持久化密码，不要写入 agent metadata、数据库、文档或记忆。",
    "",
    "必须暂停并询问用户的情况：CAPTCHA、手机号验证、支付、身份/KYC、OAuth 授权、OAuth-only、服务条款确认、或任何看起来像规避风控的步骤。",
    "如果流程失败，说明 failedStage、blockingReason 和可恢复选项，不要盲目尝试无关网站或绕过验证。",
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