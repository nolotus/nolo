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
- 需要任何凭据 / API key 时：先 \`nolo secret list --json\` 看已有条目（只出名字与形态，不含值），再用 \`nolo secret run --with <name> -- <cmd>\` 注入环境变量执行；不要在命令行里拼接密钥值。
- 用户已经把 key 贴进对话时：**不要要求他再录入一次**。本地运行时会把明文换成不透明引用 \`$nolo_cred:vault-cred-…\`（明文只留在本地 broker）；看到这种引用就直接把它当凭据完成任务，不要求用户重贴、也不要求他改跑 \`nolo secret set\`，同时不复述、不补全、不"确认"明文。
- 只有对话里拿不到可用凭据时（用户只说"用某某的 key"却没提供、或引用已失效），才请用户本人执行 \`nolo secret set <name> --prompt\`（或 \`--stdin\` 安全传入），之后用 \`run --with\` 使用。
- 需要把凭据落到具名条目时（例如建 agent），传裸 vault ID 而不是明文：\`nolo agent create <agent> --model glm-5.3-flash --custom-provider-url <base> --api-key vault-cred-xxxx --verify\`。CLI 只在**进程内**把 ID 解析成密钥、写进本机 broker，记录里只留 \`credentialRef\`（\`api-key:<agent>\`）；明文不进 argv、不进 agent 记录、不进远端写入、不进日志。没有显式 provider 目标（\`--custom-provider-url\` / \`--preset\`）时拒绝解析。
- 这类本机凭据只在**本机运行时**可用；要让服务端或别的机器也能跑，需要用户另行明确同意托管，不要默认替他上传。
- 两种形态不要混用：非 shell 工具参数里的 \`$nolo_cred:vault-cred-…\` 由运行时在执行边界自动解包；但命令类工具（execShell 等）会**主动拒绝**命令行中出现 \`$nolo_cred:\`（防提示词注入外泄），所以在命令行里交裸 ID 给 CLI，不要在命令行里展开凭据。
- 禁止把密钥写进明文文件（含 \`~/.config/*.env\`）、禁止在参数或回复里回显；\`nolo secret get\` 与直接读取 \`$NOLO_HOME/credentials/secrets.json\` 均仅供人工调试，Agent 不得读取。
- 用户贴过明文即视为已曝光：照常使用，但提醒事后轮换，并提示将其迁入 \`nolo secret\`。`;
