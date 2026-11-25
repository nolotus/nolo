import { useEffect, useState } from "react";

export type ChatInputSeed = {
  text: string;
  mode: "append" | "replace";
  focus?: boolean;
  /** 可选定向目标对话 ID；未传时兼容既有全局草稿入口，传入时仅匹配该对话消费。 */
  dialogId?: string;
  editMessageId?: string;
  originalContent?: any;
};

export function shouldConsumeChatInputSeed(
  seed: ChatInputSeed | null | undefined,
  currentDialogId?: string | null
): seed is ChatInputSeed {
  if (!seed || !seed.text) return false;
  if (seed.dialogId && seed.dialogId !== currentDialogId) return false;
  return true;
}

export function applyChatInputSeedText(
  prevText: string,
  seed: Pick<ChatInputSeed, "text" | "mode">
): string {
  const { text: seedText, mode } = seed;
  if (mode !== "append" || !prevText) return seedText;
  const spacer = seedText.includes("\n")
    ? prevText.endsWith("\n\n")
      ? ""
      : prevText.endsWith("\n")
        ? "\n"
        : "\n\n"
    : prevText.endsWith(" ")
      ? ""
      : " ";
  return `${prevText}${spacer}${seedText}`;
}

let currentSeed: ChatInputSeed | null = null;
const listeners = new Set<(seed: ChatInputSeed | null) => void>();

export function publishChatInputSeed(seed: ChatInputSeed | null) {
  currentSeed = seed;
  listeners.forEach((listener) => listener(seed));
}

export function subscribeChatInputSeed(listener: (seed: ChatInputSeed | null) => void) {
  listeners.add(listener);
  listener(currentSeed);
  return () => {
    listeners.delete(listener);
  };
}

export function useChatInputSeed() {
  const [seed, setSeed] = useState<ChatInputSeed | null>(currentSeed);

  useEffect(() => subscribeChatInputSeed(setSeed), []);

  return seed;
}
