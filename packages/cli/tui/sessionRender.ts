import { resolveCliColorEnabled } from "../client/terminalStyles";
import {
  formatCreditsChip,
  formatTokenCount,
  renderTokenStatus,
  type TurnTokenUsage,
} from "../client/tokenUsage";
import { resolveCatalogPlatformAgents } from "./agentCatalog";
import { renderDialogTitle } from "./dialogFrame";
import { t } from "./i18n";
import { displayWidth } from "./readlineWorkspace";
import { stripAnsi, visibleWidth } from "./tuiAnsi";
import {
  themeText,
  themeColorSequence,
  surfaceBackgroundSequence,
  resolveTuiBrightness,
} from "./theme";
import { getProcessRegistry } from "../../agent-runtime/processRegistry";
import type { TuiState } from "./sessionTypes";

// ─── Formatting helpers ─────────────────────────────────────────────────────

function formatCwd(cwd: string) {
  const parts = cwd.split(/[/\\]/);
  return parts.pop() || cwd;
}

export function formatElapsedSeconds(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/** Soft token chip for the composer status line (no powerline background). */
export function renderComposerTokenChip(
  tokens: TurnTokenUsage | undefined,
  fallbackContextWindow?: number,
  estimatedContextTokens?: number,
) {
  const cw = tokens?.contextWindow ?? fallbackContextWindow;
  if (!cw) {
    return "context: —";
  }
  // Prefer provider usage; otherwise show the measured system+tools estimate.
  const used = tokens
    ? tokens.input + tokens.output
    : Math.max(0, estimatedContextTokens ?? 0);
  const pct = Math.min(100, (used / cw) * 100);
  const pctText = pct > 0 && pct < 10 ? pct.toFixed(1) : Math.round(pct).toString();
  return `context: ${pctText}% (${formatTokenCount(used)}/${formatTokenCount(cw)})`;
}

/**
 * 状态行展示的积分：续聊基数 + 本次会话累加。两者语义不相交，直接相加。
 * 都没有时返回 undefined（而不是 0），让调用方区分「没花过」与「不该显示」。
 */
export function resolveStatusLineCredits(
  state: Pick<TuiState, "sessionCredits" | "dialogCreditsBase">,
): number | undefined {
  const base = state.dialogCreditsBase;
  const session = state.sessionCredits;
  if (base === undefined && session === undefined) return undefined;
  return (base ?? 0) + (session ?? 0);
}

// ─── Status line ────────────────────────────────────────────────────────────

export function renderStatusLine(state: TuiState, maxWidth?: number) {
  const colorEnabled = resolveCliColorEnabled();
  // OMP-style chips: soft fg colors + " · " separators. No solid powerline
  // backgrounds — those break box layout when the line is long.
  //
  // Segments use semantic theme tokens rather than raw ANSI color names. The
  // status line is the most visible chrome in the TUI, and hardcoding colors
  // here meant `/theme` visibly changed everything except it. Each token
  // carries an ANSI-16 fallback, so terminals without truecolor still get the
  // saturated, light/dark-safe colors the raw names used to provide.
  const sep = themeText(" · ", "chrome", colorEnabled);

  // 自动路由只剩 flash 一档，路由结果不再改变显示名：状态行始终显示当前
  // agent 名（默认 nolo）。显式 /agent 选择、NOLO_AUTO_ROUTE=0 同理。
  const agentDisplayName = state.agentName;
  // runtime-mode 为默认的 auto 时不显示——它是默认值，纯噪声，且会与 auto
  // 路由名叠成 "auto · auto"。只有显式切到 local / server 才值得占一个 chip。
  const modeSuffix =
    state.modeLabel && state.modeLabel !== "auto"
      ? ` · ${state.modeLabel}`
      : "";
  const agentLabel = `🏔 ${agentDisplayName}${modeSuffix}`;
  const agentSegment = themeText(agentLabel, "accent", colorEnabled);

  const cwdSegment = themeText(`📁 ${formatCwd(state.cwd)}`, "info", colorEnabled);

  // 标题已由终端窗口标题区（syncWindowTitle 用 dialogLabel）显示，这里不再
  // 重复渲染 dialogTitle 段，避免输入区上方出现冗余标题。
  const parts: string[] = [agentSegment, cwdSegment];

  if (state.gitStatus) {
    const { branch, modified, untracked } = state.gitStatus;
    const branchText = themeText(`⑂ ${branch}`, "warning", colorEnabled);
    // Modified files are the actionable signal (danger); untracked is noise
    // (muted). Keeping them different tokens preserves that hierarchy.
    const modifiedText = modified > 0 ? ` ${themeText(`*${modified}`, "danger", colorEnabled)}` : "";
    const untrackedText = untracked > 0 ? ` ${themeText(`?${untracked}`, "muted", colorEnabled)}` : "";
    parts.push(`${branchText}${modifiedText}${untrackedText}`);
  }

  // 状态行的积分 = 续聊基数（服务端历史累计）+ 本次会话本地累加。
  //
  // 不再用 `apiSource === "platform"` 当显示开关：那是启动/切换时按静态 agent
  // 目录判的，广场 agent、别名条目、以及自建但实际走平台推理的 agent 全都判不出
  // 来，明明在扣积分却整轮不显示。改成看「本对话到底有没有产生过平台计费」——
  // credits 只在 billing_unit === "credits" 时才累加，自有 API / 订阅制天然为
  // 0，不显示，这正是「走平台才计积分」想要的判据本身。
  //
  // 积分是**独立 chip**，不再拼接进 context 芯片尾部：宽度降级时两者解耦，
  // context 段可以先让路，积分 chip 撑到只剩必保段才丢（用户盯的就是它）。
  const credits = resolveStatusLineCredits(state);
  const tokenSegment = themeText(
    renderComposerTokenChip(
      state.turnTokens,
      state.contextWindow,
      state.estimatedContextTokens,
    ),
    "muted",
    colorEnabled,
  );
  const creditsSegment =
    credits !== undefined && credits > 0
      ? themeText(formatCreditsChip(credits), "muted", colorEnabled)
      : "";
  parts.push(tokenSegment);
  if (creditsSegment) parts.push(creditsSegment);

  // In-flight work chip: local background tasks plus active (non-terminal)
  // agent runs from the local run registry (throttled). This is a REQUIRED
  // status-line field — the queue badge (optional chrome) must never squeeze
  // it out at any width; the dock renders the per-run breakdown separately.
  const runningTaskCount = getProcessRegistry().listBackground().filter(p => p.status === "running").length;
  if (runningTaskCount > 0) {
    parts.push(themeText(`⚙ ${runningTaskCount} running`, "info", colorEnabled));
  }

  // 会话级权限自动化标识：仅在 /auto on 时出现，提示用户确认弹窗已被跳过
  // （破坏性 shell / 外部文件访问不再逐次询问）。warning 色与 git 分支 chip
  // 同语义——"需要留意的状态"。off / undefined 时不渲染任何内容。
  if (state.autoConfirm === true) {
    parts.push(themeText("⏵ auto", "warning", colorEnabled));
  }

  let visibleParts = parts;
  if (maxWidth && maxWidth > 0) {
    const widthOf = (segments: string[]) => displayWidth(stripAnsi(segments.join(" · "))) + 2;
    // 可让路段的丢弃顺序（挤宽度时从先到后）：
    //   cwd（终端标题/上下文已有）→ agent 名（默认档可省）→ context chip →
    //   积分 chip（最后才丢——用户盯的就是它，且它是「花了多少钱」的唯一
    //   可见口径）。
    // git 脏 / ⚙ running / ⏵ auto 是必保状态，任何宽度都不让。
    for (const optional of [cwdSegment, agentSegment, tokenSegment, creditsSegment]) {
      if (!optional) continue;
      if (widthOf(visibleParts) <= maxWidth) break;
      visibleParts = visibleParts.filter((part) => part !== optional);
    }
    if (widthOf(visibleParts) > maxWidth && state.gitStatus) {
      const gitIndex = visibleParts.findIndex((part) => stripAnsi(part).startsWith("⑂ "));
      if (gitIndex >= 0) {
        const { modified, untracked } = state.gitStatus;
        const compactDirty = themeText(
          `⑂${modified > 0 ? ` *${modified}` : ""}${untracked > 0 ? ` ?${untracked}` : ""}`,
          "warning",
          colorEnabled,
        );
        visibleParts = visibleParts.with(gitIndex, compactDirty);
      }
    }
    if (widthOf(visibleParts) > maxWidth) {
      // Emergency projection for genuinely narrow terminals. These glyphs
      // preserve the three actionable facts without their explanatory words;
      // lower-priority identity/cwd/context and queued previews are already
      // gone by this point. Joined with single spaces, not the " · " chips:
      // each " · " costs 3 columns and would push the line past ultra-narrow
      // budgets, letting terminal end-clipping eat the trailing (required)
      // dirty/running fields first.
      const emergency: string[] = [];
      if (state.autoConfirm === true) {
        emergency.push(themeText("⏵", "warning", colorEnabled));
      }
      const runningTotal = runningTaskCount;
      if (runningTotal > 0) {
        emergency.push(themeText(`⚙${runningTotal}`, "info", colorEnabled));
      }
      if (state.gitStatus) {
        const { modified, untracked } = state.gitStatus;
        emergency.push(themeText(
          `⑂${modified > 0 ? `*${modified}` : ""}${untracked > 0 ? `?${untracked}` : ""}`,
          "warning",
          colorEnabled,
        ));
      }
      // 积分是用户盯的唯一「花了多少」口径，极限窄宽也以紧凑形式保留。
      if (creditsSegment) {
        emergency.push(themeText(formatCreditsChip(credits ?? 0, { compact: true }), "muted", colorEnabled));
      }
      visibleParts = [emergency.join(" ")];
    }
  }
  const body = visibleParts.join(sep);
  const surface = colorEnabled ? surfaceBackgroundSequence() : "";
  if (!surface) return body;

  // A surface wash plus one space of padding turns the run of segments into a
  // single chip instead of loose text floating on the composer.
  //
  // Deliberately no bracket glyphs: the rounded caps this imitates are
  // powerline codepoints (U+E0B4/U+E0B6) that only exist in patched Nerd
  // Fonts, and box-drawing corners are the wrong semantic mid-line. There is
  // no way to detect the font, and a chip that renders as tofu is worse than
  // one defined by its fill alone.
  //
  // The fill itself is truecolor-only (see surfaceBackgroundSequence) — ANSI-16
  // has no subtle background, only solid blocks that would bury the text.
  //
  // \x1b[49m resets background only, so callers can keep appending
  // foreground-colored text (the "· Esc to stop" hint) after the chip closes.
  return `${surface} ${body} \x1b[49m`;
}

/**
 * Compose the composer status line plus the optional queued-input badge under
 * one width budget.
 *
 * Required state (auto-confirm / running / dirty) owns the budget. The queue
 * badge is optional chrome: its width is reserved from the degradation budget
 * only while the degraded status can still fit beside it, and when the badge
 * alone would overflow `maxWidth` it is dropped entirely — terminal
 * end-clipping must never be the thing that hides auto-confirm, running or
 * dirty.
 */
export function composeStatusLineWithQueue(
  state: TuiState,
  queueSuffix: string,
  maxWidth?: number
): string {
  const hasBudget = typeof maxWidth === "number" && maxWidth > 0;
  const queueWidth = queueSuffix ? visibleWidth(queueSuffix) : 0;
  const budget = hasBudget ? Math.max(1, maxWidth! - queueWidth) : undefined;
  const base = renderStatusLine(state, budget);
  if (!queueSuffix) return base;
  if (!hasBudget) return base + queueSuffix;
  return visibleWidth(base) + queueWidth <= maxWidth! ? base + queueSuffix : base;
}

// ─── Welcome & prompt ───────────────────────────────────────────────────────

// ── Scene builders for the welcome screen ──────────────────────────────────────────────
//
// Vertical landscape: mountain (left) → sky (right) → ground → NOLO → waves.
// All glyphs are common BMP (no emoji/PUA/Nerd Font).

function buildPlainScene(isDark: boolean, frame: number = 0, maxFrames: number = 0): string {
  let skyLine = `                      ${isDark ? "🌙" : "☀"}`;
  if (isDark) {
    const star1 = frame % 6 < 3 ? "✦" : "⋆";
    const star2 = frame % 4 < 2 ? "⋆" : "·";
    const star3 = frame % 5 < 2 ? "·" : "✦";
    skyLine = `      ${star1}               🌙    ${star2}    ${star3}`;
  }

  const wavePattern = "_.~^~.";
  const longWave = wavePattern.repeat(10);
  const offset = frame % wavePattern.length;
  const wave = longWave.slice(offset, offset + 25);

  return [
    skyLine,
    "             ╱╲                     █▄ █ ▄▀▀▄ █    ▄▀▀▄",
    "            ╱  ╲  ╱╲                █ ▀█ █  █ █    █  █",
    "           ╱    ╲╱  ╲               ▀  ▀  ▀▀  ▀▀▀▀  ▀▀",
    `          ╱  ♠       ╲          ${wave}`,
    "   ▁▁▁▁▁▁╱ ♠   ♠      ╲▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁",
  ].join("\n");
}

function buildColoredScene(isDark: boolean, frame: number = 0, maxFrames: number = 0): string {
  const pk = themeColorSequence("chrome");    // mountain + ground
  const sk = themeColorSequence("warning");   // moon / sun
  const tr = themeColorSequence("success");   // trees
  const wv = themeColorSequence("info");      // waves
  const ac = themeColorSequence("accent");    // NOLO wordmark
  const mu = themeColorSequence("muted");     // faded trailing colors
  const r  = "\x1b[39m";
  const b  = "\x1b[1m";
  const rs = "\x1b[0m";

  let skyLine = `                      ${sk}${isDark ? "🌙" : "☀"}${r}`;
  if (isDark) {
    const star1 = frame % 6 < 3 ? "✦" : "⋆";
    const star2 = frame % 4 < 2 ? "⋆" : "·";
    const star3 = frame % 5 < 2 ? "·" : "✦";
    skyLine = `      ${mu}${star1}${r}               ${sk}🌙${r}    ${mu}${star2}${r}    ${mu}${star3}${r}`;
  }

  const wavePattern = "_.~^~.";
  const longWave = wavePattern.repeat(10);
  const offset = frame % wavePattern.length;
  const wave = longWave.slice(offset, offset + 25);
  // Fade out the last 5 characters
  const waveStr = `${wv}${wave.slice(0, 20)}${r}${mu}${wave.slice(20, 25)}${r}`;

  const line1 = "█▄ █ ▄▀▀▄ █    ▄▀▀▄";
  const line2 = "█ ▀█ █  █ █    █  █";
  const line3 = "▀  ▀  ▀▀  ▀▀▀▀  ▀▀";
  
  const sweepEndFrame = maxFrames > 3 ? maxFrames - 3 : maxFrames;
  const sweepLen = maxFrames === 0 ? 21 : Math.min(21, Math.floor((frame / sweepEndFrame) * 21));
  
  const colorLine = (str: string, bold: boolean) => {
    const active = str.slice(0, sweepLen);
    const dimmed = str.slice(sweepLen);
    return `${bold ? b : ""}${ac}${active}${r}${mu}${dimmed}${r}${bold ? rs : ""}`;
  };

  const nolo1 = colorLine(line1, true);
  const nolo2 = colorLine(line2, false);
  const nolo3 = colorLine(line3, false);

  return [
    skyLine,
    `             ${pk}╱╲${r}                     ${nolo1}`,
    `            ${pk}╱  ╲  ╱╲${r}                ${nolo2}`,
    `           ${pk}╱    ╲╱  ╲${r}               ${nolo3}`,
    `          ${pk}╱${r}  ${tr}♠${r}       ${pk}╲${r}          ${waveStr}`,
    `   ${pk}▁▁▁▁▁▁╱${r} ${tr}♠${r}   ${tr}♠${r}      ${pk}╲▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁${r}`,
  ].join("\n");
}

export function renderWelcome(
  state: TuiState,
  frame: number = 0,
  maxFrames: number = 0,
  columns?: number,
) {
  const colorEnabled = resolveCliColorEnabled();
  const brightness = resolveTuiBrightness();
  const isDark = brightness === "dark";

  let sceneArt = colorEnabled
    ? buildColoredScene(isDark, frame, maxFrames)
    : buildPlainScene(isDark, frame, maxFrames);

  // The scene art is ~48 columns wide. On a narrower terminal its rows wrap,
  // which looks broken and (for the old animated banner) corrupted the redraw.
  // When we know the width and it can't hold the widest scene row, drop the
  // scene entirely and keep just the version + hint lines, which degrade to a
  // clean two-line welcome. `columns` is optional so pure-function callers and
  // tests that don't pass it keep the full scene.
  if (typeof columns === "number" && columns > 0) {
    const widestSceneCol = sceneArt
      .split("\n")
      .reduce((max, line) => Math.max(max, displayWidth(stripAnsi(line))), 0);
    if (columns < widestSceneCol) sceneArt = "";
  }

  const versionLine = colorEnabled
    ? `${themeColorSequence("accent")}nolo\x1b[0m ${state.cliVersion ?? ""} | server ${state.serverUrl}`.replace("  |", " |")
    : `nolo ${state.cliVersion ?? ""} | server ${state.serverUrl}`.replace("  |", " |");

  // 版本发布快（alpha 每次合入即发版），欢迎页在检查到新版本时补一行升级
  // 提示。无更新 / 检查不可用时 updateAvailable 为空，这一行不出现，
  // welcome 保持原来的紧凑布局（"keeps the welcome compact" 测试契约）。
  const updateLine = state.updateAvailable
    ? themeText(
        t(
          "updateAvailable",
          state.updateAvailable.latestVersion,
          state.cliVersion ?? t("versionUnknown"),
        ),
        "accent",
        colorEnabled,
      )
    : null;

  const body = sceneArt
    ? [sceneArt, versionLine, ...(updateLine ? [updateLine] : []), t("welcomeHint"), ""]
    : [versionLine, ...(updateLine ? [updateLine] : []), t("welcomeHint"), ""];
  return body.join("\n");
}

export function renderPrompt(_state: TuiState) {
  return t("promptLabel");
}

// ─── Info panels ────────────────────────────────────────────────────────────

export function renderTuiHelp(colorEnabled = resolveCliColorEnabled()) {
  const text = t("helpText");
  if (!colorEnabled) {
    return text;
  }
  const lines = text.split("\n");
  const commandRegex = /^(\s+)(\/\S+(?:\s+\S+)*?)(\s{2,})(.+)$/;
  const sectionRegex = /^\S.+[:：]$/;
  return lines
    .map((line) => {
      if (!line.trim()) {
        return line;
      }
      if (sectionRegex.test(line)) {
        return renderDialogTitle(line, colorEnabled);
      }
      const match = line.match(commandRegex);
      if (match) {
        const [, indent, cmd, spacing, desc] = match;
        return `${indent}${themeText(cmd, "accent", colorEnabled)}${spacing}${themeText(desc, "muted", colorEnabled)}`;
      }
      return themeText(line, "muted", colorEnabled);
    })
    .join("\n");
}

/**
 * `/context` and `/agents` are the two panels a user reads most often, and they
 * were the last plain-text surfaces left in the TUI — an ASCII `-----` rule and
 * one flat foreground, while every dialog next to them was already themed.
 *
 * They now borrow the dialog frame's own title treatment (renderDialogTitle)
 * rather than re-inventing a heading style, and split label/value across the
 * muted/default tokens so the eye lands on the values. Layout, field order and
 * wording are unchanged: only color and one alignment fix.
 */
/**
 * /credits 诊断面板：一次性打印积分显示链每一环的当前真值。
 *
 * 为什么存在：「扣了费但 ⚡ 不显示」曾因链路里一处静默丢字段排查了整个上午
 * （foldLocalResultForTui 丢 turnCredits）。链路是
 *   usageRecords(billing帧) → sumPlatformCredits → turnCredits
 *   → accumulateSessionCredits → sessionCredits + dialogCreditsBase → ⚡，
 * 任何一环 undefined 都静默降级。这个命令把每一环摊开，断在哪一环一眼可见。
 */
export function renderCreditsDebug(
  state: TuiState,
  colorEnabled = resolveCliColorEnabled(),
) {
  const credits = resolveStatusLineCredits(state);
  const lines = [
    "[credits debug] 积分链路真值",
    `• dialogCreditsBase : ${state.dialogCreditsBase?.toFixed(4) ?? "undefined（服务端基数未 seed——/pick 后首次读取失败或服务端未写 totalCost）"}`,
    `• sessionCredits    : ${state.sessionCredits?.toFixed(4) ?? "undefined（本会话还没有平台计费轮）"}`,
    `• 状态行显示        : ${credits !== undefined && credits > 0 ? formatCreditsChip(credits) : "（无 ⚡——两段合计为 0/undefined）"}`,
    `• turnTokens.credits: ${state.turnTokens?.credits?.toFixed(4) ?? "undefined"}（本轮最后一次调用的折算值，仅供参考，不进状态行）`,
    `• contextWindow     : ${state.contextWindow ?? "unknown"}`,
    "• 判定口径：只有 billing_unit === \"credits\" 的平台计费帧才累计；自有 API / 订阅制恒为 undefined。",
    "• 若刚跑完平台计费轮仍无 ⚡：检查 runAgentTurn 返回是否带 turnCredits（foldLocalResultForTui 白名单）。",
  ];
  return lines
    .map((line) => (colorEnabled ? themeText(line, "chrome") : line))
    .join("\n");
}

export function renderContextPanel(
  state: TuiState,
  colorEnabled = resolveCliColorEnabled(),
) {
  const docs = state.attachedDocs.length
    ? state.attachedDocs.join(", ")
    : "none";
  const skills = state.attachedSkills.length
    ? state.attachedSkills.join(", ")
    : "none";

  const labels = [
    t("contextFieldAgent"),
    t("contextFieldTokens"),
    t("contextFieldDialog"),
    t("contextFieldDocs"),
    t("contextFieldSkills"),
    t("contextFieldProfile"),
    t("contextFieldRuntime"),
    t("contextFieldServer"),
  ];

  let maxW = 0;
  for (const l of labels) {
    const w = displayWidth(l);
    if (w > maxW) maxW = w;
  }
  const targetWidth = maxW >= 9 ? maxW + 1 : 9;

  const padLabel = (raw: string) => {
    const w = displayWidth(raw);
    const padding = " ".repeat(Math.max(0, targetWidth - w));
    return raw + padding;
  };

  const field = (rawLabel: string, value: string) =>
    `${themeText(padLabel(rawLabel), "muted", colorEnabled)}${value}`;
  const next = (command: string, description: string) =>
    `  ${themeText(command, "accent", colorEnabled)}${themeText(description, "muted", colorEnabled)}`;

  const titleText = t("contextTitle");
  const heading = colorEnabled
    ? [renderDialogTitle(titleText, true)]
    : [titleText, "─".repeat(displayWidth(titleText))];
  return [
    ...heading,
    field(labels[0], `${state.agentName} (${state.agentKey})`),
    field(labels[1], renderTokenStatus(state.turnTokens)),
    field(
      labels[2],
      state.dialogKey ?? (state.dialogId ? "unavailable" : state.dialogLabel),
    ),
    field(labels[3], docs),
    field(labels[4], skills),
    field(labels[5], state.profileName),
    field(labels[6], state.runtimeMode),
    field(labels[7], state.serverUrl),
    "",
    themeText(t("contextNext"), "chrome", colorEnabled),
    next("/agents            ", `  ${t("contextNextAgents")}`),
    next("/doc attach <doc>  ", `  ${t("contextNextDoc")}`),
    next("/skill attach <ref>", `  ${t("contextNextSkill")}`),
    next("/new               ", `  ${t("contextNextNew")}`),
    next("/clear             ", `  ${t("contextNextClear")}`),
  ].join("\n");
}

export function renderKnownAgents(colorEnabled = resolveCliColorEnabled()) {
  return [
    renderDialogTitle(t("agentsTitle"), colorEnabled),
    ...resolveCatalogPlatformAgents().map(
      (agent, index) =>
        `  ${themeText(String(index + 1), "chrome", colorEnabled)}  ${themeText(
          agent.name.padEnd(11),
          "accent",
          colorEnabled,
        )} ${themeText(agent.description ?? "", "muted", colorEnabled)}`
    ),
    "",
    themeText(
      t("agentsTip"),
      "muted",
      colorEnabled,
    ),
  ].join("\n");
}
