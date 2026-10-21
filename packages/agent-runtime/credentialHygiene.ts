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
- 新增凭据：请用户本人执行 \`nolo secret set <name> <value>\`（值不要经过 agent 的命令行或回复），之后照常用 \`run --with\` 使用。
- 禁止把密钥写进文件（含 \`~/.config/*.env\`）、禁止在参数或回复里回显；\`nolo secret get\` 与直接读取 \`$NOLO_HOME/credentials/secrets.json\` 均仅供人工调试，Agent 不得读取。
- 用户把密钥直接贴进对话时：照常使用，但提醒事后轮换，并提示用户把它迁进 \`nolo secret\`。`;
