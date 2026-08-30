import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { estimateMessageItemRendersOnStreamToken } from "./MessageItem";

const messageListSource = readFileSync(
  join(import.meta.dir, "MessageList.tsx"),
  "utf-8"
);
const messageItemSource = readFileSync(
  join(import.meta.dir, "MessageItem.tsx"),
  "utf-8"
);
const messageLayoutSource = readFileSync(
  join(import.meta.dir, "MessageLayout.tsx"),
  "utf-8"
);
const messageLayoutStylesSource = readFileSync(
  join(import.meta.dir, "messageLayoutStyles.ts"),
  "utf-8"
);
const messageStylesSource = readFileSync(
  join(import.meta.dir, "messagesStylexEscapeHatch.css"),
  "utf-8"
);
const messagesStylesTsSource = readFileSync(
  join(import.meta.dir, "messagesStyles.ts"),
  "utf-8"
);

describe("message list scroll source contract", () => {
  it("keeps streaming follow rAF-throttled and settles once when streaming ends", () => {
    expect(messageListSource).toContain("selectAllMsgs");
    // Wave11: streaming flag read via the session-store hook (useSyncExternalStore)
    // instead of useAppSelector(selectHasStreamingMessage).
    expect(messageListSource).toContain("useHasStreamingMessage");
    expect(messageListSource).not.toContain(
      "useAppSelector((state) =>\n    selectHasStreamingMessage(state, dialogId)\n  )"
    );
    expect(messageListSource).toContain("useMessagesLoadingState");
    expect(messageListSource).toContain("useLastStreamTimestamp");
    expect(messageListSource).toContain(
      "const wasStreamingRef = useRef(false);"
    );
    expect(messageListSource).toContain(
      "wasStreamingRef.current &&\n      !hasStreamingMessage &&\n      (stateRef.current.isNearBottom || forceFollowCurrentTurnRef.current)"
    );
    expect(messageListSource).toContain(
      'scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });'
    );
  });

  it("uses rAF-based smooth follow while streaming instead of jump scrolling every chunk", () => {
    expect(messageListSource).toContain("const scheduleStreamingFollowScroll = useCallback(");
    expect(messageListSource).toContain("scroller.scrollTop += distance * 0.35;");
    expect(messageListSource).toContain("scheduleStreamingFollowScroll();");
  });

  it("force-follows the current turn after a local user send until manual scroll exits", () => {
    expect(messageListSource).toContain(
      "const forceFollowCurrentTurnRef = useRef(false);"
    );
    expect(messageListSource).toContain(
      '      .find((msg) => msg.role === "user");'
    );
    expect(messageListSource).toContain(
      '      forceFollowCurrentTurnRef.current = true;'
    );
    expect(messageListSource).toContain(
      "forceFollowCurrentTurnRef.current = false;"
    );
    expect(messageListSource).toContain(
      "distanceFromBottom > Math.max(140, threshold * 1.5)"
    );
  });

  it("lets the message list gap control vertical spacing around tool rows", () => {
    expect(messagesStylesTsSource).toContain('gap: "var(--space-4)"');
    expect(messagesStylesTsSource).toContain("toolMsgRow: {");
    expect(messagesStylesTsSource).toContain("marginTop: 6");
  });

  it("shows an explicit assistant reply pending row while the loop is running after a user send", () => {
    expect(messageListSource).toContain('import { AssistantReplyPending } from "./AssistantReplyPending";');
    expect(messageListSource).toContain(
      'import {\n  isAssistantToolStub,\n  isAwaitingVisibleAssistantReply,\n  isIntermediateAssistantProgress,\n  shouldAutoCollapseToolGroup,\n} from "./assistantReplyPendingState";'
    );
    expect(messageListSource).toContain(
      'import { IntermediateNarrationRow } from "./IntermediateNarrationRow";'
    );
    expect(messageListSource).not.toContain("shouldHideIntermediateNarration");
    expect(messageListSource).toContain("<IntermediateNarrationRow message={msg} />");
    expect(messageListSource).toContain("chat-messages__item-wrapper--narration");
    expect(messageListSource).toContain("enableActions={enableActions}");
    expect(messageListSource).toContain("isIntermediateAssistantProgress(renderEntries, entryIndex)");
    expect(messageListSource).toContain("canCollapse={canCollapse}");
    expect(messageListSource).toContain("shouldAutoCollapseToolGroup({");
    expect(messageListSource).toContain("const awaitingAssistantReply = useMemo(");
    expect(messageListSource).toContain(
      "isAwaitingVisibleAssistantReply(messages, isRunning)"
    );
    expect(messageListSource).toContain("extractCustomId(currentDialogConfig.dbKey) === dialogId");
    expect(messageListSource).toContain("useActiveControllers(activeDialogKey)");
    expect(messageListSource).toContain("chat-messages__item-wrapper--pending");
    expect(messageListSource).toContain("<AssistantReplyPending />");
  });

  it("renders memory.saved indicators using the MemorySavedIndicator component", () => {
    expect(messageListSource).toContain("import { LuBrain }");
    expect(messageListSource).toContain("<MemorySavedIndicator dialogConfig={currentDialogConfig} />");
    expect(messageListSource).toContain("export function getSavedMemories");
    expect(messageListSource).toContain("export const MemorySavedIndicator");
  });

  it("drives chat-page scroll shadow via data-attrs, not React state", () => {
    // dataset 写入 + 卸载清理；CSS 用属性选择器切换 mask-image，不靠 state。
    expect(messageListSource).toContain('setAttribute("data-nolo-chat-scroll-shadow", "");');
    expect(messageListSource).toContain('setAttribute("data-top-scroll", "");');
    expect(messageListSource).toContain('setAttribute("data-bottom-scroll", "");');
    expect(messageListSource).toContain('scroller.removeAttribute("data-nolo-chat-scroll-shadow");');
    expect(messageStylesSource).toContain(
      ".MainLayout__main[data-nolo-chat-scroll-shadow][data-top-scroll]::before"
    );
    expect(messageStylesSource).toContain(
      ".MainLayout__main[data-nolo-chat-scroll-shadow][data-bottom-scroll]::after"
    );
  });
});

describe("OPT-FE-01 message list memo / re-render boundary", () => {
  it("lifts last-assistant id + canBranch so historical rows stay memo-stable on stream tokens", () => {
    expect(messageListSource).toContain("selectLastAssistantMessage");
    expect(messageListSource).toContain(
      "selectLastAssistantMessage(state, dialogId)"
    );
    expect(messageListSource).toContain(
      "const renderEntries = useMemo("
    );
    expect(messageListSource).toContain("groupConsecutiveToolEntries(buildMessageRenderEntries(");
    expect(messageListSource).toContain("canBranch={canBranch}");
    expect(messageListSource).toContain("enableActions={enableActions}");
    expect(messageItemSource).toContain("enableActions?: boolean");
    expect(messageItemSource).toContain("prev.enableActions === next.enableActions");
    // Dead per-render style string removed; styles live in messagesStyles.ts.
    expect(messageListSource).not.toContain("const css = `");
  });

  it("wires tool grouping imports and ToolMessageGroup rendering", () => {
    expect(messageListSource).toContain('import ToolMessageGroup from "./ToolMessageGroup";');
    expect(messageListSource).toContain("groupConsecutiveToolEntries");
    expect(messageListSource).toContain("type GroupedRenderEntry");
    expect(messageListSource).toContain("<ToolMessageGroup");
    expect(messageListSource).toContain("messages={entry.messages}");
    expect(messageListSource).toContain("canCollapse={canCollapse}");
  });

  it("MessageItem selects last-assistant id only when canBranch is not provided", () => {
    // Lifted: parent passes canBranch boolean; MessageItem falls back to Redux only when omitted.
    expect(messageItemSource).toContain("canBranchProp !== undefined");
    expect(messageItemSource).toContain(
      "return selectLastAssistantMessage(state)?.id ?? null;"
    );
  });

  it("MessageLayout is memoized with an explicit props comparator", () => {
    expect(messageLayoutSource).toContain("export const MessageLayout = memo(");
    expect(messageLayoutSource).toContain("areMessageLayoutPropsEqual");
  });

  it("MessageLayout wraps bubble + actions in a shared hover parent (pattern A)", () => {
    expect(messageLayoutSource).toContain("useActionsHoverPin");
    expect(messageLayoutSource).toContain("msg-hover-target");
    expect(messageLayoutSource).toContain("msg-bubble-row");
    expect(messageLayoutSource).toContain("msg-actions-below");
    expect(messageLayoutSource).toContain("is-actions-hover");
    expect(messageLayoutSource).toContain("onMouseEnter");
    expect(messageLayoutSource).toContain("onMouseLeave");
    expect(messageLayoutSource).toContain("{avatarDesktop}");
    // Actions are a sibling under the bubble row (not nested inside it).
    const rowOpen = messageLayoutSource.indexOf('className="msg-bubble-row"');
    const rowAvatar = messageLayoutSource.indexOf("{avatarDesktop}", rowOpen);
    const rowBody = messageLayoutSource.indexOf("msg-body", rowOpen);
    const actions = messageLayoutSource.indexOf(
      'className="msg-actions-below"',
      rowOpen
    );
    expect(rowOpen).toBeGreaterThanOrEqual(0);
    expect(rowAvatar).toBeGreaterThan(rowOpen);
    expect(rowBody).toBeGreaterThan(rowAvatar);
    expect(actions).toBeGreaterThan(rowBody);
  });

  it("MessageLayout keeps avatar column width as a shared token", () => {
    expect(messageLayoutStylesSource).toContain("width: 32");
    expect(messageLayoutStylesSource).toContain(
      'marginLeft: "calc(32px + var(--space-4))"'
    );
    expect(messageLayoutStylesSource).toContain(
      'marginRight: "calc(32px + var(--space-4))"'
    );
  });

  it("stream-token render model: historical MessageItem re-renders drop ≥50% (target ~0)", () => {
    const historicalCount = 50;
    const tokens = 20;

    const baseline = estimateMessageItemRendersOnStreamToken({
      historicalCount,
      selectsFullLastAssistant: true,
    });
    const after = estimateMessageItemRendersOnStreamToken({
      historicalCount,
      selectsFullLastAssistant: false,
      listProvidesStableCanBranch: true,
    });

    expect(baseline.historicalRenders).toBe(50);
    expect(baseline.total).toBe(51);
    expect(after.historicalRenders).toBe(0);
    expect(after.streamingRenders).toBe(1);
    expect(after.total).toBe(1);

    const baselineTotal = baseline.total * tokens;
    const afterTotal = after.total * tokens;
    const dropRatio = 1 - afterTotal / baselineTotal;
    expect(dropRatio).toBeGreaterThanOrEqual(0.5);
    // Full historical elimination: 1000 → 0 historical over 20 tokens.
    expect(after.historicalRenders * tokens).toBe(0);
    expect(baseline.historicalRenders * tokens).toBe(1000);
  });
});
