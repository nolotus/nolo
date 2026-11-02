export type ContextLayerContractOptions = {
  hasRememberMemoryTool?: boolean;
  hasDocTools?: boolean;
};

export const buildContextLayerContractBlock = (
  options: ContextLayerContractOptions = {}
): string => {
  const lines = [
    "--- 知识存储约定 ---",
    "分层边界（不要把所有信息塞进同一层）：",
    "1. memory layer：短到中期、可复用但不必永久挂载的偏好/共识/经验（短、可检索、可替换）。",
    "2. knowledge layer：稳定规则与长期事实（通过 prompt / references 自动加载）。",
    "3. doc layer：跨轮次维护的外部工作台（runbook / mission / incident / checkpoint / idea backlog / experiment log，显式按需读写）。",
    "",
    "写入原则：临时步骤、原始长日志、一次性思路不进 memory/knowledge；稳定规则→knowledge、可复用偏好/共识→memory、跨轮接力状态/文档→doc。",
    "",
    "信息落位判定（内容性质/owner/消费方/生命周期/唯一真源 → 唯一合法落点）：",
    "- 个人偏好（个人交互习惯、偏好约定）：落入 memory；禁止用个人记忆替代项目共识或系统真值。",
    "- 项目决策 / 产品真值（架构设计、业务规范、系统契约）：落入 repo 项目文档（如 docs/ 下 canonical 文档）；严禁用个人 memory 替代。",
    "- 跨 dialog 共读平台内容（跨对话协作工作台、平台页面知识）：落入 platform doc / space（如 createDoc）；禁止 repo 文档与平台 Doc 互相假装同步。",
    "- 临时探针 / 中间日志 / 调试脚本：落入本地 /tmp 或可再生缓存，不长期保留。",
    "- 可重用操作规程（标准操作步骤、流程执行规程）：落入 skill；但产品真值与系统规则在 skill 中只保留链接/引用，禁止复制真源。",
    "- 须运行时兑现 / 权限 / 自动决策：落入平台代码 + test 强制保障，绝不能只靠 prompt 提示词兜底。",
    "- 凭据 / 密钥 / API key：只进受控 store（如 secret 管理服务），严禁写入 memory / doc / skill / 代码。",
    "",
    "落位纪律：",
    "- 技术载体不是身份：repo 文件可承载规范、计划或临时记录，不得机械按文件后缀判断层级；项目未必是 git 仓库，以当前明确的项目空间为准。",
    "- 已有真源更新不复制：已有权威真源时就地更新，禁止多处复制产生割裂。",
    "- 写前确认能力真实可用：落位前必须确认当前环境具备对应工具与权限；无工具严禁声称已创建、已挂载或已生效。",
  ];

  if (options.hasRememberMemoryTool) {
    lines.push(
      "- 遇到对未来明显有帮助的偏好/共识时调用 rememberMemory（写成简洁可复用的一句话；绑定 space 且属共享规则时传 scope=space，记为 space memory）。"
    );
  }

  if (options.hasDocTools) {
    lines.push(
      "- 任务需 24h 连续运行、跨 dialog 接力或共读时，优先把 mission / runbook / incident / checkpoint / idea backlog / experiment log 写入 doc layer。"
    );
  }

  return lines.join("\n");
};
