import { describe, expect, it } from "bun:test";
import { installConnectionPeerFixture } from "../testHelpers/connectionPeerFixture";

import type { CredentialBroker } from "../../agent-runtime";

let moduleVersion = 0;

const loadModule = async () =>
  import(`./desktopCredentialBrokerHandler.ts`);

function request(
  body: unknown,
  headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Sec-Fetch-Site": "same-origin",
  },
  url = "http://localhost/api/desktop/credentials",
) {
  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function memoryBroker(store = new Map<string, string>()): CredentialBroker {
  return {
    async get(ref) {
      return store.get(ref) ?? null;
    },
    async put(ref, secret) {
      const value = secret.trim();
      if (!value) throw new Error("empty secret");
      store.set(ref, value);
    },
    async delete(ref) {
      store.delete(ref);
    },
    async has(ref) {
      return store.has(ref);
    },
  };
}

describe("desktop credential broker handler", () => {
  installConnectionPeerFixture();
  it("is only available in desktop mode", async () => {
    const { handleDesktopCredentialsPost } = await loadModule();

    const response = await handleDesktopCredentialsPost(
      request({ op: "has", ref: "api-key:agent-1" }),
      { env: { NOLO_DESKTOP: "0" }, broker: memoryBroker() },
    );

    expect(response.status).toBe(404);
  });

  it("allows trusted same-origin desktop browser requests", async () => {
    const { handleDesktopCredentialsPost } = await loadModule();
    const store = new Map<string, string>([
      ["api-key:agent-local-1", "sk-same-origin"],
    ]);
    const response = await handleDesktopCredentialsPost(
      request(
        { op: "get", ref: "api-key:agent-local-1" },
        {
          "Content-Type": "application/json",
          "Sec-Fetch-Site": "same-origin",
        },
      ),
      { env: { NOLO_DESKTOP: "1" }, broker: memoryBroker(store) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      secret: "sk-same-origin",
    });
  });

  it("rejects cross-origin Origin before returning secrets", async () => {
    const { handleDesktopCredentialsPost } = await loadModule();
    const secret = "sk-must-not-leak";
    const store = new Map<string, string>([["api-key:agent-1", secret]]);

    const response = await handleDesktopCredentialsPost(
      request(
        { op: "get", ref: "api-key:agent-1" },
        {
          "Content-Type": "application/json",
          Origin: "https://evil.example",
        },
      ),
      { env: { NOLO_DESKTOP: "1" }, broker: memoryBroker(store) },
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("same-origin");
    expect(JSON.stringify(body)).not.toContain(secret);
  });

  it("rejects missing browser provenance (bare curl)", async () => {
    const { handleDesktopCredentialsPost } = await loadModule();
    const secret = "sk-bare-curl-blocked";
    const store = new Map<string, string>([["api-key:agent-1", secret]]);

    const response = await handleDesktopCredentialsPost(
      request(
        { op: "get", ref: "api-key:agent-1" },
        { "Content-Type": "application/json" },
      ),
      { env: { NOLO_DESKTOP: "1" }, broker: memoryBroker(store) },
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("same-origin");
    expect(JSON.stringify(body)).not.toContain(secret);
  });

  it("put → has → get → delete through injected broker", async () => {
    const { handleDesktopCredentialsPost } = await loadModule();
    const store = new Map<string, string>();
    const broker = memoryBroker(store);
    const deps = { env: { NOLO_DESKTOP: "1" }, broker };
    const ref = "api-key:agent-local-1";

    const putRes = await handleDesktopCredentialsPost(
      request({ op: "put", ref, secret: "sk-test-secret" }),
      deps,
    );
    expect(putRes.status).toBe(200);
    expect(await putRes.json()).toEqual({ ok: true });
    expect(store.get(ref)).toBe("sk-test-secret");

    const hasRes = await handleDesktopCredentialsPost(
      request({ op: "has", ref }),
      deps,
    );
    expect(hasRes.status).toBe(200);
    expect(await hasRes.json()).toEqual({ ok: true, has: true });

    const getRes = await handleDesktopCredentialsPost(
      request({ op: "get", ref }),
      deps,
    );
    expect(getRes.status).toBe(200);
    expect(await getRes.json()).toEqual({ ok: true, secret: "sk-test-secret" });

    const delRes = await handleDesktopCredentialsPost(
      request({ op: "delete", ref }),
      deps,
    );
    expect(delRes.status).toBe(200);
    expect(await delRes.json()).toEqual({ ok: true });

    const hasAfter = await handleDesktopCredentialsPost(
      request({ op: "has", ref }),
      deps,
    );
    expect(await hasAfter.json()).toEqual({ ok: true, has: false });
  });

  it("rejects empty secret on put", async () => {
    const { handleDesktopCredentialsPost } = await loadModule();

    const response = await handleDesktopCredentialsPost(
      request({ op: "put", ref: "api-key:agent-1", secret: "   " }),
      { env: { NOLO_DESKTOP: "1" }, broker: memoryBroker() },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("secret_required");
    expect(JSON.stringify(body)).not.toContain("sk-");
  });

  it("rejects invalid ref with stable code and no ref echo", async () => {
    const { handleDesktopCredentialsPost } = await loadModule();
    const badRef = "../escape-must-not-echo";

    const response = await handleDesktopCredentialsPost(
      request({ op: "get", ref: badRef }),
      { env: { NOLO_DESKTOP: "1" }, broker: memoryBroker() },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "invalid_ref" });
    expect(JSON.stringify(body)).not.toContain(badRef);
    expect(JSON.stringify(body)).not.toContain("..");
  });

  it("surfaces broker failures as stable 500 without secret/path/raw message", async () => {
    const { handleDesktopCredentialsPost } = await loadModule();
    const secret = "sk-should-never-leak";
    const broker: CredentialBroker = {
      get: async () => null,
      put: async () => {
        throw new Error("disk full at /Users/secret/path");
      },
      delete: async () => {},
      has: async () => false,
    };

    const response = await handleDesktopCredentialsPost(
      request({ op: "put", ref: "api-key:agent-1", secret }),
      { env: { NOLO_DESKTOP: "1" }, broker },
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ ok: false, error: "credential_broker_failed" });
    expect(JSON.stringify(body)).not.toContain(secret);
    expect(JSON.stringify(body)).not.toContain("disk full");
    expect(JSON.stringify(body)).not.toContain("/Users/");
  });
});
