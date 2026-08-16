export type CanvasRuntimeAction =
  | {
      type: "toggle";
      key: string;
    }
  | {
      type: "setState";
      key: string;
      value: unknown;
    }
  | {
      type: "scrollTo";
      targetId: string;
    };

export type CanvasRuntimeState = Record<string, unknown>;

export function parseCanvasRuntimeAction(action: unknown): CanvasRuntimeAction | null {
  if (!action || typeof action !== "object") return null;
  const candidate = action as Record<string, unknown>;
  const type = candidate.type;

  if (type === "toggle" && typeof candidate.key === "string" && candidate.key.trim()) {
    return { type, key: candidate.key };
  }

  if (type === "setState" && typeof candidate.key === "string" && candidate.key.trim()) {
    return { type, key: candidate.key, value: candidate.value };
  }

  if (type === "scrollTo" && typeof candidate.targetId === "string" && candidate.targetId.trim()) {
    return { type, targetId: candidate.targetId };
  }

  return null;
}

export function reduceCanvasRuntimeAction(
  state: CanvasRuntimeState,
  action: CanvasRuntimeAction
): CanvasRuntimeState {
  if (action.type === "toggle") {
    return {
      ...state,
      [action.key]: !state[action.key],
    };
  }

  if (action.type === "setState") {
    return {
      ...state,
      [action.key]: action.value,
    };
  }

  return state;
}
