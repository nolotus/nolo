1:# CLI Provider 参考
2:
3:CLI provider 抽象层的实现参考。该 provider 抽象位于 [`cliExecutor.ts`] 附近，负责将单轮任务委托给外部 CLI agent。每个 provider 都有稳定的命令调用模式。

## 支持的 Provider

| Provider   | CLI 命令                |
|------------|----------------------|
| `copilot`  | `gh copilot`            |
| `gemini`   | `gemini`                |
| `codex`    | `codex exec`            |
| `claude`   | `claude -p`             |
| `agy`      | `agy --print`           |
| `qoder`    | `qoder -p`              |
| `opencode` | `opencode run --format json` |
| `grok`     | `grok -p --output-format json` |
| `kimi`     | `kimi -p --output-format stream-json` |

### AGY (Google Antigravity CLI)

**命令调用：**

```bash
agy \
  --add-dir "$PWD" \
  --print "$PROMPT" \
  --print-timeout 600s \
  --dangerously-skip-permissions
```

`--print`（简写别名：`-p`）以非交互式打印模式运行单个 prompt；默认打印超时为 5 分钟。`--dangerously-skip-permissions` 自动批准工具权限请求，适用于无人值守运行。

不要通过 Nolo 传递 model 标志。本地 AGY 安装自身负责模型选择（观察到的默认值：`Gemini 3.5 Flash (Low)`）。

**超时行为：**
`--print-timeout` 控制 agy 等待会话完全空闲的时间。日志中出现 `Print mode: timed out ...` 表示 agy 在会话仍处于活跃状态时达到了截止时间。常见失败：`PlannerResponse without ModifiedResponse` —— agent 产生了 planner/tool 循环事件但从未发出最终的 modified response。这最常见于过长或过于宽泛的 prompt。

**提示规则：**

- 优先使用简短、范围明确的 prompt —— 每次调用只交付一个成果。
- 将长流程拆分为独立运行：定位文件、实施窄范围变更、验证并报告。
- 包含明确的停止条件："一旦满足成功条件就停止并报告。不要继续开放式探索。"
- 避免让 agy 解释自身标志的元提示/调试提示 —— 它可能会回答那些问题而不是执行所请求的工作。
- 如果 agy 因 planner 循环日志而超时，先缩短 prompt 并去掉开放式探索，然后再切换 provider。

**诊断：**

传递 `--log-file /tmp/agy-run.log` 以捕获诊断信息。有用的日志模式：

- `OAuth: authenticated successfully as ...` —— 通过本地密钥链的静默认证成功。
- `You are not logged into Antigravity` —— 可能在启动时、静默认证成功之前出现；除非之后没有成功消息，否则不要视为最终状态。
- `PlannerResponse without ModifiedResponse encountered` —— agent 正在运行 planner/tool 循环但未产生最终的 modified response；常见于打印模式下的长 prompt。
- `Print mode: timed out ...` —— agy 在会话变为空闲之前达到了 `--print-timeout`。
- `file://... is hidden: ignore uri` —— 隐藏的工作树路径（例如 `.worktrees/`）无法作为工作区文件夹添加；通常是警告，除非任务需要工作区索引。

**并发：**

观察到：本地 AGY/agy 安装同时只能运行一个稳定的委托会话。对于多个并发工作负载，请分散到不同的 agent/runtime 实例，或等待前一个会话在同一订阅上完成。CLI provider 层使用 `CliProviderQuotaError` + 快速重新调度，而非预检 `admission.maxConcurrent` 门控。

### OpenCode CLI

**命令调用：**

```bash
opencode run --format json --dir "$PWD" --dangerously-skip-permissions [--model provider/model] [--variant <effort>] "prompt"
```

Nolo 解析生成的 JSONL 事件流，提取 `type:text` 事件作为 agent 响应。`opencode run` 不会启动 TUI，使其适合后台和机器绑定委托。

**提示规则：**

- OpenCode 尊重 `--model provider/model-id` 和 `--variant` 推理 effort 标志；Nolo 在设置时会转发 agent 记录的 `model` 和 `reasoningEffort` 字段。
- 对于无人值守运行，始终传递 `--dangerously-skip-permissions`，否则 OpenCode 可能会暂停等待交互式权限批准。
- 保持 prompt 范围狭窄并包含明确的停止条件。OpenCode `run` 模式是 agentic（具有代理能力）的 —— 开放式的 prompt 可能导致其继续探索。
- 不要依赖跨运行的会话隔离；每次 `opencode run` 都会创建一个新的本地 OpenCode 会话。使用 Nolo 的 dialog/subjectRefs 来关联相关运行。

### Grok CLI

**命令调用：**

```bash
grok -p "prompt" --cwd "$PWD" --output-format json --yolo [--model <id>] [--effort <level>]
```

**模型 ID（本机 `grok models` 为准）：**

| `model` 字段 | 说明 |
|-------------|------|
| `grok-composer-2.5-fast` | CLI 默认（Composer 2.5 Fast） |
| `grok-build` | Build / 编码向 |

Codex/Oh My Pi 里可能显示 `xai-oauth/grok-composer-2.5-fast`，那是 harness 路由名；Nolo agent 的 `model` 写 **`grok-composer-2.5-fast`**（不要带 `xai-oauth/` 前缀）。

Nolo 解析生成的 JSON 对象，提取 `text` 字段作为 agent 响应。`grok -p` 不会启动 TUI，使其适合后台和机器绑定委托。

**提示规则：**

- Grok 尊重 `-m/--model` 和 `--effort` 推理 effort 标志；Nolo 在设置时会转发 agent 记录的 `model` 和 `reasoning_effort` 字段。
- 对于无人值守运行，始终传递 `--yolo`，否则 Grok 可能会暂停等待交互式权限批准。
- 保持 prompt 范围狭窄并包含明确的停止条件。Grok 无头模式是 agentic（具有代理能力）的 —— 开放式的 prompt 可能导致其继续探索。
- 每次 `grok -p` 调用都会创建一个新的本地 Grok 会话。使用 Nolo 的 dialog/subjectRefs 来关联相关运行。



### Kimi Code CLI

**命令调用：**

```bash
kimi -p "prompt" --output-format stream-json [--model <id>]
```

Nolo 解析 `stream-json` 事件流并提取 assistant 文本。`kimi -p` 为非交互 prompt 模式；勿与 `--yolo`/`--auto` 同用（与 `--prompt` 互斥）。

**提示规则：**

- 保持 prompt 范围明确；配额/限流会映射为 `CliProviderQuotaError` 并触发快速重调度。
- 机器绑定需 connector 上报 `kimi-cli` capability（`kimi --version` 探测）。

### 流式契约

某些 CLI provider 提供稳定的增量 stdout 契约，其他则没有。对于没有稳定增量契约的 provider，流式 API 将降级为交付最终的缓冲文本块，而非逐 token 的流式输出。Provider 抽象层必须透明地处理这两种模式。
