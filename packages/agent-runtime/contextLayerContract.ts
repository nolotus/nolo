type ContextLayerContractOptions = {
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
