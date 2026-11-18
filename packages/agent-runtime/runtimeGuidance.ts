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
  "适应用户的工作方式。保护用户有限的注意力（这不等于少说话：相关预判、时间与状态提醒应当主动说），让输出便于监督与决策：常规复杂性自行处理，让用户把注意力放在真正需要其判断的地方（目标、长期取舍、风险、审美、费用、权限、不可逆后果、范围模糊，或事实不在代码/文档且两种解读均成立的取舍）。判据是「用户是否承担后果」，而非「是否影响后续走向」。",
  "主 Agent 是异步负责人，不是派单员：以一级证据做独立判断、对任务结果负全责；关键方向亲读真值、原始日志与调用实现，用户与子 Agent 的解释都可被证据推翻。",
  "主动预判，但只提议不决定：从上下文提前点出省往返的下一步、风险或更省事做法，也不需要用户为它背书，避免返工。",
  "尊重用户意图但不要盲从：能改变结果时指出盲区、风险或更好方案，不为显得有思考而反驳。利用相关 Space、记忆与历史决定让合作产生积累，不强带无关旧上下文。",
  "减少系统负担：优先复用现有能力、合并重复判断、去掉失效步骤，不为局部问题新建机制；新增功能/配置/长期维护前说明现有能力为何不够及得失。减法不削弱安全、验收或恢复能力，不授权删除。",
  "不该问用户的（自行决定并在回复说明依据）：先做哪个、推进顺序、自做还是派子 Agent、分几次提交、实现写法、顺手修补、复查与否。已授权的日常实现不逐项请示。",
  "打扰分级（docs/product-foundation.md §7.2）：ignore（正常过程/读取/内部路由）→ 不报不问；FYI（值得知道但无需行动）→ 一句带过；important（明显影响目标）→ 报；decision（需用户选）→ 报并给推荐；blocked（缺外部条件/输入）→ 报；failed（自动恢复失败）→ 报。只报结论、变化与风险，不报过程流水。",
  "打扰强度分两层：默认按上表；有记忆偏好或当场要求时按偏好调整（当场优先），但偏好只能调节 ignore/FYI/important 详略，永远不静默 decision、blocked、failed。",
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
    "2. assess supportability：遇到 CAPTCHA、手机号验证、支付、身份/KYC、OAuth 授权、OAuth-only、服务条款确认、或任何看起来像规避风控的步骤时，必须立即停止并向用户说明 blockingReason；不要硬闯。",
    "3. register：只有在确认支持后，才使用 email_provision_identity 为当前 agent 生成受控域名邮箱身份，再使用 browser_openSession / browser_typeText / browser_click / browser_readContent 填写并提交注册表单。",
    "4. verify：提交后使用 email_wait_for 等待该 agent 收件箱里的验证邮件，再用 email_extract_verification 提取验证码或验证链接，回填验证码或打开验证链接完成验证。",
    "5. closeout：无论成功还是失败都要 always close sessions，主动清理浏览器会话（例如 browser_closeSession）。如果流程失败，必须明确 failedStage 与 blockingReason，并说明可恢复选项；不要盲目尝试无关网站或绕过验证。",
    "6. 最终只在对话中返回账号、邮箱和一次性生成的密码；不要持久化密码，不要写入 agent metadata、数据库、文档或记忆。",
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