export type ServerOwnedAssistantStreamState = {
  /** Full live projection kept visible until canonical history replaces it. */
  text: string;
  thinking: string;
  /** Current assistant segment only; mirrors server persistence boundaries. */
  segmentText: string;
  segmentThinking: string;
};

export const EMPTY_SERVER_OWNED_ASSISTANT_STREAM: ServerOwnedAssistantStreamState = {
  text: "",
  thinking: "",
  segmentText: "",
  segmentThinking: "",
};

/**
 * Pure accumulator for the server-owned assistant projection.
 *
 * `text` / `thinking` retain the full live presentation so an assistant preface
 * does not disappear when a tool starts. `segmentText` / `segmentThinking`
 * intentionally reset on `assistant_tool_calls` because the server persists the
 * pre-tool assistant trace as its own canonical row and starts a new assistant
 * segment after the tool result. Handoff must fingerprint that final segment,
 * not the concatenated live projection, or tool-using turns leave a duplicate
 * transient beside the canonical rows.
 */
export function applyServerOwnedAssistantStreamPayload(
  state: ServerOwnedAssistantStreamState,
  payload: any,
): ServerOwnedAssistantStreamState {
  if (payload?.type === "thinking" && typeof payload.content === "string") {
    return {
      ...state,
      thinking: state.thinking + payload.content,
      segmentThinking: state.segmentThinking + payload.content,
    };
  }
  if (payload?.type === "text" && typeof payload.content === "string") {
    return {
      ...state,
      text: state.text + payload.content,
      segmentText: state.segmentText + payload.content,
    };
  }
  if (payload?.type === "assistant_tool_calls") {
    if (!state.segmentText && !state.segmentThinking) return state;
    return {
      ...state,
      segmentText: "",
      segmentThinking: "",
    };
  }
  return state;
}
