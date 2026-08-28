import type { Model } from "./types";

// The export is retained as an empty array so legacy import sites
// (models.ts / providers.ts) keep compiling during the cleanup.
export const OPENROUTER_MODELS: Model[] = [];

export const openrouterModels = OPENROUTER_MODELS;