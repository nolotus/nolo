import { useEffect, useState } from "react";

export type ChatInputSeed = {
  text: string;
  mode: "append" | "replace";
  focus?: boolean;
  editMessageId?: string;
  originalContent?: any;
};

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
