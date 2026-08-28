import {
  assertCredentialRef,
  createDesktopHostCredentialBroker,
  type CredentialBroker,
} from "agent-runtime";
import { isRecord } from "core/isRecord";
import { isTrustedDesktopSameOriginRequest } from "../desktopRequestTrust";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

type CredentialOp = "get" | "put" | "delete" | "has";

type HandlerDeps = {
  env?: Record<string, string | undefined>;
  broker?: CredentialBroker;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });

function isCredentialOp(value: unknown): value is CredentialOp {
  return value === "get" || value === "put" || value === "delete" || value === "has";
}

/**
 * Least-privilege credential broker bridge for Desktop webview → host Bun.
 * Ops: get | put | delete | has by explicit ref only. No list/dump.
 * Never put secrets, refs, paths, or raw exception messages into response bodies.
 */
export async function handleDesktopCredentialsPost(
  req: Request,
  deps: HandlerDeps = {},
) {
  const env = deps.env ?? process.env;
  if (env.NOLO_DESKTOP !== "1") {
    return json(
      { error: "Desktop credentials are only available inside Nolo Desktop." },
      404,
    );
  }

  // Reject cross-origin and bare curl before reading or returning secrets.
  // NOLO_DESKTOP alone identifies the host process, not the HTTP caller.
  if (!isTrustedDesktopSameOriginRequest(req, env)) {
    return json(
      { error: "Forbidden: trusted desktop same-origin required" },
      403,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const record = isRecord(body) ? body : null;
  if (!record) {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const op = record.op;
  if (!isCredentialOp(op)) {
    return json({ error: "op must be get|put|delete|has" }, 400);
  }

  const rawRef = typeof record.ref === "string" ? record.ref : "";
  let ref: string;
  try {
    ref = assertCredentialRef(rawRef);
  } catch {
    return json({ error: "invalid_ref" }, 400);
  }

  // Desktop host default: darwin Keychain (+ file lazy promote); file elsewhere.
  const broker = deps.broker ?? createDesktopHostCredentialBroker();

  try {
    if (op === "get") {
      const secret = await broker.get(ref);
      return json({ ok: true, secret: secret ?? null });
    }

    if (op === "has") {
      const has = await broker.has(ref);
      return json({ ok: true, has: Boolean(has) });
    }

    if (op === "put") {
      const secret = typeof record.secret === "string" ? record.secret : "";
      if (!secret.trim()) {
        return json({ error: "secret_required" }, 400);
      }
      await broker.put(ref, secret);
      return json({ ok: true });
    }

    // delete
    await broker.delete(ref);
    return json({ ok: true });
  } catch {
    // Stable code only — no ref, path, or raw exception text in the body.
    return json({ ok: false, error: "credential_broker_failed" }, 500);
  }
}
