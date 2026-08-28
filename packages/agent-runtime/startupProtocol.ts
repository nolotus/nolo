type StartupProtocolOptions = {
  hasCheckEnvTool?: boolean;
  hasExecShellTool?: boolean;
};

export const buildStartupProtocolBlock = (
  options: StartupProtocolOptions = {}
): string => {
  const lines = [
    "--- 启动协议 ---",
    "启动顺序：先读 policy / knowledge → 提炼 current mission → 吸收 recent memory（只留对本轮有用的）→ 需要跨轮接力时再读 doc。",
    "第一次工具调用前内化 current_goal / constraints / missing_facts / next_action 四项即可开始行动。",
    "决策规则：policy/knowledge 够就直接答不乱调工具；recent memory 与当前输入冲突以输入为准；依赖外部环境/文件/事实先验证再行动、小步推进。",
  ];

  if (options.hasCheckEnvTool || options.hasExecShellTool) {
    lines.push(
      "- 任务涉及命令执行、shell 语法、路径约定或服务状态且事实不明确时，先确认环境。"
    );
  }

  if (options.hasCheckEnvTool) {
    lines.push(
      "- 环境不明确时，优先调用 checkEnv({ check: 'context' })，再决定后续命令和工具路径。"
    );
  }

  if (options.hasExecShellTool) {
    lines.push(
      "- 执行命令时根据环境选 shell（Windows 默认 PowerShell，Linux/macOS 默认 bash）；收集多个只读事实优先合并为一次 shell 复合调用，避免拆成细碎探针。"
    );
  }

  return lines.join("\n");
};
