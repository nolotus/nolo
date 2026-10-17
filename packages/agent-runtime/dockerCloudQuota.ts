/**
 * Docker Cloud Agentic Platform Quota & Billing Provider
 *
 * Implements read-only quota retrieval, Connect-RPC platform.v1.BillingService
 * protocol decoding, currency micro-USD/cents representation, and keyring auth resolution.
 *
 * NOTE: Docker credit and usage are private to the user's Docker Cloud account
 * and MUST NEVER be debited to or recorded in Nolo user billing ledgers.
 */

import { spawnSync } from "child_process";

export type DockerQuotaErrorReason =
  | "unauthenticated"
  | "permission-denied"
  | "unsupported-currency"
  | "no-credentials"
  | "network-timeout"
  | "network-error"
  | "schema-mismatch"
  | "server-error";

export interface DockerQuotaError {
  status: number;
  reason: DockerQuotaErrorReason;
  /** Fixed sanitized message without tokens, secrets, or raw server text */
  message: string;
}

export interface DockerCreditBalance {
  balanceKey: string;
  name: string;
  /** Exact decimal string as returned by API (e.g. "100.00") */
  remainingUsd: string;
  /** Exact micro-USD amount (1 USD = 1,000,000 micro-USD) */
  remainingMicroUsd: bigint;
  /** Available remaining amount in minimum currency units (cents for USD) */
  remainingCents: bigint;
  /** Exact decimal string of booked balance */
  bookedUsd: string;
  /** Exact micro-USD amount for booked balance */
  bookedMicroUsd: bigint;
  /** Booked amount in minimum currency units (cents for USD) */
  bookedCents: bigint;
  currency: string;
}

export interface DockerQuotaSnapshot {
  source: "docker-agentic-platform-connect";
  observedAt: number;
  accountIdentity: string;
  currency: string;
  /**
   * Settled balance (from last bill / booked).
   * Note: Confirmed compute usage has up to 48h billing lag;
   * this is NOT the real-time available balance.
   */
  settledBalanceUsd: string;
  settledBalanceCents: bigint;
  settledBalanceMicroUsd: bigint;
  /**
   * Real-time available credit to spend after unbilled usage this month.
   * "This is the one to plan against."
   */
  availableCreditUsd: string;
  availableCreditCents: bigint;
  availableCreditMicroUsd: bigint;
  credits: DockerCreditBalance[];
  hasNegativeBalance: boolean;
  hasSubCentPrecision: boolean;
  hasPaymentIssue: boolean;
  paymentIssueType?: string;
}

export type DockerQuotaResult =
  | { ok: true; snapshot: DockerQuotaSnapshot }
  | { ok: false; error: DockerQuotaError };

export interface DockerCloudAuthCredentials {
  token: string;
  tokenType?: string;
  username?: string;
}

export const DOCKER_BILLING_CONNECT_CONFIG = {
  endpoint: "https://agentic-platform.docker.com/api",
  service: "platform.v1.BillingService",
  method: "GetBillingSummary",
  fullPath: "/platform.v1.BillingService/GetBillingSummary",
} as const;

/**
 * Safely parse an exact decimal string to micro-USD (1 USD = 1,000,000 micro-USD).
 * Returns bigint or null if format is non-numeric, garbage, or out of reasonable bounds.
 */
export function parseExactDecimalToMicroUsd(val: unknown): bigint | null {
  if (typeof val !== "string" && typeof val !== "number") return null;
  const str = String(val).trim();
  if (!str) return null;

  // Strict regex: optional minus, integer digits, optional dot and decimal digits
  if (!/^-?\d+(\.\d+)?$/.test(str)) {
    return null;
  }

  const isNegative = str.startsWith("-");
  const clean = isNegative ? str.slice(1) : str;
  const [wholePart, fracPart = ""] = clean.split(".");

  // Guard against arbitrary / unsupported precision beyond 6 decimal places
  if (fracPart.length > 6) {
    return null;
  }

  // Guard against extreme / absurd values (> 1 billion USD)
  if (wholePart.length > 9) {
    return null;
  }

  const paddedFrac = fracPart.padEnd(6, "0");
  const micro = BigInt(wholePart) * 1_000_000n + BigInt(paddedFrac);
  return isNegative ? -micro : micro;
}

/**
 * Format bigint micro-USD to exact decimal string (e.g. 10_000_000n -> "10.00", 12_345_600n -> "12.3456")
 */
export function formatMicroUsdToDecimal(micro: bigint): string {
  const isNegative = micro < 0n;
  const abs = isNegative ? -micro : micro;
  const whole = abs / 1_000_000n;
  const remainder = abs % 1_000_000n;
  const remStr = remainder.toString().padStart(6, "0").replace(/0+$/, "");
  const decimals = remStr.length < 2 ? remStr.padEnd(2, "0") : remStr;
  return `${isNegative ? "-" : ""}${whole}.${decimals}`;
}

/**
 * Format bigint cents to exact decimal string (e.g. 10000n -> "100.00")
 */
export function formatCentsToDecimal(cents: bigint): string {
  const isNegative = cents < 0n;
  const abs = isNegative ? -cents : cents;
  const whole = abs / 100n;
  const remainder = abs % 100n;
  const remStr = remainder < 10n ? `0${remainder}` : `${remainder}`;
  return `${isNegative ? "-" : ""}${whole}.${remStr}`;
}

/**
 * Parse Connect-RPC GetBillingSummary JSON response envelope into typed DockerQuotaSnapshot.
 * Enforces strict shape validation, safe static error messages, and currency consistency.
 */
export function parseBillingSummaryResponse(
  raw: unknown,
  observedAt: number = Date.now()
): DockerQuotaResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      error: {
        status: 422,
        reason: "schema-mismatch",
        message: "Invalid response: expected an object",
      },
    };
  }

  const record = raw as Record<string, unknown>;

  // Check for Connect error response: return fixed, sanitized errors without server text
  if (typeof record.code === "string") {
    const code = record.code.toLowerCase();
    let reason: DockerQuotaErrorReason = "server-error";
    let status = 500;
    let message = "Upstream billing service returned an error";

    if (code === "unauthenticated") {
      reason = "unauthenticated";
      status = 401;
      message = "Authentication required or session expired";
    } else if (code === "permission_denied" || code === "permissiondenied") {
      reason = "permission-denied";
      status = 403;
      message = "Access to billing service denied for current identity";
    } else if (code === "invalid_argument") {
      reason = "schema-mismatch";
      status = 400;
      message = "Invalid billing request parameters";
    }

    return {
      ok: false,
      error: {
        status,
        reason,
        message,
      },
    };
  }

  // Account identity validation: must be explicit non-empty string
  const accountIdentity =
    typeof record.account_name === "string" && record.account_name.trim().length > 0
      ? record.account_name.trim()
      : typeof record.accountName === "string" && record.accountName.trim().length > 0
      ? record.accountName.trim()
      : null;

  if (!accountIdentity) {
    return {
      ok: false,
      error: {
        status: 422,
        reason: "schema-mismatch",
        message: "Missing or invalid account identity in billing response",
      },
    };
  }

  // Credits field validation: must be an array
  if (!Array.isArray(record.credits)) {
    return {
      ok: false,
      error: {
        status: 422,
        reason: "schema-mismatch",
        message: "Invalid credits field: must be an array",
      },
    };
  }

  const rawCredits = record.credits as unknown[];
  const credits: DockerCreditBalance[] = [];

  let totalAvailableMicro = 0n;
  let totalSettledMicro = 0n;
  let primaryCurrency: string | null = null;
  let hasNegativeBalance = false;
  let hasSubCentPrecision = false;

  for (let i = 0; i < rawCredits.length; i++) {
    const c = rawCredits[i];
    if (!c || typeof c !== "object" || Array.isArray(c)) {
      return {
        ok: false,
        error: {
          status: 422,
          reason: "schema-mismatch",
          message: `Credit entry at index ${i} is not a valid object`,
        },
      };
    }

    const item = c as Record<string, unknown>;
    const balanceKey =
      typeof item.balance_key === "string"
        ? item.balance_key
        : typeof item.balanceKey === "string"
        ? item.balanceKey
        : "";
    const name = typeof item.name === "string" ? item.name : "";

    const rawCurrency =
      typeof item.currency === "string" ? item.currency.trim().toUpperCase() : "";
    if (!rawCurrency) {
      return {
        ok: false,
        error: {
          status: 422,
          reason: "schema-mismatch",
          message: `Credit entry at index ${i} is missing currency`,
        },
      };
    }

    if (rawCurrency !== "USD") {
      return {
        ok: false,
        error: {
          status: 422,
          reason: "unsupported-currency",
          message: `Unsupported currency '${rawCurrency}' (only USD supported)`,
        },
      };
    }

    if (primaryCurrency === null) {
      primaryCurrency = rawCurrency;
    } else if (primaryCurrency !== rawCurrency) {
      return {
        ok: false,
        error: {
          status: 422,
          reason: "unsupported-currency",
          message: "Mixed currencies in credit balances are unsupported",
        },
      };
    }

    const remainingStr = typeof item.remaining === "string" ? item.remaining.trim() : "";
    const bookedStr =
      typeof item.booked === "string" ? item.booked.trim() : remainingStr;

    const remainingMicro = parseExactDecimalToMicroUsd(remainingStr);
    if (remainingMicro === null) {
      return {
        ok: false,
        error: {
          status: 422,
          reason: "schema-mismatch",
          message: `Invalid remaining amount format at credit index ${i}`,
        },
      };
    }

    const bookedMicro = parseExactDecimalToMicroUsd(bookedStr);
    if (bookedMicro === null) {
      return {
        ok: false,
        error: {
          status: 422,
          reason: "schema-mismatch",
          message: `Invalid booked amount format at credit index ${i}`,
        },
      };
    }

    if (remainingMicro < 0n || bookedMicro < 0n) {
      hasNegativeBalance = true;
    }

    if (remainingMicro % 10_000n !== 0n || bookedMicro % 10_000n !== 0n) {
      hasSubCentPrecision = true;
    }

    // Conservative floor for cents
    const remainingCents = remainingMicro / 10_000n;
    const bookedCents = bookedMicro / 10_000n;

    credits.push({
      balanceKey,
      name,
      remainingUsd: remainingStr,
      remainingMicroUsd: remainingMicro,
      remainingCents,
      bookedUsd: bookedStr,
      bookedMicroUsd: bookedMicro,
      bookedCents,
      currency: rawCurrency,
    });

    totalAvailableMicro += remainingMicro;
    totalSettledMicro += bookedMicro;
  }

  if (primaryCurrency === null) {
    primaryCurrency = "USD";
  }

  const paymentIssue = (record.payment_issue || record.paymentIssue) as
    | Record<string, unknown>
    | undefined;
  const hasPaymentIssue = Boolean(
    paymentIssue &&
      (typeof paymentIssue.issue_type === "string" ||
        typeof paymentIssue.issueType === "string")
  );
  const paymentIssueType = paymentIssue
    ? String(paymentIssue.issue_type || paymentIssue.issueType || "")
    : undefined;

  const availableCreditCents = totalAvailableMicro / 10_000n;
  const settledBalanceCents = totalSettledMicro / 10_000n;

  return {
    ok: true,
    snapshot: {
      source: "docker-agentic-platform-connect",
      observedAt,
      accountIdentity,
      currency: primaryCurrency,
      settledBalanceCents,
      settledBalanceMicroUsd: totalSettledMicro,
      settledBalanceUsd: formatMicroUsdToDecimal(totalSettledMicro),
      availableCreditCents,
      availableCreditMicroUsd: totalAvailableMicro,
      availableCreditUsd: formatMicroUsdToDecimal(totalAvailableMicro),
      credits,
      hasNegativeBalance,
      hasSubCentPrecision,
      hasPaymentIssue,
      paymentIssueType: paymentIssueType || undefined,
    },
  };
}

/**
 * Keyring credential resolver: queries local OS Secret Service for Docker Sandboxes credentials.
 * Implements strict secret boundaries: tokens are retained only in memory and never logged.
 */
export function resolveHostDockerKeyringAuth(): {
  found: boolean;
  credentials?: DockerCloudAuthCredentials;
  error?: DockerQuotaError;
} {
  try {
    const metaRes = spawnSync("secret-tool", [
      "lookup",
      "service:name", "sandboxes-auth",
      "service:group", "com.docker.sandboxes-auth",
      "id", "docker/auth/metadata/hub/default",
    ], { timeout: 3000 });

    let username = "default";
    if (metaRes.status === 0 && metaRes.stdout && metaRes.stdout.length > 0) {
      try {
        const meta = JSON.parse(metaRes.stdout.toString());
        if (meta.username) username = meta.username;
      } catch {
        // metadata is non-critical
      }
    }

    const tokenRes = spawnSync("secret-tool", [
      "lookup",
      "service:name", "sandboxes-auth",
      "service:group", "com.docker.sandboxes-auth",
      "id", `docker/auth/hub/${username}`,
    ], { timeout: 3000 });

    if (tokenRes.status !== 0 || !tokenRes.stdout || tokenRes.stdout.length === 0) {
      return {
        found: false,
        error: {
          status: 404,
          reason: "no-credentials",
          message: "No Docker Hub credentials found in OS Keyring",
        },
      };
    }

    const rawStr = tokenRes.stdout.toString().trim();
    let token = rawStr;
    let tokenType = "Bearer";

    try {
      const parsed = JSON.parse(rawStr);
      token = parsed.access_token || parsed.token || rawStr;
      tokenType = parsed.token_type || "Bearer";
    } catch {
      // plain token string
    }

    return {
      found: true,
      credentials: {
        token,
        tokenType,
        username,
      },
    };
  } catch (err) {
    return {
      found: false,
      error: {
        status: 500,
        reason: "no-credentials",
        message: "Keyring access unavailable or failed",
      },
    };
  }
}

/**
 * Read-only Quota Provider: executes Connect-RPC GetBillingSummary against Docker Agentic Platform.
 * Note: HTTP 401 is strictly treated as unauthenticated without inferring unproven scopes.
 */
export async function fetchDockerBillingQuota(
  credentials?: DockerCloudAuthCredentials,
  fetchFn: typeof fetch = fetch
): Promise<DockerQuotaResult> {
  if (!credentials || !credentials.token) {
    return {
      ok: false,
      error: {
        status: 401,
        reason: "no-credentials",
        message: "Authentication credentials required for Docker Cloud Billing",
      },
    };
  }

  const targetUrl = `${DOCKER_BILLING_CONNECT_CONFIG.endpoint}${DOCKER_BILLING_CONNECT_CONFIG.fullPath}`;

  try {
    const resp = await fetchFn(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Connect-Protocol-Version": "1",
        "Authorization": `${credentials.tokenType || "Bearer"} ${credentials.token}`,
      },
      body: "{}",
    });

    const json = await resp.json().catch(() => null);

    if (!resp.ok) {
      if (resp.status === 401) {
        return {
          ok: false,
          error: {
            status: 401,
            reason: "unauthenticated",
            message: "Docker billing authentication failed or session expired",
          },
        };
      }
      if (resp.status === 403) {
        return {
          ok: false,
          error: {
            status: 403,
            reason: "permission-denied",
            message: "Docker billing access denied for current identity",
          },
        };
      }
      return {
        ok: false,
        error: {
          status: resp.status,
          reason: "server-error",
          message: "Upstream billing service returned error status",
        },
      };
    }

    return parseBillingSummaryResponse(json);
  } catch {
    return {
      ok: false,
      error: {
        status: 0,
        reason: "network-error",
        message: "Network error querying Docker BillingService",
      },
    };
  }
}

/**
 * Diagnostic live probe function.
 * Must only be called when explicit opt-in environment flag is present.
 */
export async function probeHostDockerQuota(): Promise<{
  keyringFound: boolean;
  username?: string;
  quotaResult: DockerQuotaResult;
}> {
  const keyring = resolveHostDockerKeyringAuth();
  if (!keyring.found || !keyring.credentials) {
    return {
      keyringFound: false,
      quotaResult: {
        ok: false,
        error: keyring.error || {
          status: 404,
          reason: "no-credentials",
          message: "No credentials in keyring",
        },
      },
    };
  }

  const result = await fetchDockerBillingQuota(keyring.credentials);
  return {
    keyringFound: true,
    username: keyring.credentials.username,
    quotaResult: result,
  };
}
