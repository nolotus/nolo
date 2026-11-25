// packages/agent-runtime/credentialHygiene.ts
//
// 凭据纪律：系统层固定块，四条装配线共用同一份真值。
// 与 deleteSafety / parallelDispatchDefault 同一约定 —— 各线手写会静默漂移。
//
// 触发原因（2026-10-21 复盘）：agent 在需要第三方 API key 时，把密钥写进了
// `~/.config/*.env` 明文文件，而仓库早已有 `nolo secret`（set/list/run/bind）
// 且 owner 已存入多条凭据。根因是「能力存在但没被提示」——技能发现只扫
// `.agents/skills`，内置的 secrets-manager 不进"可用技能"列表，提示词里也没有
// 一条硬规则。此块补的就是这条规则。

export const CREDENTIAL_HYGIENE_RULE = `--- 凭据纪律 ---
- 需要任何凭据/API key：先 \`nolo secret list --json\` 查条目，再用 \`nolo secret run --with <name> -- <cmd>\` 注入环境变量；禁命令行拼明文。
- 用户已经把 key 贴进对话时：**不要要求他再录入一次**。本地运行时会把明文换成不透明引用 \`$nolo_cred:vault-cred-…\`（明文只留在本地 broker）；看到这种引用就直接把它当凭据完成任务，不要求用户重贴、也不要求他改跑 \`nolo secret set\`，同时不复述、不补全、不"确认"明文。
- 对话里拿不到可用凭据时由输入面板填写，**不要教用户去终端敲命令**；保存后用 \`run --with\`。
- 绑定具名条目（如建 agent）传裸 vault ID：\`nolo agent create <agent> --model glm-5.3-flash --custom-provider-url <base> --api-key vault-cred-xxxx --verify\`；CLI 进程内解入本机 broker，仅存 \`credentialRef\`（\`api-key:<agent>\`），无 \`--custom-provider-url\`/\`--preset\` 拒绝解析，明文不进 argv/记录/远端/日志。本机凭据仅限本机，跨端/服务端运行须用户另行明确同意。
- 两种形态不要混用：非 shell 工具参数里的 \`$nolo_cred:vault-cred-…\` 由运行时在执行边界自动解包；但命令类工具（execShell 等）会**主动拒绝**命令行中出现 \`$nolo_cred:\`（防提示词注入外泄），所以在命令行里交裸 ID 给 CLI，不要在命令行里展开凭据。
- 禁写明文文件（含 \`~/.config/*.env\`）或参数/回复回显；\`nolo secret get\` 与直读 \`$NOLO_HOME/credentials/secrets.json\` 仅供人工调试，Agent 禁读。
- 用户贴过明文视为已曝光：照常使用并提醒事后轮换、迁入 \`nolo secret\`。`;
