// packages/core/desktop/desktopUpdaterMessages.ts
//
// 更新面板的展示层文案映射（2026-09-16）。
//
// electrobun 的 Updater 以英文写入 latestStatus / statusHistory / updateInfo.error，
// 设置页此前原样渲染——用户看到 "Starting update download..." 这类工程文案，失败时
// 也只有一个英文 Error。这里把已知状态码、已知英文事件文案与已知失败原因翻成中文；
// 未知的一律回落到原文，绝不隐藏信息（原始英文保留在 title/日志里供排障）。

export const DESKTOP_UPDATER_STATUS_LABELS: Record<string, string> = {
  checking: "正在检查更新…",
  "no-update": "已是最新版本",
  "download-starting": "开始下载更新包…",
  "downloading-full-bundle": "正在下载完整更新包…",
  "download-progress": "正在下载更新包…",
  "extracting-version": "读取增量更新信息…",
  "patch-applied": "增量补丁已应用",
  "patch-chain-complete": "增量补丁链完成",
  decompressing: "正在解压更新包…",
  "download-complete": "更新包已下载并准备就绪",
  applying: "正在准备安装…",
  "launching-new-version": "更新就绪，正在重启应用…",
  // 新版 electrobun 用 complete 收尾（旧版是 launching-new-version）：两个都留，
  // 谁在都可能命中（UI 对 complete 也有绿勾分支）。
  complete: "更新完成，正在重启应用…",
  idle: "更新重启已被应用退出前的处理取消",
  // nolo 自己的持久化交接失败状态（core/desktop/desktopUpdateShutdownStatus）。
  "quit-handoff-failed": "上次更新未能应用：应用没有完全退出，更新未生效。",
};

const DEV_CHANNEL_NO_UPDATE_RE = /dev channel/i;

/** 已知英文事件文案 → 中文（状态码缺失时按文案兜底）。 */
const MESSAGE_RULES: readonly { match: RegExp; label: string }[] = [
  { match: /^Checking for updates\.\.\.$/i, label: "正在检查更新…" },
  { match: /^Starting update download\.\.\.$/i, label: "开始下载更新包…" },
  { match: /^Downloading full update bundle\.\.\.$/i, label: "正在下载完整更新包…" },
  { match: /^Downloading update bundle\.\.\.$/i, label: "正在下载更新包…" },
  { match: /^Decompressing update bundle\.\.\.$/i, label: "正在解压更新包…" },
  { match: /^Reading patched update metadata\.\.\.$/i, label: "读取增量更新信息…" },
  { match: /^Update bundle (?:downloaded and prepared|is already prepared)$/i, label: "更新包已下载并准备就绪" },
  { match: /^Patch applied successfully$/i, label: "增量补丁已应用" },
  { match: /^Patch chain complete$/i, label: "增量补丁链完成" },
  { match: /^Preparing update handoff\.\.\.$/i, label: "正在准备安装…" },
  { match: /^Update prepared; restarting application\.\.\.$/i, label: "更新就绪，正在重启应用…" },
  { match: /^Update complete, restarting application\.\.\.$/i, label: "更新完成，正在重启应用…" },
  { match: /^Already on latest version$/i, label: "已是最新版本" },
  { match: /^Dev channel - updates disabled$/i, label: "开发通道不检查更新" },
  { match: /^Last update could not be applied:/i, label: "上次更新未能应用（应用未完全退出）；请退出应用后重试。" },
];

/** 我们自己 policy 派生的英文状态（带版本号，需动态渲染）。 */
const POLICY_MESSAGE_RULES: readonly { match: RegExp; render: (matched: RegExpMatchArray) => string }[] =
  [
    {
      match: /^Desktop update (.+) is available\.$/i,
      render: (matched) => `发现新版本 ${matched[1]}，可直接下载更新包。`,
    },
    {
      match: /^Downloaded desktop update (.+) is ready to install\.$/i,
      render: (matched) => `更新 ${matched[1]} 已下载，重启客户端即可安装。`,
    },
  ];

const describeByMessage = (message: string): string | null => {
  for (const rule of POLICY_MESSAGE_RULES) {
    const matched = message.match(rule.match);
    if (matched) return rule.render(matched);
  }
  for (const rule of MESSAGE_RULES) {
    if (rule.match.test(message)) return rule.label;
  }
  return null;
};

export function describeDesktopUpdaterStatus(
  status?: string | null,
  message?: string | null
): string | null {
  const normalizedStatus = status?.trim();
  const normalizedMessage = message?.trim() ?? "";
  if (normalizedStatus) {
    // no-update 有两种来源：常规“已是最新”与 dev 通道禁用更新。
    if (normalizedStatus === "no-update" && DEV_CHANNEL_NO_UPDATE_RE.test(normalizedMessage)) {
      return "开发通道不检查更新";
    }
    const label = DESKTOP_UPDATER_STATUS_LABELS[normalizedStatus];
    if (label) return label;
  }
  const byMessage = describeByMessage(normalizedMessage);
  if (byMessage) return byMessage;
  return normalizedMessage ? normalizedMessage : null;
}

type ErrorRule = {
  match: RegExp;
  render: (matched: RegExpMatchArray) => string;
};

const ERROR_RULES: ErrorRule[] = [
  {
    match: /outside its managed update directory/i,
    render: () =>
      "应用不在受管理的安装目录中，无法自动更新。请使用官方安装包重新安装一次，之后即可正常更新。",
  },
  // 带 HTTP 码的元数据请求失败必须保留状态码，且要排在宽泛规则之前。
  {
    match: /Failed to fetch update info\s*\(?\s*HTTP (\d{3})\)?/i,
    render: (matched) => `无法获取更新信息（服务返回 HTTP ${matched[1]}），请稍后重试。`,
  },
  {
    match: /Update artifact request failed with HTTP (\d{3})/i,
    render: (matched) => `下载更新包失败（服务返回 HTTP ${matched[1]}），请稍后重试。`,
  },
  {
    match: /Failed to fetch update info/i,
    render: () => "无法获取更新信息（网络或更新服务不可用），请稍后重试。",
  },
  {
    match: /Failed to write update file|EACCES|permission denied/i,
    render: () => "写入更新文件失败（可能是磁盘空间不足或权限问题）。",
  },
  {
    match: /Decompressed update archive is empty|Invalid TAR header checksum|unsupported file type/i,
    render: () => "更新包校验失败（文件可能不完整），请重新下载。",
  },
  {
    match: /Cannot download an update while one is being applied/i,
    render: () => "正在安装更新，暂时不能再次下载。",
  },
  {
    match: /Invalid update manifest|release identity does not match/i,
    render: () => "远端更新元数据无效，已跳过本次更新。",
  },
  {
    match: /HTTP (\d{3})/i,
    render: (matched) => `更新服务返回 HTTP ${matched[1]}，请稍后重试。`,
  },
  {
    match: /fetch failed|network|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|timed out|aborted/i,
    render: () => "网络请求失败，请检查网络后重试。",
  },
];

export function describeDesktopUpdaterError(error?: string | null): string | null {
  const raw = error?.trim();
  if (!raw) return null;
  for (const rule of ERROR_RULES) {
    const matched = raw.match(rule.match);
    if (matched) return rule.render(matched);
  }
  return raw;
}

/**
 * 面板「状态说明」行的映射：先认失败原因，再认已知事件文案，最后原样返回。
 * 未知文本绝不吞掉（排障优先）。
 */
export function describeDesktopUpdaterText(text?: string | null): string | null {
  const raw = text?.trim();
  if (!raw) return null;
  for (const rule of ERROR_RULES) {
    const matched = raw.match(rule.match);
    if (matched) return rule.render(matched);
  }
  return describeByMessage(raw) ?? raw;
}
