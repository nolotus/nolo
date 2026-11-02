/**
 * `nolo secret` command surface.
 *
 * Domain file reserved for the secret command family so that command-family
 * i18n work can proceed on separate files without write contention.
 */
export const secretStrings = {
  "secret.help": {
    en: `Usage:
  nolo secret list [--json]                List saved secret names (without values; --json outputs machine-readable list)
  nolo secret get <name>                   Print the value of a secret (for debugging; agents must not read)
  nolo secret set <name> --prompt          Set a secret via hidden interactive prompt (TTY only; does not echo secret)
  nolo secret set <name> --stdin           Set a secret securely from stdin (recommended; prevents leaking secrets in argv)
  nolo secret set <name> <value|json>      Set a secret via argv (legacy; discouraged: exposes secrets in shell history and process list)
  nolo secret delete <name>                Delete a secret
  nolo secret run --with <names> -- <cmd>  Safely inject secret environment variables and run a command
                                           Env var name = secret name upper-cased, non-alphanumerics -> _ (my_api_key -> MY_API_KEY)
  nolo secret bind <alias> <ref> [--env <ENV_NAME>]  Bind a managed credential reference to an alias
  nolo secret list-bindings                List configured secret alias bindings
  nolo secret unbind <alias>               Remove a secret alias binding
`,
    zh: `用法:
  nolo secret list [--json]                列出已保存的 secret 名称（不显示值；--json 输出机器可读清单）
  nolo secret get <name>                   打印指定 secret 的值（供调试；Agent 不得读取）
  nolo secret set <name> --prompt          通过隐藏输入交互设置 secret（仅限 TTY，不回显凭据）
  nolo secret set <name> --stdin           从 stdin 安全设置 secret（推荐；避免通过命令行参数泄露凭据）
  nolo secret set <name> <value|json>      通过命令行参数设置 secret（兼容旧语法；不推荐：凭据会暴露在进程列表与 shell 历史中）
  nolo secret delete <name>                删除指定的 secret
  nolo secret run --with <names> -- <cmd>  安全注入 secret 环境变量并执行子命令
                                           环境变量名 = 秘钥名全大写、非字母数字替换为 _（my_api_key -> MY_API_KEY）
  nolo secret bind <alias> <ref> [--env <ENV_NAME>]  将受控凭据引用绑定到别名
  nolo secret list-bindings                列出已配置的 secret 别名绑定
  nolo secret unbind <alias>               解除指定的 secret 别名绑定
`,
  },
  "secret.errorPrefix": {
    en: "Error: {0}",
    zh: "错误: {0}",
  },
  "secret.listEmpty": {
    en: "(No secrets currently saved)",
    zh: "（当前未保存任何 secret）",
  },
  "secret.listHeader": {
    en: "Configured secrets:",
    zh: "已配置的 secret 列表:",
  },
  "secret.getNameRequired": {
    en: "Error: Please provide a secret name. Example: nolo secret get amo",
    zh: "错误: 请提供 secret 名称。例如: nolo secret get amo",
  },
  "secret.getNotFound": {
    en: 'Error: Secret "{0}" not found',
    zh: '错误: 未找到名为 "{0}" 的 secret',
  },
  "secret.setNameAndValueRequired": {
    en: "Error: Please provide both secret name and value",
    zh: "错误: 请提供 secret 名称与值",
  },
  "secret.setValueRequired": {
    en: "Error: Please provide a secret value",
    zh: "错误: 请提供 secret 值",
  },
  "secret.setSuccess": {
    en: '✅ Successfully saved secret: "{0}" (mode 0600)',
    zh: '✅ 成功保存 secret: "{0}"（权限 0600）',
  },
  "secret.deleteNameRequired": {
    en: "Error: Please provide a secret name to delete",
    zh: "错误: 请提供要删除的 secret 名称",
  },
  "secret.deleteSuccess": {
    en: '✅ Successfully deleted secret: "{0}"',
    zh: '✅ 成功删除 secret: "{0}"',
  },
  "secret.deleteNotFound": {
    en: 'Secret "{0}" not found, nothing to delete',
    zh: '未找到名为 "{0}" 的 secret，无需删除',
  },
  "secret.runCmdRequired": {
    en: "Error: Please provide a command to run. Example: nolo secret run --with amo -- bunx web-ext sign",
    zh: "错误: 请提供要执行的命令。例如: nolo secret run --with amo -- bunx web-ext sign",
  },
  "secret.runMissingBrokerRef": {
    en: "Error: Credential reference {0} does not exist in local vault or is unauthorized.",
    zh: "错误: 凭证引用 {0} 在本地保管库中不存在或未授权。",
  },
  "secret.runMissingSecrets": {
    en: "Error: Secret not found: {0}. Use nolo secret list to check saved names.",
    zh: "错误: 未找到 secret: {0}。用 nolo secret list 核对已保存的名称。",
  },
  "secret.runNoInjectedEnvs": {
    en: "Error: --with {0} did not resolve to any environment variables (credentials cannot be mapped to variables).",
    zh: "错误: --with {0} 没有解析出任何环境变量（凭据无法映射成变量）。",
  },
  "secret.runCommandFailed": {
    en: "Failed to execute command: {0}",
    zh: "执行命令失败: {0}",
  },
  "secret.bindEnvValueRequired": {
    en: "Error: --env requires an environment variable name. Example: --env DEEPINFRA_API_KEY",
    zh: "错误: --env 需要指定环境变量名。例如: --env DEEPINFRA_API_KEY",
  },
  "secret.bindArgsRequired": {
    en: "Error: Please provide alias and credential reference (ref). Example: nolo secret bind deepinfra_api_key vault-cred-xxx [--env DEEPINFRA_API_KEY]",
    zh: "错误: 请提供 alias 与凭据引用 (ref)。例如: nolo secret bind deepinfra_api_key vault-cred-xxx [--env DEEPINFRA_API_KEY]",
  },
  "secret.bindSuccess": {
    en: '✅ Successfully bound secret: "{0}" -> {1} (env: {2})',
    zh: '✅ 成功绑定 secret: "{0}" -> {1} (env: {2})',
  },
  "secret.bindingsEmpty": {
    en: "(No secret alias bindings currently configured)",
    zh: "（当前未配置任何 secret 别名绑定）",
  },
  "secret.bindingsHeader": {
    en: "Configured secret alias bindings:",
    zh: "已配置的 secret 别名绑定列表:",
  },
  "secret.unbindAliasRequired": {
    en: "Error: Please provide an alias to unbind. Example: nolo secret unbind deepinfra_api_key",
    zh: "错误: 请提供要解除绑定的别名 (alias)。例如: nolo secret unbind deepinfra_api_key",
  },
  "secret.unbindSuccess": {
    en: '✅ Successfully unbound secret: "{0}"',
    zh: '✅ 成功解除 secret 绑定: "{0}"',
  },
  "secret.unbindNotFound": {
    en: 'Secret binding "{0}" not found, nothing to unbind',
    zh: '未找到名为 "{0}" 的 secret 绑定，无需解除',
  },
  "secret.unknownSubcommand": {
    en: "Unknown subcommand: {0}. Run nolo secret --help for usage",
    zh: "未知子命令: {0}。运行 nolo secret --help 查看用法",
  },
  "secret.jsonInvalid": {
    en: "value starts with { or [ but is not valid JSON",
    zh: "值以 { 或 [ 开头但不是合法的 JSON",
  },
  "secret.jsonScalar": {
    en: "JSON values must be an object or an array, not a scalar",
    zh: "JSON 值必须是对象或数组，不能是标量",
  },
  "secret.setNameRequired": {
    en: "Error: Please provide a secret name. Example: nolo secret set <name> --stdin",
    zh: "错误: 请提供 secret 名称。例如: nolo secret set <name> --stdin",
  },
  "secret.stdinDuplicateFlag": {
    en: "Error: Duplicate --stdin flag",
    zh: "错误: --stdin 参数重复",
  },
  "secret.stdinMixedWithValue": {
    en: "Error: Cannot mix --stdin with value arguments. Pass value via stream only",
    zh: "错误: 不能将 --stdin 与值参数混用。请仅通过流输入提供值",
  },
  "secret.stdinTtyNotSupported": {
    en: "Error: Interactive terminal (TTY) detected. --stdin is not an interactive prompt; please pipe input via stdin (e.g. pass show secret | nolo secret set <name> --stdin)",
    zh: "错误: 检测到交互式终端 (TTY)。--stdin 不是交互式隐藏提示符；请通过管道提供输入（例如: pass show secret | nolo secret set <name> --stdin）",
  },
  "secret.stdinEmpty": {
    en: "Error: Secret input from stdin cannot be empty or pure whitespace",
    zh: "错误: 来自 stdin 的 secret 输入不能为空或纯空白",
  },
  "secret.stdinTooLarge": {
    en: "Error: Secret input from stdin exceeds maximum limit (64 KiB)",
    zh: "错误: 来自 stdin 的 secret 输入超过最大限制 (64 KiB)",
  },
  "secret.stdinTimeout": {
    en: "Error: Timed out waiting for stdin input (10s limit)",
    zh: "错误: 等待 stdin 输入超时（限制 10 秒）",
  },
  "secret.stdinReadError": {
    en: "Error: Failed to read secret from stdin",
    zh: "错误: 从 stdin 读取 secret 失败",
  },
  "secret.promptDuplicateFlag": {
    en: "Error: Duplicate --prompt flag",
    zh: "错误: --prompt 参数重复",
  },
  "secret.cannotMixStdinAndPrompt": {
    en: "Error: Cannot mix --stdin and --prompt flags",
    zh: "错误: 不能同时使用 --stdin 和 --prompt 参数",
  },
  "secret.promptMixedWithValue": {
    en: "Error: Cannot mix --prompt with value arguments. Pass value via interactive prompt only",
    zh: "错误: 不能将 --prompt 与值参数混用。请仅通过交互提示符提供值",
  },
  "secret.promptNameRequired": {
    en: "Error: Please provide a secret name. Example: nolo secret set <name> --prompt",
    zh: "错误: 请提供 secret 名称。例如: nolo secret set <name> --prompt",
  },
  "secret.promptNonTtyNotSupported": {
    en: "Error: Interactive terminal (TTY) required for --prompt. For automated pipelines use --stdin",
    zh: "错误: --prompt 需要交互式终端 (TTY)。自动化流水线请使用 --stdin",
  },
  "secret.promptEmpty": {
    en: "Error: Secret input from prompt cannot be empty or pure whitespace",
    zh: "错误: 来自提示符的 secret 输入不能为空或纯空白",
  },
  "secret.promptAborted": {
    en: "Secret input cancelled",
    zh: "用户取消了 secret 输入",
  },
  "secret.promptLabel": {
    en: 'Enter secret value for "{0}": ',
    zh: '请输入 "{0}" 的 secret 值（输入内容已隐藏）: ',
  },
  "secret.promptReadError": {
    en: "Error: Failed to read secret from prompt",
    zh: "错误: 从交互提示符读取 secret 失败",
  },
} as const;
