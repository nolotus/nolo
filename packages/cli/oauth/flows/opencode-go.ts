import { createInterface } from "node:readline/promises";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { OAuthCredential, OAuthFlowDeps } from "../types";

export const OPENCODE_GO_PROVIDER = "opencode-go" as const;
export const OPENCODE_GO_ENDPOINT = "https://opencode.ai/zen/go/v1" as const;
export const DEFAULT_OPENCODE_GO_MODEL = "opencode-go/glm-5.2" as const;

export const DEFAULT_OPENCODE_AUTH_PATH = join(
  homedir(),
  ".local",
  "share",
  "opencode",
  "auth.json"
);

type OpenCodeAuthFile = {
  [provider: string]: {
    type: "api" | "oauth";
    key?: string;
    access?: string;
    refresh?: string;
  };
};

export function readOpenCodeGoKeyFromAuthFile(
  path: string = DEFAULT_OPENCODE_AUTH_PATH
): string | undefined {
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as OpenCodeAuthFile;
    return parsed?.["opencode-go"]?.key?.trim();
  } catch {
    return undefined;
  }
}

export async function runOpencodeGoAuthFlow(
  deps: OAuthFlowDeps = {}
): Promise<OAuthCredential> {
  const outputTarget = deps.output ?? console;
  const errorTarget = deps.error ?? console;

  const existingKey = readOpenCodeGoKeyFromAuthFile();
  if (existingKey) {
    outputTarget.log(`Found existing OpenCode Go API key in ${DEFAULT_OPENCODE_AUTH_PATH}.`);
  }

  outputTarget.log(
    `Paste your OpenCode Go API key (from https://opencode.ai/workspace/go), or press Enter to use the existing key:`
  );

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const key = await rl.question(
      existingKey ? `API key [${existingKey.slice(0, 4)}...]: ` : "API key: "
    );
    const finalKey = key.trim() || existingKey;
    if (!finalKey) {
      throw new Error("No OpenCode Go API key provided.");
    }
    return {
      provider: OPENCODE_GO_PROVIDER as any,
      accessToken: finalKey,
      obtainedAt: (deps.now ?? Date.now)(),
    };
  } finally {
    rl.close();
  }
}

/**
 * OpenCode Go uses a provider-specific model prefix in the UI (e.g. "opencode-go/glm-5.2")
 * but the HTTP endpoint expects the bare model name ("glm-5.2").
 */
export function normalizeOpenCodeGoModel(model: string): string {
  return model.replace(/^opencode-go\//, "");
}
