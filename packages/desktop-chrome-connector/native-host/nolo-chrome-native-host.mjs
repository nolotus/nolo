#!/usr/bin/env node
import { createServer } from "node:http";

const port = Number(process.env.NOLO_CHROME_CONNECTOR_PORT || 38947);
const connectorToken = process.env.NOLO_CHROME_CONNECTOR_TOKEN || "";
const ignoreStdinCloseForTest = process.env.NOLO_CHROME_CONNECTOR_IGNORE_STDIN_CLOSE_FOR_TEST === "1";
const pending = new Map();
let shuttingDown = false;
let server;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const waiter of pending.values()) {
    waiter.reject?.(new Error("Chrome native messaging connection closed."));
  }
  pending.clear();
  if (server) {
    server.close(() => process.exit(exitCode));
  }
  setTimeout(() => process.exit(exitCode), 250).unref();
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

function extensionRequest(action, payload) {
  const id = crypto.randomUUID();
  const timeoutMs = Number(process.env.NOLO_CHROME_CONNECTOR_TIMEOUT_MS || 15000);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Chrome extension timed out while handling ${action}.`));
    }, timeoutMs);
    pending.set(id, {
      resolve: (message) => {
        clearTimeout(timeout);
        resolve(message);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    });
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
    const response = await extensionRequest(body.action, body.payload || {});
    res.statusCode = response.ok ? 200 : 502;
    res.end(JSON.stringify(response));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({
      ok: false,
      error: {
        code: "NATIVE_HOST_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
    }));
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stderr.write(`[nolo chrome connector] listening on 127.0.0.1:${port}\n`);
});
server.on("error", (error) => {
  process.stderr.write(`[nolo chrome connector] failed to listen: ${error.message}\n`);
  process.exit(1);
});
