#!/usr/bin/env bun
import { createServer } from "node:http";
import { logUploadAudit, validateUploadFiles } from "../uploadSecurity.mjs";
import { clampEvalTimeout } from "../extension/evalResult.js";

// Which browser build launched this host. Chrome keeps the long-standing default port 38947;
// Firefox gets an independent endpoint so both can run at the same time without fighting over
// the port (previously the second host to start exited on EADDRINUSE, and RPC reports could
// identify the wrong browser).
const browser = process.env.NOLO_CHROME_CONNECTOR_BROWSER === "firefox" ? "firefox" : "chrome";
const DEFAULT_PORT = browser === "firefox" ? 38948 : 38947;
// Chrome honours only NOLO_CHROME_CONNECTOR_PORT; Firefox honours only NOLO_FIREFOX_CONNECTOR_PORT.
// The Chrome var is deliberately *not* a Firefox fallback: a Chrome-only override must not make a
// Firefox wrapper collide on Chrome's port. Same rule as connectorPortForBrowser / the RPC client.
const port = Number(
  browser === "firefox"
    ? process.env.NOLO_FIREFOX_CONNECTOR_PORT || DEFAULT_PORT
    : process.env.NOLO_CHROME_CONNECTOR_PORT || DEFAULT_PORT,
);
const connectorToken = process.env.NOLO_CHROME_CONNECTOR_TOKEN || "";
/**
 * `/rpc` used to forward `body.action` verbatim to the extension, so any string that reached
 * 127.0.0.1:38947 became an extension command. An explicit allow-list of the actions the connector
 * actually implements keeps unknown/internal names from being reachable over the socket.
 */
const ALLOWED_RPC_ACTIONS = new Set([
  "connector_info",
  "list_tabs",
  "open_tab",
  "close_tab",
  "read_page",
  "prepare_browser_action",
  "set_select_value",
  "click",
  "type",
  "press",
  "set_files",
  "scroll",
  "screenshot",
  "read_console",
  "read_network",
  "eval_script",
  "list_pending_approvals",
  "submit_approval_decision",
  "hit_test",
  "mouse_move",
  "mouse_click",
  "detach",
  "reload_extension",
]);
const ignoreStdinCloseForTest = process.env.NOLO_CHROME_CONNECTOR_IGNORE_STDIN_CLOSE_FOR_TEST === "1";
const pending = new Map();
let shuttingDown = false;
let server;

function extensionDisconnected() {
  return Object.assign(new Error("The browser extension disconnected. Check `nolo browser status` and verify the tab state before retrying."), {
    code: "EXTENSION_DISCONNECTED",
    status: 503,
  });
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const waiter of pending.values()) {
    waiter.reject(extensionDisconnected());
  }
  pending.clear();
  if (server) {
    server.close(() => process.exit(exitCode));
    server.closeIdleConnections();
  }
  // Allow JSON for in-flight requests to drain, without waiting forever on a broken peer.
  setTimeout(() => process.exit(exitCode), 1_000).unref();
}

function writeNativeMessage(message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  process.stdout.write(Buffer.concat([header, body]));
}

let inputBuffer = Buffer.alloc(0);
process.stdin.on("data", (chunk) => {
  inputBuffer = Buffer.concat([inputBuffer, chunk]);
  while (inputBuffer.length >= 4) {
    const length = inputBuffer.readUInt32LE(0);
    if (inputBuffer.length < 4 + length) break;
    const payload = inputBuffer.subarray(4, 4 + length);
    inputBuffer = inputBuffer.subarray(4 + length);
    let message;
    try {
      message = JSON.parse(payload.toString("utf8"));
    } catch {
      continue;
    }
    const waiter = pending.get(message.id);
    if (!waiter) continue;
    pending.delete(message.id);
    waiter.resolve(message);
  }
});
process.stdin.on("end", () => {
  if (!ignoreStdinCloseForTest) shutdown(0);
});
process.stdin.on("close", () => {
  if (!ignoreStdinCloseForTest) shutdown(0);
});
process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));
process.stdout.on("error", (error) => {
  process.stderr.write(`[nolo ${browser} connector] native messaging write failed: ${error.message}\n`);
  shutdown(error.code === "EPIPE" ? 0 : 1);
});

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

const configuredTimeoutMs = Number(process.env.NOLO_CHROME_CONNECTOR_TIMEOUT_MS);
const ordinaryTimeoutMs = Number.isSafeInteger(configuredTimeoutMs) && configuredTimeoutMs > 0 && configuredTimeoutMs <= 2_147_000_000
  ? configuredTimeoutMs : 15_000;

function extensionRequest(action, payload, timeoutMs, signal) {
  if (shuttingDown) return Promise.reject(extensionDisconnected());
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      pending.delete(id);
      signal.removeEventListener("abort", abort);
    };
    const fail = (error) => { cleanup(); reject(error); };
    const abort = () => fail(signal.reason);
    const timeout = setTimeout(() => fail(Object.assign(
      new Error(`The browser extension did not reply to ${action} in ${timeoutMs} ms. Check the connector and verify the tab state before retrying.`),
      { code: "EXTENSION_TIMEOUT", status: 504 },
    )), timeoutMs);
    pending.set(id, { resolve: (message) => { cleanup(); resolve(message); }, reject: fail });
    signal.addEventListener("abort", abort, { once: true });
    writeNativeMessage({ id, action, payload });
  });
}

server = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "POST" || req.url !== "/rpc") {
    res.statusCode = 404;
    res.end(JSON.stringify({ ok: false, error: { code: "NOT_FOUND", message: "Not found" } }));
    return;
  }
  if (!connectorToken || req.headers["x-nolo-chrome-connector-token"] !== connectorToken) {
    res.statusCode = 401;
    res.end(JSON.stringify({
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Chrome connector RPC request is not authorized.",
      },
    }));
    return;
  }
  if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    res.statusCode = 415;
    res.end(JSON.stringify({
      ok: false,
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Chrome connector RPC requires application/json.",
      },
    }));
    return;
  }
  try {
    const body = await readJsonBody(req);
    const requestedAction = String(body?.action || "");
    if (!ALLOWED_RPC_ACTIONS.has(requestedAction)) {
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          ok: false,
          error: {
            code: "UNKNOWN_ACTION",
            message: `Unknown connector action "${requestedAction}". /rpc only accepts actions the connector implements.`,
          },
        }),
      );
      return;
    }
    if (body.action === "set_files") {
      try {
        const validated = validateUploadFiles({
          files: body.payload?.files,
          env: process.env,
        });
        body.payload.files = validated.files;
        const targetStr = body.payload?.ref
          ? `ref:${body.payload.ref}`
          : `selector:${body.payload?.selector || ""}`;
        logUploadAudit({
          tabId: String(body.payload?.tabId ?? ""),
          target: targetStr,
          files: validated.fileStats,
        });
      } catch (err) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            ok: false,
            error: {
              code: err.code || "path_not_allowed",
              message: err.message,
            },
          }),
        );
        return;
      }
    }
    const payload = body.payload || {};
    // The human waits outside /rpc. Only an approved eval can spend its script run budget here.
    const timeoutMs = requestedAction === "eval_script" && payload.approvalId
      ? clampEvalTimeout(payload.timeoutMs) + ordinaryTimeoutMs : ordinaryTimeoutMs;
    // Give the application deadline time to send JSON instead of closing an idle socket first.
    res.setTimeout(timeoutMs + 5_000);
    const disconnected = new AbortController();
    res.once("close", () => disconnected.abort());
    if (res.destroyed) return;
    const response = await extensionRequest(requestedAction, payload, timeoutMs, disconnected.signal);
    res.statusCode = response.ok ? 200 : 502;
    res.end(JSON.stringify(response));
  } catch (error) {
    if (res.destroyed) return;
    const isExtensionError = error?.code === "EXTENSION_TIMEOUT" || error?.code === "EXTENSION_DISCONNECTED";
    res.statusCode = isExtensionError ? error.status : 500;
    res.end(JSON.stringify({
      ok: false,
      error: {
        code: isExtensionError ? error.code : "NATIVE_HOST_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
    }));
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stderr.write(`[nolo ${browser} connector] listening on 127.0.0.1:${port}\n`);
});
server.on("error", (error) => {
  process.stderr.write(`[nolo ${browser} connector] failed to listen: ${error.message}\n`);
  process.exit(1);
});
