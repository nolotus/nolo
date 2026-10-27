export const toolStrings = {
  autoUsage: {
    en: "Usage: /auto [local|remote] <on|off> · /auto reset (clear both)",
    zh: "用法：/auto [local|remote] <on|off> · /auto reset（两桶清零）",
  },
  autoStateLine: {
    en: "Local-run grant: {0} · Remote-origin shell grant: {1}",
    zh: "本机 run 授权：{0} · 远程来源在本机执行 shell 授权：{1}",
  },
  autoStateOnPersisted: {
    en: "granted (saved)",
    zh: "已授权（已保存）",
  },
  autoStateOff: {
    en: "ask every time",
    zh: "逐次询问",
  },
  autoKindLocal: {
    en: "local-run confirmations (destructive shell / outside-workspace files / file writes)",
    zh: "本机 run 的确认（破坏性命令 / 工作区外文件 / 写文件）",
  },
  autoKindRemote: {
    en: "a remote origin running shell on this machine",
    zh: "远程来源在本机执行 shell",
  },
  autoGrantOn: {
    en: "Approved and saved: {0}. That class no longer asks (this session and future starts). Undo with {1}.",
    zh: "已批准并保存：{0}。该类确认不再询问（本次与后续启动都生效）。撤销用 {1}。",
  },
  autoGrantOff: {
    en: "Revoked and saved: {0}. Those confirmations ask again (this session and future starts). Re-enable with {1}.",
    zh: "已撤销并保存：{0}。该类确认恢复逐次询问（本会话与后续启动都生效）。重新开启用 {1}。",
  },
  autoReset: {
    en: "Cleared and saved: both permission buckets are reset — every confirmation asks again.",
    zh: "已清空并保存：本机与远程两桶授权都清零，所有确认恢复逐次询问。",
  },
  autoPersistFailed: {
    en: "This grant applies to this session only — it could not be saved to your config (no profile?).",
    zh: "该授权仅本次会话有效：未能保存到配置（可能还没有 profile）。",
  },
  autoPersistedStartup: {
    en: "Approved from your saved config: {0}. Those confirmations are skipped; undo with /auto reset.",
    zh: "已从保存的配置生效的授权：{0}。这些确认已被跳过；撤销用 /auto reset。",
  },
  toolNeedsAction: {
    en: "needs action",
    zh: "待确认",
  },
  toolTimedOut: {
    en: "timed out",
    zh: "已超时",
  },
  toolExitCode: {
    en: "exit",
    zh: "退出码",
  },
  toolFailed: {
    en: "failed",
    zh: "失败",
  },
  // 分享 OAuth agent 的 shell 会话授权确认（块 D）：首次 execShell/
  // launchProcess 前弹。必须把三件事说清——这是谁的 agent / 命令在哪台
  // 设备哪个工作区跑 / 任意 shell 可读写该用户可访问的资源。
  // 子 run 的 per-call shell 确认（远程来源在本机跑一条命令）：与会话授权同一套
  // 语义，参数为 runId / agentKey / owner / device / workspace / 权限提示。
  "shellPerCall.title": {
    en: "Allow a remote origin to run this command on this machine?",
    zh: "允许远程来源在本机执行这条命令吗？",
  },
  "shellPerCall.body": {
    en:
      "A remote origin asked to run one shell command on this device.\n" +
      "Run: {0}\nAgent: {1}\nOwner: {2}\nDevice: {3}\nWorkspace: {4}\n{5}\n\n" +
      "Shell commands can read/write anything this user can access. " +
      "Approving covers this whole class: remote-origin shell confirmations stop " +
      "asking one by one (this session and future starts). " +
      "Undo with /shell-revoke or /auto remote off.",
    zh:
      "远程来源请求在本机执行一条 shell 命令。\n" +
      "Run：{0}\nAgent：{1}\n主人：{2}\n设备：{3}\n工作区：{4}\n{5}\n\n" +
      "任意 shell 命令可读写本机该用户能访问的资源。" +
      "批准后「远程来源在本机执行 shell」这一类确认不再逐条询问（本次与后续启动都生效）。" +
      "撤销：/shell-revoke 或 /auto remote off。",
  },
  "shellGrant.confirmTitle": {
    en: "Allow remote agent {0} to run shell commands on this machine?",
    zh: "允许远程 agent {0} 在本机执行 shell 命令吗？",
  },
  "shellGrant.confirmBody": {
    en:
      "Remote agent {0} (owner {1}) requested to run a shell command on this machine.\n" +
      "Device: {2} ({3})\nWorkspace: {4}\nCommand: {5}\n\n" +
      "Shell commands can read/write anything this user can access. " +
      "Approving covers this whole class: remote-origin shell confirmations stop " +
      "asking one by one (this session and future starts). " +
      "Undo with /shell-revoke (this session) or /auto remote off (also clears the saved grant).",
    zh:
      "远程 agent {0}（主人 {1}）请求在本机执行 shell 命令。\n" +
      "设备：{2}（{3}）\n工作区：{4}\n命令：{5}\n\n" +
      "任意 shell 命令可读写本机该用户能访问的资源。" +
      "批准后「远程来源在本机执行 shell」这一类确认不再逐条询问（本次与后续启动都生效）。" +
      "撤销：/shell-revoke（本会话）或 /auto remote off（同时清除持久授权）。",
  },
  "shellGrant.revoked": {
    en: "[nolo] Shell permission revoked for shared agents in this session.",
    zh: "[nolo] 已撤销本会话中分享 agent 的 shell 执行权限。",
  },
  "shellGrant.revokeNone": {
    en: "[nolo] No shell permission is currently granted in this session.",
    zh: "[nolo] 本会话当前没有已授予的 shell 权限。",
  },
  // 运行位置展示（块 D）：owner-required 场景告诉用户工具实际在哪台设备
  // 哪个工作区执行。unknown 不猜、不静默标 ready。
  "toolLocation.line": {
    en: "[nolo] Tools execute on {0} ({1}) · workspace {2} · status: {3}",
    zh: "[nolo] 工具在 {0}（{1}）· 工作区 {2} · 状态：{3} 执行",
  },
  "toolLocation.unknown": {
    en: "[nolo] Tool execution location: unknown",
    zh: "[nolo] 工具执行位置：未知",
  },
} as const;
