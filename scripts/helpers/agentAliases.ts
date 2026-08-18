import { parseAgentKeyFromInput } from "./agentDataHelpers";

export function resolveAgentKeyAlias(raw: string): string | undefined {
  void raw;
  return undefined;
}

export function resolveAgentKeyInput(raw: string): string {
  return parseAgentKeyFromInput(raw);
}
