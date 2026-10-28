export const agentStrings = {
  agentSwitchCancelled: {
    en: "Agent switch cancelled.",
    zh: "已取消切换 agent。",
  },
  agentPickerLoading: {
    en: "Loading agents…",
    zh: "正在加载 agent 列表…",
  },
  /**
   * /switch 目录视图的一行提示：收藏项 hydrate 失败时出现，让「收藏看不到」
   * 有任何线索；失败数为 0 时不渲染这一行。
   */
  agentCatalogUnavailableFavorites: {
    en: "⚠ {0} favorite(s) unavailable right now",
    zh: "⚠ {0} 个收藏项暂时不可用",
  },
  // 派发前的本地冷却拦截（原两行英文 → 本地化单行压缩）。
  agentCooldownBlocked: {
    en: "[nolo] Agent {0} is in 429 cooldown until {1}. This dispatch was not sent — pick another agent, or retry after the cooldown.",
    zh: "[nolo] Agent {0} 冷却中，至 {1}。本次派发未发出——换一个 agent，或到点后重试。",
  },
  // --- Agent-run orchestration cards (injected into packages/ai helpers) ---
  runStatusLabel: {
    en: "Run status",
    zh: "运行状态",
  },
  runStartedLabel: {
    en: "Run started",
    zh: "运行已启动",
  },
  runStoppedLabel: {
    en: "Run stopped",
    zh: "运行已停止",
  },
  runFinishedLabel: {
    en: "Run finished",
    zh: "运行已结束",
  },
  runLogTailLabel: {
    en: "Log tail:",
    zh: "日志尾部：",
  },
  // Normal-mode safe projection: the raw errorMessage/logLines of a failed run
  // stay in pro/verbose; normal mode names the failure and points at pro.
  runsListLabel: {
    en: "Runs ({0})",
    zh: "运行 ({0})",
  },
  // Tool-count fact on run rows/cards/panel (`12 tools` / `12 个工具`).
  runToolsCount: {
    en: "{0} tools",
    zh: "{0} 个工具",
  },
  // Card-body status words / row labels. Display labels only: raw log lines,
  // protocol params and tool ids stay untranslated.
  runStatusNotFound: { en: "not_found", zh: "未找到" },
  runRowAgent: { en: "agent", zh: "执行者" },
  runRowStatus: { en: "status", zh: "状态" },
  runRowTools: { en: "tools", zh: "工具" },
  runRowNote: { en: "note", zh: "备注" },
  runRowError: { en: "error", zh: "错误" },
  runRowTask: { en: "task", zh: "任务" },
  // listAgents card header (`Agents (3)` / `智能体 (3)`). The shared ai
  // renderer keeps the English default; the CLI relabels the header line.
  agentsListLabel: { en: "Agents ({0})", zh: "智能体 ({0})" },
  // Fallback identity for auto-generated agent ids (run zone / dock / panel).
  subAgentName: {
    en: "Sub-agent",
    zh: "子智能体",
  },
  // Status vocabulary the fixed run zone does not label (running shows only its
  // elapsed time there). `en` must stay equal to the raw store status so a
  // switch of locale never changes what an English reader already understood.
  runZoneRunning: { en: "running", zh: "运行中" },
  runZonePending: { en: "pending", zh: "等待中" },
  runZoneCancelling: { en: "cancelling", zh: "正在取消" },
  // controlAgentRun displayData: wait timeout and stop-not-confirmed outcomes.
  agentRunWaitTimeout: {
    en: "⏳ wait timed out after {0}s — the run is still running: wait again later, or use status/stop",
    zh: "⏳ wait 超时（{0}s），run 仍在运行：可稍后再 wait，或改用 status/stop",
  },
  agentRunStopFailedAlive: {
    en: "stop failed: process {0} still alive after SIGKILL",
    zh: "停止失败：进程 {0} 在 SIGKILL 后仍然存活",
  },
  agentRunPendingReconcile: {
    en: "{0} (pending reconcile)",
    zh: "{0}（待对账）",
  },
  // --- Fixed run zone (top of composer, replaces the ⚙ running status chip) --
  // Each active run renders as `⚙ <title> · <agent> · <elapsed> · N tools`.
  // runZoneFor is the elapsed-time fact for a *running* run (`for 1m23s` /
  // `已运行 1m23s`); terminal runs print `<status> <age>` instead and don't use it.
  runZoneFor: {
    en: "for {0}",
    zh: "已运行 {0}",
  },
  // Terminal linger line: `✓ <run> · done · took 12m03s`.
  runZoneDone: { en: "done", zh: "完成" },
  runZoneFailed: { en: "failed", zh: "失败" },
  runZoneCancelled: { en: "cancelled", zh: "已取消" },
  runZoneTook: { en: "took {0}", zh: "用时 {0}" },
  // Overflow marker when more runs are active than the zone shows at once.
  runZoneMore: {
    en: "+{0} more",
    zh: "还有 {0} 个",
  },
  agentsTitle: {
    en: "Agents:",
    zh: "智能体：",
  },
  agentsTip: {
    en: "Tip: run /switch for the full picker, or /switch list for your private agents too.",
    zh: "提示：用 /switch 打开完整选择器，或 /switch list 连你的私有智能体一起列出。",
  },
  agentCurrent: { en: "Current agent: {0} ({1})", zh: "当前 agent：{0}（{1}）" },
  agentPinnedUnaudited: {
    en: "No audit record for it — an older build wrote it; see agent-selection.log.",
    zh: "这条记录没有审计记录，是旧版本写的；详见 agent-selection.log。",
  },
  agentPinnedAuditRotated: {
    en: "The audit log has no entry for it — it aged out, or another session wrote it.",
    zh: "审计日志里没有它的记录——可能已被轮转，或是别的会话写的。",
  },
  agentPinnedFromProfile: {
    en: 'Agent "{0}" restored from {1} (saved selection). /switch nolo to go back to the default.',
    zh: "agent“{0}”来自 {1} 里保存的选择。/switch nolo 可切回默认档。",
  },
  agentUnknown: {
    en: "I don't know agent \"{0}\" yet.\nUse /switch, /switch list, /switch minimax-m3, or a full agent key.",
    zh: "还不认识 agent“{0}”。\n可以用 /switch、/switch list、/switch minimax-m3 或完整的 agent key 来切换。",
  },
  // Agent catalog sources
  agentSourcePlatform: {
    en: "Platform",
    zh: "平台",
  },
  agentSourceSubscription: {
    en: "Subscription",
    zh: "订阅",
  },
  agentSourceApi: {
    en: "API",
    zh: "API",
  },
  // ── Non-TUI CLI output: nolo agent / nolo run ─────────────────────────────
  "agent.unavailableHidden": {
    en: "⛔ {0} agent(s) temporarily unavailable (429) hidden. Use --show-unavailable to list them.\n",
    zh: "⛔ 已隐藏 {0} 个暂时不可用的 agent（429）。用 --show-unavailable 列出它们。\n",
  },
  "agent.rateLimitedRecovery": {
    en: "   - [429 rate-limited] {0} (id: {1}) recovers in {2}s{3}\n",
    zh: "   - [429 限流] {0} (id: {1}) 预计 {2} 秒后恢复{3}\n",
  },
  "agentRun.autoRouteOverrideFailed": {
    en: "[nolo] auto-route: could not read the source agent, running the selected agent as-is.\n",
    zh: "[nolo] auto-route: 覆盖源 agent 读取失败，按原样直跑所选 agent。\n",
  },
  "agentRun.autoRouteModelOverride": {
    en: "[nolo] auto-route: model override is now {0}\n",
    zh: "[nolo] auto-route: model 层覆盖为 {0}\n",
  },
  // ── Non-TUI CLI output: nolo agent delete ─────────────────────────────────
  // Flag descriptions for `nolo agent delete --help`; the Chinese copy is the
  // original wording, kept verbatim so existing users lose no information.
  "agentDelete.description": {
    en:
      "Deletes an agent's private record (agent-{userId}-{id}) and public record (agent-pub-{id}).\n",
    zh:
      "删除一个 agent 的私有记录 (agent-{userId}-{id}) 与公开记录 (agent-pub-{id})。\n",
  },
  "agentDelete.tombstoneNote": {
    en: "The server side is a tombstone soft delete: read after DELETE returns 404.\n",
    zh: "服务器端为 tombstone 软删除，DELETE 后再次 read 会返回 404。\n",
  },
  "agentDelete.flagYes": {
    en: "  --yes            Actually delete; without it only the dry-run target summary is printed.\n",
    zh: "  --yes            真正执行删除；缺省时仅 dry-run 输出目标摘要。\n",
  },
  "agentDelete.flagJson": {
    en: "  --json           Print the JSON result.\n",
    zh: "  --json           输出 JSON 结果。\n",
  },
  "agentDelete.flagId": {
    en: "  --id <agent>     Same as the positional argument: alias / dbKey / URL / 26-char id.\n",
    zh: "  --id <agent>     与位置参数等价，传入 alias / dbKey / URL / 26-char id。\n",
  },
  "agentDelete.flagServer": {
    en: "  --server / --server-url  Delete only on the given server (replicas outside the fan-out are kept).\n",
    zh: "  --server / --server-url  仅删除指定服务器（仍保留集群 fan-out 之外的副本）。\n",
  },
  "agentDelete.flagUser": {
    en: "  --user <userId>  Explicitly override userId (errors when it differs from AUTH_TOKEN).\n",
    zh: "  --user <userId>  显式覆盖 userId（与 AUTH_TOKEN 不一致则报错）。\n",
  },
  "agentDelete.flagToken": {
    en: "  --token / --machine-key  Temporarily override AUTH_TOKEN.\n",
    zh: "  --token / --machine-key  临时覆盖 AUTH_TOKEN。\n",
  },
  // ── Non-TUI CLI output: agent-run orchestration tool errors ───────────────
  "agentRunTool.missingAgentKey": {
    en: "startAgentRun: missing agentKey, and the current agent cannot be identified.",
    zh: "startAgentRun: 缺少 agentKey 参数，且无法识别当前 Agent。",
  },
  "agentRunTool.missingTask": {
    en: "startAgentRun: missing a valid task description.",
    zh: "startAgentRun: 缺少有效的 task 文本描述。",
  },
  "agentRunTool.noDialogToContinue": {
    en: "This run has no linked dialog and cannot be continued.",
    zh: "该 run 无关联 dialog，无法续跑。",
  },
  "agentRunTool.appendMissingRunId": {
    en: 'controlAgentRun(action:"append"): missing runId.',
    zh: 'controlAgentRun(action:"append"): 缺少 runId。',
  },
  "agentRunTool.appendMissingUserInput": {
    en: 'controlAgentRun(action:"append"): missing a valid userInput text.',
    zh: 'controlAgentRun(action:"append"): 缺少有效的 userInput 文本。',
  },
  "agentRunTool.appendQueueUnsupported": {
    en: "This run did not start with a queue channel; append while running is not supported. Wait for a terminal state first.",
    zh: "该 run 启动时不支持运行中入队（无队列通道），请等终态后再 append",
  },
  "agentRunTool.unknownAction": {
    en: 'controlAgentRun: unknown action "{0}".',
    zh: 'controlAgentRun: 未知 action "{0}"。',
  },
  "agentRunTool.missingRunId": {
    en: 'controlAgentRun(action:"{0}"): missing runId.',
    zh: 'controlAgentRun(action:"{0}"): 缺少 runId。',
  },
  "agentRunTool.waitAborted": {
    en: "controlAgentRun(wait) was aborted.",
    zh: "controlAgentRun(wait) 已被中止。",
  },
  // ── Non-TUI CLI output: agent-run OAuth channel ownership + stream failures ──
  // 用户在 TUI 选了别人的 sshare agent（跑在 agent owner 的 OAuth 订阅上）：
  // auto 模式下模型请求经服务端 owner-required 代理走分享者订阅、文件/shell
  // 工具留在本机执行（不是转服务端跑整轮）。文案说明模型使用分享者订阅、
  // 工具在本机；不展示内部 ID，也不提供未经保证的订阅切换建议。
  "agentRun.oauthChannelOwnerSkip": {
    en:
      '[nolo] Using "{0}", shared by someone else: the model uses their ' +
      "subscription; file operations and commands still run on your computer.",
    zh:
      "[nolo] 正在使用对方分享的「{0}」：模型使用对方的订阅，文件操作和命令执行" +
      "仍在你的电脑上进行。",
  },
  "agentRun.sharedAgentFallbackName": {
    en: "Shared agent",
    zh: "共享 Agent",
  },
  // antigravity 502 MALFORMED_FUNCTION_CALL：裸 message 是整段 provider JSON
  // dump，对用户零信息量。映射成单行可操作文案；原始 JSON 只在既有
  // NOLO_DEBUG / NOLO_CLI_DEBUG_DETAIL 开关下附加。
  "agentRunStream.malformedToolCallRejected": {
    en:
      "[nolo] The provider rejected the model's generated tool call, so this " +
      "attempt will not retry automatically. It is usually intermittent: read " +
      "dialog {0} to check progress, then resend.",
    zh:
      "[nolo] 模型生成的工具调用被上游拒绝，本次不会自动重试。" +
      "这种情况通常是偶发的：可先读对话 {0} 看进度，然后直接重发。",
  },
  "agentRunStream.malformedToolCallRejectedNoDialog": {
    en:
      "[nolo] The provider rejected the model's generated tool call, so this " +
      "attempt will not retry automatically. It is usually intermittent: just " +
      "resend your message.",
    zh:
      "[nolo] 模型生成的工具调用被上游拒绝，本次不会自动重试。" +
      "这种情况通常是偶发的：直接重发即可。",
  },
  "agentRunStream.interruptedAfterDialog": {
    en:
      "\n[nolo] Agent stream transport interrupted after dialog {0} was created: {1}\n",
    zh: "\n[nolo] 对话 {0} 创建后，agent 流式输出中断：{1}\n",
  },
  "agentRunStream.mayStillFinishOnServer": {
    en: "[nolo] The agent run may still finish on the server; read the dialog before retrying.\n",
    zh: "[nolo] 这次 agent 运行可能仍在服务端继续，重试前请先读一下该对话。\n",
  },
  "agentRunStream.failed": {
    en: "\n[nolo] Agent stream failed: {0}\n",
    zh: "\n[nolo] Agent 流式运行失败：{0}\n",
  },
  "agentRunStream.rawErrorDetail": {
    en: "[nolo] Raw error detail (NOLO_DEBUG=1): {0}\n",
    zh: "[nolo] 原始错误详情（NOLO_DEBUG=1）：{0}\n",
  },
  // --- `nolo agent run` CLI surface (packages/cli/agentRunCommand.ts) ---
  // The direct CLI entry bypasses the dispatch tool's allowHostWrites guard, so
  // this is the only thing standing between `--runtime-key=local` and host writes.
  "agentRun.hostWriteGuard": {
    en: "[nolo] runtimeKey=local executes on — and writes to — the **host filesystem**, so it needs an explicit --allow-host-writes confirmation; drop --runtime-key to run isolated instead (docker sandbox by default).\n",
    zh: "[nolo] runtimeKey=local 会在**宿主文件系统**上执行并写入，必须显式加 --allow-host-writes 确认；要隔离执行请省略 --runtime-key（默认进 docker 沙盒）。\n",
  },
  "agentRun.instaboxConfigFailed": {
    en: "[nolo] instabox config generation failed: {0}\n",
    zh: "[nolo] instabox 配置生成失败: {0}\n",
  },
} as const;
