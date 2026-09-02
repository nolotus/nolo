import crypto from "crypto";

import { toErrorMessage } from "core/errorMessage";
import {
  createProviderCallFailedEvent,
  createProviderCallPendingEvent,
} from "./providerCall";
import { writeProviderCallEvent, type ProviderCallStore } from "./providerCallWriter";
import { writeBillingAnomaly } from "./billingAnomalyWriter";
import {
  writeRevokedProviderCredentialBlockedAnomalyIfNeeded,
  writeRevokedProviderCredentialUsedAnomalyIfNeeded,
} from "./providerCredentialAnomaly";
import { createProviderDispatchIntent } from "./providerDispatchIntent";
import {
  writeProviderDispatchIntent,
  type ProviderDispatchIntentStore,
} from "./providerDispatchIntentWriter";
import type { ProviderCredentialIdentity } from "./providerCredential";

type ProviderGatewayStore = ProviderCallStore & ProviderDispatchIntentStore;

type ProviderGatewayIds = {
  providerCallId?: () => string;
  pendingEventId?: () => string;
  dispatchIntentId?: () => string;
  failedEventId?: () => string;
};

type ProviderGatewayWriters = {
  providerCallWriter?: typeof writeProviderCallEvent;
  providerDispatchIntentWriter?: typeof writeProviderDispatchIntent;
  billingAnomalyWriter?: typeof writeBillingAnomaly;
};

type ProviderRequestCall = {
  userId: string;
  dialogId?: string;
  agentId?: string;
  provider: string;
  model: string;
  endpoint?: string;
  serviceTier?: string;
  credential?: ProviderCredentialIdentity;
  url: string;
  init?: RequestInit;
};

type DispatchProviderRequestInput = {
  store: ProviderGatewayStore;
  call: ProviderRequestCall;
  fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  now?: () => Date;
  ids?: ProviderGatewayIds;
  writers?: ProviderGatewayWriters;
};

type DispatchProviderRequestResult = {
  providerCallId: string;
  pendingEventId: string;
  dispatchIntentId: string;
  response: Response;
};

export class ProviderCredentialRevokedError extends Error {
  constructor() {
    super("Provider credential is revoked");
    this.name = "ProviderCredentialRevokedError";
  }
}

const randomId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const methodOf = (init?: RequestInit) => init?.method?.toUpperCase() || "GET";

const bodyHashOf = (body: BodyInit | null | undefined) => {
  if (body == null) return undefined;
  if (typeof body === "string") {
    return `sha256:${crypto.createHash("sha256").update(body).digest("hex")}`;
  }
  if (body instanceof URLSearchParams) {
    return `sha256:${crypto.createHash("sha256").update(body.toString()).digest("hex")}`;
  }
  return `sha256:${crypto
    .createHash("sha256")
    .update(String(Object.prototype.toString.call(body)))
    .digest("hex")}`;
};

/**
 * Fetch an upstream provider with a timeout that covers ONLY the connect /
 * response-header phase.
 *
 * Upstream keep-alive connections that have been silently dropped by an
 * intermediary (NAT, firewall, load balancer) cause fetch to hang
 * indefinitely — the socket is "ESTABLISHED" at the OS level but no data
 * ever arrives. The caller's AbortController (60s) is the outer net, but
 * we also want a faster, connection-level abort so the dead socket is
 * recycled sooner and the request fails fast rather than waiting the full
 * wall-clock deadline.
 *
 * The timeout MUST be disarmed the moment response headers arrive.
 * `AbortSignal.timeout()` cannot express this: attached to a fetch it aborts
 * the whole exchange, including a response body that is still streaming. Used
 * that way it silently truncated every SSE turn that ran past the deadline —
 * the client saw a stream that just stopped, with no terminating event and no
 * error, which downstream code then misread as "the model returned nothing".
 * So the timer is owned here and cleared in `finally`, once `fetch` resolves.
 * Body-phase stalls are the caller's concern (chat proxy: per-chunk idle
 * guard; agent loops: their own request deadline).
 */
const CONNECT_TIMEOUT_MS = 30_000;

/**
 * fetchWithConnectTimeout 自己的「无响应头」计时器产生的错误标记（Symbol，
 * 不与 DOMException 内建只读属性冲突，也不会与任何字符串字段撞名）。
 * 调用方外层 deadline（如 AbortSignal.timeout(llmRequestTimeoutMs)）超时时
 * fetch 同样以 name === "TimeoutError" 的 DOMException 拒绝——名称无法区分
 * 两种来源，重试/fallback 语义却截然不同（前者是上游静默，后者是调用方
 * 主动放弃，绝不应触发额外上游调用）。只认此标记即可精确判别。
 */
export const CONNECT_TIMEOUT_ERROR = Symbol("nolo.connectTimeout");

/** 仅当错误来自 fetchWithConnectTimeout 自己的无响应头计时器时为 true。 */
export function isFetchConnectTimeoutError(error: unknown): boolean {
  return (
    !!error &&
    (error as { name?: unknown }).name === "TimeoutError" &&
    (error as Record<PropertyKey, unknown>)[CONNECT_TIMEOUT_ERROR] === true
  );
}

export async function fetchWithConnectTimeout(
  fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  url: string,
  init: RequestInit | undefined,
  connectTimeoutMs: number = CONNECT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const existingSignal = init?.signal as AbortSignal | undefined;
  const signal = existingSignal
    ? AbortSignal.any([existingSignal, controller.signal])
    : controller.signal;
  const timer = setTimeout(() => {
    const timeoutError = new DOMException(
      `Upstream sent no response headers within ${connectTimeoutMs}ms`,
      "TimeoutError"
    );
    (timeoutError as unknown as Record<PropertyKey, unknown>)[
      CONNECT_TIMEOUT_ERROR
    ] = true;
    controller.abort(timeoutError);
  }, connectTimeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal });
  } finally {
    clearTimeout(timer);
  }
}

const withClientRequestIdHeader = (
  init: RequestInit | undefined,
  providerCallId: string
): RequestInit => {
  if (init?.headers instanceof Headers) {
    const headers = new Headers(init.headers);
    if (!headers.has("x-client-request-id")) {
      headers.set("x-client-request-id", providerCallId);
    }
    return {
      ...init,
      headers,
    };
  }

  if (Array.isArray(init?.headers)) {
    const headers = new Headers(init.headers);
    if (!headers.has("x-client-request-id")) {
      headers.set("x-client-request-id", providerCallId);
    }
    return {
      ...init,
      headers,
    };
  }

  const headers = {
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
  const hasClientRequestId = Object.keys(headers).some(
    (key) => key.toLowerCase() === "x-client-request-id"
  );
  if (!hasClientRequestId) {
    headers["x-client-request-id"] = providerCallId;
  }
  return {
    ...init,
    headers,
  };
};

function errorShape(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  return { message: String(error) };
}

/**
 * Evidence/audit writes are best-effort: if the store is slow or locked we
 * must not let the write hang the request indefinitely. Each write gets a
 * hard timeout; on timeout or error we log and move on so the actual
 * provider fetch (or error re-throw) still proceeds.
 */
const EVIDENCE_WRITE_TIMEOUT_MS = 5_000;

async function writeEvidenceSafely(
  work: Promise<unknown>,
  label: string
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                `${label} timed out after ${EVIDENCE_WRITE_TIMEOUT_MS}ms`
              )
            ),
          EVIDENCE_WRITE_TIMEOUT_MS
        );
      }),
    ]);
  } catch (error) {
    console.warn(`[providerGateway] ${label} failed`, {
      error: toErrorMessage(error),
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function dispatchProviderRequest({
  store,
  call,
  fetchImpl = fetch,
  now = () => new Date(),
  ids = {},
  writers = {},
}: DispatchProviderRequestInput): Promise<DispatchProviderRequestResult> {
  const providerCallId = ids.providerCallId?.() ?? randomId("pcall");
  const pendingEventId = ids.pendingEventId?.() ?? randomId("evt_pending");
  const dispatchIntentId = ids.dispatchIntentId?.() ?? randomId("intent");
  const failedEventIdFactory = ids.failedEventId ?? (() => randomId("evt_failed"));
  const startedAt = now().toISOString();

  await writeEvidenceSafely(
    (writers.providerCallWriter ?? writeProviderCallEvent)({
      store,
      event: createProviderCallPendingEvent({
        providerCallId,
        eventId: pendingEventId,
        userId: call.userId,
        dialogId: call.dialogId,
        agentId: call.agentId,
        provider: call.provider,
        model: call.model,
        endpoint: call.endpoint,
        serviceTier: call.serviceTier,
        credential: call.credential,
        startedAt,
      }),
    }),
    "write pending provider-call event"
  );

  if (call.credential?.registryStatus === "revoked") {
    const error = new ProviderCredentialRevokedError();
    const failedEvent = createProviderCallFailedEvent({
      providerCallId,
      eventId: failedEventIdFactory(),
      userId: call.userId,
      dialogId: call.dialogId,
      agentId: call.agentId,
      provider: call.provider,
      model: call.model,
      endpoint: call.endpoint,
      serviceTier: call.serviceTier,
      credential: call.credential,
      startedAt,
      failedAt: now().toISOString(),
      error: errorShape(error),
    });
    await writeEvidenceSafely(
      (writers.providerCallWriter ?? writeProviderCallEvent)({
        store,
        event: failedEvent,
      }),
      "write failed provider-call event (revoked credential)"
    );
    await writeEvidenceSafely(
      writeRevokedProviderCredentialBlockedAnomalyIfNeeded({
        store,
        event: failedEvent,
        now,
        billingAnomalyWriter: writers.billingAnomalyWriter ?? writeBillingAnomaly,
      }),
      "write revoked credential blocked anomaly"
    );
    throw error;
  }

  await writeEvidenceSafely(
    (writers.providerDispatchIntentWriter ?? writeProviderDispatchIntent)({
      store,
      intent: createProviderDispatchIntent({
        providerCallId,
        intentId: dispatchIntentId,
        userId: call.userId,
        dialogId: call.dialogId,
        agentId: call.agentId,
        provider: call.provider,
        model: call.model,
        endpoint: call.endpoint,
        serviceTier: call.serviceTier,
        credential: call.credential,
        url: call.url,
        method: methodOf(call.init),
        bodyHash: bodyHashOf(call.init?.body),
        createdAt: now().toISOString(),
      }),
    }),
    "write provider dispatch intent"
  );

  try {
    const response = await fetchWithConnectTimeout(
      fetchImpl,
      call.url,
      withClientRequestIdHeader(call.init, providerCallId)
    );
    return {
      providerCallId,
      pendingEventId,
      dispatchIntentId,
      response,
    };
  } catch (error) {
    const failedEvent = createProviderCallFailedEvent({
      providerCallId,
      eventId: failedEventIdFactory(),
      userId: call.userId,
      dialogId: call.dialogId,
      agentId: call.agentId,
      provider: call.provider,
      model: call.model,
      endpoint: call.endpoint,
      serviceTier: call.serviceTier,
      credential: call.credential,
      startedAt,
      failedAt: now().toISOString(),
      error: errorShape(error),
    });
    await writeEvidenceSafely(
      (writers.providerCallWriter ?? writeProviderCallEvent)({
        store,
        event: failedEvent,
      }),
      "write failed provider-call event (fetch error)"
    );
    await writeEvidenceSafely(
      writeRevokedProviderCredentialUsedAnomalyIfNeeded({
        store,
        event: failedEvent,
        now,
        billingAnomalyWriter: writers.billingAnomalyWriter ?? writeBillingAnomaly,
      }),
      "write revoked credential used anomaly"
    );
    throw error;
  }
}
