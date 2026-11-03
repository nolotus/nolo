import { anthropicGrantRemainingMs } from "../../agent-runtime/anthropicOAuth";
import { defaultOpenBrowser } from "../authCommands";
import {
  syncCredentialToServer,
  resolveServerSyncConfig,
  type ServerSyncConfig,
} from "../oauth/authCommand";
import { runAnthropicOAuthLogin } from "../oauth/flows/anthropic";
import { runAntigravityOAuthLogin } from "../oauth/flows/antigravity";
import { runCloudflareOAuthLogin } from "../oauth/flows/cloudflare";
import { runCursorOAuthLogin } from "../oauth/flows/cursor";
import { runDevinOAuthLogin } from "../oauth/flows/devin";
import {
  runOpenAiCodexBrowserPkce,
  runOpenAiCodexDeviceCode,
} from "../oauth/flows/openai-codex";
import {
  runXaiOAuthDeviceCode,
  runXaiOAuthLogin,
} from "../oauth/flows/xai";
import {
  createOAuthTokenStore,
  isTokenExpired,
  type OAuthCredential,
  type OAuthProvider,
  type OAuthTokenStore,
} from "../oauth/token-store";
import type { OAuthFlowDeps } from "../oauth/types";
import { renderDialogTitle } from "./dialogFrame";
import type { DialogHost } from "./dialogHost";
import { t } from "./i18n";
import { redactSecrets } from "./redactSecrets";
import { runSelectDialog, type SelectDialogItem } from "./selectDialog";

export const TUI_AUTH_PROVIDERS: readonly OAuthProvider[] = [
  "claude",
  "chatgpt",
  "antigravity",
  "xai",
  "cursor",
  "devin",
] as const;

export const PROVIDER_DISPLAY_NAMES: Record<OAuthProvider, string> = {
  claude: "Claude (Anthropic)",
  chatgpt: "ChatGPT (OpenAI)",
  antigravity: "Antigravity (Google)",
  xai: "xAI (Grok)",
  cursor: "Cursor",
  devin: "Devin",
  cloudflare: "Cloudflare",
};

export type AuthProviderPickerItem = SelectDialogItem & {
  provider: OAuthProvider;
};

export type TuiAuthDeps = OAuthFlowDeps & {
  tokenStore?: OAuthTokenStore;
  promptSync?: (question: string) => Promise<boolean>;
  selectProvider?: (
    items: AuthProviderPickerItem[],
  ) => Promise<OAuthProvider | null>;
  dialogHost?: DialogHost;
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
  syncCredentialToServer?: typeof syncCredentialToServer;
  resolveServerSyncConfig?: () => ServerSyncConfig | null;
  now?: () => number;
};

export type TuiAuthOutcome =
  | { status: "status-rendered" }
  | { status: "success"; credential?: OAuthCredential }
  | { status: "logout-success" }
  | { status: "failed"; reason: string };

function strWidth(str: string): number {
  let w = 0;
  for (const ch of str) {
    w += ch.charCodeAt(0) > 255 ? 2 : 1;
  }
  return w;
}

function padRight(str: string, width: number): string {
  const diff = width - strWidth(str);
  return diff > 0 ? str + " ".repeat(diff) : str;
}

export function formatGrantRemaining(
  provider: OAuthProvider,
  credential: OAuthCredential | null,
  now: number,
): string {
  if (provider !== "claude" || !credential) return "-";
  // 复用 agent-runtime 的单一实现（读 metadata.grantedAt，而非会随刷新变化的
  // obtainedAt）；未记录 grantedAt 时返回 undefined。
  const rem = anthropicGrantRemainingMs(credential, now);
  if (rem === undefined) return "-";
  if (rem <= 0) return t("auth.grantExpired");
  const days = Math.floor(rem / (24 * 3600 * 1000));
  const hours = Math.floor((rem % (24 * 3600 * 1000)) / (3600 * 1000));
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor(rem / (60 * 1000));
  if (minutes > 0) return `${minutes}m`;
  return "<1m";
}

export function formatLocalStatus(
  credential: OAuthCredential | null,
  now: number,
): string {
  if (!credential) return t("auth.statusUnauthenticated");
  if (isTokenExpired(credential, 0, now)) return t("auth.statusExpired");
  return t("auth.statusAuthenticated");
}

export function formatServerSyncStatus(
  credential: OAuthCredential | null,
): string {
  if (!credential) return "-";
  if (credential.serverManaged) {
    return t("auth.syncStatusSynced");
  }
  return t("auth.syncStatusNotSynced");
}

export function toAuthProviderPickerItems(
  tokenStore: OAuthTokenStore,
  now: number = Date.now(),
): AuthProviderPickerItem[] {
  return TUI_AUTH_PROVIDERS.map((provider) => {
    const cred = tokenStore.read(provider);
    const isAuthed = cred && !isTokenExpired(cred, 0, now);
    const isExp = cred && isTokenExpired(cred, 0, now);
    const statusLabel = isAuthed
      ? `✓ ${t("auth.statusAuthenticated")}`
      : isExp
        ? `⚠ ${t("auth.statusExpired")}`
        : t("auth.statusUnauthenticated");

    const brandName = PROVIDER_DISPLAY_NAMES[provider] ?? provider;
    const label = `${padRight(brandName, 26)} ${statusLabel}`;

    const grantPart = formatGrantRemaining(provider, cred, now);
    const syncPart = formatServerSyncStatus(cred);
    const detailParts: string[] = [];
    if (provider === "claude" && cred && grantPart !== "-") {
      detailParts.push(`${t("auth.statusColGrantRemaining")}: ${grantPart}`);
    }
    if (cred && syncPart !== "-") {
      detailParts.push(syncPart);
    }
    const detail = detailParts.length > 0 ? detailParts.join(" · ") : undefined;

    return {
      label,
      ...(detail ? { detail } : {}),
      provider,
    };
  });
}

export async function promptSelectProvider(
  deps: TuiAuthDeps,
  tokenStore: OAuthTokenStore,
  now: number = Date.now(),
): Promise<OAuthProvider | null> {
  const items = toAuthProviderPickerItems(tokenStore, now);
  if (deps.selectProvider) {
    return deps.selectProvider(items);
  }
  if (deps.dialogHost) {
    const pickResult = await deps.dialogHost.run((anchor) =>
      runSelectDialog({
        items,
        initialIndex: 0,
        titleLines: [renderDialogTitle(t("auth.pickerTitle"))],
        input: (deps.input ?? process.stdin) as any,
        output: (deps.output ?? process.stdout) as any,
        ...anchor,
      }),
    );
    if (pickResult.kind === "selected") {
      return (pickResult.item as AuthProviderPickerItem).provider;
    }
    return null;
  }
  return null;
}

export function renderAuthStatusPanel(
  tokenStore: OAuthTokenStore,
  now: number = Date.now(),
): string {
  const headers = [
    t("auth.statusColProvider"),
    t("auth.statusColLocalStatus"),
    t("auth.statusColGrantRemaining"),
    t("auth.statusColServerSync"),
  ];

  const rows: string[][] = TUI_AUTH_PROVIDERS.map((provider) => {
    const cred = tokenStore.read(provider);
    return [
      provider,
      formatLocalStatus(cred, now),
      formatGrantRemaining(provider, cred, now),
      formatServerSyncStatus(cred),
    ];
  });

  const colWidths = headers.map((header, colIndex) => {
    let max = strWidth(header);
    for (const row of rows) {
      const cellWidth = strWidth(row[colIndex] ?? "");
      if (cellWidth > max) max = cellWidth;
    }
    return Math.max(max, 10);
  });

  const formatLine = (cells: string[]) =>
    cells.map((cell, i) => padRight(cell, colWidths[i]! + 2)).join("").trimEnd();

  const lines: string[] = [
    t("auth.statusTitle"),
    "",
    formatLine(headers),
    formatLine(colWidths.map((w) => "-".repeat(w))),
  ];

  for (const row of rows) {
    lines.push(formatLine(row));
  }

  lines.push("");
  lines.push(t("auth.statusBottomHint"));

  return lines.join("\n");
}

export function classifyAuthFlowError(err: unknown, provider: string): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/state verification failed|state mismatch|invalid_state/i.test(msg)) {
    return t("auth.errorStateMismatch", provider);
  }
  if (/denied|cancelled|canceled|rejected|access_denied|abort/i.test(msg)) {
    return t("auth.errorCancelled", provider);
  }
  if (/invalid_grant|expired|revoked|refresh[_ ]token.*(expired|invalid)/i.test(msg)) {
    return t("auth.errorGrantExpired", provider);
  }
  if (
    /fetch failed|econnrefused|enotfound|etimedout|timeout|network|socket|ehostunreach/i.test(
      msg,
    )
  ) {
    return t("auth.errorNetwork");
  }
  return t("auth.commandFailed", provider, msg);
}

export async function runTuiAuthLogout(
  provider: OAuthProvider,
  emit: (text: string) => void,
  deps: TuiAuthDeps = {},
): Promise<TuiAuthOutcome> {
  const tokenStore = deps.tokenStore ?? createOAuthTokenStore();
  const credential = tokenStore.read(provider);
  if (!credential) {
    emit(t("auth.noLocalCredential", provider));
    return { status: "failed", reason: "no_credential" };
  }

  const wasServerManaged = Boolean(credential.serverManaged);
  tokenStore.remove(provider);

  if (wasServerManaged) {
    emit(t("auth.logoutLocalWithServerNotice", provider));
  } else {
    emit(t("auth.logoutSuccess", provider));
  }
  return { status: "logout-success" };
}

export async function runTuiAuth(
  args: string[],
  emit: (text: string) => void,
  deps: TuiAuthDeps = {},
): Promise<TuiAuthOutcome> {
  const tokenStore = deps.tokenStore ?? createOAuthTokenStore();
  const now = deps.now?.() ?? Date.now();

  if (args.length === 0) {
    if (deps.selectProvider || deps.dialogHost) {
      const selected = await promptSelectProvider(deps, tokenStore, now);
      if (!selected) {
        return { status: "failed", reason: "cancelled" };
      }
      return runTuiAuth([selected], emit, deps);
    }
    const panel = renderAuthStatusPanel(tokenStore, now);
    emit(panel);
    return { status: "status-rendered" };
  }

  const [subCommand, ...rest] = args;
  if (subCommand === "logout") {
    const target = rest[0]?.toLowerCase() as OAuthProvider | undefined;
    if (!target || !isValidProvider(target)) {
      emit(t("auth.unknownProvider", target ?? "", TUI_AUTH_PROVIDERS.join(", ")));
      return { status: "failed", reason: "unknown_provider" };
    }
    return runTuiAuthLogout(target, emit, deps);
  }

  const provider = subCommand.toLowerCase() as OAuthProvider;
  if (!isValidProvider(provider)) {
    emit(t("auth.unknownProvider", provider, TUI_AUTH_PROVIDERS.join(", ")));
    return { status: "failed", reason: "unknown_provider" };
  }

  const flowDeps: OAuthFlowDeps = {
    ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
    ...(deps.sleep ? { sleep: deps.sleep } : {}),
    ...(deps.now ? { now: deps.now } : {}),
    readLine: async (rawPrompt: string) => {
      const prompt = t("auth.pasteCallbackPrompt");
      if (deps.readLine) {
        return deps.readLine(prompt);
      }
      if (deps.dialogHost) {
        return deps.dialogHost.withKeyboard(async () => {
          const readline = await import("node:readline/promises");
          const rl = readline.createInterface({
            input: (deps.input ?? process.stdin) as NodeJS.ReadableStream,
            output: (deps.output ?? process.stdout) as NodeJS.WritableStream,
          });
          try {
            return await rl.question(prompt);
          } finally {
            rl.close();
          }
        });
      }
      const readline = await import("node:readline/promises");
      const rl = readline.createInterface({
        input: (deps.input ?? process.stdin) as NodeJS.ReadableStream,
        output: (deps.output ?? process.stdout) as NodeJS.WritableStream,
      });
      try {
        return await rl.question(prompt);
      } finally {
        rl.close();
      }
    },
    ...(deps.manualCode || rest.includes("--manual") || rest.includes("--no-browser")
      ? { manualCode: true }
      : {}),
    openBrowser: deps.openBrowser ?? defaultOpenBrowser,
    output: { log: (msg: string) => emit(redactSecrets(String(msg))) },
    error: { error: (msg: string) => emit(redactSecrets(String(msg))) },
  };

  let credential: OAuthCredential;
  try {
    if (provider === "claude") {
      credential = await runAnthropicOAuthLogin(flowDeps);
    } else if (provider === "chatgpt") {
      const useDeviceCode = rest.includes("--device-code");
      credential = useDeviceCode
        ? await runOpenAiCodexDeviceCode(flowDeps)
        : await runOpenAiCodexBrowserPkce(flowDeps);
    } else if (provider === "xai") {
      const useDeviceCode = rest.includes("--device-code");
      credential = useDeviceCode
        ? await runXaiOAuthDeviceCode(flowDeps)
        : await runXaiOAuthLogin(flowDeps);
    } else if (provider === "cursor") {
      credential = await runCursorOAuthLogin(flowDeps);
    } else if (provider === "devin") {
      credential = await runDevinOAuthLogin(flowDeps);
    } else if (provider === "cloudflare") {
      credential = await runCloudflareOAuthLogin(flowDeps);
    } else {
      credential = await runAntigravityOAuthLogin(flowDeps);
    }
  } catch (err) {
    const errorText = classifyAuthFlowError(err, provider);
    emit(redactSecrets(errorText));
    return {
      status: "failed",
      reason: err instanceof Error ? err.message : String(err),
    };
  }

  tokenStore.write(provider, credential);
  const accountLabel =
    (credential.metadata?.email as string | undefined) ?? credential.accountId ?? "";
  emit(
    t(
      "auth.authorizationSaved",
      provider,
      accountLabel ? t("auth.authorizationSavedForAccount", accountLabel) : "",
    ),
  );

  const hasExplicitNoSync = rest.includes("--no-sync-to-server");
  const hasExplicitSync = rest.includes("--sync-to-server");

  let shouldSync = false;
  if (hasExplicitNoSync) {
    shouldSync = false;
  } else if (hasExplicitSync) {
    shouldSync = true;
  } else {
    const syncConfig = (
      deps.resolveServerSyncConfig ?? resolveServerSyncConfig
    )();
    if (!syncConfig) {
      emit(t("auth.noServerConfigured", provider));
      shouldSync = false;
    } else {
      const question = t(
        "auth.syncPromptQuestion",
        syncConfig.serverOrigin,
        provider,
      );
      if (deps.promptSync) {
        shouldSync = await deps.promptSync(question);
      } else if (deps.dialogHost) {
        const syncResult = await deps.dialogHost.run((anchor) =>
          runSelectDialog({
            items: [
              { label: t("auth.syncOptionNo"), value: false },
              { label: t("auth.syncOptionYes"), value: true },
            ],
            initialIndex: 0,
            titleLines: [renderDialogTitle(question)],
            input: (deps.input ?? process.stdin) as any,
            output: (deps.output ?? process.stdout) as any,
            ...anchor,
          }),
        );
        shouldSync = syncResult.kind === "selected" ? syncResult.item.value : false;
      } else if (deps.readLine) {
        const raw = await deps.readLine(question);
        const trimmed = raw.trim().toLowerCase();
        shouldSync = trimmed === "y" || trimmed === "yes";
      } else {
        shouldSync = false;
      }
    }
  }

  if (shouldSync) {
    const syncFn = deps.syncCredentialToServer ?? syncCredentialToServer;
    const syncResult = await syncFn(provider, credential, {
      ...deps,
      output: flowDeps.output,
      error: flowDeps.error,
    });
    if (syncResult === "mark_failed") {
      emit(t("auth.markFailed"));
    }
  } else if (!hasExplicitNoSync) {
    emit(t("auth.notSyncedToServer", provider));
  }

  return { status: "success", credential };
}

function isValidProvider(provider: string): provider is OAuthProvider {
  return (
    TUI_AUTH_PROVIDERS.includes(provider as OAuthProvider) ||
    provider === "cloudflare"
  );
}
