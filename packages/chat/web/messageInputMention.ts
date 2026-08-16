import type { FavoriteAgentSummary } from "./messageInputAgentUi";

export type MentionKind = "agent";

export interface MentionState {
  active: boolean;
  kind: MentionKind | null;
  query: string;
  startIndex: number;
}

export const createInactiveMentionState = (): MentionState => ({
  active: false,
  kind: null,
  query: "",
  startIndex: -1,
});

export const resolveAgentMentionState = (
  value: string,
  cursorIndex: number
): MentionState => {
  const textValue = value ?? "";
  const cursor = Math.min(Math.max(cursorIndex, 0), textValue.length);

  for (let i = cursor - 1; i >= 0; i -= 1) {
    const ch = textValue[i];

    if (ch === "@") {
      if (i > 0 && /\w/.test(textValue[i - 1])) {
        break;
      }

      const query = textValue.slice(i + 1, cursor);
      if (/\s/.test(query)) {
        break;
      }

      return {
        active: true,
        kind: "agent",
        query,
        startIndex: i,
      };
    }

    if (/\s/.test(ch)) {
      break;
    }
  }

  return createInactiveMentionState();
};

export const buildAgentMentionInsertion = ({
  currentValue,
  cursorPos,
  mentionState,
  agent,
}: {
  currentValue: string;
  cursorPos: number;
  mentionState: MentionState;
  agent: FavoriteAgentSummary;
}) => {
  if (
    !mentionState.active ||
    mentionState.kind !== "agent" ||
    mentionState.startIndex < 0
  ) {
    return null;
  }

  const before = currentValue.slice(0, mentionState.startIndex);
  const after = currentValue.slice(cursorPos);
  const safeName = agent.name || agent.agentKey;
  const mentionText = `@${safeName} `;

  return {
    nextText: `${before}${mentionText}${after}`,
    nextMentionState: createInactiveMentionState(),
    nextMentionHighlightIndex: 0,
    targetAgentKey: agent.agentKey,
  };
};

export const moveMentionHighlightIndex = ({
  previousIndex,
  optionCount,
  direction,
}: {
  previousIndex: number;
  optionCount: number;
  direction: "next" | "prev";
}) => {
  if (optionCount <= 0) return 0;
  const maxIndex = optionCount - 1;
  if (direction === "next") {
    return previousIndex >= maxIndex ? maxIndex : previousIndex + 1;
  }
  return previousIndex <= 0 ? 0 : previousIndex - 1;
};
