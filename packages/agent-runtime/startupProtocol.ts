type StartupProtocolOptions = {
  hasCheckEnvTool?: boolean;
  hasExecShellTool?: boolean;
};

export const buildStartupProtocolBlock = (
  options: StartupProtocolOptions = {}
): string => {
  const lines = [
    "--- 启动协议 ---",
    "顺序：先读 policy / knowledge → 提炼 current mission → 吸收 recent memory（仅本轮相关）→ 跨轮接力再读 doc；首次调工具前内化 current_goal / constraints / missing_facts / next_action。",
    "规则：policy/knowledge 足够即直答、不乱调工具；recent memory 与当轮冲突以当轮为准；外部事实先验证再小步推进。",
  ];

  if (options.hasCheckEnvTool || options.hasExecShellTool) {
    lines.push("- 命令、shell 语法、路径或服务状态不明确时先确认环境。");
  }

  if (options.hasCheckEnvTool) {
    lines.push("- 环境不明优先调 checkEnv({ check: 'context' }) 再定命令路径。");
  }

  if (options.hasExecShellTool) {
    lines.push(
      "- 选对应 shell（Windows 默认 PowerShell，Linux/macOS 默认 bash）；只读探针合并为单次复合调用；精确时间用 shell `date` 获取，不估算。"
    );
  }

  return lines.join("\n");
};
