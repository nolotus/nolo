/**
 * 媒体工具（transcribe / translate）「待用户确认」结果的单一协议真相源。
 *
 * 为什么存在：客户端工具（ai/tools/*Tool.ts）与服务端执行器
 * （server/handlers/agentRun/mediaJobServerTool.ts）此前各自手写同一段 JSON，
 * 任意一端漏字段都会让运行时/UI 把「需要真人确认」误当成「普通成功」——
 * 历史事故：模型把 requires_confirmation 当正常结果，继续调用下游工具并谎报
 * 「后台已启动」。
 *
 * 控制器只认 `buildMediaToolConfirmation` 产出的形状；两端必须调用它，不得复制 JSON。
 *
 * 语义约定：
 * - needsUserInput / interaction 是机器可读的控制字段（运行时据此结束当前执行、
 *   交接给真人）；summary 只写给人看，不承担控制职责，也不得再出现
 *   「请调用 ask_user」这类把 prompt 当控制机制的说法。
 * - 待确认结果绝不携带 wakeRegistered，绝不与 status:"running"|"done" 同现
 *   （只有真正执行了才会有后台唤醒）。
 * - executionRevision 是「本次未授权判定发生在哪一代执行」的机器字段：服务端在锁内捕获、
 *   随 409 下发，客户端只能转述、不得另行 GET 补齐（补来的代次可能已是另一代执行，
 *   会把过期结果错绑到新代次上）。字段缺失表示「代次未知」（旧服务端 / 旧卡），
 *   前端据此不得走新授权流程，而不是猜一个值。summary 永远不承载该字段。
 */

export const MEDIA_TOOL_CONFIRM_STATUS = "requires_confirmation" as const;
export const MEDIA_TOOL_NEEDS_USER_INPUT = true as const;
export const MEDIA_TOOL_CONFIRM_INTERACTION = "authorize" as const;

/** 只有可能返回确认态的步骤使用本协议（readArtifact/exportDocument 目前无授权闸门，不参与）。 */
export type MediaToolConfirmStep = "transcribe" | "translate";

export type MediaToolConfirmReason = "unauthorized" | "budget_overrun";

export type MediaToolConfirmation = {
  status: typeof MEDIA_TOOL_CONFIRM_STATUS;
  needsUserInput: typeof MEDIA_TOOL_NEEDS_USER_INPUT;
  interaction: typeof MEDIA_TOOL_CONFIRM_INTERACTION;
  reason: MediaToolConfirmReason;
  jobId: string;
  step: MediaToolConfirmStep;
  /** translate 的目标语言：待确认卡片据此显示/确认要译成的语言；transcribe 不带。 */
  targetLang?: string;
  upperCredits?: number;
  /**
   * 「未授权」判定发生时 job 的执行代次（服务端锁内捕获）。前端把它作为后续
   * authorize/step 的 expectedExecutionRevision 绑定；字段缺失 = 代次未知 = 不得授权新流程。
   * 预算超额（budget_overrun）不是首次授权，不带本字段。
   */
  executionRevision?: number;
  summary: string;
};

/**
 * 代次合法值域：有限非负整数（缺失、负数、小数、NaN/Infinity、字符串一律视为「无代次」）。
 * 单一规范化入口：两端工具都不得自行判断，避免一端收下 "3"、另一端丢弃。
 */
export function normalizeMediaConfirmExecutionRevision(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

const STEP_LABELS: Record<MediaToolConfirmStep, string> = {
  transcribe: "转写",
  translate: "翻译",
};

/** 费用上限的人读文案；未知/非法时回退「若干」（与旧实现口径一致）。 */
export function formatMediaConfirmCredits(upperCredits?: number): string {
  return typeof upperCredits === "number" && Number.isFinite(upperCredits)
    ? String(upperCredits)
    : "若干";
}

/**
 * 构造待确认结果。两端共用；结构固定，不因步骤/原因增删字段。
 * 字段顺序不参与语义，但保持稳定便于逐字段比对。
 */
export function buildMediaToolConfirmation(args: {
  reason: MediaToolConfirmReason;
  jobId: string;
  step: MediaToolConfirmStep;
  targetLang?: string;
  upperCredits?: number;
  executionRevision?: number;
}): MediaToolConfirmation {
  const label = STEP_LABELS[args.step];
  const credits = formatMediaConfirmCredits(args.upperCredits);
  // 只有「未授权」这一路才是首次授权握手：budget_overrun 是追加预算，即使调用方误传代次也不携带
  // （否则会把「首次授权」的绑定字段装到预算超额卡上）。非法/缺失代次一律整体缺席，不写 undefined。
  const executionRevision =
    args.reason === "unauthorized"
      ? normalizeMediaConfirmExecutionRevision(args.executionRevision)
      : undefined;
  const summary =
    args.reason === "budget_overrun"
      ? `${label}预算超额，需要你本人确认追加预算（还需 ${credits} 积分）后才能继续。请在界面上确认授权，或调整额度设置后重试。`
      : `${label}需要你本人确认后才能执行（预计上限 ${credits} 积分）。请在界面上确认授权，或先在设置中开启/提高媒体额度。`;
  return {
    status: MEDIA_TOOL_CONFIRM_STATUS,
    needsUserInput: MEDIA_TOOL_NEEDS_USER_INPUT,
    interaction: MEDIA_TOOL_CONFIRM_INTERACTION,
    reason: args.reason,
    jobId: args.jobId,
    step: args.step,
    ...(args.step === "translate" && args.targetLang ? { targetLang: args.targetLang } : {}),
    upperCredits: args.upperCredits,
    ...(executionRevision !== undefined ? { executionRevision } : {}),
    summary,
  };
}

/** 运行时/UI 判定：是否为待确认结果（typed，不解析 summary）。 */
export function isMediaToolConfirmation(value: unknown): value is MediaToolConfirmation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    v.status === MEDIA_TOOL_CONFIRM_STATUS &&
    v.needsUserInput === MEDIA_TOOL_NEEDS_USER_INPUT &&
    v.interaction === MEDIA_TOOL_CONFIRM_INTERACTION &&
    (v.reason === "unauthorized" || v.reason === "budget_overrun") &&
    typeof v.jobId === "string" &&
    (v.step === "transcribe" || v.step === "translate") &&
    typeof v.summary === "string"
  );
}
