import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { join } from "node:path";

const root = import.meta.dir;
const nodePath = Bun.which("node") ?? "node";

async function waitForRpc(port: number) {
  const deadline = Date.now() + 3000;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/rpc`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "ping", payload: {} }),
      });
      if (response.status === 401) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`native host RPC did not start: ${lastError}`);
}

describe("Nolo Chrome connector native host lifecycle", () => {
  test("exits when Chrome closes the native messaging stdin pipe", async () => {
    const child = spawn(nodePath, [
      join(root, "native-host", "nolo-chrome-native-host.mjs"),
    ], {
      env: {
        ...process.env,
        NOLO_CHROME_CONNECTOR_PORT: "38959",
      },
      stdio: ["ignore", "ignore", "pipe"],
    });

    const [code] = await once(child, "exit");
    expect(code).toBe(0);
  });

  test("rejects unauthenticated local RPC requests", async () => {
    const child = spawn(nodePath, [
      join(root, "native-host", "nolo-chrome-native-host.mjs"),
    ], {
      env: {
        ...process.env,
        NOLO_CHROME_CONNECTOR_PORT: "38960",
        NOLO_CHROME_CONNECTOR_TOKEN: "expected-token",
        NOLO_CHROME_CONNECTOR_TIMEOUT_MS: "50",
        NOLO_CHROME_CONNECTOR_IGNORE_STDIN_CLOSE_FOR_TEST: "1",
      },
      stdio: ["pipe", "ignore", "pipe"],
    });

    await waitForRpc(38960);

    const rejected = await fetch("http://127.0.0.1:38960/rpc", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ action: "list_tabs", payload: {} }),
    });
    expect(rejected.status).toBe(401);

    const timedOut = await fetch("http://127.0.0.1:38960/rpc", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-nolo-chrome-connector-token": "expected-token",
      },
      body: JSON.stringify({ action: "list_tabs", payload: {} }),
    });
    expect(timedOut.status).toBe(500);
    expect(await timedOut.json()).toMatchObject({
      ok: false,
      error: { code: "NATIVE_HOST_ERROR" },
    });

    child.kill("SIGTERM");
    await once(child, "exit");
  });
});
