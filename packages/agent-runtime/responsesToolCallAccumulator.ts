import type { AgentRuntimeToolCall } from "./types";

type State = {
  id: string;
  name: string;
  arguments: string;
  sawDelta: boolean;
};

export type ResponsesToolAccumulator = Map<string, State>;

export function normalizeResponsesToolArguments(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function createResponsesToolAccumulator(): ResponsesToolAccumulator {
  return new Map();
}

function keyOf(event: any): string {
  return typeof event?.item_id === "string" && event.item_id
    ? event.item_id
    : typeof event?.item?.id === "string" && event.item.id
      ? event.item.id
      : typeof event?.item?.call_id === "string" && event.item.call_id
        ? event.item.call_id
        : typeof event?.call_id === "string" && event.call_id
          ? event.call_id
          : "";
}

/**
 * 短指纹（FNV-1a 32 位）：仅用于诊断对齐，不做安全用途、不含参数内容。
 */
function shortFingerprint(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** 该字符串是否已是可解析的 JSON 对象（用于冲突时的可信度判定）。 */
function parsesAsJsonObject(value: string): boolean {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed !== null && typeof parsed === "object";
  } catch {
    return false;
  }
}

export function applyResponsesToolEvent(
  calls: ResponsesToolAccumulator,
  event: any,
): void {
  const key = keyOf(event);
  if (!key) return;
  const item = event?.item;
  const id = item?.call_id || item?.id || event?.call_id || key;
  const current = calls.get(key) ?? { id, name: "", arguments: "", sawDelta: false };
  if (typeof item?.name === "string" && item.name) current.name = item.name;

  const applySnapshot = (next: string) => {
    if (!current.sawDelta) {
      current.arguments = next;
      return;
    }
    if (next.startsWith(current.arguments)) {
      // The snapshot is a superset of the deltas already seen.
      current.arguments = next;
    } else if (current.arguments.startsWith(next)) {
      // Never let a shorter done snapshot erase the accumulated tail.
    } else {
      // 冲突（既非前缀也非超集）。review 结论：只有"累积值不可解析、快照可解析"
      // 时才采信快照——此时快照是本轮唯一可用的完整值；两者都可解析时保留累积值
      // （不改变原有的保守语义）。
      if (!parsesAsJsonObject(current.arguments) && parsesAsJsonObject(next)) {
        console.warn(
          `[responses-tool-call] adopting parsable snapshot over unparsable accumulation (accumulated length=${current.arguments.length}, fingerprint=${shortFingerprint(current.arguments)}; snapshot length=${next.length}, fingerprint=${shortFingerprint(next)})`,
        );
        current.arguments = next;
        return;
      }
      console.warn(
        `[responses-tool-call] conflicting arguments snapshot (accumulated length=${current.arguments.length}, fingerprint=${shortFingerprint(current.arguments)}; snapshot length=${next.length}, fingerprint=${shortFingerprint(next)})`,
      );
    }
  };

  const itemArguments = normalizeResponsesToolArguments(item?.arguments);
  if (itemArguments !== undefined) applySnapshot(itemArguments);
  const eventArguments = normalizeResponsesToolArguments(event?.arguments);
  if (eventArguments !== undefined) applySnapshot(eventArguments);
  if (typeof event?.delta === "string") {
    current.sawDelta = true;
    current.arguments += event.delta;
  }
  calls.set(key, current);
}

export function addResponsesToolCall(
  calls: ResponsesToolAccumulator,
  call: AgentRuntimeToolCall,
): void {
  const key = call.id;
  calls.set(key, {
    id: call.id,
    name: call.function.name,
    arguments: call.function.arguments,
    sawDelta: false,
  });
}

export function finalizeResponsesToolCalls(
  calls: ResponsesToolAccumulator,
): AgentRuntimeToolCall[] {
  return [...calls.values()]
    .filter((call) => call.name)
    .map((call) => ({
      id: call.id,
      type: "function",
      function: { name: call.name, arguments: call.arguments },
    }));
}
