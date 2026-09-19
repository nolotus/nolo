import {
  buildDevinAuthUrl,
  buildDevinOAuthCredential,
  detectLocalDevinCredentials,
  extractDevinToken,
  type LocalDevinCredentialDetection,
} from "../../../agent-runtime/devinOAuth";
import type { OAuthCredential, OAuthFlowDeps } from "../types";
import { createInterface } from "node:readline/promises";

export type DevinOAuthFlowDeps = OAuthFlowDeps & {
  detectCredentialsFn?: () => LocalDevinCredentialDetection;
};

export async function runDevinOAuthLogin(
  deps: DevinOAuthFlowDeps = {}
): Promise<OAuthCredential> {
  const detect = deps.detectCredentialsFn ?? detectLocalDevinCredentials;
  const local = detect();

  if (local.found && local.token) {
    deps.output?.log?.(
      `Detected existing local Devin credentials from ${local.source} (${local.sourcePath}). Linking directly...`
    );
    return {
      ...buildDevinOAuthCredential(local.token),
      metadata: {
        source: local.source,
        sourcePath: local.sourcePath,
      },
    };
  }

  const authUrl = buildDevinAuthUrl();

  deps.output?.log?.("\nNo local Devin CLI credentials found (~/.local/share/devin/credentials.toml).");
  deps.output?.log?.("Tip: You can run `devin auth login` in another terminal to authenticate automatically.\n");
  deps.output?.log?.("Alternatively, paste your Devin session token (devin-session-token$... or token from windsurf.com/show-auth-token) below:");

  let input = "";
  if (deps.readLine) {
    input = await deps.readLine("Devin Token: ");
  } else {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    try {
      input = await rl.question("Devin Token: ");
    } finally {
      rl.close();
    }
  }

  const token = extractDevinToken(input);
  if (!token) {
    throw new Error("No valid Devin token provided");
  }

  return buildDevinOAuthCredential(token);
}
