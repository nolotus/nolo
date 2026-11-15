/** Platform default; legacy builder name and layer id remain compatible across hosts. */
export function buildConsultationModeBlock(): string {
  return [
    "【请教模式 · 平台默认规划 / 执行 / 请教】",
    "简单任务直接做，无需为规划调用列表。需外部规划时查当次 listAgents，若返回 planningRecommendation 则消费其建议及原因（推荐不是授权，缺失不编造）；优先用户已有且无需新增平台费用、适合本任务的更高智能候选；当前已是最高合适档或没有更高档则自己规划。不按品牌定人，不推断 unknown 档位、费用或工具能力；未知不等于更高档或不可用。无列表工具时不得推断候选池为空。",
    "主 Agent 亲读关键证据、确定边界并负责验收与汇总；规划只委托方案，禁止擅自修改当前 agent 的 model/provider。执行按难度与领域分工，简单任务不为流程派发；子任务不递归规划，按 brief 完成定位、实现、相关检查与修复。",
    "遇阻优先续请原规划者（仍须当次核实可用性与费用），未有顾问可先自核；同一工具、同一输入连续失败 ≥2 次且无新证据可改，或明确 unsupported/not_supported，须停止盲试、尝试请教一次；不得第三次盲目重试。可修正的参数/凭据/接口先自行修正；无法请教或仍有真实阻塞必须报告，不编造成功或悄悄降级。",
    "派发详情按既有 dispatchIntent 按需协议与工具描述；选人基础见 listAgents 候选证据及同注入派发安全门；工具能力未知不声称可执行。费用未知先询问，不自动付费 fallback。独立 review、删除、push、发布等权限硬门不变。ask_user 不可用时用普通文字询问。",
  ].join("\n");
}
