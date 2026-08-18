# nolo-cli

面向 Agent 的 Nolo 终端客户端。

`nolo` 是 Nolo 智能体的终端工作空间。现有的命令模式仍然包装仓库脚本，但产品方向是类似于 Claude Code / Codex CLI 的 TUI 优先体验：

- 打开 `nolo`，在持久的 Agent 会话中工作；
- 与 Agent 聊天；
- 检查和管理该 Agent 的 dialogs、docs、tables、skills 和 spaces；
- 以同样的心智模型运行内部 ops/doctor agents；
- 使用非交互式命令和 `--json` 进行自动化。

当前 CLI 提供成熟的 TUI 优先体验：alt-screen 全屏会话、持久 Agent 聊天、斜杠命令面板、agent/dialog 切换器、后台任务面板（`/jobs`）、主题与密度设置。渲染层基于 readline 保持轻量（无需 Ink 等重依赖），但会话模型与命令面已按长期产品方向定型。

在 `nolo` 内部，收到第一条 Agent 回复后，普通文本继续当前 dialog。需要清空 dialog 时使用 `/new`。响应的 token 详情默认隐藏；调试用量时设置 `NOLO_SHOW_USAGE=1`。

Nolo 并非试图逐字复刻纯编码 CLI。Claude Code、Codex CLI 和 Copilot CLI 在开发者已进入代码库时表现最佳。Nolo 的 CLI 应介于普通用户和开发者之间：默认提供一个助理，而专业 agent、docs、tables、dialogs 和同步工作空间数据只需一个斜杠命令。

## 使用说明

```bash
npm install -g nolo-cli
nolo

# 查看当前运行的安装版本
nolo doctor
nolo --version

# 无需 Nolo 登录：在当前目录运行本地 Codex CLI
nolo run "review this repository"

# 稍后从 shell 更新
nolo update
```

在 TUI 内部运行：

```text
/update
```

发布的 npm 包在纯 Node.js 上运行（不需要 Bun）。打包入口是一个包含 `#!/usr/bin/env node` shebang 的单一 bundle `index.js`。

对于本地维护者工作流，`nolo run "..."` 不需要 Nolo 账户。它会解析为内置的 `local-codex` agent，在当前工作目录运行，并使用本地 Codex CLI 安装。这适用于仓库本地的审查、分类和发布检查任务。

远程 Nolo 记录和同步工作流仍需要 token：

```bash
NOLO_SERVER=https://nolo.chat AUTH_TOKEN=<token> nolo
```

或者一次性保存本地配置文件：

```bash
nolo login --server https://nolo.chat
nolo whoami
nolo
```

默认情况下，`nolo login` 打开 Nolo 网站并等待浏览器授权。在 SSH 或无浏览器环境中，使用：

```bash
nolo login --no-browser
```

然后在已登录的浏览器中打开打印的 URL。自动化也可以直接保存 token：

```bash
nolo login --server https://nolo.chat --token <token>
```

本地仓库开发应使用 `nolo login` 或显式 `AUTH_TOKEN` 来运行 agent。

## 两层认证模型

nolo-cli 的认证分为两个独立层面，理解它们的区别很重要：

### 第一层：Nolo 平台登录（`nolo login`）

```bash
nolo login
```

- 登录 **Nolo 平台账号**
- 通过 OAuth 设备码流程，在浏览器授权后保存 token 到 `~/.nolo/profile.json`
- 登录后可以管理 Agent、Doc、Table、Dialog、Space 等 Nolo 资源
- 对应命令：`nolo login`、`nolo logout`、`nolo whoami`

### 第二层：第三方模型订阅授权（`nolo auth <provider>`）

```bash
nolo auth antigravity   # Google Antigravity (Gemini 3, Claude, GPT-OSS)
nolo auth claude        # Claude Pro/Max
nolo auth chatgpt       # ChatGPT Plus / OpenAI Codex
nolo auth cursor        # Cursor Pro (Grok 4.5, Composer 2.5, GPT-5.3 Codex)
nolo auth xai           # xAI Grok (SuperGrok)
nolo auth cloudflare    # Cloudflare OAuth (email routing, etc.)
```

- 授权 **第三方 API 访问**，让 Agent 使用你的个人订阅额度调用模型
- token 保存在 `~/.nolo/credentials/<provider>.json`
- Agent 通过 `apiKeyRef: "<provider>"` + `apiSource: "custom"` 引用这些凭据
- **不替代 `nolo login`**——管理 Nolo 资源仍需先登录平台

### 典型工作流

```bash
# 1. 登录 Nolo 平台
nolo login

# 2. 绑定第三方模型订阅（按需）
nolo auth antigravity

# 3. 查看登录状态
nolo whoami

# 4. 管理 Agent 等资源
nolo agent list
```

在 TUI 内部，`/update` 是全局 `nolo update` 命令的快捷方式。

```bash
nolo --help
nolo doctor
nolo update
nolo
nolo run "review this repository"
nolo chat "triage the failing tests"
nolo chat
nolo connect
nolo connect --watch
nolo connect --daemon
nolo daemon --server-url https://api.nolo.chat --machine-key sk_machine_xxx
nolo machine status
nolo run "summarize my latest agent dialogs"
nolo doc create --title "Trip Notes" --body "hello" --sync local,us --dry-run
nolo doc create --title "Proxy Notes" --description "Windows setup" --body-file ./proxy.md --sync local,main,us --allow-secrets
nolo skill-doc create --title "Agent Query Skill" --description "Inspect recent agent dialogs" --body-file ./skill.md --sync local,main,us
nolo space read 01KKY77TT0DA9NY7TNW3R7255N --content-key page-user-id --brief
nolo agent list --json
nolo agent bind-current agent-user-1-agent-1
nolo agent runtime-doctor agent-user-1-agent-1
nolo agent smoke-current agent-user-1-agent-1 --msg "ping"
nolo chat --agent agent-pub-01APPBUILDER00000001YAII3I --msg "你好"
```

创建文档时，优先使用 CLI 而非直接脚本。普通页面使用 `nolo doc create`，技能驱动的页面使用 `nolo skill-doc create`。两者都支持 `--sync`、`--dry-run`、`--json` 和 `--allow-secrets`，并且都使用当前认证 token 的用户身份写入，而非 demo 引导用户。

实验性机器连接器命令：

```bash
nolo connect          # 发送一次机器心跳
nolo connect --watch  # 通过周期性心跳保持此终端进程在线
nolo connect --ws     # 为绑定的 agent 运行保持实时连接器 websocket
nolo connect --daemon # 在后台静默启动 connect --ws
nolo daemon --server-url https://api.nolo.chat --machine-key sk_machine_xxx
nolo machine status   # 列出注册到当前配置文件的机器
```

目前这些命令仅注册机器存在性和运行时能力。它们不会暴露 shell、文件写入或原始本地 LLM 端点。

运行 Slock 风格的连接器命令：

```bash
nolo daemon --server-url https://api.nolo.chat --machine-key sk_machine_xxx
```

daemon 注册本台计算机、报告本地 CLI 能力、保持实时 websocket 连接，并在此计算机上执行绑定的 CLI agents。Agent 绑定到机器，而非工作空间或项目文件夹。

将 agent 绑定到当前机器：

```bash
nolo agent bind-current <agentKey>
```

Agent 保持自己的 CLI 设置。绑定仅记录哪个已连接的机器在该 agent 运行时必须在线。

运行单命令连接器冒烟测试：

```bash
nolo agent runtime-doctor <agentKey>
nolo agent smoke-current <agentKey> --msg "ping"
```

`runtime-doctor` 检查该 agent 是否为 CLI agent 以及当前机器是否具有所需的 CLI 能力。`smoke-current` 向当前机器发送心跳，将 agent 绑定到该机器，打开临时的连接器 websocket，调用 `/api/agent/run`，并打印返回的 dialog id/content。

## 产品形态

推荐的命令模型是 Agent 优先：

```bash
nolo agent list
nolo agent switch <agent>
nolo agent read <agent>
nolo agent update <agent> --model gpt-5.6-terra --cli-provider codex --api-source cli
nolo agent run <agent> "检查最近失败任务"
nolo agent run frontend-implementer --msg "修一个小的通知弹窗 CSS 问题"
nolo agent list --space <space>
nolo dialog list
nolo dialog list --space <space>
nolo dialog read <dialog>
nolo dialog delete <dialog...> --yes
nolo doc list --agent <agent>
nolo table query --table meta-<userId>-<tableId> --limit 20
nolo table query --table meta-<userId>-<tableId> --columns '["title","status","owner","priority","codeStatus"]' --no-base-fields --output items
nolo table update-row --table meta-<userId>-<tableId> --row <rowId> --changes '{"status":"已完成"}'
nolo table add-column --table meta-<userId>-<tableId> --schema-write-ok --name "blockedBy" --label "Blocked By"
```

`agent list` 和 `dialog list` 使用当前 CLI 配置文件的全局服务器候选列表：选定的 `--server` / `NOLO_SERVER` 加上已知的 Nolo 集群对等节点。列表命令会合并墓碑记录，因此一个服务器上较新的删除会隐藏来自另一个服务器的较旧活动记录。

删除命令默认扩散范围更大：选定的服务器、集群对等节点、`READ_DIALOG_BASE` 以及本地开发 API 源。这意味着 `nolo dialog delete` 和脚本助手如 `deleteRecord()` / `deleteAgentRecords()` 会在 `nolo.chat`、`us.nolo.chat` 和本地开发环境（如果存在）上执行删除——而不仅仅是当前的 `BASE_URL`。Dialog、doc、skill-doc、space 和 agent 公共记录的删除都使用此多服务器路径；每个服务器对该记录类型应用通常的墓碑/级联行为。

`nolo table add-column` 会改变表 schema 元数据，因此需要 `--schema-write-ok` 并且应当对每个表串行执行。行级表写入不需要此标志。

对于 agent 配置检查和小的配置变更，优先使用 CLI 原生命令而非临时脚本：

- `nolo agent list` 是 CLI 原生命令，优先使用本地缓存，当本地 LevelDB 缓存不可用或被锁定时降级为远程查询。
- `nolo agent read <agent>` 首先读取本地缓存的 agent 记录，然后回退到跨已知服务器候选的远程获取 + 本地缓存刷新。
- 如果本地 LevelDB 缓存不可用或被锁定，`nolo agent read` 会降级为纯远程查找，而不会在本地数据库上硬失败。
- `nolo agent update <agent> ...` 是 CLI 原生命令，支持小的定向更新，如 `--model`、`--cli-provider`、`--api-source` 和重复的 `--field key=value`。
- `nolo agent create <slug> --name <display> [--prompt <text>] [--copy-provider-from <agent>]` 创建私有 agent 记录（需已登录）。
- `nolo agent email provision <agent> [--purpose <label>] [--local-part pay]` 调用 `/rpc/provisionAgentEmailIdentity` 开通受控收件箱（如 `pay@nolo.chat`）。
- `nolo agent email bind <agent> --email <address>` 将已有地址绑定到 agent。
- `nolo agent email create-and-provision <slug> --name <display> [--local-part pay] [--copy-provider-from <agent>]` 一步创建 agent 并开通邮箱。
- `nolo auth cloudflare [--client-id <id>] [--generate-token] [--zone-name <domain>] [--write-to-env [path]]` 通过 Cloudflare 自托管 OAuth 授权并可选生成 `Zone:Email Routing:Edit` 的 API Token，还可直接写入 `.env`。
- `nolo auth claude [--no-browser] [--sync-to-server|--no-sync-to-server]` 通过 PKCE + `localhost:54545` 回调授权 Claude Pro/Max；`--no-browser` 时可粘贴最终回调 URL/授权码。凭据保存到 `~/.nolo/credentials/claude.json`。若已配置 `NOLO_SERVER`+`AUTH_TOKEN`（或 profile），登录成功后会自动 sync 到 server；可用 `--no-sync-to-server` 或 `NOLO_OAUTH_AUTO_SYNC=0` 关闭。Agent 使用 `provider: "anthropic"`、`apiKeyRef: "claude"`。
- `nolo auth cursor [--no-browser] [--sync-to-server|--no-sync-to-server]` 通过 poll-based device flow 授权 Cursor Pro（无需回调端口）。打开 `https://cursor.com/loginDeepControl` 并轮询 `api2.cursor.sh/auth/poll` 获取 token。凭据保存到 `~/.nolo/credentials/cursor.json`。同样在 server 配置存在时自动 sync。Agent 使用 `provider: "cursor"`、`apiKeyRef: "cursor"`，模型如 `cursor-grok-4.5-high`（Cursor Models 池；裸 `cursor-grok-4.5` 会由 provider 兼容映射到 high）。
- `nolo agent grant <agent> --to <userId>` 给对方发点对点额度授权（收藏 ≠ 授权；公共/跨空间需要）。
- `nolo agent grants <agent>` 列出该 agent 的有效授权。
- `nolo agent revoke-grant <agent> --from <userId>` 撤销授权。


在当前 TUI 中，支持的斜杠命令包括：
`/agent`、`/agents`、`/altscreen`（`<on|off>`）、`/clear`、`/compact`、`/context`（别名 `/ctx`）、`/copy`、`/customize`、`/density`、`/doc`、`/exit`、`/help`、`/history`、`/jobs`、`/lang`、`/login`、`/mouse`、`/new`、`/procs`、`/profile`、`/quit`、`/resume`、`/runtime`、`/skill`、`/stop`、`/switch`、`/tasks`、`/theme`、`/thinking`、`/tools`、`/update`（映射到 `nolo update`）、`/version`。

以下为规划中的产品方向示例（尚未在 TUI 中实现）：

```text
/switch list
/switch ops
/doc list
/table query builtin-dialog-probe-runs
```

参见 [`docs/nolo-cli-tui.md`](../../docs/nolo-cli-tui.md) 了解产品和技术方向。

## 构建与发布

CLI 在包含工作空间依赖（`ai` 和 `connector-experimental`）的单仓库中开发。要生成可在单仓库外通过 npm 安装的发布安全包：

```bash
bun run build:publish
```

这将创建一个 `dist/` 目录，包含：
- 一个单一的 bundle `index.js`（esbuild、`platform: node`、ESM），带有 `#!/usr/bin/env node` shebang，可在纯 Node.js 上运行，无需 Bun
- 工作空间依赖内联到 bundle 中
- 修改后的 package.json，去除了工作空间依赖，`bin.nolo` 指向 `index.js`，`files` 中仅包含 `index.js` + `README.md`

`dist/` 目录是 CI npm 发布工作流使用的发布安全产物：

```bash
bun ./scripts/release/prepareCliPublishPackage.ts --out-dir .tmp/nolo-cli-publish
cd .tmp/nolo-cli-publish
npm pack
```

对于本仓库，`nolo-cli` 的默认发布路径是 GitHub Actions 工作流 [`.github/workflows/cli-npm-publish.yml`](../../.github/workflows/cli-npm-publish.yml)。使用本地 `npm pack` 或基于 tarball 的 `npm install -g` 作为预检验证。除非你正在有意调试 CI 发布通道，否则不要将手动本地 `npm publish` 视为正常发布途径。

仓库本地版本与发布版本的关键区别：
- **仓库本地**：在 Bun 下从源码运行（`packages/cli/index.ts`）（`bun ./packages/cli/index.ts`、`bun test`），工作空间依赖由 monorepo 解析
- **发布版本**：在纯 Node.js 下从 bundle `dist/index.js` 运行，工作空间依赖内联，npm 包声明为 `dependencies`

仓库本地开发仍使用 Bun（`bun test`、`bun ./packages/cli/index.ts`）；只有发布的运行时不依赖 Bun。

## 原生二进制包

`nolo-cli` 现在支持按平台分发的原生二进制包，以提供更快的启动速度和独立的可执行文件（无需用户本地安装 Bun）。模式与 oh-my-pi 的 `pi-natives` 类似：

- `nolo-cli` 作为入口包，包含一个 Node.js 兼容的 `index.js` 引导脚本
- `nolo-cli-darwin-arm64` 等子包包含对应平台的预编译二进制
- 安装时 npm/bun 只会安装匹配当前平台与架构的可选依赖
- 引导脚本优先调用原生二进制；缺失时回退到 `bun index.ts`

当前支持的平台：

| 平台 | 包名 |
|---|---|
| macOS Apple Silicon | `nolo-cli-darwin-arm64` |

构建当前平台的原生包：

```bash
bun run packages/cli-darwin-arm64/build.ts
```

这会在 `packages/cli-darwin-arm64/nolo` 生成一个 Bun `--compile` 独立可执行文件。发布原生包时使用：

```bash
bun ./scripts/release/prepareCliNativePackage.ts --out-dir .tmp/nolo-cli-native
npm publish .tmp/nolo-cli-native/nolo-cli-darwin-arm64
```

本地开发时，若已生成本地原生二进制，`nolo` 会通过引导脚本自动使用它。若希望强制走源码（例如正在修改 TS 源码），设置环境变量：

```bash
NOLO_CLI_SOURCE=1 nolo doctor
```
