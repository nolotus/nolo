import { Model } from "ai/llm/types";

/** xAI Chat Completions model IDs. CLI list: `grok models`. API may lag; verify with a live run. */
export const xaiModels: Model[] = [
  {
    name: "grok-4.6",
    displayName: "Grok 4.6",
    hasVision: true,
    contextWindow: 500000,
    price: { input: 14, output: 42 },
    fnCall: true,
    jsonOutput: true,
  },
];