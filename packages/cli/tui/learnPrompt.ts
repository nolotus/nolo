/**
 * Cheap same-dialog self-review used by `/learn`.
 *
 * This is intentionally a user-triggered review prompt, not an Evolution
 * verdict and not an instruction to modify the system. Reusing the current
 * dialog lets providers benefit from the already-hot conversation/cache while
 * the agent still has the execution context in view.
 *
 * `/learn` has one entry point. The review flavor follows the authenticated
 * operator, not the selected agent:
 * - the platform operator (CURRENT_OPERATOR_USER_ID) gets the developer
 *   review (tools, prompts, instructions) in Chinese;
 * - every other logged-in user gets the plain-user review (easy language,
 *   visible evidence only);
 * - an unknown identity (no usable auth token) falls back to the plain
 *   review. We never guess.
 */

import { CURRENT_OPERATOR_USER_ID } from "../agentAliases";
import { parseUserIdFromAuthToken } from "../cliEnvHelpers";
import { resolvePlatformAuthToken } from "../../agent-runtime/providerResolution";

type EnvLike = Record<string, string | undefined>;

/**
 * Developer variant: reviews the visible work for reusable improvements to
 * tools and prompts/instructions, and answers in Chinese.
 */
export const TUI_LEARN_DEVELOPER_REVIEW_PROMPT = `审查当前对话中已可见的对话与工作，只寻找对系统可复用的改进。覆盖此处实际可见的内容，包括未完成、失败或被中断的工作；不要臆测你看不到的历史。

聚焦两个层面：

1. 工具
- 是否有工具不必要、被反复调用、难以使用或缺失？
- 是否有工具描述、schema 或结果结构造成过困惑或浪费？
- 是否存在一项具体的工具改动，能改进多个未来任务？

2. 提示词 / 指令
- 是否有系统、开发者、项目或工具指令造成过困惑、冲突、重复或不必要的工作？
- 是否缺少一条重要的可复用指令？
- 是否存在一项具体的提示词/指令改动，能改进多个未来任务？

规则：
- 不要为了产出反馈而编造发现。"无" 是一个好结果。
- 每条发现必须引用具体可见的证据：用户的纠正、失败的调用、重复的工作。没有证据就没有发现。把观察到的事实与假设分开，不要把相关性当成根因。
- 优先删除、合并或澄清既有指令，而不是新增一条；不要把一次性错误泛化成全局规则。
- 对于提示词类发现，给出可见的原文措辞或可验证的位置，加上最小的替换文本。如果定位不到，就说明位置未知，不要猜测来源。
- 优先跨任务可复用、投入产出比高、负面副作用小的改进，目标是更通用、更快、更省钱、更准确；只换措辞、没有实质行为收益的改写不算改进。
- 优先有代码保障、结构化契约或结构化结果，或有明确触发条件、动作与停止条件的改动。
- 每条发现按：证据；建议改动；收益机制；成本或副作用；未知点。证据不足或收益与风险不明的，不要断言收益，也不要声称零副作用。
- 可能削弱权限、安全、资源保护或正确性的改动，列为"待验证"或"不推荐"，不作为直接实施建议；也不要把验证换成少调工具。
- 本次审查不得修改代码、提示词、工具、记忆或配置。仅审查。
- 保持简洁。

严格按以下小节返回：
工具发现
- 无 或：发现；证据；建议改动；收益机制；成本/副作用；未知点

提示词发现
- 无 或：发现；证据；建议改动；收益机制；成本/副作用；未知点

值得改动吗？
- 是/否
- 置信度：低/中/高
- 一句话理由
- 收益与风险：最主要收益（更快/更省/更准）与最大风险或未知`;

/**
 * Plain-user variant: reviews the same visible conversation for a non-technical
 * user, in everyday language, based only on what is visible, and never edits
 * memory, configuration, or files by itself.
 */
export const TUI_LEARN_PLAIN_REVIEW_PROMPT = `请以普通用户的角度，回顾这次对话里你实际看到的内容，找出哪些地方让人不顺手、费时间，或者没有拿到想要的结果。

规则：
- 只依据这次对话里看得见的内容来说话：哪一步卡住了、重复做了什么、哪条信息没看懂。没有证据就不要提；"没发现需要改的地方" 也是好结果。
- 用日常话说清楚问题出在什么地方、造成了什么影响，再给出一个具体、能重复使用的改进建议。
- 不要使用行话、文件名或内部术语来解释问题；如果必须提到某个技术名词，就顺带用一句白话说明它是什么。
- 这次只是复盘：不要修改代码、配置、记忆或设置，也不要替人做决定。需要改动的地方只写成建议，等人确认后再做。
- 保持简洁。

严格按以下结构返回：
做得顺的地方
- 一句话即可；没有就写"无"

不顺手的地方
- 每条写清楚：哪里卡住 → 影响了什么 → 建议怎么改
- 没有就写"无"

最值得改的一点
- 一句话
- 置信度：低/中/高`;

/**
 * The authenticated operator id behind this session, or `null` when the
 * identity is unknown (not logged in, or a token shape we cannot read).
 *
 * Source of truth is the auth token's `userId` claim — the same source the
 * TUI already uses for the deploy-wake channel. Agent ownership, dialog
 * ownership and display names are never used as identity.
 */
export function resolveTuiLearnOperatorUserId(env: EnvLike = {}): string | null {
  const token = resolvePlatformAuthToken(env);
  if (!token) return null;
  const userId = parseUserIdFromAuthToken(token);
  return userId ? userId : null;
}

/** Pick the review flavor for an operator id. Unknown identity → plain. */
export function selectTuiLearnReviewPrompt(
  operatorUserId: string | null | undefined,
): string {
  return operatorUserId === CURRENT_OPERATOR_USER_ID
    ? TUI_LEARN_DEVELOPER_REVIEW_PROMPT
    : TUI_LEARN_PLAIN_REVIEW_PROMPT;
}

/**
 * Resolve the `/learn` review prompt for the current session identity.
 *
 * `startupEnv` is the session's startup snapshot (`effectiveEnv` / `taskEnv`);
 * `liveEnv` is where a `/login` in this session writes its token. The live
 * value wins, but an explicitly-undefined live value never erases a usable
 * snapshot value. Merging an already-merged live env is idempotent, so a
 * caller may pre-merge it without changing the outcome.
 */
export function resolveTuiLearnReviewPrompt(
  startupEnv: EnvLike = {},
  liveEnv?: EnvLike,
): string {
  return selectTuiLearnReviewPrompt(
    resolveTuiLearnOperatorUserId(resolveTuiIdentityEnv(startupEnv, liveEnv)),
  );
}

/**
 * The env used to resolve the current identity — the one mechanism both
 * slash entry points use.
 *
 * `startupEnv` is the session's startup snapshot (`effectiveEnv` /
 * `taskEnv`); `liveEnv` is what a `/login` in this session writes its token
 * into. The live value wins, but an explicitly-undefined live value never
 * erases a usable snapshot value, and keys the live env does not carry keep
 * the snapshot value.
 *
 * Only identity resolution consumes this merged env — the rest of the slash
 * dispatch keeps the env it already had.
 */
export function resolveTuiIdentityEnv(
  startupEnv: Record<string, string | undefined> | undefined,
  liveEnv: Record<string, string | undefined> | undefined,
): Record<string, string | undefined> {
  const merged: Record<string, string | undefined> = { ...(startupEnv ?? {}) };
  for (const [key, value] of Object.entries(liveEnv ?? {})) {
    if (value !== undefined) merged[key] = value;
  }
  return merged;
}
