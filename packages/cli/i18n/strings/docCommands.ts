/**
 * `nolo doc ...` command surface (read / create / update / delete).
 *
 * Separate from `doc.ts`, which holds TUI-side doc/space/table strings.
 */
export const docCommandStrings = {
  // Usage texts
  "docCmd.readUsage": {
    en: `Usage:
  nolo doc read (--id <pageId> | --key <pageKey>)

Options:
  --id <pageId>             Page id (without user prefix).
  --key <pageKey>           Full dbKey, e.g. page-<userId>-<pageId>.
  --server <url>            Server to read from.
  --token <jwt>             Auth token. Required for reads.
`,
    zh: `用法:
  nolo doc read (--id <pageId> | --key <pageKey>)

选项:
  --id <pageId>             页面 ID（不带用户前缀）。
  --key <pageKey>           完整 dbKey，例如 page-<userId>-<pageId>。
  --server <url>            读取的目标服务器。
  --token <jwt>             身份验证令牌。读取操作必需。
`,
  },
  "docCmd.skillReadUsage": {
    en: `Usage:
  nolo skill-doc read (--id <skillId> | --key <pageKey>)

Options:
  --id <skillId>            Skill id (without user prefix).
  --key <pageKey>           Full dbKey, e.g. page-<userId>-<skillId>.
  --server <url>            Server to read from.
  --token <jwt>             Auth token. Required for reads.
`,
    zh: `用法:
  nolo skill-doc read (--id <skillId> | --key <pageKey>)

选项:
  --id <skillId>            技能 ID（不带用户前缀）。
  --key <pageKey>           完整 dbKey，例如 page-<userId>-<skillId>。
  --server <url>            读取的目标服务器。
  --token <jwt>             身份验证令牌。读取操作必需。
`,
  },
  "docCmd.createUsage": {
    en: `Usage:
  nolo doc create --title <title> [--body ... | --body-file path] [--id ...] [--space ...]

Options:
  --description <text>      Optional page description stored in meta.
  --sync local,main,us      Choose write targets. Values may also be full URLs.
  --local-only              Write only to the local server target.
  --no-local                Exclude local targets when --sync includes them.
  --dry-run                 Build and validate without writing.
  --json                    Print machine-readable JSON.
  --allow-secrets           Allow bodies that look like credentials.
  --server <url>            Default write target when --sync is omitted.
  --token <jwt>             Auth token. Required for writes.
`,
    zh: `用法:
  nolo doc create --title <title> [--body ... | --body-file path] [--id ...] [--space ...]

选项:
  --description <text>      存储在 meta 中的可选页面描述。
  --sync local,main,us      选择写入目标。值也可以是完整 URL。
  --local-only              仅写入本地服务器目标。
  --no-local                当 --sync 包含本地目标时将其排除。
  --dry-run                 仅构建并校验，不执行写入。
  --json                    输出机器可读的 JSON。
  --allow-secrets           允许包含疑似凭据的内容。
  --server <url>            省略 --sync 时的默认写入目标。
  --token <jwt>             身份验证令牌。写入操作必需。
`,
  },
  "docCmd.skillCreateUsage": {
    en: `Usage:
  nolo skill-doc create --title <title> --description <text> [--body ... | --body-file path]
  nolo skill create-doc --title <title> --description <text> [--body ... | --body-file path]

Options:
  --tools '["readDoc"]'                 Tool names this skill expects.
  --required-skills '["skill-a"]'       Required skill references.
  --recommended-skills '["skill-b"]'    Recommended skill references.
  --trigger-mode explicit|required|recommended
  --prompt-patch <text>
  --page | --kind page                  Create a normal page instead of a skill-backed page.
  --sync local,main,us                  Choose write targets. Values may also be full URLs.
  --dry-run                             Build and validate without writing.
  --json                                Print machine-readable JSON.
  --token <jwt>                         Auth token. Required for writes.
`,
    zh: `用法:
  nolo skill-doc create --title <title> --description <text> [--body ... | --body-file path]
  nolo skill create-doc --title <title> --description <text> [--body ... | --body-file path]

选项:
  --tools '["readDoc"]'                 此技能期望调用的工具名称列表。
  --required-skills '["skill-a"]'       必需的技能引用。
  --recommended-skills '["skill-b"]'    推荐的技能引用。
  --trigger-mode explicit|required|recommended
  --prompt-patch <text>
  --page | --kind page                  创建普通页面而非技能页面。
  --sync local,main,us                  选择写入目标。值也可以是完整 URL。
  --dry-run                             仅构建并校验，不执行写入。
  --json                                输出机器可读的 JSON。
  --token <jwt>                         身份验证令牌。写入操作必需。
`,
  },
  "docCmd.updateUsage": {
    en: `Usage:
  nolo doc update (--id <pageId> | --key <pageKey>) [--title ...] [--body ... | --body-file path] [--space ...]

Options:
  --id <pageId>             Page id (without user prefix).
  --key <pageKey>           Full dbKey, e.g. page-<userId>-<pageId>.
  --title <text>            New title.
  --description <text>      New page description stored in meta.
  --body <text>             New page body.
  --body-file <path>       Read body from file.
  --space <spaceId>         Move/attach the page to this space.
  --sync local,main,us      Choose write targets. Values may also be full URLs.
  --local-only              Write only to the local server target.
  --no-local                Exclude local targets when --sync includes them.
  --dry-run                 Build and validate without writing.
  --json                    Print machine-readable JSON.
  --allow-secrets           Allow bodies that look like credentials.
  --server <url>            Default write target when --sync is omitted.
  --token <jwt>             Auth token. Required for writes.
`,
    zh: `用法:
  nolo doc update (--id <pageId> | --key <pageKey>) [--title ...] [--body ... | --body-file path] [--space ...]

选项:
  --id <pageId>             页面 ID（不带用户前缀）。
  --key <pageKey>           完整 dbKey，例如 page-<userId>-<pageId>。
  --title <text>            新标题。
  --description <text>      存储在 meta 中的新页面描述。
  --body <text>             新页面正文。
  --body-file <path>       从文件读取正文。
  --space <spaceId>         移动/关联页面至此空间。
  --sync local,main,us      选择写入目标。值也可以是完整 URL。
  --local-only              仅写入本地服务器目标。
  --no-local                当 --sync 包含本地目标时将其排除。
  --dry-run                 仅构建并校验，不执行写入。
  --json                    输出机器可读的 JSON。
  --allow-secrets           允许包含疑似凭据的内容。
  --server <url>            省略 --sync 时的默认写入目标。
  --token <jwt>             身份验证令牌。写入操作必需。
`,
  },
  "docCmd.skillUpdateUsage": {
    en: `Usage:
  nolo skill-doc update (--id <skillId> | --key <pageKey>) [--title ...] [--description ...] [--body ... | --body-file path]

Options:
  --id <skillId>            Skill id (without user prefix).
  --key <pageKey>           Full dbKey, e.g. page-<userId>-<skillId>.
  --title <text>            New page title. Also renames the skill unless --name is given.
  --name <text>             New skill name only, leaving the page title untouched.
                            The name is the skill's identity that other docs
                            reference, so prefer this over --title when you only
                            want a nicer title.
  --description <text>      New skill description.
  --body <text>             New skill body.
  --body-file <path>       Read body from file.
  --space <spaceId>         Move/attach the skill page to this space.
  --tools '["readDoc"]'                 Replace tool names this skill expects.
  --required-skills '["skill-a"]'       Replace required skill references.
  --recommended-skills '["skill-b"]'    Replace recommended skill references.
  --trigger-mode explicit|required|recommended
  --prompt-patch <text>
  --sync local,main,us                  Choose write targets. Values may also be full URLs.
  --local-only                          Write only to the local server target.
  --no-local                            Exclude local targets when --sync includes them.
  --dry-run                             Build and validate without writing.
  --json                                Print machine-readable JSON.
  --allow-secrets                       Allow bodies that look like credentials.
  --token <jwt>                         Auth token. Required for writes.

Promotion:
  If the target is a plain page whose body already contains a valid
  <!-- skill-config ... --> block, this command adopts it: the block is parsed,
  normalized and written back into record.meta (kind="skill" + skillConfig),
  keeping the same dbKey. Use --dry-run first to preview.
`,
    zh: `用法:
  nolo skill-doc update (--id <skillId> | --key <pageKey>) [--title ...] [--description ...] [--body ... | --body-file path]

选项:
  --id <skillId>            技能 ID（不带用户前缀）。
  --key <pageKey>           完整 dbKey，例如 page-<userId>-<skillId>。
  --title <text>            新页面标题。除非指定 --name，否则也会重命名技能。
  --name <text>             仅修改技能名称，保持页面标题不变。
                            名称是其他文档引用此技能的标识符，
                            因此若仅希望更新展示标题，建议优先使用此选项。
  --description <text>      新技能描述。
  --body <text>             新技能正文。
  --body-file <path>       从文件读取正文。
  --space <spaceId>         移动/关联技能页面至此空间。
  --tools '["readDoc"]'                 替换此技能期望调用的工具名称列表。
  --required-skills '["skill-a"]'       替换必需的技能引用。
  --recommended-skills '["skill-b"]'    替换推荐的技能引用。
  --trigger-mode explicit|required|recommended
  --prompt-patch <text>
  --sync local,main,us                  选择写入目标。值也可以是完整 URL。
  --local-only                          仅写入本地服务器目标。
  --no-local                            当 --sync 包含本地目标时将其排除。
  --dry-run                             仅构建并校验，不执行写入。
  --json                                输出机器可读的 JSON。
  --allow-secrets                       允许包含疑似凭据的内容。
  --token <jwt>                         身份验证令牌。写入操作必需。

晋升:
  如果目标是普通页面，且正文已包含有效的
  <!-- skill-config ... --> 区块，此命令将接纳它：解析该区块、
  规范化并写回 record.meta（kind="skill" + skillConfig），
  保持 dbKey 不变。建议先用 --dry-run 预览。
`,
  },
  "docCmd.deleteUsage": {
    en: `Usage:
  nolo doc delete (--id <pageId> | --key <pageKey>)

Options:
  --id <pageId>             Page id (without user prefix).
  --key <pageKey>           Full dbKey, e.g. page-<userId>-<pageId>.
  --sync local,main,us      Choose delete targets. Values may also be full URLs.
  --local-only              Delete only on the local server target.
  --no-local                Exclude local targets when --sync includes them.
  --dry-run                 Show what would be deleted without deleting.
  --json                    Print machine-readable JSON.
  --server <url>            Default target when --sync is omitted.
  --token <jwt>             Auth token. Required for deletes.
`,
    zh: `用法:
  nolo doc delete (--id <pageId> | --key <pageKey>)

选项:
  --id <pageId>             页面 ID（不带用户前缀）。
  --key <pageKey>           完整 dbKey，例如 page-<userId>-<pageId>。
  --sync local,main,us      选择删除目标。值也可以是完整 URL。
  --local-only              仅在本地服务器目标上删除。
  --no-local                当 --sync 包含本地目标时将其排除。
  --dry-run                 仅预览将要删除的内容，不执行删除。
  --json                    输出机器可读的 JSON。
  --server <url>            省略 --sync 时的默认目标。
  --token <jwt>             身份验证令牌。删除操作必需。
`,
  },
  "docCmd.skillDeleteUsage": {
    en: `Usage:
  nolo skill-doc delete (--id <skillId> | --key <pageKey>)

Options:
  --id <skillId>            Skill id (without user prefix).
  --key <pageKey>           Full dbKey, e.g. page-<userId>-<skillId>.
  --sync local,main,us      Choose delete targets. Values may also be full URLs.
  --local-only              Delete only on the local server target.
  --no-local                Exclude local targets when --sync includes them.
  --dry-run                 Show what would be deleted without deleting.
  --json                    Print machine-readable JSON.
  --token <jwt>             Auth token. Required for deletes.
`,
    zh: `用法:
  nolo skill-doc delete (--id <skillId> | --key <pageKey>)

选项:
  --id <skillId>            技能 ID（不带用户前缀）。
  --key <pageKey>           完整 dbKey，例如 page-<userId>-<skillId>。
  --sync local,main,us      选择删除目标。值也可以是完整 URL。
  --local-only              仅在本地服务器目标上删除。
  --no-local                当 --sync 包含本地目标时将其排除。
  --dry-run                 仅预览将要删除的内容，不执行删除。
  --json                    输出机器可读的 JSON。
  --token <jwt>             身份验证令牌。删除操作必需。
`,
  },

  // Errors
  "docCmd.noReadTargetsResolved": {
    en: "No read targets resolved. Check --server.",
    zh: "未解析到任何读取目标。请检查 --server。",
  },
  "docCmd.docNotFound": {
    en: "doc not found: {0}",
    zh: "未找到文档: {0}",
  },
  "docCmd.secretBodyWarning": {
    en: "Document body appears to contain credentials or secrets. Pass --allow-secrets to write it anyway.",
    zh: "文档正文疑似包含凭据或密钥。可传入 --allow-secrets 强制写入。",
  },
  "docCmd.noWriteTargetsResolved": {
    en: "No write targets resolved. Check --sync / --local-only / --no-local.",
    zh: "未解析到任何写入目标。请检查 --sync / --local-only / --no-local。",
  },
  "docCmd.docNotFoundOnTargets": {
    en: "doc not found on any target: {0}",
    zh: "在任何目标上均未找到文档: {0}",
  },
  "docCmd.targetIsSkillDoc": {
    en: "Target page is a skill doc. Use nolo skill-doc update --key {0}",
    zh: "目标页面是技能文档。请使用 nolo skill-doc update --key {0}",
  },
  "docCmd.targetNotSkillDoc": {
    en: "Target page is not a skill doc and its body has no valid skill-config block. Use nolo doc update --key {0}",
    zh: "目标页面不是技能文档，且其正文没有有效的 skill-config 区块。请使用 nolo doc update --key {0}",
  },
  "docCmd.docNoTitle": {
    en: "doc has no title and none was provided: {0}",
    zh: "文档没有标题且未提供新标题: {0}",
  },
  "docCmd.existingSkillMissingConfig": {
    en: "existing skill doc is missing skillConfig: {0}",
    zh: "现有技能文档缺少 skillConfig: {0}",
  },
  "docCmd.nameCannotBeEmpty": {
    en: "--name cannot be empty. Omit it to keep the current skill name.",
    zh: "--name 不能为空。省略此选项以保留当前技能名称。",
  },
  "docCmd.noDeleteTargetsResolved": {
    en: "No delete targets resolved. Check --sync / --local-only / --no-local.",
    zh: "未解析到任何删除目标。请检查 --sync / --local-only / --no-local。",
  },
  "docCmd.targetIsSkillDocDelete": {
    en: "Target page is a skill doc. Use nolo skill-doc delete --key {0}",
    zh: "目标页面是技能文档。请使用 nolo skill-doc delete --key {0}",
  },
  "docCmd.targetNotSkillDocDelete": {
    en: "Target page is not a skill doc. Use nolo doc delete --key {0}",
    zh: "目标页面不是技能文档。请使用 nolo doc delete --key {0}",
  },
  "docCmd.deleteFailedOnServers": {
    en: "delete {0} failed on {1}",
    zh: "删除 {0} 在以下服务器上失败: {1}",
  },

  // Output formatting
  "docCmd.readDoc": {
    en: "read {0}: {1}\n",
    zh: "读取 {0}: {1}\n",
  },
  "docCmd.titleLine": {
    en: "title: {0}\n",
    zh: "标题: {0}\n",
  },
  "docCmd.spaceIdLine": {
    en: "spaceId: {0}\n",
    zh: "空间ID: {0}\n",
  },
  "docCmd.none": {
    en: "(none)",
    zh: "(无)",
  },
  "docCmd.dryRunOk": {
    en: "dry-run ok: {0}\n",
    zh: "预检通过：{0}\n",
  },
  "docCmd.dryRunOkPromote": {
    en: "dry-run ok (promote page -> skill): {0}\n",
    zh: "预检通过（页面提升为 skill）：{0}\n",
  },
  "docCmd.createdDoc": {
    en: "created {0}: {1}\n",
    zh: "已创建 {0}：{1}\n",
  },
  "docCmd.promotedPageToSkill": {
    en: "promoted page to skill: {0}\n",
    zh: "已提升页面为 skill：{0}\n",
  },
  "docCmd.updatedDoc": {
    en: "updated {0}: {1}\n",
    zh: "已更新 {0}：{1}\n",
  },
  "docCmd.deletedDoc": {
    en: "deleted {0}: {1}\n",
    zh: "已删除 {0}：{1}\n",
  },
} as const;
