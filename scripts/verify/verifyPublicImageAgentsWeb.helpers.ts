import { asTrimmedString } from "core/trimmedString";
import { fileKey } from "../../packages/database/keys";

export type DialogMessage = {
  role?: string;
  content?: unknown;
  name?: string;
  toolName?: string;
  toolPayload?: unknown;
};

/** Narrow page surface used only by clickStartChatUntilDialog navigation. */
export type DialogPageLike = {
  waitForLoadState(state: "domcontentloaded", options: { timeout: number }): Promise<unknown>;
  waitForURL(url: RegExp, options: { timeout: number }): Promise<unknown>;
  waitForTimeout?(timeout: number): Promise<unknown>;
  url(): string;
};

/**
 * Preserve the concrete page type (e.g. Playwright `Page`) through the helper so
 * callers can keep using locator/goto without forcing full Page into DialogPageLike.
 */
export async function clickStartChatUntilDialog<TPage extends DialogPageLike>(args: {
  currentPage: TPage;
  createPopupWaiter: () => Promise<TPage | null>;
  clickStartChat: () => Promise<void>;
  dialogUrlPattern?: RegExp;
  popupLoadTimeoutMs?: number;
  navigationTimeoutMs?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
}): Promise<TPage> {
  const dialogUrlPattern = args.dialogUrlPattern ?? /\/(?:space\/[^/]+\/)?dialog-[^/?]+/;
  const popupLoadTimeoutMs = args.popupLoadTimeoutMs ?? 30_000;
  const navigationTimeoutMs = args.navigationTimeoutMs ?? 30_000;
  const maxAttempts = args.maxAttempts ?? 2;
  const retryDelayMs = args.retryDelayMs ?? 1_500;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const popupPromise = args.createPopupWaiter();
    await args.clickStartChat();

    const activePage = (await popupPromise) ?? args.currentPage;
    await activePage
      .waitForLoadState("domcontentloaded", { timeout: popupLoadTimeoutMs })
      .catch(() => null);

    try {
      await activePage.waitForURL(dialogUrlPattern, { timeout: navigationTimeoutMs });
      return activePage;
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) break;
      if (typeof args.currentPage.waitForTimeout === "function") {
        await args.currentPage.waitForTimeout(retryDelayMs);
      }
    }
  }

  throw lastError ?? new Error("Failed to enter dialog after clicking start chat.");
}

export function collectStrings(value: unknown, sink: string[]) {
  if (typeof value === "string") {
    sink.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, sink);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const child of Object.values(value as Record<string, unknown>)) {
    collectStrings(child, sink);
  }
}

export function collectArtifactKeys(value: unknown, sink: Set<string>, userId?: string | null) {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") {
        collectArtifactKeys(parsed, sink, userId);
        return;
      }
    } catch {
      // fall through to literal file key matching for non-JSON strings
    }
    for (const match of value.matchAll(/file-[A-Za-z0-9]+-[0-9A-Z]{10,}/gi)) {
      sink.add(match[0]);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectArtifactKeys(item, sink, userId);
    return;
  }
  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  const fileId = asTrimmedString(record.fileId);
  if (fileId && userId) {
    sink.add(fileKey.single(userId, fileId));
  }
  for (const child of Object.values(record)) {
    collectArtifactKeys(child, sink, userId);
  }
}

export function contentIncludesScenario(content: unknown, scenario: string) {
  const strings: string[] = [];
  collectStrings(content, strings);
  return strings.some((text) => text.includes(scenario));
}

export function collectMessageArtifactKeys(message: DialogMessage, userId?: string | null) {
  const artifactKeys = new Set<string>();
  collectArtifactKeys(message.content, artifactKeys, userId);
  return Array.from(artifactKeys);
}

export function collectDialogArtifactKeys(messages: DialogMessage[], userId?: string | null) {
  const artifactKeys = new Set<string>();

  for (const message of messages) {
    if (message.role === "assistant" || message.role === "tool") {
      collectArtifactKeys(message.content, artifactKeys, userId);
    }
  }

  return Array.from(artifactKeys);
}

function parseJsonValue(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function collectArtifactKeysFromValue(value: unknown, userId?: string | null) {
  const artifactKeys = new Set<string>();
  collectArtifactKeys(value, artifactKeys, userId);
  return Array.from(artifactKeys);
}

function getToolPayload(message: DialogMessage) {
  if (message.toolPayload && typeof message.toolPayload === "object") {
    return message.toolPayload as Record<string, unknown>;
  }
  const parsedContent = parseJsonValue(message.content);
  if (parsedContent && typeof parsedContent === "object") {
    const record = parsedContent as Record<string, unknown>;
    if (record.toolPayload && typeof record.toolPayload === "object") {
      return record.toolPayload as Record<string, unknown>;
    }
    return record;
  }
  return null;
}

function getToolName(message: DialogMessage, payload: Record<string, unknown> | null) {
  const directName = typeof message.toolName === "string" ? message.toolName : "";
  const legacyName = typeof message.name === "string" ? message.name : "";
  const payloadName = typeof payload?.toolName === "string" ? payload.toolName : "";
  const name = directName || legacyName || payloadName;
  return name.trim();
}

function isFailedToolPayload(payload: Record<string, unknown> | null) {
  if (!payload) return false;
  if (payload.status === "failed") return true;
  if (payload.ok === false || payload.success === false || payload.applied === false) return true;
  return false;
}

export function verifyExistingContinuousImageEditDialog(args: {
  messages: DialogMessage[];
  userId?: string | null;
  dialogUrl?: string;
}) {
  const location = args.dialogUrl ? ` Dialog: ${args.dialogUrl}.` : "";
  const priorOutputArtifactKeys = new Set<string>();
  const failedEditIndexes: number[] = [];

  for (let index = 0; index < args.messages.length; index += 1) {
    const message = args.messages[index];
    const payload = getToolPayload(message);
    const toolName = getToolName(message, payload);

    if (toolName === "openAIGptImageEdit") {
      if (isFailedToolPayload(payload)) {
        failedEditIndexes.push(index);
      } else {
        const inputArtifactKeys = collectArtifactKeysFromValue(payload?.input, args.userId);
        const reusedPriorArtifactKeys = inputArtifactKeys.filter((key) =>
          priorOutputArtifactKeys.has(key)
        );
        const currentMessageArtifactKeys = collectMessageArtifactKeys(message, args.userId);
        const outputArtifactKeys = currentMessageArtifactKeys.filter(
          (key) => !inputArtifactKeys.includes(key)
        );

        if (reusedPriorArtifactKeys.length > 0 && outputArtifactKeys.length > 0) {
          return {
            editMessageIndex: index,
            inputArtifactKeys,
            reusedPriorArtifactKeys,
            outputArtifactKeys,
            failedEditIndexes,
          };
        }
      }
    }

    if (message.role === "assistant" || message.role === "tool") {
      for (const key of collectMessageArtifactKeys(message, args.userId)) {
        priorOutputArtifactKeys.add(key);
      }
    }
  }

  throw new Error(
    `Expected existing dialog to contain a successful continuous image edit: ` +
      `openAIGptImageEdit input must reuse a prior image artifact and emit a new image artifact. ` +
      `Prior artifacts seen=${JSON.stringify(Array.from(priorOutputArtifactKeys))}; ` +
      `failed edit indexes=${JSON.stringify(failedEditIndexes)}.${location}`
  );
}

export function verifyScenarioCarryForward(args: {
  messages: DialogMessage[];
  scenario: string;
  expectedArtifactKeys: string[];
  userId?: string | null;
  dialogUrl?: string;
  forbiddenArtifactKeys?: string[];
}) {
  const location = args.dialogUrl ? ` Dialog: ${args.dialogUrl}.` : "";
  const matchingUserMessageIndex = args.messages.findLastIndex(
    (message) => message.role === "user" && contentIncludesScenario(message.content, args.scenario)
  );
  const matchingUserMessage =
    matchingUserMessageIndex >= 0 ? args.messages[matchingUserMessageIndex] : undefined;
  if (!matchingUserMessage) {
    throw new Error(
      `Failed to find user message for ${args.scenario} when verifying carry-forward.${location}`
    );
  }

  const turnArtifactKeys = new Set<string>();
  for (let index = matchingUserMessageIndex; index < args.messages.length; index += 1) {
    const message = args.messages[index];
    if (index > matchingUserMessageIndex && message.role === "user") break;
    for (const key of collectMessageArtifactKeys(message, args.userId)) {
      turnArtifactKeys.add(key);
    }
  }
  const referencedArtifactKeys = Array.from(turnArtifactKeys);
  const reusedLatestArtifactKeys = referencedArtifactKeys.filter((key) =>
    args.expectedArtifactKeys.includes(key)
  );
  if (reusedLatestArtifactKeys.length === 0) {
    throw new Error(
      `Expected ${args.scenario} to reuse one of latest artifacts ${JSON.stringify(
        args.expectedArtifactKeys
      )}, got ${JSON.stringify(referencedArtifactKeys)}.${location}`
    );
  }

  const staleArtifactKeys = referencedArtifactKeys.filter((key) =>
    (args.forbiddenArtifactKeys ?? []).includes(key)
  );
  if (staleArtifactKeys.length > 0) {
    throw new Error(
      `Expected ${args.scenario} to reuse only latest artifacts ${JSON.stringify(
        args.expectedArtifactKeys
      )}, but also found stale artifacts ${JSON.stringify(staleArtifactKeys)} within ${JSON.stringify(
        referencedArtifactKeys
      )}.${location}`
    );
  }

  return {
    referencedArtifactKeys,
    reusedLatestArtifactKeys,
    staleArtifactKeys,
  };
}
