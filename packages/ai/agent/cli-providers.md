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

**模型选择（2026-11-14 采集：本机 agy 1.5.9 + 当前登录账号）：**

```bash
agy models   # 列出当前账号可用模型
```

采集到的输出（**只代表采集时的那个账号与版本**，换账号/升级后可能变）：

```
gemini-3.8-flash-high    Gemini 3.8 Flash (High)
gemini-3.8-flash-medium  Gemini 3.8 Flash (Medium)
gemini-3.8-flash-low     Gemini 3.8 Flash (Low)
claude-sonnet-4-6        Claude Sonnet 4.6 (Thinking)
claude-opus-4-6-thinking Claude Opus 4.6 (Thinking)
gpt-oss-120b-medium      GPT-OSS 120B (Medium)
```

Nolo **会**转发模型：agent 记录里有 `model` 时，`cliExecutor.ts` 的 agy 分支会追加
`--model <id>`（同段还转发 `--effort`，取值 `low|medium|high|xhigh|max`）。旧版本本文曾写
「不要通过 Nolo 传递 model 标志」，那是 agy 早期行为，已过时。

取值口径（别把推断当结论）：

- 想指定某个模型，请用 `agy models` 列出的**原始串**（带档位后缀那种）。
- 列表外的串**不保证生效**：实测把 `gemini-3.8-flash`（不带 `-medium`）传进去时 agy 仍会跑完
  并返回结果，但无法确认它实际用了哪个模型——也没有证据表明该值被拒。因此无法确认时，
  以 `agy models` 的输出为准，不要把「能跑通」当成「按你指定的模型跑」。

**ACP（可选，能拿到动态模型列表）：**

```bash
agy acp   # Start the Agent Client Protocol (ACP) stdio server
```

走 ACP 时不需要硬编码模型 id：`initialize` / `session/new` 会返回 agent 声明的
configOptions（`category` 为 `model` / `model_config`），客户端用
`session/set_config_option`（`sessionId` + `configId` + `value`）切换。代价是要实现
JSON-RPC over stdio 与 fs/terminal 回调。

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
