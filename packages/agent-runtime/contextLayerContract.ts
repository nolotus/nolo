export type ContextLayerContractOptions = {
  hasRememberMemoryTool?: boolean;
  hasDocTools?: boolean;
};

export const buildContextLayerContractBlock = (
  options: ContextLayerContractOptions = {}
): string => {
  const lines = [
    "--- 知识存储约定 ---",
    "1. memory layer = 短到中期可复用偏好/共识；2. knowledge layer = 稳定规则与长期事实；3. doc layer = 跨轮工作台（mission / runbook / incident / checkpoint / idea backlog / experiment log）。",
    "临时步骤、原始长日志、一次性思路不进 memory/knowledge。",
    "信息落位（唯一真源定落点）：",
    "- 个人偏好 → memory；禁个人记忆替代项目共识/系统真值。",
    "- 项目决策/产品真值 → repo 文档（docs/）；禁用 memory 替代。",
    "- 跨 dialog 平台内容 → platform doc/space；禁 repo 与平台 Doc 假装同步。",
    "- 临时探针/日志 → /tmp 或可再生缓存。",
    "- 可重用规程 → skill；产品真值/系统规则只留链接引用，禁复制真源。",
    "- 须运行时兑现/权限/自动决策 → 平台代码+test，禁靠 prompt。",
    "- 凭据/密钥/API key → 只进受控 store，禁写 memory/doc/skill/代码。",
    "落位纪律：技术载体不是身份（不按后缀；未必是 git 仓库）；已有真源就地更新禁复制；落位前确认有工具与权限，无工具禁称已创建/已挂载/已生效。",
  ];

  if (options.hasRememberMemoryTool) {
    lines.push(
      "- 偏好/共识调 rememberMemory（可复用；共享传 scope=space，记 space memory）。"
    );
  }

  if (options.hasDocTools) {
    lines.push(
      "- 有文档写工具及权限时，24h/跨 dialog 接力优先写入 doc layer（mission / runbook / incident / checkpoint / idea backlog / experiment log）。"
    );
  }

  return lines.join("\n");
};
