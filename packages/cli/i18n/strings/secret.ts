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
  nolo secret set <name> <value|json>      Set a secret (string, or JSON starting with { / [)
  nolo secret delete <name>                Delete a secret
  nolo secret run --with <names> -- <cmd>  Safely inject secret environment variables and run a command
  nolo secret bind <alias> <ref> [--env <ENV_NAME>]  Bind a managed credential reference to an alias
  nolo secret list-bindings                List configured secret alias bindings
  nolo secret unbind <alias>               Remove a secret alias binding
`,
    zh: `用法:
  nolo secret list [--json]                列出已保存的 secret 名称（不显示值；--json 输出机器可读清单）
  nolo secret get <name>                   打印指定 secret 的值（供调试；Agent 不得读取）
  nolo secret set <name> <value|json>      设置 secret（字符串，或以 { / [ 开头的 JSON）
  nolo secret delete <name>                删除指定的 secret
  nolo secret run --with <names> -- <cmd>  安全注入 secret 环境变量并执行子命令
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
} as const;
