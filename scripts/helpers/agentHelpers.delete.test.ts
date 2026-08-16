import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { deleteRecordOnServers } from "./agentHelpers";

const originalFetch = globalThis.fetch;
const ORIGINAL_BASE_URL = process.env.BASE_URL;
const ORIGINAL_READ_DIALOG_BASE = process.env.READ_DIALOG_BASE;
const ORIGINAL_SCRIPT_LOCAL_BASE_URL = process.env.SCRIPT_LOCAL_BASE_URL;

describe("agentHelpers delete fan-out", () => {
  beforeEach(() => {
    delete process.env.BASE_URL;
    delete process.env.READ_DIALOG_BASE;
    process.env.SCRIPT_LOCAL_BASE_URL = "http://127.0.0.1:38123";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;

    if (ORIGINAL_BASE_URL === undefined) delete process.env.BASE_URL;
    else process.env.BASE_URL = ORIGINAL_BASE_URL;

    if (ORIGINAL_READ_DIALOG_BASE === undefined) delete process.env.READ_DIALOG_BASE;
    else process.env.READ_DIALOG_BASE = ORIGINAL_READ_DIALOG_BASE;

    if (ORIGINAL_SCRIPT_LOCAL_BASE_URL === undefined) {
      delete process.env.SCRIPT_LOCAL_BASE_URL;
    } else {
      process.env.SCRIPT_LOCAL_BASE_URL = ORIGINAL_SCRIPT_LOCAL_BASE_URL;
    }
  });

  it("deletes from every candidate server by default", async () => {
    const deletedOn: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "DELETE") {
        deletedOn.push(new URL(url).origin);
        return new Response("{}", { status: 200 });
      }
      return new Response("{}", { status: 404 });
    }) as unknown as typeof fetch;

    const result = await deleteRecordOnServers(
      "https://nolo.chat",
      "user-1",
      "token-1",
      "dialog-user-1-01TEST",
      { servers: ["https://nolo.chat", "https://us.nolo.chat"] },
    );

    expect(result.status).toBe("deleted");
    expect(deletedOn).toEqual(["https://nolo.chat", "https://us.nolo.chat"]);
  });

  it("resolves default delete servers from env when servers are omitted", async () => {
    process.env.BASE_URL = "https://nolo.chat";
    process.env.READ_DIALOG_BASE = "https://us.nolo.chat";

    const deletedOn: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "DELETE") {
        deletedOn.push(new URL(url).origin);
        return new Response("{}", { status: 200 });
      }
      return new Response("{}", { status: 404 });
    }) as unknown as typeof fetch;

    const result = await deleteRecordOnServers(
      "https://nolo.chat",
      "user-1",
      "token-1",
      "dialog-user-1-01DEFAULT",
    );

    expect(result.status).toBe("deleted");
    expect(deletedOn).toContain("https://nolo.chat");
    expect(deletedOn).toContain("https://us.nolo.chat");
  });

  it("returns missing when every candidate server reports 404", async () => {
    globalThis.fetch = (async () =>
      new Response("{}", { status: 404 })) as unknown as typeof fetch;

    const result = await deleteRecordOnServers(
      "https://nolo.chat",
      "user-1",
      "token-1",
      "dialog-user-1-01MISSING",
      { servers: ["https://nolo.chat", "https://us.nolo.chat"] },
    );

    expect(result.status).toBe("missing");
    expect(result.servers.every((entry) => entry.status === "missing")).toBe(true);
  });
});