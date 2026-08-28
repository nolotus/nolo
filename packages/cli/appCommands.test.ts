import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runAppListCommand } from "./appListCommands";
import { runAppGetCommand } from "./appGetCommands";
import { runAppDeployCommand, parseDeployArgs } from "./appDeployCommands";
import { runAppDeployStatusCommand, fetchDeployStatus } from "./appDeployStatusCommands";
import { runAppDeleteCommand } from "./appDeleteCommands";

const SERVER_URL = "https://api.test.nolo.chat";
const AUTH_TOKEN = "test-token";
const BASE_ENV = {
  NOLO_SERVER: SERVER_URL,
  AUTH_TOKEN,
  USER_ID: "test-user",
} as NodeJS.ProcessEnv;

interface FetchCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

let fetchCalls: FetchCall[] = [];
let fetchResponse: Record<string, unknown> = { success: true };

const originalFetch = globalThis.fetch;

beforeEach(() => {
  fetchCalls = [];
  fetchResponse = { success: true };
  const mockFn = mock(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = (init?.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = {};
    if (init?.headers) {
      const h = init.headers as Record<string, string>;
      for (const [k, v] of Object.entries(h)) headers[k] = v;
    }
    const body = init?.body ? String(init.body) : null;
    fetchCalls.push({ url, method, headers, body });
    return new Response(JSON.stringify(fetchResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  globalThis.fetch = mockFn as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function makeDeps(env: Partial<NodeJS.ProcessEnv> = {}) {
  return { env: { ...BASE_ENV, ...env } } as { env: NodeJS.ProcessEnv };
}

describe("app list command", () => {
  test("sends POST /api/app/list with empty body by default", async () => {
    fetchResponse = { success: true, workers: [] };
    const code = await runAppListCommand(["--json"], makeDeps());
    expect(code).toBe(0);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe(`${SERVER_URL}/api/app/list`);
    expect(fetchCalls[0].method).toBe("POST");
    expect(fetchCalls[0].headers["Authorization"]).toBe(`Bearer ${AUTH_TOKEN}`);
    expect(JSON.parse(fetchCalls[0].body!)).toEqual({});
  });

  test("passes scope and spaceId in body", async () => {
    fetchResponse = { success: true, workers: [] };
    await runAppListCommand(["--scope", "accessible", "--space-id", "sp-123"], makeDeps());
    expect(JSON.parse(fetchCalls[0].body!)).toEqual({
      scope: "accessible",
      spaceId: "sp-123",
    });
  });
});

describe("app get command", () => {
  test("sends name in body", async () => {
    fetchResponse = { success: true, name: "my-app", appId: "app-1" };
    const code = await runAppGetCommand(["--name", "my-app", "--json"], makeDeps());
    expect(code).toBe(0);
    expect(fetchCalls[0].url).toBe(`${SERVER_URL}/api/app/get`);
    expect(JSON.parse(fetchCalls[0].body!)).toEqual({ name: "my-app" });
  });

  test("returns error code 1 when no identifier provided", async () => {
    const code = await runAppGetCommand(["--json"], makeDeps());
    expect(code).toBe(1);
    expect(fetchCalls).toHaveLength(0);
  });
});

describe("app deploy command", () => {
  test("sends code and name in body", async () => {
    fetchResponse = { success: true, jobId: "job-1", url: "https://app.nolo.chat/my-app" };
    const code = await runAppDeployCommand(
      ["--name", "my-app", "--code", "export default {}", "--json"],
      makeDeps(),
    );
    expect(code).toBe(0);
    expect(fetchCalls[0].url).toBe(`${SERVER_URL}/api/app/deploy`);
    expect(JSON.parse(fetchCalls[0].body!)).toEqual({
      name: "my-app",
      code: "export default {}",
    });
  });

  test("reads code from --code-file", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-app-deploy-"));
    const codeFile = join(tempDir, "worker.js");
    writeFileSync(codeFile, "export default { fetch() {} }");
    try {
      fetchResponse = { success: true, jobId: "job-2" };
      await runAppDeployCommand(
        ["--name", "my-app", "--code-file", codeFile, "--json"],
        makeDeps(),
      );
      expect(JSON.parse(fetchCalls[0].body!)).toEqual({
        name: "my-app",
        code: "export default { fetch() {} }",
      });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("parses --files JSON array", async () => {
    fetchResponse = { success: true, jobId: "job-3" };
    const filesJson = JSON.stringify([
      { name: "main.tsx", code: "export default function App() {}" },
    ]);
    await runAppDeployCommand(
      ["--name", "my-app", "--files", filesJson, "--framework", "react-spa", "--json"],
      makeDeps(),
    );
    expect(JSON.parse(fetchCalls[0].body!)).toEqual({
      name: "my-app",
      files: [{ name: "main.tsx", code: "export default function App() {}" }],
      framework: "react-spa",
    });
  });

  test("returns error code 1 when no name/appId provided", async () => {
    const code = await runAppDeployCommand(["--code", "x"], makeDeps());
    expect(code).toBe(1);
    expect(fetchCalls).toHaveLength(0);
  });

  test("parseDeployArgs is a pure function (no IO)", () => {
    const { body, error } = parseDeployArgs(["--name", "test", "--code", "x"]);
    expect(error).toBeUndefined();
    expect(body).toEqual({ name: "test", code: "x" });
  });
});

describe("app deploy status command", () => {
  test("sends jobId in body", async () => {
    fetchResponse = { success: true, jobId: "job-1", status: "done" };
    const code = await runAppDeployStatusCommand(
      ["--job-id", "job-1", "--json"],
      makeDeps(),
    );
    expect(code).toBe(0);
    expect(fetchCalls[0].url).toBe(`${SERVER_URL}/api/app/deploy/status`);
    expect(JSON.parse(fetchCalls[0].body!)).toEqual({ jobId: "job-1" });
  });

  test("returns error code 1 when jobId missing", async () => {
    const code = await runAppDeployStatusCommand(["--json"], makeDeps());
    expect(code).toBe(1);
    expect(fetchCalls).toHaveLength(0);
  });

  test("returns exit code 1 when deploy failed", async () => {
    fetchResponse = { success: true, jobId: "job-1", status: "failed", error: { message: "build error" } };
    const code = await runAppDeployStatusCommand(
      ["--job-id", "job-1", "--json"],
      makeDeps(),
    );
    expect(code).toBe(1);
  });

  test("fetchDeployStatus is a reusable function", async () => {
    fetchResponse = { success: true, jobId: "job-x", status: "done" };
    const data = await fetchDeployStatus(SERVER_URL, AUTH_TOKEN, "job-x");
    expect(data.jobId).toBe("job-x");
    expect(data.status).toBe("done");
    expect(fetchCalls[0].url).toBe(`${SERVER_URL}/api/app/deploy/status`);
  });
});

describe("app delete command", () => {
  test("sends name in body with --yes to skip confirm", async () => {
    fetchResponse = { success: true, deleted: true };
    const code = await runAppDeleteCommand(
      ["--name", "my-app", "--yes", "--json"],
      makeDeps(),
    );
    expect(code).toBe(0);
    expect(fetchCalls[0].url).toBe(`${SERVER_URL}/api/app/delete`);
    expect(JSON.parse(fetchCalls[0].body!)).toEqual({ name: "my-app" });
  });

  test("sends appId in body", async () => {
    fetchResponse = { success: true, deleted: true };
    await runAppDeleteCommand(["--app-id", "app-123", "--yes", "--json"], makeDeps());
    expect(JSON.parse(fetchCalls[0].body!)).toEqual({ appId: "app-123" });
  });

  test("returns error code 1 when no identifier provided", async () => {
    const code = await runAppDeleteCommand(["--yes"], makeDeps());
    expect(code).toBe(1);
    expect(fetchCalls).toHaveLength(0);
  });
});