import { resolveCliColorEnabled } from "../client/terminalStyles";
import {
  formatCreditsChip,
  formatTokenCount,
  renderTokenStatus,
  resolveContextUsage,
  type TurnTokenUsage,
} from "../client/tokenUsage";
import { resolveCatalogPlatformAgents } from "./agentCatalog";
import { renderDialogTitle } from "./dialogFrame";
import { dailyWelcomeTip, t } from "./i18n";
import { displayWidth } from "./readlineWorkspace";
import { stripAnsi, visibleWidth } from "./tuiAnsi";
import {
  themeText,
  themeColorSequence,
  surfaceBackgroundSequence,
  resolveTuiBrightnessSignal,
} from "./theme";
import type { TuiState } from "./sessionTypes";

// ─── Formatting helpers ─────────────────────────────────────────────────────

function formatCwd(cwd: string) {
  const parts = cwd.split(/[/\\]/);
  return parts.pop() || cwd;
}

/**
 * 按显示宽度截断文本，超出部分以 `…` 收尾（CJK / emoji 以 displayWidth 计）。
 * 宽度不够放下 `x…` 时返回空串，让调用方整体让路而不是留下半个省略号。
 */
function truncateToWidth(text: string, maxWidth: number): string {
  if (displayWidth(text) <= maxWidth) return text;
  if (maxWidth < 2) return "";
  let out = "";
  for (const ch of text) {
    if (displayWidth(`${out}${ch}…`) > maxWidth) break;
    out += ch;
  }
  return out ? `${out}…` : "";
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

/**
 * Soft token chip (`context: 45% (45k/100k)`, no powerline background).
 *
 * 不再用于状态行（状态行只留 git / 积分 / ⏵ auto）：占用口径与详情由
 * `/context` 面板的 renderTokenStatus 呈现，这里保留同一个 resolveContextUsage
 * 口径的纯格式化函数，供面板/测试复用。
 */
export function renderComposerTokenChip(
  tokens: TurnTokenUsage | undefined,
  fallbackContextWindow?: number,
  estimatedContextTokens?: number,
  turnEstimatedTokens?: number,
) {
  // 口径与 `/context` 面板的令牌行同一处（resolveContextUsage）：
  // 已用 = 下一轮上下文占用（provider input，未收到 usage 时用本地估算），
  // **不加 output**——生成量不等于下一轮还要发出去的上下文。
  // turn 内流式推进时，以 turnEstimatedTokens 推进估算。
  const usage = resolveContextUsage({
    tokens,
    fallbackContextWindow,
    estimatedContextTokens,
    turnEstimatedTokens,
  });
  if (usage.used === undefined || usage.contextWindow === undefined) {
    return "context: —";
  }
  const pct = Math.min(100, usage.pct ?? 0);
  const pctText = pct > 0 && pct < 10 ? pct.toFixed(1) : Math.round(pct).toString();
  return `context: ${pctText}% (${formatTokenCount(usage.used)}/${formatTokenCount(usage.contextWindow)})`;
}

/**
 * 状态行的上下文占用 chip，两档呈现（按**可用宽度**降级，不看占用率）：
 *   宽：`ctx 42% · 84k/200k`
 *   窄：`ctx 42%`
 *
 * 口径仍走 resolveContextUsage（与 `/context` 面板的令牌行同一处）：已用 =
 * 下一轮上下文占用（provider input，未收到 usage 时用本地估算 + 轮内流式增量），
 * **不含 output**。用量或窗口任一未知时给 `ctx —` 占位——不伪造 `0%`。
 */
function renderStatusContextSegment(
  state: Pick<
    TuiState,
    | "turnTokens"
    | "contextWindow"
    | "estimatedContextTokens"
    | "liveTurnEstimatedTokens"
  >,
  compact: boolean,
): string {
  const usage = resolveContextUsage({
    tokens: state.turnTokens,
    fallbackContextWindow: state.contextWindow,
    estimatedContextTokens: state.estimatedContextTokens,
    turnEstimatedTokens: state.liveTurnEstimatedTokens,
  });
  if (usage.used === undefined || usage.contextWindow === undefined) {
    return "ctx —";
  }
  const pct = Math.min(100, usage.pct ?? 0);
  const pctText = pct > 0 && pct < 10 ? pct.toFixed(1) : Math.round(pct).toString();
  if (compact) return `ctx ${pctText}%`;
  return `ctx ${pctText}% · ${formatTokenCount(usage.used)}/${formatTokenCount(usage.contextWindow)}`;
}

/**
 * 状态行展示的积分：续聊基数 + 本次会话累加。两者语义不相交，直接相加。
 * 都没有时返回 undefined（而不是 0），让调用方区分「没花过」与「不该显示」。
 */
export function resolveStatusLineCredits(
  state: Pick<
    TuiState,
    "sessionCredits" | "dialogCreditsBase" | "liveTurnCredits"
  >,
): number | undefined {
  const base = state.dialogCreditsBase;
  const session = state.sessionCredits;
  const live = state.liveTurnCredits;
  if (base === undefined && session === undefined && live === undefined) {
    return undefined;
  }
  return (base ?? 0) + (session ?? 0) + (live ?? 0);
}

// ─── Status line ────────────────────────────────────────────────────────────

export function renderStatusLine(
  state: TuiState,
  maxWidth?: number,
) {
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
  const agentLabel = `✦ ${agentDisplayName}${modeSuffix}`;
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

  // CI / 部署状态不再上状态行：远端轮询结果仍写进 state（诊断用），但状态行
  // 只留本机可动作、一眼可判的事实（分支 + 脏 + 积分 + ⏵ auto），否则一旦远端
  // 不可达就是一块噪声，还挤占真正需要看的窄宽预算。

  // 状态行的积分 = 续聊基数（服务端历史累计）+ 本次会话本地累加。
  //
  // 不再用 `apiSource === "platform"` 当显示开关：那是启动/切换时按静态 agent
  // 目录判的，广场 agent、别名条目、以及自建但实际走平台推理的 agent 全都判不出
  // 来，明明在扣积分却整轮不显示。改成看「本对话到底有没有产生过平台计费」——
  // credits 只在 billing_unit === "credits" 时才累加，自有 API / 订阅制天然为
  // 0，不显示，这正是「走平台才计积分」想要的判据本身。
  //
  // context 占用恢复上状态行，但**按可用宽度自适应**：宽终端给
  // `ctx 42% · 84k/200k`，窄终端只留 `ctx 42%`，再窄则整体让路。
  // 它每秒都在动，所以是第一个降级/让路的可选段；口径仍与 `/context` 面板
  // 共用 resolveContextUsage，不在这里另造估算。
  const contextFull = renderStatusContextSegment(state, false);
  const contextCompact = renderStatusContextSegment(state, true);
  let contextPart = themeText(contextFull, "muted", colorEnabled);
  parts.push(contextPart);

  const credits = resolveStatusLineCredits(state);
  const creditsSegment =
    credits !== undefined && credits > 0
      ? themeText(formatCreditsChip(credits), "muted", colorEnabled)
      : "";
  if (creditsSegment) parts.push(creditsSegment);

  // 后台进程计数（`⚙ N procs`）已搬到 composer 上方的固定运行区，与子 agent
  // 运行行同处一列：状态行这里只留「终态通知待消费」的 chip（语义不同，见下）。

  // 终态通知 chip：`↪ N pending` = 还有几条**后台进程终态通知待交给 Agent**
  // （下一个真实 turn 组成时注入，注入即清空，chip 归零）。它读作「待投递给
  // agent 的输入」，不是用户的待办，也不含子 agent / run 的完成通知（那是运行
  // 区的事）。因此不用 `⚙`：运行区里 `⚙` 专指「仍在跑的 run」，同屏两个 `⚙`
  // 会让「还在跑」和「已经结束、等着告诉 agent」混成一句话。必保字段，不参与
  // 宽度降级（终态详情在通知行和 /procs 里）。
  // 注：processRegistry 的 taskId 与运行区的 runId 语义不同，无需互相去重。
  const pendingProcessCount = state.pendingProcessNotices?.length ?? 0;
  if (pendingProcessCount > 0) {
    parts.push(themeText(`↪ ${pendingProcessCount} pending`, "info", colorEnabled));
  }

  // 会话级权限自动化标识：仅在 /auto on 时出现，提示用户确认弹窗已被跳过
  // （破坏性 shell / 外部文件访问不再逐次询问）。warning 色与 git 分支 chip
  // 同语义——"需要留意的状态"。off / undefined 时不渲染任何内容。
  if (state.autoConfirm === true) {
    parts.push(themeText("⏵ auto", "warning", colorEnabled));
  }

  // Chip fill + one space of padding per side. The padding is part of the
  // rendered width, so every budget below has to count it — but only when the
  // wash is actually painted. ANSI-16 / terminal-native terminals get no fill
  // and therefore no padding; charging 2 columns there made a 1-column budget
  // emit two blank columns (and stole width from the real segments).
  let surface = colorEnabled ? surfaceBackgroundSequence() : "";
  let padWidth = surface ? 2 : 0;
  if (maxWidth && maxWidth > 0 && maxWidth <= padWidth) {
    // A chip that cannot afford its own two pad columns does not fit at all.
    surface = "";
    padWidth = 0;
  }

  let agentPart = agentSegment;
  let creditsPart = creditsSegment;
  let visibleParts = parts;
  if (maxWidth && maxWidth > 0) {
    const widthOf = (segments: string[]) =>
      displayWidth(stripAnsi(segments.join(" · "))) + padWidth;
    // 可让路段的丢弃顺序（挤宽度时从先到后）：
    //   cwd（终端标题/上下文已有）→ agent 名（默认档可省）→
    //   context chip（每秒都在动，先降级为百分比再整体让路）→
    //   积分 chip（只压缩文案，不整体丢弃；再窄退成 `⚡…`——显式承认金额
    //   细节被省略，而不是裸留 `⚡` 冒充「金额还看得见」）。
    // 后台进程计数已不在状态行（搬到 composer 上方的运行区），所以这里没有它。
    // git 脏 / ⏵ auto / 待消费通知是必保状态，任何宽度都不让。
    //
    // context 的降级只看实际可用宽度，不看占用率：宽时 `ctx 42% · 84k/200k`，
    // 放不下就先退成 `ctx 42%`，仍放不下才按上面的顺序整体丢弃。
    if (contextFull !== contextCompact && widthOf(visibleParts) > maxWidth) {
      const contextIndex = visibleParts.indexOf(contextPart);
      if (contextIndex >= 0) {
        contextPart = themeText(contextCompact, "muted", colorEnabled);
        visibleParts = visibleParts.with(contextIndex, contextPart);
      }
    }
    // cwd 最先让路（终端标题/上下文已有），agent 名先尝试缩写，context 最后整体让路。
    if (widthOf(visibleParts) > maxWidth) {
      visibleParts = visibleParts.filter((part) => part !== cwdSegment);
    }
    // agent 名按 cwd 让出后的剩余可用宽度缩写（保留 ✦ 与模式后缀）。
    if (widthOf(visibleParts) > maxWidth) {
      const agentIndex = visibleParts.indexOf(agentPart);
      if (agentIndex >= 0) {
        const othersWidth = widthOf(visibleParts.filter((part) => part !== agentPart));
        const nameBudget =
          maxWidth - othersWidth - 3 - displayWidth("✦ ") - displayWidth(modeSuffix);
        const shortName = truncateToWidth(state.agentName, nameBudget);
        if (shortName) {
          agentPart = themeText(`✦ ${shortName}${modeSuffix}`, "accent", colorEnabled);
          visibleParts = visibleParts.with(agentIndex, agentPart);
        }
      }
    }
    if (widthOf(visibleParts) > maxWidth) {
      visibleParts = visibleParts.filter((part) => part !== agentPart);
    }
    if (widthOf(visibleParts) > maxWidth) {
      visibleParts = visibleParts.filter((part) => part !== contextPart);
    }
    // 积分文案精简（`⚡ 1.50 积分` → `⚡1.50`），不整段隐藏；连紧凑金额都放不下时
    // 交给下面的 emergency 投影用 `⚡…` 明说「金额被省略」。
    if (widthOf(visibleParts) > maxWidth && creditsPart) {
      const creditsIndex = visibleParts.indexOf(creditsPart);
      if (creditsIndex >= 0) {
        creditsPart = themeText(
          formatCreditsChip(credits ?? 0, { compact: true }),
          "muted",
          colorEnabled,
        );
        visibleParts = visibleParts.with(creditsIndex, creditsPart);
      }
    }
    // 长分支先缩写到剩余宽度，再退成 `⑂` + 脏数——尽量保留分支名本身。
    if (widthOf(visibleParts) > maxWidth && state.gitStatus) {
      const gitIndex = visibleParts.findIndex((part) => stripAnsi(part).startsWith("⑂ "));
      if (gitIndex >= 0) {
        const { branch, modified, untracked } = state.gitStatus;
        const dirtyText =
          `${modified > 0 ? ` *${modified}` : ""}${untracked > 0 ? ` ?${untracked}` : ""}`;
        const othersWidth = widthOf(
          visibleParts.filter((part) => part !== visibleParts[gitIndex]),
        );
        const branchBudget =
          maxWidth - othersWidth - 3 - displayWidth("⑂ ") - displayWidth(dirtyText);
        const shortBranch = truncateToWidth(branch, branchBudget);
        if (shortBranch) {
          const branchText = themeText(`⑂ ${shortBranch}`, "warning", colorEnabled);
          const modifiedText =
            modified > 0 ? ` ${themeText(`*${modified}`, "danger", colorEnabled)}` : "";
          const untrackedText =
            untracked > 0 ? ` ${themeText(`?${untracked}`, "muted", colorEnabled)}` : "";
          visibleParts = visibleParts.with(
            gitIndex,
            `${branchText}${modifiedText}${untrackedText}`,
          );
        } else {
          const compactDirty = themeText(`⑂${dirtyText}`, "warning", colorEnabled);
          visibleParts = visibleParts.with(gitIndex, compactDirty);
        }
      }
    }
    if (widthOf(visibleParts) > maxWidth) {
      // Emergency projection for genuinely narrow terminals. These glyphs
      // preserve the actionable facts without their explanatory words;
      // lower-priority identity/cwd/context and queued previews are already
      // gone by this point. Joined with single spaces, not the " · " chips:
      // each " · " costs 3 columns and would push the line past ultra-narrow
      // budgets, letting terminal end-clipping eat the trailing (required)
      // dirty/auto fields first.
      //
      // The projection itself is staged because a joined mega-string can still
      // overflow (many fields, large counts, CJK agent/branch names) and
      // terminal end-clipping would silently eat whichever field is last. Keep
      // the two facts the line exists for — auto-permission state and the
      // billing counter — ahead of notice/git detail, and stop at the first
      // stage that fits the *real* budget (surface padding included):
      //   counts → existence markers (`⑂*?` / `↪`) → drop git → drop notice →
      //   compact credits → `⚡…` (fee present, amount omitted) → explicit
      //   unified overflow (`⏵…` / `…`) when even that cannot fit.
      // Bare `⚡` is never a stage: an icon is not a number, and dropping the fee
      // silently would read as "this turn cost nothing".
      const budget = maxWidth - padWidth;
      const autoMark =
        state.autoConfirm === true
          ? themeText("⏵", "warning", colorEnabled)
          : "";
      const gitCounts = state.gitStatus
        ? themeText(
            `⑂${
              state.gitStatus.modified > 0 ? `*${state.gitStatus.modified}` : ""
            }${
              state.gitStatus.untracked > 0 ? `?${state.gitStatus.untracked}` : ""
            }`,
            "warning",
            colorEnabled,
          )
        : "";
      // Existence-only marker: the dirty *state* survives even when its counts
      // no longer fit. Never rendered as `*0` / `?0` — that would fabricate a
      // "clean" reading instead of admitting the detail was dropped.
      const gitMark = state.gitStatus
        ? themeText(
            `⑂${state.gitStatus.modified > 0 ? "*" : ""}${
              state.gitStatus.untracked > 0 ? "?" : ""
            }`,
            "warning",
            colorEnabled,
          )
        : "";
      // 待交给 Agent 的进程终态通知只压文案（`↪ 2 pending` → `↪2`），语义不能消失。
      const noticeFull =
        pendingProcessCount > 0
          ? themeText(`↪${pendingProcessCount}`, "info", colorEnabled)
          : "";
      const noticeMark =
        pendingProcessCount > 0
          ? themeText("↪", "info", colorEnabled)
          : "";
      // 积分是用户盯的「花了多少」口径，但极限窄宽装不下金额时不能拿图标冒充
      // 金额：退成 `⚡…`，用省略号明确承认「有费用、金额细节已省略」。
      const creditsFull = creditsSegment
        ? themeText(
            formatCreditsChip(credits ?? 0, { compact: true }),
            "muted",
            colorEnabled,
          )
        : "";
      const creditsMark = creditsSegment
        ? themeText("⚡…", "muted", colorEnabled)
        : "";
      const stages = [
        [autoMark, gitCounts, noticeFull, creditsFull],
        [autoMark, gitMark, noticeFull, creditsFull],
        [autoMark, gitMark, noticeMark, creditsFull],
        [autoMark, noticeMark, creditsFull],
        [autoMark, creditsFull],
        [autoMark, creditsMark],
        // `autoMark` alone is only an honest projection when nothing was omitted.
        // With a fee on the line, dropping it silently would claim "no cost".
        ...(creditsSegment ? [] : [[autoMark]]),
      ]
        .map((stage) => stage.filter(Boolean))
        .filter((stage) => stage.length > 0);
      const fitted = stages.find(
        (stage) => displayWidth(stripAnsi(stage.join(" "))) <= budget,
      );
      // Physically too narrow for even the markers: state the overflow instead
      // of claiming every field is visible. Keep `⏵` glued to `…` when the real
      // budget allows it (2 columns), otherwise a bare `…` — both are explicit
      // "something is omitted", never a silent drop of the fee.
      const autoWidth = displayWidth(stripAnsi(autoMark));
      const overflowMark =
        autoMark && autoWidth + displayWidth("…") <= budget
          ? `${autoMark}…`
          : budget >= 1
            ? "…"
            : "";
      visibleParts = fitted ? [fitted.join(" ")] : [overflowMark];
    }
  }
  let body = visibleParts.join(sep);
  if (maxWidth && maxWidth > 0) {
    // Final guarantee: neither the normal line nor the emergency projection may
    // exceed the budget the terminal actually gives us. This last resort is
    // plain text (stripAnsi first) so a themed segment is never cut mid-escape.
    const budget = Math.max(0, maxWidth - padWidth);
    if (displayWidth(stripAnsi(body)) > budget) {
      body =
        budget >= 2
          ? truncateToWidth(stripAnsi(body), budget)
          : budget >= 1
            ? "…"
            : "";
    }
  }
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

// ─── Welcome & prompt ───────────────────────────────────────────────────────

// ── Scene builders for the welcome screen ──────────────────────────────────────────────
//
// Vertical landscape: mountain (left) → sky (right) → ground → NOLO → waves.
// All glyphs are common BMP (no emoji/PUA/Nerd Font).

function buildPlainScene(isDark: boolean | null, frame: number = 0, maxFrames: number = 0): string {
  // isDark === null means no real brightness signal (terminal-native mode):
  // keep the sky neutral — no sun, no moon — instead of pretending it's night.
  let skyLine: string | null = null;
  if (isDark === true) {
    const star1 = frame % 6 < 3 ? "✦" : "⋆";
    const star2 = frame % 4 < 2 ? "⋆" : "·";
    const star3 = frame % 5 < 2 ? "·" : "✦";
    skyLine = `      ${star1}               ☾    ${star2}    ${star3}`;
  } else if (isDark === false) {
    skyLine = `                      ☀`;
  }

  const wavePattern = "_.~^~.";
  const longWave = wavePattern.repeat(10);
  const offset = frame % wavePattern.length;
  const wave = longWave.slice(offset, offset + 25);

  return [
    ...(skyLine ? [skyLine] : []),
    "             ╱╲                     █▄ █ ▄▀▀▄ █    ▄▀▀▄",
    "            ╱  ╲  ╱╲                █ ▀█ █  █ █    █  █",
    "           ╱    ╲╱  ╲               ▀  ▀  ▀▀  ▀▀▀▀  ▀▀",
    `          ╱  ♠       ╲          ${wave}`,
    "   ▁▁▁▁▁▁╱ ♠   ♠      ╲▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁",
  ].join("\n");
}

function buildColoredScene(isDark: boolean | null, frame: number = 0, maxFrames: number = 0): string {
  const pk = themeColorSequence("chrome");    // mountain + ground
  const sk = themeColorSequence("warning");   // moon / sun
  const tr = themeColorSequence("success");   // trees
  const wv = themeColorSequence("info");      // waves
  const ac = themeColorSequence("accent");    // NOLO wordmark
  const mu = themeColorSequence("muted");     // faded trailing colors
  const r  = "\x1b[39m";
  const b  = "\x1b[1m";
  const rs = "\x1b[0m";

  let skyLine: string | null = null;
  if (isDark === true) {
    const star1 = frame % 6 < 3 ? "✦" : "⋆";
    const star2 = frame % 4 < 2 ? "⋆" : "·";
    const star3 = frame % 5 < 2 ? "·" : "✦";
    skyLine = `      ${mu}${star1}${r}               ${sk}☾${r}    ${mu}${star2}${r}    ${mu}${star3}${r}`;
  } else if (isDark === false) {
    skyLine = `                      ${sk}☀${r}`;
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
    ...(skyLine ? [skyLine] : []),
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
  // Day/night symbols need a *real* signal. In terminal-native mode with no
  // probe result / COLORFGBG / system preference, resolveTuiBrightnessSignal
  // returns null and the scene keeps a neutral sky — painting a moon on a
  // light terminal (the old behavior) inverted the scene's contrast.
  const brightnessSignal = resolveTuiBrightnessSignal();
  const isDark = brightnessSignal === null ? null : brightnessSignal === "dark";

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

  // "nolo" 走 themeText（遵守 theme token 纪律，含正确的 reset）；版本号
  // 为空时不留双空格，也不用补丁式的 replace 修空格。
  const noloLabel = themeText("nolo", "accent", colorEnabled);
  const versionLine = `${noloLabel}${state.cliVersion ? ` ${state.cliVersion}` : ""} | server ${state.serverUrl}`;

  // 版本发布快（alpha 每次合入即发版），欢迎页在检查到新版本时补一行升级
  // 提示。无更新 / 检查不可用时 updateAvailable 为空，这一行不出现，
  // welcome 保持原来的紧凑布局（"keeps the welcome compact" 测试契约）。
  const updateLine = state.updateAvailable
    ? themeText(
        t("updateAvailable", state.updateAvailable.latestVersion),
        "accent",
        colorEnabled,
      )
    : null;

  // Unauthenticated users see a short block naming the three working paths
  // (local Codex / own subscription / platform login). The flag was resolved
  // once from real auth sources at session start — this pure renderer never
  // re-probes credentials, so resize repaints stay consistent.
  const authGuidanceLine = state.showAuthGuidance ? t("welcomeAuthGuidance") : null;

  const body = sceneArt
    ? [sceneArt, versionLine, ...(updateLine ? [updateLine] : []), ...(authGuidanceLine ? [authGuidanceLine] : []), dailyWelcomeTip(), ""]
    : [versionLine, ...(updateLine ? [updateLine] : []), ...(authGuidanceLine ? [authGuidanceLine] : []), dailyWelcomeTip(), ""];
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
    field(
      labels[1],
      // 与状态行 renderComposerTokenChip 同一口径（resolveContextUsage）：还没收到
      // provider usage 时给本地估算 + 剩余，而不是三个破折号。
      renderTokenStatus(state.turnTokens, {
        contextWindow: state.contextWindow,
        estimatedContextTokens: state.estimatedContextTokens,
        turnEstimatedTokens: state.liveTurnEstimatedTokens,
      }),
    ),
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
